import { useEffect, useMemo, useState } from 'react';
import { createUser, listUsers, patchUser } from '@/api/admin';
import useFetch from '@/hooks/useFetch';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import { Drawer } from '@/components/ui/Modal';
import { Field, Input, Select } from '@/components/ui/Field';
import Pagination from '@/components/ui/Pagination';
import { EmptyState, ErrorState, InlineAlert, Skeleton } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { errorMessage, initials, passwordError } from '@/utils/formatters';

const PAGE_SIZE = 10;
const STAFF_ROLES = [
  { value: 'receptionist', label: 'Receptionist', scope: 'Front-desk check-in/out, bookings, services and payments for one branch.' },
  { value: 'manager', label: 'Manager', scope: 'Branch reports, room inventory, service catalogue and billing oversight for one branch.' },
  { value: 'admin', label: 'Administrator', scope: 'Full cross-branch authority: branches, users and all reports.' },
];
const ROLE_TONE = { admin: 'navy', manager: 'blue', receptionist: 'amber', guest: 'gray' };

function generatePassword(len = 14) {
  const sets = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnopqrstuvwxyz', '23456789', '!@#$%&*?'];
  const all = sets.join('');
  const rand = (n) => crypto.getRandomValues(new Uint32Array(1))[0] % n;
  const chars = sets.map((s) => s[rand(s.length)]); // guarantee one of each class
  while (chars.length < len) chars.push(all[rand(all.length)]);
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = rand(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

function CreateDrawer({ open, onClose, branches, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({ email: '', password: '', role: 'receptionist', branch_id: '' });
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(null);

  useEffect(() => {
    if (open) {
      setF({ email: '', password: '', role: 'receptionist', branch_id: '' });
      setErrors({});
      setServerError('');
      setShow(false);
      setCreated(null);
    }
  }, [open]);

  const needsBranch = f.role !== 'admin';
  const role = STAFF_ROLES.find((r) => r.value === f.role);
  const branch = branches.find((b) => b.branch_id === f.branch_id);

  const submit = async (e) => {
    e.preventDefault();
    const v = {};
    if (!/^\S+@\S+\.\S+$/.test(f.email)) v.email = 'Enter a valid email';
    if (passwordError(f.password)) v.password = passwordError(f.password);
    if (needsBranch && !f.branch_id) v.branch_id = 'Select a branch';
    setErrors(v);
    if (Object.keys(v).length) return;

    setBusy(true);
    setServerError('');
    try {
      await createUser({ email: f.email.trim(), password: f.password, role: f.role, branch_id: needsBranch ? f.branch_id : null });
      toast.success('Staff account created');
      onSaved();
      setCreated({ email: f.email.trim(), password: f.password });
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
      title="Create staff account"
      subtitle="Assign credentials, role and branch."
      footer={
        created ? <div className="flex justify-end"><Button onClick={onClose}>Done</Button></div> : (
          <div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" form="user-form" loading={busy}>Create account</Button></div>
        )
      }
    >
      {created ? (
        <div className="space-y-4">
          <InlineAlert tone="success">Account created. Share these credentials securely — the password is not shown again.</InlineAlert>
          <div className="rounded-xl bg-navy-50 p-4 font-mono text-sm">
            <p>{created.email}</p>
            <p className="mt-1">{created.password}</p>
          </div>
          <Button variant="outline" onClick={() => navigator.clipboard?.writeText(`${created.email}\n${created.password}`).then(() => toast.success('Copied'))}>
            <Icon name="download" /> Copy credentials
          </Button>
        </div>
      ) : (
        <form id="user-form" onSubmit={submit} noValidate className="space-y-4">
          {serverError && <InlineAlert>{serverError}</InlineAlert>}
          <Input label="Email" type="email" required autoComplete="off" value={f.email} error={errors.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          <Field label="Temporary password" required error={errors.password}>
            <div className="relative">
              <input type={show ? 'text' : 'password'} autoComplete="new-password" className="input pr-24 font-mono" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} aria-label="Temporary password" />
              <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 gap-1">
                <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} className="rounded-lg p-1.5 text-navy-400 hover:text-navy-700"><Icon name={show ? 'eyeOff' : 'eye'} /></button>
                <button type="button" onClick={() => { setF({ ...f, password: generatePassword() }); setShow(true); }} className="rounded-lg bg-gold-100 px-2 text-[11px] font-semibold text-gold-800 hover:bg-gold-200">Generate</button>
              </div>
            </div>
          </Field>
          <Select label="Role" required value={f.role} onChange={(e) => setF({ ...f, role: e.target.value, branch_id: e.target.value === 'admin' ? '' : f.branch_id })}>
            {STAFF_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </Select>
          {needsBranch && (
            <Select label="Branch" required value={f.branch_id} error={errors.branch_id} onChange={(e) => setF({ ...f, branch_id: e.target.value })}>
              <option value="" disabled>Select a branch…</option>
              {branches.map((b) => <option key={b.branch_id} value={b.branch_id}>{b.name}</option>)}
            </Select>
          )}
          <div className="rounded-xl bg-gold-50 p-4 text-sm text-gold-900">
            <p className="font-semibold">Access scope</p>
            <p className="mt-1 text-xs">{role.scope}{needsBranch && branch ? ` Limited to ${branch.name}.` : ''}</p>
          </div>
        </form>
      )}
    </Drawer>
  );
}

function EditDrawer({ user, branches, onClose, onSaved }) {
  const toast = useToast();
  const [role, setRole] = useState('');
  const [branchId, setBranchId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setRole(user.role);
      setBranchId(user.branch_id || '');
      setError('');
    }
  }, [user]);

  const needsBranch = role !== 'admin';

  const submit = async (e) => {
    e.preventDefault();
    if (needsBranch && !branchId) return setError('Select a branch for this role.');
    const payload = {};
    if (role !== user.role) payload.role = role;
    if (branchId !== (user.branch_id || '')) payload.branch_id = needsBranch ? branchId : '';
    if (role === 'admin' && user.branch_id) payload.branch_id = '';
    if (!Object.keys(payload).length) return onClose();
    setBusy(true);
    try {
      await patchUser(user.account_id, payload);
      toast.success('Account updated');
      onSaved();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer
      open={Boolean(user)}
      onClose={onClose}
      title="Edit access"
      subtitle={user?.email}
      footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" form="edit-user-form" loading={busy}>Save changes</Button></div>}
    >
      <form id="edit-user-form" onSubmit={submit} className="space-y-4" noValidate>
        {error && <InlineAlert>{error}</InlineAlert>}
        <Select label="Role" value={role} onChange={(e) => setRole(e.target.value)}>
          {STAFF_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </Select>
        {needsBranch && (
          <Select label="Branch" required value={branchId} onChange={(e) => setBranchId(e.target.value)}>
            <option value="" disabled>Select a branch…</option>
            {branches.map((b) => <option key={b.branch_id} value={b.branch_id}>{b.name}</option>)}
          </Select>
        )}
        <p className="text-xs text-navy-500">Changes apply the next time the user signs in.</p>
      </form>
    </Drawer>
  );
}

export default function UsersTab({ branches }) {
  const { data, isLoading, error, refetch } = useFetch((s) => listUsers(s), []);
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [branch, setBranch] = useState('');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => setPage(1), [q, role, branch]);

  const users = data?.users || [];
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return users.filter(
      (u) =>
        (!role || u.role === role) &&
        (!branch || u.branch_id === branch) &&
        (!needle || [u.email, u.guest_name, u.branch_name].some((s) => s?.toLowerCase().includes(needle))),
    );
  }, [users, q, role, branch]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search email or name…" aria-label="Search users" className="input w-60 pl-9" />
          </div>
          <select aria-label="Filter by role" className="input !w-auto" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">All roles</option>
            {['admin', 'manager', 'receptionist', 'guest'].map((r) => <option key={r} value={r}>{r[0].toUpperCase() + r.slice(1)}</option>)}
          </select>
          <select aria-label="Filter by branch" className="input !w-auto" value={branch} onChange={(e) => setBranch(e.target.value)}>
            <option value="">All branches</option>
            {branches.map((b) => <option key={b.branch_id} value={b.branch_id}>{b.name}</option>)}
          </select>
        </div>
        <Button onClick={() => setCreating(true)}><Icon name="user" /> Create staff account</Button>
      </div>

      {error ? <ErrorState message={error} onRetry={refetch} /> : isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : rows.length === 0 ? (
        <EmptyState icon="users" title="No users match" message="Adjust the search or filters." />
      ) : (
        <div className="card overflow-hidden">
          <p className="border-b border-navy-100 px-4 py-2.5 text-xs text-navy-500">Showing {Math.min(rows.length, PAGE_SIZE)} of {rows.length} accounts</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px]">
              <thead className="bg-navy-50"><tr><th className="th">User</th><th className="th">Role</th><th className="th">Branch</th><th className="th text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-navy-100">
                {rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((u) => (
                  <tr key={u.account_id} className="hover:bg-navy-50/50">
                    <td className="td">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-900 text-[11px] font-bold text-gold-200">{initials(u.guest_name || u.email)}</span>
                        <div><p className="font-semibold">{u.guest_name || u.email.split('@')[0]}</p><p className="text-xs text-navy-500">{u.email}</p></div>
                      </div>
                    </td>
                    <td className="td"><Badge tone={ROLE_TONE[u.role]}>{u.role}</Badge></td>
                    <td className="td">{u.branch_name || (u.role === 'admin' ? 'Global (all branches)' : '—')}</td>
                    <td className="td text-right">
                      <Button size="sm" variant="outline" disabled={u.role === 'guest'} title={u.role === 'guest' ? 'Guest accounts are self-managed' : undefined} onClick={() => setEditing(u)}>
                        <Icon name="edit" className="h-3.5 w-3.5" /> Edit role
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-navy-100"><Pagination page={page} pageSize={PAGE_SIZE} total={rows.length} onChange={setPage} /></div>
        </div>
      )}
      <p className="text-xs text-navy-400">Accounts can’t be deleted — this preserves booking and payment audit history.</p>

      <CreateDrawer open={creating} onClose={() => setCreating(false)} branches={branches} onSaved={refetch} />
      <EditDrawer user={editing} branches={branches} onClose={() => setEditing(null)} onSaved={refetch} />
    </div>
  );
}
