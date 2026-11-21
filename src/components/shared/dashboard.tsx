/**
 * §UI/UX REDESIGN (remaining surfaces) — DEPRECATED GENERATION, RECONCILED.
 *
 * This module used to be Mercenta's SECOND dashboard primitive set
 * (`DashboardSection`, `KpiGroup`, `AttentionPanel`) living alongside the
 * canonical workspace system (`WorkspaceFrame` / `WorkspaceSection` /
 * `MetricBand` / `Queue`). Two implementations of the same idea is why the
 * brand portal and the admin workspace could both claim to be "the redesigned
 * dashboard" while still looking like different products.
 *
 * The redesign's rule is ONE system, so this module is now a set of THIN
 * ADAPTERS over the canonical primitives. Exactly one implementation of a
 * metric band, a workspace section and an operational queue exists
 * (`src/components/shared/workspace.tsx`); these names exist only so the
 * historical import path keeps working.
 *
 * Nothing operational consumes these names any more —
 * `npm run validate:workspace-shell` asserts that no surface imports this
 * module. NEW code must import from `@/components/shared/workspace`.
 */
import { Queue, type MetricTileData, type QueueRowData } from '@/components/shared/workspace';
import type { StatusTone } from '@/components/ui';

/* ── DEPRECATED ALIASES (one implementation, two names) ─────────────────── */

/** §Deprecated — the canonical `MetricBand`. */
export { MetricBand as KpiGroup } from '@/components/shared/workspace';
/** §Deprecated — the canonical `WorkspaceSection`. */
export { WorkspaceSection as DashboardSection } from '@/components/shared/workspace';
/** §Deprecated — use `MetricTileData`. */
export type KpiCellData = MetricTileData;

/* ── ATTENTION PANEL → QUEUE ADAPTER ───────────────────────────────────── */

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
 * §Deprecated — use `Queue` with `QueueRowData`. This adapter preserves the
 * original call signature (the "Review" action label and the "All clear"
 * empty row) over the canonical queue, so a legacy caller renders the SAME
 * markup as every migrated surface instead of a second composition.
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
  const rows: QueueRowData[] = items.map((it) => ({
    id: it.id,
    group: it.group,
    title: it.title,
    meta: it.meta,
    status: { tone: it.tone, label: it.statusLabel },
    testId: `attention-${it.id}`,
    onOpen: it.onOpen,
    actionLabel: 'Review',
  }));

  return (
    <Queue
      rows={rows}
      className={className}
      empty={
        <div className="flex items-center gap-3 px-3.5 py-3" data-testid="attention-empty">
          <span className="text-ds-label font-medium text-muted">{emptyMeta}</span>
        </div>
      }
    />
  );
}
