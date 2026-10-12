"""
backend/tests/test_role_links.py
================================
ISSUE-06: a manager/receptionist must always have a branch.
- API: create/patch/register reject invalid role ↔ branch/guest combinations
  (422) and an admin can't demote themselves (409).
- DB: chk_user_account_role_links and RESTRICT foreign keys back this up.
- Defence in depth: if a branchless manager/receptionist exists anyway, every
  branch-scoped endpoint answers 403, never cross-branch data or a 500.
Runs in-process against the seeded database; each test is rolled back.

Run:  cd backend && pytest tests/test_role_links.py -q
"""

import asyncpg
import pytest

# Seed data (db/seed/sample_data.sql)
COLOMBO = "a0000000-0000-0000-0000-000000000001"
KANDY = "a0000000-0000-0000-0000-000000000002"
GUEST_NIMALI = "f0000000-0000-0000-0000-000000000002"
BK06_GALLE_BOOKED = "30000000-0000-0000-0000-000000000006"
PASSWORD = "Str0ng!Passw0rd"


async def _account_id(db_conn, email):
    return str(await db_conn.fetchval(
        "SELECT account_id FROM user_account WHERE email = $1", email
    ))


def _new_user(**overrides):
    body = {"email": "new.staff@skynest.lk", "password": PASSWORD, "role": "manager"}
    body.update(overrides)
    return body


# ── Write-side validation: POST /admin/users and POST /auth/register ─────────

INVALID_NEW_ACCOUNTS = [
    pytest.param({"role": "manager"}, id="manager-without-branch"),
    pytest.param({"role": "receptionist"}, id="receptionist-without-branch"),
    pytest.param({"role": "receptionist", "branch_id": COLOMBO, "guest_id": GUEST_NIMALI},
                 id="staff-with-guest-profile"),
    pytest.param({"role": "admin", "branch_id": COLOMBO}, id="admin-with-branch"),
    pytest.param({"role": "guest"}, id="guest-without-profile"),
]


@pytest.mark.parametrize("fields", INVALID_NEW_ACCOUNTS)
@pytest.mark.parametrize("path", ["/admin/users", "/auth/register"])
async def test_create_rejects_invalid_role_links(api, login, db_conn, path, fields):
    resp = await api.post(path, json=_new_user(**fields), headers=await login("admin"))
    assert resp.status_code == 422, resp.text
    assert isinstance(resp.json()["detail"], str)
    assert await db_conn.fetchval(
        "SELECT COUNT(*) FROM user_account WHERE email = 'new.staff@skynest.lk'"
    ) == 0


@pytest.mark.parametrize("path", ["/admin/users", "/auth/register"])
async def test_create_valid_staff_account(api, login, path):
    body = _new_user(role="receptionist", branch_id=COLOMBO)
    resp = await api.post(path, json=body, headers=await login("admin"))
    assert resp.status_code == 201, resp.text


# ── PATCH /admin/users/{id}: validate the resulting state ────────────────────

async def test_patch_cannot_clear_branch_of_receptionist(api, login, db_conn):
    rec = await _account_id(db_conn, "rec.colombo@skynest.lk")
    resp = await api.patch(f"/admin/users/{rec}", json={"branch_id": ""},
                           headers=await login("admin"))
    assert resp.status_code == 422, resp.text
    assert str(await db_conn.fetchval(
        "SELECT branch_id FROM user_account WHERE account_id = $1::UUID", rec
    )) == COLOMBO


async def test_patch_promote_to_admin_requires_clearing_branch(api, login, db_conn):
    headers = await login("admin")
    rec = await _account_id(db_conn, "rec.colombo@skynest.lk")
    resp = await api.patch(f"/admin/users/{rec}", json={"role": "admin"}, headers=headers)
    assert resp.status_code == 422, resp.text
    resp = await api.patch(f"/admin/users/{rec}", json={"role": "admin", "branch_id": ""},
                           headers=headers)
    assert resp.status_code == 200, resp.text


async def test_patch_valid_role_and_branch_change(api, login, db_conn):
    rec = await _account_id(db_conn, "rec.colombo@skynest.lk")
    resp = await api.patch(f"/admin/users/{rec}", json={"role": "manager", "branch_id": KANDY},
                           headers=await login("admin"))
    assert resp.status_code == 200, resp.text


async def test_patch_guest_account_to_staff_rejected(api, login, db_conn):
    kamal = await _account_id(db_conn, "kamal@mail.com")
    resp = await api.patch(f"/admin/users/{kamal}",
                           json={"role": "receptionist", "branch_id": COLOMBO},
                           headers=await login("admin"))
    assert resp.status_code == 422, resp.text


