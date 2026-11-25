import { useEffect, useState, type ReactNode } from 'react';
import { AlertCircle, ChevronLeft, ChevronRight, Inbox, RefreshCw, X } from 'lucide-react';
import type { StatusTone } from '@/components/ui';
import { WorkspaceHeader } from '@/components/shared/workspace';

/* ── PAGE HEADER ──────────────────────────────────────────────────────────── */

/* ── CONSOLE HEADER ─────────────────────────────────────────────────────────
 * §WAVE 2 (2026-11-25) — the console composes the CANONICAL workspace header
 * (`<WorkspaceHeader>` in `src/components/shared/workspace.tsx`) rather than
 * carrying a second page-header implementation. `validate-workspace-shell`
 * rule 5 forbids a retired `PageHeader` on an operational surface, and the
 * canonical primitive is the one that owns surface identity and the toolbar.
 * The API is the subset the console screens already used, plus `eyebrow` and
 * `toolbar` so a screen can adopt the canonical affordances without rewriting.
 */

export interface ConsoleHeaderProps {
  title: string;
  description?: string;
  meta?: ReactNode;
  actions?: ReactNode;
  eyebrow?: string;
  toolbar?: ReactNode;
}

export function ConsoleHeader({
  title,
  description,
  meta,
  actions,
  eyebrow,
  toolbar,
}: ConsoleHeaderProps) {
  return (
    <WorkspaceHeader
      eyebrow={eyebrow}
      title={title}
      description={description}
      meta={meta}
      actions={actions}
      toolbar={toolbar}
    />
  );
}

/* ── STATE BLOCKS (LOADING / ERROR / EMPTY) ───────────────────────────────── */

export function LoadingRows({
  rows = 5,
  label = 'Loading records…',
}: {
  rows?: number;
  label?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className="border border-zinc-200 bg-white rounded-ds-md divide-y divide-zinc-200"
    >
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-44 bg-zinc-100 rounded-ds-sm animate-pulse" />
            <div className="h-3 w-72 max-w-full bg-zinc-100 rounded-ds-sm animate-pulse" />
          </div>
          <div className="h-4 w-20 bg-zinc-100 rounded-ds-sm animate-pulse" />
        </div>
      ))}
    </div>
  );
}

export function ErrorStateBlock({
  title = 'Unable to load records',
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="border border-state-danger/20 bg-state-danger/10 rounded-ds-md p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-state-danger shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <h2 className="text-ds-body font-semibold text-zinc-950">{title}</h2>
          <p className="mt-1 text-ds-body text-zinc-700">
            {message || 'An unexpected error occurred while reading the data store.'}
          </p>
        </div>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-ds-md border border-zinc-300 bg-white text-ds-label font-medium text-zinc-900 hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent shrink-0 whitespace-nowrap"
        >
          <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
          Retry
        </button>
      )}
    </div>
  );
}

