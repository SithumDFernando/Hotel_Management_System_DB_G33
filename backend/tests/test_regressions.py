"""
backend/tests/test_regressions.py
=================================
Regression tests for bugs fixed from docs/work/issues/. Each test names the
issue it guards. Runs in-process against the seeded database; every test is
rolled back (see the `api` fixture in conftest.py).

Run:  cd backend && pytest tests/test_regressions.py -q
"""

from datetime import date, timedelta

import pytest

# Seed data (db/seed/sample_data.sql)
COLOMBO_ROOM_102 = "e0000000-0000-0000-0000-000000000002"
GUEST_KAMAL = "f0000000-0000-0000-0000-000000000001"


# =============================================================================
# ISSUE-01: date query filters returned 500
# =============================================================================

async def test_rooms_availability_excludes_booked_room(api, db_conn):
    check_in = date.today() + timedelta(days=30)
    check_out = check_in + timedelta(days=2)
    await db_conn.execute(
        """
        INSERT INTO booking (guest_id, room_id, check_in_date, check_out_date,
                             rate_at_booking, status, payment_option)
        VALUES ($1::UUID, $2::UUID, $3, $4, 15000, 'Booked', 'Cash')
        """,
        GUEST_KAMAL, COLOMBO_ROOM_102, check_in, check_out,
    )

    resp = await api.get(
        "/rooms", params={"check_in": str(check_in), "check_out": str(check_out)}
    )
    assert resp.status_code == 200, resp.text
    room_ids = {r["room_id"] for r in resp.json()["rooms"]}
    assert room_ids, "expected some free rooms"
    assert COLOMBO_ROOM_102 not in room_ids

    # The day after the booking ends, the room is free again
    resp = await api.get(
        "/rooms",
        params={"check_in": str(check_out), "check_out": str(check_out + timedelta(days=1))},
    )
    assert COLOMBO_ROOM_102 in {r["room_id"] for r in resp.json()["rooms"]}


@pytest.mark.parametrize(
    "params, expected",
    [
        ({"check_in": "garbage", "check_out": "x"}, 422),
        ({"check_in": "2027-01-05", "check_out": "2027-01-01"}, 400),
        ({"check_in": "2027-01-05", "check_out": "2027-01-05"}, 400),
        ({"check_in": "2027-01-05"}, 400),
    ],
)
async def test_rooms_bad_dates_rejected(api, params, expected):
    resp = await api.get("/rooms", params=params)
    assert resp.status_code == expected, resp.text


async def test_bookings_date_range_filter(api, login):
    headers = await login("admin")
    resp = await api.get(
        "/bookings", params={"from": "2026-01-01", "to": "2027-12-31"}, headers=headers
    )
    assert resp.status_code == 200, resp.text
    for b in resp.json()["bookings"]:
        assert b["check_out_date"] >= "2026-01-01"
        assert b["check_in_date"] <= "2027-12-31"


@pytest.mark.parametrize(
    "params, expected",
    [
        ({"from": "bad"}, 422),
        ({"from": "2027-01-01", "to": "2026-01-01"}, 400),
    ],
)
async def test_bookings_bad_dates_rejected(api, login, params, expected):
    resp = await api.get("/bookings", params=params, headers=await login("admin"))
    assert resp.status_code == expected, resp.text


async def test_occupancy_point_in_time(api, login):
    resp = await api.get(
        "/reports/occupancy",
        params={"date": str(date.today())},
        headers=await login("manager"),
    )
    assert resp.status_code == 200, resp.text
    assert "report" in resp.json()


async def test_occupancy_date_range(api, login):
    resp = await api.get(
        "/reports/occupancy",
        params={"from_date": "2026-10-01", "to_date": "2026-10-31"},
        headers=await login("admin"),
    )
    assert resp.status_code == 200, resp.text


@pytest.mark.parametrize(
    "params, expected",
    [
        ({"date": "nope"}, 422),
        ({"from_date": "2026-10-31", "to_date": "2026-10-01"}, 400),
    ],
)
async def test_occupancy_bad_dates_rejected(api, login, params, expected):
    resp = await api.get("/reports/occupancy", params=params, headers=await login("admin"))
    assert resp.status_code == expected, resp.text


# =============================================================================
# ISSUE-02: status filters returned 500
# =============================================================================

@pytest.mark.parametrize("booking_status", ["Booked", "Checked-In", "Checked-Out", "Cancelled"])
async def test_bookings_status_filter(api, login, booking_status):
    resp = await api.get(
        "/bookings", params={"status": booking_status}, headers=await login("receptionist")
    )
    assert resp.status_code == 200, resp.text
    assert all(b["status"] == booking_status for b in resp.json()["bookings"])


async def test_bookings_status_filter_returns_rows(api, login):
    resp = await api.get(
        "/bookings", params={"status": "Booked"}, headers=await login("admin")
    )
    assert resp.status_code == 200, resp.text
    bookings = resp.json()["bookings"]
    assert bookings, "seed data has Booked bookings"
    assert all(b["status"] == "Booked" for b in bookings)


async def test_bookings_unknown_status_rejected(api, login):
    resp = await api.get(
        "/bookings", params={"status": "Bogus"}, headers=await login("admin")
    )
    assert resp.status_code == 422, resp.text


@pytest.mark.parametrize("room_status", ["Available", "Occupied", "Maintenance"])
async def test_rooms_status_filter(api, room_status):
    resp = await api.get("/rooms", params={"status": room_status})
    assert resp.status_code == 200, resp.text
    assert all(r["status"] == room_status for r in resp.json()["rooms"])


async def test_rooms_unknown_status_rejected(api):
    resp = await api.get("/rooms", params={"status": "Bogus"})
    assert resp.status_code == 422, resp.text


async def test_room_status_update_rejects_unknown_status(api, login):
    resp = await api.patch(
        f"/rooms/{COLOMBO_ROOM_102}/status",
        json={"status": "Bogus"},
        headers=await login("manager"),
    )
    assert resp.status_code == 422, resp.text
