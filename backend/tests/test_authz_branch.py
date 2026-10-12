"""
backend/tests/test_authz_branch.py
==================================
ISSUE-03: managers and receptionists may only act on bookings and rooms of
their own branch; guests only on their own bookings; admins everywhere.
Covers every row of the issue's problem table (403 for another branch), one
same-branch positive case per endpoint, and admin cases.
Runs in-process against the seeded database; each test is rolled back.

Run:  cd backend && pytest tests/test_authz_branch.py -q
"""

import pytest

# Seed data (db/seed/sample_data.sql)
REC_GALLE = "rec.galle@skynest.lk"
MGR_KANDY = "mgr.kandy@skynest.lk"

KANDY = "a0000000-0000-0000-0000-000000000002"
ROOM_102_COLOMBO = "e0000000-0000-0000-0000-000000000002"
ROOM_103_COLOMBO = "e0000000-0000-0000-0000-000000000003"
ROOM_201_KANDY = "e0000000-0000-0000-0000-000000000005"
ROOM_301_GALLE = "e0000000-0000-0000-0000-000000000009"
GUEST_KAMAL = "f0000000-0000-0000-0000-000000000001"
ROOM_SERVICE = "20000000-0000-0000-0000-000000000001"

BK01_COLOMBO_CHECKED_IN = "30000000-0000-0000-0000-000000000001"
BK02_COLOMBO_CHECKED_OUT = "30000000-0000-0000-0000-000000000002"  # Nimali, has a bill
BK03_KANDY_BOOKED = "30000000-0000-0000-0000-000000000003"
BK05_KANDY_CHECKED_OUT = "30000000-0000-0000-0000-000000000005"
BK06_GALLE_BOOKED = "30000000-0000-0000-0000-000000000006"  # Kamal

MISSING_BOOKING = "30000000-0000-0000-0000-0000000000ff"


def _booking(room_id):
    return {
        "guest_id": GUEST_KAMAL,
        "room_id": room_id,
        "check_in_date": "2030-01-10",
        "check_out_date": "2030-01-12",
        "payment_option": "Cash",
    }


def _usage():
    return {"service_id": ROOM_SERVICE, "usage_date": "2026-09-28", "quantity": 1}


def _payment(booking_id, amount="100.00"):
    return {"booking_id": booking_id, "amount": amount, "payment_method": "Cash"}


# ── Cross-branch → 403 (issue problem table + the rest of the endpoints) ─────

# (method, path, json) attempted by the Galle receptionist on Colombo/Kandy data
GALLE_RECEPTIONIST_CROSS_BRANCH = [
    ("PATCH", f"/bookings/{BK03_KANDY_BOOKED}/checkin", None),
    ("PATCH", f"/bookings/{BK01_COLOMBO_CHECKED_IN}/checkout", None),
    ("PATCH", f"/bookings/{BK03_KANDY_BOOKED}/cancel", {}),
    ("GET", f"/bookings/{BK01_COLOMBO_CHECKED_IN}", None),
    ("POST", f"/billing/{BK01_COLOMBO_CHECKED_IN}/generate?discount=1000", None),
    ("GET", f"/billing/{BK02_COLOMBO_CHECKED_OUT}", None),
    ("POST", "/payments", _payment(BK05_KANDY_CHECKED_OUT)),
    ("GET", f"/payments/{BK05_KANDY_CHECKED_OUT}", None),
    ("POST", f"/services/{BK01_COLOMBO_CHECKED_IN}/usage", _usage()),
    ("GET", f"/services/{BK01_COLOMBO_CHECKED_IN}/usage", None),
    ("POST", "/bookings", _booking(ROOM_103_COLOMBO)),
]


@pytest.mark.parametrize(("method", "path", "body"), GALLE_RECEPTIONIST_CROSS_BRANCH)
async def test_receptionist_blocked_on_other_branch(api, login, method, path, body):
    headers = await login(REC_GALLE)
    resp = await api.request(method, path, json=body, headers=headers)
    assert resp.status_code == 403, f"{method} {path}: {resp.status_code} {resp.text}"


