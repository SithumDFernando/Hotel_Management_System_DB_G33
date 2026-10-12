import { useCallback, useEffect, useRef, useState } from 'react';
import { generateBill, getBill, getPayments, recordPayment } from '@/api/billing';
import BillTable from '@/components/BillTable';
import Button from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ErrorState, InlineAlert, Skeleton } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { bookingRef, errorMessage, formatCurrency, formatNumericDate } from '@/utils/formatters';

const METHODS = ['Cash', 'Credit Card', 'Bank Transfer'];

// Staff billing view for one booking: (re)generates the bill, shows charges and
// payment history, takes payments. booking = BookingListOut.
// onChanged() fires after any change so the caller can refresh; onCheckout()
// (optional) shows a "Check out now" action once the balance is settled.
// notice (optional): shown as an error banner, e.g. the 402 from a check-out;
// the amount field is focused when it's set.
export default function BillPaymentModal({ booking, onClose, onChanged, onCheckout, notice }) {
  const toast = useToast();
  const [state, setState] = useState({ loading: true });
  const [discount, setDiscount] = useState('');
  const [showDiscount, setShowDiscount] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('Cash');
  const [notes, setNotes] = useState('');
  const [amountError, setAmountError] = useState('');
  const [discountError, setDiscountError] = useState('');
  const [busy, setBusy] = useState(false);
  const amountRef = useRef(null);
  const guestName = booking.guest.full_name;

  const load = useCallback(
    async (regenerate, discountValue) => {
      try {
        // Regenerating recalculates room + service charges, so totals are always current.
        const bill = regenerate ? await generateBill(booking.booking_id, discountValue) : await getBill(booking.booking_id);
        const payments = await getPayments(booking.booking_id);
        setState({ bill, payments });
        setAmount(Number(bill.outstanding_balance) > 0 ? String(Number(bill.outstanding_balance).toFixed(2)) : '');
        setDiscount(Number(bill.discount_amount) > 0 ? String(Number(bill.discount_amount)) : '');
        return bill;
      } catch (err) {
        setState({ error: errorMessage(err) });
        return null;
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
  const canPay = bill && !settled && booking.status !== 'Cancelled';

  // Opened from a 402 on check-out: go straight to the amount.
  useEffect(() => {
    if (notice && canPay) amountRef.current?.focus();
  }, [notice, canPay]);

  const focusPayment = () => {
    amountRef.current?.focus();
    amountRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  };

  const applyDiscount = async () => {
    const d = Number(discount || 0);
    if (!Number.isFinite(d) || d < 0) return setDiscountError('Enter a discount of 0 or more.');
    setDiscountError('');
    setBusy(true);
    try {
      // generateBill errors (e.g. discount larger than the subtotal) surface under the field.
      const updated = await generateBill(booking.booking_id, d);
      const fresh = await getPayments(booking.booking_id);
      setState({ bill: updated, payments: fresh });
      setAmount(Number(updated.outstanding_balance) > 0 ? String(Number(updated.outstanding_balance).toFixed(2)) : '');
      onChanged?.();
      toast.success(`Bill recalculated for ${guestName}: discount ${formatCurrency(updated.discount_amount)}`);
      setShowDiscount(false);
    } catch (err) {
      setDiscountError(errorMessage(err));
    } finally {
      setBusy(false);
    }
    return undefined;
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
      toast.success(`Payment taken: ${formatCurrency(value)} by ${method}, ${guestName}`);
      setNotes('');
      await load(false);
      onChanged?.();
    } catch (err) {
      setAmountError(errorMessage(err));
    } finally {
      setBusy(false);
    }
    return undefined;
  };

  const printFolio = () => {
    document.body.classList.add('print-folio');
    const done = () => {
      document.body.classList.remove('print-folio');
      window.removeEventListener('afterprint', done);
    };
    window.addEventListener('afterprint', done);
    window.print();
  };

  const room = `${booking.room.type_name ? `${booking.room.type_name} ` : ''}${booking.room.room_number}`;
  const editable = booking.status !== 'Checked-Out' && booking.status !== 'Cancelled';

  return (
    <Modal
      open
      printable
      onClose={onClose}
      size="lg"
      title={`Bill · ${guestName}, ${room}`}
      subtitle={`${bookingRef(booking.booking_id)} · ${formatNumericDate(booking.check_in_date)} → ${formatNumericDate(booking.check_out_date)}`}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>Close</Button>
            {bill && <Button variant="ghost" onClick={printFolio}>Print bill</Button>}
          </div>
          {settled && onCheckout && booking.status === 'Checked-In' && (
            <Button onClick={() => onCheckout(booking)}>Check out now</Button>
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
          {notice && canPay && <div className="print-hide"><InlineAlert>{notice}</InlineAlert></div>}

          <BillTable bill={bill} payments={payments} booking={booking} onTakePayment={canPay ? focusPayment : undefined} />

          {editable && (
            <section aria-label="Discount" className="print-hide border-t border-ink-100 pt-4">
              {showDiscount ? (
                <div>
                  <label htmlFor="discount" className="label">Discount (LKR)</label>
                  <div className="flex gap-2">
                    <input
                      id="discount"
                      type="number"
                      min="0"
                      step="0.01"
                      className="input max-w-xs"
                      placeholder="0.00"
                      value={discount}
                      onChange={(e) => { setDiscount(e.target.value); setDiscountError(''); }}
                      aria-invalid={Boolean(discountError)}
                      aria-describedby={discountError ? 'discount-error' : 'discount-help'}
                    />
                    <Button variant="secondary" onClick={applyDiscount} loading={busy}>Apply discount</Button>
                    <Button variant="ghost" onClick={() => { setShowDiscount(false); setDiscountError(''); }}>Cancel</Button>
                  </div>
                  {discountError ? (
                    <p id="discount-error" role="alert" className="mt-1.5 text-[13px] text-signal-700">{discountError}</p>
                  ) : (
                    <p id="discount-help" className="mt-1.5 text-2xs text-ink-600">Applied before tax. The bill is recalculated.</p>
                  )}
                </div>
              ) : (
                <Button variant="secondary" size="sm" onClick={() => setShowDiscount(true)}>Apply discount</Button>
              )}
            </section>
          )}

          {canPay ? (
            <form onSubmit={submitPayment} noValidate className="print-hide border-t border-ink-100 pt-4" aria-labelledby="take-payment">
              <h3 id="take-payment" className="mb-3 text-sm font-semibold text-ink-900">Take payment</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="pay-amount" className="label">Amount (LKR)</label>
                  <input
                    ref={amountRef}
                    id="pay-amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    className={`input tabular ${amountError ? 'border-signal-700' : ''}`}
                    value={amount}
                    onChange={(e) => { setAmount(e.target.value); setAmountError(''); }}
                    aria-invalid={Boolean(amountError)}
                    aria-describedby={amountError ? 'pay-amount-error pay-amount-help' : 'pay-amount-help'}
                  />
                  {amountError && <p id="pay-amount-error" role="alert" className="mt-1.5 text-[13px] text-signal-700">{amountError}</p>}
                  <p id="pay-amount-help" className="mt-1.5 text-2xs text-ink-600">
                    Balance due {formatCurrency(outstanding)}.{' '}
                    {Number(amount) !== outstanding && (
                      <button type="button" className="rounded-sm text-tea-700 underline" onClick={() => { setAmount(outstanding.toFixed(2)); setAmountError(''); }}>
                        Use full balance
                      </button>
                    )}
                  </p>
                </div>
                <fieldset>
                  <legend className="label">Method</legend>
                  <div className="flex flex-wrap gap-x-4 gap-y-2 pt-1">
                    {METHODS.map((m) => (
                      <label key={m} className="flex items-center gap-2 text-sm text-ink-900">
                        <input type="radio" name="pay-method" value={m} checked={method === m} onChange={() => setMethod(m)} className="h-4 w-4 accent-tea-700" />
                        {m}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="sm:col-span-2">
                  <label htmlFor="pay-notes" className="label">Note (optional)</label>
                  <input id="pay-notes" className="input" maxLength={255} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Part payment at check-in" />
                </div>
              </div>
              <Button type="submit" className="mt-4" loading={busy}>Take payment</Button>
            </form>
          ) : (
            settled && <div className="print-hide"><InlineAlert tone="info">This bill is fully paid.</InlineAlert></div>
          )}
        </div>
      )}
    </Modal>
  );
}
