# ISSUE-13 — Low-priority hardening and housekeeping

| | |
|---|---|
| **Severity** | 🟡 Low (hardening, code quality, developer experience) |
| **Area** | Mixed |
| **Found** | 2026-10-12 audit |

Each item is small and independent. Tick them off one by one.

---

## 13.1 Discount after payment loses track of overpayment

**Problem:** a bill paid in full, then given a 20,000 LKR discount, ends with `amount_paid > total_amount` and `outstanding_balance = 0`. Nothing records that the hotel owes the guest money.

**Plan:**
- In `generate_bill` (`db/procedures/billing.sql`), reject a discount that would push the total below what has already been paid: `IF v_total < v_paid THEN RAISE EXCEPTION 'Discount would make the bill lower than the amount already paid (LKR %)', v_paid; END IF;` → 400.
- Alternatively, if refunds are in scope, add a `credit_balance` column (`GREATEST(v_paid - v_total, 0)`), show it in `BillTable.jsx`, and add it to `v_guest_billing_summary`.
- Add a test: pay in full, then discount → 400.

## 13.2 Guest profile validation

**Problem:** `POST /guests` accepted `full_name: ""`, `nic_passport: ""`, `phone: ""` and `email: "not-an-email"`. `guest.email` isn't unique, so the same person can get several profiles.

**Plan:**
- Field limits and `EmailStr` on `GuestBase` / `GuestUpdate`; see the table in ISSUE-07 §2.
- Decide whether guest email should be unique. If yes, add `CREATE UNIQUE INDEX uq_guest_email_ci ON guest (LOWER(email));` and map the error to 409 (the router already maps "unique" → 409).
- Normalise `nic_passport` (`strip().upper()`) so "p123" and "P123" don't create two guests.

## 13.3 nginx security headers and version disclosure

**Problem:** `:8080` sends no `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options` or `Referrer-Policy`, and reveals `Server: nginx/1.27.5`.

**Plan:** in `frontend/nginx.conf` (server block):

```nginx
server_tokens off;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self'; frame-ancestors 'none'" always;
```

- Check the CSP against `index.html` and `src/lib/media.js` (external image or font hosts) before enabling it, then load every page and watch the console for violations.
- `add_header` in a nested `location` (like `/assets/`) **replaces** the server-level headers. Repeat them there, or use an `include` snippet.
- Add HSTS only when served over HTTPS.

## 13.4 API docs and the backend port are public

**Problem:** `http://localhost:8000/docs` and `/openapi.json` are reachable, and the backend port is published directly even though nginx proxies `/api`.

**Plan:**
- Add `ENABLE_DOCS: bool = True` to `config.py`. In `main.py`, pass `docs_url="/docs" if settings.ENABLE_DOCS else None` (and the same for `redoc_url` and `openapi_url`). Set it to false for any non-local deployment.
- In `docker-compose.yml`, consider binding the backend to localhost only: `"127.0.0.1:${BACKEND_PORT:-8000}:8000"`. Do the same for Postgres (`127.0.0.1:${DB_PORT}:5432`) and pgAdmin.

## 13.5 Default `SECRET_KEY` fallback in docker-compose

**Problem:** `SECRET_KEY: ${SECRET_KEY:-dev_only_change_me_…}`. If someone deploys without setting it, anyone who has read the repo can forge admin tokens. (The audit confirmed your current stack does **not** use the default: a token forged with it was rejected.)

**Plan:**
- In `config.py`, add a validator that refuses to start when `SECRET_KEY` is shorter than 32 characters or starts with `dev_only_` while an `ENV=production` setting is on.
- Setup scripts (`scripts/docker/setup.*`) already create `.env`. Make them generate a random key (`python -c "import secrets;print(secrets.token_hex(32))"` / `openssl rand -hex 32`) when it's missing.

## 13.6 Slow room list (one query per room)

