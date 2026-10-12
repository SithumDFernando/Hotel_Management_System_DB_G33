"""
backend/tests/test_input_validation.py
======================================
ISSUE-07: malformed input must get a 4xx (never a 500), and no response may
echo raw Postgres error text. Covers every row of the issue's problem table.
Runs in-process against the seeded database; each test is rolled back.

Run:  cd backend && pytest tests/test_input_validation.py -q
"""

import logging
import uuid

import asyncpg
import pytest
from starlette.requests import Request

from app.main import postgres_error_handler

# Seed data (db/seed/sample_data.sql)
COLOMBO = "a0000000-0000-0000-0000-000000000001"
ROOM_102 = "e0000000-0000-0000-0000-000000000002"
GUEST_KAMAL = "f0000000-0000-0000-0000-000000000001"
BK_CHECKED_IN = "30000000-0000-0000-0000-000000000001"
ROOM_SERVICE = "20000000-0000-0000-0000-000000000001"

LEAK_MARKERS = ("Database error", "DETAIL:", "asyncpg", "violates", "character varying")


def assert_clean_4xx(resp, expected=None):
    assert resp.status_code < 500, f"{resp.status_code}: {resp.text}"
    if expected is not None:
        assert resp.status_code == expected, resp.text
    for marker in LEAK_MARKERS:
        assert marker not in resp.text, f"leaked {marker!r}: {resp.text}"


def _booking(**overrides):
    body = {
        "guest_id": GUEST_KAMAL,
        "room_id": ROOM_102,
        "check_in_date": "2030-01-10",
        "check_out_date": "2030-01-12",
        "payment_option": "Cash",
    }
    body.update(overrides)
    return body


# (role, method, path, json) — role None means unauthenticated
CASES = [
    # Non-UUID path IDs
    (None, "GET", "/rooms/not-a-uuid", None),
    ("admin", "GET", "/bookings/bad", None),
    ("admin", "PATCH", "/bookings/bad/checkin", None),
    ("admin", "PATCH", "/bookings/bad/checkout", None),
    ("admin", "PATCH", "/bookings/bad/cancel", {}),
    ("admin", "PUT", "/admin/branches/bad", {"name": "X"}),
    ("admin", "PATCH", "/admin/users/bad", {"role": "admin"}),
    ("manager", "PATCH", "/rooms/bad/status", {"status": "Available"}),
    ("admin", "GET", "/billing/bad", None),
    ("admin", "GET", "/services/bad/usage", None),
    # Non-UUID query / body IDs
    (None, "GET", "/rooms?branch_id=bad", None),
    ("admin", "GET", "/bookings?guest_id=bad", None),
    ("admin", "GET", "/bookings?room_id=bad", None),
    ("admin", "GET", "/bookings?branch_id=bad", None),
    ("admin", "GET", "/reports/billing-summary?branch_id=bad", None),
    ("admin", "GET", "/reports/occupancy?branch_id=bad", None),
    ("admin", "GET", "/reports/service-usage?branch_id=bad", None),
    ("admin", "GET", "/reports/monthly-revenue?year=2026&branch_id=bad", None),
    ("admin", "POST", "/admin/users",
     {"email": "new.mgr@skynest.lk", "password": "Secret123!", "role": "manager", "branch_id": "bad"}),
    ("admin", "PATCH", f"/admin/users/{uuid.uuid4()}", {"branch_id": "bad"}),
    ("admin", "POST", "/auth/register",
     {"email": "x@skynest.lk", "password": "Secret123!", "role": "manager", "branch_id": "bad"}),
    ("admin", "POST", "/bookings", _booking(guest_id="bad")),
    # Strings longer than the column
    ("receptionist", "POST", "/guests",
     {"full_name": "Test Guest", "nic_passport": "9" * 30, "email": "t@mail.com", "phone": "0771234567"}),
    ("receptionist", "PUT", f"/guests/{GUEST_KAMAL}", {"phone": "0" * 25}),
    ("admin", "POST", "/admin/branches",
     {"name": "N" * 500, "city": "C", "address": "A", "phone": "011", "manager_name": "M"}),
    ("admin", "PUT", f"/admin/branches/{COLOMBO}", {"city": "C" * 60}),
    ("admin", "POST", "/bookings", _booking(payment_option="P" * 60)),
    # Numeric overflow
    ("admin", "POST", "/services", {"service_name": "Gold", "category": "Spa", "base_price": 1e12}),
    ("admin", "PATCH", f"/services/{ROOM_SERVICE}", {"base_price": 1e12}),
    ("admin", "POST", "/services", {"service_name": "Gold", "category": "Spa", "base_price": "10.001"}),
    ("admin", "POST", f"/billing/{BK_CHECKED_IN}/generate?discount=999999999", None),
    ("receptionist", "POST", f"/services/{BK_CHECKED_IN}/usage",
     {"service_id": ROOM_SERVICE, "usage_date": "2026-10-12", "quantity": 2147483648}),
    ("receptionist", "POST", f"/services/{BK_CHECKED_IN}/usage",
     {"service_id": ROOM_SERVICE, "usage_date": "2026-10-12", "quantity": 1001}),
]


