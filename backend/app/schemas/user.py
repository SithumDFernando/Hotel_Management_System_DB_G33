"""
backend/app/schemas/user.py
===========================
Purpose:
    Pydantic models for admin user-account management.
"""

from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    email: EmailStr = Field(max_length=100)
    password: str
    role: str                        # 'admin' | 'manager' | 'receptionist' | 'guest'
    branch_id: Optional[UUID] = None
    guest_id: Optional[UUID] = None


class UserPatch(BaseModel):
    role: Optional[str] = None
    # "" clears the branch assignment
    branch_id: UUID | Literal[""] | None = None


class UserOut(BaseModel):
    account_id: str
    email: str
    role: str
    branch_id: Optional[str] = None
    branch_name: Optional[str] = None
    guest_id: Optional[str] = None
    guest_name: Optional[str] = None


class UserListResponse(BaseModel):
    users: list[UserOut]
    total: int
