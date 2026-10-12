# Local Development Setup Guide

Full setup instructions to get SkyNest running on your machine.  
← Back to [README](../README.md)

---

## Prerequisites (What to Install)

| Tool           | Version | Download                                                | Notes                                                  |
| :------------- | :------ | :------------------------------------------------------ | :----------------------------------------------------- |
| **Git**        | 2.30+   | [git-scm.com](https://git-scm.com/)                     | Version control                                        |
| **Python**     | 3.10+   | [python.org](https://www.python.org/)                   | **Important: Check "Add Python to PATH" during installation!** |
| **Node.js**    | 18+ LTS | [nodejs.org](https://nodejs.org/)                       | Comes with `npm`                                       |
| **PostgreSQL** | 15+     | [postgresql.org](https://www.postgresql.org/download/)  | Remember the `postgres` user password!                 |
| **VS Code**    | Latest  | [code.visualstudio.com](https://code.visualstudio.com/) | Recommended editor                                     |

---

## 1. Clone the Repository

```bash
git clone https://github.com/SithumDFernando/Hotel_Management_System_DB_G33.git
cd Hotel_Management_System_DB_G33
git checkout dev
```

---

## Quick Automated Setup (Script Option)

If you have the prerequisites installed, run the automated script from the project root to automatically generate `.env` files, set up Python `.venv`, install backend/frontend dependencies, and optionally configure the database:

```cmd
# Windows (Command Prompt or double-click setup.bat):
setup.bat

# Windows (PowerShell):
.\setup.ps1

# macOS / Linux / Git Bash:
chmod +x setup.sh && ./setup.sh
```

*(Or follow the manual step-by-step instructions below)*

---

## 2. Database Setup (PostgreSQL)

### A. Initialize Database & Dedicated User

> [!TIP]
> We create a dedicated `skynest_user` instead of using the root `postgres` superuser. Your personal admin password is never shared or stored in code.

Run the setup script:

```powershell
# Windows (PowerShell):
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -f db/setup_db.sql

# macOS / Linux / If psql is in your PATH:
psql -U postgres -f db/setup_db.sql
```

*(Enter your `postgres` superuser password when prompted. Creates user `skynest_user` / password `skynest_dev_pass` and database `skynest`).*

<details>
<summary><b>Or do it manually inside psql:</b></summary>

```sql
psql -U postgres

CREATE USER skynest_user WITH PASSWORD 'skynest_dev_pass';
CREATE DATABASE skynest OWNER skynest_user;
GRANT ALL PRIVILEGES ON DATABASE skynest TO skynest_user;
\c skynest
GRANT ALL ON SCHEMA public TO skynest_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO skynest_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO skynest_user;
\q
```
</details>

### B. Build the Schema & Seed Data

```bash
psql -U skynest_user -d skynest -f db/run_all.sql
```

_(Windows full path if psql is not in PATH:)_

```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U skynest_user -d skynest -f db/run_all.sql
```
*(Password: `skynest_dev_pass`)*

This automatically builds all tables, constraints, indexes, functions, procedures, triggers, views, and seed data.

### C. Verify

```bash
psql -U skynest_user -d skynest -c "\dt"
```

All 13 tables should be listed.

### D. Tools to View & Inspect Tables

1. **pgAdmin 4** (installed with PostgreSQL on Windows):  
   `Servers` → `PostgreSQL 18` → `Databases` → `skynest` → `Schemas` → `public` → `Tables`. Right-click any table → **View/Edit Data**.

2. **VS Code Extension** (recommended):  
   Install **Database Client** (by *cweijan*) or **SQLTools** (with PostgreSQL Driver).  
   Connection: `localhost:5432`, User: `skynest_user`, Password: `skynest_dev_pass`, Database: `skynest`.

3. **DBeaver** (free alternative): [dbeaver.io](https://dbeaver.io/)

4. **psql CLI**: `\dt` (list tables), `\d table_name` (describe table), `SELECT * FROM guest LIMIT 5;`

---

## 3. Backend Setup (FastAPI & Python Virtual Environment)

> [!IMPORTANT]
> **Always use a virtual environment (`.venv`)!** Never install backend dependencies into your global Python environment. A virtual environment isolates project dependencies, preventing version conflicts with other Python projects on your machine.

### A. Create and Activate the Virtual Environment

```bash
cd backend

# Step 1: Create the virtual environment
python -m venv .venv

# Step 2: Activate the virtual environment
# Windows (PowerShell):
.venv\Scripts\Activate.ps1

# Windows (Command Prompt):
.venv\Scripts\activate.bat

# macOS / Linux:
source .venv/bin/activate
```

> [!TIP]
> **PowerShell Script Error?** If PowerShell displays `cannot be loaded because running scripts is disabled on this system`, run this once in your PowerShell terminal and retry:
> ```powershell
> Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
> .venv\Scripts\Activate.ps1
> ```
> When activated, your prompt will show `(.venv)` at the beginning of the line.

### B. Install Dependencies

With `(.venv)` active:

```bash
python -m pip install --upgrade pip
pip install -r requirements.txt
```

*(Alternative without activating: run `.venv\Scripts\pip install -r requirements.txt` on Windows)*

### C. Configure VS Code Python Interpreter

The repository includes [`.vscode/settings.json`](../.vscode/settings.json) configured to use `backend/.venv` automatically. To verify:

1. Press `Ctrl + Shift + P` (or `Cmd + Shift + P` on macOS).
2. Type **`Python: Select Interpreter`** and press Enter.
3. Select the interpreter pointing to `./backend/.venv/Scripts/python.exe`.
4. VS Code's integrated terminal will now auto-activate `(.venv)` whenever you open a terminal in `backend`.

### D. Configure Environment Variables

```bash
copy .env.example .env      # Windows
cp .env.example .env         # macOS / Linux
```

Verify `backend/.env` contains:

```env
DATABASE_URL=postgresql://skynest_user:skynest_dev_pass@localhost:5432/skynest
SECRET_KEY=supersecretjwtkeythatisatleast32characterslong
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
FRONTEND_ORIGIN=http://localhost:5173
```

### E. Start the Server

```bash
# Inside activated .venv:
uvicorn app.main:app --reload

# Or directly (Windows):
.venv\Scripts\uvicorn app.main:app --reload
```

- API: [`http://localhost:8000`](http://localhost:8000)
- **Swagger Docs**: [`http://localhost:8000/docs`](http://localhost:8000/docs) — test all endpoints interactively!
- Health check: [`http://localhost:8000/api/health`](http://localhost:8000/api/health)

---

## 4. Frontend Setup (React + Vite)

Open a **new terminal tab**:

```bash
cd frontend

# Install dependencies:
npm install

# Create .env file:
copy .env.example .env      # Windows
cp .env.example .env         # macOS / Linux
```

Verify `frontend/.env` contains:

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

Start the dev server:

```bash
npm run dev
```

Open: [`http://localhost:5173`](http://localhost:5173)
