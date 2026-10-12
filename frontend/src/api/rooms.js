import client from './client';

// Returns RoomOut[] (nested: branch{}, room_type{}, amenities[]).
// NB: with check_in+check_out the API filters by overlapping bookings only
// (not room.status), so callers must hide Maintenance rooms themselves.
export const getRooms = (params = {}, signal) =>
  client
    .get('/rooms', { params: Object.fromEntries(Object.entries(params).filter(([, v]) => v)), signal })
    .then((r) => r.data.rooms);

export const getRoom = (roomId, signal) => client.get(`/rooms/${roomId}`, { signal }).then((r) => r.data);

export const setRoomStatus = (roomId, status) =>
  client.patch(`/rooms/${roomId}/status`, { status }).then((r) => r.data);
