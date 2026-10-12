-- =============================================================================
-- db/procedures/booking.sql
-- =============================================================================
-- Purpose:
--   Stored procedure for creating a new booking in a single atomic transaction.
--   Encapsulates the multi-step logic needed to safely create a booking, ensuring
--   ACID compliance and preventing race conditions.
--
-- Procedure to implement:
--   CREATE OR REPLACE PROCEDURE create_booking(
--       p_guest_id       UUID,
--       p_room_id        UUID,
--       p_check_in_date  DATE,
--       p_check_out_date DATE,
--       p_payment_option VARCHAR(50),
--       OUT p_booking_id UUID
--   )
--   LANGUAGE plpgsql
--   AS $$
--   DECLARE
--       v_branch_id    UUID;
--       v_room_type_id UUID;
--       v_rate         NUMERIC(10,2);
--   BEGIN
--       -- Step 1: Look up room's branch and type (needed to find the correct rate)
--       SELECT branch_id, room_type_id
--         INTO v_branch_id, v_room_type_id
--         FROM room WHERE room_id = p_room_id;
--
--       -- Step 2: Get the current daily rate and SNAPSHOT it
--       v_rate := fn_get_current_rate(v_branch_id, v_room_type_id);
--
--       -- Step 3: Insert the booking (double_booking_trigger fires here
--       --         and raises an exception if there is an overlap)
--       INSERT INTO booking (
--           guest_id, room_id, check_in_date, check_out_date,
--           rate_at_booking, payment_option, status
--       )
--       VALUES (
--           p_guest_id, p_room_id, p_check_in_date, p_check_out_date,
--           v_rate, p_payment_option, 'Booked'
--       )
--       RETURNING booking_id INTO p_booking_id;
--   END;
--   $$;
--
-- Trigger interaction:
--   The double_booking_trigger fires BEFORE INSERT on booking and raises
--   an exception if the room is already booked for the requested dates.
--
-- Business rules (ISSUE-08), checked here so every caller goes through them:
--   - check-in can't be in the past (today is fine)
--   - at most 30 nights per booking (longer stays go through the front desk)
--   - a room under Maintenance can't be booked
--   - payment_option is one of 'Credit Card' / 'Cash' / 'Bank Transfer'
--     (CHECK chk_booking_payment_option in 02_constraints.sql)
--
-- Called by:
--   POST /api/bookings endpoint in backend/app/routers/bookings.py.
-- =============================================================================

CREATE OR REPLACE PROCEDURE create_booking(
    p_guest_id       UUID,
    p_room_id        UUID,
    p_check_in_date  DATE,
    p_check_out_date DATE,
    p_payment_option VARCHAR,
    OUT p_booking_id UUID
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_branch_id    UUID;
    v_room_type_id UUID;
    v_room_status  room_status;
    v_rate         NUMERIC(10,2);
    c_max_nights   CONSTANT INT := 30;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM guest WHERE guest_id = p_guest_id) THEN
        RAISE EXCEPTION 'Guest not found';
    END IF;

    -- Look up room's branch, type and status
    SELECT branch_id, room_type_id, status
      INTO v_branch_id, v_room_type_id, v_room_status
      FROM room WHERE room_id = p_room_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Room not found';
    END IF;

    IF p_check_in_date < CURRENT_DATE THEN
        RAISE EXCEPTION 'Check-in date cannot be in the past';
    END IF;

    IF p_check_out_date - p_check_in_date > c_max_nights THEN
        RAISE EXCEPTION 'Stays longer than % nights must be arranged with the front desk',
            c_max_nights;
    END IF;

    IF v_room_status = 'Maintenance' THEN
        RAISE EXCEPTION 'Room is under maintenance and cannot be booked';
    END IF;

    -- Get the current daily rate and SNAPSHOT it
    v_rate := fn_get_current_rate(v_branch_id, v_room_type_id);

    -- Insert the booking (double_booking_trigger handles overlap checks)
    INSERT INTO booking (
        guest_id, room_id, check_in_date, check_out_date,
        rate_at_booking, payment_option, status
    )
    VALUES (
        p_guest_id, p_room_id, p_check_in_date, p_check_out_date,
        v_rate, p_payment_option, 'Booked'
    )
    RETURNING booking_id INTO p_booking_id;
END;
$$;


-- cancel_booking(booking)   (call with: CALL cancel_booking(...))

-- Cancels a 'Booked' booking. The booking row is locked first, so a cancel
-- racing a check-in (or another cancel) sees the other's result and raises
-- instead of overwriting it. Room status is left to trg_room_status.

CREATE OR REPLACE PROCEDURE cancel_booking(p_booking_id UUID)
LANGUAGE plpgsql
AS $$
DECLARE
    v_status booking_status;
BEGIN
    SELECT status INTO v_status
      FROM booking
     WHERE booking_id = p_booking_id
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
