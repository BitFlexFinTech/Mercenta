/**
 * §Sprint 2 — DETERMINISTIC PROACTIVE REMINDER RUNNER.
 *
 * THE missing component from the previous sprint: the work layer already knew
 * which deadlines were overdue and already stopped reminding once an item was
 * resolved, but NOTHING executed the reminder step. This module is that runner.
 *
 * WHAT IT IS
 * ----------
 * A pure, explicitly-invoked sweep over the canonical work items. It escalates a
 * work item past a DECLARED deadline boundary into a `Reminder`, which is then:
 *
 *   canonical record → work item → REMINDER (event) → notification state
 *                    → calendar (the item is already dated) → action
 *                    → resolution (reminder disappears) → activity/audit
 *
 * WHY IT IS EXPLICIT AND NOT A TIMER
 * ----------------------------------
 * - NO `setInterval`/`setTimeout`: a background timer makes business state depend
 *   on when the tab happened to be open, which is neither deterministic nor
 *   testable. The investor demo invokes the runner directly and gets the same
 *   answer a future scheduler would.
 * - NO `Math.random()`, no `Date.now()`-derived ids, no wall-clock business
 *   values: `sweptAt` is the PINNED DEMO CLOCK date, ids are
 *   `rem-<workItemId>-<bucket>`, and the ordering is by (dueDate, id).
 * - IDEMPOTENT: every boundary carries the key `"<workItemId>|<bucket>"`. A key
 *   already raised is never raised again, so running the sweep N times with
 *   unchanged state raises the first time and reports the rest as suppressed.
 *
 * TENANT SCOPE
 * ------------
 * The sweep never filters work itself — it asks `getWorkItems(scope, tenantId)`,
 * the ONE tenant filter, so a brand sweep can only ever see that brand's work.
 *
 * SCHEDULER SEAM
 * --------------
 * `describeReminderSweep()` declares the cadence a real scheduler would use and
 * is the only thing a scheduler needs to read. Connecting a cron/edge function
 * later means calling `runReminderSweep` on that cadence — no code change here.
 */
import type { Reminder, ReminderBucket, ReminderSweepResult, WorkScope } from './types';
import {
  WORK_PRIORITY_LABELS,
  WORK_SOURCE_LABELS,
  demoToday,
  daysBetween,
  getWorkItems,
  getWorkItem,
  subscribeWork,
  workVersion,
} from './workStore';
import { demoAuditLog } from '@/data/demoStore';
import { emitEvent } from '@/lib/events/eventFeed';
import { notifyCanonicalStoreChange } from '@/lib/domain/canonicalSignal';

/** §Sprint 2 — declared boundary: how close a deadline must be to remind. */
export const REMINDER_DUE_SOON_DAYS = 3;

export const REMINDER_BUCKET_LABELS: Record<ReminderBucket, string> = {
  overdue: 'Overdue',
  due_today: 'Due today',
  due_soon: 'Due soon',
};

/* ── Store state (deterministic ledger — the ONLY mutable state) ───────────── */

/** Every boundary ever raised, keyed by `"<workItemId>|<bucket>"`. */
const raisedLedger = new Map<string, Reminder>();
/** Reminders an operator explicitly dismissed (deterministic keys). */
const dismissedKeys = new Set<string>();
let sweepCount = 0;
let reminderStamp = 0;
const listeners = new Set<() => void>();

export function reminderVersion(): number {
  return reminderStamp;
}

