// =============================================================================
// frontend/src/pages/BookingCheckout.jsx
// =============================================================================
// Purpose:
//   Booking form page where a guest (or receptionist on their behalf) creates
//   a new room booking. Route: GET /booking/:roomId
//   Access: guest, receptionist, manager (Protected).
//
// What to implement here (see docs/specs/09_frontend_pages.md §4):
//
//   1. Room Details Panel (left):
//      - Fetch room detail from GET /api/rooms/:roomId.
//      - Display: room type, capacity, branch, amenities, current daily rate.
//
//   2. Booking Form (right):
//      - Guest selector:
//          If current user is a guest → auto-fill from AuthContext (guest_id).
//          If current user is receptionist/manager → searchable guest dropdown
//          from GET /api/guests.
//      - Check-in date picker (min: today).
//      - Check-out date picker (min: check_in_date + 1 day).
//      - Payment method selector (Cash, Card, Bank Transfer, etc.).
//      - Live cost preview: "X nights × LKR Y = LKR Z" (computed client-side).
//
//   3. <BookingSummary /> component showing the live preview.
//
//   4. Submit button → POST /api/bookings
//      - On success: navigate to /dashboard/receptionist or /rooms (for guests).
//      - On error (double-booking): show error message from API response.
//
// API calls:
//   GET  /api/rooms/:roomId  → room details
//   GET  /api/guests         → guest dropdown (receptionist only)
//   POST /api/bookings       → create booking
//
// Dependencies:
//   - react              (useState)
//   - react-router-dom   (useParams, useNavigate)
//   - ../api/rooms       (getRoom)
//   - ../api/bookings    (createBooking)
//   - ../components/BookingSummary
//   - ../hooks/useAuth   (to determine user role)
// =============================================================================

// TODO: Implement BookingCheckout.jsx
