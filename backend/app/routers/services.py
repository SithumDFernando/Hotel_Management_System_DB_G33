"""
backend/app/routers/services.py
================================
Purpose:
    Manages hotel services (spa, laundry, room service, etc.) and tracks
    service usage against checked-in bookings. Receptionists use this to
    add chargeable services to a guest's stay from the `ServiceRequest` page.

Endpoints to implement:
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

# TODO: Implement services router
