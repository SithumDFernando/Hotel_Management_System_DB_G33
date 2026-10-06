-- Sum of (quantity * unit_price) over a booking's service usage. 0 if none.

CREATE OR REPLACE FUNCTION fn_get_service_charges(p_booking_id UUID)
RETURNS NUMERIC
LANGUAGE sql
STABLE
AS $$
    SELECT COALESCE(SUM(su.quantity * su.unit_price), 0.00)
      FROM service_usage su
     WHERE su.booking_id = p_booking_id;
$$;