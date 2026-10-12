"""
backend/tests/test_double_booking.py
====================================
ISSUE-05: two overlapping active bookings for one room can never both commit.
- excl_booking_room_overlap (EXCLUDE USING gist) is the guarantee; it is
  tested with the trigger switched off so it stands on its own.
- trg_check_double_booking locks the room row, so a concurrent second
  booking waits for the first and gets the friendly "already booked" error.
- API: a burst of identical POST /bookings gives exactly one 201, the rest
  409, never a 500.
The concurrency tests need real commits on separate connections, so they use
their own pool and delete the bookings they made (dates in 2031, which no
seed booking uses). The rest run in the rolled-back `db_conn` fixture.

Run:  cd backend && pytest tests/test_double_booking.py -q
"""

import asyncio

import asyncpg
import pytest
from httpx import ASGITransport, AsyncClient

from app.config import settings
from app.db import get_db
from app.main import app
pytestmark = pytest.mark.db

# Seed data (db/seed/sample_data.sql)
ROOM_103_COLOMBO = "e0000000-0000-0000-0000-000000000003"
GUEST_KAMAL = "f0000000-0000-0000-0000-000000000001"
GUEST_NIMALI = "f0000000-0000-0000-0000-000000000002"

CREATE = "CALL create_booking($1::UUID, $2::UUID, $3::TEXT::DATE, $4::TEXT::DATE, 'Cash', NULL)"


async def _cleanup(conn):
    await conn.execute(
        "DELETE FROM booking WHERE room_id = $1::UUID AND check_in_date >= '2031-01-01'",
        ROOM_103_COLOMBO,
    )


async def _active_overlaps(conn):
    """Pairs of active 2031 bookings on the test room that overlap."""
    return await conn.fetchval(
        """
        SELECT COUNT(*) FROM booking a JOIN booking b
          ON a.room_id = b.room_id AND a.booking_id < b.booking_id
         WHERE a.room_id = $1::UUID AND a.check_in_date >= '2031-01-01'
           AND a.status IN ('Booked', 'Checked-In') AND b.status IN ('Booked', 'Checked-In')
           AND a.check_in_date < b.check_out_date AND a.check_out_date > b.check_in_date
        """,
        ROOM_103_COLOMBO,
    )


@pytest.fixture
async def pool():
    pool = await asyncpg.create_pool(settings.DATABASE_URL, min_size=2, max_size=12)
    try:
        async with pool.acquire() as conn:
            await _cleanup(conn)
        yield pool
    finally:
        async with pool.acquire() as conn:
            await _cleanup(conn)
        await pool.close()


@pytest.fixture
async def pool_api(pool):
    """In-process client where each request gets its own autocommit connection."""
    async def _override_get_db():
        async with pool.acquire() as conn:
            yield conn

    app.dependency_overrides[get_db] = _override_get_db
    try:
        async with AsyncClient(transport=ASGITransport(app=app),
                               base_url="http://test/api") as client:
            yield client
    finally:
        app.dependency_overrides.pop(get_db, None)


# ── Concurrency ──────────────────────────────────────────────────────────────

async def test_two_sessions_cannot_both_book(pool):
    """The audit's reproduction: A holds its transaction open while B books."""
    a = await pool.acquire()
    b = await pool.acquire()
    try:
        tx_a = a.transaction()
        await tx_a.start()
        await a.execute(CREATE, GUEST_KAMAL, ROOM_103_COLOMBO, "2031-01-01", "2031-01-05")

        # B blocks on the room lock until A commits
        b_task = asyncio.create_task(
            b.execute(CREATE, GUEST_NIMALI, ROOM_103_COLOMBO, "2031-01-03", "2031-01-07")
        )
        await asyncio.sleep(0.5)
        assert not b_task.done(), "B should wait for A's room lock"
        await tx_a.commit()

        with pytest.raises(asyncpg.exceptions.RaiseError, match="already booked"):
            await b_task
        assert await _active_overlaps(a) == 0
    finally:
        await pool.release(a)
        await pool.release(b)


