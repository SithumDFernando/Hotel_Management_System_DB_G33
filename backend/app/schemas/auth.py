"""
backend/app/schemas/auth.py
===========================
Purpose:
    Pydantic models for authentication: login, registration, signup, session restore.
"""

from datetime import date
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.fields import LoginEmail, NewPassword, NormEmail
from app.schemas.guest import FullName, Gender, GuestOut, Nationality, Phone


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


# ── Self-service profile (GET/PATCH /auth/profile, POST /auth/change-password)

class ProfileResponse(BaseModel):
    account_id: str
    email: str
    role: str
    branch_id: str | None = None
    branch_name: str | None = None
    guest: GuestOut | None = None   # set for guest accounts with a linked profile


class ProfileUpdate(BaseModel):
    """
    What a guest may change about themselves. Email (the login) and
    NIC/passport (identity) are changed only by the front desk, so sending
    them is a 422 rather than being silently ignored.
    """
    model_config = ConfigDict(extra="forbid")

    full_name: FullName | None = None
    phone: Phone | None = None
    date_of_birth: date | None = None
    nationality: Nationality | None = None
    gender: Gender | None = None


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(max_length=1024)
    new_password: NewPassword
