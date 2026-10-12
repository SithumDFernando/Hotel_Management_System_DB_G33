# ISSUE-15 — Cancel booking returns 500 on the Docker dev database (stale schema)

| | |
|---|---|
| **Severity** | 🔴 High: guests and receptionists can't cancel bookings on any machine whose DB volume predates ISSUE-12 |
| **Area** | Docker dev DB (`pgdata` volume), `backend/app/main.py` (startup + health), new `backend/app/schema_check.py`, `README.md`, `backend/tests/` |
| **Found** | 2026-10-12, during UI-06 verification (`docs/work/ui_ux/Tasklist.md`) |
| **Blocks** | UI-06 tick (cancel from My Bookings must be verified) |

## Symptom

My Bookings → **Cancel booking** → confirm shows the toast **"Internal server error"**, and the booking stays `Booked`. The same happens from the Receptionist dashboard.

```
PATCH /api/bookings/56ddba25-…/cancel  → 500 {"detail":"Internal server error"}

backend log:
  File "/app/app/routers/bookings.py", line 284, in cancel_booking
    await db.execute("CALL cancel_booking($1::UUID)", booking_id)
asyncpg.exceptions.UndefinedFunctionError: procedure cancel_booking(uuid) does not exist
```

The running DB has only five procedures:

```
create_booking, generate_bill, perform_checkin, perform_checkout, record_payment
```

## Root cause

**The code is correct; the database is out of date.**

- `cancel_booking(p_booking_id UUID)` exists in `db/procedures/booking.sql:128` and is installed by `db/run_all.sql`. It was added by ISSUE-12 (task 10), and cancel was browser-checked on a **fresh** build in task 15.
- `docker-compose.yml` runs `db/docker/init.sh` (→ `run_all.sql`) **only when the `pgdata` volume is empty**. A volume created before ISSUE-04 to ISSUE-12 never receives the new procedures, triggers, CHECKs, exclusion constraint or indexes.
- Nothing detects the drift. The backend starts, `/` health says `ok`, and the first call to a missing routine fails as a generic 500.
- This was noticed twice before and only noted, not fixed. TASKLIST task 15: "The dev DB (`skynest`) is stale; it lacks the ISSUE-08/10 constraints." Task 18: "The shared dev DB `skynest` in Docker is stale (pre-ISSUE-08/09 procedures); rebuild it from `run_all.sql`…". **Every teammate who pulled after ISSUE-08 and didn't wipe their volume has the same problem**, and it can silently hide other fixes too (missing `excl_booking_room_overlap` means double booking is possible again, missing CHECKs mean bad payment values are accepted).

## Implementation plan

### 15.1 Rebuild the local dev DB (unblocks UI-06 now)

1. Confirm nothing in the local DB needs keeping. It's seed data plus test bookings, including the UI-06 test booking: Kamal Perera, Single Room 103, 01/12–03/12/2026.
2. `docker compose down -v && docker compose up -d --build`. This is destructive: it wipes the `pgdata` volume, and `init.sh` rebuilds from `run_all.sql`. **Ask the user before running it.**
3. Verify the procedures:
   ```bash
   docker exec skynest-db-1 sh -c 'psql -U $POSTGRES_USER -d $POSTGRES_DB -tc "select proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname=\$\$public\$\$ and prokind=\$\$p\$\$ order by 1"'
   ```
   Expect six, including `cancel_booking`.
4. Verify the constraints: `excl_booking_room_overlap`, `chk_booking_payment_option`, `chk_payment_method` and `chk_user_account_role_links` exist (`\d booking`, `\d payment`, `\d user_account`).

> Don't "fix" it by applying only `db/procedures/booking.sql` to the old volume. The volume is also missing ISSUE-05/08/09/10 constraints, triggers and indexes, so a partial patch leaves a DB that matches no version of the repo.

### 15.2 Make drift impossible to miss: startup schema check

Add `backend/app/schema_check.py`. It queries the catalog once at startup for the DB objects the API depends on, and reports what's missing.

```python
REQUIRED_PROCEDURES = {"create_booking", "cancel_booking", "perform_checkin",
                       "perform_checkout", "generate_bill", "record_payment"}
REQUIRED_FUNCTIONS  = {"fn_calculate_tax", ...}     # every fn_* the routers/views call
REQUIRED_CONSTRAINTS = {"excl_booking_room_overlap", "chk_booking_payment_option",
                        "chk_payment_method", "chk_user_account_role_links"}
REQUIRED_TRIGGERS = {"trg_double_booking", "trg_room_status", "trg_service_usage"}

async def missing_schema_objects(conn) -> dict[str, list[str]]: ...
```

