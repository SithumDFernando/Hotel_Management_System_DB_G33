"""
backend/tests/test_booking_rules.py
===================================
ISSUE-08: booking, check-in and service-usage business rules live in the DB
(procedures, triggers, CHECKs), so the API and a direct CALL/INSERT both
reject the issue's seven scenarios:
  a  check-in date in the past           -> 400
  b  booking a room under Maintenance     -> 409
  c  stay longer than 30 nights           -> 400
  d  payment option / method off the list -> 422 (API) / CHECK (DB)
  e  check-in before the arrival date     -> 400 (and after the stay ended)
  f  service usage dated outside the stay -> 422
  g  check-in while the room is Maintenance -> 409
plus the positive edges: book today, exactly 30 nights, check in today, a
charge on the check-out day, and a charge today for an overdue guest.
Runs in-process against the seeded database; each test is rolled back.

Run:  cd backend && pytest tests/test_booking_rules.py -q
"""

from datetime import date, timedelta

import asyncpg
import pytest

from tests.conftest import arrive_today

# Seed data (db/seed/sample_data.sql)
ROOM_103_COLOMBO = "e0000000-0000-0000-0000-000000000003"  # Available, no bookings
ROOM_104_COLOMBO = "e0000000-0000-0000-0000-000000000004"  # Maintenance
GUEST_KAMAL = "f0000000-0000-0000-0000-000000000001"
BK01_COLOMBO_CHECKED_IN = "30000000-0000-0000-0000-000000000001"  # 09-27 -> 10-01, overdue
BK03_KANDY_BOOKED = "30000000-0000-0000-0000-000000000003"
ROOM_SERVICE = "20000000-0000-0000-0000-000000000001"

CREATE = ("CALL create_booking($1::UUID, $2::UUID, $3::DATE, $4::DATE, $5::VARCHAR, NULL)")


@pytest.fixture
async def today(db_conn):
    return await db_conn.fetchval("SELECT CURRENT_DATE")


def _booking(check_in, check_out, room=ROOM_103_COLOMBO, payment="Cash"):
    return {"guest_id": GUEST_KAMAL, "room_id": room,
            "check_in_date": check_in.isoformat(), "check_out_date": check_out.isoformat(),
            "payment_option": payment}


async def _db_rejects(db_conn, sql, *args, error=asyncpg.exceptions.RaiseError, match=None):
    with pytest.raises(error, match=match):
        async with db_conn.transaction():
            await db_conn.execute(sql, *args)


# ── create_booking: a, b, c ──────────────────────────────────────────────────

async def test_a_past_check_in_rejected(api, login, db_conn, today):
    past = today - timedelta(days=30)
    resp = await api.post("/bookings", json=_booking(past, past + timedelta(days=2)),
                          headers=await login("admin"))
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "Check-in date cannot be in the past"
    await _db_rejects(db_conn, CREATE, GUEST_KAMAL, ROOM_103_COLOMBO, past,
                      past + timedelta(days=2), "Cash", match="cannot be in the past")


async def test_b_maintenance_room_cannot_be_booked(api, login, db_conn, today):
    start = today + timedelta(days=10)
    resp = await api.post("/bookings",
                          json=_booking(start, start + timedelta(days=2), room=ROOM_104_COLOMBO),
                          headers=await login("admin"))
    assert resp.status_code == 409, resp.text
    assert resp.json()["detail"] == "Room is under maintenance and cannot be booked"
    await _db_rejects(db_conn, CREATE, GUEST_KAMAL, ROOM_104_COLOMBO, start,
                      start + timedelta(days=2), "Cash", match="under maintenance")


async def test_c_stay_over_30_nights_rejected(api, login, db_conn, today):
    start = today + timedelta(days=10)
    resp = await api.post("/bookings", json=_booking(start, start + timedelta(days=5 * 365)),
                          headers=await login("admin"))
    assert resp.status_code == 400, resp.text
    assert "longer than 30 nights" in resp.json()["detail"]
    await _db_rejects(db_conn, CREATE, GUEST_KAMAL, ROOM_103_COLOMBO, start,
                      start + timedelta(days=31), "Cash", match="longer than 30 nights")


async def test_booking_today_and_exactly_30_nights_allowed(api, login, today):
    headers = await login("admin")
    resp = await api.post("/bookings", json=_booking(today, today + timedelta(days=1)),
                          headers=headers)
    assert resp.status_code == 201, resp.text
    start = today + timedelta(days=40)
    resp = await api.post("/bookings", json=_booking(start, start + timedelta(days=30)),
                          headers=headers)
    assert resp.status_code == 201, resp.text


# ── d: payment vocabulary ────────────────────────────────────────────────────

async def test_d_payment_option_off_the_list(api, login, db_conn, today):
    start = today + timedelta(days=10)
    resp = await api.post("/bookings",
                          json=_booking(start, start + timedelta(days=2), payment="Bitcoin lol"),
                          headers=await login("admin"))
    assert resp.status_code == 422, resp.text
    await _db_rejects(db_conn, CREATE, GUEST_KAMAL, ROOM_103_COLOMBO, start,
                      start + timedelta(days=2), "Bitcoin lol",
                      error=asyncpg.exceptions.CheckViolationError)


