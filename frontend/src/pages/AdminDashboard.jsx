import { useSearchParams } from 'react-router-dom';
import { listBranches } from '@/api/admin';
import useFetch from '@/hooks/useFetch';
import BookingsTab from '@/components/admin/BookingsTab';
import BranchesTab from '@/components/admin/BranchesTab';
import UsersTab from '@/components/admin/UsersTab';
import BranchOverview from '@/components/BranchOverview';
import CatalogueManager from '@/components/CatalogueManager';
import ReportsPanel from '@/components/ReportsPanel';
import RoomManager from '@/components/RoomManager';
import Tabs from '@/components/ui/Tabs';
import { todayISO } from '@/utils/formatters';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'branches', label: 'Branches' },
  { key: 'users', label: 'Accounts' },
  { key: 'reports', label: 'Reports' },
  { key: 'bookings', label: 'Bookings' },
  { key: 'rooms', label: 'Rooms' },
  { key: 'catalogue', label: 'Service catalogue' },
];
// One plain line under the heading: what the tab covers.
const SUBTITLES = {
  overview: 'Occupancy, revenue and money owed.',
  branches: 'Hotels in the group and the details guests see.',
  users: 'Staff and guest sign-ins, with role and branch.',
  reports: 'The five operational reports, for all branches or one.',
  bookings: 'Bookings at every branch.',
  rooms: 'Mark rooms as maintenance or return them to service.',
  catalogue: 'Chargeable services offered at every branch.',
};

export default function AdminDashboard() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.key === params.get('tab')) ? params.get('tab') : 'overview';
  const branchId = params.get('branch') || '';
  const ym = params.get('month') || todayISO().slice(0, 7);

  const branches = useFetch((s) => listBranches(s), []);
  const branchList = branches.data?.branches || [];

  const update = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next, { replace: true });
  };

  const scoped = ['overview', 'reports', 'rooms'].includes(tab);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink-900">{TABS.find((t) => t.key === tab).label}</h1>
          <p className="mt-0.5 text-sm text-ink-600">{SUBTITLES[tab]}</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          {scoped && (
            <label className="block">
              <span className="mb-1 block text-2xs text-ink-600">Branch</span>
              <select className="input !w-auto" value={branchId} onChange={(e) => update({ branch: e.target.value })}>
                <option value="">All branches</option>
                {branchList.map((b) => <option key={b.branch_id} value={b.branch_id}>{b.name}</option>)}
              </select>
            </label>
          )}
          {tab === 'overview' && (
            <label className="block">
              <span className="mb-1 block text-2xs text-ink-600">Month</span>
              <input type="month" className="input !w-auto" max={todayISO().slice(0, 7)} value={ym} onChange={(e) => e.target.value && update({ month: e.target.value })} />
            </label>
          )}
        </div>
      </header>

      <Tabs idBase="admin" tabs={TABS} value={tab} onChange={(t) => update({ tab: t === 'overview' ? '' : t })} className="mb-6 mt-3" />

      <div role="tabpanel" id={`admin-panel-${tab}`} aria-labelledby={`admin-tab-${tab}`}>
        {tab === 'overview' && <BranchOverview branchId={branchId} ym={ym} />}
        {tab === 'branches' && <BranchesTab branches={branches} />}
        {tab === 'users' && <UsersTab branches={branchList} />}
        {tab === 'reports' && <ReportsPanel branchId={branchId} showBranch={!branchId} />}
        {tab === 'bookings' && <BookingsTab branches={branchList} />}
        {tab === 'rooms' && <RoomManager branchId={branchId} />}
        {tab === 'catalogue' && <CatalogueManager />}
      </div>
    </div>
  );
}