async def test_manager_cannot_change_other_branch_room_status(api, login, db_conn):
    headers = await login(MGR_KANDY)
    resp = await api.patch(
        f"/rooms/{ROOM_102_COLOMBO}/status", json={"status": "Maintenance"}, headers=headers
    )
    assert resp.status_code == 403, resp.text
    status = await db_conn.fetchval(
        "SELECT status FROM room WHERE room_id = $1::UUID", ROOM_102_COLOMBO
    )
    assert status == "Available"


async def test_blocked_actions_have_no_side_effects(api, login, db_conn):
    bill_sql = "SELECT discount_amount, generated_at FROM bill WHERE booking_id = $1::UUID"
    usage_sql = "SELECT COUNT(*) FROM service_usage WHERE booking_id = $1::UUID"
    bill_before = await db_conn.fetchrow(bill_sql, BK01_COLOMBO_CHECKED_IN)
    usage_before = await db_conn.fetchval(usage_sql, BK01_COLOMBO_CHECKED_IN)
    headers = await login(REC_GALLE)
    await api.patch(f"/bookings/{BK03_KANDY_BOOKED}/checkin", headers=headers)
    await api.post(f"/billing/{BK01_COLOMBO_CHECKED_IN}/generate?discount=1000", headers=headers)
    await api.post(f"/services/{BK01_COLOMBO_CHECKED_IN}/usage", json=_usage(), headers=headers)

    assert await db_conn.fetchval(
        "SELECT status FROM booking WHERE booking_id = $1::UUID", BK03_KANDY_BOOKED
    ) == "Booked"
    assert await db_conn.fetchrow(bill_sql, BK01_COLOMBO_CHECKED_IN) == bill_before
    assert await db_conn.fetchval(usage_sql, BK01_COLOMBO_CHECKED_IN) == usage_before


async def test_missing_booking_is_404_not_403(api, login):
    headers = await login(REC_GALLE)
    resp = await api.patch(f"/bookings/{MISSING_BOOKING}/checkin", headers=headers)
    assert resp.status_code == 404, resp.text


# ── Same-branch staff are unaffected ─────────────────────────────────────────

async def test_same_branch_receptionist_full_stay_flow(api, login):
    """Colombo receptionist: view, add usage, bill, pay, check out BK-01."""
    headers = await login("receptionist")
    bk = BK01_COLOMBO_CHECKED_IN

    assert (await api.get(f"/bookings/{bk}", headers=headers)).status_code == 200
    resp = await api.post(f"/services/{bk}/usage", json=_usage(), headers=headers)
    assert resp.status_code == 201, resp.text
    assert (await api.get(f"/services/{bk}/usage", headers=headers)).status_code == 200

    resp = await api.post(f"/billing/{bk}/generate", headers=headers)
    assert resp.status_code == 200, resp.text
    outstanding = resp.json()["outstanding_balance"]
    assert (await api.get(f"/billing/{bk}", headers=headers)).status_code == 200

    resp = await api.post("/payments", json=_payment(bk, str(outstanding)), headers=headers)
    assert resp.status_code == 201, resp.text
    assert (await api.get(f"/payments/{bk}", headers=headers)).status_code == 200

    resp = await api.patch(f"/bookings/{bk}/checkout", headers=headers)
    assert resp.status_code == 200, resp.text


async def test_same_branch_receptionist_create_booking(api, login):
    headers = await login("receptionist")
    resp = await api.post("/bookings", json=_booking(ROOM_103_COLOMBO), headers=headers)
    assert resp.status_code == 201, resp.text


async def test_same_branch_receptionist_checkin_and_cancel(api, login):
    headers = await login(REC_GALLE)
    resp = await api.patch(f"/bookings/{BK06_GALLE_BOOKED}/cancel", json={}, headers=headers)
    assert resp.status_code == 200, resp.text

    resp = await api.post("/bookings", json=_booking(ROOM_301_GALLE), headers=headers)
    assert resp.status_code == 201, resp.text
    resp = await api.patch(f"/bookings/{resp.json()['booking_id']}/checkin", headers=headers)
    assert resp.status_code == 200, resp.text


