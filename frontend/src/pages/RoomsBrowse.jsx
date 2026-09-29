// =============================================================================
// frontend/src/pages/RoomsBrowse.jsx
// =============================================================================
// Purpose:
//   Public browse page where users search and filter available hotel rooms
//   across branches. Route: GET /rooms
//
// What to implement here (see docs/specs/09_frontend_pages.md §2):
//
//   1. Filter Panel (left sidebar or top bar):
//      - Branch dropdown (populated from GET /api/admin/branches)
//      - Room type dropdown (e.g. Suite, Double, Single)
//      - Check-in date picker
//      - Check-out date picker
//      - Minimum capacity selector
//      - "Search" button that triggers a new API call with applied filters
//
//   2. Room Grid:
//      - Renders a <RoomCard /> for each room in the result set.
//      - Loading skeleton while fetching.
//      - Empty state message: "No rooms available for your selected dates."
//
//   3. Behaviour:
//      - On page load, fetch all available rooms (no filters).
//      - On filter submit, re-fetch with query params:
//          GET /api/rooms?branch_id=&check_in=&check_out=&status=Available
//      - Only show rooms with status=Available (the API/DB handles date overlap).
//
// API calls:
//   GET /api/rooms (with filter params)
//   GET /api/admin/branches (for branch dropdown)
//
// Components used: Navbar (Layout), RoomCard
//
// Dependencies:
//   - react              (useState)
//   - ../api/rooms       (getRooms)
//   - ../components/RoomCard
// =============================================================================

// TODO: Implement RoomsBrowse.jsx
