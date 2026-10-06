# Vinuji's Task Checklist: Reservation & Front Desk Subsystem

**Assignee:** Vinuji  
**Assignment Guide:** [vinuji.md](./vinuji.md)  
**General Guides:** [System Architecture](../architecture.md) | [Learning Guide](../learn.md) | [Project README](../../../README.md)  
**Specs:** [01_database_design](../../specs/01_database_design.md) | [02_api_contract](../../specs/02_api_contract.md) | [03_stored_procedures](../../specs/03_stored_procedures_functions.md) | [04_triggers](../../specs/04_triggers.md)

---

## Phase 1: Database Logic (PostgreSQL)

- [x] **Double-Booking Prevention Trigger** (`db/triggers/double_booking_trigger.sql`)
  - [x] Implement `trg_check_double_booking()` trigger function
  - [x] Query for overlapping active bookings (`status NOT IN ('Cancelled', 'Checked-Out')`)
  - [x] Overlap check: `existing.check_in_date < new.check_out_date AND existing.check_out_date > new.check_in_date`
  - [x] Raise exception on overlap: `RAISE EXCEPTION 'Room % is already booked for the selected dates.'`
  - [x] Define `BEFORE INSERT ON booking FOR EACH ROW` trigger
- [x] **Booking Creation Stored Procedure** (`db/procedures/booking.sql`)
  - [x] Implement `create_booking(p_guest_id, p_room_id, p_check_in_date, p_check_out_date, p_payment_option, OUT p_booking_id)`
  - [x] Look up `branch_id` and `room_type_id` from `room` table
  - [x] Snapshot rate via `v_rate := fn_get_current_rate(v_branch_id, v_room_type_id)`
  - [x] Insert booking record with status `'Booked'` and return `booking_id`
- [x] **Check-In & Check-Out Stored Procedures** (`db/procedures/checkin_checkout.sql`)
  - [x] Implement `perform_checkin(p_booking_id UUID)`
  - [x] Validate booking status is `'Booked'`, raise exception if invalid
  - [x] Update `booking.status = 'Checked-In'`, `actual_checkin_time = NOW()`, `room.status = 'Occupied'`
  - [x] Implement `perform_checkout(p_booking_id UUID)`
  - [x] Validate booking status is `'Checked-In'`, raise exception if invalid
  - [x] Update `booking.status = 'Checked-Out'`, `actual_checkout_time = NOW()`, `room.status = 'Available'`
- [x] **Room Status Sync Trigger** (`db/triggers/room_status_trigger.sql`)
  - [x] Implement `trg_sync_room_status()` trigger function
  - [x] Handle transition to `'Checked-In'` (set room status `'Occupied'`)
  - [x] Handle transition to `'Checked-Out'` or `'Cancelled'` (set room status `'Available'`)
  - [x] Define `AFTER UPDATE OF status ON booking FOR EACH ROW` trigger

---

## Phase 2: Backend Schemas (Pydantic)

- [x] **Booking Pydantic Schemas** (`backend/app/schemas/booking.py`)
  - [x] Define `BookingCreate` schema (`guest_id`, `room_id`, `check_in_date`, `check_out_date`, `payment_option`)
  - [x] Add validator to enforce `check_out_date > check_in_date`
  - [x] Define `BookingStatusUpdate` schema (`reason: str | None = None`)
  - [x] Define `BookingOut` schema with all fields, dates, rates, and timestamps (`from_attributes = True`)

---

## Phase 3: Backend Routers (FastAPI)

- [ ] **Booking Endpoints** (`backend/app/routers/bookings.py`)
  - [x] `POST /api/bookings`: Invoke `create_booking`, catch overlap error → return `409 Conflict`, return `201 Created`
  - [x] `GET /api/bookings`: Paginated search with query filters (`status`, `guest_id`, `room_id`, `branch_id`)
  - [x] `GET /api/bookings/{booking_id}`: Retrieve detailed booking record with guest & room details
  - [x] `PATCH /api/bookings/{booking_id}/checkin`: RBAC check (`receptionist`, `manager`, `admin`), invoke `perform_checkin`
  - [x] `PATCH /api/bookings/{booking_id}/checkout`: RBAC check (`receptionist`, `manager`, `admin`), invoke `perform_checkout`
  - [x] `PATCH /api/bookings/{booking_id}/cancel`: Allow guest (own booking) or staff to cancel reservation

---

## Phase 4: Testing & Verification

- [ ] **Database Level Verification**
  - [ ] Test double-booking trigger with overlapping date ranges in psql (ensure exception is raised)
  - [ ] Test booking creation and verify `rate_at_booking` is locked
  - [ ] Verify check-in and check-out procedures update both `booking` and `room` statuses
- [ ] **API Level Verification**
  - [ ] Verify endpoints in FastAPI Swagger UI (`http://localhost:8000/docs`)
  - [ ] Verify 409 Conflict returned when booking already reserved room
  - [ ] Verify 403 Forbidden returned when unauthorized role attempts check-in/out