export function EmptyStateBlock({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="border border-zinc-200 bg-white rounded-ds-md p-8 text-center">
      <Inbox className="w-6 h-6 text-zinc-400 mx-auto" aria-hidden="true" />
      <h2 className="mt-3 text-ds-title font-semibold text-zinc-950">{title}</h2>
      <p className="mt-1 text-ds-body text-zinc-600 max-w-md mx-auto">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-ds-md bg-accent text-white text-ds-label font-medium hover:bg-accent-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent whitespace-nowrap"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

/* ── METRIC STRIP (ONE-SURFACE FLAT GRID, CLICKABLE DRILL-DOWN) ──────────── */

export interface MetricItem {
  id: string;
  label: string;
  value: string;
  context?: string;
  active?: boolean;
  onClick?: () => void;
  testId?: string;
  valueTestId?: string;
}

export function MetricStrip({
  items,
  loading = false,
  columns = 4,
}: {
  items: MetricItem[];
  loading?: boolean;
  columns?: 3 | 4 | 6;
}) {
  const gridCols =
    columns === 6
      ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6'
      : columns === 3
        ? 'grid-cols-1 sm:grid-cols-3'
        : 'grid-cols-2 lg:grid-cols-4';

  if (loading) {
    return (
      <div className={`grid ${gridCols} gap-3 mb-6`}>
        {Array.from({ length: columns }).map((_, idx) => (
          <div key={idx} className="border border-zinc-200 bg-white rounded-ds-md p-4">
            <div className="h-3 w-20 bg-zinc-100 rounded-ds-sm animate-pulse" />
            <div className="mt-2 h-6 w-24 bg-zinc-100 rounded-ds-sm animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`grid ${gridCols} gap-3 mb-6`}>
      {items.map((item) => {
        const inner = (
          <>
            <div className="text-ds-micro font-medium uppercase tracking-[0.06em] text-zinc-500">
              {item.label}
            </div>
            <div
              className="mt-1.5 text-ds-page font-semibold text-zinc-950 tabular-nums font-mono"
              data-testid={item.valueTestId}
            >
              {item.value}
            </div>
            {item.context && (
              <div className="mt-1 text-ds-label text-zinc-600 truncate">{item.context}</div>
            )}
          </>
        );

        if (item.onClick) {
          return (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              data-testid={item.testId}
              className={`text-left border rounded-ds-md p-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                item.active
                  ? 'border-zinc-900 bg-zinc-50'
                  : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50/60'
              }`}
            >
              {inner}
            </button>
          );
        }

        return (
          <div
            key={item.id}
            data-testid={item.testId}
            className="border border-zinc-200 bg-white rounded-ds-md p-4"
          >
            {inner}
          </div>
        );
      })}
    </div>
  );
}

/* ── STATE INDICATOR (EXPLICIT TEXT LABEL + OPTIONAL COLOR) ───────────────── */

export type SemanticTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

/**
 * §PORT FIX (2026-11-25) — the canonical status kit (`src/components/ui.tsx`)
 * declares a sixth tone, `brass`, which is a brand accent rather than a state.
 * The console's semantic palette deliberately carries five states, so `brass`
 * maps to `neutral` here instead of widening the console's vocabulary.
 */
export function toSemanticTone(tone: StatusTone): SemanticTone {
  return tone === 'brass' ? 'neutral' : tone;
}

const TONE_TEXT: Record<SemanticTone, string> = {
  /* §WAVE 3 FIX (2026-11-25) — these were `text-state-success` / `amber-800` /
     `red-800` / `blue-800`. In this project those palette families are a ramp
     built from the BRAND HUE (`tailwind.config.js → brandHue(var(--mr-state-*))`),
     not literal greens and reds, so status text rendered very pale — measured on
     the admin portfolio table, where "Complete" was almost invisible. The console
     already declares its own AA-safe state colours in `next.css`
     (the success, warning, danger and info state colours), so the
     canonical classes are used instead. */
  neutral: 'text-zinc-700',
  success: 'text-state-success',
  warning: 'text-state-warning',
  danger: 'text-state-danger',
  info: 'text-state-info',
};

export function InlineStatus({
  label,
  tone = 'neutral',
  dataStatus,
}: {
  label: string;
  tone?: SemanticTone;
  dataStatus?: string;
}) {
  return (
    <span
      role="status"
      data-status={dataStatus}
      className={`text-ds-label font-medium whitespace-nowrap ${TONE_TEXT[tone]}`}
    >
      {label}
    </span>
  );
}

/* ── CONSOLE DATA TABLE (HAIRLINE RULES, RESPONSIVE <768px CARDS, PAGED) ─── */

export interface ConsoleColumn<T> {
  key: string;
  header: string;
  align?: 'left' | 'right';
  /** Hide in compact mobile card header/body? */
  mobilePrimary?: boolean;
  hideOnMobile?: boolean;
  render: (row: T) => ReactNode;
}

export function ConsoleTable<T>({
  rows,
  columns,
  rowKey,
  selectedKey,
  onRowClick,
  pageSize = 25,
  emptyTitle = 'No matching records',
  emptyDescription = 'Try clearing filters or search terms.',
  emptyActionLabel,
  onEmptyAction,
  renderExpanded,
  expandedKey,
  testId,
}: {
  rows: T[];
  columns: ConsoleColumn<T>[];
  rowKey: (row: T) => string;
  selectedKey?: string | null;
  onRowClick?: (row: T) => void;
  pageSize?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  renderExpanded?: (row: T) => ReactNode;
  expandedKey?: string | null;
  testId?: string;
}) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [rows.length]);

  if (rows.length === 0) {
    return (
      <EmptyStateBlock
        title={emptyTitle}
        description={emptyDescription}
        actionLabel={emptyActionLabel}
        onAction={onEmptyAction}
      />
    );
  }

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);

  return (
    <div className="border border-zinc-200 bg-white rounded-ds-md overflow-hidden" data-testid={testId}>
      {/* Desktop table >= 768px */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50/60">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={`px-4 py-2.5 text-ds-micro font-medium uppercase tracking-[0.06em] text-zinc-500 whitespace-nowrap ${
                    col.align === 'right' ? 'text-right' : 'text-left'
                  }`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {pageRows.map((row) => {
              const key = rowKey(row);
              const isSelected = selectedKey === key;
              const isExpanded = expandedKey === key;
              return (
                <FragmentRow
                  key={key}
                  row={row}
                  rowId={key}
                  columns={columns}
                  isSelected={isSelected}
                  isExpanded={isExpanded}
                  onRowClick={onRowClick}
                  renderExpanded={renderExpanded}
                />
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile card list < 768px */}
      <ul className="md:hidden divide-y divide-zinc-200">
        {pageRows.map((row) => {
          const key = rowKey(row);
          const isSelected = selectedKey === key;
          const isExpanded = expandedKey === key;
          return (
            <li
              key={key}
              className={`p-4 space-y-2.5 ${isSelected ? 'bg-zinc-50' : 'bg-white'}`}
            >
              {columns
                .filter((c) => !c.hideOnMobile)
                .map((col) => (
                  <div
                    key={col.key}
                    className="flex items-baseline justify-between gap-3 text-ds-body"
                  >
                    <span className="text-ds-micro uppercase tracking-[0.06em] text-zinc-500 shrink-0">
                      {col.header}
                    </span>
                    <div className="min-w-0 text-right">{col.render(row)}</div>
                  </div>
                ))}
              {onRowClick && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => onRowClick(row)}
                    className="text-ds-label font-medium text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    Inspect record
                  </button>
                </div>
              )}
              {isExpanded && renderExpanded && (
                <div className="pt-3 border-t border-zinc-200">{renderExpanded(row)}</div>
              )}
            </li>
          );
        })}
      </ul>

      {/* Pagination footer when > pageSize */}
      {totalPages > 1 && (
        <div className="border-t border-zinc-200 bg-zinc-50/40 px-4 py-2.5 flex items-center justify-between gap-4 text-ds-label text-zinc-600">
          <span className="tabular-nums font-mono">
            Showing {start + 1}–{Math.min(start + pageSize, rows.length)} of {rows.length}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
              className="p-1.5 rounded-ds-sm border border-zinc-200 bg-white text-zinc-700 disabled:opacity-40 hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-accent"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 tabular-nums font-mono">
              Page {safePage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Next page"
              className="p-1.5 rounded-ds-sm border border-zinc-200 bg-white text-zinc-700 disabled:opacity-40 hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-accent"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FragmentRow<T>({
  row,
  rowId,
  columns,
  isSelected,
  isExpanded,
  onRowClick,
  renderExpanded,
}: {
  row: T;
  rowId: string;
  columns: ConsoleColumn<T>[];
  isSelected: boolean;
  isExpanded: boolean;
  onRowClick?: (row: T) => void;
  renderExpanded?: (row: T) => ReactNode;
}) {
  return (
    <>
      <tr
        data-row-id={rowId}
        onClick={onRowClick ? () => onRowClick(row) : undefined}
        className={`${onRowClick ? 'cursor-pointer' : ''} ${
          isSelected ? 'bg-zinc-100/80' : 'hover:bg-zinc-50/80'
        } transition-colors`}
      >
        {columns.map((col) => (
          <td
            key={col.key}
            className={`px-4 py-3 text-ds-body text-zinc-900 align-top ${
              col.align === 'right' ? 'text-right tabular-nums font-mono' : 'text-left'
            }`}
          >
            {col.render(row)}
          </td>
        ))}
      </tr>
      {isExpanded && renderExpanded && (
        <tr className="bg-zinc-50/60">
          <td colSpan={columns.length} className="px-4 py-4">
            {renderExpanded(row)}
          </td>
        </tr>
      )}
    </>
  );
}

/* ── SLIDE-OVER DETAIL DRAWER ─────────────────────────────────────────────── */

export function SlideOverDrawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  testId,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  testId?: string;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      data-testid={testId}
    >
      <div
        className="fixed inset-0 bg-zinc-950/30"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className="relative z-10 w-full max-w-xl h-full bg-white border-l border-zinc-200 flex flex-col">
        <div className="px-6 py-4 border-b border-zinc-200 flex items-start justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <h2 className="text-ds-title font-semibold text-zinc-950 truncate">{title}</h2>
            {subtitle && (
              <p className="mt-0.5 text-ds-label text-zinc-500 truncate">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close drawer"
            className="p-2 -mr-2 rounded-ds-md text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-accent"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">{children}</div>
        {footer && (
          <div className="px-6 py-3.5 border-t border-zinc-200 bg-zinc-50/50 shrink-0">
            {footer}
          </div>
        )}
      </aside>
    </div>
  );
}
