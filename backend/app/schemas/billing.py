"""
backend/app/schemas/billing.py
===============================
Purpose:
    Pydantic models for bill and payment-related request validation and
    response serialisation. Used by `routers/billing.py`.

Models to implement:

    class BillOut(BaseModel):
        \"\"\"Response model for a generated bill (GET /api/billing/{booking_id}).\"\"\"
        bill_id:             UUID
        booking_id:          UUID
        room_charges:        float
        service_charges:     float
        discount_amount:     float
        tax_amount:          float
        total_amount:        float
        amount_paid:         float
        outstanding_balance: float
        balance_flag:        bool   # True = there is an outstanding balance
        generated_at:        datetime

        class Config:
            from_attributes = True

    class PaymentCreate(BaseModel):
        \"\"\"Request body for POST /api/payments.\"\"\"
        booking_id:     UUID
        amount:         float
        payment_method: str   # e.g. "Cash", "Card", "Bank Transfer"
        notes:          str | None = None

        @validator("amount")
        def amount_must_be_positive(cls, v):
            if v <= 0:
                raise ValueError("Payment amount must be greater than 0")
            return v

    class PaymentOut(BaseModel):
        \"\"\"Response model for a payment transaction.\"\"\"
        payment_id:     UUID
        booking_id:     UUID
        amount:         float
        payment_method: str
        paid_at:        datetime
        notes:          str | None = None

        class Config:
            from_attributes = True

Database tables mapped:
    bill, payment
"""

# TODO: Implement billing schemas
