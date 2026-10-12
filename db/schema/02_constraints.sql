-- =============================================================================
-- db/schema/02_constraints.sql
-- =============================================================================
-- Purpose:
--   Adds all inter-table constraints (foreign keys), cross-column CHECK
--   constraints, and UNIQUE constraints that cannot be declared inline in
--   01_tables.sql without causing forward-reference issues.
--
--   Separating constraints from table creation makes it easy to:
--     - Drop and re-add constraints during schema migrations.
--     - Load large seed datasets faster (temporarily disable FKs then re-add).
--
-- Naming convention:
--   FK:     fk_<table>_<column>
--   CHECK:  chk_<table>_<description>
--   UNIQUE: uq_<table>_<column(s)>
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- FOREIGN KEY CONSTRAINTS
-- ─────────────────────────────────────────────────────────────────────────────

-- ROOM → BRANCH, ROOM_TYPE
ALTER TABLE room
    ADD CONSTRAINT fk_room_branch
        FOREIGN KEY (branch_id) REFERENCES branch(branch_id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_room_room_type
        FOREIGN KEY (room_type_id) REFERENCES room_type(room_type_id) ON DELETE RESTRICT;

-- ROOM_RATE → BRANCH, ROOM_TYPE
ALTER TABLE room_rate
    ADD CONSTRAINT fk_room_rate_branch
        FOREIGN KEY (branch_id) REFERENCES branch(branch_id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_room_rate_room_type
        FOREIGN KEY (room_type_id) REFERENCES room_type(room_type_id) ON DELETE CASCADE;

-- ROOM_AMENITY → ROOM_TYPE, AMENITY
ALTER TABLE room_amenity
    ADD CONSTRAINT fk_room_amenity_room_type
        FOREIGN KEY (room_type_id) REFERENCES room_type(room_type_id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_room_amenity_amenity
        FOREIGN KEY (amenity_id) REFERENCES amenity(amenity_id) ON DELETE CASCADE;

-- USER_ACCOUNT → GUEST, BRANCH
ALTER TABLE user_account
    ADD CONSTRAINT fk_user_account_guest
        FOREIGN KEY (guest_id) REFERENCES guest(guest_id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_user_account_branch
        FOREIGN KEY (branch_id) REFERENCES branch(branch_id) ON DELETE SET NULL;

-- BOOKING → GUEST, ROOM
ALTER TABLE booking
    ADD CONSTRAINT fk_booking_guest
        FOREIGN KEY (guest_id) REFERENCES guest(guest_id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_booking_room
        FOREIGN KEY (room_id) REFERENCES room(room_id) ON DELETE RESTRICT;

-- SERVICE_USAGE → BOOKING, SERVICE
ALTER TABLE service_usage
    ADD CONSTRAINT fk_service_usage_booking
        FOREIGN KEY (booking_id) REFERENCES booking(booking_id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_service_usage_service
        FOREIGN KEY (service_id) REFERENCES service(service_id) ON DELETE RESTRICT;

-- BILL → BOOKING
ALTER TABLE bill
    ADD CONSTRAINT fk_bill_booking
        FOREIGN KEY (booking_id) REFERENCES booking(booking_id) ON DELETE CASCADE;

-- PAYMENT → BOOKING
ALTER TABLE payment
    ADD CONSTRAINT fk_payment_booking
        FOREIGN KEY (booking_id) REFERENCES booking(booking_id) ON DELETE CASCADE;


-- ─────────────────────────────────────────────────────────────────────────────
-- UNIQUE CONSTRAINTS
-- ─────────────────────────────────────────────────────────────────────────────

-- No duplicate room numbers within a branch
ALTER TABLE room
    ADD CONSTRAINT uq_room_branch_number
        UNIQUE (branch_id, room_number);

-- One rate per room type per branch
ALTER TABLE room_rate
    ADD CONSTRAINT uq_room_rate_branch_type
        UNIQUE (branch_id, room_type_id);

-- NIC/Passport is the business key for guests — must be globally unique
ALTER TABLE guest
    ADD CONSTRAINT uq_guest_nic_passport
        UNIQUE (nic_passport);

-- Email is the login identifier — must be unique across all accounts
ALTER TABLE user_account
    ADD CONSTRAINT uq_user_account_email
        UNIQUE (email);

-- 1:1 relationship between bill and booking
ALTER TABLE bill
    ADD CONSTRAINT uq_bill_booking
        UNIQUE (booking_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- CHECK CONSTRAINTS
-- ─────────────────────────────────────────────────────────────────────────────

-- Checkout must be after checkin
ALTER TABLE booking
    ADD CONSTRAINT chk_booking_dates
        CHECK (check_out_date > check_in_date);

-- Corporate guests must have a company name
ALTER TABLE guest
    ADD CONSTRAINT chk_guest_corporate_company
        CHECK (guest_type <> 'Corporate' OR company_name IS NOT NULL);

-- Bill amounts must be non-negative
ALTER TABLE bill
    ADD CONSTRAINT chk_bill_amount_paid
        CHECK (amount_paid >= 0),
    ADD CONSTRAINT chk_bill_outstanding
        CHECK (outstanding_balance >= 0);
