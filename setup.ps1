# SkyNest Localhost Development Setup (PowerShell)

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  SkyNest Localhost Development Setup" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Backend Environment File
Write-Host "[1/5] Checking backend/.env..."
if (-not (Test-Path "backend\.env")) {
    Write-Host "      Creating backend\.env from .env.example..." -ForegroundColor Yellow
    Copy-Item "backend\.env.example" "backend\.env"
} else {
    Write-Host "      backend\.env already exists." -ForegroundColor Green
}

# 2. Frontend Environment File
Write-Host "[2/5] Checking frontend/.env..."
if (-not (Test-Path "frontend\.env")) {
    Write-Host "      Creating frontend\.env from .env.example..." -ForegroundColor Yellow
    Copy-Item "frontend\.env.example" "frontend\.env"
} else {
    Write-Host "      frontend\.env already exists." -ForegroundColor Green
}

# 3. Python Virtual Environment
Write-Host "[3/5] Setting up Python virtual environment (backend\.venv)..."
if (-not (Test-Path "backend\.venv")) {
    Write-Host "      Creating virtual environment..." -ForegroundColor Yellow
    python -m venv backend\.venv
} else {
    Write-Host "      backend\.venv already exists." -ForegroundColor Green
}

# 4. Backend Dependencies
Write-Host "[4/5] Installing backend dependencies..."
& "backend\.venv\Scripts\python.exe" -m pip install --upgrade pip
& "backend\.venv\Scripts\pip.exe" install -r "backend\requirements.txt"

# 5. Frontend Dependencies
Write-Host "[5/5] Installing frontend dependencies (npm install)..."
Push-Location frontend
npm install
Pop-Location

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Common Setup Complete!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

$setupDb = Read-Host "Would you like to run the database setup scripts now? (y/N)"
if ($setupDb -match "^[yY]$") {
    Write-Host ""
    Write-Host "Running db/setup_db.sql (Enter your postgres password when prompted)..." -ForegroundColor Yellow
    psql -U postgres -f db/setup_db.sql
    Write-Host ""
    Write-Host "Running db/run_all.sql with skynest_user (Password: skynest_dev_pass)..." -ForegroundColor Yellow
    Push-Location db
    psql -h localhost -U skynest_user -d skynest -f run_all.sql
    Pop-Location
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Ready to Run SkyNest!" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Start Backend:"
Write-Host "    cd backend"
Write-Host "    .venv\Scripts\Activate.ps1"
Write-Host "    uvicorn app.main:app --reload"
Write-Host ""
Write-Host "  Start Frontend (in a new terminal):"
Write-Host "    cd frontend"
Write-Host "    npm run dev"
Write-Host "============================================================" -ForegroundColor Cyan
