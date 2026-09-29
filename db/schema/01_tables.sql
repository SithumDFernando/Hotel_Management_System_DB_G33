-- =============================================================================
-- db/schema/01_tables.sql
-- =============================================================================
-- Purpose:
--   Creates all 13 core tables for the SkyNest Hotel Reservation & Guest
--   Services Management System (HRGSMS). Tables are declared in dependency
--   order so that foreign-key targets always exist before their referencing
--   tables.
--
-- Schema is in 3NF (see docs/specs/01_database_design.md for full rationale).
--
-- Tables to create (in order):
--   1.  BRANCH          — Hotel branches (Colombo, Kandy, Galle, etc.)
--   2.  ROOM_TYPE       — Room categories (Suite, Double, Single, etc.)
--   3.  AMENITY         — Individual amenities (WiFi, TV, Mini-bar, etc.)
--   4.  ROOM_AMENITY    — Junction: which amenities belong to which room types
--   5.  ROOM_RATE       — Daily rate per (branch, room_type) combination
--   6.  ROOM            — Individual physical rooms in a branch
--   7.  GUEST           — Guest profiles (Individual & Corporate)
--   8.  USER_ACCOUNT    — Login credentials + role for staff and guests
--   9.  BOOKING         — Room reservations (Booked → Checked-In → Checked-Out)
--   10. SERVICE         — Catalogue of chargeable hotel services
--   11. SERVICE_USAGE   — Usage of services against a checked-in booking
--   12. BILL            — Aggregated bill per booking (1:1 with BOOKING)
--   13. PAYMENT         — Individual payment transactions against a booking
--
-- Enum types (create BEFORE tables):
--   room_status    : 'Available' | 'Occupied' | 'Maintenance'
--   booking_status : 'Booked' | 'Checked-In' | 'Checked-Out' | 'Cancelled'
--   guest_type     : 'Individual' | 'Corporate'
--   user_role      : 'admin' | 'manager' | 'receptionist' | 'guest'
--
-- Notes:
--   - All PKs use UUID (gen_random_uuid()) for global uniqueness.
--   - Constraints are split into 02_constraints.sql for clarity, but you may
--     inline simple NOT NULL / DEFAULT constraints here.
--   - rate_at_booking and unit_price are SNAPSHOTS — they are set at INSERT
--     time and must not be recalculated later (price immutability).
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- 0. ENUM TYPES
-- ─────────────────────────────────────────────────────────────────────────────
-- Drop existing types (CASCADE drops columns that depend on them — safe
-- during development, remove DROP in production).

DROP TYPE IF EXISTS room_status    CASCADE;
DROP TYPE IF EXISTS booking_status CASCADE;
DROP TYPE IF EXISTS guest_type     CASCADE;
DROP TYPE IF EXISTS user_role      CASCADE;

CREATE TYPE room_status    AS ENUM ('Available', 'Occupied', 'Maintenance');
CREATE TYPE booking_status AS ENUM ('Booked', 'Checked-In', 'Checked-Out', 'Cancelled');
CREATE TYPE guest_type     AS ENUM ('Individual', 'Corporate');
CREATE TYPE user_role      AS ENUM ('admin', 'manager', 'receptionist', 'guest');


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. BRANCH
-- ─────────────────────────────────────────────────────────────────────────────
-- Represents a physical hotel location. All rooms, rates, and staff belong
-- to exactly one branch.

DROP TABLE IF EXISTS branch CASCADE;

