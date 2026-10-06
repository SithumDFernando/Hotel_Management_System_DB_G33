"""
backend/app/routers/services.py
================================
Purpose:
    Manages hotel services (spa, laundry, room service, etc.) and tracks
    service usage against checked-in bookings. Receptionists use this to
    add chargeable services to a guest's stay from the `ServiceRequest` page.

Endpoints:
    GET /api/services
        - Returns all active services (is_active = TRUE).
        - Grouped by category for the frontend catalogue display.
        - Access: receptionist, manager, admin (guests see read-only list).

    POST /api/services
        - Body: { service_name, category, base_price }
        - Creates a new service entry.
        - Access: admin, manager.

    PATCH /api/services/{service_id}
        - Body: { service_name?, category?, base_price?, is_active? }
        - Updates a service (e.g. deactivate with is_active=False).
        - Access: admin, manager.

    GET /api/services/{booking_id}/usage
        - Returns all service_usage rows for a given booking, joined with
          service names and totals.
        - Access: receptionist, manager, admin.

    POST /api/services/{booking_id}/usage
        - Body: { service_id, usage_date, quantity }
        - Adds a service usage entry.
        - Snapshots `service.base_price` as `unit_price` at insertion time
          (same immutability pattern as `rate_at_booking`).
        - The `service_usage_trigger` fires to enforce that the booking
          is in 'Checked-In' status before allowing service additions.
        - Access: receptionist, manager, admin.

Database tables used:
    service, service_usage, booking

Dependencies:
    - app.db            (get_db)
    - app.dependencies  (get_current_user, require_role)
"""

from datetime import date
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.db import get_db
from app.dependencies import require_role

router = APIRouter()


# ─────────────────────────────────────────────────────────────────────────────
# Pydantic Models
# ─────────────────────────────────────────────────────────────────────────────

class ServiceOut(BaseModel):
    """A single hotel service as returned by the API."""
    service_id: UUID
    service_name: str
    category: str
    base_price: float
    is_active: bool

    class Config:
        from_attributes = True


class ServiceCategoryGroup(BaseModel):
    """Active services grouped by category for the catalogue display."""
    category: str
    services: list[ServiceOut]


class ServiceCreate(BaseModel):
    """Payload for POST /api/services."""
    service_name: str   = Field(..., min_length=1, max_length=100)
    category:     str   = Field(..., min_length=1, max_length=50)
    base_price:   float = Field(..., gt=0, description="Price per unit in the hotel's currency")


class ServiceUpdate(BaseModel):
    """Payload for PATCH /api/services/{service_id} — all fields optional."""
    service_name: Optional[str]   = Field(None, min_length=1, max_length=100)
    category:     Optional[str]   = Field(None, min_length=1, max_length=50)
    base_price:   Optional[float] = Field(None, gt=0)
    is_active:    Optional[bool]  = None


class ServiceUsageOut(BaseModel):
    """A single service_usage row joined with its service details."""
    usage_id:     UUID
    service_id:   UUID
    service_name: str
    category:     str
    usage_date:   date
    quantity:     int
    unit_price:   float
    line_total:   float  # quantity × unit_price, computed at response time

    class Config:
        from_attributes = True


class ServiceUsageCreate(BaseModel):
    """Payload for POST /api/services/{booking_id}/usage."""
    service_id: UUID
    usage_date: date
    quantity:   int = Field(..., ge=1, description="Must be at least 1")


class ServiceUsageSummary(BaseModel):
    """Full usage list for a booking plus an aggregate total."""
    booking_id:  UUID
    usages:      list[ServiceUsageOut]
    grand_total: float


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/services — Catalogue of all active services, grouped by category
# ─────────────────────────────────────────────────────────────────────────────

