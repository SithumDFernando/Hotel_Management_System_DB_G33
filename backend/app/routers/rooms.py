"""
backend/app/routers/rooms.py
=============================
★ GOLDEN TEMPLATE ROUTER ★
──────────────────────────
This router is a complete, working reference implementation that demonstrates
every pattern your teammates need to build their own routers:

    1. How to define Pydantic request/response models.
    2. How to get a DB connection via Depends(get_db).
    3. How to execute SQL queries with await db.fetch(...).
    4. How to use require_role() for protected endpoints.
    5. How to raise HTTPException for errors.
    6. How to handle optional query parameters for filtering.

Endpoints:
    GET  /api/rooms              — Public. List/search rooms with filters.
    GET  /api/rooms/{room_id}    — Public. Get full details for one room.
    PATCH /api/rooms/{room_id}/status — Admin/Manager. Change room status.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.db import get_db
from app.dependencies import require_role

router = APIRouter()


# ─────────────────────────────────────────────────────────────────────────────
# Pydantic Models (Response Schemas)
# ─────────────────────────────────────────────────────────────────────────────
# These define the shape of JSON responses. FastAPI uses them to:
# - Validate outgoing data
# - Generate the OpenAPI/Swagger documentation automatically

class BranchInfo(BaseModel):
    branch_id: str
    name: str
    city: str


class RoomTypeInfo(BaseModel):
    room_type_id: str
    type_name: str
    capacity: int


class AmenityInfo(BaseModel):
    amenity_name: str
    amenity_type: str
    count: int


class RoomOut(BaseModel):
    room_id: str
    room_number: str
    branch: BranchInfo
    room_type: RoomTypeInfo
    daily_rate: float
    status: str
    amenities: list[AmenityInfo] = []


class RoomListResponse(BaseModel):
    rooms: list[RoomOut]
    total: int


class StatusUpdateRequest(BaseModel):
    status: str  # "Available", "Occupied", or "Maintenance"


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/rooms — List rooms with optional filters
# ─────────────────────────────────────────────────────────────────────────────

@router.get("", response_model=RoomListResponse)
async def list_rooms(
    db=Depends(get_db),
    branch_id: str | None = Query(None, description="Filter by branch UUID"),
    room_type: str | None = Query(None, description="Filter by room type name"),
    room_status: str | None = Query(None, alias="status", description="Filter by status"),
    check_in: str | None = Query(None, description="Availability check: start date YYYY-MM-DD"),
    check_out: str | None = Query(None, description="Availability check: end date YYYY-MM-DD"),
):
    """
    List all rooms with optional filters.
    If check_in + check_out are provided, excludes rooms with overlapping
    active bookings (anti-join) — effectively an availability search.
    """
    # Build the query dynamically based on provided filters
    conditions = []
    params = []
    param_idx = 0

    if branch_id:
        param_idx += 1
        conditions.append(f"r.branch_id = ${param_idx}::UUID")
        params.append(branch_id)

    if room_type:
        param_idx += 1
        conditions.append(f"rt.type_name = ${param_idx}")
        params.append(room_type)

    if room_status:
        param_idx += 1
        conditions.append(f"r.status = ${param_idx}::room_status")
        params.append(room_status)

    # Availability filter: exclude rooms that have overlapping active bookings
    if check_in and check_out:
        param_idx += 1
        ci_idx = param_idx
        param_idx += 1
        co_idx = param_idx
        conditions.append(f"""
            NOT EXISTS (
                SELECT 1 FROM booking b
                WHERE b.room_id = r.room_id
                  AND b.status IN ('Booked', 'Checked-In')
                  AND b.check_in_date < ${co_idx}::DATE
                  AND b.check_out_date > ${ci_idx}::DATE
            )
        """)
        params.append(check_in)
        params.append(check_out)

    where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""

    query = f"""
        SELECT r.room_id, r.room_number, r.status,
               b.branch_id, b.name AS branch_name, b.city,
               rt.room_type_id, rt.type_name, rt.capacity,
               COALESCE(rr.daily_rate, 0) AS daily_rate
        FROM room r
        JOIN branch b ON b.branch_id = r.branch_id
        JOIN room_type rt ON rt.room_type_id = r.room_type_id
        LEFT JOIN room_rate rr ON rr.branch_id = r.branch_id
                              AND rr.room_type_id = r.room_type_id
        {where_clause}
        ORDER BY b.name, r.room_number
    """

    rows = await db.fetch(query, *params)

    # Build response with amenities for each room
    rooms = []
    for row in rows:
        # Fetch amenities for this room type
        amenities = await db.fetch(
            """
            SELECT a.amenity_name, a.amenity_type, ra.count
            FROM room_amenity ra
            JOIN amenity a ON a.amenity_id = ra.amenity_id
            WHERE ra.room_type_id = $1
            ORDER BY a.amenity_type, a.amenity_name
            """,
            row["room_type_id"],
        )

        rooms.append(RoomOut(
            room_id=str(row["room_id"]),
            room_number=row["room_number"],
            branch=BranchInfo(
                branch_id=str(row["branch_id"]),
                name=row["branch_name"],
                city=row["city"],
            ),
            room_type=RoomTypeInfo(
                room_type_id=str(row["room_type_id"]),
                type_name=row["type_name"],
                capacity=row["capacity"],
            ),
            daily_rate=float(row["daily_rate"]),
            status=row["status"],
            amenities=[
                AmenityInfo(
                    amenity_name=a["amenity_name"],
                    amenity_type=a["amenity_type"],
                    count=a["count"],
                )
                for a in amenities
            ],
        ))

    return RoomListResponse(rooms=rooms, total=len(rooms))


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/rooms/{room_id} — Get one room with full details
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/{room_id}", response_model=RoomOut)
async def get_room(room_id: str, db=Depends(get_db)):
    """Get full details for a single room including amenities."""
    row = await db.fetchrow(
        """
        SELECT r.room_id, r.room_number, r.status,
               b.branch_id, b.name AS branch_name, b.city,
               rt.room_type_id, rt.type_name, rt.capacity,
               COALESCE(rr.daily_rate, 0) AS daily_rate
        FROM room r
        JOIN branch b ON b.branch_id = r.branch_id
        JOIN room_type rt ON rt.room_type_id = r.room_type_id
        LEFT JOIN room_rate rr ON rr.branch_id = r.branch_id
                              AND rr.room_type_id = r.room_type_id
        WHERE r.room_id = $1::UUID
        """,
        room_id,
    )

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Room {room_id} not found",
        )

    amenities = await db.fetch(
        """
        SELECT a.amenity_name, a.amenity_type, ra.count
        FROM room_amenity ra
        JOIN amenity a ON a.amenity_id = ra.amenity_id
        WHERE ra.room_type_id = $1
        ORDER BY a.amenity_type, a.amenity_name
        """,
        row["room_type_id"],
    )

    return RoomOut(
        room_id=str(row["room_id"]),
        room_number=row["room_number"],
        branch=BranchInfo(
            branch_id=str(row["branch_id"]),
            name=row["branch_name"],
            city=row["city"],
        ),
        room_type=RoomTypeInfo(
            room_type_id=str(row["room_type_id"]),
            type_name=row["type_name"],
            capacity=row["capacity"],
        ),
        daily_rate=float(row["daily_rate"]),
        status=row["status"],
        amenities=[
            AmenityInfo(
                amenity_name=a["amenity_name"],
                amenity_type=a["amenity_type"],
                count=a["count"],
            )
            for a in amenities
        ],
    )


# ─────────────────────────────────────────────────────────────────────────────
# PATCH /api/rooms/{room_id}/status — Update room status (admin/manager only)
# ─────────────────────────────────────────────────────────────────────────────

@router.patch("/{room_id}/status")
async def update_room_status(
    room_id: str,
    body: StatusUpdateRequest,
    db=Depends(get_db),
    user=Depends(require_role("admin", "manager")),
):
    """
    Manually update a room's status (e.g. mark as Maintenance).
    Only admin and manager roles can do this.
    """
    # Validate the status value
    valid_statuses = {"Available", "Occupied", "Maintenance"}
    if body.status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}",
        )

    result = await db.execute(
        "UPDATE room SET status = $1::room_status WHERE room_id = $2::UUID",
        body.status,
        room_id,
    )

    # asyncpg returns "UPDATE N" — check if any row was actually updated
    if result == "UPDATE 0":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Room {room_id} not found",
        )

    return {"room_id": room_id, "status": body.status}
