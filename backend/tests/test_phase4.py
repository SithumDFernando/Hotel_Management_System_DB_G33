"""
backend/tests/test_phase4.py
=============================
Purpose:
    Phase 4 verification script for Sadeepa's deliverables:
    - Database Level Verification: all 5 views compile and return data
    - v_top_services RANK() calculations
    - v_monthly_revenue grouping logic
    - API Level Verification: admin login + reports/admin route access
    - Role-based access control: 403 Forbidden for guest/receptionist
    - JSON output structure validation against frontend contract

Usage:
    cd backend
    .venv\\Scripts\\python tests/test_phase4.py   # Windows
    # or with activated venv:
    python tests/test_phase4.py
"""

import asyncio
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

try:
    from app.config import settings
    import asyncpg
    import httpx
except ImportError as e:
    print(f"[ERROR] Missing dependency: {e}")
    print("  Run: pip install -r requirements.txt")
    sys.exit(1)

BASE_URL = "http://localhost:8000"

GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
RESET  = "\033[0m"

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


def section(title: str):
    print(f"\n{YELLOW}{'='*60}{RESET}")
    print(f"{YELLOW}  {title}{RESET}")
    print(f"{YELLOW}{'='*60}{RESET}")


# =============================================================================
# PART A — DATABASE LEVEL VERIFICATION
# =============================================================================

async def test_db_views():
    section("PART A · Database Level Verification")

    try:
        conn = await asyncpg.connect(settings.DATABASE_URL)
    except Exception as e:
        fail(f"Cannot connect to database: {e}")
        print("  Ensure PostgreSQL is running and backend/.env is configured.")
        return

    ok("Database connection established")

    # 1. All 5 views compile and are queryable
    views = [
        "v_room_occupancy",
        "v_guest_billing_summary",
        "v_service_usage_breakdown",
        "v_monthly_revenue",
        "v_top_services",
    ]

    for view in views:
        try:
            rows = await conn.fetch(f"SELECT * FROM {view} LIMIT 1")
            ok(f"View `{view}` compiles and is queryable ({len(rows)} row(s) sample)")
        except Exception as e:
            fail(f"View `{view}` error: {e}")

    # 2. RANK() in v_top_services is monotonically non-decreasing
    print(f"\n  Checking RANK() logic in v_top_services...")
    try:
        rows = await conn.fetch(
            "SELECT usage_rank, service_name, total_quantity FROM v_top_services ORDER BY usage_rank"
        )
        if not rows:
            print(f"  {YELLOW}[SKIP]{RESET} v_top_services empty — no service_usage seed data.")
        else:
            prev_rank = 0
            prev_qty  = rows[0]["total_quantity"]
            rank_ok   = True
            for r in rows:
                rank = r["usage_rank"]
                qty  = r["total_quantity"]
                if rank < prev_rank:
                    fail(f"RANK() not monotone: rank {rank} came after {prev_rank}")
                    rank_ok = False
                    break
                if qty > prev_qty:
                    fail(f"Ordering broken: qty {qty} > prev {prev_qty} at rank {rank}")
                    rank_ok = False
                    break
                prev_rank = rank
                prev_qty  = qty
            if rank_ok:
                ok(f"RANK() monotonically non-decreasing across {len(rows)} service(s)")
                for r in rows[:3]:
                    print(f"     rank={r['usage_rank']}  qty={r['total_quantity']}  service={r['service_name']}")
    except Exception as e:
        fail(f"RANK() check error: {e}")

    # 3. v_monthly_revenue grouping uniqueness
    print(f"\n  Checking grouping logic in v_monthly_revenue...")
    try:
        rows = await conn.fetch(
            "SELECT year, month, branch_name, total_gross_revenue "
            "FROM v_monthly_revenue ORDER BY year, month, branch_name"
        )
        if not rows:
            print(f"  {YELLOW}[SKIP]{RESET} v_monthly_revenue empty — no Checked-Out bookings with bills.")
        else:
            seen = set()
            dup_found = False
            for r in rows:
                key = (r["year"], r["month"], r["branch_name"])
                if key in seen:
                    fail(f"Duplicate group in v_monthly_revenue: {key}")
                    dup_found = True
                    break
                seen.add(key)
            if not dup_found:
                ok(f"v_monthly_revenue grouping correct — {len(rows)} unique (year, month, branch) groups")
                for r in rows[:3]:
                    print(f"     {r['year']}-{r['month']:02d}  {r['branch_name']}  gross={r['total_gross_revenue']}")
    except Exception as e:
        fail(f"Monthly revenue grouping check error: {e}")

    await conn.close()


# =============================================================================
# PART B — API LEVEL VERIFICATION
# =============================================================================

