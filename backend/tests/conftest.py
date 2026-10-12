"""
backend/tests/conftest.py
=========================
Shared pytest setup.

- Puts backend/ on sys.path so `app` imports work from any directory.
- Marks DB-backed tests with `db` (any test using the `db_conn`/`api` fixtures,
  plus the script-style suites) and test_phase4 with `live_api`, so
  `pytest -m "not db and not live_api"` runs only the mock-DB tests.
- `api` fixture: an httpx client wired to the FastAPI app in-process, with
  get_db overridden to one real connection inside a transaction that is
  rolled back after the test, so tests can insert data without leaving any.
  Each request runs in its own savepoint, so a request that fails in the DB
  (e.g. a 402 checkout) is undone on its own and the test can carry on, much
  like an autocommitted statement in production.
"""

import sys
from pathlib import Path

import asyncpg
import pytest
from httpx import ASGITransport, AsyncClient

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.config import settings  # noqa: E402
from app.db import get_db  # noqa: E402
from app.main import app  # noqa: E402

SEED_PASSWORD = "SkyNest@2026"
SEED_USERS = {
    "admin": "admin@skynest.lk",
    "manager": "mgr.colombo@skynest.lk",
    "receptionist": "rec.colombo@skynest.lk",
    "guest": "kamal@mail.com",
}

_DB_SCRIPT_FILES = {"test_business_logic.py", "test_db_crud.py"}
_LIVE_API_FILES = {"test_phase4.py"}


def pytest_collection_modifyitems(items):
    for item in items:
        name = item.path.name
        fixtures = getattr(item, "fixturenames", ())
        uses_db = "db_conn" in fixtures or "pool" in fixtures
        if uses_db or name in _DB_SCRIPT_FILES or name in _LIVE_API_FILES:
            item.add_marker(pytest.mark.db)
        if name in _LIVE_API_FILES:
            item.add_marker(pytest.mark.live_api)


@pytest.fixture
async def db_conn():
    """One real connection; everything done through it is rolled back."""
    conn = await asyncpg.connect(settings.DATABASE_URL)
    tx = conn.transaction()
    await tx.start()
    try:
        yield conn
    finally:
        await tx.rollback()
        await conn.close()


@pytest.fixture
async def api(db_conn):
    async def _override_get_db():
        async with db_conn.transaction():
            yield db_conn

    app.dependency_overrides[get_db] = _override_get_db
    try:
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test/api"
        ) as client:
            yield client
    finally:
        app.dependency_overrides.pop(get_db, None)


def _login_with(client):
    async def _login(role: str) -> dict:
        resp = await client.post(
            "/auth/login",
            json={"email": SEED_USERS.get(role, role), "password": SEED_PASSWORD},
        )
        assert resp.status_code == 200, resp.text
        return {"Authorization": f"Bearer {resp.json()['access_token']}"}

    return _login


@pytest.fixture
def login(api):
    """
    `headers = await login("admin")` -> Authorization header for a seed user.
    Takes a role from SEED_USERS or any seed email (e.g. "rec.galle@skynest.lk").
    """
    return _login_with(api)


# ── Concurrency tests: real commits on separate connections ─────────────────
# The rolled-back `db_conn` is one connection, so it can't run requests in
# parallel. These fixtures autocommit like production; tests using them must
# delete whatever they create.

@pytest.fixture
async def pool():
    pool = await asyncpg.create_pool(settings.DATABASE_URL, min_size=2, max_size=12)
    try:
        yield pool
    finally:
        await pool.close()


@pytest.fixture
async def pool_api(pool):
    """In-process client where each request gets its own pooled connection."""
    async def _override_get_db():
        async with pool.acquire() as conn:
            yield conn

    app.dependency_overrides[get_db] = _override_get_db
    try:
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test/api"
        ) as client:
            yield client
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.fixture
def pool_login(pool_api):
    """Same as `login`, for tests using `pool_api`."""
    return _login_with(pool_api)
