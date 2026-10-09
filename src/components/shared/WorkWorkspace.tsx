/**
 * §Sprint — THE SHARED WORK WORKSPACE.
 *
 * One implementation of the operating layer's three canonical views — LIST,
 * KANBAN and CALENDAR — reused by the Brand portal and the Super Admin portal.
 * It is not a separate task app: every row, card and calendar cell is a REAL
 * work item projected from a canonical record, and every action either resolves
 * the item (stopping its reminders) or hands the operator to the EXISTING
 * destination view where the underlying record is actually changed.
 *
 * Tenant scoping is not done here — the caller passes the session's own
 * `tenantId` and the store filters inside `getWorkItems`.
 */
import { useMemo, useState } from 'react';
import {
  ActivityFeed,
  ContextPanel,
  MetricBand,
  Queue,
  RecordDrawer,
  RecordFieldList,
  SegmentedControl,
  WorkspaceFrame,
  WorkspaceHeader,
  type MetricTileData,
  type QueueRowData,
} from '@/components/shared/workspace';
import { Button, Input, StatusBadge, type StatusTone } from '@/components/ui';
import {
  WORK_COUNT_SETS,
  WORK_PRIORITY_LABELS,
  WORK_SOURCE_LABELS,
  WORK_SOURCE_TONES,
  WORK_STATUS_LABELS,
  brandLabel,
  canResolveFromWorkLayer,
  createWorkItem,
  demoToday,
  daysBetween,
  describeWorkClosing,
  reopenWorkItem,
  resetWorkStore,
  resolveWorkItem,
  setWorkItemStatus,
  workCounts,
} from '@/lib/work/workStore';
import {
  addMonths,
  buildMonthGrid,
  calendarEntryId,
  dueLabel,
  entriesByDate,
  monthKey,
  monthLabel,
  WEEKDAY_LABELS,
} from '@/lib/work/calendar';
import { useWorkItems, useReminders } from '@/lib/work/useWork';
import { requestAdminNav } from '@/data/adminNav';
import {
  REMINDER_BUCKET_LABELS,
  REMINDER_DUE_SOON_DAYS,
  describeReminderSweep,
  dismissReminder,
  resetReminderStore,
  runReminderSweep,
} from '@/lib/work/reminderRunner';
import type {
  Reminder,
  ReminderBucket,
  ReminderSweepResult,
  WorkItem,
  WorkPriority,
  WorkSource,
  WorkStatus,
} from '@/lib/work/types';
import { DOMAIN_COLOURS, type PaletteDomain } from '@/config/themes';
/** §SSOT S4 — the declared label for simulated operational state shown as work. */
import { DEMO_OPERATIONAL_STATE_LABEL } from '@/config/demo';
import { ChevronLeft, ChevronRight, RotateCcw, BellRing } from 'lucide-react';

/* ── Presentation maps (one source for all three views) ────────────────────── */

const PRIORITY_TONE: Record<WorkPriority, StatusTone> = {
  critical: 'danger',
  high: 'warning',
  normal: 'neutral',
};

const PRIORITY_DOMAIN: Record<WorkPriority, PaletteDomain> = {
  critical: 'compliance',
  high: 'finance',
  normal: 'catalogue',
};

const STATUS_TONE: Record<WorkStatus, StatusTone> = {
  open: 'neutral',
  in_progress: 'info',
  blocked: 'danger',
  done: 'success',
};

/**
 * §DEFECT FIXED AT SOURCE (owner-reported, 2026-09-30) — THE CATEGORY IS COLOUR-CODED.
 *
 * The work list coloured the PRIORITY and rendered the CATEGORY as plain grey text, so
 * the one label that says WHAT KIND of work this is — a fulfilment window, a purchase-order
 * acknowledgement, a commercial review, a compliance expiry — carried no signal at all. The
 * category now renders through the design system's own badge with the tone declared once
 * per category (`WORK_SOURCE_TONES`, guarded at module load in the work layer). Colour is
 * never the only indicator: the badge keeps its text and its accessible name.
 */
function SourceBadge({ source }: { source: WorkSource }) {
  return (
    <StatusBadge tone={WORK_SOURCE_TONES[source]} dataStatus={`work-source-${source}`}>
      {WORK_SOURCE_LABELS[source]}
    </StatusBadge>
  );
}

const SOURCE_OPTIONS: WorkSource[] = [
  'po_acknowledgement',
  'po_window',
  'compliance_expiry',
  'contract_renewal',
  'deduction_dispute',
  'shipment_exception',
  'return_action',
  'outreach_followup',
  // §Sprint 2 — the two derivation paths completed this sprint.
  'invoice_due',
  'onboarding_step',
  // §Phase 2 — the commercial readiness derivations.
  'commercial_remediation',
  'commercial_review',
  // §P3 — the founder-console categories. They are only ever present for a
  // Super-Admin session (`includeSuperAdminOnly`), so the filters cannot reveal
  // a founder-only record to anybody else.
  'founder_compliance',
  'founder_setup',
  'founder_application',
  'founder_integration',
  'founder_opportunity',
  'founder_funding',
  'founder_finance',
  'founder_ai_cost',
  'manual',
];

export interface WorkWorkspaceProps {
  scope: 'admin' | 'brand';
  tenantId?: string | null;
  /** Actor recorded on every mutation (audit attribution). */
  actor: string;
  eyebrow: string;
  title: string;
  description: string;
  /** Hands the operator to the EXISTING destination for the underlying record. */
  onNavigate: (view: string) => void;
  /** Label for the hand-off action, e.g. "Open PO" for a brand. */
  openLabel?: string;
  /** Extra panel rendered in the context rail (scope-specific). */
  contextExtra?: React.ReactNode;
  /** Landing view. The dedicated Calendar destination opens on `calendar`. */
  initialView?: 'list' | 'board' | 'calendar' | 'reminders';
  /**
   * §P3 — positively declare a Super-Admin session so the founder-console items
   * (Super-Admin-only Surfaces) are included. Defaults to FALSE and fails closed:
   * an ordinary admin session must never be shown a founder-only record.
   */
  includeSuperAdminOnly?: boolean;
}

