"""
backend/app/routers/bookings.py
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Optional
import asyncpg

from app.db import get_db
from app.dependencies import require_role
from app.schemas.booking import (
    BookingCreate, BookingOut, BookingListOut, 
    BookingListResponse, GuestInfo, RoomInfo
)

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


# GET /api/bookings
@router.get("", response_model=BookingListResponse)
async def list_bookings(
    db=Depends(get_db),
    user: dict = Depends(require_role("receptionist", "manager", "admin", "guest")),
    booking_status: str | None = Query(None, alias="status", description="Filter by status"),
    branch_id: str | None = Query(None, description="Filter by branch UUID"),
    guest_id: str | None = Query(None, description="Filter by guest UUID"),
    room_id: str | None = Query(None, description="Filter by room UUID"),
    from_date: str | None = Query(None, alias="from", description="Check-out >= this date"),
    to_date: str | None = Query(None, alias="to", description="Check-in <= this date"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page")
):
    conditions = []
    params = []
    param_idx = 0

    user_role = user["role"]

    if user_role == "guest":
        param_idx += 1
        conditions.append(f"b.guest_id = ${param_idx}::UUID")
        params.append(str(user.get("guest_id")))
    elif user_role in ["manager", "receptionist"]:
        param_idx += 1
        conditions.append(f"r.branch_id = ${param_idx}::UUID")
        params.append(str(user.get("branch_id")))

    if booking_status:
        param_idx += 1
        conditions.append(f"b.status = ${param_idx}::VARCHAR")
        params.append(booking_status)

    if branch_id and user_role == "admin":
        param_idx += 1
        conditions.append(f"r.branch_id = ${param_idx}::UUID")
        params.append(str(branch_id))

    if guest_id and user_role != "guest":
        param_idx += 1
        conditions.append(f"b.guest_id = ${param_idx}::UUID")
        params.append(str(guest_id))

    if room_id:
        param_idx += 1
        conditions.append(f"b.room_id = ${param_idx}::UUID")
        params.append(str(room_id))

    if from_date:
        param_idx += 1
        conditions.append(f"b.check_out_date >= ${param_idx}::DATE")
        params.append(from_date)

    if to_date:
        param_idx += 1
        conditions.append(f"b.check_in_date <= ${param_idx}::DATE")
        params.append(to_date)

    where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""

    # Count total matching rows for pagination
    count_query = f"""
        SELECT COUNT(*)
        FROM booking b
        JOIN room r ON r.room_id = b.room_id
        {where_clause}
    """
    total = await db.fetchval(count_query, *params)
    
    # Pagination
    offset = (page - 1) * per_page
    limit_params = [per_page, offset]
    limit_clause = f"LIMIT ${param_idx + 1} OFFSET ${param_idx + 2}"
    
    query = f"""
        SELECT b.booking_id, b.check_in_date, b.check_out_date, b.rate_at_booking, b.status, b.payment_option,
               g.guest_id, g.full_name,
               r.room_id, r.room_number,
               br.name AS branch_name
        FROM booking b
        JOIN guest g ON g.guest_id = b.guest_id
        JOIN room r ON r.room_id = b.room_id
        JOIN branch br ON br.branch_id = r.branch_id
        {where_clause}
        ORDER BY b.check_in_date DESC
        {limit_clause}
    """
    
    rows = await db.fetch(query, *(params + limit_params))
    
    bookings = []
    for row in rows:
        bookings.append(BookingListOut(
            booking_id=row["booking_id"],
            guest=GuestInfo(guest_id=row["guest_id"], full_name=row["full_name"]),
            room=RoomInfo(room_id=row["room_id"], room_number=row["room_number"], branch_name=row["branch_name"]),
            check_in_date=row["check_in_date"],
            check_out_date=row["check_out_date"],
            rate_at_booking=float(row["rate_at_booking"]),
            status=row["status"],
            payment_option=row["payment_option"]
        ))
        
    return BookingListResponse(bookings=bookings, total=total, page=page, per_page=per_page)
