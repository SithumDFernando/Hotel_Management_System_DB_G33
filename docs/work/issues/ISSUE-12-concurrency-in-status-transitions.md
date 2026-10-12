# ISSUE-12 — Concurrent check-in / cancel / payment requests aren't serialized

| | |
|---|---|
| **Severity** | 🟠 Medium (ACID / consistency) |
| **Area** | Database — `checkin_checkout.sql`, `booking.sql`, `payments.sql`; backend `bookings.py`, `billing.py` |
| **Found** | 2026-10-12 audit |

## Problem

| Test | Result | Expected |
|---|---|---|
| 5 simultaneous `PATCH /bookings/{id}/checkin` | **2 × 200**, 3 × 400 | 1 × 200, 4 × 400 |
| 5 simultaneous `PATCH /bookings/{id}/cancel` | **4 × 200**, 1 × 400 | 1 × 200, 4 × 400 |
| 5 simultaneous full payments | 1 × 201, 4 × 400 ✅ | — (already correct, the bill row is locked) |

Effects:
- Double check-in overwrites `actual_checkin_time` and fires the room trigger twice.
- Cancel is a check-then-act in Python (`SELECT status` → `UPDATE`) on separate statements, so a cancel can race a check-in and **cancel a booking that was just checked in**.
- `POST /payments` returns "the newest payment for this booking" (`ORDER BY paid_at DESC LIMIT 1`). Two payments on the same booking at the same moment can each return the *other* payment.

## Root cause

- `perform_checkin` / `perform_checkout` read the booking with a plain `SELECT` (no `FOR UPDATE`), so two transactions both see `Booked`.
- `cancel_booking` lives in the router, not the DB, and isn't atomic.
- `record_payment` doesn't return the ID it inserted.

## Implementation plan

### 1. Lock the booking row in the procedures

`perform_checkin` and `perform_checkout`: `SELECT … FROM booking WHERE booking_id = p_booking_id FOR UPDATE;`. ISSUE-04 and ISSUE-08 already show the full rewritten procedures with the lock. The second transaction waits, then sees `Checked-In` and raises "Only Booked bookings can be checked in" → 400.

Also declare `v_status booking_status` instead of `VARCHAR` for type correctness.

### 2. Move cancellation into a procedure (`db/procedures/booking.sql`)

```sql
CREATE OR REPLACE PROCEDURE cancel_booking(p_booking_id UUID)
LANGUAGE plpgsql
AS $$
DECLARE
    v_status booking_status;
BEGIN
    SELECT status INTO v_status
      FROM booking WHERE booking_id = p_booking_id
       FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found';
    END IF;
    IF v_status <> 'Booked' THEN
        RAISE EXCEPTION 'Only Booked bookings can be cancelled (current status: %)', v_status;
    END IF;

    UPDATE booking SET status = 'Cancelled' WHERE booking_id = p_booking_id;
END;
$$;
```

In `bookings.cancel_booking`, keep the authorization check (ISSUE-03 helper), then `CALL cancel_booking($1)` and map `RaiseError`: "not found" → 404, everything else → 400. Remove the Python status check and the raw `UPDATE`.

The `reason` field is accepted but thrown away. Either add a `cancellation_reason VARCHAR(255)` column (and pass it to the procedure) or remove the field from `BookingStatusUpdate` and the spec. Decide and document.

### 3. Return the inserted payment's ID

```sql
CREATE OR REPLACE PROCEDURE record_payment(
    p_booking_id UUID, p_amount NUMERIC, p_payment_method VARCHAR,
    p_notes VARCHAR DEFAULT NULL,
    OUT p_payment_id UUID
)
...
    INSERT INTO payment (booking_id, amount, payment_method, notes)
    VALUES (p_booking_id, p_amount, p_payment_method, p_notes)
    RETURNING payment_id INTO p_payment_id;
```

To keep the `CALL` unambiguous, remove the `DEFAULT NULL` on `p_notes` and always pass all five arguments, with `NULL` as the placeholder for the OUT parameter. Then in `billing.create_payment`:

