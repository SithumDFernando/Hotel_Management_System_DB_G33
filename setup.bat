@echo off
setlocal enabledelayedexpansion

echo ============================================================
echo   SkyNest Localhost Development Setup
echo ============================================================
echo.

:: 1. Backend Environment File
echo [1/5] Checking backend/.env...
if not exist "backend\.env" (
    echo       Creating backend\.env from .env.example...
    copy "backend\.env.example" "backend\.env" >nul
) else (
    echo       backend\.env already exists.
)

:: 2. Frontend Environment File
echo [2/5] Checking frontend/.env...
if not exist "frontend\.env" (
    echo       Creating frontend/.env from .env.example...
    copy "frontend\.env.example" "frontend\.env" >nul
) else (
    echo       frontend\.env already exists.
)

:: 3. Python Virtual Environment
echo [3/5] Setting up Python virtual environment (backend\.venv)...
if not exist "backend\.venv" (
    echo       Creating virtual environment...
    python -m venv backend\.venv
) else (
    echo       backend\.venv already exists.
)

:: 4. Backend Dependencies
echo [4/5] Installing backend dependencies...
backend\.venv\Scripts\python.exe -m pip install --upgrade pip
backend\.venv\Scripts\pip.exe install -r backend\requirements.txt

:: 5. Frontend Dependencies
echo [5/5] Installing frontend dependencies (npm install)...
cd frontend
call npm install
cd ..

echo.
echo ============================================================
echo   Common Setup Complete!
echo ============================================================
echo.

:: Optional: Database setup
set /p SETUP_DB="Would you like to run the database setup scripts now? (y/N): "
if /i "!SETUP_DB!"=="y" (
    echo.
    echo Running db/setup_db.sql (Enter your postgres password when prompted)...
    psql -U postgres -f db/setup_db.sql
    echo.
    echo Running db/run_all.sql with skynest_user (Password: skynest_dev_pass)...
    cd db
    psql -h localhost -U skynest_user -d skynest -f run_all.sql
    cd ..
)

echo.
echo ============================================================
echo   Ready to Run SkyNest!
echo ============================================================
echo   Start Backend:
echo     cd backend
echo     .venv\Scripts\activate
echo     uvicorn app.main:app --reload
echo.
echo   Start Frontend (in a new terminal):
echo     cd frontend
echo     npm run dev
echo ============================================================
