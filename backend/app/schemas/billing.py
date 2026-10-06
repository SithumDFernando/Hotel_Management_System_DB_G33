"""
Pydantic models for the billing & payments endpoints.

Money fields use Decimal (not float) so values stay exact, matching the
NUMERIC(10,2) columns in the database.
"""

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator
from uuid import UUID


class BillOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    bill_id: str
    booking_id: str
    room_charges: Decimal
    service_charges: Decimal
    discount_amount: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    amount_paid: Decimal
    outstanding_balance: Decimal
    balance_flag: bool  # True = money still owed
    generated_at: datetime


class PaymentCreate(BaseModel):
    booking_id: UUID
    amount: Decimal
    payment_method: str = Field(..., min_length=1, max_length=50)
    notes: str | None = Field(None, max_length=255)

    @field_validator("amount")
    @classmethod
    def amount_must_be_valid(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("amount must be greater than 0")
        if v.as_tuple().exponent < -2:
            raise ValueError("amount can have at most 2 decimal places")
        if v >= Decimal("100000000"):
            raise ValueError("amount is too large")
        return v


class PaymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    payment_id: str
    booking_id: str
    amount: Decimal
    payment_method: str
    paid_at: datetime
    notes: str | None = None