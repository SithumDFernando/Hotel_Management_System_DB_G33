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

- [x] All seven scenarios are rejected by the API **and** by a direct `CALL`/`INSERT` in psql.
- [x] Error messages are human-readable and map to the documented status codes.

## Resolution (2026-10-12)

| # | Rule | Where | API |
|---|---|---|---|
| a | check-in not in the past (today OK) | `create_booking` | 400 |
| b | room not under Maintenance | `create_booking` | 409 |
| c | at most **30 nights** | `create_booking` (`c_max_nights`) | 400 |
| d | payment option/method ∈ `Credit Card` / `Cash` / `Bank Transfer` | CHECKs `chk_booking_payment_option`, `chk_payment_method` + `PaymentMethod` Literal | 422 |
| e | no check-in before `check_in_date`, none once `check_out_date` is reached | `perform_checkin` | 400 |
| f | usage date inside the stay | `trg_validate_service_usage` | 422 |
| g | no check-in while the room is Maintenance | `perform_checkin` | 409 |

Decisions:
- **30-night cap** as proposed. It's recorded in `03_stored_procedures_functions.md`, and the frontend has `MAX_STAY_NIGHTS`. **No advance-booking cap**: it was optional, and several suites book 2030/2031 dates on purpose.
- **No early check-in** (strict `CURRENT_DATE >= check_in_date`).
- **Usage upper bound is `GREATEST(check_out_date, CURRENT_DATE)`**, not just `check_out_date`. `ServiceRequest.jsx` always charges today's date and has no date picker, so a strict bound would block charging an overdue in-house guest (seed BK-01 is one). Plan step 6's picker limits therefore don't apply.

Code:
- `perform_checkin` reads the room status through a join with `FOR UPDATE OF b`.
- New `app/db_errors.py` → `raise_error_to_http(exc, rules)`: "not found" → 404 is always applied, default 400. It's used by every booking route, `billing._db_error_to_http` and the service-usage route, so each router only lists its own message → status rules.
- Frontend:
  - `ReceptionistDashboard.jsx` already disabled early check-in. It now also disables check-in once the stay has ended, with the tooltip "Arrives on …" / "The stay period has ended".
  - `BookingCheckout.jsx` adds the 30-night cap to `dateError`.

Tests:
- `tests/test_booking_rules.py` (17 tests): each scenario a–g is checked through the API **and** a direct `CALL`/`INSERT`, plus the positive edges (book today, exactly 30 nights, all three payment values, check in on the arrival day, a charge on the check-out day, and a charge today for an overdue guest). All 10 negative tests fail on the pre-fix code (the request was accepted); the 7 positive ones pass either way.
- Existing tests that checked in seed bookings with fixed dates now call the new `arrive_today()` helper in `conftest.py`, so they don't start failing as those dates pass. `test_business_logic.py` dates its own usages inside the stay it builds.

Specs updated: `01` (payment CHECKs), `02` (bookings, check-in, usage and payment errors), `03` (`create_booking` rewritten to match the code, plus `check_in` rules), `04` §3 (usage date), `09` (checkout form, Quick Actions).

⏳ Browser check pending: BookingCheckout with a 31-night stay; Receptionist dashboard check-in button for an upcoming and for an ended booking.
