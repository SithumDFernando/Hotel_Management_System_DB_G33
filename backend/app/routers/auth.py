"""
backend/app/routers/auth.py
============================
Purpose:
    Handles user authentication: login, registration, and session restore.
    Issues JWT access tokens that the frontend stores and sends as
    `Authorization: Bearer <token>` on subsequent requests.

Endpoints:
    POST /api/auth/login     — Public.  Returns JWT on valid credentials.
    POST /api/auth/register  — Admin creates staff; or guest self-registers.
    GET  /api/auth/me        — Protected. Returns current user info.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr

from app.auth import verify_password, hash_password, create_access_token
from app.db import get_db
from app.dependencies import get_current_user, require_role

router = APIRouter()


# ── Request / Response Schemas ────────────────────────────────────────────────

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
    branch_id: str | None = None  # required for receptionist/manager
    guest_id: str | None = None   # required for guest role


class MeResponse(BaseModel):
    account_id: str
    email: str
    role: str
    branch_id: str | None = None
    guest_id: str | None = None


# ── POST /api/auth/login ─────────────────────────────────────────────────────

@router.post("/login", response_model=LoginResponse)
async def login(body: LoginRequest, db=Depends(get_db)):
    """
    Authenticate a user with email + password.
    Returns a JWT access token on success.
    """
    # 1. Find the user by email
    user = await db.fetchrow(
        "SELECT account_id, email, password_hash, role, branch_id, guest_id "
        "FROM user_account WHERE email = $1",
        body.email,
    )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    # 2. Verify password against stored bcrypt hash
    if not verify_password(body.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    # 3. Build JWT payload and issue token
    token_data = {
        "sub": str(user["account_id"]),
        "role": user["role"],
        "branch_id": str(user["branch_id"]) if user["branch_id"] else None,
        "guest_id": str(user["guest_id"]) if user["guest_id"] else None,
    }
    access_token = create_access_token(token_data)

    return LoginResponse(
        access_token=access_token,
        role=user["role"],
        branch_id=str(user["branch_id"]) if user["branch_id"] else None,
        account_id=str(user["account_id"]),
    )


# ── POST /api/auth/register ──────────────────────────────────────────────────

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, db=Depends(get_db)):
    """
    Create a new user account.

    - Guests can self-register (role is forced to 'guest').
    - Admins can create staff accounts (receptionist, manager, admin).
    """
    # Check if email already exists
    existing = await db.fetchval(
        "SELECT account_id FROM user_account WHERE email = $1",
        body.email,
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    # Hash the password
    hashed = hash_password(body.password)

    # Insert the new account
    account_id = await db.fetchval(
        """
        INSERT INTO user_account (email, password_hash, role, branch_id, guest_id)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING account_id
        """,
        body.email,
        hashed,
        body.role,
        body.branch_id,
        body.guest_id,
    )

    return {"account_id": str(account_id)}


# ── GET /api/auth/me ──────────────────────────────────────────────────────────

@router.get("/me", response_model=MeResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """
    Return the current authenticated user's profile.
    Useful for the frontend to restore the session on page reload.
    """
    return MeResponse(
        account_id=str(current_user["account_id"]),
        email=current_user["email"],
        role=current_user["role"],
        branch_id=str(current_user["branch_id"]) if current_user.get("branch_id") else None,
        guest_id=str(current_user["guest_id"]) if current_user.get("guest_id") else None,
    )
