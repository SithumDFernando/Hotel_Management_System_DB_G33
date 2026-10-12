# 02 — API Contract

> Base URL: `http://localhost:8000/api`
> Auth: JWT Bearer token in `Authorization` header
> Content-Type: `application/json`

---

## Conventions

- All IDs are UUID strings.
- Dates are `YYYY-MM-DD`, timestamps are ISO 8601.
- Pagination (`GET /bookings` only): `?page=1&per_page=20` (default 20, max 100).
- `401` without a valid token on any non-public endpoint; `403` when the role isn't allowed (see the matrix in `08_auth_and_roles.md`).
- Error responses: `{ "detail": "message" }` with appropriate HTTP status.
- A guest token whose account has no guest profile gets `403 This account has no guest profile. Contact the front desk.` on every guest-scoped endpoint.
- Branch scoping: managers and receptionists may only act on bookings and rooms of their own branch; guests only on their own bookings; admins on everything (see `08_auth_and_roles.md`). Every endpoint that takes a `booking_id` (path or body) or acts on a room checks existence first (`404`), then access (`403 Not authorised for bookings of another branch.` / `403 Guests can only access their own bookings.`).
- `422` validation errors (malformed UUID or date, unknown enum value, string longer than its DB column, number out of range) use FastAPI's list form: `{ "detail": [{ "loc": [...], "msg": "...", "type": "..." }] }`.
- Request limits mirror the DB columns (`VARCHAR(n)`, `NUMERIC(10,2)` → max `99999999.99` with 2 decimal places).
- Database errors never expose Postgres text. Unmapped DB errors return `500 { "detail": "Internal server error" }` and are logged server-side; constraint errors map to:

  | DB error | Status | `detail` |
  |---|---|---|
  | unique violation | 409 | A record with these details already exists. |
  | exclusion violation | 409 | Room is not available for the selected dates. |
  | foreign-key violation | 404 | A referenced record does not exist. |
  | check / not-null violation | 422 | The request violates a data rule. / A required field is missing. |
  | value too long / numeric overflow / other data error | 422 | A value is too long. / A numeric value is out of range. / Invalid input. |

---

## 1. Authentication — `/api/auth`

### POST `/api/auth/login`
> Public — no token required

**Request:**
```json
{
  "email": "reception@skynest.lk",
  "password": "secret123"
}
```

