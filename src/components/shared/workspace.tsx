/**
 * §UI/UX Wave 2 — MERCENTA WORKSPACE SYSTEM.
 *
 * The reusable composition primitives that turn a page into an OPERATING
 * WORKSPACE instead of a stack of marketing cards:
 *
 *   FRAME     WorkspaceFrame / WorkspaceHeader / WorkspaceGrid / WorkspaceSection
 *   METRIC    MetricTile, MetricBand
 *   QUEUE     Queue
 *   RECORD    RecordDrawer (OVERLAY), RecordFieldList
 *   CONTEXT   ContextPanel, ActivityFeed
 *   PIPELINE  PipelineTrack
 *   STATUS    DomainChip, SeverityMarker
 *   FIND      SegmentedControl
 *
 * Rules these primitives exist to enforce:
 *  - Controlled density (compact rows, hairline separators, no oversized cards).
 *  - Saturated colour is MEANINGFUL (domain → palette, resolved from the
 *    canonical `DOMAIN_COLOURS` in src/config/themes.ts) — never decorative.
 *  - Colour is never the sole signal: every status carries a text label.
 *  - Purposeful motion only (arrival / progression / change), reduced-motion safe.
 *  - Pure presentation: no data fetching, no business logic, no tenant scoping.
 *    Callers pass fully-resolved, already-scoped data.
 */
import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { DOMAIN_COLOURS, type PaletteDomain } from '@/config/themes';
import { StatusBadge, type StatusTone } from '@/components/ui';
import { ArrowRight, X } from 'lucide-react';

/* ── FRAME ─────────────────────────────────────────────────────────────── */

/**
 * The workspace region. Full-width by default (operational surfaces should use
 * the available viewport) with a controlled gutter, rather than the repeated
 * `p-6 max-w-[1400px] mx-auto space-y-6` marketing composition.
 */
export function WorkspaceFrame({
  children,
  className,
  /** Constrain width only where a reading-width surface genuinely needs it. */
  width = 'full',
  density = 'comfortable',
}: {
  children: ReactNode;
  className?: string;
  width?: 'full' | 'reading';
  density?: 'comfortable' | 'compact';
}) {
  return (
    <div
      className={cn(
        'w-full px-4 py-4 sm:px-5 sm:py-5 lg:px-6',
        width === 'reading' && 'mx-auto max-w-3xl',
        density === 'compact' && 'px-3 py-3 sm:px-4',
        className
      )}
      data-workspace-frame={width}
    >
      {children}
    </div>
  );
}

/**
 * Page header for a workspace: an optional ENTITY / CONTEXT bar (what record am
 * I looking at, which tenant, which environment), then a clear page purpose
 * (h1 + description), the primary actions, and an optional sticky toolbar slot.
 */
