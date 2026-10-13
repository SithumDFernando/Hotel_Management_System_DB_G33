-- =============================================================================
-- db/seed/sample_data.sql
-- =============================================================================
-- Purpose:
--   The single mock database for SkyNest: realistic data for development,
--   testing and demos. Loaded by run_all.sql after the schema is built.
--
--   PART 1 (sections 1-13): fixed dates (Sept-Oct 2026) and hardcoded values.
--           The backend tests depend on it.
--   PART 2 (sections 14-17): date-relative demo data (relative to CURRENT_DATE
--           at build time) for manual testing, built through the real triggers
--           and procedures. Rebuild the database on the day you test.
--
-- IMPORTANT:
--   - Uses hardcoded UUIDs so test scripts and team members can reference
--     specific rows by ID predictably.
--   - Passwords are bcrypt-hashed. All test accounts use: SkyNest@2026
--   - Wrapped in a transaction for atomic insert / clean rollback.
--   - Part 1 does not depend on any functions, procedures or triggers (all
--     computed values are hardcoded). Part 2 needs them (fn_get_current_rate,
--     generate_bill, record_payment, trg_room_status, trg_service_usage).
--
-- Data inserted (in FK dependency order):
--   1. BRANCH           (3 rows)
--   2. ROOM_TYPE        (4 rows)
--   3. AMENITY          (8 rows)
--   4. ROOM_AMENITY     (21 junction rows)
--   5. ROOM_RATE        (12 rows — one per branch × room_type)
--   6. ROOM             (12 rooms across 3 branches)
--   7. GUEST            (6 guests — mix of Individual + Corporate)
--   8. USER_ACCOUNT     (7 accounts — admin, managers, receptionist, guests)
--   9. SERVICE          (6 services)
--   10. BOOKING         (7 bookings in various states + edge cases)
--   11. SERVICE_USAGE   (9 rows — only for Checked-In/Checked-Out bookings)
--   12. BILL            (4 rows — 3 completed bookings + 1 provisional)
--   13. PAYMENT         (4 rows — full, partial, and multi-payment)
--   14-17. Demo data: 21 rooms, 28 guests, 11 accounts, 50 bookings with
--          services, bills and payments (see PART 2 below)
-- =============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. BRANCH — 3 hotel locations across Sri Lanka
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO branch (branch_id, name, city, address, phone, manager_name) VALUES
    ('a0000000-0000-0000-0000-000000000001', 'SkyNest Colombo',  'Colombo',  '42 Galle Face Terrace, Colombo 03',    '+94 11 234 5678', 'Dilshan Fernando'),
    ('a0000000-0000-0000-0000-000000000002', 'SkyNest Kandy',    'Kandy',    '15 Temple Road, Kandy',                '+94 81 234 5678', 'Amaya Perera'),
    ('a0000000-0000-0000-0000-000000000003', 'SkyNest Galle',    'Galle',    '78 Lighthouse Street, Galle Fort',     '+94 91 234 5678', 'Nuwan Silva');


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. ROOM_TYPE — 4 categories with varying capacities
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO room_type (room_type_id, type_name, capacity) VALUES
    ('b0000000-0000-0000-0000-000000000001', 'Single',  1),
    ('b0000000-0000-0000-0000-000000000002', 'Double',  2),
    ('b0000000-0000-0000-0000-000000000003', 'Suite',   4),
    ('b0000000-0000-0000-0000-000000000004', 'Deluxe',  2);


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. AMENITY — 8 amenities across different types
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO amenity (amenity_id, amenity_type, amenity_name, description) VALUES
    ('c0000000-0000-0000-0000-000000000001', 'Technology',   'WiFi',              'High-speed wireless internet access'),
    ('c0000000-0000-0000-0000-000000000002', 'Climate',      'Air Conditioning',  'Individual climate control unit'),
    ('c0000000-0000-0000-0000-000000000003', 'Entertainment','TV',                '55-inch Smart LED TV with cable'),
    ('c0000000-0000-0000-0000-000000000004', 'Refreshment',  'Mini-bar',          'Stocked mini refrigerator with beverages and snacks'),
    ('c0000000-0000-0000-0000-000000000005', 'Outdoor',      'Balcony',           'Private balcony with garden/sea view'),
    ('c0000000-0000-0000-0000-000000000006', 'Bedding',      'King Bed',          'Premium king-size bed with luxury linen'),
    ('c0000000-0000-0000-0000-000000000007', 'Recreation',   'Pool Access',       'Access to infinity swimming pool'),
    ('c0000000-0000-0000-0000-000000000008', 'Wellness',     'Jacuzzi',           'In-room jacuzzi bathtub');


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. ROOM_AMENITY — Maps amenities to room types
--    Single:  WiFi, AC, TV (basics)
--    Double:  WiFi, AC, TV, Mini-bar
--    Suite:   WiFi, AC, TV, Mini-bar, Balcony, King Bed, Pool Access, Jacuzzi
--    Deluxe:  WiFi, AC, TV, Mini-bar, Balcony, King Bed
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO room_amenity (room_type_id, amenity_id, count) VALUES
    -- Single (3 amenities)
    ('b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 1),  -- WiFi
    ('b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 1),  -- AC
    ('b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 1),  -- TV

    -- Double (4 amenities)
    ('b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 1),  -- WiFi
    ('b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 1),  -- AC
    ('b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000003', 1),  -- TV
    ('b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000004', 1),  -- Mini-bar

    -- Suite (8 amenities, 2× TVs)
    ('b0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001', 1),  -- WiFi
    ('b0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000002', 2),  -- 2× AC
    ('b0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000003', 2),  -- 2× TV
    ('b0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000004', 1),  -- Mini-bar
    ('b0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000005', 1),  -- Balcony
    ('b0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000006', 1),  -- King Bed
    ('b0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000007', 1),  -- Pool Access
    ('b0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000008', 1),  -- Jacuzzi

    -- Deluxe (6 amenities)
    ('b0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000001', 1),  -- WiFi
    ('b0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000002', 1),  -- AC
    ('b0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000003', 1),  -- TV
    ('b0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000004', 1),  -- Mini-bar
    ('b0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000005', 1),  -- Balcony
    ('b0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000006', 1);  -- King Bed


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. ROOM_RATE — Daily rates per (branch, room_type) in LKR
--    3 branches × 4 room types = 12 rate rows
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO room_rate (room_rate_id, branch_id, room_type_id, daily_rate) VALUES
    -- Colombo (premium pricing)
    ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',  5000.00),   -- Single
    ('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002',  8000.00),   -- Double
    ('d0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 15000.00),   -- Suite
    ('d0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004', 12000.00),   -- Deluxe

    -- Kandy (mid-range pricing)
    ('d0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001',  4000.00),   -- Single
    ('d0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002',  6500.00),   -- Double
    ('d0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000003', 12000.00),   -- Suite
    ('d0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000004', 10000.00),   -- Deluxe

    -- Galle (budget-friendly)
    ('d0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001',  3500.00),   -- Single
    ('d0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002',  5500.00),   -- Double
    ('d0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003', 10000.00),   -- Suite
    ('d0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000004',  8500.00);   -- Deluxe


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. ROOM — 12 physical rooms (4 per branch), various statuses
--    Edge cases: one room in 'Maintenance' status
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO room (room_id, branch_id, room_type_id, room_number, status) VALUES
    -- Colombo branch (rooms 101-104)
    ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', '101', 'Occupied'),     -- Suite, occupied by checked-in guest
    ('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', '102', 'Available'),    -- Double
    ('e0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '103', 'Available'),    -- Single
    ('e0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004', '104', 'Maintenance'),  -- Deluxe, under repair

    -- Kandy branch (rooms 201-204)
    ('e0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', '201', 'Available'),    -- Double
    ('e0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', '202', 'Available'),    -- Single
    ('e0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000003', '203', 'Available'),    -- Suite
    ('e0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000004', '204', 'Available'),    -- Deluxe

    -- Galle branch (rooms 301-304)
    ('e0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', '301', 'Available'),    -- Single
    ('e0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002', '302', 'Available'),    -- Double
    ('e0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003', '303', 'Available'),    -- Suite
    ('e0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000004', '304', 'Available');    -- Deluxe


-- ─────────────────────────────────────────────────────────────────────────────
-- 7. GUEST — 6 guests, mix of Individual and Corporate
--    Edge cases:
--    - Corporate guest with company details
--    - Guest with NULL optional fields (date_of_birth, nationality, gender)
--    - Multiple guests to test booking/billing independently
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO guest (guest_id, full_name, nic_passport, email, phone, date_of_birth, nationality, gender, guest_type, company_name, company_reg_number, billing_contact_name) VALUES
    -- Individual guests (typical case)
    ('f0000000-0000-0000-0000-000000000001', 'Kamal Perera',     '200012345678',   'kamal@mail.com',      '+94 77 123 4567', '2000-03-15', 'Sri Lankan', 'Male',   'Individual', NULL, NULL, NULL),
    ('f0000000-0000-0000-0000-000000000002', 'Nimali Silva',     '199856789012',   'nimali@mail.com',     '+94 76 234 5678', '1998-07-22', 'Sri Lankan', 'Female', 'Individual', NULL, NULL, NULL),
    ('f0000000-0000-0000-0000-000000000003', 'John Smith',       'P12345678',      'john.smith@gmail.com','+44 20 7946 0958', '1985-11-30', 'British',    'Male',   'Individual', NULL, NULL, NULL),

    -- Guest with minimal optional fields (edge case: NULLs)
    ('f0000000-0000-0000-0000-000000000004', 'Anoma Bandara',    '197534567890',   'anoma@mail.com',      '+94 71 345 6789', NULL, NULL, NULL, 'Individual', NULL, NULL, NULL),

    -- Corporate guest (edge case: company fields populated)
    ('f0000000-0000-0000-0000-000000000005', 'Lanka Exports Ltd','PV00012345',     'travel@lankaexports.lk', '+94 11 567 8901', NULL, 'Sri Lankan', NULL, 'Corporate', 'Lanka Exports (Pvt) Ltd', 'PV00012345', 'Sunil Jayawardena'),

    -- Another individual for multi-booking test
    ('f0000000-0000-0000-0000-000000000006', 'Priya Rajapakse',  '199912340000',   'priya@mail.com',      '+94 72 456 7890', '1999-01-10', 'Sri Lankan', 'Female', 'Individual', NULL, NULL, NULL);


-- ─────────────────────────────────────────────────────────────────────────────
-- 8. USER_ACCOUNT — 7 login accounts
--    All passwords: SkyNest@2026
--    bcrypt hash: $2b$12$W/MMfGNxExUT5c5H5CB4ze/oKc.oDvMpyHd6iJFLO.MefijkUOVS6
--
--    Edge cases:
--    - Admin with no branch or guest link (both NULL)
--    - Manager linked to specific branch
--    - Receptionist linked to specific branch
--    - Guest accounts linked to guest profiles
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO user_account (account_id, guest_id, branch_id, email, password_hash, role) VALUES
    -- Admin (no branch, no guest — global superuser)
    ('10000000-0000-0000-0000-000000000001', NULL, NULL,
     'admin@skynest.lk',
     '$2b$12$W/MMfGNxExUT5c5H5CB4ze/oKc.oDvMpyHd6iJFLO.MefijkUOVS6', 'admin'),

    -- Manager — Colombo branch
    ('10000000-0000-0000-0000-000000000002', NULL, 'a0000000-0000-0000-0000-000000000001',
     'mgr.colombo@skynest.lk',
     '$2b$12$W/MMfGNxExUT5c5H5CB4ze/oKc.oDvMpyHd6iJFLO.MefijkUOVS6', 'manager'),

    -- Manager — Kandy branch
    ('10000000-0000-0000-0000-000000000003', NULL, 'a0000000-0000-0000-0000-000000000002',
     'mgr.kandy@skynest.lk',
     '$2b$12$W/MMfGNxExUT5c5H5CB4ze/oKc.oDvMpyHd6iJFLO.MefijkUOVS6', 'manager'),

    -- Receptionist — Colombo branch
    ('10000000-0000-0000-0000-000000000004', NULL, 'a0000000-0000-0000-0000-000000000001',
     'rec.colombo@skynest.lk',
     '$2b$12$W/MMfGNxExUT5c5H5CB4ze/oKc.oDvMpyHd6iJFLO.MefijkUOVS6', 'receptionist'),

    -- Receptionist — Galle branch
    ('10000000-0000-0000-0000-000000000005', NULL, 'a0000000-0000-0000-0000-000000000003',
     'rec.galle@skynest.lk',
     '$2b$12$W/MMfGNxExUT5c5H5CB4ze/oKc.oDvMpyHd6iJFLO.MefijkUOVS6', 'receptionist'),

    -- Guest account — linked to Kamal Perera's guest profile
    ('10000000-0000-0000-0000-000000000006', 'f0000000-0000-0000-0000-000000000001', NULL,
     'kamal@mail.com',
     '$2b$12$W/MMfGNxExUT5c5H5CB4ze/oKc.oDvMpyHd6iJFLO.MefijkUOVS6', 'guest'),

    -- Guest account — linked to Nimali Silva's guest profile
    ('10000000-0000-0000-0000-000000000007', 'f0000000-0000-0000-0000-000000000002', NULL,
     'nimali@mail.com',
     '$2b$12$W/MMfGNxExUT5c5H5CB4ze/oKc.oDvMpyHd6iJFLO.MefijkUOVS6', 'guest');


-- ─────────────────────────────────────────────────────────────────────────────
-- 9. SERVICE — 6 chargeable hotel services
--    Edge case: one inactive (soft-deleted) service
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO service (service_id, service_name, category, base_price, is_active) VALUES
    ('20000000-0000-0000-0000-000000000001', 'Room Service',       'F&B',           1500.00, TRUE),
    ('20000000-0000-0000-0000-000000000002', 'Spa Treatment',      'Wellness',      5000.00, TRUE),
    ('20000000-0000-0000-0000-000000000003', 'Laundry',            'Housekeeping',   500.00, TRUE),
    ('20000000-0000-0000-0000-000000000004', 'Airport Transfer',   'Transport',     3000.00, TRUE),
    ('20000000-0000-0000-0000-000000000005', 'Minibar Restock',    'F&B',           2500.00, TRUE),
    ('20000000-0000-0000-0000-000000000006', 'City Tour',          'Excursion',     8000.00, FALSE);  -- Inactive/discontinued


-- ─────────────────────────────────────────────────────────────────────────────
-- 10. BOOKING — 6 bookings covering all status states + edge cases
--
--     Status coverage:
--       - 'Checked-In'   : Active guest currently in the hotel
--       - 'Checked-Out'  : Completed stay with bill
--       - 'Booked'       : Future reservation (not yet arrived)
--       - 'Cancelled'    : Guest cancelled before arrival
--
--     Edge cases:
--       - 1-night stay (minimum)
--       - 7-night stay (long stay)
--       - Corporate guest booking
--       - Same guest with multiple bookings
--       - Booking at different branches
--
--     rate_at_booking is hardcoded as the snapshot value (matches room_rate
--     at the time the booking was "created").
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO booking (booking_id, guest_id, room_id, check_in_date, check_out_date, rate_at_booking, status, payment_option, actual_checkin_time, actual_checkout_time) VALUES
    -- BK-01: Checked-In — Kamal in Suite 101 Colombo (currently staying)
    ('30000000-0000-0000-0000-000000000001',
     'f0000000-0000-0000-0000-000000000001',   -- Kamal Perera
     'e0000000-0000-0000-0000-000000000001',   -- Room 101 (Suite, Colombo)
     '2026-09-27', '2026-10-01',               -- 4 nights
     15000.00, 'Checked-In', 'Credit Card',
     '2026-09-27 14:32:00', NULL),

    -- BK-02: Checked-Out — Nimali completed stay in Double 102 Colombo
    ('30000000-0000-0000-0000-000000000002',
     'f0000000-0000-0000-0000-000000000002',   -- Nimali Silva
     'e0000000-0000-0000-0000-000000000002',   -- Room 102 (Double, Colombo)
     '2026-09-20', '2026-09-23',               -- 3 nights
     8000.00, 'Checked-Out', 'Cash',
     '2026-09-20 15:10:00', '2026-09-23 11:05:00'),

    -- BK-03: Booked — Future reservation for John Smith in Suite 203 Kandy
    ('30000000-0000-0000-0000-000000000003',
     'f0000000-0000-0000-0000-000000000003',   -- John Smith
     'e0000000-0000-0000-0000-000000000007',   -- Room 203 (Suite, Kandy)
     '2026-10-10', '2026-10-17',               -- 7 nights (long stay)
     12000.00, 'Booked', 'Bank Transfer',
     NULL, NULL),

    -- BK-04: Cancelled — Anoma cancelled before arrival (edge case)
    ('30000000-0000-0000-0000-000000000004',
     'f0000000-0000-0000-0000-000000000004',   -- Anoma Bandara
     'e0000000-0000-0000-0000-000000000009',   -- Room 301 (Single, Galle)
     '2026-09-25', '2026-09-26',               -- 1 night (minimum stay)
     3500.00, 'Cancelled', 'Cash',
     NULL, NULL),

    -- BK-05: Checked-Out — Corporate booking, Lanka Exports in Deluxe 204 Kandy
    ('30000000-0000-0000-0000-000000000005',
     'f0000000-0000-0000-0000-000000000005',   -- Lanka Exports Ltd (Corporate)
     'e0000000-0000-0000-0000-000000000008',   -- Room 204 (Deluxe, Kandy)
     '2026-09-15', '2026-09-18',               -- 3 nights
     10000.00, 'Checked-Out', 'Bank Transfer',
     '2026-09-15 13:00:00', '2026-09-18 10:30:00'),

    -- BK-06: Booked — Same guest (Kamal) with a second future booking (edge case: multi-booking per guest)
    ('30000000-0000-0000-0000-000000000006',
     'f0000000-0000-0000-0000-000000000001',   -- Kamal Perera again
     'e0000000-0000-0000-0000-000000000010',   -- Room 302 (Double, Galle)
     '2026-10-05', '2026-10-07',               -- 2 nights
     5500.00, 'Booked', 'Credit Card',
     NULL, NULL),

    -- BK-07: Checked-Out — Priya in Suite 303 Galle (Galle branch coverage for all views)
    ('30000000-0000-0000-0000-000000000007',
     'f0000000-0000-0000-0000-000000000006',   -- Priya Rajapakse
     'e0000000-0000-0000-0000-000000000011',   -- Room 303 (Suite, Galle)
     '2026-09-10', '2026-09-13',               -- 3 nights x 10000 = 30000
     10000.00, 'Checked-Out', 'Credit Card',
     '2026-09-10 14:00:00', '2026-09-13 11:00:00');


-- ─────────────────────────────────────────────────────────────────────────────
-- 11. SERVICE_USAGE — Services consumed during checked-in/checked-out stays
--     unit_price is the SNAPSHOT of service.base_price at time of usage
--     (normally set by trigger, but hardcoded here since trigger may not exist)
--
--     Edge cases:
--       - Multiple services on one booking (BK-01: 3 usages, BK-05: 2 usages)
--       - quantity > 1 (bulk usage)
--       - Services on both Checked-In and Checked-Out bookings
--       - Service usages across all 3 branches (Colombo, Kandy, Galle)
--
--     trg_service_usage only allows usage on Checked-In bookings. These rows
--     are historical (recorded while BK-02/05/07 were still checked in), so the
--     trigger is disabled for this insert only. Without this, the error aborts
--     the whole seed transaction and every seed row is rolled back.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE service_usage DISABLE TRIGGER trg_service_usage;

INSERT INTO service_usage (usage_id, booking_id, service_id, usage_date, quantity, unit_price) VALUES
    -- Services for BK-01 (Kamal, Checked-In, Suite 101 Colombo) — 3 services
    ('40000000-0000-0000-0000-000000000001',
     '30000000-0000-0000-0000-000000000001',   -- BK-01
     '20000000-0000-0000-0000-000000000001',   -- Room Service
     '2026-09-27', 2, 1500.00),                -- 2x Room Service = 3000.00

    ('40000000-0000-0000-0000-000000000002',
     '30000000-0000-0000-0000-000000000001',   -- BK-01
     '20000000-0000-0000-0000-000000000002',   -- Spa Treatment
     '2026-09-28', 1, 5000.00),                -- 1x Spa = 5000.00

    ('40000000-0000-0000-0000-000000000007',
     '30000000-0000-0000-0000-000000000001',   -- BK-01
     '20000000-0000-0000-0000-000000000003',   -- Laundry
     '2026-09-29', 2, 500.00),                 -- 2x Laundry = 1000.00

    -- Services for BK-02 (Nimali, Checked-Out, Double 102 Colombo)
    ('40000000-0000-0000-0000-000000000003',
     '30000000-0000-0000-0000-000000000002',   -- BK-02
     '20000000-0000-0000-0000-000000000003',   -- Laundry
     '2026-09-21', 3, 500.00),                 -- 3x Laundry = 1500.00

    ('40000000-0000-0000-0000-000000000004',
     '30000000-0000-0000-0000-000000000002',   -- BK-02
     '20000000-0000-0000-0000-000000000001',   -- Room Service
     '2026-09-22', 1, 1500.00),                -- 1x Room Service = 1500.00

    -- Services for BK-05 (Lanka Exports, Checked-Out, Deluxe 204 Kandy) — 2 services
    ('40000000-0000-0000-0000-000000000005',
     '30000000-0000-0000-0000-000000000005',   -- BK-05
     '20000000-0000-0000-0000-000000000004',   -- Airport Transfer
     '2026-09-15', 1, 3000.00),                -- 1x Airport Transfer = 3000.00

    ('40000000-0000-0000-0000-000000000006',
     '30000000-0000-0000-0000-000000000005',   -- BK-05
     '20000000-0000-0000-0000-000000000005',   -- Minibar Restock
     '2026-09-16', 2, 2500.00),                -- 2x Minibar = 5000.00

    -- Services for BK-07 (Priya, Checked-Out, Suite 303 Galle) — Galle branch coverage
    ('40000000-0000-0000-0000-000000000008',
     '30000000-0000-0000-0000-000000000007',   -- BK-07
     '20000000-0000-0000-0000-000000000001',   -- Room Service
     '2026-09-11', 1, 1500.00),                -- 1x Room Service = 1500.00

    ('40000000-0000-0000-0000-000000000009',
     '30000000-0000-0000-0000-000000000007',   -- BK-07
     '20000000-0000-0000-0000-000000000004',   -- Airport Transfer
     '2026-09-10', 1, 3000.00);                -- 1x Airport Transfer = 3000.00

ALTER TABLE service_usage ENABLE TRIGGER trg_service_usage;


-- ─────────────────────────────────────────────────────────────────────────────
-- 12. BILL — Generated bills for completed and active bookings
--     Manually computed to match the seed data above:
--
--     BK-02 (Nimali, 3 nights x 8000 = 24000 room + 3000 services):
--       room_charges     = 24000.00
--       service_charges  = 1500 + 1500 = 3000.00
--       discount         = 0.00
--       subtotal         = 27000.00
--       tax (15%)        = 4050.00
--       total            = 31050.00
--       paid             = 31050.00 (fully paid)
--       outstanding      = 0.00
--
--     BK-05 (Lanka Exports, 3 nights x 10000 = 30000 room + 8000 services):
--       room_charges     = 30000.00
--       service_charges  = 3000 + 5000 = 8000.00  (Airport Transfer + Minibar)
--       discount         = 2000.00 (corporate discount)
--       subtotal         = 36000.00
--       tax (15%)        = 5400.00
--       total            = 41400.00
--       paid             = 20000.00 (partial — edge case)
--       outstanding      = 21400.00
--
--     BK-07 (Priya, 3 nights x 10000 = 30000 room + 4500 services — Galle):
--       room_charges     = 30000.00
--       service_charges  = 1500 + 3000 = 4500.00
--       discount         = 0.00
--       subtotal         = 34500.00
--       tax (15%)        = 5175.00
--       total            = 39675.00
--       paid             = 39675.00 (fully paid)
--       outstanding      = 0.00
--
--     BK-01 (Kamal, Checked-In — provisional bill, no payment yet):
--       room_charges     = 4 nights x 15000 = 60000.00
--       service_charges  = 3000 + 5000 + 1000 = 9000.00
--       discount         = 0.00
--       subtotal         = 69000.00
--       tax (15%)        = 10350.00
--       total            = 79350.00
--       paid             = 0.00  (edge case: unpaid active booking)
--       outstanding      = 79350.00
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO bill (bill_id, booking_id, room_charges, service_charges, discount_amount, tax_amount, total_amount, amount_paid, outstanding_balance, balance_flag, generated_at) VALUES
    -- Bill for BK-02 (Nimali — fully paid, Colombo, Sept 2026)
    ('50000000-0000-0000-0000-000000000001',
     '30000000-0000-0000-0000-000000000002',   -- BK-02
     24000.00, 3000.00, 0.00, 4050.00,         -- room, services, discount, tax
     31050.00,                                  -- total
     31050.00,                                  -- fully paid
     0.00,                                      -- no outstanding balance
     FALSE,                                     -- balance_flag = FALSE (settled)
     '2026-09-23 11:10:00'),

    -- Bill for BK-05 (Lanka Exports — partially paid, Kandy, Sept 2026)
    ('50000000-0000-0000-0000-000000000002',
     '30000000-0000-0000-0000-000000000005',   -- BK-05
     30000.00, 8000.00, 2000.00, 5400.00,      -- room, services, discount, tax
     41400.00,                                  -- total
     20000.00,                                  -- partially paid
     21400.00,                                  -- outstanding balance
     TRUE,                                      -- balance_flag = TRUE (still owes)
     '2026-09-18 10:35:00'),

    -- Bill for BK-07 (Priya — fully paid, Galle, Sept 2026)
    -- Edge case: Galle branch data for v_monthly_revenue and v_service_usage_breakdown
    ('50000000-0000-0000-0000-000000000003',
     '30000000-0000-0000-0000-000000000007',   -- BK-07
     30000.00, 4500.00, 0.00, 5175.00,         -- room, services, discount, tax
     39675.00,                                  -- total
     39675.00,                                  -- fully paid
     0.00,                                      -- no outstanding balance
     FALSE,                                     -- balance_flag = FALSE (settled)
     '2026-09-13 11:00:00'),

    -- Provisional bill for BK-01 (Kamal — Checked-In, no payment yet)
    -- Edge case: active booking with full balance outstanding
    ('50000000-0000-0000-0000-000000000004',
     '30000000-0000-0000-0000-000000000001',   -- BK-01
     60000.00, 9000.00, 0.00, 10350.00,        -- room, services, discount, tax
     79350.00,                                  -- total
     0.00,                                      -- no payment yet
     79350.00,                                  -- full outstanding balance
     TRUE,                                      -- balance_flag = TRUE (unpaid)
     '2026-09-27 14:45:00');


-- ─────────────────────────────────────────────────────────────────────────────
-- 13. PAYMENT — Payment transactions
--     Edge cases:
--       - Full payment in one transaction
--       - Split payment (two partial payments for one booking)
--       - Different payment methods (Cash, Credit Card, Bank Transfer)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO payment (payment_id, booking_id, amount, payment_method, paid_at, notes) VALUES
    -- Full payment for BK-02 (Nimali — single cash payment)
    ('60000000-0000-0000-0000-000000000001',
     '30000000-0000-0000-0000-000000000002',   -- BK-02
     31050.00, 'Cash',
     '2026-09-23 11:15:00',
     'Full payment at checkout'),

    -- Partial payment 1 for BK-05 (Lanka Exports — bank transfer)
    ('60000000-0000-0000-0000-000000000002',
     '30000000-0000-0000-0000-000000000005',   -- BK-05
     15000.00, 'Bank Transfer',
     '2026-09-18 10:40:00',
     'Corporate advance payment'),

    -- Partial payment 2 for BK-05 (Lanka Exports — credit card top-up)
    ('60000000-0000-0000-0000-000000000003',
     '30000000-0000-0000-0000-000000000005',   -- BK-05
     5000.00, 'Credit Card',
     '2026-09-19 09:00:00',
     'Second partial payment — balance pending'),

    -- Full payment for BK-07 (Priya, Galle — credit card at checkout)
    ('60000000-0000-0000-0000-000000000004',
     '30000000-0000-0000-0000-000000000007',   -- BK-07
     39675.00, 'Credit Card',
     '2026-09-13 11:30:00',
     'Full payment at checkout — Galle branch');



-- =============================================================================
-- PART 2 — DATE-RELATIVE DEMO DATA (for manual testing)
-- =============================================================================
-- Everything below is dated relative to CURRENT_DATE at build time, written D,
-- so a fresh build always has arrivals, departures, in-house guests and recent
-- revenue on the receptionist's Today screen. Rebuild on the day you test.
-- (Part 1 above uses fixed Sept-Oct 2026 dates and is what the backend tests
-- rely on.) Walkthrough: docs/work/manual_testing/MANUAL_TESTING_GUIDE.md.
--
--   - Purely additive: no Part 1 row is changed, and every demo booking uses
--     the new rooms x05-x11, so rooms 101-104 / 201-204 / 301-304 and bookings
--     BK-01..BK-07 are unaffected.
--   - Bookings are inserted as 'Booked' and moved on with UPDATE, so
--     trg_room_status sets Occupied/Available itself, and services go through
--     trg_service_usage (price snapshot, stay-date check).
--   - Bills and payments go through generate_bill() and record_payment(), so
--     totals and 15% tax are the system's own figures.
--   - All accounts use the password SkyNest@2026 (same bcrypt hash as Part 1).
--
-- UUID prefixes:
--   e1000000-...  rooms        f1000000-...  guests
--   11000000-...  accounts
--   7XYY0000-...  bookings: X = branch (1 Colombo, 2 Kandy, 3 Galle), YY = case,
--                 so the UI reference reads e.g. SN-71060000 (Colombo, case F)
--
-- Booking matrix per branch (x = 1 Colombo, 2 Kandy, 3 Galle):
--   case YY  room  dates          status       bill
--   A    01  x06   D   -> D+2     Booked       -        arrives today
--   B    02  x07   D-1 -> D+2     Booked       -        overdue arrival, can still check in
--   C    03  x06   D-3 -> D-1     Booked       -        stay ended, never checked in
--   E    05  x08   D+5 -> D+8     Booked       -        upcoming
--   F    06  x08   D-2 -> D       Checked-In   unpaid   departs today, balance due
--   G    07  x09   D-2 -> D       Checked-In   paid     departs today, ready to check out
--   H    08  x05   D-4 -> D-1     Checked-In   part     overdue checkout
--   I    09  x10   D-1 -> D+3     Checked-In   part     staying on, discount + services
--   K    10  x07   D+10 -> D+14   Booked       -        holds a Double for the 409 test
--   X    11  x06   D+10 -> D+12   Cancelled    -        cancelled (Colombo: room 111)
--   U    12  -     Kandy: Nimali 210 D+12 -> D+14; Galle: Kamal 306 D+20 -> D+22 (Booked)
--   P0   90  x05   D-9 -> D-6     Checked-Out  paid     this month's revenue
--   P1-5 91-95 x09 day 10-13 of each of the 5 previous months, Checked-Out, paid
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- 14. ROOM (demo) — 7 more per branch (x05-x11)
--     x11 is a free Double in Colombo (an alternative for the 409 test) and a
--     Maintenance room in Kandy and Galle.
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO room (room_id, branch_id, room_type_id, room_number, status) VALUES
    -- Colombo
    ('e1000000-0000-0000-0000-000000000105', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '105', 'Available'),   -- Single
    ('e1000000-0000-0000-0000-000000000106', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', '106', 'Available'),   -- Double
    ('e1000000-0000-0000-0000-000000000107', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', '107', 'Available'),   -- Double
    ('e1000000-0000-0000-0000-000000000108', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004', '108', 'Available'),   -- Deluxe
    ('e1000000-0000-0000-0000-000000000109', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', '109', 'Available'),   -- Suite
    ('e1000000-0000-0000-0000-000000000110', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '110', 'Available'),   -- Single
    ('e1000000-0000-0000-0000-000000000111', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', '111', 'Available'),   -- Double
    -- Kandy
    ('e1000000-0000-0000-0000-000000000205', 'a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', '205', 'Available'),   -- Single
    ('e1000000-0000-0000-0000-000000000206', 'a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', '206', 'Available'),   -- Double
    ('e1000000-0000-0000-0000-000000000207', 'a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', '207', 'Available'),   -- Double
    ('e1000000-0000-0000-0000-000000000208', 'a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000004', '208', 'Available'),   -- Deluxe
    ('e1000000-0000-0000-0000-000000000209', 'a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000003', '209', 'Available'),   -- Suite
    ('e1000000-0000-0000-0000-000000000210', 'a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', '210', 'Available'),   -- Single
    ('e1000000-0000-0000-0000-000000000211', 'a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', '211', 'Maintenance'), -- Single, under repair
    -- Galle
    ('e1000000-0000-0000-0000-000000000305', 'a0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', '305', 'Available'),   -- Single
    ('e1000000-0000-0000-0000-000000000306', 'a0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002', '306', 'Available'),   -- Double
    ('e1000000-0000-0000-0000-000000000307', 'a0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002', '307', 'Available'),   -- Double
    ('e1000000-0000-0000-0000-000000000308', 'a0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000004', '308', 'Available'),   -- Deluxe
    ('e1000000-0000-0000-0000-000000000309', 'a0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003', '309', 'Available'),   -- Suite
    ('e1000000-0000-0000-0000-000000000310', 'a0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', '310', 'Available'),   -- Single
    ('e1000000-0000-0000-0000-000000000311', 'a0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000004', '311', 'Maintenance'); -- Deluxe, under repair


-- ─────────────────────────────────────────────────────────────────────────────
-- 15. GUEST (demo) — 28 profiles. 01-06 get a login below; the rest are
--     front-desk guests (no login), found through the staff GuestPicker.
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO guest (guest_id, full_name, nic_passport, email, phone, date_of_birth, nationality, gender, guest_type, company_name, company_reg_number, billing_contact_name) VALUES
    -- With a login (Colombo scenarios + a corporate guest in Galle)
    ('f1000000-0000-0000-0000-000000000001', 'Ruwan Jayasinghe',      '199112340001', 'ruwan@mail.com',          '+94 77 300 0001', '1991-04-12', 'Sri Lankan', 'Male',   'Individual', NULL, NULL, NULL),
    ('f1000000-0000-0000-0000-000000000002', 'Sanduni Wickramasinghe','199562340002', 'sanduni@mail.com',        '+94 77 300 0002', '1995-08-03', 'Sri Lankan', 'Female', 'Individual', NULL, NULL, NULL),
    ('f1000000-0000-0000-0000-000000000003', 'Dilan Gunawardena',     '198812340003', 'dilan@mail.com',          '+94 77 300 0003', '1988-01-27', 'Sri Lankan', 'Male',   'Individual', NULL, NULL, NULL),
    ('f1000000-0000-0000-0000-000000000004', 'Tharindu Senanayake',   '199312340004', 'tharindu@mail.com',       '+94 77 300 0004', '1993-11-19', 'Sri Lankan', 'Male',   'Individual', NULL, NULL, NULL),
    ('f1000000-0000-0000-0000-000000000005', 'Kasun Herath',          '199712340005', 'kasun@mail.com',          '+94 77 300 0005', '1997-06-08', 'Sri Lankan', 'Male',   'Individual', NULL, NULL, NULL),
    ('f1000000-0000-0000-0000-000000000006', 'Ishara Fonseka',        '200062340006', 'ishara@mail.com',         '+94 77 300 0006', NULL,         NULL,         NULL,     'Individual', NULL, NULL, NULL),
    ('f1000000-0000-0000-0000-000000000025', 'Ceylon Tea Traders',    'PV00067890',   'travel@ceylontea.lk',     '+94 11 300 0025', NULL, 'Sri Lankan', NULL, 'Corporate', 'Ceylon Tea Traders (Pvt) Ltd', 'PV00067890', 'Ranjith Alwis'),
    -- Colombo, front desk only
    ('f1000000-0000-0000-0000-000000000007', 'Malith Rodrigo',        '198512340007', 'malith@mail.com',         '+94 77 300 0007', '1985-02-14', 'Sri Lankan', 'Male',   'Individual', NULL, NULL, NULL),
    ('f1000000-0000-0000-0000-000000000008', 'Chathuri Peiris',       '199962340008', 'chathuri@mail.com',       '+94 77 300 0008', '1999-09-30', 'Sri Lankan', 'Female', 'Individual', NULL, NULL, NULL),
    ('f1000000-0000-0000-0000-000000000009', 'Ahmed Rizvi',           '198712340009', 'ahmed.rizvi@mail.com',    '+94 77 300 0009', '1987-12-05', 'Sri Lankan', 'Male',   'Individual', NULL, NULL, NULL),
    ('f1000000-0000-0000-0000-000000000010', 'Sarah Williams',        'P23456710',    'sarah.w@mail.co.uk',      '+44 20 7946 0110', '1990-05-21', 'British',   'Female', 'Individual', NULL, NULL, NULL),
    -- Kandy, front desk only
    ('f1000000-0000-0000-0000-000000000011', 'Nuwan Dissanayake',     '198912340011', 'nuwan.d@mail.com',        '+94 77 300 0011', '1989-03-09', 'Sri Lankan', 'Male',   'Individual', NULL, NULL, NULL),
    ('f1000000-0000-0000-0000-000000000012', 'Hiruni Ekanayake',      '199862340012', 'hiruni@mail.com',         '+94 77 300 0012', '1998-10-11', 'Sri Lankan', 'Female', 'Individual', NULL, NULL, NULL),
    ('f1000000-0000-0000-0000-000000000013', 'Pradeep Kumara',        '198212340013', 'pradeep@mail.com',        '+94 77 300 0013', '1982-07-17', 'Sri Lankan', 'Male',   'Individual', NULL, NULL, NULL),
    ('f1000000-0000-0000-0000-000000000014', 'Emma Brown',            'P34567814',    'emma.brown@mail.com',     '+61 2 9374 0114', '1994-01-02', 'Australian','Female', 'Individual', NULL, NULL, NULL),
    ('f1000000-0000-0000-0000-000000000015', 'Ravi Shankar',          'P45678915',    'ravi.s@mail.in',          '+91 98 4500 0115', '1980-08-25', 'Indian',   'Male',   'Individual', NULL, NULL, NULL),
    ('f1000000-0000-0000-0000-000000000016', 'Lakmal Bandara',        '198412340016', 'lakmal@mail.com',         '+94 77 300 0016', '1984-04-04', 'Sri Lankan', 'Male',   'Individual', NULL, NULL, NULL),
    ('f1000000-0000-0000-0000-000000000017', 'Tomas Muller',          'C01234517',    'tomas.m@mail.de',         '+49 30 1234 0117', '1992-12-12', 'German',   'Male',   'Individual', NULL, NULL, NULL),
    -- Galle, front desk only
    ('f1000000-0000-0000-0000-000000000018', 'Gayan Weerasinghe',     '199012340018', 'gayan@mail.com',          '+94 77 300 0018', '1990-06-06', 'Sri Lankan', 'Male',   'Individual', NULL, NULL, NULL),
    ('f1000000-0000-0000-0000-000000000019', 'Dinithi Abeysekara',    '199662340019', 'dinithi@mail.com',        '+94 77 300 0019', '1996-02-28', 'Sri Lankan', 'Female', 'Individual', NULL, NULL, NULL),
    ('f1000000-0000-0000-0000-000000000020', 'Sunil Rathnayake',      '197812340020', 'sunil.r@mail.com',        '+94 77 300 0020', '1978-09-14', 'Sri Lankan', 'Male',   'Individual', NULL, NULL, NULL),
    ('f1000000-0000-0000-0000-000000000021', 'Yuki Tanaka',           'TK5678921',    'yuki.t@mail.jp',          '+81 3 1234 0121', '1993-03-03', 'Japanese', 'Female', 'Individual', NULL, NULL, NULL),
    ('f1000000-0000-0000-0000-000000000022', 'Madushani Perera',      '199462340022', 'madushani@mail.com',      '+94 77 300 0022', '1994-07-07', 'Sri Lankan', 'Female', 'Individual', NULL, NULL, NULL),
    ('f1000000-0000-0000-0000-000000000023', 'Oliver Grant',          'P56789023',    'oliver.g@mail.co.uk',     '+44 20 7946 0123', '1986-11-11', 'British',  'Male',   'Individual', NULL, NULL, NULL),
    ('f1000000-0000-0000-0000-000000000024', 'Asela Mendis',          '198312340024', 'asela@mail.com',          '+94 77 300 0024', '1983-05-05', 'Sri Lankan', 'Male',   'Individual', NULL, NULL, NULL),
    ('f1000000-0000-0000-0000-000000000026', 'Shanika Fernando',      '199162340026', 'shanika@mail.com',        '+94 77 300 0026', '1991-10-10', 'Sri Lankan', 'Female', 'Individual', NULL, NULL, NULL),
    -- Walk-ins with no bookings (GuestPicker / new booking tests)
    ('f1000000-0000-0000-0000-000000000027', 'Nadeesha Karunaratne',  '199262340027', 'nadeesha@mail.com',       '+94 77 300 0027', '1992-02-02', 'Sri Lankan', 'Female', 'Individual', NULL, NULL, NULL),
    ('f1000000-0000-0000-0000-000000000028', 'Kevin Lee',             'S67890128',    'kevin.lee@mail.sg',       '+65 6123 0128',   '1989-09-09', 'Singaporean','Male',  'Individual', NULL, NULL, NULL);


-- ─────────────────────────────────────────────────────────────────────────────
-- 16. USER_ACCOUNT (demo) — 11 more logins (password SkyNest@2026)
--     With the 7 in Part 1: 2 admins, a manager and a receptionist at every
--     branch, two receptionists in Colombo, and 9 guests.
--     John Smith (f0..03) deliberately keeps no login (backend tests rely on it).
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO user_account (account_id, guest_id, branch_id, email, password_hash, role) VALUES
    ('11000000-0000-0000-0000-000000000001', NULL, NULL,                                   'admin.ops@skynest.lk',    '$2b$12$W/MMfGNxExUT5c5H5CB4ze/oKc.oDvMpyHd6iJFLO.MefijkUOVS6', 'admin'),
    ('11000000-0000-0000-0000-000000000002', NULL, 'a0000000-0000-0000-0000-000000000003', 'mgr.galle@skynest.lk',    '$2b$12$W/MMfGNxExUT5c5H5CB4ze/oKc.oDvMpyHd6iJFLO.MefijkUOVS6', 'manager'),
    ('11000000-0000-0000-0000-000000000003', NULL, 'a0000000-0000-0000-0000-000000000002', 'rec.kandy@skynest.lk',    '$2b$12$W/MMfGNxExUT5c5H5CB4ze/oKc.oDvMpyHd6iJFLO.MefijkUOVS6', 'receptionist'),
    ('11000000-0000-0000-0000-000000000004', NULL, 'a0000000-0000-0000-0000-000000000001', 'rec2.colombo@skynest.lk', '$2b$12$W/MMfGNxExUT5c5H5CB4ze/oKc.oDvMpyHd6iJFLO.MefijkUOVS6', 'receptionist'),
    ('11000000-0000-0000-0000-000000000005', 'f1000000-0000-0000-0000-000000000001', NULL, 'ruwan@mail.com',          '$2b$12$W/MMfGNxExUT5c5H5CB4ze/oKc.oDvMpyHd6iJFLO.MefijkUOVS6', 'guest'),
    ('11000000-0000-0000-0000-000000000006', 'f1000000-0000-0000-0000-000000000002', NULL, 'sanduni@mail.com',        '$2b$12$W/MMfGNxExUT5c5H5CB4ze/oKc.oDvMpyHd6iJFLO.MefijkUOVS6', 'guest'),
    ('11000000-0000-0000-0000-000000000007', 'f1000000-0000-0000-0000-000000000003', NULL, 'dilan@mail.com',          '$2b$12$W/MMfGNxExUT5c5H5CB4ze/oKc.oDvMpyHd6iJFLO.MefijkUOVS6', 'guest'),
    ('11000000-0000-0000-0000-000000000008', 'f1000000-0000-0000-0000-000000000004', NULL, 'tharindu@mail.com',       '$2b$12$W/MMfGNxExUT5c5H5CB4ze/oKc.oDvMpyHd6iJFLO.MefijkUOVS6', 'guest'),
    ('11000000-0000-0000-0000-000000000009', 'f1000000-0000-0000-0000-000000000005', NULL, 'kasun@mail.com',          '$2b$12$W/MMfGNxExUT5c5H5CB4ze/oKc.oDvMpyHd6iJFLO.MefijkUOVS6', 'guest'),
    ('11000000-0000-0000-0000-000000000010', 'f1000000-0000-0000-0000-000000000006', NULL, 'ishara@mail.com',         '$2b$12$W/MMfGNxExUT5c5H5CB4ze/oKc.oDvMpyHd6iJFLO.MefijkUOVS6', 'guest'),
    ('11000000-0000-0000-0000-000000000011', 'f1000000-0000-0000-0000-000000000025', NULL, 'travel@ceylontea.lk',     '$2b$12$W/MMfGNxExUT5c5H5CB4ze/oKc.oDvMpyHd6iJFLO.MefijkUOVS6', 'guest');


-- ─────────────────────────────────────────────────────────────────────────────
-- 17. BOOKING, SERVICE_USAGE, BILL, PAYMENT (demo)
--     Plain SQL driven by the real triggers and procedures; no helper
--     functions (see db/seed/demo_helpers.sql for the unused originals).
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
    -- services (Part 1)
    s_room_svc CONSTANT UUID := '20000000-0000-0000-0000-000000000001';  -- Room Service 1500
    s_spa      CONSTANT UUID := '20000000-0000-0000-0000-000000000002';  -- Spa Treatment 5000
    s_laundry  CONSTANT UUID := '20000000-0000-0000-0000-000000000003';  -- Laundry 500
    s_airport  CONSTANT UUID := '20000000-0000-0000-0000-000000000004';  -- Airport Transfer 3000
    s_minibar  CONSTANT UUID := '20000000-0000-0000-0000-000000000005';  -- Minibar Restock 2500
    -- guests (Part 1)
    g_kamal    CONSTANT UUID := 'f0000000-0000-0000-0000-000000000001';
    g_nimali   CONSTANT UUID := 'f0000000-0000-0000-0000-000000000002';
    g_john     CONSTANT UUID := 'f0000000-0000-0000-0000-000000000003';
    g_anoma    CONSTANT UUID := 'f0000000-0000-0000-0000-000000000004';
    g_lanka    CONSTANT UUID := 'f0000000-0000-0000-0000-000000000005';
    g_priya    CONSTANT UUID := 'f0000000-0000-0000-0000-000000000006';
    m          DATE := date_trunc('month', CURRENT_DATE)::DATE;
    i          INT;
    rec        RECORD;
    v_payment  UUID;
    b_f        UUID;
    b_g        UUID;
    b_h        UUID;
    b_i        UUID;
BEGIN
    -- ── Past stays first (they move rooms Occupied -> Available) ─────────────
    -- P1-P5: day 10 of each of the last five months, 3 nights, one row per
    -- branch (Suite x09); P0: this month, D-9 -> D-6 on Single x05.
    FOR rec IN
        SELECT ('71' || (90 + n) || '0000-0000-0000-0000-000000000000')::UUID AS id,
               (ARRAY[g_kamal, g_nimali, 'f1000000-0000-0000-0000-000000000004'::UUID,
                      'f1000000-0000-0000-0000-000000000003'::UUID, g_priya])[n] AS guest,
               'e1000000-0000-0000-0000-000000000109'::UUID AS room,
               (m - make_interval(months => n))::DATE + 9 AS check_in,
               3 AS nights, 'Credit Card'::VARCHAR AS method,
               (ARRAY[s_room_svc, s_spa, s_laundry, s_minibar, s_airport])[n] AS service,
               n AS qty, NULL::NUMERIC AS discount
          FROM generate_series(1, 5) AS n
        UNION ALL
        SELECT ('72' || (90 + n) || '0000-0000-0000-0000-000000000000')::UUID,
               (ARRAY[g_john, g_lanka, g_anoma, 'f1000000-0000-0000-0000-000000000011'::UUID,
                      'f1000000-0000-0000-0000-000000000014'::UUID])[n],
               'e1000000-0000-0000-0000-000000000209'::UUID,
               (m - make_interval(months => n))::DATE + 9,
               3, 'Bank Transfer',
               (ARRAY[s_airport, s_room_svc, s_spa, s_laundry, s_minibar])[n],
               n, CASE WHEN n = 2 THEN 3000 END                -- corporate discount
          FROM generate_series(1, 5) AS n
        UNION ALL
        SELECT ('73' || (90 + n) || '0000-0000-0000-0000-000000000000')::UUID,
               (ARRAY[g_priya, 'f1000000-0000-0000-0000-000000000025'::UUID, g_anoma,
                      'f1000000-0000-0000-0000-000000000018'::UUID,
                      'f1000000-0000-0000-0000-000000000021'::UUID])[n],
               'e1000000-0000-0000-0000-000000000309'::UUID,
               (m - make_interval(months => n))::DATE + 9,
               3, 'Cash',
               (ARRAY[s_spa, s_minibar, s_room_svc, s_airport, s_laundry])[n],
               n, CASE WHEN n = 2 THEN 3000 END                -- corporate discount
          FROM generate_series(1, 5) AS n
        UNION ALL
        SELECT '71900000-0000-0000-0000-000000000000'::UUID, g_nimali,
               'e1000000-0000-0000-0000-000000000105'::UUID, CURRENT_DATE - 9,
               3, 'Cash', s_laundry, 2, NULL
        UNION ALL
        SELECT '72900000-0000-0000-0000-000000000000'::UUID, 'f1000000-0000-0000-0000-000000000013'::UUID,
               'e1000000-0000-0000-0000-000000000205'::UUID, CURRENT_DATE - 9,
               3, 'Credit Card', s_room_svc, 2, NULL
        UNION ALL
        SELECT '73900000-0000-0000-0000-000000000000'::UUID, 'f1000000-0000-0000-0000-000000000020'::UUID,
               'e1000000-0000-0000-0000-000000000305'::UUID, CURRENT_DATE - 9,
               3, 'Bank Transfer', s_spa, 1, NULL
    LOOP
        -- book
        INSERT INTO booking (booking_id, guest_id, room_id, check_in_date,
                             check_out_date, rate_at_booking, status, payment_option)
        SELECT rec.id, rec.guest, r.room_id, rec.check_in, rec.check_in + rec.nights,
               fn_get_current_rate(r.branch_id, r.room_type_id), 'Booked', rec.method
          FROM room r
         WHERE r.room_id = rec.room;

        -- check in
        UPDATE booking
           SET status = 'Checked-In',
               actual_checkin_time = check_in_date + TIME '14:00'
         WHERE booking_id = rec.id;

        -- one service on day 2 (unit_price is set by trg_service_usage)
        INSERT INTO service_usage (booking_id, service_id, usage_date, quantity, unit_price)
        VALUES (rec.id, rec.service, rec.check_in + 1, rec.qty, 0);

        -- bill and settle in full
        CALL generate_bill(rec.id, rec.discount);
        CALL record_payment(rec.id, fn_get_outstanding_balance(rec.id), rec.method,
                            'Settled at check-out', v_payment);
        UPDATE payment
           SET paid_at = rec.check_in + rec.nights + TIME '12:30'
         WHERE payment_id = v_payment;

        -- check out
        UPDATE booking
           SET status = 'Checked-Out',
               actual_checkout_time = check_out_date + TIME '11:00'
         WHERE booking_id = rec.id;
    END LOOP;

    -- ── Current bookings: all inserted as 'Booked' ───────────────────────────
    INSERT INTO booking (booking_id, guest_id, room_id, check_in_date,
                         check_out_date, rate_at_booking, status, payment_option)
    SELECT v.id::UUID, v.guest::UUID, r.room_id, CURRENT_DATE + v.d_in, CURRENT_DATE + v.d_out,
           fn_get_current_rate(r.branch_id, r.room_type_id), 'Booked', v.pay
      FROM (VALUES
        -- Colombo (x = 1)
        ('71010000-0000-0000-0000-000000000000', 'f1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000106',  0,  2, 'Credit Card'),   -- A Ruwan, arrives today
        ('71020000-0000-0000-0000-000000000000', 'f1000000-0000-0000-0000-000000000005', 'e1000000-0000-0000-0000-000000000107', -1,  2, 'Cash'),          -- B Kasun, overdue arrival
        ('71030000-0000-0000-0000-000000000000', 'f1000000-0000-0000-0000-000000000008', 'e1000000-0000-0000-0000-000000000106', -3, -1, 'Cash'),          -- C Chathuri, stay ended without check-in
        ('71050000-0000-0000-0000-000000000000', 'f1000000-0000-0000-0000-000000000009', 'e1000000-0000-0000-0000-000000000108',  5,  8, 'Bank Transfer'),  -- E Ahmed, upcoming
        ('71060000-0000-0000-0000-000000000000', 'f1000000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000108', -2,  0, 'Cash'),          -- F Sanduni, departs today, balance due
        ('71070000-0000-0000-0000-000000000000', 'f1000000-0000-0000-0000-000000000003', 'e1000000-0000-0000-0000-000000000109', -2,  0, 'Credit Card'),   -- G Dilan, departs today, paid in full
        ('71080000-0000-0000-0000-000000000000', 'f1000000-0000-0000-0000-000000000007', 'e1000000-0000-0000-0000-000000000105', -4, -1, 'Cash'),          -- H Malith, overdue checkout
        ('71090000-0000-0000-0000-000000000000', 'f1000000-0000-0000-0000-000000000004', 'e1000000-0000-0000-0000-000000000110', -1,  3, 'Bank Transfer'),  -- I Tharindu, staying on
        ('71100000-0000-0000-0000-000000000000', 'f1000000-0000-0000-0000-000000000010', 'e1000000-0000-0000-0000-000000000107', 10, 14, 'Credit Card'),    -- K Sarah, holds Double 107 for the 409 test
        ('71110000-0000-0000-0000-000000000000', 'f0000000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000111', 10, 12, 'Cash'),          -- X Nimali, cancelled
        -- Kandy (x = 2)
        ('72010000-0000-0000-0000-000000000000', 'f1000000-0000-0000-0000-000000000011', 'e1000000-0000-0000-0000-000000000206',  0,  2, 'Cash'),          -- A Nuwan
        ('72020000-0000-0000-0000-000000000000', 'f1000000-0000-0000-0000-000000000012', 'e1000000-0000-0000-0000-000000000207', -1,  2, 'Credit Card'),    -- B Hiruni
        ('72030000-0000-0000-0000-000000000000', 'f1000000-0000-0000-0000-000000000013', 'e1000000-0000-0000-0000-000000000206', -3, -1, 'Cash'),          -- C Pradeep
        ('72050000-0000-0000-0000-000000000000', 'f0000000-0000-0000-0000-000000000003', 'e1000000-0000-0000-0000-000000000208',  5,  8, 'Bank Transfer'),  -- E John
        ('72060000-0000-0000-0000-000000000000', 'f1000000-0000-0000-0000-000000000014', 'e1000000-0000-0000-0000-000000000208', -2,  0, 'Credit Card'),    -- F Emma
        ('72070000-0000-0000-0000-000000000000', 'f1000000-0000-0000-0000-000000000015', 'e1000000-0000-0000-0000-000000000209', -2,  0, 'Credit Card'),    -- G Ravi
        ('72080000-0000-0000-0000-000000000000', 'f1000000-0000-0000-0000-000000000016', 'e1000000-0000-0000-0000-000000000205', -4, -1, 'Cash'),          -- H Lakmal
        ('72090000-0000-0000-0000-000000000000', 'f0000000-0000-0000-0000-000000000005', 'e1000000-0000-0000-0000-000000000210', -1,  3, 'Bank Transfer'),  -- I Lanka Exports
        ('72100000-0000-0000-0000-000000000000', 'f1000000-0000-0000-0000-000000000017', 'e1000000-0000-0000-0000-000000000207', 10, 14, 'Credit Card'),    -- K Tomas
        ('72110000-0000-0000-0000-000000000000', 'f0000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000206', 10, 12, 'Cash'),          -- X Kamal (cancelled)
        ('72120000-0000-0000-0000-000000000000', 'f0000000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000210', 12, 14, 'Credit Card'),    -- U Nimali, upcoming
        -- Galle (x = 3)
        ('73010000-0000-0000-0000-000000000000', 'f1000000-0000-0000-0000-000000000018', 'e1000000-0000-0000-0000-000000000306',  0,  2, 'Credit Card'),    -- A Gayan
        ('73020000-0000-0000-0000-000000000000', 'f1000000-0000-0000-0000-000000000019', 'e1000000-0000-0000-0000-000000000307', -1,  2, 'Cash'),          -- B Dinithi
        ('73030000-0000-0000-0000-000000000000', 'f1000000-0000-0000-0000-000000000020', 'e1000000-0000-0000-0000-000000000306', -3, -1, 'Cash'),          -- C Sunil
        ('73050000-0000-0000-0000-000000000000', 'f1000000-0000-0000-0000-000000000021', 'e1000000-0000-0000-0000-000000000308',  5,  8, 'Bank Transfer'),  -- E Yuki
        ('73060000-0000-0000-0000-000000000000', 'f1000000-0000-0000-0000-000000000022', 'e1000000-0000-0000-0000-000000000308', -2,  0, 'Cash'),          -- F Madushani
        ('73070000-0000-0000-0000-000000000000', 'f1000000-0000-0000-0000-000000000023', 'e1000000-0000-0000-0000-000000000309', -2,  0, 'Credit Card'),    -- G Oliver
        ('73080000-0000-0000-0000-000000000000', 'f1000000-0000-0000-0000-000000000024', 'e1000000-0000-0000-0000-000000000305', -4, -1, 'Cash'),          -- H Asela
        ('73090000-0000-0000-0000-000000000000', 'f1000000-0000-0000-0000-000000000025', 'e1000000-0000-0000-0000-000000000310', -1,  3, 'Bank Transfer'),  -- I Ceylon Tea Traders
        ('73100000-0000-0000-0000-000000000000', 'f1000000-0000-0000-0000-000000000026', 'e1000000-0000-0000-0000-000000000307', 10, 14, 'Credit Card'),    -- K Shanika
        ('73110000-0000-0000-0000-000000000000', 'f0000000-0000-0000-0000-000000000006', 'e1000000-0000-0000-0000-000000000306', 10, 12, 'Cash'),          -- X Priya (cancelled)
        ('73120000-0000-0000-0000-000000000000', 'f0000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000306', 20, 22, 'Credit Card')     -- U Kamal, upcoming
      ) AS v(id, guest, room, d_in, d_out, pay)
      JOIN room r ON r.room_id = v.room::UUID;

    -- ── Same in-house state at every branch ─────────────────────────────────
    FOR i IN 1..3 LOOP
        b_f := ('7' || i || '060000-0000-0000-0000-000000000000')::UUID;
        b_g := ('7' || i || '070000-0000-0000-0000-000000000000')::UUID;
        b_h := ('7' || i || '080000-0000-0000-0000-000000000000')::UUID;
        b_i := ('7' || i || '090000-0000-0000-0000-000000000000')::UUID;

        -- X: cancelled before arrival
        UPDATE booking SET status = 'Cancelled'
         WHERE booking_id = ('7' || i || '110000-0000-0000-0000-000000000000')::UUID;

        -- check in F, G, H, I (Occupied via trg_room_status)
        UPDATE booking
           SET status = 'Checked-In',
               actual_checkin_time = check_in_date + TIME '14:00'
         WHERE booking_id IN (b_f, b_g, b_h, b_i);

        -- services: F two, G spa, H minibar, I two (unit_price from trg_service_usage)
        INSERT INTO service_usage (booking_id, service_id, usage_date, quantity, unit_price)
        SELECT b.booking_id, u.service_id, b.check_in_date + u.day, u.qty, 0
          FROM (VALUES
                (b_f, s_room_svc, 0, 2),
                (b_f, s_laundry,  1, 1),
                (b_g, s_spa,      1, 1),
                (b_h, s_minibar,  1, 1),
                (b_i, s_room_svc, 0, 1),
                (b_i, s_airport,  0, 1)
               ) AS u(booking_id, service_id, day, qty)
          JOIN booking b ON b.booking_id = u.booking_id;

        -- bills: F unpaid, G paid in full, H part-paid, I LKR 2,000 discount + part-paid
        CALL generate_bill(b_f);
        CALL generate_bill(b_g);
        CALL generate_bill(b_h);
        CALL generate_bill(b_i, 2000);

        -- G: paid in full on day 2
        CALL record_payment(b_g, fn_get_outstanding_balance(b_g), 'Credit Card', 'Paid in full', v_payment);
        UPDATE payment p SET paid_at = b.check_in_date + 1 + TIME '12:30'
          FROM booking b WHERE p.payment_id = v_payment AND b.booking_id = b_g;

        -- H: LKR 10,000 at check-in
        CALL record_payment(b_h, 10000, 'Cash', 'Part payment at check-in', v_payment);
        UPDATE payment p SET paid_at = b.check_in_date + 0 + TIME '12:30'
          FROM booking b WHERE p.payment_id = v_payment AND b.booking_id = b_h;

        -- I: LKR 5,000 deposit
        CALL record_payment(b_i, 5000, 'Bank Transfer', 'Deposit', v_payment);
        UPDATE payment p SET paid_at = b.check_in_date + 0 + TIME '12:30'
          FROM booking b WHERE p.payment_id = v_payment AND b.booking_id = b_i;
    END LOOP;
END;
$$;


COMMIT;

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed Summary
-- ─────────────────────────────────────────────────────────────────────────────
-- Edge cases covered in this seed:
--   ✓ All 4 booking statuses: Booked, Checked-In, Checked-Out, Cancelled
--   ✓ Both guest types: Individual (4) and Corporate (1)
--   ✓ Guest with minimal data (NULL optional fields)
--   ✓ Room in Maintenance status
--   ✓ 1-night minimum stay and 7-night long stay
--   ✓ Same guest with multiple bookings (Kamal: BK-01 + BK-06)
--   ✓ Bookings across all 3 branches (Colombo, Kandy, Galle)
--   ✓ Corporate guest with company details and corporate discount
--   ✓ Fully paid bill (balance_flag = FALSE) — BK-02 (Colombo), BK-07 (Galle)
--   ✓ Partially paid bill (balance_flag = TRUE, outstanding > 0) — BK-05 (Kandy)
--   ✓ Unpaid active bill (Checked-In booking) — BK-01 (Colombo)
--   ✓ Multiple payments against one booking (split payment) — BK-05
--   ✓ Different payment methods: Cash, Credit Card, Bank Transfer
--   ✓ Inactive/discontinued service (City Tour, is_active = FALSE)
--   ✓ Service usage with quantity > 1 (bulk usage)
--   ✓ Multiple service usages per booking — BK-01 (3), BK-05 (2), BK-07 (2)
--   ✓ Service usages across all 3 branches (Colombo: BK-01/02, Kandy: BK-05, Galle: BK-07)
--   ✓ All user roles: admin, manager, receptionist, guest
--   ✓ Admin with NULL branch/guest (global superuser)
--   ✓ Multiple amenity counts (Suite has 2x AC, 2x TV)
--   ✓ Rates varying per branch (premium to budget pricing)
--
-- View Coverage Verification:
--   v_room_occupancy        -> 12 rooms across 3 branches; 1 Checked-In (BK-01), 1 Maintenance
--   v_guest_billing_summary -> 4 bills: 2 fully paid, 1 partial, 1 unpaid Checked-In
--   v_service_usage_breakdown -> 9 usages across Colombo (BK-01/02), Kandy (BK-05), Galle (BK-07)
--   v_monthly_revenue       -> Sept 2026: Colombo (BK-02 Checked-Out), Kandy (BK-05), Galle (BK-07)
--   v_top_services          -> Ranked by qty: Laundry(7), Room Service(5), Airport Transfer(2),
--                              Minibar Restock(2), Spa Treatment(1) — all 5 active services appear
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- Part 2 summary (added on top of Part 1)
--   ROOM          21  (7 per branch; 211 and 311 in Maintenance; 4 Occupied
--                      per branch after check-ins: x05, x08, x09, x10)
--   GUEST         28  (2 corporate with Part 1's Lanka Exports; 2 walk-ins)
--   USER_ACCOUNT  11  (admin.ops, mgr.galle, rec.kandy, rec2.colombo, 7 guests)
--   BOOKING       50  (18 Checked-Out, 12 Checked-In, 17 Booked, 3 Cancelled)
--   BILL          30  (18 paid stays + F unpaid, G paid, H/I part-paid per branch)
-- ─────────────────────────────────────────────────────────────────────────────
