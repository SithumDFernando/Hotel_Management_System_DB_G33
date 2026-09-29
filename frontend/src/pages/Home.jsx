// =============================================================================
// frontend/src/pages/Home.jsx
// =============================================================================
// Purpose:
//   Public landing page — the first impression of SkyNest. Showcases the
//   hotel brand, branch locations, and featured room types to encourage
//   visitors to browse and book. Route: GET /
//
// Sections to implement (see docs/specs/09_frontend_pages.md §1):
//   1. Hero Banner
//      - Full-width background image with hotel name + tagline overlay.
//      - Prominent "Browse Rooms" CTA button → navigates to /rooms.
//
//   2. Branch Showcase
//      - Cards for each branch (Colombo, Kandy, Galle) showing:
//        city, address, phone, manager name.
//      - Data from: GET /api/admin/branches (via api/rooms.js or a new api/admin.js).
//
//   3. Room Type Highlights
//      - 3–4 room type cards with type name, capacity, sample daily rate, amenities.
//      - Data from: GET /api/rooms (a small sample — limit=4, status=Available).
//      - Each card has a "Book Now" link to /rooms for discovery.
//
// API calls:
//   - GET /api/rooms            → featured room sample
//   - GET /api/admin/branches   → branch info for showcase
//
// Components used: Navbar (via Layout), RoomCard
//
// Dependencies:
//   - react-router-dom (Link)
//   - ../api/rooms     (getRooms)
//   - ../components/RoomCard
//   - ../hooks/useFetch
// =============================================================================

// TODO: Implement Home.jsx
