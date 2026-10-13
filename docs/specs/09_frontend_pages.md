# 09 — Frontend Pages

> React + Vite SPA. All pages use the shared `Navbar` component and are wrapped in `AuthContext`.

---

## Route Map

| Path | Page Component | Access | Description |
|------|---------------|--------|-------------|
| `/` | `Home` | Public | Availability search, the three hotels, room types (spec 11 §7.1) |
| `/rooms` | `RoomsBrowse` | Public | Browse available rooms with filters |
| `/login` | `Login` | Public | Login form |
| `/register` | `Register` | Public | Guest self-signup (`POST /api/auth/signup`), then auto sign-in |
| `/my-bookings` | `MyBookings` | Guest | Own bookings (upcoming / past / cancelled), cancel `Booked`, view bill + services, and a collapsed "Services during your stay" price list under Upcoming. A guest login with no linked guest profile sees a "contact the front desk" empty state instead (no API call). |
| `/profile` | `Profile` | Any signed-in role | Account details; guests edit contact details (`PATCH /api/auth/profile`); everyone changes their password (`POST /api/auth/change-password`). Email and NIC/passport are read-only. |
| `/booking/:roomId` | `BookingCheckout` | Guest, Receptionist, Manager | Booking form + summary |
| `/services/:bookingId` | `ServiceRequest` | Receptionist, Manager | Add services to a checked-in booking |
| `/dashboard/receptionist` | `ReceptionistDashboard` | Receptionist | Tabs (`?tab=`): **Today** (departures, arrivals and in-house task lists; check-in/out, payments), **Rooms** (status counts by type, room list), **Guests** (directory, profile, edit), **Services** (price list) |
| `/dashboard/manager` | `ManagerDashboard` | Manager | Overview, reports, rooms, service catalogue |
| `/dashboard/admin` | `AdminDashboard` | Admin | Overview, branches, accounts, reports, bookings, rooms, service catalogue |

---

## Page Specifications

### 1. `Home.jsx`

**Purpose:** Public landing page. Makes "check availability" the obvious first step (spec 11 §7.1; this replaced the hero banner, decision D1).

