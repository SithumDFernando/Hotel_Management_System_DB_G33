"""
backend/app/dependencies.py
============================
Purpose:
    Reusable FastAPI dependency functions that are injected into route
    handlers via `Depends(...)`. This keeps authentication and authorisation
    logic DRY — each router does NOT need to manually parse the JWT; it
    simply declares the dependency and receives the current user.

What to implement here:
    1. `get_current_user(token: str = Depends(oauth2_scheme), db = Depends(get_db))`
       - Extracts the Bearer token from the `Authorization` header.
       - Decodes it with `auth.decode_access_token()`.
       - Looks up the user_account row by `account_id` (from token's "sub" claim).
       - Raises `HTTPException(401)` if the token is invalid or expired.
       - Returns the user_account record.

    2. Role-based guard factories (return a dependency that asserts a minimum role):

        def require_role(*roles: str):
            async def _guard(current_user = Depends(get_current_user)):
                if current_user["role"] not in roles:
                    raise HTTPException(status_code=403, detail="Forbidden")
                return current_user
            return _guard

       Usage in a router:
         @router.get("/admin/users")
         async def list_users(user = Depends(require_role("admin"))):
             ...

    3. The OAuth2 scheme instance used to extract Bearer tokens:
        from fastapi.security import OAuth2PasswordBearer
        oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

    4. A helper `get_branch_scoped_user` that, for `manager` and `receptionist`,
       asserts that the requested branch_id matches their assigned `branch_id`,
       preventing cross-branch data access.

Dependencies:
    - app.auth         (decode_access_token)
    - app.db           (get_db)
    - fastapi.security (OAuth2PasswordBearer)
"""

# TODO: Implement dependencies.py
