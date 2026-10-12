"""
backend/tests/test_status_concurrency.py
========================================
ISSUE-12: concurrent status changes and payments on one booking are serialized.
- perform_checkin / cancel_booking lock the booking row (FOR UPDATE), so of
  several simultaneous check-ins or cancels exactly one succeeds, and a
  check-in racing a cancel can't both win.
- record_payment returns the payment it inserted, so two simultaneous
  payments each get their own payment back.
Each test fires real concurrent requests (the `pool_api` fixture, autocommit)
at a fresh booking for today on Colombo room 103, then deletes it and puts
the room status back. The bursts only hit the race some of the time on the
old code, so the "held transaction" tests reproduce it deterministically: one
session checks in and holds its transaction open while the other acts.

Run:  cd backend && pytest tests/test_status_concurrency.py -q
"""

import asyncio
from decimal import Decimal

import asyncpg
import pytest

# Seed data (db/seed/sample_data.sql)
ROOM_103_COLOMBO = "e0000000-0000-0000-0000-000000000003"  # no seed bookings
GUEST_KAMAL = "f0000000-0000-0000-0000-000000000001"


@pytest.fixture
async def fresh_booking(pool):
    """A 'Booked' stay starting today on room 103; removed afterwards."""
    async with pool.acquire() as conn:
        room_status = await conn.fetchval(
            "SELECT status FROM room WHERE room_id = $1::UUID", ROOM_103_COLOMBO
        )
        booking_id = (await conn.fetchrow(
            "CALL create_booking($1::UUID, $2::UUID, CURRENT_DATE, CURRENT_DATE + 2, 'Cash', NULL)",
            GUEST_KAMAL, ROOM_103_COLOMBO,
        ))["p_booking_id"]
    try:
        yield str(booking_id)
    finally:
        async with pool.acquire() as conn:
            await conn.execute("DELETE FROM booking WHERE booking_id = $1::UUID", booking_id)
            await conn.execute(
                "UPDATE room SET status = $2 WHERE room_id = $1::UUID",
                ROOM_103_COLOMBO, room_status,
            )


@pytest.fixture
async def checked_in_with_bill(pool, fresh_booking):
    async with pool.acquire() as conn:
        await conn.execute("CALL perform_checkin($1::UUID)", fresh_booking)
        await conn.execute("CALL generate_bill($1::UUID, NULL)", fresh_booking)
    return fresh_booking


async def _status(pool, booking_id):
    async with pool.acquire() as conn:
        return await conn.fetchrow(
            """
            SELECT b.status::TEXT AS booking, r.status::TEXT AS room, b.actual_checkin_time
              FROM booking b JOIN room r USING (room_id)
             WHERE b.booking_id = $1::UUID
            """,
            booking_id,
        )


async def test_concurrent_checkins_one_wins(pool_api, pool_login, pool, fresh_booking):
    headers = await pool_login("receptionist")
    responses = await asyncio.gather(*(
        pool_api.patch(f"/bookings/{fresh_booking}/checkin", headers=headers)
        for _ in range(5)
    ))
    assert sorted(r.status_code for r in responses) == [200, 400, 400, 400, 400], \
        [r.text for r in responses]

    winner = next(r for r in responses if r.status_code == 200).json()
    row = await _status(pool, fresh_booking)
    assert row["booking"] == "Checked-In" and row["room"] == "Occupied"
    # Nobody overwrote the winner's check-in time
    assert row["actual_checkin_time"].isoformat() == winner["actual_checkin_time"]


async def test_concurrent_cancels_one_wins(pool_api, pool_login, pool, fresh_booking):
    headers = await pool_login("receptionist")
    responses = await asyncio.gather(*(
        pool_api.patch(f"/bookings/{fresh_booking}/cancel", json={}, headers=headers)
        for _ in range(5)
    ))
    assert sorted(r.status_code for r in responses) == [200, 400, 400, 400, 400], \
        [r.text for r in responses]
    assert (await _status(pool, fresh_booking))["booking"] == "Cancelled"


async def test_checkin_racing_cancel_one_wins(pool_api, pool_login, pool, fresh_booking):
    headers = await pool_login("receptionist")
    checkin, cancel = await asyncio.gather(
        pool_api.patch(f"/bookings/{fresh_booking}/checkin", headers=headers),
        pool_api.patch(f"/bookings/{fresh_booking}/cancel", json={}, headers=headers),
    )
    assert sorted([checkin.status_code, cancel.status_code]) == [200, 400], \
        (checkin.text, cancel.text)

    row = await _status(pool, fresh_booking)
    if checkin.status_code == 200:
        assert (row["booking"], row["room"]) == ("Checked-In", "Occupied")
    else:
        assert (row["booking"], row["room"]) == ("Cancelled", "Available")


async def test_concurrent_payments_return_their_own_payment(
    pool_api, pool_login, pool, checked_in_with_bill
):
    headers = await pool_login("receptionist")
    amounts = [Decimal("1000.00"), Decimal("2000.00")]
    responses = await asyncio.gather(*(
        pool_api.post("/payments", headers=headers, json={
            "booking_id": checked_in_with_bill, "amount": str(amount),
            "payment_method": "Cash", "notes": f"part {amount}",
        })
        for amount in amounts
    ))
    assert [r.status_code for r in responses] == [201, 201], [r.text for r in responses]

    bodies = [r.json() for r in responses]
    assert bodies[0]["payment_id"] != bodies[1]["payment_id"]
    async with pool.acquire() as conn:
        for amount, body in zip(amounts, bodies):
            assert Decimal(body["amount"]) == amount
            assert body["notes"] == f"part {amount}"
            stored = await conn.fetchval(
                "SELECT amount FROM payment WHERE payment_id = $1::UUID", body["payment_id"]
            )
            assert stored == amount


# ── Deterministic: one session holds an uncommitted check-in ─────────────────

async def _hold_checkin(pool, booking_id):
    """Check in inside an open transaction; returns (conn, tx) to commit later."""
    conn = await pool.acquire()
    tx = conn.transaction()
    await tx.start()
    await conn.execute("CALL perform_checkin($1::UUID)", booking_id)
    return conn, tx


async def test_second_checkin_waits_and_fails(pool, fresh_booking):
    conn_a, tx_a = await _hold_checkin(pool, fresh_booking)
    try:
        async with pool.acquire() as conn_b:
            b_task = asyncio.create_task(
                conn_b.execute("CALL perform_checkin($1::UUID)", fresh_booking)
            )
            await asyncio.sleep(0.5)
            assert not b_task.done(), "B should wait for A's booking lock"
            await tx_a.commit()
            with pytest.raises(asyncpg.exceptions.RaiseError, match="Only Booked bookings can be checked in"):
                await b_task
    finally:
        await pool.release(conn_a)


async def test_cancel_waits_for_checkin_and_fails(pool_api, pool_login, pool, fresh_booking):
    """The audit's worst case: a cancel must not undo a check-in that just happened."""
    headers = await pool_login("receptionist")
    conn_a, tx_a = await _hold_checkin(pool, fresh_booking)
    try:
        cancel = asyncio.create_task(
            pool_api.patch(f"/bookings/{fresh_booking}/cancel", json={}, headers=headers)
        )
        await asyncio.sleep(0.5)
        await tx_a.commit()
        resp = await cancel
    finally:
        await pool.release(conn_a)

    assert resp.status_code == 400, resp.text
    assert "current status: Checked-In" in resp.json()["detail"]
    row = await _status(pool, fresh_booking)
    assert (row["booking"], row["room"]) == ("Checked-In", "Occupied")
