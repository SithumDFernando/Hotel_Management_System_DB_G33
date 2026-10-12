import Badge from '@/components/ui/Badge';
import Icon from '@/components/ui/Icon';
import { formatCurrency, formatDateTime } from '@/utils/formatters';

const METHOD_ICON = { 'Credit Card': 'card', Cash: 'cash', 'Bank Transfer': 'bank' };

function Row({ label, value, strong, tone }) {
  return (
    <div className={`flex items-center justify-between px-4 py-2.5 text-sm ${strong ? 'bg-navy-50 font-semibold' : ''}`}>
      <span className={tone === 'green' ? 'text-emerald-700' : 'text-navy-600'}>{label}</span>
      <span className={`tabular-nums ${tone === 'green' ? 'text-emerald-700' : ''}`}>{value}</span>
    </div>
  );
}

// bill: BillOut (amounts may be Decimal strings). payments: PaymentOut[].
export default function BillTable({ bill, payments = [] }) {
  const outstanding = Number(bill.outstanding_balance);
  const discount = Number(bill.discount_amount);
  const settled = outstanding <= 0;
  const partially = !settled && Number(bill.amount_paid) > 0;

  return (
    <div className="space-y-5">
      <section aria-label="Charges">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-navy-600">
            <Icon name="receipt" className="h-4 w-4 text-gold-700" /> Charges
          </h3>
          <Badge tone={settled ? 'green' : partially ? 'amber' : 'red'}>
            {settled ? 'Settled' : partially ? 'Partially paid' : 'Unpaid'}
          </Badge>
        </div>
        <div className="divide-y divide-navy-100 overflow-hidden rounded-xl border border-navy-100">
          <Row label="Room charges" value={formatCurrency(bill.room_charges)} />
          <Row label="Service charges" value={formatCurrency(bill.service_charges)} />
          {discount > 0 && <Row label="Discount" value={`− ${formatCurrency(discount)}`} tone="green" />}
          <Row label="Tax (15%)" value={formatCurrency(bill.tax_amount)} />
          <Row label="Grand total" value={formatCurrency(bill.total_amount)} strong />
          <Row label="Paid to date" value={formatCurrency(bill.amount_paid)} />
        </div>
        <div
          className={`mt-3 flex items-center justify-between rounded-xl px-4 py-3 ${
            settled ? 'bg-emerald-50 text-emerald-800' : 'bg-gold-50 text-gold-800'
          }`}
        >
          <span className="text-xs font-semibold uppercase tracking-wider">{settled ? 'Fully paid' : 'Outstanding balance'}</span>
          <span className="rounded-full bg-white/70 px-3 py-1 text-sm font-bold tabular-nums">{formatCurrency(outstanding)}</span>
        </div>
        <p className="mt-1.5 text-right text-[11px] text-navy-400">Generated {formatDateTime(bill.generated_at)}</p>
      </section>

      <section aria-label="Payment history">
        <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-navy-600">
          <Icon name="clock" className="h-4 w-4 text-gold-700" /> Payment history ({payments.length})
        </h3>
        {payments.length === 0 ? (
          <p className="rounded-xl border border-dashed border-navy-200 px-4 py-5 text-center text-sm text-navy-500">No payments recorded yet.</p>
        ) : (
          <ul className="divide-y divide-navy-100 overflow-hidden rounded-xl border border-navy-100">
            {payments.map((p) => (
              <li key={p.payment_id} className="flex items-center gap-3 px-4 py-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-50 text-navy-600">
                  <Icon name={METHOD_ICON[p.payment_method] || 'cash'} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{p.payment_method}</p>
                  <p className="truncate text-xs text-navy-500">{formatDateTime(p.paid_at)}{p.notes ? ` · ${p.notes}` : ''}</p>
                </div>
                <span className="text-sm font-semibold tabular-nums">{formatCurrency(p.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