async def test_same_branch_manager_room_status(api, login):
    headers = await login(MGR_KANDY)
    resp = await api.patch(
        f"/rooms/{ROOM_201_KANDY}/status", json={"status": "Maintenance"}, headers=headers
    )
    assert resp.status_code == 200, resp.text


# ── Admins are global ────────────────────────────────────────────────────────

async def test_admin_acts_on_any_branch(api, login):
    headers = await login("admin")
    resp = await api.patch(f"/bookings/{BK03_KANDY_BOOKED}/checkin", headers=headers)
    assert resp.status_code == 200, resp.text
    resp = await api.post(f"/billing/{BK01_COLOMBO_CHECKED_IN}/generate", headers=headers)
    assert resp.status_code == 200, resp.text
    assert (await api.get(f"/billing/{BK02_COLOMBO_CHECKED_OUT}", headers=headers)).status_code == 200
    assert (await api.get(f"/payments/{BK05_KANDY_CHECKED_OUT}", headers=headers)).status_code == 200
    resp = await api.patch(
        f"/rooms/{ROOM_102_COLOMBO}/status", json={"status": "Maintenance"}, headers=headers
    )
    assert resp.status_code == 200, resp.text
    resp = await api.post("/bookings", json=_booking(ROOM_103_COLOMBO), headers=headers)
    assert resp.status_code == 201, resp.text


# ── Guests: ownership, not branch ────────────────────────────────────────────

async def test_guest_reads_own_booking_in_any_branch_but_not_others(api, login):
    headers = await login("guest")  # Kamal: BK-01 (Colombo) and BK-06 (Galle)
    assert (await api.get(f"/bookings/{BK06_GALLE_BOOKED}", headers=headers)).status_code == 200
    resp = await api.get(f"/billing/{BK02_COLOMBO_CHECKED_OUT}", headers=headers)
    assert resp.status_code == 403, resp.text
    resp = await api.get(f"/services/{BK02_COLOMBO_CHECKED_OUT}/usage", headers=headers)
    assert resp.status_code == 403, resp.text


# ── Top-services report is branch-scoped for managers ────────────────────────

async def test_top_services_scoped_to_manager_branch(api, login, db_conn):
    expected = await db_conn.fetch(
        """
        SELECT s.service_id::TEXT AS service_id, SUM(su.quantity)::INT AS qty
        FROM service_usage su
        JOIN service s ON s.service_id = su.service_id
        JOIN booking b ON b.booking_id = su.booking_id
        JOIN room r ON r.room_id = b.room_id
        WHERE r.branch_id = $1::UUID
        GROUP BY s.service_id
        """,
        KANDY,
    )
    assert expected, "seed data should have Kandy service usage"

    headers = await login(MGR_KANDY)
    # A manager's branch_id param is ignored: they always get their own branch
    resp = await api.get(
        "/reports/top-services",
        params={"branch_id": "a0000000-0000-0000-0000-000000000001"},
        headers=headers,
    )
    assert resp.status_code == 200, resp.text
    got = {r["service_id"]: r["total_quantity"] for r in resp.json()["report"]}
    assert got == {r["service_id"]: r["qty"] for r in expected}
    assert resp.json()["report"][0]["usage_rank"] == 1


async def test_top_services_admin_all_or_one_branch(api, login):
    headers = await login("admin")
    everything = await api.get("/reports/top-services", headers=headers)
    kandy = await api.get("/reports/top-services", params={"branch_id": KANDY}, headers=headers)
    assert everything.status_code == kandy.status_code == 200
    total_all = sum(r["total_quantity"] for r in everything.json()["report"])
    total_kandy = sum(r["total_quantity"] for r in kandy.json()["report"])
    assert 0 < total_kandy < total_all
