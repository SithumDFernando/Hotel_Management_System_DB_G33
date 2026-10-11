# SkyNest — 2-Day Roadmap to Submission

## Context
Team lead (Sithum) asked for advice on the remaining stages: test backend + DB, build the frontend, E2E testing, deployment/DevOps. **Deadline: 2 days.** AI agents are available to every member.

### Where the system actually stands (dev @ a286a73)
| Layer | State |
|---|---|
| DB (`db/`) | Done. 13 tables, 6 functions, 4 procedures, 3 triggers, 5 views, seed data; `run_all.sql` is the entry point. Audit (`docs/work/progress/full_system_audit_db_backend_layer.md`) says all verified. |
| Backend (`backend/app/`) | Done. 8 routers, ~34 endpoints, JWT + `require_role` RBAC. |
| Tests | Script-style (not pytest). `test_phase4_api_mock.py` passes 21/21; live-DB suites (`test_business_logic.py`, `test_phase4.py`) **have never run** — blocked by local Postgres password / `psql` not on PATH. CI only runs `test_db_crud.py`. |
| Frontend (`frontend/src/`) | **0% implemented.** Every .jsx/.js file is a header comment + `// TODO: Implement`. Good news: each stub's header is a precise spec, so it's ideal for AI agents. |
| DevOps | CI exists (`.github/workflows/ci.yml`). No Dockerfiles / compose. Deployment guide is local-only and uses a different DB password (`skynest_pass`) than `.env.example`/CI (`skynest_dev_pass`). |
| Every member's `todo.md` | Only Phase 4 "Testing & Verification" items remain open. |

### Gaps found that will bite during frontend work
1. **`GET /api/admin/branches` is admin-only** (`backend/app/routers/admin.py:97`), but spec 09 has public `Home` and `RoomsBrowse` call it for branch cards/dropdowns → add a public `GET /api/branches` (read-only, minimal fields) and update `docs/specs/02_api_contract.md`.
2. Duplicate `room.status` writes (procedures + `trg_sync_room_status`) — harmless; leave it, mention it in the report as a known design choice. Don't refactor 2 days out.

**Frontend is the critical path.** Everything else is ≤ half a day each.

---

## Recommended plan

### Day 1 morning (0–3h) — unblock everyone
**Sithum (lead) + agent — frontend foundation, merged to `dev` before anyone builds pages:**
- `api/client.js` (axios, token interceptor, 401 → logout), `context/AuthContext.jsx`, `hooks/useAuth.js`, `hooks/useFetch.js`, `routes/ProtectedRoute.jsx`, `components/Layout.jsx`, `components/Navbar.jsx`, `App.jsx`, `main.jsx`, `utils/formatters.js` (LKR currency, dates), `styles/index.css` (design tokens: colors, spacing, card/button/table/badge classes so pages look consistent).
- Decide styling now: **plain CSS with shared tokens** (no Tailwind setup cost; deps already minimal).
- Add the public `GET /api/branches` endpoint.

**Docker Compose (in parallel — Sheereen or Sadeepa + agent, ~2h)** — do it first, not last, because it fixes the blocked live-DB tests for everyone:
- `backend/Dockerfile` (python:3.11-slim, uvicorn), `frontend/Dockerfile` (node build → nginx serving `dist/`, `/api` proxied to backend, SPA fallback `try_files ... /index.html`).
- `docker-compose.yml` at root: `db` (postgres:15, mount `./db` and run `run_all.sql` via `/docker-entrypoint-initdb.d` wrapper script that `cd`s into `/db` since run_all uses relative `\i`), `backend` (depends_on db healthy), `frontend`.
- Standardize password to `skynest_dev_pass` everywhere; fix `docs/specs/10_deployment_guide.md`.

