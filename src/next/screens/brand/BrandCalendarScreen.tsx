/**
 * §WAVE 3h (2026-11-25) — brand calendar (data).
 * The entries are DERIVED from the canonical work items by the work layer; this
 * screen only lays them out by month. No deadline is stored twice.
 */
import { useMemo, useState } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { useCanonicalStoreVersion } from '@/data/queries';
import {
  addMonths,
  buildMonthGrid,
  calendarEntriesForMonth,
  entriesByDate,
  monthKey,
  monthLabel,
  MONTH_LABELS,
  WEEKDAY_LABELS,
} from '@/lib/work/calendar';
import type { CalendarEntry } from '@/lib/work/types';
import { BrandCalendarView } from './BrandCalendarView';

export function BrandCalendarScreen() {
  const { session } = useApp();
  const canonicalVersion = useCanonicalStoreVersion();
  const [month, setMonth] = useState(() => monthKey(new Date().toISOString()));
  const [selected, setSelected] = useState<CalendarEntry | null>(null);

  const tenantId = session?.tier === 'brand' ? (session.tenantId ?? null) : null;

  const monthEntries = useMemo(
    /* `calendarEntriesForMonth(scope, tenantId, month)` derives from the same owner,
       so the month view and the grid can never disagree. */
    () => {
      /* §FRONTEND-REDESIGN BATCH 3 — `canonicalVersion` is the subscription that
         makes this recompute when the canonical store changes;
         `calendarEntriesForMonth` reads that store directly, so the value has to be
         referenced here for the dependency to be real rather than stale. */
      void canonicalVersion;
      return calendarEntriesForMonth('brand', tenantId, month);
    },
    [tenantId, month, canonicalVersion]
  );

  const grid = useMemo(() => buildMonthGrid(month), [month]);
  const byDay = useMemo(() => entriesByDate(monthEntries), [monthEntries]);
  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <BrandCalendarView
      month={month}
      monthLabelText={monthLabel(month)}
      weeks={grid.weeks}
      weekdayLabels={WEEKDAY_LABELS}
      todayIso={todayIso}
      entriesByDay={byDay}
      monthEntries={monthEntries.slice().sort((a, b) => a.date.localeCompare(b.date))}
      selected={selected}
      isLoading={false}
      isError={false}
      onRetry={() => undefined}
      onPreviousMonth={() => setMonth((current) => addMonths(current, -1))}
      onNextMonth={() => setMonth((current) => addMonths(current, 1))}
      onToday={() => setMonth(monthKey(new Date().toISOString()))}
      onSelect={setSelected}
    />
  );
}

/* Re-exported so a future surface can render the same month labels from one owner. */
export { MONTH_LABELS };