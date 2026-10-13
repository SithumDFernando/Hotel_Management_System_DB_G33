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
  - ✅ Browser-checked in task 15 (headless Edge, 2026-10-12): room search with dates, manager Branch Overview and the Admin Bookings date filter load with no JS errors or failed API calls.
- [x] **2. [ISSUE-02](ISSUE-02-status-filter-returns-500.md)** 🔴 Status filter returns 500 (Receptionist dashboard)
  - ✅ Browser-checked in task 15 (headless Edge, 2026-10-12): Receptionist dashboard (all four tabs) and Admin Bookings tab.
- [x] **3. Regression tests for 1–2** in `backend/tests/`. Set up the pytest config from [ISSUE-13 §13.9](ISSUE-13-low-priority-hardening.md#139-test-suite-doesnt-run-under-pytest) here, so every later fix lands with tests in one place.
  - ✅ `backend/pytest.ini` + `requirements-dev.txt` + `tests/conftest.py`; `pytest -q` runs every suite (28 tests). 20 of the 23 new tests fail on the pre-fix code. CI now runs pytest.

## Phase 2: Input handling foundation

- [x] **4. [ISSUE-07](ISSUE-07-unhandled-500-on-bad-input.md)** 🟠 Typed UUID/date params, schema limits, global asyncpg exception handler, remove leaked DB errors
  - ✅ Covered by `tests/test_input_validation.py` (45 tests; 33 of the DB-backed ones fail on the pre-fix code). Verified on a fresh `run_all.sql` build.
  - ↪ `payment_option` / `payment_method` are length-limited only; the `Literal` vocabulary is left to ISSUE-08 (task 12), which owns the payment vocabulary. ✅ Done in task 12.

## Phase 3: Access control

- [x] **5. [ISSUE-03](ISSUE-03-cross-branch-authorization.md)** 🔴 Branch-scoped authorization helper applied to every staff endpoint
  - ✅ `assert_booking_access` / `assert_room_access` on every booking/room endpoint; covered by `tests/test_authz_branch.py` (22 tests, 13 fail on the pre-fix code). Full suite: 94 passed + `test_phase4` live run passed, on a fresh `run_all.sql` build.
  - ✅ Decisions: guest directory stays hotel-wide; `top-services` is now branch-scoped for managers (new view `v_top_services_by_branch`).
  - ✅ Browser-checked in task 15 (headless Edge, 2026-10-12): top-services panels load for manager (branch-scoped) and admin. ⚠ The panel subtitle says "By revenue" but the view ranks by quantity (see the task 15 report).
- [x] **6. [ISSUE-06](ISSUE-06-manager-without-branch-sees-all.md)** 🔴 Branch staff must have a branch (API validation + DB CHECK + fail-closed helper)
  - ✅ `require_branch` + `assert_role_links` in `dependencies.py`, `chk_user_account_role_links` CHECK, `user_account` FKs → `RESTRICT`, admins can't demote themselves (409). Covered by `tests/test_role_links.py` (35 tests, 32 fail on the pre-fix code/schema). Full suite: 129 passed + `test_phase4` live run passed, on a fresh `run_all.sql` build.
  - ✅ Browser-checked in task 15 (headless Edge, 2026-10-12): the create drawer's empty branch option is disabled; submitting without a branch shows "Select a branch" and sends no request; Branch is hidden for admin and shown in the edit drawer. (The `Select` component doesn't pass `required` to `<select>`; the form's own JS validation covers it.)
- [x] **7. [ISSUE-11](ISSUE-11-guest-account-without-profile.md)** 🟠 Guest accounts must have exactly one guest profile
  - ✅ `UNIQUE (guest_id)` + `assert_guest_profile_free` (409), `require_guest_id` fail-closed helper at every guest call site, My Bookings no-profile empty state. Covered by `tests/test_guest_links.py` (19 tests, 11 fail on the pre-fix code/schema). Full suite: 148 passed + `test_phase4` live run passed, on a fresh `run_all.sql` build.
  - ✅ Browser-checked in task 15 (headless Edge, 2026-10-12): a normal guest's My Bookings lists their bookings.

## Phase 4: Money and data integrity (DB procedures/triggers)

- [x] **8. [ISSUE-04](ISSUE-04-checkout-uses-stale-bill.md)** 🔴 Recalculate the bill inside `perform_checkout`
  - ✅ `perform_checkout` locks the booking and calls `generate_bill(id, NULL)` before the balance check. A missing bill is created, the discount is kept, and the 402 also covers "no bill yet". The checkout response's `bill` now has `outstanding_balance` / `balance_flag`. Covered by `tests/test_checkout_billing.py` (7 tests, 6 fail on the pre-fix code). Full suite: 155 passed + `test_phase4` live run passed, on a fresh `run_all.sql` build.
  - ✅ `api` test fixture now runs each request in a savepoint, so a test can continue after a failed request.
  - ✅ Browser-checked in task 15 (headless Edge, 2026-10-12): paid in full, added a service, then clicked Check out → 402 toast and the bill window opened with the new 2,875.00 balance.
- [x] **9. [ISSUE-05](ISSUE-05-double-booking-race-condition.md)** 🔴 Exclusion constraint + room lock against double booking
  - ✅ `excl_booking_room_overlap` (GiST, `btree_gist`, `'[)'`, active statuses only) + `FOR UPDATE` on the room row in `trg_check_double_booking`. The 409 mapping already existed (ISSUE-07 handler). Covered by `tests/test_double_booking.py` (9 tests incl. two-session and 10-request burst; 3 fail on the pre-fix code/schema; 5 repeat runs with no flakes). Full suite: 164 passed + `test_phase4` live run passed, on a fresh `run_all.sql` build.
- [x] **10. [ISSUE-12](ISSUE-12-concurrency-in-status-transitions.md)** 🟠 `FOR UPDATE` in check-in/checkout, `cancel_booking` procedure, `record_payment` returns its ID
  - ✅ `perform_checkin` locks the booking. New `cancel_booking` procedure (router no longer does SELECT-then-UPDATE). `record_payment` has `OUT p_payment_id` and the API returns that payment. CALL + read-back wrapped in transactions. Unused cancel `reason` removed (decision in the issue file). Covered by `tests/test_status_concurrency.py` (6 tests; the 2 deterministic held-transaction tests fail on every pre-fix run) on new shared `pool` / `pool_api` fixtures. 20/20 repeated runs green. Full suite: 170 passed + `test_phase4` live run passed, on a fresh `run_all.sql` build.
  - ✅ Browser-checked in task 15 (headless Edge, 2026-10-12): cancel from the Receptionist dashboard and from My Bookings both set the booking to Cancelled.
- [x] **11. [ISSUE-09](ISSUE-09-room-status-trigger-overrides-maintenance.md)** 🟠 Trigger is the single owner of room status; never overrides Maintenance
  - ✅ `trg_sync_room_status` has guarded updates (only `Available → Occupied` on check-in, only `Occupied → Available` when a checked-in guest leaves; `Booked → Cancelled` leaves the room alone). Procedures no longer touch `room`. `PATCH /rooms/{id}/status` returns 409 for `Available`/`Occupied` that contradict the bookings; RoomManager falls back to `Occupied` when clearing mid-stay Maintenance. Covered by `tests/test_room_status.py` (11 tests, 6 fail on the pre-fix code). Full suite: 181 passed + `test_phase4` live run passed, on a fresh `run_all.sql` build.
  - ✅ Browser-checked in task 15 (headless Edge, 2026-10-12): empty room Set maintenance → Mark available round-trips; the occupied room's toggle is disabled ("A guest is checked in").
- [x] **12. [ISSUE-08](ISSUE-08-missing-booking-business-rules.md)** 🟠 Booking, check-in and service-usage business rules + payment vocabulary
  - ✅ Rules a–g enforced in the DB (`create_booking`, `perform_checkin`, `trg_validate_service_usage`, CHECKs `chk_booking_payment_option` / `chk_payment_method`) plus the `PaymentMethod` Literal. Shared `app/db_errors.raise_error_to_http` maps messages → 400/404/409/422. Decisions: 30-night cap, no advance cap, no early check-in, usage allowed up to today for overdue guests. Covered by `tests/test_booking_rules.py` (17 tests; all 10 negative ones fail on the pre-fix code). Seed-date-dependent check-in tests now use `arrive_today()`. Full suite: 198 passed + `test_phase4` live run passed, on a fresh `run_all.sql` build.
  - ✅ Browser-checked in task 15 (headless Edge, 2026-10-12): 31-night stay shows the front-desk message; Check in is enabled for today's arrival and disabled for upcoming ("Arrives on …") and ended ("The stay period has ended") bookings.

## Phase 5: Authentication hardening

- [x] **13. [ISSUE-10](ISSUE-10-login-and-password-weaknesses.md)** 🟠 Timing-safe login, rate limiting, case-insensitive email, password policy
  - ✅ Dummy-hash login, failed-login limiter (10 per IP + email in 5 minutes → 429) and signup limiter (10 per IP per hour), `NormEmail` + unique `LOWER(email)` index, `NewPassword` policy (8 characters to 72 bytes) on signup/register/admin create, and longer login input rejected. Covered by `tests/test_auth_hardening.py` (27 tests, 20 fail on the pre-fix code). Full suite: 225 passed + `test_phase4` live run passed, on a fresh `run_all.sql` build.
  - ✅ Browser-checked in task 15 (headless Edge, 2026-10-12): a 74-byte password is refused on Register ("Use at most 72 characters"; the wording says characters although the check counts bytes); the 11th login shows "Too many attempts. Try again later."

## Phase 6: Hardening and housekeeping

- [ ] **14. [ISSUE-13](ISSUE-13-low-priority-hardening.md)** 🟡 Remaining items 13.1–13.8, 13.10, 13.11 (see its own checklist)
  - ⏸ Deferred on 2026-10-12: checked against the brief and SRS (all compatible); close-out (15–17) was run first without it.

## Phase 7: Close-out

- [x] **15.** Full regression: rebuild the DB from `run_all.sql`, run all backend tests, `npm run build`, then a manual click-through of every page in `docs/specs/09_frontend_pages.md` for each role (guest, receptionist, manager, admin).
  - ✅ Fresh `run_all.sql` build, 225 passed + `test_phase4` live run passed, `npm run build` OK. Headless Edge (playwright-core) against current code: 34 page visits across public/guest/receptionist/manager/admin with no JS errors, console errors or failed API calls, plus 22 scripted checks covering every ⏳ item above.
  - ⚠ Found: occupancy report drops rooms whose active booking doesn't cover the date (12 rooms → 10 today, 9 on 1 Dec), and the manager panel shows "0 / 3" for a 4-room branch with an overdue in-house guest; top-services panel says "By revenue" but ranks by quantity; the frontend uses `navy`/`gold` tokens instead of the `11_design_system.md` palette; the seed has 7 bookings, 9 usage rows and 2 partial payments (on one booking) against the brief's 8 bookings / 3 partial payments and spec 07's counts. The dev DB (`skynest`) is stale; it lacks the ISSUE-08/10 constraints.
- [x] **16.** Re-run the audit's attack scenarios (cross-branch actions, concurrent bookings, malformed input) and confirm **zero 500s** and **zero unauthorized 2xx**.
  - ✅ 366 requests on a fresh build: every action in the ISSUE-03 audit table, the Kandy manager's reports with a Colombo `branch_id`, guest-to-guest access, role escalation (signup with `role: admin` stays guest), forged tokens (`alg: none`, compose default key, garbage, expired), concurrency bursts (20 bookings → 1×201; 10 check-ins/checkouts/cancels → 1×200; 10 payments of total/4 → 4 succeed, never overpaid), and ~250 malformed inputs (bad UUIDs, impossible dates, overflow, NUL bytes, SQL-injection strings, invalid JSON). **0 × 5xx, 0 unauthorized 2xx.**
- [x] **17.** Sync docs: `02_api_contract.md` (new 400/403/409/422/429 responses), `03_stored_procedures_functions.md`, `04_triggers.md`, `08_auth_and_roles.md`, and the members' `todo.md` files.
  - ✅ 02: `/guests` write roles (managers 403), admin on `POST /bookings`, `GET /services` needs sign-in, READ COMMITTED + lock/exclusion instead of the false SERIALIZABLE claim, pagination scope, `monthly-revenue` params. 03: real names/signatures (`perform_checkin`, `perform_checkout`, `generate_bill`, OUT params), discount/paid logic, missing errors, 15% vs SRS 16% noted. 04: real trigger names (`trg_double_booking`, `trg_room_status`, `trg_service_usage`), actual messages, conditional price snapshot, payment trigger marked not implemented. 07: seed build order. 08: `SECRET_KEY`, expiry, full access matrix (signup/register/me/branches/services/admin), guest-write decision, ProtectedRoute behaviour. All open verification items in the five `todo.md` files were verified and ticked.
  - ⚠ Not changed (needs a decision): spec 07's seed counts disagree with the seed itself (see task 15).

## Phase 8: Teammate click-through reports

- [x] **18. [ISSUE-14](ISSUE-14-frontend-bug-reports.md)** 🔴 Rooms browse without dates, manager billing summary crash, logout confirmation, profile page
  - ✅ 14.1 catalogue no longer filters on tonight's `room.status`. 14.2 `ReportTable` key-less column crash fixed, page-level error boundary keeps the navbar, `?report=` in the URL, View bill opens in place. 14.3 sign-out confirm dialog + toast. 14.4 `GET/PATCH /auth/profile`, `POST /auth/change-password`, `/profile` page. Specs 02, 08 and 09 updated.
  - ✅ Fresh `run_all.sql` build (scratch DB): 239 passed incl. `tests/test_profile.py` (14). `npm run build` OK. Headless Edge: 27 scripted checks (4 roles, desktop + 375px) pass with no JS errors, console errors or 5xx.
  - ⚠ The shared dev DB `skynest` in Docker is stale (pre-ISSUE-08/09 procedures); rebuild it from `run_all.sql`, or 29 tests fail and the running backend behaves like the old code.
- [x] **19. [ISSUE-15](ISSUE-15-stale-dev-database-cancel-500.md)** 🔴 Cancel booking returns 500 on the Docker dev DB: the volume predates ISSUE-12 (`cancel_booking` missing). Rebuild, plus a startup schema check, `/api/health` 503 and a 503 (not 500) for missing routines
  - ✅ Old volume wiped and rebuilt (6 procedures and the 4 constraints present). New `app/schema_check.py` checks procedures, functions, views, triggers, named constraints and the email index at startup: one loud log block, `GET /api/health` 200/503, and a 503 guard on every other `/api/*` (decision recorded in the issue). Undefined function/table/object errors map to 503, not 500, with no SQL in the body. Checked against the real stale volume before the wipe (it reported `cancel_booking`, 2 CHECKs and `uq_user_account_email_ci`). Covered by `tests/test_schema_check.py` (14 tests, incl. a static guard that every `CALL` and `v_*` in `app/` is listed). Full suite: 253 passed on a fresh `run_all.sql` build + `test_phase4` live run passed. README, spec 02 (§0 Health, 503 row) and spec 10 §2.4 updated. Cancel browser-checked from My Bookings and the Receptionist dashboard.
- [x] **21. [ISSUE-16](ISSUE-16-receptionist-ux-gaps.md)** 🟠 Receptionist UX gaps: new booking showed every branch and hid booked rooms, no room stats, no guest lookup/edit, no service list
  - ✅ 16.1 branch staff locked to their branch in `RoomsBrowse`, booked rooms listed with booking disabled. 16.2 Rooms tab (counts by type and status, room list with in-house guest). 16.3 Guests tab (search, profile + history, edit); `GET /guests/:id` history gains `branch_name`. 16.4 read-only service list on a Services tab and in My bookings. Navbar: Today, Rooms, Guests, New booking. Specs 02 and 09 updated.
  - ✅ `npm run build` OK. Headless Chrome against the Docker stack, desktop + 375px: all four receptionist tabs, profile → edit → "Saved" toast, booking mode (Colombo only, "1 room free, 2 booked", 2 disabled cards), guest `/rooms` unchanged (all branches), guest My bookings services list. No console or page errors. `GET /guests/:id` returns `branch_name` (checked with curl).
  - ⚠ Backend pytest not re-run: a local Postgres also listens on :5432 and rejects the test login, so the suite can't reach the Docker DB from the host. Re-run `pytest` once that is sorted (the change is one extra column plus an optional schema field).

## Phase 9: Manual testing

- [ ] **20.** Demo data dated from the build day (now part 2 of `db/seed/sample_data.sql`, loaded by `run_all.sql`) plus the click-by-click guide [docs/work/manual_testing/MANUAL_TESTING_GUIDE.md](../manual_testing/MANUAL_TESTING_GUIDE.md), grouped by login
  - ✅ Scratch build `skynest_demo`: clean under `ON_ERROR_STOP`, row counts per branch/status match the matrix, room states correct, only BK-05 is Checked-Out with a balance. Backend suite **253 passed** on that build. Report figures in the guide (overview tiles, balances, top services, room counts) were read from the API on that build.
  - ⏳ Not yet done: headless-browser pass over the guide's expected values (Docker Desktop stopped mid-run), dev DB rebuild and the live `test_phase4` run.
  - ⚠ Found while writing the guide (logged as KI-13 to KI-15): the overview occupancy tile undercounts (Colombo "1 of 7" with 5 of 11 rooms occupied); an overdue guest's room is offered as free; the seven fixed-seed bookings share the reference `SN-30000000`.

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
