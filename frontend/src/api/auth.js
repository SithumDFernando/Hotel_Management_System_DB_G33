import client from './client';

export const login = (email, password) =>
  client.post('/auth/login', { email, password }).then((r) => r.data);

export const getMe = () => client.get('/auth/me').then((r) => r.data);

// Guest self-signup: creates guest profile + account in one call.
export const signup = (payload) => client.post('/auth/signup', payload).then((r) => r.data);

export const getBranches = () => client.get('/branches').then((r) => r.data);
