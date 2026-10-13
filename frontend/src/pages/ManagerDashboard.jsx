import { useSearchParams } from 'react-router-dom';
import useAuth from '@/hooks/useAuth';
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

// Branch manager console. The branch is shown in the navbar and scoped server-side.
export default function ManagerDashboard() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.key === params.get('tab')) ? params.get('tab') : 'overview';
  const ym = params.get('month') || todayISO().slice(0, 7);

  const update = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next, { replace: true });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-xl font-semibold text-ink-900">{TABS.find((t) => t.key === tab).label}</h1>
        {tab === 'overview' && (
          <label className="block">
            <span className="mb-1 block text-2xs text-ink-600">Month</span>
            <input type="month" className="input !w-auto" max={todayISO().slice(0, 7)} value={ym} onChange={(e) => e.target.value && update({ month: e.target.value })} />
          </label>
        )}
      </header>

      <Tabs idBase="mgr" tabs={TABS} value={tab} onChange={(t) => update({ tab: t === 'overview' ? '' : t })} className="mb-6 mt-3" />

      <div role="tabpanel" id={`mgr-panel-${tab}`} aria-labelledby={`mgr-tab-${tab}`}>
        {tab === 'overview' && <BranchOverview ym={ym} />}
        {tab === 'reports' && <ReportsPanel />}
        {tab === 'rooms' && <RoomManager branchId={user.branch_id} />}
        {tab === 'catalogue' && <CatalogueManager />}
      </div>
    </div>
  );
}
