"""
backend/app/routers/admin.py
=============================
Purpose:
    System-wide administration endpoints accessible only to users with the
    `admin` role. Covers branch management and user account management.
    These are used by the `AdminDashboard` frontend page.

Endpoints to implement:

    --- Branches ---
    GET /api/admin/branches
        - Returns all branches (id, name, city, address, phone, manager_name).
        - Also used by the public Home page for branch showcase cards.
        - Access: public (for read), admin (for write).

    POST /api/admin/branches
        - Body: { name, city, address, phone, manager_name }
        - Creates a new hotel branch.
        - Access: admin.

    PUT /api/admin/branches/{branch_id}
        - Body: { name?, city?, address?, phone?, manager_name? }
        - Updates an existing branch.
        - Access: admin.

    DELETE /api/admin/branches/{branch_id}
        - Soft-delete or hard-delete a branch (ensure no active bookings).
        - Access: admin.

    --- User Accounts ---
    GET /api/admin/users
        - Returns all user_account rows with joined guest/branch info.
        - Access: admin.

    POST /api/admin/users
        - Body: { email, password, role, guest_id?, branch_id? }
        - Creates a new staff (receptionist/manager) or admin user account.
        - Hashes the password with `auth.hash_password()`.
        - Access: admin.

    PATCH /api/admin/users/{account_id}
        - Body: { role?, branch_id?, is_active? }
        - Changes a user's role or branch assignment.
        - Access: admin.

    DELETE /api/admin/users/{account_id}
        - Deactivates or deletes a user account.
        - Access: admin.

Database tables used:
    branch, user_account, guest

Dependencies:
    - app.db            (get_db)
    - app.auth          (hash_password)
    - app.dependencies  (get_current_user, require_role)
"""

from fastapi import APIRouter

router = APIRouter()

# TODO: Implement admin router endpoints (see docstring above for spec)
