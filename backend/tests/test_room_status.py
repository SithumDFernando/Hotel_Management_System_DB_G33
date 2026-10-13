"""
backend/tests/test_room_status.py
=================================
ISSUE-09: trg_room_status is the only owner of Available <-> Occupied, and
booking events never overwrite Maintenance.
- DB: the issue's table of (room status, booking transition) -> room status,
  driven through the real procedures (perform_checkin, perform_checkout,
  cancel_booking), which no longer touch the room table.
- API: PATCH /rooms/{id}/status refuses Available while a guest is checked in
  and Occupied without one (409); Maintenance is always allowed.
Runs in-process against the seeded database; each test is rolled back.

Run:  cd backend && pytest tests/test_room_status.py -q
"""

import pytest

# Seed data (db/seed/sample_data.sql)
ROOM_101_COLOMBO = "e0000000-0000-0000-0000-000000000001"  # Occupied, BK-01 Checked-In
ROOM_103_COLOMBO = "e0000000-0000-0000-0000-000000000003"  # Available, no bookings
GUEST_KAMAL = "f0000000-0000-0000-0000-000000000001"


async def _room(db_conn, room_id=ROOM_103_COLOMBO):
    return await db_conn.fetchval(
        "SELECT status::TEXT FROM room WHERE room_id = $1::UUID", room_id
    )


async def _set_room(db_conn, status, room_id=ROOM_103_COLOMBO):
    await db_conn.execute(
        "UPDATE room SET status = $2::room_status WHERE room_id = $1::UUID", room_id, status
    )


async def _book(db_conn):
    return (await db_conn.fetchrow(
        "CALL create_booking($1::UUID, $2::UUID, CURRENT_DATE, CURRENT_DATE + 2, 'Cash', NULL)",
        GUEST_KAMAL, ROOM_103_COLOMBO,
    ))["p_booking_id"]


async def _checkout(db_conn, booking_id):
    """Settle the bill, then check out through the procedure."""
    await db_conn.execute("CALL generate_bill($1::UUID, NULL)", booking_id)
    owed = await db_conn.fetchval(
        "SELECT outstanding_balance FROM bill WHERE booking_id = $1::UUID", booking_id
    )
    await db_conn.execute(
        "CALL record_payment($1::UUID, $2, 'Cash', NULL, NULL)", booking_id, owed
    )
    await db_conn.execute("CALL perform_checkout($1::UUID)", booking_id)


# ── DB: the issue's table ────────────────────────────────────────────────────

@pytest.mark.parametrize("start", ["Maintenance", "Available"])
async def test_cancelling_booked_leaves_room_alone(db_conn, start):
    bk = await _book(db_conn)
    await _set_room(db_conn, start)
    await db_conn.execute("CALL cancel_booking($1::UUID)", bk)
    assert await _room(db_conn) == start


async def test_checkin_makes_available_room_occupied(db_conn):
    bk = await _book(db_conn)
    assert await _room(db_conn) == "Available"
    await db_conn.execute("CALL perform_checkin($1::UUID)", bk)
    assert await _room(db_conn) == "Occupied"


async def test_checkout_frees_occupied_room(db_conn):
    bk = await _book(db_conn)
    await db_conn.execute("CALL perform_checkin($1::UUID)", bk)
    await _checkout(db_conn, bk)
    assert await _room(db_conn) == "Available"


async def test_checkout_keeps_maintenance_set_mid_stay(db_conn):
    bk = await _book(db_conn)
    await db_conn.execute("CALL perform_checkin($1::UUID)", bk)
    await _set_room(db_conn, "Maintenance")   # housekeeping, during the stay
    await _checkout(db_conn, bk)
    assert await _room(db_conn) == "Maintenance"


async def test_cancelling_in_house_booking_frees_room(db_conn):
    """Trigger rule for Checked-In -> Cancelled (no procedure does this today)."""
    bk = await _book(db_conn)
    await db_conn.execute("CALL perform_checkin($1::UUID)", bk)
    await db_conn.execute(
        "UPDATE booking SET status = 'Cancelled' WHERE booking_id = $1::UUID", bk
    )
    assert await _room(db_conn) == "Available"


async def test_procedures_do_not_update_room(db_conn):
    """The trigger is the single owner: without it, room status doesn't move."""
    await db_conn.execute("ALTER TABLE booking DISABLE TRIGGER trg_room_status")
    bk = await _book(db_conn)
    await db_conn.execute("CALL perform_checkin($1::UUID)", bk)
    assert await _room(db_conn) == "Available"
    await _checkout(db_conn, bk)
    assert await _room(db_conn) == "Available"


# ── API: manual status must agree with the bookings ─────────────────────────

async def _patch(api, headers, room_id, status):
    return await api.patch(f"/rooms/{room_id}/status", json={"status": status},
                           headers=headers)


async def test_available_refused_while_guest_checked_in(api, login, db_conn):
    resp = await _patch(api, await login("admin"), ROOM_101_COLOMBO, "Available")
    assert resp.status_code == 409, resp.text
    assert "checked in" in resp.json()["detail"]
    assert await _room(db_conn, ROOM_101_COLOMBO) == "Occupied"


async def test_occupied_refused_without_guest(api, login, db_conn):
    resp = await _patch(api, await login("manager"), ROOM_103_COLOMBO, "Occupied")
    assert resp.status_code == 409, resp.text
    assert await _room(db_conn) == "Available"


async def test_maintenance_mid_stay_then_back_to_occupied(api, login, db_conn):
    headers = await login("manager")
    resp = await _patch(api, headers, ROOM_101_COLOMBO, "Maintenance")
    assert resp.status_code == 200, resp.text
    assert (await _patch(api, headers, ROOM_101_COLOMBO, "Available")).status_code == 409
    resp = await _patch(api, headers, ROOM_101_COLOMBO, "Occupied")
    assert resp.status_code == 200, resp.text
    assert await _room(db_conn, ROOM_101_COLOMBO) == "Occupied"


async def test_maintenance_on_and_off_for_empty_room(api, login, db_conn):
    headers = await login("manager")
    assert (await _patch(api, headers, ROOM_103_COLOMBO, "Maintenance")).status_code == 200
    assert await _room(db_conn) == "Maintenance"
    assert (await _patch(api, headers, ROOM_103_COLOMBO, "Available")).status_code == 200
    assert await _room(db_conn) == "Available"
