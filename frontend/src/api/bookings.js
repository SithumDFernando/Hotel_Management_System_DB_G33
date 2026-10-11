import client from './client';

const clean = (p) => Object.fromEntries(Object.entries(p).filter(([, v]) => v !== '' && v != null));

export const createBooking = (payload) => client.post('/bookings', payload).then((r) => r.data);

// -> { bookings: BookingListOut[], total, page, per_page }
// BookingListOut: { booking_id, guest{guest_id,full_name}, room{room_id,room_number,branch_name,type_name},
//                   check_in_date, check_out_date, rate_at_booking, status, payment_option }
export const listBookings = (params = {}, signal) =>
  client.get('/bookings', { params: clean({ per_page: 100, ...params }), signal }).then((r) => r.data);

export const getBooking = (id, signal) => client.get(`/bookings/${id}`, { signal }).then((r) => r.data);

export const cancelBooking = (id, reason) => client.patch(`/bookings/${id}/cancel`, { reason }).then((r) => r.data);
export const checkInBooking = (id) => client.patch(`/bookings/${id}/checkin`).then((r) => r.data);
export const checkOutBooking = (id) => client.patch(`/bookings/${id}/checkout`).then((r) => r.data);
