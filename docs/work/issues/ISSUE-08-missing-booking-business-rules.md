# ISSUE-08 — Missing booking, check-in and service-usage business rules

| | |
|---|---|
| **Severity** | 🟠 Medium (business logic) |
| **Area** | Database — `booking.sql`, `checkin_checkout.sql`, `service_usage_trigger.sql`, constraints; backend error mapping; small frontend tweaks |
| **Found** | 2026-10-12 audit |

## Problem

The frontend checks some of these rules client-side, but the API accepts all of the following. Anyone calling the API directly can bypass them:

| # | Accepted request | Why it's wrong |
|---|---|---|
| a | Booking with check-in in the **past** (2020-01-01) | Corrupts occupancy and revenue history |
| b | Booking a room in **Maintenance** (room 104) | Room isn't sellable |
| c | **5-year** stay (2028 → 2033) | One request blocks a room for years |
| d | `payment_option = "Bitcoin lol"` | Free text; reports can't group by it |
| e | **Check-in 8 months early** (booking for 2027-06-01 checked in on 2026-10-12) | Room shows Occupied immediately and blocks walk-ins; charges are calculated for the wrong period |
| f | Service usage dated **2001-01-01** on a 2027 stay | Charges outside the stay |
| g | Check-in while the room is in **Maintenance** | Room flips to Occupied |

## Implementation plan

Put the rules in the **database procedures/triggers**, the source of truth that every caller goes through, then map their messages to HTTP codes in the routers.

### 1. `create_booking` (`db/procedures/booking.sql`)

After the room lookup (and the "Room not found" check from ISSUE-07):

```sql
SELECT branch_id, room_type_id, status
  INTO v_branch_id, v_room_type_id, v_room_status
  FROM room WHERE room_id = p_room_id;

IF NOT FOUND THEN RAISE EXCEPTION 'Room not found'; END IF;

IF NOT EXISTS (SELECT 1 FROM guest WHERE guest_id = p_guest_id) THEN
    RAISE EXCEPTION 'Guest not found';
END IF;

IF p_check_in_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Check-in date cannot be in the past';
END IF;

IF p_check_out_date - p_check_in_date > 30 THEN
    RAISE EXCEPTION 'Stays longer than 30 nights must be arranged with the front desk';
END IF;

IF v_room_status = 'Maintenance' THEN
    RAISE EXCEPTION 'Room is under maintenance and cannot be booked';
END IF;
```

- The 30-night cap is a business constant. Agree on the value with the team and record it in `03_stored_procedures_functions.md`.
- Optionally cap how far ahead bookings can be made (e.g. `p_check_in_date > CURRENT_DATE + 365`).

### 2. `payment_option` / `payment_method` vocabulary

DB (`02_constraints.sql`). The seed only uses these three values, so it's safe:

```sql
ALTER TABLE booking ADD CONSTRAINT chk_booking_payment_option
    CHECK (payment_option IN ('Credit Card', 'Cash', 'Bank Transfer'));
ALTER TABLE payment ADD CONSTRAINT chk_payment_method
    CHECK (payment_method IN ('Credit Card', 'Cash', 'Bank Transfer'));
```

API: `Literal["Credit Card", "Cash", "Bank Transfer"]` in `BookingCreate.payment_option` and `PaymentCreate.payment_method`. The frontend lists already match (`BookingCheckout.jsx` `PAYMENT_OPTIONS`, `BillPaymentModal.jsx` `METHODS`).

### 3. `perform_checkin` (`db/procedures/checkin_checkout.sql`)

```sql
SELECT b.status, b.room_id, b.check_in_date, b.check_out_date, r.status
  INTO v_status, v_room_id, v_ci, v_co, v_room_status
  FROM booking b JOIN room r ON r.room_id = b.room_id
 WHERE b.booking_id = p_booking_id
   FOR UPDATE OF b;                       -- ISSUE-12

IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found'; END IF;
IF v_status <> 'Booked' THEN RAISE EXCEPTION 'Only Booked bookings can be checked in'; END IF;
IF CURRENT_DATE < v_ci THEN
    RAISE EXCEPTION 'Check-in is not allowed before %', v_ci;
END IF;
IF CURRENT_DATE >= v_co THEN
    RAISE EXCEPTION 'This booking''s stay period has already ended';
END IF;
IF v_room_status = 'Maintenance' THEN
    RAISE EXCEPTION 'Room is under maintenance';
END IF;
```

If early check-in is a product requirement, allow `CURRENT_DATE >= v_ci - 1` instead and document it.

### 4. Service usage date (`db/triggers/service_usage_trigger.sql`)

After defaulting `usage_date`:

```sql
SELECT check_in_date, check_out_date INTO v_ci, v_co
  FROM booking WHERE booking_id = NEW.booking_id;

IF NEW.usage_date < v_ci OR NEW.usage_date > v_co THEN
    RAISE EXCEPTION 'Service date % is outside the stay (% to %)', NEW.usage_date, v_ci, v_co;
END IF;
```

(Inclusive of checkout day, for late-checkout or breakfast charges.)

### 5. Router error mapping

| Message contains | HTTP |
|---|---|
| `not found` | 404 |
| `under maintenance`, `already booked` | 409 |
| `cannot be in the past`, `longer than`, `before`, `has already ended`, `outside the stay` | 400 (or 422 for usage, matching the spec's §services) |

Consider a shared `map_raise_error(exc, extra: dict[str, int])` helper next to `_db_error_to_http` in `billing.py`, so each router stops pattern-matching strings on its own.

### 6. Frontend

- `ReceptionistDashboard.jsx`: disable or hide **Check-in** when `todayISO() < b.check_in_date`, with a tooltip like "Arrives on …".
- `ServiceRequest.jsx`: limit the usage-date picker with `min=check_in_date` and `max=check_out_date`.
- `BookingCheckout.jsx` already blocks past dates and Maintenance rooms. Add the 30-night cap to `dateError`.

### 7. Existing tests and seed

- `test_business_logic.py` inserts bookings **directly** (bypassing the procedure) with 2027 dates. That's unaffected.
- Any API test that books "today" must still pass (`check_in = today` is allowed).
- Seed rows are plain INSERTs and don't go through the procedures. Keep it that way.

## Tests to add

One negative test per row (a–g) → expected 4xx, plus positive tests: book today, check in today, a usage on the check-out day.

## Acceptance criteria

- [ ] All seven scenarios are rejected by the API **and** by a direct `CALL`/`INSERT` in psql.
- [ ] Error messages are human-readable and map to the documented status codes.
