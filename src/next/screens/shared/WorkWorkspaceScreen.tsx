import { useEffect, useMemo, useState } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { DEMO_OPERATIONAL_STATE_LABEL } from '@/config/demo';
import { requestAdminNav } from '@/data/adminNav';
import { navigateProductView } from '@/lib/runtime/productRoutes';
import { useRecordDeepLink } from '@/lib/runtime/recordDeepLink';
import { addMonths, buildMonthGrid, entriesByDate, monthKey, monthLabel, dueLabel, WEEKDAY_LABELS } from '@/lib/work/calendar';
import {
  REMINDER_BUCKET_LABELS,
  dismissReminder,
  resetReminderStore,
  runReminderSweep,
} from '@/lib/work/reminderRunner';
import { useReminders, useWorkItems } from '@/lib/work/useWork';
import type { WorkItem, WorkScope } from '@/lib/work/types';
import {
  WORK_PRIORITY_LABELS,
  WORK_SOURCE_LABELS,
  WORK_STATUS_LABELS,
  canResolveFromWorkLayer,
  createWorkItem,
  demoToday,
  reopenWorkItem,
  resetWorkStore,
  resolveWorkItem,
  setWorkItemStatus,
  workActor,
  workCounts,
} from '@/lib/work/workStore';
import { WorkWorkspaceView, type WorkTabMode } from './WorkWorkspaceView';

