# 01 — Database Design Specification

> SkyNest Hotel Reservation & Guest Services Management System (HRGSMS)
> PostgreSQL 15+

---

## 1. Enum Types

| Enum Name | Values |
|-----------|--------|
| `room_status` | `Available`, `Occupied`, `Maintenance` |
| `booking_status` | `Booked`, `Checked-In`, `Checked-Out`, `Cancelled` |
| `guest_type` | `Individual`, `Corporate` |
| `user_role` | `admin`, `manager`, `receptionist`, `guest` |

---

## 2. Entity Definitions (13 Tables)

### 2.1 BRANCH

| Column | Type | Constraints |
|--------|------|-------------|
| `branch_id` | UUID | PK, DEFAULT gen_random_uuid() |
| `name` | VARCHAR(100) | NOT NULL |
| `city` | VARCHAR(50) | NOT NULL |
| `address` | VARCHAR(255) | NOT NULL |
| `phone` | VARCHAR(20) | NOT NULL |
| `manager_name` | VARCHAR(100) | NOT NULL |

---

### 2.2 ROOM_TYPE

| Column | Type | Constraints |
|--------|------|-------------|
| `room_type_id` | UUID | PK, DEFAULT gen_random_uuid() |
| `type_name` | VARCHAR(50) | NOT NULL, UNIQUE |
| `capacity` | INT | NOT NULL, CHECK (capacity > 0) |

---

### 2.3 AMENITY

| Column | Type | Constraints |
|--------|------|-------------|
| `amenity_id` | UUID | PK, DEFAULT gen_random_uuid() |
| `amenity_type` | VARCHAR(50) | NOT NULL |
| `amenity_name` | VARCHAR(100) | NOT NULL |
| `description` | VARCHAR(255) | |

---

### 2.4 ROOM_AMENITY (Junction Table)

| Column | Type | Constraints |
|--------|------|-------------|
| `room_type_id` | UUID | PK, FK → room_type |
| `amenity_id` | UUID | PK, FK → amenity |
| `count` | INT | NOT NULL, DEFAULT 1, CHECK (count > 0) |

> Composite PK: (`room_type_id`, `amenity_id`)

---

### 2.5 ROOM_RATE

| Column | Type | Constraints |
|--------|------|-------------|
| `room_rate_id` | UUID | PK, DEFAULT gen_random_uuid() |
| `branch_id` | UUID | NOT NULL, FK → branch |
| `room_type_id` | UUID | NOT NULL, FK → room_type |
| `daily_rate` | NUMERIC(10,2) | NOT NULL, CHECK (daily_rate > 0) |

> UNIQUE (`branch_id`, `room_type_id`) — one rate per type per branch.

---

### 2.6 ROOM

| Column | Type | Constraints |
|--------|------|-------------|
| `room_id` | UUID | PK, DEFAULT gen_random_uuid() |
| `branch_id` | UUID | NOT NULL, FK → branch |
| `room_type_id` | UUID | NOT NULL, FK → room_type |
| `room_number` | VARCHAR(10) | NOT NULL |
| `status` | room_status | NOT NULL, DEFAULT 'Available' |

> UNIQUE (`branch_id`, `room_number`) — no duplicate room numbers within a branch.

---

### 2.7 GUEST

| Column | Type | Constraints |
|--------|------|-------------|
| `guest_id` | UUID | PK, DEFAULT gen_random_uuid() |
| `full_name` | VARCHAR(150) | NOT NULL |
| `nic_passport` | VARCHAR(20) | NOT NULL, UNIQUE |
| `email` | VARCHAR(100) | NOT NULL |
| `phone` | VARCHAR(20) | NOT NULL |
| `date_of_birth` | DATE | |
| `nationality` | VARCHAR(50) | |
| `gender` | VARCHAR(10) | |
| `guest_type` | guest_type | NOT NULL, DEFAULT 'Individual' |
| `company_name` | VARCHAR(150) | NULL |
| `company_reg_number` | VARCHAR(50) | NULL |
| `billing_contact_name` | VARCHAR(150) | NULL |

> Corporate fields are NULL for Individual guests. A CHECK constraint enforces: if `guest_type = 'Corporate'` then `company_name IS NOT NULL`.

---

### 2.8 USER_ACCOUNT

| Column | Type | Constraints |
|--------|------|-------------|
| `account_id` | UUID | PK, DEFAULT gen_random_uuid() |
| `guest_id` | UUID | NULL, FK → guest |
| `branch_id` | UUID | NULL, FK → branch |
| `email` | VARCHAR(100) | NOT NULL, UNIQUE |
| `password_hash` | VARCHAR(255) | NOT NULL |
| `role` | user_role | NOT NULL |

> - `guest_id` is set only when `role = 'guest'`
> - `branch_id` is set for `receptionist` and `manager` (scopes them to a branch)
> - `admin` has both NULL

---

### 2.9 BOOKING

