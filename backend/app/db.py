"""
backend/app/db.py
=================
Purpose:
    Manages the asyncpg (or psycopg3) connection pool to the PostgreSQL
    database and exposes an async context manager / dependency that routers
    use to obtain a database connection for the duration of a single request.

    Using a connection pool (rather than opening a new connection per request)
    is critical for performance under concurrent load.

What to implement here:
    1. Create an async connection pool on startup using `asyncpg.create_pool()`:

        pool: asyncpg.Pool | None = None

        async def init_db():
            global pool
            pool = await asyncpg.create_pool(
                dsn=settings.DATABASE_URL,
                min_size=2,
                max_size=10,
            )

        async def close_db():
            if pool:
                await pool.close()

    2. Call `init_db()` / `close_db()` from FastAPI lifespan events in main.py.

    3. Define a FastAPI dependency that yields a connection from the pool:

        async def get_db() -> asyncpg.Connection:
            async with pool.acquire() as conn:
                yield conn

       This is used in router function signatures:
         @router.get("/rooms")
         async def list_rooms(db: Connection = Depends(get_db)):
             ...

Dependencies:
    - app.config.settings (DATABASE_URL)
    - asyncpg             (install: pip install asyncpg)
"""

# TODO: Implement db.py
