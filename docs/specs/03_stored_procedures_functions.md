# 03 — Stored Procedures & Functions

> This spec separates **reusable helper functions** from **business procedures** to eliminate code redundancy.

---

## Redundancy Analysis

Without helper functions, the following logic gets duplicated:

| Duplicated Logic | Appears In |
|-----------------|------------|
| `rate × nights` calculation | `calculate_bill()`, `check_out()` |
| SUM of service charges | `calculate_bill()`, bill queries |
| Tax computation | `calculate_bill()`, any billing display |
| Outstanding balance check | `check_out()`, `record_payment()` |
| Room rate lookup | `create_booking()`, `calculate_bill()` |

### Solution: Dependency Graph

```
create_booking()
  └── fn_get_current_rate()      ← snapshots rate_at_booking

calculate_bill()
  ├── fn_calculate_nights()
  ├── fn_get_room_charges()      ← calls fn_calculate_nights() internally
  ├── fn_get_service_charges()
  └── fn_calculate_tax()

check_out()
  └── fn_get_outstanding_balance()

record_payment()
  └── fn_get_outstanding_balance()
```

---

## Part A: Helper Functions (Reusable)

### `fn_calculate_nights(p_check_in DATE, p_check_out DATE) → INT`

```
RETURNS: check_out - check_in (integer days)
NOTES:   Pure calculation, no DB access.
         Returns 1 minimum (same-day ≠ 0 nights).
```

---

### `fn_get_current_rate(p_branch_id UUID, p_room_type_id UUID) → NUMERIC`

```
RETURNS: daily_rate from room_rate WHERE branch_id AND room_type_id match.
RAISES:  'No rate configured for this room type at this branch'
```

---

### `fn_get_room_charges(p_booking_id UUID) → NUMERIC`

```
LOGIC:   SELECT rate_at_booking * fn_calculate_nights(check_in_date, check_out_date)
         FROM booking WHERE booking_id = p_booking_id
RETURNS: Total room charge as NUMERIC
```

---

### `fn_get_service_charges(p_booking_id UUID) → NUMERIC`

```
LOGIC:   SELECT COALESCE(SUM(unit_price * quantity), 0)
         FROM service_usage WHERE booking_id = p_booking_id
RETURNS: Total service charges (0 if none)
```

---

### `fn_calculate_tax(p_amount NUMERIC, p_tax_rate NUMERIC DEFAULT 0.15) → NUMERIC`

```
RETURNS: ROUND(p_amount * p_tax_rate, 2)
NOTES:   15% default tax rate (Sri Lanka standard).
         Tax is applied on (room_charges + service_charges - discount).
```

---

### `fn_get_outstanding_balance(p_booking_id UUID) → NUMERIC`

```
LOGIC:   SELECT outstanding_balance FROM bill WHERE booking_id = p_booking_id
RAISES:  'Bill not yet generated for this booking' if no bill row exists
RETURNS: Outstanding balance amount
```

---

## Part B: Business Procedures

### `create_booking(p_guest_id, p_room_id, p_check_in, p_check_out, p_payment_option) → UUID`

```
ISOLATION:  SERIALIZABLE
LOCKING:    SELECT ... FOR UPDATE on the target room's bookings

LOGIC:
  1. Validate guest exists
  2. Validate room exists, get branch_id and room_type_id
  3. Lock: SELECT 1 FROM booking
       WHERE room_id = p_room_id
         AND status NOT IN ('Cancelled', 'Checked-Out')
         AND check_in_date < p_check_out
         AND check_out_date > p_check_in
       FOR UPDATE
     → If any rows: RAISE 'Room not available for selected dates'
  4. Snapshot rate: rate := fn_get_current_rate(branch_id, room_type_id)
  5. INSERT INTO booking (...) VALUES (...) RETURNING booking_id
  6. RETURN booking_id

ERRORS:
  - 'Guest not found'
  - 'Room not found'
  - 'Room not available for selected dates'
  - 'Check-out date must be after check-in date'
```

---

### `check_in(p_booking_id UUID) → VOID`

