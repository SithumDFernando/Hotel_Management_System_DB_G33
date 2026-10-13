import { useId } from 'react';
import { addDays, todayISO } from '@/utils/formatters';
import Button from '@/components/ui/Button';

// Shared stay search form (Home opening + Rooms filter bar).
// value: { city, type, check_in, check_out, guests }
// lockedBranch (branch staff): the branch is fixed and shown, not chosen.
export default function StaySearch({ branches = [], types = [], value, onChange, onSubmit, submitLabel = 'Check availability', showType = false, compact = false, error, lockedBranch }) {
  const today = todayISO();
  const errorId = useId();
  const set = (patch) => {
    const next = { ...value, ...patch };
    // keep check-out after check-in
    if (next.check_in && next.check_out && next.check_out <= next.check_in) next.check_out = addDays(next.check_in, 1);
    onChange(next);
  };
  const dateProps = { 'aria-invalid': error ? true : undefined, 'aria-describedby': error ? errorId : undefined };

  // compact: two columns at every width from sm up (for a half-width column, e.g. Home).
  const cols = compact ? '' : showType ? 'lg:grid-cols-[1.2fr_1fr_1fr_1fr_0.8fr_auto]' : 'lg:grid-cols-[1.3fr_1fr_1fr_1fr_auto]';
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.(value);
      }}
      className={`grid items-start gap-3 sm:grid-cols-2 ${cols}`}
    >
      {lockedBranch !== undefined ? (
        // Shown as text, not a disabled select: disabled text is too faint to read.
        <div>
          <span className="label">Branch</span>
          <p className="input truncate bg-paper-200 text-ink-900">
            {lockedBranch ? `${lockedBranch.city} · ${lockedBranch.name}` : 'Your branch'}
          </p>
          <span className="mt-1 block text-2xs text-ink-600">Staff book rooms in their own branch.</span>
        </div>
      ) : (
        <label className="block">
          <span className="label">Branch</span>
          <select className="input" value={value.city || ''} onChange={(e) => set({ city: e.target.value })}>
            <option value="">All branches</option>
            {branches.map((b) => (
              <option key={b.branch_id} value={b.city}>{b.city} · {b.name}</option>
            ))}
          </select>
        </label>
      )}

      {showType && (
        <label className="block">
          <span className="label">Room type</span>
          <select className="input" value={value.type || ''} onChange={(e) => set({ type: e.target.value })}>
            <option value="">All types</option>
            {types.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
      )}

      <label className="block">
        <span className="label">Check-in</span>
        <input type="date" className="input" min={today} value={value.check_in || ''} onChange={(e) => set({ check_in: e.target.value })} {...dateProps} />
      </label>
      <label className="block">
        <span className="label">Check-out</span>
        <input
          type="date"
          className="input"
          min={value.check_in ? addDays(value.check_in, 1) : addDays(today, 1)}
          value={value.check_out || ''}
          onChange={(e) => set({ check_out: e.target.value })}
          {...dateProps}
        />
      </label>
      <label className="block">
        <span className="label">Guests</span>
        <select className="input" value={value.guests || '1'} onChange={(e) => set({ guests: e.target.value })}>
          {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n} {n === 1 ? 'guest' : 'guests'}</option>)}
        </select>
      </label>

      {onSubmit && (
        <Button type="submit" variant="primary" className={`w-full self-end sm:col-span-2 ${compact ? '' : 'lg:col-span-1 lg:w-auto'}`}>
          {submitLabel}
        </Button>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-[13px] text-signal-700 sm:col-span-2 lg:col-span-full">
          {error}
        </p>
      )}
    </form>
  );
}
