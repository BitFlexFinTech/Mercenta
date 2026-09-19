/**
 * §Sprint — React bindings for the canonical work layer.
 *
 * The store is external and deterministic; components subscribe to its version
 * so a resolution anywhere (task list, kanban, calendar, notification centre)
 * re-renders every other view of the same work. Tenant scoping happens INSIDE
 * `getWorkItems`, so a brand hook can never return another tenant's work.
 */
import { useSyncExternalStore } from 'react';
import { getWorkItems, workVersion, subscribeWork } from './workStore';
import { deriveCalendarEntries, calendarEntriesForMonth } from './calendar';
import type { CalendarEntry, WorkItem, WorkScope } from './types';

export function useWorkItems(
  scope: WorkScope,
  tenantId?: string | null,
  opts?: { includeResolved?: boolean }
): WorkItem[] {
  const version = useSyncExternalStore(subscribeWork, workVersion, workVersion);
  // `version` participates so the subscription result is recomputed on mutation.
  void version;
  return getWorkItems(scope, tenantId, opts);
}

export function useCalendarEntries(scope: WorkScope, tenantId?: string | null): CalendarEntry[] {
  const version = useSyncExternalStore(subscribeWork, workVersion, workVersion);
  void version;
  return deriveCalendarEntries(scope, tenantId);
}

export function useCalendarMonth(
  scope: WorkScope,
  tenantId: string | null | undefined,
  month: string
): CalendarEntry[] {
  const version = useSyncExternalStore(subscribeWork, workVersion, workVersion);
  void version;
  return calendarEntriesForMonth(scope, tenantId, month);
}
