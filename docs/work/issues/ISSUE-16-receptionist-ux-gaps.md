# ISSUE-16 — Receptionist UX gaps from teammate review

| | |
|---|---|
| **Severity** | 🟠 Medium (16.1 lets staff pick rooms they can't book) · 🟡 Low (16.2–16.4, missing screens) |
| **Area** | Frontend (`RoomsBrowse`, `StaySearch`, `RoomCard`, `ReceptionistDashboard`, `GuestPicker`, `MyBookings`, `Navbar`, new `RoomStatusBoard`, `GuestDirectory`, `ServicePriceList`), backend `routers/guests.py` + `schemas/guest.py` |
| **Found** | 2026-10-13, review by a teammate |

## 16.1 New booking shows every branch, and hides booked rooms

**Report:** the receptionist sees rooms of all branches by default, and "Book" works on other branches' rooms; already-booked rooms can't be seen at all.

**Root cause:** `RoomsBrowse` loaded `GET /rooms` with no `branch_id` for everyone. `POST /bookings` already refuses other branches (403), so the receptionist only found out at checkout after picking a guest. With dates the API's anti-join drops overlapping rooms, so the page never had them to show.

**Fix:** branch staff (receptionist, manager) are locked to their branch: the branch field is fixed text ("Staff book rooms in their own branch.") and every request sends `branch_id`. Other branches are not shown at all (they can never be booked from there). With dates the page also loads the branch's undated list; rooms missing from the dated result are listed after the free ones under **Booked for these dates**, each with a "Booked" chip and a disabled "Book this room" ("Booked for these dates"). Guests and visitors are unchanged.

**Acceptance:** rec.colombo, `/rooms?mode=booking`, dates over current stays → only Colombo rooms; summary "N rooms free, M booked in Colombo"; booked cards disabled. Guest on `/rooms` with the same dates → all branches, branch dropdown, no booked section.

## 16.2 No room statistics for the front desk

**Report:** no counts of rooms by type and status.

**Fix:** receptionist dashboard **Rooms** tab (`RoomStatusBoard`): summary strip (rooms, available tonight, occupied with % in service, maintenance), a by-type table with totals, and a room list filtered by status that names the in-house guest and departure date. Built from `GET /rooms?branch_id=` and `GET /bookings?status=Checked-In`. `/reports/*` stays manager/admin only (billing and revenue are not front-desk data).

## 16.3 No way to look up or correct a guest

**Report:** the receptionist can't see guest information.

**Root cause:** the API had search, profile + history and update (`GET /guests`, `GET /guests/:id`, `PUT /guests/:id`), but the UI only used search inside the booking picker.

**Fix:** **Guests** tab (`GuestDirectory`): search, profile drawer with booking history, **Edit details** via `GuestFormDrawer` in edit mode. `GET /guests/:id` history now includes `branch_name` (room numbers repeat across branches). Spec 02 documents both guest endpoints' responses.

**Known limit:** `PUT /guests/:id` ignores nulls, so an optional field (nationality, date of birth, company) can be changed but not cleared.

## 16.4 Services can't be browsed

**Report:** neither guests nor receptionists can see the available services.

**Fix:** read-only `ServicePriceList` (`GET /services`, already open to both roles): a searchable **Services** tab for the front desk, and a collapsed "Services during your stay" list under Upcoming in My bookings ("Ask the front desk…", since adding usage stays staff-only).
