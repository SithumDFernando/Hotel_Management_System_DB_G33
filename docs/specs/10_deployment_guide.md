# 10 — Deployment Guide

> How to set up and run the full SkyNest HRGSMS stack locally.

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| PostgreSQL | 15+ | Database |
| Python | 3.10+ | Backend (FastAPI) |
| Node.js | 18+ | Frontend (React + Vite) |
| npm | 9+ | Package management |
| Git | 2.30+ | Version control |

---

## 1. Clone & Setup

```bash
git clone https://github.com/<org>/SkyNest_P5_G33.git
cd SkyNest_P5_G33
```

---

## 2. Database Setup

### 2.1 Create the database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database and user
CREATE DATABASE skynest;
CREATE USER skynest_user WITH PASSWORD 'skynest_pass';
GRANT ALL PRIVILEGES ON DATABASE skynest TO skynest_user;
\q
```

### 2.2 Run schema & seed

```bash
psql -U skynest_user -d skynest -f db/run_all.sql
```

`run_all.sql` executes in order:
1. `schema/01_tables.sql` — enum types + CREATE TABLEs
2. `schema/02_constraints.sql` — FKs, CHECKs, UNIQUEs
3. `schema/03_indexes.sql` — all indexes from spec 06
4. `functions/*.sql` — helper functions (must be before procedures)
5. `procedures/*.sql` — business procedures
6. `triggers/*.sql` — all triggers
7. `views/reports.sql` — 5 report views
8. `seed/sample_data.sql` — test data

### 2.3 Verify

```bash
psql -U skynest_user -d skynest -c "\dt"
# Should show 13 tables

psql -U skynest_user -d skynest -c "SELECT COUNT(*) FROM guest;"
# Should return 6
```

---

## 3. Backend Setup

### 3.1 Create virtual environment

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate
```

### 3.2 Install dependencies

```bash
pip install -r requirements.txt
```

### 3.3 Configure environment

```bash
copy .env.example .env    # Windows
# cp .env.example .env    # macOS/Linux
```

Edit `.env`:
```env
DATABASE_URL=postgresql://skynest_user:skynest_pass@localhost:5432/skynest
JWT_SECRET=your-super-secret-key-at-least-32-chars-long
JWT_ALGORITHM=HS256
JWT_EXPIRY_HOURS=24
CORS_ORIGINS=http://localhost:5173
```

### 3.4 Run the server

```bash
uvicorn app.main:app --reload --port 8000
```

Server runs at: `http://localhost:8000`
API docs at: `http://localhost:8000/docs` (Swagger UI)

---

## 4. Frontend Setup

### 4.1 Install dependencies

```bash
cd frontend
npm install
```

### 4.2 Configure environment

```bash
copy .env.example .env
```

Edit `.env`:
```env
VITE_API_BASE_URL=http://localhost:8000/api
```

### 4.3 Run dev server

```bash
npm run dev
```

Frontend runs at: `http://localhost:5173`

---

## 5. Test Accounts

| Email | Password | Role |
|-------|----------|------|
| admin@skynest.lk | SkyNest@2026 | Admin |
| mgr.colombo@skynest.lk | SkyNest@2026 | Manager (Colombo) |
| rec.colombo@skynest.lk | SkyNest@2026 | Receptionist (Colombo) |
| kamal@mail.com | SkyNest@2026 | Guest |

---

## 6. Running Tests

### Backend tests

```bash
cd backend
pytest tests/ -v
```

### Database schema validation (dry-run)

```bash
# Drops and recreates everything — use on test DB only
psql -U skynest_user -d skynest_test -f db/run_all.sql
```

---

## 7. CI Pipeline (`.github/workflows/ci.yml`)

The CI pipeline runs on every push:

1. **Database**: Spins up PostgreSQL service, runs `run_all.sql` to validate schema
2. **Backend**: Installs Python deps, runs `pytest`
3. **Frontend**: Installs npm deps, runs `npm run build` (type/syntax check)

---

## 8. Environment Variables Reference

### Backend (`.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | ✓ | — | PostgreSQL connection string |
| `JWT_SECRET` | ✓ | — | Secret key for JWT signing |
| `JWT_ALGORITHM` | ✗ | HS256 | JWT algorithm |
| `JWT_EXPIRY_HOURS` | ✗ | 24 | Token expiry in hours |
| `CORS_ORIGINS` | ✗ | * | Allowed CORS origins (comma-separated) |

### Frontend (`.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_BASE_URL` | ✓ | — | Backend API base URL |

---

## 9. Folder Structure Quick Reference

```
SkyNest_P5_G33/
├── db/              ← PostgreSQL schema, functions, procedures, triggers, views, seed
├── backend/         ← FastAPI (Python) — REST API
├── frontend/        ← React + Vite — SPA
├── docs/
│   ├── refernce/    ← Project brief, ER diagram, SRS
│   └── specs/       ← These spec documents (01-10)
├── .github/         ← CI workflow
└── README.md
```
