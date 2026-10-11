import { useEffect, useState } from 'react';
import { createBranch, updateBranch } from '@/api/admin';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
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
    FIELDS.forEach(([k, label]) => !f[k].trim() && (v[k] = `${label} is required`));
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
      toast.success(editing ? 'Branch updated' : 'Branch created');
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
      title={editing ? `Edit ${branch.name}` : 'Add branch'}
      subtitle="Branch details shown to guests on the public site."
      footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" form="branch-form" loading={busy}>{editing ? 'Save changes' : 'Create branch'}</Button></div>}
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
        <p className="text-sm text-navy-500">{list.length} branch{list.length === 1 ? '' : 'es'}</p>
        <Button onClick={() => setDrawer({ open: true, branch: null })}><Icon name="plus" /> Add branch</Button>
      </div>

      {error ? <ErrorState message={error} onRetry={refetch} /> : isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : list.length === 0 ? (
        <EmptyState icon="building" title="No branches yet" action={<Button onClick={() => setDrawer({ open: true, branch: null })}>Add the first branch</Button>} />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="bg-navy-50">
              <tr><th className="th">Branch</th><th className="th">Contact</th><th className="th">Manager</th><th className="th text-right">Rooms</th><th className="th text-right">Active bookings</th><th className="th text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-navy-100">
              {list.map((b) => (
                <tr key={b.branch_id} className="hover:bg-navy-50/50">
                  <td className="td"><span className="font-semibold">{b.name}</span><span className="block text-xs text-navy-500">{b.address}</span></td>
                  <td className="td text-xs">{b.city}<span className="block text-navy-500">{b.phone}</span></td>
                  <td className="td">{b.manager_name}</td>
                  <td className="td text-right tabular-nums">{b.total_rooms}</td>
                  <td className="td text-right tabular-nums">{b.active_bookings}</td>
                  <td className="td text-right"><Button size="sm" variant="outline" onClick={() => setDrawer({ open: true, branch: b })}><Icon name="edit" className="h-3.5 w-3.5" /> Edit</Button></td>
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
