"""
backend/app/dependencies.py
============================
Purpose:
    Reusable FastAPI dependency functions injected into route handlers via
    Depends(...). Keeps auth/authorisation logic DRY.

Provides:
    - oauth2_scheme:           Extracts Bearer token from Authorization header
    - get_current_user():      Decodes JWT → returns user dict
    - require_role(*roles):    Factory that returns a dependency asserting role
    - get_optional_user():     Returns user or None (for public endpoints)

Usage in routers:
    @router.get("/admin/stats")
    async def stats(user = Depends(require_role("admin"))):
        ...
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

import jwt as pyjwt

from app.auth import decode_access_token
from app.db import get_db

# ── OAuth2 Scheme ─────────────────────────────────────────────────────────────
# Tells FastAPI where to find the login endpoint (for Swagger UI's
# "Authorize" button) and how to extract the Bearer token from headers.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# Optional version — does not raise 401 if no token is present
optional_oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/auth/login", auto_error=False
)


# ── Get Current User ──────────────────────────────────────────────────────────

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db=Depends(get_db),
) -> dict:
    """
    Decode the JWT token, look up the user_account row, and return it
    as a dict.

    Raises HTTPException(401) if:
        - Token is missing, expired, or malformed.
        - The account_id in the token doesn't exist in the database.

    The returned dict contains:
        account_id, email, role, branch_id, guest_id
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_access_token(token)
        account_id: str = payload.get("sub")
        if account_id is None:
            raise credentials_exception
    except (pyjwt.ExpiredSignatureError, pyjwt.InvalidTokenError):
        raise credentials_exception

    # Look up the user in the database to ensure they still exist
    user = await db.fetchrow(
        """
        SELECT account_id, email, role, branch_id, guest_id
        FROM user_account
        WHERE account_id = $1
        """,
        account_id,
    )

    if user is None:
        raise credentials_exception

    return dict(user)


# ── Optional User (for public endpoints that behave differently when logged in)

async def get_optional_user(
    token: str | None = Depends(optional_oauth2_scheme),
    db=Depends(get_db),
) -> dict | None:
    """
    Same as get_current_user but returns None instead of raising 401
    when no token is provided. Useful for public endpoints that want to
    personalise the response if the user happens to be logged in.
    """
    if token is None:
        return None
    try:
        return await get_current_user(token=token, db=db)
    except HTTPException:
        return None


# ── Role Guard Factory ────────────────────────────────────────────────────────

def require_role(*allowed_roles: str):
    """
    Returns a FastAPI dependency that:
    1. Authenticates the user (via get_current_user).
    2. Checks that the user's role is in `allowed_roles`.
    3. Raises HTTP 403 Forbidden if not.

    Usage:
        @router.get("/admin/users")
        async def list_users(user = Depends(require_role("admin"))):
            ...

        @router.post("/bookings")
        async def create_booking(
            user = Depends(require_role("receptionist", "manager", "admin"))
        ):
            ...
    """
    async def _guard(current_user: dict = Depends(get_current_user)):
        if current_user["role"] not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{current_user['role']}' is not authorised. "
                       f"Required: {', '.join(allowed_roles)}",
            )
        return current_user

    return _guard
