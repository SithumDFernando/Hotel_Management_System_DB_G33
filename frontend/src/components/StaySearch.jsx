import { addDays, todayISO } from '@/utils/formatters';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';

// Shared stay search form (Home hero + Rooms filter bar).
// value: { city, type, check_in, check_out, guests }
export default function StaySearch({ branches = [], types = [], value, onChange, onSubmit, submitLabel = 'Search', showType = false, error }) {
  const today = todayISO();
  const set = (patch) => {
    const next = { ...value, ...patch };
    // keep check-out after check-in
    if (next.check_in && next.check_out && next.check_out <= next.check_in) next.check_out = addDays(next.check_in, 1);
    onChange(next);
  };

  const cols = showType ? 'lg:grid-cols-[1.2fr_1fr_1fr_1fr_0.8fr_auto]' : 'lg:grid-cols-[1.3fr_1fr_1fr_1fr_auto]';
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.(value);
      }}
      className={`grid items-end gap-3 sm:grid-cols-2 ${cols}`}
    >
      <label className="block">
        <span className="label"><Icon name="mapPin" className="mr-1 inline h-3 w-3" />Branch</span>
        <select className="input" value={value.city || ''} onChange={(e) => set({ city: e.target.value })}>
          <option value="">All branches</option>
          {branches.map((b) => (
            <option key={b.branch_id} value={b.city}>{b.name} · {b.city}</option>
          ))}
        </select>
      </label>

      {showType && (
        <label className="block">
          <span className="label"><Icon name="bed" className="mr-1 inline h-3 w-3" />Room type</span>
          <select className="input" value={value.type || ''} onChange={(e) => set({ type: e.target.value })}>
            <option value="">All types</option>
            {types.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
      )}

      <label className="block">
        <span className="label"><Icon name="calendar" className="mr-1 inline h-3 w-3" />Check-in</span>
        <input type="date" className="input" min={today} value={value.check_in || ''} onChange={(e) => set({ check_in: e.target.value })} />
      </label>
      <label className="block">
        <span className="label"><Icon name="calendar" className="mr-1 inline h-3 w-3" />Check-out</span>
        <input
          type="date"
          className="input"
          min={value.check_in ? addDays(value.check_in, 1) : addDays(today, 1)}
          value={value.check_out || ''}
          onChange={(e) => set({ check_out: e.target.value })}
        />
      </label>
      <label className="block">
        <span className="label"><Icon name="users" className="mr-1 inline h-3 w-3" />Guests</span>
        <select className="input" value={value.guests || '1'} onChange={(e) => set({ guests: e.target.value })}>
          {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n} {n === 1 ? 'guest' : 'guests'}</option>)}
        </select>
      </label>

      {onSubmit && (
        <Button type="submit" variant="primary" size="lg" className="sm:col-span-2 lg:col-span-1">
          <Icon name="search" /> {submitLabel}
        </Button>
      )}
      {error && <p role="alert" className="text-xs text-red-600 sm:col-span-2 lg:col-span-full">{error}</p>}
    </form>
  );
}
