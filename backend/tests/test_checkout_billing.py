"""
backend/tests/test_checkout_billing.py
======================================
ISSUE-04: checkout must bill every charge, however stale the stored bill is.
perform_checkout now calls generate_bill(booking, NULL) before checking the
balance, so services added after the last generate are billed, a missing
bill is created, and the existing discount is kept.
- API: the audit's repro (generate -> pay -> add service -> checkout) is 402,
  paying the remainder then checks out; no bill at all is 402, not 400.
- DB: perform_checkout called directly behaves the same way.
Runs in-process against the seeded database; each test is rolled back.

Run:  cd backend && pytest tests/test_checkout_billing.py -q
"""

from decimal import Decimal

import asyncpg
import pytest

from tests.conftest import arrive_today

# Seed data (db/seed/sample_data.sql)
BK01_COLOMBO_CHECKED_IN = "30000000-0000-0000-0000-000000000001"  # has a bill + services
BK03_KANDY_BOOKED = "30000000-0000-0000-0000-000000000003"        # no bill
SPA = "20000000-0000-0000-0000-000000000002"                      # 5,000.00
SPA_X3_WITH_TAX = Decimal("17250.00")                             # 3 x 5,000 + 15%


def _payment(booking_id, amount):
    return {"booking_id": booking_id, "amount": str(amount), "payment_method": "Cash"}


def _spa_usage(quantity=3):
    return {"service_id": SPA, "usage_date": "2026-09-29", "quantity": quantity}


async def _settle(api, headers, booking_id, discount=None):
    """Generate the bill (optionally with a discount) and pay it in full."""
    params = {"discount": discount} if discount is not None else {}
    resp = await api.post(f"/billing/{booking_id}/generate", params=params, headers=headers)
    assert resp.status_code == 200, resp.text
    bill = resp.json()
    resp = await api.post("/payments", json=_payment(booking_id, bill["outstanding_balance"]),
                          headers=headers)
    assert resp.status_code == 201, resp.text
    return bill


async def _bill(db_conn, booking_id):
    return await db_conn.fetchrow("SELECT * FROM bill WHERE booking_id = $1::UUID", booking_id)


async def _status(db_conn, booking_id):
    return await db_conn.fetchval(
        "SELECT status::TEXT FROM booking WHERE booking_id = $1::UUID", booking_id
    )


# ── API ──────────────────────────────────────────────────────────────────────

async def test_service_added_after_payment_blocks_checkout(api, login, db_conn):
    """The audit's repro: the spa charge must not escape billing."""
    headers = await login("receptionist")
    bk = BK01_COLOMBO_CHECKED_IN
    paid = await _settle(api, headers, bk)

    resp = await api.post(f"/services/{bk}/usage", json=_spa_usage(), headers=headers)
    assert resp.status_code == 201, resp.text

    resp = await api.patch(f"/bookings/{bk}/checkout", headers=headers)
    assert resp.status_code == 402, resp.text
    assert f"LKR {SPA_X3_WITH_TAX}" in resp.json()["detail"]
    assert await _status(db_conn, bk) == "Checked-In"

    # The modal regenerates on open, so staff see the spa charge
    resp = await api.post(f"/billing/{bk}/generate", headers=headers)
    assert resp.status_code == 200, resp.text
    bill = resp.json()
    assert Decimal(bill["service_charges"]) == Decimal(paid["service_charges"]) + 15000
    assert Decimal(bill["outstanding_balance"]) == SPA_X3_WITH_TAX

    # Paying the remainder lets the guest leave
    resp = await api.post("/payments", json=_payment(bk, SPA_X3_WITH_TAX), headers=headers)
    assert resp.status_code == 201, resp.text
    resp = await api.patch(f"/bookings/{bk}/checkout", headers=headers)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["status"] == "Checked-Out"
    assert Decimal(str(body["bill"]["total_amount"])) == \
        Decimal(paid["total_amount"]) + SPA_X3_WITH_TAX
    assert body["bill"]["outstanding_balance"] == 0
    assert body["bill"]["balance_flag"] is False


async def test_checkout_without_bill_is_402_not_400(api, login, db_conn):
    """Room charges are owed even when nobody generated a bill."""
    headers = await login("admin")
    bk = BK03_KANDY_BOOKED
    await arrive_today(db_conn, bk)
    resp = await api.patch(f"/bookings/{bk}/checkin", headers=headers)
    assert resp.status_code == 200, resp.text

    resp = await api.patch(f"/bookings/{bk}/checkout", headers=headers)
    assert resp.status_code == 402, resp.text
    assert "Outstanding balance" in resp.json()["detail"]
    assert await _status(db_conn, bk) == "Checked-In"
    # The failed checkout rolled back the bill it created
    assert await _bill(db_conn, bk) is None


