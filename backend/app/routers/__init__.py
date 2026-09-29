"""
backend/app/routers/__init__.py
================================
Purpose:
    Marks the `routers/` directory as a Python package.
    Optionally, you can import all routers here so that `main.py` only
    needs to do `from app.routers import auth, rooms, ...` instead of
    importing each module individually.

What to implement here (optional convenience imports):
    from app.routers import auth, rooms, guests, bookings, services, billing, reports, admin

    __all__ = ["auth", "rooms", "guests", "bookings", "services", "billing", "reports", "admin"]
"""

# Package marker — optionally re-export routers here
