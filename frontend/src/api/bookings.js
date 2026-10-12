// =============================================================================
// frontend/src/api/bookings.js
// =============================================================================
// Purpose:
//   API functions for all booking lifecycle operations: creating a booking,
//   fetching bookings (with filters), and performing check-in/check-out/cancel.
//   Used primarily by the ReceptionistDashboard and BookingCheckout pages.
//
// Functions to implement:
//
//   export async function getBookings(params = {})
//     // GET /api/bookings?status=&guest_id=&check_in=&check_out=&...
//     // params: { status, guest_id, room_id, check_in, check_out, branch_id }
//
//   export async function getBooking(bookingId)
//     // GET /api/bookings/:bookingId — full detail with guest, room, bill
//
//   export async function createBooking(data)
//     // POST /api/bookings
//     // data: { guest_id, room_id, check_in_date, check_out_date, payment_option }
//
//   export async function checkIn(bookingId)
//     // PATCH /api/bookings/:bookingId/checkin
//     // Triggers perform_checkin() stored procedure
//
//   export async function checkOut(bookingId)
//     // PATCH /api/bookings/:bookingId/checkout
//     // Triggers perform_checkout() stored procedure
//
//   export async function cancelBooking(bookingId)
//     // PATCH /api/bookings/:bookingId/cancel
//
// API contract:
//   GET    /api/bookings                     → list (filterable)
//   GET    /api/bookings/:id                 → detail
//   POST   /api/bookings                     → create
//   PATCH  /api/bookings/:id/checkin         → check in
//   PATCH  /api/bookings/:id/checkout        → check out
//   PATCH  /api/bookings/:id/cancel          → cancel
//
// Dependencies:
//   - ./client
// =============================================================================

// TODO: Implement api/bookings.js
