import client from './client';

export const login = (email, password) =>
  client.post('/auth/login', { email, password }).then((r) => r.data);

export const getMe = () => client.get('/auth/me').then((r) => r.data);

// Guest self-signup: creates guest profile + account in one call.
export const signup = (payload) => client.post('/auth/signup', payload).then((r) => r.data);

export const getBranches = () => client.get('/branches').then((r) => r.data);

// Self-service profile: { account_id, email, role, branch_id, branch_name, guest: GuestOut | null }
export const getProfile = (signal) => client.get('/auth/profile', { signal }).then((r) => r.data);

// Guest only: { full_name?, phone?, date_of_birth?, nationality?, gender? } -> GuestOut
export const updateProfile = (payload) => client.patch('/auth/profile', payload).then((r) => r.data);

export const changePassword = (currentPassword, newPassword) =>
  client
    .post('/auth/change-password', { current_password: currentPassword, new_password: newPassword })
    .then((r) => r.data);
