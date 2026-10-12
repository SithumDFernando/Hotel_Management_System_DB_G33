# ISSUE-11 — Guest-role account without a guest profile crashes `/bookings`

| | |
|---|---|
| **Severity** | 🟠 Medium (robustness, data integrity) |
| **Area** | Backend — `admin.py`, `auth.py /register`, `bookings.py`, `BookingCheckout.jsx`; DB constraint |
| **Found** | 2026-10-12 audit |

## Problem

`POST /admin/users {"role":"guest"}` (and `/auth/register`) accepts a guest account with **no `guest_id`**. When that user logs in:

- `GET /bookings` → **500** (`invalid UUID 'None'`), so the My Bookings page is broken.
- `POST /bookings` → 403 with a confusing "can only create bookings for themselves" message.

A guest account can also be orphaned later: `fk_user_account_guest` is `ON DELETE SET NULL`.

The reverse problem exists too: a staff account can be given a `guest_id`, which is meaningless.

## Root cause

- No validation of the role ↔ link combination on account creation or update.
- [bookings.py:325](../../../backend/app/routers/bookings.py#L325) builds the filter with `str(user.get("guest_id"))`, which yields `"None"`.

## Implementation plan

### 1. Validate the role ↔ link rules on write

Implement this together with ISSUE-06, which defines the full rule table:
- `role == "guest"` → `guest_id` **required** and must exist (404 otherwise), `branch_id` must be empty.
- The `guest_id` must not already be linked to another account (409). Add `UNIQUE (guest_id)` on `user_account`; NULLs are allowed many times.
- Staff roles → `guest_id` must be empty.

Apply this in `admin.create_user`, `admin.patch_user` (if a role change to or from `guest` is allowed; simplest is to **forbid** changing a guest account to staff and back) and `auth.register`.

### 2. DB guarantee

Covered by the `chk_user_account_role_links` CHECK in ISSUE-06, plus:

```sql
ALTER TABLE user_account
    ADD CONSTRAINT uq_user_account_guest UNIQUE (guest_id);

-- Prevent orphaning: a guest profile with a login can't be deleted out from under it
ALTER TABLE user_account DROP CONSTRAINT fk_user_account_guest;
ALTER TABLE user_account ADD CONSTRAINT fk_user_account_guest
    FOREIGN KEY (guest_id) REFERENCES guest(guest_id) ON DELETE CASCADE;   -- or RESTRICT
```

(Edit the original definition in `02_constraints.sql` rather than adding ALTERs on top, since `run_all.sql` rebuilds from scratch.)

### 3. Defensive handling in the routers

Replace every `str(user.get("guest_id"))` / `str(user.get("branch_id"))` with a helper that fails closed:

```python
def require_guest_id(user: dict) -> str:
    if not user.get("guest_id"):
        raise HTTPException(403, "This account has no guest profile. Contact the front desk.")
    return str(user["guest_id"])
```

Use it in `bookings.list_bookings`, `create_booking` (guest branch), `get_booking` and `cancel_booking`, and in `dependencies.assert_booking_access` (ISSUE-03).

### 4. Frontend

`BookingCheckout.jsx` already handles `!user.guest_id`. Check that `MyBookings.jsx` shows a friendly empty state for a 403 instead of a generic error.

## Tests to add

- Admin creates `{role:"guest"}` with no `guest_id` → 422.
- Admin creates a guest account linked to `f…0001` (already linked to kamal) → 409.
- Admin creates a receptionist with a `guest_id` → 422.
- Guest token without `guest_id` (set up via SQL in a test transaction with the CHECK deferred, or a mocked `get_current_user`) → `GET /bookings` → 403, not 500.

## Acceptance criteria

- [ ] Guest accounts always have exactly one guest profile; staff accounts never do.
- [ ] No `"None"` strings reach SQL anywhere (`grep -rn 'str(user.get' backend/app` → only inside the helpers).
