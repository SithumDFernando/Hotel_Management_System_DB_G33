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




