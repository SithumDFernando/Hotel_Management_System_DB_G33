"""
backend/app/auth.py
===================
Purpose:
    Core authentication utilities — kept separate from the auth *router*
    (routers/auth.py) to avoid circular imports.

    Provides:
    1. Password hashing / verification (bcrypt via passlib)
    2. JWT token creation / decoding (HS256 via PyJWT)
    3. Role constants

Usage:
    from app.auth import hash_password, verify_password
    from app.auth import create_access_token, decode_access_token
"""

from datetime import datetime, timedelta, timezone

import jwt
from passlib.context import CryptContext

from app.config import settings

# ── Password Hashing ─────────────────────────────────────────────────────────
import bcrypt


def hash_password(plain: str) -> str:
    """Hash a plain-text password using bcrypt."""
    pw_bytes = plain.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pw_bytes, salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """
    Compare a plain-text password against a stored bcrypt hash.
    Returns True if they match, False otherwise.
    """
    # The [:72] slices are only a safety net: bcrypt ignores bytes past 72,
    # and validate_new_password stops anyone setting a longer password
    pw_bytes = plain.encode("utf-8")[:72]
    return bcrypt.checkpw(pw_bytes, hashed.encode("utf-8"))


PASSWORD_MIN_CHARS = 8
PASSWORD_MAX_BYTES = 72  # bcrypt's limit


def validate_new_password(pw: str) -> str:
    """
    The one password policy for every account-creating endpoint (signup,
    register, admin create user). Raises ValueError, so Pydantic returns 422.
    """
    if len(pw) < PASSWORD_MIN_CHARS:
        raise ValueError(f"Password must be at least {PASSWORD_MIN_CHARS} characters")
    if len(pw.encode("utf-8")) > PASSWORD_MAX_BYTES:
        raise ValueError(f"Password must be at most {PASSWORD_MAX_BYTES} bytes")
    return pw


# A real bcrypt hash of a throwaway value: login checks unknown emails against
# it, so "no such user" costs the same bcrypt time as "wrong password" and
# response timing doesn't reveal which emails have accounts
DUMMY_PASSWORD_HASH = hash_password("timing-equaliser-not-a-real-password")


# ── JWT Token Management ─────────────────────────────────────────────────────

def create_access_token(data: dict) -> str:
    """
    Create a signed JWT access token.

    Args:
        data: Payload dict — must contain at minimum:
              {"sub": account_id, "role": user_role}
              Optionally: {"branch_id": ..., "guest_id": ...}

    Returns:
        Encoded JWT string.
    """
    payload = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload["exp"] = expire
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> dict:
    """
    Decode and verify a JWT token.

    Returns:
        The decoded payload dict.

    Raises:
        jwt.ExpiredSignatureError: if the token has expired.
        jwt.InvalidTokenError: if the token is malformed or invalid.
    """
    return jwt.decode(
        token,
        settings.SECRET_KEY,
        algorithms=[settings.ALGORITHM],
    )


# ── Role Constants ────────────────────────────────────────────────────────────
# Matches the user_role enum in the database.
ROLES = {"admin", "manager", "receptionist", "guest"}