async def test_d_payment_method_off_the_list(api, login, db_conn):
    resp = await api.post("/payments", json={"booking_id": BK01_COLOMBO_CHECKED_IN,
                                             "amount": "100.00", "payment_method": "Bitcoin lol"},
                          headers=await login("receptionist"))
    assert resp.status_code == 422, resp.text
    await _db_rejects(
        db_conn,
        "INSERT INTO payment (booking_id, amount, payment_method) VALUES ($1::UUID, 100, $2)",
        BK01_COLOMBO_CHECKED_IN, "Bitcoin lol", error=asyncpg.exceptions.CheckViolationError,
    )


@pytest.mark.parametrize("method", ["Credit Card", "Cash", "Bank Transfer"])
async def test_d_listed_payment_options_accepted(api, login, today, method):
    start = today + timedelta(days=10)
    resp = await api.post("/bookings",
                          json=_booking(start, start + timedelta(days=2), payment=method),
                          headers=await login("admin"))
    assert resp.status_code == 201, resp.text


# ── e, g: perform_checkin ────────────────────────────────────────────────────

async def test_e_early_check_in_rejected(api, login, db_conn, today):
    headers = await login("admin")
    start = today + timedelta(days=30)
    resp = await api.post("/bookings", json=_booking(start, start + timedelta(days=2)),
                          headers=headers)
    assert resp.status_code == 201, resp.text
    bk = resp.json()["booking_id"]

    resp = await api.patch(f"/bookings/{bk}/checkin", headers=headers)
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"Check-in is not allowed before {start.isoformat()}"
    await _db_rejects(db_conn, "CALL perform_checkin($1::UUID)", bk, match="not allowed before")


async def test_e_check_in_after_stay_ended_rejected(api, login, db_conn):
    await db_conn.execute(
        "UPDATE booking SET check_in_date = CURRENT_DATE - 5, check_out_date = CURRENT_DATE "
        "WHERE booking_id = $1::UUID", BK03_KANDY_BOOKED,
    )
    resp = await api.patch(f"/bookings/{BK03_KANDY_BOOKED}/checkin", headers=await login("admin"))
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "This booking's stay period has already ended"
    await _db_rejects(db_conn, "CALL perform_checkin($1::UUID)", BK03_KANDY_BOOKED,
                      match="already ended")


async def test_g_check_in_while_room_in_maintenance(api, login, db_conn):
    await arrive_today(db_conn, BK03_KANDY_BOOKED)
    await db_conn.execute(
        "UPDATE room SET status = 'Maintenance' WHERE room_id = "
        "(SELECT room_id FROM booking WHERE booking_id = $1::UUID)", BK03_KANDY_BOOKED,
    )
    resp = await api.patch(f"/bookings/{BK03_KANDY_BOOKED}/checkin", headers=await login("admin"))
    assert resp.status_code == 409, resp.text
    assert resp.json()["detail"] == "Room is under maintenance"
    await _db_rejects(db_conn, "CALL perform_checkin($1::UUID)", BK03_KANDY_BOOKED,
                      match="under maintenance")
    assert await db_conn.fetchval(
        "SELECT status::TEXT FROM booking WHERE booking_id = $1::UUID", BK03_KANDY_BOOKED
    ) == "Booked"


async def test_check_in_on_arrival_day_allowed(api, login, db_conn):
    await arrive_today(db_conn, BK03_KANDY_BOOKED)
    resp = await api.patch(f"/bookings/{BK03_KANDY_BOOKED}/checkin", headers=await login("admin"))
    assert resp.status_code == 200, resp.text


# ── f: service usage date ────────────────────────────────────────────────────

USAGE_INSERT = ("INSERT INTO service_usage (booking_id, service_id, usage_date, quantity) "
                "VALUES ($1::UUID, $2::UUID, $3::DATE, 1)")


@pytest.mark.parametrize("offset_days", [None, 10])
async def test_f_usage_outside_stay_rejected(api, login, db_conn, today, offset_days):
    """2001-01-01 (before the stay) and today + 10 (after it, even for an overdue guest)."""
    usage_date = date(2001, 1, 1) if offset_days is None else today + timedelta(days=offset_days)
    resp = await api.post(f"/services/{BK01_COLOMBO_CHECKED_IN}/usage",
                          json={"service_id": ROOM_SERVICE, "usage_date": usage_date.isoformat(),
                                "quantity": 1},
                          headers=await login("receptionist"))
    assert resp.status_code == 422, resp.text
    assert "outside the stay" in resp.json()["detail"]
    await _db_rejects(db_conn, USAGE_INSERT, BK01_COLOMBO_CHECKED_IN, ROOM_SERVICE, usage_date,
                      match="outside the stay")


async def test_usage_on_check_out_day_allowed(api, login, db_conn, today):
    await arrive_today(db_conn, BK03_KANDY_BOOKED, nights=3)
    await db_conn.execute("CALL perform_checkin($1::UUID)", BK03_KANDY_BOOKED)
    resp = await api.post(f"/services/{BK03_KANDY_BOOKED}/usage",
                          json={"service_id": ROOM_SERVICE,
                                "usage_date": (today + timedelta(days=3)).isoformat(),
                                "quantity": 1},
                          headers=await login("admin"))
    assert resp.status_code == 201, resp.text


async def test_usage_today_for_overdue_guest_allowed(api, login, today):
    """BK-01 should have left on 2026-10-01 but is still in house: today's charge is fine."""
    resp = await api.post(f"/services/{BK01_COLOMBO_CHECKED_IN}/usage",
                          json={"service_id": ROOM_SERVICE, "usage_date": today.isoformat(),
                                "quantity": 1},
                          headers=await login("receptionist"))
    assert resp.status_code == 201, resp.text
