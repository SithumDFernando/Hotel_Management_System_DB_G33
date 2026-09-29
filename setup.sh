#!/usr/bin/env bash
set -e

echo "============================================================"
echo "  SkyNest Localhost Development Setup"
echo "============================================================"
echo ""

# 1. Backend Environment File
echo "[1/5] Checking backend/.env..."
if [ ! -f "backend/.env" ]; then
    echo "      Creating backend/.env from .env.example..."
    cp backend/.env.example backend/.env
else
    echo "      backend/.env already exists."
fi

# 2. Frontend Environment File
echo "[2/5] Checking frontend/.env..."
if [ ! -f "frontend/.env" ]; then
    echo "      Creating frontend/.env from .env.example..."
    cp frontend/.env.example frontend/.env
else
    echo "      frontend/.env already exists."
fi

# 3. Python Virtual Environment
echo "[3/5] Setting up Python virtual environment (backend/.venv)..."
if [ ! -d "backend/.venv" ]; then
    echo "      Creating virtual environment..."
    python3 -m venv backend/.venv
else
    echo "      backend/.venv already exists."
fi

# 4. Backend Dependencies
echo "[4/5] Installing backend dependencies..."
backend/.venv/bin/python -m pip install --upgrade pip
backend/.venv/bin/pip install -r backend/requirements.txt

# 5. Frontend Dependencies
echo "[5/5] Installing frontend dependencies (npm install)..."
(cd frontend && npm install)

echo ""
echo "============================================================"
echo "  Common Setup Complete!"
echo "============================================================"
echo ""

read -p "Would you like to run the database setup scripts now? (y/N): " -r SETUP_DB
if [[ $SETUP_DB =~ ^[Yy]$ ]]; then
    echo ""
    echo "Running db/setup_db.sql (Enter your postgres password when prompted)..."
    psql -U postgres -f db/setup_db.sql
    echo ""
    echo "Running db/run_all.sql with skynest_user (Password: skynest_dev_pass)..."
    (cd db && psql -h localhost -U skynest_user -d skynest -f run_all.sql)
fi

echo ""
echo "============================================================"
echo "  Ready to Run SkyNest!"
echo "============================================================"
echo "  Start Backend:"
echo "    cd backend"
echo "    source .venv/bin/activate"
echo "    uvicorn app.main:app --reload"
echo ""
echo "  Start Frontend (in a new terminal):"
echo "    cd frontend"
echo "    npm run dev"
echo "============================================================"
