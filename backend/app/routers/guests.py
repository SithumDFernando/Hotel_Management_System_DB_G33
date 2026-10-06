"""
backend/app/routers/guests.py
==============================
Purpose:
    Manages hotel guest profiles (the `guest` table). Receptionists use
    this to register new guests at check-in or look up existing guests when
    creating bookings on their behalf.

Endpoints:
    GET /api/guests
        - Returns a list of all guests (for receptionist dropdown when creating
          a booking).
        - Supports optional query param `search` (name, NIC/passport, email).
        - Access: receptionist, manager, admin.

    GET /api/guests/{guest_id}
        - Returns full profile for a single guest including their booking history.
        - Access: receptionist, manager, admin, or the guest themselves
          (via guest_id on their user_account).

    POST /api/guests
        - Body: GuestCreate schema (full_name, nic_passport, email, phone,
                date_of_birth?, nationality?, gender?, guest_type,
                company_name?, company_reg_number?, billing_contact_name?).
        - Inserts a new guest row. Validates that company_name is present
          when guest_type = 'Corporate'.
        - Access: receptionist, admin.

    PUT /api/guests/{guest_id}
        - Updates an existing guest profile.
        - Access: receptionist, admin.

Database table used:
    guest

Dependencies:
    - app.db            (get_db)
    - app.dependencies  (get_current_user, require_role)
    - app.schemas.guest (GuestCreate, GuestUpdate, GuestOut)
"""

from datetime import date
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.db import get_db
from app.dependencies import get_current_user, require_role
from app.schemas.guest import GuestCreate, GuestOut, GuestUpdate

router = APIRouter()


