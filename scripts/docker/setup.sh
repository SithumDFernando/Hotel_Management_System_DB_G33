#!/usr/bin/env bash
set -e

# Ensure executing from project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/docker-compose.yml" ]; then
    cd "$SCRIPT_DIR"
elif [ -f "$SCRIPT_DIR/../../docker-compose.yml" ]; then
    cd "$SCRIPT_DIR/../.."
fi

echo "============================================================"
echo "  SkyNest Hotel Management System - Docker Environment"
echo "============================================================"
echo ""

# 1. Verify Docker Installation
if ! command -v docker &> /dev/null; then
    echo "[ERROR] Docker is not installed or not in your PATH."
    echo "Please install Docker Desktop: https://www.docker.com/products/docker-desktop/"
    echo "(To run without Docker, use native scripts in scripts/native/)"
    echo ""
    exit 1
fi

# 2. Verify Docker Daemon is Running
if ! docker info &> /dev/null; then
    echo "[WARNING] Docker daemon is not running!"
    echo "Please start Docker Desktop and wait until it is ready."
    echo ""
    read -p "Press Enter to retry, or type 'q' to quit: " -r RETRY_DOCKER
    if [[ "$RETRY_DOCKER" =~ ^[qQ]$ ]]; then
        exit 1
    fi
    if ! docker info &> /dev/null; then
        echo "[ERROR] Docker daemon is still unavailable. Exiting."
        exit 1
    fi
fi

# 3. Check Environment Files
echo "[INFO] Checking environment configuration files..."
if [ ! -f ".env" ]; then
    echo "      Creating root .env from .env.example..."
    cp .env.example .env
else
    echo "      Root .env already exists."
fi

if [ ! -f "backend/.env" ]; then
    echo "      Creating backend/.env from backend/.env.example..."
    cp backend/.env.example backend/.env
fi

if [ ! -f "frontend/.env" ]; then
    echo "      Creating frontend/.env from frontend/.env.example..."
    cp frontend/.env.example frontend/.env
fi

echo ""
echo "============================================================"
echo "  Choose an action:"
echo "============================================================"
echo "  [1] Build and start SkyNest (Background - Recommended)"
echo "  [2] Build and start SkyNest (Foreground / Live Output)"
echo "  [3] View logs (Follow live)"
echo "  [4] Stop all running containers"
echo "  [5] Reset Database (wipe volumes and re-seed from scratch)"
echo "  [6] Show container status (docker compose ps)"
echo "  [7] Exit"
echo "============================================================"
echo ""

read -p "Enter option [1-7] (Default: 1): " -r CHOICE
CHOICE="${CHOICE:-1}"

case "$CHOICE" in
    1)
        echo ""
        echo "[INFO] Building and starting all containers in background..."
        docker compose up -d --build
        echo ""
        echo "============================================================"
        echo "  SkyNest is running!"
        echo "============================================================"
        echo "  Web App (Frontend) : http://localhost:8080"
        echo "  API Docs (Swagger) : http://localhost:8000/docs"
        echo "  pgAdmin Interface  : http://localhost:5050"
        echo "  PostgreSQL Host    : localhost:5432 (skynest_user / skynest_dev_pass)"
        echo ""
        echo "  Demo Accounts:"
        echo "    - Admin        : admin@skynest.lk       (SkyNest@2026)"
        echo "    - Manager      : mgr.colombo@skynest.lk (SkyNest@2026)"
        echo "    - Receptionist : rec.colombo@skynest.lk (SkyNest@2026)"
        echo "    - Guest        : kamal@mail.com         (SkyNest@2026)"
        echo "============================================================"
        echo "  Helpful commands:"
        echo "    - View logs : docker compose logs -f"
        echo "    - Stop      : docker compose down"
        echo "============================================================"
        ;;
    2)
        echo ""
        echo "[INFO] Building and starting all containers in foreground..."
        echo "Press Ctrl+C at any time to stop."
        docker compose up --build
        ;;
    3)
        echo ""
        echo "[INFO] Following Docker logs (Ctrl+C to exit)..."
        docker compose logs -f
        ;;
    4)
        echo ""
        echo "[INFO] Stopping SkyNest containers..."
        docker compose down
        echo "Containers stopped."
        ;;
    5)
        echo ""
        echo "[WARNING] This will completely wipe all database volume data"
        echo "and recreate tables with fresh seed data from db/run_all.sql!"
        read -p "Are you sure you want to reset? (y/N): " -r CONFIRM_RESET
        if [[ "$CONFIRM_RESET" =~ ^[Yy]$ ]]; then
            echo ""
            echo "[INFO] Resetting database volume and rebuilding..."
            docker compose down -v
            docker compose up -d --build
            echo "Database reset complete and services restarted!"
        else
            echo "Reset cancelled."
        fi
        ;;
    6)
        echo ""
        echo "[INFO] Container Status:"
        docker compose ps
        ;;
    7)
        echo "Exiting."
        ;;
    *)
        echo "Invalid option. Exiting."
        ;;
esac
