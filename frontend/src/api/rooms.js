// =============================================================================
// frontend/src/api/rooms.js
// =============================================================================
// Purpose:
//   API functions for fetching room and room-type data.
//   Used by the Home page (featured rooms), RoomsBrowse page (filtered list),
//   and BookingCheckout page (single room detail).
//
// Functions to implement:
//
//   /**
//    * Fetches all available rooms, with optional filters.
//    * @param {Object} params - Filter params passed as URL query strings.
//    * @param {string} [params.branch_id]
//    * @param {string} [params.room_type]
//    * @param {string} [params.check_in]   - ISO date string (YYYY-MM-DD)
//    * @param {string} [params.check_out]  - ISO date string (YYYY-MM-DD)
//    * @param {string} [params.status]     - e.g. "Available"
//    * @returns {Array} List of room objects
//    */
//   export async function getRooms(params = {}) {
//     const response = await client.get('/rooms', { params });
//     return response.data;
//   }
//
//   /**
//    * Fetches a single room by ID with full detail (type, amenities, rate, branch).
//    * @param {string} roomId - UUID of the room
//    * @returns {Object} Room detail object
//    */
//   export async function getRoom(roomId) {
//     const response = await client.get(`/rooms/${roomId}`);
//     return response.data;
//   }
//
//   /**
//    * Updates a room's status (admin/manager only).
//    * @param {string} roomId
//    * @param {string} status - "Available" | "Occupied" | "Maintenance"
//    */
//   export async function updateRoomStatus(roomId, status) {
//     const response = await client.patch(`/rooms/${roomId}/status`, { status });
//     return response.data;
//   }
//
// API contract:
//   GET  /api/rooms                      → list (filterable)
//   GET  /api/rooms/:roomId              → single room detail
//   PATCH /api/rooms/:roomId/status      → update status (protected)
//
// Dependencies:
//   - ./client
// =============================================================================

// TODO: Implement api/rooms.js
