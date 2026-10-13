"""
backend/app/schemas/report.py
=============================
Purpose:
    Pydantic response models for the reporting endpoints (routers/reports.py).
"""

from typing import Optional

from pydantic import BaseModel


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
