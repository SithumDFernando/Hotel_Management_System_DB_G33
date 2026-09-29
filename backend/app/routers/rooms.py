"""
backend/app/routers/rooms.py
=============================
Purpose:
    Exposes API endpoints for browsing and managing hotel rooms and room types.
    The primary consumer is the `RoomsBrowse` and `Home` frontend pages, which
    filter available rooms by branch, type, and date range.

Endpoints to implement:
    GET /api/rooms
        - Query params: branch_id?, room_type?, check_in?, check_out?, status?
        - Returns rooms joined with room_type, branch, and room_rate.
        - If check_in + check_out are provided, exclude rooms that already have
          an ACTIVE booking overlapping that date range (anti-join on booking).
        - Access: Public (no auth required).

    GET /api/rooms/{room_id}
        - Returns full details for a single room: type, capacity, amenities list,
          current rate, branch info, and current status.
        - Access: Public.

    PATCH /api/rooms/{room_id}/status
        - Body: { status: "Available" | "Occupied" | "Maintenance" }
        - Allows admin/manager to manually change a room's status
          (e.g. mark as Maintenance).
        - Access: admin, manager.

Database tables used:
    room, room_type, branch, room_rate, room_amenity, amenity, booking

Dependencies:
    - app.db            (get_db)
    - app.dependencies  (get_current_user, require_role)
"""

# TODO: Implement rooms router
