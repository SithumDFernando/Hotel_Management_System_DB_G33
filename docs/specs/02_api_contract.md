# 02 — API Contract

> Base URL: `http://localhost:8000/api`
> Auth: JWT Bearer token in `Authorization` header
> Content-Type: `application/json`

---

## Conventions

- All IDs are UUID strings.
- Dates are `YYYY-MM-DD`, timestamps are ISO 8601.
- Pagination: `?page=1&per_page=20` (default 20, max 100).
- Error responses: `{ "detail": "message" }` with appropriate HTTP status.

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

**Errors:** `401 Invalid credentials`

---

### POST `/api/auth/register`
> Admin only — creates staff accounts; OR public for guest self-registration

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

### GET `/api/rooms/:room_id`
> Public

**Response (200):** Single room object (same shape as above).

---

## 3. Guests — `/api/guests`

### GET `/api/guests`
> Receptionist, Manager, Admin

**Query params:** `?search=John&guest_type=Individual`

**Response (200):**
```json
{
  "guests": [
    {
      "guest_id": "uuid-...",
      "full_name": "John Silva",
      "nic_passport": "200012345678",
      "email": "john@mail.com",
      "phone": "+94771234567",
      "guest_type": "Individual"
    }
  ]
}
```

### POST `/api/guests`
> Receptionist, Manager, Admin

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

**Response (201):** `{ "guest_id": "uuid-..." }`

**Errors:** `409 NIC/Passport already exists`

### GET `/api/guests/:guest_id`
> Receptionist, Manager, Admin, or the guest themselves

### PUT `/api/guests/:guest_id`
> Receptionist, Manager, Admin

---

## 4. Bookings — `/api/bookings`

### POST `/api/bookings`
> Receptionist, Manager, Guest

Calls `create_booking()` stored procedure (SERIALIZABLE).

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

**Response (201):**
```json
{
  "booking_id": "uuid-...",
  "rate_at_booking": 15000.00,
  "status": "Booked"
}
```

**Errors:** `409 Room is not available for selected dates (double-booking)`

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
      "room": { "room_id": "uuid-...", "room_number": "101", "branch_name": "Colombo" },
      "check_in_date": "2026-02-01",
      "check_out_date": "2026-02-05",
      "rate_at_booking": 15000.00,
      "status": "Booked",
      "payment_option": "Credit Card"
    }
  ]
}
```

### GET `/api/bookings/:booking_id`
> Receptionist, Manager, Admin, or owning Guest

### PATCH `/api/bookings/:booking_id/cancel`
> Receptionist, Manager, Admin, Guest (own booking, if still 'Booked')

**Response (200):** `{ "status": "Cancelled" }`

---

## 5. Check-In / Check-Out — `/api/bookings/:booking_id`

### PATCH `/api/bookings/:booking_id/checkin`
> Receptionist, Manager

Calls `check_in()` stored procedure.

**Response (200):**
```json
{
  "booking_id": "uuid-...",
  "status": "Checked-In",
  "actual_checkin_time": "2026-02-01T14:00:00Z"
}
```

**Errors:** `400 Booking is not in 'Booked' status`

### PATCH `/api/bookings/:booking_id/checkout`
> Receptionist, Manager

Calls `check_out()` stored procedure. Fails if bill has outstanding balance.

**Response (200):**
```json
{
  "booking_id": "uuid-...",
  "status": "Checked-Out",
  "actual_checkout_time": "2026-02-05T11:00:00Z",
  "bill": { "total_amount": 68500.00, "amount_paid": 68500.00 }
}
```

**Errors:** `402 Outstanding balance of LKR 15,000.00 — payment required before checkout`

---

## 6. Services — `/api/services`

### GET `/api/services`
> Public

**Response (200):**
```json
{
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
```

### POST `/api/services/:booking_id/usage`
> Receptionist, Manager

**Request:**
```json
{
  "service_id": "uuid-...",
  "quantity": 2
}
```

**Response (201):**
```json
{
  "usage_id": "uuid-...",
  "unit_price": 1500.00,
  "usage_date": "2026-02-03"
}
```

**Errors:** `400 Booking is not Checked-In`, `400 Service is inactive`

### GET `/api/services/:booking_id/usage`
> Receptionist, Manager, owning Guest

**Response (200):** List of service usage records for the booking.

---

## 7. Billing — `/api/billing`

### POST `/api/billing/:booking_id/generate`
> Receptionist, Manager

Calls `calculate_bill()` stored procedure.

**Response (200):**
```json
{
  "bill_id": "uuid-...",
  "room_charges": 60000.00,
  "service_charges": 5500.00,
  "discount_amount": 0.00,
  "tax_amount": 9825.00,
  "total_amount": 75325.00,
  "amount_paid": 20000.00,
  "outstanding_balance": 55325.00,
  "balance_flag": true
}
```

### GET `/api/billing/:booking_id`
> Receptionist, Manager, owning Guest

**Response (200):** Bill object (same as above) or `404 Bill not generated yet`.

---

## 8. Payments — `/api/payments`

### POST `/api/payments`
> Receptionist, Manager

Calls `record_payment()` stored procedure.

**Request:**
```json
{
  "booking_id": "uuid-...",
  "amount": 25000.00,
  "payment_method": "Credit Card",
  "notes": "Partial payment at check-in"
}
```

**Response (201):**
```json
{
  "payment_id": "uuid-...",
  "remaining_balance": 30325.00
}
```

**Errors:** `400 Amount exceeds outstanding balance`

### GET `/api/payments/:booking_id`
> Receptionist, Manager, owning Guest

**Response (200):** List of payment records for the booking.

---

## 9. Reports — `/api/reports`

> All report endpoints: Manager (own branch), Admin (all branches)

### GET `/api/reports/occupancy`
**Params:** `?branch_id=uuid&date=2026-02-01` or `?from=2026-02-01&to=2026-02-28`

### GET `/api/reports/billing-summary`
**Params:** `?branch_id=uuid&from=2026-02-01&to=2026-02-28`

### GET `/api/reports/service-usage`
**Params:** `?branch_id=uuid&from=2026-02-01&to=2026-02-28`

### GET `/api/reports/monthly-revenue`
**Params:** `?branch_id=uuid&year=2026&month=2`

### GET `/api/reports/top-services`
**Params:** `?branch_id=uuid&limit=10&from=2026-01-01&to=2026-12-31`

> Response shapes are defined in `05_views_and_reports.md`.

---

## 10. Admin — `/api/admin`

### GET `/api/admin/branches`
> Admin only

### POST `/api/admin/branches`
> Admin only

### PUT `/api/admin/branches/:branch_id`
> Admin only

### GET `/api/admin/users`
> Admin only

### PATCH `/api/admin/users/:account_id/role`
> Admin only — change user role

### DELETE `/api/admin/users/:account_id`
> Admin only
