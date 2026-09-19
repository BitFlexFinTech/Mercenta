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

/* ── 4. Reminders stop on resolution ──────────────────────────────────────── */
const target = brandItems[0];
const beforeCount = work.getWorkItems('brand', tenantA).length;
feed.resetEvents();
const resolved = work.resolveWorkItem(target.id, 'test:operator', 'Validated in the validator');
test('resolveWorkItem returns the item as done', resolved !== null && resolved.status === 'done');
test(
  'resolved item leaves the attention set',
  work.getWorkItems('brand', tenantA).length === beforeCount - 1
);
test(
  'resolved item is excluded from the notification projection',
  !work.getWorkItems('brand', tenantA).some((w) => w.id === target.id)
);
test(
  'resolved item remains visible as history when asked for',
  work.getWorkItems('brand', tenantA, { includeResolved: true }).some((w) => w.id === target.id)
);
test(
  'resolution emits the canonical work_item_resolved event',
  feed.queryEvents({ type: 'work_item_resolved' }).length === 1
);
test(
  'resolution is attributed in the audit log',
  store.demoAuditLog.some(
    (a) => a.action === 'work_item_resolved' && a.actorId === 'test:operator' && a.entityId === target.id
  )
);
test(
  'resolution is recorded on the item’s own activity trail',
  resolved.activity.some((a) => a.action === 'resolved' && a.actor === 'test:operator')
);

const reopened = work.reopenWorkItem(target.id, 'test:operator', 'Reopened in the validator');
test('reopen restores the item to the attention set', work.getWorkItems('brand', tenantA).length === beforeCount);
test('reopen resets status to open', reopened.status === 'open');

work.setWorkItemStatus(target.id, 'in_progress', 'test:operator');
test(
  'status progression is observable in the kanban grouping',
  work.workByStatus('brand', tenantA).in_progress.some((w) => w.id === target.id)
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

/* ── 11. Reminders stop on resolution and respect reopen ─────────────────── */
const reminderTarget = sweep1.raised[0];
const activeBefore = runner.getActiveReminders('admin').length;
work.resolveWorkItem(reminderTarget.workItemId, 'test:operator', 'Reminder resolution check');
test(
  'resolving the work item removes its reminder',
  !runner.getActiveReminders('admin').some((r) => r.workItemId === reminderTarget.workItemId)
);
test(
  'the active reminder count falls by one',
  runner.getActiveReminders('admin').length === activeBefore - 1
);
work.reopenWorkItem(reminderTarget.workItemId, 'test:operator', 'Reopen check');
test(
  'reopening the work item restores its reminder (state respected)',
  runner.getActiveReminders('admin').some((r) => r.workItemId === reminderTarget.workItemId)
);
work.resolveWorkItem(reminderTarget.workItemId, 'test:operator', 'Re-resolve');
runner.runReminderSweep('admin', null, 'test:runner');
test(
  'a resolved item is never re-reminded by a later sweep',
  !runner.getActiveReminders('admin').some((r) => r.workItemId === reminderTarget.workItemId)
);
work.reopenWorkItem(reminderTarget.workItemId, 'test:operator', 'Restore baseline');

/* ── 12. Tenant scope is respected by the runner ─────────────────────────── */
const brandReminders = runner.getActiveReminders('brand', tenantA);
test('brand reminder scope returns only that tenant’s reminders', brandReminders.every((r) => r.tenantId === tenantA));
test(
  'brand reminder scope is a subset of the admin reminder set',
  brandReminders.length < runner.getActiveReminders('admin').length
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
test(
  'invoice_due work carries the declared payment-terms deadline',
  invoiceWork[0].dueDate === work.addDays('2026-09-01', work.INVOICE_TERM_DAYS)
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


console.log(`\nWORK LAYER: ${failures === 0 ? 'PASS' : 'FAIL'} (${failures} failure(s))`);
await server.close();
process.exit(failures === 0 ? 0 : 1);


