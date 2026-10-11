import { useCallback, useEffect, useState } from 'react';
import { generateBill, getBill, getPayments, recordPayment } from '@/api/billing';
import BillTable from '@/components/BillTable';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { ErrorState, InlineAlert, Skeleton } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { bookingRef, errorMessage, formatCurrency, formatDate } from '@/utils/formatters';

const METHODS = ['Cash', 'Credit Card', 'Bank Transfer'];

// Staff billing view for one booking: (re)generates the bill, shows charges and
// payment history, records payments. booking = BookingListOut.
// onChanged() fires after any change so the caller can refresh; onCheckout()
// (optional) shows a "Check out now" action once the balance is settled.
export default function BillPaymentModal({ booking, onClose, onChanged, onCheckout }) {
  const toast = useToast();
  const [state, setState] = useState({ loading: true });
  const [discount, setDiscount] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('Cash');
  const [notes, setNotes] = useState('');
  const [amountError, setAmountError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (regenerate, discountValue) => {
      try {
        // Regenerating recalculates room + service charges, so totals are always current.
        const bill = regenerate ? await generateBill(booking.booking_id, discountValue) : await getBill(booking.booking_id);
        const payments = await getPayments(booking.booking_id);
        setState({ bill, payments });
        setAmount(Number(bill.outstanding_balance) > 0 ? String(Number(bill.outstanding_balance).toFixed(2)) : '');
        setDiscount(Number(bill.discount_amount) > 0 ? String(Number(bill.discount_amount)) : '');
      } catch (err) {
        setState({ error: errorMessage(err) });
      }
    },
    [booking.booking_id],
  );

  // Checked-Out bookings keep their final bill; everything else is recalculated on open.
  useEffect(() => {
    load(booking.status !== 'Checked-Out');
  }, [load, booking.status]);

  const { bill, payments } = state;
  const outstanding = bill ? Number(bill.outstanding_balance) : 0;
  const settled = bill && outstanding <= 0;

  const applyDiscount = async () => {
    const d = Number(discount || 0);
    if (!Number.isFinite(d) || d < 0) return toast.error('Enter a valid discount amount.');
    setBusy(true);
    await load(true, d);
    onChanged?.();
    toast.success('Bill recalculated');
    setBusy(false);
  };

  const submitPayment = async (e) => {
    e.preventDefault();
    const value = Number(amount);
    if (!amount || !Number.isFinite(value) || value <= 0) return setAmountError('Enter an amount greater than 0.');
    if (Math.abs(Math.round(value * 100) - value * 100) > 1e-6) return setAmountError('Use at most 2 decimal places.');
    if (value > outstanding + 0.001) return setAmountError('Amount cannot exceed the outstanding balance.');
    setAmountError('');
    setBusy(true);
    try {
      await recordPayment({
        booking_id: booking.booking_id,
        amount: value,
        payment_method: method,
        notes: notes.trim() || null,
      });
      toast.success(`Payment of ${formatCurrency(value)} recorded`);
      setNotes('');
      await load(false);
      onChanged?.();
    } catch (err) {
      setAmountError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const canPay = bill && !settled && booking.status !== 'Cancelled';

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={`Bill · ${booking.guest.full_name}`}
      subtitle={`${bookingRef(booking.booking_id)} · ${booking.room.type_name || ''} Room ${booking.room.room_number} · ${formatDate(booking.check_in_date)} – ${formatDate(booking.check_out_date)}`}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button variant="ghost" onClick={onClose}>Close</Button>
          {settled && onCheckout && booking.status === 'Checked-In' && (
            <Button onClick={() => onCheckout(booking)}>
              <Icon name="logout" /> Check out now
            </Button>
          )}
        </div>
      }
    >
      {state.loading ? (
        <div className="space-y-3"><Skeleton className="h-48 w-full" /><Skeleton className="h-24 w-full" /></div>
      ) : state.error ? (
        <ErrorState message={state.error} onRetry={() => { setState({ loading: true }); load(booking.status !== 'Checked-Out'); }} />
      ) : (
        <div className="space-y-6">
          <BillTable bill={bill} payments={payments} />

          {booking.status !== 'Checked-Out' && booking.status !== 'Cancelled' && (
            <section aria-label="Discount" className="rounded-xl border border-navy-100 p-4">
              <label htmlFor="discount" className="label">Discount (LKR)</label>
              <div className="flex gap-2">
                <input id="discount" type="number" min="0" step="0.01" className="input" placeholder="0.00" value={discount} onChange={(e) => setDiscount(e.target.value)} />
                <Button variant="outline" onClick={applyDiscount} disabled={busy}>Apply</Button>
              </div>
              <p className="mt-1 text-[11px] text-navy-400">Applied before tax. Recalculates the bill.</p>
            </section>
          )}

          {canPay ? (
            <form onSubmit={submitPayment} noValidate className="rounded-xl bg-navy-50 p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Icon name="card" className="h-4 w-4 text-gold-700" /> Record new payment
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="pay-amount" className="label">Amount (LKR)</label>
                  <div className="relative">
                    <input
                      id="pay-amount"
                      type="number"
                      min="0.01"
                      step="0.01"
                      className={`input pr-28 ${amountError ? '!border-red-400' : ''}`}
                      value={amount}
                      onChange={(e) => { setAmount(e.target.value); setAmountError(''); }}
                      aria-invalid={Boolean(amountError)}
                    />
                    <button
                      type="button"
                      onClick={() => { setAmount(outstanding.toFixed(2)); setAmountError(''); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-gold-300 px-2.5 py-1 text-[11px] font-semibold text-navy-900 hover:bg-gold-400"
                    >
                      Pay full balance
                    </button>
                  </div>
                </div>
                <div>
                  <label htmlFor="pay-method" className="label">Method</label>
                  <select id="pay-method" className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
                    {METHODS.map((m) => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="pay-notes" className="label">Notes (optional)</label>
                  <input id="pay-notes" className="input" maxLength={255} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Partial payment at check-in" />
                </div>
              </div>
              {amountError && <p role="alert" className="mt-2 text-xs text-red-600">{amountError}</p>}
              <Button type="submit" className="mt-4 w-full" loading={busy}>
                <Icon name="check" /> Record payment
              </Button>
            </form>
          ) : (
            settled && <InlineAlert tone="success">This bill is fully settled.</InlineAlert>
          )}
        </div>
      )}
    </Modal>
  );
}
