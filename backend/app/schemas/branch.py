"""
backend/app/schemas/branch.py
=============================
Purpose:
    Pydantic models for branches: the admin management view (CRUD + stats)
    and the public read-only directory.
"""

from typing import Annotated, Optional

from pydantic import BaseModel, Field

# Lengths mirror the branch table in db/schema/01_tables.sql
BranchName = Annotated[str, Field(min_length=1, max_length=100)]
BranchCity = Annotated[str, Field(min_length=1, max_length=50)]
BranchAddress = Annotated[str, Field(min_length=1, max_length=255)]
BranchPhone = Annotated[str, Field(min_length=1, max_length=20)]
ManagerName = Annotated[str, Field(min_length=1, max_length=100)]


# -- Admin --------------------------------------------------------------------

class BranchCreate(BaseModel):
    name: BranchName
    city: BranchCity
    address: BranchAddress
    phone: BranchPhone
    manager_name: ManagerName


class BranchUpdate(BaseModel):
    name: Optional[BranchName] = None
    city: Optional[BranchCity] = None
    address: Optional[BranchAddress] = None
    phone: Optional[BranchPhone] = None
    manager_name: Optional[ManagerName] = None


class BranchOut(BaseModel):
    branch_id: str
    name: str
    city: str
    address: str
    phone: str
    manager_name: str
    total_rooms: int
    active_bookings: int


class BranchListResponse(BaseModel):
    branches: list[BranchOut]
    total: int


# -- Public -------------------------------------------------------------------

class PublicBranch(BaseModel):
    branch_id: str
    name: str
    city: str
    address: str
    phone: str


class PublicBranchList(BaseModel):
    branches: list[PublicBranch]
    total: int
