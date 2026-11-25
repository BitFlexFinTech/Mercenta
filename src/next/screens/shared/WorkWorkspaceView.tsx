import { useState, type ReactNode } from 'react';
import {
  BellRing,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Columns3,
  List as ListIcon,
  Plus,
  RotateCcw,
} from 'lucide-react';
import type {
  CalendarEntry,
  Reminder,
  ReminderSweepResult,
  WorkItem,
  WorkPriority,
  WorkScope,
  WorkSource,
  WorkStatus,
} from '@/lib/work/types';
import {
  ConsoleTable,
  InlineStatus,
  MetricStrip,
  ConsoleHeader,
  SlideOverDrawer,
  type ConsoleColumn,
  type MetricItem,
  type SemanticTone,
} from '@/next/components/ConsolePrimitives';
import { ConsoleTabs, NoticeBanner, SectionCard } from '@/next/components/ConsoleCharts';

export type WorkTabMode = 'list' | 'board' | 'calendar' | 'reminders';

export interface WorkWorkspaceViewProps {
  scope: WorkScope;
  title: string;
  description: string;
  today: string;
  operationalStateLabel: string;
  includeSuperAdminOnly: boolean;
  items: WorkItem[];
  allItemsIncludingDone: WorkItem[];
  reminders: Reminder[];
  counts: { attention: number; overdue: number; open: number };
  sourceBreakdown: { source: string; label: string; count: number }[];
  sourceLabels: Record<WorkSource, string>;
  priorityLabels: Record<WorkPriority, string>;
  statusLabels: Record<WorkStatus, string>;
  reminderBucketLabels: Record<Reminder['bucket'], string>;
  calendarWeeks: string[][];
  calendarMonthLabel: string;
  calendarMonth: string;
  entriesByDay: Record<string, CalendarEntry[]>;
  weekdayLabels: string[];
  activeTab: WorkTabMode;
  onChangeTab: (tab: WorkTabMode) => void;
  onShiftMonth: (delta: number) => void;
  onResetMonth: () => void;
  selectedItem: WorkItem | null;
  onSelectItem: (id: string | null) => void;
  onOpenOwningRecord: (item: WorkItem) => void;
  onResolveManual: (id: string, note?: string) => { ok: boolean; error?: string };
  onReopenManual: (id: string, note?: string) => { ok: boolean; error?: string };
  onSetStatus: (id: string, status: WorkStatus, note?: string) => { ok: boolean; error?: string };
  onCreateTask: (input: {
    title: string;
    detail: string;
    priority: WorkPriority;
    dueDate: string;
  }) => void;
  onRunSweep: () => ReminderSweepResult;
  onDismissReminder: (id: string) => void;
  onResetWork: () => void;
  canResolveCheck: (item: WorkItem) => boolean;
  dueLabelFn: (dueDate: string | null) => string;
  openLabel?: string;
}

const PRIORITY_TONE: Record<WorkPriority, SemanticTone> = {
  critical: 'danger',
  high: 'warning',
  normal: 'neutral',
};

const STATUS_TONE: Record<WorkStatus, SemanticTone> = {
  open: 'neutral',
  in_progress: 'info',
  blocked: 'danger',
  done: 'success',
};

