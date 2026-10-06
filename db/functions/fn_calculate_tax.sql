-- Tax on an amount, rounded to 2 decimal places. Default rate is 15% (Sri Lanka standard / SRS REQ-6.1).

CREATE OR REPLACE FUNCTION fn_calculate_tax(
    p_amount   NUMERIC,
    p_tax_rate NUMERIC DEFAULT 0.15
)
RETURNS NUMERIC
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT ROUND(p_amount * p_tax_rate, 2);
$$;