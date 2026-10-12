# ISSUE-07 — Malformed input causes 500s and leaks DB error text

| | |
|---|---|
| **Severity** | 🟠 Medium (robustness, information disclosure, contract violations) |
| **Area** | Backend — all routers, `main.py`, schemas |
| **Found** | 2026-10-12 audit (about 25 distinct 500s) |

## Problem

Invalid input returns **500 Internal Server Error** instead of 400/404/409/422. Some 500s also echo raw Postgres errors to the client.

| Input | Example | Now | Should be |
|---|---|---|---|
| Non-UUID path ID | `GET /rooms/not-a-uuid`, `GET /bookings/bad`, `PATCH /bookings/bad/checkin`, `PUT /admin/branches/bad`, `PATCH /admin/users/bad`, `PATCH /rooms/bad/status` | 500 | 422 |
| Non-UUID query/body ID | `GET /rooms?branch_id=bad`, `/reports/billing-summary?branch_id=bad`, `POST /admin/users {branch_id:"bad"}` | 500 | 422 |
| String too long | `POST /guests` NIC 30 chars, `POST /admin/branches` name 500 chars, `POST /bookings` `payment_option` 60 chars | 500 | 422 |
| Numeric overflow | `POST /services base_price=1e12`, `?discount=999999999`, `quantity=2147483648`, huge `quantity` then generate bill | 500 | 422 / 400 |
| Unknown FK | `POST /bookings` with non-existent `guest_id` | 500 | 404 |
| Unknown room | `POST /bookings` with non-existent `room_id` | 400 "No rate configured…" | 404 "Room not found" |

Leaked messages, for example:

```json
{"detail": "Database error: value too long for type character varying(20)"}
{"detail": "Database error: numeric field overflow\nDETAIL: A field with precision 10, scale 2 must round ..."}
```

## Root cause

- Path and query IDs are declared as `str` and cast with `$1::UUID` in SQL. asyncpg raises `DataError` before the query runs.
- Pydantic models don't mirror the DB column limits (`VARCHAR(n)`, `NUMERIC(10,2)`, `INT`).
- `except Exception` blocks in `guests.py` and `services.py` turn everything into `500 "Database error: {exc}"`.
- Only `asyncpg.exceptions.RaiseError` is mapped; constraint violations aren't.

## Implementation plan

### 1. Type every identifier as `UUID`

```python
from uuid import UUID

@router.get("/{room_id}")
async def get_room(room_id: UUID, db=Depends(get_db)): ...
```

Files: `rooms.py` (get, patch status, `branch_id` query), `bookings.py` (all `{booking_id}`, `branch_id`/`guest_id`/`room_id` queries), `admin.py` (`branch_id`, `account_id`, `UserCreate.branch_id/guest_id`), `reports.py` (`branch_id`), `auth.py` (`RegisterRequest.branch_id/guest_id`).

`admin.patch_user` uses `branch_id: ""` to mean "clear". Model it as `branch_id: UUID | Literal[""] | None`, or add an explicit `clear_branch: bool`, and update `UsersTab.jsx` to match.

Pass the `UUID` object straight to asyncpg. The `$n::UUID` casts become harmless and can stay.

### 2. Mirror DB limits in the Pydantic schemas

| Model | Field | Constraint (from `01_tables.sql`) |
|---|---|---|
| `GuestBase` / `GuestUpdate` | `full_name` | `min_length=2, max_length=150` |
| | `nic_passport` | `min_length=4, max_length=20` |
| | `email` | `EmailStr`, `max_length=100` |
| | `phone` | `min_length=7, max_length=20` |
| | `nationality` | `max_length=50`; `gender` `max_length=10` |
| | `company_name`, `billing_contact_name` | `max_length=150`; `company_reg_number` `max_length=50` |
| `BranchCreate` / `BranchUpdate` | `name` 100, `city` 50, `address` 255, `phone` 20, `manager_name` 100 | `min_length=1` |
| `BookingCreate` | `payment_option` | `Literal["Credit Card","Cash","Bank Transfer"]` (see ISSUE-08) |
| `ServiceCreate/Update` | `base_price` | `gt=0, le=Decimal("99999999.99"), decimal_places=2` |
| `ServiceUsageCreate` | `quantity` | `ge=1, le=1000` (business cap; also prevents int32 and bill overflow) |
| `billing.generate_bill` | `discount` query | `ge=0, le=Decimal("99999999.99"), decimal_places=2` |
| `PaymentCreate` | `payment_method` | `Literal[...]` same list as the frontend `METHODS` |

`ServiceCreate` already sets `max_length=100/50`, which is good. It just needs the `base_price` upper bound.

### 3. One global handler for DB errors (`app/main.py`)

```python
import logging
import asyncpg
from fastapi import Request
from fastapi.responses import JSONResponse

log = logging.getLogger("skynest")

_PG_MAP = {
    asyncpg.exceptions.UniqueViolationError:            (409, "A record with these details already exists."),
    asyncpg.exceptions.ExclusionViolationError:         (409, "Room is not available for the selected dates."),
    asyncpg.exceptions.ForeignKeyViolationError:        (404, "A referenced record does not exist."),
    asyncpg.exceptions.CheckViolationError:             (422, "The request violates a data rule."),
    asyncpg.exceptions.NotNullViolationError:           (422, "A required field is missing."),
    asyncpg.exceptions.StringDataRightTruncationError:  (422, "A value is too long."),
    asyncpg.exceptions.NumericValueOutOfRangeError:     (422, "A numeric value is out of range."),
    asyncpg.exceptions.DataError:                       (422, "Invalid input."),
}

@app.exception_handler(asyncpg.PostgresError)
async def pg_error_handler(request: Request, exc: asyncpg.PostgresError):
    for cls, (code, msg) in _PG_MAP.items():
        if isinstance(exc, cls):
            return JSONResponse(status_code=code, content={"detail": msg})
    log.exception("Unhandled database error on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})
```

Then **delete** the `except Exception … f"Database error: {exc}"` blocks in `guests.py` and `services.py`. Keep only the targeted ones that produce domain messages, e.g. the 409 "service name exists". Note: `RaiseError` (from `RAISE EXCEPTION`) is a subclass of `PostgresError`, so routers must keep catching it locally to map business messages. Otherwise it falls through to the generic 500.

Also add a `@app.exception_handler(ValueError)` fallback that returns 422. asyncpg wraps invalid argument types in `DataError`, but `ValueError` can still surface from `uuid.UUID()`.

### 4. Domain-specific fixes

- **`create_booking` procedure:** after the room lookup, `IF NOT FOUND THEN RAISE EXCEPTION 'Room not found'; END IF;`. Also check the guest exists → `'Guest not found'`. In `bookings.py`, map `"not found"` → 404.
- **`services.add_service_usage`:** the current mapping `if "check" in error_msg` matches *any* message containing "check" (e.g. check-constraint violations), so it reports the wrong cause. Match the trigger's exact text (`"only be added to a Checked-In booking"`) and let the global handler deal with the rest.
- **`generate_bill` procedure:** declare its working variables as plain `NUMERIC` (not `NUMERIC(10,2)`), and explicitly `RAISE EXCEPTION 'Bill total exceeds the maximum supported amount'` before the INSERT if `v_total >= 1e8`.

## Tests to add (`test_input_validation.py`)

Parametrize over every row of the problem table and assert `status_code < 500` and that the response body does not contain `"Database error"` or `"DETAIL:"`.

## Acceptance criteria

- [x] No request in the audit list returns 500.
- [x] No response body contains raw Postgres text.
- [x] Unexpected DB errors are logged server-side with a stack trace.
