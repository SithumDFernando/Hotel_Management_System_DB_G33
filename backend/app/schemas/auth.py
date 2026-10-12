"""
backend/app/schemas/auth.py
===========================
Purpose:
    Pydantic models for authentication: login, registration, signup, session restore.
"""

from datetime import date
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.fields import LoginEmail, NewPassword, NormEmail


class LoginRequest(BaseModel):
    email: LoginEmail
    password: str = Field(max_length=1024)


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    branch_id: str | None = None
    account_id: str


class RegisterRequest(BaseModel):
    email: NormEmail
    password: NewPassword
    role: str = "guest"           # default for self-registration
    branch_id: UUID | None = None  # required for receptionist/manager
    guest_id: UUID | None = None   # required for guest role


class SignupRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=150)
    nic_passport: str = Field(min_length=4, max_length=20)
    email: NormEmail
    phone: str = Field(min_length=7, max_length=20)
    password: NewPassword
    date_of_birth: date | None = None
    nationality: str | None = Field(default=None, max_length=50)


class MeResponse(BaseModel):
    account_id: str
    email: str
    role: str
    branch_id: str | None = None
    guest_id: str | None = None