**Response (200):**
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "role": "receptionist",
  "branch_id": "uuid-...",
  "account_id": "uuid-..."
}
```

Email is matched case-insensitively (trimmed + lower-cased).

**Errors:** `401 Invalid credentials` (unknown email and wrong password look the same, timing included) · `429 Too many attempts. Try again later.` after 10 failed logins for one IP + email in 5 minutes (`Retry-After` header)

---

### POST `/api/auth/signup`
> Public — guest self-registration. Creates the guest profile and login account in one transaction; role is always `guest`.

**Request:**
```json
{
  "full_name": "John Silva",
  "nic_passport": "200012345678",
  "email": "john@mail.com",
  "phone": "+94771234567",
  "password": "min8chars",
  "date_of_birth": "2000-05-15",
  "nationality": "Sri Lankan"
}
```

**Response (201):** `{ "account_id": "uuid-...", "guest_id": "uuid-..." }`

**Errors:** `409` email already registered (case-insensitive) / NIC or passport already exists; `422` validation (invalid email, password under 8 characters or over 72 bytes); `429` more than 10 sign-ups from one IP in an hour.

---

### POST `/api/auth/register`
> Admin only — creates accounts with an explicit role. Anonymous or non-admin callers receive `403`
> (guests use `/api/auth/signup`).

**Request:**
```json
{
  "email": "new@skynest.lk",
  "password": "secret123",
  "role": "receptionist",
  "branch_id": "uuid-...",
  "guest_id": null
}
```

**Response (201):** `{ "account_id": "uuid-..." }`

**Errors:** `403` caller not admin · `400 Invalid role` · `422` password under 8 characters or over 72 bytes · `409` email exists (case-insensitive), or `This guest profile is already linked to another account.` · `404` referenced branch/guest doesn't exist · `422` invalid role ↔ link combination (same rules as `POST /api/admin/users`)

### GET `/api/auth/profile`
> Any signed-in user. Backs the `/profile` page.

**Response (200):**
```json
{
  "account_id": "uuid-...",
  "email": "kamal@mail.com",
  "role": "guest",
  "branch_id": null,
  "branch_name": null,
  "guest": { "guest_id": "uuid-...", "full_name": "Kamal Perera", "nic_passport": "200012345678", "email": "kamal@mail.com", "phone": "+94 77 123 4567", "date_of_birth": "2000-03-15", "nationality": "Sri Lankan", "gender": "Male", "guest_type": "Individual", "company_name": null, "company_reg_number": null, "billing_contact_name": null }
}
```
Staff accounts get `branch_name` (manager/receptionist) and `guest: null`.

**Errors:** `401` not signed in

### PATCH `/api/auth/profile`
> Guest only. Updates the caller's own guest profile; only fields sent (not null) change.

**Request:** any of `full_name` (2–150), `phone` (7–20), `date_of_birth`, `nationality` (≤50), `gender` (≤10)
```json
{ "phone": "+94 77 000 1111", "nationality": "Sri Lankan" }
```

**Response (200):** the updated guest (same shape as `guest` above)

**Errors:** `400 No fields provided for update.` · `403` staff caller, or a guest account with no guest profile · `422` invalid value, or any other field (`email` and `nic_passport` are changed by the front desk via `PUT /api/guests/:id`)

### POST `/api/auth/change-password`
> Any signed-in user changes their own password.

**Request:** `{ "current_password": "...", "new_password": "min8chars" }`

**Response (200):** `{ "detail": "Password changed." }`. Existing tokens stay valid until they expire.

**Errors:** `400 Current password is incorrect.` · `400 The new password must be different from the current one.` · `422` new password under 8 characters or over 72 bytes · `429 Too many attempts. Try again later.` after 5 wrong current passwords for one account in 15 minutes (`Retry-After` header)

---

## 1b. Branches (public) — `/api/branches`

### GET `/api/branches`
> Public — read-only directory for the Home / Rooms pages (the admin-only `/api/admin/branches` keeps stats and CRUD).

**Response (200):**
```json
{
  "branches": [
    { "branch_id": "uuid-...", "name": "SkyNest Colombo", "city": "Colombo",
      "address": "42 Galle Face Terrace, Colombo 03", "phone": "+94 11 234 5678" }
  ],
  "total": 3
}
```

---

## 2. Rooms — `/api/rooms`

### GET `/api/rooms`
> Public

**Query params:** `?branch_id=uuid&room_type=Suite&status=Available&check_in=2026-01-01&check_out=2026-01-05`

**Response (200):**
```json
{
  "rooms": [
    {
      "room_id": "uuid-...",
      "room_number": "101",
      "branch": { "branch_id": "uuid-...", "name": "Colombo", "city": "Colombo" },
      "room_type": { "room_type_id": "uuid-...", "type_name": "Suite", "capacity": 3 },
      "daily_rate": 25000.00,
      "status": "Available",
      "amenities": [
        { "amenity_name": "WiFi", "amenity_type": "Technology", "count": 1 }
      ]
    }
  ],
  "total": 5,
  "page": 1,
  "per_page": 20
}
```

`check_in` / `check_out` are `YYYY-MM-DD` dates; when both are given, rooms with an overlapping `Booked` or `Checked-In` booking are excluded.

**Errors:**
- `400` only one of `check_in` / `check_out` given, or `check_out <= check_in`
- `422` malformed date, or `status` not one of `Available`, `Occupied`, `Maintenance`

### GET `/api/rooms/:room_id`
> Public

**Response (200):** Single room object (same shape as above).

### PATCH `/api/rooms/:room_id/status`
> Manager, Admin

**Request:** `{ "status": "Maintenance" }` (`Available` | `Occupied` | `Maintenance`)

**Response (200):** `{ "room_id": "uuid-...", "status": "Maintenance" }`

`Maintenance` is set and cleared only here; check-in/checkout never change it. `Available` and `Occupied` must agree with the bookings (the room trigger keeps them in sync otherwise).

**Errors:** `403` manager of another branch · `404 Room not found` · `409 A guest is checked in to this room, so it can't be Available.` · `409 No guest is checked in to this room, so it can't be Occupied.` · `422` unknown status value

---

## 3. Guests — `/api/guests`

### GET `/api/guests`
> Receptionist, Manager, Admin

**Query params:** `?search=John` (searches name, NIC/passport, or email)

**Response (200):** Flat array of `GuestOut` objects:
```json
[
  {
    "guest_id": "uuid-...",
    "full_name": "John Silva",
    "nic_passport": "200012345678",
    "email": "john@mail.com",
    "phone": "+94771234567",
    "date_of_birth": "2000-05-15",
    "nationality": "Sri Lankan",
    "gender": "Male",
    "guest_type": "Individual",
    "company_name": null,
    "company_reg_number": null,
    "billing_contact_name": null
  }
]
```

### POST `/api/guests`
> Receptionist, Admin (managers get `403`)

**Request:**
```json
{
  "full_name": "John Silva",
  "nic_passport": "200012345678",
  "email": "john@mail.com",
  "phone": "+94771234567",
  "date_of_birth": "2000-05-15",
  "nationality": "Sri Lankan",
  "gender": "Male",
  "guest_type": "Individual",
  "company_name": null,
  "company_reg_number": null,
  "billing_contact_name": null
}
```

**Response (201):** Full `GuestOut` object:
```json
{
  "guest_id": "uuid-...",
  "full_name": "John Silva",
  "nic_passport": "200012345678",
  "email": "john@mail.com",
  "phone": "+94771234567",
  "date_of_birth": "2000-05-15",
  "nationality": "Sri Lankan",
  "gender": "Male",
  "guest_type": "Individual",
  "company_name": null,
  "company_reg_number": null,
  "billing_contact_name": null
}
```

**Errors:** `409 NIC/Passport or email already exists` · `422` field too long/short (`full_name` 2–150, `nic_passport` 4–20, `email` valid and ≤ 100, `phone` 7–20, `nationality` ≤ 50, `gender` ≤ 10, company fields ≤ 150 / reg. no. ≤ 50)

### GET `/api/guests/:guest_id`
> Receptionist, Manager, Admin, or the guest themselves

### PUT `/api/guests/:guest_id`
> Receptionist, Admin (managers get `403`)

---

## 4. Bookings — `/api/bookings`

### POST `/api/bookings`
> Receptionist, Manager, Admin, Guest (for themselves)

Calls `create_booking()` stored procedure at the default READ COMMITTED level. Overlaps are prevented by the room-row lock in `trg_double_booking` plus the exclusion constraint `excl_booking_room_overlap` (20 parallel requests → one 201, nineteen 409).

**Request:**
```json
{
  "guest_id": "uuid-...",
  "room_id": "uuid-...",
  "check_in_date": "2026-02-01",
  "check_out_date": "2026-02-05",
  "payment_option": "Credit Card"
}
```

**Response (201):** Full `BookingOut` object:
```json
{
  "booking_id": "uuid-...",
  "guest_id": "uuid-...",
  "room_id": "uuid-...",
  "check_in_date": "2026-02-01",
  "check_out_date": "2026-02-05",
  "rate_at_booking": 15000.00,
  "payment_option": "Credit Card",
  "status": "Booked",
  "actual_checkin_time": null,
  "actual_checkout_time": null,
  "created_at": "2026-01-15T08:00:00Z"
}
```

Business rules (enforced in `create_booking()`): check-in today or later; at most **30 nights**; the room must not be under Maintenance; `payment_option` is one of `Credit Card`, `Cash`, `Bank Transfer`.

**Errors:** `400 Check-in date cannot be in the past` · `400 Stays longer than 30 nights must be arranged with the front desk` · `403` room belongs to another branch (manager/receptionist) or guest booking for someone else · `404 Guest not found` / `404 Room not found` · `409 Room ... is already booked for the selected dates.` / `409 Room is not available for the selected dates.` (double booking) · `409 Room is under maintenance and cannot be booked` · `422` malformed IDs/dates, `payment_option` not one of the three values

### GET `/api/bookings`
> Receptionist (own branch), Manager (own branch), Admin (all), Guest (own bookings)

**Query params:** `?status=Booked&branch_id=uuid&guest_id=uuid&from=2026-01-01&to=2026-01-31`

**Response (200):**
```json
{
  "bookings": [
    {
      "booking_id": "uuid-...",
      "guest": { "guest_id": "uuid-...", "full_name": "John Silva" },
      "room": { "room_id": "uuid-...", "room_number": "101", "branch_name": "Colombo", "type_name": "Suite" },
      "check_in_date": "2026-02-01",
      "check_out_date": "2026-02-05",
      "rate_at_booking": 15000.00,
      "status": "Booked",
      "payment_option": "Credit Card"
    }
  ]
}
```

`from` / `to` are `YYYY-MM-DD` dates (`from` matches `check_out_date >= from`, `to` matches `check_in_date <= to`).

**Errors:**
- `400` `to` is before `from`
- `422` malformed date, or `status` not one of `Booked`, `Checked-In`, `Checked-Out`, `Cancelled`

### GET `/api/bookings/:booking_id`
> Receptionist (own branch), Manager (own branch), Admin, or owning Guest

**Errors:** `403` other branch / other guest · `404 Booking not found`

### PATCH `/api/bookings/:booking_id/cancel`
> Receptionist, Manager, Admin, Guest (own booking, if still 'Booked')

Calls `cancel_booking()` stored procedure (locks the booking, so a cancel racing a check-in can't cancel a guest who was just checked in). No request body.

**Response (200):** `{ "status": "Cancelled" }`

**Errors:** `400 Only Booked bookings can be cancelled (current status: Checked-In)` · `403` other branch / other guest · `404 Booking not found`

---

## 5. Check-In / Check-Out — `/api/bookings/:booking_id`

### PATCH `/api/bookings/:booking_id/checkin`
> Receptionist, Manager, Admin

Calls `perform_checkin()` stored procedure, which locks the booking row, so of several simultaneous check-ins exactly one succeeds. Check-in is only allowed from the arrival date (`check_in_date`) until the day before `check_out_date`; there is no early check-in.

**Response (200):**
```json
{
  "booking_id": "uuid-...",
  "status": "Checked-In",
  "actual_checkin_time": "2026-02-01T14:00:00Z"
}
```

**Errors:** `400 Only Booked bookings can be checked in` · `400 Check-in is not allowed before 2026-10-15` · `400 This booking's stay period has already ended` · `403` booking of another branch · `404 Booking not found` · `409 Room is under maintenance`

