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

import logging
from contextlib import asynccontextmanager

import asyncpg
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app import db as app_db
from app.config import settings
from app.db import init_db, close_db
from app.schema_check import FIX_COMMAND, missing_schema_objects, out_of_date_body
from app.routers import auth, rooms, guests, bookings, services, billing, reports, admin, branches


# ── Lifespan (startup / shutdown) ────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manages application lifecycle events:
    - On startup: initialise the asyncpg connection pool and check the
      schema is current (ISSUE-15). A stale DB is logged loudly but does not
      stop the server, so /api/health can report it.
    - On shutdown: close all database connections gracefully.
    """
    # --- STARTUP PHASE ---
    await init_db()
    print("Database connection pool initialised")

    async with app_db.pool.acquire() as conn:
        app.state.schema_missing = await missing_schema_objects(conn)
    if app.state.schema_missing:
        lines = "\n".join(f"  {kind}: {', '.join(names)}"
                          for kind, names in app.state.schema_missing.items())
        log.error(
            "\n%s\nDATABASE SCHEMA IS OUT OF DATE: it does not match db/run_all.sql.\n"
            "Missing objects:\n%s\n"
            "Every /api request will return 503 until it is rebuilt. Fix (wipes local data):\n"
            "  %s\n%s", "=" * 72, lines, FIX_COMMAND, "=" * 72,
        )

    # --- APPLICATION RUNNING PHASE ---
    yield

    # --- SHUTDOWN PHASE ---
    await close_db()
    print("Database connection pool closed")


# ── Create App ────────────────────────────────────────────────────────────────

app = FastAPI(
    title="SkyNest API",
    description="Hotel Reservation & Guest Services Management System",
    version="1.0.0",
    lifespan=lifespan,
)


# ── Database Error Handling ───────────────────────────────────────────────────
# Routers catch RaiseError locally to turn business-rule messages into 400/404/409.
# Anything else from Postgres lands here: known classes get a generic 4xx, the
# rest a logged 500. Raw Postgres text is never sent to the client.

log = logging.getLogger("skynest")

# Checked in order, so subclasses (e.g. StringDataRightTruncationError) come
# before their base class (DataError).
_PG_ERROR_MAP = (
    (asyncpg.exceptions.UniqueViolationError,           409, "A record with these details already exists."),
    (asyncpg.exceptions.ExclusionViolationError,        409, "Room is not available for the selected dates."),
    (asyncpg.exceptions.ForeignKeyViolationError,       404, "A referenced record does not exist."),
    (asyncpg.exceptions.CheckViolationError,            422, "The request violates a data rule."),
    (asyncpg.exceptions.NotNullViolationError,          422, "A required field is missing."),
    (asyncpg.exceptions.StringDataRightTruncationError, 422, "A value is too long."),
    (asyncpg.exceptions.NumericValueOutOfRangeError,    422, "A numeric value is out of range."),
    (asyncpg.exceptions.DataError,                      422, "Invalid input."),
)


# A routine, table or object the code expects is not in the DB: the schema is
# older than db/run_all.sql (ISSUE-15). 503 tells the caller it's not their input.
_PG_SCHEMA_ERRORS = (
    asyncpg.exceptions.UndefinedFunctionError,
    asyncpg.exceptions.UndefinedTableError,
    asyncpg.exceptions.UndefinedObjectError,
)
SCHEMA_OUT_OF_DATE_DETAIL = "The database is out of date. Ask the system admin to rebuild it."


@app.exception_handler(asyncpg.PostgresError)
async def postgres_error_handler(request: Request, exc: asyncpg.PostgresError):
    if isinstance(exc, _PG_SCHEMA_ERRORS):
        log.error("Database schema is out of date; rebuild with run_all.sql (%s). "
                  "%s on %s %s: %s", FIX_COMMAND, type(exc).__name__,
                  request.method, request.url.path, exc)
        return JSONResponse(status_code=503, content={"detail": SCHEMA_OUT_OF_DATE_DETAIL})
    for cls, code, message in _PG_ERROR_MAP:
        if isinstance(exc, cls):
            log.warning("%s on %s %s: %s", type(exc).__name__,
                        request.method, request.url.path, exc)
            return JSONResponse(status_code=code, content={"detail": message})
    log.error("Unhandled database error on %s %s",
              request.method, request.url.path, exc_info=exc)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    log.warning("ValueError on %s %s: %s", request.method, request.url.path, exc)
    return JSONResponse(status_code=422, content={"detail": "Invalid input."})


# ── Stale Schema Guard ────────────────────────────────────────────────────────
# Decision (ISSUE-15): while the startup check finds missing objects, every
# /api request except /api/health gets the same clear 503, rather than most
# pages working and one button failing with a 500. Registered before CORS so
# the 503 still carries CORS headers.

@app.middleware("http")
async def stale_schema_guard(request: Request, call_next):
    missing = getattr(request.app.state, "schema_missing", None)
    path = request.url.path
    if missing and path.startswith("/api/") and path != "/api/health":
        return JSONResponse(status_code=503, content={"detail": SCHEMA_OUT_OF_DATE_DETAIL})
    return await call_next(request)


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
app.include_router(branches.router, prefix="/api/branches", tags=["Branches"])
app.include_router(rooms.router,    prefix="/api/rooms",    tags=["Rooms"])
app.include_router(guests.router,   prefix="/api/guests",   tags=["Guests"])
app.include_router(bookings.router, prefix="/api/bookings", tags=["Bookings"])
app.include_router(services.router, prefix="/api/services", tags=["Services"])
app.include_router(billing.router,  prefix="/api/billing",  tags=["Billing"])
app.include_router(billing.payments_router, prefix="/api/payments", tags=["Payments"])
app.include_router(reports.router,  prefix="/api/reports",  tags=["Reports"])
app.include_router(admin.router,    prefix="/api/admin",    tags=["Admin"])


# ── Root Health Check ─────────────────────────────────────────────────────────

@app.get("/", tags=["Health"])
async def health_check():
    """Simple health check — returns OK if the server is running."""
    return {"status": "ok", "service": "SkyNest API"}


@app.get("/api/health", tags=["Health"])
async def api_health(request: Request):
    """
    Readiness: 200 when the DB schema has every object the API needs,
    503 with the missing objects and the fix command when it is stale.
    """
    missing = getattr(request.app.state, "schema_missing", None)
    if missing:
        return JSONResponse(status_code=503, content=out_of_date_body(missing))
    return {"status": "ok"}
