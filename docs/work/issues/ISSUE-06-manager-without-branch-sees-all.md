# ISSUE-06 — Manager/receptionist with no branch sees every branch (or crashes)

| | |
|---|---|
| **Severity** | 🔴 High (security, privilege escalation through misconfiguration) |
| **Area** | Backend — `reports.py`, `bookings.py`, `admin.py`, `auth.py`; DB constraint |
| **Found** | 2026-10-12 audit |

## Problem

An admin can create a `manager` or `receptionist` with no `branch_id` (`POST /admin/users`, `POST /auth/register`), or remove an existing one's branch (`PATCH /admin/users/{id}` with `branch_id: ""`). Then:

- **Reports**: the manager sees **all three branches** in `/reports/billing-summary` (and in occupancy, service-usage and monthly-revenue).
- **`GET /bookings`** → **500** (`invalid UUID 'None'`).
- A receptionist with no branch gets 500s in the same places.

## Root cause

- [reports.py:475](../../../backend/app/routers/reports.py#L475) `_resolve_branch` returns `None` when a manager has no branch, and `None` means "no filter".
- [bookings.py:329](../../../backend/app/routers/bookings.py#L329) does `str(user.get("branch_id"))`, which turns `None` into the text `"None"`.
- Nothing in the API or DB requires branch staff to have a branch.

## Implementation plan

### 1. Fail closed at the dependency layer (`app/dependencies.py`)

```python
def require_branch(user: dict) -> str:
    """Branch-scoped roles must have a branch; otherwise refuse (403)."""
    if user["role"] in BRANCH_SCOPED and not user.get("branch_id"):
        raise HTTPException(403, "Your account is not assigned to a branch. Contact an administrator.")
    return str(user["branch_id"]) if user.get("branch_id") else None
```

- `reports._resolve_branch`: for managers, `return require_branch(user)`. It must never return `None` for a manager.
- `bookings.list_bookings`: use `require_branch(user)` instead of `str(user.get("branch_id"))`.
- ISSUE-03's `assert_booking_access` / `assert_room_access`: call `require_branch` for branch-scoped roles first.

### 2. Validate on write (`admin.py`, `auth.py /register`)

Both create and patch should enforce:

| Role | `branch_id` | `guest_id` |
|---|---|---|
| admin | must be NULL (or ignored) | NULL |
| manager / receptionist | **required** | NULL |
| guest | NULL | **required** (see ISSUE-11) |

- `create_user` / `register`: return 422 with a clear message when the rule is broken.
- `patch_user`: compute the **resulting** `(role, branch_id)` pair and validate that, so both "change role to manager without a branch" and "clear branch of a receptionist" are rejected.
- Also stop admins from demoting **themselves** (`account_id == current user`) so the last admin can't lock everyone out. Optionally refuse to demote the last remaining admin.

### 3. Back it with a DB CHECK constraint

`db/schema/02_constraints.sql`:

```sql
ALTER TABLE user_account
    ADD CONSTRAINT chk_user_account_role_links CHECK (
        (role IN ('manager', 'receptionist') AND branch_id IS NOT NULL AND guest_id IS NULL)
     OR (role = 'guest' AND guest_id IS NOT NULL AND branch_id IS NULL)
     OR (role = 'admin' AND branch_id IS NULL AND guest_id IS NULL)
    );
```

⚠ `fk_user_account_branch` is `ON DELETE SET NULL`. Deleting a branch would then violate this CHECK. There is no branch-delete endpoint today. Change the FK to `ON DELETE RESTRICT`, which is what you want anyway, so a branch with staff can't be deleted. Do the same for `fk_user_account_guest` (see ISSUE-11).

Make sure the seed accounts satisfy the CHECK (they do today). Run `run_all.sql` on a fresh DB to confirm.

### 4. Frontend (`components/admin/UsersTab.jsx`)

- Make the branch select **required** when the role is manager or receptionist, and hide it for guest and admin.
- Don't offer "No branch" for branch-scoped roles in the edit dialog.

## Tests to add

- `POST /admin/users` `{role:"manager"}` with no branch → 422.
- `PATCH /admin/users/{rec}` `{branch_id:""}` → 422.
- `PATCH /admin/users/{self}` `{role:"guest"}` → 400/409.
- Insert a manager without a branch directly in SQL → CHECK violation.
- Defence in depth: a token for a branchless manager (set up by bypassing the CHECK in a test transaction, or with a mocked `get_current_user`) → reports return 403, not the full data set.

## Acceptance criteria

- [x] No API path can produce a branch-scoped account without a branch.
- [x] If one exists anyway, it gets 403, never cross-branch data and never 500.

## Resolution (2026-10-12)

- `require_branch(user)` in `app/dependencies.py` is used by `reports._resolve_branch`, `bookings.list_bookings` and ISSUE-03's `assert_booking_access` / `assert_room_access`. For a branchless manager/receptionist it returns 403 and never `None`.
- `assert_role_links(role, branch_id, guest_id)` implements the full rule table (including the guest row) and is called by `admin.create_user`, `admin.patch_user` (on the **resulting** state) and `auth.register`. Errors are 422. `patch_user` also returns 409 when an admin tries to demote themselves, which covers "last admin" because only admins can call it.
  - Because guest accounts keep their `guest_id`, a guest → staff role change is rejected (422).
  - Promoting staff to admin requires `"branch_id": ""` in the same request (the UI already sends it).
- DB: `chk_user_account_role_links` CHECK added. `fk_user_account_branch` and `fk_user_account_guest` changed `SET NULL` → `RESTRICT`. Seed accounts validate on a fresh `run_all.sql` build.
- Frontend: `UsersTab.jsx` already required a branch for staff and hid it for admin. The empty "Select a branch…" option is now disabled in both drawers.
- Left for ISSUE-11 (task 7): `UNIQUE (guest_id)`, the `require_guest_id` helper for the `str(user.get("guest_id"))` call sites, and the My Bookings 403 state.
- Tests: `tests/test_role_links.py` (35 tests). On the pre-fix code and schema, 32 fail. A branchless manager got all three branches' data from every report (200), and `GET /bookings` returned 422 (it was a 500 before ISSUE-07). Mock fixtures in `test_frontend_support_api.py` / `test_phase4_api_mock.py` were updated to create staff with a branch.