export function WorkWorkspaceScreen({
  scope,
  initialView = 'list',
  onNavigate,
}: {
  scope: WorkScope;
  initialView?: WorkTabMode;
  onNavigate: (view: string) => void;
}) {
  const { session, role } = useApp();
  const tenantId = scope === 'brand' ? session?.tenantId ?? null : null;
  const includeSuperAdminOnly = scope === 'admin' && role === 'Super Admin';
  const actor = workActor(session);
  const today = demoToday();

  const [activeTab, setActiveTab] = useState<WorkTabMode>(initialView);
  const [month, setMonth] = useState(() => monthKey(today));
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    setActiveTab(initialView);
  }, [initialView]);

  const workOpts = { superAdmin: includeSuperAdminOnly };
  const items = useWorkItems(scope, tenantId, workOpts);
  const allItemsIncludingDone = useWorkItems(scope, tenantId, {
    ...workOpts,
    includeResolved: true,
  });
  const reminders = useReminders(scope, tenantId);
  const counts = workCounts(scope, tenantId, workOpts);

  const deepLinkWork = useRecordDeepLink('work');
  useEffect(() => {
    if (deepLinkWork && allItemsIncludingDone.some((w) => w.id === deepLinkWork)) {
      setSelectedId(deepLinkWork);
    }
  }, [deepLinkWork, allItemsIncludingDone]);

  const grid = useMemo(() => buildMonthGrid(month), [month]);
  const entries = useMemo(
    () =>
      allItemsIncludingDone
        .filter((w) => w.dueDate !== null && w.dueDate.startsWith(month))
        .map((w) => ({
          id: `cal-${w.id}`,
          date: w.dueDate as string,
          title: w.title,
          kind: w.source,
          priority: w.priority,
          tenantId: w.tenantId,
          entity: w.entity,
          actionView: w.actionView,
          workItemId: w.id,
          resolved: w.status === 'done',
        })),
    [allItemsIncludingDone, month]
  );
  const byDay = useMemo(() => entriesByDate(entries), [entries]);

  const sourceBreakdown = useMemo(() => {
    const countsBySrc = new Map<string, number>();
    for (const w of items) {
      countsBySrc.set(w.source, (countsBySrc.get(w.source) ?? 0) + 1);
    }
    return Array.from(countsBySrc.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([source, count]) => ({
        source,
        label: WORK_SOURCE_LABELS[source as keyof typeof WORK_SOURCE_LABELS] ?? source,
        count,
      }));
  }, [items]);

  function openOwningRecord(item: WorkItem) {
    if (item.navTab) {
      requestAdminNav({ view: item.actionView, tab: item.navTab, source: `work:${item.id}` });
    }
    setSelectedId(null);
    if (item.entity.type === 'purchase_order' && item.entity.label) {
      navigateProductView(scope, item.actionView, { po: item.entity.label });
    }
    onNavigate(item.actionView);
  }

  const title =
    initialView === 'calendar'
      ? scope === 'admin'
        ? 'Operations Calendar'
        : 'Compliance & Ship Calendar'
      : scope === 'admin'
        ? 'Work Management'
        : 'Tasks & Deadlines';

  const description =
    initialView === 'calendar'
      ? 'Deadlines derived live from purchase orders, shipments, compliance expiries, contracts, and manual tasks.'
      : scope === 'admin'
        ? includeSuperAdminOnly
          ? 'Unified portfolio work list across POs, compliance gates, contracts, deductions, logistics, returns, and founder priorities.'
          : 'Portfolio operational work across POs, compliance gates, contracts, deductions, carrier exceptions, and returns.'
        : 'Single brand action list combining PO acknowledgements, ship windows, document expiries, deductions, and manual tasks.';

  return (
    <WorkWorkspaceView
      scope={scope}
      title={title}
      description={description}
      today={today}
      operationalStateLabel={DEMO_OPERATIONAL_STATE_LABEL}
      includeSuperAdminOnly={includeSuperAdminOnly}
      items={items}
      allItemsIncludingDone={allItemsIncludingDone}
      reminders={reminders}
      counts={{
        attention: counts.attention,
        overdue: counts.overdue,
        open: counts.open,
      }}
      sourceBreakdown={sourceBreakdown}
      sourceLabels={WORK_SOURCE_LABELS}
      priorityLabels={WORK_PRIORITY_LABELS}
      statusLabels={WORK_STATUS_LABELS}
      reminderBucketLabels={REMINDER_BUCKET_LABELS}
      calendarWeeks={grid.weeks}
      calendarMonthLabel={monthLabel(month)}
      calendarMonth={month}
      entriesByDay={byDay}
      weekdayLabels={WEEKDAY_LABELS}
      activeTab={activeTab}
      onChangeTab={setActiveTab}
      onShiftMonth={(delta) => setMonth((m) => addMonths(m, delta))}
      onResetMonth={() => setMonth(monthKey(today))}
      selectedItem={allItemsIncludingDone.find((w) => w.id === selectedId) ?? null}
      onSelectItem={setSelectedId}
      onOpenOwningRecord={openOwningRecord}
      /* §PORT FIX (2026-11-25) — the work-layer commands return `WorkItem | null`
         rather than an `{ ok, error }` result, and `setWorkItemStatus` takes
         three arguments. Adapted here so the View's contract is honoured without
         changing the canonical store. */
      onResolveManual={(id, note) => {
        const item = resolveWorkItem(id, actor, note);
        return item ? { ok: true } : { ok: false, error: 'That item could not be resolved.' };
      }}
      onReopenManual={(id, note) => {
        const item = reopenWorkItem(id, actor, note);
        return item ? { ok: true } : { ok: false, error: 'That item could not be reopened.' };
      }}
      onSetStatus={(id, status) => {
        const item = setWorkItemStatus(id, status, actor);
        return item ? { ok: true } : { ok: false, error: 'That status change could not be applied.' };
      }}
      onCreateTask={(input) => {
        try {
          createWorkItem(
            {
              /* §PORT FIX (2026-11-25) — `CreateWorkItemInput` is exactly
                 { title, detail?, priority?, dueDate?, tenantId?, owner?,
                 actionView? }. The snapshot passed `source`, `scope`, `entity`
                 and `actionLabel`, none of which the canonical input accepts. */
              title: input.title,
              detail: input.detail,
              priority: input.priority,
              dueDate: input.dueDate || null,
              tenantId,
              actionView: 'work',
            },
            actor
          );
          return { ok: true };
        } catch (error) {
          return {
            ok: false,
            error: error instanceof Error ? error.message : 'The task could not be created.',
          };
        }
      }}
      onRunSweep={() => runReminderSweep(scope, tenantId, actor)}
      onDismissReminder={(id) => dismissReminder(id, actor)}
      onResetWork={() => {
        resetWorkStore();
        resetReminderStore();
      }}
      canResolveCheck={(item) => canResolveFromWorkLayer(item)}
      dueLabelFn={dueLabel}
      openLabel={scope === 'brand' ? 'Open workflow' : 'Open record'}
    />
  );
}
