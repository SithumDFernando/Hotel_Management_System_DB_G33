-- =============================================================================
-- VIVA 2: The bill is small functions composed inside one procedure
-- =============================================================================
-- Tharindu Senanayake, room 110 (SN-71090000): 4 nights, services,
-- discount 2,000, deposit 5,000.

-- Each helper function on its own (db/functions/):
SELECT fn_calculate_nights(check_in_date, check_out_date) AS nights,
       rate_at_booking,
       fn_get_room_charges(booking_id)        AS room_charges,
       fn_get_service_charges(booking_id)     AS service_charges,
       fn_get_outstanding_balance(booking_id) AS outstanding
  FROM booking
 WHERE booking_id = '71090000-0000-0000-0000-000000000000';

-- What generate_bill() stored (room + services - discount, +15% tax):
SELECT room_charges, service_charges, discount_amount, tax_amount,
       total_amount, amount_paid, outstanding_balance, balance_flag
  FROM bill
 WHERE booking_id = '71090000-0000-0000-0000-000000000000';

-- Overpayment is rejected inside record_payment() (bill row locked FOR UPDATE).
BEGIN;
CALL record_payment('71090000-0000-0000-0000-000000000000',
                    999999, 'Cash', 'too much', NULL);
ROLLBACK;
