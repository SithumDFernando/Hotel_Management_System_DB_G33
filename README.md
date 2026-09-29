# SkyNest Hotel Reservation & Guest Services Management System (HRGSMS)

Welcome to the **SkyNest HRGSMS** project!  
This repository contains the complete full-stack database application for managing hotel operations: room reservations, guest check-in/check-out, guest service usage, and automated billing.

Developed for **University of Moratuwa — Semester 3 Database Project (Group 33)**.

---

## Recommended Reading Order

Follow this reading order to get started smoothly:

1. **[README.md](README.md)** (this file) — Overview of the hotel system, team responsibilities, and Git rules.
2. **[docs/SETUP.md](docs/SETUP.md)** — Local development environment setup (PostgreSQL, Python `.venv`, backend, frontend).
3. **[docs/work/learn.md](docs/work/learn.md)** — Beginner guide covering DBMS concepts, viva theory, REST architecture, and design patterns.
4. **[docs/work/architecture.md](docs/work/architecture.md)** — 3-tier architecture, vertical slicing, and subsystem interaction.
5. **Your Assigned Subsystem Guide** — Read your personal guide linked in the table below.
6. **Golden Reference Router & Specs** — Reference [`backend/app/routers/rooms.py`](backend/app/routers/rooms.py) and [`docs/specs/`](docs/specs/) while writing code.

---

## Team Members & Work Assignments

Each team member has a specific subsystem. **Click on your name below to view your personal assignment guide:**

| Member       | Subsystem / Responsibility                                                   | Assignment Guide                                 |
| :----------- | :--------------------------------------------------------------------------- | :----------------------------------------------- |
| **Sithum**   | Core Infrastructure, DB Schema, Auth, Golden Template                        | [`docs/work/sithum.md`](docs/work/sithum.md)     |
| **Vinuji**   | Reservation & Front Desk (Bookings, Check-in/out, Double-booking prevention) | [`docs/work/vinuji.md`](docs/work/vinuji.md)     |
| **Sheereen** | Billing & Payments (Rate calculation, Invoices, Payment recording)           | [`docs/work/sheereen.md`](docs/work/sheereen.md) |
| **Chamika**  | Rooms, Amenities & Services (Service requests, Price lock trigger)           | [`docs/work/chamika.md`](docs/work/chamika.md)   |
| **Sadeepa**  | Analytics, Views & Seed Data (Occupancy/Revenue reports, Sample test data)   | [`docs/work/sadeepa.md`](docs/work/sadeepa.md)   |

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

---

### Daily Git Commands (Step-by-Step)

#### Step 1: Pull the latest `dev`

```bash
git checkout dev
git pull origin dev
```

#### Step 2: Create your feature branch

```bash
# Format: feature/<yourname>-<feature>
git checkout -b feature/vinuji-bookings
```

#### Step 3: Check, commit, and push

```bash
git status                                                  # See what changed
git add .                                                   # Stage changes
git commit -m "feat(bookings): implement make_booking"      # Commit
git push -u origin feature/your-branch-name                 # Push (first time)
# On later pushes: just git push
```

_(Tip: Make frequent, small commits instead of one giant commit!)_

#### Step 4: Create a Pull Request (PR) to `dev`

1. Go to our repo on GitHub: [`Hotel_Management_System_DB_G33`](https://github.com/SithumDFernando/Hotel_Management_System_DB_G33)
2. Click the **"Compare & pull request"** banner.
3. **IMPORTANT:** Set the **base branch to `dev`** (NOT `main`).
4. Add a short title and description, then click **"Create pull request"**.
5. Notify Sithum to review!

#### Step 5: Update your branch with new changes from `dev`

```bash
git checkout dev
git pull origin dev
git checkout feature/your-branch-name
git merge dev
```

---

## Test Accounts & Credentials

Once seed data is loaded, you can log in with:

| Email                    | Password       | Role           | Description                    |
| :----------------------- | :------------- | :------------- | :----------------------------- |
| `admin@skynest.lk`       | `SkyNest@2026` | `ADMIN`        | System administrator           |
| `mgr.colombo@skynest.lk` | `SkyNest@2026` | `MANAGER`      | Hotel manager (Colombo branch) |
| `rec.colombo@skynest.lk` | `SkyNest@2026` | `RECEPTIONIST` | Front desk receptionist        |
| `kamal@mail.com`         | `SkyNest@2026` | `GUEST`        | Registered hotel guest         |

---

## Repository Structure

```
SkyNest_P5_G33/
├── db/                         # PostgreSQL Database Layer
│   ├── schema/                 # DDL: Tables, constraints, and indexes
│   ├── functions/              # SQL helper functions (calculations)
│   ├── procedures/             # Stored procedures (transactions, booking, billing)
│   ├── triggers/               # Triggers (prevent double bookings, price snapshot)
│   ├── views/                  # Reporting views (occupancy, revenue)
│   ├── seed/                   # Sample test data (sample_data.sql)
│   └── run_all.sql             # Master script to execute all SQL files in order
│
├── backend/                    # Python FastAPI Backend
│   ├── app/
│   │   ├── config.py           # App configuration & .env reader
│   │   ├── db.py               # PostgreSQL async connection pool
│   │   ├── auth.py             # Password hashing (bcrypt) & JWT token handling
│   │   ├── dependencies.py     # Auth guards & role-based access control
│   │   ├── main.py             # FastAPI entry point & router mounting
│   │   ├── schemas/            # Pydantic request/response models
│   │   └── routers/            # API endpoints (rooms, auth, bookings, etc.)
│   ├── requirements.txt        # Python package dependencies
│   └── .env.example            # Backend environment template
│
├── frontend/                   # React + Vite Frontend
│   ├── src/                    # React components, pages, context, and styles
│   ├── package.json            # Node.js dependencies
│   └── .env.example            # Frontend environment template
│
├── docs/                       # Project Documentation
│   ├── SETUP.md                # Local development setup instructions
│   ├── work/                   # Work assignments & architecture for each member
│   └── specs/                  # Detailed technical specifications (01 to 10)
│
├── .gitignore                  # Git ignore rules
└── README.md                   # This project guide
```

---

## Troubleshooting & FAQs

### Q: I made a mistake and want to discard my changes.

```bash
git restore path/to/file     # Discard changes in a specific file
git status                   # See what is currently modified
```

### Q: Git says "fatal: refusing to merge unrelated histories" or has conflict.

Don't panic! Do not force push. Take a screenshot and ask Sithum on WhatsApp/Slack.

### Q: `uvicorn` fails with `ValidationError: DATABASE_URL field required`.

You forgot to create the `.env` file! Run `copy .env.example .env` inside the `backend` folder.

### Q: Where can I see how to write a router?

Check [`backend/app/routers/rooms.py`](backend/app/routers/rooms.py) — the **Golden Template Router** with detailed comments explaining schemas, database queries, role guards, and error handling.