```
LOGIC:
  1. SELECT status FROM booking WHERE booking_id = p_booking_id FOR UPDATE
  2. Validate status = 'Booked' → else RAISE 'Only Booked bookings can be checked in'
  3. UPDATE booking SET status = 'Checked-In', actual_checkin_time = NOW()
  4. UPDATE room SET status = 'Occupied' WHERE room_id = (booking's room_id)
     → (can also be handled by room_status_trigger)

ERRORS:
  - 'Booking not found'
  - 'Only Booked bookings can be checked in'
```

---

### `check_out(p_booking_id UUID) → VOID`

```
LOGIC:
  1. SELECT status FROM booking WHERE booking_id = p_booking_id FOR UPDATE
  2. Validate status = 'Checked-In'
  3. balance := fn_get_outstanding_balance(p_booking_id)
  4. IF balance > 0 THEN RAISE 'Outstanding balance of LKR % — pay before checkout'
  5. UPDATE booking SET status = 'Checked-Out', actual_checkout_time = NOW()
  6. UPDATE room SET status = 'Available' WHERE room_id = (booking's room_id)
     → (can also be handled by room_status_trigger)

ERRORS:
  - 'Booking not found'
  - 'Only Checked-In bookings can be checked out'
  - 'Outstanding balance of LKR X — payment required before checkout'
  - 'Bill not yet generated for this booking'
```

---

### `calculate_bill(p_booking_id UUID, p_discount NUMERIC DEFAULT 0) → UUID`

```
LOGIC:
  1. Validate booking exists and status IN ('Checked-In', 'Checked-Out')
  2. room_charges   := fn_get_room_charges(p_booking_id)
  3. svc_charges    := fn_get_service_charges(p_booking_id)
  4. subtotal       := room_charges + svc_charges - p_discount
  5. tax            := fn_calculate_tax(subtotal)
  6. total          := subtotal + tax
  7. paid           := COALESCE((SELECT SUM(amount) FROM payment WHERE booking_id = p_booking_id), 0)
  8. outstanding    := total - paid
  9. INSERT INTO bill (booking_id, room_charges, service_charges, discount_amount,
                       tax_amount, total_amount, amount_paid, outstanding_balance, balance_flag)
     VALUES (p_booking_id, room_charges, svc_charges, p_discount,
             tax, total, paid, outstanding, outstanding > 0)
     ON CONFLICT (booking_id) DO UPDATE SET ...   ← recalculates if bill already exists
  10. RETURN bill_id

NOTES:
  - Uses ON CONFLICT to allow re-generation (e.g., after adding more services).
  - All monetary math uses fn_ helpers — zero duplication.

ERRORS:
  - 'Booking not found'
  - 'Booking must be Checked-In or Checked-Out to generate a bill'
```

---

### `record_payment(p_booking_id UUID, p_amount NUMERIC, p_method VARCHAR, p_notes VARCHAR DEFAULT NULL) → UUID`

```
LOGIC:
  1. balance := fn_get_outstanding_balance(p_booking_id)
  2. IF p_amount > balance THEN RAISE 'Amount exceeds outstanding balance'
  3. INSERT INTO payment (booking_id, amount, payment_method, notes)
     VALUES (...) RETURNING payment_id
  4. UPDATE bill SET
       amount_paid = amount_paid + p_amount,
       outstanding_balance = outstanding_balance - p_amount,
       balance_flag = (outstanding_balance - p_amount > 0)
     WHERE booking_id = p_booking_id
  5. RETURN payment_id

NOTES:
  - Supports partial payments (multiple calls).
  - Uses fn_get_outstanding_balance() — same function as check_out().

ERRORS:
  - 'Bill not yet generated for this booking'
  - 'Amount exceeds outstanding balance of LKR X'
  - 'Amount must be positive'
```

---

## Part C: Recommended DB File Layout

Given the helper function pattern, update `db/procedures/` to:

```
db/
├── functions/                          ← NEW: pure helper functions
│   ├── fn_calculate_nights.sql
│   ├── fn_get_current_rate.sql
│   ├── fn_get_room_charges.sql
│   ├── fn_get_service_charges.sql
│   ├── fn_calculate_tax.sql
│   └── fn_get_outstanding_balance.sql
├── procedures/
│   ├── booking.sql                     # create_booking()
│   ├── checkin_checkout.sql            # check_in(), check_out()
│   ├── billing.sql                     # calculate_bill()
│   └── payments.sql                    # record_payment()
```

> `run_all.sql` must load `functions/` BEFORE `procedures/` since procedures depend on them.
