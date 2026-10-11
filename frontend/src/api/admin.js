import client from './client';

// Admin-only endpoints (docs/specs/02_api_contract.md §10).
// listBranches -> { branches: [{ branch_id, name, city, address, phone, manager_name, total_rooms, active_bookings }], total }
export const listBranches = (signal) => client.get('/admin/branches', { signal }).then((r) => r.data);
export const createBranch = (payload) => client.post('/admin/branches', payload).then((r) => r.data);
export const updateBranch = (id, payload) => client.put(`/admin/branches/${id}`, payload).then((r) => r.data);

// listUsers -> { users: [{ account_id, email, role, branch_id, branch_name, guest_id, guest_name }], total }
export const listUsers = (signal) => client.get('/admin/users', { signal }).then((r) => r.data);
export const createUser = (payload) => client.post('/admin/users', payload).then((r) => r.data);
// branch_id: '' clears the branch assignment.
export const patchUser = (id, payload) => client.patch(`/admin/users/${id}`, payload).then((r) => r.data);