@pytest.mark.parametrize(
    "role, method, path, body", CASES, ids=[f"{c[1]} {c[2][:60]}" for c in CASES]
)
async def test_malformed_input_is_rejected_cleanly(api, login, role, method, path, body):
    headers = await login(role) if role else {}
    resp = await api.request(method, path, json=body, headers=headers)
    assert_clean_4xx(resp, 422)


async def test_booking_unknown_guest_is_404(api, login):
    resp = await api.post(
        "/bookings", json=_booking(guest_id=str(uuid.uuid4())), headers=await login("admin")
    )
    assert_clean_4xx(resp, 404)
    assert resp.json()["detail"] == "Guest not found"


async def test_booking_unknown_room_is_404(api, login):
    resp = await api.post(
        "/bookings", json=_booking(room_id=str(uuid.uuid4())), headers=await login("admin")
    )
    assert_clean_4xx(resp, 404)
    assert resp.json()["detail"] == "Room not found"


async def test_unknown_ids_are_404(api, login):
    headers = await login("admin")
    for method, path, body in [
        ("GET", f"/rooms/{uuid.uuid4()}", None),
        ("GET", f"/bookings/{uuid.uuid4()}", None),
        ("PUT", f"/admin/branches/{uuid.uuid4()}", {"name": "X"}),
        ("PATCH", f"/admin/users/{uuid.uuid4()}", {"role": "admin"}),
    ]:
        resp = await api.request(method, path, json=body, headers=headers)
        assert_clean_4xx(resp, 404)


async def test_oversized_bill_is_rejected_with_message(api, login):
    headers = await login("admin")
    resp = await api.post(
        "/services",
        json={"service_name": "Penthouse", "category": "Luxury", "base_price": "99999999.99"},
        headers=headers,
    )
    assert resp.status_code == 201, resp.text
    service_id = resp.json()["service_id"]

    resp = await api.post(
        f"/services/{BK_CHECKED_IN}/usage",
        json={"service_id": service_id, "usage_date": "2026-10-12", "quantity": 1000},
        headers=headers,
    )
    assert resp.status_code == 201, resp.text

    resp = await api.post(f"/billing/{BK_CHECKED_IN}/generate", headers=headers)
    assert_clean_4xx(resp, 400)
    assert resp.json()["detail"] == "Bill total exceeds the maximum supported amount"


async def test_duplicate_guest_is_409(api, login):
    headers = await login("receptionist")
    body = {"full_name": "Dup Guest", "nic_passport": "DUP12345", "email": "dup@mail.com",
            "phone": "0771234567"}
    assert (await api.post("/guests", json=body, headers=headers)).status_code == 201
    resp = await api.post("/guests", json=body, headers=headers)
    assert_clean_4xx(resp, 409)


async def test_usage_on_non_checked_in_booking_is_422(api, login):
    resp = await api.post(
        "/services/30000000-0000-0000-0000-000000000002/usage",  # Colombo, Checked-Out
        json={"service_id": ROOM_SERVICE, "usage_date": "2026-10-12", "quantity": 1},
        headers=await login("receptionist"),
    )
    assert_clean_4xx(resp, 422)
    assert "Checked-In" in resp.json()["detail"]


# ── Global handler, unit level ───────────────────────────────────────────────

def _request():
    return Request({"type": "http", "method": "POST", "path": "/api/x",
                    "headers": [], "query_string": b""})


@pytest.mark.parametrize(
    "exc, code",
    [
        (asyncpg.exceptions.UniqueViolationError("dup key"), 409),
        (asyncpg.exceptions.ForeignKeyViolationError("fk"), 404),
        (asyncpg.exceptions.StringDataRightTruncationError("value too long for type character varying(20)"), 422),
        (asyncpg.exceptions.NumericValueOutOfRangeError("numeric field overflow"), 422),
        (asyncpg.exceptions.CheckViolationError("check"), 422),
    ],
)
async def test_pg_handler_maps_known_errors(exc, code):
    resp = await postgres_error_handler(_request(), exc)
    assert resp.status_code == code
    assert str(exc) not in resp.body.decode()


async def test_pg_handler_logs_unexpected_errors(caplog):
    exc = asyncpg.exceptions.RaiseError("secret internal message")
    with caplog.at_level(logging.ERROR, logger="skynest"):
        resp = await postgres_error_handler(_request(), exc)
    assert resp.status_code == 500
    assert b"secret internal message" not in resp.body
    record = next(r for r in caplog.records if r.name == "skynest")
    assert record.exc_info is not None, "stack trace must be logged"
