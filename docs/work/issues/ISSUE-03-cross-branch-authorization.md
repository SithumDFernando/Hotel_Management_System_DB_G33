# ISSUE-03 — Staff can act on other branches' bookings, bills and rooms

| | |
|---|---|
| **Severity** | 🔴 High (security, broken access control) |
| **Area** | Backend — `bookings.py`, `billing.py`, `services.py`, `rooms.py`, `dependencies.py` |
| **Found** | 2026-10-12 audit |

## Problem

Branch scoping is only enforced on **read/list** of bookings (`GET /bookings`, `GET /bookings/{id}`) and on **cancel**. All other staff operations accept any booking or room ID. During the audit a **Galle receptionist** successfully:

| Action | Endpoint | Result |
|---|---|---|
| Checked in a Kandy booking | `PATCH /bookings/{id}/checkin` | 200 |
| Generated a Colombo bill with a 1,000 LKR discount | `POST /billing/{id}/generate?discount=1000` | 200 |
| Read a Colombo bill | `GET /billing/{id}` | 200 |
| Added a service charge to a Colombo booking | `POST /services/{id}/usage` | 201 |
| Read Colombo service usage | `GET /services/{id}/usage` | 200 |
| Recorded a payment on a Kandy booking | `POST /payments` | 201 |
| Created a booking in a Colombo room | `POST /bookings` | 201 |

A **Kandy manager** also set a **Colombo** room to Maintenance (`PATCH /rooms/{id}/status` → 200).

Spec reference: `docs/specs/08_auth_and_roles.md`. Managers and receptionists are branch-scoped; admins are global.

## Root cause

Each router does its own ad-hoc check, and most don't check at all. `assert_guest_owns_booking` in [dependencies.py](../../../backend/app/dependencies.py) only restricts guests and lets all staff through.

## Implementation plan

### 1. One reusable access helper in `app/dependencies.py`

Replace `assert_guest_owns_booking` with a general helper that covers guests **and** branch staff, and returns the booking's key fields so callers don't query twice:

```python
BRANCH_SCOPED = {"manager", "receptionist"}

async def assert_booking_access(db, user: dict, booking_id) -> asyncpg.Record:
    """
    404 if the booking doesn't exist.
    guest           -> must own the booking (403)
    manager/recept. -> booking's room must be in their branch (403)
    admin           -> unrestricted
    Returns (booking_id, guest_id, branch_id, status).
    """
    row = await db.fetchrow(
        """
        SELECT b.booking_id, b.guest_id, r.branch_id, b.status
        FROM booking b JOIN room r ON r.room_id = b.room_id
        WHERE b.booking_id = $1
        """,
        booking_id,
    )
    if row is None:
        raise HTTPException(404, "Booking not found")
    role = user["role"]
    if role == "guest" and str(row["guest_id"]) != str(user.get("guest_id")):
        raise HTTPException(403, "Guests can only access their own bookings.")
    if role in BRANCH_SCOPED and str(row["branch_id"]) != str(user.get("branch_id")):
        raise HTTPException(403, "Not authorised for bookings of another branch.")
    return row


async def assert_room_access(db, user: dict, room_id) -> asyncpg.Record:
    """Same rule for rooms (404 / 403). Returns (room_id, branch_id, status)."""
```

Keep `assert_guest_owns_booking` as a thin wrapper for one release, or update every caller in the same PR.

### 2. Apply it everywhere

| File | Endpoint | Change |
|---|---|---|
| `bookings.py` | `POST /bookings` | Staff: `assert_room_access(db, user, body.room_id)` before calling the procedure |
| `bookings.py` | `GET /bookings/{id}` | Replace inline check with helper |
| `bookings.py` | `PATCH …/checkin`, `…/checkout` | Call helper **before** the procedure |
| `bookings.py` | `PATCH …/cancel` | Replace inline check with helper |
| `billing.py` | `POST /billing/{id}/generate`, `GET /billing/{id}` | Helper |
| `billing.py` | `POST /payments`, `GET /payments/{id}` | Helper (on `body.booking_id` for POST) |
| `services.py` | `GET`/`POST /services/{id}/usage` | Helper (also removes the duplicate "booking exists" query) |
| `rooms.py` | `PATCH /rooms/{id}/status` | Managers: `assert_room_access` |

### 3. Decide on the open questions (record the decision in `08_auth_and_roles.md`)

- **Guest directory (`GET /guests`)**: guests are hotel-wide customers, so cross-branch lookup is arguably needed for bookings at the front desk. Recommendation: keep it global but document it. Optionally restrict receptionists to `search` queries of at least 3 characters so they can't dump the whole list.
- **`GET /reports/top-services`** is not branch-scoped for managers. Either scope it (add a `branch_id` column to `v_top_services` or a branch-aware variant) or document it as intentionally global.

### 4. Frontend

No functional change is needed, since the UI only shows the user's own branch. Make sure 403 responses surface as a toast via `errorMessage()` rather than failing silently.

## Tests to add (new `backend/tests/test_authz_branch.py`)

Log in as `rec.galle@skynest.lk` and target seed booking `30000000-…-0003` (Kandy):

- checkin / checkout / cancel → 403
- generate bill / get bill / record payment / list payments → 403
- add usage / list usage → 403
- create booking in room `e0000000-…-0003` (Colombo) → 403

Log in as `mgr.kandy@skynest.lk`:

- `PATCH /rooms/e0000000-…-0002/status` (Colombo) → 403

Repeat one positive case per endpoint with a same-branch user → 2xx, and one admin case → 2xx.

## Acceptance criteria

- [ ] All rows in the problem table return 403 for a different-branch user.
- [ ] Same-branch staff and admins are unaffected.
- [ ] A single helper is used; no inline branch checks remain in routers.
