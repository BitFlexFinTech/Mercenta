/**
 * §Phase 7C — Dashboard primitives (reusable across Admin / Brand / Carrier
 * overview surfaces). Pure presentation: no business logic, no data fetching,
 * no tenant scoping — callers pass fully-resolved, already-scoped data.
 *
 * Built on the Phase 5 canonical kit (Card surfaces, StatusBadge, Button,
 * Skeleton). These compositions exist to stop dashboards from becoming a
 * wall of elevated cards: the KPI band renders as ONE surface with hairline
 * cell dividers, and the attention panel renders as one scannable list.
 */
import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { Button, Skeleton, StatusBadge, type StatusTone } from '@/components/ui';
import { DOMAIN_COLOURS, type PaletteDomain } from '@/config/themes';
import { ArrowRight } from 'lucide-react';

/**
 * Self-labelled dashboard section: h3 heading + optional description/action,
 * with the section body below. Keeps heading hierarchy consistent across
 * surfaces (h1 page header → h3 section headings).
 */
export function DashboardSection({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section aria-label={title} className={cn('space-y-3', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-white tracking-tight">{title}</h3>
          {description && <p className="text-xs text-zinc-500 mt-1">{description}</p>}
        </div>
        {action && <div className="flex items-center gap-2">{action}</div>}
      </div>
      {children}
    </section>
  );
}

export interface KpiCellData {
  id: string;
  label: string;
  value: string;
  /** Support line that explains what the number is made of. */
  context?: string;
  /** Semantic tone + text — never colour-only (StatusBadge renders the text). */
  tone?: StatusTone;
  statusText?: string;
  /**
   * §UI/UX Wave 2 — optional domain accent strip (canonical palette binding in
   * src/config/themes.ts). Colour is meaning, never decoration.
   */
  domain?: PaletteDomain;
  /** Optional drill-down to the existing destination view/page. */
  onOpen?: () => void;
}

/**
 * Compact KPI band. One bordered surface; cells separated by hairlines so the
 * band reads as a group rather than six competing cards. Cells that drill down
 * render as accessible buttons.
 */
export function KpiGroup({
  items,
  className,
  loading,
}: {
  items: KpiCellData[];
  className?: string;
  loading?: boolean;
}) {
  return (
    <div className={cn('rounded-lg border border-white/[0.06] overflow-hidden', className)}>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-white/[0.06]">
        {items.map((k) => (
          <div
            key={k.id}
            data-testid={`kpi-${k.id}`}
            className="relative bg-ink-900 p-3.5 min-h-[88px]"
          >
            {k.domain && (
              <span
                aria-hidden="true"
                className="absolute inset-y-0 left-0 w-[3px]"
                style={{ backgroundColor: DOMAIN_COLOURS[k.domain].solid }}
              />
            )}
            {loading ? (
              <div className="space-y-2.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-6 w-20" />
              </div>
            ) : k.onOpen ? (
              <button
                type="button"
                onClick={k.onOpen}
                aria-label={`${k.label}: ${k.value}${k.statusText ? `, ${k.statusText}` : ''}`}
                data-testid={`kpi-open-${k.id}`}
                className="w-full text-left min-h-[36px] rounded-md hover:bg-white/[0.03] transition-colors"
              >
                <KpiCellBody cell={k} valueTestId={`kpi-value-${k.id}`} />
              </button>
            ) : (
              <div className="w-full text-left">
                <KpiCellBody cell={k} valueTestId={`kpi-value-${k.id}`} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function KpiCellBody({ cell, valueTestId }: { cell: KpiCellData; valueTestId: string }) {
  return (
    <div className="flex flex-col gap-1.5 pt-3">
      <span className="text-[10px] font-semibold uppercase leading-none tracking-[0.14em] text-zinc-500">
        {cell.label}
      </span>
      <span
        data-testid={valueTestId}
        className="animate-value-change font-mono text-2xl font-semibold leading-none tracking-tight text-white"
      >
        {cell.value}
      </span>
      {cell.statusText && cell.tone && (
        <StatusBadge tone={cell.tone} dataStatus={cell.tone}>{cell.statusText}</StatusBadge>
      )}
      {cell.context && <span className="text-[11px] text-zinc-500 leading-snug">{cell.context}</span>}
    </div>
  );
}

export interface AttentionItemData {
  id: string;
  /** Group heading shown once (e.g. "Purchase orders", "Support"). */
  group?: string;
  tone: StatusTone;
  /** Machine- and human-readable semantic label (e.g. "ACTION NEEDED"). */
  statusLabel: string;
  title: string;
  meta?: string;
  /** Optional action routed to the existing destination view/page. */
  onOpen?: () => void;
}

/**
 * Scannable exceptions/attention list. Group headings are full-width rows;
 * each item carries a semantic StatusBadge (never colour-only) plus an
 * optional "Review" action that navigates to the real destination. An empty
 * list renders an "All clear" row rather than a blank panel.
 */
export function AttentionPanel({
  items,
  className,
  emptyMeta = 'No open exceptions across the portfolio.',
}: {
  items: AttentionItemData[];
  className?: string;
  emptyMeta?: string;
}) {
  const rows: ReactNode[] = [];
  let lastGroup: string | null = null;
  items.forEach((it) => {
    if (it.group && it.group !== lastGroup) {
      rows.push(
        <li key={`group-${it.group}`} className="px-3.5 py-1.5 bg-white/[0.02]">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{it.group}</p>
        </li>
      );
      lastGroup = it.group;
    }
    rows.push(
      <li key={it.id} data-testid={`attention-${it.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3.5 py-2.5">
        <StatusBadge tone={it.tone} dataStatus={it.tone} className="flex-shrink-0">{it.statusLabel}</StatusBadge>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-medium text-white truncate">{it.title}</span>
          {it.meta && <span className="block text-[11px] text-zinc-500 truncate leading-snug">{it.meta}</span>}
        </span>
        {it.onOpen && (
          <Button variant="tertiary" size="sm" onClick={it.onOpen} className="flex-shrink-0">
            Review <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Button>
        )}
      </li>
    );
  });

  return (
    <div className={cn('rounded-lg border border-white/[0.06] overflow-hidden bg-ink-850', className)}>
      {rows.length === 0 ? (
        <div className="flex items-center gap-3 px-3.5 py-3" data-testid="attention-empty">
          <StatusBadge tone="success" dataStatus="success">All clear</StatusBadge>
          <p className="text-xs text-zinc-400">{emptyMeta}</p>
        </div>
      ) : (
        <ul className="divide-y divide-white/[0.05]">{rows}</ul>
      )}
    </div>
  );
}