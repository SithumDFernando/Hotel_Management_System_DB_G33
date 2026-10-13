import client from './client';

// Every report responds { report: Row[], total }. Managers are auto-scoped to
// their own branch by the backend; admins may pass branch_id.
const clean = (p) => Object.fromEntries(Object.entries(p).filter(([, v]) => v !== '' && v != null && v !== false));
const get = (path) => (params = {}, signal) =>
  client.get(`/reports/${path}`, { params: clean(params), signal }).then((r) => r.data.report);

export const getOccupancy = get('occupancy'); // { branch_id, date | from_date,to_date }
export const getBillingSummary = get('billing-summary'); // { branch_id, unpaid_only }
export const getServiceUsage = get('service-usage'); // { branch_id }
export const getMonthlyRevenue = get('monthly-revenue'); // { year (required), month, branch_id }
export const getTopServices = get('top-services'); // { limit, branch_id }
