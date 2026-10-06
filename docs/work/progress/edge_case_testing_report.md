# Edge Case Testing & Coverage Report

## 1. Evaluation of Current Coverage

### ✅ Seed Data (`db/seed/sample_data.sql`)
The seed data is **excellent** and currently covers almost all required edge cases for the system, including:
- **Statuses**: `Booked`, `Checked-In`, `Checked-Out`, and `Cancelled` bookings.
- **Variations**: Corporate discounts, 1-night minimum stays, 7-night long stays.
- **Edge Scenarios**: A room in `Maintenance` status, multiple bookings by the same guest, inactive services (e.g., "City Tour").
- **Financials**: Fully paid bills, partially paid bills with outstanding balances, split payments across different methods (Cash, Credit Card, Bank Transfer).

### ❌ Test Files (`backend/tests/` & `db/tests/`)
Prior to this audit, the test files were **missing critical edge cases**:
- `test_crud.sql` and `test_db_crud.py` only checked basic connection and generic INSERT/UPDATE permissions (smoke testing).
- `test_phase4.py` and `test_phase4_api_mock.py` effectively covered Sadeepa's Phase 4 deliverables (Admin RBAC, 401/403 errors, JSON schema structure, and Views logic).
- **Missing**: There were no tests actively verifying Phase 1-3 business logic (e.g., rejecting double bookings, syncing room statuses, or blocking negative payments).

---

## 2. Actions Taken to Cover Edge Cases

To bridge the gap in testing, I created a new integration test suite: `backend/tests/test_business_logic.py`. 

This new script connects directly to the database and deliberately attempts edge cases to verify the constraints and triggers hold up:
1. **Double Booking Prevention**: Attempts to insert a new booking that overlaps with an existing reservation to verify that `trg_prevent_double_booking` blocks it.
2. **Room Status Sync**: Changes a booking to `Checked-In` and asserts that the `room.status` automatically updates to `Occupied` via `trg_update_room_status`.
3. **Service Restrictions**: Attempts to add an inactive service to a booking to verify `trg_validate_service_usage` blocks it.
4. **Billing Constraints**: Simulates a negative payment and an overpayment to verify the PostgreSQL `CHECK` constraints (`chk_bill_amount_paid`, `chk_bill_outstanding`) block illegal mathematical states.

---

## 3. Test Execution Results

I ran the entire test suite against the backend. Here are the results:

### **Mock API Tests (`test_phase4_api_mock.py`)** — <span style="color:green">**PASSED (21/21)**</span>
- Unauthenticated Rejection (401)
- RBAC Protection (Guest attempting Admin access -> 403)
- Report Endpoints Structure
- Admin CRUD Endpoints

### **Live DB Tests (`test_phase4.py` & `test_business_logic.py`)** — <span style="color:orange">**BLOCKED**</span>
- **Error**: `password authentication failed for user "skynest_user"`
- **Reason**: The Python tests cannot authenticate with your local PostgreSQL instance because the password inside your database differs from the `.env`, or the `skynest_user` hasn't been created on this machine. Furthermore, the `psql` command is not currently recognized in your Windows PATH.

---

## 4. Next Steps for You

Since `psql` is not recognized on your system environment variables, you won't be able to run the DB setup directly from the terminal without specifying the path.

**To run the live integration tests successfully:**
1. Open **pgAdmin** or your preferred SQL client.
2. Run the contents of `db/setup_db.sql` as a superuser to ensure `skynest_user` is created with the password `skynest_dev_pass`.
3. Re-run `db/run_all.sql` as `skynest_user` to build the latest schema, functions, triggers, and seed data.
4. From your terminal, run the tests again:
   ```bash
   cd backend
   .venv\Scripts\python tests\test_business_logic.py
   .venv\Scripts\python tests\test_phase4.py
   ```