@router.get("", response_model=list[ServiceCategoryGroup])
async def list_services(
    db=Depends(get_db),
    _user=Depends(require_role("receptionist", "manager", "admin", "guest")),
):
    """
    Return all active services grouped by category.

    The frontend catalogue page uses this to render one section per category
    (e.g. Spa, Laundry, Room Service) with the available offerings and prices.
    """
    rows = await db.fetch(
        """
        SELECT service_id, service_name, category, base_price, is_active
        FROM   service
        WHERE  is_active = TRUE
        ORDER BY category, service_name
        """,
    )

    # Group by category while preserving ORDER BY category order
    groups: dict[str, list[ServiceOut]] = {}
    for row in rows:
        svc = ServiceOut(
            service_id=row["service_id"],
            service_name=row["service_name"],
            category=row["category"],
            base_price=float(row["base_price"]),
            is_active=row["is_active"],
        )
        groups.setdefault(row["category"], []).append(svc)

    return [
        ServiceCategoryGroup(category=cat, services=svcs)
        for cat, svcs in groups.items()
    ]


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/services — Create a new service
# ─────────────────────────────────────────────────────────────────────────────

@router.post("", response_model=ServiceOut, status_code=status.HTTP_201_CREATED)
async def create_service(
    body: ServiceCreate,
    db=Depends(get_db),
    _user=Depends(require_role("admin", "manager")),
):
    """
    Create a new hotel service entry.

    New services are active by default (DB column default). A unique-constraint
    violation on service_name is surfaced as HTTP 409.
    """
    try:
        row = await db.fetchrow(
            """
            INSERT INTO service (service_name, category, base_price)
            VALUES ($1, $2, $3)
            RETURNING service_id, service_name, category, base_price, is_active
            """,
            body.service_name,
            body.category,
            body.base_price,
        )
    except Exception as exc:
        error_msg = str(exc).lower()
        if "unique" in error_msg or "duplicate" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A service named '{body.service_name}' already exists.",
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {exc}",
        )

    return ServiceOut(
        service_id=row["service_id"],
        service_name=row["service_name"],
        category=row["category"],
        base_price=float(row["base_price"]),
        is_active=row["is_active"],
    )


# ─────────────────────────────────────────────────────────────────────────────
# PATCH /api/services/{service_id} — Partial update (incl. deactivation)
# ─────────────────────────────────────────────────────────────────────────────

