# ISSUE-05 — Double booking is possible under concurrent requests

| | |
|---|---|
| **Severity** | 🔴 High (data integrity, core business rule) |
| **Area** | Database — schema constraints, `double_booking_trigger.sql`, `bookings.py` error mapping |
| **Found** | 2026-10-12 audit (deterministic reproduction) |

## Problem

Two overlapping bookings for the same room **both committed**:

```text
Session A: BEGIN; CALL create_booking(guest2, room204, '2029-01-01','2029-01-05', ...); <hold 3s>; COMMIT;
Session B (1s later): CALL create_booking(guest3, room204, '2029-01-03','2029-01-07', ...);

Result: both rows exist with status 'Booked'.
```

Under normal HTTP load the window is small (a 10-request burst happened to give 1×201 and 9×409), but it is real. A busy front desk plus online guests booking the same room at the same moment will hit it eventually.

## Root cause

`trg_check_double_booking` runs `IF EXISTS (SELECT … overlapping …)` under READ COMMITTED. A transaction can't see another transaction's **uncommitted** insert, so both checks pass. Nothing locks the room and nothing is enforced at the constraint level.

## Implementation plan

Use **both** layers. The constraint is the guarantee; the trigger keeps the friendly message.

### 1. Exclusion constraint (the real guarantee)

In `db/schema/02_constraints.sql`:

```sql
-- btree_gist lets GiST index the UUID equality part of the constraint.
-- It is a *trusted* extension (PG13+), so the DB owner can create it.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE booking
    ADD CONSTRAINT excl_booking_room_overlap
    EXCLUDE USING gist (
        room_id WITH =,
        daterange(check_in_date, check_out_date, '[)') WITH &&
    )
    WHERE (status IN ('Booked', 'Checked-In'));
```

- `'[)'` means check-out day = next check-in day is **not** an overlap. This matches the trigger's `<` / `>` logic.
- The `WHERE` clause matches the trigger: cancelled and checked-out bookings don't block.
- The constraint also builds an index that speeds up the availability query in `rooms.py`. `idx_booking_room_dates` can stay.
- Put `CREATE EXTENSION` at the top of `01_tables.sql` or `02_constraints.sql` so `run_all.sql` stays the single entry point.
- Check that `db/setup_db.sql` (native setup) gives the app user enough rights. Trusted extensions need `CREATE` on the database, which the owner has.

### 2. Serialize in the trigger (optional, clearer errors)

At the top of `trg_check_double_booking()`:

```sql
-- Serialize concurrent bookings for the same room
PERFORM 1 FROM room WHERE room_id = NEW.room_id FOR UPDATE;
```

With the lock, the second transaction waits for the first to commit, then its `EXISTS` check sees the row and raises the friendly "already booked" message. Without the lock, the constraint still catches the conflict, just with a different error class.

### 3. Map the constraint error in the router

`asyncpg.exceptions.ExclusionViolationError` is **not** a `RaiseError`, so it currently becomes a 500. In `bookings.create_booking`:

```python
except asyncpg.exceptions.ExclusionViolationError:
    raise HTTPException(409, "Room is not available for the selected dates")
```

If ISSUE-07's global asyncpg handler lands first, map `ExclusionViolationError → 409` there instead.

### 4. Check the seed and the tests

- Seed bookings must not overlap among `Booked`/`Checked-In` rows (they don't today). Verify by running `run_all.sql` on a fresh DB.
- `test_business_logic.py` inserts overlapping bookings directly and expects the trigger to raise. It will still raise, so check the assertion only looks at the error *message* if one is matched.

## Tests to add

- **DB:** two `asyncpg` connections, each `BEGIN` + `CALL create_booking` for overlapping dates on the same room. Commit A, then B must fail.
- **API:** `asyncio.gather` of 10 identical `POST /bookings` → exactly one 201, nine 409, zero 500.
- Back-to-back stays (A checks out 01-05, B checks in 01-05) → both succeed.

## Acceptance criteria

- [x] The two-session reproduction above fails for the second session.
- [x] Concurrent API requests never produce overlapping active bookings and never return 500.
- [x] `docs/specs/01_database_design.md` and `06_indexing_strategy.md` mention the exclusion constraint.

## Resolution (2026-10-12)

- `db/schema/02_constraints.sql`:
  - `CREATE EXTENSION IF NOT EXISTS btree_gist` at the top. It's trusted, so the DB owner can create it; `setup_db.sql` creates `skynest` with `OWNER skynest_user`, and in Docker the user is the superuser.
  - New section with `excl_booking_room_overlap` exactly as planned (`'[)'`, `WHERE status IN ('Booked','Checked-In')`). `run_all.sql` is still the single entry point and builds cleanly with the seed, so no seed bookings overlap.
- `trg_check_double_booking` now runs `PERFORM 1 FROM room WHERE room_id = NEW.room_id FOR UPDATE` before its `EXISTS` check. A concurrent second booking waits for the first to commit, then gets the friendly "already booked" message. The lock is only taken when the new row is active.
- Router: no change. ISSUE-07's global handler already maps `ExclusionViolationError` → `409 Room is not available for the selected dates.`, and the trigger's message still maps to 409 in `create_booking`.
- `test_business_logic.py` checks for "already booked" in the message, which the trigger still raises, so it passes unchanged.
- Tests: `tests/test_double_booking.py` (9 tests).
  - Covered: the two-session reproduction; a 10-request `asyncio.gather` burst (exactly one 201 and nine 409); the constraint with the trigger disabled (overlap, reactivating a cancelled booking into an overlap, inactive bookings don't block, back-to-back stays allowed); back-to-back and overlap through the API.
  - The concurrency tests use their own pool with real commits, and delete their 2031 bookings before and after.
  - Ran 5× in a row with no flakes.
  - 3 fail on the pre-fix code and schema: B didn't wait and both overlapping bookings committed, and two "DID NOT RAISE ExclusionViolationError". The burst test passes pre-fix too: over HTTP the window is small, as the audit saw. It stays as a no-500 guard.
- Specs: `01_database_design.md` §2.9, `04_triggers.md` §1 (lock + constraint; removed the claim that `create_booking()` takes a lock), `06_indexing_strategy.md` (index #16, GiST note).
