# Management console

Contents: design stance, shell and navigation, the occupancy chart, booking flow, check-in, service entry, checkout and folio, payments and balance flags, reports, tables and forms, status system, errors, realistic data.

## Design stance

Staff use this for hours, mid-conversation with a guest. Optimise for speed, certainty and glanceability. The console should feel like a well-made instrument: calm, dense, legible. It shares the hotel's tokens (colour family, type families) but expresses them quietly: neutral surfaces, one accent for primary actions, status colours reserved for status.

Do not build the standard admin template: purple-blue gradient, rounded white cards on grey, four KPI tiles with sparklines, a donut chart, a twelve-icon sidebar.

## Shell and navigation

- A narrow, text-labelled navigation (icons optional, never icon-only). Items are the real tasks: Rooms, Bookings, Guests, Services, Billing, Reports. Show only what the signed-in role may use (role comes from the API).
- A persistent branch selector for roles that span branches; branch-bound roles see their branch fixed in the header.
- A global search for guest by name, NIC/passport or phone, reachable by keyboard (`/`). Results are rows, not cards.
- The page title states where you are and, on detail screens, which booking or guest.

## The occupancy chart (the signature view)

The classic front-desk tape chart: rooms as rows, dates as columns, each booking a bar spanning check-in to check-out.

Why it is the centrepiece: it makes double-booking impossible to miss, shows gaps at a glance, and is the one view a manager recognises instantly. It is also the right visual for the occupancy report.

Build notes:

- Rows grouped by branch then room type; sticky room label column; sticky date header; today column marked with a line and the word "Today".
- Booking bars carry the guest surname and booking id; the bar's fill and edge encode status (Booked, Checked-In, Checked-Out, Cancelled) using the status system below, plus a text/shape cue so colour is not the only signal.
- Under-maintenance rooms render as a hatched block with the word "Maintenance".
- Clicking an empty cell starts a booking prefilled with room and date; clicking a bar opens the booking panel (side panel, not a new page).
- Range selector: 7, 14, 30 days. Keep the chart in an overflow container; the page itself never scrolls sideways.
- When the API rejects an overlapping booking, flash the conflicting bar and say which booking it clashes with. Do not detect overlaps in the browser to decide validity; the server decides, the client shows.
- Implement in inline SVG or CSS grid with vanilla JS. Handle 10 rooms for the demo, but structure for 500 rooms: render only visible rows if volume demands.

## Booking flow

One screen, not a wizard: guest (search or register inline), branch, room type, dates, payment method. After choosing dates and branch, fetch available rooms from the API and list them with daily rate. Show the server's response for number of nights and room charge estimate; do not compute it locally. Primary action: "Create booking".

## Check-in

A short list of today's arrivals (status Booked, check-in today) with one action each: "Check in". Confirm in place; on success change the row's status chip and show "Checked in" with the room number. If the API rejects (booking not in Booked status), say why.

## Service entry

Only bookings in Checked-In status can receive charges, so start from in-house guests: search by room number or guest name. Form: service (from the catalogue), quantity, date. Show the catalogue price as information, and state that the price recorded is the price at the time of entry (the server snapshots it). After saving, append the line to the visible usage list for that booking.

## Checkout and folio

The bill is a folio: a receipt-like, itemised layout.

- Header: guest, room, branch, dates.
- Lines: room charge (rate and nights as returned), each service line (name, date, quantity, unit price at usage, line total), any discount or late-checkout line the server returns, tax lines as returned, total.
- Right-aligned tabular numerals, LKR with two decimals, a clear rule above the total.
- Below: amount paid, balance due. If balance due is greater than zero, a prominent "Balance due" block with the amount and a "Take payment" action. "Check out" is disabled while a balance is due, with a visible reason, but the server remains the enforcer: if the client is stale and the API rejects the checkout, show that message.
- Every figure comes from the API (`calculate_bill` result). No JavaScript arithmetic on money beyond display formatting.

## Payments and balance flags

Payment form: amount, method (Cash, Card, Bank Transfer). After posting, refresh the bill from the API and show the new balance. Partial payments are normal, so show the payment history as a short list under the folio (date, method, amount). The outstanding flag appears in booking lists as a text chip ("Balance due") with the amount, in the red status colour, never as colour alone.

## Reports

Five reports; each is a query screen with a small control strip (period, branch, optional filters) and a result table. Add a chart only where it earns its place:

- **Occupancy**: the occupancy chart restricted to the selected period, plus a table export-ready.
- **Guest billing summary**: table with balance-due rows visually first or flagged; filter "outstanding only".
- **Service usage breakdown**: table by room and service category; a horizontal bar chart is acceptable if it makes comparison faster than the table.
- **Monthly revenue per branch**: grouped bars by branch, split into room and service revenue, with the table beneath carrying the exact figures including tax and discounts as returned.
- **Top services**: ranked list with revenue and usage count; bars inline in the table rows, not a separate donut.

Charts are inline SVG built with vanilla JS from API data. Label axes with units (LKR), start bars at zero, direct-label values, avoid 3D and gradient fills.

## Tables and forms

- Row height compact but touch-safe; zebra striping optional, hairline row dividers preferred.
- Numerals right-aligned and tabular; text left-aligned; status chips in a consistent column.
- Sortable headers where meaningful, with an indicator and `aria-sort`.
- Forms: labels above fields, inline errors beneath the field, primary action at the end of the form in reading order, destructive actions (Cancel booking) separate and confirmed with a sentence stating the consequence ("Cancel booking 1042? The room is released.").

## Status system

Define status once in the shared tokens and reuse everywhere.

| State             | Meaning                     | Colour role       | Text cue                  |
| ----------------- | --------------------------- | ----------------- | ------------------------- |
| Available         | Room free                   | green             | "Available"               |
| Occupied          | Room in use                 | amber             | "Occupied"                |
| Under Maintenance | Out of service              | neutral, hatched  | "Maintenance"             |
| Booked            | Reservation not yet arrived | blue-neutral      | "Booked"                  |
| Checked-In        | Guest in house              | amber/strong      | "Checked in"              |
| Checked-Out       | Stay complete               | quiet grey        | "Checked out"             |
| Cancelled         | Cancelled                   | grey, struck edge | "Cancelled"               |
| Balance due       | Outstanding payment         | red               | "Balance due" plus amount |

Check each pairing at AA contrast on both light and tinted backgrounds.

## Errors

Map server errors to specific messages. Examples of the pattern (adapt wording to the real API responses):

- Overlap: "Room 204 is already booked from 12/11/2026 to 15/11/2026 (booking 1031). Choose other dates or another room."
- Checkout blocked: "Balance due: LKR 18,400.00. Take payment before checking out."
- Service on wrong status: "This booking is not checked in, so services can't be added yet."
- Duplicate NIC/passport: "A guest with this NIC/passport already exists. Open their record instead."

Errors appear next to the control that caused them, stay until corrected, and are announced to assistive tech (`role="alert"`).

## Realistic data for demos

Console screens look wrong with three tidy rows. Seed the UI (or the mock API layer during design) with enough realistic volume: 10 to 40 bookings across statuses, one cancelled, several partial payments, a bill with a dozen service lines. Use plausible Sri Lankan names across communities, believable LKR amounts, and dates relative to today. Do not use "John Doe", "Test User", round numbers everywhere, or NIC numbers that look real.
