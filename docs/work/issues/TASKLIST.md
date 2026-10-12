# SkyNest — Issue Fix Tasklist

Source: full-stack audit run on **2026-10-12** (backend API probes, DB-level concurrency tests, frontend build). Each task links to an issue file in this folder with the root cause, implementation plan, tests and acceptance criteria.

## How to use this list

- Work **top to bottom**. The order handles dependencies between issues, not just severity (see "Why this order" below).
- Tick a task only when its issue file's **acceptance criteria** are met and its tests pass (same rule as `AGENTS.md`: no speculative ticking).
- After any DB change, rebuild with `db/run_all.sql` on a fresh database, then run the full test suite.
- Update `docs/specs/` in the same PR as the code (the specs are the source of truth).

## Severity legend

🔴 Critical/High · 🟠 Medium · 🟡 Low

---

## Phase 1: Unbreak the app (small, isolated, user-visible)

- [x] **1. [ISSUE-01](ISSUE-01-date-filters-return-500.md)** 🔴 Date filters return 500 (room search, occupancy, admin bookings)
  - ⏳ API fixed and covered by `test_regressions.py`; browser check of the affected screens still pending.
- [x] **2. [ISSUE-02](ISSUE-02-status-filter-returns-500.md)** 🔴 Status filter returns 500 (Receptionist dashboard)
  - ⏳ API fixed and covered by `test_regressions.py`; browser check of the Receptionist dashboard and admin Bookings tab still pending.
- [x] **3. Regression tests for 1–2** in `backend/tests/`. Set up the pytest config from [ISSUE-13 §13.9](ISSUE-13-low-priority-hardening.md#139-test-suite-doesnt-run-under-pytest) here, so every later fix lands with tests in one place.
  - ✅ `backend/pytest.ini` + `requirements-dev.txt` + `tests/conftest.py`; `pytest -q` runs every suite (28 tests). 20 of the 23 new tests fail on the pre-fix code. CI now runs pytest.

## Phase 2: Input handling foundation

- [ ] **4. [ISSUE-07](ISSUE-07-unhandled-500-on-bad-input.md)** 🟠 Typed UUID/date params, schema limits, global asyncpg exception handler, remove leaked DB errors

## Phase 3: Access control

- [ ] **5. [ISSUE-03](ISSUE-03-cross-branch-authorization.md)** 🔴 Branch-scoped authorization helper applied to every staff endpoint
- [ ] **6. [ISSUE-06](ISSUE-06-manager-without-branch-sees-all.md)** 🔴 Branch staff must have a branch (API validation + DB CHECK + fail-closed helper)
- [ ] **7. [ISSUE-11](ISSUE-11-guest-account-without-profile.md)** 🟠 Guest accounts must have exactly one guest profile

## Phase 4: Money and data integrity (DB procedures/triggers)

- [ ] **8. [ISSUE-04](ISSUE-04-checkout-uses-stale-bill.md)** 🔴 Recalculate the bill inside `perform_checkout`
- [ ] **9. [ISSUE-05](ISSUE-05-double-booking-race-condition.md)** 🔴 Exclusion constraint + room lock against double booking
- [ ] **10. [ISSUE-12](ISSUE-12-concurrency-in-status-transitions.md)** 🟠 `FOR UPDATE` in check-in/checkout, `cancel_booking` procedure, `record_payment` returns its ID
- [ ] **11. [ISSUE-09](ISSUE-09-room-status-trigger-overrides-maintenance.md)** 🟠 Trigger is the single owner of room status; never overrides Maintenance
- [ ] **12. [ISSUE-08](ISSUE-08-missing-booking-business-rules.md)** 🟠 Booking, check-in and service-usage business rules + payment vocabulary

## Phase 5: Authentication hardening

- [ ] **13. [ISSUE-10](ISSUE-10-login-and-password-weaknesses.md)** 🟠 Timing-safe login, rate limiting, case-insensitive email, password policy

## Phase 6: Hardening and housekeeping

- [ ] **14. [ISSUE-13](ISSUE-13-low-priority-hardening.md)** 🟡 Remaining items 13.1–13.8, 13.10, 13.11 (see its own checklist)

## Phase 7: Close-out

- [ ] **15.** Full regression: rebuild the DB from `run_all.sql`, run all backend tests, `npm run build`, then a manual click-through of every page in `docs/specs/09_frontend_pages.md` for each role (guest, receptionist, manager, admin).
- [ ] **16.** Re-run the audit's attack scenarios (cross-branch actions, concurrent bookings, malformed input) and confirm **zero 500s** and **zero unauthorized 2xx**.
- [ ] **17.** Sync docs: `02_api_contract.md` (new 400/403/409/422/429 responses), `03_stored_procedures_functions.md`, `04_triggers.md`, `08_auth_and_roles.md`, and the members' `todo.md` files.

---

## Why this order

1. **ISSUE-01/02 first:** they break screens people use today, and each is a few lines. Shipping them immediately also makes manual testing of everything after possible (room search, receptionist dashboard).
2. **ISSUE-07 before the authorization work:** it changes the signatures of almost every endpoint (`str` → `UUID`) and adds the global DB-error handler. Doing it first means ISSUE-03/06/11 are written against the final signatures, avoiding merge conflicts in the same functions, and their new error paths can rely on the handler.
3. **ISSUE-03 → 06 → 11 together:** they share the helpers in `dependencies.py` (`assert_booking_access`, `require_branch`, `require_guest_id`) and the `chk_user_account_role_links` constraint, so they're best built in one sequence.
4. **ISSUE-04, 05, 12, 09, 08 in that order:** they all rewrite the same procedures (`perform_checkin`, `perform_checkout`, `create_booking`) and the triggers.
   - 04 is the most urgent (revenue loss) and the smallest.
   - 05 adds the constraint that 08's error mapping relies on.
   - 12 adds the row locks that 08's rewritten `perform_checkin` already includes.
   - 09 removes the room updates from the procedures before 08 adds more checks to them.
   - 08 last, because it's the largest and touches the frontend too.
5. **ISSUE-10 after the data fixes:** it's important, but on a local or university deployment it's less exposed than broken authorization or money handling, and it adds a DB index change best made when the schema is otherwise stable.
6. **ISSUE-13 last:** independent low-risk items that can be picked up in parallel by anyone at any point after Phase 1.

## Suggested owners (from `docs/work/*/`)

Leave blank until agreed in the team channel.

| Task  | Owner |
| ----- | ----- |
| 1–3   |       |
| 4     |       |
| 5–7   |       |
| 8–12  |       |
| 13    |       |
| 14    |       |
| 15–17 |       |
