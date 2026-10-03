# Sadeepa's Task Checklist: Analytics, Views & Seed Data

**Assignee:** Sadeepa  
**Assignment Guide:** [sadeepa.md](./sadeepa.md)  
**General Guides:** [System Architecture](../architecture.md) | [Learning Guide](../learn.md) | [Project README](../../../README.md)  
**Specs:** [01_database_design](../../specs/01_database_design.md) | [02_api_contract](../../specs/02_api_contract.md) | [05_views_and_reports](../../specs/05_views_and_reports.md) | [07_seed_data](../../specs/07_seed_data.md)

---

## Phase 1: Database Views & Seed Verification (PostgreSQL)

- [x] **Analytical Management Views** (`db/views/reports.sql`)
  - [x] Implement view `v_room_occupancy`
    - Tables: `room`, `branch`, `room_type`, `booking` (LEFT JOIN on active reservations)
    - Columns: `room_id`, `branch_id`, `branch_name`, `room_number`, `type_name`, `capacity`, `room_status`, `booking_id`, `check_in_date`, `check_out_date`, `guest_id`
  - [x] Implement view `v_guest_billing_summary`
    - Tables: `guest`, `booking`, `bill`, `branch`
    - Columns: `guest_id`, `full_name`, `email`, `phone`, `guest_type`, `booking_id`, `branch_name`, `total_amount`, `amount_paid`, `outstanding_balance`, `balance_flag`
  - [x] Implement view `v_service_usage_breakdown`
    - Tables: `service_usage`, `service`, `booking`, `room`, `branch`
    - Columns: `branch_name`, `service_name`, `category`, `total_quantity_used`, `total_revenue_generated`
  - [x] Implement view `v_monthly_revenue`
    - Tables: `bill`, `booking`, `room`, `branch`
    - Aggregate by: `branch_name`, `year`, `month`
    - Columns: `year`, `month`, `branch_name`, `total_room_revenue`, `total_service_revenue`, `total_tax_collected`, `total_gross_revenue`
  - [x] Implement view `v_top_services`
    - Tables: `service_usage`, `service`
    - Window function: `RANK() OVER (ORDER BY SUM(quantity * unit_price) DESC) as revenue_rank`
    - Columns: `revenue_rank`, `service_name`, `category`, `total_bookings_ordered`, `total_quantity`, `total_revenue`
- [x] **Seed Data Quality Assurance** (`db/seed/sample_data.sql`)
  - [x] Verify test dataset generates meaningful aggregations in all 5 views
  - [x] Ensure edge cases (partial payments, multiple service usages, distinct branches) are covered

---

## Phase 2: Reports Router (FastAPI)

- [ ] **Reporting Endpoints** (`backend/app/routers/reports.py`)
  - [ ] `GET /api/reports/occupancy`: Filter by `branch_id?` and `date?` (Role: `manager`, `admin`)
  - [x] `GET /api/reports/billing-summary`: Filter by `branch_id?` and `unpaid_only?` flag
  - [x] `GET /api/reports/service-usage`: Filter by `branch_id?`
  - [x] `GET /api/reports/monthly-revenue`: Aggregate revenue by `year`, `month?`, and `branch_id?`
  - [ ] `GET /api/reports/top-services`: Ranked service list with `limit?` (default 10)

---

## Phase 3: Admin Router (FastAPI)

- [ ] **Branch & User Administration** (`backend/app/routers/admin.py`)
  - [ ] `GET /api/admin/branches`: List all branches with basic stats
  - [ ] `POST /api/admin/branches`: Create new branch (Role: `admin`)
  - [ ] `PUT /api/admin/branches/{branch_id}`: Update branch metadata
  - [ ] `GET /api/admin/users`: List staff accounts with their roles and branch assignments
  - [ ] `POST /api/admin/users`: Create staff account, hashing password with `auth.hash_password`
  - [ ] `PATCH /api/admin/users/{account_id}`: Update user role or branch assignment

---

## Phase 4: Testing & Verification

- [ ] **Database Level Verification**
  - [ ] Verify that all 5 views compile and query successfully in psql
  - [ ] Verify `RANK()` calculations in `v_top_services`
  - [ ] Verify grouping logic in `v_monthly_revenue`
- [ ] **API Level Verification**
  - [ ] Log in as admin and verify access to reports and admin management routes
  - [ ] Verify non-admin / non-manager users receive `403 Forbidden` on protected report endpoints
  - [ ] Confirm JSON output structures match frontend contract requirements
