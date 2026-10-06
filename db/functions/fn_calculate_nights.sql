-- Nights stayed between two dates. Minimum 1 (a same-day stay is not 0 nights).

CREATE OR REPLACE FUNCTION fn_calculate_nights(p_check_in DATE, p_check_out DATE)
RETURNS INT
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT GREATEST(p_check_out - p_check_in, 1);
$$;
