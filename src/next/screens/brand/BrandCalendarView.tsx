/**
 * §WAVE 3h (2026-11-25) — BRAND calendar (presentation).
 *
 * The deadline calendar the work layer already derives: a stable six-week grid and
 * the entries that fall on each day. It shows what the canonical work items say —
 * it does not hold a second copy of any deadline.
 */
import {
  ConsoleHeader,
  EmptyStateBlock,
  ErrorStateBlock,
  InlineStatus,
  LoadingRows,
  SlideOverDrawer,
} from '@/next/components/ConsolePrimitives';
import { SectionCard } from '@/next/components/ConsoleCharts';
import type { CalendarEntry } from '@/lib/work/types';

export interface BrandCalendarViewProps {
  month: string;
  monthLabelText: string;
  weeks: string[][];
  weekdayLabels: readonly string[];
  todayIso: string;
  entriesByDay: Record<string, CalendarEntry[]>;
  monthEntries: CalendarEntry[];
  selected: CalendarEntry | null;
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  onRetry: () => void;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  onSelect: (entry: CalendarEntry | null) => void;
}

const PRIORITY_TONES: Record<string, 'neutral' | 'warning' | 'danger'> = {
  low: 'neutral',
  medium: 'neutral',
  high: 'warning',
  urgent: 'danger',
};

export function BrandCalendarView({
  month,
  monthLabelText,
  weeks,
  weekdayLabels,
  todayIso,
  entriesByDay,
  monthEntries,
  selected,
  isLoading,
  isError,
  errorMessage,
  onRetry,
  onPreviousMonth,
  onNextMonth,
  onToday,
  onSelect,
}: BrandCalendarViewProps) {
  return (
    <div>
      <ConsoleHeader
        eyebrow="Mercenta · Partner Portal"
        title="Calendar"
        description="Every deadline your work layer derives, laid out by the day it falls on."
        meta={<span className="tabular-nums">{monthEntries.length} entries this month</span>}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onPreviousMonth}
              aria-label="Previous month"
              className="px-2.5 py-1.5 text-ds-label font-medium rounded-ds-md border border-hairline-strong bg-surface-raised text-ink-800 hover:bg-surface"
            >
              ←
            </button>
            <button
              type="button"
              onClick={onToday}
              className="px-3 py-1.5 text-ds-label font-medium rounded-ds-md border border-hairline-strong bg-surface-raised text-ink-800 hover:bg-surface"
            >
              This month
            </button>
            <button
              type="button"
              onClick={onNextMonth}
              aria-label="Next month"
              className="px-2.5 py-1.5 text-ds-label font-medium rounded-ds-md border border-hairline-strong bg-surface-raised text-ink-800 hover:bg-surface"
            >
              →
            </button>
          </div>
        }
      />

      {isError ? (
        <ErrorStateBlock
          title="The calendar could not be derived"
          message={errorMessage}
          onRetry={onRetry}
        />
      ) : isLoading ? (
        <LoadingRows rows={6} />
      ) : (
<div className="space-y-6">
          <SectionCard
            title={monthLabelText}
            description="Monday-first, six weeks — the grid never reflows between months."
          >
            <div className="grid grid-cols-7 gap-px bg-tint-strong border border-hairline rounded-ds-md overflow-hidden">
              {weekdayLabels.map((label) => (
                <div
                  key={label}
                  className="bg-surface px-2 py-1.5 text-ds-micro font-medium uppercase tracking-[0.06em] text-faint"
                >
                  {label.slice(0, 3)}
                </div>
              ))}
              {weeks.flat().map((date) => {
                const dayEntries = entriesByDay[date] ?? [];
                const isToday = date === todayIso;
                const inMonth = date.slice(0, 7) === month;
                return (
                  <div
                    key={date}
                    className={`bg-surface-raised min-h-24 px-2 py-1.5 ${inMonth ? '' : 'opacity-50'}`}
                  >
                    <div
                      className={`text-ds-label tabular-nums mb-1 ${
                        isToday ? 'font-semibold text-strong' : 'text-faint'
                      }`}
                    >
                      {Number(date.slice(8, 10))}
                    </div>
                    <ul className="space-y-0.5">
                      {dayEntries.map((entry) => (
                        <li key={entry.id}>
                          <button
                            type="button"
                            onClick={() => onSelect(entry)}
                            className={`w-full text-left text-ds-label truncate rounded-ds-sm px-1 py-0.5 hover:bg-tint ${
                              entry.resolved ? 'text-quiet line-through' : 'text-ink-800'
                            }`}
                          >
                            {entry.title}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          <SectionCard title="Entries this month" description="Select one to see what it links to.">
            {monthEntries.length === 0 ? (
              <EmptyStateBlock
                title="Nothing falls in this month"
                description="No work deadline is due in the month shown. Move to another month, or add a task in the work workspace."
              />
            ) : (
              <ul className="divide-y divide-hairline-06">
                {monthEntries.map((entry) => (
                  <li key={entry.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(entry)}
                      className="w-full flex items-center justify-between gap-3 py-2.5 px-1 text-left hover:bg-surface rounded-ds-sm"
                    >
                      <span className="min-w-0">
                        <span className="block text-ds-body text-strong truncate">
                          {entry.title}
                        </span>
                        <span className="block text-ds-label text-faint">
                          {entry.date} · {entry.kind.replace(/_/g, ' ')}
                        </span>
                      </span>
                      <InlineStatus
                        label={entry.resolved ? 'Done' : entry.priority}
                        tone={
                          entry.resolved ? 'success' : (PRIORITY_TONES[entry.priority] ?? 'neutral')
                        }
                        dataStatus={entry.resolved ? 'done' : entry.priority}
                      />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      )}
<SlideOverDrawer
        open={Boolean(selected)}
        onClose={() => onSelect(null)}
        title={selected ? selected.title : ''}
        subtitle={selected ? `${selected.date} · ${selected.kind.replace(/_/g, ' ')}` : undefined}
        testId="brand-calendar-drawer"
      >
        {selected && (
          <dl className="grid grid-cols-2 gap-3 text-ds-body">
            <div>
              <dt className="text-ds-label text-faint">Priority</dt>
              <dd className="font-medium text-strong">{selected.priority}</dd>
            </div>
            <div>
              <dt className="text-ds-label text-faint">State</dt>
              <dd className="font-medium text-strong">
                {selected.resolved ? 'Resolved' : 'Open'}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-ds-label text-faint">Links to</dt>
              <dd className="font-medium text-strong">
                {selected.entity.label} ({selected.entity.type})
              </dd>
            </div>
          </dl>
        )}
      </SlideOverDrawer>
    </div>
  );
}