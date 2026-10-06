-- Amount still owed on a booking's bill: GREATEST(total - paid, 0.00).
-- Raises if the bill has not been generated yet.
-- Also used by check_out() (checkin_checkout.sql).

CREATE OR REPLACE FUNCTION fn_get_outstanding_balance(p_booking_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_balance NUMERIC;
BEGIN
    SELECT GREATEST(bl.total_amount - bl.amount_paid, 0.00)
      INTO v_balance
      FROM bill bl
     WHERE bl.booking_id = p_booking_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Bill not yet generated for this booking';
    END IF;

    RETURN v_balance;
END;
$$;