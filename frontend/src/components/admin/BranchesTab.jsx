import { useEffect, useState } from 'react';
import { createBranch, updateBranch } from '@/api/admin';
import Button from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Field';
import { EmptyState, ErrorState, InlineAlert, Skeleton } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { errorMessage } from '@/utils/formatters';

const EMPTY = { name: '', city: '', address: '', phone: '', manager_name: '' };
const FIELDS = [
  ['name', 'Branch name'],
  ['city', 'City'],
  ['address', 'Address'],
  ['phone', 'Phone'],
  ['manager_name', 'Branch manager name'],
];

function BranchDrawer({ branch, open, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);
  const editing = Boolean(branch);

  useEffect(() => {
    if (open) {
      setF(branch ? Object.fromEntries(FIELDS.map(([k]) => [k, branch[k] || ''])) : EMPTY);
      setErrors({});
      setServerError('');
    }
  }, [open, branch]);

  const submit = async (e) => {
    e.preventDefault();
    const v = {};
    FIELDS.forEach(([k, label]) => !f[k].trim() && (v[k] = `Enter the ${label.toLowerCase()}.`));
    setErrors(v);
    if (Object.keys(v).length) return;

    setBusy(true);
    setServerError('');
    try {
      const payload = Object.fromEntries(FIELDS.map(([k]) => [k, f[k].trim()]));
      if (editing) {
        const changed = Object.fromEntries(Object.entries(payload).filter(([k, val]) => val !== branch[k]));
        if (!Object.keys(changed).length) return onClose();
        await updateBranch(branch.branch_id, changed);
      } else {
        await createBranch(payload);
      }
      toast.success(editing ? `Saved: ${payload.name}` : `Added: ${payload.name}`);
      onSaved();
      onClose();
    } catch (err) {
      setServerError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={editing ? `Edit branch · ${branch.name}` : 'Add branch'}
      subtitle="The name, address and phone are shown to guests on the public site."
      footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" form="branch-form" loading={busy}>{editing ? 'Save changes' : 'Add branch'}</Button></div>}
    >
      <form id="branch-form" onSubmit={submit} noValidate className="space-y-4">
        {serverError && <InlineAlert>{serverError}</InlineAlert>}
        {FIELDS.map(([k, label]) => (
          <Input key={k} label={label} required value={f[k]} error={errors[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
        ))}
      </form>
    </Drawer>
  );
}

export default function BranchesTab({ branches }) {
  const { data, isLoading, error, refetch } = branches;
  const [drawer, setDrawer] = useState({ open: false, branch: null });
  const list = data?.branches || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-600">{list.length} branch{list.length === 1 ? '' : 'es'}</p>
        <Button onClick={() => setDrawer({ open: true, branch: null })}>Add branch</Button>
      </div>

      {error ? <ErrorState message={error} onRetry={refetch} /> : isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : list.length === 0 ? (
        <EmptyState title="No branches yet" message="Add a branch to start taking bookings there." action={<Button onClick={() => setDrawer({ open: true, branch: null })}>Add branch</Button>} />
      ) : (
        <div className="card relative overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className="bg-paper-200"><th scope="col" className="th">City</th><th scope="col" className="th">Branch</th><th scope="col" className="th">Phone</th><th scope="col" className="th">Manager</th><th scope="col" className="th text-right">Rooms</th><th scope="col" className="th text-right">Active bookings</th><th scope="col" className="th"><span className="sr-only">Actions</span></th></tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {list.map((b) => (
                <tr key={b.branch_id} className="hover:bg-paper-100">
                  <td className="td font-medium text-ink-900">{b.city}</td>
                  <td className="td">{b.name}<span className="block text-2xs text-ink-600">{b.address}</span></td>
                  <td className="td whitespace-nowrap tabular">{b.phone}</td>
                  <td className="td">{b.manager_name}</td>
                  <td className="td text-right tabular">{b.total_rooms}</td>
                  <td className="td text-right tabular">{b.active_bookings}</td>
                  <td className="td text-right"><Button size="sm" variant="secondary" onClick={() => setDrawer({ open: true, branch: b })} aria-label={`Edit ${b.name}`}>Edit</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <BranchDrawer open={drawer.open} branch={drawer.branch} onClose={() => setDrawer({ open: false, branch: null })} onSaved={refetch} />
    </div>
  );
}
