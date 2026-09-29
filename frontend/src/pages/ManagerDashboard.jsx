// =============================================================================
// frontend/src/pages/ManagerDashboard.jsx
// =============================================================================
// Purpose:
//   Branch performance overview and reporting hub for managers. Shows key
//   metrics for their assigned branch and provides access to all 5 management
//   reports. Route: GET /dashboard/manager
//   Access: manager (Protected).
//
//   Managers are branch-scoped: the API automatically filters all report data
//   to their assigned branch_id (set at login time on the JWT payload).
//
// Tabs/Sections to implement (see docs/specs/09_frontend_pages.md §7):
//
//   Tab 1 — "Branch Overview" (default/home tab)
//     - KPI cards: total rooms, current occupancy %, today's revenue.
//     - API: GET /api/reports/occupancy?date=<today>
//
//   Tab 2 — "Occupancy Report"
//     - Date-range picker (from_date, to_date) → filter button.
//     - <ReportTable> showing v_room_occupancy data for selected period.
//     - API: GET /api/reports/occupancy?from_date=&to_date=
//
//   Tab 3 — "Revenue Report"
//     - Month + year selector.
//     - <ReportTable> showing v_monthly_revenue data.
//     - Optional: bar chart using recharts or Chart.js.
//     - API: GET /api/reports/monthly-revenue?year=&month=
//
//   Tab 4 — "Billing Summary"
//     - Toggle: "All guests" vs "Unpaid only" (balance_flag=true).
//     - <ReportTable> showing v_guest_billing_summary.
//     - API: GET /api/reports/billing-summary
//
//   Tab 5 — "Service Analytics"
//     - <ReportTable> for v_top_services (top 10 services by usage).
//     - <ReportTable> for v_service_usage_breakdown (per room).
//     - API: GET /api/reports/top-services, GET /api/reports/service-usage
//
// Components used: ReportTable
//
// Dependencies:
//   - react                  (useState)
//   - ../api/reports         (all report functions)
//   - ../components/ReportTable
//   - ../utils/formatters
// =============================================================================

// TODO: Implement ManagerDashboard.jsx
