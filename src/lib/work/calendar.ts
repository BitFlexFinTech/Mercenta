/**
 * §Sprint — DERIVED OPERATIONAL CALENDAR.
 *
 * The calendar is NOT decorative state. Every entry is projected from a real
 * work item, which is itself projected from a real canonical record:
 *
 *   canonical record → work item → calendar entry
 *
 * That is what stops the calendar drifting from the workflows: resolving the
 * work item marks its calendar entry resolved, and the entry stops being an
 * attention item while remaining in the month as history.
 */
import type { CalendarEntry, WorkScope } from './types';
import { demoToday, daysBetween, getWorkItems } from './workStore';

/** Deterministic entry id — derived from the work item, never time/random. */
export function calendarEntryId(workItemId: string): string {
  return `cal-${workItemId}`;
}

/**
 * Every dated work item in scope, as a calendar entry. Undated items (e.g. a
 * carrier exception with no deadline) are intentionally absent — the calendar
 * shows deadlines, not a duplicate of the task list.
 */
export function deriveCalendarEntries(scope: WorkScope, tenantId?: string | null): CalendarEntry[] {
  return getWorkItems(scope, tenantId, { includeResolved: true })
    .filter((w) => w.dueDate !== null)
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
}

/** Entries in a single ISO month (`YYYY-MM`). */
export function calendarEntriesForMonth(
  scope: WorkScope,
  tenantId: string | null | undefined,
  month: string
): CalendarEntry[] {
  return deriveCalendarEntries(scope, tenantId).filter((e) => e.date.startsWith(month));
}

/* ── Month grid (pure) ─────────────────────────────────────────────────────── */

export interface MonthGrid {
  /** `YYYY-MM` of the grid. */
  month: string;
  /** Six weeks of ISO dates, Monday-first — a stable grid so the layout never
   *  reflows between months. */
  weeks: string[][];
  firstDay: string;
  lastDay: string;
}

export function monthKey(date: string): string {
  return date.slice(0, 7);
}

export function addMonths(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

/** Monday-first week index (0 = Monday). */
function mondayIndex(date: string): number {
  const dow = new Date(`${date}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  return (dow + 6) % 7;
}

function isoAdd(date: string, days: number): string {
  return new Date(new Date(`${date}T00:00:00Z`).getTime() + days * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

/**
 * Deterministic Monday-first six-week grid for a month. Pure function of the
 * month string — no locale, no timezone, no wall clock.
 */
export function buildMonthGrid(month: string): MonthGrid {
  const firstDay = `${month}-01`;
  const lastDay = isoAdd(addMonths(month, 1), -1);
  const start = isoAdd(firstDay, -mondayIndex(firstDay));
  const weeks: string[][] = [];
  for (let w = 0; w < 6; w += 1) {
    const week: string[] = [];
    for (let d = 0; d < 7; d += 1) week.push(isoAdd(start, w * 7 + d));
    weeks.push(week);
  }
  return { month, weeks, firstDay, lastDay };
}

/** Group entries by ISO date for O(1) cell lookup. */
export function entriesByDate(entries: CalendarEntry[]): Record<string, CalendarEntry[]> {
  const map: Record<string, CalendarEntry[]> = {};
  for (const e of entries) {
    (map[e.date] ??= []).push(e);
  }
  for (const k of Object.keys(map)) {
    map[k].sort((a, b) => a.title.localeCompare(b.title));
  }
  return map;
}

export const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return `${MONTH_LABELS[m - 1]} ${y}`;
}

export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Human relative-due text used by the task list and the calendar cells. */
export function dueLabel(dueDate: string | null): string {
  if (!dueDate) return 'No deadline';
  const d = daysBetween(demoToday(), dueDate);
  if (d === 0) return 'Due today';
  if (d === 1) return 'Due tomorrow';
  if (d > 1) return `Due in ${d} days`;
  if (d === -1) return 'Overdue by 1 day';
  return `Overdue by ${Math.abs(d)} days`;
}
