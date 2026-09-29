"""
backend/app/main.py
===================
Purpose:
    Entry point for the SkyNest FastAPI application.
    Creates and configures the FastAPI app instance, registers all API
    routers with their URL prefixes, and sets up global middleware such as
    CORS (Cross-Origin Resource Sharing) so the React frontend can call
    the API during development and production.

What to implement here:
    1. Instantiate `FastAPI(title="SkyNest API", version="1.0.0", ...)`.
    2. Add CORS middleware using `fastapi.middleware.cors.CORSMiddleware`.
       Allow the Vite dev server origin (e.g. http://localhost:5173) and
       the production frontend URL (read from config).
    3. Include all routers from `app.routers.*` with appropriate prefixes:
         app.include_router(auth.router,     prefix="/api/auth",     tags=["Auth"])
         app.include_router(rooms.router,    prefix="/api/rooms",    tags=["Rooms"])
         app.include_router(guests.router,   prefix="/api/guests",   tags=["Guests"])
         app.include_router(bookings.router, prefix="/api/bookings", tags=["Bookings"])
         app.include_router(services.router, prefix="/api/services", tags=["Services"])
         app.include_router(billing.router,  prefix="/api/billing",  tags=["Billing"])
         app.include_router(reports.router,  prefix="/api/reports",  tags=["Reports"])
         app.include_router(admin.router,    prefix="/api/admin",    tags=["Admin"])
    4. Add a root health-check endpoint:
         @app.get("/") -> {"status": "ok", "service": "SkyNest API"}
    5. (Optional) Add startup/shutdown event handlers for database pool
       initialisation and cleanup.

Dependencies:
    - app.routers.*  (all router modules)
    - app.config     (settings / environment variables)
    - app.db         (database connection pool initialisation)
"""

# TODO: Implement main.py
