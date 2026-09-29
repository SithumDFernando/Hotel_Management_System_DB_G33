# SkyNest Hotel Reservation & Guest Services Management System (HRGSMS)

Welcome to the **SkyNest HRGSMS** project!  
This repository contains the complete full-stack database application for managing hotel operations: room reservations, guest check-in/check-out, guest service usage, and automated billing.

Developed for **University of Moratuwa — Semester 3 Database Project (Group 33)**.

---

## 👥 Team Members & Work Assignments

Each team member has a specific subsystem. **Click on your name below to view your personal step-by-step assignment guide, list of files to edit, and architecture diagrams:**

| Member | Subsystem / Responsibility | Assignment Guide |
| :--- | :--- | :--- |
| **Sithum (Team Lead)** | Core Infrastructure, DB Schema, Auth, Golden Template | [`docs/work/sithum.md`](docs/work/sithum.md) |
| **Vinuji** | Reservation & Front Desk (Bookings, Check-in/out, Double-booking prevention) | [`docs/work/vinuji.md`](docs/work/vinuji.md) |
| **Sheereen** | Billing & Payments (Rate calculation, Invoices, Payment recording) | [`docs/work/sheereen.md`](docs/work/sheereen.md) |
| **Chamika** | Rooms, Amenities & Services (Service requests, Price lock trigger) | [`docs/work/chamika.md`](docs/work/chamika.md) |
| **Sadeepa** | Analytics, Views & Seed Data (Occupancy/Revenue reports, Sample test data) | [`docs/work/sadeepa.md`](docs/work/sadeepa.md) |

> 📖 **General Architecture & Work Strategy:** See [`docs/work/architecture.md`](docs/work/architecture.md)

---

## 🚨 GIT RULES & COLLABORATION WORKFLOW (MUST READ!)

> [!IMPORTANT]
> ### The 3 Golden Git Rules:
> 1. ❌ **NEVER push or merge directly to `main`!** `main` is protected for final, tested releases only.
> 2. ❌ **NEVER push directly to `dev`!**
> 3. ✅ **ALWAYS create your own branch, push your branch, and create a Pull Request (PR) to merge into `dev`!**

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

### 📋 Daily Git Commands (Step-by-Step Guide)

Whenever you work on the project, follow these simple steps:

#### Step 1: Switch to `dev` and pull the latest code
Before creating a new branch or starting work, make sure you have the newest code:
```bash
git checkout dev
git pull origin dev
```

#### Step 2: Create your own feature branch
Create a branch named after yourself and the feature you are working on:
```bash
# Branch name format: feature/<yourname>-<feature>
git checkout -b feature/vinuji-bookings
# or:
git checkout -b feature/sheereen-billing
# or:
git checkout -b feature/chamika-services
# or:
git checkout -b feature/sadeepa-reports
```

#### Step 3: Check what you modified
At any time, you can check what files you added or changed:
```bash
git status
```

#### Step 4: Save (Commit) your changes
When your code is working, stage and commit your changes with a clear message:
```bash
git add .
git commit -m "feat(bookings): implement make_booking procedure"
```
*(Tip: Make frequent, small commits instead of one giant commit at the end!)*

#### Step 5: Push your branch to GitHub
The first time you push your new branch to GitHub:
```bash
git push -u origin feature/your-branch-name
```
*(On later pushes to the same branch, you can just type `git push`)*

