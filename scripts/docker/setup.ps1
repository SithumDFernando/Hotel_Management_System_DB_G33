# SkyNest Hotel Management System - Docker Environment (PowerShell)

# Ensure working directory is the project root
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (Test-Path (Join-Path $scriptDir "docker-compose.yml")) {
    Set-Location $scriptDir
} elseif (Test-Path (Join-Path $scriptDir "..\..\docker-compose.yml")) {
    Set-Location (Join-Path $scriptDir "..\..")
}

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  SkyNest Hotel Management System - Docker Environment" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verify Docker Installation
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Docker is not installed or not in your PATH." -ForegroundColor Red
    Write-Host "Please install Docker Desktop: https://www.docker.com/products/docker-desktop/" -ForegroundColor Yellow
    Write-Host "(To run without Docker, use native scripts in scripts/native/)" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

# 2. Verify Docker Daemon is Running
$dockerRunning = docker info 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "[WARNING] Docker daemon is not running!" -ForegroundColor Yellow
    Write-Host "Please start Docker Desktop and wait until it is ready." -ForegroundColor Yellow
    Write-Host ""
    $retry = Read-Host "Press Enter to retry, or type 'Q' to quit"
    if ($retry -match "^[qQ]$") { exit 1 }
    $dockerRunning = docker info 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Docker daemon is still unavailable. Exiting." -ForegroundColor Red
        exit 1
    }
}

# 3. Check Environment Files
Write-Host "[INFO] Checking environment configuration files..." -ForegroundColor Cyan
if (-not (Test-Path ".env")) {
    Write-Host "      Creating root .env from .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
} else {
    Write-Host "      Root .env already exists." -ForegroundColor Green
}

if (-not (Test-Path "backend\.env")) {
    Write-Host "      Creating backend/.env from backend/.env.example..." -ForegroundColor Yellow
    Copy-Item "backend\.env.example" "backend\.env"
}

if (-not (Test-Path "frontend\.env")) {
    Write-Host "      Creating frontend/.env from frontend/.env.example..." -ForegroundColor Yellow
    Copy-Item "frontend\.env.example" "frontend\.env"
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Choose an action:" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  [1] Build and start SkyNest (Background - Recommended)"
Write-Host "  [2] Build and start SkyNest (Foreground / Live Output)"
Write-Host "  [3] View logs (Follow live)"
Write-Host "  [4] Stop all running containers"
Write-Host "  [5] Reset Database (wipe volumes and re-seed from scratch)"
Write-Host "  [6] Show container status (docker compose ps)"
Write-Host "  [7] Exit"
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

$choice = Read-Host "Enter option [1-7] (Default: 1)"
if ([string]::IsNullOrWhiteSpace($choice)) { $choice = "1" }

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "[INFO] Building and starting all containers in background..." -ForegroundColor Cyan
        docker compose up -d --build
        if ($LASTEXITCODE -ne 0) {
            Write-Host "[ERROR] Failed to start Docker containers." -ForegroundColor Red
            exit $LASTEXITCODE
        }
        
        Write-Host ""
        Write-Host "============================================================" -ForegroundColor Green
        Write-Host "  SkyNest is running!" -ForegroundColor Green
        Write-Host "============================================================" -ForegroundColor Green
        Write-Host "  Web App (Frontend) : http://localhost:8080" -ForegroundColor Cyan
        Write-Host "  API Docs (Swagger) : http://localhost:8000/docs" -ForegroundColor Cyan
        Write-Host "  pgAdmin Interface  : http://localhost:5050" -ForegroundColor Cyan
        Write-Host "  PostgreSQL Host    : localhost:5432 (skynest_user / skynest_dev_pass)" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "  Demo Accounts:" -ForegroundColor Yellow
        Write-Host "    - Admin        : admin@skynest.lk       (SkyNest@2026)"
        Write-Host "    - Manager      : mgr.colombo@skynest.lk (SkyNest@2026)"
        Write-Host "    - Receptionist : rec.colombo@skynest.lk (SkyNest@2026)"
        Write-Host "    - Guest        : kamal@mail.com         (SkyNest@2026)"
        Write-Host "============================================================" -ForegroundColor Green
        Write-Host "  Helpful commands:" -ForegroundColor Gray
        Write-Host "    - View logs : docker compose logs -f" -ForegroundColor Gray
        Write-Host "    - Stop      : docker compose down" -ForegroundColor Gray
        Write-Host "============================================================" -ForegroundColor Green
    }
    "2" {
        Write-Host ""
        Write-Host "[INFO] Building and starting all containers in foreground..." -ForegroundColor Cyan
        Write-Host "Press Ctrl+C at any time to stop." -ForegroundColor Yellow
        docker compose up --build
    }
    "3" {
        Write-Host ""
        Write-Host "[INFO] Following Docker logs (Ctrl+C to exit)..." -ForegroundColor Cyan
        docker compose logs -f
    }
    "4" {
        Write-Host ""
        Write-Host "[INFO] Stopping SkyNest containers..." -ForegroundColor Cyan
        docker compose down
        Write-Host "Containers stopped." -ForegroundColor Green
    }
    "5" {
        Write-Host ""
        Write-Host "[WARNING] This will completely wipe all database volume data" -ForegroundColor Red
        Write-Host "and recreate tables with fresh seed data from db/run_all.sql!" -ForegroundColor Red
        $confirm = Read-Host "Are you sure you want to reset? (y/N)"
        if ($confirm -match "^[yY]$") {
            Write-Host ""
            Write-Host "[INFO] Resetting database volume and rebuilding..." -ForegroundColor Cyan
            docker compose down -v
            docker compose up -d --build
            Write-Host ""
            Write-Host "Database reset complete and services restarted!" -ForegroundColor Green
        } else {
            Write-Host "Reset cancelled." -ForegroundColor Yellow
        }
    }
    "6" {
        Write-Host ""
        Write-Host "[INFO] Container Status:" -ForegroundColor Cyan
        docker compose ps
    }
    "7" {
        Write-Host "Exiting."
    }
    Default {
        Write-Host "Invalid option. Exiting." -ForegroundColor Red
    }
}