export function WorkspaceHeader({
  eyebrow,
  title,
  description,
  entity,
  status,
  meta,
  actions,
  toolbar,
  className,
}: {
  /** Small uppercase context label ("ADMIN HUB · PORTFOLIO"). */
  eyebrow?: string;
  title: string;
  description?: string;
  /** Entity/context bar content — identity chips for the record in scope. */
  entity?: ReactNode;
  /** Status badge(s) rendered inline with the title. */
  status?: ReactNode;
  /** Secondary facts (date range, counts, sync state) shown under the title. */
  meta?: ReactNode;
  actions?: ReactNode;
  /** Sticky toolbar (filters, segments, density controls) kept in view. */
  toolbar?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('mb-4', className)} data-workspace-header="true">
      {entity && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-ds-md border border-white/[0.06] bg-white/[0.02] px-3 py-2">
          {entity}
        </div>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {eyebrow && (
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              {eyebrow}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-display text-xl font-semibold tracking-tight text-white sm:text-2xl">
              {title}
            </h1>
            {status}
          </div>
          {description && (
            <p className="mt-1.5 max-w-3xl text-sm leading-snug text-zinc-500">{description}</p>
          )}
          {meta && <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">{meta}</div>}
        </div>
        {actions && <div className="flex flex-shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {toolbar && (
        <div
          className="sticky top-[52px] z-20 mt-3 rounded-ds-md border border-white/[0.06] bg-ink-900/95 px-3 py-2 backdrop-blur"
          data-workspace-toolbar="true"
        >
          {toolbar}
        </div>
      )}
    </header>
  );
}

/**
 * Primary working surface. Optionally composes a CONTEXT rail beside the
 * workspace so pages never invent bespoke two-column layouts.
 */
export function WorkspaceGrid({
  children,
  rail,
  className,
}: {
  children: ReactNode;
  /** Optional context rail — collapses below xl, never clips the workspace. */
  rail?: ReactNode;
  className?: string;
}) {
  if (!rail) return <div className={cn('space-y-4', className)}>{children}</div>;
  return (
    <div className={cn('grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]', className)}>
      <div className="min-w-0 space-y-4">{children}</div>
      {/*
        NOTE: the context rail is a `role="complementary"` region rather than an
        `<aside>` element on purpose. The navigation rail is the application's
        single `<aside>` landmark (and the shell contract asserts exactly one),
        so a second `<aside>` here would create an ambiguous landmark. The ARIA
        role is identical to `<aside>`.
      */}
      <div role="complementary" aria-label="Context" className="min-w-0 space-y-4">
        {rail}
      </div>
    </div>
  );
}

/**
 * A titled operational section on a workspace — a surface, not a card. Keeps
 * the h3 hierarchy the existing dashboards and tests rely on.
 */
export function WorkspaceSection({
  title,
  description,
  action,
  children,
  className,
  /** Optional domain accent for the section's left edge. */
  domain,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  domain?: PaletteDomain;
}) {
  const accent = domain ? DOMAIN_COLOURS[domain].solid : undefined;
  return (
    <section aria-label={title} className={cn('space-y-2.5', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {accent && (
            <span
              aria-hidden="true"
              className="h-4 w-1 flex-shrink-0 rounded-full"
              style={{ backgroundColor: accent }}
            />
          )}
          <div className="min-w-0">
            <h3 className="text-sm font-semibold tracking-tight text-white sm:text-[15px]">
              {title}
            </h3>
            {description && (
              <p className="mt-0.5 text-[11px] leading-snug text-zinc-500">{description}</p>
            )}
          </div>
        </div>
        {action && <div className="flex flex-shrink-0 items-center gap-2">{action}</div>}
      </div>
      {children}
    </section>
  );
}

/* ── STATUS ────────────────────────────────────────────────────────────── */

/** Solid saturated domain chip — the confident counterpart to StatusBadge. */
export function DomainChip({
  domain,
  children,
  className,
}: {
  domain: PaletteDomain;
  children: ReactNode;
  className?: string;
}) {
  const c = DOMAIN_COLOURS[domain];
  return (
    <span
      data-domain={domain}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
        className
      )}
      style={{ backgroundColor: c.solid, color: c.on }}
    >
      {children}
    </span>
  );
}

/**
 * Severity marker: a thin saturated edge + an always-readable text label. Used
 * on queue rows where a full badge adds noise but the severity must still be
 * legible without relying on colour.
 */
export function SeverityMarker({
  tone,
  label,
  className,
}: {
  tone: StatusTone;
  label: string;
  className?: string;
}) {
  const toneVar: Record<StatusTone, string> = {
    success: 'var(--mr-state-success)',
    warning: 'var(--mr-state-warning)',
    danger: 'var(--mr-state-critical)',
    info: 'var(--mr-state-info)',
    neutral: 'var(--mr-hairline-strong)',
    brass: 'var(--mr-accent)',
  };
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span
        aria-hidden="true"
        className="h-3.5 w-[3px] flex-shrink-0 rounded-full"
        style={{ backgroundColor: toneVar[tone] }}
      />
      <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">{label}</span>
    </span>
  );
}

/* ── METRIC ────────────────────────────────────────────────────────────── */

export interface MetricTileData {
  id: string;
  label: string;
  value: string;
  /** Scale of the number (hero KPIs vs supporting counts). */
  size?: 'hero' | 'default';
  /** Semantic tone + text — colour is never the only signal. */
  tone?: StatusTone;
  statusText?: string;
  /** Explains what the number is made of. */
  context?: string;
  /** Change vs the previous comparable period, e.g. "4 due this week". */
  delta?: { text: string; direction: 'up' | 'down' | 'flat'; good?: boolean };
  /** Domain accent strip (canonical palette binding). */
  domain?: PaletteDomain;
  /** Drill-down to the existing destination (KPI → filtered view). */
  onOpen?: () => void;
  /**
   * §Sprint 2 — when the tile is a TOGGLE (a filter that can be on or off),
   * set `pressed` so the tile carries the real `aria-pressed` state instead of
   * relying on colour alone. Left undefined for ordinary drill-down tiles.
   */
  pressed?: boolean;
  testId?: string;
  valueTestId?: string;
}

/**
 * One metric in the band: domain accent strip, label, animated value, semantic
 * status, explanatory context and an optional drill-down. No live region is
 * used — KPI values change on refetch, not continuously.
 */
export function MetricTile({ data }: { data: MetricTileData }) {
  const accent = data.domain ? DOMAIN_COLOURS[data.domain].solid : undefined;
  const body = <MetricBody data={data} />;
  return (
    <div
      className="relative min-h-[80px] bg-ink-900 px-3.5 py-3"
      data-testid={data.testId ?? `kpi-${data.id}`}
    >
      {accent && (
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-[3px]"
          style={{ backgroundColor: accent }}
        />
      )}
      {data.onOpen ? (
        <button
          type="button"
          onClick={data.onOpen}
          aria-label={`${data.label}: ${data.value}${data.statusText ? `, ${data.statusText}` : ''}`}
          aria-pressed={data.pressed === undefined ? undefined : data.pressed}
          data-testid={`kpi-open-${data.id}`}
          className="w-full rounded-ds-sm pt-0.5 text-left transition-ds duration-ds-fast hover:bg-white/[0.03] focus-visible:bg-white/[0.03]"
        >
          {body}
        </button>
      ) : (
        <div className="pt-0.5">{body}</div>
      )}
    </div>
  );
}

function MetricBody({ data }: { data: MetricTileData }) {
  const size = data.size ?? 'default';
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-semibold uppercase leading-none tracking-[0.14em] text-zinc-500">
        {data.label}
      </span>
      <span
        data-testid={data.valueTestId ?? `kpi-value-${data.id}`}
        className={cn(
          'animate-value-change font-mono font-semibold leading-none tracking-tight text-white',
          size === 'hero' ? 'text-[26px] sm:text-[30px]' : 'text-xl'
        )}
      >
        {data.value}
      </span>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {data.statusText && data.tone && (
          <StatusBadge tone={data.tone} dataStatus={data.tone}>
            {data.statusText}
          </StatusBadge>
        )}
        {data.delta && (
          <span
            data-delta={data.delta.direction}
            className="inline-flex items-center gap-1 font-mono text-[11px] font-medium text-zinc-400"
          >
            <span aria-hidden="true">
              {data.delta.direction === 'up' ? '↑' : data.delta.direction === 'down' ? '↓' : '·'}
            </span>
            {data.delta.text}
          </span>
        )}
      </div>
      {data.context && (
        <span className="text-[11px] leading-snug text-zinc-500">{data.context}</span>
      )}
    </div>
  );
}

