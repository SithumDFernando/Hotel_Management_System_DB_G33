@echo off
setlocal enabledelayedexpansion

:: Determine repo root if run from a subdirectory
set "SCRIPT_DIR=%~dp0"
if exist "%SCRIPT_DIR%docker-compose.yml" (
    cd /d "%SCRIPT_DIR%"
) else if exist "%SCRIPT_DIR%..\..\docker-compose.yml" (
    cd /d "%SCRIPT_DIR%..\.."
)

echo ============================================================
echo   SkyNest Hotel Management System - Docker Environment
echo ============================================================
echo.

:: 1. Verify Docker Installation
where docker >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Docker is not installed or not in your PATH.
    echo Please install Docker Desktop: https://www.docker.com/products/docker-desktop/
    echo (To run without Docker, use native scripts in scripts\native\)
    echo.
    pause
    exit /b 1
)

:: 2. Verify Docker Daemon is running
docker info >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [WARNING] Docker daemon is not running!
    echo Please start Docker Desktop and wait until it is ready.
    echo.
    set /p RETRY_DOCKER="Press Enter to retry, or type 'Q' to quit: "
    if /i "!RETRY_DOCKER!"=="Q" exit /b 1
    docker info >nul 2>&1
    if !ERRORLEVEL! neq 0 (
        echo [ERROR] Docker daemon is still unavailable. Exiting.
        pause
        exit /b 1
    )
)

:: 3. Check Environment Files
echo [INFO] Checking environment configuration files...
if not exist ".env" (
    echo       Creating root .env from .env.example...
    copy ".env.example" ".env" >nul
) else (
    echo       Root .env already exists.
)

if not exist "backend\.env" (
    echo       Creating backend\.env from backend\.env.example...
    copy "backend\.env.example" "backend\.env" >nul
)

if not exist "frontend\.env" (
    echo       Creating frontend\.env from frontend\.env.example...
    copy "frontend\.env.example" "frontend\.env" >nul
)

echo.
echo ============================================================
echo   Choose an action:
echo ============================================================
echo   [1] Build and start SkyNest (Background - Recommended)
echo   [2] Build and start SkyNest (Foreground / Live Output)
echo   [3] View logs (Follow live)
echo   [4] Stop all running containers
echo   [5] Reset Database (wipe volumes and re-seed from scratch)
echo   [6] Show container status (docker compose ps)
echo   [7] Exit
echo ============================================================
echo.

set "CHOICE=1"
set /p CHOICE="Enter option [1-7] (Default: 1): "

if "%CHOICE%"=="1" goto START_DETACHED
if "%CHOICE%"=="2" goto START_FOREGROUND
if "%CHOICE%"=="3" goto VIEW_LOGS
if "%CHOICE%"=="4" goto STOP_CONTAINERS
if "%CHOICE%"=="5" goto RESET_DB
if "%CHOICE%"=="6" goto SHOW_STATUS
if "%CHOICE%"=="7" goto EXIT_SCRIPT
goto START_DETACHED

:START_DETACHED
echo.
echo [INFO] Building and starting all containers in background...
docker compose up -d --build
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to start Docker containers.
    pause
    exit /b %ERRORLEVEL%
)
goto PRINT_URLS

:START_FOREGROUND
echo.
echo [INFO] Building and starting all containers in foreground...
echo Press Ctrl+C at any time to stop.
docker compose up --build
goto EXIT_SCRIPT

:VIEW_LOGS
echo.
echo [INFO] Following Docker logs (Ctrl+C to exit)...
docker compose logs -f
goto EXIT_SCRIPT

:STOP_CONTAINERS
echo.
echo [INFO] Stopping SkyNest containers...
docker compose down
echo Containers stopped.
goto EXIT_SCRIPT

:RESET_DB
echo.
echo [WARNING] This will completely wipe all database volume data
echo and recreate tables with fresh seed data from db/run_all.sql!
set /p CONFIRM_RESET="Are you sure you want to reset? (y/N): "
if /i not "!CONFIRM_RESET!"=="y" (
    echo Reset cancelled.
    goto EXIT_SCRIPT
)
echo.
echo [INFO] Resetting database volume and rebuilding...
docker compose down -v
docker compose up -d --build
goto PRINT_URLS

:SHOW_STATUS
echo.
echo [INFO] Container Status:
docker compose ps
echo.
pause
goto EXIT_SCRIPT

:PRINT_URLS
echo.
echo ============================================================
echo   SkyNest is running!
echo ============================================================
echo   Web App (Frontend) : http://localhost:8080
echo   API Docs (Swagger) : http://localhost:8000/docs
echo   pgAdmin Interface  : http://localhost:5050
echo   PostgreSQL Host    : localhost:5432 (skynest_user / skynest_dev_pass)
echo.
echo   Demo Accounts:
echo     - Admin        : admin@skynest.lk       (SkyNest@2026)
echo     - Manager      : mgr.colombo@skynest.lk (SkyNest@2026)
echo     - Receptionist : rec.colombo@skynest.lk (SkyNest@2026)
echo     - Guest        : kamal@mail.com         (SkyNest@2026)
echo ============================================================
echo   Helpful commands:
echo     - View logs : docker compose logs -f
echo     - Stop      : docker compose down
echo ============================================================
echo.

:EXIT_SCRIPT
