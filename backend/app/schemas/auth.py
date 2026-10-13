"""
backend/app/schemas/auth.py
===========================
Purpose:
    Pydantic models for authentication: login, registration, signup, session restore.
"""

from datetime import date
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    branch_id: str | None = None
    account_id: str


class RegisterRequest(BaseModel):
    email: str
    password: str
    role: str = "guest"           # default for self-registration
    branch_id: UUID | None = None  # required for receptionist/manager
    guest_id: UUID | None = None   # required for guest role


class SignupRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=150)
    nic_passport: str = Field(min_length=4, max_length=20)
    email: EmailStr
    phone: str = Field(min_length=7, max_length=20)
    password: str
    date_of_birth: date | None = None
    nationality: str | None = Field(default=None, max_length=50)


class MeResponse(BaseModel):
    account_id: str
    email: str
    role: str
    branch_id: str | None = None
    guest_id: str | None = None
