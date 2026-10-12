# 06 — Indexing Strategy

> Every index is justified by a specific query pattern from the procedures, triggers, views, or API endpoints.

---

## Index Table

| # | Index Name | Table | Column(s) | Type | Justifies |
|---|-----------|-------|-----------|------|-----------|
| 1 | `idx_booking_room_dates` | booking | `room_id, check_in_date, check_out_date` | B-tree | Double-booking check in `create_booking()` and `trg_prevent_double_booking` |
| 2 | `idx_booking_guest` | booking | `guest_id` | B-tree | Guest booking history, `v_guest_billing_summary` |
| 3 | `idx_booking_status` | booking | `status` | B-tree | Filtering active bookings in dashboard queries |
| 4 | `idx_room_branch` | room | `branch_id` | B-tree | Room listing by branch (`GET /api/rooms?branch_id=`) |
| 5 | `idx_room_type` | room | `room_type_id` | B-tree | Room filtering by type |
| 6 | `idx_room_branch_number` | room | `branch_id, room_number` | B-tree (UNIQUE) | Enforces unique room numbers per branch |
| 7 | `idx_service_usage_booking` | service_usage | `booking_id` | B-tree | `fn_get_service_charges()`, `v_service_usage_breakdown` |
| 8 | `idx_service_usage_service` | service_usage | `service_id` | B-tree | `v_top_services` aggregation |
| 9 | `idx_payment_booking` | payment | `booking_id` | B-tree | Payment listing per booking, `record_payment()` sum |
| 10 | `idx_bill_booking` | bill | `booking_id` | B-tree (UNIQUE) | `fn_get_outstanding_balance()`, 1:1 lookup |
| 11 | `idx_guest_nic` | guest | `nic_passport` | B-tree (UNIQUE) | Guest lookup by NIC/passport, duplicate prevention |
| 12 | `idx_user_email` | user_account | `email` | B-tree (UNIQUE) | Login authentication lookup |
| 13 | `idx_user_branch` | user_account | `branch_id` | B-tree | Staff listing per branch |
| 14 | `idx_room_rate_branch_type` | room_rate | `branch_id, room_type_id` | B-tree (UNIQUE) | `fn_get_current_rate()` lookup |
| 15 | `idx_booking_checkout_date` | booking | `check_out_date` | B-tree | `v_monthly_revenue` grouping by month |

---

## Notes

### Why not GIN or GiST?
- No full-text search columns in the current schema.
- Date-range overlap queries (`check_in < X AND check_out > Y`) work efficiently with composite B-tree on `(room_id, check_in_date, check_out_date)`.
- If we later add search on guest name or address, a GIN index with `pg_trgm` could be considered.

### Indexes created implicitly by constraints
These do NOT need explicit `CREATE INDEX`:
- All PRIMARY KEYs → automatic unique B-tree index
- `UNIQUE` constraints on `guest.nic_passport`, `user_account.email`, `bill.booking_id`, `room_rate(branch_id, room_type_id)` → automatic indexes

### Performance impact
- Write overhead is minimal — most tables have ≤ 2 additional indexes.
- The most write-heavy table (`service_usage`) has 2 indexes, justified by the frequent aggregation in billing and reports.

---

## Query-to-Index Mapping

| Query / Operation | Index Used |
|-------------------|-----------|
| `create_booking()` — overlap check | `idx_booking_room_dates` |
| `trg_prevent_double_booking` | `idx_booking_room_dates` |
| `fn_get_service_charges()` | `idx_service_usage_booking` |
| `fn_get_outstanding_balance()` | `idx_bill_booking` |
| `record_payment()` — sum payments | `idx_payment_booking` |
| `GET /api/rooms?branch_id=&status=` | `idx_room_branch` |
| `GET /api/bookings?guest_id=` | `idx_booking_guest` |
| `POST /api/auth/login` | `idx_user_email` |
| `v_room_occupancy` | `idx_booking_room_dates`, `idx_room_branch` |
| `v_guest_billing_summary` | `idx_booking_guest`, `idx_bill_booking` |
| `v_service_usage_breakdown` | `idx_service_usage_booking`, `idx_service_usage_service` |
| `v_monthly_revenue` | `idx_booking_checkout_date`, `idx_bill_booking` |
| `v_top_services` | `idx_service_usage_service` |
