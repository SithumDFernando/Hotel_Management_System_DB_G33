"""
backend/tests/test_frontend_support_api.py
===========================================
Mock-DB checks for the small endpoints added to support the React frontend:
- GET /api/branches (public)
- POST /api/auth/signup (public guest signup) and admin-only POST /api/auth/register
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
from app.auth import create_access_token

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

        # ── auth: signup + hardened register ────────────────────────────────
        class _Tx:
            async def __aenter__(self):
                return self

            async def __aexit__(self, *exc):
                return False

        conn.transaction = MagicMock(return_value=_Tx())
        admin_id = str(uuid4())

        async def fetchrow(query, *args):
            if "FROM user_account" in query:
                return {"account_id": admin_id, "email": "admin@skynest.lk",
                        "role": "admin", "branch_id": None, "guest_id": None}
            return None

        conn.fetchrow.side_effect = fetchrow
        signup_body = {
            "full_name": "Test Guest", "nic_passport": "199912345678",
            "email": "new.guest@mail.com", "phone": "+94771234567",
            "password": "longenough1",
        }

        print("\n-- POST /api/auth/signup (public)")
        conn.fetchval.reset_mock()
        conn.fetchval.side_effect = [None, uuid4(), uuid4()]  # no dup email, guest_id, account_id
        r = await client.post("/api/auth/signup", json=signup_body)
        check(r.status_code == 201 and {"account_id", "guest_id"} <= set(r.json()), "creates guest + account -> 201")
        check(conn.fetchval.await_count == 3, "single transaction: dup check + 2 inserts")

        conn.fetchval.side_effect = [uuid4()]  # email already registered
        r = await client.post("/api/auth/signup", json=signup_body)
        check(r.status_code == 409, "duplicate email -> 409")

        r = await client.post("/api/auth/signup", json={**signup_body, "password": "short"})
        check(r.status_code == 422, "short password -> 422")

        r = await client.post("/api/auth/signup", json={**signup_body, "email": "not-an-email"})
        check(r.status_code == 422, "invalid email -> 422")

        print("\n-- POST /api/auth/register (admin only)")
        reg = {"email": "evil@x.com", "password": "pw123456", "role": "admin"}
        r = await client.post("/api/auth/register", json=reg)
        check(r.status_code == 403, "anonymous cannot self-assign admin role -> 403")

        guest_token = create_access_token({"sub": str(uuid4()), "role": "guest"})

        async def guest_row(query, *args):
            return {"account_id": uuid4(), "email": "g@x.com", "role": "guest",
                    "branch_id": None, "guest_id": uuid4()} if "FROM user_account" in query else None

        conn.fetchrow.side_effect = guest_row
        r = await client.post("/api/auth/register", json=reg, headers={"Authorization": f"Bearer {guest_token}"})
        check(r.status_code == 403, "guest token cannot register accounts -> 403")

        conn.fetchrow.side_effect = fetchrow
        admin_token = create_access_token({"sub": admin_id, "role": "admin"})
        conn.fetchval.side_effect = [None, uuid4()]
        r = await client.post("/api/auth/register", json={**reg, "email": "staff@skynest.lk", "role": "receptionist"},
                              headers={"Authorization": f"Bearer {admin_token}"})
        check(r.status_code == 201, "admin can create staff account -> 201")

    app.dependency_overrides.clear()
    print(f"\n{passed} passed, {failed} failed")
    return failed == 0


if __name__ == "__main__":
    sys.exit(0 if asyncio.run(run_tests()) else 1)
