-- =============================================================================
-- db/procedures/checkin_checkout.sql
-- =============================================================================
-- Purpose:
--   Stored procedures for performing guest check-in and check-out operations.
--   Each procedure transitions the booking status AND the room status in a
--   single atomic transaction, keeping both tables consistent.
--
-- Procedures to implement:
--
--   1. perform_checkin(p_booking_id UUID)
--      -----------------------------------------
--      Steps:
--        a. Validate: booking.status must be 'Booked'. Raise exception otherwise.
--        b. Update booking:
--             SET status = 'Checked-In',
--                 actual_checkin_time = NOW()
--             WHERE booking_id = p_booking_id
--        c. Update room status (alternatively handled by room_status_trigger):
--             SET status = 'Occupied'
--             WHERE room_id = (SELECT room_id FROM booking WHERE booking_id = p_booking_id)
--
--   2. perform_checkout(p_booking_id UUID)
--      -----------------------------------------
--      Steps:
--        a. Validate: booking.status must be 'Checked-In'. Raise exception otherwise.
--        b. Update booking:
--             SET status = 'Checked-Out',
--                 actual_checkout_time = NOW()
--             WHERE booking_id = p_booking_id
--        c. Update room status:
--             SET status = 'Available'
--             WHERE room_id = (SELECT room_id FROM booking WHERE booking_id = p_booking_id)
--        d. (Optional) Auto-generate the bill if not already present:
--             CALL generate_bill(p_booking_id);
--
-- Notes:
--   - If room_status_trigger is implemented, steps (c) above may be handled
--     automatically by the trigger on booking status change. Decide on one
--     approach and document it clearly in both files to avoid duplication.
--   - Both procedures should COMMIT atomically — no partial updates.
--
-- Called by:
--   PATCH /api/bookings/{id}/checkin  in backend/app/routers/bookings.py
--   PATCH /api/bookings/{id}/checkout in backend/app/routers/bookings.py
-- =============================================================================

CREATE OR REPLACE PROCEDURE perform_checkin(p_booking_id UUID)
LANGUAGE plpgsql
AS $$
DECLARE
    v_status VARCHAR;
    v_room_id UUID;
BEGIN
    SELECT status, room_id INTO v_status, v_room_id
    FROM booking WHERE booking_id = p_booking_id;
    
    IF v_status IS NULL THEN
        RAISE EXCEPTION 'Booking not found';
    END IF;

    IF v_status != 'Booked' THEN
        RAISE EXCEPTION 'Only Booked bookings can be checked in';
    END IF;

    UPDATE booking 
    SET status = 'Checked-In', 
        actual_checkin_time = NOW()
    WHERE booking_id = p_booking_id;

    UPDATE room 
    SET status = 'Occupied' 
    WHERE room_id = v_room_id;
END;
$$;

CREATE OR REPLACE PROCEDURE perform_checkout(p_booking_id UUID)
LANGUAGE plpgsql
AS $$
DECLARE
    v_status VARCHAR;
    v_room_id UUID;
    v_balance NUMERIC;
BEGIN
    SELECT status, room_id INTO v_status, v_room_id
    FROM booking WHERE booking_id = p_booking_id;
    
    IF v_status IS NULL THEN
        RAISE EXCEPTION 'Booking not found';
    END IF;

    IF v_status != 'Checked-In' THEN
        RAISE EXCEPTION 'Only Checked-In bookings can be checked out';
    END IF;

    v_balance := fn_get_outstanding_balance(p_booking_id);
    IF v_balance > 0 THEN
        RAISE EXCEPTION 'Outstanding balance of LKR % — pay before checkout', v_balance;
    END IF;

    UPDATE booking 
    SET status = 'Checked-Out', 
        actual_checkout_time = NOW()
    WHERE booking_id = p_booking_id;

    UPDATE room 
    SET status = 'Available' 
    WHERE room_id = v_room_id;
END;
$$;
