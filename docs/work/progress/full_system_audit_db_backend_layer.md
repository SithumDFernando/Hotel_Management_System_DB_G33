# SkyNest Full System Audit Report

**Date:** 2026-10-07  
**Branch:** `dev` (commit `f15e9ad`)  
**Scope:** Database layer + Backend layer across all 4 member issues

---

## Executive Summary

| Issue | Member | DB Layer | Schemas | Router | Todo Accuracy |
|:------|:-------|:---------|:--------|:-------|:--------------|
| 1 — Reservation & Front Desk | Vinuji | ✅ Complete | ✅ Complete | ✅ Complete | ✅ Fully Ticked |
| 2 — Billing & Payments | Sheereen | ✅ Complete | ✅ Complete | ✅ Complete | ✅ Fully Ticked |
| 3 — Rooms, Guests & Services | Chamika | ✅ Complete | ✅ Unified & In Use | ✅ Complete | ✅ Fully Ticked |
| 4 — Views, Reports & Admin | Sadeepa | ✅ Complete | N/A (inline) | ✅ Complete | ✅ Fully Ticked |

> [!IMPORTANT]
> **Audit Status: All Deliverables Verified & Discrepancies Resolved.**
> - Tax rate unified to **15%** (SRS REQ-6.1 / Inland Revenue Act standard).
> - `schemas/service.py` synchronized and integrated into `routers/services.py`.
> - All member `todo.md` files verified and ticked.
> - `docs/specs/02_api_contract.md` updated to match actual API behavior.

---

## Issue 1 — Vinuji (Reservation & Front Desk)

### DB Layer Audit

| File | Status | Notes |
|:-----|:-------|:------|
| [`double_booking_trigger.sql`](../../../db/triggers/double_booking_trigger.sql) | ✅ Implemented | Fires `BEFORE INSERT OR UPDATE` (spec said `BEFORE INSERT` only — the UPDATE is actually **better** for edge cases) |
| [`booking.sql`](../../../db/procedures/booking.sql) | ✅ Implemented | Matches spec exactly |
| [`checkin_checkout.sql`](../../../db/procedures/checkin_checkout.sql) | ✅ Implemented | `perform_checkout` calls `fn_get_outstanding_balance` and blocks checkout if balance > 0 — **good enhancement beyond spec** |
| [`room_status_trigger.sql`](../../../db/triggers/room_status_trigger.sql) | ✅ Implemented | Uses dev's version with no-op guard and `IS NOT DISTINCT FROM` check |

### Schema Audit

| File | Status | Notes |
|:-----|:-------|:------|
| [`schemas/booking.py`](../../../backend/app/schemas/booking.py) | ✅ Complete | `BookingCreate`, `BookingStatusUpdate`, `BookingOut` + extra models: `BookingListOut`, `BookingDetailOut`, `BookingCheckInResponse`, `BookingCheckOutResponse`, `BookingCancelResponse`, `GuestInfo`, `RoomInfo`, `BillSummary` |

### Router Audit

| Endpoint | Status | Notes |
|:---------|:-------|:------|
| `POST /api/bookings` | ✅ | Calls `create_booking()`, catches overlap → 409 |
| `GET /api/bookings` | ✅ | Paginated with filters, RBAC scoping |
| `GET /api/bookings/{id}` | ✅ | Branch + guest ownership checks |
| `PATCH /api/bookings/{id}/checkin` | ✅ | RBAC: receptionist/manager/admin |
| `PATCH /api/bookings/{id}/checkout` | ✅ | Includes bill summary in response |
| `PATCH /api/bookings/{id}/cancel` | ✅ | Only "Booked" bookings can be cancelled |

### Todo.md Accuracy

[`vinuji/todo.md`](../vinuji/todo.md):
- **Line 50:** Parent item `Booking Endpoints` is `- [ ]` (unticked) **but all 6 sub-items are `- [x]`**
- **Fix needed:** Tick line 50 to `- [x]`

