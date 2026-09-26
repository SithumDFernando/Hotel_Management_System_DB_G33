# 05 — Views & Reports

> 5 management reports required by the SRS. Each is implemented as a PostgreSQL **VIEW** so it can be queried directly or wrapped by the API.

---

## Report 1: Room Occupancy Report

### View: `v_room_occupancy`

**Purpose:** Shows room occupancy status for a selected date or period.

```sql
-- Columns returned:
branch_name       VARCHAR    -- e.g. 'Colombo'
room_number       VARCHAR    -- e.g. '101'
room_type         VARCHAR    -- e.g. 'Suite'
status            VARCHAR    -- current room status
booking_id        UUID       -- NULL if no active booking
guest_name        VARCHAR    -- NULL if unoccupied
check_in_date     DATE
check_out_date    DATE
booking_status    VARCHAR    -- Booked / Checked-In
```

**Join logic:**
```
room
  JOIN branch USING (branch_id)
  JOIN room_type USING (room_type_id)
  LEFT JOIN booking ON room.room_id = booking.room_id
                   AND booking.status IN ('Booked', 'Checked-In')
  LEFT JOIN guest ON booking.guest_id = guest.guest_id
```

**API filtering:** `WHERE check_in_date <= :target_date AND check_out_date > :target_date`
or `WHERE check_in_date < :to_date AND check_out_date > :from_date` for period queries.

**Sample output:**

| Branch | Room | Type | Status | Guest | Check-In | Check-Out | Booking Status |
|--------|------|------|--------|-------|----------|-----------|----------------|
| Colombo | 101 | Suite | Occupied | John Silva | 2026-02-01 | 2026-02-05 | Checked-In |
| Colombo | 102 | Double | Available | — | — | — | — |
| Kandy | 201 | Single | Occupied | Nimal Perera | 2026-02-02 | 2026-02-04 | Checked-In |

---

## Report 2: Guest Billing Summary

### View: `v_guest_billing_summary`

**Purpose:** Billing summary per guest including unpaid balances.

```sql
-- Columns returned:
guest_name        VARCHAR
nic_passport      VARCHAR
email             VARCHAR
booking_id        UUID
room_number       VARCHAR
branch_name       VARCHAR
check_in_date     DATE
check_out_date    DATE
room_charges      NUMERIC
service_charges   NUMERIC
discount_amount   NUMERIC
tax_amount        NUMERIC
total_amount      NUMERIC
amount_paid       NUMERIC
outstanding_balance NUMERIC
balance_flag      BOOLEAN     -- TRUE if unpaid
```

**Join logic:**
```
guest
  JOIN booking USING (guest_id)
  JOIN room USING (room_id)
  JOIN branch USING (branch_id)
  LEFT JOIN bill USING (booking_id)
```

**Sample output:**

| Guest | Booking | Total | Paid | Outstanding | Unpaid? |
|-------|---------|-------|------|-------------|---------|
| John Silva | uuid-1 | 75,325.00 | 20,000.00 | 55,325.00 | ✓ |
| Nimal Perera | uuid-2 | 30,000.00 | 30,000.00 | 0.00 | ✗ |

---

## Report 3: Service Usage Breakdown

### View: `v_service_usage_breakdown`

**Purpose:** Service usage grouped by room and service type.

```sql
-- Columns returned:
branch_name       VARCHAR
room_number       VARCHAR
guest_name        VARCHAR
service_name      VARCHAR
category          VARCHAR
total_quantity    INT        -- SUM(quantity)
total_charge      NUMERIC    -- SUM(unit_price * quantity)
```

**Join logic:**
```
service_usage
  JOIN booking USING (booking_id)
  JOIN room USING (room_id)
  JOIN branch USING (branch_id)
  JOIN guest ON booking.guest_id = guest.guest_id
  JOIN service USING (service_id)
GROUP BY branch_name, room_number, guest_name, service_name, category
```

