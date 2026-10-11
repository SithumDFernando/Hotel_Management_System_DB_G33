import client from './client';

// -> [{ category, services: [ServiceOut] }] (active services only)
export const getServices = (signal) => client.get('/services', { signal }).then((r) => r.data);

export const createService = (payload) => client.post('/services', payload).then((r) => r.data);
export const updateService = (id, payload) => client.patch(`/services/${id}`, payload).then((r) => r.data);

// -> { booking_id, usages: ServiceUsageOut[], grand_total }
export const getUsage = (bookingId, signal) => client.get(`/services/${bookingId}/usage`, { signal }).then((r) => r.data);

export const addUsage = (bookingId, payload) => client.post(`/services/${bookingId}/usage`, payload).then((r) => r.data);
