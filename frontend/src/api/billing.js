import client from './client';

// Bill / payment amounts arrive as Decimal *strings* — wrap in Number() when computing.
export const getBill = (bookingId, signal) => client.get(`/billing/${bookingId}`, { signal }).then((r) => r.data);

export const generateBill = (bookingId, discount) =>
  client
    .post(`/billing/${bookingId}/generate`, null, { params: discount != null ? { discount } : {} })
    .then((r) => r.data);

export const getPayments = (bookingId, signal) => client.get(`/payments/${bookingId}`, { signal }).then((r) => r.data);

export const recordPayment = (payload) => client.post('/payments', payload).then((r) => r.data);
