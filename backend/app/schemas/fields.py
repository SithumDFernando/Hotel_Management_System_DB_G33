"""
backend/app/schemas/fields.py
=============================
Field types shared by several request models.

- NormEmail: a valid email, trimmed and lower-cased, so `Kamal@mail.com`
  and `kamal@mail.com` are the same account (the DB enforces it too, with
  the unique index uq_user_account_email_ci on LOWER(email)).
- LoginEmail: trimmed and lower-cased but not format-checked, so a typo at
  login is a plain 401 rather than a 422.
- NewPassword: the password policy (app.auth.validate_new_password).
"""

from typing import Annotated

from pydantic import AfterValidator, BeforeValidator, EmailStr, Field

from app.auth import validate_new_password


def _normalise_email(value):
    return value.strip().lower() if isinstance(value, str) else value


NormEmail = Annotated[EmailStr, BeforeValidator(_normalise_email), Field(max_length=100)]
LoginEmail = Annotated[str, BeforeValidator(_normalise_email), Field(max_length=254)]
NewPassword = Annotated[str, AfterValidator(validate_new_password)]
