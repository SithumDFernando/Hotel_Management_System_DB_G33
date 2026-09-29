"""
backend/app/routers/billing.py
===============================
Purpose:
    Manages bill generation and payment recording for bookings. Bill
    generation aggregates room charges and service charges via the stored
    functions and procedures defined in `db/`. Payment recording updates
    `bill.amount_paid` and `bill.outstanding_balance`.

Endpoints to implement:
    POST /api/billing/{booking_id}/generate
        - Calls the `generate_bill(booking_id)` stored procedure which:
            (a) Calculates room_charges:  fn_get_room_charges(booking_id)
            (b) Calculates service_charges: fn_get_service_charges(booking_id)
            (c) Calculates tax_amount:    fn_calculate_tax(room_charges + service_charges)
            (d) Sets outstanding_balance = total_amount - amount_paid
            (e) Sets balance_flag = (outstanding_balance > 0)
            (f) Inserts or updates the bill row (UPSERT — 1:1 with booking).
        - Returns the full bill object.
        - Access: receptionist, manager, admin.

    GET /api/billing/{booking_id}
        - Returns the bill for a given booking, including a breakdown of all
          payment transactions from the payment table.
        - Access: receptionist, manager, admin, or the owning guest.

    POST /api/payments
        - Body: { booking_id, amount, payment_method, notes? }
        - Calls the `record_payment(booking_id, amount, method, notes)`
          stored procedure which:
            (a) Inserts a payment row.
            (b) Updates bill.amount_paid += amount.
            (c) Recalculates bill.outstanding_balance.
            (d) Updates bill.balance_flag.
        - Access: receptionist, manager, admin.

    GET /api/payments/{booking_id}
        - Returns the list of all payment transactions for a booking.
        - Access: receptionist, manager, admin.

Database tables / procedures / functions used:
    bill, payment, booking |
    stored procedures: generate_bill, record_payment |
    functions: fn_get_room_charges, fn_get_service_charges,
               fn_calculate_tax, fn_get_outstanding_balance

Dependencies:
    - app.db              (get_db)
    - app.dependencies    (get_current_user, require_role)
    - app.schemas.billing (BillOut, PaymentCreate, PaymentOut)
"""

from fastapi import APIRouter

router = APIRouter()

# TODO: Implement billing router endpoints (see docstring above for spec)