### PATCH `/api/bookings/:booking_id/checkout`
> Receptionist, Manager, Admin

Calls `perform_checkout()` stored procedure, which first recalculates the bill with `generate_bill(booking, NULL)` (creating it if none exists and keeping any existing discount), so services added since the last generate are billed. Fails with 402 if anything is still unpaid; the whole call rolls back, including the bill refresh. The `bill` block is always present and shows the recalculated totals.

**Response (200):**
```json
{
  "booking_id": "uuid-...",
  "status": "Checked-Out",
  "actual_checkout_time": "2026-02-05T11:00:00Z",
  "bill": {
    "total_amount": 68500.00,
    "amount_paid": 68500.00,
    "outstanding_balance": 0.00,
    "balance_flag": false
  }
}
```

**Errors:** `400 Only Checked-In bookings can be checked out` · `402 Outstanding balance of LKR 17250.00 — pay before checkout` (also when no bill was ever generated, since room charges are owed) · `403` booking of another branch · `404 Booking not found`

---

## 6. Services — `/api/services`

### GET `/api/services`
> Any signed-in role: Receptionist, Manager, Admin, Guest (anonymous → `401`)

**Response (200):** Array of service categories with their active services:
```json
[
  {
    "category": "Food & Beverage",
    "services": [
      {
        "service_id": "uuid-...",
        "service_name": "Room Service",
        "category": "Food & Beverage",
        "base_price": 1500.00,
        "is_active": true
      }
    ]
  }
]
```