async def test_api_burst_gives_one_201_and_no_500(pool_api, pool):
    resp = await pool_api.post("/auth/login", json={"email": "rec.colombo@skynest.lk",
                                                    "password": "SkyNest@2026"})
    assert resp.status_code == 200, resp.text
    headers = {"Authorization": f"Bearer {resp.json()['access_token']}"}
    body = {"guest_id": GUEST_KAMAL, "room_id": ROOM_103_COLOMBO,
            "check_in_date": "2031-03-01", "check_out_date": "2031-03-04",
            "payment_option": "Cash"}

    responses = await asyncio.gather(
        *(pool_api.post("/bookings", json=body, headers=headers) for _ in range(10))
    )
    codes = sorted(r.status_code for r in responses)
    assert codes == [201] + [409] * 9, [r.text for r in responses]
    async with pool.acquire() as conn:
        assert await _active_overlaps(conn) == 0


# ── The constraint on its own ────────────────────────────────────────────────

async def _without_trigger(db_conn):
    await db_conn.execute("ALTER TABLE booking DISABLE TRIGGER trg_double_booking")


async def _insert(db_conn, check_in, check_out, status="Booked", guest=GUEST_KAMAL):
    await db_conn.execute(
        """
        INSERT INTO booking (guest_id, room_id, check_in_date, check_out_date,
                             rate_at_booking, payment_option, status)
        VALUES ($1::UUID, $2::UUID, $3::TEXT::DATE, $4::TEXT::DATE, 10000, 'Cash', $5::booking_status)
        """,
        guest, ROOM_103_COLOMBO, check_in, check_out, status,
    )


async def test_constraint_rejects_overlap_without_trigger(db_conn):
    await _without_trigger(db_conn)
    await _insert(db_conn, "2031-05-01", "2031-05-05")
    with pytest.raises(asyncpg.exceptions.ExclusionViolationError):
        async with db_conn.transaction():
            await _insert(db_conn, "2031-05-04", "2031-05-06", guest=GUEST_NIMALI)


async def test_constraint_rejects_reactivating_into_overlap(db_conn):
    await _without_trigger(db_conn)
    await _insert(db_conn, "2031-05-01", "2031-05-05")
    await _insert(db_conn, "2031-05-02", "2031-05-03", status="Cancelled")
    with pytest.raises(asyncpg.exceptions.ExclusionViolationError):
        async with db_conn.transaction():
            await db_conn.execute(
                "UPDATE booking SET status = 'Booked' WHERE room_id = $1::UUID "
                "AND check_in_date = '2031-05-02'", ROOM_103_COLOMBO,
            )


@pytest.mark.parametrize("status", ["Cancelled", "Checked-Out"])
async def test_constraint_ignores_inactive_bookings(db_conn, status):
    await _without_trigger(db_conn)
    await _insert(db_conn, "2031-05-01", "2031-05-05")
    await _insert(db_conn, "2031-05-02", "2031-05-04", status=status)


async def test_constraint_allows_back_to_back_stays(db_conn):
    await _without_trigger(db_conn)
    await _insert(db_conn, "2031-05-01", "2031-05-05")
    await _insert(db_conn, "2031-05-05", "2031-05-08", guest=GUEST_NIMALI)


# ── Through create_booking and the API ───────────────────────────────────────

async def test_back_to_back_stays_both_book(api, login):
    headers = await login("receptionist")
    first = {"guest_id": GUEST_KAMAL, "room_id": ROOM_103_COLOMBO,
             "check_in_date": "2031-06-01", "check_out_date": "2031-06-05",
             "payment_option": "Cash"}
    second = {**first, "guest_id": GUEST_NIMALI,
              "check_in_date": "2031-06-05", "check_out_date": "2031-06-08"}
    assert (await api.post("/bookings", json=first, headers=headers)).status_code == 201
    assert (await api.post("/bookings", json=second, headers=headers)).status_code == 201


async def test_overlap_through_api_is_409(api, login):
    headers = await login("receptionist")
    body = {"guest_id": GUEST_KAMAL, "room_id": ROOM_103_COLOMBO,
            "check_in_date": "2031-06-01", "check_out_date": "2031-06-05",
            "payment_option": "Cash"}
    assert (await api.post("/bookings", json=body, headers=headers)).status_code == 201
    overlap = {**body, "guest_id": GUEST_NIMALI, "check_in_date": "2031-06-04",
               "check_out_date": "2031-06-06"}
    resp = await api.post("/bookings", json=overlap, headers=headers)
    assert resp.status_code == 409, resp.text
