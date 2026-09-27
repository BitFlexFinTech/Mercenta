/**
 * §Sprint — CANONICAL WORK / TASK + CALENDAR LAYER validation.
 *
 * Proves, against the REAL modules (no mocks):
 *  1. Derivation is DETERMINISTIC — same state ⇒ same ids, deadlines, priorities.
 *  2. No `Math.random()` / wall-clock ids in the work layer source.
 *  3. Tenant isolation — a brand scope only ever returns its own tenant's work.
 *  4. Reminders stop: resolving an item removes it from the attention set AND
 *     from the notification projection; reopening restores it.
 *  5. Every mutation is attributed + audited + emits a canonical platform event.
 *  6. Calendar entries derive from work items (never disconnected state) and the
 *     month grid is a pure function of the month string.
 *  7. Reset restores the deterministic baseline.
 */
import { createServer } from 'vite';
import { readFileSync } from 'node:fs';

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });

let failures = 0;
function test(name, cond, extra) {
  console.log(`${cond ? '✓' : '✗'} ${name}${cond || !extra ? '' : ` — ${extra}`}`);
  if (!cond) failures++;
}

const work = await server.ssrLoadModule('/src/lib/work/workStore.ts');
const cal = await server.ssrLoadModule('/src/lib/work/calendar.ts');
const feed = await server.ssrLoadModule('/src/lib/events/eventFeed.ts');
const store = await server.ssrLoadModule('/src/data/demoStore.ts');
/** §SSOT — the resolved-milestone rule the consignment closing path obeys. */
const types = await server.ssrLoadModule('/src/types.ts');
/** §P7 — the CANONICAL owner of the invoice terms + the derived due date. */
const invoiceTerms = await server.ssrLoadModule('/src/lib/commerce/invoiceTerms.ts');

