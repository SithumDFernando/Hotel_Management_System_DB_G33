-- =============================================================================
-- db/triggers/room_status_trigger.sql
-- =============================================================================
-- Purpose:
--   Automatically synchronises the room.status column whenever a booking's
--   status changes. This ensures that the room availability shown to users
--   is always consistent with the actual booking state without requiring the
--   application layer to manage two separate UPDATE statements.
--
-- Trigger function to implement:
--   CREATE OR REPLACE FUNCTION trg_sync_room_status()
--   RETURNS TRIGGER
--   LANGUAGE plpgsql
--   AS $$
--   BEGIN
--       -- When a booking transitions to Checked-In → mark room as Occupied
--       IF NEW.status = 'Checked-In' THEN
--           UPDATE room SET status = 'Occupied'
--           WHERE room_id = NEW.room_id;
--
--       -- When a booking transitions to Checked-Out → immediately free the room
--       ELSIF NEW.status = 'Checked-Out' THEN
--           UPDATE room SET status = 'Available'
--           WHERE room_id = NEW.room_id;
--
--       -- When a booking transitions to Cancelled → free the room only if no other
--       -- active booking exists FOR TODAY.
--       ELSIF NEW.status = 'Cancelled' THEN
--           IF NOT EXISTS (
--               SELECT 1 FROM booking
--               WHERE room_id = NEW.room_id
--                 AND booking_id <> NEW.booking_id
--                 AND status NOT IN ('Cancelled', 'Checked-Out')
--                 AND check_in_date <= CURRENT_DATE
--                 AND check_out_date > CURRENT_DATE
--           ) THEN
--               UPDATE room SET status = 'Available'
--               WHERE room_id = NEW.room_id;
--           END IF;
--       END IF;
--
--       RETURN NEW;
--   END;
--   $$;
--
--   CREATE TRIGGER trg_room_status
--   AFTER UPDATE OF status ON booking
--   FOR EACH ROW
--   EXECUTE FUNCTION trg_sync_room_status();
--
-- Notes:
--   - This is an AFTER UPDATE trigger — the booking status must already be
--     committed before the room is updated.
--   - If the perform_checkin/perform_checkout procedures manually update
--     room.status themselves, this trigger may cause duplicate updates.
--     Decide on ONE approach (trigger OR procedure) and disable the other.
--   - Room set to 'Maintenance' must be done manually via PATCH /rooms/{id}/status
--     and is NOT managed by this trigger.
-- =============================================================================

CREATE OR REPLACE FUNCTION trg_sync_room_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.status = 'Checked-In' THEN
        UPDATE room SET status = 'Occupied' WHERE room_id = NEW.room_id;
    ELSIF NEW.status = 'Checked-Out' THEN
        UPDATE room SET status = 'Available' WHERE room_id = NEW.room_id;
    ELSIF NEW.status = 'Cancelled' THEN
        IF NOT EXISTS (
            SELECT 1 FROM booking
            WHERE room_id = NEW.room_id
              AND booking_id <> NEW.booking_id
              AND status NOT IN ('Cancelled', 'Checked-Out')
              AND check_in_date <= CURRENT_DATE
              AND check_out_date > CURRENT_DATE
        ) THEN
            UPDATE room SET status = 'Available' WHERE room_id = NEW.room_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_room_status
AFTER UPDATE OF status ON booking
FOR EACH ROW
EXECUTE FUNCTION trg_sync_room_status();
