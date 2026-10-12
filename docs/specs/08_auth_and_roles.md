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
| `PATCH /rooms/:id/status` | ✓ | ✓² | — | — | — |
| `GET /guests` | ✓ | ✓⁵ | ✓⁵ | — | — |
| `POST /guests` | ✓ | ✓⁵ | ✓⁵ | — | — |
| `GET /guests/:id` | ✓ | ✓⁵ | ✓⁵ | own³ | — |
| `PUT /guests/:id` | ✓ | ✓⁵ | ✓⁵ | — | — |
| `POST /bookings` | ✓ | ✓² | ✓² | ✓⁴ | — |
| `GET /bookings` | ✓ | ✓² | ✓² | own³ | — |
| `GET /bookings/:id` | ✓ | ✓² | ✓² | own³ | — |
| `PATCH /bookings/:id/checkin` | ✓ | ✓² | ✓² | — | — |
| `PATCH /bookings/:id/checkout` | ✓ | ✓² | ✓² | — | — |
| `PATCH /bookings/:id/cancel` | ✓ | ✓² | ✓² | own³ | — |
| `POST /services/:bid/usage` | ✓ | ✓² | ✓² | — | — |
| `GET /services/:bid/usage` | ✓ | ✓² | ✓² | own³ | — |
| `GET /services` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `POST /billing/:bid/generate` | ✓ | ✓² | ✓² | — | — |
| `GET /billing/:bid` | ✓ | ✓² | ✓² | own³ | — |
| `POST /payments` | ✓ | ✓² | ✓² | — | — |
| `GET /payments/:bid` | ✓ | ✓² | ✓² | own³ | — |
| `GET /reports/*` | ✓ | ✓² | — | — | — |
| `GET /admin/*` | ✓ | — | — | — | — |
| `POST /admin/*` | ✓ | — | — | — | — |

**Legend:**
- ¹ Guest self-registration only (role forced to `guest`)
- ² Scoped to own `branch_id`: for a booking, the branch of its room; for `POST /bookings`, the branch of `room_id`. Another branch → `403`.
- ³ Own records only (matched by `guest_id` from JWT); another guest's → `403`
- ⁴ Can only book for self (any branch)
- ⁵ Hotel-wide: guest profiles are shared across branches (see §4.1)

### 4.1 Branch-scoping decisions

- **Existence before access.** A missing booking/room is `404` for everyone; an existing one in another branch is `403`. Staff can tell that an ID exists, but IDs are random UUIDs, so this leaks nothing useful.
- **Guest directory is global.** A guest can stay at any branch, and the front desk must find returning guests and book them, so `GET/POST/PUT /guests` and `GET /guests/:id` (including the guest's booking history across branches) are not branch-scoped for staff.
- **All reports are branch-scoped for managers**, including `top-services` (`v_top_services_by_branch`, ranked within the branch). The `branch_id` query param is ignored for managers.
- **Admins are global** on every endpoint above, including check-in/out, service usage, billing and payments.
- **Branch staff always have a branch.** `POST /admin/users`, `POST /auth/register` and `PATCH /admin/users/:id` reject a manager/receptionist without a branch (`422`), backed by the DB CHECK `chk_user_account_role_links`. If such an account exists anyway, it fails closed: every branch-scoped endpoint returns `403 Your account is not assigned to a branch.`, never all branches' data.
- **No self-demotion.** An admin can't remove their own admin role (`409`). Only admins can change roles, so this also keeps at least one admin.

---

---

## 5. Backend Implementation

### Dependencies (`dependencies.py`)

```python
# FastAPI dependency functions:

get_current_user(token)     → decodes JWT, returns user dict
require_role(*roles)        → dependency that checks user.role in roles
get_optional_user(token)    → returns user or None (for public endpoints)
require_branch(user)        → manager/receptionist: their branch_id (403 if none);
                              admin/guest: None. Used for every branch filter.
assert_role_links(role, branch_id, guest_id)
                            → 422 unless the account links fit the role
                              (create/patch/register)

# Resource guards, awaited inside the route handler:
assert_booking_access(db, user, booking_id)
    → 404 if missing; 403 if a guest doesn't own it or a manager/receptionist
      isn't in the booking's branch; returns (booking_id, guest_id, room_id,
      branch_id, status)
assert_room_access(db, user, room_id)
    → 404 if missing; 403 if a manager/receptionist isn't in the room's branch;
      returns (room_id, branch_id, status)
```

Every endpoint that acts on one booking or room calls these helpers; routers
contain no inline branch/ownership checks. List endpoints (`GET /bookings`,
reports) scope their `WHERE` clause by the user's branch instead.

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
