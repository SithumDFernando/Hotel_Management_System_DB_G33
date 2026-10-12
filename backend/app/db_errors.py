"""
backend/app/db_errors.py
========================
Maps business-rule errors raised by the SQL procedures and triggers
(`RAISE EXCEPTION '...'` -> asyncpg RaiseError) to HTTP errors, so each
router lists only its own message -> status rules instead of re-implementing
the string matching.

Other database errors (unique / FK / check / exclusion violations) are
handled globally in main.py.
"""

import asyncpg
from fastapi import HTTPException, status


def raise_error_to_http(
    exc: asyncpg.exceptions.RaiseError,
    rules: tuple[tuple[str, int], ...] = (),
    default: int = status.HTTP_400_BAD_REQUEST,
) -> HTTPException:
    """
    Return an HTTPException carrying the procedure's message as `detail`.

    `rules` are (lower-case message fragment, status code) pairs checked in
    order; "not found" -> 404 always applies after them. Anything else gets
    `default` (400).
    """
    msg = exc.message
    lowered = msg.lower()
    for fragment, code in (*rules, ("not found", status.HTTP_404_NOT_FOUND)):
        if fragment in lowered:
            return HTTPException(status_code=code, detail=msg)
    return HTTPException(status_code=default, detail=msg)