- Build the lists from what the code actually calls: `grep -rhoE "CALL [a-z_]+|fn_[a-z_]+\(" backend/app`, plus the constraint and trigger names in `docs/specs/03_*` and `04_*`. Check views too if the routers select from them (`v_*`).
- In `main.py`'s `lifespan`, after `init_db()`, run the check:
  - If anything is missing, log one **loud** `logging.error` block listing the missing objects and the fix command (`docker compose down -v && docker compose up --build`).
  - Store the result on `app.state.schema_missing`.
  - **Don't crash the process**, so pgAdmin and the frontend stay reachable and the message is visible.
- Health:
  - Keep `GET /` as is (liveness).
  - Add `GET /api/health` returning `{"status": "ok"}` (200), or `{"status": "schema_out_of_date", "missing": {...}, "fix": "docker compose down -v && docker compose up --build"}` (**503**).
  - Point the compose `backend` healthcheck at `/api/health` if it has one; otherwise leave compose alone.
- Optional: a middleware that returns 503 with the same body for any `/api/*` request while `schema_missing` is non-empty. **Recommended:** a clear 503 everywhere beats a random 500 on one button. Decide and record the decision here.

### 15.3 Map "missing routine" errors clearly

In the global asyncpg handler (`main.py`, the one returning `"Internal server error"` at line ~88), add a branch for `asyncpg.exceptions.UndefinedFunctionError`, `UndefinedTableError` and `UndefinedObjectError`. Log them with "database schema is out of date; rebuild with run_all.sql" and return **503** `{"detail": "The database is out of date. Ask the system admin to rebuild it."}`.

Never put the SQL text in the response (ISSUE-07 rule).

### 15.4 Tests (`backend/tests/test_schema_check.py`)

1. On the fresh `run_all.sql` test DB, `missing_schema_objects()` returns an empty result and `GET /api/health` → 200.
2. Inside a transaction that's rolled back: `DROP PROCEDURE cancel_booking(uuid)`, then the check reports `cancel_booking` missing. With the app state set, `/api/health` → 503 and lists it.
3. With `cancel_booking` dropped (rolled back), `PATCH /api/bookings/{id}/cancel` → **503** with the 15.3 message, not 500.
4. Static guard: every `CALL <name>` found in `backend/app/**/*.py` is in `REQUIRED_PROCEDURES`, so a new procedure can't be added without updating the check.

Full suite must stay green (`pytest -q`, 239+ tests) on a fresh build.

### 15.5 Docs and team notice

- `README.md` "Troubleshooting": add a "500 / 503 *procedure … does not exist* or *database is out of date*" entry with the reset command, and explain that `init.sh` only runs on an empty volume.
- `docs/specs/02_api_contract.md`: document `GET /api/health` (200/503) and the 503 for an outdated schema.
- `docs/specs/08_auth_and_roles.md` (or the deployment notes): say that a schema change in `db/` needs a volume reset on every machine.
- Team notice (for the user to post): "After pulling, run `docker compose down -v && docker compose up --build`. Your DB is missing the ISSUE-04 to 12 procedures and constraints; cancel booking fails until you do."

### 15.6 Close the loop

- Re-run the UI-06 cancel test: My Bookings → Cancel booking → confirm gives the toast "Cancelled: Single Room 103, 01/12–03/12", and the booking moves to the Cancelled tab. Do the same from the Receptionist dashboard.
- Tick UI-06 in `docs/work/ui_ux/Tasklist.md` if every other UI-06 criterion still holds. Tick this issue in `docs/work/issues/TASKLIST.md` with a short verification note.

## Out of scope

- A migrations framework (Alembic/sqitch). The project rebuilds from `run_all.sql` by design; this issue only makes a stale build visible.
- The raw room UUID in the 409 overlap detail ("Room e0000000-… is already booked"). It's tracked for UI-10 (copy), or as a one-line backend message fix if it's picked up here.

## Acceptance criteria

- [ ] Local dev DB rebuilt; six procedures and the four named constraints present.
- [ ] Cancel works from My Bookings and from the Receptionist dashboard (booking → `Cancelled`, toast states the room and dates).
- [ ] On a DB missing any required object, the backend logs one clear error at startup, `GET /api/health` returns 503 listing the missing objects, and the affected endpoint returns 503 (not 500) with no SQL in the body.
- [ ] On a fresh build, `/api/health` returns 200 and the full test suite passes, including the new `test_schema_check.py`.
- [ ] README troubleshooting and spec 02 updated; team notice text handed to the user.