### POST `/api/services`
> Admin, Manager

**Request:**
```json
{
  "service_name": "Airport Transfer",
  "category": "Transportation",
  "base_price": 5000.00
}
```

**Response (201):** `ServiceOut` object

### PATCH `/api/services/:service_id`
> Admin, Manager

**Request:**
```json
{
  "base_price": 5500.00,
  "is_active": true
}
```

**Response (200):** `ServiceOut` object

### POST `/api/services/:booking_id/usage`
> Receptionist, Manager, Admin

Records chargeable service order. Trigger checks that booking is 'Checked-In' and snapshots unit price.

**Request:**
```json
{
  "service_id": "uuid-...",
  "usage_date": "2026-02-03",
  "quantity": 2
}
```

**Response (201):**
```json
{
  "usage_id": "uuid-...",
  "service_id": "uuid-...",
  "service_name": "Room Service",
  "category": "Food & Beverage",
  "usage_date": "2026-02-03",
  "quantity": 2,
  "unit_price": 1500.00,
  "line_total": 3000.00
}
```

`usage_date` must fall inside the stay: from `check_in_date` to `check_out_date` inclusive, or up to today for a guest still in house after `check_out_date`.

**Errors:** `403` booking of another branch · `404` booking or active service not found · `422 Unprocessable Entity (Booking is not Checked-In)` · `422 Service date 2001-01-01 is outside the stay (2026-10-12 to 2026-10-15)` · `422` `quantity` outside 1–1000