| Column | Type | Constraints |
|--------|------|-------------|
| `booking_id` | UUID | PK, DEFAULT gen_random_uuid() |
| `guest_id` | UUID | NOT NULL, FK → guest |
| `room_id` | UUID | NOT NULL, FK → room |
| `check_in_date` | DATE | NOT NULL |
| `check_out_date` | DATE | NOT NULL |
| `rate_at_booking` | NUMERIC(10,2) | NOT NULL |
| `status` | booking_status | NOT NULL, DEFAULT 'Booked' |
| `payment_option` | VARCHAR(50) | NOT NULL |
| `actual_checkin_time` | TIMESTAMP | NULL |
| `actual_checkout_time` | TIMESTAMP | NULL |

> CHECK: `check_out_date > check_in_date`
> `rate_at_booking` is snapshotted from `room_rate.daily_rate` at booking creation time so billing is immutable even if rates change.

---

### 2.10 SERVICE

| Column | Type | Constraints |
|--------|------|-------------|
| `service_id` | UUID | PK, DEFAULT gen_random_uuid() |
| `service_name` | VARCHAR(100) | NOT NULL |
| `category` | VARCHAR(50) | NOT NULL |
| `base_price` | NUMERIC(10,2) | NOT NULL, CHECK (base_price >= 0) |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT TRUE |

---

### 2.11 SERVICE_USAGE

| Column | Type | Constraints |
|--------|------|-------------|
| `usage_id` | UUID | PK, DEFAULT gen_random_uuid() |
| `booking_id` | UUID | NOT NULL, FK → booking |
| `service_id` | UUID | NOT NULL, FK → service |
| `usage_date` | DATE | NOT NULL |
| `quantity` | INT | NOT NULL, CHECK (quantity > 0) |
| `unit_price` | NUMERIC(10,2) | NOT NULL |

> `unit_price` is snapshotted from `service.base_price` at usage time — same immutability pattern as `rate_at_booking`.

---

### 2.12 BILL

| Column | Type | Constraints |
|--------|------|-------------|
| `bill_id` | UUID | PK, DEFAULT gen_random_uuid() |
| `booking_id` | UUID | NOT NULL, UNIQUE, FK → booking |
| `room_charges` | NUMERIC(10,2) | NOT NULL |
| `service_charges` | NUMERIC(10,2) | NOT NULL, DEFAULT 0 |
| `discount_amount` | NUMERIC(10,2) | NOT NULL, DEFAULT 0 |
| `tax_amount` | NUMERIC(10,2) | NOT NULL, DEFAULT 0 |
| `total_amount` | NUMERIC(10,2) | NOT NULL |
| `amount_paid` | NUMERIC(10,2) | NOT NULL, DEFAULT 0 |
| `outstanding_balance` | NUMERIC(10,2) | NOT NULL |
| `balance_flag` | BOOLEAN | NOT NULL, DEFAULT TRUE |
| `generated_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() |

> - `balance_flag = TRUE` means there is an outstanding balance (unpaid)
> - 1:1 with BOOKING (enforced by UNIQUE on `booking_id`)

---

### 2.13 PAYMENT

| Column | Type | Constraints |
|--------|------|-------------|
| `payment_id` | UUID | PK, DEFAULT gen_random_uuid() |
| `booking_id` | UUID | NOT NULL, FK → booking |
| `amount` | NUMERIC(10,2) | NOT NULL, CHECK (amount > 0) |
| `payment_method` | VARCHAR(50) | NOT NULL |
| `paid_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() |
| `notes` | VARCHAR(255) | |

---

## 3. Relationship Summary

```
BRANCH  ──1:M──  ROOM
BRANCH  ──1:M──  ROOM_RATE
ROOM_TYPE ──1:M──  ROOM
ROOM_TYPE ──1:M──  ROOM_RATE
ROOM_TYPE ──M:M──  AMENITY      (via ROOM_AMENITY)
GUEST   ──1:M──  BOOKING
ROOM    ──1:M──  BOOKING
BOOKING ──1:M──  SERVICE_USAGE
BOOKING ──1:1──  BILL
BOOKING ──1:M──  PAYMENT
SERVICE ──1:M──  SERVICE_USAGE
GUEST   ──1:1──  USER_ACCOUNT   (optional, nullable FK)
BRANCH  ──1:M──  USER_ACCOUNT   (for staff accounts)
```

---

## 4. Normalization

The schema is in **3NF**:

- **1NF**: All columns are atomic — no arrays or nested types.
- **2NF**: No partial dependencies — all non-key columns depend on the full PK. Junction tables (`room_amenity`) have composite PKs with no partial deps.
- **3NF**: No transitive dependencies — e.g., `room_rate` is a separate table rather than embedding rate inside `room` (which would transitively depend on `branch_id` + `room_type_id`).

**Controlled denormalization**:
- `bill.outstanding_balance` is derived (`total_amount - amount_paid`) but stored for query performance. Kept consistent via `record_payment()` procedure.
- `rate_at_booking` and `unit_price` are snapshots — not denormalization but immutability for historical accuracy.
