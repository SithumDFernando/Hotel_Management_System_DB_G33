import { useSearchParams } from 'react-router-dom';
import { getBranches } from '@/api/auth';
import useAuth from '@/hooks/useAuth';
import useFetch from '@/hooks/useFetch';
import BranchOverview from '@/components/BranchOverview';
import CatalogueManager from '@/components/CatalogueManager';
import ReportsPanel from '@/components/ReportsPanel';
import RoomManager from '@/components/RoomManager';
import Tabs from '@/components/ui/Tabs';
import { todayISO } from '@/utils/formatters';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'reports', label: 'Reports' },
  { key: 'rooms', label: 'Rooms' },
  { key: 'catalogue', label: 'Service catalogue' },
];

export default function ManagerDashboard() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.key === params.get('tab')) ? params.get('tab') : 'overview';
  const ym = params.get('month') || todayISO().slice(0, 7);

  const branches = useFetch((s) => getBranches(s), []);
  const branch = branches.data?.branches.find((b) => b.branch_id === user.branch_id);

  const update = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next, { replace: true });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Executive overview{branch ? ` · ${branch.name}` : ''}</p>
          <h1 className="mt-1 text-4xl font-semibold">Performance &amp; financials</h1>
          <p className="mt-1 text-sm text-navy-500">Occupancy, revenue and billing for your branch.</p>
        </div>
        {tab === 'overview' && (
          <label className="block">
            <span className="label">Month</span>
            <input type="month" className="input" max={todayISO().slice(0, 7)} value={ym} onChange={(e) => e.target.value && update({ month: e.target.value })} />
          </label>
        )}
      </header>

      <Tabs tabs={TABS} value={tab} onChange={(t) => update({ tab: t === 'overview' ? '' : t })} className="mb-6 w-fit max-w-full" />

      {tab === 'overview' && <BranchOverview ym={ym} />}
      {tab === 'reports' && <ReportsPanel />}
      {tab === 'rooms' && <RoomManager branchId={user.branch_id} />}
      {tab === 'catalogue' && <CatalogueManager />}
    </div>
  );
}
