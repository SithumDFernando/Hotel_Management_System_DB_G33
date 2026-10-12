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

- [ ] All table rows pass.
- [ ] `grep -n "UPDATE room" db/procedures` returns nothing.
- [ ] Specs updated.
