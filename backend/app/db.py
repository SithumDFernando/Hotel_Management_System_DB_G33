"""
backend/app/db.py
=================
Purpose:
    Manages the asyncpg connection pool to the PostgreSQL database.

    - `init_db()` is called once at FastAPI startup to create the pool.
    - `close_db()` is called once at FastAPI shutdown to release connections.
    - `get_db()` is a FastAPI dependency that yields a single connection
      from the pool for the duration of one HTTP request.

Usage in routers:
    from app.db import get_db

    @router.get("/rooms")
    async def list_rooms(db = Depends(get_db)):
        rows = await db.fetch("SELECT * FROM room")
        return rows
"""

import asyncpg

from app.config import settings

# Module-level pool reference — initialised at startup
pool: asyncpg.Pool | None = None


async def init_db() -> None:
    """
    Create the asyncpg connection pool.
    Called from the FastAPI lifespan handler in main.py.
    """
    global pool
    pool = await asyncpg.create_pool(
        dsn=settings.DATABASE_URL,
        min_size=2,   # keep at least 2 connections warm
        max_size=10,  # max concurrent DB connections
    )


async def close_db() -> None:
    """
    Gracefully close all connections in the pool.
    Called from the FastAPI lifespan handler in main.py.
    """
    global pool
    if pool:
        await pool.close()
        pool = None


async def get_db():
    """
    FastAPI dependency: acquires a connection from the pool, yields it to
    the route handler, and releases it back to the pool when the request
    is done (even if the handler raised an exception).

    Usage:
        async def my_endpoint(db = Depends(get_db)):
            rows = await db.fetch("SELECT ...")
    """
    async with pool.acquire() as conn:
        yield conn