> [!WARNING]
> **Duplicate Room Status Update:** Both `perform_checkin`/`perform_checkout` procedures AND the `trg_sync_room_status` trigger update `room.status`. This causes **double writes** (procedure sets it, trigger fires again on the booking UPDATE and tries to set it again). This is harmless but wasteful. The header comments in both files acknowledge this and say to pick one approach. Currently both are active.

---

## Issue 2 — Sheereen (Billing & Payments)

### DB Layer Audit

| File | Status | Notes |
|:-----|:-------|:------|
| [`fn_calculate_nights.sql`](../../../db/functions/fn_calculate_nights.sql) | ✅ Implemented | `GREATEST(check_out - check_in, 1)`, `IMMUTABLE`, clean |
| [`fn_calculate_tax.sql`](../../../db/functions/fn_calculate_tax.sql) | ✅ Implemented | `ROUND(amount * 0.10, 2)` with configurable rate param |
| [`fn_get_room_charges.sql`](../../../db/functions/fn_get_room_charges.sql) | ✅ Implemented | Uses `fn_calculate_nights`, raises if booking not found |
| [`fn_get_service_charges.sql`](../../../db/functions/fn_get_service_charges.sql) | ✅ Implemented | `COALESCE(SUM(...), 0.00)` — correct zero handling |
| [`fn_get_outstanding_balance.sql`](../../../db/functions/fn_get_outstanding_balance.sql) | ✅ Implemented | `GREATEST(total - paid, 0.00)`, raises if no bill exists |
| [`billing.sql`](../../../db/procedures/billing.sql) | ✅ Implemented | UPSERT with `ON CONFLICT (booking_id)`, locks row with `FOR UPDATE`, validates booking is Checked-In/Out |
| [`payments.sql`](../../../db/procedures/payments.sql) | ✅ Implemented | Validates amount > 0, blocks overpayment, recalculates from ledger |

### Schema Audit

| File | Status | Notes |
|:-----|:-------|:------|
| [`schemas/billing.py`](../../../backend/app/schemas/billing.py) | ✅ Complete | `BillOut`, `PaymentCreate` (with `amount > 0` + decimal precision validator), `PaymentOut`. Uses `Decimal` not `float` — **correctly matches NUMERIC(10,2)** |

### Router Audit

| Endpoint | Status | Notes |
|:---------|:-------|:------|
| `POST /api/billing/{id}/generate` | ✅ | Calls `generate_bill()`, supports optional discount param |
| `GET /api/billing/{id}` | ✅ | Returns 404 if no bill |
| `POST /api/payments` | ✅ | Calls `record_payment()`, returns 201 |
| `GET /api/payments/{booking_id}` | ✅ | Lists payment history, newest first, verifies booking exists |

### Todo.md Accuracy

[`sheereen/todo.md`](../sheereen/todo.md):
- ❌ **Everything is still `- [ ]` (unticked)** despite all code being fully implemented.
- **All items in Phase 1, 2, and 3 should be ticked `- [x]`.**

---

## Issue 3 — Chamika (Rooms, Guests & Services)

### DB Layer Audit

| File | Status | Notes |
|:-----|:-------|:------|
| [`fn_get_current_rate.sql`](../../../db/functions/fn_get_current_rate.sql) | ✅ Implemented | Uses `plpgsql` (not `sql` as in spec comment, but equivalent behavior). Raises exception if no rate found. |
| [`service_usage_trigger.sql`](../../../db/triggers/service_usage_trigger.sql) | ✅ Implemented | Validates Checked-In status, snapshots `base_price → unit_price`. Includes `DROP TRIGGER IF EXISTS` for idempotency. |

### Schema Audit

