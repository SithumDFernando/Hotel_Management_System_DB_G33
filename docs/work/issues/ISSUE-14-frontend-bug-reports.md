# ISSUE-14 — Frontend bugs from teammate click-through

| | |
|---|---|
| **Severity** | 🔴 High (14.2 crashes a manager screen) · 🟠 Medium (14.1, 14.4) · 🟡 Low (14.3) |
| **Area** | Frontend (`RoomsBrowse`, `RoomCard`, `ReportTable`, `ReportsPanel`, `Navbar`, `ErrorBoundary`, new `Profile`), backend `routers/auth.py` |
| **Found** | 2026-10-12, manual testing by a teammate |

## 14.1 Rooms browse hides rooms when no dates are picked

**Report:** with no dates only "never booked" rooms show; picking dates gives the right list.

**Root cause:** without dates `RoomsBrowse` called `GET /rooms?status=Available`. `room.status` is tonight's physical occupancy (`trg_room_status` sets `Occupied` while a guest is checked in), so every room with a guest in it right now disappeared, and `RoomCard` also disabled "Book now" for non-`Available` rooms. On a DB with several checked-in stays this looks like "only never-booked rooms". With dates the API uses the booking anti-join, which is correct.

**Fix:** no dates → `GET /rooms` (all rooms; Maintenance still hidden client-side), heading "N rooms" plus "Choose dates to check availability.". `RoomCard` is bookable unless the room is in Maintenance (`create_booking` checks overlaps at checkout).

**Acceptance:** seed, no dates → 11 rooms including 101 (Occupied), not 104 (Maintenance); dates overlapping BK-01 → 101 hidden.

## 14.2 Manager billing summary crashes with no way back

**Report:** billing summary report not working for branch managers, no way to go back.

**Root cause:** `ReportTable` computed `active = sort?.key === c.key`. Only the manager's billing summary had a column without a `key` (Folio), so with no sort `undefined === undefined` was true and `sort.dir` threw `TypeError: Cannot read properties of null (reading 'dir')`. The only error boundary wrapped the whole app (`main.jsx`), so the navbar disappeared too and the only exit was a full reload to `/`. The API itself was fine (200 with rows). Also: the report sub-tab was local state (lost on navigation), and the Folio button sent managers to the receptionist's Service requests page, whose Back went to the dashboard Overview.

**Fix:**
- `ReportTable`: a column is active only if it has a key.
- `ErrorBoundary page` inside `Layout` (reset when the URL changes): a crashing page keeps the navbar and offers Go back / Try again.
- `ReportsPanel`: open report kept in `?report=`; tab data tagged with its tab so the previous report's rows never render with the next report's columns; Folio → **View bill**, which opens `BillPaymentModal` in place for managers and admins.
- `ServiceRequest`: Back returns to the previous page when there is in-app history, otherwise the role dashboard.

**Acceptance:** manager and admin open Billing summary with no JS errors, View bill opens and closes in place, refresh keeps `?report=billing`.

## 14.3 Logout happens without warning

**Root cause:** `Navbar.onLogout` cleared the token and navigated home immediately.

**Fix:** "Sign out" opens a confirm dialog (Stay signed in / Sign out), then shows "Signed out: <email>" on Home. Desktop and mobile. Automatic sign-out on token expiry/401 stays silent. Also fixed the `Â·` mojibake in the navbar.

## 14.4 No way to view or update the profile

**Fix:**
- Backend: `GET /api/auth/profile` (any role), `PATCH /api/auth/profile` (guest, own row; `full_name`, `phone`, `date_of_birth`, `nationality`, `gender`; anything else → 422), `POST /api/auth/change-password` (any role; current password required, `NewPassword` policy, 5 wrong attempts per account in 15 minutes → 429 via `password_failures`).
- Frontend: `/profile` page (account card; guest details form; change-password form), linked from the navbar.
- Email (the login) and NIC/passport stay front-desk changes (`PUT /api/guests/:id`).

**Tests:** `backend/tests/test_profile.py` (14 tests).

## Verification (2026-10-12)

- Fresh `run_all.sql` build in a scratch database: **239 passed** (`pytest -m "not live_api"`). The shared dev DB `skynest` is stale (pre-ISSUE-08/09 procedures) and fails 29 unrelated tests until rebuilt.
- `npm run build` OK.
- Headless Edge (CDP) against the dev server + current backend: 27 scripted checks across guest, receptionist, manager and admin, desktop and 375px, all pass with no JS exceptions, console errors or 5xx.
