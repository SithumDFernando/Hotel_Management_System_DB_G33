import { useState } from 'react';
import { createService, getServices, updateService } from '@/api/services';
import useFetch from '@/hooks/useFetch';
import Button from '@/components/ui/Button';
import { Drawer, Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Field';
import { EmptyState, ErrorState, InlineAlert, Skeleton } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { errorMessage, formatCurrency } from '@/utils/formatters';

// Service catalogue admin (admin + manager). The API lists active services only,
// so a deactivated service disappears from this list.
export default function CatalogueManager() {
  const toast = useToast();
  const { data, isLoading, error, refetch } = useFetch((s) => getServices(s), []);
  const [edits, setEdits] = useState({}); // service_id -> price string
  const [savingId, setSavingId] = useState(null);
  const [deactivate, setDeactivate] = useState(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ service_name: '', category: '', base_price: '' });
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const groups = data || [];
  const categories = groups.map((g) => g.category);

  const savePrice = async (s) => {
    const price = Number(edits[s.service_id]);
    if (!Number.isFinite(price) || price <= 0) return toast.error(`Enter a price above LKR 0.00 for ${s.service_name}.`);
    setSavingId(s.service_id);
    try {
      await updateService(s.service_id, { base_price: price });
      toast.success(`Saved: ${s.service_name} is ${formatCurrency(price)} for new orders`);
      setEdits((p) => { const n = { ...p }; delete n[s.service_id]; return n; });
      refetch();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSavingId(null);
    }
  };

  const confirmDeactivate = async () => {
    setBusy(true);
    try {
      await updateService(deactivate.service_id, { is_active: false });
      toast.success(`Deactivated: ${deactivate.service_name}`);
      setDeactivate(null);
      refetch();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const submitNew = async (e) => {
    e.preventDefault();
    const price = Number(form.base_price);
    if (!form.service_name.trim() || !form.category.trim()) return setFormError('Enter the service name and category.');
    if (!Number.isFinite(price) || price <= 0) return setFormError('Enter a base price above LKR 0.00.');
    setBusy(true);
    setFormError('');
    try {
      await createService({ service_name: form.service_name.trim(), category: form.category.trim(), base_price: price });
      toast.success(`Added: ${form.service_name.trim()} (${form.category.trim()}), ${formatCurrency(price)}`);
      setAdding(false);
      setForm({ service_name: '', category: '', base_price: '' });
      refetch();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-600">A new price applies to new orders only. Past charges keep the price they were ordered at.</p>
        <Button onClick={() => setAdding(true)}>Add service</Button>
      </div>

      {error ? <ErrorState message={error} onRetry={refetch} /> : isLoading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : groups.length === 0 ? (
        <EmptyState title="No active services" message="Add a service so staff can charge it to a stay." action={<Button variant="secondary" onClick={() => setAdding(true)}>Add service</Button>} />
      ) : (
        groups.map((g) => (
          <section key={g.category} className="card overflow-hidden" aria-labelledby={`cat-${g.category}`}>
            <h3 id={`cat-${g.category}`} className="border-b border-ink-100 px-4 py-2.5 text-sm font-semibold text-ink-600">{g.category}</h3>
            <ul className="divide-y divide-ink-100">
              {g.services.map((s) => {
                const edited = edits[s.service_id] !== undefined && Number(edits[s.service_id]) !== Number(s.base_price);
                return (
                  <li key={s.service_id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <span className="text-sm font-medium text-ink-900">{s.service_name}</span>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-2xs text-ink-600">LKR</span>
                        <input
                          type="number" min="0.01" step="0.01"
                          aria-label={`Price for ${s.service_name} (LKR)`}
                          className="input h-8 !w-36 py-1 pl-11 text-right tabular"
                          value={edits[s.service_id] ?? Number(s.base_price)}
                          onChange={(e) => setEdits((p) => ({ ...p, [s.service_id]: e.target.value }))}
                        />
                      </div>
                      <Button size="sm" variant="secondary" disabled={!edited} loading={savingId === s.service_id} onClick={() => savePrice(s)} aria-label={`Save price for ${s.service_name}`}>Save price</Button>
                      <Button size="sm" variant="ghost" onClick={() => setDeactivate(s)} aria-label={`Deactivate ${s.service_name}`}>Deactivate</Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}

      <Drawer
        open={adding}
        onClose={() => setAdding(false)}
        title="Add service"
        subtitle="Offered at every branch from now on."
        footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button><Button type="submit" form="service-form" loading={busy}>Add service</Button></div>}
      >
        <form id="service-form" onSubmit={submitNew} className="space-y-4" noValidate>
          {formError && <InlineAlert>{formError}</InlineAlert>}
          <Input label="Service name" required value={form.service_name} onChange={(e) => setForm({ ...form, service_name: e.target.value })} />
          <div>
            <Input label="Category" required list="service-categories" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} hint="Pick an existing category or type a new one." />
            <datalist id="service-categories">{categories.map((c) => <option key={c} value={c} />)}</datalist>
          </div>
          <Input label="Base price (LKR)" required type="number" min="0.01" step="0.01" value={form.base_price} onChange={(e) => setForm({ ...form, base_price: e.target.value })} />
        </form>
      </Drawer>

      <Modal
        open={Boolean(deactivate)}
        onClose={() => setDeactivate(null)}
        size="sm"
        title={`Deactivate ${deactivate?.service_name || 'service'}?`}
        footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setDeactivate(null)}>Keep offering it</Button><Button variant="danger" loading={busy} onClick={confirmDeactivate}>Deactivate</Button></div>}
      >
        <p className="text-sm text-ink-900">
          It won’t be offered for new orders. Past charges stay on bills.
        </p>
        <p className="mt-2 text-[13px] text-ink-600">This list shows active services only, so it can’t be switched back on from here.</p>
      </Modal>
    </div>
  );
}