**Sections:**
- Opening: the name, one plain sentence (three hotels in Colombo, Kandy and Galle) and `StaySearch` (the page's only primary button, "Check availability" → `/rooms?city=&check_in=&check_out=&guests=`). One photo beside the text (below it on phones), never behind it.
- "Our hotels": three identical cards with photo, city, branch, address, `tel:` phone, "Rooms from LKR …" and "See rooms in {city}" → `/rooms?city=`.
- "Room types": Single, Double, Deluxe, Suite as a compact table (a list on phones) with capacity, from-rate and amenities as text, linking to `/rooms?type=`.
- No services section: the catalogue needs sign-in (decision D4).

**API calls:** `GET /api/branches` (public), `GET /api/rooms`

**Components used:** `Navbar`, `Footer`, `StaySearch`, `Photo`

---

### 2. `RoomsBrowse.jsx`

**Purpose:** Search and filter available rooms across branches.

**Features:**
- Filter panel: branch dropdown, room type, date range (check-in/out), capacity
- Room grid displaying `RoomCard` components
- Each card shows: room type, capacity, daily rate, amenities; "Available for your dates" once dates are picked
- "Book Now" button on each card → navigates to `/booking/:roomId`
- **Branch staff** (receptionist, manager) see only their own branch: the branch field is fixed text ("Staff book rooms in their own branch.") and every request carries `branch_id`, since `POST /bookings` refuses other branches anyway. With dates they also get a **Booked for these dates** section after the free rooms: the branch's rooms missing from the dated result, each with an outlined "Booked" chip and a disabled "Book this room" button reading "Booked for these dates". The summary counts both ("1 room free, 2 booked in Colombo, …"). Guests and visitors are unchanged: all branches, booked rooms hidden.
- Without dates the page is the catalogue: every room except `Maintenance`, headed "N rooms" with "Choose dates to check availability." `room.status` is tonight's occupancy, so it is **not** used to filter (an `Occupied` room is free on other dates). With dates the API's booking anti-join decides availability.

**API calls:** `GET /api/rooms` (no dates) or `GET /api/rooms?check_in=&check_out=` (Maintenance rooms are hidden client-side in both). Branch staff add `branch_id=` to both, and with dates also call `GET /api/rooms?branch_id=` to find the booked ones.

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
- Date pickers: check-in, check-out (check-in not in the past, at most 30 nights, same rules as `create_booking`)
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
- Header "Add services · {guest}, Room {n}" with type, stay, status and reference; back link to Today (Overview for managers)
- Catalogue grouped by category (underline tabs + search), each service with a quantity field (1–99) and "Add". Hidden, with an explanation, unless the booking is Checked-In
- "This stay" table (date, service, qty, amount) and "Services total" from the API; "Open bill" opens `BillPaymentModal`

**API calls:**
- `GET /api/services` — available services
- `GET /api/services/:bookingId/usage` — existing usage
- `POST /api/services/:bookingId/usage` — add service

**Components used:** `Navbar`

---

### 6. `ReceptionistDashboard.jsx`

**Purpose:** The receptionist's console. It lands on "Today": a task list, not a KPI wall (spec 11 §8).

**Tabs** (URL `?tab=`, underline `Tabs`): **Today** (default, no param), **Rooms**, **Guests**, **Services**. The header (`h1` = tab name, then the date on Today or one line of context on the others) keeps **Register guest** and **New booking** on every tab.

**Today layout:** `h1` "Today" + date, a `SummaryStrip` (arrivals today, in-house, departures due, rooms available), one search box that filters every list, and a ghost Refresh with "Updated HH:MM". Then three stacked task tables (row cards on phones): **Departures due**, **Arrivals today**, **Staying on** (in-house guests not due out, so nobody is listed twice). **Upcoming arrivals** sit in a collapsed section below. Each row has one visible action (Check in / Check out primary, Add service secondary); the rest are in a `RowMenu` (⋯). A blocked check-in shows its reason as text in the row.

**Sections:**

| Section | Content | API Call |
|---------|---------|---------|
| Today's Arrivals | Bookings with `check_in_date = today`, status `Booked` | `GET /bookings?status=Booked&from=today&to=today` |
| Current Guests | Bookings with status `Checked-In` | `GET /bookings?status=Checked-In` |
| Today's Departures | Checked-In bookings with `check_out_date <= today` (filtered client-side — the API has no `check_out` filter) | `GET /bookings?status=Checked-In` |
| Upcoming | Booked stays arriving after today | `GET /bookings?status=Booked` |
| Quick Actions | Check-in / Check-out / Cancel per booking. Check-in is disabled before the arrival date ("Arrives on …") and once the stay has ended. A 402 on check-out opens the payment window | `PATCH /bookings/:id/checkin`, `/checkout`, `/cancel` |
| Bill & Payment window | Recalculates the bill on open for in-house guests (`POST /billing/:bid/generate`, optional discount; a Checked-Out booking shows its final bill), shows charges + history, records payments | `POST /billing/:bid/generate`, `GET /payments/:bid`, `POST /payments` |
| New Booking | Link to `/rooms?mode=booking` | — |
| Guest Registration | Side drawer (`GuestFormDrawer`) | `POST /guests` |

Summary strip: arrivals, in-house, departures due, rooms available (`GET /rooms?status=Available`). There is no "balance due" figure because receptionists cannot call `/reports/*`, and the bookings list has no balance, so Departures always offer Check out (a 402 opens the payment window with "Balance due: LKR …. Take payment before checking out.").

**Rooms tab** (`RoomStatusBoard`): `SummaryStrip` (rooms, available tonight, occupied with % of rooms in service, maintenance); a **By room type** table (type, sleeps, Available / Occupied / Maintenance / Total, with an "All types" total row); then every room with status filter tabs (All / Available / Occupied / Maintenance, with counts): room, type, rate, status chip, and for occupied rooms the in-house guest and departure date. Stacked rows on phones. Uses `GET /rooms?branch_id=` (no dates, so status is tonight's occupancy) and `GET /bookings?status=Checked-In`; no `/reports/*` access is needed.

**Guests tab** (`GuestDirectory`): debounced search (name, NIC/passport, email) over `GET /guests?search=`, 15 per page. **Open profile** opens a drawer from `GET /guests/:id`: details, then the booking history (room, branch, dates, reference, status). **Edit details** opens `GuestFormDrawer` in edit mode (`PUT /guests/:id`, "Save changes", toast "Saved: {name}"); a 409 shows the server's duplicate message. Guest profiles are shared by all branches, so the list is not branch-scoped. Empty optional fields are left unchanged (the API ignores nulls).

**Services tab** (`ServicePriceList searchable`): active services by category with prices (`GET /services`), read-only. Services are still added from an in-house guest's row (`/services/:bookingId`).

**Components used:** `Navbar`, `Tabs`, `SummaryStrip`, `RowMenu`, `BillTable`, `BillPaymentModal`, `GuestFormDrawer`, `RoomStatusBoard`, `GuestDirectory`, `ServicePriceList`

---

### 7. `ManagerDashboard.jsx`

**Purpose:** Branch performance overview and reporting.

**Tabs/Sections:**

| Section | Content | API Call |
|---------|---------|---------|
| Branch Overview | Summary strip (rooms occupied today "2 of 4 (50%)", revenue and collected for the month, balance due with the bill count), 6-month stacked revenue chart, top services by quantity. No occupancy ring | `GET /reports/occupancy?date=today`, `/reports/monthly-revenue`, `/reports/billing-summary?unpaid_only=true`, `/reports/top-services` |
| Occupancy Report | Table/chart of room occupancy | `GET /reports/occupancy?from=&to=` |
| Revenue Report | Monthly revenue breakdown (room vs services) | `GET /reports/monthly-revenue?year=&month=` |
| Billing Summary | Guests with outstanding balances | `GET /reports/billing-summary` |
| Service Analytics | Top services, usage trends | `GET /reports/top-services`, `GET /reports/service-usage` |

Tabs (URL `?tab=`): **Overview** (summary strip, 6-month stacked revenue chart with a "Show as table" view, top services ranked by quantity, all time), **Reports** (all five reports via `ReportsPanel`; the open report is kept in `?report=`, and Billing summary rows have a **View bill** button that opens `BillPaymentModal` in place, for managers and admins), **Rooms** (maintenance toggle, `PATCH /rooms/:id/status`; clearing Maintenance on a room with a checked-in guest gets a 409 for `Available`, so the toggle sets it back to `Occupied`), **Service catalogue** (create / reprice / deactivate, `/services`).

**Components used:** `Navbar`, `ReportTable`, `ReportsPanel`, `BranchOverview`, `RoomManager`, `CatalogueManager`

**Visualization:** `recharts` (route is lazy-loaded). Revenue counts checked-out stays only. Top services are scoped like the other reports: managers see their own branch (ranked within it), admins see all branches or the selected one.

---

### 8. `AdminDashboard.jsx`

**Purpose:** System-wide management.

**Tabs/Sections:**

| Section | Content | API Call |
|---------|---------|---------|
| Branches | CRUD for branches | `GET/POST/PUT /admin/branches` |
| Accounts | List/filter staff and guest accounts, create staff accounts, change role + branch (no delete — see API contract). The tab is labelled "Accounts" because it includes guest logins | `GET/POST/PATCH /admin/users` |
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
| `BillTable` | `bill`, `payments`, `booking?` (labels the room line), `onTakePayment?` | BillPaymentModal, MyBookings |
| `BillPaymentModal` | `booking`, `onClose`, `onChanged`, `onCheckout?`, `notice?` (402 banner; focuses the amount) | ReceptionistDashboard, ServiceRequest, ReportsPanel |
| `GuestPicker` / `GuestFormDrawer` | `value`, `onChange` / `open`, `onClose`, `onCreated` | BookingCheckout, ReceptionistDashboard |
| `ReportTable` | `columns`, `data`, `title`, `toolbar`, `summary` (sort, search, paging, CSV) | ReportsPanel, BookingsTab |
| `ReportsPanel` | `branchId?`, `showBranch?` | ManagerDashboard, AdminDashboard |

Shared UI primitives (Button, Badge, Modal/Drawer, Toast, Tabs, Pagination, SummaryStrip, RowMenu, Logo, Field, States) live in `src/components/ui/`. Chart colours live in `src/lib/chartTheme.js`. Presentation rules are in `11_design_system.md`.

---

## Navbar Behavior by Role

| Role | Nav Items |
|------|-----------|
| Public (not logged in) | Home, Rooms, Sign in |
| Guest | Home, Rooms, My bookings, Profile, Sign out |
| Receptionist | Today, Rooms (`?tab=rooms`), Guests (`?tab=guests`), New booking, Profile, Sign out |
| Manager | Overview, Reports, Profile, Sign out |
| Admin | Overview, Branches, Accounts, Reports, Profile, Sign out |

Profile and Sign out are in the user menu (the email, top right) on desktop and in the menu on mobile. Receptionists and managers also see their branch city and address in the navbar. **Sign out** asks first ("Sign out of SkyNest?" with Stay signed in / Sign out), then shows a "Signed out: {email}" toast on Home. Automatic sign-out (token expired or rejected) does not ask.

A page that throws while rendering shows "This page couldn't be shown." with Reload page / Go to home page inside the layout, so the navbar stays usable.
