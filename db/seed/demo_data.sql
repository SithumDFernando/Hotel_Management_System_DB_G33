-- =============================================================================
-- db/seed/demo_data.sql
-- =============================================================================
-- Purpose:
--   Demo data for manual testing (docs/work/manual_testing/MANUAL_TESTING_GUIDE.md).
--   Loaded by run_all.sql right after sample_data.sql.
--
--   sample_data.sql uses fixed dates (Sept-Oct 2026), so on most days the
--   receptionist's Today screen has nothing to do. Every date in THIS file is
--   relative to CURRENT_DATE at build time, written D below, so a fresh build
--   always has arrivals, departures, in-house guests and recent revenue.
--   Rebuild the database on the day you test.
--
-- IMPORTANT:
--   - Purely additive: no row from sample_data.sql is changed, and every demo
--     booking uses the new rooms x05-x11, so backend tests that rely on rooms
--     101-104 / 201-204 / 301-304 and bookings BK-01..BK-07 are unaffected.
--   - Bookings are inserted as 'Booked' and moved on with UPDATE, so
--     trg_room_status sets Occupied/Available itself, and services go through
--     trg_service_usage (price snapshot, stay-date check).
--   - Bills and payments go through generate_bill() and record_payment(), so
--     totals and 15% tax are the system's own figures.
--   - All accounts use the password SkyNest@2026 (same bcrypt hash as
--     sample_data.sql).
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

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. ROOMS — 7 more per branch (x05-x11)
--    x11 is a free Double in Colombo (an alternative for the 409 test) and a
--    Maintenance room in Kandy and Galle.
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
-- 2. GUESTS — 28 profiles. 01-06 get a login below; the rest are front-desk
--    guests (no login), found through the staff GuestPicker.
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
-- 3. USER_ACCOUNT — 11 more logins (password SkyNest@2026)
--    With the 7 in sample_data.sql: 2 admins, a manager and a receptionist at
--    every branch, two receptionists in Colombo, and 9 guests.
--    John Smith (f0..03) deliberately keeps no login (backend tests rely on it).
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
-- 4. Helpers (session-local, dropped at disconnect)
--    Day offsets: demo_book() takes offsets from CURRENT_DATE; the others take
--    offsets from the booking's check-in date.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE FUNCTION pg_temp.demo_book(p_id UUID, p_guest UUID, p_room UUID,
                                  p_in INT, p_out INT, p_pay VARCHAR)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO booking (booking_id, guest_id, room_id, check_in_date,
                         check_out_date, rate_at_booking, status, payment_option)
    SELECT p_id, p_guest, r.room_id, CURRENT_DATE + p_in, CURRENT_DATE + p_out,
           fn_get_current_rate(r.branch_id, r.room_type_id), 'Booked', p_pay
      FROM room r
     WHERE r.room_id = p_room;
END;
$$;