**Sample output:**

| Branch | Room | Guest | Service | Category | Qty | Total |
|--------|------|-------|---------|----------|-----|-------|
| Colombo | 101 | John Silva | Room Service | F&B | 3 | 4,500.00 |
| Colombo | 101 | John Silva | Spa Treatment | Wellness | 1 | 5,000.00 |
| Kandy | 201 | Nimal Perera | Laundry | Housekeeping | 2 | 1,000.00 |

---

## Report 4: Monthly Revenue per Branch

### View: `v_monthly_revenue`

**Purpose:** Revenue breakdown by branch for a given month — room charges vs service charges.

```sql
-- Columns returned:
branch_name        VARCHAR
month              INT        -- extracted from check_out_date
year               INT
total_room_revenue NUMERIC    -- SUM(bill.room_charges) for checked-out bookings
total_svc_revenue  NUMERIC    -- SUM(bill.service_charges)
total_tax          NUMERIC    -- SUM(bill.tax_amount)
gross_revenue      NUMERIC    -- SUM(bill.total_amount)
total_collected    NUMERIC    -- SUM(bill.amount_paid)
total_outstanding  NUMERIC    -- SUM(bill.outstanding_balance)
```

**Join logic:**
```
bill
  JOIN booking USING (booking_id)
  JOIN room USING (room_id)
  JOIN branch USING (branch_id)
WHERE booking.status = 'Checked-Out'
GROUP BY branch_name, EXTRACT(YEAR FROM booking.check_out_date),
         EXTRACT(MONTH FROM booking.check_out_date)
```

**API filtering:** `WHERE year = :year AND month = :month`

**Sample output:**

| Branch | Month | Year | Room Rev. | Service Rev. | Tax | Gross | Collected | Outstanding |
|--------|-------|------|-----------|-------------|-----|-------|-----------|-------------|
| Colombo | 2 | 2026 | 240,000 | 35,000 | 41,250 | 316,250 | 290,000 | 26,250 |
| Kandy | 2 | 2026 | 120,000 | 12,000 | 19,800 | 151,800 | 151,800 | 0 |

---

## Report 5: Top-Used Services & Customer Preference Trends

### View: `v_top_services`

**Purpose:** Most popular services ranked by usage count, with trend data.

```sql
-- Columns returned:
service_name       VARCHAR
category           VARCHAR
total_bookings     INT        -- COUNT(DISTINCT booking_id)
total_quantity     INT        -- SUM(quantity)
total_revenue      NUMERIC    -- SUM(unit_price * quantity)
avg_quantity_per_booking NUMERIC  -- AVG(quantity) per booking
```

**Join logic:**
```
service_usage
  JOIN service USING (service_id)
GROUP BY service_name, category
ORDER BY total_quantity DESC
```

**Extended: branch-level breakdown** (parameterized in API):
```
-- Add: JOIN booking USING (booking_id) JOIN room USING (room_id)
-- GROUP BY also branch_id
-- Filter: WHERE branch_id = :branch_id
```

**Sample output:**

| Service | Category | Bookings | Qty | Revenue | Avg/Booking |
|---------|----------|----------|-----|---------|-------------|
| Room Service | F&B | 12 | 28 | 42,000 | 2.3 |
| Spa Treatment | Wellness | 8 | 10 | 50,000 | 1.3 |
| Laundry | Housekeeping | 15 | 22 | 11,000 | 1.5 |
| Minibar | F&B | 6 | 18 | 9,000 | 3.0 |

---

## Implementation Notes

1. **Views vs. Functions**: Simple aggregations use views. For parameterized date-range filtering, the API applies `WHERE` clauses on top of the view, or wrap the view call in a function.
2. **Performance**: Views with heavy JOINs benefit from the indexes defined in `06_indexing_strategy.md`.
3. **Access control**: The API layer restricts managers to `WHERE branch_id = :user_branch_id`. Admins see all branches.