export function subscribeReminders(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyReminders(): void {
  reminderStamp += 1;
  for (const l of listeners) l();
}

/** How many sweeps have been executed this session (demo telemetry, not state). */
export function reminderSweepCount(): number {
  return sweepCount;
}

/* ── Deterministic derivation ──────────────────────────────────────────────── */

/** Deterministic reminder id — never time- or random-derived. */
export function reminderId(workItemId: string, bucket: ReminderBucket): string {
  return `rem-${workItemId}-${bucket}`.replace(/[^a-zA-Z0-9_-]/g, '-');
}

/**
 * The declared boundary a deadline has crossed, or `null` when the deadline is
 * still far enough away to need no reminder. Pure function of (dueDate, today).
 */
export function reminderBucketFor(dueDate: string | null, today: string): ReminderBucket | null {
  if (!dueDate) return null;
  if (dueDate < today) return 'overdue';
  if (dueDate === today) return 'due_today';
  const left = daysBetween(today, dueDate);
  return left >= 1 && left <= REMINDER_DUE_SOON_DAYS ? 'due_soon' : null;
}

function pushAudit(action: string, entityId: string, tenantId: string | null, reason: string, actor: string): void {
  demoAuditLog.push({
    id: `audit-reminder-${entityId}-${demoAuditLog.length}`,
    createdAt: new Date().toISOString(),
    actorId: actor,
    action,
    entityType: 'reminder',
    entityId,
    brandId: tenantId ?? undefined,
    reason,
  });
  notifyCanonicalStoreChange();
}

/* ── The runner ────────────────────────────────────────────────────────────── */

/**
 * Execute ONE deterministic reminder sweep.
 *
 * Idempotent: the second call with unchanged state raises nothing. Reminders for
 * items the operator has resolved are not raised at all (and an already-raised
 * reminder for an item that is later resolved disappears from the active set).
 */
export function runReminderSweep(
  scope: WorkScope = 'admin',
  tenantId?: string | null,
  actor = 'staff:reminder-runner'
): ReminderSweepResult {
  const sweptAt = demoToday();
  sweepCount += 1;

  /* Resolved work is included so the sweep can report what it suppressed, and so
     a resolution can never be re-reminded. */
  const rows = getWorkItems(scope, tenantId, { includeResolved: true });
  const raised: Reminder[] = [];
  let duplicatesSuppressed = 0;
  let suppressedResolved = 0;

  for (const item of rows) {
    const bucket = reminderBucketFor(item.dueDate, sweptAt);
    if (!bucket || !item.dueDate) continue;
    if (item.status === 'done') {
      suppressedResolved += 1;
      continue;
    }
    const key = `${item.id}|${bucket}`;
    if (raisedLedger.has(key) || dismissedKeys.has(key)) {
      duplicatesSuppressed += 1;
      continue;
    }
    const reminder: Reminder = {
      id: reminderId(item.id, bucket),
      workItemId: item.id,
      bucket,
      dueDate: item.dueDate,
      priority: item.priority,
      title: `${REMINDER_BUCKET_LABELS[bucket]}: ${item.title}`,
      detail: `${WORK_SOURCE_LABELS[item.source]} · ${WORK_PRIORITY_LABELS[item.priority]} · due ${item.dueDate} · ${item.detail}`,
      tenantId: item.tenantId,
      source: item.source,
      actionView: item.actionView,
      key,
      raisedAt: sweptAt,
      sequence: raised.length + 1,
    };
    raisedLedger.set(key, reminder);
    raised.push(reminder);
  }

  /* Canonical events + audit are emitted ONLY for reminders this sweep actually
     raised, so a repeat sweep is genuinely silent (no duplicate notifications). */
  for (const reminder of raised) {
    emitEvent({
      type: 'reminder_raised',
      severity: reminder.bucket === 'overdue' ? 'critical' : 'important',
      title: reminder.title,
      description: reminder.detail,
      entityId: reminder.tenantId ?? undefined,
      metadata: {
        reminderId: reminder.id,
        workItemId: reminder.workItemId,
        bucket: reminder.bucket,
        dueDate: reminder.dueDate,
        source: reminder.source,
        simulated: true,
      },
    });
    pushAudit(
      'reminder_raised',
      reminder.id,
      reminder.tenantId,
      `${REMINDER_BUCKET_LABELS[reminder.bucket]} — ${reminder.title} (work ${reminder.workItemId})`,
      actor
    );
  }

  if (raised.length > 0) notifyReminders();

  return {
    sweptAt,
    evaluated: rows.length,
    raised,
    duplicatesSuppressed,
    suppressedResolved,
    active: activeReminders(scope, tenantId).length,
  };
}

/* ── Active reminder set (derived — never disconnected state) ──────────────── */

function activeReminders(scope: WorkScope, tenantId?: string | null): Reminder[] {
  const today = demoToday();
  const rows = getWorkItems(scope, tenantId);
  const active: Reminder[] = [];
  for (const item of rows) {
    const bucket = reminderBucketFor(item.dueDate, today);
    if (!bucket || !item.dueDate) continue;
    const key = `${item.id}|${bucket}`;
    if (dismissedKeys.has(key)) continue;
    const reminder = raisedLedger.get(key);
    if (reminder) active.push(reminder);
  }
  return active.sort((a, b) =>
    a.dueDate === b.dueDate ? a.id.localeCompare(b.id) : a.dueDate.localeCompare(b.dueDate)
  );
}

/**
 * The reminders currently demanding attention. Derived from the live work set, so
 * resolving the underlying item removes its reminder in the same tick.
 */
export function getActiveReminders(scope: WorkScope = 'admin', tenantId?: string | null): Reminder[] {
  return activeReminders(scope, tenantId);
}

export function reminderCounts(
  scope: WorkScope = 'admin',
  tenantId?: string | null
): Record<ReminderBucket, number> {
  const rows = activeReminders(scope, tenantId);
  return {
    overdue: rows.filter((r) => r.bucket === 'overdue').length,
    due_today: rows.filter((r) => r.bucket === 'due_today').length,
    due_soon: rows.filter((r) => r.bucket === 'due_soon').length,
  };
}

/** Reminders that have been raised at all (the ledger, in sweep order). */
export function getAllReminders(): Reminder[] {
  return [...raisedLedger.values()];
}

/**
 * Dismiss ONE active reminder. Deterministic and audited; the boundary cannot be
 * re-raised (dismissal is a decision, not a snooze), while the underlying work
 * item remains visible in Work Management.
 */
export function dismissReminder(
  reminderIdValue: string,
  actor: string,
  reason = 'Dismissed by operator'
): Reminder | null {
  const found = [...raisedLedger.values()].find((r) => r.id === reminderIdValue);
  if (!found) return null;
  dismissedKeys.add(found.key);
  pushAudit('reminder_dismissed', found.id, found.tenantId, `${found.title} — ${reason}`, actor);
  notifyReminders();
  return found;
}

/* ── Scheduler seam ───────────────────────────────────────────────────────── */

/**
 * What a real scheduler needs to know. Nothing else in this module is
 * scheduler-specific, so connecting a cron/edge function later is a wiring change
 * and NOT a rewrite.
 */
export function describeReminderSweep(): {
  cadence: string;
  entryPoint: string;
  scopeArgument: string;
  idempotencyKey: string;
  deterministic: boolean;
  usesTimer: boolean;
  networkCalls: number;
} {
  return {
    cadence: 'daily (morning brief) + on-demand from Work Management',
    entryPoint: 'runReminderSweep(scope, tenantId, actor)',
    scopeArgument: "'admin' | 'brand' (+ tenantId for brand scope)",
    idempotencyKey: '"<workItemId>|<bucket>" — a boundary is raised at most once',
    deterministic: true,
    usesTimer: false,
    networkCalls: 0,
  };
}

/* ── Deterministic reset (investor demo) ───────────────────────────────────── */

export interface ReminderResetResult {
  ledgerCleared: number;
  dismissalsCleared: number;
  sweepsReset: number;
}

export function resetReminderStore(): ReminderResetResult {
  const result: ReminderResetResult = {
    ledgerCleared: raisedLedger.size,
    dismissalsCleared: dismissedKeys.size,
    sweepsReset: sweepCount,
  };
  raisedLedger.clear();
  dismissedKeys.clear();
  sweepCount = 0;
  notifyReminders();
  return result;
}

/* ── React binding support ────────────────────────────────────────────────── */

/**
 * Subscribes to BOTH stores: a work mutation (resolve/reopen/create) and a
 * reminder mutation both change the active reminder set, so the view can never
 * show a reminder for work that no longer exists.
 */
export function subscribeRemindersAndWork(listener: () => void): () => void {
  const a = subscribeReminders(listener);
  const b = subscribeWork(listener);
  return () => {
    a();
    b();
  };
}

export function reminderAndWorkVersion(): string {
  return `${reminderVersion()}:${workVersion()}`;
}

/** The work item a reminder escalates (never disconnected state). */
export function reminderWorkItem(reminder: Reminder) {
  return getWorkItem(reminder.workItemId);
}

