"""
backend/app/schemas/guest.py
=============================
Purpose:
    Pydantic models for guest-related request validation and response
    serialisation. These are used by `routers/guests.py` to validate
    incoming JSON and shape API responses.

Database table mapped:
    guest
"""

from __future__ import annotations

from datetime import date
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, model_validator


# ---------------------------------------------------------------------------
# Base
# ---------------------------------------------------------------------------

class GuestBase(BaseModel):
    """Shared fields used by create and update models."""

    full_name:            str
    nic_passport:         str
    email:                str
    phone:                str
    date_of_birth:        Optional[date]  = None
    nationality:          Optional[str]   = None
    gender:               Optional[str]   = None
    guest_type:           Literal["Individual", "Corporate"] = "Individual"
    company_name:         Optional[str]   = None
    company_reg_number:   Optional[str]   = None
    billing_contact_name: Optional[str]   = None

    @model_validator(mode="after")
    def corporate_must_have_company(self) -> "GuestBase":
        """Corporate guests must supply a company_name."""
        if self.guest_type == "Corporate" and not self.company_name:
            raise ValueError("company_name is required for Corporate guests")
        return self


# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------

class GuestCreate(GuestBase):
    """Payload for POST /guests — all required base fields must be present."""
    pass


# ---------------------------------------------------------------------------
# Update  (all fields optional for partial / PATCH semantics)
# ---------------------------------------------------------------------------

class GuestUpdate(BaseModel):
    """Payload for PUT/PATCH /guests/{id} — every field is optional."""

    full_name:            Optional[str]   = None
    nic_passport:         Optional[str]   = None
    email:                Optional[str]   = None
    phone:                Optional[str]   = None
    date_of_birth:        Optional[date]  = None
    nationality:          Optional[str]   = None
    gender:               Optional[str]   = None
    guest_type:           Optional[Literal["Individual", "Corporate"]] = None
    company_name:         Optional[str]   = None
    company_reg_number:   Optional[str]   = None
    billing_contact_name: Optional[str]   = None

    @model_validator(mode="after")
    def corporate_must_have_company(self) -> "GuestUpdate":
        """If guest_type is being updated to Corporate, company_name must also be supplied."""
        if self.guest_type == "Corporate" and not self.company_name:
            raise ValueError(
                "company_name is required when updating guest_type to Corporate"
            )
        return self


# ---------------------------------------------------------------------------
# Response / Out
# ---------------------------------------------------------------------------

class GuestOut(GuestBase):
    """Response model returned by the API — includes the DB-generated guest_id."""

    guest_id: UUID

    class Config:
        from_attributes = True  # Enables mapping from asyncpg Record / ORM objects
