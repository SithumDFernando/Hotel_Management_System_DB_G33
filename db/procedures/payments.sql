-- record_payment(booking, amount, method, notes)
-- (call with: CALL record_payment(...))

-- Inserts a payment and updates the bill's amount_paid, outstanding_balance
-- and balance_flag in one atomic call. Supports partial payments.
-- The bill row is locked so concurrent payments cannot overpay.
-- Depends on: fn_get_outstanding_balance


CREATE OR REPLACE PROCEDURE record_payment(
    p_booking_id     UUID,
    p_amount         NUMERIC,
    p_payment_method VARCHAR,
    p_notes          VARCHAR DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_total           NUMERIC(10,2);
    v_balance         NUMERIC(10,2);
    v_new_paid        NUMERIC(10,2);
    v_new_outstanding NUMERIC(10,2);
BEGIN
    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'Amount must be positive';
    END IF;

    IF p_amount <> ROUND(p_amount, 2) THEN
        RAISE EXCEPTION 'Amount can have at most 2 decimal places';
    END IF;

    -- Lock the bill row for the duration of this transaction
    SELECT bl.total_amount
      INTO v_total
      FROM bill bl
     WHERE bl.booking_id = p_booking_id
       FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Bill not yet generated for this booking';
    END IF;

    v_balance := fn_get_outstanding_balance(p_booking_id);

    IF p_amount > v_balance THEN
        RAISE EXCEPTION 'Amount exceeds outstanding balance of LKR %', v_balance;
    END IF;

    INSERT INTO payment (booking_id, amount, payment_method, notes)
    VALUES (p_booking_id, p_amount, p_payment_method, p_notes);

    -- Recalculate from the payment ledger (source of truth)
    SELECT COALESCE(SUM(p.amount), 0.00)
      INTO v_new_paid
      FROM payment p
     WHERE p.booking_id = p_booking_id;

    v_new_outstanding := GREATEST(v_total - v_new_paid, 0.00);

    UPDATE bill
       SET amount_paid         = v_new_paid,
           outstanding_balance = v_new_outstanding,
           balance_flag        = v_new_outstanding > 0
     WHERE booking_id = p_booking_id;
END;
$$;