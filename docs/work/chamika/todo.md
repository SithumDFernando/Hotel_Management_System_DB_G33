# Chamika's Task Checklist: Rooms, Amenities & Guest Services

**Assignee:** Chamika  
**Assignment Guide:** [chamika.md](./chamika.md)  
**General Guides:** [System Architecture](../architecture.md) | [Learning Guide](../learn.md) | [Project README](../../../README.md)  
**Specs:** [01_database_design](../../specs/01_database_design.md) | [02_api_contract](../../specs/02_api_contract.md) | [03_stored_procedures](../../specs/03_stored_procedures_functions.md) | [04_triggers](../../specs/04_triggers.md)

---

## Phase 1: Database Functions & Triggers (PostgreSQL)

- [ ] **Current Rate Lookup Function** (`db/functions/fn_get_current_rate.sql`)
  - [ ] Implement `fn_get_current_rate(p_branch_id UUID, p_room_type_id UUID) RETURNS NUMERIC(10,2)` as `STABLE`
  - [ ] Query `room_rate` table for matching branch and room type
  - [ ] Return daily rate or raise exception if rate configuration is missing
- [ ] **Service Usage Validation & Price Snapshot Trigger** (`db/triggers/service_usage_trigger.sql`)
  - [ ] Implement `trg_validate_service_usage()` trigger function
  - [ ] Check `booking.status` for the target booking: raise exception if not `'Checked-In'`
  - [ ] If `NEW.unit_price IS NULL OR NEW.unit_price = 0`, snapshot price from `service.base_price`
  - [ ] Define `BEFORE INSERT ON service_usage FOR EACH ROW` trigger

---

## Phase 2: Backend Schemas (Pydantic)

- [ ] **Guest Pydantic Schemas** (`backend/app/schemas/guest.py`)
  - [ ] Define `GuestBase` (`full_name`, `nic_passport`, `email`, `phone`, `date_of_birth`, `nationality`, `gender`, `guest_type`, `company_name`, `company_reg_number`, `billing_contact_name`)
  - [ ] Enforce model validator: require `company_name` when `guest_type == 'Corporate'`
  - [ ] Define `GuestCreate` inheriting `GuestBase`
  - [ ] Define `GuestUpdate` with optional fields for partial edits
  - [ ] Define `GuestOut` inheriting `GuestBase` + `guest_id: UUID` (`from_attributes = True`)
- [ ] **Service Pydantic Schemas** (`backend/app/schemas/service.py`)
  - [ ] Define `ServiceBase` (`name`, `category`, `base_price`, `description`, `is_active`)
  - [ ] Define `ServiceCreate`, `ServiceUpdate`, `ServiceOut`
  - [ ] Define `ServiceUsageCreate` (`service_id`, `quantity`, `notes`)
  - [ ] Define `ServiceUsageOut` (`usage_id`, `booking_id`, `service_id`, `quantity`, `unit_price`, `total_price`, `used_at`, `notes`)

---

## Phase 3: Backend Routers (FastAPI)

- [ ] **Guest Management Router** (`backend/app/routers/guests.py`)
  - [ ] `GET /api/guests`: Search guests (`?search=`) by name, NIC/passport, or email (Role: `receptionist`, `manager`, `admin`)
  - [ ] `GET /api/guests/{guest_id}`: Fetch detailed guest profile with previous booking records
  - [ ] `POST /api/guests`: Create guest profile with validation, return `201 Created`
  - [ ] `PUT /api/guests/{guest_id}`: Update guest contact or company information
- [ ] **Services Catalog & Usage Router** (`backend/app/routers/services.py`)
  - [ ] `GET /api/services`: List active services (`WHERE is_active = TRUE`)
  - [ ] `POST /api/services`: Add new service catalog item (Role: `admin`, `manager`)
  - [ ] `PATCH /api/services/{service_id}`: Modify service price or toggle `is_active`
  - [ ] `GET /api/services/{booking_id}/usage`: Retrieve itemized service usage with sum total
  - [ ] `POST /api/services/{booking_id}/usage`: Record service order; handle trigger exception (`400 Bad Request` if not checked in)

---

## Phase 4: Testing & Verification

- [ ] **Database Level Verification**
  - [ ] Test `fn_get_current_rate` with branch-room pairings in psql
  - [ ] Test `service_usage_trigger` rejection for non-Checked-In bookings and price snapshotting
- [ ] **API Level Verification**
  - [ ] Test guest search and creation endpoints with Corporate vs Individual validations
  - [ ] Test service catalog CRUD and service ordering via `/docs`
