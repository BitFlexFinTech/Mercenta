import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowUpDown, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { DataTable as CanonicalDataTable } from '@/components/ui';

/**
 * §Stage-19.2 — the SEARCH / FILTER / SORT / PAGINATION layer over a data list.
 *
 * §Wave-3 Part 4 (2026-10-08) — CONSOLIDATED, not duplicated. This module used to
 * render its OWN `<table>` markup, which meant two owners of one presentation and
 * a second table missing every canonical contract the 24 surfaces using
 * `@/components/ui` → `DataTable` already had: no `scope="col"`, no `<caption>`,
 * no `data-table` hook, no empty/loading state and — the defect the Wave-3 Part 4
 * audit measured — NO mobile strategy, so at ≤768px its 6–7 column table widened
 * the whole content region and the page had to be scrolled sideways to read a row,
 * while every other table on the platform rendered labelled cards.
 *
 * It now keeps ONLY what it uniquely owns — query, filters, sort, pagination —
 * and renders through the canonical `DataTable`, so both of its surfaces
 * (`CatalogManagerAdmin`, `ContractsAdminPanel`) gained the canonical semantics,
 * the below-`md` labelled-card list, and the empty/loading/error states. No
 * capability was removed: search, filter, sort and pagination all still work, and
 * sorting is now keyboard- and screen-reader-reachable (it used to be a
 * mouse-only click on a `<th>`).
 */

export interface DataTableColumn<T> {
  key: string;
  header: string;
  /** Plain value used for sorting; also the default cell render. */
  value: (row: T) => string | number;
  /** Optional custom cell rendering. */
  render?: (row: T) => ReactNode;
  /** Appended to the header and cell classes (e.g. `text-right` for money). */
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
  /** Stable hook for the semantic `<table>` (`data-table="…"`). */
  dataTable?: string;
  /** The table's accessible name (rendered as a `sr-only` caption). */
  caption?: string;
}

const CONTROL =
  'bg-ink-900 border border-white/[0.08] rounded-md text-xs text-zinc-300 focus:outline-none focus:border-brass-500/40';

export function DataTable<T extends { id: string }>({
  rows,
  columns,
  rowsId = (r) => r.id,
  searchText,
  filters = [],
  pageSizeDefault = 10,
  emptyMessage = 'No records.',
  onRowClick,
  dataTable,
  caption = 'Data table',
}: Props<T>) {
  const [query, setQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [sortKey, setSortKey] = useState('');
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

  /** The canonical presentation owns label/align/primary; this layer owns order. */
  const canonicalColumns = columns.map((c, i) => ({
    key: c.key,
    label: c.header,
    className: c.className,
    align: /text-right/.test(c.className ?? '') ? ('right' as const) : undefined,
    primary: i === 0,
    render: (r: T) => (c.render ? c.render(r) : String(c.value(r))),
  }));

  const hasToolbar = Boolean(searchText || filters.length > 0);

  return (
    <div className="space-y-3">
      {/* Toolbar: search + filters + sort. Every control carries an accessible
          name — a placeholder is NOT one, and this toolbar previously had none. */}
      {hasToolbar && (
        <div className="flex flex-wrap items-center gap-2">
          {searchText && (
            <div className="relative">
              <Search
                className="w-3.5 h-3.5 text-zinc-600 absolute left-2.5 top-1/2 -translate-y-1/2"
                aria-hidden="true"
              />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
                placeholder="Search…"
                aria-label={`Search ${caption}`}
                className={`${CONTROL} pl-8 pr-3 py-1.5 text-white w-52`}
              />
            </div>
          )}
          {filters.map((f) => {
            const options =
              f.explicitOptions ??
              Array.from(new Set(rows.map((r) => (f.option ? f.option(r) : ''))))
                .filter(Boolean)
                .sort();
            return (
              <select
                key={f.key}
                value={activeFilters[f.key] ?? 'all'}
                onChange={(e) => {
                  setActiveFilters((prev) => ({ ...prev, [f.key]: e.target.value }));
                  setPage(0);
                }}
                aria-label={`Filter by ${f.label}`}
                className={`${CONTROL} px-2 py-1.5 cursor-pointer`}
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
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-zinc-600" aria-hidden="true" />
            <select
              value={sortKey}
              onChange={(e) => {
                setSortKey(e.target.value);
                setPage(0);
              }}
              aria-label="Sort by column"
              className={`${CONTROL} px-2 py-1.5 cursor-pointer`}
            >
              <option value="">Sort: default order</option>
              {columns.map((c) => (
                <option key={c.key} value={c.key}>
                  Sort: {c.header}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!sortKey}
              onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
              aria-label={`Sort direction: ${sortDir === 'asc' ? 'ascending' : 'descending'}`}
              className="rounded-md border border-white/[0.08] bg-ink-900 px-2 py-1.5 text-xs text-zinc-300 hover:text-white disabled:opacity-40 transition-ds duration-ds-fast"
            >
              {sortDir === 'asc' ? 'Asc' : 'Desc'}
            </button>
          </div>
          <span className="ml-auto text-ds-micro text-zinc-600">
            {sorted.length} record{sorted.length === 1 ? '' : 's'}
          </span>
        </div>
      )}

      {/* §Wave-3 Part 4 — the ONE canonical presentation: `scope="col"` headers,
          a `sr-only` caption, the `data-table` hook, and the labelled card list
          below `md` (so a narrow screen never has to scroll sideways). */}
      <CanonicalDataTable<T>
        columns={canonicalColumns}
        rows={pageRows}
        rowKey={rowsId}
        onRowClick={onRowClick}
        emptyMessage={emptyMessage}
        caption={caption}
        dataTable={dataTable}
      />

      {/* Pagination */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2 text-ds-label text-zinc-500">
          <span>Rows</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(0);
            }}
            aria-label="Rows per page"
            className={`${CONTROL} px-1.5 py-1`}
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
            type="button"
            disabled={safePage === 0}
            onClick={() => setPage(safePage - 1)}
            className="p-1 rounded-md text-zinc-500 hover:text-white disabled:opacity-30"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          </button>
          <span className="text-ds-label text-zinc-400 font-mono">
            {safePage + 1} / {pageCount}
          </span>
          <button
            type="button"
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage(safePage + 1)}
            className="p-1 rounded-md text-zinc-500 hover:text-white disabled:opacity-30"
            aria-label="Next page"
          >
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