/* ── 1. Source hygiene: no nondeterminism in the work layer ────────────────── */
for (const f of [
  'src/lib/work/workStore.ts',
  'src/lib/work/calendar.ts',
  'src/lib/work/types.ts',
  'src/lib/work/reminderRunner.ts',
]) {
  const src = readFileSync(f, 'utf8')
    .split('\n')
    .filter((l) => !/^\s*(\*|\/\/|\/\*)/.test(l))
    .join('\n');
  test(`${f} contains no Math.random()`, !/Math\.random\(/.test(src));
}
test(
  'work ids are not derived from Date.now()',
  !/work-[^\n]*\$\{Date\.now/.test(readFileSync('src/lib/work/workStore.ts', 'utf8'))
);

/* ── 2. Determinism of derivation ─────────────────────────────────────────── */
/**
 * §P13 / S3 — NOTE. This pins the work layer's DATE clock (the overdue / due-soon
 * buckets). The PO acknowledgement window is an INSTANT-resolution rule and is
 * judged against the real clock — the same default instant `src/data/api.ts`
 * enforces it with — so acknowledgement items below reflect the live 24-hour
 * window exactly as the app does. Do not "fix" that by pointing the window at
 * this pinned date: the queue would then advertise work the writer REFUSES.
 * `deriveWorkItems(now)` is the seam; `scripts/validate-po-acknowledgement-work.mjs`
 * asserts both directions.
 */
work.setDemoClock('2026-09-19');
const first = work.deriveWorkItems();
const second = work.deriveWorkItems();
test('derivation returns the same number of items', first.length === second.length);
test(
  'derivation returns identical ids in identical order',
  first.map((w) => w.id).join('|') === second.map((w) => w.id).join('|')
);
test(
  'derivation returns identical deadlines and priorities',
  JSON.stringify(first.map((w) => [w.id, w.dueDate, w.priority])) ===
    JSON.stringify(second.map((w) => [w.id, w.dueDate, w.priority]))
);
test('derivation produced real work from canonical records', first.length > 0, `count=${first.length}`);
test(
  'every derived id matches the deterministic pattern',
  first.every((w) => /^work-[a-z_]+-/.test(w.id))
);
test(
  'every derived item points at a canonical entity',
  first.every((w) => w.entity.type !== 'none' && w.entity.id.length > 0)
);

const ackItems = first.filter((w) => w.source === 'po_acknowledgement');
test('PO acknowledgement work exists', ackItems.length > 0, `count=${ackItems.length}`);
test(
  'PO acknowledgement items are critical and dated',
  ackItems.every((w) => w.priority === 'critical' && w.dueDate !== null)
);

/* ── 3. Tenant isolation ──────────────────────────────────────────────────── */
const tenantA = first.find((w) => w.tenantId)?.tenantId;
const brandItems = work.getWorkItems('brand', tenantA);
test('brand scope returns items', brandItems.length > 0, `count=${brandItems.length}`);
test(
  'brand scope NEVER returns another tenant’s work',
  brandItems.every((w) => w.tenantId === tenantA)
);
const adminItems = work.getWorkItems('admin');
test(
  'admin scope spans more than one tenant',
  new Set(adminItems.map((w) => w.tenantId)).size > 1
);
test('brand scope is a strict subset of admin scope', brandItems.length < adminItems.length);

/* ── 4. §SSOT S2 — DERIVED WORK IS CLOSED BY ITS RECORD, NEVER BY A TICKED TASK ─
 *
 * OLD CONTRACT (recorded here, NOT weakened): this section resolved a DERIVED
 * item from the work layer and asserted it became `done`, left the attention set
 * and emitted `work_item_resolved`. That capability WAS the defect — it let one
 * fact (the canonical record) have two sources of truth (the record and the task).
 *
 * The same invariants are now asserted against their CURRENT canonical owner:
 *   (a) a derived item REFUSES resolution, the refusal NAMES the owning action and
 *       its writer, nothing changes, and the attempt is audited;
 *   (b) an operator mark on a derived item is an ANNOTATION that can never be
 *       `done` and never removes the item from the attention set;
 *   (c) a MANUAL task (no record — this store IS its single source of truth) still
 *       resolves here, leaves the attention set, emits the event and is audited.
 *   (d) the record's OWN closing path is driven for real in section 17 below.
 * ──────────────────────────────────────────────────────────────────────────── */
const target = brandItems[0];
const beforeCount = work.getWorkItems('brand', tenantA).length;
feed.resetEvents();
test(
  'the target of the old resolution assertion is genuinely DERIVED (so the refusal below is the real case)',
  target.derived === true,
  target.source
);
test('the work layer declares it cannot resolve a record-qualified item', work.canResolveFromWorkLayer(target) === false);
test(
  'the row still appears after a refusal (the record still qualifies)',
  (() => {
    try {
      work.resolveWorkItem(target.id, 'test:operator', 'Validator: attempt to tick a record-qualified item');
      return false; // no refusal — the defect would be back
    } catch (e) {
      return (
        e.name === 'DERIVED_RESOLUTION_REFUSED' &&
        work.getWorkItems('brand', tenantA).length === beforeCount &&
        work.getWorkItems('brand', tenantA).some((w) => w.id === target.id)
      );
    }
  })()
);
test(
  'the refusal NAMES the owning action, the writer and the owner of the record',
  (() => {
    try {
      work.resolveWorkItem(target.id, 'test:operator', 'Validator: named refusal');
      return false;
    } catch (e) {
      const closing = work.WORK_SOURCE_CLOSING[target.source];
      return (
        String(e.message).includes(closing.via) &&
        closing.writer !== null &&
        String(e.message).includes(closing.writer) &&
        String(e.message).includes(closing.owner)
      );
    }
  })()
);
test(
  'the refusal is ATTRIBUTED and AUDITED (hiding record-qualified work is a business event, not a no-op)',
  store.demoAuditLog.some(
    (a) => a.action === 'work_item_resolution_refused' && a.actorId === 'test:operator' && a.entityId === target.id
  )
);
test(
  'a refusal emits NO work_item_resolved event (nothing half-happened)',
  feed.queryEvents({ type: 'work_item_resolved' }).length === 0
);

/* (b) The operator mark is an annotation, and it can never resolve anything. */
const annotated = work.setWorkItemStatus(target.id, 'in_progress', 'test:operator');
test(
  'an operator mark is observable in the kanban grouping without resolving the item',
  work.workByStatus('brand', tenantA).in_progress.some((w) => w.id === target.id) &&
    work.getWorkItems('brand', tenantA).some((w) => w.id === target.id)
);
test(
  'the mark is exposed as an ANNOTATION on the item',
  annotated !== null && annotated.annotation?.status === 'in_progress' && annotated.derived === true
);
test(
  'asking a derived item to be `done` is REFUSED even through setWorkItemStatus',
  (() => {
    try {
      work.setWorkItemStatus(target.id, 'done', 'test:operator');
      return false;
    } catch (e) {
      return e.name === 'DERIVED_RESOLUTION_REFUSED';
    }
  })()
);
test(
  'clearing the mark leaves the item open and present (annotations can never hide work)',
  work.setWorkItemStatus(target.id, 'open', 'test:operator')?.status === 'open' &&
    work.getWorkItems('brand', tenantA).length === beforeCount &&
    work.getWorkItems('brand', tenantA).some((w) => w.id === target.id)
);
test(
  'NO derived item anywhere in the store is ever `done`',
  work
    .getWorkItems('admin', null, { includeResolved: true })
    .filter((w) => w.derived)
    .every((w) => w.status !== 'done')
);

/* ── 5. Manual task creation ──────────────────────────────────────────────── */
feed.resetEvents();
const created = work.createWorkItem(
  {
    title: 'Validator manual task',
    detail: 'created by the validator',
    priority: 'high',
    dueDate: '2026-09-25',
    tenantId: tenantA,
  },
  'test:operator'
);
test('manual task id follows the deterministic pattern', /^work-manual-\d{4}$/.test(created.id));
test(
  'manual task appears in brand scope for its own tenant',
  work.getWorkItems('brand', tenantA).some((w) => w.id === created.id)
);
test(
  'manual task is NOT visible to another tenant',
  !work.getWorkItems('brand', 'brand-not-a-tenant').some((w) => w.id === created.id)
);
test('manual creation emits work_item_raised', feed.queryEvents({ type: 'work_item_raised' }).length === 1);
test(
  'manual creation is audited',
  store.demoAuditLog.some((a) => a.action === 'work_item_created' && a.entityId === created.id)
);

/* §SSOT S2 (c) — A MANUAL TASK IS THE ONE THING THE WORK LAYER ITSELF CLOSES.
 * Recorded move: these four assertions used to run against a DERIVED item (the
 * false-resolution defect). They now run against the manual task, which has no
 * canonical record, so this store legitimately owns its lifecycle. */
feed.resetEvents();
const resolvedManual = work.resolveWorkItem(created.id, 'test:operator', 'Validated in the validator');
test('a MANUAL task resolves to done in the work layer', resolvedManual !== null && resolvedManual.status === 'done');
test(
  '…leaves the attention set',
  !work.getWorkItems('brand', tenantA).some((w) => w.id === created.id)
);
test(
  '…remains visible as history when asked for',
  work.getWorkItems('brand', tenantA, { includeResolved: true }).some((w) => w.id === created.id)
);
test(
  '…emits the canonical work_item_resolved event exactly once',
  feed.queryEvents({ type: 'work_item_resolved' }).length === 1
);
test(
  '…is attributed in the audit log',
  store.demoAuditLog.some(
    (a) => a.action === 'work_item_resolved' && a.actorId === 'test:operator' && a.entityId === created.id
  )
);
test(
  '…is recorded on the item’s own activity trail',
  resolvedManual.activity.some((a) => a.action === 'resolved' && a.actor === 'test:operator')
);
const reopenedManual = work.reopenWorkItem(created.id, 'test:operator', 'Reopened in the validator');
test('reopening a manual task restores it to the attention set', reopenedManual?.status === 'open');

/* ── 6. Calendar is derived, not decorative ───────────────────────────────── */
const entries = cal.deriveCalendarEntries('brand', tenantA);
test('calendar entries derive from work items', entries.length > 0, `count=${entries.length}`);
test(
  'every calendar entry references a real work item',
  entries.every((e) => work.getWorkItem(e.workItemId) !== null)
);
test(
  'every calendar entry id is derived from its work item id',
  entries.every((e) => e.id === `cal-${e.workItemId}`)
);
test(
  'undated work items are absent from the calendar',
  work
    .getWorkItems('brand', tenantA)
    .filter((w) => w.dueDate === null)
    .every((w) => !entries.some((e) => e.workItemId === w.id))
);
test(
  'resolved items remain in the calendar as history',
  cal.deriveCalendarEntries('brand', tenantA).some((e) => e.workItemId === created.id)
);

const grid = cal.buildMonthGrid('2026-09');
test(
  'month grid is six Monday-first weeks',
  grid.weeks.length === 6 && grid.weeks.every((w) => w.length === 7)
);
test(
  'month grid is a pure function of the month string',
  JSON.stringify(cal.buildMonthGrid('2026-09')) === JSON.stringify(grid)
);
test('month grid first day is the 1st of the month', grid.firstDay === '2026-09-01');
test('month grid last day is the end of the month', grid.lastDay === '2026-09-30');
test(
  'month arithmetic is deterministic',
  cal.addMonths('2026-12', 1) === '2027-01' && cal.addMonths('2026-01', -1) === '2025-12'
);
test(
  'the month grid always starts on a Monday',
  new Date(`${grid.weeks[0][0]}T00:00:00Z`).getUTCDay() === 1
);

/* ── 7. Reset restores the deterministic baseline ─────────────────────────── */
const baseline = work.deriveWorkItems().length;
const reset = work.resetWorkStore();
test('reset reports what it cleared', reset.manualItemsCleared >= 1 && reset.clockUnpinned === true);
work.setDemoClock('2026-09-19');
test('after reset the derived set is back to baseline', work.deriveWorkItems().length === baseline);
test(
  'after reset no manual task remains',
  !work.getWorkItems('admin').some((w) => w.source === 'manual')
);
test(
  'after reset the previously resolved item is open again',
  work.getWorkItems('brand', tenantA).some((w) => w.id === target.id)
);

/* ── 8. Overdue derivation is clock-driven and deterministic ──────────────── */
work.setDemoClock('2026-09-19');
const overdueAt = work.overdueWorkItems('admin').length;
work.setDemoClock('2027-06-01');
const overdueLater = work.overdueWorkItems('admin').length;
test('overdue set responds to the pinned clock', overdueLater > overdueAt, `${overdueAt} → ${overdueLater}`);
work.resetWorkStore();

/* ══════════════════════════════════════════════════════════════════════════
   §Sprint 2 — DETERMINISTIC PROACTIVE REMINDER RUNNER + the two missing
   derivation paths (invoice_due, onboarding_step).
   ══════════════════════════════════════════════════════════════════════════ */

const runner = await server.ssrLoadModule('/src/lib/work/reminderRunner.ts');
const acq = await server.ssrLoadModule('/src/data/acquisitionStore.ts');

/* ── 9. The runner uses no timer and no scheduler-owned nondeterminism ────── */
const runnerSrc = readFileSync('src/lib/work/reminderRunner.ts', 'utf8')
  .split('\n')
  .filter((l) => !/^\s*(\*|\/\/|\/\*)/.test(l))
  .join('\n');
test('runner contains no setInterval/setTimeout', !/set(Interval|Timeout)\s*\(/.test(runnerSrc));
test('runner contains no Math.random()', !/Math\.random\(/.test(runnerSrc));
test(
  'runner derives no id from Date.now()',
  !/rem-[^\n]*\$\{Date\.now/.test(readFileSync('src/lib/work/reminderRunner.ts', 'utf8'))
);
const contract = runner.describeReminderSweep();
test('the runner declares zero network calls', contract.networkCalls === 0);
test('the runner declares that it uses no timer', contract.usesTimer === false);
test('the runner declares itself deterministic', contract.deterministic === true);
test(
  'the runner is exposed as an explicit entry point',
  typeof runner.runReminderSweep === 'function' &&
    runner.describeReminderSweep().entryPoint.startsWith('runReminderSweep(')
);

/* ── 10. The sweep is idempotent and deterministic ────────────────────────── */
work.resetWorkStore();
runner.resetReminderStore();
work.setDemoClock('2026-09-19');
feed.resetEvents();

const sweep1 = runner.runReminderSweep('admin', null, 'test:runner');
test('the first sweep raises reminders', sweep1.raised.length > 0, `raised=${sweep1.raised.length}`);
test('every raised reminder id is deterministic', sweep1.raised.every((r) => /^rem-work-/.test(r.id)));
test(
  'every raised reminder points at a real work item',
  sweep1.raised.every((r) => work.getWorkItem(r.workItemId) !== null)
);
test(
  'every raised reminder carries an idempotency key',
  sweep1.raised.every((r) => r.key === `${r.workItemId}|${r.bucket}`)
);
test('the sweep reports the active reminder count', sweep1.active === runner.getActiveReminders('admin').length);

const sweep2 = runner.runReminderSweep('admin', null, 'test:runner');
test('the SECOND sweep raises nothing (idempotent)', sweep2.raised.length === 0, `raised=${sweep2.raised.length}`);
test(
  'the second sweep reports the first sweep’s boundaries as suppressed',
  sweep2.duplicatesSuppressed === sweep1.raised.length,
  `${sweep2.duplicatesSuppressed} vs ${sweep1.raised.length}`
);
test('the active reminder set is unchanged by the repeat sweep', sweep2.active === sweep1.active);
test(
  'exactly one reminder_raised event was emitted per raised reminder',
  feed.queryEvents({ type: 'reminder_raised' }).length === sweep1.raised.length,
  `${feed.queryEvents({ type: 'reminder_raised' }).length} vs ${sweep1.raised.length}`
);
test(
  'the raise is audited',
  store.demoAuditLog.some((a) => a.action === 'reminder_raised' && a.entityType === 'reminder')
);

/* ── 11. §SSOT S2 — REMINDERS FOLLOW THE RECORD, NOT A TICKED TASK ───────────
 *
 * OLD CONTRACT (recorded, NOT weakened): this section resolved the DERIVED item
 * behind `sweep1.raised[0]` and asserted its reminder vanished. That resolution is
 * now REFUSED, so the same invariants are asserted against the owner that can
 * actually close each case:
 *   (a) a reminder for a RECORD-QUALIFIED item cannot be removed by the work layer
 *       at all — the attempt is refused and the reminder is UNCHANGED;
 *   (b) a MANUAL task — which the work layer does own — removes its reminder when
 *       resolved, restores it when reopened, and is never re-reminded afterwards.
 * ──────────────────────────────────────────────────────────────────────────── */
const derivedReminder = sweep1.raised.find((r) => work.getWorkItem(r.workItemId)?.derived === true);
const derivedReminderActive = runner.getActiveReminders('admin').some((r) => r.id === derivedReminder?.id);
let derivedReminderRefused = false;
try {
  work.resolveWorkItem(derivedReminder.workItemId, 'test:operator', 'Validator: tick a record-qualified item');
} catch (e) {
  derivedReminderRefused = e.name === 'DERIVED_RESOLUTION_REFUSED';
}
test(
  'a record-qualified reminder survives a refused task resolution (nothing half-happened)',
  derivedReminderRefused && derivedReminderActive && runner.getActiveReminders('admin').some((r) => r.id === derivedReminder.id)
);

const reminderManual = work.createWorkItem(
  { title: 'Validator reminder task', detail: 'reminder-stop check', priority: 'high', dueDate: '2026-09-01', tenantId: tenantA },
  'test:operator'
);
runner.runReminderSweep('admin', null, 'test:runner');
test(
  'a manual task past its deadline is raised as a reminder',
  runner.getActiveReminders('admin').some((r) => r.workItemId === reminderManual.id)
);
const activeBefore = runner.getActiveReminders('admin').length;
work.resolveWorkItem(reminderManual.id, 'test:operator', 'Reminder resolution check');
test(
  'resolving the MANUAL work item removes its reminder',
  !runner.getActiveReminders('admin').some((r) => r.workItemId === reminderManual.id)
);
test(
  'the active reminder count falls by one',
  runner.getActiveReminders('admin').length === activeBefore - 1
);
work.reopenWorkItem(reminderManual.id, 'test:operator', 'Reopen check');
test(
  'reopening the work item restores its reminder (state respected)',
  runner.getActiveReminders('admin').some((r) => r.workItemId === reminderManual.id)
);
work.resolveWorkItem(reminderManual.id, 'test:operator', 'Re-resolve');
runner.runReminderSweep('admin', null, 'test:runner');
test(
  'a resolved item is never re-reminded by a later sweep',
  !runner.getActiveReminders('admin').some((r) => r.workItemId === reminderManual.id)
);
work.reopenWorkItem(reminderManual.id, 'test:operator', 'Restore baseline');

/* ── 12. Tenant scope is respected by the runner ─────────────────────────── */
const brandReminders = runner.getActiveReminders('brand', tenantA);
const adminReminders = runner.getActiveReminders('admin');
const adminReminderIds = new Set(adminReminders.map((r) => r.id));
test('brand reminder scope returns only that tenant’s reminders', brandReminders.every((r) => r.tenantId === tenantA));
/**
 * §S9 — REPOINTED (the old contract recorded):
 *
 *   test('brand reminder scope is a subset of the admin reminder set',
 *     brandReminders.length < runner.getActiveReminders('admin').length);
 *
 * The TITLE states the invariant (a brand's reminders are a SUBSET of the
 * admin's), but the assertion compared COUNTS — a weaker proxy that fails the
 * moment the brand's own tenant legitimately accounts for most of the admin set
 * (this failed on `7365e8f`, the §S8 checkpoint, and was never in the `validate:*`
 * npm sweep, so no session had run it). The invariant is now asserted as what it
 * is: every brand reminder IS in the admin set, and the brand scope is genuinely
 * non-empty (so the subset check cannot pass vacuously).
 */
test(
  'brand reminder scope is a subset of the admin reminder set',
  brandReminders.length > 0 && brandReminders.every((r) => adminReminderIds.has(r.id)),
  `brand=${brandReminders.length} admin=${adminReminders.length}`
);

/* ── 13. Dismissal is an audited decision, not a snooze ──────────────────── */
const dismissTarget = runner.getActiveReminders('admin')[0];
const dismissed = runner.dismissReminder(dismissTarget.id, 'test:operator', 'Validator dismissal');
test('dismissing returns the reminder', dismissed !== null && dismissed.id === dismissTarget.id);
test(
  'a dismissed reminder leaves the active set',
  !runner.getActiveReminders('admin').some((r) => r.id === dismissTarget.id)
);
runner.runReminderSweep('admin', null, 'test:runner');
test(
  'a dismissed reminder is not re-raised by a later sweep',
  !runner.getActiveReminders('admin').some((r) => r.id === dismissTarget.id)
);
test(
  'dismissal is audited',
  store.demoAuditLog.some((a) => a.action === 'reminder_dismissed' && a.entityId === dismissTarget.id)
);


/* ── 14. invoice_due derivation from the canonical invoice/payment pair ──── */
work.resetWorkStore();
runner.resetReminderStore();
work.setDemoClock('2026-09-19');
const invoiceBrand = tenantA;
const invoice = {
  id: `cinv-${invoiceBrand}-TEST-PO-1`,
  brandId: invoiceBrand,
  purchaseOrderId: 'test-po-invoice',
  poNumber: 'TEST-PO-1',
  number: 'SIM-INV-TEST-PO-1',
  lines: [{ description: 'validator line', amountGbp: 1000 }],
  subtotalGbp: 1000,
  status: 'issued',
  /** §P7 — the invoice carries its own terms; the due date derives from THESE. */
  termDays: 30,
  currency: 'GBP',
  mode: 'simulation',
  simulated: true,
  issuedAt: '2026-09-01T00:00:00.000Z',
};
store.recordCommerceInvoice(invoice);
const invoiceWork = work.deriveWorkItems().filter((w) => w.source === 'invoice_due');
test('an issued, unpaid invoice derives invoice_due work', invoiceWork.length === 1, `count=${invoiceWork.length}`);
test(
  'invoice_due work id is deterministic and derived from the canonical invoice id',
  invoiceWork[0].id === `work-invoice_due-${invoice.id}`
);
/**
 * §P7 — REPOINTED (not weakened). The old contract asserted the deadline against
 * the single global `INVOICE_TERM_DAYS`; the current canonical contract is that
 * the deadline is the invoice's OWN derived due date
 * (`src/lib/commerce/invoiceTerms.ts`), which for an undeclared term falls back
 * to the declared default. Asserting BOTH keeps the old guarantee AND the new one.
 */
test(
  'invoice_due work carries the invoice’s own derived payment-terms deadline',
  invoiceWork[0].dueDate === invoiceTerms.invoiceDueDate(invoice) &&
    invoiceWork[0].dueDate === work.addDays('2026-09-01', invoiceTerms.INVOICE_TERM_DAYS)
);
test(
  '§P7: a 14-day invoice derives an EARLIER deadline than a 30-day one (per-invoice terms)',
  invoiceTerms.invoiceDueDate({ issuedAt: invoice.issuedAt, termDays: 14 }) <
    invoiceTerms.invoiceDueDate({ issuedAt: invoice.issuedAt, termDays: 30 })
);
test('invoice_due work points at the invoice entity', invoiceWork[0].entity.type === 'invoice');
test('invoice_due work is tenant-scoped to the invoice’s brand', invoiceWork[0].tenantId === invoiceBrand);
test(
  'invoice_due work appears in the brand’s own scope only',
  work.getWorkItems('brand', invoiceBrand).some((w) => w.source === 'invoice_due') &&
    !work.getWorkItems('brand', 'brand-not-a-tenant').some((w) => w.source === 'invoice_due')
);
test(
  'invoice_due work appears in the derived calendar (it has a deadline)',
  cal.deriveCalendarEntries('brand', invoiceBrand).some((e) => e.workItemId === invoiceWork[0].id)
);
test(
  'invoice_due is not duplicated for the same invoice',
  work.deriveWorkItems().filter((w) => w.source === 'invoice_due').length === 1
);

/* Settling the invoice (canonical payment record) resolves the work. */
store.recordCommercePayment({
  id: `cpay-${invoiceBrand}-${invoice.id}`,
  brandId: invoiceBrand,
  invoiceId: invoice.id,
  purchaseOrderId: invoice.purchaseOrderId,
  amountGbp: invoice.subtotalGbp,
  status: 'settled',
  method: 'simulated_bank_transfer',
  mode: 'simulation',
  simulated: true,
  at: '2026-09-05T00:00:00.000Z',
});
test(
  'settling the invoice removes the invoice_due work item',
  !work.deriveWorkItems().some((w) => w.source === 'invoice_due')
);


/* ── 15. onboarding_step derivation from the canonical onboarding record ─── */
const onboarding = {
  id: 'onb-validator-prospect',
  prospectId: 'validator-prospect',
  opportunityId: 'validator-opportunity',
  brandId: 'brand-validator-onboarding',
  businessName: 'Validator Onboarding Ltd',
  category: 'Home',
  track: 'unassigned',
  status: 'in_progress',
  steps: [
    { id: 'profile', label: 'Brand profile', status: 'done', completedAt: '2026-09-02T00:00:00.000Z' },
    { id: 'legal_agreements', label: 'Legal agreements', status: 'in_progress' },
    { id: 'banking', label: 'Banking & payout details', status: 'pending' },
    { id: 'carriers', label: 'Carrier connections', status: 'pending' },
    { id: 'compliance', label: 'Compliance documents', status: 'pending' },
  ],
  origin: 'acquisition_opportunity',
  initiatedAt: '2026-09-01T00:00:00.000Z',
  initiatedBy: 'test:operator',
};
acq.saveOnboarding(onboarding);
const onboardingWork = work.deriveWorkItems().filter((w) => w.source === 'onboarding_step');
test(
  'an in-progress onboarding derives exactly one onboarding_step item',
  onboardingWork.length === 1,
  `count=${onboardingWork.length}`
);
test(
  'onboarding_step work points at the FIRST incomplete canonical step',
  onboardingWork[0].id === `work-onboarding_step-${onboarding.id}-legal_agreements`
);
test('onboarding_step work is tenant-scoped to the onboarding’s brand', onboardingWork[0].tenantId === onboarding.brandId);
test('onboarding_step work points at the onboarding entity', onboardingWork[0].entity.type === 'onboarding');
test(
  'onboarding_step work carries the declared per-step SLA deadline',
  onboardingWork[0].dueDate === work.addDays('2026-09-01', 2 * work.ONBOARDING_STEP_SLA_DAYS)
);
test('onboarding_step work is a high-priority legal/banking item', onboardingWork[0].priority === 'high');

/* Completing the step advances the derivation to the NEXT step — it does not
   invent a second item for the same onboarding. */
acq.updateOnboarding(onboarding.id, {
  steps: onboarding.steps.map((s) =>
    s.id === 'legal_agreements' ? { ...s, status: 'done', completedAt: '2026-09-03T00:00:00.000Z' } : s
  ),
});
const advanced = work.deriveWorkItems().filter((w) => w.source === 'onboarding_step');
test(
  'completing a step advances to the next incomplete step',
  advanced.length === 1 && advanced[0].id.endsWith('-banking'),
  advanced.map((w) => w.id).join(',')
);
test('onboarding_step is never duplicated for the same onboarding', new Set(advanced.map((w) => w.id)).size === advanced.length);

/* Completing the onboarding removes the item entirely. */
acq.updateOnboarding(onboarding.id, { status: 'completed', completedAt: '2026-09-10T00:00:00.000Z' });
test(
  'a completed onboarding produces no onboarding_step work',
  !work.deriveWorkItems().some((w) => w.source === 'onboarding_step')
);

/* ── 16. Reset restores the deterministic baseline (work + reminders) ────── */
work.resetWorkStore();
runner.resetReminderStore();
acq.removeOnboarding(onboarding.id);
work.setDemoClock('2026-09-19');
const baselineAfter = work.deriveWorkItems().length;
const sweepAfterReset = runner.runReminderSweep('admin', null, 'test:runner');
test('after reset the sweep runs from a clean ledger', sweepAfterReset.raised.length > 0);
test(
  'after reset the derived set is back to the documented baseline',
  work.deriveWorkItems().length === baselineAfter
);
const reminderReset = runner.resetReminderStore();
test('reminder reset reports what it cleared', reminderReset.ledgerCleared > 0);
test('after reminder reset nothing is active', runner.getActiveReminders('admin').length === 0);
test('after reminder reset the sweep count is back to zero', runner.reminderSweepCount() === 0);
work.resetWorkStore();

/* ── 17. §SSOT — ONE SOURCE OF TRUTH FOR DERIVED WORK ─────────────────────────
 * The user-visible defect this closes: a `shipment_exception` item ("Delay —
 * PO-9212") stayed open for a consignment ALREADY at the terminal `live_amazon`
 * milestone, and NO platform action could clear it, because three different writers
 * owned the flag and none of them cleared it — the only way to hide the item was to
 * mark the TASK done while the RECORD still said exception. These assertions make
 * that impossible again.
 * ──────────────────────────────────────────────────────────────────────────── */

console.log('\n§ Single source of truth — a derived item must be closable by doing the work\n');

/* (a) COMPLETENESS — every work source declares its closing path. */
const closing = work.WORK_SOURCE_CLOSING;
const labelledSources = Object.keys(work.WORK_SOURCE_LABELS);
test(
  'every work source declares a closing path (a source cannot exist undeclared)',
  labelledSources.length === Object.keys(closing).length &&
    labelledSources.every((s) => closing[s] !== undefined),
  `${Object.keys(closing).length} declared / ${labelledSources.length} labelled`
);

/* (b) THE CLOSING PATH WORKS — the source this stage fixed. */
const flagged = store.demoShipments.filter((s) => s.delayed || s.exception);
const shipItems = () => work.getWorkItems('admin').filter((w) => w.source === 'shipment_exception');
test(
  'every flagged consignment produces exactly ONE work item (nothing invented or duplicated)',
  flagged.length > 0 && flagged.every((s) => shipItems().filter((w) => w.entity.id === s.id).length === 1),
  `${flagged.length} flagged · ${shipItems().length} item(s)`
);
test(
  'NO consignment at a resolved milestone carries an in-transit flag (the seed cannot contradict itself)',
  flagged.every((s) => !types.isResolvedShipmentStatus(s.status)),
  flagged.filter((s) => types.isResolvedShipmentStatus(s.status)).map((s) => `${s.id}@${s.status}`).join(', ')
);

const shipTarget = shipItems()[0];
const advancedShipment = store.setShipmentMilestone(shipTarget.entity.id, 'live_amazon');
test(
  'advancing a flagged consignment to a resolved milestone CLOSES its work item (doing the work closes the work)',
  advancedShipment === true && !shipItems().some((w) => w.entity.id === shipTarget.entity.id)
);

const stillFlagged = shipItems()[0];
const clearedExplicitly = stillFlagged
  ? store.clearShipmentException(stillFlagged.entity.id, 'test:operator', 'Validator: carrier confirmed recovery')
  : true;
test(
  'the explicit clearing writer also closes the item, and is idempotent',
  clearedExplicitly === true &&
    (stillFlagged === undefined || !shipItems().some((w) => w.entity.id === stillFlagged.entity.id)) &&
    store.clearShipmentException(shipTarget.entity.id, 'test:operator', 'Validator: already clear') === true
);

/* (c) THE GUARD — a resolved consignment cannot acquire an in-transit problem. */
const liveConsignment = store.demoShipments.find((s) => s.status === 'live_amazon');
test(
  'raising an in-transit exception on a RESOLVED consignment is REFUSED and leaves the record untouched',
  store.raiseShipmentException(liveConsignment.id, { delayed: true }, 'test:operator', 'Validator: contradiction attempt') === false &&
    liveConsignment.delayed === false &&
    liveConsignment.exception === false
);
test(
  'the refusal is AUDITED rather than silently accepted',
  store.demoAuditLog.some((a) => a.action === 'shipment_exception_refused' && a.entityId === liveConsignment.id)
);
test(
  'the automatic clearing transition is AUDITED',
  store.demoAuditLog.some((a) => a.action === 'shipment_exception_cleared')
);

/* (d) NO SECOND WRITER — the facts the work layer derives from have one owner. */
/* Assertions judge CODE, never comments: the old contract is recorded in a
 * `REPOINTED` comment beside each fix, and a comment must not be able to satisfy —
 * or fail — an assertion. */
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
const codeOf = (rel) => stripComments(readFileSync(rel, 'utf8'));
const dhlSrc = codeOf('src/lib/dhl/domain.ts');
const scenarioSrc = codeOf('src/lib/simulation/scenarioEngine.ts');
const simSrc = codeOf('src/lib/simulation/investorDemo.ts');
const seedSrc = codeOf('src/data/demoData.ts');
const storeSrc = codeOf('src/data/demoStore.ts');
test(
  'the provider seam uses the owner instead of assigning consignment state directly',
  !/shipment\.(delayed|exception) =/.test(dhlSrc) &&
    !/shipment\.status = to;/.test(dhlSrc) &&
    /raiseShipmentException\(/.test(dhlSrc) &&
    /setShipmentMilestone\(/.test(dhlSrc)
);
test(
  'the scenario engine uses the owner instead of assigning consignment state directly',
  !/s\.(delayed|status) = /.test(scenarioSrc) && /raiseShipmentException\(/.test(scenarioSrc)
);
test(
  'the investor-demo drill uses the owner instead of assigning the flag directly',
  !/shipment\.delayed = /.test(simSrc) &&
    /clearShipmentException\(/.test(simSrc) &&
    /raiseShipmentException\(/.test(simSrc)
);
test(
  'the seed declares the scenario instead of deriving it from position arithmetic',
  !/i % 4 === 1/.test(seedSrc) && !/i % 7 === 3/.test(seedSrc) && /DEMO_SHIPMENT_EXCEPTION_SCENARIO/.test(seedSrc)
);
test(
  'the consignment flags are written in ONE module (the domain owner), nowhere else under src/',
  !/\.(delayed|exception) = /.test(dhlSrc) &&
    !/\.(delayed|exception) = /.test(scenarioSrc) &&
    !/\.(delayed|exception) = /.test(simSrc) &&
    /\.(delayed|exception) = /.test(storeSrc)
);

/* (e) THE REMAINDER IS REPORTED, NOT HIDDEN. */
console.log(`    declared gaps (a source with no closing path yet): ${work.WORK_SOURCE_CLOSING_GAPS.join(', ') || 'none'}`);
test(
  'the declared gaps are enumerable from the SSOT (so they are reported, never silently tolerated)',
  Array.isArray(work.WORK_SOURCE_CLOSING_GAPS)
);



/* ── 18. §SSOT S2 — THE WORK LAYER HOLDS NO SECOND STATUS FOR DERIVED WORK ───
 * The stage's rule judged on the CODE (comments stripped), so it cannot be
 * satisfied by prose: a derived item's status must be COMPUTED from the record,
 * and the map that let the work layer resolve it independently (`resolvedDerived`)
 * must not exist. If a future change reintroduces one, these fail.
 * ──────────────────────────────────────────────────────────────────────────── */

console.log('\n§ SSOT S2 — the record owns a derived item’s status, not the work layer\n');

const workStoreSrc = codeOf('src/lib/work/workStore.ts');
const workTypesSrc = codeOf('src/lib/work/types.ts');
test(
  'no independent resolution map for derived work exists in the store',
  !/resolvedDerived/.test(workStoreSrc) && !/derivedStatus/.test(workStoreSrc)
);
test(
  'a derived item’s status is COMPUTED (annotation, else open) — never read from a resolution',
  /status: annotation\?\.status \?\? 'open'/.test(workStoreSrc) && /derivedAnnotations\.get\(/.test(workStoreSrc)
);
test(
  'the refusal guard is the ONLY path a derived resolution can take',
  /canResolveFromWorkLayer\(item\)/.test(workStoreSrc) &&
    /refusal\.name = DERIVED_RESOLUTION_REFUSED/.test(workStoreSrc) &&
    /work_item_resolution_refused/.test(workStoreSrc)
);
test(
  'the operator annotation type is structurally unable to hold `done`',
  /export interface WorkOperatorAnnotation \{\s*status: 'in_progress' \| 'blocked';/.test(workTypesSrc)
);
test(
  'a derived item can never carry a completion timestamp',
  !/completedAt: resolution/.test(workStoreSrc)
);
test(
  'the reset result reports annotations (there is no derived resolution left to clear)',
  /derivedAnnotationsCleared/.test(workStoreSrc) && !/derivedResolutionsCleared/.test(workStoreSrc)
);

/* A derived item in EVERY tenant-free scope is never `done` (the invariant the
 * cadence above proves on one item, asserted across the whole projection). */
test(
  'across every scope, no derived item is ever done',
  ['admin', 'brand'].every((scope) =>
    work
      .getWorkItems(scope, scope === 'brand' ? tenantA : null, { includeResolved: true })
      .filter((w) => w.derived)
      .every((w) => w.status !== 'done')
  )
);

console.log(`\nWORK LAYER: ${failures === 0 ? 'PASS' : 'FAIL'} (${failures} failure(s))`);
await server.close();
process.exit(failures === 0 ? 0 : 1);