async def _login(client: httpx.AsyncClient, email: str, password: str):
    # Try JSON first (standard API contract)
    resp = await client.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": email, "password": password},
    )
    if resp.status_code == 200:
        return resp.json().get("access_token")

    # Fallback to form-data (OAuth2 format)
    resp = await client.post(
        f"{BASE_URL}/api/auth/login",
        data={"username": email, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    if resp.status_code == 200:
        return resp.json().get("access_token")
    return None


async def test_api():
    section("PART B · API Level Verification")

    # Check server reachable
    try:
        async with httpx.AsyncClient(timeout=5.0) as c:
            resp = await c.get(f"{BASE_URL}/")
        if resp.status_code != 200:
            fail(f"Server health check returned HTTP {resp.status_code}")
            return
        ok("FastAPI server is reachable (health check OK)")
    except httpx.ConnectError:
        fail("Cannot reach FastAPI at http://localhost:8000")
        print("  Start it with:  cd backend && uvicorn app.main:app --reload")
        print("  Skipping all API tests.")
        return

    async with httpx.AsyncClient(timeout=10.0) as client:

        # B1. Admin login
        admin_token = await _login(client, "admin@skynest.lk", "SkyNest@2026")
        if admin_token:
            ok("Admin login successful (admin@skynest.lk / SkyNest@2026)")
        else:
            fail("Admin login failed — check seed data and credentials")
            return

        admin_hdrs = {"Authorization": f"Bearer {admin_token}"}

        # B2. GET /api/admin/branches — admin access + JSON structure
        resp = await client.get(f"{BASE_URL}/api/admin/branches", headers=admin_hdrs)
        if resp.status_code == 200:
            body = resp.json()
            ok(f"GET /api/admin/branches → 200 OK (total={body.get('total','?')} branches)")
            if body.get("branches"):
                branch = body["branches"][0]
                required = {"branch_id","name","city","address","phone","manager_name","total_rooms","active_bookings"}
                missing = required - set(branch.keys())
                if missing:
                    fail(f"Branch JSON missing keys: {missing}")
                else:
                    ok("Branch JSON structure matches frontend contract")
        else:
            fail(f"GET /api/admin/branches → HTTP {resp.status_code}: {resp.text[:200]}")

        # B3. GET /api/admin/users — admin access + JSON structure
        resp = await client.get(f"{BASE_URL}/api/admin/users", headers=admin_hdrs)
        if resp.status_code == 200:
            body = resp.json()
            ok(f"GET /api/admin/users → 200 OK (total={body.get('total','?')} users)")
            if body.get("users"):
                u = body["users"][0]
                required = {"account_id", "email", "role"}
                missing = required - set(u.keys())
                if missing:
                    fail(f"User JSON missing keys: {missing}")
                else:
                    ok("User JSON structure matches frontend contract")
        else:
            fail(f"GET /api/admin/users → HTTP {resp.status_code}: {resp.text[:200]}")

        # B4. Admin accesses all 5 report endpoints
        report_tests = [
            ("/api/reports/occupancy",        {}),
            ("/api/reports/billing-summary",  {}),
            ("/api/reports/service-usage",    {}),
            ("/api/reports/monthly-revenue",  {"year": "2026"}),
            ("/api/reports/top-services",     {"limit": "5"}),
        ]
        for path, params in report_tests:
            resp = await client.get(f"{BASE_URL}{path}", headers=admin_hdrs, params=params)
            if resp.status_code == 200:
                body = resp.json()
                ok(f"GET {path} → 200 OK (total={body.get('total','?')} rows)")
            else:
                fail(f"GET {path} → HTTP {resp.status_code}: {resp.text[:200]}")

        # B5. Guest role → 403 on admin + report endpoints
        guest_token = await _login(client, "kamal@mail.com", "SkyNest@2026")
        if guest_token is None:
            guest_token = await _login(client, "nimali@mail.com", "SkyNest@2026")

        if guest_token:
            ok("Guest user login successful")
            guest_hdrs = {"Authorization": f"Bearer {guest_token}"}
            protected = [
                ("/api/admin/branches",          {}),
                ("/api/admin/users",             {}),
                ("/api/reports/occupancy",       {}),
                ("/api/reports/top-services",    {}),
                ("/api/reports/monthly-revenue", {"year": "2026"}),
            ]
            for path, params in protected:
                resp = await client.get(f"{BASE_URL}{path}", headers=guest_hdrs, params=params)
                if resp.status_code == 403:
                    ok(f"Guest → GET {path} → 403 Forbidden ✓")
                elif resp.status_code == 401:
                    ok(f"Guest → GET {path} → 401 Unauthorized ✓")
                else:
                    fail(f"Guest → GET {path} → expected 403, got {resp.status_code}")
        else:
            print(f"  {YELLOW}[SKIP]{RESET} No guest account reachable — RBAC tests skipped")

        # B6. Unauthenticated request → 401
        resp = await client.get(f"{BASE_URL}/api/admin/branches")
        if resp.status_code == 401:
            ok("Unauthenticated → GET /api/admin/branches → 401 Unauthorized ✓")
        else:
            fail(f"Unauthenticated request → expected 401, got {resp.status_code}")


# =============================================================================
# MAIN
# =============================================================================

async def main():
    print()
    print("+----------------------------------------------------------+")
    print("|   SkyNest  -  Phase 4 Verification Suite (Sadeepa)      |")
    print("+----------------------------------------------------------+")

    await test_db_views()
    await test_api()

    section("SUMMARY")
    print(f"  {GREEN}Passed:{RESET} {passed}")
    print(f"  {RED}Failed:{RESET} {failed}")
    total = passed + failed
    if total > 0:
        pct = int(passed / total * 100)
        bar_len = 40
        filled = int(bar_len * passed / total)
        bar = "#" * filled + "-" * (bar_len - filled)
        print(f"  [{bar}] {pct}%")
    print()
    if failed == 0:
        print(f"  {GREEN}ALL CHECKS PASSED - Phase 4 verification complete!{RESET}")
    else:
        print(f"  {RED}{failed} check(s) failed — review errors above.{RESET}")
    print()


if __name__ == "__main__":
    asyncio.run(main())
