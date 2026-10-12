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
from typing import Annotated, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field, model_validator

from app.schemas.fields import NormEmail


# Input limits mirror the guest table in db/schema/01_tables.sql.
# GuestOut keeps plain str so existing rows always serialise.
FullName      = Annotated[str, Field(min_length=2, max_length=150)]
NicPassport   = Annotated[str, Field(min_length=4, max_length=20)]
GuestEmail    = NormEmail  # trimmed + lower-cased, max 100 (app/schemas/fields.py)
Phone         = Annotated[str, Field(min_length=7, max_length=20)]
Nationality   = Annotated[str, Field(max_length=50)]
Gender        = Annotated[str, Field(max_length=10)]
CompanyName   = Annotated[str, Field(max_length=150)]
CompanyRegNo  = Annotated[str, Field(max_length=50)]
ContactName   = Annotated[str, Field(max_length=150)]


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

    full_name:            FullName
    nic_passport:         NicPassport
    email:                GuestEmail
    phone:                Phone
    nationality:          Optional[Nationality]  = None
    gender:               Optional[Gender]       = None
    company_name:         Optional[CompanyName]  = None
    company_reg_number:   Optional[CompanyRegNo] = None
    billing_contact_name: Optional[ContactName]  = None


# ---------------------------------------------------------------------------
# Update  (all fields optional for partial / PATCH semantics)
# ---------------------------------------------------------------------------

class GuestUpdate(BaseModel):
    """Payload for PUT/PATCH /guests/{id} — every field is optional."""

    full_name:            Optional[FullName]     = None
    nic_passport:         Optional[NicPassport]  = None
    email:                Optional[GuestEmail]   = None
    phone:                Optional[Phone]        = None
    date_of_birth:        Optional[date]         = None
    nationality:          Optional[Nationality]  = None
    gender:               Optional[Gender]       = None
    guest_type:           Optional[Literal["Individual", "Corporate"]] = None
    company_name:         Optional[CompanyName]  = None
    company_reg_number:   Optional[CompanyRegNo] = None
    billing_contact_name: Optional[ContactName]  = None

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


# Booking history embedded in GET /guests/{guest_id}
class BookingSummary(BaseModel):
    booking_id: UUID
    room_id: UUID
    room_number: str
    check_in_date: date
    check_out_date: date
    rate_at_booking: float
    status: str
    payment_option: str
    actual_checkin_time: Optional[str] = None
    actual_checkout_time: Optional[str] = None


class GuestDetailOut(GuestOut):
    """Full guest profile including their booking history."""
    bookings: list[BookingSummary] = []
