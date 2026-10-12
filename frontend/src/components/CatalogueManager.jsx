import { useState } from 'react';
import { createService, getServices, updateService } from '@/api/services';
import useFetch from '@/hooks/useFetch';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
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
    if (!Number.isFinite(price) || price <= 0) return toast.error('Price must be greater than 0.');
    setSavingId(s.service_id);
    try {
      await updateService(s.service_id, { base_price: price });
      toast.success(`${s.service_name} price updated. New orders use ${formatCurrency(price)}.`);
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
      toast.success(`${deactivate.service_name} deactivated`);
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
    if (!form.service_name.trim() || !form.category.trim()) return setFormError('Name and category are required.');
    if (!Number.isFinite(price) || price <= 0) return setFormError('Price must be greater than 0.');
    setBusy(true);
    setFormError('');
    try {
      await createService({ service_name: form.service_name.trim(), category: form.category.trim(), base_price: price });
      toast.success('Service added to the catalogue');
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
        <p className="text-sm text-navy-500">Prices apply to new orders only — past usage keeps the price at the time of ordering.</p>
        <Button onClick={() => setAdding(true)}><Icon name="plus" /> Add service</Button>
      </div>

      {error ? <ErrorState message={error} onRetry={refetch} /> : isLoading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : groups.length === 0 ? (
        <EmptyState icon="sparkles" title="No active services" message="Add your first chargeable service." />
      ) : (
        groups.map((g) => (
          <section key={g.category} className="card overflow-hidden">
            <h3 className="border-b border-navy-100 bg-navy-50 px-4 py-2.5 font-sans text-xs font-bold uppercase tracking-wider text-navy-600">{g.category}</h3>
            <ul className="divide-y divide-navy-100">
              {g.services.map((s) => {
                const edited = edits[s.service_id] !== undefined && Number(edits[s.service_id]) !== Number(s.base_price);
                return (
                  <li key={s.service_id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <span className="font-medium">{s.service_name}</span>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-navy-400">LKR</span>
                        <input
                          type="number" min="0.01" step="0.01"
                          aria-label={`Price for ${s.service_name}`}
                          className="input !w-36 !py-2 pl-11 text-right"
                          value={edits[s.service_id] ?? Number(s.base_price)}
                          onChange={(e) => setEdits((p) => ({ ...p, [s.service_id]: e.target.value }))}
                        />
                      </div>
                      <Button size="sm" disabled={!edited} loading={savingId === s.service_id} onClick={() => savePrice(s)}>Save</Button>
                      <Button size="sm" variant="secondary" onClick={() => setDeactivate(s)}>Deactivate</Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}

      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        size="sm"
        title="Add service"
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
      </Modal>

      <Modal
        open={Boolean(deactivate)}
        onClose={() => setDeactivate(null)}
        size="sm"
        title="Deactivate service?"
        footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setDeactivate(null)}>Keep</Button><Button variant="danger" loading={busy} onClick={confirmDeactivate}>Deactivate</Button></div>}
      >
        <p className="text-sm text-navy-600">
          <strong>{deactivate?.service_name}</strong> will no longer be orderable. Existing folios are unaffected.
          Re-activating currently requires the API (the catalogue only lists active services).
        </p>
      </Modal>
    </div>
  );
}
