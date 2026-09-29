"""
backend/app/config.py
=====================
Purpose:
    Centralised application configuration using Pydantic's BaseSettings.
    Reads environment variables (from a `.env` file in development or from
    real env vars in production) and exposes them as a typed, validated
    settings object that the rest of the application imports.

What to implement here:
    1. Define a `Settings` class that extends `pydantic_settings.BaseSettings`:

        class Settings(BaseSettings):
            # PostgreSQL connection details
            DATABASE_URL: str          # e.g. "postgresql://user:pass@localhost:5432/skynest"

            # JWT / Auth
            SECRET_KEY: str            # Random 32-byte hex string for signing JWTs
            ALGORITHM: str = "HS256"
            ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

            # CORS
            FRONTEND_ORIGIN: str = "http://localhost:5173"

            class Config:
                env_file = ".env"
                env_file_encoding = "utf-8"

    2. Create a module-level singleton:
        settings = Settings()

    3. All other modules should import `settings` from here rather than
       accessing `os.environ` directly:
        from app.config import settings

Environment variables expected (see backend/.env.example):
    DATABASE_URL
    SECRET_KEY
    ALGORITHM
    ACCESS_TOKEN_EXPIRE_MINUTES
    FRONTEND_ORIGIN
"""

# TODO: Implement config.py
