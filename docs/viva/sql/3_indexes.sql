-- =============================================================================
-- VIVA 3: Indexes and query plans
-- =============================================================================
-- Everything that adds data runs in one transaction and is rolled back.
-- Takes about 2-3 seconds.

-- Our indexes (PK and UNIQUE indexes are created automatically):
SELECT tablename, indexname
  FROM pg_indexes
 WHERE schemaname = 'public'
   AND (indexname LIKE 'idx_%' OR indexname = 'excl_booking_room_overlap')
 ORDER BY tablename, indexname;

-- (A) Today, 57 bookings: the planner picks a Seq Scan. The whole table is
--     1-2 pages, so an index would cost MORE. That is the correct choice.
EXPLAIN ANALYZE
SELECT 1
  FROM booking
 WHERE room_id = 'e1000000-0000-0000-0000-000000000107'
   AND status IN ('Booked', 'Checked-In')
   AND check_in_date  < CURRENT_DATE + 14
   AND check_out_date > CURRENT_DATE + 10;

-- (B) Scale test: 16 years of history = 49,500 checked-out stays across all
--     33 rooms, each with a paid bill. Refresh statistics, let the planner choose.
\timing on
BEGIN;
INSERT INTO booking (guest_id, room_id, check_in_date, check_out_date,
                     rate_at_booking, payment_option, status)
SELECT (SELECT guest_id FROM guest ORDER BY guest_id LIMIT 1),
       r.room_id,
       DATE '2010-01-01' + (n * 3),
       DATE '2010-01-01' + (n * 3) + 2,
       5000, 'Cash', 'Checked-Out'
  FROM room r
 CROSS JOIN generate_series(0, 1499) AS n;

INSERT INTO bill (booking_id, room_charges, total_amount, amount_paid,
                  outstanding_balance, balance_flag)
SELECT booking_id, 10000, 11500, 11500, 0, FALSE
  FROM booking
 WHERE status = 'Checked-Out'
   AND booking_id NOT IN (SELECT booking_id FROM bill);

ANALYZE booking;
ANALYZE bill;
\timing off

-- (B1) The trigger's question: does an ACTIVE booking overlap these dates?
--      Uses the GiST index behind excl_booking_room_overlap. It is PARTIAL
--      (Booked / Checked-In only), so the 49,500 old stays are not in it.
EXPLAIN ANALYZE
SELECT 1
  FROM booking
 WHERE room_id = 'e1000000-0000-0000-0000-000000000107'
   AND status IN ('Booked', 'Checked-In')
   AND check_in_date  < CURRENT_DATE + 14
   AND check_out_date > CURRENT_DATE + 10;

-- (B2) A room's bookings in a date range: composite B-tree
--      (room_id, check_in_date, check_out_date). Equality column first,
--      then the range columns, so all three appear in the Index Cond.
EXPLAIN ANALYZE
SELECT 1
  FROM booking
 WHERE room_id = 'e1000000-0000-0000-0000-000000000107'
   AND check_in_date  < DATE '2015-01-10'
   AND check_out_date > DATE '2015-01-05';

-- (B3) Before/after: drop that index (inside this transaction only), rerun.
--      Compare Execution Time with B2.
DROP INDEX idx_booking_room_dates;
EXPLAIN ANALYZE
SELECT 1
  FROM booking
 WHERE room_id = 'e1000000-0000-0000-0000-000000000107'
   AND check_in_date  < DATE '2015-01-10'
   AND check_out_date > DATE '2015-01-05';

-- (B4) Foreign-key index: one guest's bookings (My bookings page).
--      PostgreSQL does NOT index foreign keys automatically.
EXPLAIN ANALYZE
SELECT * FROM booking
 WHERE guest_id = (SELECT guest_id FROM guest WHERE full_name LIKE 'Ruwan%');

-- (B5) Partial index on unpaid bills (Balance due tile and report):
--      11 unpaid bills out of ~49,500.
EXPLAIN ANALYZE
SELECT booking_id, outstanding_balance
  FROM bill
 WHERE balance_flag = TRUE;

-- Size of the partial index vs the same index over every bill:
CREATE INDEX tmp_bill_flag_full ON bill (balance_flag);
SELECT pg_size_pretty(pg_relation_size('idx_bill_outstanding')) AS partial_index,
       pg_size_pretty(pg_relation_size('tmp_bill_flag_full'))   AS full_index;

ROLLBACK;
-- Undone: the 99,000 extra rows, the temp index and the dropped index.
SELECT count(*) AS bookings_after_rollback FROM booking;
