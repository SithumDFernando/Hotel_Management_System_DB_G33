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
from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.auth import (
    DUMMY_PASSWORD_HASH, PASSWORD_MAX_BYTES, create_access_token, hash_password, verify_password,
)
from app.db import get_db
from app.rate_limit import client_ip, login_failures, signup_attempts
from app.dependencies import (
    assert_guest_profile_free, assert_role_links, get_current_user, get_optional_user, require_role,
)
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    MeResponse,
    RegisterRequest,
    SignupRequest,
)

router = APIRouter()

# Emails are stored lower-cased (NormEmail); LOWER(email) also matches any
# older mixed-case rows and uses the unique index uq_user_account_email_ci
EMAIL_TAKEN_SQL = "SELECT account_id FROM user_account WHERE LOWER(email) = $1"



# ── POST /api/auth/login ─────────────────────────────────────────────────────

@router.post("/login", response_model=LoginResponse)
async def login(body: LoginRequest, request: Request, db=Depends(get_db)):
    """
    Authenticate a user with email + password.
    Returns a JWT access token on success.
    After 10 failed attempts for one IP + email in 5 minutes: 429.
    """
    limit_key = f"{client_ip(request)}:{body.email}"
    login_failures.check(limit_key)

    # 1. Find the user by email (already trimmed + lower-cased)
    user = await db.fetchrow(
        "SELECT account_id, email, password_hash, role, branch_id, guest_id "
        "FROM user_account WHERE LOWER(email) = $1",
        body.email,
    )

    # 2. Verify the password. Unknown emails are checked against a dummy
    #    hash so both failures take the same bcrypt time (no email probing).
    hashed = user["password_hash"] if user else DUMMY_PASSWORD_HASH
    password_ok = verify_password(body.password, hashed)  # always runs bcrypt
    # bcrypt only reads 72 bytes; no account can have a longer password
    # (validate_new_password), so a longer input can't be the right one
    password_ok = password_ok and len(body.password.encode("utf-8")) <= PASSWORD_MAX_BYTES
    if user is None or not password_ok:
        login_failures.hit(limit_key)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    login_failures.reset(limit_key)

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
async def signup(body: SignupRequest, request: Request, db=Depends(get_db)):
    """
    Public guest self-registration: creates the guest profile and the login
    account atomically (both rows or neither). Role is always 'guest'.
    """
    # Password policy (NewPassword) and email normalisation run in SignupRequest
    ip = client_ip(request)
    signup_attempts.check(ip)
    signup_attempts.hit(ip)

    exists = await db.fetchval(EMAIL_TAKEN_SQL, body.email)
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
    existing = await db.fetchval(EMAIL_TAKEN_SQL, body.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )
    await assert_guest_profile_free(db, body.guest_id)

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
