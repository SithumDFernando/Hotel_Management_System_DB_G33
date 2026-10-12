-- generate_bill(booking, discount)   (call with: CALL generate_bill(...))

-- Creates the bill for a booking, or recalculates it if one already exists
-- (UPSERT on booking_id). Safe to call again after more services are added.

-- p_discount_amount:
--   NULL  -> keep the discount already on the bill (0 for a new bill)
--   value -> set the discount to that amount

-- Requires: UNIQUE (booking_id) on bill (02_constraints.sql).
-- Depends on: fn_get_room_charges, fn_get_service_charges, fn_calculate_tax


CREATE OR REPLACE PROCEDURE generate_bill(
    p_booking_id      UUID,
    p_discount_amount NUMERIC DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_status      booking_status;
    v_room        NUMERIC(10,2);
    v_svc         NUMERIC(10,2);
    v_discount    NUMERIC(10,2);
    v_subtotal    NUMERIC(10,2);
    v_tax         NUMERIC(10,2);
    v_total       NUMERIC(10,2);
    v_paid        NUMERIC(10,2);
    v_outstanding NUMERIC(10,2);
BEGIN
    -- Lock the booking row so two concurrent calls cannot interleave
    SELECT b.status INTO v_status
      FROM booking b
     WHERE b.booking_id = p_booking_id
       FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found';
    END IF;

    IF v_status NOT IN ('Checked-In', 'Checked-Out') THEN
        RAISE EXCEPTION 'Booking must be Checked-In or Checked-Out to generate a bill';
    END IF;

    v_room := fn_get_room_charges(p_booking_id);
    v_svc  := fn_get_service_charges(p_booking_id);

    v_discount := COALESCE(
        p_discount_amount,
        (SELECT bl.discount_amount FROM bill bl WHERE bl.booking_id = p_booking_id),
        0.00
    );

    IF v_discount < 0 OR v_discount > v_room + v_svc THEN
        RAISE EXCEPTION 'Discount must be between 0 and the bill subtotal';
    END IF;

    v_subtotal := v_room + v_svc - v_discount;
    v_tax      := fn_calculate_tax(v_subtotal);
    v_total    := v_subtotal + v_tax;

    v_paid := COALESCE(
        (SELECT SUM(p.amount) FROM payment p WHERE p.booking_id = p_booking_id),
        0.00
    );
    v_outstanding := GREATEST(v_total - v_paid, 0.00);

    INSERT INTO bill (
        booking_id, room_charges, service_charges, discount_amount,
        tax_amount, total_amount, amount_paid, outstanding_balance,
        balance_flag, generated_at
    )
    VALUES (
        p_booking_id, v_room, v_svc, v_discount,
        v_tax, v_total, v_paid, v_outstanding,
        v_outstanding > 0, NOW()
    )
    ON CONFLICT (booking_id) DO UPDATE SET
        room_charges        = EXCLUDED.room_charges,
        service_charges     = EXCLUDED.service_charges,
        discount_amount     = EXCLUDED.discount_amount,
        tax_amount          = EXCLUDED.tax_amount,
        total_amount        = EXCLUDED.total_amount,
        amount_paid         = EXCLUDED.amount_paid,
        outstanding_balance = EXCLUDED.outstanding_balance,
        balance_flag        = EXCLUDED.balance_flag,
        generated_at        = NOW();
END;
$$;