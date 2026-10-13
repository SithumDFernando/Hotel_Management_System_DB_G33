# SkyNest manual testing guide

A click-by-click test script for the whole frontend, grouped by the account you sign in with. Each test lists the steps and what you should see. Record results in the log at the end (§9).

**Scope:** every page in [spec 09](../../specs/09_frontend_pages.md) for the public site, the guest, the receptionist, the manager and the admin, plus checks that apply to every page (role redirects, sessions, mobile, keyboard). Expected copy is quoted word for word from the frontend, including curly apostrophes (’).

**Test IDs:** `SET` setup · `PUB` signed out · `GST` guest · `REC` receptionist · `MGR` manager · `ADM` admin · `X` all pages · `KI` known issue.

**Notation:**
- **D** is the day the database was built (see §1). `D+2` is two days later.
- Dates show in the UI as `dd/mm` or `dd/mm/yyyy`.
- Money shows as `LKR 31,625.00`.
- "Toast" is the small message in the bottom-right corner.
- `→` means "then".

---

## Contents

1. [Before you start](#1-before-you-start)
2. [Accounts](#2-accounts)
3. [Test data](#3-test-data)
4. [Signed out (PUB)](#4-signed-out-pub)
5. [Guest (GST)](#5-guest-gst)
6. [Receptionist (REC)](#6-receptionist-rec)
7. [Manager (MGR)](#7-manager-mgr)
8. [Admin (ADM)](#8-admin-adm)
9. [All roles (X)](#9-all-roles-x)
10. [Known issues (KI)](#10-known-issues-ki)
11. [Results log](#11-results-log)

---

## 1. Before you start

Most tests change data, such as checking a guest in or taking a payment. **Every expected value assumes a fresh build.** Rebuild (SET-01) before each of sections 5, 6, 7 and 8. Within a section, run the tests in order: some build on the one before (for example, REC-23 to REC-30 work through one checkout).

| ID | Steps | Expected |
|---|---|---|
| SET-01 | Rebuild the database **on the day you test, after 05:30 Sri Lanka time**: `docker compose down -v` → `docker compose up --build` | The containers start. The backend log has no `DATABASE SCHEMA IS OUT OF DATE` block. |
| SET-02 | Open http://localhost:8000/api/health | `200` with status ok. A `503` means the schema is stale: repeat SET-01. |
| SET-03 | Check the database date: `docker compose exec db psql -U skynest_user -d skynest -c "SELECT CURRENT_DATE"` | It matches today's date on your computer. If it is a day behind, the build ran before 05:30 local time (the database clock is UTC): rebuild. Everything in this guide assumes the two dates match. |
| SET-04 | Open the frontend: http://localhost:8080 (Docker) or http://localhost:5173 (`npx vite --port 5173` in `frontend/`) | The Home page loads. |
| SET-05 | Use a desktop window about 1280 px wide unless the test says otherwise. Keep the browser dev tools open on the Console tab. | No red console errors during any test. Log any you see. |

**Rate limits:**
- 10 failed sign-ins per email in 5 minutes returns "Too many sign-in attempts…".
- 5 wrong current passwords in 15 minutes is also blocked.
- To clear either, restart the backend: `docker compose restart backend`.

---

## 2. Accounts

Every account uses the password **`SkyNest@2026`**. The scenario column tells you which tests each account is for.

| Email | Role | Branch | Scenario | Used in |
|---|---|---|---|---|
| admin@skynest.lk | Admin | all | Main admin | ADM |
| admin.ops@skynest.lk | Admin | all | Second admin: edit another admin's access | ADM-30s |
| mgr.colombo@skynest.lk | Manager | Colombo | Main manager | MGR |
| mgr.kandy@skynest.lk | Manager | Kandy | Branch scoping, Lanka Exports partial bill | MGR-50s |
| mgr.galle@skynest.lk | Manager | Galle | Branch scoping, a tie in top services | MGR-50s |
| rec.colombo@skynest.lk | Receptionist | Colombo | Main front desk | REC |
| rec2.colombo@skynest.lk | Receptionist | Colombo | Second desk, same branch: sees the same lists | REC-60s |
| rec.kandy@skynest.lk | Receptionist | Kandy | Branch scoping | REC-60s |
| rec.galle@skynest.lk | Receptionist | Galle | Branch scoping | REC-60s |
| kamal@mail.com | Guest | — | All three tabs: in house (unpaid), upcoming, past, cancelled | GST-10s |
| nimali@mail.com | Guest | — | Upcoming, 3 past stays, cancelled | GST-20s |
| ruwan@mail.com | Guest | — | Arrives today (Booked) | GST-30s |
| kasun@mail.com | Guest | — | Arrival was yesterday, not checked in yet | GST-30s |
| sanduni@mail.com | Guest | — | In house, departs today, nothing paid | GST-40s |
| dilan@mail.com | Guest | — | In house, departs today, paid in full; one past stay | GST-40s |
| tharindu@mail.com | Guest | — | Staying on; discount; part paid; one past stay | GST-40s |
| travel@ceylontea.lk | Guest (corporate) | — | Corporate guest, Galle, part paid; past stay with a discount | GST-40s |
| ishara@mail.com | Guest | — | No bookings at all | GST-50s |

**Guests with no login**, used in staff tests:
- John Smith, Anoma Bandara, Lanka Exports Ltd and Priya Rajapakse, from the original seed.
- Nadeesha Karunaratne and Kevin Lee: walk-ins with no bookings.
- The front-desk guests named in §3.

---

## 3. Test data

All of this comes from the demo part of `db/seed/sample_data.sql`; the full detail is in [spec 07, Demo data](../../specs/07_seed_data.md#demo-data-part-2-of-sample_datasql). The same set of cases exists at each branch. A booking's reference in the UI is `SN-7XYY0000`, where **X** is the branch (1 Colombo, 2 Kandy, 3 Galle) and **YY** is the case code.

| Case | YY | Dates | Status | Bill | Colombo | Kandy | Galle |
|---|---|---|---|---|---|---|---|
| A arrives today | 01 | D → D+2 | Booked | none | Ruwan, 106 | Nuwan Dissanayake, 206 | Gayan Weerasinghe, 306 |
| B overdue arrival | 02 | D−1 → D+2 | Booked | none | Kasun, 107 | Hiruni Ekanayake, 207 | Dinithi Abeysekara, 307 |
| C stay ended, never arrived | 03 | D−3 → D−1 | Booked | none | Chathuri Peiris, 106 | Pradeep Kumara, 206 | Sunil Rathnayake, 306 |
| E upcoming | 05 | D+5 → D+8 | Booked | none | Ahmed Rizvi, 108 | John Smith, 208 | Yuki Tanaka, 308 |
| F departs today, owes everything | 06 | D−2 → D | Checked in | unpaid | Sanduni, 108 | Emma Brown, 208 | Madushani Perera, 308 |
| G departs today, paid | 07 | D−2 → D | Checked in | paid | Dilan, 109 | Ravi Shankar, 209 | Oliver Grant, 309 |
| H overdue checkout | 08 | D−4 → D−1 | Checked in | part paid | Malith Rodrigo, 105 | Lakmal Bandara, 205 | Asela Mendis, 305 |
| I staying on | 09 | D−1 → D+3 | Checked in | discount, part paid | Tharindu, 110 | Lanka Exports Ltd, 210 | Ceylon Tea Traders, 310 |
| K holds a Double | 10 | D+10 → D+14 | Booked | none | Sarah Williams, 107 | Tomas Muller, 207 | Shanika Fernando, 307 |
| X cancelled | 11 | D+10 → D+12 | Cancelled | none | Nimali, 111 | Kamal, 206 | Priya, 306 |
| U upcoming | 12 | — | Booked | none | — | Nimali, 210, D+12 → D+14 | Kamal, 306, D+20 → D+22 |

The original seed also has these bookings, with **fixed dates**:
- **BK-01:** Kamal, room 101 Colombo, 27/09 → 01/10/2026. Checked in, so it shows as an overdue checkout. Bill LKR 79,350, unpaid.
- **BK-03:** John Smith, room 203 Kandy, 10/10 → 17/10/2026. Booked.
- **BK-06:** Kamal, room 302 Galle, 05/10 → 07/10/2026. Booked, but the stay has already ended.

All seven original seed bookings show the same reference, `SN-30000000` (see KI-15).

**Bills.** The figures are the same whichever day you build.

| Case | Colombo | Kandy | Galle |
|---|---|---|---|
| F total / paid / due | 31,625 / 0 / 31,625 | 27,025 / 0 / 27,025 | 23,575 / 0 / 23,575 |
| G total / paid / due | 40,250 / 40,250 / 0 | 33,350 / 33,350 / 0 | 28,750 / 28,750 / 0 |
| H total / paid / due | 20,125 / 10,000 / 10,125 | 16,675 / 10,000 / 6,675 | 14,950 / 10,000 / 4,950 |
| I total / paid / due (discount 2,000) | 25,875 / 5,000 / 20,875 | 21,275 / 5,000 / 16,275 | 18,975 / 5,000 / 13,975 |

**Colombo bill detail**, as shown in the bill window:
- **F, Sanduni, Deluxe 108, 2 nights:**
  - Room 24,000.00
  - Services 3,500.00 (Room Service × 2, Laundry × 1)
  - Tax (15%) 4,125.00
  - Total 31,625.00
- **G, Dilan, Suite 109, 2 nights:**
  - Room 30,000.00
  - Services 5,000.00 (Spa Treatment)
  - Tax 5,250.00
  - Total 40,250.00
  - Paid 40,250.00
- **H, Malith, Single 105, 3 nights:**
  - Room 15,000.00
  - Services 2,500.00 (Minibar Restock)
  - Tax 2,625.00
  - Total 20,125.00
  - Paid 10,000.00 (Cash, "Part payment at check-in")
- **I, Tharindu, Single 110, 4 nights:**
  - Room 20,000.00
  - Services 4,500.00 (Room Service, Airport Transfer)
  - Discount 2,000.00
  - Tax 3,375.00
  - Total 25,875.00
  - Paid 5,000.00 (Bank Transfer, "Deposit")

**Room states right after the build:**

| Branch | Available | Occupied | Maintenance |
|---|---|---|---|
| Colombo (11 rooms) | 102, 103, 106, 107, 111 | 101, 105, 108, 109, 110 | 104 |
| Kandy (11 rooms) | 201, 202, 203, 204, 206, 207 | 205, 208, 209, 210 | 211 |
| Galle (11 rooms) | 301, 302, 303, 304, 306, 307 | 305, 308, 309, 310 | 311 |

**Revenue:**
- Every branch has one checked-out stay on day 10–13 of each of the last 5 months, plus one checked out on D−6.
- The month chart therefore has 6 bars per branch.
- "Revenue, <this month>" is the D−6 stay: Colombo LKR 18,400.00, Kandy LKR 17,250.00, Galle LKR 17,825.00 (LKR 53,475.00 for all branches). If D−6 falls in last month, this month is LKR 0.00 and those amounts move to last month's bar.
- September 2026 also includes the fixed seed's checked-out stays (BK-02, BK-05 and BK-07).

---

## 4. Signed out (PUB)

Use a private window, or sign out first.

### Home

| ID | Steps | Expected |
|---|---|---|
| PUB-01 | Open `/` | h1 "SkyNest Hotels". Tab title "SkyNest Hotels". Navbar: "Home", "Rooms" and a "Sign in" button. The footer shows Colombo, Kandy and Galle with an address and phone for each, a "Staff sign-in" link and "© 2026 SkyNest Hotels". |
| PUB-02 | Look at the search form | Branch "All branches". Check-in = today, Check-out = today + 2, Guests "2 guests". |
| PUB-03 | Set Check-in to a date after the current Check-out | Check-out moves automatically to Check-in + 1. |
| PUB-04 | Branch "Kandy · SkyNest Kandy" → **Check availability** | You go to `/rooms?city=Kandy&check_in=…&check_out=…&guests=2`. |
| PUB-05 | Back to `/`, scroll to "Our hotels" | 3 hotel cards, each with "Rooms from LKR …" and "See rooms in {city}". Colombo shows "Rooms from LKR 5,000.00". |
| PUB-06 | Click **See rooms in Galle** | `/rooms?city=Galle`. Only Galle rooms are listed. |
| PUB-07 | Back to `/`, scroll to "Room types" | A table: Single sleeps 1, Double 2, Suite 4, Deluxe 2. Amenities read like "a, b, c, d and N more". Clicking **Suite** opens `/rooms?type=Suite`. |
| PUB-08 | Click the footer phone link for Colombo | The browser offers to call `tel:+94 11 234 5678`. |

### Rooms

| ID | Steps | Expected |
|---|---|---|
| PUB-10 | Open `/rooms` | h1 "Rooms". "All rooms. Choose dates to see which are free." The list shows **30 rooms**, sorted "Recommended". Rooms 104, 211 and 311 (Maintenance) are hidden. |
| PUB-11 | Set only Check-in | Info: "Pick both check-in and check-out to see which rooms are free on your dates." |
| PUB-12 | Set Check-in = today, Check-out = today + 2 | "20 rooms free, dd/mm–dd/mm (2 nights)". Each card has the badge "Free for your dates" and "LKR … for 2 nights, before tax". Rooms 106, 107, 110 and the Kandy/Galle x06, x07 and x10 rooms are **not** listed. 101 and 105 **are** listed: see KI-14. |
| PUB-13 | With those dates, set Branch Colombo | "7 rooms free in Colombo, …": 101, 102, 103, 105, 108, 109, 111. |
| PUB-14 | Room type "Suite", then sort "Price: high to low" | Only Suites, highest price first. The URL updates with every change. |
| PUB-15 | Click an amenity chip twice | It toggles on (pressed) and off. Two chips together show only rooms that have both. |
| PUB-16 | No dates: Room type **Single** + amenity chip **Jacuzzi** (only Suites have one) | "No rooms match these filters" / "Remove a filter to see more rooms." and a **Clear filters** button. Clicking it resets every filter except the sort. |
| PUB-16b | Dates today → today + 2, Branch Colombo, Room type **Double** + chip **Mini-bar** | "2 rooms free in Colombo, …": 102 and 111. (106 and 107 are booked for those dates.) |
| PUB-17 | Edit the URL to `?check_in=<D+3>&check_out=<D+1>` | "Choose a check-out date after check-in." |
| PUB-18 | Click **Book this room** on any card | You go to `/login?next=/booking/<room id>?…`. |

### Sign in

| ID | Steps | Expected |
|---|---|---|
| PUB-20 | Open `/login` | h1 "Sign in to SkyNest". **Sign in** is disabled until both fields have text. |
| PUB-21 | Email `kamal@mail.com`, password `wrong` → **Sign in** | Under the password: "Email or password is incorrect." |
| PUB-22 | Click **Show** next to the password | The password is visible; the button now reads **Hide**. |
| PUB-23 | Dev builds only: open "Demo accounts (dev only)" → **Receptionist** | The email and password are filled in. |
| PUB-24 | Continue from PUB-18 (you are on `/login?next=/booking/…`): sign in as `ruwan@mail.com` | You land on that room's booking page, not on `/rooms`. |
| PUB-25 | Fail 10 sign-ins in a row for one email | "Too many sign-in attempts. Wait a minute and try again." Restart the backend to clear it. |
| PUB-26 | Read the footnote | "Staff accounts are created by the system admin." |

### Create an account

| ID | Steps | Expected |
|---|---|---|
| PUB-30 | `/login` → **New guest? Create an account** | `/register`. h1 "Create a guest account". |
| PUB-31 | Click **Create account** with everything empty | Field errors: "Enter your full name", "Enter a valid NIC or passport number", "Enter a valid email address", "Enter a valid phone number", "Use at least 8 characters". |
| PUB-32 | Set Password `abcdefgh` and Confirm `abcdefgx` | "Passwords do not match". |
| PUB-33 | Fill in a valid form: name "Test Guest", NIC `200101010101`, email `test.guest1@mail.com`, phone `+94 77 111 2222`, password `Testing@123` twice → **Create account** | Toast "Account created. You’re signed in as test.guest1@mail.com." You land on `/rooms`. The navbar shows "My bookings". |
| PUB-34 | Sign out, then register again with email `kamal@mail.com` | An alert with the server message, followed by a **Sign in instead** link. |
| PUB-35 | Register with a new email but NIC `200012345678` (Kamal's) | An alert with "A guest with this NIC/passport or email already exists. Please contact the front desk." |
| PUB-36 | Register with email `KAMAL@MAIL.COM` | Rejected as a duplicate, because emails are case-insensitive. |

### Other public pages

| ID | Steps | Expected |
|---|---|---|
| PUB-40 | Open `/nothing-here` | You are sent to `/404`: "Page not found", "This address doesn’t match any page. Check the link, or go to the home page.", and a **Go to home page** button. |
| PUB-41 | Open `/my-bookings`, `/profile`, `/dashboard/admin` and `/services/x` one at a time | Each one sends you to `/login?next=<that path>`. |
| PUB-42 | Narrow the window to 375 px | A hamburger "Open menu" button. The panel shows Home, Rooms and a full-width **Sign in**. There is no sideways scrolling. |

---

## 5. Guest (GST)

Sign in with the account named in each heading. Unless a test says otherwise, **Upcoming** lists Booked and Checked-in stays, **Past** lists Checked-out stays, and **Cancelled** lists cancelled ones.

### Kamal: kamal@mail.com

| ID | Steps | Expected |
|---|---|---|
| GST-10 | Sign in | You land on `/rooms`. Navbar: Home, Rooms, My bookings, and the email with a menu. There is a footer. |
| GST-11 | **My bookings** | h1 "My bookings". Tabs: **Upcoming 3** (101 Colombo, Checked in, 27/09 → 01/10; 302 Galle, Booked, 05/10 → 07/10; 306 Galle, Booked, D+20 → D+22), **Past 1** (109 Colombo), **Cancelled 1** (206 Kandy). |
| GST-12 | Upcoming → room 101 card → **View bill** | The window title is "Bill · Suite Room 101, 27/09–01/10". It shows Room 60,000.00, Services 9,000.00, Tax (15%) 10,350.00, Total 79,350.00, Paid to date 0.00, and red "Balance due LKR 79,350.00". There is **no** "Take payment". "Services used" lists Room Service × 2, Spa Treatment × 1 and Laundry × 2. |
| GST-13 | Room 302 card (Booked) | It has **View bill** and **Cancel booking**. Click **View bill** → "No bill yet. The front desk prepares it at check-out, with room charges, services and tax." |
| GST-14 | Room 306 card → **Cancel booking** | Dialog "Cancel this booking?", "Room 306 at SkyNest Galle becomes available for dd/mm–dd/mm. This can’t be undone.", with **Keep booking** and **Cancel booking**. |
| GST-15 | Click **Keep booking** | The dialog closes. Nothing changes. |
| GST-16 | Cancel it again → **Cancel booking** | Toast "Cancelled: booking SN-73120000. Room 306 is free for dd/mm–dd/mm." Now Upcoming 2, Cancelled 2. |
| GST-17 | Past tab → room 109 → **View bill** | Total LKR 53,475.00, Paid. |
| GST-18 | Cancelled tab | The cards have no **Cancel booking** and no **View bill**. |

### Nimali: nimali@mail.com

| ID | Steps | Expected |
|---|---|---|
| GST-20 | **My bookings** | Upcoming 1 (210 Kandy, D+12 → D+14), Past 3 (102 Sept 2026, 109, 105), Cancelled 1 (111 Colombo). |
| GST-21 | Past → 102 → **View bill** | Total 31,050.00, fully paid, one Cash payment. |

### Book a room: ruwan@mail.com (or any guest)

| ID | Steps | Expected |
|---|---|---|
| GST-30 | **Rooms** → no dates → room 107 Colombo (Double) → **Book this room** | `/booking/<id>`. h1 "Book Double · Room 107, SkyNest Colombo". Check-in = today, Check-out = tomorrow, "1 night". Payment "Credit Card" selected. The Guest section shows Ruwan's name, email and phone. |
| GST-31 | Set Check-in to yesterday (type it in) | "Check-in can’t be in the past. Choose today or a later date." **Book this room** is disabled. |
| GST-32 | Check-in today, Check-out today + 31 | "Stays are limited to 30 nights. For a longer stay, contact the front desk." |
| GST-33 | Check-in D+10, Check-out D+14 → **Book this room** | Alert "Room 107 is already booked for the selected dates. Choose other dates or another room." A "Free on these dates" list shows up to 3 Colombo Doubles (from 102, 106, 111), each with a link. |
| GST-34 | Click one of the suggested rooms | Its booking page opens with the same dates already filled in. |
| GST-35 | Change any date | The conflict message disappears. |
| GST-36 | On room 102: dates D+30 → D+32, payment **Cash** → **Book this room** | Toast "Booked: Double Room 102, dd/mm–dd/mm". The confirmation reads "Booked: Double · Room 102, SkyNest Colombo", "… · 2 nights · Booking SN-…", "Guest: Ruwan Jayasinghe". There are **View my bookings** and **Book another room** buttons. |
| GST-37 | **View my bookings** | Upcoming now has 2 entries. |
| GST-38 | Check the summary card before booking | "Rate LKR 8,000.00 × 2" and the estimate "LKR 16,000.00", with "Before tax and services. The hotel calculates the final bill at check-out." |
| GST-39 | Open `/booking/e0000000-0000-0000-0000-000000000004` (room 104, Maintenance) | The Maintenance badge, "This room is under maintenance and can’t be booked. Choose another room.", and **Book this room** disabled, with "This room is under maintenance. Choose another room." below it. |

### Kasun: kasun@mail.com (overdue arrival)

| ID | Steps | Expected |
|---|---|---|
| GST-39b | **My bookings** | Upcoming 1: 107 Colombo, Booked, D−1 → D+2, with **Cancel booking** still available. (The receptionist can still check him in: REC-12.) |

### In-house guests (bills)

| ID | Account | Steps | Expected |
|---|---|---|---|
| GST-40 | sanduni@mail.com | My bookings → 108 → **View bill** | Total 31,625.00, Paid to date 0.00, "Balance due LKR 31,625.00". Card status "Checked in". No **Cancel booking**. |
| GST-41 | dilan@mail.com | Upcoming → 109 → **View bill** | Total 40,250.00, "Paid". One Credit Card payment, note "Paid in full". Past 1. |
| GST-42 | tharindu@mail.com | Upcoming → 110 → **View bill** | A Discount 2,000.00 row. Total 25,875.00, Paid 5,000.00, Balance due 20,875.00. Past 1. |
| GST-43 | travel@ceylontea.lk | My bookings | Upcoming 1 (310 Galle, Total 18,975.00, due 13,975.00). Past 1, whose bill shows Discount 3,000.00. |

### New guest and profile: ishara@mail.com

| ID | Steps | Expected |
|---|---|---|
| GST-50 | **My bookings** | Every tab shows 0. Upcoming: "No upcoming stays", "Check availability to book a room." and a **Check availability** button. Past: "No past stays yet". Cancelled: "No cancelled bookings". |
| GST-51 | User menu → **Your profile** | h1 "Your profile", "Guest account". Sign-in email, Role. "Personal details" with Email and NIC / Passport read-only ("Ask the front desk to change it."). |
| GST-52 | Check the profile buttons | **Discard changes** and **Save details** are disabled until you edit something. |
| GST-53 | Phone → `123` → **Save details** | "Enter a phone number with at least 7 digits." |
| GST-54 | Phone `+94 77 555 6666`, Nationality `Sri Lankan` → **Save details** | Toast "Saved: personal details for Ishara Fonseka". Reload the page: the new values are kept. |
| GST-55 | Change password with the wrong current password | "Current password is incorrect." under Current password. |
| GST-56 | New password the same as the current one | "Choose a password different from the current one." |
| GST-57 | Current `SkyNest@2026`, New `NewPass@2026` twice → **Change password** | Toast "Password changed. Use the new one next time you sign in." The fields clear. Sign out, then sign in with `NewPass@2026`; it works. (Rebuild later to reset the password.) |

### Guest access limits

| ID | Steps | Expected |
|---|---|---|
| GST-60 | As any guest, open `/dashboard/receptionist`, `/dashboard/manager`, `/dashboard/admin` and `/services/<any id>` | Each one quietly sends you to `/rooms`. |

---

## 6. Receptionist (REC)

Sign in as **rec.colombo@skynest.lk** unless the heading says otherwise. You land on `/dashboard/receptionist`. The navbar shows "Today", "Rooms", "New booking" and "Colombo · 42 Galle Face Terrace, Colombo 03" (at xl width). There is no footer.

### Today: what you should see

| ID | Steps | Expected |
|---|---|---|
| REC-01 | Open **Today** | h1 "Today" and today's long date, e.g. "Tuesday 13 October 2026". Summary: **Arrivals today 3**, **In-house 5**, **Departures due 4**, **Rooms available 5**. |
| REC-02 | "Departures due · 4" | Kamal 101 "Overdue checkout". Malith 105 "Overdue checkout". Sanduni 108 "Departs today". Dilan 109 "Departs today". Each row has **Check out** and a ⋯ menu. |
| REC-03 | "Arrivals today · 3" | Chathuri 106 ("Overdue arrival"; the text "Stay period has ended; cancel or rebook"; no Check in button). Kasun 107 ("Overdue arrival", **Check in**). Ruwan 106 (**Check in**). |
| REC-04 | "Staying on · 1" | Tharindu 110, with an **Add service** button and a ⋯ menu (Bill and payments, Check out). |
| REC-05 | "Upcoming arrivals" (collapsed, count 2) → open it | Ahmed 108 ("Arrives on dd/mm/yyyy") and Sarah 107. The only menu item is **Cancel booking**. |
| REC-06 | Type `Sanduni` in the search box | Only her row is left. Empty sections say "No matching departures." and so on. |
| REC-07 | Search `SN-71100000` | Sarah's row (Upcoming opens automatically). |
| REC-08 | Search `zzz` | Every section shows its "No matching …" message. |
| REC-09 | Clear the search → refresh icon ("Refresh lists") | "Updated HH:MM" changes. |
| REC-10 | Open the ⋯ menu on Malith's row with the keyboard: Tab to it → Enter → arrow keys → Esc | Arrows move between items, and Esc closes the menu and puts focus back on the button. |

### Check in

| ID | Steps | Expected |
|---|---|---|
| REC-11 | Ruwan 106 → **Check in** | Toast "Checked in: Ruwan Jayasinghe, Room 106". He moves to "Staying on". Summary: Arrivals 2, In-house 6, Rooms available 4. |
| REC-12 | Kasun 107 → **Check in** (overdue arrival) | Toast "Checked in: Kasun Herath, Room 107". |
| REC-13 | Chathuri 106 → ⋯ → **Cancel booking** | Dialog "Cancel this booking?", "Chathuri Peiris: Room 106 becomes available for dd/mm–dd/mm. This can’t be undone." → **Cancel booking** → Toast "Cancelled: booking SN-71030000 for Chathuri Peiris. Room 106 is free for …". The row disappears. |

### Check out

| ID | Steps | Expected |
|---|---|---|
| REC-20 | Dilan 109 (paid) → **Check out** | Dialog "Check out Dilan Gunawardena?", "Room 109 becomes available. The bill is recalculated first; if a balance is due, the payment window opens instead.", with **Not now** and **Check out**. |
| REC-21 | **Not now** | The dialog closes. Nothing changes. |
| REC-22 | **Check out** again → confirm | Toast "Checked out: Dilan Gunawardena. Room 109 is now available." The row disappears. Rooms available goes up by 1. |
| REC-23 | Sanduni 108 (unpaid) → **Check out** → confirm | No toast. The bill window opens instead, with the red notice "Balance due: LKR 31,625.00. Take payment before checking out." The Amount field has focus and holds the full balance. |
| REC-24 | In the bill window, check the bill | Title "Bill · Sanduni Wickramasinghe, Deluxe 108". "Room · Deluxe 108 · 2 nights 24,000.00", Services 3,500.00, Tax (15%) 4,125.00, Total 31,625.00, "No payments yet." |
| REC-25 | Amount `0` → **Take payment** | "Enter an amount greater than 0." |
| REC-26 | Amount `10.555` | "Use at most 2 decimal places." |
| REC-27 | Amount `40000` | "Amount cannot exceed the outstanding balance." |
| REC-28 | Amount `10000`, Method **Cash**, Note "Part payment" → submit | Toast "Payment taken: LKR 10,000.00 by Cash, Sanduni Wickramasinghe". Balance due 21,625.00. The Payments table has 1 row. The help text shows a **Use full balance** link. |
| REC-29 | **Use full balance** → Method **Credit Card** → submit | Toast "Payment taken: LKR 21,625.00 by Credit Card, …". "This bill is fully paid." A "Paid" badge. A **Check out now** button appears. |
| REC-30 | **Check out now** | Toast "Checked out: Sanduni Wickramasinghe. Room 108 is now available." The window closes. |
| REC-31 | Malith 105 → ⋯ → **Bill and payments** | Paid 10,000.00, Balance due 10,125.00. One payment: Cash, "Part payment at check-in". |
| REC-32 | **Apply discount** → `-5` → apply | "Enter a discount of 0 or more." |
| REC-33 | Discount `99999` → apply | The server error "Discount must be between 0 and the bill subtotal" appears under the field. |
| REC-34 | Discount `1000` → apply | Toast "Bill recalculated for Malith Rodrigo with a LKR 1,000.00 discount". A Discount 1,000.00 row. Tax 2,475.00, Total 18,975.00, Balance due 8,975.00. |
| REC-35 | **Print bill** | The browser print dialog opens with only the bill. |
| REC-36 | **Close** → Kamal 101 → **Check out** → confirm | The bill opens with "Balance due: LKR 79,350.00…". Pay in full → **Check out now** → room 101 becomes available. |

### Services

| ID | Steps | Expected |
|---|---|---|
| REC-40 | Tharindu 110 → **Add service** | `/services/71090000-…`. "← Today". h1 "Add services · Tharindu Senanayake, Room 110". The "Checked in" badge and `SN-71090000`. "This stay" lists Room Service and Airport Transfer. "Services total LKR 4,500.00". |
| REC-41 | Category tabs | "All", plus one per category: F&B, Wellness, Housekeeping, Transport. City Tour (inactive) is **not** listed. |
| REC-42 | Search `spa` | Only Spa Treatment. Search `xyz` → "No services match." with **Clear search**. |
| REC-43 | Laundry quantity `0` → **Add** | "Enter a whole number from 1 to 99." |
| REC-44 | Laundry quantity `3` → **Add** | Toast "Added: 3 × Laundry to Room 110, Tharindu Senanayake". A new row with today's date and LKR 1,500.00. Total 6,000.00. The quantity goes back to 1. |
| REC-45 | **Open bill** | The bill window opens with the new Services total and no **Check out now** button. |
| REC-46 | Booked rows on Today have no Add service. Open Ahmed's (Booked) page directly: `/services/71050000-0000-0000-0000-000000000000` | Info "Services can only be added while the guest is checked in. Check the guest in from Today first." The quantity boxes and Add buttons are hidden. |

### New booking and guests

| ID | Steps | Expected |
|---|---|---|
| REC-50 | **Register guest** | A drawer titled "Register new guest". |
| REC-51 | Tick "Corporate guest" → **Register guest** with everything empty | "Enter the guest’s full name.", "Enter the NIC or passport number.", "Enter an email address like name@example.com.", "Enter a phone number with at least 7 digits.", "Enter the company name for a corporate guest." |
| REC-52 | Fill it in with NIC `P12345678` (John Smith's) | Error "… Open the existing guest instead." There is **no** Find button on this screen (KI-08). |
| REC-53 | Use a new NIC `199900011122`, name "Walk In Test", email `walkin@mail.com`, phone `+94 77 222 3333` | Toast "Registered: Walk In Test". The drawer closes. |
| REC-54 | **New booking** | `/rooms?mode=booking`. h1 "New booking: choose a room". "New booking" is highlighted in the navbar. |
| REC-55 | Dates D+1 → D+3, Colombo → room 102 → **Book this room** | The booking page. The Guest section has a "Find guest" search box. **Book this room** is disabled, with "Choose a guest to continue." |
| REC-56 | Type `n` | Nothing happens (it needs 2 characters). Type `Nadeesha` → "Nadeesha Karunaratne" is offered. Pick her → a highlighted card with **Change**. |
| REC-57 | Type `qqqq` | "No guest matches “qqqq”. Register a new guest below." |
| REC-58 | **Register new guest** → NIC `P12345678` | The 409 error, now **with** a "Find P12345678" button → it fills the search with John Smith. |
| REC-59 | Pick Nadeesha → **Book this room** | Confirmation "Guest: Nadeesha Karunaratne", with **Back to Today** and **Book another room**. **Back to Today** → she appears under Upcoming arrivals. |

### Branch scoping and the other receptionists

| ID | Steps | Expected |
|---|---|---|
| REC-60 | As rec.colombo, open `/services/72090000-0000-0000-0000-000000000000` (a Kandy booking) | "Couldn't load this booking. You don't have access to this record." |
| REC-61 | Sign in as **rec2.colombo@skynest.lk** | The same Colombo lists as rec.colombo, including any changes you just made. |
| REC-62 | Sign in as **rec.kandy@skynest.lk** | Arrivals today 4 (Nuwan 206, Hiruni 207, Pradeep 206 ended, John 203 from the fixed seed). In-house 4. Departures due 3 (Emma 208, Ravi 209, Lakmal 205). Staying on: Lanka Exports Ltd 210. Upcoming 3. Rooms available 6. Branch line "Kandy · 15 Temple Road, Kandy". |
| REC-63 | rec.kandy → Emma 208 → **Check out** | The bill opens with "Balance due: LKR 27,025.00. …". |
| REC-64 | Sign in as **rec.galle@skynest.lk** | Arrivals 4 (Gayan, Dinithi, Sunil ended, Kamal 302 ended). In-house 4. Departures 3. Staying on: Ceylon Tea Traders 310. Upcoming 3. Rooms available 6. |
| REC-65 | As any receptionist, open `/dashboard/manager`, `/dashboard/admin` and `/my-bookings` | Each one sends you back to `/dashboard/receptionist`. |

---

## 7. Manager (MGR)

Sign in as **mgr.colombo@skynest.lk**. You land on `/dashboard/manager`. The navbar shows "Overview" and "Reports" plus the branch line. The tabs are Overview, Reports, Rooms and Service catalogue.

### Overview

| ID | Steps | Expected |
|---|---|---|
| MGR-01 | Open **Overview** | The Month picker shows the current month. Tiles: "Rooms occupied today" **1 of 7 (14%)** with "2 reserved · 1 in maintenance" (wrong: see KI-13; Rooms shows 5 of 11 occupied). "Revenue, <Mon YYYY>" and "Collected, <Mon YYYY>" (see §3). "Balance due" **LKR 141,975.00** in red, "4 bills with a balance". |
| MGR-02 | The chart | "Monthly revenue, last 6 months (LKR)" with Rooms and Services in the legend. A bar for each of the last 6 months. The caption ends "… this branch; before tax." |
| MGR-03 | **Show as table** | The same figures as a table. |
| MGR-04 | Set Month to a year ago | The chart moves to that window: "No checked-out stays in this period yet." The revenue tiles show LKR 0.00. |
| MGR-05 | Try to pick a future month | It can't be picked (the latest allowed is this month). |
| MGR-06 | "Top services by quantity" | 1 Laundry, 2 Room Service, 3 Airport Transfer, 4 Minibar Restock, 5 Spa Treatment. "All time, this branch." |

### Reports (`?tab=reports`)

| ID | Steps | Expected |
|---|---|---|
| MGR-10 | **Reports** (navbar) | Sub-tabs Occupancy, Billing summary, Service usage, Monthly revenue and Top services. Occupancy is open, with From and To set to today. |
| MGR-11 | Occupancy: set From after To | To moves to match From. |
| MGR-12 | Occupancy, From and To a year from now | Rows only for rooms with no active booking. Rooms with bookings drop out (KI-13). |
| MGR-13 | **Billing summary** | 18 rows, with the line "Billed … · Collected … · Balance due LKR 141,975.00". The Status column shows "No bill" on 6 rows (Booked and cancelled stays), "Balance due LKR …" in red, or "Paid". |
| MGR-14 | Tick **Balance due only** | 4 rows: Kamal 101, Malith 105, Sanduni 108, Tharindu 110. |
| MGR-15 | Untick, then row Malith 105 → **View bill** | The bill window (Balance due LKR 10,125.00), with no **Check out now**. Take a payment of 125 Cash → Toast "Payment taken: LKR 125.00 by Cash, Malith Rodrigo". **Close** → the report refreshes: Malith's Outstanding is 10,000.00. |
| MGR-16 | Untick the filter → a **"No bill"** row (e.g. Sarah 107, Booked) → **View bill** | The window shows an error and Retry, and does not recover (KI-04, open item 2). |
| MGR-17 | Search `Kamal` | Only Kamal's rows. Search `zzz` → "No rows match “zzz”." |
| MGR-18 | Click the "Outstanding" header three times | Sorted ▲, then ▼, then back to the original order. |
| MGR-19 | **Export CSV** | `skynest-billing-YYYY-MM-DD.csv` downloads with the rows you see. |
| MGR-20 | More than 10 rows | "Showing 1–10 of 18", with Page 1 of 2 and arrows. |
| MGR-21 | **Service usage** | 17 rows. "Total service revenue LKR …". |
| MGR-22 | **Monthly revenue**, Year this year, Month "All months" | One row per month that has checked-out stays. Month = last year with nothing in it → "No checked-out stays in this period. Revenue is counted when a booking is checked out." |
| MGR-23 | **Top services**, Show "Top 5" | 5 rows, ranked by quantity. |
| MGR-24 | Switch sub-tabs | Search and sort reset; filters stay. The URL has `?report=`. |

### Rooms

| ID | Steps | Expected |
|---|---|---|
| MGR-30 | **Rooms** tab | 11 Colombo rooms, with no Branch column. 101, 105, 108, 109 and 110 show "Guest checked in" and no button. 104 shows **Return to service**. The rest show **Mark as maintenance**. |
| MGR-31 | 111 → **Mark as maintenance** | Toast "Room 111 marked maintenance". On `/rooms` (signed out), 111 is no longer listed. |
| MGR-32 | 111 → **Return to service** | Toast "Room 111 is back in service". |

### Service catalogue

| ID | Steps | Expected |
|---|---|---|
| MGR-40 | **Service catalogue** tab | The note "A new price applies to new orders only…". Services grouped by category. City Tour is not listed. |
| MGR-41 | Laundry price `0` → **Save price** | Toast "Enter a price above LKR 0.00 for Laundry." |
| MGR-42 | Laundry price `600` → **Save price** | Toast "Saved: Laundry now LKR 600.00 for new orders". Existing bills keep 500 (check H's bill: unchanged). |
| MGR-43 | **Add service** → empty → submit | "Enter the service name and category." and "Enter a base price above LKR 0.00." |
| MGR-44 | Name "Late Checkout", Category "Front desk", Price 2000 → submit | Toast "Added: Late Checkout (Front desk), LKR 2,000.00". A new category group appears. |
| MGR-45 | **Add service** → "Laundry", Housekeeping, 500 | Error "A service named 'Laundry' already exists." |
| MGR-46 | Late Checkout → **Deactivate** | Dialog "Deactivate Late Checkout?" → **Deactivate** → Toast "Deactivated: Late Checkout". It disappears from the catalogue and from the receptionist's Add services list. |

### Branch scoping

| ID | Steps | Expected |
|---|---|---|
| MGR-50 | Sign in as **mgr.kandy@skynest.lk** → Overview | Balance due **LKR 71,375.00**, 4 bills. Billing summary (Balance due only): Emma 208, Lakmal 205, Lanka Exports 204 (the fixed seed BK-05, Checked out with LKR 21,400 still owing) and Lanka Exports 210. |
| MGR-51 | Sign in as **mgr.galle@skynest.lk** → Overview | Balance due **LKR 42,500.00**, 3 bills. Top services shows a tie: "2 Airport Transfer" and "2 Laundry". |
| MGR-52 | As mgr.kandy → Reports → every sub-tab | Kandy rows only; no Branch column and no Branch filter. |
| MGR-53 | As a manager, open `/dashboard/admin`, `/dashboard/receptionist` and `/my-bookings` | Each one sends you to `/dashboard/manager`. |
| MGR-54 | As a manager, open `/rooms` and then `/services/71090000-0000-0000-0000-000000000000` directly | Both work (no navbar link: KI-03). The ServiceRequest back link reads "← Overview". |

---

## 8. Admin (ADM)

Sign in as **admin@skynest.lk**. You land on `/dashboard/admin`. The navbar shows "Overview", "Branches", "Accounts" and "Reports", with no branch line. The tabs are Overview, Branches, Accounts, Reports, Bookings, Rooms and Service catalogue, each with its own subtitle.

### Overview and reports

| ID | Steps | Expected |
|---|---|---|
| ADM-01 | **Overview**, Branch "All branches" | "Rooms occupied today" 3 of 22 (14%), "7 reserved · 3 in maintenance" (KI-13). Balance due **LKR 255,850.00**, "11 bills with a balance". The chart caption says "all branches". |
| ADM-02 | Branch → Kandy | The figures match mgr.kandy's (MGR-50). The URL has `?branch=`. |
| ADM-03 | **Reports** → Billing summary, All branches | 57 rows, with an extra **Branch** column. |
| ADM-04 | Top services | No Branch column. 1 Laundry ×22, 2 Room Service ×21, … |
| ADM-05 | Invalid tab `?tab=xyz` | The Overview tab is shown. |

### Branches

| ID | Steps | Expected |
|---|---|---|
| ADM-10 | **Branches** | "3 branches". Colombo 11 rooms / 10 active bookings, Kandy 11 / 11, Galle 11 / 11. |
| ADM-11 | **Add branch** → submit empty | "Enter the branch name.", "Enter the city.", "Enter the address.", "Enter the phone.", "Enter the branch manager name." |
| ADM-12 | Add "SkyNest Ella", Ella, "1 Hill Road, Ella", "+94 57 222 3333", "Test Manager" | Toast "Added: SkyNest Ella". 4 branches. It appears in the Home page's hotel list and footer, without "Rooms from" because it has no rooms yet. |
| ADM-13 | Add another branch named "SkyNest Colombo" | 409 "A branch named 'SkyNest Colombo' already exists." |
| ADM-14 | Ella → **Edit** → **Save changes** without changing anything | The drawer just closes. |
| ADM-15 | Ella → **Edit** → change Phone → **Save changes** | Toast "Saved: SkyNest Ella". |

### Accounts

| ID | Steps | Expected |
|---|---|---|
| ADM-20 | **Accounts** | 18 accounts (plus any you created). Guest rows show "Managed by the guest". Admin rows show Branch "All branches". |
| ADM-21 | Role filter "Receptionist" | 4 rows (rec.colombo, rec2.colombo, rec.kandy, rec.galle). Add Branch Colombo → 2. |
| ADM-22 | Search `tharindu` | 1 row. Search `zzz` → "No accounts match". |
| ADM-23 | **Create staff account** → submit empty | "Enter an email address like name@skynest.lk." and "Choose the branch this account works at." |
| ADM-24 | Role **Administrator** | The Branch field disappears. |
| ADM-25 | Email `rec.ella@skynest.lk`, **Generate**, Role Receptionist, Branch Ella | "What this role can do" ends with "Limited to SkyNest Ella." |
| ADM-26 | Submit | Toast "Created: staff account for rec.ella@skynest.lk (Receptionist)". The drawer shows "This password is shown once…" with the email and password. **Copy email and password** → Toast "Copied email and password". **Done**. |
| ADM-27 | Create `rec.colombo@skynest.lk` again | 409 "An account with email 'rec.colombo@skynest.lk' already exists." |
| ADM-28 | Sign out → sign in as rec.ella with the generated password | Today for Ella. Every section is empty: "Nothing due today". Rooms available 0. |
| ADM-30 | As admin → rec2.colombo → **Edit access** → Role Manager, Branch Colombo → save | Toast "Saved: rec2.colombo@skynest.lk is now Manager at SkyNest Colombo". Signed in as rec2.colombo, they now land on the manager dashboard. |
| ADM-31 | admin@skynest.lk's own row → **Edit access** → Role Manager, Branch Colombo → save | The drawer shows "You cannot remove your own admin role." and nothing changes. |
| ADM-32 | Sign in as **admin.ops@skynest.lk** → admin@skynest.lk → **Edit access** → Receptionist, Colombo | It is allowed. Undo it straight away (set it back to Administrator), or rebuild. |
| ADM-33 | Edit a staff row to Manager with no branch | "Select a branch for this role." |

### Bookings, Rooms and Catalogue

| ID | Steps | Expected |
|---|---|---|
| ADM-40 | **Bookings** | "All bookings", 57 rows, 10 per page. The columns include Payment and Status. |
| ADM-41 | Status "Checked in" | 13 rows: 4 per branch plus BK-01 (Kamal 101). |
| ADM-42 | Branch Galle + Status Cancelled | 2 rows: Priya 306 and Anoma 301 (BK-04). |
| ADM-43 | "Stay starts on or before" = yesterday, "Stay ends on or after" = today | Only stays running across today. |
| ADM-44 | Filters that match nothing | "No bookings match these filters." (The "latest 100 of N" notice needs more than 100 bookings, so it can't be reached with this data.) |
| ADM-45 | **Rooms**, All branches | 33 rooms (more if you added some), with a Branch column. 104, 211 and 311 show **Return to service**. |
| ADM-46 | **Service catalogue** | The same as the manager's, and changes apply to every branch. |
| ADM-47 | Admin opens `/rooms` → **Book this room** | You are sent quietly to `/dashboard/admin` (KI-02). |

---

## 9. All roles (X)

| ID | Steps | Expected |
|---|---|---|
| X-01 | Signed in as anyone: user menu → **Sign out** | Dialog "Sign out of SkyNest?", "You’ll need your email and password to sign back in as {email}.", with **Stay signed in** and **Sign out**. **Sign out** → `/` and the toast "Signed out: {email}". |
| X-02 | User menu → open it, then press Esc / click outside | It closes. It shows "Signed in as {Administrator\|Manager\|Receptionist\|Guest}". |
| X-03 | Every role at 375 px: open the menu | The links for that role, then the email, role and branch, then **Your profile** and **Sign out**. Tables scroll inside their own box, and the page itself never scrolls sideways. |
| X-04 | Signed in, tab to the page with the keyboard from the top | The first Tab shows "Skip to content". Enter jumps to the main content. |
| X-05 | Open any modal (bill, cancel) → press Tab repeatedly | Focus stays inside the modal. Esc closes it. |
| X-06 | Each role → `/profile` | Staff see only Account and Change password; there is no Personal details. |
| X-07 | Stay signed in for more than 60 minutes (the token lifetime) | You are signed out with no message. On a protected page you go to `/login?next=…`; signing in brings you back. |
| X-08 | Stop the backend (`docker compose stop backend`) → open Today or Rooms | "Couldn't load …" followed by "Can't reach the server. Check your connection and try again." or, behind the Docker proxy, "The server couldn't complete this. Try again; if it keeps happening, tell the system admin.", with **Retry**. Start the backend again → **Retry** loads the page. |
| X-09 | Tab titles | "Rooms · SkyNest Hotels", "Sign in · …", "Today · …", "Manager dashboard · …", "Admin console · …". |
| X-10 | (Optional) `docker compose exec db psql -U skynest_user -d skynest -c "ALTER PROCEDURE cancel_booking RENAME TO cancel_booking_x"` → `docker compose restart backend` → reload a page | `/api/health` returns 503, and pages show "The database is out of date. Ask the system admin to rebuild it." Rebuild afterwards (SET-01). |

---

## 10. Known issues (KI)

The app currently behaves as described below, and this behaviour differs from the spec or is probably a bug. Each test **passes when you see the behaviour described**. Don't log these again; log anything else.

| ID | Steps | Current behaviour | Why it's an issue |
|---|---|---|---|
| KI-01 | Signed out: **Book this room** → login page → **Create an account** → register | You land on `/rooms`, not on the room you chose. | The Register link drops `next`. |
| KI-02 | Admin → `/rooms` → **Book this room** | You are sent to `/dashboard/admin` with no message. | The button shouldn't show for admins, or should explain. |
| KI-03 | Manager: look for a way to reach Rooms, New booking or Add service | There is no navbar or dashboard link. You can only get there by typing the URL. | Managers are allowed on those pages. |
| KI-04 | Billing summary → **View bill** on a "No bill" row (Booked or Cancelled) | The window calls generate and shows an error with Retry that never succeeds. | Open item 2 (UI-09): hide the button or fall back to a read-only view. |
| KI-05 | `/booking/<made-up uuid>` | "This room no longer exists. Refresh the list." | The page's own room-not-found text never shows. |
| KI-06 | Guest whose profile fails to load (hard to reproduce) | **Book this room** stays enabled. | It should be disabled. |
| KI-07 | Today | Overdue arrivals (check-in before today) are counted in "Arrivals today". | The label says "today". |
| KI-08 | Today → **Register guest** with an existing NIC | No "Find {nic}" button, unlike the booking page. | It's inconsistent. |
| KI-09 | Bill opened from Reports or Add services | There's no **Check out now**, even when the bill is paid. | Only Today offers it. |
| KI-10 | Receptionist, Booked row ⋯ menu | Only "Cancel booking", so a deposit can't be taken before arrival. | Managers and admins can, through Reports. |
| KI-11 | Accounts | The filter says "Admin"; the table says "Administrator". | Wording is inconsistent. |
| KI-12 | Profile vs Register validation | Profile messages end with a full stop; Register messages don't. | Copy is inconsistent. |
| KI-13 | Manager Overview "Rooms occupied today" | Colombo shows "1 of 7 (14%)", but 5 of its 11 rooms have a guest checked in. Guests due out today or overdue aren't counted, and rooms whose only bookings fall on other dates drop out of the total. | The occupancy report's date filter (already logged in TASKLIST task 15). |
| KI-14 | Signed out: Rooms, dates today → today+2, Colombo | Rooms 101 (Kamal) and 105 (Malith) show "Free for your dates", although both guests are still checked in, past their check-out date. A booking on them succeeds. | Availability uses the planned dates only. An overdue guest's room should stay blocked. |
| KI-15 | Admin → Bookings | All 7 original seed bookings show the reference `SN-30000000`. | The reference is the first 8 characters of the ID, and the fixed seed IDs share them. Only the seed data is affected. |

---

## 11. Results log

Copy this table into the PR, the issue, or your notes for each run.

| Date | Tester | Build day (D) | Test ID | Pass / Fail | Notes (what you saw, screenshot link) |
|---|---|---|---|---|---|
| | | | | | |
