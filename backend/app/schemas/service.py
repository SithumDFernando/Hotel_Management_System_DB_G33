"""
backend/app/schemas/service.py
==============================
Purpose:
    Pydantic models for service-related request validation and response
    serialisation. Used by `routers/services.py` to validate incoming
    JSON and shape API responses.

Database tables mapped:
    service
    service_usage
"""

from datetime import date
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Service catalogue schemas
# ---------------------------------------------------------------------------

class ServiceBase(BaseModel):
    service_name: str
    category: str
    base_price: Decimal
    is_active: bool = True


class ServiceCreate(BaseModel):
    """Payload for POST /api/services."""
    service_name: str   = Field(..., min_length=1, max_length=100)
    category:     str   = Field(..., min_length=1, max_length=50)
    base_price:   Decimal = Field(..., gt=0, description="Price per unit in the hotel's currency")


class ServiceUpdate(BaseModel):
    """Payload for PATCH /api/services/{service_id} — all fields optional."""
    service_name: Optional[str]     = Field(None, min_length=1, max_length=100)
    category:     Optional[str]     = Field(None, min_length=1, max_length=50)
    base_price:   Optional[Decimal] = Field(None, gt=0)
    is_active:    Optional[bool]    = None


class ServiceOut(BaseModel):
    """A single hotel service as returned by the API."""
    service_id:   UUID
    service_name: str
    category:     str
    base_price:   Decimal
    is_active:    bool

    class Config:
        from_attributes = True


class ServiceCategoryGroup(BaseModel):
    """Active services grouped by category for the catalogue display."""
    category: str
    services: list[ServiceOut]


# ---------------------------------------------------------------------------
# Service usage schemas
# ---------------------------------------------------------------------------

class ServiceUsageCreate(BaseModel):
    """Payload for POST /api/services/{booking_id}/usage."""
    service_id: UUID
    usage_date: date
    quantity:   int = Field(..., ge=1, description="Must be at least 1")


class ServiceUsageOut(BaseModel):
    """A single service_usage row joined with its service details."""
    usage_id:     UUID
    service_id:   UUID
    service_name: str
    category:     str
    usage_date:   date
    quantity:     int
    unit_price:   Decimal
    line_total:   Decimal  # quantity × unit_price, computed at response time

    class Config:
        from_attributes = True


class ServiceUsageSummary(BaseModel):
    """Full usage list for a booking plus an aggregate total."""
    booking_id:  UUID
    usages:      list[ServiceUsageOut]
    grand_total: Decimal
