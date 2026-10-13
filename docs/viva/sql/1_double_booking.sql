-- =============================================================================
-- VIVA 1: Double booking is blocked by the DATABASE, not just the UI
-- =============================================================================
-- Sarah Williams holds room 107 (Colombo) from D+10 to D+14 (SN-71100000).
-- We insert an overlapping booking directly, bypassing the API.
-- Every block is rolled back: the demo data is not changed.

-- Layer 1: the BEFORE INSERT trigger trg_double_booking rejects it.
BEGIN;
INSERT INTO booking (guest_id, room_id, check_in_date, check_out_date,
                     rate_at_booking, payment_option, status)
SELECT guest_id, room_id, check_in_date + 1, check_out_date + 1,
       rate_at_booking, 'Cash', 'Booked'
  FROM booking
 WHERE booking_id = '71100000-0000-0000-0000-000000000000';
ROLLBACK;

-- Layer 2: switch the trigger OFF (inside this transaction only).
-- The exclusion constraint still rejects it. This is the guarantee that holds
-- under concurrency, when two transactions can't see each other's rows.
BEGIN;
ALTER TABLE booking DISABLE TRIGGER trg_double_booking;
INSERT INTO booking (guest_id, room_id, check_in_date, check_out_date,
                     rate_at_booking, payment_option, status)
SELECT guest_id, room_id, check_in_date + 1, check_out_date + 1,
       rate_at_booking, 'Cash', 'Booked'
  FROM booking
 WHERE booking_id = '71100000-0000-0000-0000-000000000000';
ROLLBACK;

-- Back-to-back stays are allowed: '[)' = the check-out day can be the next
-- guest's check-in day.
BEGIN;
INSERT INTO booking (guest_id, room_id, check_in_date, check_out_date,
                     rate_at_booking, payment_option, status)
SELECT guest_id, room_id, check_out_date, check_out_date + 2,
       rate_at_booking, 'Cash', 'Booked'
  FROM booking
 WHERE booking_id = '71100000-0000-0000-0000-000000000000';
ROLLBACK;

-- The constraint itself:
SELECT conname, pg_get_constraintdef(oid) AS definition
  FROM pg_constraint
 WHERE conname = 'excl_booking_room_overlap';