### GET `/api/services/:booking_id/usage`
> Receptionist (own branch), Manager (own branch), Admin, owning Guest

**Errors:** `403` other branch / other guest · `404 Booking not found`

**Response (200):** Itemized usage summary:
```json
{
  "booking_id": "uuid-...",
  "usages": [
    {
      "usage_id": "uuid-...",
      "service_id": "uuid-...",
      "service_name": "Room Service",
      "category": "Food & Beverage",
      "usage_date": "2026-02-03",
      "quantity": 2,
      "unit_price": 1500.00,
      "line_total": 3000.00
    }
  ],
  "grand_total": 3000.00
}
```

---

## 7. Billing — `/api/billing`

### POST `/api/billing/:booking_id/generate`
> Receptionist, Manager, Admin

Calls `generate_bill()` stored procedure (with optional `?discount=0.00` query parameter, 0–99999999.99, 2 decimal places).

**Errors:** `403` booking of another branch · `404 Booking not found` · `400` booking not Checked-In/Checked-Out, discount larger than the subtotal, or `Bill total exceeds the maximum supported amount` · `422` invalid `discount`

**Response (200):** `BillOut` object:
```json
{
  "bill_id": "uuid-...",
  "booking_id": "uuid-...",
  "room_charges": 60000.00,
  "service_charges": 5500.00,
  "discount_amount": 0.00,
  "tax_amount": 9825.00,
  "total_amount": 75325.00,
  "amount_paid": 20000.00,
  "outstanding_balance": 55325.00,
  "balance_flag": true,
  "generated_at": "2026-02-05T10:30:00Z"
}
```

### GET `/api/billing/:booking_id`
> Receptionist, Manager, Admin, owning Guest

**Response (200):** `BillOut` object or `404 Bill not generated yet`.

**Errors:** `403` other branch / other guest · `404 Booking not found`

---

## 8. Payments — `/api/payments`

### POST `/api/payments`
> Receptionist, Manager, Admin

Calls `record_payment()` stored procedure, which returns the new `payment_id`; the response is that payment (not "the newest payment for the booking"), so concurrent payments each get their own back.

