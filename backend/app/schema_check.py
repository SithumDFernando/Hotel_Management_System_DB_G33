"""
backend/app/schema_check.py
===========================
Purpose:
    Detects a database that is older than the repo's db/run_all.sql (ISSUE-15).

    The Docker `pgdata` volume is only initialised when it is empty, so a
    volume created before a schema change silently keeps the old schema and
    the first call to a missing procedure fails as a generic 500. This module
    lists the DB objects the API depends on and reports which are missing, so
    main.py can log it at startup and answer 503 instead.

    When you add a procedure, function, view, trigger or named constraint
    that the API relies on, add it here too. tests/test_schema_check.py fails
    if a `CALL <name>` in app/ is not listed.
"""

import asyncpg

FIX_COMMAND = "docker compose down -v && docker compose up --build"

# Called by the routers (CALL ...)
REQUIRED_PROCEDURES = frozenset({
    "create_booking", "cancel_booking", "perform_checkin",
    "perform_checkout", "generate_bill", "record_payment",
})

# db/functions/, used by the procedures and views
REQUIRED_FUNCTIONS = frozenset({
    "fn_calculate_nights", "fn_calculate_tax", "fn_get_current_rate",
    "fn_get_outstanding_balance", "fn_get_room_charges", "fn_get_service_charges",
})

# Selected from by routers/reports.py and routers/billing.py
REQUIRED_VIEWS = frozenset({
    "v_room_occupancy", "v_guest_billing_summary", "v_service_usage_breakdown",
    "v_monthly_revenue", "v_top_services", "v_top_services_by_branch",
})

REQUIRED_TRIGGERS = frozenset({
    "trg_double_booking", "trg_room_status", "trg_service_usage",
})

# Business rules enforced only in the DB (ISSUE-05/08/09/10)
REQUIRED_CONSTRAINTS = frozenset({
    "excl_booking_room_overlap", "chk_booking_payment_option",
    "chk_payment_method", "chk_user_account_role_links",
})

# Case-insensitive unique email (ISSUE-10)
REQUIRED_INDEXES = frozenset({"uq_user_account_email_ci"})

_CATALOG_QUERY = """
SELECT 'procedures' AS kind, p.proname AS name
  FROM pg_proc p WHERE p.pronamespace = current_schema()::regnamespace AND p.prokind = 'p'
UNION ALL
SELECT 'functions', p.proname
  FROM pg_proc p WHERE p.pronamespace = current_schema()::regnamespace AND p.prokind = 'f'
UNION ALL
SELECT 'views', c.relname
  FROM pg_class c WHERE c.relnamespace = current_schema()::regnamespace AND c.relkind = 'v'
UNION ALL
SELECT 'indexes', c.relname
  FROM pg_class c WHERE c.relnamespace = current_schema()::regnamespace AND c.relkind = 'i'
UNION ALL
SELECT 'triggers', t.tgname
  FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
 WHERE c.relnamespace = current_schema()::regnamespace AND NOT t.tgisinternal
UNION ALL
SELECT 'constraints', con.conname
  FROM pg_constraint con WHERE con.connamespace = current_schema()::regnamespace
"""

_REQUIRED = {
    "procedures": REQUIRED_PROCEDURES,
    "functions": REQUIRED_FUNCTIONS,
    "views": REQUIRED_VIEWS,
    "triggers": REQUIRED_TRIGGERS,
    "constraints": REQUIRED_CONSTRAINTS,
    "indexes": REQUIRED_INDEXES,
}


async def missing_schema_objects(conn: asyncpg.Connection) -> dict[str, list[str]]:
    """
    Return {kind: [missing names]} for every required object not in the
    current schema. An empty dict means the DB matches what the API needs.
    """
    present: dict[str, set[str]] = {kind: set() for kind in _REQUIRED}
    for row in await conn.fetch(_CATALOG_QUERY):
        present[row["kind"]].add(row["name"])

    missing = {}
    for kind, names in _REQUIRED.items():
        absent = sorted(names - present[kind])
        if absent:
            missing[kind] = absent
    return missing


def out_of_date_body(missing: dict[str, list[str]]) -> dict:
    """Response body for GET /api/health and the 503 middleware."""
    return {"status": "schema_out_of_date", "missing": missing, "fix": FIX_COMMAND}
