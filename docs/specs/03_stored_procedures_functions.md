# 03 — Stored Procedures & Functions

> This spec separates **reusable helper functions** from **business procedures** to eliminate code redundancy.

---

## Redundancy Analysis

Without helper functions, the following logic gets duplicated:

| Duplicated Logic | Appears In |
|-----------------|------------|
| `rate × nights` calculation | `generate_bill()`, `perform_checkout()` |
| SUM of service charges | `generate_bill()`, bill queries |
| Tax computation | `generate_bill()`, any billing display |
| Outstanding balance check | `perform_checkout()`, `record_payment()` |
| Room rate lookup | `create_booking()`, `generate_bill()` |

### Solution: Dependency Graph

```
create_booking()
  └── fn_get_current_rate()      ← snapshots rate_at_booking

generate_bill()
  ├── fn_get_room_charges()      ← calls fn_calculate_nights() internally
  ├── fn_get_service_charges()
  └── fn_calculate_tax()

perform_checkout()
  ├── generate_bill()            ← recalculates the bill first (ISSUE-04)
  └── fn_get_outstanding_balance()

record_payment()
  └── fn_get_outstanding_balance()
```

---

## Part A: Helper Functions (Reusable)

### `fn_calculate_nights(p_check_in DATE, p_check_out DATE) → INT`

```
RETURNS: GREATEST(check_out - check_in, 1) (integer days)
NOTES:   Pure calculation, no DB access (IMMUTABLE).
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
         Open decision: the SRS (§2.5, REQ-6.3) specifies 16% (15% VAT + 1%
         Tourism Levy); the implementation and UI use 15%.
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

### `create_booking(p_guest_id UUID, p_room_id UUID, p_check_in_date DATE, p_check_out_date DATE, p_payment_option VARCHAR, OUT p_booking_id UUID)`

Procedure: `CALL create_booking(guest, room, check_in, check_out, option, NULL)` → one row `{p_booking_id}`.

```
LOGIC:
  1. Validate guest exists
  2. Validate room exists, get branch_id, room_type_id and status
  3. Business rules (ISSUE-08):
       p_check_in < CURRENT_DATE            → RAISE 'Check-in date cannot be in the past'
       p_check_out - p_check_in > 30        → RAISE 'Stays longer than 30 nights must be
                                               arranged with the front desk'
       room status = 'Maintenance'          → RAISE 'Room is under maintenance and cannot
                                               be booked'
  4. Snapshot rate: rate := fn_get_current_rate(branch_id, room_type_id)
  5. INSERT INTO booking (...) VALUES (...) RETURNING booking_id INTO OUT p_booking_id
     → trg_check_double_booking locks the room row and checks overlaps;
       excl_booking_room_overlap is the guarantee (ISSUE-05)

CONSTANTS:
  - Max stay: 30 nights (c_max_nights in booking.sql; MAX_STAY_NIGHTS in the
    frontend). Agreed business value; change both together.
  - No limit on how far ahead a booking can be made.

ERRORS:
  - 'Guest not found' / 'Room not found'                     → 404
  - 'Check-in date cannot be in the past'                    → 400
  - 'Stays longer than 30 nights must be arranged ...'       → 400
  - 'Room is under maintenance and cannot be booked'         → 409
  - 'Room % is already booked for the selected dates.'       → 409
  - payment_option outside the list: CHECK chk_booking_payment_option
  - check-out not after check-in: CHECK chk_booking_dates
```

---

### `perform_checkin(p_booking_id UUID)`

Procedure (`db/procedures/checkin_checkout.sql`), no return value.

```
LOGIC:
  1. SELECT booking status/dates + room status
       FROM booking JOIN room ... WHERE booking_id = p_booking_id FOR UPDATE OF booking
  2. Validate status = 'Booked' → else RAISE 'Only Booked bookings can be checked in'
     CURRENT_DATE < check_in_date      → RAISE 'Check-in is not allowed before %'   (no early check-in)
     CURRENT_DATE >= check_out_date    → RAISE 'This booking''s stay period has already ended'
     room status = 'Maintenance'       → RAISE 'Room is under maintenance'          (API 409)
  3. UPDATE booking SET status = 'Checked-In', actual_checkin_time = NOW()
  4. Room -> 'Occupied' is done by trg_room_status (the procedure does not
     update the room table; see 04_triggers.md)

ERRORS:
  - 'Booking not found'
  - 'Only Booked bookings can be checked in'
  - 'Check-in is not allowed before YYYY-MM-DD'
  - 'This booking''s stay period has already ended'
  - 'Room is under maintenance'

CONCURRENCY:
  - The FOR UPDATE in step 1 makes a concurrent second check-in wait, then
    see 'Checked-In' and raise, so exactly one of N simultaneous check-ins wins.
```

---

### `cancel_booking(p_booking_id UUID)`

Procedure (`db/procedures/booking.sql`), no return value.

```
LOGIC:
  1. SELECT status FROM booking WHERE booking_id = p_booking_id FOR UPDATE
  2. Validate status = 'Booked'
       → else RAISE 'Only Booked bookings can be cancelled (current status: %)'
  3. UPDATE booking SET status = 'Cancelled'
     → room status is handled by trg_room_status

ERRORS:
  - 'Booking not found'
  - 'Only Booked bookings can be cancelled (current status: X)'

NOTES:
  - Replaces the router's SELECT-then-UPDATE: a cancel racing a check-in
    waits for it and then raises, instead of cancelling a checked-in guest.
  - Authorization (branch / own booking) stays in the router.
