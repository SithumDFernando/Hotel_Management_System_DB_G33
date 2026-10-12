"""
backend/tests/test_profile.py
=============================
ISSUE-14 §4: self-service profile.
  GET   /api/auth/profile          account + linked guest profile
  PATCH /api/auth/profile          a guest edits their own contact details
  POST  /api/auth/change-password  any user changes their own password
Runs in-process against the seeded database; each test is rolled back and
the rate limiters are reset (conftest `_reset_rate_limits`).

Run:  cd backend && pytest tests/test_profile.py -q
"""

PASSWORD = "SkyNest@2026"   # seed password
NEW_PASSWORD = "N3w!Passw0rd"
KAMAL = "f0000000-0000-0000-0000-000000000001"
NIMALI_EMAIL = "nimali@mail.com"


# ── GET /auth/profile ────────────────────────────────────────────────────────

async def test_guest_profile_includes_guest_record(api, login):
    resp = await api.get("/auth/profile", headers=await login("guest"))
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["role"] == "guest"
    assert body["email"] == "kamal@mail.com"
    assert body["branch_id"] is None
    assert body["guest"]["guest_id"] == KAMAL
    assert body["guest"]["full_name"] == "Kamal Perera"


async def test_staff_profile_has_branch_and_no_guest(api, login):
    resp = await api.get("/auth/profile", headers=await login("manager"))
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["role"] == "manager"
    assert body["branch_name"] == "SkyNest Colombo"
    assert body["guest"] is None


async def test_profile_requires_login(api):
    assert (await api.get("/auth/profile")).status_code == 401


# ── PATCH /auth/profile ──────────────────────────────────────────────────────

async def test_guest_updates_own_contact_details(api, login, db_conn):
    headers = await login("guest")
    resp = await api.patch(
        "/auth/profile", headers=headers,
        json={"phone": "+94 77 000 1111", "nationality": "Sri Lankan"},
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["phone"] == "+94 77 000 1111"

    row = await db_conn.fetchrow(
        "SELECT phone, nationality, full_name FROM guest WHERE guest_id = $1::UUID", KAMAL,
    )
    assert row["phone"] == "+94 77 000 1111"
    assert row["nationality"] == "Sri Lankan"
    assert row["full_name"] == "Kamal Perera"   # untouched

    # Nobody else's row changed
    other = await db_conn.fetchval(
        "SELECT COUNT(*) FROM guest WHERE phone = '+94 77 000 1111' AND guest_id <> $1::UUID", KAMAL,
    )
    assert other == 0


async def test_email_and_nic_cannot_be_changed_here(api, login):
    headers = await login("guest")
    for body in ({"email": "other@mail.com"}, {"nic_passport": "999999999V"}, {"guest_id": KAMAL}):
        resp = await api.patch("/auth/profile", headers=headers, json=body)
        assert resp.status_code == 422, (body, resp.text)


async def test_empty_update_is_400(api, login):
    resp = await api.patch("/auth/profile", headers=await login("guest"), json={})
    assert resp.status_code == 400, resp.text


async def test_invalid_values_are_422(api, login):
    headers = await login("guest")
    assert (await api.patch("/auth/profile", headers=headers, json={"phone": "12"})).status_code == 422
    assert (await api.patch("/auth/profile", headers=headers, json={"full_name": "K"})).status_code == 422


async def test_staff_cannot_patch_a_guest_profile(api, login):
    resp = await api.patch("/auth/profile", headers=await login("receptionist"), json={"phone": "0771234567"})
    assert resp.status_code == 403, resp.text


# ── POST /auth/change-password ───────────────────────────────────────────────

async def _change(api, headers, current, new):
    return await api.post(
        "/auth/change-password", headers=headers,
        json={"current_password": current, "new_password": new},
    )


async def _login_status(api, email, password):
    resp = await api.post("/auth/login", json={"email": email, "password": password})
    return resp.status_code


async def test_change_password_success(api, login):
    headers = await login(NIMALI_EMAIL)
    resp = await _change(api, headers, PASSWORD, NEW_PASSWORD)
    assert resp.status_code == 200, resp.text
    assert await _login_status(api, NIMALI_EMAIL, PASSWORD) == 401
    assert await _login_status(api, NIMALI_EMAIL, NEW_PASSWORD) == 200


async def test_staff_can_change_password(api, login):
    resp = await _change(api, await login("manager"), PASSWORD, NEW_PASSWORD)
    assert resp.status_code == 200, resp.text


async def test_wrong_current_password_is_400(api, login):
    headers = await login("guest")
    resp = await _change(api, headers, "not-my-password", NEW_PASSWORD)
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "Current password is incorrect."
    assert await _login_status(api, "kamal@mail.com", PASSWORD) == 200


async def test_weak_new_password_is_422(api, login):
    resp = await _change(api, await login("guest"), PASSWORD, "short")
    assert resp.status_code == 422, resp.text


async def test_same_password_is_400(api, login):
    resp = await _change(api, await login("guest"), PASSWORD, PASSWORD)
    assert resp.status_code == 400, resp.text


async def test_sixth_wrong_current_password_is_429(api, login):
    headers = await login("guest")
    for _ in range(5):
        assert (await _change(api, headers, "wrong", NEW_PASSWORD)).status_code == 400
    resp = await _change(api, headers, PASSWORD, NEW_PASSWORD)
    assert resp.status_code == 429, resp.text
    assert int(resp.headers["Retry-After"]) > 0
