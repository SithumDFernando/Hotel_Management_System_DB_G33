// =============================================================================
// frontend/src/components/RoomCard.jsx
// =============================================================================
// Purpose:
//   Reusable card component that displays a summary of a single hotel room.
//   Used in a grid layout on the Home page (featured rooms) and the
//   RoomsBrowse page (filterable room listing).
//
// Props:
//   room: {
//     room_id:     string (UUID)   — used in the "Book Now" link
//     room_number: string          — e.g. "101"
//     room_type:   string          — e.g. "Suite"
//     capacity:    number          — number of guests
//     daily_rate:  number          — rate in LKR
//     status:      string          — "Available" | "Occupied" | "Maintenance"
//     branch_name: string          — e.g. "Colombo"
//     amenities:   string[]        — list of amenity names
//   }
//
// What to implement here:
//   - Room type name + branch as card header.
//   - Capacity and daily rate displayed prominently.
//   - Amenity tags/badges (WiFi icon, TV, Mini-bar, etc.).
//   - Availability badge: green "Available", red "Occupied", yellow "Maintenance".
//   - "Book Now" button that navigates to /booking/:roomId.
//     (Only show the button when status === "Available")
//
// Example structure:
//   <div className="room-card">
//     <div className="room-card-header">...</div>
//     <div className="room-card-body">
//       <p>Capacity: {room.capacity} guests</p>
//       <p>LKR {room.daily_rate.toLocaleString()} / night</p>
//       <div className="amenities">...</div>
//     </div>
//     <div className="room-card-footer">
//       <span className={`badge badge--${room.status.toLowerCase()}`}>{room.status}</span>
//       {room.status === 'Available' && <Link to={`/booking/${room.room_id}`}>Book Now</Link>}
//     </div>
//   </div>
//
// Dependencies:
//   - react-router-dom (Link)
//   - ../utils/formatters (formatCurrency — for LKR formatting)
// =============================================================================

// TODO: Implement RoomCard.jsx
