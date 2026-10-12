"""
backend/app/schemas/room.py
===========================
Purpose:
    Room types and Pydantic models. `RoomStatus` mirrors the `room_status` enum
    in db/schema/01_tables.sql.
"""

from typing import Literal

from pydantic import BaseModel

RoomStatus = Literal["Available", "Occupied", "Maintenance"]


class BranchInfo(BaseModel):
    branch_id: str
    name: str
    city: str


class RoomTypeInfo(BaseModel):
    room_type_id: str
    type_name: str
    capacity: int


class AmenityInfo(BaseModel):
    amenity_name: str
    amenity_type: str
    count: int


class RoomOut(BaseModel):
    room_id: str
    room_number: str
    branch: BranchInfo
    room_type: RoomTypeInfo
    daily_rate: float
    status: str
    amenities: list[AmenityInfo] = []


class RoomListResponse(BaseModel):
    rooms: list[RoomOut]
    total: int


class StatusUpdateRequest(BaseModel):
    status: RoomStatus
