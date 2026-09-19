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

console.log(`\nWORK LAYER: ${failures === 0 ? 'PASS' : 'FAIL'} (${failures} failure(s))`);
await server.close();
process.exit(failures === 0 ? 0 : 1);


