import Icon from './Icon';

// Client-side pagination footer.
export default function Pagination({ page, pageSize, total, onChange }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) {
    return <p className="px-4 py-3 text-xs text-navy-500">Showing {total} of {total}</p>;
  }
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <p className="text-xs text-navy-500">Showing {from}–{to} of {total}</p>
      <div className="flex items-center gap-1">
        <button
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          aria-label="Previous page"
          className="rounded-lg p-1.5 text-navy-600 hover:bg-navy-100 disabled:opacity-30"
        >
          <Icon name="chevronLeft" />
        </button>
        <span className="px-2 text-xs font-semibold">{page} / {pages}</span>
        <button
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
          aria-label="Next page"
          className="rounded-lg p-1.5 text-navy-600 hover:bg-navy-100 disabled:opacity-30"
        >
          <Icon name="chevronRight" />
        </button>
      </div>
    </div>
  );
}
