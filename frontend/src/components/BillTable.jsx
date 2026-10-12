import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { calculateNights, formatCurrency, formatDateTime } from '@/utils/formatters';

function Line({ label, value, total }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 py-1.5 ${total ? 'mt-1 border-t border-ink-900 pt-2.5 text-base font-semibold text-ink-900' : 'text-sm'}`}>
      <dt className={total ? '' : 'text-ink-600'}>{label}</dt>
      <dd className="tabular text-right text-ink-900">{value}</dd>
    </div>
  );
}

// Spec 11 §8: the bill reads as a receipt. Every figure comes from the API (BillOut);
// amounts may be Decimal strings. booking (optional) labels the room line.
// onTakePayment (optional) adds "Take payment" to the balance-due block.
export default function BillTable({ bill, payments = [], booking, onTakePayment }) {
  const outstanding = Number(bill.outstanding_balance);
  const discount = Number(bill.discount_amount);
  const nights = booking ? calculateNights(booking.check_in_date, booking.check_out_date) : null;
  const roomLabel = booking
    ? `Room · ${booking.room.type_name ? `${booking.room.type_name} ` : ''}${booking.room.room_number} · ${nights} night${nights === 1 ? '' : 's'}`
    : 'Room charges';

  return (
    <div className="space-y-6">
      <section aria-labelledby="bill-charges">
        <h3 id="bill-charges" className="mb-1 text-sm font-semibold text-ink-900">Charges</h3>
        <dl>
          <Line label={roomLabel} value={formatCurrency(bill.room_charges)} />
          <Line label="Services" value={formatCurrency(bill.service_charges)} />
          {discount > 0 && <Line label="Discount" value={`− ${formatCurrency(discount)}`} />}
          <Line label="Tax (15%)" value={formatCurrency(bill.tax_amount)} />
          <Line label="Total" value={formatCurrency(bill.total_amount)} total />
          <Line label="Paid to date" value={formatCurrency(bill.amount_paid)} />
        </dl>

        {outstanding > 0 ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md bg-signal-100 px-4 py-3 text-signal-700">
            <span className="text-sm font-medium">Balance due</span>
            <span className="flex items-center gap-3">
              <span className="text-base font-semibold tabular">{formatCurrency(outstanding)}</span>
              {onTakePayment && <Button variant="secondary" size="sm" className="print-hide" onClick={onTakePayment}>Take payment</Button>}
            </span>
          </div>
        ) : (
          <div className="mt-3 flex justify-end"><Badge balance={0} /></div>
        )}
        <p className="mt-2 text-2xs tabular text-ink-600">Bill calculated {formatDateTime(bill.generated_at)}</p>
      </section>

      <section aria-labelledby="bill-payments">
        <h3 id="bill-payments" className="mb-2 text-sm font-semibold text-ink-900">Payments</h3>
        {payments.length === 0 ? (
          <p className="text-sm text-ink-600">No payments yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-ink-100">
            <table className="w-full">
              <thead>
                <tr className="bg-paper-200">
                  <th scope="col" className="th">Date</th>
                  <th scope="col" className="th">Method</th>
                  <th scope="col" className="th">Note</th>
                  <th scope="col" className="th text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {payments.map((p) => (
                  <tr key={p.payment_id}>
                    <td className="td whitespace-nowrap tabular text-ink-600">{formatDateTime(p.paid_at)}</td>
                    <td className="td whitespace-nowrap">{p.payment_method}</td>
                    <td className="td text-ink-600">{p.notes || '–'}</td>
                    <td className="td text-right tabular">{formatCurrency(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
