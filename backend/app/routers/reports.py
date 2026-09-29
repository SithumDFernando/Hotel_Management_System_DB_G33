"""
backend/app/routers/reports.py
===============================
Purpose:
    Provides the 5 management reports required by the SRS by querying the
    PostgreSQL views defined in `db/views/reports.sql`. Managers see reports
    scoped to their branch; admins see all branches.

    All reports correspond directly to views in `db/views/reports.sql`:
        v_room_occupancy            → Report 1
        v_guest_billing_summary     → Report 2
        v_service_usage_breakdown   → Report 3
        v_monthly_revenue           → Report 4
        v_top_services              → Report 5

Endpoints to implement:
    GET /api/reports/occupancy
        - Query params: date? (YYYY-MM-DD), from_date?, to_date?, branch_id?
        - Queries: SELECT * FROM v_room_occupancy WHERE ...
        - Managers: auto-filter to their branch_id.
        - Access: manager, admin.

    GET /api/reports/billing-summary
        - Query params: branch_id?, balance_flag? (True = unpaid only)
        - Queries: SELECT * FROM v_guest_billing_summary WHERE ...
        - Access: manager, admin.

    GET /api/reports/service-usage
        - Query params: branch_id?, from_date?, to_date?
        - Queries: SELECT * FROM v_service_usage_breakdown WHERE ...
        - Access: manager, admin.

    GET /api/reports/monthly-revenue
        - Query params: year (int), month (int), branch_id?
        - Queries: SELECT * FROM v_monthly_revenue WHERE year=:year AND month=:month ...
        - Access: manager, admin.

    GET /api/reports/top-services
        - Query params: branch_id?, limit? (default 10)
        - Queries: SELECT * FROM v_top_services LIMIT :limit
        - Access: manager, admin.

Database views used (defined in db/views/reports.sql):
    v_room_occupancy, v_guest_billing_summary, v_service_usage_breakdown,
    v_monthly_revenue, v_top_services

Dependencies:
    - app.db            (get_db)
    - app.dependencies  (get_current_user, require_role)
"""

from fastapi import APIRouter

router = APIRouter()

# TODO: Implement reports router endpoints (see docstring above for spec)
