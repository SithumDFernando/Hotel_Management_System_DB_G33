# SkyNest Hotel Reservation & Guest Services Management System (HRGSMS)

Welcome to the **SkyNest HRGSMS** project!  
This repository contains the complete full-stack database application for managing hotel operations: multi-branch room reservations, guest check-in/check-out, service requests, folios, and automated billing.

Developed for **University of Moratuwa — Semester 3 Database Project (Group 33)**.

---

## Recommended Reading Order

Follow this reading order to get started smoothly:

1. **[README.md](README.md)** (this file) — Overview of the hotel system, team responsibilities, and Git rules.
2. **[docs/SETUP.md](docs/SETUP.md)** — Detailed local development setup instructions:
   - **Docker (Recommended)**: Run `setup.bat`, `.\setup.ps1`, or `docker compose up --build` (database, pgAdmin, backend, and frontend).
   - **Native**: Run `scripts/native/setup.bat` or follow manual setup steps.
3. **[docs/work/learn.md](docs/work/learn.md)** — Beginner guide covering DBMS concepts, viva theory, REST architecture, and design patterns.
4. **[docs/work/architecture.md](docs/work/architecture.md)** — 3-tier architecture, vertical slicing, and subsystem interaction.
5. **Your Assigned Subsystem Guide** — Read your personal guide linked in the table below.
6. **Golden Reference Router & Specs** — Reference [`backend/app/routers/rooms.py`](backend/app/routers/rooms.py) and [`docs/specs/`](docs/specs/) while writing code.

---

## Team Members & Work Assignments

Each team member has a specific subsystem. **Click on your name below to view your personal assignment guide:**

| Member       | Subsystem / Responsibility                                                   | Assignment Guide                                 | Checklist |
| :----------- | :--------------------------------------------------------------------------- | :----------------------------------------------- | :-------- |
| **Sithum**   | Core Infrastructure, DB Schema, Auth, Golden Template                        | [`docs/work/sithum/sithum.md`](docs/work/sithum/sithum.md)     | [`todo.md`](docs/work/sithum/todo.md)     |
| **Vinuji**   | Reservation & Front Desk (Bookings, Check-in/out, Double-booking prevention) | [`docs/work/vinuji/vinuji.md`](docs/work/vinuji/vinuji.md)     | [`todo.md`](docs/work/vinuji/todo.md)     |
| **Sheereen** | Billing & Payments (Rate calculation, Invoices, Payment recording)           | [`docs/work/sheereen/sheereen.md`](docs/work/sheereen/sheereen.md) | [`todo.md`](docs/work/sheereen/todo.md) |
| **Chamika**  | Rooms, Amenities & Services (Service requests, Price lock trigger)           | [`docs/work/chamika/chamika.md`](docs/work/chamika/chamika.md)   | [`todo.md`](docs/work/chamika/todo.md)   |
| **Sadeepa**  | Analytics, Views & Seed Data (Occupancy/Revenue reports, Sample test data)   | [`docs/work/sadeepa/sadeepa.md`](docs/work/sadeepa/sadeepa.md)   | [`todo.md`](docs/work/sadeepa/todo.md)   |

---

## Quick Start & Running Locally

### Port & Service Summary

