"""
backend/app/schemas/room.py
===========================
Purpose:
    Shared room types. Mirrors the `room_status` enum in db/schema/01_tables.sql.
"""

from typing import Literal

RoomStatus = Literal["Available", "Occupied", "Maintenance"]