| File | Status | Notes |
|:-----|:-------|:------|
| [`schemas/guest.py`](../../../backend/app/schemas/guest.py) | ✅ Complete | `GuestBase`, `GuestCreate`, `GuestUpdate`, `GuestOut` with corporate validator |
| [`schemas/service.py`](../../../backend/app/schemas/service.py) | ⚠️ Exists but **NOT actually used** | The router [`services.py`](../../../backend/app/routers/services.py) defines its own inline Pydantic models instead of importing from this file. The `schemas/service.py` file has different field names (e.g. `name` vs `service_name`, `used_at` vs `usage_date`, has `total_price` vs `line_total`, has `notes` field not in DB). **This is dead code.** |

### Router Audit

| Endpoint | Status | Notes |
|:---------|:-------|:------|
| `GET /api/guests` | ✅ | Search by name/NIC/email via ILIKE |
| `GET /api/guests/{id}` | ✅ | Full profile + booking history |
| `POST /api/guests` | ✅ | 409 on duplicate NIC/email |
| `PUT /api/guests/{id}` | ✅ | Partial update |
| `GET /api/services` | ✅ | Returns grouped by category |
| `POST /api/services` | ✅ | Admin/manager only |
| `PATCH /api/services/{id}` | ✅ | Partial update |
| `GET /api/services/{booking_id}/usage` | ✅ | Returns summary with grand_total |
| `POST /api/services/{booking_id}/usage` | ✅ | Snapshots price, handles trigger error as 422 |

### Todo.md Accuracy

[`chamika/todo.md`](../chamika/todo.md):
- Phase 1 (DB): ✅ Already ticked
- Phase 2 (Schemas): ❌ All unticked — `guest.py` **is implemented** and should be ticked; `service.py` exists but is dead code (router uses inline models)
- Phase 3 (Routers): ❌ All unticked — both `guests.py` and `services.py` are **fully implemented** and should be ticked

---

## Issue 4 — Sadeepa (Views, Reports & Admin)

### DB Layer Audit

| View | Status | Notes |
|:-----|:-------|:------|
| `v_room_occupancy` | ✅ | LEFT JOIN on active bookings, includes room_type_id column |
| `v_guest_billing_summary` | ✅ | All billing fields with COALESCE for NULL bills |
| `v_service_usage_breakdown` | ✅ | Grouped by branch/room/guest/service |
| `v_monthly_revenue` | ✅ | Filtered to Checked-Out bookings only, grouped by year/month/branch |
| `v_top_services` | ✅ | Uses `RANK() OVER (ORDER BY SUM(quantity) DESC)` — ranks by **quantity** not revenue |

> [!NOTE]
> `v_top_services` ranks by total **quantity** (`SUM(su.quantity)`), but the spec in [`sadeepa/todo.md`](../sadeepa/todo.md) line 28 says `ORDER BY SUM(quantity * unit_price) DESC` (i.e. rank by **revenue**). The view name says "top services" which is ambiguous. The current implementation is reasonable — just a design choice difference from the spec.

### Seed Data Audit

[`sample_data.sql`](../../../db/seed/sample_data.sql):
- ✅ All 13 tables populated (branch, room_type, amenity, room_amenity, room_rate, room, guest, user_account, service, booking, service_usage, bill, payment)
- ✅ 7 bookings covering all 4 statuses
- ✅ 4 bills (2 fully paid, 1 partial, 1 unpaid)
- ✅ 4 payments with different methods
- ✅ 9 service usages across 3 branches
- ✅ Edge cases: Corporate guest, 1-night stay, multi-booking per guest, maintenance room

> [!WARNING]
> **Tax Rate Mismatch:** The seed data comments say **15% tax** (e.g., BK-02: 27000 × 15% = 4050), but [`fn_calculate_tax.sql`](../../../db/functions/fn_calculate_tax.sql) defaults to **10% tax**. The hardcoded seed values use 15%. When `generate_bill()` runs live, it will use 10%. This means **if you rebuild bills via the API, the totals will differ from the seed data**.
> 
> This is fine for a seed file (since it bypasses procedures), but important to be aware of.

### Router Audit

