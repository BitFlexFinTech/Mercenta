import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Search } from 'lucide-react';

/**
 * §Stage-19.2 — THE data-list primitive: search, filter, column sort,
 * pagination. Every admin/brand data list renders through this so real-volume
 * usability is structural, not per-screen heroics.
 */

export interface DataTableColumn<T> {
  key: string;
  header: string;
  /** Plain value used for sorting; also the default cell render. */
  value: (row: T) => string | number;
  /** Optional custom cell rendering. */
  render?: (row: T) => ReactNode;
  className?: string;
}

export interface DataTableFilter<T> {
  key: string;
  label: string;
  /** Distinct options computed from `option` per row when omitted. */
  option?: (row: T) => string;
  explicitOptions?: string[];
  match: (row: T, selected: string) => boolean;
}

interface Props<T extends { id: string }> {
  rows: T[];
  columns: DataTableColumn<T>[];
  rowsId?: (row: T) => string;
  searchText?: (row: T) => string;
  filters?: DataTableFilter<T>[];
  pageSizeDefault?: number;
  emptyMessage?: string;
  /** §Batch-23 — Click-to-detail support. */
  onRowClick?: (row: T) => void;
}

function useTableState<T extends { id: string }>({ rows, columns, rowsId = (r) => r.id, searchText, filters = [], pageSizeDefault = 10, emptyMessage = 'No records.' }: Props<T>) {
  const [query, setQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [pageSize, setPageSize] = useState(pageSizeDefault);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    let out = rows;
    if (query.trim() && searchText) {
      const q = query.toLowerCase();
      out = out.filter((r) => searchText(r).toLowerCase().includes(q));
    }
    for (const f of filters) {
      const sel = activeFilters[f.key];
      if (sel && sel !== 'all') out = out.filter((r) => f.match(r, sel));
    }
    return out;
  }, [rows, query, activeFilters, searchText, filters]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const col = columns.find((c) => c.key === sortKey);
    if (!col) return filtered;
    return [...filtered].sort((a, b) => {
      const av = col.value(a);
      const bv = col.value(b);
      const cmp =
        typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir, columns]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = sorted.slice(safePage * pageSize, safePage * pageSize + pageSize);

  function toggleSort(key: string) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(0);
  }

  return {
    rowsId, emptyMessage, query, setQuery, filters, activeFilters,
    setActiveFilters, sorted, pageRows, pageCount, safePage, setPage,
    pageSize, setPageSize, toggleSort, sortKey, sortDir, searchText,
  };
}

export function DataTable<T extends { id: string }>(props: Props<T>) {
  const t = useTableState(props);
  const hasToolbar = Boolean(t.searchText || t.filters.length > 0);

  return (
    <div className="space-y-3">
      {/* Toolbar: search + filters */}
      {hasToolbar && (
        <div className="flex flex-wrap items-center gap-2">
          {t.searchText && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-600 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                value={t.query}
                onChange={(e) => {
                  t.setQuery(e.target.value);
                  t.setPage(0);
                }}
                placeholder="Search…"
                className="bg-ink-900 border border-white/[0.08] rounded-md pl-8 pr-3 py-1.5 text-xs text-white w-52 focus:outline-none focus:border-brass-500/40"
              />
            </div>
          )}
          {t.filters.map((f) => {
            const options =
              f.explicitOptions ??
              Array.from(new Set(props.rows.map((r) => (f.option ? f.option(r) : ''))))
                .filter(Boolean)
                .sort();
            return (
              <select
                key={f.key}
                value={t.activeFilters[f.key] ?? 'all'}
                onChange={(e) => {
                  t.setActiveFilters((prev) => ({ ...prev, [f.key]: e.target.value }));
                  t.setPage(0);
                }}
                className="bg-ink-900 border border-white/[0.08] rounded-md px-2 py-1.5 text-xs text-zinc-300 cursor-pointer"
              >
                <option value="all">{f.label}: all</option>
                {options.map((o) => (
                  <option key={o} value={o}>
                    {f.label}: {o}
                  </option>
                ))}
              </select>
            );
          })}
          <span className="ml-auto text-ds-micro text-zinc-600">
            {t.sorted.length} record{t.sorted.length === 1 ? '' : 's'}
          </span>
        </div>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/[0.06] text-xs text-zinc-500">
            {props.columns.map((c) => (
              <th
                key={c.key}
                className={cn(
                  'text-left font-medium px-4 py-2.5 cursor-pointer select-none hover:text-zinc-300',
                  c.className
                )}
                onClick={() => t.toggleSort(c.key)}
              >
                <span className="inline-flex items-center gap-1">
                  {c.header}
                  {t.sortKey === c.key &&
                    (t.sortDir === 'asc' ? (
                      <ArrowUp className="w-3 h-3" />
                    ) : (
                      <ArrowDown className="w-3 h-3" />
                    ))}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.04]">
          {t.pageRows.map((row) => (
            <tr key={t.rowsId(row)} className={cn('text-zinc-300', props.onRowClick ? 'cursor-pointer hover:bg-white/[0.02]' : '')} onClick={props.onRowClick ? function() { props.onRowClick!(row); } : undefined}>
              {props.columns.map((c) => (
                <td key={c.key} className={cn('px-4 py-2.5', c.className)}>
                  {c.render ? c.render(row) : String(c.value(row))}
                </td>
              ))}
            </tr>
          ))}
          {t.pageRows.length === 0 && (
            <tr>
              <td colSpan={props.columns.length} className="text-center text-xs text-zinc-600 py-8">
                {t.emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Pagination */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2 text-ds-label text-zinc-500">
          <span>Rows</span>
          <select
            value={t.pageSize}
            onChange={(e) => {
              t.setPageSize(Number(e.target.value));
              t.setPage(0);
            }}
            className="bg-ink-900 border border-white/[0.08] rounded-md px-1.5 py-1 text-xs text-zinc-300"
          >
            {[10, 25, 50].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button
            disabled={t.safePage === 0}
            onClick={() => t.setPage(t.safePage - 1)}
            className="p-1 rounded-md text-zinc-500 hover:text-white disabled:opacity-30"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-ds-label text-zinc-400 font-mono">
            {t.safePage + 1} / {t.pageCount}
          </span>
          <button
            disabled={t.safePage >= t.pageCount - 1}
            onClick={() => t.setPage(t.safePage + 1)}
            className="p-1 rounded-md text-zinc-500 hover:text-white disabled:opacity-30"
            aria-label="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

