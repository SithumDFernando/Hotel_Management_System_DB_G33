# SkyNest Work Summary

Summary of everything completed so far (26 Sep 2026 – 11 Oct 2026), compiled from the git history on `dev` (82 commits) and the per-member `todo.md` trackers.

Related: [Architecture](../architecture.md) | [2-Day Roadmap](./2_day_roadmap_to_submission.md) | [System Audit](./full_system_audit_db_backend_layer.md) | [Edge Case Testing Report](./edge_case_testing_report.md)

---

## 1. Timeline at a Glance

| Date | Milestone |
|------|-----------|
| 26 Sep | Repository initialised |
| 29 Sep | Documentation, database schema, backend core engine, seed data, setup scripts, CI and issue/PR templates |
| 1–3 Oct | Billing/service functions and triggers; reporting views (Phase 01) |
| 2–4 Oct | Guest router; admin and reporting API endpoints (Phases 02–03) |
| 4 Oct | Booking procedures and triggers (double-booking prevention, check-in/out, room status sync) |
| 5–6 Oct | Service catalogue router and schemas; booking API endpoints; billing functions and payment API; Phase 04 tests |
| 7 Oct | System audit (15% tax alignment, unified service schemas, API spec sync); business-logic edge case tests and coverage report |
| 11 Oct | Complete React frontend (design system, all role dashboards, public booking flow); Docker Compose stack and CI upgrade |

## 2. Task Tracker Status

Counted from the `todo.md` checkboxes (ticked / total):

| Member | Role | Done | Open |
|--------|------|------|------|
| Sithum | Team lead, core infrastructure, golden template | 45 / 49 | 4 |
| Vinuji | Reservations and front desk | 35 / 43 | 8 |
| Sheereen | Billing and payments | 26 / 34 | 8 |
| Chamika | Services and guest | 31 / 37 | 6 |
| Sadeepa | Reporting and admin | 22 / 30 | 8 |

Sithum's open items are the final System Verification group: run `db/run_all.sql` cleanly against local PostgreSQL, validate the OpenAPI contract at `/docs`, and verify the frontend auth flow and role guards.

## 3. Database (PostgreSQL)

- **Schema** (`db/schema/`): ENUM types, 13 core tables, FK / CHECK / composite UNIQUE constraints, B-tree indexes. `db/run_all.sql` is the single idempotent rebuild entry point.
- **Seed and setup**: comprehensive sample data covering all booking statuses, a room under maintenance, inactive services, corporate discounts, short and long stays, and fully paid, partially paid and split-payment bills. Includes a DB setup script and a CRUD probe.
- **Functions and triggers**
  - `fn_get_current_rate` (Chamika).
  - Service usage trigger function (Chamika).
  - Billing helper functions (Sheereen).
- **Procedures and triggers (Vinuji)**
  - Booking creation procedure.
  - Check-in and check-out procedures.
  - Double-booking prevention trigger, later extended to booking updates.
  - Room status synchronisation trigger.
- **Procedures (Sheereen)**: `generate_bill` and `record_payment`.
- **Views (Sadeepa)**
  - `room_occupancy`
  - `guest_billing_summary`
  - `service_usage_breakdown_v`
  - `monthly_revenue`
  - `top_services`

## 4. Backend (FastAPI)

- **Core engine** (Sithum): settings, asyncpg pool with transactional `get_db()` / `get_connection()`, bcrypt hashing and JWT, `get_current_user` and `require_role` RBAC dependencies, and the `rooms` router as the golden template. Explanatory comments were added to the lifespan and `require_role` code.
- **Admin** (Sadeepa): branches (list, create, update) and users (list, create, patch).
- **Reporting** (Sadeepa): billing summary report, service usage, monthly revenue, top services, occupancy.
- **Bookings** (Vinuji): Pydantic schemas and validation, plus list, create, detail, check-in, checkout and cancel endpoints.
- **Services and guest** (Chamika): services router, service schemas, guest router.
- **Billing** (Sheereen): billing functions, bill generation and payment recording API.
- **Auth hardening**: password hashing logic updated, and the register endpoint hardened during the frontend work.

## 5. Quality and Audit

- **Phase 04 tests** (Sadeepa): admin RBAC, 401/403 handling, JSON schema shape and view logic, with `httpx` added to the requirements.
- **System audit**: aligned the tax rate to 15%, unified service schemas, and synced the API specs.
- **Business-logic edge case tests**: double-booking rejection, room status syncing, negative payment blocking and similar. Results are in the [edge case report](./edge_case_testing_report.md).
- **CI and tooling**: GitHub Actions workflow, issue and PR templates, automated setup scripts for Windows, PowerShell and bash, and a VS Code and venv configuration.
- **Containerization** (11 Oct): `docker compose up --build` runs Postgres (auto-built schema and seed), pre-connected pgAdmin, the FastAPI backend and the nginx-served frontend with an `/api` proxy. Dependencies are pinned. See [SETUP.md](../../SETUP.md#run-with-docker-recommended).
- **CI upgrade** (11 Oct): `run_all.sql` now fails the build on any SQL error (`ON_ERROR_STOP`). All five backend test scripts run, including live API tests against a running server. Node moved to 20, and a new job builds the Docker images and smoke-tests the full compose stack.
- **Bugs found by the stricter checks**
  - Seed data was silently rolled back on every fresh build, because a trigger rejected the historical service usage rows and aborted the seed transaction.
  - `trg_service_usage` was missing the spec-required inactive-service check.
  - `test_business_logic.py` had false failures and never reported its failures to CI.
  - All three are fixed.

## 6. Frontend (React + Vite + Tailwind) — Sithum

Delivered on the `sithum-frontend` branch and merged to `dev` as PR #13.

| Area | Delivered |
|------|-----------|
| Foundation | Tailwind design system, auth context and plumbing, role-aware layout and routing |
| Auth | `Login` and guest `Register` pages |
| Public | `Home` page and `RoomsBrowse` with URL-synced availability search |
| Guest | `BookingCheckout` with live pricing and conflict alternates; `MyBookings`; `ServiceRequest` with service catalogue ordering and folio usage tracking |
| Receptionist | `ReceptionistDashboard` with check-in/out, billing and payment recording |
| Manager | `ManagerDashboard` with performance dashboard, revenue chart, reports, room management and catalogue management |
| Admin | `AdminDashboard` governance console for branches, users and bookings, with system-wide reports |
| Polish | Print-friendly folio, modal focus trap, per-page titles, docs synced; UI mockups added under `frontend_ui/` |

## 7. Documentation

- Architecture, team assignment and learning guides.
- Work folders reorganised per member, each with an assignment guide and `todo.md`.
- README with setup guide, git workflow and member assignments.
- `AGENTS.md` rules: automatic ticking of `todo.md` only after verification against `docs/specs/`.
- Progress docs: 2-day roadmap, system audit and edge case report.

## 8. Remaining Work

1. Finish the open `todo.md` items for each member (see section 2).
2. Run the end-to-end System Verification: clean `run_all.sql` rebuild, OpenAPI contract check at `/docs`, and frontend auth and role guard check.
3. Re-check frontend pages against `docs/specs/09_frontend_pages.md` and the API calls against `docs/specs/02_api_contract.md`.
4. Follow the [2-day roadmap](./2_day_roadmap_to_submission.md) to submission.