export function WorkWorkspaceView(props: WorkWorkspaceViewProps) {
  const {
    scope,
    title,
    description,
    today,
    operationalStateLabel,
    items,
    allItemsIncludingDone,
    reminders,
    counts,
    sourceBreakdown,
    sourceLabels,
    priorityLabels,
    statusLabels,
    reminderBucketLabels,
    calendarWeeks,
    calendarMonthLabel,
    calendarMonth,
    entriesByDay,
    weekdayLabels,
    activeTab,
    onChangeTab,
    onShiftMonth,
    onResetMonth,
    selectedItem,
    onSelectItem,
    onOpenOwningRecord,
    onResolveManual,
    onReopenManual,
    onSetStatus,
    onCreateTask,
    onRunSweep,
    onDismissReminder,
    onResetWork,
    canResolveCheck,
    dueLabelFn,
    openLabel = 'Open record',
  } = props;

  const [priorityFilter, setPriorityFilter] = useState<'all' | WorkPriority>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | WorkSource>('all');
  const [query, setQuery] = useState('');
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDetail, setNewDetail] = useState('');
  const [newPriority, setNewPriority] = useState<WorkPriority>('normal');
  const [newDue, setNewDue] = useState(today);
  const [sweepResult, setSweepResult] = useState<ReminderSweepResult | null>(null);
  const [drawerNote, setDrawerNote] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const filtered = allItemsIncludingDone.filter((w) => {
    if (w.status === 'done' && activeTab !== 'list') return false;
    if (priorityFilter !== 'all' && w.priority !== priorityFilter) return false;
    if (sourceFilter !== 'all' && w.source !== sourceFilter) return false;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      return (
        w.title.toLowerCase().includes(q) ||
        w.detail.toLowerCase().includes(q) ||
        w.entity.label.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const openFiltered = filtered.filter((w) => w.status !== 'done');
  const dueSoonCount = items.filter(
    (w) => w.dueDate !== null && w.dueDate >= today && w.dueDate <= addIsoDays(today, 7)
  ).length;
  const closedManually = allItemsIncludingDone.filter((w) => !w.derived && w.status === 'done').length;

  const metrics: MetricItem[] = [
    {
      id: 'work-attention',
      label: 'Needs attention',
      value: String(counts.attention),
      context: 'Critical or overdue deadlines',
      active: activeTab === 'list' && priorityFilter === 'all',
      onClick: () => {
        setPriorityFilter('all');
        setSourceFilter('all');
        setQuery('');
        onChangeTab('list');
      },
      testId: 'work-metric-attention',
      valueTestId: 'work-metric-attention-value',
    },
    {
      id: 'work-overdue',
      label: 'Overdue',
      value: String(counts.overdue),
      context: 'Deadlines earlier than demo clock',
      onClick: () => onChangeTab('reminders'),
      testId: 'work-metric-overdue',
      valueTestId: 'work-metric-overdue-value',
    },
    {
      id: 'work-due-week',
      label: 'Due this week',
      value: String(dueSoonCount),
      context: 'Inside next 7 days',
      onClick: () => onChangeTab('board'),
      testId: 'work-metric-due-week',
      valueTestId: 'work-metric-due-week-value',
    },
    {
      id: 'work-open',
      label: 'All open work',
      value: String(counts.open),
      context: `${closedManually} manual resolved · ${reminders.length} reminders`,
      onClick: () => onChangeTab('list'),
      testId: 'work-metric-open',
      valueTestId: 'work-metric-open-value',
    },
  ];

  const columns: ConsoleColumn<WorkItem>[] = [
    {
      key: 'title',
      header: 'Work item',
      mobilePrimary: true,
      render: (w) => (
        <div className="min-w-0">
          <div className="font-medium text-strong">{w.title}</div>
          <div className="text-ds-label text-muted line-clamp-1">{w.detail}</div>
          {w.why && (
            <div
              className="text-ds-micro font-mono text-faint mt-0.5"
              data-testid={`work-why-${w.id}`}
            >
              score {w.why.score} · {w.why.factors.map((f) => `${f.label} ${f.points}`).join(' + ')}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'source',
      header: 'Category',
      render: (w) => (
        <span className="text-ds-label text-secondary font-medium">{sourceLabels[w.source]}</span>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (w) => (
        <InlineStatus
          label={
            w.superAdminOnly && typeof w.rank === 'number'
              ? `#${w.rank} · ${priorityLabels[w.priority]}`
              : priorityLabels[w.priority]
          }
          tone={PRIORITY_TONE[w.priority]}
        />
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (w) => (
        <InlineStatus label={statusLabels[w.status]} tone={STATUS_TONE[w.status]} />
      ),
    },
    {
      key: 'due',
      header: 'Deadline',
      align: 'right',
      render: (w) => (
        <div className="text-right">
          <div className="font-mono text-ds-label text-ink-900">{w.dueDate ?? '—'}</div>
          <div className="text-ds-micro text-faint">{dueLabelFn(w.dueDate)}</div>
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Destination',
      align: 'right',
      hideOnMobile: true,
      render: (w) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenOwningRecord(w);
          }}
          className="text-ds-label font-medium text-accent hover:underline"
        >
          {openLabel}
        </button>
      ),
    },
  ];

  const availableSources = Array.from(new Set(allItemsIncludingDone.map((w) => w.source)));

  function submitTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onCreateTask({
      title: newTitle.trim(),
      detail: newDetail.trim() || 'Manual task added from workspace',
      priority: newPriority,
      dueDate: newDue,
    });
    setNewTitle('');
    setNewDetail('');
    setShowNewTask(false);
    setFeedback('Manual task created in the canonical work store.');
  }

  return (
    <div className="space-y-6" data-testid="work-workspace">
      <ConsoleHeader
        title={title}
        description={description}
        meta={
          <>
            <span className="font-mono tabular-nums">{items.length} open</span>
            <span className="font-mono tabular-nums">{reminders.length} reminders</span>
            <span className="font-mono">As at {today}</span>
            <span className="text-state-warning font-mono" data-testid="work-operational-state-label">
              {operationalStateLabel}
            </span>
          </>
        }
        actions={
          <>
            <button
              type="button"
              onClick={() => setShowNewTask((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-ds-md bg-accent text-on-dark text-ds-label font-medium hover:bg-accent-600"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              New task
            </button>
            <button
              type="button"
              onClick={() => {
                const r = onRunSweep();
                setSweepResult(r);
                onChangeTab('reminders');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-ds-md border border-hairline-strong bg-surface-raised text-ds-label font-medium text-ink-900 hover:bg-surface"
            >
              <BellRing className="w-3.5 h-3.5" aria-hidden="true" />
              Run reminder sweep
            </button>
            <button
              type="button"
              onClick={() => {
                onResetWork();
                setFeedback('Manual demo work items and reminder sweep state reset.');
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-ds-md border border-hairline bg-surface-raised text-ds-label text-muted hover:text-strong"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              Reset demo work
            </button>
          </>
        }
      />

      {feedback && (
        <NoticeBanner tone="info" message={feedback} />
      )}

      {showNewTask && (
        <SectionCard title="New manual task" description="Adds a task directly to the shared work store.">
          <form onSubmit={submitTask} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <label className="block sm:col-span-2">
              <span className="block text-ds-micro uppercase tracking-[0.06em] text-faint mb-1">Title</span>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Follow up warehouse slot confirmation"
                className="w-full px-3 py-1.5 rounded-ds-sm border border-hairline-strong text-ds-body text-strong"
              />
            </label>
            <label className="block">
              <span className="block text-ds-micro uppercase tracking-[0.06em] text-faint mb-1">Priority</span>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as WorkPriority)}
                className="w-full px-3 py-1.5 rounded-ds-sm border border-hairline-strong bg-surface-raised text-ds-body text-strong"
              >
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </label>
            <label className="block">
              <span className="block text-ds-micro uppercase tracking-[0.06em] text-faint mb-1">Due date</span>
              <input
                type="date"
                value={newDue}
                onChange={(e) => setNewDue(e.target.value)}
                className="w-full px-3 py-1.5 rounded-ds-sm border border-hairline-strong text-ds-body text-strong"
              />
            </label>
            <label className="block sm:col-span-3">
              <span className="block text-ds-micro uppercase tracking-[0.06em] text-faint mb-1">Notes</span>
              <input
                type="text"
                value={newDetail}
                onChange={(e) => setNewDetail(e.target.value)}
                placeholder="Context or instruction"
                className="w-full px-3 py-1.5 rounded-ds-sm border border-hairline-strong text-ds-body text-strong"
              />
            </label>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-ds-sm bg-ink-950 text-on-dark text-ds-label font-medium hover:bg-ink-800"
              >
                Add task
              </button>
              <button
                type="button"
                onClick={() => setShowNewTask(false)}
                className="px-3 py-1.5 rounded-ds-sm border border-hairline-strong text-ds-label text-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </SectionCard>
      )}

      <MetricStrip items={metrics} columns={4} />

      <ConsoleTabs
        ariaLabel="Work workspace view"
        value={activeTab}
        onChange={onChangeTab}
        tabs={[
          { id: 'list', label: 'List', count: openFiltered.length },
          { id: 'board', label: 'Board', count: openFiltered.length },
          { id: 'calendar', label: 'Calendar' },
          { id: 'reminders', label: 'Reminders', count: reminders.length },
        ]}
      />

      {activeTab !== 'calendar' && (
        <div className="flex flex-wrap items-center gap-3 text-ds-label">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search work items or record refs…"
            aria-label="Search work items"
            className="w-full sm:w-64 px-3 py-1.5 rounded-ds-sm border border-hairline-strong bg-surface-raised text-ds-body text-strong"
          />
          <select
            aria-label="Filter by priority"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as 'all' | WorkPriority)}
            className="px-2.5 py-1.5 rounded-ds-sm border border-hairline-strong bg-surface-raised text-ink-900"
          >
            <option value="all">All priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
          </select>
          <select
            aria-label="Filter by source"
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as 'all' | WorkSource)}
            className="px-2.5 py-1.5 rounded-ds-sm border border-hairline-strong bg-surface-raised text-ink-900"
          >
            <option value="all">All categories</option>
            {availableSources.map((s) => (
              <option key={s} value={s}>
                {sourceLabels[s]}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-6 items-start">
        <div className="min-w-0">
          {activeTab === 'list' && (
            <ConsoleTable
              rows={openFiltered}
              columns={columns}
              rowKey={(w) => w.id}
              selectedKey={selectedItem?.id ?? null}
              onRowClick={(w) => onSelectItem(w.id)}
              emptyTitle="No open work items match"
              emptyDescription="Record-derived items clear automatically when resolved in their owning view."
              testId="work-list-table"
            />
          )}

          {activeTab === 'board' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-testid="work-kanban">
              {(['open', 'in_progress', 'blocked'] as WorkStatus[]).map((colStatus) => {
                const colRows = openFiltered.filter((w) => w.status === colStatus);
                return (
                  <div key={colStatus} className="border border-hairline bg-canvas-50 rounded-ds-md p-3 space-y-2.5">
                    <div className="flex items-center justify-between border-b border-hairline pb-2">
                      <span className="text-ds-label font-semibold uppercase tracking-[0.06em] text-secondary">
                        {statusLabels[colStatus]}
                      </span>
                      <span className="font-mono text-ds-label text-faint tabular-nums">{colRows.length}</span>
                    </div>
                    {colRows.length === 0 ? (
                      <p className="text-ds-label text-faint py-4 text-center">No items</p>
                    ) : (
                      colRows.map((w) => (
                        <button
                          key={w.id}
                          type="button"
                          onClick={() => onSelectItem(w.id)}
                          className="w-full text-left border border-hairline bg-surface-raised rounded-ds-md p-3 hover:border-hairline-bold space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-ds-micro font-mono text-faint truncate">
                              {sourceLabels[w.source]}
                            </span>
                            <InlineStatus label={priorityLabels[w.priority]} tone={PRIORITY_TONE[w.priority]} />
                          </div>
                          <div className="text-ds-body font-medium text-strong">{w.title}</div>
                          <div className="text-ds-label text-muted line-clamp-2">{w.detail}</div>
                          <div className="text-ds-micro font-mono text-faint pt-1">
                            Due {w.dueDate ?? '—'} · {w.entity.label}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'calendar' && (
            <SectionCard
              title={calendarMonthLabel}
              description="Deadlines derived live from canonical work items. Resolving the underlying record clears the deadline."
              actions={
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onShiftMonth(-1)}
                    aria-label="Previous month"
                    className="p-1.5 rounded-ds-sm border border-hairline-strong bg-surface-raised hover:bg-surface"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={onResetMonth}
                    className="px-2.5 py-1 rounded-ds-sm border border-hairline-strong bg-surface-raised text-ds-label text-ink-800 hover:bg-surface"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => onShiftMonth(1)}
                    aria-label="Next month"
                    className="p-1.5 rounded-ds-sm border border-hairline-strong bg-surface-raised hover:bg-surface"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              }
            >
              <div className="grid grid-cols-7 gap-px bg-tint-strong border border-hairline rounded-ds-sm overflow-hidden">
                {weekdayLabels.map((d) => (
                  <div
                    key={d}
                    className="bg-surface px-2 py-1.5 text-ds-micro font-medium uppercase tracking-[0.06em] text-faint text-center"
                  >
                    {d}
                  </div>
                ))}
                {calendarWeeks.flat().map((date) => {
                  const inMonth = date.startsWith(calendarMonth);
                  const isToday = date === today;
                  const dayEntries = entriesByDay[date] ?? [];
                  return (
                    <div
                      key={date}
                      className={`min-h-[92px] p-1.5 bg-surface-raised ${
                        !inMonth ? 'bg-canvas-60 text-quiet' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-ds-micro font-mono tabular-nums px-1 rounded-ds-sm ${
                            isToday ? 'bg-accent text-on-dark font-semibold' : 'text-muted'
                          }`}
                        >
                          {date.slice(8)}
                        </span>
                        {dayEntries.length > 0 && (
                          <span className="text-ds-micro font-mono text-quiet">{dayEntries.length}</span>
                        )}
                      </div>
                      <div className="space-y-1">
                        {dayEntries.slice(0, 3).map((entry) => (
                          <button
                            key={entry.id}
                            type="button"
                            onClick={() => onSelectItem(entry.workItemId)}
                            className={`w-full text-left px-1.5 py-0.5 rounded-ds-sm text-ds-micro truncate border ${
                              entry.resolved
                                ? 'border-hairline bg-surface text-quiet line-through'
                                : entry.priority === 'critical'
                                  ? 'border-state-danger/20 bg-state-danger/10 text-state-danger'
                                  : 'border-hairline bg-surface text-ink-900 hover:border-hairline-bold'
                            }`}
                            title={entry.title}
                          >
                            {entry.title}
                          </button>
                        ))}
                        {dayEntries.length > 3 && (
                          <div className="text-ds-micro text-faint px-1">+{dayEntries.length - 3} more</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          )}

          {activeTab === 'reminders' && (
            <div className="space-y-4">
              {sweepResult && (
                <NoticeBanner
                  tone="info"
                  title={`Reminder sweep completed (${sweepResult.sweptAt})`}
                  message={`Raised ${sweepResult.raised.length} reminder(s) · ${sweepResult.suppressedResolved} resolved suppressed · ${sweepResult.duplicatesSuppressed} already active`}
                />
              )}
              <ConsoleTable
                rows={reminders}
                rowKey={(r) => r.id}
                emptyTitle="No active deadline reminders"
                emptyDescription="Click 'Run reminder sweep' above to check upcoming or overdue deadlines."
                columns={[
                  {
                    key: 'title',
                    header: 'Reminder',
                    mobilePrimary: true,
                    render: (r) => (
                      <div>
                        <div className="font-medium text-strong">{r.title}</div>
                        <div className="text-ds-label text-muted">{r.detail}</div>
                      </div>
                    ),
                  },
                  {
                    key: 'bucket',
                    header: 'Window',
                    render: (r) => (
                      <InlineStatus
                        label={reminderBucketLabels[r.bucket]}
                        tone={r.bucket === 'overdue' ? 'danger' : r.bucket === 'due_today' ? 'warning' : 'info'}
                      />
                    ),
                  },
                  {
                    key: 'dueDate',
                    header: 'Due Date',
                    align: 'right',
                    render: (r) => <span className="font-mono text-ds-label">{r.dueDate}</span>,
                  },
                  {
                    key: 'actions',
                    header: 'Actions',
                    align: 'right',
                    render: (r) => (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => onSelectItem(r.workItemId)}
                          className="text-ds-label font-medium text-accent hover:underline"
                        >
                          Inspect
                        </button>
                        <button
                          type="button"
                          onClick={() => onDismissReminder(r.id)}
                          className="text-ds-label text-muted hover:text-strong"
                        >
                          Dismiss
                        </button>
                      </div>
                    ),
                  },
                ]}
              />
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <SectionCard
            title="Work sources"
            description={scope === 'admin' ? 'Platform-wide canonical projections' : 'Your brand projections'}
          >
            {sourceBreakdown.length === 0 ? (
              <p className="text-ds-label text-faint">No open work items right now.</p>
            ) : (
              <ul className="space-y-2 text-ds-label">
                {sourceBreakdown.map((s) => (
                  <li key={s.source} className="flex items-center justify-between gap-2">
                    <span className="text-secondary">{s.label}</span>
                    <span className="font-mono tabular-nums text-strong font-medium">{s.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Views">
            <div className="space-y-1.5 text-ds-label">
              <button
                type="button"
                onClick={() => onChangeTab('list')}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-ds-sm border border-hairline hover:bg-surface text-left"
              >
                <ListIcon className="w-3.5 h-3.5 text-faint" />
                Queue List ({openFiltered.length})
              </button>
              <button
                type="button"
                onClick={() => onChangeTab('board')}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-ds-sm border border-hairline hover:bg-surface text-left"
              >
                <Columns3 className="w-3.5 h-3.5 text-faint" />
                Status Board
              </button>
              <button
                type="button"
                onClick={() => onChangeTab('calendar')}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-ds-sm border border-hairline hover:bg-surface text-left"
              >
                <CalendarIcon className="w-3.5 h-3.5 text-faint" />
                Deadlines Calendar
              </button>
            </div>
          </SectionCard>
        </aside>
      </div>

      <SlideOverDrawer
        open={selectedItem !== null}
        onClose={() => {
          onSelectItem(null);
          setDrawerNote('');
        }}
        title={selectedItem?.title ?? 'Work item'}
        subtitle={
          selectedItem
            ? `${sourceLabels[selectedItem.source]} · ${selectedItem.entity.label} · ${dueLabelFn(selectedItem.dueDate)}`
            : undefined
        }
        testId="work-record-drawer"
        footer={
          selectedItem && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => onOpenOwningRecord(selectedItem)}
                className="px-3.5 py-1.5 rounded-ds-sm bg-accent text-on-dark text-ds-label font-medium hover:bg-accent-600"
              >
                {openLabel}
              </button>
              <div className="flex items-center gap-2">
                {canResolveCheck(selectedItem) && selectedItem.status !== 'done' && (
                  <button
                    type="button"
                    onClick={() => {
                      const res = onResolveManual(selectedItem.id, drawerNote);
                      setFeedback(res.ok ? 'Task resolved.' : res.error ?? 'Could not resolve');
                    }}
                    className="px-3 py-1.5 rounded-ds-sm border border-hairline-strong bg-surface-raised text-ds-label font-medium text-ink-900 hover:bg-surface"
                  >
                    Mark done
                  </button>
                )}
                {canResolveCheck(selectedItem) && selectedItem.status === 'done' && (
                  <button
                    type="button"
                    onClick={() => {
                      const res = onReopenManual(selectedItem.id, drawerNote);
                      setFeedback(res.ok ? 'Task reopened.' : res.error ?? 'Could not reopen');
                    }}
                    className="px-3 py-1.5 rounded-ds-sm border border-hairline-strong bg-surface-raised text-ds-label text-ink-800"
                  >
                    Reopen
                  </button>
                )}
              </div>
            </div>
          )
        }
      >
        {selectedItem && (
          <div className="space-y-4 text-ds-body">
            <div className="grid grid-cols-2 gap-3 text-ds-label border border-hairline rounded-ds-md p-3 bg-canvas-50">
              <div>
                <span className="text-faint block">Status</span>
                <InlineStatus label={statusLabels[selectedItem.status]} tone={STATUS_TONE[selectedItem.status]} />
              </div>
              <div>
                <span className="text-faint block">Priority</span>
                <InlineStatus label={priorityLabels[selectedItem.priority]} tone={PRIORITY_TONE[selectedItem.priority]} />
              </div>
              <div>
                <span className="text-faint block">Due date</span>
                <span className="font-mono text-strong">{selectedItem.dueDate ?? 'No deadline'}</span>
              </div>
              <div>
                <span className="text-faint block">Owner</span>
                <span className="font-mono text-strong">{selectedItem.owner}</span>
              </div>
            </div>

            <p className="text-secondary leading-relaxed">{selectedItem.detail}</p>

            {selectedItem.derived && (
              <NoticeBanner
                tone="warning"
                title="Record-qualified work item"
                message={`Derived from ${selectedItem.entity.type} (${selectedItem.entity.label}). Resolve the underlying record in its owning workspace to clear this item automatically.`}
              />
            )}

            {canResolveCheck(selectedItem) && (
              <div className="space-y-2 border-t border-hairline pt-3">
                <label className="block">
                  <span className="block text-ds-micro uppercase tracking-[0.06em] text-faint mb-1">
                    Progress note & status update
                  </span>
                  <input
                    type="text"
                    value={drawerNote}
                    onChange={(e) => setDrawerNote(e.target.value)}
                    placeholder="Optional audit note"
                    className="w-full px-3 py-1.5 rounded-ds-sm border border-hairline-strong text-ds-body"
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  {(['open', 'in_progress', 'blocked'] as WorkStatus[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => onSetStatus(selectedItem.id, st, drawerNote)}
                      className="px-2.5 py-1 rounded-ds-sm border border-hairline-strong bg-surface-raised text-ds-label hover:bg-surface"
                    >
                      Set {statusLabels[st]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-hairline pt-3">
              <h3 className="text-ds-label font-semibold uppercase tracking-[0.06em] text-faint mb-2">
                Activity trail
              </h3>
              <ul className="space-y-2 text-ds-label">
                {selectedItem.activity.map((a) => (
                  <li key={a.id} className="border-l-2 border-hairline pl-3">
                    <div className="font-medium text-strong">{a.action.replace(/_/g, ' ')}</div>
                    <div className="text-muted">{a.detail}</div>
                    <div className="text-ds-micro font-mono text-faint">
                      {a.actor} · {a.at}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </SlideOverDrawer>
    </div>
  );
}

function addIsoDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