#### Step 6: Create a Pull Request (PR) to `dev`
1. Go to our repository on GitHub: [`Hotel_Management_System_DB_G33`](https://github.com/SithumDFernando/Hotel_Management_System_DB_G33)
2. You will see a yellow banner: **"Compare & pull request"**. Click it!
3. **⚠️ VERY IMPORTANT:** Change the **base branch to `dev`** (NOT `main`).
   - Base: `dev`
   - Compare: `feature/your-branch-name`
4. Add a short title and description explaining what you built or fixed.
5. Click **"Create pull request"**.
6. Send a message to the group / Sithum to review your code! Once reviewed, it will be merged into `dev`.

#### Step 7: How to update your branch with new changes from `dev`
If someone else merged their code into `dev` and you need their updates in your branch:
```bash
git checkout dev
git pull origin dev
git checkout feature/your-branch-name
git merge dev
```

---

## 🛠️ Prerequisites (What to Install)

Make sure you have these tools installed on your computer before starting:

| Tool | Recommended Version | Download Link | Notes |
| :--- | :--- | :--- | :--- |
| **Git** | 2.30+ | [git-scm.com](https://git-scm.com/) | Version control |
| **Python** | 3.10+ | [python.org](https://www.python.org/) | **⚠️ Check "Add Python to PATH" during installation!** |
| **Node.js** | 18+ (LTS) | [nodejs.org](https://nodejs.org/) | Comes with `npm` |
| **PostgreSQL** | 15+ | [postgresql.org](https://www.postgresql.org/download/) | Remember the `postgres` user password! |
| **VS Code** | Latest | [code.visualstudio.com](https://code.visualstudio.com/) | Recommended editor |

---

## 🚀 Local Project Setup

### 1. Clone the Repository

```bash
git clone https://github.com/SithumDFernando/Hotel_Management_System_DB_G33.git
cd Hotel_Management_System_DB_G33
git checkout dev
```

---

### 2. Database Setup (PostgreSQL)

#### A. Create the Database
Open your terminal (or pgAdmin) and create the database:
```bash
# Connect to PostgreSQL using the default postgres admin user
psql -U postgres
```
Inside the PostgreSQL prompt (`postgres=#`), run:
```sql
CREATE DATABASE skynest;
\q
```

> [!TIP]
> **Windows Tip for `psql`:**  
> If Windows terminal says `'psql' is not recognized as an internal or external command`:
> - Run it using the full path:  
>   `& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres` (replace `18` with your installed version)
> - Or open the **"SQL Shell (psql)"** program from your Windows Start Menu!
> - Or open **pgAdmin 4**, right-click **Databases -> Create -> Database**, and type `skynest`.

#### B. Build the Schema & Seed the Database
Run the master database script from the root directory:
```bash
psql -U postgres -d skynest -f db/run_all.sql
```
*(On Windows if psql is not in your PATH, use:)*
```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d skynest -f db/run_all.sql
```

`db/run_all.sql` automatically builds:
1. All ENUM types and 13 Tables (`db/schema/01_tables.sql`)
2. Foreign keys, check constraints, and unique constraints (`db/schema/02_constraints.sql`)
3. Performance indexes (`db/schema/03_indexes.sql`)
4. Functions, procedures, triggers, views, and test seed data

#### C. Verify the Database
Check that all 13 tables are created:
```bash
psql -U postgres -d skynest -c "\dt"
```

---

### 3. Backend Setup (FastAPI Python)

#### A. Go to the backend folder
```bash
cd backend
```

#### B. Create & Activate a Virtual Environment
```bash
# Create virtual environment
python -m venv .venv

# Activate it:
# Windows (PowerShell):
.venv\Scripts\Activate.ps1
# Windows (Command Prompt):
.venv\Scripts\activate.bat
# macOS / Linux:
source .venv/bin/activate
```
*(When activated, you will see `(.venv)` at the beginning of your terminal prompt).*

#### C. Install Backend Dependencies
```bash
pip install -r requirements.txt
```

#### D. Create Environment File (`.env`)
Copy the example environment file:
```bash
# Windows:
copy .env.example .env

# macOS / Linux:
cp .env.example .env
```
Open `backend/.env` in VS Code and update your PostgreSQL password if needed:
```env
DATABASE_URL=postgresql://postgres:YOUR_POSTGRES_PASSWORD@localhost:5432/skynest
SECRET_KEY=supersecretjwtkeythatisatleast32characterslong
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
FRONTEND_ORIGIN=http://localhost:5173
```

#### E. Start the FastAPI Backend Server
```bash
uvicorn app.main:app --reload
```
- API is running at: [`http://localhost:8000`](http://localhost:8000)
- **Interactive Swagger API Docs:** [`http://localhost:8000/docs`](http://localhost:8000/docs)  
  *(You can test all endpoints directly in your browser here!)*
- Health check: [`http://localhost:8000/api/health`](http://localhost:8000/api/health)

---

### 4. Frontend Setup (React + Vite)

Open a **new terminal tab**:

#### A. Go to the frontend folder
```bash
cd frontend
```

#### B. Install Frontend Dependencies
```bash
npm install
```

#### C. Create Environment File (`.env`)
```bash
# Windows:
copy .env.example .env

# macOS / Linux:
cp .env.example .env
```
Verify `frontend/.env` contains:
```env
VITE_API_BASE_URL=http://localhost:8000/api
```

#### D. Start the Frontend Development Server
```bash
npm run dev
```
Open your browser at: [`http://localhost:5173`](http://localhost:5173)

---

## 🔑 Test Accounts & Credentials

Once sample seed data is loaded, you can log in with:

| Email | Password | Role | Description |
| :--- | :--- | :--- | :--- |
| `admin@skynest.lk` | `SkyNest@2026` | `ADMIN` | System administrator |
| `mgr.colombo@skynest.lk` | `SkyNest@2026` | `MANAGER` | Hotel manager (Colombo branch) |
| `rec.colombo@skynest.lk` | `SkyNest@2026` | `RECEPTIONIST` | Front desk receptionist |
| `kamal@mail.com` | `SkyNest@2026` | `GUEST` | Registered hotel guest |

---

## 📁 Repository Structure

```
SkyNest_P5_G33/
├── db/                         # PostgreSQL Database Layer
│   ├── schema/                 # DDL: Tables, constraints, and indexes
│   │   ├── 01_tables.sql
│   │   ├── 02_constraints.sql
│   │   └── 03_indexes.sql
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
│   ├── work/                   # Work assignments & architecture for each member
│   │   ├── architecture.md     # Architecture & work distribution overview
│   │   ├── sithum.md           # Team Lead guide
│   │   ├── vinuji.md           # Member 1 guide
│   │   ├── sheereen.md         # Member 2 guide
│   │   ├── chamika.md          # Member 3 guide
│   │   └── sadeepa.md          # Member 4 guide
│   └── specs/                  # Detailed technical specifications (01 to 10)
│
├── .gitignore                  # Git ignore rules
└── README.md                   # This project guide
```

---

## 💡 Beginner Troubleshooting & FAQs

### Q: I made a mistake in my code and want to discard my changes.
```bash
# To discard changes in a specific file:
git restore path/to/file

# To see what is currently modified:
git status
```

### Q: Git says "fatal: refusing to merge unrelated histories" or has conflict.
Don't panic! Do not force push. Take a screenshot and ask Sithum on WhatsApp/Slack. We can resolve conflicts together.

### Q: `uvicorn` fails with `ValidationError: DATABASE_URL field required`.
You forgot to create the `.env` file! Run `copy .env.example .env` inside the `backend` folder, then check your credentials.

### Q: Where can I see how to write a router?
Check [`backend/app/routers/rooms.py`](backend/app/routers/rooms.py). It is our **Golden Template Router** with detailed comments explaining every step: schemas, database queries, role guards, and error handling.
