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
  { key: 'users', label: 'Users' },
  { key: 'reports', label: 'Reports' },
  { key: 'bookings', label: 'All bookings' },
  { key: 'rooms', label: 'Rooms' },
  { key: 'catalogue', label: 'Service catalogue' },
];
const HEADINGS = {
  overview: ['Group overview', 'Performance across all properties.'],
  branches: ['Branch management', 'Create and maintain SkyNest properties.'],
  users: ['Staff & user governance', 'Manage roles and branch access for every account.'],
  reports: ['System reports', 'The five operational reports, across all branches or one.'],
  bookings: ['All bookings', 'Search reservations across every branch.'],
  rooms: ['Room inventory', 'Set rooms to maintenance or back to available.'],
  catalogue: ['Service catalogue', 'Chargeable services offered at every branch.'],
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
  const [title, subtitle] = HEADINGS[tab];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Administration · Group operations</p>
          <h1 className="mt-1 text-4xl font-semibold">{title}</h1>
          <p className="mt-1 text-sm text-navy-500">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          {scoped && (
            <label className="block">
              <span className="label">Branch</span>
              <select className="input" value={branchId} onChange={(e) => update({ branch: e.target.value })}>
                <option value="">{tab === 'rooms' ? 'All branches' : 'All branches (combined)'}</option>
                {branchList.map((b) => <option key={b.branch_id} value={b.branch_id}>{b.name}</option>)}
              </select>
            </label>
          )}
          {tab === 'overview' && (
            <label className="block">
              <span className="label">Month</span>
              <input type="month" className="input" max={todayISO().slice(0, 7)} value={ym} onChange={(e) => e.target.value && update({ month: e.target.value })} />
            </label>
          )}
        </div>
      </header>

      <Tabs tabs={TABS} value={tab} onChange={(t) => update({ tab: t === 'overview' ? '' : t })} className="mb-6 max-w-full" />

      {tab === 'overview' && <BranchOverview branchId={branchId} ym={ym} />}
      {tab === 'branches' && <BranchesTab branches={branches} />}
      {tab === 'users' && <UsersTab branches={branchList} />}
      {tab === 'reports' && <ReportsPanel branchId={branchId} showBranch={!branchId} />}
      {tab === 'bookings' && <BookingsTab branches={branchList} />}
      {tab === 'rooms' && <RoomManager branchId={branchId} />}
      {tab === 'catalogue' && <CatalogueManager />}
    </div>
  );
}
