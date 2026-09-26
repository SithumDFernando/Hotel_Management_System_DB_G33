# 09 — Frontend Pages

> React + Vite SPA. All pages use the shared `Navbar` component and are wrapped in `AuthContext`.

---

## Route Map

| Path | Page Component | Access | Description |
|------|---------------|--------|-------------|
| `/` | `Home` | Public | Landing page, branch showcase, CTA to browse rooms |
| `/rooms` | `RoomsBrowse` | Public | Browse available rooms with filters |
| `/login` | `Login` | Public | Login form |
| `/booking/:roomId` | `BookingCheckout` | Guest, Receptionist, Manager | Booking form + summary |
| `/services/:bookingId` | `ServiceRequest` | Receptionist, Manager | Add services to a checked-in booking |
| `/dashboard/receptionist` | `ReceptionistDashboard` | Receptionist | Today's bookings, check-in/out, payments |
| `/dashboard/manager` | `ManagerDashboard` | Manager | Reports, branch overview |
| `/dashboard/admin` | `AdminDashboard` | Admin | User management, branch management, system reports |

---

## Page Specifications

### 1. `Home.jsx`

**Purpose:** Public landing page — first impression of SkyNest.

**Sections:**
- Hero banner with hotel imagery and tagline
- Branch cards (Colombo, Kandy, Galle) with quick info
- Room type highlights (Suite, Double, etc.) with amenities
- "Browse Rooms" CTA button → navigates to `/rooms`

**API calls:** `GET /api/rooms` (featured rooms), `GET /api/admin/branches` (branch info)

**Components used:** `Navbar`, `RoomCard`

---

### 2. `RoomsBrowse.jsx`

**Purpose:** Search and filter available rooms across branches.

**Features:**
- Filter panel: branch dropdown, room type, date range (check-in/out), capacity
- Room grid displaying `RoomCard` components
- Each card shows: room type, capacity, daily rate, amenities, availability badge
- "Book Now" button on each card → navigates to `/booking/:roomId`

**API calls:** `GET /api/rooms?branch_id=&room_type=&check_in=&check_out=&status=Available`

**Components used:** `Navbar`, `RoomCard`

---

### 3. `Login.jsx`

**Purpose:** Authentication form.

**Features:**
- Email + password inputs
- Error message display (invalid credentials)
- On success: store token via `AuthContext.login()`, redirect based on role:
  - `admin` → `/dashboard/admin`
  - `manager` → `/dashboard/manager`
  - `receptionist` → `/dashboard/receptionist`
  - `guest` → `/rooms`

**API calls:** `POST /api/auth/login`

**Components used:** `Navbar`

---

### 4. `BookingCheckout.jsx`

**Purpose:** Create a new booking for a selected room.

**Features:**
- Room details display (type, rate, amenities, branch)
- Guest selection (receptionist picks from list) or auto-filled (guest user)
- Date pickers: check-in, check-out
- Live cost calculator: `rate × nights` preview
- Payment method selector
- Booking confirmation summary → submit

**API calls:**
- `GET /api/rooms/:roomId` — room details
- `GET /api/guests` — guest dropdown (receptionist only)
- `POST /api/bookings` — create booking

**Components used:** `Navbar`, `BookingSummary`

---

### 5. `ServiceRequest.jsx`

**Purpose:** Add chargeable services to a checked-in booking.

**Features:**
- Booking info header (guest, room, dates)
- Service catalogue list with "Add" button and quantity input
- Current service usage table for this booking
- Running total display

**API calls:**
- `GET /api/services` — available services
- `GET /api/services/:bookingId/usage` — existing usage
- `POST /api/services/:bookingId/usage` — add service

**Components used:** `Navbar`

---

### 6. `ReceptionistDashboard.jsx`

**Purpose:** Daily operations hub for front desk staff.

**Tabs/Sections:**

| Section | Content | API Call |
|---------|---------|---------|
| Today's Arrivals | Bookings with `check_in_date = today`, status `Booked` | `GET /bookings?status=Booked&from=today&to=today` |
| Current Guests | Bookings with status `Checked-In` | `GET /bookings?status=Checked-In` |
| Today's Departures | Bookings with `check_out_date = today` | `GET /bookings?check_out=today` |
| Quick Actions | Check-in / Check-out buttons per booking | `PATCH /bookings/:id/checkin`, `PATCH /bookings/:id/checkout` |
| Generate Bill | Button per checked-in booking | `POST /billing/:bid/generate` |
| Record Payment | Payment form (amount, method) | `POST /payments` |
| New Booking | Link to `/rooms` | — |
| Guest Registration | Inline form or link | `POST /guests` |

**Components used:** `Navbar`, `BookingSummary`, `BillTable`

---

### 7. `ManagerDashboard.jsx`

**Purpose:** Branch performance overview and reporting.

**Tabs/Sections:**

| Section | Content | API Call |
|---------|---------|---------|
| Branch Overview | Room count, occupancy %, today's revenue | `GET /reports/occupancy?date=today` |
| Occupancy Report | Table/chart of room occupancy | `GET /reports/occupancy?from=&to=` |
| Revenue Report | Monthly revenue breakdown (room vs services) | `GET /reports/monthly-revenue?year=&month=` |
| Billing Summary | Guests with outstanding balances | `GET /reports/billing-summary` |
| Service Analytics | Top services, usage trends | `GET /reports/top-services`, `GET /reports/service-usage` |

**Components used:** `Navbar`, `ReportTable`

**Visualization:** Simple bar/line charts for revenue trends (optional: use a lightweight chart library like `recharts`).

---

### 8. `AdminDashboard.jsx`

**Purpose:** System-wide management.

**Tabs/Sections:**

| Section | Content | API Call |
|---------|---------|---------|
| Branches | CRUD for branches | `GET/POST/PUT /admin/branches` |
| Users | List all users, change roles, create staff accounts | `GET/POST/PATCH/DELETE /admin/users` |
| System Reports | All 5 reports, unscoped (all branches) | `GET /reports/*` |
| All Bookings | Cross-branch booking search | `GET /bookings` |

**Components used:** `Navbar`, `ReportTable`

---

## Shared Components

| Component | Props | Used By |
|-----------|-------|---------|
| `Navbar` | — (reads AuthContext) | All pages |
| `RoomCard` | `room` object | Home, RoomsBrowse |
| `BookingSummary` | `booking` object | BookingCheckout, ReceptionistDashboard |
| `BillTable` | `bill` object, `payments` array | ReceptionistDashboard, ManagerDashboard |
| `ReportTable` | `columns`, `data`, `title` | ManagerDashboard, AdminDashboard |

---

## Navbar Behavior by Role

| Role | Nav Items |
|------|-----------|
| Public (not logged in) | Home, Rooms, Login |
| Guest | Home, Rooms, My Bookings, Logout |
| Receptionist | Dashboard, Rooms, New Booking, Logout |
| Manager | Dashboard, Reports, Logout |
| Admin | Dashboard, Branches, Users, Reports, Logout |
