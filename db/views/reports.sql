-- =============================================================================
-- db/views/reports.sql
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. v_room_occupancy
-- ─────────────────────────────────────────────────────────────────────────────
-- Shows current or date-range room occupancy across all branches and room types.
-- LEFT JOINs active bookings ('Booked', 'Checked-In') so unoccupied rooms
-- are still displayed with NULL guest/booking fields.

-- Used by: GET /api/reports/occupancy
--          ManagerDashboard "Branch Overview" and "Occupancy Report" sections.
--
-- ─────────────────────────────────────────────────────────────────────────────

DROP VIEW IF EXISTS v_room_occupancy CASCADE;

CREATE OR REPLACE VIEW v_room_occupancy AS
SELECT
    r.room_id,
    b.branch_id,
    b.name AS branch_name,
    r.room_number,
    rt.room_type_id,
    rt.type_name AS room_type,
    rt.capacity,
    r.status AS room_status,
    bk.booking_id,
    g.guest_id,
    g.full_name AS guest_name,
    bk.check_in_date,
    bk.check_out_date,
    bk.status AS booking_status
FROM room r
JOIN branch b ON r.branch_id = b.branch_id
JOIN room_type rt ON r.room_type_id = rt.room_type_id
LEFT JOIN booking bk ON r.room_id = bk.room_id AND bk.status IN ('Booked', 'Checked-In')
LEFT JOIN guest g ON bk.guest_id = g.guest_id;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. v_guest_billing_summary
-- ─────────────────────────────────────────────────────────────────────────────
-- Full billing breakdown per guest and booking, including payment status and
-- outstanding balance flag for the "unpaid guests" report.

--      Used by: GET /api/reports/billing-summary
--               ManagerDashboard "Billing Summary" section.
-- ─────────────────────────────────────────────────────────────────────────────

DROP VIEW IF EXISTS v_guest_billing_summary CASCADE;

CREATE OR REPLACE VIEW v_guest_billing_summary AS
SELECT
    g.guest_id,
    g.full_name AS guest_name,
    g.nic_passport,
    g.email,
    g.phone,
    g.guest_type,
    bk.booking_id,
    r.room_number,
    b.branch_id,
    b.name AS branch_name,
    bk.check_in_date,
    bk.check_out_date,
    bi.bill_id,
    COALESCE(bi.room_charges, 0.00) AS room_charges,
    COALESCE(bi.service_charges, 0.00) AS service_charges,
    COALESCE(bi.discount_amount, 0.00) AS discount_amount,
    COALESCE(bi.tax_amount, 0.00) AS tax_amount,
    COALESCE(bi.total_amount, 0.00) AS total_amount,
    COALESCE(bi.amount_paid, 0.00) AS amount_paid,
    COALESCE(bi.outstanding_balance, 0.00) AS outstanding_balance,
    COALESCE(bi.balance_flag, FALSE) AS balance_flag
FROM guest g
JOIN booking bk ON g.guest_id = bk.guest_id
JOIN room r ON bk.room_id = r.room_id
JOIN branch b ON r.branch_id = b.branch_id
LEFT JOIN bill bi ON bk.booking_id = bi.booking_id;