async def test_checkout_creates_bill_when_charges_are_paid(api, login, db_conn):
    """Payments need a bill, so settle, delete the bill, and let checkout rebuild it."""
    headers = await login("admin")
    bk = BK03_KANDY_BOOKED
    await arrive_today(db_conn, bk)
    assert (await api.patch(f"/bookings/{bk}/checkin", headers=headers)).status_code == 200
    paid = await _settle(api, headers, bk)
    await db_conn.execute("DELETE FROM bill WHERE booking_id = $1::UUID", bk)

    resp = await api.patch(f"/bookings/{bk}/checkout", headers=headers)
    assert resp.status_code == 200, resp.text
    assert resp.json()["bill"]["total_amount"] == float(paid["total_amount"])
    bill = await _bill(db_conn, bk)
    assert bill["outstanding_balance"] == 0 and bill["balance_flag"] is False


async def test_discount_survives_checkout_recalculation(api, login, db_conn):
    headers = await login("receptionist")
    bk = BK01_COLOMBO_CHECKED_IN
    discounted = await _settle(api, headers, bk, discount=1000)
    assert Decimal(discounted["discount_amount"]) == 1000

    resp = await api.patch(f"/bookings/{bk}/checkout", headers=headers)
    assert resp.status_code == 200, resp.text
    assert resp.json()["bill"]["total_amount"] == float(discounted["total_amount"])
    bill = await _bill(db_conn, bk)
    assert bill["discount_amount"] == 1000
    assert bill["total_amount"] == Decimal(discounted["total_amount"])


async def test_discount_kept_when_services_are_added_before_checkout(api, login, db_conn):
    headers = await login("receptionist")
    bk = BK01_COLOMBO_CHECKED_IN
    await _settle(api, headers, bk, discount=1000)
    assert (await api.post(f"/services/{bk}/usage", json=_spa_usage(),
                           headers=headers)).status_code == 201

    resp = await api.patch(f"/bookings/{bk}/checkout", headers=headers)
    assert resp.status_code == 402, resp.text
    # Same balance as without the discount: it only applied to the first bill
    assert f"LKR {SPA_X3_WITH_TAX}" in resp.json()["detail"]

    assert (await api.post(f"/billing/{bk}/generate", headers=headers)).status_code == 200
    assert (await api.post("/payments", json=_payment(bk, SPA_X3_WITH_TAX),
                           headers=headers)).status_code == 201
    resp = await api.patch(f"/bookings/{bk}/checkout", headers=headers)
    assert resp.status_code == 200, resp.text
    assert (await _bill(db_conn, bk))["discount_amount"] == 1000


# ── DB: perform_checkout called directly ─────────────────────────────────────

async def test_db_checkout_refreshes_stale_bill(db_conn):
    bk = BK01_COLOMBO_CHECKED_IN
    await db_conn.execute("CALL generate_bill($1::UUID, NULL)", bk)
    await db_conn.execute("CALL record_payment($1::UUID, $2, 'Cash', NULL, NULL)", bk,
                          (await _bill(db_conn, bk))["outstanding_balance"])
    await db_conn.execute(
        "INSERT INTO service_usage (booking_id, service_id, usage_date, quantity) "
        "VALUES ($1::UUID, $2::UUID, '2026-09-29', 3)", bk, SPA,
    )

    with pytest.raises(asyncpg.exceptions.RaiseError, match="Outstanding balance"):
        async with db_conn.transaction():
            await db_conn.execute("CALL perform_checkout($1::UUID)", bk)
    assert await _status(db_conn, bk) == "Checked-In"


async def test_db_checkout_without_bill_raises_outstanding(db_conn):
    bk = BK03_KANDY_BOOKED
    await arrive_today(db_conn, bk)
    await db_conn.execute("CALL perform_checkin($1::UUID)", bk)
    with pytest.raises(asyncpg.exceptions.RaiseError, match="Outstanding balance"):
        async with db_conn.transaction():
            await db_conn.execute("CALL perform_checkout($1::UUID)", bk)
    assert await _bill(db_conn, bk) is None
