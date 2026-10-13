// Underline tabs (spec 11 §6): text tabs, 2px tea-700 rule under the active one.
// tabs: [{ key, label, count? }]. Arrow keys, Home and End move between tabs.
// idBase (optional): gives each tab id `${idBase}-tab-${key}` and aria-controls
// `${idBase}-panel-${key}`, for callers that render a matching role="tabpanel".
export default function Tabs({ tabs, value, onChange, idBase, className = '' }) {
  const move = (key, list) => {
    onChange(key);
    // Keep focus on the newly active tab (roving tabindex).
    requestAnimationFrame(() => list.querySelector('[aria-selected="true"]')?.focus());
  };
  const onKeyDown = (e) => {
    const i = tabs.findIndex((t) => t.key === value);
    const next = {
      ArrowRight: (i + 1) % tabs.length,
      ArrowLeft: (i - 1 + tabs.length) % tabs.length,
      Home: 0,
      End: tabs.length - 1,
    }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    move(tabs[next].key, e.currentTarget);
  };
  return (
    <div role="tablist" onKeyDown={onKeyDown} className={`flex gap-6 overflow-x-auto border-b border-ink-100 ${className}`}>
      {tabs.map((t) => {
        const active = t.key === value;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            id={idBase ? `${idBase}-tab-${t.key}` : undefined}
            aria-controls={idBase ? `${idBase}-panel-${t.key}` : undefined}
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(t.key)}
            className={`-mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 py-2.5 text-sm font-medium transition-colors duration-150 ${
              active ? 'border-tea-700 text-ink-900' : 'border-transparent text-ink-600 hover:text-ink-900'
            }`}
          >
            {t.label}
            {t.count != null && <span className="tabular font-normal text-ink-600">{t.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
