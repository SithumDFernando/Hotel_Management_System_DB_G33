// =============================================================================
// frontend/src/api/services.js
// =============================================================================
// Purpose:
//   API functions for managing hotel services and recording service usage
//   against a checked-in booking. Used by the ServiceRequest page and
//   ManagerDashboard's service analytics section.
//
// Functions to implement:
//
//   export async function getServices()
//     // GET /api/services
//     // Returns all active services grouped by category.
//     // Used to populate the service catalogue on the ServiceRequest page.
//
//   export async function getServiceUsage(bookingId)
//     // GET /api/services/:bookingId/usage
//     // Returns all service_usage rows for the given booking with service names
//     // and subtotals. Used to display "currently added services" in the UI.
//
//   export async function addServiceUsage(bookingId, data)
//     // POST /api/services/:bookingId/usage
//     // data: { service_id, usage_date, quantity }
//     // Adds a service to a checked-in booking. The service_usage_trigger
//     // validates booking status and snapshots unit_price automatically.
//
// API contract:
//   GET  /api/services                        → list all active services
//   GET  /api/services/:bookingId/usage        → service usage for a booking
//   POST /api/services/:bookingId/usage        → add service to booking
//
// Dependencies:
//   - ./client
// =============================================================================

// TODO: Implement api/services.js
