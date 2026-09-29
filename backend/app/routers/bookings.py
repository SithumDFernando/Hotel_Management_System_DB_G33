"""
backend/app/routers/bookings.py
================================
Purpose:
    Core booking lifecycle: creation, check-in, check-out, cancellation,
    and retrieval. Delegates the heavy DB logic to the stored procedures
    defined in `db/procedures/booking.sql` and `db/procedures/checkin_checkout.sql`.

Endpoints to implement:
    GET /api/bookings
        - Query params: status?, guest_id?, room_id?, check_in?, check_out?,
                        from_date?, to_date?, branch_id?
        - Returns paginated list of bookings with joined guest and room info.
        - Managers see only their branch. Admins see all. Guests see their own.
        - Access: receptionist, manager, admin, guest.

    GET /api/bookings/{booking_id}
        - Returns full booking detail including guest, room, branch,
          service usage, and bill (if generated).
        - Access: same as above with ownership check for guests.

    POST /api/bookings
        - Body: BookingCreate schema (guest_id, room_id, check_in_date,
                check_out_date, payment_option).
        - Calls the `create_booking(...)` stored procedure which:
            (a) looks up the current room rate and snapshots it as
                `rate_at_booking`.
            (b) inserts the booking row.
            (c) The double-booking trigger fires automatically to block overlaps.
        - Returns the newly created booking.
        - Access: guest (own), receptionist, manager, admin.

    PATCH /api/bookings/{booking_id}/checkin
        - Calls the `perform_checkin(booking_id)` stored procedure which:
            - Sets booking.status = 'Checked-In'.
            - Sets booking.actual_checkin_time = NOW().
            - Sets room.status = 'Occupied' (via room_status_trigger or procedure).
        - Access: receptionist, manager, admin.

    PATCH /api/bookings/{booking_id}/checkout
        - Calls the `perform_checkout(booking_id)` stored procedure which:
            - Sets booking.status = 'Checked-Out'.
            - Sets booking.actual_checkout_time = NOW().
            - Sets room.status = 'Available'.
        - Access: receptionist, manager, admin.

    PATCH /api/bookings/{booking_id}/cancel
        - Sets booking.status = 'Cancelled'.
        - Access: receptionist, manager, admin, or the owning guest.

Database tables / procedures used:
    booking, room, guest | stored procedures: create_booking, perform_checkin,
    perform_checkout

Dependencies:
    - app.db              (get_db)
    - app.dependencies    (get_current_user, require_role)
    - app.schemas.booking (BookingCreate, BookingOut)
"""

# TODO: Implement bookings router
