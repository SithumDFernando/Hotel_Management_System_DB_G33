# ISSUE-10 — Login and password weaknesses

| | |
|---|---|
| **Severity** | 🟠 Medium (authentication) |
| **Area** | Backend — `routers/auth.py`, `routers/admin.py`, `auth.py`, `main.py`; DB index |
| **Found** | 2026-10-12 audit |

## Problems

| # | Finding | Evidence |
|---|---|---|
| a | **Login reveals which emails exist (timing)** | Wrong password for an existing email ≈ **220 ms**; unknown email ≈ **3 ms** |
| b | **No rate limiting / lockout** | 25 rapid wrong passwords → all `401`, never `429` |
| c | **Emails are case-sensitive** | `Kamal@mail.com` signed up as a *second* account next to `kamal@mail.com`; `ADMIN@skynest.lk` can't log in |
| d | **Bytes beyond 72 are silently ignored** | Account created with a 100-char password; login with the same first 72 chars + different suffix → `200` |
| e | **No password policy for admin-created accounts** | `POST /admin/users` with `password: ""` → `201` |

## Implementation plan

### a. Constant-time-ish login (`routers/auth.py`)

When the user isn't found, still run a bcrypt check against a fixed dummy hash, so both paths cost the same:

```python
# module level, computed once
_DUMMY_HASH = hash_password("timing-equaliser-not-a-real-password")

user = await db.fetchrow(...)
if user is None:
    verify_password(body.password, _DUMMY_HASH)   # burn the same CPU time
    raise HTTPException(401, "Invalid credentials")
```

The signup endpoint still returns `409 email already exists`, which by itself lets anyone check whether an email is registered. That's accepted by the spec and normal for sign-up flows; note it in `08_auth_and_roles.md`.

### b. Rate limiting (`app/rate_limit.py`, new)

A dependency-free in-memory limiter is enough for a single uvicorn process:

```python
import time
from collections import defaultdict, deque
from fastapi import HTTPException, Request

class SlidingWindowLimiter:
    def __init__(self, limit: int, window_s: int):
        self.limit, self.window = limit, window_s
        self.hits: dict[str, deque] = defaultdict(deque)

    def check(self, key: str) -> None:
        now = time.monotonic()
        q = self.hits[key]
        while q and now - q[0] > self.window:
            q.popleft()
        if len(q) >= self.limit:
            raise HTTPException(429, "Too many attempts. Try again later.",
                                headers={"Retry-After": str(self.window)})
        q.append(now)

login_limiter = SlidingWindowLimiter(limit=10, window_s=300)   # per IP+email
```

- In `login`, call `login_limiter.check(f"{client_ip}:{email}")` before the DB lookup. Apply a looser limiter to `/auth/signup` by IP.
- Behind nginx, the client IP arrives in `X-Forwarded-For`. Start uvicorn with `--proxy-headers --forwarded-allow-ips="*"` in `backend/Dockerfile` (the network is internal to compose) and use `request.client.host`.
- Limitation: per-process memory. If you ever run multiple workers, switch to `slowapi` with Redis. Document this.
- Frontend: `Login.jsx` should show the 429 message (it already uses `errorMessage()`; just verify).

### c. Case-insensitive emails

1. **Normalise on input.** Add a shared validator so every model lower-cases and trims emails:

   ```python
   from pydantic import AfterValidator
   from typing import Annotated
   NormEmail = Annotated[EmailStr, AfterValidator(lambda v: v.strip().lower())]
   ```

   Use it in `LoginRequest.email` (currently plain `str`), `SignupRequest`, `RegisterRequest`, `admin.UserCreate`, and `GuestBase.email`.

2. **Enforce in the DB.** In `02_constraints.sql`, replace the case-sensitive unique constraint:

   ```sql
   ALTER TABLE user_account DROP CONSTRAINT IF EXISTS uq_user_account_email;
   CREATE UNIQUE INDEX uq_user_account_email_ci ON user_account (LOWER(email));
   ```

   Seed emails are already lower-case. Existing dev databases: run `SELECT LOWER(email), COUNT(*) FROM user_account GROUP BY 1 HAVING COUNT(*) > 1;` and resolve any duplicates before applying.

3. **Query by `LOWER(email) = $1`** in login and in the "exists?" checks, so the new index is used.

### d + e. One password policy (`app/auth.py`)