| Endpoint | Status | Notes |
|:---------|:-------|:------|
| `GET /api/reports/occupancy` | ✅ | Branch scoping for managers, supports date + date range |
| `GET /api/reports/billing-summary` | ✅ | `unpaid_only` flag, branch scoping |
| `GET /api/reports/service-usage` | ✅ | Branch scoping |
| `GET /api/reports/monthly-revenue` | ✅ | Required `year` param, optional `month` |
| `GET /api/reports/top-services` | ✅ | Limit param (default 10) |
| `GET /api/admin/branches` | ✅ | With aggregate stats (total_rooms, active_bookings) |
| `POST /api/admin/branches` | ✅ | 409 on duplicate name |
| `PUT /api/admin/branches/{id}` | ✅ | Partial update |
| `GET /api/admin/users` | ✅ | Joined with branch name + guest name |
| `POST /api/admin/users` | ✅ | Hashes password, validates role/branch/guest FKs |
| `PATCH /api/admin/users/{id}` | ✅ | Update role and/or branch |

### Todo.md Accuracy

[`sadeepa/todo.md`](../sadeepa/todo.md):
- Phase 1, 2, 3: ✅ Already ticked
- Admin router includes extra endpoints beyond spec: `PUT /api/admin/branches/{id}` and `PATCH /api/admin/users/{id}` — **good additions** not listed in original issue

---

## Spec File Discrepancies

### [`02_api_contract.md`](../../specs/02_api_contract.md) — Issues Found

| Section | Spec Says | Actual Implementation | Action |
|:--------|:----------|:---------------------|:-------|
| **§3 Guests — `GET /api/guests` response** | Returns `{ "guests": [...] }` wrapper | Returns a **flat list** `[...]` (no wrapper object) | **Update spec** to match implementation |
| **§3 Guests — `POST /api/guests` response** | Returns `{ "guest_id": "uuid" }` | Returns **full `GuestOut` object** with all fields | **Update spec** |
| **§4 Bookings — `GET /api/bookings` response** | Shows nested `guest` and `room` objects | ✅ Implementation matches spec (uses `GuestInfo`/`RoomInfo`) | OK |
| **§4 Bookings — `POST /api/bookings` response** | Returns `{ "booking_id", "rate_at_booking", "status" }` (3 fields) | Returns **full `BookingOut`** with all booking columns | **Update spec** |
| **§5 Check-In — roles** | `Receptionist, Manager` | Implementation allows `receptionist, manager, admin` | **Update spec** to add `admin` |
| **§5 Check-Out — roles** | `Receptionist, Manager` | Implementation allows `receptionist, manager, admin` | **Update spec** to add `admin` |
| **§6 Services — `GET /api/services` response** | Returns `{ "services": [...] }` flat list | Returns **grouped by category**: `[{ "category": "...", "services": [...] }]` | **Update spec** |
| **§6 Services — `POST .../usage` request** | Shows `{ "service_id", "quantity" }` | Expects `{ "service_id", "usage_date", "quantity" }` (`usage_date` is required) | **Update spec** |
| **§6 Services — `POST .../usage` error code** | `400` for not Checked-In | Returns `422 Unprocessable Entity` | **Update spec** |
| **§7 Billing — generate response** | Shows `booking_id` field in response | Returns `BillOut` which uses `bill_id` + `booking_id` (both as `str` not UUID) + `generated_at` timestamp | **Update spec** |
| **§7 Billing — procedure name** | `calculate_bill()` | Actual procedure is `generate_bill()` | **Update spec** |
| **§8 Payments — `POST /api/payments` response** | Returns `{ "payment_id", "remaining_balance" }` | Returns **full `PaymentOut`** (payment_id, booking_id, amount, payment_method, paid_at, notes). No `remaining_balance` field. | **Update spec** |
| **§10 Admin — `PATCH /api/admin/users/:id/role`** | Endpoint path includes `/role` | Actual endpoint is `PATCH /api/admin/users/{account_id}` (no `/role` suffix), accepts both role and branch_id | **Update spec** |
| **§10 Admin — `DELETE /api/admin/users/:id`** | Listed as available | **Not implemented** | **Either implement or remove from spec** |

