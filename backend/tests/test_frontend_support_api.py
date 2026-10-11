"""
backend/tests/test_frontend_support_api.py
===========================================
Mock-DB checks for the small endpoints added to support the React frontend:
- GET /api/branches (public)
Run:  cd backend && python tests/test_frontend_support_api.py
"""

import asyncio
import sys
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db import get_db

GREEN, RED, RESET = "\033[92m", "\033[91m", "\033[0m"
passed = failed = 0


def check(cond: bool, msg: str):
    global passed, failed
    if cond:
        passed += 1
        print(f"  {GREEN}[PASS]{RESET} {msg}")
    else:
        failed += 1
        print(f"  {RED}[FAIL]{RESET} {msg}")


async def run_tests():
    conn = MagicMock()
    conn.fetch = AsyncMock()
    conn.fetchrow = AsyncMock()
    conn.fetchval = AsyncMock()
    conn.execute = AsyncMock()

    async def override_get_db():
        yield conn

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        print("\n-- GET /api/branches (public)")
        conn.fetch.return_value = [
            {"branch_id": uuid4(), "name": "SkyNest Colombo", "city": "Colombo",
             "address": "42 Galle Face", "phone": "+94 11 234 5678"},
        ]
        r = await client.get("/api/branches")
        check(r.status_code == 200, "no token required -> 200")
        body = r.json()
        check(body["total"] == 1 and body["branches"][0]["city"] == "Colombo", "returns branch list")
        check("manager_name" not in body["branches"][0], "does not leak staff details")

    app.dependency_overrides.clear()
    print(f"\n{passed} passed, {failed} failed")
    return failed == 0


if __name__ == "__main__":
    sys.exit(0 if asyncio.run(run_tests()) else 1)
