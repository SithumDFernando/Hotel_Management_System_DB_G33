"""
backend/app/schemas/booking.py
===============================
Purpose:
    Pydantic models for booking-related request validation and response
    serialisation. Used by `routers/bookings.py`.

Models to implement:

    class BookingCreate(BaseModel):
        \"\"\"Validated request body for POST /api/bookings.\"\"\"
        guest_id:       UUID
        room_id:        UUID
        check_in_date:  date
        check_out_date: date
        payment_option: str

        @model_validator(mode="after")
        def checkout_after_checkin(self):
            if self.check_out_date <= self.check_in_date:
                raise ValueError("check_out_date must be after check_in_date")
            return self

    class BookingStatusUpdate(BaseModel):
        \"\"\"Used for PATCH /cancel — optionally accept a reason.\"\"\"
        reason: str | None = None

    class BookingOut(BaseModel):
        \"\"\"Full booking response including joined guest/room info.\"\"\"
        booking_id:           UUID
        guest_id:             UUID
        room_id:              UUID
        check_in_date:        date
        check_out_date:       date
        rate_at_booking:      float
        status:               str    # booking_status enum value
        payment_option:       str
        actual_checkin_time:  datetime | None = None
        actual_checkout_time: datetime | None = None

        class Config:
            from_attributes = True

    # Tip: For nested response (with guest + room details embedded),
    # define BookingDetail(BookingOut) that includes GuestOut and RoomOut.

Database table mapped:
    booking
"""

# TODO: Implement booking schemas
