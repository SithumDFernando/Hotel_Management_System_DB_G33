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
import { errorMessage, formatCurrency, formatDate, todayISO } from '@/utils/formatters';

const money = (v) => formatCurrency(v);
const date = (v) => (v ? formatDate(v) : '—');
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
      emptyMessage: 'No rooms found for this period.',
      columns: [
        ...branchCol,
        { key: 'room_number', label: 'Room' },
        { key: 'room_type', label: 'Type' },
        { key: 'capacity', label: 'Cap.', align: 'right' },
        { key: 'room_status', label: 'Room status', render: (r) => <Badge status={r.room_status} /> },
        { key: 'guest_name', label: 'Guest' },
        { key: 'check_in_date', label: 'Check-in', format: date },
        { key: 'check_out_date', label: 'Check-out', format: date },
        { key: 'booking_status', label: 'Booking', render: (r) => (r.booking_status ? <Badge status={r.booking_status} /> : '—') },
      ],
      toolbar: (
        <div className="flex items-center gap-2">
          <input type="date" aria-label="From date" className="input !w-auto !py-2" value={from} onChange={(e) => { setFrom(e.target.value); if (to < e.target.value) setTo(e.target.value); }} />
          <span className="text-xs text-navy-400">to</span>
          <input type="date" aria-label="To date" className="input !w-auto !py-2" min={from} value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      ),
    },
    billing: {
      title: 'Guest billing summary',
      emptyMessage: unpaidOnly ? 'No unpaid balances. 🎉' : 'No bookings found.',
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
          render: (r) => <span className={r.outstanding_balance > 0 ? 'font-semibold text-red-700' : 'text-navy-400'}>{money(r.outstanding_balance)}</span>,
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
      summary: (rows) => (
        <>
          Billed <strong>{money(rows.reduce((s, r) => s + r.total_amount, 0))}</strong> · Collected{' '}
          <strong>{money(rows.reduce((s, r) => s + r.amount_paid, 0))}</strong> · Outstanding{' '}
          <strong className="text-red-700">{money(rows.reduce((s, r) => s + r.outstanding_balance, 0))}</strong>
        </>
      ),
      toolbar: (
        <label className="flex items-center gap-2 text-xs font-semibold text-navy-600">
          <input type="checkbox" className="h-4 w-4 accent-gold-700" checked={unpaidOnly} onChange={(e) => setUnpaidOnly(e.target.checked)} />
          Unpaid only
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
        <div className="flex items-center gap-2">
          <select aria-label="Year" className="input !w-auto !py-2" value={revYear} onChange={(e) => setRevYear(Number(e.target.value))}>
            {[year, year - 1, year - 2].map((y) => <option key={y}>{y}</option>)}
          </select>
          <select aria-label="Month" className="input !w-auto !py-2" value={revMonth} onChange={(e) => setRevMonth(e.target.value)}>
            <option value="">All months</option>
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
        </div>
      ),
    },
    top: {
      title: 'Top-used services',
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
        <select aria-label="Rows" className="input !w-auto !py-2" value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
          {[5, 10, 20].map((n) => <option key={n} value={n}>Top {n}</option>)}
        </select>
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
