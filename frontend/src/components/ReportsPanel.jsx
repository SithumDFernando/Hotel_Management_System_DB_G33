import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getBooking } from '@/api/bookings';
import {
  getBillingSummary, getMonthlyRevenue, getOccupancy, getServiceUsage, getTopServices,
} from '@/api/reports';
import useAuth from '@/hooks/useAuth';
import useFetch from '@/hooks/useFetch';
import BillPaymentModal from '@/components/BillPaymentModal';
import ReportTable from '@/components/ReportTable';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Tabs from '@/components/ui/Tabs';
import { useToast } from '@/components/ui/Toast';
import { errorMessage, formatCurrency, formatNumericDate, todayISO } from '@/utils/formatters';

const money = (v) => formatCurrency(v);
const date = (v) => (v ? formatNumericDate(v) : '–');
// Small labelled filter control for report toolbars.
const Filter = ({ label, children }) => (
  <label className="block">
    <span className="mb-1 block text-2xs text-ink-600">{label}</span>
    {children}
  </label>
);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const TABS = [
  { key: 'occupancy', label: 'Occupancy' },
  { key: 'billing', label: 'Billing summary' },
  { key: 'usage', label: 'Service usage' },
  { key: 'revenue', label: 'Monthly revenue' },
  { key: 'top', label: 'Top services' },
];

