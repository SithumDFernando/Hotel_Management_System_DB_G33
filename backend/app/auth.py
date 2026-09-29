"""
backend/app/auth.py
===================
Purpose:
    Core authentication utilities: password hashing and JWT token
    generation / verification. This module is intentionally kept separate
    from the auth *router* (`routers/auth.py`) so that helper functions
    can be imported anywhere without creating circular imports.

What to implement here:
    1. Password hashing using passlib (bcrypt scheme):

        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

        def hash_password(plain: str) -> str:
            return pwd_context.hash(plain)

        def verify_password(plain: str, hashed: str) -> bool:
            return pwd_context.verify(plain, hashed)

    2. JWT creation:

        from datetime import datetime, timedelta
        import jwt  # PyJWT

        def create_access_token(data: dict) -> str:
            # data should contain {"sub": account_id, "role": user_role}
            payload = data.copy()
            payload["exp"] = datetime.utcnow() + timedelta(
                minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
            )
            return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

    3. JWT decoding (used by the `get_current_user` dependency in dependencies.py):

        def decode_access_token(token: str) -> dict:
            return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])

    4. User role constants for use in access control:
        ROLES = {"admin", "manager", "receptionist", "guest"}

Dependencies:
    - app.config.settings (SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES)
    - passlib[bcrypt]    (pip install passlib[bcrypt])
    - PyJWT              (pip install PyJWT)
"""

# TODO: Implement auth.py
