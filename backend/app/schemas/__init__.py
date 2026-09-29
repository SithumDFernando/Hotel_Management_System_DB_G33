"""
backend/app/schemas/__init__.py
================================
Purpose:
    Marks the `schemas/` directory as a Python package and optionally
    re-exports Pydantic model classes for convenient imports in routers.

    Pydantic schemas serve two roles:
      1. Request validation  — FastAPI automatically validates the request
         body against the schema and returns a 422 error if it fails.
      2. Response serialisation — the `response_model` parameter on route
         decorators uses the schema to filter and serialise the output,
         preventing accidental exposure of sensitive fields (e.g. password_hash).

What to implement here (optional re-exports):
    from app.schemas.guest   import GuestCreate, GuestUpdate, GuestOut
    from app.schemas.booking import BookingCreate, BookingOut
    from app.schemas.billing import BillOut, PaymentCreate, PaymentOut

    __all__ = [
        "GuestCreate", "GuestUpdate", "GuestOut",
        "BookingCreate", "BookingOut",
        "BillOut", "PaymentCreate", "PaymentOut",
    ]
"""

# Package marker — optionally re-export schemas here
