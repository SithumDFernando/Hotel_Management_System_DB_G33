from pydantic import BaseModel, model_validator
from uuid import UUID
from datetime import date, datetime

class BookingCreate(BaseModel):
    """Validated request body for POST /api/bookings."""
    guest_id: UUID
    room_id: UUID
    check_in_date: date
    check_out_date: date
    payment_option: str

    @model_validator(mode="after")
    def checkout_after_checkin(self):
        if self.check_out_date <= self.check_in_date:
            raise ValueError("check_out_date must be after check_in_date")
        return self

class BookingStatusUpdate(BaseModel):
    """Used for PATCH /cancel — optionally accept a reason."""
    reason: str | None = None

class BookingOut(BaseModel):
    """Full booking response."""
    booking_id: UUID
    guest_id: UUID
    room_id: UUID
    check_in_date: date
    check_out_date: date
    rate_at_booking: float
    status: str
    payment_option: str
    actual_checkin_time: datetime | None = None
    actual_checkout_time: datetime | None = None

    class Config:
        from_attributes = True

class GuestInfo(BaseModel):
    guest_id: UUID
    full_name: str

class RoomInfo(BaseModel):
    room_id: UUID
    room_number: str
    branch_name: str

class BookingListOut(BaseModel):
    booking_id: UUID
    guest: GuestInfo
    room: RoomInfo
    check_in_date: date
    check_out_date: date
    rate_at_booking: float
    status: str
    payment_option: str

class BookingListResponse(BaseModel):
    bookings: list[BookingListOut]
    total: int
    page: int
    per_page: int

class BookingDetailOut(BookingListOut):
    """Full booking details with nested guest/room and timestamps."""
    actual_checkin_time: datetime | None = None
    actual_checkout_time: datetime | None = None

class BookingCheckInResponse(BaseModel):
    booking_id: UUID
    status: str
    actual_checkin_time: datetime | None = None
