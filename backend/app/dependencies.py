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
    - assert_booking_access(): 404/403 guard for one booking (guest owns it,
                               branch staff share its branch, admin always)
    - assert_room_access():    404/403 guard for one room (branch staff only)
    - require_branch():        branch_id of a manager/receptionist, 403 if missing
    - require_guest_id():      guest_id of a guest account, 403 if missing
    - assert_guest_profile_free(): 409 if a guest profile already has a login
    - assert_role_links():     422 unless role ↔ branch_id/guest_id links are valid

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

    Design Note (Factory Pattern & Closure):
        FastAPI's Depends(...) expects a callable (function). Because we need to pass
        custom allowed roles per route, require_role(...) acts as a factory: it runs
        at route definition time and returns the customized inner `_guard` function.
        `_guard` "closes over" (remembers) `allowed_roles` and is what FastAPI actually
        calls on each incoming HTTP request. The leading underscore in `_guard` is a
        PEP 8 convention indicating it is an internal helper, not called directly.

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
    # Inner dependency function (closure) returned to FastAPI's Depends()
    async def _guard(current_user: dict = Depends(get_current_user)):
        if current_user["role"] not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{current_user['role']}' is not authorised. "
                       f"Required: {', '.join(allowed_roles)}",
            )
        return current_user

    return _guard


# ── Resource access guards (branch scoping / guest ownership) ─────────────────
# Every endpoint that acts on a specific booking or room calls one of these
# instead of checking access inline, so the rules live in one place.

BRANCH_SCOPED_ROLES = {"manager", "receptionist"}


def require_branch(user: dict) -> str | None:
    """
    The user's branch_id as a string, for scoping queries.

    Branch-scoped roles must have a branch: if one has none (misconfigured
    account), refuse with 403 instead of falling back to "no filter".
    Returns None for global roles (admin, guest).
    """
    if user["role"] not in BRANCH_SCOPED_ROLES:
        return None
    if not user.get("branch_id"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is not assigned to a branch. Contact an administrator.",
        )
    return str(user["branch_id"])


def require_guest_id(user: dict) -> str:
    """
    The guest_id of a guest-role user as a string, for ownership checks and
    query filters. A guest account without a guest profile (misconfigured)
    gets 403 instead of a "None" string reaching SQL.
    """
    if not user.get("guest_id"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has no guest profile. Contact the front desk.",
        )
    return str(user["guest_id"])


def _assert_same_branch(user: dict, branch_id, detail: str) -> None:
    if user["role"] in BRANCH_SCOPED_ROLES and require_branch(user) != str(branch_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


async def assert_booking_access(db, user: dict, booking_id):
    """
    Check that `user` may act on booking `booking_id`.

        404 if the booking doesn't exist.
        guest                  -> must own the booking (403 otherwise)
        manager / receptionist -> the booking's room must be in their branch (403)
        admin                  -> unrestricted

    Returns the record (booking_id, guest_id, room_id, branch_id, status) so
    callers don't need to query the booking again.
    """
    row = await db.fetchrow(
        """
        SELECT b.booking_id, b.guest_id, b.room_id, r.branch_id, b.status
        FROM booking b
        JOIN room r ON r.room_id = b.room_id
        WHERE b.booking_id = $1::UUID
        """,
        booking_id,
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    if user["role"] == "guest" and str(row["guest_id"]) != require_guest_id(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Guests can only access their own bookings.",
        )
    _assert_same_branch(user, row["branch_id"], "Not authorised for bookings of another branch.")
    return row


async def assert_room_access(db, user: dict, room_id):
    """
    Check that a staff `user` may act on room `room_id` (create a booking in
    it, change its status).

        404 if the room doesn't exist.
        manager / receptionist -> the room must be in their branch (403)
        admin, guest           -> unrestricted (rooms are publicly bookable)

    Returns the record (room_id, branch_id, status).
    """
    row = await db.fetchrow(
        "SELECT room_id, branch_id, status FROM room WHERE room_id = $1::UUID",
        room_id,
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found")
    _assert_same_branch(user, row["branch_id"], "Not authorised for rooms of another branch.")
    return row


# ── Account role ↔ link rules ─────────────────────────────────────────────────

def assert_role_links(role: str, branch_id, guest_id) -> None:
    """
    Validate the (role, branch_id, guest_id) an account will end up with,
    on create and on update. Mirrors the DB CHECK chk_user_account_role_links:

        admin                  -> no branch, no guest profile
        manager / receptionist -> branch required, no guest profile
        guest                  -> guest profile required, no branch

    Raises 422 with a readable message when the combination is invalid.
    """
    def reject(detail: str):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=detail)

    if role in BRANCH_SCOPED_ROLES:
        if not branch_id:
            reject(f"A {role} account must be assigned to a branch.")
        if guest_id:
            reject("Staff accounts cannot be linked to a guest profile.")
    elif role == "guest":
        if not guest_id:
            reject("A guest account must be linked to a guest profile.")
        if branch_id:
            reject("A guest account cannot be assigned to a branch.")
    elif role == "admin":
        if branch_id:
            reject("An admin account cannot be assigned to a branch (admins are global).")
        if guest_id:
            reject("Staff accounts cannot be linked to a guest profile.")


async def assert_guest_profile_free(db, guest_id) -> None:
    """409 if the guest profile is already linked to a login (one account per
    guest profile; backed by UNIQUE uq_user_account_guest)."""
    if guest_id and await db.fetchval(
        "SELECT 1 FROM user_account WHERE guest_id = $1::UUID", guest_id
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This guest profile is already linked to another account.",
        )