/**
 * Compact metric band — ONE surface, hairline-divided cells, so the numbers read
 * as a group rather than competing elevated cards.
 */
export function MetricBand({
  items,
  loading,
  className,
  columns = 3,
}: {
  items: MetricTileData[];
  loading?: boolean;
  className?: string;
  /** Cell columns at md+ (2 at base). */
  columns?: 2 | 3 | 4;
}) {
  const mdCols = { 2: 'md:grid-cols-2', 3: 'md:grid-cols-3', 4: 'md:grid-cols-4' }[columns];
  return (
    <div className={cn('overflow-hidden rounded-ds-lg border border-white/[0.06]', className)}>
      <div className={cn('grid grid-cols-2 gap-px bg-white/[0.06]', mdCols)}>
        {items.map((m) => (
          <div key={m.id}>
            {loading ? (
              <div className="min-h-[80px] space-y-2.5 bg-ink-900 px-3.5 py-3">
                <div className="h-2.5 w-16 animate-pulse rounded bg-white/[0.06]" />
                <div className="h-5 w-20 animate-pulse rounded bg-white/[0.06]" />
                <div className="h-2.5 w-24 animate-pulse rounded bg-white/[0.06]" />
              </div>
            ) : (
              <MetricTile data={m} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}


/* ── QUEUE ─────────────────────────────────────────────────────────────── */

export interface QueueRowData {
  id: string;
  /** Leading identity (reference number, stage label). */
  ref?: string;
  title: string;
  meta?: string;
  /** Semantic status: tone + text label. */
  status?: { tone: StatusTone; label: string };
  /** Trailing facts (value, due date, brand). */
  facts?: { label: string; value: string; emphasis?: boolean }[];
  /** Row-level action destination. */
  onOpen?: () => void;
  /** Row-level action label ("Review", "Open", "Acknowledge"). */
  actionLabel?: string;
  /** Domain accent for the row's left edge. */
  domain?: PaletteDomain;
  /** Optional group heading rendered above this row when it changes. */
  group?: string;
  testId?: string;
}

/**
 * Dense operational queue. Rows are the primary artefact of operational work:
 * identity + status + facts + one clear action. Group headings are full-width
 * rows so a grouped queue stays scannable without nested cards.
 */
export function Queue({
  rows,
  empty,
  className,
  density = 'compact',
}: {
  rows: QueueRowData[];
  /** Empty-state node rendered instead of the list. */
  empty?: ReactNode;
  className?: string;
  density?: 'compact' | 'comfortable';
}) {
  const out: ReactNode[] = [];
  let lastGroup: string | null = null;
  rows.forEach((r) => {
    if (r.group && r.group !== lastGroup) {
      out.push(
        <li key={`group-${r.group}`} className="bg-white/[0.02] px-3.5 py-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            {r.group}
          </p>
        </li>
      );
      lastGroup = r.group;
    }
    const accent = r.domain ? DOMAIN_COLOURS[r.domain].solid : undefined;
    out.push(
      <li
        key={r.id}
        data-testid={r.testId ?? `queue-${r.id}`}
        className={cn(
          'relative flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3.5',
          density === 'compact' ? 'py-2' : 'py-2.5'
        )}
      >
        {accent && (
          <span
            aria-hidden="true"
            className="absolute inset-y-1.5 left-0 w-[3px] rounded-full"
            style={{ backgroundColor: accent }}
          />
        )}
        {r.status && (
          <StatusBadge tone={r.status.tone} dataStatus={r.status.tone} className="flex-shrink-0">
            {r.status.label}
          </StatusBadge>
        )}
        {r.ref && (
          <span className="flex-shrink-0 font-mono text-[11px] text-zinc-400">{r.ref}</span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-medium text-white">{r.title}</span>
          {r.meta && (
            <span className="block truncate text-[11px] leading-snug text-zinc-500">{r.meta}</span>
          )}
        </span>
        {r.facts?.map((f) => (
          <span key={f.label} className="flex flex-shrink-0 flex-col items-end">
            <span className="text-[9px] uppercase tracking-wider text-zinc-600">{f.label}</span>
            <span
              className={cn(
                'font-mono text-[11px]',
                f.emphasis ? 'font-semibold text-white' : 'text-zinc-300'
              )}
            >
              {f.value}
            </span>
          </span>
        ))}
        {r.onOpen && (
          <button
            type="button"
            onClick={r.onOpen}
            className="flex-shrink-0 rounded-ds-sm border border-white/[0.08] bg-ink-800 px-2.5 py-1 text-[11px] font-medium text-zinc-300 transition-ds duration-ds-fast hover:bg-ink-700 hover:text-white"
          >
            <span className="inline-flex items-center gap-1">
              {r.actionLabel ?? 'Review'}
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </span>
          </button>
        )}
      </li>
    );
  });

  if (rows.length === 0) {
    return (
      <div className={cn('rounded-ds-lg border border-white/[0.06] bg-ink-850', className)}>
        {empty ?? (
          <div className="flex items-center gap-2.5 px-3.5 py-3">
            <StatusBadge tone="success" dataStatus="success">
              All clear
            </StatusBadge>
            <p className="text-xs text-zinc-400">Nothing requires attention right now.</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn('overflow-hidden rounded-ds-lg border border-white/[0.06] bg-ink-850', className)}
    >
      <ul className="divide-y divide-white/[0.05]">{out}</ul>
    </div>
  );
}


/* ── PIPELINE ──────────────────────────────────────────────────────────── */

export interface PipelineStageData {
  id: string;
  label: string;
  count: number;
  /** Share of the pipeline (0–1), rendered as a proportional progression fill. */
  share: number;
  domain: PaletteDomain;
  /** True when this stage is the one needing operator attention. */
  attention?: boolean;
}

/**
 * Operational pipeline. Stage columns carry a SOLID saturated surface header
 * (the confident colour treatment) plus a proportional progression fill, so the
 * flow of work is legible at a glance and each stage links to its queue.
 */
export function PipelineTrack({
  stages,
  onSelect,
  className,
}: {
  stages: PipelineStageData[];
  onSelect?: (stageId: string) => void;
  className?: string;
}) {
  const total = stages.reduce((a, s) => a + s.count, 0);
  return (
    <div className={cn('grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5', className)}>
      {stages.map((s) => {
        const c = DOMAIN_COLOURS[s.domain];
        const interactive = Boolean(onSelect);
        return (
          <button
            key={s.id}
            type="button"
            disabled={!interactive}
            onClick={() => onSelect?.(s.id)}
            aria-label={`${s.label}: ${s.count} of ${total}`}
            data-pipeline-stage={s.id}
            data-stage-count={s.count}
            className={cn(
              'block w-full overflow-hidden rounded-ds-md border border-white/[0.06] bg-ink-850 text-left transition-ds duration-ds-fast',
              interactive && 'hover:border-white/[0.14]'
            )}
          >
            <span
              className="flex items-center justify-between gap-2 px-2.5 py-1.5"
              style={{ backgroundColor: c.solid, color: c.on }}
            >
              <span className="truncate text-[10px] font-semibold uppercase tracking-[0.12em]">
                {s.label}
              </span>
              {s.attention && (
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: c.on }}
                />
              )}
            </span>
            <span className="block px-2.5 pb-2 pt-2">
              <span className="block font-mono text-lg font-semibold leading-none text-white">
                {s.count}
              </span>
              <span className="mt-2 block h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <span
                  className="animate-pipeline-grow block h-full rounded-full"
                  style={{
                    width: `${Math.max(2, Math.round(s.share * 100))}%`,
                    backgroundColor: c.solid,
                  }}
                />
              </span>
              <span className="mt-1.5 block text-[10px] text-zinc-500">
                {total > 0 ? `${Math.round(s.share * 100)}% of pipeline` : 'no active work'}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}



/* ── CONTEXT ───────────────────────────────────────────────────────────── */

/** Context rail section: a labelled, quiet surface for secondary information. */
export function ContextPanel({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-label={title}
      className={cn(
        'overflow-hidden rounded-ds-lg border border-white/[0.06] bg-ink-850',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] px-3 py-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
          {title}
        </h3>
        {action}
      </div>
      <div className="px-3 py-2.5">{children}</div>
    </section>
  );
}

export interface ActivityEntry {
  id: string;
  title: string;
  meta?: string;
  /** ISO timestamp (rendered compactly, no locale theatre). */
  at: string;
  tone?: StatusTone;
  onOpen?: () => void;
}

/**
 * Activity feed — a timeline of real events. Shared by overview and records so
 * there is exactly one presentation of "what happened" (the future brand
 * calendar / notifications / founder activity reuse this same primitive).
 */
export function ActivityFeed({
  entries,
  empty,
  className,
}: {
  entries: ActivityEntry[];
  empty?: ReactNode;
  className?: string;
}) {
  if (entries.length === 0) {
    return (
      <div className={cn('rounded-ds-lg border border-white/[0.06] bg-ink-850', className)}>
        {empty ?? <p className="px-3.5 py-3 text-xs text-zinc-500">No activity recorded yet.</p>}
      </div>
    );
  }
  return (
    <ol className={cn('space-y-0', className)} data-activity-feed="true">
      {entries.map((e, i) => (
        <li key={e.id} className="relative flex gap-2.5 pb-2.5 last:pb-0">
          <span className="relative flex w-3 flex-shrink-0 justify-center">
            <span
              aria-hidden="true"
              className="mt-1 h-2 w-2 rounded-full"
              style={{
                backgroundColor:
                  e.tone === 'danger'
                    ? 'var(--mr-state-critical)'
                    : e.tone === 'warning'
                      ? 'var(--mr-state-warning)'
                      : e.tone === 'success'
                        ? 'var(--mr-state-success)'
                        : 'var(--mr-state-info)',
              }}
            />
            {i < entries.length - 1 && (
              <span
                aria-hidden="true"
                className="absolute left-1/2 top-3.5 h-[calc(100%-0.5rem)] w-px -translate-x-1/2 bg-white/[0.08]"
              />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-medium leading-snug text-white">{e.title}</span>
            {e.meta && (
              <span className="block truncate text-[10px] leading-snug text-zinc-500">
                {e.meta}
              </span>
            )}
            <span className="mt-0.5 block font-mono text-[10px] text-zinc-600">
              {e.at.slice(0, 16).replace('T', ' ')}
            </span>
          </span>
          {e.onOpen && (
            <button
              type="button"
              onClick={e.onOpen}
              className="flex-shrink-0 self-start rounded-ds-sm px-1.5 py-0.5 text-[10px] font-medium text-zinc-400 transition-ds duration-ds-fast hover:bg-white/[0.04] hover:text-white"
            >
              Open
            </button>
          )}
        </li>
      ))}
    </ol>
  );
}

/* ── RECORD (OVERLAY) ──────────────────────────────────────────────────── */

/**
 * Record drawer — the QUEUE → PREVIEW → RECORD step. Escape closes, focus moves
 * into the panel on open and returns to the invoking element on close, and the
 * panel is a labelled modal dialog for assistive technology.
 */
export function RecordDrawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  testId = 'record-drawer',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  testId?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    panelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end" data-testid={`${testId}-root`}>
      {/* §Sprint — the drawer sits ABOVE the demo environment switcher (z-50).
          At equal z-index the later DOM node won the hit test and the drawer's
          footer actions (Resolve / Open record) were unclickable. */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0"
        style={{ backgroundColor: 'var(--mr-overlay-tint)' }}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        data-testid={testId}
        className="animate-drawer-in relative flex h-full w-full max-w-md flex-col border-l border-white/[0.08] bg-ink-900 shadow-ds-overlay"
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/[0.06] px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold tracking-tight text-white">{title}</h2>
            {subtitle && <p className="mt-0.5 truncate text-[11px] text-zinc-500">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close record"
            className="flex-shrink-0 rounded-ds-sm p-1 text-zinc-500 transition-ds duration-ds-fast hover:bg-white/[0.04] hover:text-white"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">{children}</div>
        {footer && <div className="border-t border-white/[0.06] px-4 py-3">{footer}</div>}
      </div>
    </div>
  );
}

/** Label/value list used inside record panels and context panels. */
export function RecordFieldList({
  fields,
  className,
}: {
  fields: { label: string; value: ReactNode }[];
  className?: string;
}) {
  return (
    <dl className={cn('grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2', className)}>
      {fields.map((f) => (
        <div key={f.label} className="min-w-0">
          <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            {f.label}
          </dt>
          <dd className="mt-0.5 break-words text-xs text-zinc-200">{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ── FIND ──────────────────────────────────────────────────────────────── */

/** Segmented control for view/scope switching inside a workspace toolbar. */
export function SegmentedControl({
  items,
  active,
  onSelect,
  ariaLabel,
  className,
}: {
  items: { id: string; label: string; count?: number }[];
  active: string;
  onSelect: (id: string) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex flex-wrap items-center gap-0.5 rounded-ds-md border border-white/[0.06] bg-white/[0.02] p-0.5',
        className
      )}
    >
      {items.map((it) => {
        const selected = it.id === active;
        return (
          <button
            key={it.id}
            role="tab"
            aria-selected={selected}
            type="button"
            onClick={() => onSelect(it.id)}
            data-state={selected ? 'active' : 'inactive'}
            className={cn(
              'rounded-ds-sm px-2.5 py-1 text-[11px] font-medium transition-ds duration-ds-fast',
              selected
                ? 'bg-ink-700 text-white'
                : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200'
            )}
          >
            {it.label}
            {typeof it.count === 'number' && (
              <span className="ml-1.5 font-mono text-[10px] text-zinc-500">{it.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

