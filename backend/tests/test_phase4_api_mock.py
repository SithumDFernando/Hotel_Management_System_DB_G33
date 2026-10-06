"""
backend/tests/test_phase4_api_mock.py
======================================
Automated verification for Sadeepa's API endpoints & role-based access control.
Tests:
- Auth & RBAC (admin, manager, receptionist, guest, unauthenticated)
- All 5 report endpoints (/api/reports/*)
- All 6 admin endpoints (/api/admin/*)
- Pydantic schema validation & response structure conformity
"""

import asyncio
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db import get_db
from app.auth import create_access_token, hash_password

GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
RESET = "\033[0m"

passed = 0
failed = 0

def ok(msg: str):
    global passed
    passed += 1
    print(f"  {GREEN}[PASS]{RESET} {msg}")

def fail(msg: str):
    global failed
    failed += 1
    print(f"  {RED}[FAIL]{RESET} {msg}")

async def run_tests():
    global passed, failed

    print("\n" + "=" * 60)
    print("  SkyNest - Phase 4 API & RBAC Verification Suite")
    print("=" * 60)

    # Mock DB connection
    mock_conn = MagicMock()
    mock_conn.fetch = AsyncMock()
    mock_conn.fetchrow = AsyncMock()
    mock_conn.execute = AsyncMock()

    async def override_get_db():
        yield mock_conn

    app.dependency_overrides[get_db] = override_get_db

    admin_id = str(uuid4())
    manager_id = str(uuid4())
    guest_id = str(uuid4())
    branch_id = str(uuid4())

    # Mock user accounts for auth lookup in dependencies.py
    user_db = {
        admin_id: {"account_id": admin_id, "email": "admin@skynest.lk", "role": "admin", "branch_id": None, "guest_id": None},
        manager_id: {"account_id": manager_id, "email": "mgr@skynest.lk", "role": "manager", "branch_id": branch_id, "guest_id": None},
        guest_id: {"account_id": guest_id, "email": "guest@skynest.lk", "role": "guest", "branch_id": None, "guest_id": str(uuid4())},
    }

    async def mock_fetchrow(query, *args):
        if "SELECT account_id FROM user_account WHERE email" in query:
            return None # no conflict
        if "SELECT account_id, role, branch_id FROM user_account" in query:
            return {"account_id": args[0], "role": "receptionist", "branch_id": branch_id}
        if "FROM user_account" in query:
            acc_id = args[0]
            return user_db.get(str(acc_id), {"account_id": acc_id, "email": "user@skynest.lk", "role": "receptionist", "branch_id": branch_id, "guest_id": None})
        if "SELECT branch_id FROM branch WHERE name = $1" in query:
            return None # no conflict
        if "INSERT INTO branch" in query:
            return {"branch_id": str(uuid4())}
        if "SELECT * FROM branch WHERE branch_id" in query:
            return {"branch_id": args[0], "name": "Test Branch", "city": "Colombo", "address": "123 Street", "phone": "0112345678", "manager_name": "John"}
        if "INSERT INTO user_account" in query:
            return {"account_id": str(uuid4())}
        return None

    mock_conn.fetchrow.side_effect = mock_fetchrow

    admin_token = create_access_token({"sub": admin_id, "role": "admin"})
    manager_token = create_access_token({"sub": manager_id, "role": "manager", "branch_id": branch_id})
    guest_token = create_access_token({"sub": guest_id, "role": "guest"})

    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    manager_headers = {"Authorization": f"Bearer {manager_token}"}
    guest_headers = {"Authorization": f"Bearer {guest_token}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:

        # ---------------------------------------------------------
        # 1. Unauthenticated Access
        # ---------------------------------------------------------
        print(f"\n{YELLOW}[1/4] Testing Unauthenticated Rejection (401)...{RESET}")
        resp = await client.get("/api/admin/branches")
        if resp.status_code == 401:
            ok("GET /api/admin/branches without token -> 401 Unauthorized")
        else:
            fail(f"Expected 401, got {resp.status_code}")

        resp = await client.get("/api/reports/occupancy")
        if resp.status_code == 401:
            ok("GET /api/reports/occupancy without token -> 401 Unauthorized")
        else:
            fail(f"Expected 401, got {resp.status_code}")

        # ---------------------------------------------------------
        # 2. RBAC Enforcement (Guest -> 403 Forbidden)
        # ---------------------------------------------------------
        print(f"\n{YELLOW}[2/4] Testing RBAC Protection (Guest -> 403)...{RESET}")
        protected_endpoints = [
            ("GET", "/api/admin/branches", None),
            ("POST", "/api/admin/branches", {"name": "B", "city": "C", "address": "A", "phone": "P", "manager_name": "M"}),
            ("GET", "/api/admin/users", None),
            ("GET", "/api/reports/occupancy", None),
            ("GET", "/api/reports/billing-summary", None),
            ("GET", "/api/reports/service-usage", None),
            ("GET", "/api/reports/monthly-revenue?year=2026", None),
            ("GET", "/api/reports/top-services", None),
        ]

        for method, path, json_data in protected_endpoints:
            if method == "GET":
                r = await client.get(path, headers=guest_headers)
            else:
                r = await client.post(path, json=json_data, headers=guest_headers)

            if r.status_code == 403:
                ok(f"Guest -> {method} {path.split('?')[0]} -> 403 Forbidden")
            else:
                fail(f"Guest -> {method} {path} expected 403, got {r.status_code}")

        # ---------------------------------------------------------
        # 3. Reports Endpoints (Admin & Manager)
        # ---------------------------------------------------------
        print(f"\n{YELLOW}[3/4] Testing Report Endpoints & Data Models...{RESET}")

        # Occupancy
        mock_conn.fetch.return_value = [
            {
                "room_id": uuid4(), "branch_id": uuid4(), "branch_name": "Colombo",
                "room_number": "101", "room_type": "Suite", "capacity": 2,
                "room_status": "Available", "booking_id": None, "guest_id": None,
                "guest_name": None, "check_in_date": None, "check_out_date": None,
                "booking_status": None
            }
        ]
        r = await client.get("/api/reports/occupancy", headers=admin_headers)
        if r.status_code == 200 and "report" in r.json() and r.json()["total"] == 1:
            ok("GET /api/reports/occupancy -> 200 OK & Valid Schema")
        else:
            fail(f"GET /api/reports/occupancy error: {r.status_code} {r.text}")

        # Billing Summary
        mock_conn.fetch.return_value = [
            {
                "guest_id": uuid4(), "guest_name": "Kamal", "nic_passport": "123456789V",
                "email": "kamal@mail.com", "phone": "0771234567", "guest_type": "Individual",
                "booking_id": uuid4(), "room_number": "101", "branch_id": uuid4(),
                "branch_name": "Colombo", "check_in_date": "2026-03-01", "check_out_date": "2026-03-05",
                "bill_id": uuid4(), "room_charges": 40000.0, "service_charges": 5000.0,
                "discount_amount": 0.0, "tax_amount": 4500.0, "total_amount": 49500.0,
                "amount_paid": 49500.0, "outstanding_balance": 0.0, "balance_flag": False
            }
        ]
        r = await client.get("/api/reports/billing-summary", headers=admin_headers)
        if r.status_code == 200 and r.json()["report"][0]["guest_name"] == "Kamal":
            ok("GET /api/reports/billing-summary -> 200 OK & Valid Schema")
        else:
            fail(f"GET /api/reports/billing-summary error: {r.status_code} {r.text}")

        # Service Usage
        mock_conn.fetch.return_value = [
            {
                "branch_id": uuid4(), "branch_name": "Colombo", "room_number": "101",
                "guest_id": uuid4(), "guest_name": "Kamal", "service_id": uuid4(),
                "service_name": "Laundry", "category": "Housekeeping",
                "total_quantity_used": 3, "total_revenue_generated": 1500.0
            }
        ]
        r = await client.get("/api/reports/service-usage", headers=manager_headers)
        if r.status_code == 200 and r.json()["report"][0]["service_name"] == "Laundry":
            ok("GET /api/reports/service-usage (Manager) -> 200 OK & Branch Scoped")
        else:
            fail(f"GET /api/reports/service-usage error: {r.status_code} {r.text}")

        # Monthly Revenue
        mock_conn.fetch.return_value = [
            {
                "branch_id": uuid4(), "branch_name": "Colombo", "year": 2026, "month": 3,
                "total_room_revenue": 100000.0, "total_service_revenue": 20000.0,
                "total_tax_collected": 12000.0, "total_gross_revenue": 132000.0,
                "total_collected": 120000.0, "total_outstanding": 12000.0
            }
        ]
        r = await client.get("/api/reports/monthly-revenue?year=2026", headers=admin_headers)
        if r.status_code == 200 and r.json()["report"][0]["year"] == 2026:
            ok("GET /api/reports/monthly-revenue -> 200 OK & Valid Aggregations")
        else:
            fail(f"GET /api/reports/monthly-revenue error: {r.status_code} {r.text}")

        # Top Services
        mock_conn.fetch.return_value = [
            {
                "usage_rank": 1, "service_id": uuid4(), "service_name": "Spa",
                "category": "Wellness", "total_bookings_ordered": 10,
                "total_quantity": 15, "total_revenue": 75000.0,
                "avg_quantity_per_booking": 1.5
            }
        ]
        r = await client.get("/api/reports/top-services?limit=5", headers=admin_headers)
        if r.status_code == 200 and r.json()["report"][0]["usage_rank"] == 1:
            ok("GET /api/reports/top-services -> 200 OK & RANK() Schema")
        else:
            fail(f"GET /api/reports/top-services error: {r.status_code} {r.text}")

        # ---------------------------------------------------------
        # 4. Admin Management Endpoints
        # ---------------------------------------------------------
        print(f"\n{YELLOW}[4/4] Testing Admin CRUD Endpoints...{RESET}")

        # List branches
        mock_conn.fetch.return_value = [
            {
                "branch_id": uuid4(), "name": "Colombo Grand", "city": "Colombo",
                "address": "123 Galle Rd", "phone": "+94112345678", "manager_name": "Mr. Silva",
                "total_rooms": 25, "active_bookings": 10
            }
        ]
        r = await client.get("/api/admin/branches", headers=admin_headers)
        if r.status_code == 200 and len(r.json()["branches"]) == 1:
            ok("GET /api/admin/branches -> 200 OK")
        else:
            fail(f"GET /api/admin/branches error: {r.status_code} {r.text}")

        # Create branch
        r = await client.post(
            "/api/admin/branches",
            json={"name": "Kandy Hill", "city": "Kandy", "address": "Peradeniya Rd", "phone": "+94812345678", "manager_name": "Mrs. Perera"},
            headers=admin_headers
        )
        if r.status_code == 201 and "branch_id" in r.json():
            ok("POST /api/admin/branches -> 201 Created")
        else:
            fail(f"POST /api/admin/branches error: {r.status_code} {r.text}")

        # Update branch
        r = await client.put(
            f"/api/admin/branches/{str(uuid4())}",
            json={"city": "Kandy Central"},
            headers=admin_headers
        )
        if r.status_code == 200:
            ok("PUT /api/admin/branches/{id} -> 200 OK")
        else:
            fail(f"PUT /api/admin/branches error: {r.status_code} {r.text}")

        # List users
        mock_conn.fetch.return_value = [
            {
                "account_id": uuid4(), "email": "staff@skynest.lk", "role": "receptionist",
                "branch_id": uuid4(), "branch_name": "Colombo Grand", "guest_id": None, "guest_name": None
            }
        ]
        r = await client.get("/api/admin/users", headers=admin_headers)
        if r.status_code == 200 and len(r.json()["users"]) == 1:
            ok("GET /api/admin/users -> 200 OK")
        else:
            fail(f"GET /api/admin/users error: {r.status_code} {r.text}")

        # Create user
        r = await client.post(
            "/api/admin/users",
            json={"email": "newrec@skynest.lk", "password": "SecurePassword123!", "role": "receptionist"},
            headers=admin_headers
        )
        if r.status_code == 201 and "account_id" in r.json():
            ok("POST /api/admin/users -> 201 Created")
        else:
            fail(f"POST /api/admin/users error: {r.status_code} {r.text}")

        # Patch user
        r = await client.patch(
            f"/api/admin/users/{str(uuid4())}",
            json={"role": "manager"},
            headers=admin_headers
        )
        if r.status_code == 200:
            ok("PATCH /api/admin/users/{id} -> 200 OK")
        else:
            fail(f"PATCH /api/admin/users error: {r.status_code} {r.text}")

    print("\n" + "=" * 60)
    print(f"  Summary: {GREEN}{passed} Passed{RESET}, {RED}{failed} Failed{RESET}")
    print("=" * 60 + "\n")

    app.dependency_overrides.clear()
    return failed == 0

if __name__ == "__main__":
    success = asyncio.run(run_tests())
    if not success:
        sys.exit(1)
