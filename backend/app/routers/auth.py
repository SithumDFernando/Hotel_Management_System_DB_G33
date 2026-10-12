"""
backend/app/routers/auth.py
============================
Purpose:
    Handles user authentication: login, registration, and session restore.
    Issues JWT access tokens that the frontend stores and sends as
    `Authorization: Bearer <token>` on subsequent requests.

Endpoints:
    POST /api/auth/login     — Public.  Returns JWT on valid credentials.
    POST /api/auth/signup    — Public.  Guest self-registration (profile + account).
    POST /api/auth/register  — Admin only. Creates staff/any-role accounts.
    GET  /api/auth/me        — Protected. Returns current user info.
"""

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import verify_password, hash_password, create_access_token
from app.db import get_db
from app.dependencies import assert_role_links, get_current_user, get_optional_user, require_role
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    MeResponse,
    RegisterRequest,
    SignupRequest,
)

router = APIRouter()



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


# ── POST /api/auth/signup ────────────────────────────────────────────────────

@router.post("/signup", status_code=status.HTTP_201_CREATED)
async def signup(body: SignupRequest, db=Depends(get_db)):
    """
    Public guest self-registration: creates the guest profile and the login
    account atomically (both rows or neither). Role is always 'guest'.
    """
    if len(body.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password must be at least 8 characters",
        )

    exists = await db.fetchval(
        "SELECT account_id FROM user_account WHERE email = $1", body.email
    )
    if exists:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    hashed = hash_password(body.password)
    try:
        async with db.transaction():
            guest_id = await db.fetchval(
                """
                INSERT INTO guest (full_name, nic_passport, email, phone,
                                   date_of_birth, nationality, guest_type)
                VALUES ($1, $2, $3, $4, $5, $6, 'Individual')
                RETURNING guest_id
                """,
                body.full_name,
                body.nic_passport,
                body.email,
                body.phone,
                body.date_of_birth,
                body.nationality,
            )
            account_id = await db.fetchval(
                """
                INSERT INTO user_account (email, password_hash, role, guest_id)
                VALUES ($1, $2, 'guest', $3)
                RETURNING account_id
                """,
                body.email,
                hashed,
                guest_id,
            )
    except asyncpg.exceptions.UniqueViolationError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A guest with this NIC/passport or email already exists. "
                   "Please contact the front desk.",
        )

    return {"account_id": str(account_id), "guest_id": str(guest_id)}


# ── POST /api/auth/register ──────────────────────────────────────────────────

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(
    body: RegisterRequest,
    db=Depends(get_db),
    caller: dict | None = Depends(get_optional_user),
):
    """
    Create a user account for staff (admin only).

    Anonymous callers cannot choose a role or link an existing guest profile
    (that would allow privilege escalation / profile takeover) — guests use
    POST /api/auth/signup instead.
    """
    if caller is None or caller["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only an admin can create accounts here. Guests should use /api/auth/signup.",
        )
    if body.role not in {"admin", "manager", "receptionist", "guest"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role",
        )
    assert_role_links(body.role, body.branch_id, body.guest_id)

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
