# 08 — Authentication & Roles

> JWT-based authentication with role-based access control (RBAC).

---

## 1. Roles

| Role | Scope | Description |
|------|-------|-------------|
| `admin` | Global | Full system access. Manages branches, users, sees all reports. |
| `manager` | Branch | Manages their branch. Views reports scoped to their branch. |
| `receptionist` | Branch | Handles bookings, check-in/out, services, payments for their branch. |
| `guest` | Self | Views own bookings, bills, can browse rooms and book. |

---

## 2. Authentication Flow

### Login

```
Client                          Server
  │                               │
  ├── POST /api/auth/login ──────►│
  │   { email, password }         │
  │                               ├── Find user_account by email
  │                               ├── bcrypt.verify(password, hash)
  │                               ├── Generate JWT { account_id, role, branch_id, exp }
  │◄── 200 { access_token, ... } ─┤
  │                               │
  ├── GET /api/bookings ─────────►│  (Authorization: Bearer <token>)
  │                               ├── Decode & verify JWT
  │                               ├── Check role has access to endpoint
  │                               ├── Scope data by branch_id if role != admin
  │◄── 200 { bookings: [...] } ──┤
```

### JWT Payload

```json
{
  "sub": "account-uuid",
  "role": "receptionist",
  "branch_id": "branch-uuid",
  "guest_id": null,
  "exp": 1740000000
}
```

- `sub` — account_id (subject)
- `branch_id` — NULL for admin and guest roles
- `guest_id` — set only for guest role (links to guest table)
- `exp` — token expiry (24 hours from issue)

### Password Hashing

- Algorithm: **bcrypt** with 12 salt rounds
- Library: `passlib[bcrypt]` (Python backend)
- Passwords are never stored in plain text

---

## 3. Token Configuration

| Setting | Value |
|---------|-------|
| Algorithm | HS256 |
| Secret | `JWT_SECRET` env var (min 32 chars) |
| Expiry | 24 hours |
| Storage (client) | `localStorage` under key `skynest_token` |
| Header | `Authorization: Bearer <token>` |

---

## 4. Endpoint Access Matrix

| Endpoint | admin | manager | receptionist | guest | public |
|----------|:-----:|:-------:|:------------:|:-----:|:------:|
| `POST /auth/login` | — | — | — | — | ✓ |
| `POST /auth/register` | ✓ | — | — | ✓¹ | — |
| `GET /rooms` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `GET /rooms/:id` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `GET /guests` | ✓ | ✓² | ✓² | — | — |
| `POST /guests` | ✓ | ✓² | ✓² | — | — |
| `GET /guests/:id` | ✓ | ✓² | ✓² | own³ | — |
| `PUT /guests/:id` | ✓ | ✓² | ✓² | — | — |
| `POST /bookings` | ✓ | ✓² | ✓² | ✓⁴ | — |
| `GET /bookings` | ✓ | ✓² | ✓² | own³ | — |
| `PATCH /bookings/:id/checkin` | — | ✓² | ✓² | — | — |
| `PATCH /bookings/:id/checkout` | — | ✓² | ✓² | — | — |
| `PATCH /bookings/:id/cancel` | ✓ | ✓² | ✓² | own³ | — |
| `POST /services/:bid/usage` | — | ✓² | ✓² | — | — |
| `GET /services` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `POST /billing/:bid/generate` | — | ✓² | ✓² | — | — |
| `GET /billing/:bid` | ✓ | ✓² | ✓² | own³ | — |
| `POST /payments` | — | ✓² | ✓² | — | — |
| `GET /payments/:bid` | ✓ | ✓² | ✓² | own³ | — |
| `GET /reports/*` | ✓ | ✓² | — | — | — |
| `GET /admin/*` | ✓ | — | — | — | — |
| `POST /admin/*` | ✓ | — | — | — | — |

**Legend:**
- ¹ Guest self-registration only (role forced to `guest`)
- ² Scoped to own `branch_id`
- ³ Own records only (matched by `guest_id` from JWT)
- ⁴ Can only book for self

---

## 5. Backend Implementation

### Dependencies (`dependencies.py`)

```python
# FastAPI dependency functions:

get_current_user(token)     → decodes JWT, returns user dict
require_role(*roles)        → dependency that checks user.role in roles
require_branch_access()     → ensures user can only access own branch data
get_optional_user(token)    → returns user or None (for public endpoints)
```

### Middleware Flow

```
Request → Extract token → Decode JWT → Attach user to request.state
                                      → Role check via dependency
                                      → Branch scoping in query
```

---

## 6. Frontend Auth Context

### `AuthContext.jsx`

```
State:
  - token: string | null
  - user: { account_id, role, branch_id, guest_id } | null
  - isAuthenticated: boolean

Methods:
  - login(email, password) → calls API, stores token in localStorage
  - logout() → clears token from localStorage and state
  - getToken() → returns current token for API calls

Auto:
  - On mount: check localStorage for existing token, decode & validate expiry
  - If expired: auto-logout
```

### `ProtectedRoute.jsx`

```
Props: allowedRoles: string[]

Logic:
  - If not authenticated → redirect to /login
  - If role not in allowedRoles → redirect to / (or 403 page)
  - Else → render children
```
