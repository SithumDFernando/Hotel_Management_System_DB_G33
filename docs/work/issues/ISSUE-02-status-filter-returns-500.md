# ISSUE-02 — Booking/room status filters return 500

| | |
|---|---|
| **Severity** | 🔴 Critical (Receptionist dashboard broken) |
| **Area** | Backend — `bookings.py`, `rooms.py` |
| **Found** | 2026-10-12 audit (reproduced on the running dev stack) |

## Problem

- `GET /api/bookings?status=Booked` → **500** for **every** value, valid or not.
- `GET /api/rooms?status=Bogus` → **500** (valid values work).

Server log:

```
asyncpg.exceptions.UndefinedFunctionError: operator does not exist: booking_status = character varying
asyncpg.exceptions.InvalidTextRepresentationError: invalid input value for enum room_status: "Bogus"
```

### Screens affected
- **ReceptionistDashboard**: loads `listBookings({status:'Booked'})` and `listBookings({status:'Checked-In'})` on mount ([ReceptionistDashboard.jsx:46-47](../../../frontend/src/pages/ReceptionistDashboard.jsx#L46-L47)), so the arrivals and in-house lists are empty or show an error.
- **AdminDashboard → BookingsTab**: status filter.

## Root cause

- [bookings.py:333](../../../backend/app/routers/bookings.py#L333) compares the enum column with `$n::VARCHAR`. Postgres has no `booking_status = varchar` operator.
- [rooms.py:112](../../../backend/app/routers/rooms.py#L112) casts to `::room_status` correctly, but an unknown value raises a DB error instead of a validation error.

## Implementation plan

1. **Constrain the inputs with `Literal`** so FastAPI returns 422 for unknown values:

   ```python
   from typing import Literal

   BookingStatus = Literal["Booked", "Checked-In", "Checked-Out", "Cancelled"]
   RoomStatus = Literal["Available", "Occupied", "Maintenance"]

   booking_status: BookingStatus | None = Query(None, alias="status")
   ```

   Put these aliases in `app/schemas/booking.py`, and in a new `app/schemas/room.py` or next to the room models, so `StatusUpdateRequest` in `rooms.py` can reuse `RoomStatus`. That also replaces the manual `valid_statuses` check in `update_room_status`.

2. **Fix the cast** in `bookings.py`:

   ```python
   conditions.append(f"b.status = ${param_idx}::booking_status")
   ```

3. **Search the codebase for other `::VARCHAR` enum comparisons** (`grep -rn "::VARCHAR" backend/app`). `create_booking` uses `$5::VARCHAR` for `payment_option`, which is a real VARCHAR column, so that one is fine.

## Tests to add

- `GET /bookings?status=Booked` as receptionist → 200, and every row has `status == "Booked"`.
- `GET /bookings?status=Bogus` → 422.
- `GET /rooms?status=Bogus` → 422.
- `PATCH /rooms/{id}/status` with `{"status":"Bogus"}` → 422 (it used to return 400; update the spec if 422 is adopted).

## Acceptance criteria

- [ ] Receptionist dashboard shows today's arrivals and in-house guests.
- [ ] Admin Bookings tab status filter works.
- [ ] No status value causes a 500.