| Service | Native Dev Port | Docker Port | URL / Host | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend UI** | `5173` | `8080` | Native: [`http://localhost:5173`](http://localhost:5173)<br>Docker: [`http://localhost:8080`](http://localhost:8080) | React 18 + Vite SPA |
| **Backend API** | `8000` | `8000` | [`http://localhost:8000`](http://localhost:8000) | FastAPI async REST API |
| **Swagger Docs** | `8000` | `8000` | [`http://localhost:8000/docs`](http://localhost:8000/docs) | Interactive API exploration |
| **PostgreSQL** | `5432` | `5432` | `localhost:5432` | Database (`skynest` / `skynest_user`) |
| **pgAdmin 4** | — | `5050` | [`http://localhost:5050`](http://localhost:5050) | Web-based database management |

---

### Option 1: Run with Docker (Recommended)

Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/).

Run the interactive launcher:
```cmd
# Windows (CMD):
setup.bat

# Windows (PowerShell):
.\setup.ps1

# macOS / Linux:
chmod +x setup.sh && ./setup.sh
```

Or start directly with Docker Compose:
```bash
docker compose up --build
```

- **Reset database & re-seed**: `docker compose down -v && docker compose up --build`
- **Follow logs**: `docker compose logs -f`
- **Stop containers**: `docker compose down`

---

### Option 2: Native Local Development (Hot-Reload)

To run services natively using local Python, Node.js, and PostgreSQL:

```cmd
# Windows (CMD):
scripts\native\setup.bat

# Windows (PowerShell):
.\scripts\native\setup.ps1

# macOS / Linux:
chmod +x scripts/native/setup.sh && ./scripts/native/setup.sh
```

Or manually:
1. **Database**:
   ```bash
   psql -U postgres -f db/setup_db.sql
   psql -U skynest_user -d skynest -f db/run_all.sql
   ```
2. **Backend**:
   ```bash
   cd backend
   python -m venv .venv
   .venv\Scripts\activate      # or source .venv/bin/activate
   pip install -r requirements.txt
   uvicorn app.main:app --reload --port 8000
   ```
3. **Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

---

<a id="demo-user-login-credentials"></a>
<a id="test-accounts--credentials"></a>
## Demo User Login Credentials & Test Accounts

Once seed data is loaded (`db/run_all.sql` or Docker compose initialization), all seeded test accounts use the default password: **`SkyNest@2026`**.

### Application User Logins

| Email | Password | Role | Branch / Scope | Description & Permissions |
| :--- | :--- | :--- | :--- | :--- |
| `admin@skynest.lk` | `SkyNest@2026` | `ADMIN` | Global (All Branches) | Superuser: branch setup, user management, full audit reports |
| `mgr.colombo@skynest.lk` | `SkyNest@2026` | `MANAGER` | Colombo | Colombo branch manager: revenue, occupancy analytics & reports |
| `mgr.kandy@skynest.lk` | `SkyNest@2026` | `MANAGER` | Kandy | Kandy branch manager: revenue, occupancy analytics & reports |
| `rec.colombo@skynest.lk` | `SkyNest@2026` | `RECEPTIONIST` | Colombo | Colombo front desk: room assignment, check-in/out, folios & bills |
| `rec.galle@skynest.lk` | `SkyNest@2026` | `RECEPTIONIST` | Galle | Galle front desk: room assignment, check-in/out, folios & bills |
| `kamal@mail.com` | `SkyNest@2026` | `GUEST` | Guest Profile (Kamal) | Individual guest: catalog browsing, room bookings & invoices |
| `nimali@mail.com` | `SkyNest@2026` | `GUEST` | Guest Profile (Nimali) | Individual guest: catalog browsing, room bookings & invoices |

> [!TIP]
> **One-Click Demo Logins:** On the web login screen ([`http://localhost:5173/login`](http://localhost:5173/login) or [`http://localhost:8080/login`](http://localhost:8080/login)), click any of the **Demo Account chips** (Admin, Manager, Reception, Guest) to immediately autofill credentials and sign in.

### Database & Service Infrastructure Logins

| Service | Access URL / Host | Username / Email | Password | Database |
| :--- | :--- | :--- | :--- | :--- |
| **PostgreSQL** | `localhost:5432` | `skynest_user` | `skynest_dev_pass` | `skynest` |
| **pgAdmin 4** | [`http://localhost:5050`](http://localhost:5050) | `admin@skynest.dev` | `skynest_dev_pass` | `skynest` |
| **FastAPI Swagger** | [`http://localhost:8000/docs`](http://localhost:8000/docs) | *(Use any seed email above)* | `SkyNest@2026` | — |

---

## Testing & Verification

SkyNest comes with full automated test suites covering database constraints, ACID transactions, RBAC, and reporting:

Run these inside `backend/` with the virtual environment activated:

```bash
cd backend
pip install -r requirements-dev.txt       # pytest + pytest-asyncio (once)
pytest -q                                 # everything (needs seeded DB + API on :8000)
pytest -q -m "not live_api"               # skip the suite that needs a running API server
pytest -q -m "not db and not live_api"    # mock-DB tests only, no database needed
```

| File | Covers | Needs |
|---|---|---|
| `tests/test_db_crud.py` | DB connection & CRUD permissions | DB |
| `tests/test_business_logic.py` | Double-booking trigger, payment rules | DB |
| `tests/test_regressions.py` | One test per fixed issue in `docs/work/issues/` (rolled back after each test) | DB |
| `tests/test_frontend_support_api.py` | Auth & branches routes | — (mock DB) |
| `tests/test_phase4_api_mock.py` | RBAC & admin endpoints | — (mock DB) |
| `tests/test_phase4.py` | Views & analytics endpoints | DB + API on :8000 |

The older suites can still be run as plain scripts, e.g. `python tests/test_phase4.py`.

To verify the frontend production build:
```bash
cd frontend
npm run build
```

---

## Git Rules & Collaboration Workflow

> [!IMPORTANT]
>
> ### The 3 Golden Git Rules:
>
> 1. **NEVER push or merge directly to `main`!** `main` is protected for final, tested releases only.
> 2. **NEVER push directly to `dev`!**
> 3. **ALWAYS create your own branch, push your branch, and create a Pull Request (PR) to merge into `dev`!**

```
 [main] (Production / Final release only — protected)
   ▲
   │ (Merged only by Team Lead at milestone release)
 [dev] (Active development branch — all PRs go here)
   ▲              ▲              ▲              ▲
   │ Pull Request │ Pull Request │ Pull Request │ Pull Request
[feature/...]  [feature/...]  [feature/...]  [feature/...]
 (Vinuji)       (Sheereen)     (Chamika)      (Sadeepa)
```

### Daily Git Commands (Step-by-Step)

```bash
# 1. Pull latest dev
git checkout dev
git pull origin dev

# 2. Create your feature branch (feature/<yourname>-<feature>)
git checkout -b feature/vinuji-bookings

# 3. Work, stage, and commit
git status
git add .
git commit -m "feat(bookings): implement make_booking"

# 4. Push to remote
git push -u origin feature/vinuji-bookings

# 5. Open a Pull Request on GitHub targeting the 'dev' branch
```

---

## Repository Structure

```
SkyNest_P5_G33/
├── db/                         # PostgreSQL Database Layer
│   ├── schema/                 # DDL: Tables, constraints, and indexes
│   ├── functions/              # SQL helper functions (calculations)
│   ├── procedures/             # Stored procedures (transactions, booking, billing)
│   ├── triggers/               # Triggers (prevent double bookings, price lock)
│   ├── views/                  # Reporting views (occupancy, revenue)
│   ├── seed/                   # Sample test data (sample_data.sql)
│   ├── docker/                 # Container DB init script and pgAdmin config
│   └── run_all.sql             # Master script to execute all SQL files in order
│
├── backend/                    # Python FastAPI Backend
│   ├── app/
│   │   ├── config.py           # App configuration & .env reader
│   │   ├── db.py               # PostgreSQL async connection pool (asyncpg)
│   │   ├── auth.py             # Password hashing (bcrypt) & JWT token handling
│   │   ├── dependencies.py     # Auth guards & role-based access control (RBAC)
│   │   ├── main.py             # FastAPI entry point & router mounting
│   │   ├── schemas/            # Pydantic request/response models
│   │   └── routers/            # API endpoints (rooms, auth, bookings, etc.)
│   ├── tests/                  # Automated integration, smoke & unit tests
│   ├── requirements.txt        # Python package dependencies
│   ├── Dockerfile              # Backend container specification
│   └── .env.example            # Backend environment template
│
├── frontend/                   # React 18 + Vite Frontend
│   ├── src/                    # React components, pages, context, and styles
│   ├── package.json            # Node.js dependencies
│   ├── Dockerfile              # Frontend container specification
│   ├── tailwind.config.js      # Custom theme & typography tokens
│   └── .env.example            # Frontend environment template
│
├── scripts/                    # Archived & Dedicated Setup Scripts
│   ├── docker/                 # Docker setup scripts (setup.bat, .ps1, .sh)
│   └── native/                 # Native setup scripts (setup.bat, .ps1, .sh)
│
├── docs/                       # Project Documentation & Architecture Guides
│   ├── SETUP.md                # Detailed local environment setup instructions
│   ├── work/                   # Work assignments & architecture for each member
│   └── specs/                  # Technical specifications (01 to 10)
│
├── docker-compose.yml          # Multi-container orchestration (App, API, DB, pgAdmin)
├── setup.bat                   # Interactive Docker setup launcher (Windows CMD)
├── setup.ps1                   # Interactive Docker setup launcher (PowerShell)
├── setup.sh                    # Interactive Docker setup launcher (Linux / macOS)
├── .env.example                # Root Docker environment variables template
└── README.md                   # Project overview & guidelines
```

---

## Troubleshooting & FAQs

### Q: Docker port conflict: `port is already allocated` (5432, 8000, 8080, 5050)?
If a native PostgreSQL or local web service is using port 5432, edit your root `.env` file and set an alternate port (e.g. `DB_PORT=5433`), then restart with `docker compose up --build`.

### Q: Database schema changed, but Docker didn't update tables?
The database initialization script runs only on an empty volume. Wipe the volume and rebuild:
```bash
docker compose down -v && docker compose up --build
```

### Q: 503 "The database is out of date", or a 500 with `procedure … does not exist`?
Your Docker `pgdata` volume was created before the latest changes in `db/`. `db/docker/init.sh` (which runs `db/run_all.sql`) only runs when the volume is **empty**, so pulling new SQL doesn't update an existing database. The backend checks this at startup: its log shows a `DATABASE SCHEMA IS OUT OF DATE` block listing what's missing, and http://localhost:8000/api/health returns 503 with the same list. Rebuild (this wipes local data and reloads the seed):
```bash
docker compose down -v && docker compose up --build
```
Don't patch the old volume by applying single `.sql` files: it is usually missing several constraints, triggers and indexes, and a partial patch matches no version of the repo.

### Q: `uvicorn` fails with `ValidationError: DATABASE_URL field required` (Native mode)?
You forgot to create the backend `.env` file! Copy it from `.env.example`:
```bash
copy backend\.env.example backend\.env
```

### Q: Where can I see how to write a router?
Check [`backend/app/routers/rooms.py`](backend/app/routers/rooms.py) — the **Golden Template Router** with detailed comments explaining schemas, database queries, role guards, and error handling.
