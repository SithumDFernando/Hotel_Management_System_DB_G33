"""
backend/tests/test_schema_check.py
==================================
ISSUE-15: a DB older than db/run_all.sql is reported, not hidden behind 500s.

- On a fresh build nothing is missing and /api/health is 200.
- With an object dropped (rolled back), the check names it, /api/health is
  503 with the fix command, and other /api routes get the same 503.
- A missing procedure reached by a route maps to 503, not 500, with no SQL.
- Every `CALL <name>` in app/ is listed in REQUIRED_PROCEDURES.
"""

import re

import pytest

from app.main import SCHEMA_OUT_OF_DATE_DETAIL, app
from app.schema_check import (
    FIX_COMMAND, REQUIRED_CONSTRAINTS, REQUIRED_FUNCTIONS, REQUIRED_INDEXES,
    REQUIRED_PROCEDURES, REQUIRED_TRIGGERS, REQUIRED_VIEWS, missing_schema_objects,
)
from tests.conftest import BACKEND_DIR

@pytest.fixture
def schema_state():
    """Set app.state.schema_missing for one test, then clear it."""
    def _set(missing):
        app.state.schema_missing = missing
    yield _set
    app.state.schema_missing = {}


async def test_fresh_build_has_every_required_object(db_conn):
    assert await missing_schema_objects(db_conn) == {}


async def test_health_ok_on_fresh_build(api, db_conn, schema_state):
    schema_state(await missing_schema_objects(db_conn))
    resp = await api.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


async def test_check_reports_dropped_procedure(db_conn):
    await db_conn.execute("DROP PROCEDURE cancel_booking(uuid)")
    assert await missing_schema_objects(db_conn) == {"procedures": ["cancel_booking"]}


@pytest.mark.parametrize("drop_sql, kind, name", [
    ("DROP TRIGGER trg_double_booking ON booking", "triggers", "trg_double_booking"),
    ("ALTER TABLE payment DROP CONSTRAINT chk_payment_method", "constraints", "chk_payment_method"),
    ("DROP INDEX uq_user_account_email_ci", "indexes", "uq_user_account_email_ci"),
    ("DROP VIEW v_top_services", "views", "v_top_services"),
])
async def test_check_reports_other_kinds(db_conn, drop_sql, kind, name):
    await db_conn.execute(drop_sql)
    assert await missing_schema_objects(db_conn) == {kind: [name]}


async def test_health_503_lists_missing_objects(api, db_conn, schema_state):
    await db_conn.execute("DROP PROCEDURE cancel_booking(uuid)")
    schema_state(await missing_schema_objects(db_conn))

    resp = await api.get("/health")
    assert resp.status_code == 503
    assert resp.json() == {
        "status": "schema_out_of_date",
        "missing": {"procedures": ["cancel_booking"]},
        "fix": FIX_COMMAND,
    }


async def test_stale_schema_guard_503s_other_api_routes(api, schema_state):
    schema_state({"procedures": ["cancel_booking"]})
    for path in ("/rooms", "/branches"):
        resp = await api.get(path)
        assert resp.status_code == 503, path
        assert resp.json() == {"detail": SCHEMA_OUT_OF_DATE_DETAIL}


async def test_root_liveness_unaffected_by_stale_schema(api, schema_state):
    schema_state({"procedures": ["cancel_booking"]})
    resp = await api.get("http://test/")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


async def test_cancel_with_missing_procedure_is_503_not_500(api, db_conn, login):
    booking_id = await db_conn.fetchval(
        "SELECT booking_id FROM booking WHERE status = 'Booked' ORDER BY booking_id LIMIT 1"
    )
    assert booking_id is not None
    headers = await login("admin")

    await db_conn.execute("DROP PROCEDURE cancel_booking(uuid)")
    resp = await api.patch(f"/bookings/{booking_id}/cancel", headers=headers)

    assert resp.status_code == 503
    assert resp.json() == {"detail": SCHEMA_OUT_OF_DATE_DETAIL}
    assert "cancel_booking" not in resp.text and "CALL" not in resp.text
    status = await db_conn.fetchval(
        "SELECT status FROM booking WHERE booking_id = $1", booking_id)
    assert status == "Booked"


def test_every_called_procedure_is_required():
    called = set()
    for path in (BACKEND_DIR / "app").rglob("*.py"):
        called |= set(re.findall(r"CALL\s+([a-z_][a-z0-9_]*)", path.read_text(encoding="utf-8")))
    assert called, "no CALL statements found; is the regex still right?"
    assert called <= REQUIRED_PROCEDURES, f"add to REQUIRED_PROCEDURES: {called - REQUIRED_PROCEDURES}"


def test_every_selected_view_is_required():
    used = set()
    for path in (BACKEND_DIR / "app").rglob("*.py"):
        used |= set(re.findall(r"\b(v_[a-z_]+)\b", path.read_text(encoding="utf-8")))
    assert used <= REQUIRED_VIEWS, f"add to REQUIRED_VIEWS: {used - REQUIRED_VIEWS}"


def test_required_objects_exist_in_repo_sql():
    """Every name in the lists is created somewhere under db/ (no typos)."""
    sql = "\n".join(p.read_text(encoding="utf-8")
                    for p in (BACKEND_DIR.parent / "db").rglob("*.sql"))
    names = (REQUIRED_PROCEDURES | REQUIRED_FUNCTIONS | REQUIRED_VIEWS
             | REQUIRED_TRIGGERS | REQUIRED_CONSTRAINTS | REQUIRED_INDEXES)
    absent = sorted(n for n in names if not re.search(rf"\b{n}\b", sql))
    assert absent == []
