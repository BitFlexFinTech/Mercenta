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
import {
  getActiveReminders,
  reminderAndWorkVersion,
  subscribeRemindersAndWork,
} from './reminderRunner';
import type { CalendarEntry, Reminder, WorkItem, WorkScope } from './types';

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

/**
 * §Founder OS — the work-store mutation stamp.
 *
 * A surface that derives its OWN model from the canonical stores (the Control
 * Centre) needs to re-derive when work changes, but does not itself render work
 * items. This hook exposes exactly that, from the same store and the same
 * subscription the work surfaces use — so there is still one source of truth.
 */
export function useWorkVersion(): number {
  return useSyncExternalStore(subscribeWork, workVersion, workVersion);
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

/**
 * §Sprint 2 — the ACTIVE reminder set for the current scope. Subscribes to both
 * the work store and the reminder ledger, so resolving the underlying work item
 * removes its reminder without any further call.
 */
export function useReminders(scope: WorkScope, tenantId?: string | null): Reminder[] {
  const version = useSyncExternalStore(
    subscribeRemindersAndWork,
    reminderAndWorkVersion,
    reminderAndWorkVersion
  );
  void version;
  return getActiveReminders(scope, tenantId);
}
