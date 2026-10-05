"""
backend/app/schemas/service.py
==============================
Purpose:
    Pydantic models for service-related request validation and response
    serialisation. These are used by `routers/services.py` to validate
    incoming JSON and shape API responses.

Models to implement:

    class ServiceBase(BaseModel):
        name: str
        category: str
        base_price: Decimal
        description: str | None = None
        is_active: bool = True

    class ServiceCreate(ServiceBase):
        pass

    class ServiceUpdate(BaseModel):
        name: str | None = None
        category: str | None = None
        base_price: Decimal | None = None
        description: str | None = None
        is_active: bool | None = None

    class ServiceOut(ServiceBase):
        service_id: UUID

        class Config:
            from_attributes = True

    class ServiceUsageCreate(BaseModel):
        service_id: UUID
        quantity: int
        notes: str | None = None

    class ServiceUsageOut(BaseModel):
        usage_id: UUID
        booking_id: UUID
        service_id: UUID
        quantity: int
        unit_price: Decimal
        total_price: Decimal
        used_at: datetime
        notes: str | None = None

        class Config:
            from_attributes = True

Database tables mapped:
    service
    service_usage
"""

# TODO: Implement service schemas
