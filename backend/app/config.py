"""
backend/app/config.py
=====================
Purpose:
    Centralised application configuration using Pydantic's BaseSettings.
    Reads environment variables (from a `.env` file in development or from
    real env vars in production) and exposes them as a typed, validated
    settings object that the rest of the application imports.

Usage:
    from app.config import settings
    print(settings.DATABASE_URL)
"""

from pathlib import Path
from pydantic_settings import BaseSettings

_BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.

    In development, create a `.env` file in the backend/ directory
    (copy from .env.example) and these values will be read automatically.
    """

    # ── PostgreSQL Connection ─────────────────────────────────────────────
    # Full asyncpg-compatible connection string.
    # Example: postgresql://skynest_user:password@localhost:5432/skynest
    DATABASE_URL: str

    # ── JWT / Auth ────────────────────────────────────────────────────────
    # Secret key used to sign JWT tokens. Generate with:
    #   python -c "import secrets; print(secrets.token_hex(32))"
    SECRET_KEY: str

    # Signing algorithm — HS256 is the standard for symmetric JWTs
    ALGORITHM: str = "HS256"

    # Token lifetime in minutes. 1440 = 24 hours (good for development)
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # ── CORS ──────────────────────────────────────────────────────────────
    # The origin URL of the React frontend (Vite dev server runs on :5173)
    FRONTEND_ORIGIN: str = "http://localhost:5173"

    class Config:
        env_file = (str(_BACKEND_DIR / ".env"), ".env")
        env_file_encoding = "utf-8"


# Module-level singleton — import this everywhere
settings = Settings()
