-- =============================================================================
-- db/seed/sample_data.sql
-- =============================================================================
-- Purpose:
--   Populates the database with realistic sample data for development and
--   testing. Run AFTER run_all.sql has built the full schema. This data
--   allows the team to test the API, frontend pages, and reports without
--   needing to manually create records through the UI.
--
-- IMPORTANT:
--   - Uses hardcoded UUIDs so test scripts and team members can reference
--     specific rows by ID predictably.
--   - Passwords are bcrypt-hashed. All test accounts use: SkyNest@2026
--   - Wrapped in a transaction for atomic insert / clean rollback.
--   - Does NOT depend on any functions, procedures, or triggers.
--     All computed values (rate_at_booking, unit_price, bill totals) are
--     hardcoded so this seed works even before those objects are implemented.
--
-- Data inserted (in FK dependency order):
--   1. BRANCH           (3 rows)
--   2. ROOM_TYPE        (4 rows)
--   3. AMENITY          (8 rows)
--   4. ROOM_AMENITY     (16 junction rows)
--   5. ROOM_RATE        (12 rows — one per branch × room_type)
--   6. ROOM             (12 rooms across 3 branches)
--   7. GUEST            (6 guests — mix of Individual + Corporate)
--   8. USER_ACCOUNT     (7 accounts — admin, managers, receptionist, guests)
--   9. SERVICE          (6 services)
--   10. BOOKING         (6 bookings in various states + edge cases)
--   11. SERVICE_USAGE   (5 rows — only for Checked-In/Checked-Out bookings)
--   12. BILL            (2 rows — for completed bookings)
--   13. PAYMENT         (3 rows — full, partial, and multi-payment)
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
-- ─────────────────────────────────────────────────────────────────────────────

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