**Request:**
```json
{
  "booking_id": "uuid-...",
  "amount": 25000.00,
  "payment_method": "Credit Card",
  "notes": "Partial payment at check-in"
}
```

**Response (201):** Full `PaymentOut` object:
```json
{
  "payment_id": "uuid-...",
  "booking_id": "uuid-...",
  "amount": 25000.00,
  "payment_method": "Credit Card",
  "paid_at": "2026-02-01T15:00:00Z",
  "notes": "Partial payment at check-in"
}
```

`payment_method` is one of `Credit Card`, `Cash`, `Bank Transfer`.

**Errors:** `400 Amount exceeds outstanding balance or <= 0` · `403` booking of another branch · `404 Booking not found` · `422` `payment_method` not one of the three values

### GET `/api/payments/:booking_id`
> Receptionist, Manager, Admin, owning Guest

**Response (200):** Array of `PaymentOut` records ordered by `paid_at DESC`.

**Errors:** `403` other branch / other guest · `404 Booking not found`

---

## 9. Reports — `/api/reports`

> All report endpoints: Manager (own branch), Admin (all branches)

### GET `/api/reports/occupancy`
**Params:** `?branch_id=uuid&date=2026-02-01` or `?from_date=2026-02-01&to_date=2026-02-28` (`YYYY-MM-DD`)

**Errors:**
- `400` `to_date <= from_date`
- `422` malformed date

### GET `/api/reports/billing-summary`
**Params:** `?branch_id=uuid&unpaid_only=true`

### GET `/api/reports/service-usage`
**Params:** `?branch_id=uuid`

### GET `/api/reports/monthly-revenue`
**Params:** `?year=2026&month=2&branch_id=uuid`. `year` is required (2000–2100); `month` is optional (1–12, omit for the whole year). Missing or out-of-range → `422`.

### GET `/api/reports/top-services`
**Params:** `?limit=10&branch_id=uuid` (`limit` 1–100)

Managers always get their own branch, ranked within it (`v_top_services_by_branch`); `branch_id` is ignored for them. Admins get all branches combined (`v_top_services`), or one branch with `branch_id`.

> Detailed report views and schema columns are specified in `05_views_and_reports.md`.

---

## 10. Admin — `/api/admin`

> Admin only for all administration operations

### GET `/api/admin/branches`
Lists all branches with room counts and active booking statistics.

### POST `/api/admin/branches`
Creates a new branch.

### PUT `/api/admin/branches/:branch_id`
Updates branch name, address, phone, or email.

### GET `/api/admin/users`
Lists all staff and manager accounts with their roles and assigned branches.

### POST `/api/admin/users`
Creates a new user account with hashed password, assigned role, and branch.

**Role ↔ link rules** (validated on the resulting account; `422` with a string `detail` otherwise):

| `role` | `branch_id` | `guest_id` |
|---|---|---|
| `admin` | must be empty | must be empty |
| `manager` / `receptionist` | **required** | must be empty |
| `guest` | must be empty | **required** |

**Errors:** `400` invalid role · `404` branch/guest not found · `422` password under 8 characters or over 72 bytes, or invalid email · `409` email exists (case-insensitive), or `This guest profile is already linked to another account.` (one login per guest profile) · `422` invalid role ↔ link combination (e.g. `A manager account must be assigned to a branch.`)

### PATCH `/api/admin/users/:account_id`
Updates a user account's role and/or branch assignment:
```json
{
  "role": "manager",
  "branch_id": "uuid-..."
}
```

`branch_id: ""` clears the branch. The **resulting** role/branch/guest combination must follow the rules above, so clearing a receptionist's branch, or promoting a manager to admin without `"branch_id": ""`, is `422`. Guest accounts can't be turned into staff (they keep their `guest_id`).

**Errors:** `400` invalid role / no fields · `404` account or branch not found · `409 You cannot remove your own admin role.` · `422` invalid role ↔ link combination

> **Note on Deletion:** User deletion (`DELETE /api/admin/users/:account_id`) is omitted intentionally to preserve referential integrity, booking audits, and financial transaction histories.