```python
def validate_new_password(pw: str) -> str:
    if len(pw) < 8:
        raise ValueError("Password must be at least 8 characters")
    if len(pw.encode("utf-8")) > 72:
        raise ValueError("Password must be at most 72 bytes")
    return pw
```

- Apply it as a Pydantic `field_validator` on `SignupRequest.password`, `RegisterRequest.password` and `admin.UserCreate.password`. That gives 422 automatically and replaces the manual check in `signup`.
- Keep the `[:72]` slice in `hash_password` / `verify_password` only as a safety net. With the validator in place, nobody can set a longer password, so login with an overly long input simply fails.
- Optional: require at least one letter and one digit. Keep the frontend `Register.jsx` hint in sync.

## Tests to add

- Login timing: the median for an unknown email is within ~30% of a known email.
- 11 bad logins in a row → the 11th returns 429.
- Sign up `Kamal@mail.com` → 409. Log in as `KAMAL@MAIL.COM` → 200.
- Sign up with a 73-byte password → 422. Admin creates a user with `""` → 422.

## Acceptance criteria

- [x] Items a–e are fixed and covered by tests.
- [x] `docs/specs/08_auth_and_roles.md` documents the password policy, email normalisation and rate limits.

## Resolution (2026-10-12)

- **a. Timing:** `DUMMY_PASSWORD_HASH` in `app/auth.py`. Login always runs bcrypt, against the dummy hash when the email is unknown. Pre-fix the medians were 181 ms vs 1.4 ms; now they're within the test's 30%.
- **b. Rate limits:** `app/rate_limit.py` (`SlidingWindowLimiter`, as planned), with one change from the plan. **Only failed logins count** (10 per IP + email in 5 minutes, and a success clears the counter); counting every login would throttle staff and the test suite. Sign-up is limited to 10 per IP per hour.
  - `backend/Dockerfile` runs uvicorn with `--proxy-headers --forwarded-allow-ips=*`, so `request.client.host` is the real client behind nginx.
  - `Login.jsx` already shows non-401 errors via `errorMessage()`, so the 429 text appears.
  - The spec notes the per-process limitation, and that the published backend port `8000` shouldn't be public (the forwarded header is trusted).
  - Tests reset the limiters with an autouse fixture in `conftest.py`.
- **c. Case-insensitive emails:**
  - `NormEmail` (trim + lower + EmailStr, ≤ 100) in `app/schemas/fields.py` is used by `SignupRequest`, `RegisterRequest` (was plain `str`), `UserCreate` and `GuestEmail`. `LoginRequest` uses `LoginEmail` (trim + lower, no format check, so a typo is a 401).
  - `uq_user_account_email` was replaced with the unique index `uq_user_account_email_ci ON user_account (LOWER(email))`. Every lookup (login, signup, register, admin create) uses `LOWER(email) = $1`.
  - The seed emails are already lower-case, and a fresh build passes.
- **d + e. Password policy:** `validate_new_password` (8 characters to 72 bytes) through the `NewPassword` type on signup, register and admin create → 422. This replaces the manual check in `signup`.
  - Login also rejects input over 72 bytes, so a correct 72-byte prefix plus extra text gets 401 (the `[:72]` slice stays as a safety net).
  - No letter/digit rule (left optional).
  - Frontend: `passwordError()` in `utils/formatters.js` is used by `Register.jsx` (hint "8 to 72 characters") and `admin/UsersTab.jsx`.
- **Tests:** `tests/test_auth_hardening.py` (27 tests).
  - Covers timing, the 11th failure → 429 (also with the right password, other emails unaffected), success clearing the counter, successful logins never limited, the signup limit, case variants on signup/login/admin/DB, lower-case storage, the policy on all three endpoints (`""`, 7 characters, 73 bytes, 74 bytes of `é`), the accepted edges (8 characters, 72 bytes) and the long-input prefix.
  - The timing test passed 5 times in a row.
  - 20 fail on the pre-fix code; the 7 that pass are the accepted cases and the signup minimum length, which already existed.
  - `test_phase4_api_mock.py`'s stub now matches `WHERE LOWER(email)`.
- **Specs:** `08_auth_and_roles.md` (policy, normalisation, rate limits, the signup-409 note), `02_api_contract.md` (login/signup/register/admin users errors), `01_database_design.md`, `06_indexing_strategy.md`.
- ⏳ Browser check pending: Register with a long password; 11 bad logins on the Login page show the 429 message.
- **Dev DB:** an existing dev DB with mixed-case duplicates would block the new index. A rebuild from `run_all.sql` doesn't have any.