```

---

### `perform_checkout(p_booking_id UUID)`

Procedure (`db/procedures/checkin_checkout.sql`), no return value.

```
LOGIC:
  1. SELECT status FROM booking WHERE booking_id = p_booking_id FOR UPDATE
  2. Validate status = 'Checked-In'
  3. CALL generate_bill(p_booking_id, NULL)
     → the stored bill is only as fresh as the last generate, so recalculate
       it here: creates it if missing, bills services added since, keeps the
       existing discount (NULL)
  4. balance := fn_get_outstanding_balance(p_booking_id)
  5. IF balance > 0 THEN RAISE 'Outstanding balance of LKR % — pay before checkout'
     → rolls back the whole CALL, including the bill refresh (API → 402)
  6. UPDATE booking SET status = 'Checked-Out', actual_checkout_time = NOW()
  7. Room -> 'Available' is done by trg_room_status (a Maintenance flag set
     during the stay is kept)

ERRORS:
  - 'Booking not found'
  - 'Only Checked-In bookings can be checked out'
  - 'Outstanding balance of LKR X — pay before checkout'
  (No 'Bill not yet generated' path: step 3 always creates the bill.)
```

---

### `generate_bill(p_booking_id UUID, p_discount_amount NUMERIC DEFAULT NULL)`

Procedure (`db/procedures/billing.sql`), no return value: `CALL generate_bill(id, NULL)`; the API reads the bill back afterwards.

```
LOGIC:
  1. SELECT status FROM booking WHERE booking_id = p_booking_id FOR UPDATE
     Validate status IN ('Checked-In', 'Checked-Out')
  2. room_charges   := fn_get_room_charges(p_booking_id)
  3. svc_charges    := fn_get_service_charges(p_booking_id)
  4. discount       := COALESCE(p_discount_amount, existing bill.discount_amount, 0)
                       (NULL keeps the discount already on the bill)
     0 <= discount <= room_charges + svc_charges, else RAISE
  5. subtotal       := room_charges + svc_charges - discount
  6. tax            := fn_calculate_tax(subtotal)
  7. total          := subtotal + tax   (>= 100,000,000 → RAISE)
  8. paid           := COALESCE((SELECT SUM(amount) FROM payment WHERE booking_id = p_booking_id), 0)
  9. outstanding    := GREATEST(total - paid, 0)
  10. INSERT INTO bill (...) VALUES (...)
      ON CONFLICT (booking_id) DO UPDATE SET ...   ← recalculates if bill already exists

NOTES:
  - Uses ON CONFLICT to allow re-generation (e.g., after adding more services).
  - All monetary math uses fn_ helpers — zero duplication.
  - Known gap (ISSUE-13 §13.1, not yet done): a discount applied after full
    payment can leave amount_paid > total_amount with outstanding 0.

ERRORS:
  - 'Booking not found'
  - 'Booking must be Checked-In or Checked-Out to generate a bill'
  - 'Discount must be between 0 and the bill subtotal'
  - 'Bill total exceeds the maximum supported amount'  (total ≥ 100,000,000; bill columns are NUMERIC(10,2))
```

---

### `record_payment(p_booking_id UUID, p_amount NUMERIC, p_payment_method VARCHAR, p_notes VARCHAR, OUT p_payment_id UUID)`

Call with all five arguments; the last `NULL` is the OUT placeholder:
`CALL record_payment(id, amount, 'Cash', notes_or_NULL, NULL)` → one row `{p_payment_id}`.

```
LOGIC:
  1. p_amount must be > 0 and have at most 2 decimal places
  2. SELECT total_amount FROM bill WHERE booking_id = p_booking_id FOR UPDATE
     → serializes concurrent payments on one bill
  3. balance := fn_get_outstanding_balance(p_booking_id)
  4. IF p_amount > balance THEN RAISE 'Amount exceeds outstanding balance of LKR %'
  5. INSERT INTO payment (booking_id, amount, payment_method, notes)
     VALUES (...) RETURNING payment_id INTO p_payment_id
     → payment_method must pass CHECK chk_payment_method
  6. UPDATE bill SET amount_paid / outstanding_balance / balance_flag
     recalculated from SUM(payment.amount)

NOTES:
  - Supports partial payments (multiple calls).
  - Uses fn_get_outstanding_balance() — same function as perform_checkout().
  - Concurrency verified: 10 parallel payments of total/4 → 4 succeed, the
    rest get 400, and amount_paid never exceeds total_amount.

ERRORS:
  - 'Amount must be positive'
  - 'Amount can have at most 2 decimal places'
  - 'Bill not yet generated for this booking'
  - 'Amount exceeds outstanding balance of LKR X'
```

---

## Part C: DB File Layout

```
db/
├── functions/                          ← pure helper functions
│   ├── fn_calculate_nights.sql
│   ├── fn_get_current_rate.sql
│   ├── fn_get_room_charges.sql
│   ├── fn_get_service_charges.sql
│   ├── fn_calculate_tax.sql
│   └── fn_get_outstanding_balance.sql
├── procedures/
│   ├── booking.sql                     # create_booking(), cancel_booking()
│   ├── checkin_checkout.sql            # perform_checkin(), perform_checkout()
│   ├── billing.sql                     # generate_bill()
│   └── payments.sql                    # record_payment()
```

All business routines are PROCEDUREs called with `CALL`; OUT parameters
(`create_booking`, `record_payment`) come back as a one-row result.

> `run_all.sql` must load `functions/` BEFORE `procedures/` since procedures depend on them.
