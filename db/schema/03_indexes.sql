-- =============================================================================
-- db/schema/03_indexes.sql
-- =============================================================================
-- Purpose:
--   Creates performance indexes on high-traffic query columns. Without these,
--   the reporting views and booking availability queries would perform full
--   table scans as data grows.
--
-- Note: Indexes on PRIMARY KEY and UNIQUE columns are created automatically
--   by PostgreSQL — we do NOT duplicate them here.
--   (See docs/specs/06_indexing_strategy.md for the full query-to-index map.)
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- BOOKING INDEXES (most queried table)
-- ─────────────────────────────────────────────────────────────────────────────

-- Used by the double-booking trigger: find overlapping reservations for a room
CREATE INDEX idx_booking_room_dates
    ON booking (room_id, check_in_date, check_out_date);

-- Used when fetching all bookings for a specific guest (history, dashboard)
CREATE INDEX idx_booking_guest
    ON booking (guest_id);

-- Used by ReceptionistDashboard filters (Booked, Checked-In, etc.)
CREATE INDEX idx_booking_status
    ON booking (status);

-- Used for monthly revenue reports (GROUP BY month of checkout)
CREATE INDEX idx_booking_checkout_date
    ON booking (check_out_date);


-- ─────────────────────────────────────────────────────────────────────────────
-- ROOM INDEXES
-- ─────────────────────────────────────────────────────────────────────────────

-- Room listing by branch: GET /api/rooms?branch_id=...
CREATE INDEX idx_room_branch
    ON room (branch_id);

-- Room filtering by type
CREATE INDEX idx_room_type
    ON room (room_type_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- SERVICE_USAGE INDEXES
-- ─────────────────────────────────────────────────────────────────────────────

-- Used when fetching all services for a booking (billing calculation)
CREATE INDEX idx_service_usage_booking
    ON service_usage (booking_id);

-- Used by v_top_services view aggregation
CREATE INDEX idx_service_usage_service
    ON service_usage (service_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- PAYMENT INDEXES
-- ─────────────────────────────────────────────────────────────────────────────

-- Payment listing per booking + SUM(amount) in record_payment()
CREATE INDEX idx_payment_booking
    ON payment (booking_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- USER_ACCOUNT INDEXES
-- ─────────────────────────────────────────────────────────────────────────────

-- Staff listing per branch (manager, receptionist)
CREATE INDEX idx_user_branch
    ON user_account (branch_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- BILL INDEXES
-- ─────────────────────────────────────────────────────────────────────────────

-- Partial index for quick "outstanding balance" queries — only indexes
-- bills that haven't been fully paid yet
CREATE INDEX idx_bill_outstanding
    ON bill (balance_flag) WHERE balance_flag = TRUE;