export function WorkWorkspace({
  scope,
  tenantId,
  actor,
  eyebrow,
  title,
  description,
  onNavigate,
  openLabel = 'Open record',
  contextExtra,
  initialView = 'list',
  includeSuperAdminOnly = false,
}: WorkWorkspaceProps) {
  const [view, setView] = useState<'list' | 'board' | 'calendar' | 'reminders'>(initialView);
  const [priority, setPriority] = useState<'all' | WorkPriority>('all');
  const [source, setSource] = useState<'all' | WorkSource>('all');
  const [query, setQuery] = useState('');
  const [month, setMonth] = useState(() => monthKey(demoToday()));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [density, setDensity] = useState<'compact' | 'comfortable'>('compact');
  /** §Sprint 2 — the last deterministic sweep's report (demo evidence). */
  const [sweep, setSweep] = useState<ReminderSweepResult | null>(null);

  /**
   * §P3 — the Super-Admin gate is passed to EVERY work read on this surface (list,
   * board, calendar, metrics), so the view and its counts can never disagree, and
   * it is a positive declaration: absent ⇒ founder items are excluded.
   */
  /**
   * §SSOT S3 — HAND THE OPERATOR TO THE ACTION THAT ACTUALLY CLOSES THE ITEM.
   *
   * A record-qualified item cannot be resolved here, so the surfaces offer the
   * owning destination instead: this navigates to the record's own workspace (and
   * raises the Super-Admin tab intent when the item carries one) — one
   * implementation, used by the board card, the drawer and the record link.
   */
  const openOwningRecord = (item: WorkItem) => {
    if (item.navTab) {
      requestAdminNav({ view: item.actionView, tab: item.navTab, source: `work:${item.id}` });
    }
    setSelectedId(null);
    onNavigate(item.actionView);
  };

  const workScopeOpts = { superAdmin: includeSuperAdminOnly };
  const all = useWorkItems(scope, tenantId, workScopeOpts);
  const everything = useWorkItems(scope, tenantId, { ...workScopeOpts, includeResolved: true });
  const reminders = useReminders(scope, tenantId);
  const reminderBuckets: Record<ReminderBucket, number> = {
    overdue: reminders.filter((r) => r.bucket === 'overdue').length,
    due_today: reminders.filter((r) => r.bucket === 'due_today').length,
    due_soon: reminders.filter((r) => r.bucket === 'due_soon').length,
  };

  const matches = (w: WorkItem, q: string) =>
    (priority === 'all' || w.priority === priority) &&
    (source === 'all' || w.source === source) &&
    (q === '' ||
      w.title.toLowerCase().includes(q) ||
      w.detail.toLowerCase().includes(q) ||
      w.entity.label.toLowerCase().includes(q));

  const filteredAll = useMemo(
    () => {
      const q = query.trim().toLowerCase();
      return everything.filter((w) => matches(w, q));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [everything, priority, source, query]
  );
  const filtered = useMemo(() => filteredAll.filter((w) => w.status !== 'done'), [filteredAll]);

  const selected = useMemo(
    () => everything.find((w) => w.id === selectedId) ?? null,
    [everything, selectedId]
  );

  const today = demoToday();
  const overdue = all.filter((w) => w.dueDate !== null && w.dueDate < today);
  const dueThisWeek = all.filter((w) => {
    if (!w.dueDate) return false;
    const d = daysBetween(today, w.dueDate);
    return d >= 0 && d <= 7;
  });
  const critical = all.filter((w) => w.priority === 'critical');

  /**
   * §SSOT S2/S3 — TWO SETS, LABELLED, so a count can never be read as its
   * opposite: record-qualified items (closed only by doing the work) and manual
   * tasks (the only items the work layer itself can resolve).
   */
  const recordQualified = all.filter((w) => w.derived).length;
  const closedManually = everything.filter((w) => !w.derived && w.status === 'done').length;

  /**
   * §SSOT S5 — THE DECLARED NUMBERS, from the ONE counting owner.
   *
   * `workCounts` is the same function the nav badge reads. The tiles below render
   * these numbers WITH the label each set declares, so a badge (Needs attention)
   * and this list (All open work) can never be read as a disagreement — the
   * founder-facing 47-vs-41 class of defect.
   */
  const counts = workCounts(scope, tenantId, workScopeOpts);

  const metrics: MetricTileData[] = [
    {
      id: 'work-attention',
      label: WORK_COUNT_SETS.attention.label,
      value: String(counts.attention),
      size: 'hero',
      tone: critical.length > 0 ? 'danger' : 'success',
      statusText: critical.length > 0 ? `${critical.length} critical` : 'No critical items',
      context: WORK_COUNT_SETS.attention.definition,
      domain: 'compliance',
      onOpen: () => {
        setPriority('all');
        setSource('all');
        setQuery('');
        setView('list');
      },
      testId: 'work-metric-attention',
      valueTestId: 'work-metric-attention-value',
    },
    {
      id: 'work-overdue',
      label: WORK_COUNT_SETS.overdue.label,
      value: String(counts.overdue),
      tone: counts.overdue > 0 ? 'danger' : 'success',
      statusText: counts.overdue > 0 ? 'Past deadline' : 'Nothing overdue',
      context: WORK_COUNT_SETS.overdue.definition,
      domain: 'logistics',
      onOpen: () => setView('reminders'),
      testId: 'work-metric-overdue',
      valueTestId: 'work-metric-overdue-value',
    },
    {
      id: 'work-due-week',
      label: 'Due this week',
      value: String(dueThisWeek.length),
      tone: dueThisWeek.length > 0 ? 'warning' : 'success',
      statusText: dueThisWeek.length > 0 ? 'Inside 7 days' : 'Clear week',
      context: 'Deadline inside the next 7 days',
      domain: 'finance',
      onOpen: () => setView('board'),
      testId: 'work-metric-due-week',
      valueTestId: 'work-metric-due-week-value',
    },
    {
      id: 'work-reminders',
      label: 'Reminders active',
      value: String(reminders.length),
      tone: reminderBuckets.overdue > 0 ? 'danger' : reminders.length > 0 ? 'warning' : 'success',
      statusText:
        reminderBuckets.overdue > 0
          ? `${reminderBuckets.overdue} overdue`
          : reminders.length > 0
            ? 'Inside reminder window'
            : 'Nothing to chase',
      context: `Raised by the deterministic sweep (due-soon window ${REMINDER_DUE_SOON_DAYS} days)`,
      domain: 'finance',
      onOpen: () => setView('reminders'),
      testId: 'work-metric-reminders',
      valueTestId: 'work-metric-reminders-value',
    },
    {
      id: 'work-open',
      label: WORK_COUNT_SETS.open.label,
      value: String(counts.open),
      tone: 'info',
      statusText: `${recordQualified} record-qualified · ${closedManually} resolved manually`,
      context: WORK_COUNT_SETS.open.definition,
      domain: 'catalogue',
      onOpen: () => {
        setPriority('all');
        setSource('all');
        setQuery('');
        setView('list');
      },
      testId: 'work-metric-open',
      valueTestId: 'work-metric-open-value',
    },
  ];

  const rows: QueueRowData[] = filtered.map((w) => ({
    id: w.id,
    ref: WORK_SOURCE_LABELS[w.source],
    title: w.title,
    meta: w.detail,
    status: {
      tone: PRIORITY_TONE[w.priority],
      label:
        w.superAdminOnly && typeof w.rank === 'number'
          ? `#${w.rank} · ${WORK_PRIORITY_LABELS[w.priority]}`
          : WORK_PRIORITY_LABELS[w.priority],
    },
    facts: [
      { label: 'Due', value: w.dueDate ?? '—', emphasis: true },
      { label: 'Owner', value: w.owner.replace(/^(brand|staff):/, '') },
      /* §P3 — the founder console's rank and WHY travel with the item so the
         single action list shows the same declared arithmetic the retired
         panel did (test id `work-why-<id>` for the browser contract). */
      ...(w.superAdminOnly && typeof w.rank === 'number'
        ? [{ label: 'Rank', value: `#${w.rank}`, emphasis: true }]
        : []),
      ...(w.why
        ? [
            {
              label: 'Why',
              value: `score ${w.why.score} · ${w.why.factors
                .map((f) => `${f.label} ${f.points}`)
                .join(' + ')}`,
            },
          ]
        : []),
    ],
    domain: PRIORITY_DOMAIN[w.priority],
    onOpen: () => setSelectedId(w.id),
    actionLabel: 'Open',
    testId: `work-row-${w.id}`,
  }));

  const activity = useMemo(
    () =>
      everything
        .flatMap((w) => w.activity.map((a) => ({ w, a })))
        .sort((x, y) => y.a.at.localeCompare(x.a.at))
        .slice(0, 12)
        .map(({ w, a }) => ({
          id: a.id,
          title: `${a.action.replace(/_/g, ' ')} — ${w.title}`,
          meta: `${a.actor} · ${a.detail}`,
          at: a.at,
          tone: (a.action === 'resolved' ? 'success' : 'info') as StatusTone,
          onOpen: () => setSelectedId(w.id),
        })),
    [everything]
  );

  return (
    <WorkspaceFrame density={density} className="space-y-4">
      <WorkspaceHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        meta={
          <>
            <span className="font-mono text-ds-label text-zinc-500">
              {all.length} open · {closedManually} resolved (manual tasks)
            </span>
            <span className="font-mono text-ds-label text-zinc-500">
              {reminders.length} reminder{reminders.length === 1 ? '' : 's'} active
            </span>
            <span className="font-mono text-ds-label text-zinc-500">As at {today}</span>
            {/*
              §SSOT S4 — HONEST LABELLING. Every item in this list is projected from
              a canonical operational RECORD, and in demo mode those records are
              SIMULATED (no provider is contacted, no live network call is made).
              Without this the surface would read as live operational state, so the
              declared label is rendered here, in the same words as the rest of the
              platform (`src/config/demo.ts → DEMO_OPERATIONAL_STATE_LABEL`).
            */}
            <span
              className="font-mono text-ds-label text-amber-300"
              data-testid="work-operational-state-label"
            >
              {DEMO_OPERATIONAL_STATE_LABEL}
            </span>
          </>
        }
        actions={
          <Button
            variant="ghost"
            className="text-ds-label"
            onClick={() => {
              resetWorkStore();
              resetReminderStore();
              setSweep(null);
              setSelectedId(null);
            }}
            data-testid="work-reset"
          >
            <span className="inline-flex items-center gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Reset demo work
            </span>
          </Button>
        }
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedControl
              ariaLabel="Work view"
              active={view}
              onSelect={(v) => setView(v as 'list' | 'board' | 'calendar' | 'reminders')}
              items={[
                { id: 'list', label: 'List', count: filtered.length },
                { id: 'board', label: 'Kanban' },
                { id: 'calendar', label: 'Calendar', count: overdue.length },
                { id: 'reminders', label: 'Reminders', count: reminders.length },
              ]}
            />
            {/*
              §Sprint 2 — the deterministic reminder runner is INVOKED here, not
              scheduled. Running it twice with unchanged state raises nothing the
              second time (idempotent), which is what the report below shows.
            */}
            <Button
              variant="ghost"
              className="text-ds-label"
              onClick={() => setSweep(runReminderSweep(scope, tenantId, actor))}
              data-testid="work-run-reminders"
              title={describeReminderSweep().cadence}
            >
              <span className="inline-flex items-center gap-1.5">
                <BellRing className="h-3.5 w-3.5" aria-hidden="true" />
                Run reminder sweep
              </span>
            </Button>
            {sweep && (
              <span
                className="font-mono text-ds-micro text-zinc-500"
                data-testid="work-sweep-report"
                data-sweep-raised={sweep.raised.length}
                data-sweep-duplicates={sweep.duplicatesSuppressed}
              >
                sweep {sweep.sweptAt}: raised {sweep.raised.length} · suppressed{' '}
                {sweep.duplicatesSuppressed} duplicate · {sweep.suppressedResolved} resolved ·{' '}
                {sweep.active} active
              </span>
            )}
            <Input
              ariaLabel="Search work"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search work…"
              className="w-44"
              dataTestid="work-search"
            />
            <select
              aria-label="Priority filter"
              value={priority}
              onChange={(e) => setPriority(e.target.value as 'all' | WorkPriority)}
              data-testid="work-priority-filter"
              className="cursor-pointer rounded-md border border-white/[0.08] bg-ink-900 px-2 py-1.5 text-xs text-zinc-300"
            >
              <option value="all">Priority: all</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
            </select>
            <select
              aria-label="Source filter"
              value={source}
              onChange={(e) => setSource(e.target.value as 'all' | WorkSource)}
              data-testid="work-source-filter"
              className="cursor-pointer rounded-md border border-white/[0.08] bg-ink-900 px-2 py-1.5 text-xs text-zinc-300"
            >
              <option value="all">Source: all</option>
              {/*
                §P3 — the founder-console categories are offered ONLY to a session
                that may see them (`includeSuperAdminOnly`): a filter that can never
                match would itself hint at records the session is not entitled to.
              */}
              {(includeSuperAdminOnly
                ? SOURCE_OPTIONS
                : SOURCE_OPTIONS.filter((s) => !s.startsWith('founder_'))
              ).map((s) => (
                <option key={s} value={s}>
                  {WORK_SOURCE_LABELS[s]}
                </option>
              ))}
            </select>
            <SegmentedControl
              ariaLabel="Row density"
              active={density}
              onSelect={(d) => setDensity(d as 'compact' | 'comfortable')}
              items={[
                { id: 'compact', label: 'Compact' },
                { id: 'comfortable', label: 'Comfortable' },
              ]}
            />
          </div>
        }
      />

      {/* §Sprint 2 — 4 + 2 so the reminder tile sits beside "Open work" without
          leaving a ragged row in the band. */}
      <MetricBand items={metrics.slice(0, 4)} columns={4} />
      <MetricBand items={metrics.slice(4)} columns={2} />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-3" data-testid="work-primary" data-density={density}>
          {view === 'list' && (
            <Queue
              rows={rows}
              density={density}
              empty={
                <div className="flex items-center gap-2.5 px-3.5 py-3">
                  <StatusBadge tone="success" dataStatus="success">
                    All clear
                  </StatusBadge>
                  <p className="text-xs text-zinc-400">No work matches the current filters.</p>
                </div>
              }
            />
          )}

          {view === 'board' && (
            <KanbanBoard
              items={filteredAll}
              actor={actor}
              onOpen={(id) => setSelectedId(id)}
              onOpenRecord={openOwningRecord}
            />
          )}

          {view === 'calendar' && (
            <CalendarBoard
              entries={everything}
              month={month}
              onMonth={setMonth}
              onOpen={(id) => setSelectedId(id)}
            />
          )}

          {view === 'reminders' && (
            <ReminderList
              reminders={reminders}
              buckets={reminderBuckets}
              actor={actor}
              onOpen={(id) => setSelectedId(id)}
            />
          )}
        </div>

        <div className="space-y-3">
          <ContextPanel title="How this works">
            <p className="text-ds-label leading-snug text-zinc-400">
              Every item is projected from an existing record — a retail-channel PO, a compliance
              document, a contract, a deduction, a shipment, a return, an outreach follow-up.
              <strong className="font-semibold text-zinc-300"> Record-qualified items close by doing the
              work</strong>: the surfaces hand you to the record's own workspace, and the item disappears
              when the record changes. Only a manual task — which has no record — is resolved here, and
              either way its reminders stop.
            </p>
          </ContextPanel>
          {contextExtra}
          <ContextPanel title="Proactive reminders">
            <RecordFieldList
              fields={[
                { label: 'Overdue', value: String(reminderBuckets.overdue) },
                { label: 'Due today', value: String(reminderBuckets.due_today) },
                { label: 'Due soon', value: String(reminderBuckets.due_soon) },
                { label: 'Runner', value: 'On demand (deterministic)' },
                { label: 'Due-soon window', value: `${REMINDER_DUE_SOON_DAYS} days` },
                { label: 'Network calls', value: '0 (simulation only)' },
              ]}
            />
            <p className="mt-2 text-ds-label leading-snug text-zinc-400">
              {describeReminderSweep().cadence} — resolving the underlying work item removes its
              reminder immediately.
            </p>
          </ContextPanel>
          <ContextPanel title="Recent activity">
            <ActivityFeed entries={activity} />
          </ContextPanel>
        </div>
      </div>

      <WorkRecordDrawer
        item={selected}
        onClose={() => setSelectedId(null)}
        actor={actor}
        openLabel={openLabel}
        onOpenRecord={openOwningRecord}
      />
    </WorkspaceFrame>
  );
}

