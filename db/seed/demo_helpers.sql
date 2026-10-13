-- =============================================================================
-- db/seed/demo_helpers.sql
-- =============================================================================
-- Purpose:
--   Session-local (pg_temp) helper functions that were used to build the demo
--   half of sample_data.sql step by step (book, check in, add service, bill,
--   pay, check out, cancel). sample_data.sql now does the same in plain SQL,
--   so NOTHING loads or calls this file; run_all.sql does not include it.
--
--   Kept for anyone who wants to script extra demo scenarios by hand:
--     psql -U skynest_user -d skynest
--     \i db/seed/demo_helpers.sql
--     SELECT pg_temp.demo_book(...);   -- helpers vanish at disconnect
--
--   Day offsets: demo_book() takes offsets from CURRENT_DATE; the others take
--   offsets from the booking's check-in date.
-- =============================================================================

CREATE FUNCTION pg_temp.demo_book(p_id UUID, p_guest UUID, p_room UUID,
                                  p_in INT, p_out INT, p_pay VARCHAR)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO booking (booking_id, guest_id, room_id, check_in_date,
                         check_out_date, rate_at_booking, status, payment_option)
    SELECT p_id, p_guest, r.room_id, CURRENT_DATE + p_in, CURRENT_DATE + p_out,
           fn_get_current_rate(r.branch_id, r.room_type_id), 'Booked', p_pay
      FROM room r
     WHERE r.room_id = p_room;
END;
$$;

CREATE FUNCTION pg_temp.demo_checkin(p_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    UPDATE booking
       SET status = 'Checked-In',
           actual_checkin_time = check_in_date + TIME '14:00'
     WHERE booking_id = p_id;
END;
$$;

CREATE FUNCTION pg_temp.demo_use(p_id UUID, p_service UUID, p_day INT, p_qty INT)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    -- unit_price is left to trg_service_usage (price snapshot)
    INSERT INTO service_usage (booking_id, service_id, usage_date, quantity, unit_price)
    SELECT p_id, p_service, b.check_in_date + p_day, p_qty, 0
      FROM booking b
     WHERE b.booking_id = p_id;
END;
$$;

CREATE FUNCTION pg_temp.demo_bill(p_id UUID, p_discount NUMERIC DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    CALL generate_bill(p_id, p_discount);
END;
$$;

-- p_amount NULL pays the whole outstanding balance
CREATE FUNCTION pg_temp.demo_pay(p_id UUID, p_amount NUMERIC, p_method VARCHAR,
                                 p_note VARCHAR, p_day INT)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
    v_amount     NUMERIC := COALESCE(p_amount, fn_get_outstanding_balance(p_id));
    v_payment_id UUID;
BEGIN
    CALL record_payment(p_id, v_amount, p_method, p_note, v_payment_id);
    UPDATE payment p
       SET paid_at = b.check_in_date + p_day + TIME '12:30'
      FROM booking b
     WHERE p.payment_id = v_payment_id
       AND b.booking_id = p_id;
END;
$$;

CREATE FUNCTION pg_temp.demo_checkout(p_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    UPDATE booking
       SET status = 'Checked-Out',
           actual_checkout_time = check_out_date + TIME '11:00'
     WHERE booking_id = p_id;
END;
$$;

CREATE FUNCTION pg_temp.demo_cancel(p_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    UPDATE booking SET status = 'Cancelled' WHERE booking_id = p_id;
END;
$$;

-- A finished stay: check in, services, bill, full payment, check out
CREATE FUNCTION pg_temp.demo_past(p_id UUID, p_guest UUID, p_room UUID,
                                  p_in DATE, p_nights INT, p_method VARCHAR,
                                  p_service UUID, p_qty INT,
                                  p_discount NUMERIC DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    PERFORM pg_temp.demo_book(p_id, p_guest, p_room,
                              p_in - CURRENT_DATE, p_in - CURRENT_DATE + p_nights,
                              p_method);
    PERFORM pg_temp.demo_checkin(p_id);
    PERFORM pg_temp.demo_use(p_id, p_service, 1, p_qty);
    PERFORM pg_temp.demo_bill(p_id, p_discount);
    PERFORM pg_temp.demo_pay(p_id, NULL, p_method, 'Settled at check-out', p_nights);
    PERFORM pg_temp.demo_checkout(p_id);
END;
$$;