# ─────────────────────────────────────────────────────────────────────────────
# Response model for booking history embedded in GET /guests/{guest_id}
# ─────────────────────────────────────────────────────────────────────────────

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


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/guests — List all guests (with optional search)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("", response_model=list[GuestOut])
async def list_guests(
    db=Depends(get_db),
    _user=Depends(require_role("receptionist", "manager", "admin")),
    search: Optional[str] = Query(
        None,
        description="Filter by name, NIC/passport, or email (case-insensitive substring match)",
    ),
):
    """
    Return all guest profiles, optionally filtered by a search term that
    matches against full_name, nic_passport, or email.
    """
    if search:
        pattern = f"%{search}%"
        rows = await db.fetch(
            """
            SELECT guest_id, full_name, nic_passport, email, phone,
                   date_of_birth, nationality, gender, guest_type,
                   company_name, company_reg_number, billing_contact_name
            FROM   guest
            WHERE  full_name    ILIKE $1
               OR  nic_passport ILIKE $1
               OR  email        ILIKE $1
            ORDER BY full_name
            """,
            pattern,
        )
    else:
        rows = await db.fetch(
            """
            SELECT guest_id, full_name, nic_passport, email, phone,
                   date_of_birth, nationality, gender, guest_type,
                   company_name, company_reg_number, billing_contact_name
            FROM   guest
            ORDER BY full_name
            """,
        )

    return [GuestOut(**dict(row)) for row in rows]


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/guests/{guest_id} — Full profile + booking history
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/{guest_id}", response_model=GuestDetailOut)
async def get_guest(
    guest_id: UUID,
    db=Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Return the full profile of a single guest plus their booking history.

    Access rules:
    - Staff (receptionist, manager, admin): can view any guest.
    - Guest role: can only view their own profile (matched via guest_id on
      their user_account row).
    """
    role = current_user["role"]
    staff_roles = {"receptionist", "manager", "admin"}

    # Guests may only view their own profile
    if role == "guest":
        if str(current_user.get("guest_id")) != str(guest_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Guests can only view their own profile.",
            )
    elif role not in staff_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Role '{role}' is not authorised to view guest profiles.",
        )

    # Fetch guest profile
    guest_row = await db.fetchrow(
        """
        SELECT guest_id, full_name, nic_passport, email, phone,
               date_of_birth, nationality, gender, guest_type,
               company_name, company_reg_number, billing_contact_name
        FROM   guest
        WHERE  guest_id = $1
        """,
        guest_id,
    )

    if guest_row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Guest {guest_id} not found.",
        )

    # Fetch booking history for this guest
    booking_rows = await db.fetch(
        """
        SELECT b.booking_id, b.room_id,
               r.room_number,
               b.check_in_date, b.check_out_date,
               b.rate_at_booking, b.status, b.payment_option,
               b.actual_checkin_time, b.actual_checkout_time
        FROM   booking b
        JOIN   room r ON r.room_id = b.room_id
        WHERE  b.guest_id = $1
        ORDER BY b.check_in_date DESC
        """,
        guest_id,
    )

    bookings = [
        BookingSummary(
            booking_id=row["booking_id"],
            room_id=row["room_id"],
            room_number=row["room_number"],
            check_in_date=row["check_in_date"],
            check_out_date=row["check_out_date"],
            rate_at_booking=float(row["rate_at_booking"]),
            status=row["status"],
            payment_option=row["payment_option"],
            actual_checkin_time=(
                str(row["actual_checkin_time"]) if row["actual_checkin_time"] else None
            ),
            actual_checkout_time=(
                str(row["actual_checkout_time"]) if row["actual_checkout_time"] else None
            ),
        )
        for row in booking_rows
    ]

    return GuestDetailOut(**dict(guest_row), bookings=bookings)


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/guests — Register a new guest
# ─────────────────────────────────────────────────────────────────────────────

@router.post("", response_model=GuestOut, status_code=status.HTTP_201_CREATED)
async def create_guest(
    body: GuestCreate,
    db=Depends(get_db),
    _user=Depends(require_role("receptionist", "admin")),
):
    """
    Create a new guest profile.

    The Pydantic GuestCreate model already validates that company_name is
    supplied when guest_type is 'Corporate'. A unique-constraint violation
    on nic_passport or email will be caught and surfaced as HTTP 409.
    """
    try:
        row = await db.fetchrow(
            """
            INSERT INTO guest (
                full_name, nic_passport, email, phone,
                date_of_birth, nationality, gender, guest_type,
                company_name, company_reg_number, billing_contact_name
            ) VALUES (
                $1,  $2,  $3,  $4,
                $5,  $6,  $7,  $8::guest_type,
                $9,  $10, $11
            )
            RETURNING guest_id, full_name, nic_passport, email, phone,
                      date_of_birth, nationality, gender, guest_type,
                      company_name, company_reg_number, billing_contact_name
            """,
            body.full_name,
            body.nic_passport,
            body.email,
            body.phone,
            body.date_of_birth,
            body.nationality,
            body.gender,
            body.guest_type,
            body.company_name,
            body.company_reg_number,
            body.billing_contact_name,
        )
    except Exception as exc:
        # Surface DB-level constraint violations (duplicate NIC/email) as 409
        error_msg = str(exc).lower()
        if "unique" in error_msg or "duplicate" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A guest with this NIC/passport or email already exists.",
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {exc}",
        )

    return GuestOut(**dict(row))


# ─────────────────────────────────────────────────────────────────────────────
# PUT /api/guests/{guest_id} — Update an existing guest profile
# ─────────────────────────────────────────────────────────────────────────────

@router.put("/{guest_id}", response_model=GuestOut)
async def update_guest(
    guest_id: UUID,
    body: GuestUpdate,
    db=Depends(get_db),
    _user=Depends(require_role("receptionist", "admin")),
):
    """
    Partially update a guest profile. Only fields present in the request body
    (i.e. not None) are updated; all others are left untouched.
    """
    # Build SET clause dynamically — only update provided (non-None) fields
    updates = body.model_dump(exclude_none=True)

    if not updates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields provided for update.",
        )

    set_clauses = []
    params: list = []
    param_idx = 0

    for field, value in updates.items():
        param_idx += 1
        # Cast guest_type to its Postgres enum type
        if field == "guest_type":
            set_clauses.append(f"{field} = ${param_idx}::guest_type")
        else:
            set_clauses.append(f"{field} = ${param_idx}")
        params.append(value)

    # guest_id goes in as the final WHERE parameter
    param_idx += 1
    params.append(guest_id)

    set_sql = ", ".join(set_clauses)

    try:
        row = await db.fetchrow(
            f"""
            UPDATE guest
            SET    {set_sql}
            WHERE  guest_id = ${param_idx}
            RETURNING guest_id, full_name, nic_passport, email, phone,
                      date_of_birth, nationality, gender, guest_type,
                      company_name, company_reg_number, billing_contact_name
            """,
            *params,
        )
    except Exception as exc:
        error_msg = str(exc).lower()
        if "unique" in error_msg or "duplicate" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A guest with this NIC/passport or email already exists.",
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {exc}",
        )

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Guest {guest_id} not found.",
        )

    return GuestOut(**dict(row))
