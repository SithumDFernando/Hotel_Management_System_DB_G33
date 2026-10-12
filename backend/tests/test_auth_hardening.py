"""
backend/tests/test_auth_hardening.py
====================================
ISSUE-10: login and password weaknesses.
  a  unknown email vs wrong password take the same bcrypt time
  b  10 failed logins per IP + email in 5 minutes, then 429; sign-ups are
     limited per IP
  c  emails are case-insensitive (input lower-cased + unique LOWER(email))
  d  passwords over 72 bytes are refused, and a longer login input can't
     match a 72-byte prefix
  e  one password policy (8 chars to 72 bytes) for signup, register and
     admin-created accounts
Runs in-process against the seeded database; each test is rolled back and
the rate limiters are reset (conftest `_reset_rate_limits`).

Run:  cd backend && pytest tests/test_auth_hardening.py -q
"""

import statistics
import time

import asyncpg
import pytest

from app.auth import hash_password

PASSWORD = "SkyNest@2026"   # seed password
COLOMBO = "a0000000-0000-0000-0000-000000000001"


def _signup(n=0, **overrides):
    body = {"full_name": "New Guest", "nic_passport": f"NIC{n:06d}",
            "email": f"new.guest{n}@mail.com", "phone": "0771234567",
            "password": "Str0ng!Passw0rd"}
    body.update(overrides)
    return body


def _staff(**overrides):
    body = {"email": "new.staff@skynest.lk", "password": "Str0ng!Passw0rd",
            "role": "receptionist", "branch_id": COLOMBO}
    body.update(overrides)
    return body


async def _login(api, email, password=PASSWORD):
    return await api.post("/auth/login", json={"email": email, "password": password})


# ── a: timing ────────────────────────────────────────────────────────────────

async def test_a_unknown_email_costs_the_same_as_wrong_password(api):
    async def median_ms(email):
        samples = []
        for _ in range(5):
            start = time.perf_counter()
            resp = await _login(api, email, "wrong-password")
            samples.append((time.perf_counter() - start) * 1000)
            assert resp.status_code == 401
        return statistics.median(samples)

    known = await median_ms("kamal@mail.com")
    unknown = await median_ms("nobody-here@mail.com")
    # Before the fix: ~220 ms vs ~3 ms
    assert unknown >= 0.7 * known, (known, unknown)


# ── b: rate limiting ─────────────────────────────────────────────────────────

async def test_b_eleventh_failed_login_is_429(api):
    for _ in range(10):
        assert (await _login(api, "kamal@mail.com", "wrong")).status_code == 401
    resp = await _login(api, "kamal@mail.com", "wrong")
    assert resp.status_code == 429, resp.text
    assert resp.json()["detail"] == "Too many attempts. Try again later."
    assert int(resp.headers["Retry-After"]) > 0
    # Locked even with the right password, until the window passes
    assert (await _login(api, "kamal@mail.com")).status_code == 429
    # Other accounts from the same client are unaffected
    assert (await _login(api, "nimali@mail.com")).status_code == 200


async def test_b_successful_login_clears_failures(api):
    for _ in range(9):
        assert (await _login(api, "kamal@mail.com", "wrong")).status_code == 401
    assert (await _login(api, "kamal@mail.com")).status_code == 200
    for _ in range(10):
        assert (await _login(api, "kamal@mail.com", "wrong")).status_code == 401


async def test_b_successful_logins_are_never_limited(api):
    for _ in range(15):
        assert (await _login(api, "admin@skynest.lk")).status_code == 200


async def test_b_signups_limited_per_ip(api):
    for n in range(10):
        resp = await api.post("/auth/signup", json=_signup(n))
        assert resp.status_code == 201, resp.text
    resp = await api.post("/auth/signup", json=_signup(10))
    assert resp.status_code == 429, resp.text


# ── c: case-insensitive emails ───────────────────────────────────────────────

async def test_c_signup_with_other_case_is_409(api):
    resp = await api.post("/auth/signup", json=_signup(email="Kamal@mail.com"))
    assert resp.status_code == 409, resp.text


@pytest.mark.parametrize("email", ["KAMAL@MAIL.COM", "  Kamal@Mail.com "])
async def test_c_login_ignores_case_and_spaces(api, email):
    assert (await _login(api, email)).status_code == 200


async def test_c_admin_create_with_other_case_is_409(api, login):
    resp = await api.post("/admin/users", json=_staff(email="REC.Colombo@SkyNest.lk"),
                          headers=await login("admin"))
    assert resp.status_code == 409, resp.text


async def test_c_new_emails_stored_lower_case(api, login, db_conn):
    resp = await api.post("/admin/users", json=_staff(email="New.Staff@SkyNest.LK"),
                          headers=await login("admin"))
    assert resp.status_code == 201, resp.text
    assert await db_conn.fetchval(
        "SELECT email FROM user_account WHERE account_id = $1::UUID", resp.json()["account_id"]
    ) == "new.staff@skynest.lk"


async def test_c_db_rejects_case_variant(db_conn):
    with pytest.raises(asyncpg.exceptions.UniqueViolationError):
        async with db_conn.transaction():
            await db_conn.execute(
                "INSERT INTO user_account (email, password_hash, role) "
                "VALUES ('ADMIN@skynest.lk', 'x', 'admin')"
            )


# ── d + e: password policy ───────────────────────────────────────────────────

BAD_PASSWORDS = ["", "short7!", "a" * 73, "é" * 37]   # é is 2 bytes: 74 bytes


@pytest.mark.parametrize("password", BAD_PASSWORDS)
async def test_e_signup_password_policy(api, password):
    resp = await api.post("/auth/signup", json=_signup(password=password))
    assert resp.status_code == 422, resp.text


@pytest.mark.parametrize("password", BAD_PASSWORDS)
@pytest.mark.parametrize("path", ["/admin/users", "/auth/register"])
async def test_e_admin_created_password_policy(api, login, path, password):
    resp = await api.post(path, json=_staff(password=password), headers=await login("admin"))
    assert resp.status_code == 422, resp.text


@pytest.mark.parametrize("password", ["a" * 8, "a" * 72, "é" * 36])
async def test_e_policy_edges_accepted(api, password):
    resp = await api.post("/auth/signup", json=_signup(password=password))
    assert resp.status_code == 201, resp.text


async def test_d_long_login_input_cannot_match_prefix(api, db_conn):
    pw72 = "p" * 72
    await db_conn.execute(
        "UPDATE user_account SET password_hash = $1 WHERE email = 'kamal@mail.com'",
        hash_password(pw72),
    )
    assert (await _login(api, "kamal@mail.com", pw72)).status_code == 200
    assert (await _login(api, "kamal@mail.com", pw72 + "anything")).status_code == 401
