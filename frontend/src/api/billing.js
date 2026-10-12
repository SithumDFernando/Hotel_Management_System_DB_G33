// =============================================================================
// frontend/src/api/billing.js
// =============================================================================
// Purpose:
//   API functions for bill generation and payment recording.
//   Used by the ReceptionistDashboard (generate bill, record payment)
//   and the ManagerDashboard (billing summary report).
//
// Functions to implement:
//
//   export async function generateBill(bookingId)
//     // POST /api/billing/:bookingId/generate
//     // Calls generate_bill() stored procedure in DB.
//     // Returns the full bill object including all charge breakdowns.
//
//   export async function getBill(bookingId)
//     // GET /api/billing/:bookingId
//     // Returns the bill for a booking + all payment transactions.
//
//   export async function recordPayment(data)
//     // POST /api/payments
//     // data: { booking_id, amount, payment_method, notes? }
//     // Calls record_payment() stored procedure — updates outstanding_balance.
//
//   export async function getPayments(bookingId)
//     // GET /api/payments/:bookingId
//     // Returns list of all payment transactions for a booking.
//
// API contract:
//   POST /api/billing/:bookingId/generate    → generate/regenerate bill
//   GET  /api/billing/:bookingId             → get bill with payments
//   POST /api/payments                       → record a payment
//   GET  /api/payments/:bookingId            → list payments for booking
//
// Dependencies:
//   - ./client
// =============================================================================

// TODO: Implement api/billing.js
