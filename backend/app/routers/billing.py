"""
Billing and payment endpoints.

Two routers live in this file (both mounted in main.py):
    router           (prefix /api/billing)
        POST /api/billing/{booking_id}/generate — Generate or recalculate a bill.
        GET  /api/billing/{booking_id}          — Get the bill for a booking.
    payments_router  (prefix /api/payments)
        POST /api/payments                      — Record a payment.
        GET  /api/payments/{booking_id}         — Payment history for a booking.
"""

from decimal import Decimal
from uuid import UUID

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.db import get_db
from app.dependencies import require_role
from app.schemas.billing import BillOut, PaymentCreate, PaymentOut

router = APIRouter()           
payments_router = APIRouter()  

STAFF_ROLES = ("admin", "manager", "receptionist")

# Helpers

def _db_error_to_http(exc: asyncpg.exceptions.RaiseError) -> HTTPException:
    """Map RAISE EXCEPTION messages from the SQL functions to HTTP errors."""
    msg = exc.message
    lowered = msg.lower()
    if "not found" in lowered or "not yet generated" in lowered:
        code = status.HTTP_404_NOT_FOUND
    else:
        code = status.HTTP_400_BAD_REQUEST
    return HTTPException(status_code=code, detail=msg)


def _bill_from_row(row) -> BillOut:
    return BillOut(
        bill_id=str(row["bill_id"]),
        booking_id=str(row["booking_id"]),
        room_charges=row["room_charges"],
        service_charges=row["service_charges"],
        discount_amount=row["discount_amount"],
        tax_amount=row["tax_amount"],
        total_amount=row["total_amount"],
        amount_paid=row["amount_paid"],
        outstanding_balance=row["outstanding_balance"],
        balance_flag=row["balance_flag"],
        generated_at=row["generated_at"],
    )


def _payment_from_row(row) -> PaymentOut:
    return PaymentOut(
        payment_id=str(row["payment_id"]),
        booking_id=str(row["booking_id"]),
        amount=row["amount"],
        payment_method=row["payment_method"],
        paid_at=row["paid_at"],
        notes=row["notes"],
    )


BILL_SELECT = """
    SELECT bill_id, booking_id, room_charges, service_charges, discount_amount,
           tax_amount, total_amount, amount_paid, outstanding_balance,
           balance_flag, generated_at
    FROM bill
    WHERE booking_id = $1::UUID
"""

# POST /api/billing/{booking_id}/generate

@router.post("/{booking_id}/generate", response_model=BillOut)
async def generate_bill(
    booking_id: UUID,
    discount: Decimal | None = Query(
        None, ge=0, description="Discount amount. Omit to keep the existing discount."
    ),
    db=Depends(get_db),
    user=Depends(require_role(*STAFF_ROLES)),
):
    """Generate the bill for a booking, or recalculate it if one exists."""
    try:
        await db.execute(
            "CALL generate_bill($1::UUID, $2::NUMERIC)", booking_id, discount
        )
    except asyncpg.exceptions.RaiseError as exc:
        raise _db_error_to_http(exc)

    row = await db.fetchrow(BILL_SELECT, booking_id)
    return _bill_from_row(row)

# GET /api/billing/{booking_id}

@router.get("/{booking_id}", response_model=BillOut)
async def get_bill(
    booking_id: UUID,
    db=Depends(get_db),
    user=Depends(require_role(*STAFF_ROLES)),
):
    """Get the invoice/bill details for a booking."""
    row = await db.fetchrow(BILL_SELECT, booking_id)
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No bill found for booking {booking_id}",
        )
    return _bill_from_row(row)

# POST /api/payments

@payments_router.post("", response_model=PaymentOut, status_code=status.HTTP_201_CREATED)
async def create_payment(
    body: PaymentCreate,
    db=Depends(get_db),
    user=Depends(require_role(*STAFF_ROLES)),
):
    """Record a payment against a booking's bill (partial payments allowed)."""
    try:
        await db.execute(
            "CALL record_payment($1::UUID, $2::NUMERIC, $3, $4)",
            body.booking_id,
            body.amount,
            body.payment_method,
            body.notes,
        )
    except asyncpg.exceptions.RaiseError as exc:
        raise _db_error_to_http(exc)

    row = await db.fetchrow(
        """
        SELECT payment_id, booking_id, amount, payment_method, paid_at, notes
        FROM payment
        WHERE booking_id = $1::UUID
        ORDER BY paid_at DESC
        LIMIT 1
        """,
        body.booking_id,
    )
    return _payment_from_row(row)

# GET /api/payments/{booking_id}

@payments_router.get("/{booking_id}", response_model=list[PaymentOut])
async def list_payments(
    booking_id: UUID,
    db=Depends(get_db),
    user=Depends(require_role(*STAFF_ROLES)),
):
    """List the payment history for a booking, newest first."""
    exists = await db.fetchval(
        "SELECT 1 FROM booking WHERE booking_id = $1::UUID", booking_id
    )
    if not exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Booking {booking_id} not found",
        )

    rows = await db.fetch(
        """
        SELECT payment_id, booking_id, amount, payment_method, paid_at, notes
        FROM payment
        WHERE booking_id = $1::UUID
        ORDER BY paid_at DESC
        """,
        booking_id,
    )
    return [_payment_from_row(r) for r in rows]