// =============================================================================
// frontend/src/api/reports.js
// =============================================================================
// Purpose:
//   API functions for fetching the 5 management reports. These reports are
//   backed by PostgreSQL views (v_room_occupancy, v_guest_billing_summary, etc.)
//   and consumed by the ManagerDashboard and AdminDashboard pages.
//
// Functions to implement:
//
//   export async function getOccupancyReport(params = {})
//     // GET /api/reports/occupancy
//     // params: { date?, from_date?, to_date?, branch_id? }
//     // Returns: rows from v_room_occupancy
//
//   export async function getBillingSummary(params = {})
//     // GET /api/reports/billing-summary
//     // params: { branch_id?, balance_flag? }
//     // Returns: rows from v_guest_billing_summary
//
//   export async function getServiceUsageReport(params = {})
//     // GET /api/reports/service-usage
//     // params: { branch_id?, from_date?, to_date? }
//     // Returns: rows from v_service_usage_breakdown
//
//   export async function getMonthlyRevenue(params = {})
//     // GET /api/reports/monthly-revenue
//     // params: { year, month, branch_id? }
//     // Returns: rows from v_monthly_revenue
//
//   export async function getTopServices(params = {})
//     // GET /api/reports/top-services
//     // params: { branch_id?, limit? }
//     // Returns: rows from v_top_services
//
// API contract:
//   GET /api/reports/occupancy           → Report 1 (Room Occupancy)
//   GET /api/reports/billing-summary     → Report 2 (Guest Billing Summary)
//   GET /api/reports/service-usage       → Report 3 (Service Usage Breakdown)
//   GET /api/reports/monthly-revenue     → Report 4 (Monthly Revenue)
//   GET /api/reports/top-services        → Report 5 (Top-Used Services)
//
// Dependencies:
//   - ./client
// =============================================================================

// TODO: Implement api/reports.js