@pytest.mark.parametrize("body", [
    {"role": "guest"},
    {"role": "manager", "branch_id": COLOMBO},
])
async def test_admin_cannot_demote_self(api, login, db_conn, body):
    admin = await _account_id(db_conn, "admin@skynest.lk")
    resp = await api.patch(f"/admin/users/{admin}", json=body, headers=await login("admin"))
    assert resp.status_code == 409, resp.text
    assert await db_conn.fetchval(
        "SELECT role FROM user_account WHERE account_id = $1::UUID", admin
    ) == "admin"


# ── DB constraints ───────────────────────────────────────────────────────────

@pytest.mark.parametrize(("role", "branch_id", "guest_id"), [
    ("manager", None, None),
    ("receptionist", None, None),
    ("receptionist", COLOMBO, GUEST_NIMALI),
    ("admin", COLOMBO, None),
    ("guest", None, None),
    ("guest", COLOMBO, GUEST_NIMALI),
])
async def test_check_constraint_rejects_invalid_links(db_conn, role, branch_id, guest_id):
    with pytest.raises(asyncpg.exceptions.CheckViolationError):
        async with db_conn.transaction():  # savepoint inside the test transaction
            await db_conn.execute(
                """
                INSERT INTO user_account (email, password_hash, role, branch_id, guest_id)
                VALUES ('x@skynest.lk', 'x', $1::user_role, $2::UUID, $3::UUID)
                """,
                role, branch_id, guest_id,
            )


async def test_seed_accounts_satisfy_constraint(db_conn):
    assert await db_conn.fetchval(
        """
        SELECT COUNT(*) FROM pg_constraint
        WHERE conname = 'chk_user_account_role_links' AND convalidated
        """
    ) == 1


async def test_branch_with_staff_cannot_be_deleted(db_conn):
    # A fresh branch whose only reference is one receptionist
    branch_id = await db_conn.fetchval(
        """
        INSERT INTO branch (name, city, address, phone, manager_name)
        VALUES ('Test', 'Test', 'Test', '000', 'Test') RETURNING branch_id
        """
    )
    await db_conn.execute(
        """
        INSERT INTO user_account (email, password_hash, role, branch_id)
        VALUES ('x@skynest.lk', 'x', 'receptionist', $1)
        """,
        branch_id,
    )
    with pytest.raises(asyncpg.exceptions.ForeignKeyViolationError) as exc:
        async with db_conn.transaction():
            await db_conn.execute("DELETE FROM branch WHERE branch_id = $1", branch_id)
    assert exc.value.constraint_name == "fk_user_account_branch"


# ── Defence in depth: a branchless staff account gets 403 everywhere ─────────

async def _make_branchless(db_conn, email):
    """Bypass the CHECK inside the rolled-back test transaction."""
    await db_conn.execute(
        "ALTER TABLE user_account DROP CONSTRAINT chk_user_account_role_links"
    )
    await db_conn.execute(
        "UPDATE user_account SET branch_id = NULL WHERE email = $1", email
    )


BRANCHLESS_MANAGER_ENDPOINTS = [
    "/reports/occupancy",
    "/reports/billing-summary",
    "/reports/service-usage",
    "/reports/monthly-revenue?year=2026",
    "/reports/top-services",
    "/bookings",
]


@pytest.mark.parametrize("path", BRANCHLESS_MANAGER_ENDPOINTS)
async def test_branchless_manager_is_refused(api, login, db_conn, path):
    await _make_branchless(db_conn, "mgr.kandy@skynest.lk")
    resp = await api.get(path, headers=await login("mgr.kandy@skynest.lk"))
    assert resp.status_code == 403, f"{path}: {resp.status_code} {resp.text}"
    assert "not assigned to a branch" in resp.json()["detail"]


@pytest.mark.parametrize(("method", "path"), [
    ("GET", "/bookings"),
    ("GET", f"/bookings/{BK06_GALLE_BOOKED}"),
    ("PATCH", f"/bookings/{BK06_GALLE_BOOKED}/checkin"),
])
async def test_branchless_receptionist_is_refused(api, login, db_conn, method, path):
    await _make_branchless(db_conn, "rec.galle@skynest.lk")
    resp = await api.request(method, path, headers=await login("rec.galle@skynest.lk"))
    assert resp.status_code == 403, f"{method} {path}: {resp.status_code} {resp.text}"