---

## `todo.md` Corrections Needed

### Changes Required

```diff
# Vinuji todo.md — Line 50
-- [ ] **Booking Endpoints** (`backend/app/routers/bookings.py`)
+- [x] **Booking Endpoints** (`backend/app/routers/bookings.py`)

# Sheereen todo.md — Lines 12-52 (ALL Phase 1, 2, 3 items)
# Change every `- [ ]` to `- [x]` for Phase 1, 2, 3

# Chamika todo.md — Lines 26-52 (Phase 2 & 3)
# Change every `- [ ]` to `- [x]` for:
#   - Guest schemas (all 4 sub-items)
#   - Guest router (all 4 endpoints)
#   - Services router (all 5 endpoints)
# NOTE: Service schemas in todo line 32-36 are a grey area:
#   schemas/service.py exists but is NOT used by the router.
#   The router defines its own inline models. Could tick as "implemented"
#   since code exists, but flag it as dead code.
```

---

## Cross-Cutting Issues

### 1. Duplicate Room Status Updates
Both `perform_checkin`/`perform_checkout` procedures AND `trg_sync_room_status` trigger update `room.status`. This means every check-in/check-out causes **two** `UPDATE room SET status = ...` statements. Harmless but wasteful.

**Recommendation:** Remove the `UPDATE room` lines from `checkin_checkout.sql` and let the trigger handle it exclusively, OR disable the trigger. Pick one.

### 2. Dead Code: `schemas/service.py`
The file [`schemas/service.py`](../../../backend/app/schemas/service.py) exists but is **never imported** by any router. The services router defines all its Pydantic models inline. The schemas in this file also have field mismatches vs the actual DB schema (e.g. `name` vs `service_name`, `used_at` vs `usage_date`, `notes` field that doesn't exist on `service_usage` table).

**Recommendation:** Either delete the dead file or refactor `services.py` router to import from it (after fixing the field names).

### 3. Tax Rate Inconsistency
- `fn_calculate_tax` defaults to **10%** 
- Seed data bills are calculated with **15%** tax
- This is acceptable since seed data bypasses procedures, but will cause confusion if bills are regenerated

### 4. Missing `DELETE /api/admin/users/:id`
The spec lists this endpoint but it's not implemented. Decide whether to implement it or remove it from the spec.

### 5. `v_top_services` Ranking Metric
Spec says rank by **revenue** (`SUM(quantity * unit_price)`), implementation ranks by **quantity** (`SUM(quantity)`). Minor difference — both are valid metrics.

---

## Summary of Required Actions & Resolution Status

| Priority | Action | Status | Notes |
|:---------|:-------|:-------|:------|
| 🔴 High | Tick all Sheereen's Phase 1/2/3 todo items | ✅ Resolved | Verified and ticked in `sheereen/todo.md` |
| 🔴 High | Tick all Chamika's Phase 2/3 todo items | ✅ Resolved | Verified and ticked in `chamika/todo.md` |
| 🟡 Medium | Tick Vinuji's line 50 parent item | ✅ Resolved | Ticked in `vinuji/todo.md` |
| 🟡 Medium | Update `02_api_contract.md` to match actual implementations | ✅ Resolved | All 12 discrepancies updated in spec |
| 🟡 Medium | Clarify `DELETE /api/admin/users` from spec | ✅ Resolved | Documented in spec: omitted for FK audit integrity |
| 🟢 Low | Retain current room status updates (trigger + procedure) | ✅ Kept | Preserved per user preference |
| 🟢 Low | Clean up dead `schemas/service.py` file | ✅ Resolved | Harmonized schemas and imported in `routers/services.py` |
| 🟢 Low | Unify tax rate (10% vs 15%) across DB and docs | ✅ Resolved | Default set to 15% (SRS standard / REQ-6.1) |
