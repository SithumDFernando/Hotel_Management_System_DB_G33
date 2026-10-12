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
--   EXCLUDE: excl_<table>_<description>
-- =============================================================================

-- btree_gist lets a GiST index handle the UUID equality part of
-- excl_booking_room_overlap. It is a trusted extension (PG13+), so the
-- database owner can create it without superuser rights.
CREATE EXTENSION IF NOT EXISTS btree_gist;


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
-- RESTRICT (not SET NULL): nulling the link would leave a guest/staff account
-- that violates chk_user_account_role_links, so a branch with staff or a guest
-- profile with a login can't be deleted out from under the account.
ALTER TABLE user_account
    ADD CONSTRAINT fk_user_account_guest
        FOREIGN KEY (guest_id) REFERENCES guest(guest_id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_user_account_branch
        FOREIGN KEY (branch_id) REFERENCES branch(branch_id) ON DELETE RESTRICT;

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

-- Email is the login identifier — unique across all accounts, ignoring case
-- (ISSUE-10: Kamal@mail.com and kamal@mail.com are one account). A unique
-- index rather than a constraint because it is on an expression; the API
-- also lower-cases emails on input and looks them up with LOWER(email).
CREATE UNIQUE INDEX uq_user_account_email_ci
    ON user_account (LOWER(email));

-- One login per guest profile (NULLs, i.e. staff accounts, are not compared)
ALTER TABLE user_account
    ADD CONSTRAINT uq_user_account_guest
        UNIQUE (guest_id);

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

-- Fixed payment vocabulary, so reports can group by it (same list in the
-- API's PaymentMethod Literal and the frontend's payment options)
ALTER TABLE booking
    ADD CONSTRAINT chk_booking_payment_option
        CHECK (payment_option IN ('Credit Card', 'Cash', 'Bank Transfer'));

ALTER TABLE payment
    ADD CONSTRAINT chk_payment_method
        CHECK (payment_method IN ('Credit Card', 'Cash', 'Bank Transfer'));

-- Each role has exactly the links it needs: branch staff belong to a branch,
-- guests to a guest profile, admins to neither (they are global)
ALTER TABLE user_account
    ADD CONSTRAINT chk_user_account_role_links
        CHECK (
            (role IN ('manager', 'receptionist') AND branch_id IS NOT NULL AND guest_id IS NULL)
         OR (role = 'guest' AND guest_id IS NOT NULL AND branch_id IS NULL)
         OR (role = 'admin' AND branch_id IS NULL AND guest_id IS NULL)
        );

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


-- ─────────────────────────────────────────────────────────────────────────────
-- EXCLUSION CONSTRAINTS
-- ─────────────────────────────────────────────────────────────────────────────

-- No two active bookings for the same room may overlap. This is the real
-- guarantee against double booking: trg_check_double_booking only sees
-- committed rows, so two concurrent inserts could both pass it.
-- '[)': the check-out day can be the next guest's check-in day.
-- Cancelled and Checked-Out bookings don't block (same rule as the trigger).
ALTER TABLE booking
    ADD CONSTRAINT excl_booking_room_overlap
        EXCLUDE USING gist (
            room_id WITH =,
            daterange(check_in_date, check_out_date, '[)') WITH &&
        )
        WHERE (status IN ('Booked', 'Checked-In'));
