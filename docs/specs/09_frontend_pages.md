# 09 — Frontend Pages

> React + Vite SPA. All pages use the shared `Navbar` component and are wrapped in `AuthContext`.

---

## Route Map

| Path | Page Component | Access | Description |
|------|---------------|--------|-------------|
| `/` | `Home` | Public | Landing page, branch showcase, CTA to browse rooms |
| `/rooms` | `RoomsBrowse` | Public | Browse available rooms with filters |
| `/login` | `Login` | Public | Login form |
| `/register` | `Register` | Public | Guest self-signup (`POST /api/auth/signup`), then auto sign-in |
| `/my-bookings` | `MyBookings` | Guest | Own bookings (upcoming / past / cancelled), cancel `Booked`, view bill + services. A guest login with no linked guest profile sees a "contact the front desk" empty state instead (no API call). |
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
| Today's Departures | Checked-In bookings with `check_out_date <= today` (filtered client-side — the API has no `check_out` filter) | `GET /bookings?status=Checked-In` |
| Upcoming | Booked stays arriving after today | `GET /bookings?status=Booked` |
| Quick Actions | Check-in / Check-out / Cancel per booking; a 402 on check-out opens the payment window | `PATCH /bookings/:id/checkin`, `/checkout`, `/cancel` |
| Bill & Payment window | Recalculates the bill on open for in-house guests (`POST /billing/:bid/generate`, optional discount; a Checked-Out booking shows its final bill), shows charges + history, records payments | `POST /billing/:bid/generate`, `GET /payments/:bid`, `POST /payments` |
| New Booking | Link to `/rooms?mode=booking` | — |
| Guest Registration | Side drawer (`GuestFormDrawer`) | `POST /guests` |

KPI cards: arrivals, in-house, departures due, rooms available (`GET /rooms?status=Available`). There is no "outstanding balances" KPI because receptionists cannot call `/reports/*`.

**Components used:** `Navbar`, `BookingSummary`, `BillTable`, `BillPaymentModal`, `GuestFormDrawer`

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

Tabs (URL `?tab=`): **Overview** (KPIs, 6-month stacked revenue chart, top services), **Reports** (all five reports via `ReportsPanel`), **Rooms** (maintenance toggle, `PATCH /rooms/:id/status`; clearing Maintenance on a room with a checked-in guest gets a 409 for `Available`, so the toggle sets it back to `Occupied`), **Service catalogue** (create / reprice / deactivate, `/services`).

**Components used:** `Navbar`, `ReportTable`, `ReportsPanel`, `BranchOverview`, `RoomManager`, `CatalogueManager`

**Visualization:** `recharts` (route is lazy-loaded). Revenue counts checked-out stays only. Top services are scoped like the other reports: managers see their own branch (ranked within it), admins see all branches or the selected one.

---

### 8. `AdminDashboard.jsx`

**Purpose:** System-wide management.

**Tabs/Sections:**

| Section | Content | API Call |
|---------|---------|---------|
| Branches | CRUD for branches | `GET/POST/PUT /admin/branches` |
| Users | List/filter users, create staff accounts, change role + branch (no delete — see API contract) | `GET/POST/PATCH /admin/users` |
| System Reports | All 5 reports, all branches or one (`?branch=`) | `GET /reports/*` |
| All Bookings | Cross-branch booking search (branch, status, dates) | `GET /bookings` |
| Overview / Rooms / Service catalogue | Same components as the manager dashboard, optionally branch-scoped | — |

Tabs are selected with `?tab=` (`overview` default, `branches`, `users`, `reports`, `bookings`, `rooms`, `catalogue`), which the Navbar links use.

**Components used:** `Navbar`, `ReportTable`, `ReportsPanel`, `BranchOverview`, `RoomManager`, `CatalogueManager`, `admin/BranchesTab`, `admin/UsersTab`, `admin/BookingsTab`

---

## Shared Components

| Component | Props | Used By |
|-----------|-------|---------|
| `Navbar` | — (reads AuthContext) | All pages |
| `RoomCard` | `room` object | Home, RoomsBrowse |
| `BookingSummary` | `booking` object (list shape), `children` = actions | MyBookings |
| `BillTable` | `bill` object, `payments` array | BillPaymentModal, MyBookings |
| `BillPaymentModal` | `booking`, `onClose`, `onChanged`, `onCheckout?` | ReceptionistDashboard, ServiceRequest |
| `GuestPicker` / `GuestFormDrawer` | `value`, `onChange` / `open`, `onClose`, `onCreated` | BookingCheckout, ReceptionistDashboard |
| `ReportTable` | `columns`, `data`, `title`, `toolbar`, `summary` (sort, search, paging, CSV) | ReportsPanel, BookingsTab |
| `ReportsPanel` | `branchId?`, `showBranch?` | ManagerDashboard, AdminDashboard |

Shared UI primitives (Button, Badge, Modal/Drawer, Toast, Tabs, Pagination, StatCard, Field, States) live in `src/components/ui/`.

---

## Navbar Behavior by Role

| Role | Nav Items |
|------|-----------|
| Public (not logged in) | Home, Rooms, Login |
| Guest | Home, Rooms, My Bookings, Logout |
| Receptionist | Dashboard, Rooms, New Booking, Logout |
| Manager | Dashboard, Reports, Logout |
| Admin | Dashboard, Branches, Users, Reports, Logout |