@router.patch("/{service_id}", response_model=ServiceOut)
async def update_service(
    service_id: UUID,
    body: ServiceUpdate,
    db=Depends(get_db),
    _user=Depends(require_role("admin", "manager")),
):
    """
    Partially update a service record.

    Only fields present in the request body (non-None) are written. Passing
    `is_active: false` effectively deactivates the service so it no longer
    appears in the active catalogue.
    """
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
        set_clauses.append(f"{field} = ${param_idx}")
        params.append(value)

    # service_id is the final WHERE parameter
    param_idx += 1
    params.append(service_id)

    set_sql = ", ".join(set_clauses)

    try:
        row = await db.fetchrow(
            f"""
            UPDATE service
            SET    {set_sql}
            WHERE  service_id = ${param_idx}
            RETURNING service_id, service_name, category, base_price, is_active
            """,
            *params,
        )
    except Exception as exc:
        error_msg = str(exc).lower()
        if "unique" in error_msg or "duplicate" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A service with this name already exists.",
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {exc}",
        )

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Service {service_id} not found.",
        )

    return ServiceOut(
        service_id=row["service_id"],
        service_name=row["service_name"],
        category=row["category"],
        base_price=float(row["base_price"]),
        is_active=row["is_active"],
    )


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/services/{booking_id}/usage — All service charges for a booking
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/{booking_id}/usage", response_model=ServiceUsageSummary)
async def get_booking_usage(
    booking_id: UUID,
    db=Depends(get_db),
    _user=Depends(require_role("receptionist", "manager", "admin")),
):
    """
    Return every service_usage row for a booking, joined with service name and
    category. Includes a `grand_total` field summing all line totals for quick
    display on the bill preview.

    Raises 404 if the booking does not exist.
    """
    # Verify the booking exists
    booking_exists = await db.fetchval(
        "SELECT 1 FROM booking WHERE booking_id = $1",
        booking_id,
    )
    if not booking_exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Booking {booking_id} not found.",
        )

    rows = await db.fetch(
        """
        SELECT su.usage_id,
               su.service_id,
               s.service_name,
               s.category,
               su.usage_date,
               su.quantity,
               su.unit_price
        FROM   service_usage su
        JOIN   service s ON s.service_id = su.service_id
        WHERE  su.booking_id = $1
        ORDER BY su.usage_date, s.category, s.service_name
        """,
        booking_id,
    )

    usages = []
    grand_total = 0.0
    for row in rows:
        unit_price = float(row["unit_price"])
        line_total = round(unit_price * row["quantity"], 2)
        grand_total += line_total
        usages.append(
            ServiceUsageOut(
                usage_id=row["usage_id"],
                service_id=row["service_id"],
                service_name=row["service_name"],
                category=row["category"],
                usage_date=row["usage_date"],
                quantity=row["quantity"],
                unit_price=unit_price,
                line_total=line_total,
            )
        )

    return ServiceUsageSummary(
        booking_id=booking_id,
        usages=usages,
        grand_total=round(grand_total, 2),
    )


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/services/{booking_id}/usage — Add a service charge to a booking
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/{booking_id}/usage",
    response_model=ServiceUsageOut,
    status_code=status.HTTP_201_CREATED,
)
async def add_service_usage(
    booking_id: UUID,
    body: ServiceUsageCreate,
    db=Depends(get_db),
    _user=Depends(require_role("receptionist", "manager", "admin")),
):
    """
    Add a service charge to a checked-in booking.

    Price immutability: the current `base_price` is read from the `service`
    table and stored as `unit_price` at insertion time — the same pattern as
    `rate_at_booking` in the booking table. Future price changes do not
    retroactively alter posted charges.

    The `service_usage_trigger` in the database enforces that the booking's
    status is 'Checked-In'; any violation is surfaced as HTTP 422.

    Raises:
        404 — booking or active service not found.
        422 — trigger rejected the insert (booking not Checked-In).
        500 — unexpected database error.
    """
    # Verify the booking exists and capture its current status for error messages
    booking_row = await db.fetchrow(
        "SELECT booking_id, status FROM booking WHERE booking_id = $1",
        booking_id,
    )
    if booking_row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Booking {booking_id} not found.",
        )

    # Fetch the active service and snapshot base_price → unit_price
    service_row = await db.fetchrow(
        """
        SELECT service_id, service_name, category, base_price
        FROM   service
        WHERE  service_id = $1
          AND  is_active  = TRUE
        """,
        body.service_id,
    )
    if service_row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Active service {body.service_id} not found.",
        )

    unit_price = float(service_row["base_price"])

    try:
        row = await db.fetchrow(
            """
            INSERT INTO service_usage (booking_id, service_id, usage_date, quantity, unit_price)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING usage_id, service_id, usage_date, quantity, unit_price
            """,
            booking_id,
            body.service_id,
            body.usage_date,
            body.quantity,
            unit_price,
        )
    except Exception as exc:
        error_msg = str(exc).lower()
        # The service_usage_trigger raises when booking status != 'Checked-In'
        if "checked-in" in error_msg or "check" in error_msg or "status" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    f"Cannot add services to booking {booking_id}: "
                    f"booking must be in 'Checked-In' status "
                    f"(current status: '{booking_row['status']}')."
                ),
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {exc}",
        )

    line_total = round(float(row["unit_price"]) * row["quantity"], 2)

    return ServiceUsageOut(
        usage_id=row["usage_id"],
        service_id=row["service_id"],
        service_name=service_row["service_name"],
        category=service_row["category"],
        usage_date=row["usage_date"],
        quantity=row["quantity"],
        unit_price=float(row["unit_price"]),
        line_total=line_total,
    )
