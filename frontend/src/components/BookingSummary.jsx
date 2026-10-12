// =============================================================================
// frontend/src/components/BookingSummary.jsx
// =============================================================================
// Purpose:
//   Displays a structured summary of a booking — room info, guest name, dates,
//   and cost preview. Used in two contexts:
//     1. BookingCheckout page: as a live cost preview before submitting.
//     2. ReceptionistDashboard: as a read-only summary card per booking.
//
// Props:
//   booking: {
//     booking_id:       string (UUID)
//     guest_name:       string        — full name of the guest
//     room_number:      string        — e.g. "101"
//     room_type:        string        — e.g. "Suite"
//     branch_name:      string        — e.g. "Colombo"
//     check_in_date:    string        — ISO date "YYYY-MM-DD"
//     check_out_date:   string        — ISO date "YYYY-MM-DD"
//     rate_at_booking:  number        — nightly rate in LKR
//     status:           string        — booking_status enum value
//     payment_option:   string        — payment method label
//   }
//   showActions: boolean (optional)   — whether to show check-in/out buttons
//   onCheckIn:   function (optional)  — callback for check-in button
//   onCheckOut:  function (optional)  — callback for check-out button
//
// What to implement here:
//   - Display all booking fields in a clean summary card layout.
//   - Calculate and display: nights = check_out - check_in, subtotal = rate × nights.
//     Use formatters.js for currency display (e.g. "LKR 45,000.00").
//   - Status badge (colour-coded by booking_status enum value).
//   - Conditionally render action buttons (check-in / check-out) if showActions=true
//     and the booking is in the appropriate state.
//
// Dependencies:
//   - ../utils/formatters (formatCurrency, formatDate, calculateNights)
// =============================================================================

// TODO: Implement BookingSummary.jsx
