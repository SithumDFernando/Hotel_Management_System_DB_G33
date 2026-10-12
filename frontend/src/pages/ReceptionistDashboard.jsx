// =============================================================================
// frontend/src/pages/ReceptionistDashboard.jsx
// =============================================================================
// Purpose:
//   Daily operations hub for front desk / receptionist staff. Provides a
//   tabbed interface covering all common front-desk tasks for the current
//   working day. Route: GET /dashboard/receptionist
//   Access: receptionist (Protected).
//
// Tabs/Sections to implement (see docs/specs/09_frontend_pages.md §6):
//
//   Tab 1 — "Today's Arrivals"
//     - Bookings with check_in_date = today AND status = 'Booked'.
//     - API: GET /api/bookings?status=Booked&check_in=<today>
//     - Action: "Check In" button per booking → calls checkIn(bookingId).
//
//   Tab 2 — "Current Guests"
//     - Bookings with status = 'Checked-In'.
//     - API: GET /api/bookings?status=Checked-In
//     - Actions: "Add Services" link → /services/:bookingId
//               "Generate Bill" button → POST /api/billing/:id/generate
//               "Check Out" button → calls checkOut(bookingId)
//
//   Tab 3 — "Today's Departures"
//     - Bookings with check_out_date = today.
//     - API: GET /api/bookings?check_out=<today>
//
//   Tab 4 — "Billing & Payments"
//     - Select a booking → show <BillTable /> with payment history.
//     - "Record Payment" form: amount + method → POST /api/payments.
//
//   Tab 5 — "Guest Registration"
//     - Inline form to register a new guest: POST /api/guests.
//     - Fields: full_name, NIC/passport, email, phone, guest_type, etc.
//
// Components used: BookingSummary, BillTable
//
// Dependencies:
//   - react              (useState, useEffect)
//   - ../api/bookings    (getBookings, checkIn, checkOut)
//   - ../api/billing     (generateBill, getBill, recordPayment)
//   - ../components/BookingSummary, BillTable
//   - ../utils/formatters
// =============================================================================

// TODO: Implement ReceptionistDashboard.jsx