### Day 1 (3h → end) — pages in parallel, by domain ownership
Each member uses an agent on their pages, building on the foundation; one PR per member into `dev`.
| Member | Pages / components | Backend they already know |
|---|---|---|
| Vinuji | `RoomsBrowse`, `BookingCheckout`, `RoomCard`, `BookingSummary`, `api/rooms.js`, `api/bookings.js` | bookings, rooms |
| Sheereen | `ReceptionistDashboard` (today's bookings, check-in/out, record payment), `BillTable`, `api/billing.js` | billing, payments |
| Chamika | `ServiceRequest`, `api/services.js`, guest search/create used on receptionist + booking flow | guests, services |
| Sadeepa | `ManagerDashboard`, `AdminDashboard`, `ReportTable`, `api/reports.js` | reports, admin |
| Sithum | `Home`, `Login`, `api/auth.js`, integration/merge review | auth |

Rule for agents: the stub's header comment + `docs/specs/09_frontend_pages.md` + `02_api_contract.md` are the spec; call real endpoints (check response shapes in `/docs`, not guesses).

**Same day, each member closes their `todo.md` Phase 4 items** — now runnable because Docker gives a working DB: `docker compose up db`, then run `test_business_logic.py` / `test_phase4.py` and the psql checks. Tick only after they actually pass (AGENTS.md rule).

### Day 2 morning — testing hardening + E2E
- **Backend/DB tests in CI:** add `test_business_logic.py` and `test_phase4.py` and `test_phase4_api_mock.py` to `ci.yml` (Postgres service already exists). Optional if time: wrap as pytest; not required.
- **E2E with Playwright** (one person + agent, `e2e/` folder at root, runs against `docker compose up`). Cover only the money flows — 5 specs:
  1. Guest/receptionist login → role redirect; guest blocked from `/dashboard/admin`.
  2. Browse rooms with dates → book → booking appears (and overlapping booking shows 409 error message).
  3. Receptionist: check-in → add service → generate bill → partial payment → full payment → check-out.
  4. Manager: reports render with seed data.
  5. Admin: create branch/user.
- Re-seed between runs: `docker compose down -v && up` (or a reset script running `run_all.sql`).
- Add an `e2e` CI job if it's stable; if flaky, run locally and screenshot the report for the submission.

### Day 2 afternoon — deploy + freeze
**Insight on hosting:** with 2 days, skip AWS. RDS + EC2/App Runner + VPC/security groups + HTTPS is a day of work by itself, and a forgotten RDS instance quietly burns credits. Use managed free tiers that work straight from the repo:
| Piece | Recommended | Why |
|---|---|---|
| Frontend | **Vercel** | Free, deploy from GitHub, root dir `frontend`, set `VITE_API_BASE_URL`; add `vercel.json` SPA rewrite to `/index.html`. |
| Backend | **Render** web service (free) using `backend/Dockerfile` | HTTPS out of the box (avoids mixed-content errors from Vercel); env vars in dashboard. Free tier sleeps → hit it a minute before the demo. |
| Database | **Neon** Postgres (free) | Real Postgres 15+/16, connection string works with asyncpg (`?sslmode=require` → pass `ssl='require'` if needed). Load with `psql "<neon-url>" -f run_all.sql` from inside `db/`. Skip `setup_db.sql` (Neon gives you the owner role). |
- Set backend `FRONTEND_ORIGIN` = the Vercel URL (CORS).
- AWS later (after submission) if you want the learning: one EC2 instance running the same `docker-compose.yml` is the easiest path, since nothing new needs configuring.
- **Primary demo = local Docker Compose; cloud = bonus.** If the cloud deploy isn't done by ~4pm Day 2, drop it.

**Freeze:** merge `dev` → `main` via PR, tag `v1.0`, update `README.md` (compose quickstart + live URLs + test instructions + screenshots).

---

## Critical files
- New: `docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile`, `frontend/nginx.conf`, `frontend/vercel.json`, `db/docker-init.sh`, `e2e/` (Playwright).
- Modify: all `frontend/src/**` stubs; `backend/app/routers/` (new public branches route, e.g. in `rooms.py` or a small `branches.py` registered in `main.py`); `.github/workflows/ci.yml`; `docs/specs/02_api_contract.md`, `docs/specs/10_deployment_guide.md`; each `docs/work/*/todo.md` Phase 4.
- Reuse: `require_role` in `backend/app/dependencies.py`; existing Pydantic response models (frontend should read these for field names); `db/run_all.sql` as the only schema entry point.

## Verification (what "done" means)
1. `docker compose down -v && docker compose up --build` → `http://localhost` loads; seeded logins work for all 4 roles.
2. All three backend test scripts pass against the compose DB and in CI (green on the `dev` PR).
3. `npx playwright test` → 5/5 specs pass against compose.
4. The full receptionist flow (book → check-in → service → bill → pay → check-out) works by hand in the browser.
5. (Bonus) The same flow works on the Vercel URL.

## Risks
- **Merge conflicts in shared files** (`App.jsx`, `index.css`, `Navbar`) → only Sithum edits those after the morning foundation; others request changes.
- **Response-shape mismatches** between pages and API → agents must check `/docs` and the Pydantic models, not the spec prose.
- **Scope creep on visuals** → functional + consistent first; polish only on Day 2 if E2E is green.
