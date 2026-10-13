-- =============================================================================
-- db/procedures/checkin_checkout.sql
-- =============================================================================
-- Purpose:
--   Stored procedures for performing guest check-in and check-out operations.
--   Each procedure transitions the booking status in one atomic call. The
--   room status follows from trg_room_status (room_status_trigger.sql),
--   which fires in the same transaction and is the only owner of
--   Available <-> Occupied (ISSUE-09).
--
-- Procedures to implement:
--
--   1. perform_checkin(p_booking_id UUID)
--      -----------------------------------------
--      Steps:
--        a. Lock the booking row (FOR UPDATE) so concurrent check-ins run one
--           after another; validate status = 'Booked'. Raise exception otherwise.
--        b. Update booking:
--             SET status = 'Checked-In',
--                 actual_checkin_time = NOW()
--             WHERE booking_id = p_booking_id
--        c. Room -> 'Occupied' is done by trg_room_status.
--
--   2. perform_checkout(p_booking_id UUID)
--      -----------------------------------------
--      Steps:
--        a. Lock the booking row; validate status = 'Checked-In'.
--        b. CALL generate_bill(p_booking_id, NULL): creates the bill if missing,
--           or recalculates it so every service added since the last
--           generate is billed. NULL keeps the existing discount.
--        c. Raise 'Outstanding balance ...' if anything is still unpaid. The
--           whole CALL rolls back, including the bill refresh (API -> 402).
--        d. Update booking:
--             SET status = 'Checked-Out',
--                 actual_checkout_time = NOW()
--             WHERE booking_id = p_booking_id
--        e. Room -> 'Available' is done by trg_room_status.
--
-- Notes:
--   - Neither procedure updates the room table; that keeps a Maintenance
--     flag from being overwritten by a check-in or checkout.
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
    v_status  booking_status;
BEGIN
    -- A concurrent second check-in waits here, then sees 'Checked-In'
    SELECT status INTO v_status
      FROM booking
     WHERE booking_id = p_booking_id
       FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found';
    END IF;

    IF v_status <> 'Booked' THEN
        RAISE EXCEPTION 'Only Booked bookings can be checked in';
    END IF;

    UPDATE booking 
    SET status = 'Checked-In', 
        actual_checkin_time = NOW()
    WHERE booking_id = p_booking_id;
    -- Room status: trg_room_status (room_status_trigger.sql) owns it
END;
$$;

CREATE OR REPLACE PROCEDURE perform_checkout(p_booking_id UUID)
LANGUAGE plpgsql
AS $$
DECLARE
    v_status  booking_status;
    v_balance NUMERIC;
BEGIN
    SELECT status INTO v_status
      FROM booking
     WHERE booking_id = p_booking_id
       FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found';
    END IF;

    IF v_status <> 'Checked-In' THEN
        RAISE EXCEPTION 'Only Checked-In bookings can be checked out';
    END IF;

    -- The stored bill is only as fresh as the last generate_bill call, so
    -- bring it up to date first (creates it if missing, keeps the discount)
    CALL generate_bill(p_booking_id, NULL);

    v_balance := fn_get_outstanding_balance(p_booking_id);
    IF v_balance > 0 THEN
        RAISE EXCEPTION 'Outstanding balance of LKR % — pay before checkout', v_balance;
    END IF;

    UPDATE booking
    SET status = 'Checked-Out',
        actual_checkout_time = NOW()
    WHERE booking_id = p_booking_id;
    -- Room status: trg_room_status (room_status_trigger.sql) owns it
END;
$$;
