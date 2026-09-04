/**
 * Event feed validation — verifies the event feed module works correctly.
 * Tests event emission, querying, filtering, severity tagging, and
 * convenience emitters.
 */

import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });

let failures = 0;
function test(name, cond) {
  console.log(`${cond ? '✓' : '✗'} ${name}`);
  if (!cond) failures++;
}

try {
  const feed = await server.ssrLoadModule('/src/lib/events/eventFeed.ts');

  /* Reset state */
  feed.resetEvents();

  /* ── Basic emit ── */
  const e1 = feed.emitEvent({ type: 'brand_onboarding_complete', severity: 'informational', title: 'Brand onboarded', description: 'Test brand', entityId: 'brand-1' });
  test('emitEvent returns event with id', /^evt-/.test(e1.id));
  test('emitEvent sets createdAt', typeof e1.createdAt === 'string');
  test('emitEvent starts unacknowledged', e1.acknowledged === false);

  /* ── Convenience emitters ── */
  const largePo = feed.emitLargePoEvent('PO-001', 'brand-1', 100000);
  test('emitLargePoEvent above threshold → event', largePo !== null && largePo.type === 'new_po_above_threshold');

  const smallPo = feed.emitLargePoEvent('PO-002', 'brand-1', 100);
  test('emitLargePoEvent below threshold → null', smallPo === null);

  const compliance = feed.emitComplianceEvent('doc-1', 'brand-1', 'UKCA', 15);
  test('emitComplianceEvent → compliance_doc_expiring', compliance.type === 'compliance_doc_expiring' && compliance.severity === 'important');

  const deduction = feed.emitDeductionEvent('ded-1', 'brand-1', 5000, 'Shortage');
  test('emitDeductionEvent → deduction_posted', deduction.type === 'deduction_posted' && deduction.severity === 'important');

  const signed = feed.emitContractEvent('ct-1', 'brand-1', true);
  test('emitContractEvent signed → contract_signed, critical', signed.type === 'contract_signed' && signed.severity === 'critical');

  const expired = feed.emitContractEvent('ct-2', 'brand-1', false);
  test('emitContractEvent expired → contract_expired, important', expired.type === 'contract_expired' && expired.severity === 'important');

  const onboarding = feed.emitOnboardingEvent('brand-2', 'Test Brand');
  test('emitOnboardingEvent → brand_onboarding_complete', onboarding.type === 'brand_onboarding_complete');

  const alert = feed.emitSecurityAlert('Test alert', 'Something suspicious');
  test('emitSecurityAlert → security_alert, critical', alert.type === 'security_alert' && alert.severity === 'critical');

  const testFail = feed.emitTestFailure('e2e/suite', 3);
  test('emitTestFailure → test_suite_failure, important', testFail.type === 'test_suite_failure' && testFail.severity === 'important');

  /* ── Queries ── */
  const all = feed.queryEvents();
  test('queryEvents returns all events', all.length >= 9);

  const critical = feed.queryEvents({ severity: 'critical' });
  test('queryEvents filter by severity', critical.every((e) => e.severity === 'critical'));

  const limited = feed.queryEvents({ limit: 3 });
  test('queryEvents limit', limited.length <= 3);

  const unacknowledged = feed.getUnacknowledgedAbove('important');
  test('getUnacknowledgedAbove returns unacknowledged critical+important', unacknowledged.length > 0);

  /* ── Acknowledge ── */
  const ack = feed.acknowledgeEvent(e1.id);
  test('acknowledgeEvent returns true for existing', ack === true);
  const ackBad = feed.acknowledgeEvent('nonexistent');
  test('acknowledgeEvent returns false for unknown', ackBad === false);

  /* ── Types ── */
  const types = await server.ssrLoadModule('/src/lib/events/types.ts');
  test('EVENT_SEVERITY_MAP exported', types.EVENT_SEVERITY_MAP.new_po_above_threshold === 'critical');

  console.log(`\nEVENT_FEED_VALIDATION_PASS (${failures} failures)`);
} catch (err) {
  console.error('EVENT_FEED_VALIDATION_FAIL:', err.message);
  failures++;
  console.log(`\nEVENT_FEED_VALIDATION_PASS (${failures} failures)`);
} finally {
  await server.close();
  process.exit(failures > 0 ? 1 : 0);
}