// The five SRS reports. branchId (admin only) narrows the data; managers are
// scoped server-side. `showBranch` adds a branch column for cross-branch views.
export default function ReportsPanel({ branchId = '', showBranch = false }) {
  const { user } = useAuth();
  const toast = useToast();
  const today = todayISO();
  const year = new Date().getFullYear();

  // The open report lives in the URL (?report=) so refresh and back/forward keep it.
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.key === params.get('report')) ? params.get('report') : 'occupancy';
  const setTab = (t) => {
    const next = new URLSearchParams(params);
    if (t === 'occupancy') next.delete('report');
    else next.set('report', t);
    setParams(next, { replace: true });
  };
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [unpaidOnly, setUnpaidOnly] = useState(false);
  const [revYear, setRevYear] = useState(year);
  const [revMonth, setRevMonth] = useState('');
  const [limit, setLimit] = useState(10);
  const [opening, setOpening] = useState(null);
  const [billBooking, setBillBooking] = useState(null);

  const fetchers = {
    occupancy: (s) => getOccupancy({ branch_id: branchId, ...(from === to ? { date: from } : { from_date: from, to_date: to }) }, s),
    billing: (s) => getBillingSummary({ branch_id: branchId, unpaid_only: unpaidOnly }, s),
    usage: (s) => getServiceUsage({ branch_id: branchId }, s),
    revenue: (s) => getMonthlyRevenue({ branch_id: branchId, year: revYear, month: revMonth }, s),
    top: (s) => getTopServices({ branch_id: branchId, limit }, s),
  };
  // Rows are tagged with their tab so the previous report's rows are never
  // rendered with the next report's columns while it loads.
  const report = useFetch(
    (s) => Promise.resolve(fetchers[tab](s)).then((rows) => ({ tab, rows })),
    [tab, branchId, from, to, unpaidOnly, revYear, revMonth, limit],
    { failMessage: "Couldn't load this report." },
  );
  const { error, refetch } = report;
  const fresh = report.data?.tab === tab;
  const data = fresh ? report.data.rows : null;
  const isLoading = report.isLoading || (!fresh && !error);

  // The billing summary has no booking status or room type, so fetch the
  // booking before opening the bill.
  const openBill = async (bookingId) => {
    setOpening(bookingId);
    try {
      setBillBooking(await getBooking(bookingId));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setOpening(null);
    }
  };

  const branchCol = showBranch ? [{ key: 'branch_name', label: 'Branch' }] : [];

  const config = {
    occupancy: {
      title: 'Room occupancy',
      emptyMessage: `No rows for ${formatNumericDate(from)}${from === to ? '' : `–${formatNumericDate(to)}`}. Choose a wider date range.`,
      columns: [
        ...branchCol,
        { key: 'room_number', label: 'Room' },
        { key: 'room_type', label: 'Type' },
        { key: 'capacity', label: 'Cap.', align: 'right' },
        { key: 'room_status', label: 'Room status', render: (r) => <Badge status={r.room_status} /> },
        { key: 'guest_name', label: 'Guest' },
        { key: 'check_in_date', label: 'Check-in', format: date },
        { key: 'check_out_date', label: 'Check-out', format: date },
        { key: 'booking_status', label: 'Booking', render: (r) => (r.booking_status ? <Badge status={r.booking_status} /> : '–') },
      ],
      toolbar: (
        <div className="flex items-end gap-2">
          <Filter label="From">
            <input type="date" className="input !w-auto" value={from} onChange={(e) => { setFrom(e.target.value); if (to < e.target.value) setTo(e.target.value); }} />
          </Filter>
          <Filter label="To">
            <input type="date" className="input !w-auto" min={from} value={to} onChange={(e) => setTo(e.target.value)} />
          </Filter>
        </div>
      ),
    },
    billing: {
      title: 'Guest billing summary',
      emptyMessage: unpaidOnly ? 'No bills with a balance due.' : 'No bills or bookings yet.',
      columns: [
        ...branchCol,
        { key: 'guest_name', label: 'Guest' },
        { key: 'room_number', label: 'Room' },
        { key: 'check_in_date', label: 'Check-in', format: date },
        { key: 'check_out_date', label: 'Check-out', format: date },
        { key: 'total_amount', label: 'Total billed', align: 'right', format: money },
        { key: 'amount_paid', label: 'Paid', align: 'right', format: money },
        {
          key: 'outstanding_balance', label: 'Outstanding', align: 'right', format: money,
          render: (r) => <span className={r.outstanding_balance > 0 ? 'font-medium text-signal-700' : 'text-ink-600'}>{money(r.outstanding_balance)}</span>,
        },
        {
          key: 'balance_flag', label: 'Status', sortable: false,
          format: (_, r) => (!r.bill_id ? 'No bill' : r.balance_flag ? `Balance due ${money(r.outstanding_balance)}` : 'Paid'),
          render: (r) => (!r.bill_id ? <Badge>No bill</Badge> : <Badge balance={r.balance_flag ? r.outstanding_balance : 0} />),
        },
        ...(['manager', 'admin'].includes(user.role)
          ? [{
            label: 'Bill',
            render: (r) => (
              <Button size="sm" variant="secondary" loading={opening === r.booking_id} disabled={Boolean(opening)} onClick={() => openBill(r.booking_id)}>
                View bill
              </Button>
            ),
          }]
          : []),
      ],
      summary: (rows) => {
        const owed = rows.reduce((s, r) => s + r.outstanding_balance, 0);
        return (
          <>
            Billed <strong className="font-medium text-ink-900">{money(rows.reduce((s, r) => s + r.total_amount, 0))}</strong> · Collected{' '}
            <strong className="font-medium text-ink-900">{money(rows.reduce((s, r) => s + r.amount_paid, 0))}</strong> · Balance due{' '}
            <strong className={`font-medium ${owed > 0 ? 'text-signal-700' : 'text-ink-900'}`}>{money(owed)}</strong>
          </>
        );
      },
      toolbar: (
        <label className="flex h-9 items-center gap-2 text-[13px] text-ink-900">
          <input type="checkbox" className="h-4 w-4 accent-tea-700" checked={unpaidOnly} onChange={(e) => setUnpaidOnly(e.target.checked)} />
          Balance due only
        </label>
      ),
    },
    usage: {
      title: 'Service usage by room & service',
      columns: [
        ...branchCol,
        { key: 'room_number', label: 'Room' },
        { key: 'guest_name', label: 'Guest' },
        { key: 'service_name', label: 'Service' },
        { key: 'category', label: 'Category' },
        { key: 'total_quantity_used', label: 'Qty', align: 'right' },
        { key: 'total_revenue_generated', label: 'Revenue', align: 'right', format: money },
      ],
      summary: (rows) => <>Total service revenue <strong>{money(rows.reduce((s, r) => s + r.total_revenue_generated, 0))}</strong></>,
    },
    revenue: {
      title: 'Monthly revenue',
      emptyMessage: 'No checked-out stays in this period. Revenue is counted when a booking is checked out.',
      columns: [
        ...branchCol,
        { key: 'month', label: 'Month', format: (m, r) => `${MONTHS[m - 1]} ${r.year}` },
        { key: 'total_room_revenue', label: 'Room', align: 'right', format: money },
        { key: 'total_service_revenue', label: 'Services', align: 'right', format: money },
        { key: 'total_tax_collected', label: 'Tax', align: 'right', format: money },
        { key: 'total_gross_revenue', label: 'Gross', align: 'right', format: money },
        { key: 'total_collected', label: 'Collected', align: 'right', format: money },
        { key: 'total_outstanding', label: 'Outstanding', align: 'right', format: money },
      ],
      toolbar: (
        <div className="flex items-end gap-2">
          <Filter label="Year">
            <select className="input !w-auto" value={revYear} onChange={(e) => setRevYear(Number(e.target.value))}>
              {[year, year - 1, year - 2].map((y) => <option key={y}>{y}</option>)}
            </select>
          </Filter>
          <Filter label="Month">
            <select className="input !w-auto" value={revMonth} onChange={(e) => setRevMonth(e.target.value)}>
              <option value="">All months</option>
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </Filter>
        </div>
      ),
    },
    top: {
      title: 'Top services by quantity',
      columns: [
        { key: 'usage_rank', label: '#', align: 'right' },
        { key: 'service_name', label: 'Service' },
        { key: 'category', label: 'Category' },
        { key: 'total_bookings_ordered', label: 'Bookings', align: 'right' },
        { key: 'total_quantity', label: 'Quantity', align: 'right' },
        { key: 'avg_quantity_per_booking', label: 'Avg / booking', align: 'right', format: (v) => Number(v).toFixed(1) },
        { key: 'total_revenue', label: 'Revenue', align: 'right', format: money },
      ],
      toolbar: (
        <Filter label="Show">
          <select className="input !w-auto" value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
            {[5, 10, 20].map((n) => <option key={n} value={n}>Top {n}</option>)}
          </select>
        </Filter>
      ),
    },
  }[tab];

  return (
    <div className="space-y-4">
      <Tabs tabs={TABS} value={tab} onChange={setTab} className="max-w-full" />
      <ReportTable
        key={tab}
        title={config.title}
        columns={config.columns}
        data={data}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        emptyMessage={config.emptyMessage}
        toolbar={config.toolbar}
        summary={config.summary}
        exportName={`skynest-${tab}-${today}`}
      />
      {billBooking && (
        <BillPaymentModal booking={billBooking} onClose={() => setBillBooking(null)} onChanged={refetch} />
      )}
    </div>
  );
}
