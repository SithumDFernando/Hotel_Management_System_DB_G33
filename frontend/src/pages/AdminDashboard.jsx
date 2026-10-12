// =============================================================================
// frontend/src/pages/AdminDashboard.jsx
// =============================================================================
// Purpose:
//   System-wide administration panel for admin users. Provides full CRUD for
//   branches and user accounts, plus access to all reports across all branches
//   (not branch-scoped like the manager). Route: GET /dashboard/admin
//   Access: admin (Protected).
//
// Tabs/Sections to implement (see docs/specs/09_frontend_pages.md §8):
//
//   Tab 1 — "Branches"
//     - Table of all branches with edit/delete actions.
//     - "Add Branch" form: name, city, address, phone, manager_name.
//     - API:
//         GET    /api/admin/branches       → list
//         POST   /api/admin/branches       → create
//         PUT    /api/admin/branches/:id   → update (inline edit or modal)
//         DELETE /api/admin/branches/:id   → delete (with confirmation)
//
//   Tab 2 — "User Accounts"
//     - Table of all user accounts with role badge and branch assignment.
//     - "Create User" form: email, password, role, branch_id (if staff), guest_id (if guest).
//     - "Change Role" inline dropdown per user.
//     - "Deactivate/Delete" button per user (with confirmation).
//     - API:
//         GET    /api/admin/users          → list all accounts
//         POST   /api/admin/users          → create staff/admin account
//         PATCH  /api/admin/users/:id      → update role or branch
//         DELETE /api/admin/users/:id      → deactivate/delete
//
//   Tab 3 — "System Reports"
//     - All 5 reports unscoped (no branch filter applied) — admin sees all branches.
//     - Re-uses <ReportTable> component.
//     - Includes a branch filter dropdown for optional narrowing.
//
//   Tab 4 — "All Bookings"
//     - Cross-branch booking search: filter by status, date, branch, guest.
//     - API: GET /api/bookings (admin sees all)
//
// Components used: ReportTable
//
// Dependencies:
//   - react                  (useState)
//   - ../api/reports         (all report functions)
//   - ../api/bookings        (getBookings)
//   - ../components/ReportTable
//   - ../utils/formatters
// =============================================================================

// TODO: Implement AdminDashboard.jsx
