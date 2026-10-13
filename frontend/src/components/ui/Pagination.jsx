import Icon from './Icon';

const NAV_BTN = 'rounded-md p-1.5 text-tea-700 hover:bg-tea-100 disabled:pointer-events-none disabled:text-ink-300';

// Client-side pagination footer.
export default function Pagination({ page, pageSize, total, onChange }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) {
    return <p className="px-4 py-3 text-2xs text-ink-600">Showing {total} of {total}</p>;
  }
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <nav className="flex items-center justify-between gap-3 px-4 py-3" aria-label="Pagination">
      <p className="text-2xs tabular text-ink-600">Showing {from}–{to} of {total}</p>
      <div className="flex items-center gap-1">
        <button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page" className={NAV_BTN}>
          <Icon name="chevronLeft" />
        </button>
        <span className="px-2 text-2xs font-medium tabular text-ink-900" aria-current="page">
          Page {page} of {pages}
        </span>
        <button type="button" disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Next page" className={NAV_BTN}>
          <Icon name="chevronRight" />
        </button>
      </div>
    </nav>
  );
}
