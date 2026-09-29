"""
backend/app/routers/auth.py
============================
Purpose:
    Handles user authentication: login and (optionally) logout.
    Issues JWT access tokens that the frontend stores and sends as
    `Authorization: Bearer <token>` on subsequent requests.

Endpoints to implement:
    POST /api/auth/login
        - Request body: { email: str, password: str }  (OAuth2PasswordRequestForm)
        - Query user_account by email.
        - Verify the submitted password against `password_hash` using
          `auth.verify_password()`.
        - On success: call `auth.create_access_token()` with
          {"sub": account_id, "role": user_role} and return:
            { "access_token": "<jwt>", "token_type": "bearer",
              "role": user_role, "account_id": account_id }
        - On failure: raise HTTP 401 "Invalid credentials".

    GET /api/auth/me   (optional, useful for frontend session restore)
        - Protected by `Depends(get_current_user)`.
        - Returns the current user's account_id, email, and role.

Database table used:
    user_account (email, password_hash, role, account_id, guest_id, branch_id)

Dependencies:
    - app.auth          (verify_password, create_access_token)
    - app.db            (get_db)
    - app.dependencies  (get_current_user)
    - app.schemas.*     (if you add request/response schemas here)
"""

# TODO: Implement auth router