CREATE FUNCTION pg_temp.demo_checkin(p_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    UPDATE booking
       SET status = 'Checked-In',
           actual_checkin_time = check_in_date + TIME '14:00'
     WHERE booking_id = p_id;
END;
$$;

CREATE FUNCTION pg_temp.demo_use(p_id UUID, p_service UUID, p_day INT, p_qty INT)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    -- unit_price is left to trg_service_usage (price snapshot)
    INSERT INTO service_usage (booking_id, service_id, usage_date, quantity, unit_price)
    SELECT p_id, p_service, b.check_in_date + p_day, p_qty, 0
      FROM booking b
     WHERE b.booking_id = p_id;
END;
$$;

CREATE FUNCTION pg_temp.demo_bill(p_id UUID, p_discount NUMERIC DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    CALL generate_bill(p_id, p_discount);
END;
$$;

-- p_amount NULL pays the whole outstanding balance
CREATE FUNCTION pg_temp.demo_pay(p_id UUID, p_amount NUMERIC, p_method VARCHAR,
                                 p_note VARCHAR, p_day INT)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
    v_amount     NUMERIC := COALESCE(p_amount, fn_get_outstanding_balance(p_id));
    v_payment_id UUID;
BEGIN
    CALL record_payment(p_id, v_amount, p_method, p_note, v_payment_id);
    UPDATE payment p
       SET paid_at = b.check_in_date + p_day + TIME '12:30'
      FROM booking b
     WHERE p.payment_id = v_payment_id
       AND b.booking_id = p_id;
END;
$$;

CREATE FUNCTION pg_temp.demo_checkout(p_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    UPDATE booking
       SET status = 'Checked-Out',
           actual_checkout_time = check_out_date + TIME '11:00'
     WHERE booking_id = p_id;
END;
$$;

CREATE FUNCTION pg_temp.demo_cancel(p_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    UPDATE booking SET status = 'Cancelled' WHERE booking_id = p_id;
END;
$$;

-- A finished stay: check in, services, bill, full payment, check out
CREATE FUNCTION pg_temp.demo_past(p_id UUID, p_guest UUID, p_room UUID,
                                  p_in DATE, p_nights INT, p_method VARCHAR,
                                  p_service UUID, p_qty INT,
                                  p_discount NUMERIC DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    PERFORM pg_temp.demo_book(p_id, p_guest, p_room,
                              p_in - CURRENT_DATE, p_in - CURRENT_DATE + p_nights,
                              p_method);
    PERFORM pg_temp.demo_checkin(p_id);
    PERFORM pg_temp.demo_use(p_id, p_service, 1, p_qty);
    PERFORM pg_temp.demo_bill(p_id, p_discount);
    PERFORM pg_temp.demo_pay(p_id, NULL, p_method, 'Settled at check-out', p_nights);
    PERFORM pg_temp.demo_checkout(p_id);
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. BOOKINGS, SERVICES, BILLS, PAYMENTS
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
    -- services (sample_data.sql)
    s_room_svc CONSTANT UUID := '20000000-0000-0000-0000-000000000001';  -- Room Service 1500
    s_spa      CONSTANT UUID := '20000000-0000-0000-0000-000000000002';  -- Spa Treatment 5000
    s_laundry  CONSTANT UUID := '20000000-0000-0000-0000-000000000003';  -- Laundry 500
    s_airport  CONSTANT UUID := '20000000-0000-0000-0000-000000000004';  -- Airport Transfer 3000
    s_minibar  CONSTANT UUID := '20000000-0000-0000-0000-000000000005';  -- Minibar Restock 2500
    -- guests from sample_data.sql
    g_kamal    CONSTANT UUID := 'f0000000-0000-0000-0000-000000000001';
    g_nimali   CONSTANT UUID := 'f0000000-0000-0000-0000-000000000002';
    g_john     CONSTANT UUID := 'f0000000-0000-0000-0000-000000000003';
    g_anoma    CONSTANT UUID := 'f0000000-0000-0000-0000-000000000004';
    g_lanka    CONSTANT UUID := 'f0000000-0000-0000-0000-000000000005';
    g_priya    CONSTANT UUID := 'f0000000-0000-0000-0000-000000000006';
    m          DATE := date_trunc('month', CURRENT_DATE)::DATE;
    i          INT;
BEGIN
    -- ── Past stays first (they move rooms Occupied -> Available) ─────────────
    -- P1-P5: day 10 of each of the last five months, 3 nights, Suite x09
    FOR i IN 1..5 LOOP
        PERFORM pg_temp.demo_past(('71' || (90 + i) || '0000-0000-0000-0000-000000000000')::UUID,
            (ARRAY[g_kamal, g_nimali, 'f1000000-0000-0000-0000-000000000004'::UUID,
                   'f1000000-0000-0000-0000-000000000003'::UUID, g_priya])[i],
            'e1000000-0000-0000-0000-000000000109',
            (m - make_interval(months => i))::DATE + 9, 3, 'Credit Card',
            (ARRAY[s_room_svc, s_spa, s_laundry, s_minibar, s_airport])[i], i);

        PERFORM pg_temp.demo_past(('72' || (90 + i) || '0000-0000-0000-0000-000000000000')::UUID,
            (ARRAY[g_john, g_lanka, g_anoma, 'f1000000-0000-0000-0000-000000000011'::UUID,
                   'f1000000-0000-0000-0000-000000000014'::UUID])[i],
            'e1000000-0000-0000-0000-000000000209',
            (m - make_interval(months => i))::DATE + 9, 3, 'Bank Transfer',
            (ARRAY[s_airport, s_room_svc, s_spa, s_laundry, s_minibar])[i], i,
            CASE WHEN i = 2 THEN 3000 END);            -- corporate discount

        PERFORM pg_temp.demo_past(('73' || (90 + i) || '0000-0000-0000-0000-000000000000')::UUID,
            (ARRAY[g_priya, 'f1000000-0000-0000-0000-000000000025'::UUID, g_anoma,
                   'f1000000-0000-0000-0000-000000000018'::UUID,
                   'f1000000-0000-0000-0000-000000000021'::UUID])[i],
            'e1000000-0000-0000-0000-000000000309',
            (m - make_interval(months => i))::DATE + 9, 3, 'Cash',
            (ARRAY[s_spa, s_minibar, s_room_svc, s_airport, s_laundry])[i], i,
            CASE WHEN i = 2 THEN 3000 END);            -- corporate discount
    END LOOP;

    -- P0: this month's revenue, D-9 -> D-6 on Single x05
    PERFORM pg_temp.demo_past('71900000-0000-0000-0000-000000000000', g_nimali,
        'e1000000-0000-0000-0000-000000000105', CURRENT_DATE - 9, 3, 'Cash', s_laundry, 2);
    PERFORM pg_temp.demo_past('72900000-0000-0000-0000-000000000000',
        'f1000000-0000-0000-0000-000000000013', 'e1000000-0000-0000-0000-000000000205',
        CURRENT_DATE - 9, 3, 'Credit Card', s_room_svc, 2);
    PERFORM pg_temp.demo_past('73900000-0000-0000-0000-000000000000',
        'f1000000-0000-0000-0000-000000000020', 'e1000000-0000-0000-0000-000000000305',
        CURRENT_DATE - 9, 3, 'Bank Transfer', s_spa, 1);

    -- ── Colombo (x = 1) ─────────────────────────────────────────────────────
    -- A: Ruwan arrives today
    PERFORM pg_temp.demo_book('71010000-0000-0000-0000-000000000000', 'f1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000106',  0,  2, 'Credit Card');
    -- B: Kasun, overdue arrival
    PERFORM pg_temp.demo_book('71020000-0000-0000-0000-000000000000', 'f1000000-0000-0000-0000-000000000005', 'e1000000-0000-0000-0000-000000000107', -1,  2, 'Cash');
    -- C: Chathuri, stay ended without check-in
    PERFORM pg_temp.demo_book('71030000-0000-0000-0000-000000000000', 'f1000000-0000-0000-0000-000000000008', 'e1000000-0000-0000-0000-000000000106', -3, -1, 'Cash');
    -- E: Ahmed, upcoming
    PERFORM pg_temp.demo_book('71050000-0000-0000-0000-000000000000', 'f1000000-0000-0000-0000-000000000009', 'e1000000-0000-0000-0000-000000000108',  5,  8, 'Bank Transfer');
    -- F: Sanduni, departs today, balance due
    PERFORM pg_temp.demo_book('71060000-0000-0000-0000-000000000000', 'f1000000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000108', -2,  0, 'Cash');
    -- G: Dilan, departs today, paid in full
    PERFORM pg_temp.demo_book('71070000-0000-0000-0000-000000000000', 'f1000000-0000-0000-0000-000000000003', 'e1000000-0000-0000-0000-000000000109', -2,  0, 'Credit Card');
    -- H: Malith, overdue checkout
    PERFORM pg_temp.demo_book('71080000-0000-0000-0000-000000000000', 'f1000000-0000-0000-0000-000000000007', 'e1000000-0000-0000-0000-000000000105', -4, -1, 'Cash');
    -- I: Tharindu, staying on
    PERFORM pg_temp.demo_book('71090000-0000-0000-0000-000000000000', 'f1000000-0000-0000-0000-000000000004', 'e1000000-0000-0000-0000-000000000110', -1,  3, 'Bank Transfer');
    -- K: Sarah holds Double 107 for the 409 test
    PERFORM pg_temp.demo_book('71100000-0000-0000-0000-000000000000', 'f1000000-0000-0000-0000-000000000010', 'e1000000-0000-0000-0000-000000000107', 10, 14, 'Credit Card');
    -- X: Nimali, cancelled
    PERFORM pg_temp.demo_book('71110000-0000-0000-0000-000000000000', g_nimali,                               'e1000000-0000-0000-0000-000000000111', 10, 12, 'Cash');

    -- ── Kandy (x = 2) ───────────────────────────────────────────────────────
    PERFORM pg_temp.demo_book('72010000-0000-0000-0000-000000000000', 'f1000000-0000-0000-0000-000000000011', 'e1000000-0000-0000-0000-000000000206',  0,  2, 'Cash');           -- A Nuwan
    PERFORM pg_temp.demo_book('72020000-0000-0000-0000-000000000000', 'f1000000-0000-0000-0000-000000000012', 'e1000000-0000-0000-0000-000000000207', -1,  2, 'Credit Card');    -- B Hiruni
    PERFORM pg_temp.demo_book('72030000-0000-0000-0000-000000000000', 'f1000000-0000-0000-0000-000000000013', 'e1000000-0000-0000-0000-000000000206', -3, -1, 'Cash');           -- C Pradeep
    PERFORM pg_temp.demo_book('72050000-0000-0000-0000-000000000000', g_john,                                 'e1000000-0000-0000-0000-000000000208',  5,  8, 'Bank Transfer');  -- E John
    PERFORM pg_temp.demo_book('72060000-0000-0000-0000-000000000000', 'f1000000-0000-0000-0000-000000000014', 'e1000000-0000-0000-0000-000000000208', -2,  0, 'Credit Card');    -- F Emma
    PERFORM pg_temp.demo_book('72070000-0000-0000-0000-000000000000', 'f1000000-0000-0000-0000-000000000015', 'e1000000-0000-0000-0000-000000000209', -2,  0, 'Credit Card');    -- G Ravi
    PERFORM pg_temp.demo_book('72080000-0000-0000-0000-000000000000', 'f1000000-0000-0000-0000-000000000016', 'e1000000-0000-0000-0000-000000000205', -4, -1, 'Cash');           -- H Lakmal
    PERFORM pg_temp.demo_book('72090000-0000-0000-0000-000000000000', g_lanka,                                'e1000000-0000-0000-0000-000000000210', -1,  3, 'Bank Transfer');  -- I Lanka Exports
    PERFORM pg_temp.demo_book('72100000-0000-0000-0000-000000000000', 'f1000000-0000-0000-0000-000000000017', 'e1000000-0000-0000-0000-000000000207', 10, 14, 'Credit Card');    -- K Tomas
    PERFORM pg_temp.demo_book('72110000-0000-0000-0000-000000000000', g_kamal,                                'e1000000-0000-0000-0000-000000000206', 10, 12, 'Cash');           -- X Kamal (cancelled)
    PERFORM pg_temp.demo_book('72120000-0000-0000-0000-000000000000', g_nimali,                               'e1000000-0000-0000-0000-000000000210', 12, 14, 'Credit Card');    -- U Nimali upcoming

    -- ── Galle (x = 3) ───────────────────────────────────────────────────────
    PERFORM pg_temp.demo_book('73010000-0000-0000-0000-000000000000', 'f1000000-0000-0000-0000-000000000018', 'e1000000-0000-0000-0000-000000000306',  0,  2, 'Credit Card');    -- A Gayan
    PERFORM pg_temp.demo_book('73020000-0000-0000-0000-000000000000', 'f1000000-0000-0000-0000-000000000019', 'e1000000-0000-0000-0000-000000000307', -1,  2, 'Cash');           -- B Dinithi
    PERFORM pg_temp.demo_book('73030000-0000-0000-0000-000000000000', 'f1000000-0000-0000-0000-000000000020', 'e1000000-0000-0000-0000-000000000306', -3, -1, 'Cash');           -- C Sunil
    PERFORM pg_temp.demo_book('73050000-0000-0000-0000-000000000000', 'f1000000-0000-0000-0000-000000000021', 'e1000000-0000-0000-0000-000000000308',  5,  8, 'Bank Transfer');  -- E Yuki
    PERFORM pg_temp.demo_book('73060000-0000-0000-0000-000000000000', 'f1000000-0000-0000-0000-000000000022', 'e1000000-0000-0000-0000-000000000308', -2,  0, 'Cash');           -- F Madushani
    PERFORM pg_temp.demo_book('73070000-0000-0000-0000-000000000000', 'f1000000-0000-0000-0000-000000000023', 'e1000000-0000-0000-0000-000000000309', -2,  0, 'Credit Card');    -- G Oliver
    PERFORM pg_temp.demo_book('73080000-0000-0000-0000-000000000000', 'f1000000-0000-0000-0000-000000000024', 'e1000000-0000-0000-0000-000000000305', -4, -1, 'Cash');           -- H Asela
    PERFORM pg_temp.demo_book('73090000-0000-0000-0000-000000000000', 'f1000000-0000-0000-0000-000000000025', 'e1000000-0000-0000-0000-000000000310', -1,  3, 'Bank Transfer');  -- I Ceylon Tea Traders
    PERFORM pg_temp.demo_book('73100000-0000-0000-0000-000000000000', 'f1000000-0000-0000-0000-000000000026', 'e1000000-0000-0000-0000-000000000307', 10, 14, 'Credit Card');    -- K Shanika
    PERFORM pg_temp.demo_book('73110000-0000-0000-0000-000000000000', g_priya,                                'e1000000-0000-0000-0000-000000000306', 10, 12, 'Cash');           -- X Priya (cancelled)
    PERFORM pg_temp.demo_book('73120000-0000-0000-0000-000000000000', g_kamal,                                'e1000000-0000-0000-0000-000000000306', 20, 22, 'Credit Card');    -- U Kamal upcoming

    -- ── Same in-house state at every branch ─────────────────────────────────
    FOR i IN 1..3 LOOP
        -- X: cancelled before arrival
        PERFORM pg_temp.demo_cancel(('7' || i || '110000-0000-0000-0000-000000000000')::UUID);

        -- F: departs today, two services, bill not paid
        PERFORM pg_temp.demo_checkin(('7' || i || '060000-0000-0000-0000-000000000000')::UUID);
        PERFORM pg_temp.demo_use(('7' || i || '060000-0000-0000-0000-000000000000')::UUID, s_room_svc, 0, 2);
        PERFORM pg_temp.demo_use(('7' || i || '060000-0000-0000-0000-000000000000')::UUID, s_laundry, 1, 1);
        PERFORM pg_temp.demo_bill(('7' || i || '060000-0000-0000-0000-000000000000')::UUID);

        -- G: departs today, spa, paid in full
        PERFORM pg_temp.demo_checkin(('7' || i || '070000-0000-0000-0000-000000000000')::UUID);
        PERFORM pg_temp.demo_use(('7' || i || '070000-0000-0000-0000-000000000000')::UUID, s_spa, 1, 1);
        PERFORM pg_temp.demo_bill(('7' || i || '070000-0000-0000-0000-000000000000')::UUID);
        PERFORM pg_temp.demo_pay(('7' || i || '070000-0000-0000-0000-000000000000')::UUID, NULL, 'Credit Card', 'Paid in full', 1);

        -- H: should have left yesterday, minibar, LKR 10,000 paid
        PERFORM pg_temp.demo_checkin(('7' || i || '080000-0000-0000-0000-000000000000')::UUID);
        PERFORM pg_temp.demo_use(('7' || i || '080000-0000-0000-0000-000000000000')::UUID, s_minibar, 1, 1);
        PERFORM pg_temp.demo_bill(('7' || i || '080000-0000-0000-0000-000000000000')::UUID);
        PERFORM pg_temp.demo_pay(('7' || i || '080000-0000-0000-0000-000000000000')::UUID, 10000, 'Cash', 'Part payment at check-in', 0);

        -- I: staying on, two services, LKR 2,000 discount, LKR 5,000 paid
        PERFORM pg_temp.demo_checkin(('7' || i || '090000-0000-0000-0000-000000000000')::UUID);
        PERFORM pg_temp.demo_use(('7' || i || '090000-0000-0000-0000-000000000000')::UUID, s_room_svc, 0, 1);
        PERFORM pg_temp.demo_use(('7' || i || '090000-0000-0000-0000-000000000000')::UUID, s_airport, 0, 1);
        PERFORM pg_temp.demo_bill(('7' || i || '090000-0000-0000-0000-000000000000')::UUID, 2000);
        PERFORM pg_temp.demo_pay(('7' || i || '090000-0000-0000-0000-000000000000')::UUID, 5000, 'Bank Transfer', 'Deposit', 0);
    END LOOP;
END;
$$;

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────────
-- Summary (added on top of sample_data.sql)
--   ROOM          21  (7 per branch; 211 and 311 in Maintenance; 4 Occupied
--                      per branch after check-ins: x05, x08, x09, x10)
--   GUEST         28  (2 corporate with sample_data's Lanka Exports; 2 walk-ins)
--   USER_ACCOUNT  11  (admin.ops, mgr.galle, rec.kandy, rec2.colombo, 7 guests)
--   BOOKING       50  (18 Checked-Out, 12 Checked-In, 17 Booked, 3 Cancelled)
--   BILL          30  (18 paid stays + F unpaid, G paid, H/I part-paid per branch)
-- ─────────────────────────────────────────────────────────────────────────────
