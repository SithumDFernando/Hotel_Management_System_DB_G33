# Sheereen's Task Checklist: Billing & Payments Subsystem

**Assignee:** Sheereen  
**Assignment Guide:** [sheereen.md](./sheereen.md)  
**General Guides:** [System Architecture](../architecture.md) | [Learning Guide](../learn.md) | [Project README](../../../README.md)  
**Specs:** [01_database_design](../../specs/01_database_design.md) | [02_api_contract](../../specs/02_api_contract.md) | [03_stored_procedures](../../specs/03_stored_procedures_functions.md)

---

## Phase 1: Database Functions & Procedures (PostgreSQL)

- [x] **Calculation Helper Functions** (`db/functions/`)
  - [x] Implement `fn_calculate_nights(p_check_in DATE, p_check_out DATE) RETURNS INTEGER` (`db/functions/fn_calculate_nights.sql`)
    - Minimum 1 night if check_out <= check_in, otherwise return difference
  - [x] Implement `fn_calculate_tax(p_amount NUMERIC(10,2)) RETURNS NUMERIC(10,2)` (`db/functions/fn_calculate_tax.sql`)
    - Compute 15% tax rounded to 2 decimal places (Sri Lanka standard / SRS REQ-6.1)
  - [x] Implement `fn_get_room_charges(p_booking_id UUID) RETURNS NUMERIC(10,2)` (`db/functions/fn_get_room_charges.sql`)
    - Query nights and locked rate from `booking` table; compute total room charge
  - [x] Implement `fn_get_service_charges(p_booking_id UUID) RETURNS NUMERIC(10,2)` (`db/functions/fn_get_service_charges.sql`)
    - Sum $(quantity \times unit\_price)$ from `service_usage` for booking
  - [x] Implement `fn_get_outstanding_balance(p_booking_id UUID) RETURNS NUMERIC(10,2)` (`db/functions/fn_get_outstanding_balance.sql`)
    - Calculate $(total\_amount - amount\_paid)$ from `bill` table
- [x] **Bill Generation Stored Procedure** (`db/procedures/billing.sql`)
  - [x] Implement `generate_bill(p_booking_id UUID, p_discount_amount NUMERIC(10,2) DEFAULT 0.00)`
  - [x] Aggregate room charges and service charges
  - [x] Apply discount, compute subtotal and 15% tax
  - [x] Read cumulative payments from `payment` table
  - [x] Execute atomic UPSERT into `bill` table (`ON CONFLICT (booking_id) DO UPDATE`)
- [x] **Payment Recording Stored Procedure** (`db/procedures/payments.sql`)
  - [x] Implement `record_payment(p_booking_id UUID, p_amount NUMERIC(10,2), p_payment_method VARCHAR(50), p_notes VARCHAR(255) DEFAULT NULL)`
  - [x] Verify bill exists for the booking (raise exception if not found)
  - [x] Insert payment record into `payment` table
  - [x] Atomically update `bill.amount_paid`, `bill.outstanding_balance`, and `bill.balance_flag`

---

## Phase 2: Backend Schemas (Pydantic)

- [x] **Billing Pydantic Schemas** (`backend/app/schemas/billing.py`)
  - [x] Define `BillOut` schema (`bill_id`, `booking_id`, `room_charges`, `service_charges`, `discount_amount`, `tax_amount`, `total_amount`, `amount_paid`, `outstanding_balance`, `balance_flag`, `generated_at`) with `from_attributes = True`
  - [x] Define `PaymentCreate` schema (`booking_id`, `amount`, `payment_method`, `notes`) with validator checking `amount > 0`
  - [x] Define `PaymentOut` schema (`payment_id`, `booking_id`, `amount`, `payment_method`, `paid_at`, `notes`) with `from_attributes = True`

---

## Phase 3: Backend Routers (FastAPI)

- [x] **Billing & Payment Endpoints** (`backend/app/routers/billing.py`)
  - [x] `POST /api/billing/{booking_id}/generate`: Call `generate_bill` procedure, return `BillOut` (Role: `receptionist`, `manager`, `admin`)
  - [x] `GET /api/billing/{booking_id}`: Fetch bill record, return `BillOut`
  - [x] `POST /api/payments`: Call `record_payment` procedure, return `201 Created` with `PaymentOut`
  - [x] `GET /api/payments/{booking_id}`: Fetch payment ledger for booking ordered by `paid_at DESC`

---

## Phase 4: Testing & Verification

- [ ] **Database Level Verification**
  - [ ] Test calculation functions (`fn_calculate_nights`, `fn_calculate_tax`, charges) with sample arguments in psql
  - [ ] Test `generate_bill` initial insertion and subsequent re-generation (UPSERT)
  - [ ] Test `record_payment` partial and full payment scenarios; verify `balance_flag` transitions (`Unpaid` → `Partially_Paid` → `Paid`)
- [ ] **API Level Verification**
  - [ ] Verify endpoints in FastAPI Swagger UI (`http://localhost:8000/docs`)
  - [ ] Verify bill calculation matches expected arithmetic across room and service charges
  - [ ] Verify payment recording prevents negative or zero payment amounts
