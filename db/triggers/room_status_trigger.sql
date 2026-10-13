-- =============================================================================
-- db/triggers/room_status_trigger.sql
-- =============================================================================
-- Purpose:
--   Automatically synchronises the room.status column whenever a booking's
--   status changes. This ensures that the room availability shown to users
--   is always consistent with the actual booking state without requiring the
--   application layer to manage two separate UPDATE statements.
--
-- Policy (ISSUE-09): this trigger is the ONLY code that moves a room between
-- 'Available' and 'Occupied' as bookings change. perform_checkin and
-- perform_checkout no longer touch the room table.
--   Booked      -> Checked-In              : Available -> Occupied
--   Checked-In  -> Checked-Out / Cancelled : Occupied  -> Available
--                                            (unless another booking is
--                                            still Checked-In for the room)
--   Booked      -> Cancelled               : no change (the room was never
--                                            occupied by this booking)
-- Every UPDATE is guarded by the room status it expects, so 'Maintenance' is
-- never overwritten by a booking event. Maintenance is set and cleared only
-- manually via PATCH /rooms/{id}/status.
--
-- Notes:
--   - AFTER UPDATE OF status, so it runs inside the same transaction as the
--     booking change: both commit or neither does.
-- =============================================================================
-- Implementation below:

-- 1. Trigger function
CREATE OR REPLACE FUNCTION trg_sync_room_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Only act when the booking status column actually changes
    IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
        RETURN NEW;
    END IF;

    -- Guest arrives: Available -> Occupied (never overrides Maintenance)
    IF NEW.status = 'Checked-In' THEN
        UPDATE room
           SET status = 'Occupied'
         WHERE room_id = NEW.room_id
           AND status = 'Available';

    -- Guest leaves: Occupied -> Available, unless someone else is still in
    ELSIF OLD.status = 'Checked-In'
      AND NEW.status IN ('Checked-Out', 'Cancelled') THEN
        UPDATE room
           SET status = 'Available'
         WHERE room_id = NEW.room_id
           AND status = 'Occupied'
           AND NOT EXISTS (
               SELECT 1 FROM booking
                WHERE room_id    = NEW.room_id
                  AND booking_id <> NEW.booking_id
                  AND status     = 'Checked-In'
           );
    END IF;

    -- Booked -> Cancelled: this booking never occupied the room, no change
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_room_status ON booking;

CREATE TRIGGER trg_room_status
AFTER UPDATE OF status ON booking
FOR EACH ROW
EXECUTE FUNCTION trg_sync_room_status();
