"""
backend/app/main.py
===================
Purpose:
    Entry point for the SkyNest FastAPI application.
    Creates the app, configures CORS, registers all routers, and manages
    the database connection pool lifecycle via the lifespan context manager.

Run with:
    cd backend
    uvicorn app.main:app --reload --port 8000
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db import init_db, close_db
from app.routers import auth, rooms, guests, bookings, services, billing, reports, admin


# ── Lifespan (startup / shutdown) ────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manages application lifecycle events:
    - On startup: initialise the asyncpg connection pool.
    - On shutdown: close all database connections gracefully.
    """
    await init_db()
    print("✅ Database connection pool initialised")
    yield
    await close_db()
    print("🛑 Database connection pool closed")


# ── Create App ────────────────────────────────────────────────────────────────

app = FastAPI(
    title="SkyNest API",
    description="Hotel Reservation & Guest Services Management System",
    version="1.0.0",
    lifespan=lifespan,
)


# ── CORS Middleware ───────────────────────────────────────────────────────────
# Allow the React frontend (Vite dev server) to make cross-origin requests.

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Register Routers ─────────────────────────────────────────────────────────
# Each router is mounted with a /api prefix and a descriptive tag for the
# auto-generated Swagger UI at http://localhost:8000/docs

app.include_router(auth.router,     prefix="/api/auth",     tags=["Auth"])
app.include_router(rooms.router,    prefix="/api/rooms",    tags=["Rooms"])
app.include_router(guests.router,   prefix="/api/guests",   tags=["Guests"])
app.include_router(bookings.router, prefix="/api/bookings", tags=["Bookings"])
app.include_router(services.router, prefix="/api/services", tags=["Services"])
app.include_router(billing.router,  prefix="/api/billing",  tags=["Billing"])
app.include_router(reports.router,  prefix="/api/reports",  tags=["Reports"])
app.include_router(admin.router,    prefix="/api/admin",    tags=["Admin"])


# ── Root Health Check ─────────────────────────────────────────────────────────

@app.get("/", tags=["Health"])
async def health_check():
    """Simple health check — returns OK if the server is running."""
    return {"status": "ok", "service": "SkyNest API"}