**Problem:** `list_rooms` runs one amenity query **per room** ([rooms.py:155](../../../backend/app/routers/rooms.py#L155)). That's fine for 12 rooms, but slow for 500.

**Plan:** fetch all amenities for the room types in the result in one query and group them in Python:

```python
type_ids = list({r["room_type_id"] for r in rows})
amen_rows = await db.fetch(
    """SELECT ra.room_type_id, a.amenity_name, a.amenity_type, ra.count
       FROM room_amenity ra JOIN amenity a ON a.amenity_id = ra.amenity_id
       WHERE ra.room_type_id = ANY($1::uuid[])
       ORDER BY a.amenity_type, a.amenity_name""",
    type_ids,
)
by_type = defaultdict(list)
for a in amen_rows:
    by_type[a["room_type_id"]].append(AmenityInfo(...))
```

## 13.7 Plaintext password in `backend/.env`

**Problem:** `backend/.env` contains a commented-out Postgres **superuser** password. The file is gitignored and not committed, but it's on disk, may be copied, and is likely reused.

**Plan:** remove the line, and rotate that password if it's used anywhere else. Never use the superuser from the app; the `skynest_user` role is the right one.

## 13.8 Port 5432 clash with a native PostgreSQL install

**Problem:** on this machine a native Windows PostgreSQL service and the Docker `db` container both listen on 5432. `localhost:5432` reaches the **native** server, so `backend/.env`-based scripts (`python tests/test_db_crud.py`, a local uvicorn) fail with "password authentication failed", or worse, run against the wrong database.

**Plan:**
- In `scripts/docker/setup.*`, detect a listener on 5432 before `compose up` (`netstat` / `Get-NetTCPConnection` / `lsof -i :5432`). If there is one, write `DB_PORT=5433` to `.env` and print a notice.
- Make `backend/.env.example` and `docs/SETUP.md` explain that the backend's `DATABASE_URL` port must match `DB_PORT` when running natively against the Docker DB.

## 13.9 Test suite doesn't run under `pytest`

**Problem:** `pytest backend/tests` collects `test_phase4.py`'s `async def test_*` functions and fails with "async def functions are not natively supported". CI runs the files as scripts, so CI passes, but a developer who types `pytest` sees 2 failures.

**Plan (pick one):**
- Add `pytest-asyncio` to a `requirements-dev.txt` plus `backend/pytest.ini` with `asyncio_mode = auto`, and convert the scripts' `main()` runners into real tests. **Recommended.** It also gives one consistent home for the regression tests the other issues add.
- Or rename the script-style helpers so pytest doesn't collect them (e.g. `check_db_views` instead of `test_db_views`), and add `pytest.ini` with `testpaths =` pointing at real tests only.

Update `.github/workflows/ci.yml` to run `pytest -q` against the CI database.

## 13.10 No frontend linting

**Problem:** `npm run lint` doesn't exist, so hooks-rule and unused-variable mistakes aren't caught (there's already an `eslint-disable` comment in `AuthContext.jsx`).

**Plan:** add `eslint`, `eslint-plugin-react`, `eslint-plugin-react-hooks` and a flat config (`eslint.config.js`); add `"lint": "eslint src"`; run it in the CI `frontend` job before `npm run build`.

## 13.11 Scope decisions to document (no code needed unless you decide otherwise)

- `GET /guests` returns **all** guests to any receptionist (cross-branch personal data). This is probably intentional for front-desk lookup. Record it in `08_auth_and_roles.md`, or require a search term (ISSUE-03 §3).
- `GET /reports/top-services` is global for managers (ISSUE-03 §3).
- The JWT is stored in `localStorage`. It's acceptable here because no XSS sinks were found (`dangerouslySetInnerHTML` is unused), but CSP (13.3) is the main mitigation. Moving to httpOnly cookies would also need CSRF protection; out of scope.
- `room.status` can be set manually to `Occupied` or `Available`, contradicting bookings (ISSUE-09 §3 suggests guarding it).

---

## Checklist

- [ ] 13.1 Discount vs. paid amount
- [ ] 13.2 Guest validation and uniqueness
- [ ] 13.3 nginx security headers
- [ ] 13.4 Docs and ports exposure
- [ ] 13.5 SECRET_KEY guard
- [ ] 13.6 Room list query count
- [ ] 13.7 Remove the password from `backend/.env`
- [ ] 13.8 Port-clash detection in setup scripts
- [x] 13.9 pytest configuration (done in TASKLIST task 3)
- [ ] 13.10 Frontend lint
- [ ] 13.11 Scope decisions documented in specs