```python
res = await db.fetchrow("CALL record_payment($1::UUID, $2::NUMERIC, $3, $4, NULL)", ...)
row = await db.fetchrow("SELECT ... FROM payment WHERE payment_id = $1", res["p_payment_id"])
```

(This is the same pattern `create_booking` already uses for `p_booking_id`.) Update the `CALL` sites in `backend/tests/` and `db/tests/test_crud.sql`.

### 4. Make multi-statement router work transactional

Where a router does "CALL procedure" then "SELECT result", wrap both in `async with db.transaction():`. Then the response reflects the same snapshot the procedure committed, and a failure in the second statement doesn't leave a half-reported state.

## Tests to add

- `asyncio.gather` of 5 check-ins → exactly one 200.
- `asyncio.gather` of 5 cancels → exactly one 200.
- Check-in and cancel fired together → exactly one succeeds, and the final status matches the one that succeeded.
- Two concurrent partial payments → each response's `payment_id` matches its own amount.

## Acceptance criteria

- [x] All four concurrency tests pass reliably, 20 repeated runs.
- [x] No status transitions are performed with raw `UPDATE booking SET status` outside `db/procedures/`.

## Resolution (2026-10-12)

- `perform_checkin`: `SELECT … FOR UPDATE`, `v_status booking_status`, `IF NOT FOUND`. `perform_checkout` already had the lock from ISSUE-04. The room `UPDATE`s stay until ISSUE-09.
- New `cancel_booking(p_booking_id)` procedure in `db/procedures/booking.sql`, as planned. Its message is `Only Booked bookings can be cancelled (current status: %)`.
  - `bookings.cancel_booking` keeps `assert_booking_access`, then runs `CALL cancel_booking` and maps "not found" → 404 and anything else → 400. The Python status check and the raw `UPDATE` are gone; `grep -rn "UPDATE booking" backend/app` finds nothing.
- **`reason` decision: removed.** Nothing stored, showed or sent it: the frontend's `cancelBooking(id, reason)` was always called without one. `BookingStatusUpdate` is deleted, the route takes no body (a client sending `{}` still works), and `api/bookings.js` no longer sends one. Add a column later if the hotel wants cancellation reasons.
- `record_payment` now has `OUT p_payment_id UUID`. `p_notes` lost its `DEFAULT` so the `CALL` stays unambiguous; callers always pass five arguments. `create_payment` reads the payment back `WHERE payment_id = p_payment_id`. Updated call sites: `billing.py` and `tests/test_checkout_billing.py`. `db/tests/test_crud.sql` and the script suites don't call it.
- Wrapped CALL + read-back in `async with db.transaction()`: `create_booking`, check-in, checkout, `generate_bill`, `create_payment`. Cancel is a single `CALL`.
- Tests:
  - New file `tests/test_status_concurrency.py` (6 tests). It covers the four planned tests (5 check-ins, 5 cancels, check-in vs cancel, 2 payments) and adds two deterministic held-transaction tests: a second check-in, and an API cancel, each fired while another session holds an uncommitted check-in.
  - Each test uses a fresh booking for today on room 103 and real commits through the new shared `pool` / `pool_api` / `pool_login` fixtures in `conftest.py`. It deletes the booking afterwards and puts the room status back. `test_double_booking.py` now uses the same fixtures.
  - 20 repeated runs of both concurrency files: 20/20 green.
  - Pre-fix: the two held-transaction tests fail every run (the second check-in succeeds; the cancel returns 200 and cancels a checked-in booking). The in-process bursts only hit the race some of the time on the old code (the cancel burst failed 1 run in 5, with `[200, 200, 400, 400, 400]`). The payment test passed pre-fix because the bill lock already serialized payments. It now guards that each response is its own payment.
- Specs: `02_api_contract.md` (check-in/cancel/payments; the check-in 400 text now matches the code), `03_stored_procedures_functions.md` (`check_in` concurrency, new `cancel_booking`, `record_payment` signature, `check_out` → `generate_bill` dependency).
- ⏳ Browser check pending: cancel from the Receptionist dashboard and from My Bookings (the request no longer sends a body).