/* ── KANBAN ────────────────────────────────────────────────────────────────── */

const BOARD_COLUMNS: WorkStatus[] = ['open', 'in_progress', 'blocked', 'done'];

function KanbanBoard({
  items,
  actor,
  onOpen,
  onOpenRecord,
}: {
  items: WorkItem[];
  actor: string;
  onOpen: (id: string) => void;
  /** §SSOT S3 — the owning destination for a record-qualified item. */
  onOpenRecord: (item: WorkItem) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" data-testid="work-board">
      {BOARD_COLUMNS.map((status) => {
        const column = items.filter((w) => w.status === status);
        return (
          <section
            key={status}
            aria-label={`${WORK_STATUS_LABELS[status]} column`}
            data-testid={`work-column-${status}`}
            data-column-count={column.length}
            className="flex min-h-[120px] flex-col overflow-hidden rounded-ds-lg border border-white/[0.06] bg-ink-850"
          >
            <header className="flex items-center justify-between gap-2 border-b border-white/[0.06] px-3 py-2">
              <span className="text-ds-micro font-semibold uppercase tracking-[0.14em] text-zinc-400">
                {WORK_STATUS_LABELS[status]}
              </span>
              <span className="font-mono text-ds-label text-zinc-500">{column.length}</span>
            </header>
            <ul className="flex-1 divide-y divide-white/[0.05]">
              {column.length === 0 && (
                <li className="px-3 py-3 text-ds-label text-zinc-600">Nothing here.</li>
              )}
              {column.map((w) => (
                <li key={w.id} className="relative px-3 py-2.5" data-testid={`work-card-${w.id}`}>
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-2 left-0 w-[3px] rounded-full"
                    style={{ backgroundColor: DOMAIN_COLOURS[PRIORITY_DOMAIN[w.priority]].solid }}
                  />
                  <div className="flex items-start justify-between gap-2">
                    <SourceBadge source={w.source} />
                    <StatusBadge tone={PRIORITY_TONE[w.priority]} dataStatus={PRIORITY_TONE[w.priority]}>
                      {WORK_PRIORITY_LABELS[w.priority]}
                    </StatusBadge>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpen(w.id)}
                    className="mt-1.5 block w-full text-left"
                  >
                    <span className="block text-xs font-medium text-white">{w.title}</span>
                    <span className="mt-0.5 block text-ds-label text-zinc-500">{dueLabel(w.dueDate)}</span>
                  </button>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {/*
                      §SSOT S3 — A RECORD-QUALIFIED CARD NEVER OFFERS "Resolve".
                      It offers the owning destination (the action that changes the
                      record) plus the operator's own annotation; the card leaves
                      this board when the record changes, not when a task is ticked.
                    */}
                    {w.derived ? (
                      <>
                        {status !== 'in_progress' && (
                          <Button
                            variant="ghost"
                            className="text-ds-micro"
                            onClick={() => setWorkItemStatus(w.id, 'in_progress', actor)}
                            data-testid={`work-progress-${w.id}`}
                          >
                            Start
                          </Button>
                        )}
                        {status !== 'open' && (
                          <Button
                            variant="ghost"
                            className="text-ds-micro"
                            onClick={() => reopenWorkItem(w.id, actor, 'Cleared the operator mark from the kanban board')}
                            data-testid={`work-clear-${w.id}`}
                            title="Clear your own progress mark — the record is unchanged"
                          >
                            Clear mark
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          className="text-ds-micro"
                          onClick={() => onOpenRecord(w)}
                          data-testid={`work-open-record-${w.id}`}
                          title={describeWorkClosing(w.source)}
                        >
                          {WORK_SOURCE_LABELS[w.source]}
                        </Button>
                      </>
                    ) : (
                      <>
                        {status !== 'done' && status !== 'in_progress' && (
                          <Button
                            variant="ghost"
                            className="text-ds-micro"
                            onClick={() => setWorkItemStatus(w.id, 'in_progress', actor)}
                            data-testid={`work-progress-${w.id}`}
                          >
                            Start
                          </Button>
                        )}
                        {status !== 'done' && (
                          <Button
                            variant="ghost"
                            className="text-ds-micro"
                            onClick={() => resolveWorkItem(w.id, actor, 'Resolved from the kanban board')}
                            data-testid={`work-resolve-${w.id}`}
                          >
                            Resolve
                          </Button>
                        )}
                        {status === 'done' && (
                          <Button
                            variant="ghost"
                            className="text-ds-micro"
                            onClick={() => reopenWorkItem(w.id, actor, 'Reopened from the kanban board')}
                            data-testid={`work-reopen-${w.id}`}
                          >
                            Reopen
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

/* ── REMINDERS (§Sprint 2 — the proactive reminder runner's output) ────────── */

const BUCKET_ORDER: ReminderBucket[] = ['overdue', 'due_today', 'due_soon'];

const BUCKET_TONE: Record<ReminderBucket, StatusTone> = {
  overdue: 'danger',
  due_today: 'warning',
  due_soon: 'info',
};

/**
 * The active reminder set. Every row is an escalation of a REAL work item — the
 * "Open work item" action hands the operator to the record's own workspace, and
 * dismissing is an audited decision (not a snooze).
 */
function ReminderList({
  reminders,
  buckets,
  actor,
  onOpen,
}: {
  reminders: Reminder[];
  buckets: Record<ReminderBucket, number>;
  actor: string;
  onOpen: (workItemId: string) => void;
}) {
  return (
    <div
      className="overflow-hidden rounded-ds-lg border border-white/[0.06] bg-ink-850"
      data-testid="work-reminders"
      data-reminder-count={reminders.length}
      data-reminder-overdue={buckets.overdue}
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] px-3.5 py-2">
        <span className="text-ds-micro font-semibold uppercase tracking-[0.14em] text-zinc-400">
          Proactive reminders
        </span>
        <span className="font-mono text-ds-label text-zinc-500">
          {buckets.overdue} overdue · {buckets.due_today} due today · {buckets.due_soon} due soon
        </span>
      </header>
      {reminders.length === 0 && (
        <div className="flex items-center gap-2.5 px-3.5 py-3">
          <StatusBadge tone="success" dataStatus="success">
            No reminders raised
          </StatusBadge>
          <p className="text-xs text-zinc-400">
            Nothing is inside the reminder window. Run the deterministic sweep to re-evaluate
            every deadline.
          </p>
        </div>
      )}
      <ul className="divide-y divide-white/[0.05]">
        {BUCKET_ORDER.flatMap((bucket) => {
          const rows = reminders.filter((r) => r.bucket === bucket);
          if (rows.length === 0) return [];
          return [
            <li key={`bucket-${bucket}`} className="bg-white/[0.02] px-3.5 py-1">
              <p className="text-ds-micro font-semibold uppercase tracking-[0.14em] text-zinc-500">
                {REMINDER_BUCKET_LABELS[bucket]} ({rows.length})
              </p>
            </li>,
            ...rows.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-start justify-between gap-3 px-3.5 py-2.5"
                data-testid={`reminder-row-${r.id}`}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone={BUCKET_TONE[r.bucket]} dataStatus={BUCKET_TONE[r.bucket]}>
                      {REMINDER_BUCKET_LABELS[r.bucket]}
                    </StatusBadge>
                    <SourceBadge source={r.source} />
                  </div>
                  <p className="mt-1 text-xs font-medium text-white">{r.title}</p>
                  <p className="mt-0.5 text-ds-label leading-snug text-zinc-500">{r.detail}</p>
                  <p className="mt-0.5 font-mono text-ds-micro text-zinc-600">
                    due {r.dueDate} · raised {r.raisedAt} · work {r.workItemId}
                  </p>
                </div>
                <div className="flex flex-shrink-0 items-center gap-1.5">
                  <Button
                    variant="ghost"
                    className="text-ds-micro"
                    onClick={() => onOpen(r.workItemId)}
                    data-testid={`reminder-open-${r.id}`}
                  >
                    Open work item
                  </Button>
                  <Button
                    variant="ghost"
                    className="text-ds-micro"
                    onClick={() => dismissReminder(r.id, actor, 'Dismissed from the reminder queue')}
                    data-testid={`reminder-dismiss-${r.id}`}
                  >
                    Dismiss
                  </Button>
                </div>
              </li>
            )),
          ];
        })}
      </ul>
    </div>
  );
}

/* ── CALENDAR ──────────────────────────────────────────────────────────────── */

function CalendarBoard({
  entries,
  month,
  onMonth,
  onOpen,
}: {
  /** Dated work items in scope (resolved ones remain as history). */
  entries: WorkItem[];
  month: string;
  onMonth: (month: string) => void;
  onOpen: (workItemId: string) => void;
}) {
  const grid = useMemo(() => buildMonthGrid(month), [month]);
  const byDate = useMemo(() => {
    const inMonth = entries
      .filter((w) => w.dueDate && w.dueDate.startsWith(month))
      .map((w) => ({
        id: calendarEntryId(w.id),
        date: w.dueDate as string,
        title: w.title,
        kind: w.source,
        priority: w.priority,
        tenantId: w.tenantId,
        entity: w.entity,
        actionView: w.actionView,
        workItemId: w.id,
        resolved: w.status === 'done',
      }));
    return entriesByDate(inMonth);
  }, [entries, month]);

  const today = demoToday();
  const monthTotal = Object.values(byDate).reduce((a, l) => a + l.length, 0);

  return (
    <section
      aria-label="Work calendar"
      data-testid="work-calendar"
      data-calendar-month={month}
      data-calendar-entries={monthTotal}
      className="overflow-hidden rounded-ds-lg border border-white/[0.06] bg-ink-850"
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] px-3 py-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" className="px-2" aria-label="Previous month" onClick={() => onMonth(addMonths(month, -1))} data-testid="work-calendar-prev">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <span className="min-w-[130px] text-center text-sm font-semibold text-white" data-testid="work-calendar-label">
            {monthLabel(month)}
          </span>
          <Button variant="ghost" className="px-2" aria-label="Next month" onClick={() => onMonth(addMonths(month, 1))} data-testid="work-calendar-next">
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-ds-label text-zinc-500">{monthTotal} deadline(s)</span>
          <Button variant="ghost" className="text-ds-label" onClick={() => onMonth(monthKey(today))} data-testid="work-calendar-today">
            Today
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-7 border-b border-white/[0.06] bg-white/[0.02]">
        {WEEKDAY_LABELS.map((d) => (
          <span key={d} className="px-2 py-1 text-ds-micro font-semibold uppercase tracking-[0.12em] text-zinc-500">
            {d}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {grid.weeks.flat().map((date) => {
          const day = byDate[date] ?? [];
          const isCurrentMonth = date.startsWith(month);
          return (
            <div
              key={date}
              data-testid={`work-calendar-cell-${date}`}
              data-cell-count={day.length}
              className={
                'min-h-[86px] border-b border-r border-white/[0.05] px-1.5 py-1.5 ' +
                (isCurrentMonth ? '' : 'bg-white/[0.01] opacity-50')
              }
            >
              <span
                className={
                  'font-mono text-ds-micro ' +
                  (date === today ? 'rounded bg-brass-500/25 px-1 text-brass-200' : 'text-zinc-600')
                }
              >
                {date.slice(8)}
              </span>
              <ul className="mt-1 space-y-1">
                {day.slice(0, 3).map((e) => (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={() => onOpen(e.workItemId)}
                      title={`${e.title} — ${WORK_PRIORITY_LABELS[e.priority]}`}
                      data-testid={`work-calendar-entry-${e.workItemId}`}
                      className={
                        'block w-full truncate rounded-sm px-1 py-0.5 text-left text-ds-micro ' +
                        (e.resolved ? 'text-zinc-600 line-through' : 'text-zinc-200')
                      }
                      style={{
                        borderLeft: `2px solid ${DOMAIN_COLOURS[PRIORITY_DOMAIN[e.priority]].solid}`,
                      }}
                    >
                      {e.title}
                    </button>
                  </li>
                ))}
                {day.length > 3 && (
                  <li className="px-1 text-ds-micro text-zinc-500">+{day.length - 3} more</li>
                )}
              </ul>
            </div>
          );
        })}
      </div>
      <p className="px-3 py-2 text-ds-micro text-zinc-600">
        Every entry is a work item's deadline. Resolved items stay visible, struck through, and stop
        driving reminders.
      </p>
    </section>
  );
}

/* ── NEW TASK (real creation, both scopes) ─────────────────────────────────── */

/**
 * Creates a REAL work item in the canonical store (audited + event-emitting).
 * Rendered in the context rail by both portals so the task layer is usable, not
 * just readable.
 */
export function NewTaskPanel({
  scope,
  tenantId,
  actor,
}: {
  scope: 'admin' | 'brand';
  tenantId?: string | null;
  actor: string;
}) {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<WorkPriority>('normal');
  const [created, setCreated] = useState<string | null>(null);

  return (
    <ContextPanel title="New task">
      <div className="space-y-2">
        <Input
          label=""
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs doing?"
          dataTestid="work-new-title"
        />
        <div className="flex gap-2">
          <input
            type="date"
            aria-label="Due date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            data-testid="work-new-due"
            className="flex-1 rounded-md border border-white/[0.08] bg-ink-900 px-2 py-1.5 text-xs text-zinc-300"
          />
          <select
            aria-label="Priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as WorkPriority)}
            data-testid="work-new-priority"
            className="cursor-pointer rounded-md border border-white/[0.08] bg-ink-900 px-2 py-1.5 text-xs text-zinc-300"
          >
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
        <Button
          variant="primary"
          className="w-full text-ds-label"
          data-testid="work-new-submit"
          onClick={() => {
            if (!title.trim()) return;
            const item = createWorkItem(
              {
                title,
                dueDate: dueDate || null,
                priority,
                tenantId: scope === 'brand' ? tenantId ?? null : null,
              },
              actor
            );
            setCreated(item.title);
            setTitle('');
            setDueDate('');
            setPriority('normal');
          }}
        >
          Create task
        </Button>
        {created && (
          <p className="text-ds-micro text-emerald-300" data-testid="work-new-confirm">
            Created “{created}” — it is now in the list, board and calendar.
          </p>
        )}
      </div>
    </ContextPanel>
  );
}


/* ── RECORD DRAWER ─────────────────────────────────────────────────────────── */

function WorkRecordDrawer({
  item,
  onClose,
  actor,
  openLabel,
  onOpenRecord,
}: {
  item: WorkItem | null;
  onClose: () => void;
  actor: string;
  openLabel: string;
  /** §SSOT S3 — the owning destination for a record-qualified item. */
  onOpenRecord: (item: WorkItem) => void;
}) {
  const resolvableHere = item !== null && canResolveFromWorkLayer(item);
  return (
    <RecordDrawer
      open={item !== null}
      onClose={onClose}
      title={item?.title ?? ''}
      subtitle={item ? `${WORK_SOURCE_LABELS[item.source]} · ${item.entity.label}` : undefined}
      testId="work-record-drawer"
      footer={
        item && (
          <div className="flex flex-wrap items-center gap-2">
            {/*
              §SSOT S3 — A RECORD-QUALIFIED ITEM IS CLOSED BY ITS OWNING ACTION,
              never by a Resolve button here (S2 refuses that call). The primary
              action therefore hands the operator to the record's own workspace.
            */}
            {!resolvableHere ? (
              <>
                <Button
                  variant="primary"
                  className="text-ds-label"
                  data-testid="work-drawer-open-record"
                  onClick={() => onOpenRecord(item)}
                  title={describeWorkClosing(item.source)}
                >
                  {openLabel}
                </Button>
                {item.status !== 'in_progress' && (
                  <Button
                    variant="ghost"
                    className="text-ds-label"
                    data-testid="work-drawer-start"
                    onClick={() => setWorkItemStatus(item.id, 'in_progress', actor)}
                    title="Writes a note on THIS work record saying you have started it. It does not change the order, the deadline or anything on the record itself."
                  >
                    Mark in progress
                  </Button>
                )}
                {item.status !== 'blocked' && (
                  <Button
                    variant="ghost"
                    className="text-ds-label"
                    data-testid="work-drawer-block"
                    onClick={() => setWorkItemStatus(item.id, 'blocked', actor)}
                    title="Writes a note on THIS work record saying you cannot proceed. It does not stop the order, the deadline or the work."
                  >
                    Mark blocked
                  </Button>
                )}
                {item.status !== 'open' && (
                  <Button
                    variant="ghost"
                    className="text-ds-label"
                    data-testid="work-drawer-clear-mark"
                    onClick={() => reopenWorkItem(item.id, actor, 'Cleared the operator mark from the work record')}
                    title="Removes your note and returns this item to Open."
                  >
                    Clear mark
                  </Button>
                )}
                {/**
                  * §DEFECT FIXED AT SOURCE (owner-reported, 2026-09-30) — THE BUTTONS NOW SAY
                  * WHAT THEY DO. The owner asked what these three buttons are FOR, which is the
                  * honest signal that the labels ("Start" / "Block") implied capabilities they do
                  * not have: they only write a NOTE on this list, while the work itself is settled
                  * on the record. This line states the split in place, and each button carries the
                  * same explanation on hover.
                  */}
                <p
                  className="w-full text-ds-micro leading-snug text-zinc-500"
                  data-testid="work-drawer-actions-explainer"
                >
                  <span className="text-zinc-400">{openLabel}</span> takes you to the record where this is
                  actually settled — this item closes by doing THAT work, not by ticking a box here.{' '}
                  <span className="text-zinc-400">Mark in progress</span> and{' '}
                  <span className="text-zinc-400">Mark blocked</span> only write a note on this list for you and
                  your colleagues; they change nothing on the order.
                </p>
              </>
            ) : (
              <>
                {item.status !== 'done' && (
                  <>
                    <Button
                      variant="primary"
                      className="text-ds-label"
                      data-testid="work-drawer-resolve"
                      onClick={() => {
                        resolveWorkItem(item.id, actor, 'Resolved from the work record');
                        // The work is done: return the operator to the queue rather
                        // than leaving a resolved record open.
                        onClose();
                      }}
                    >
                      Resolve
                    </Button>
                    {item.status !== 'in_progress' && (
                      <Button
                        variant="ghost"
                        className="text-ds-label"
                        data-testid="work-drawer-start"
                        onClick={() => setWorkItemStatus(item.id, 'in_progress', actor)}
                        title="Writes a note on THIS work record saying you have started it. It does not change the record itself."
                      >
                        Mark in progress
                      </Button>
                    )}
                  </>
                )}
                {item.status === 'done' && (
                  <Button
                    variant="ghost"
                    className="text-ds-label"
                    data-testid="work-drawer-reopen"
                    onClick={() => reopenWorkItem(item.id, actor, 'Reopened from the work record')}
                  >
                    Reopen
                  </Button>
                )}
              </>
            )}
            {item.entity.type !== 'none' && !item.derived && (
              <Button
                variant="ghost"
                className="text-ds-label"
                data-testid="work-drawer-open-record"
                onClick={() => {
                  /**
                   * §P3 — the retired Command Centre's "no hunting through five
                   * screens" guarantee is preserved: a founder-console item
                   * records the Super-Admin TAB its destination must open, and the
                   * tab-aware navigation intent is raised before the view changes.
                   * The Super Admin panel validates the tab id before selecting it.
                   */
                  onOpenRecord(item);
                }}
              >
                {openLabel}
              </Button>
            )}
          </div>
        )
      }
    >
      {item && (
        <div className="space-y-4">
          <RecordFieldList
            fields={[
              { label: 'Source', value: <SourceBadge source={item.source} /> },
              { label: 'Priority', value: WORK_PRIORITY_LABELS[item.priority] },
              ...(typeof item.rank === 'number'
                ? [{ label: 'Founder rank', value: `#${item.rank}` }]
                : []),
              { label: 'Status', value: WORK_STATUS_LABELS[item.status] },
              /*
                §SSOT S2/S3 — the operator's OWN mark is shown as an annotation, and
                a record-qualified item names the action that closes it, so nobody
                reads "Open" as "nobody is looking at this" or hunts for a way to
                tick the record off.
              */
              ...(item.derived
                ? [
                    {
                      label: 'Closed by',
                      value: (
                        <span data-testid="work-drawer-closing">{describeWorkClosing(item.source)}</span>
                      ),
                    },
                  ]
                : []),
              ...(item.annotation
                ? [
                    {
                      label: 'Your mark',
                      value: `${WORK_STATUS_LABELS[item.annotation.status]} · ${item.annotation.actor} · ${item.annotation.at.slice(0, 10)}`,
                    },
                  ]
                : []),
              { label: 'Owner', value: item.owner },
              { label: 'Due', value: item.dueDate ? `${item.dueDate} · ${dueLabel(item.dueDate)}` : 'No deadline' },
              { label: 'Entity', value: `${item.entity.type.replace(/_/g, ' ')} · ${item.entity.label}` },
              { label: 'Tenant', value: item.tenantId ? brandLabel(item.tenantId) : 'Platform-wide' },
              ...(item.navTab ? [{ label: 'Opens tab', value: item.navTab }] : []),
              { label: 'Work id', value: <span className="font-mono text-ds-label">{item.id}</span> },
            ]}
          />
          <p className="text-ds-label leading-snug text-zinc-400">{item.detail}</p>
          {/*
            §P3 — the founder console's WHY, verbatim: every factor with the value
            it was actually observed from, and the score as the sum of its points
            (auditable arithmetic — never a model score).
          */}
          {item.why && (
            <div data-testid="work-drawer-why">
              <h3 className="mb-2 text-ds-label font-semibold uppercase tracking-[0.14em] text-zinc-400">
                Why this rank
              </h3>
              <ul className="space-y-1">
                {item.why.factors.map((f) => (
                  <li key={f.id} className="flex items-start justify-between gap-3 text-ds-label">
                    <span className="text-zinc-300">
                      {f.label}
                      <span className="block text-ds-micro text-zinc-500">{f.observed}</span>
                    </span>
                    <span className="font-mono text-zinc-200">{f.points}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 border-t border-white/[0.06] pt-2 text-ds-label text-zinc-400">
                Score <span className="font-mono text-zinc-200">{item.why.score}</span> — the sum of the factor
                points above. Ranked by declared factors over stored data only; no AI, nothing invented.
              </p>
            </div>
          )}
          <div>
            <h3 className="mb-2 text-ds-label font-semibold uppercase tracking-[0.14em] text-zinc-400">
              Activity
            </h3>
            <ActivityFeed
              entries={item.activity.map((a) => ({
                id: a.id,
                title: a.action.replace(/_/g, ' '),
                meta: `${a.actor} · ${a.detail}`,
                at: a.at,
                tone: (a.action === 'resolved' ? 'success' : 'info') as StatusTone,
              }))}
              empty={<p className="text-ds-label text-zinc-600">No activity recorded yet.</p>}
            />
          </div>
        </div>
      )}
    </RecordDrawer>
  );
}