CREATE TABLE branch (
    branch_id    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name         VARCHAR(100) NOT NULL,
    city         VARCHAR(50)  NOT NULL,
    address      VARCHAR(255) NOT NULL,
    phone        VARCHAR(20)  NOT NULL,
    manager_name VARCHAR(100) NOT NULL
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. ROOM_TYPE
-- ─────────────────────────────────────────────────────────────────────────────
-- Categories of rooms (e.g. Single, Double, Suite). Each room_type has a
-- maximum capacity. type_name is UNIQUE across the system.

DROP TABLE IF EXISTS room_type CASCADE;

CREATE TABLE room_type (
    room_type_id UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    type_name    VARCHAR(50) NOT NULL UNIQUE,
    capacity     INT         NOT NULL CHECK (capacity > 0)
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. AMENITY
-- ─────────────────────────────────────────────────────────────────────────────
-- Master list of amenities that can be attached to room types (e.g. WiFi,
-- Air Conditioning, Mini-bar).

DROP TABLE IF EXISTS amenity CASCADE;

CREATE TABLE amenity (
    amenity_id   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    amenity_type VARCHAR(50)  NOT NULL,
    amenity_name VARCHAR(100) NOT NULL,
    description  VARCHAR(255)
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. ROOM_AMENITY (Junction / M:M)
-- ─────────────────────────────────────────────────────────────────────────────
-- Maps amenities to room types with a count (e.g. Suite → 2× TV).
-- Composite PK (room_type_id, amenity_id) prevents duplicate entries.

DROP TABLE IF EXISTS room_amenity CASCADE;

CREATE TABLE room_amenity (
    room_type_id UUID NOT NULL,
    amenity_id   UUID NOT NULL,
    count        INT  NOT NULL DEFAULT 1 CHECK (count > 0),
    PRIMARY KEY (room_type_id, amenity_id)
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. ROOM_RATE
-- ─────────────────────────────────────────────────────────────────────────────
-- Stores the current daily rate for a specific room type at a specific branch.
-- UNIQUE (branch_id, room_type_id) ensures exactly one rate per combination.

DROP TABLE IF EXISTS room_rate CASCADE;

CREATE TABLE room_rate (
    room_rate_id UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id    UUID          NOT NULL,
    room_type_id UUID          NOT NULL,
    daily_rate   NUMERIC(10,2) NOT NULL CHECK (daily_rate > 0)
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. ROOM
-- ─────────────────────────────────────────────────────────────────────────────
-- Individual physical rooms. room_number is unique within a branch.
-- Status defaults to 'Available' and is updated by triggers and procedures
-- during check-in/check-out flows.

DROP TABLE IF EXISTS room CASCADE;

CREATE TABLE room (
    room_id      UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id    UUID         NOT NULL,
    room_type_id UUID         NOT NULL,
    room_number  VARCHAR(10)  NOT NULL,
    status       room_status  NOT NULL DEFAULT 'Available'
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 7. GUEST
-- ─────────────────────────────────────────────────────────────────────────────
-- Guest profiles. Supports both Individual and Corporate guests.
-- For Corporate guests, company_name is mandatory (enforced via CHECK in
-- 02_constraints.sql). nic_passport is the unique business key for
-- preventing duplicate registrations.

DROP TABLE IF EXISTS guest CASCADE;

CREATE TABLE guest (
    guest_id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name           VARCHAR(150) NOT NULL,
    nic_passport        VARCHAR(20)  NOT NULL,
    email               VARCHAR(100) NOT NULL,
    phone               VARCHAR(20)  NOT NULL,
    date_of_birth       DATE,
    nationality         VARCHAR(50),
    gender              VARCHAR(10),
    guest_type          guest_type   NOT NULL DEFAULT 'Individual',
    company_name        VARCHAR(150),
    company_reg_number  VARCHAR(50),
    billing_contact_name VARCHAR(150)
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 8. USER_ACCOUNT
-- ─────────────────────────────────────────────────────────────────────────────
-- Authentication table. Links to guest (for guest role) and branch (for
-- receptionist/manager). Admin has both NULL.
-- email is the login identifier and must be unique.

DROP TABLE IF EXISTS user_account CASCADE;

CREATE TABLE user_account (
    account_id    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_id      UUID,
    branch_id     UUID,
    email         VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role          user_role    NOT NULL
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 9. BOOKING
-- ─────────────────────────────────────────────────────────────────────────────
-- Central reservation entity. rate_at_booking is a snapshot of the daily_rate
-- at the time of booking — it never changes even if the rate is updated later.
-- Status transitions: Booked → Checked-In → Checked-Out (or Cancelled).

DROP TABLE IF EXISTS booking CASCADE;

CREATE TABLE booking (
    booking_id         UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_id           UUID           NOT NULL,
    room_id            UUID           NOT NULL,
    check_in_date      DATE           NOT NULL,
    check_out_date     DATE           NOT NULL,
    rate_at_booking    NUMERIC(10,2)  NOT NULL,
    status             booking_status NOT NULL DEFAULT 'Booked',
    payment_option     VARCHAR(50)    NOT NULL,
    actual_checkin_time  TIMESTAMP,
    actual_checkout_time TIMESTAMP
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 10. SERVICE
-- ─────────────────────────────────────────────────────────────────────────────
-- Master catalogue of chargeable hotel services (Spa, Room Service, Laundry,
-- etc.). base_price can be 0 for complimentary services.
-- is_active allows soft-deleting services without losing historical data.

DROP TABLE IF EXISTS service CASCADE;

CREATE TABLE service (
    service_id   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name VARCHAR(100)  NOT NULL,
    category     VARCHAR(50)   NOT NULL,
    base_price   NUMERIC(10,2) NOT NULL CHECK (base_price >= 0),
    is_active    BOOLEAN       NOT NULL DEFAULT TRUE
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 11. SERVICE_USAGE
-- ─────────────────────────────────────────────────────────────────────────────
-- Records each time a guest uses a service during their stay.
-- unit_price is a SNAPSHOT of service.base_price at usage time — populated
-- by a BEFORE INSERT trigger (see db/triggers/service_usage_trigger.sql).

DROP TABLE IF EXISTS service_usage CASCADE;

CREATE TABLE service_usage (
    usage_id   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID          NOT NULL,
    service_id UUID          NOT NULL,
    usage_date DATE          NOT NULL,
    quantity   INT           NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10,2) NOT NULL
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 12. BILL
-- ─────────────────────────────────────────────────────────────────────────────
-- Aggregated bill for a booking. 1:1 with booking (enforced by UNIQUE on
-- booking_id in 02_constraints.sql).
-- outstanding_balance is a controlled denormalisation: updated atomically
-- by record_payment() rather than recalculated on every read.
-- balance_flag = TRUE means there is still money owed.

DROP TABLE IF EXISTS bill CASCADE;

CREATE TABLE bill (
    bill_id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id          UUID          NOT NULL,
    room_charges        NUMERIC(10,2) NOT NULL,
    service_charges     NUMERIC(10,2) NOT NULL DEFAULT 0,
    discount_amount     NUMERIC(10,2) NOT NULL DEFAULT 0,
    tax_amount          NUMERIC(10,2) NOT NULL DEFAULT 0,
    total_amount        NUMERIC(10,2) NOT NULL,
    amount_paid         NUMERIC(10,2) NOT NULL DEFAULT 0,
    outstanding_balance NUMERIC(10,2) NOT NULL,
    balance_flag        BOOLEAN       NOT NULL DEFAULT TRUE,
    generated_at        TIMESTAMP     NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 13. PAYMENT
-- ─────────────────────────────────────────────────────────────────────────────
-- Individual payment transactions against a booking. A booking can have
-- multiple partial payments. Each payment updates the bill's amount_paid
-- and outstanding_balance via the record_payment() procedure.

DROP TABLE IF EXISTS payment CASCADE;

CREATE TABLE payment (
    payment_id     UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id     UUID          NOT NULL,
    amount         NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(50)   NOT NULL,
    paid_at        TIMESTAMP     NOT NULL DEFAULT NOW(),
    notes          VARCHAR(255)
);
