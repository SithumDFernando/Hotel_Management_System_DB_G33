# ISSUE-09 — Cancelling a booking resets a Maintenance room to Available

| | |
|---|---|
| **Severity** | 🟠 Medium (data integrity) |
| **Area** | Database — `db/triggers/room_status_trigger.sql`, `db/procedures/checkin_checkout.sql` |
| **Found** | 2026-10-12 audit |

## Problem

```sql
-- room 104 is 'Maintenance' and has a 'Booked' booking
UPDATE booking SET status = 'Cancelled' WHERE room_id = '<room104>' AND status = 'Booked';
SELECT status FROM room WHERE room_number = '104';   -- → 'Available'  ❌
```

A room under repair becomes bookable as soon as any of its future reservations is cancelled. Checkout also unconditionally sets the room to `Available`, overwriting a Maintenance flag that housekeeping set during the stay.

## Root cause

1. `trg_sync_room_status` frees the room whenever a booking goes to `Cancelled` or `Checked-Out`, regardless of the room's current status. Cancelling a `Booked` booking never made the room Occupied, so it shouldn't touch the room at all.
2. The room status is written in **two** places: the procedures (`perform_checkin` / `perform_checkout` run `UPDATE room …`) **and** the trigger. The trigger's own header comment says to pick one.

## Implementation plan

### 1. Make the trigger the single owner of room status

Rewrite `trg_sync_room_status()`:

```sql
CREATE OR REPLACE FUNCTION trg_sync_room_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
        RETURN NEW;
    END IF;

    -- Guest arrives: Available → Occupied (never override Maintenance)
    IF NEW.status = 'Checked-In' THEN
        UPDATE room SET status = 'Occupied'
         WHERE room_id = NEW.room_id
           AND status = 'Available';

    -- Guest leaves (or an in-house booking is cancelled): Occupied → Available
    ELSIF OLD.status = 'Checked-In'
      AND NEW.status IN ('Checked-Out', 'Cancelled') THEN
        UPDATE room SET status = 'Available'
         WHERE room_id = NEW.room_id
           AND status = 'Occupied'
           AND NOT EXISTS (
               SELECT 1 FROM booking
                WHERE room_id = NEW.room_id
                  AND booking_id <> NEW.booking_id
                  AND status = 'Checked-In');
    END IF;

    -- Booked → Cancelled: room was never occupied by this booking → no change
    RETURN NEW;
END;
$$;
```

Key points:
- Every `UPDATE room` has a `WHERE status = <expected>` guard, so **Maintenance is never overwritten** by booking lifecycle events.
- `Booked → Cancelled` leaves the room untouched.

### 2. Remove the duplicate room updates from the procedures

In `perform_checkin` and `perform_checkout`, delete the `UPDATE room SET status = …` statements and leave a comment pointing to `trg_room_status`. (ISSUE-04 and ISSUE-08 already rewrite these procedures, so do it in the same change.)

Because ISSUE-08 blocks check-in while the room is in Maintenance, the `status = 'Available'` guard on check-in won't silently skip a legitimate arrival.

### 3. Document the policy

Update `docs/specs/04_triggers.md`:
- The trigger owns `Available ↔ Occupied`.
- `Maintenance` is set and cleared **only** manually via `PATCH /rooms/{id}/status`.
- Optional extra rule for `update_room_status`: refuse to set `Available` while a `Checked-In` booking exists for the room, and refuse `Occupied` without one (→ 409). This stops the manual endpoint from creating the same inconsistency the audit saw (an admin set an empty room 203 to Occupied).

## Tests to add (DB level)

| Start room status | Booking transition | Expected room status |
|---|---|---|
| Maintenance | Booked → Cancelled | Maintenance |
| Available | Booked → Cancelled | Available |
| Available | Booked → Checked-In | Occupied |
| Occupied | Checked-In → Checked-Out | Available |
| Maintenance (set mid-stay) | Checked-In → Checked-Out | Maintenance |

## Acceptance criteria

- [x] All table rows pass.
- [x] `grep -n "UPDATE room" db/procedures` returns nothing.
- [x] Specs updated.

## Resolution (2026-10-12)

- `trg_sync_room_status` rewritten as planned:
  - Check-in moves the room `Available → Occupied`.
  - Leaving after check-in (`Checked-In → Checked-Out/Cancelled`) moves it `Occupied → Available`, unless another booking is still Checked-In.
  - `Booked → Cancelled` leaves the room alone.
  - Every `UPDATE room` is guarded by the status it expects, so booking events never overwrite `Maintenance`.
  - The header now states this policy instead of the old "decide on one approach" note.
- `perform_checkin` / `perform_checkout` no longer update the room. The unused `v_room_id` is gone, and the comments point to `trg_room_status`. `grep -n "UPDATE room" db/procedures` finds nothing.
- Optional manual-status rule: **done**. `PATCH /rooms/{id}/status` locks the room row, then returns 409 when asked for `Available` while a booking is Checked-In, or `Occupied` without one. `Maintenance` is always allowed.
  - Edge case: a room set to Maintenance mid-stay can't be cleared to `Available`. So `RoomManager.jsx` retries with `Occupied` when "Mark available" gets that 409, and says so in the toast.
- The seed has no room whose status disagrees with its bookings (checked with a query on a fresh build).
- Check-in while the room is `Maintenance` now leaves the room as `Maintenance` (the guarded update is skipped). ISSUE-08 will block that check-in outright.
- Tests: `tests/test_room_status.py` (11 tests).
  - The issue's five table rows, driven through the real procedures (`cancel_booking`, `perform_checkin`, `perform_checkout` with a settled bill).
  - `Checked-In → Cancelled` frees the room.
  - With the trigger disabled, the procedures leave the room unchanged, which proves they don't write to it.
  - Four API tests for the manual rule.
  - 6 fail on the pre-fix code (Maintenance overwritten on cancel and on checkout, the procedures still writing the room, and the API accepting `Available`/`Occupied` that contradict the bookings). The other 5 are normal transitions that already worked.
- Specs: `04_triggers.md` §2 (logic, policy table, transition table), `03_stored_procedures_functions.md` (`check_in`/`check_out` room steps), `02_api_contract.md` (room status 409s), `09_frontend_pages.md` (Rooms tab toggle).
- ⏳ Browser check pending: Manager → Rooms, set Maintenance and clear it on an empty room and on room 101 (guest checked in → back to Occupied).
