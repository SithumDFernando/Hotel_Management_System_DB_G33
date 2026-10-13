# SkyNest Hotels / HRGSMS context

Contents: project facts that constrain the UI, screens to build, status and formatting rules, API behaviours the UI must respect, branch identity proposals, scope notes to confirm.

Read this only when the work is for SkyNest Hotels. The facts below come from the project brief and SRS and from the team's own schema decisions; where they disagree, prefer the team's latest decisions and tell the user.

## Constraints from the project

- Fictional regional chain with three branches: Colombo, Kandy, Galle. Currency LKR. Time zone Asia/Colombo.
- The system is database-first. All logic (double-booking prevention, billing, status transitions, partial-payment flagging) lives in PostgreSQL via procedures, triggers, constraints. The UI is a thin client and a test harness; the examiners grade that it does not re-implement logic.
- Stack: static vanilla HTML/CSS/JS on a CDN host, FastAPI backend calling stored procedures with raw SQL, PostgreSQL. No JSX or frameworks.
- Access control is per-role database credentials; the UI adapts to the role the API reports but does not enforce security.
- Guest and login are separate concepts: a guest (customer profile, NIC/passport) may have no login (walk-in). Staff sign in with user accounts. The public site has no guest login unless the user asks for one.
- Tax: 15% VAT and 1% Tourism Levy are applied by the billing procedure. The UI displays the lines the API returns and never calculates them.
- Loyalty discount was dropped by the team. Do not design a loyalty badge, loyalty field or discount banner. If the API still returns a discount line, render it as returned; otherwise show nothing.
- Late checkout (after 12:00) is a service-style line on the bill if the system records it. Render it when present.
- Price snapshots: service lines show the unit price at the time of use, not today's catalogue price.

## Screens required by the SRS

1. Branch and room dashboard: rooms per branch with status and filter by room type. Build this as the occupancy chart plus a simple list view toggle.
2. Guest registration: name, NIC/passport (unique), date of birth, nationality, phone, email, type Individual or Corporate. Corporate adds company name, registration number, billing contact. Show or hide corporate fields based on type; show the uniqueness error clearly.
3. Booking form: guest, branch, room, dates, payment method. Server validates overlap.
4. Check-in screen.
5. Service usage entry.
6. Checkout and billing screen with itemised bill and payment entry.
7. Reports screen: the five reports (occupancy, guest billing summary with unpaid balances, service usage breakdown per room and type, monthly revenue per branch, top services and preference trends).

Add one more that the SRS implies but does not list: a staff sign-in screen, and a "Today" landing view (arrivals, departures, in-house, balances due).

## Formatting and status rules (from the SRS)

- Money: LKR, two decimals, thousands separators.
- Dates: DD/MM/YYYY in the UI (ISO 8601 in the database and API).
- Status colour coding: green Available, amber Occupied, red Outstanding balance. Always accompanied by a text label. Extend with the booking statuses using the table in `management-console.md`.
- Booking statuses: Booked, Checked-In, Checked-Out, Cancelled. Room statuses: Available, Occupied, Under Maintenance.
- Payment methods: Cash, Card, Bank Transfer.
- Service categories: Room Service, Spa, Laundry, Minibar, Transport, Other. Minimum catalogue: Room Service, Spa Treatment, Laundry, Minibar, Airport Transfer, Extra Bed.

## Errors the UI must translate

| Database behaviour                                         | Plain message pattern                         |
| ---------------------------------------------------------- | --------------------------------------------- |
| Overlapping booking rejected (exclusion constraint)        | Say which room and which existing dates clash |
| Checkout with balance greater than zero rejected           | Show the balance and offer "Take payment"     |
| Service usage on a booking that is not Checked-In rejected | Say the booking must be checked in first      |
| Check-out date not after check-in date                     | Say stays are at least one night              |
| Duplicate NIC/passport                                     | Say a guest exists and offer to open it       |
| Delete blocked by existing bookings                        | Say what depends on it                        |

## Branch identity proposals

These are starting proposals for the design plan, not facts. Replace or refine them with the user's own knowledge of the towns, and keep layout, type and components identical across branches. One accent colour and one drawn motif per branch.

| Branch  | Setting to draw from                                                                                        | Motif idea                                             | Accent direction                                |
| ------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------- |
| Colombo | Port and commercial capital; sea at the western edge; railway and street grid; humid, bright, monsoon light | A harbour-and-rail line plan or a street-grid fragment | A deep sea-blue or harbour teal                 |
| Kandy   | Hill capital around a lake; hills in every direction; tea country; red-tiled roofs; mist                    | Elevation contour lines of the hills around the lake   | A tea-terrace green or hill-mist grey-green     |
| Galle   | Dutch-era fort on a headland; ramparts and bastions; laterite and coral stone; sea on three sides           | A bastion-and-rampart plan outline                     | A weathered laterite red-ochre or sea-salt grey |

Use the motif as a drawn element in the branch page header, room-plan frames and the console's branch selector chip, not as wallpaper. Check that the three accents remain distinguishable for colour-blind users by also varying the motif and the branch name label.

## Public site scope note

The SRS describes HRGSMS as an internal operations system, "not a guest-facing online booking portal". The user has asked for a public page. Treat the public site as a showcase plus availability check and reservation enquiry that staff confirm, unless the user says they want live online booking. State this assumption in the hand-off.

## Demo data to design against

Three branches; at least 10 rooms of mixed types (Single, Double, Suite); six services; five guests (mix of Individual and Corporate); eight bookings covering all four statuses including a cancellation; service usage on several bookings; at least three partial payments. Build UI states around that data so the empty, partial and full cases are all visible.
