"""
backend/app/routers/reports.py
===============================

"""

from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.db import get_db
from app.dependencies import require_role

router = APIRouter()


# =============================================================================
# Pydantic Response Models
# =============================================================================

class OccupancyRow(BaseModel):
    room_id: str
    branch_id: str
    branch_name: str
    room_number: str
    room_type: str
    capacity: int
    room_status: str
    booking_id: Optional[str] = None
    guest_id: Optional[str] = None
    guest_name: Optional[str] = None
    check_in_date: Optional[str] = None
    check_out_date: Optional[str] = None
    booking_status: Optional[str] = None


class OccupancyResponse(BaseModel):
    report: list[OccupancyRow]
    total: int


class BillingSummaryRow(BaseModel):
    guest_id: str
    guest_name: str
    nic_passport: str
    email: str
    phone: str
    guest_type: str
    booking_id: str
    room_number: str
    branch_id: str
    branch_name: str
    check_in_date: Optional[str] = None
    check_out_date: Optional[str] = None
    bill_id: Optional[str] = None
    room_charges: float
    service_charges: float
    discount_amount: float
    tax_amount: float
    total_amount: float
    amount_paid: float
    outstanding_balance: float
    balance_flag: bool


class BillingSummaryResponse(BaseModel):
    report: list[BillingSummaryRow]
    total: int


class ServiceUsageRow(BaseModel):
    branch_id: str
    branch_name: str
    room_number: str
    guest_id: str
    guest_name: str
    service_id: str
    service_name: str
    category: str
    total_quantity_used: int
    total_revenue_generated: float


class ServiceUsageResponse(BaseModel):
    report: list[ServiceUsageRow]
    total: int


class MonthlyRevenueRow(BaseModel):
    branch_id: str
    branch_name: str
    year: int
    month: int
    total_room_revenue: float
    total_service_revenue: float
    total_tax_collected: float
    total_gross_revenue: float
    total_collected: float
    total_outstanding: float


class MonthlyRevenueResponse(BaseModel):
    report: list[MonthlyRevenueRow]
    total: int


class TopServiceRow(BaseModel):
    usage_rank: int
    service_id: str
    service_name: str
    category: str
    total_bookings_ordered: int
    total_quantity: int
    total_revenue: float
    avg_quantity_per_booking: float


class TopServicesResponse(BaseModel):
    report: list[TopServiceRow]
    total: int


# =============================================================================
# Helper: apply branch scoping for managers
# =============================================================================

def _resolve_branch(user: dict, branch_id_param: Optional[str]) -> Optional[str]:
    """
    If the logged-in user is a manager, ignore any branch_id query param and
    force the filter to their own branch. Admins may pass any branch_id or
    omit it to see all branches.
    """
    if user["role"] == "manager":
        return str(user["branch_id"]) if user["branch_id"] else None
    return branch_id_param


# =============================================================================
# GET /api/reports/occupancy
    # Query params: branch_id?, date? (YYYY-MM-DD), from_date?, to_date?
    # Queries: SELECT * FROM v_room_occupancy WHERE ...
    # Managers: auto-filter to their branch_id.
    # Access: manager, admin.
# =============================================================================




# =============================================================================
# GET /api/reports/billing-summary
    # Query params: branch_id?, balance_flag? (True = unpaid only)
    # Queries: SELECT * FROM v_guest_billing_summary WHERE ...
    # Access: manager, admin.

# Database view used: v_guest_billing_summary
# =============================================================================

@router.get("/billing-summary", response_model=BillingSummaryResponse)
async def get_billing_summary(
    db=Depends(get_db),
    user=Depends(require_role("manager", "admin")),
    branch_id: Optional[str] = Query(None, description="Filter by branch UUID"),
    unpaid_only: Optional[bool] = Query(None, description="If true, return only records with outstanding balance"),
):
    """
    Guest billing summary report from v_guest_billing_summary.
    - Managers are automatically scoped to their own branch.
    - Pass unpaid_only=true to show only guests with outstanding balances.
    """
    effective_branch = _resolve_branch(user, branch_id)

    conditions = []
    params = []
    idx = 0

    if effective_branch:
        idx += 1
        conditions.append(f"branch_id = ${idx}::UUID")
        params.append(effective_branch)

    if unpaid_only:
        conditions.append("balance_flag = TRUE")

    where = "WHERE " + " AND ".join(conditions) if conditions else ""

    rows = await db.fetch(
        f"SELECT * FROM v_guest_billing_summary {where} ORDER BY guest_name, check_in_date",
        *params,
    )

    report = [
        BillingSummaryRow(
            guest_id=str(r["guest_id"]),
            guest_name=r["guest_name"],
            nic_passport=r["nic_passport"],
            email=r["email"],
            phone=r["phone"],
            guest_type=r["guest_type"],
            booking_id=str(r["booking_id"]),
            room_number=r["room_number"],
            branch_id=str(r["branch_id"]),
            branch_name=r["branch_name"],
            check_in_date=str(r["check_in_date"]) if r["check_in_date"] else None,
            check_out_date=str(r["check_out_date"]) if r["check_out_date"] else None,
            bill_id=str(r["bill_id"]) if r["bill_id"] else None,
            room_charges=float(r["room_charges"]),
            service_charges=float(r["service_charges"]),
            discount_amount=float(r["discount_amount"]),
            tax_amount=float(r["tax_amount"]),
            total_amount=float(r["total_amount"]),
            amount_paid=float(r["amount_paid"]),
            outstanding_balance=float(r["outstanding_balance"]),
            balance_flag=bool(r["balance_flag"]),
        )
        for r in rows
    ]

    return BillingSummaryResponse(report=report, total=len(report))


# =============================================================================
# GET /api/reports/service-usage
    # Query params: branch_id?, from_date?, to_date?
    # Queries: SELECT * FROM v_service_usage_breakdown WHERE ...
    # Access: manager, admin.
    
# Database view used: v_service_usage_breakdown
# =============================================================================

@router.get("/service-usage", response_model=ServiceUsageResponse)
async def get_service_usage(
    db=Depends(get_db),
    user=Depends(require_role("manager", "admin")),
    branch_id: Optional[str] = Query(None, description="Filter by branch UUID"),
):
    """
    Service usage breakdown from v_service_usage_breakdown.
    - Managers are automatically scoped to their own branch.
    """
    effective_branch = _resolve_branch(user, branch_id)

    conditions = []
    params = []
    idx = 0

    if effective_branch:
        idx += 1
        conditions.append(f"branch_id = ${idx}::UUID")
        params.append(effective_branch)

    where = "WHERE " + " AND ".join(conditions) if conditions else ""

    rows = await db.fetch(
        f"SELECT * FROM v_service_usage_breakdown {where} "
        f"ORDER BY branch_name, total_revenue_generated DESC",
        *params,
    )

    report = [
        ServiceUsageRow(
            branch_id=str(r["branch_id"]),
            branch_name=r["branch_name"],
            room_number=r["room_number"],
            guest_id=str(r["guest_id"]),
            guest_name=r["guest_name"],
            service_id=str(r["service_id"]),
            service_name=r["service_name"],
            category=r["category"],
            total_quantity_used=r["total_quantity_used"],
            total_revenue_generated=float(r["total_revenue_generated"]),
        )
        for r in rows
    ]

    return ServiceUsageResponse(report=report, total=len(report)) 

