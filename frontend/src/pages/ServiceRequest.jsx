// =============================================================================
// frontend/src/pages/ServiceRequest.jsx
// =============================================================================
// Purpose:
//   Page for receptionists and managers to add chargeable hotel services to
//   a currently checked-in booking. Route: GET /services/:bookingId
//   Access: receptionist, manager (Protected).
//
// What to implement here (see docs/specs/09_frontend_pages.md §5):
//
//   1. Booking Info Header:
//      - Fetch booking from GET /api/bookings/:bookingId.
//      - Display: guest name, room number, branch, check-in/out dates, status.
//      - Show a warning if booking is not in 'Checked-In' status (services
//        cannot be added — the DB trigger will also block it).
//
//   2. Service Catalogue:
//      - Fetch services from GET /api/services.
//      - Group by category (F&B, Wellness, Housekeeping, Transport, etc.).
//      - Each service row shows: name, base_price, quantity spinner, "Add" button.
//      - On "Add": POST /api/services/:bookingId/usage
//          body: { service_id, usage_date: today, quantity }
//      - Show success/error toast notification after adding.
//
//   3. Current Usage Table:
//      - Fetch service_usage from GET /api/services/:bookingId/usage.
//      - Display: service name, date, quantity, unit_price, line total.
//      - Running total shown at the bottom.
//      - Refresh this table after each successful service addition.
//
// API calls:
//   GET  /api/bookings/:bookingId             → booking details
//   GET  /api/services                         → service catalogue
//   GET  /api/services/:bookingId/usage        → current usage list
//   POST /api/services/:bookingId/usage        → add a service
//
// Dependencies:
//   - react              (useState)
//   - react-router-dom   (useParams)
//   - ../api/bookings    (getBooking)
//   - ../api/services    (getServices, getServiceUsage, addServiceUsage)
//   - ../utils/formatters (formatCurrency, formatDate)
// =============================================================================

// TODO: Implement ServiceRequest.jsx
