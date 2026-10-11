// tabs: [{ key, label, count? }]. Arrow keys move between tabs.
export default function Tabs({ tabs, value, onChange, className = '' }) {
  const onKeyDown = (e) => {
    const i = tabs.findIndex((t) => t.key === value);
    if (e.key === 'ArrowRight') onChange(tabs[(i + 1) % tabs.length].key);
    if (e.key === 'ArrowLeft') onChange(tabs[(i - 1 + tabs.length) % tabs.length].key);
  };
  return (
    <div role="tablist" onKeyDown={onKeyDown} className={`flex gap-1 overflow-x-auto rounded-xl bg-navy-50 p-1 ${className}`}>
      {tabs.map((t) => {
        const active = t.key === value;
        return (
          <button
            key={t.key}
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(t.key)}
            className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition ${
              active ? 'bg-navy-900 text-white shadow-sm' : 'text-navy-600 hover:bg-white'
            }`}
          >
            {t.label}
            {t.count != null && (
              <span className={`rounded-full px-2 py-0.5 text-[10px] ${active ? 'bg-white/20' : 'bg-navy-100'}`}>{t.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
