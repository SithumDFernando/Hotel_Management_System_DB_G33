-- Total room charge for a booking = rate_at_booking * nights.
-- Uses the frozen rate snapshot, never the current room_rate.
-- Depends on: fn_calculate_nights

CREATE OR REPLACE FUNCTION fn_get_room_charges(p_booking_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_charge NUMERIC;
BEGIN
    SELECT b.rate_at_booking * fn_calculate_nights(b.check_in_date, b.check_out_date)
      INTO v_charge
      FROM booking b
     WHERE b.booking_id = p_booking_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found';
    END IF;

    RETURN v_charge;
END;
$$;