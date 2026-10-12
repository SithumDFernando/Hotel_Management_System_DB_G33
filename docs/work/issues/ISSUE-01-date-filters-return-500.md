# ISSUE-01 — Date query filters return 500 even with valid dates

| | |
|---|---|
| **Severity** | 🔴 Critical (core screens broken) |
| **Area** | Backend — `rooms.py`, `bookings.py`, `reports.py` |
| **Found** | 2026-10-12 audit (reproduced on the running dev stack) |

## Problem

Any endpoint that filters by date fails with **HTTP 500**, even with well-formed `YYYY-MM-DD` values:

| Request | Result |
|---|---|
| `GET /api/rooms?check_in=2026-12-01&check_out=2026-12-03` | 500 |
| `GET /api/bookings?from=2026-10-01` / `?to=2026-12-31` | 500 |
| `GET /api/reports/occupancy?date=2026-10-12` | 500 |
| `GET /api/reports/occupancy?from_date=…&to_date=…` | 500 |

Server log:

```
asyncpg.exceptions.DataError: invalid input for query argument $1: '2026-12-01'
('str' object has no attribute 'toordinal')
```

### Screens affected
- **RoomsBrowse**: date-based availability search ([RoomsBrowse.jsx:73](../../../frontend/src/pages/RoomsBrowse.jsx#L73))
- **BookingCheckout**: alternate-room suggestions after a 409
- **ManagerDashboard → BranchOverview**: occupancy for today ([BranchOverview.jsx:39](../../../frontend/src/components/BranchOverview.jsx#L39))
- **AdminDashboard → BookingsTab**: from/to filters ([BookingsTab.jsx:19](../../../frontend/src/components/admin/BookingsTab.jsx#L19))

## Root cause

The query parameters are declared as `str`, and the SQL casts them with `$n::DATE`. asyncpg asks Postgres for the parameter type, gets `date`, and then refuses to encode a Python `str`. asyncpg needs a `datetime.date` object.

- [rooms.py:87-88](../../../backend/app/routers/rooms.py#L87-L88): `check_in`, `check_out`
- [bookings.py:311-312](../../../backend/app/routers/bookings.py#L311-L312): `from_date`, `to_date`
- [reports.py:498-500](../../../backend/app/routers/reports.py#L498-L500): `date`, `from_date`, `to_date`

## Implementation plan

1. **Type the parameters as `date`** so FastAPI parses them, returns 422 on bad input, and passes `datetime.date` to asyncpg.

   ```python
   from datetime import date

   check_in: date | None = Query(None, description="Availability check: start date"),
   check_out: date | None = Query(None, description="Availability check: end date"),
   ```

   Do the same in `bookings.list_bookings` (`from_date`, `to_date`; keep the `alias="from"` / `alias="to"`).

2. **`reports.py` naming clash.** The occupancy endpoint has a parameter called `date`, which shadows the `date` type. Import the type under an alias and keep the public query name:

   ```python
   from datetime import date as Date

   on_date: Optional[Date] = Query(None, alias="date", description="Point-in-time date"),
   from_date: Optional[Date] = Query(None),
   to_date: Optional[Date] = Query(None),
   ```

   Update the body to use `on_date`.

3. **Validate ranges** after parsing:
   - `rooms`: if only one of `check_in` / `check_out` is given → 400; if `check_out <= check_in` → 400.
   - `reports/occupancy`: if `to_date <= from_date` → 400.
   - `bookings`: if both are given and `to < from` → 400.

4. **Leave the SQL as-is.** The `::DATE` casts are harmless once real `date` objects are passed.

5. **Frontend:** nothing to change. It already sends ISO strings, and `clean()` drops empty values.

## Tests to add

In `backend/tests/test_frontend_support_api.py` (or a new `test_regressions.py`):

- `GET /rooms?check_in=<today+30>&check_out=<today+32>` → 200, and the result excludes a room booked over those dates.
- `GET /rooms?check_in=garbage&check_out=x` → 422.
- `GET /rooms?check_in=2027-01-05&check_out=2027-01-01` → 400.
- `GET /bookings?from=2026-01-01&to=2027-12-31` (admin) → 200.
- `GET /reports/occupancy?date=<today>` (manager) → 200.

## Acceptance criteria

- [x] Every request in the table above returns 200 with valid input and 4xx with invalid input. None return 500.
- [ ] Room date search, the manager's Branch Overview and the admin Bookings filters work in the browser.
- [x] `docs/specs/02_api_contract.md` documents the 400/422 responses.
