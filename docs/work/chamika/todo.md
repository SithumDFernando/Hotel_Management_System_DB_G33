# Chamika's Task Checklist: Rooms, Amenities & Guest Services

**Assignee:** Chamika  
**Assignment Guide:** [chamika.md](./chamika.md)  
**General Guides:** [System Architecture](../architecture.md) | [Learning Guide](../learn.md) | [Project README](../../../README.md)  
**Specs:** [01_database_design](../../specs/01_database_design.md) | [02_api_contract](../../specs/02_api_contract.md) | [03_stored_procedures](../../specs/03_stored_procedures_functions.md) | [04_triggers](../../specs/04_triggers.md)

---

## Phase 1: Database Functions & Triggers (PostgreSQL)

- [x] **Current Rate Lookup Function** (`db/functions/fn_get_current_rate.sql`)
  - [x] Implement `fn_get_current_rate(p_branch_id UUID, p_room_type_id UUID) RETURNS NUMERIC(10,2)` as `STABLE`
  - [x] Query `room_rate` table for matching branch and room type
  - [x] Return daily rate or raise exception if rate configuration is missing
- [x] **Service Usage Validation & Price Snapshot Trigger** (`db/triggers/service_usage_trigger.sql`)
  - [x] Implement `trg_validate_service_usage()` trigger function
  - [x] Check `booking.status` for the target booking: raise exception if not `'Checked-In'`
  - [x] If `NEW.unit_price IS NULL OR NEW.unit_price = 0`, snapshot price from `service.base_price`
  - [x] Define `BEFORE INSERT ON service_usage FOR EACH ROW` trigger

---

## Phase 2: Backend Schemas (Pydantic)

- [x] **Guest Pydantic Schemas** (`backend/app/schemas/guest.py`)
  - [x] Define `GuestBase` (`full_name`, `nic_passport`, `email`, `phone`, `date_of_birth`, `nationality`, `gender`, `guest_type`, `company_name`, `company_reg_number`, `billing_contact_name`)
  - [x] Enforce model validator: require `company_name` when `guest_type == 'Corporate'`
  - [x] Define `GuestCreate` inheriting `GuestBase`
  - [x] Define `GuestUpdate` with optional fields for partial edits
  - [x] Define `GuestOut` inheriting `GuestBase` + `guest_id: UUID` (`from_attributes = True`)
- [x] **Service Pydantic Schemas** (`backend/app/schemas/service.py`)
  - [x] Define `ServiceBase` (`service_name`, `category`, `base_price`, `is_active`)
  - [x] Define `ServiceCreate`, `ServiceUpdate`, `ServiceOut`
  - [x] Define `ServiceUsageCreate` (`service_id`, `usage_date`, `quantity`)
  - [x] Define `ServiceUsageOut` (`usage_id`, `booking_id`, `service_id`, `quantity`, `unit_price`, `line_total`, `usage_date`)

---

## Phase 3: Backend Routers (FastAPI)

- [x] **Guest Management Router** (`backend/app/routers/guests.py`)
  - [x] `GET /api/guests`: Search guests (`?search=`) by name, NIC/passport, or email (Role: `receptionist`, `manager`, `admin`)
  - [x] `GET /api/guests/{guest_id}`: Fetch detailed guest profile with previous booking records
  - [x] `POST /api/guests`: Create guest profile with validation, return `201 Created`
  - [x] `PUT /api/guests/{guest_id}`: Update guest contact or company information
- [x] **Services Catalog & Usage Router** (`backend/app/routers/services.py`)
  - [x] `GET /api/services`: List active services (`WHERE is_active = TRUE`)
  - [x] `POST /api/services`: Add new service catalog item (Role: `admin`, `manager`)
  - [x] `PATCH /api/services/{service_id}`: Modify service price or toggle `is_active`
  - [x] `GET /api/services/{booking_id}/usage`: Retrieve itemized service usage with sum total
  - [x] `POST /api/services/{booking_id}/usage`: Record service order; handle trigger exception (`400/422 Unprocessable Entity` if not checked in)

---

## Phase 4: Testing & Verification

- [ ] **Database Level Verification**
  - [ ] Test `fn_get_current_rate` with branch-room pairings in psql
  - [ ] Test `service_usage_trigger` rejection for non-Checked-In bookings and price snapshotting
- [ ] **API Level Verification**
  - [ ] Test guest search and creation endpoints with Corporate vs Individual validations
  - [ ] Test service catalog CRUD and service ordering via `/docs`
