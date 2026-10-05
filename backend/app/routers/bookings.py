"""
backend/app/routers/bookings.py
"""

from fastapi import APIRouter, Depends, HTTPException, status
import asyncpg

from app.db import get_db
from app.dependencies import require_role
from app.schemas.booking import BookingCreate, BookingOut

router = APIRouter()

# POST /api/bookings
@router.post("", response_model=BookingOut, status_code=status.HTTP_201_CREATED)
async def create_booking(
    body: BookingCreate,
    db=Depends(get_db),
    user: dict = Depends(require_role("receptionist", "manager", "admin", "guest"))
):
    if user["role"] == "guest" and str(body.guest_id) != str(user.get("guest_id")):
        raise HTTPException(status_code=403, detail="Guests can only create bookings for themselves")

    try:
        # Calls the stored procedure.
        result = await db.fetchrow(
            "CALL create_booking($1::UUID, $2::UUID, $3::DATE, $4::DATE, $5::VARCHAR, NULL)",
            str(body.guest_id), str(body.room_id), body.check_in_date, body.check_out_date, body.payment_option
        )
        if not result or "p_booking_id" not in result:
             raise HTTPException(status_code=500, detail="Failed to create booking")
        booking_id = result["p_booking_id"]
        
        # Fetch the created booking
        booking = await db.fetchrow(
            "SELECT * FROM booking WHERE booking_id = $1",
            booking_id
        )
        return BookingOut(**dict(booking))
        
    except asyncpg.exceptions.RaiseError as e:
        msg = str(e)
        if "already booked" in msg or "Double booking" in msg or "not available" in msg:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=msg)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)
