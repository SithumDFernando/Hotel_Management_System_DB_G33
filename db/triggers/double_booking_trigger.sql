-- =============================================================================
-- db/triggers/double_booking_trigger.sql
-- =============================================================================
-- Purpose:
--   Prevents double-booking of a room by raising an exception when an INSERT
--   into the booking table would create an overlapping reservation for the
--   same room over the same date range.
--
--   This is a BEFORE INSERT trigger on the booking table. It runs before the
--   row is written, so if it raises, the INSERT is aborted and no partial data
--   is committed.
--
-- Trigger function to implement:
--   CREATE OR REPLACE FUNCTION trg_check_double_booking()
--   RETURNS TRIGGER
--   LANGUAGE plpgsql
--   AS $$
--   BEGIN
--       -- Check for any existing ACTIVE booking for the same room that
--       -- overlaps with the requested [check_in_date, check_out_date) range.
--       -- Date range overlap condition: A and B overlap if A.start < B.end AND A.end > B.start
--       IF EXISTS (
--           SELECT 1
--           FROM   booking
--           WHERE  room_id         = NEW.room_id
--             AND  status          NOT IN ('Cancelled', 'Checked-Out')
--             AND  check_in_date   < NEW.check_out_date
--             AND  check_out_date  > NEW.check_in_date
--       ) THEN
--           RAISE EXCEPTION
--               'Room % is already booked from % to %. Cannot create overlapping booking.',
--               NEW.room_id, NEW.check_in_date, NEW.check_out_date;
--       END IF;
--
--       RETURN NEW;  -- Allow the INSERT to proceed
--   END;
--   $$;
--
--   CREATE TRIGGER trg_double_booking
--   BEFORE INSERT ON booking
--   FOR EACH ROW
--   EXECUTE FUNCTION trg_check_double_booking();
--
-- Notes:
--   - Cancelled and Checked-Out bookings are excluded from the overlap check
--     so that a room can be rebooked after checkout or cancellation.
--   - This trigger fires from the create_booking() stored procedure
--     (db/procedures/booking.sql) as well as direct INSERTs.
--   - Concurrency: the function locks the room row (FOR UPDATE) first, so
--     concurrent bookings for the same room run one after another and the
--     second one sees the first and gets the friendly message below. The
--     exclusion constraint excl_booking_room_overlap (02_constraints.sql) is
--     the guarantee behind it (API: ExclusionViolationError -> 409).
-- =============================================================================

CREATE OR REPLACE FUNCTION trg_check_double_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_room_number VARCHAR;
BEGIN
    IF NEW.status NOT IN ('Cancelled', 'Checked-Out') THEN
        -- Serialize concurrent bookings for the same room: a second
        -- transaction waits here until the first commits, then sees its row.
        -- The room number (not the UUID) goes into the message the API shows.
        SELECT room_number INTO v_room_number FROM room WHERE room_id = NEW.room_id FOR UPDATE;

        IF EXISTS (
            SELECT 1
            FROM booking
            WHERE room_id = NEW.room_id
              AND (TG_OP = 'INSERT' OR booking_id <> NEW.booking_id)
              AND status NOT IN ('Cancelled', 'Checked-Out')
              AND check_in_date < NEW.check_out_date
              AND check_out_date > NEW.check_in_date
        ) THEN
            RAISE EXCEPTION 'Room % is already booked for the selected dates.', v_room_number;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_double_booking
BEFORE INSERT OR UPDATE ON booking
FOR EACH ROW
EXECUTE FUNCTION trg_check_double_booking();
