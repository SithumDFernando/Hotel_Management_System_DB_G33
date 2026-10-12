import { useEffect, useMemo, useState } from 'react';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import Pagination from '@/components/ui/Pagination';
import { ErrorState, Skeleton } from '@/components/ui/States';
import { downloadCSV } from '@/utils/formatters';

// columns: [{ key, label, align?: 'right', format?(value,row)->string, render?(row)->node, sortable?: false }]
// `format` is also used for CSV; `render` is display-only.
export default function ReportTable({
  title,
  columns,
  data,
  isLoading,
  error,
  onRetry,
  emptyMessage = 'No data for the selected filters.',
  exportName,
  pageSize = 10,
  toolbar,
  summary,
}) {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState(null); // { key, dir }
  const [page, setPage] = useState(1);

  useEffect(() => setPage(1), [q, data]);

  const rows = useMemo(() => {
    let list = data || [];
    const needle = q.trim().toLowerCase();
    if (needle) list = list.filter((r) => Object.values(r).some((v) => v != null && String(v).toLowerCase().includes(needle)));
    if (sort) {
      const f = sort.dir === 'asc' ? 1 : -1;
      list = [...list].sort((a, b) => {
        const x = a[sort.key];
        const y = b[sort.key];
        if (x == null) return 1;
        if (y == null) return -1;
        return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y))) * f;
      });
    }
    return list;
  }, [data, q, sort]);

  const toggleSort = (key) =>
    setSort((s) => (s?.key !== key ? { key, dir: 'asc' } : s.dir === 'asc' ? { key, dir: 'desc' } : null));

  const exportCSV = () =>
    downloadCSV(
      `${exportName || 'report'}.csv`,
      columns.filter((c) => c.key),
      rows.map((r) => Object.fromEntries(columns.filter((c) => c.key).map((c) => [c.key, c.format ? c.format(r[c.key], r) : r[c.key]]))),
    );

  return (
    <div className="card min-w-0 overflow-hidden">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-ink-100 p-4">
        {title ? <h2 className="text-base font-semibold text-ink-900">{title}</h2> : <span />}
        <div className="flex flex-wrap items-end gap-2">
          {toolbar}
          <div className="relative">
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-600" />
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search rows" aria-label={`Search ${title || 'report'}`} className="input w-48 pl-9" />
          </div>
          <Button variant="secondary" onClick={exportCSV} disabled={!rows.length}>Export CSV</Button>
        </div>
      </div>

      {error ? (
        <div className="p-6"><ErrorState message={error} onRetry={onRetry} /></div>
      ) : isLoading ? (
        <div className="space-y-2 p-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
      ) : rows.length === 0 ? (
        <p className="px-4 py-6 text-sm text-ink-600">{q ? `No rows match “${q.trim()}”.` : emptyMessage}</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="sticky top-0">
                <tr className="bg-paper-200">
                  {columns.map((c) => {
                    // Action columns have no key; without this, undefined === undefined
                    // marks them sorted while nothing is, and sort.dir throws.
                    const active = Boolean(c.key) && sort?.key === c.key;
                    const sortable = c.key && c.sortable !== false;
                    return (
                      <th key={c.key || c.label} scope="col" className={`th whitespace-nowrap ${c.align === 'right' ? 'text-right' : ''}`} aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
                        {sortable ? (
                          <button type="button" onClick={() => toggleSort(c.key)} className="inline-flex items-center gap-1 rounded-sm hover:text-ink-900">
                            {c.label}
                            <span className="text-[10px]" aria-hidden="true">{active ? (sort.dir === 'asc' ? '▲' : '▼') : ''}</span>
                          </button>
                        ) : c.label}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {rows.slice((page - 1) * pageSize, page * pageSize).map((r, i) => (
                  <tr key={i} className="hover:bg-paper-100">
                    {columns.map((c) => (
                      <td key={c.key || c.label} className={`td ${c.align === 'right' ? 'whitespace-nowrap text-right tabular' : ''}`}>
                        {c.render ? c.render(r) : c.format ? c.format(r[c.key], r) : (r[c.key] ?? '–')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {summary && <div className="border-t border-ink-100 px-4 py-3 text-[13px] tabular text-ink-600">{summary(rows)}</div>}
          <div className="border-t border-ink-100"><Pagination page={page} pageSize={pageSize} total={rows.length} onChange={setPage} /></div>
        </>
      )}
    </div>
  );
}
