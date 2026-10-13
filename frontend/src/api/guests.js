import client from './client';

export const searchGuests = (search, signal) =>
  client.get('/guests', { params: search ? { search } : {}, signal }).then((r) => r.data);

export const createGuest = (payload) => client.post('/guests', payload).then((r) => r.data);

export const getGuest = (id, signal) => client.get(`/guests/${id}`, { signal }).then((r) => r.data);
