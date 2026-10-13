"""
backend/tests/test_guest_links.py
=================================
ISSUE-11: a guest account always has exactly one guest profile, and a staff
account never has one.
- API: guest accounts need a guest profile (422), a profile can back only one
  login (409), staff can't be linked to a profile (422).
- DB: uq_user_account_guest and fk_user_account_guest (RESTRICT).
- Defence in depth: a guest login without a profile gets 403 everywhere,
  never a 500 or another guest's data.
The role ↔ link matrix itself is covered by test_role_links.py (ISSUE-06).
Runs in-process against the seeded database; each test is rolled back.

Run:  cd backend && pytest tests/test_guest_links.py -q
"""

import asyncpg
import pytest

# Seed data (db/seed/sample_data.sql)
COLOMBO = "a0000000-0000-0000-0000-000000000001"
ROOM_102_COLOMBO = "e0000000-0000-0000-0000-000000000002"
GUEST_KAMAL = "f0000000-0000-0000-0000-000000000001"  # has login kamal@mail.com
GUEST_JOHN = "f0000000-0000-0000-0000-000000000003"   # no login
BK01_KAMAL = "30000000-0000-0000-0000-000000000001"
PASSWORD = "Str0ng!Passw0rd"

CREATE_PATHS = ["/admin/users", "/auth/register"]


def _guest_account(guest_id, **overrides):
    body = {"email": "new.guest@mail.com", "password": PASSWORD, "role": "guest",
            "guest_id": guest_id}
    body.update(overrides)
    return body


# ── Write-side validation ────────────────────────────────────────────────────

@pytest.mark.parametrize("path", CREATE_PATHS)
async def test_guest_account_requires_profile(api, login, path):
    resp = await api.post(path, json=_guest_account(None), headers=await login("admin"))
    assert resp.status_code == 422, resp.text
    assert "guest profile" in resp.json()["detail"]


@pytest.mark.parametrize("path", CREATE_PATHS)
async def test_profile_already_linked_is_409(api, login, db_conn, path):
    resp = await api.post(path, json=_guest_account(GUEST_KAMAL), headers=await login("admin"))
    assert resp.status_code == 409, resp.text
    assert resp.json()["detail"] == "This guest profile is already linked to another account."
    assert await db_conn.fetchval(
        "SELECT COUNT(*) FROM user_account WHERE guest_id = $1::UUID", GUEST_KAMAL
    ) == 1


@pytest.mark.parametrize("path", CREATE_PATHS)
async def test_unlinked_profile_gets_account(api, login, path):
    resp = await api.post(path, json=_guest_account(GUEST_JOHN), headers=await login("admin"))
    assert resp.status_code == 201, resp.text


@pytest.mark.parametrize("path", CREATE_PATHS)
async def test_staff_account_cannot_have_profile(api, login, path):
    body = _guest_account(GUEST_JOHN, role="receptionist", branch_id=COLOMBO)
    resp = await api.post(path, json=body, headers=await login("admin"))
    assert resp.status_code == 422, resp.text


async def test_staff_cannot_become_guest(api, login, db_conn):
    rec = await db_conn.fetchval(
        "SELECT account_id FROM user_account WHERE email = 'rec.colombo@skynest.lk'"
    )
    resp = await api.patch(f"/admin/users/{rec}", json={"role": "guest", "branch_id": ""},
                           headers=await login("admin"))
    assert resp.status_code == 422, resp.text


# ── DB constraints ───────────────────────────────────────────────────────────

async def test_db_rejects_second_login_for_profile(db_conn):
    with pytest.raises(asyncpg.exceptions.UniqueViolationError) as exc:
        async with db_conn.transaction():
            await db_conn.execute(
                """
                INSERT INTO user_account (email, password_hash, role, guest_id)
                VALUES ('second@mail.com', 'x', 'guest', $1::UUID)
                """,
                GUEST_KAMAL,
            )
    assert exc.value.constraint_name == "uq_user_account_guest"


async def test_profile_with_login_cannot_be_deleted(db_conn):
    # A fresh profile whose only reference is its login
    guest_id = await db_conn.fetchval(
        """
        INSERT INTO guest (full_name, nic_passport, email, phone)
        VALUES ('Test Guest', 'T0000001', 't@mail.com', '0000000') RETURNING guest_id
        """
    )
    await db_conn.execute(
        "INSERT INTO user_account (email, password_hash, role, guest_id) "
        "VALUES ('t@mail.com', 'x', 'guest', $1)",
        guest_id,
    )
    with pytest.raises(asyncpg.exceptions.ForeignKeyViolationError) as exc:
        async with db_conn.transaction():
            await db_conn.execute("DELETE FROM guest WHERE guest_id = $1", guest_id)
    assert exc.value.constraint_name == "fk_user_account_guest"


# ── Defence in depth: a guest login without a profile gets 403 ───────────────

async def _detach_kamal_profile(db_conn):
    """Bypass the CHECK inside the rolled-back test transaction."""
    await db_conn.execute(
        "ALTER TABLE user_account DROP CONSTRAINT chk_user_account_role_links"
    )
    await db_conn.execute(
        "UPDATE user_account SET guest_id = NULL WHERE email = 'kamal@mail.com'"
    )


@pytest.mark.parametrize(("method", "path", "body"), [
    ("GET", "/bookings", None),
    ("GET", f"/bookings/{BK01_KAMAL}", None),
    ("PATCH", f"/bookings/{BK01_KAMAL}/cancel", {}),
    ("GET", f"/billing/{BK01_KAMAL}", None),
    ("GET", f"/payments/{BK01_KAMAL}", None),
    ("GET", f"/services/{BK01_KAMAL}/usage", None),
    ("GET", f"/guests/{GUEST_KAMAL}", None),
    ("POST", "/bookings", {
        "guest_id": GUEST_KAMAL, "room_id": ROOM_102_COLOMBO,
        "check_in_date": "2030-01-10", "check_out_date": "2030-01-12",
        "payment_option": "Cash",
    }),
])
async def test_guest_without_profile_is_refused(api, login, db_conn, method, path, body):
    await _detach_kamal_profile(db_conn)
    resp = await api.request(method, path, json=body, headers=await login("guest"))
    assert resp.status_code == 403, f"{method} {path}: {resp.status_code} {resp.text}"
    assert resp.json()["detail"] == "This account has no guest profile. Contact the front desk."
