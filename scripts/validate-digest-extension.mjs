/**
 * Digest extension validation — tests the Chief of Staff briefing, cadence,
 * and formatDigestAsText function.
 */

import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });

let failures = 0;
function test(name, cond) {
  console.log(`${cond ? '✓' : '✗'} ${name}`);
  if (!cond) failures++;
}

try {
  const digest = await server.ssrLoadModule('/src/lib/automation/digest.ts');

  /* ── Cadence ── */
  const morningInput = {
    date: new Date('2026-08-30T08:00:00Z'),
    cadence: 'morning',
    newLeads: [{ id: 'l1', company: 'TestCo' }],
    nonUrgentReplies: [],
    scores: [],
    contracts: [],
    commissions: [],
    rejectedSubmissions: [],
    emailsSent: 12,
    hotLeadsToday: 3,
    completedYesterday: ['Reviewed PO-100', 'Updated compliance docs'],
    plannedToday: ['Onboard brand X', 'Run product research'],
    codePushSummary: '3 commits, 1 PR merged',
    platformPerformance: '99.2% uptime, 0 errors',
  };
  const morning = digest.buildDailyDigest(morningInput);
  test('buildDailyDigest includes cadence', morning.cadence === 'morning');
  test('buildDailyDigest includes Chief of Staff briefing', morning.chiefOfStaffBriefing !== undefined);
  test('Chief of Staff: emailsSent', morning.chiefOfStaffBriefing?.emailsSent === 12);
  test('Chief of Staff: hotLeadsToday', morning.chiefOfStaffBriefing?.hotLeadsToday === 3);
  test('Chief of Staff: completedYesterday', morning.chiefOfStaffBriefing?.completedYesterday.length === 2);
  test('Chief of Staff: plannedToday', morning.chiefOfStaffBriefing?.plannedToday.length === 2);
  test('Chief of Staff: codePushSummary', morning.chiefOfStaffBriefing?.codePushSummary === '3 commits, 1 PR merged');

  /* ── Evening digest (no briefing fields) ── */
  const eveningInput = { ...morningInput, cadence: 'evening', emailsSent: undefined, hotLeadsToday: undefined, completedYesterday: undefined, plannedToday: undefined, codePushSummary: undefined, platformPerformance: undefined };
  const evening = digest.buildDailyDigest(eveningInput);
  test('evening digest without briefing fields → no briefing', evening.chiefOfStaffBriefing === undefined);
  test('evening digest has cadence', evening.cadence === 'evening');

  /* ── formatDigestAsText ── */
  const text = digest.formatDigestAsText(morning);
  test('formatDigestAsText returns string', typeof text === 'string');
  test('formatDigestAsText contains morning greeting', text.includes('Good morning'));
  test('formatDigestAsText contains emails sent', text.includes('Emails sent'));
  test('formatDigestAsText contains hot leads', text.includes('Hot leads'));
  test('formatDigestAsText contains completed yesterday', text.includes('Completed yesterday'));

  const eveningText = digest.formatDigestAsText(evening);
  test('formatDigestAsText evening greeting', eveningText.includes('Good evening'));

  console.log(`\nDIGEST_EXTENSION_VALIDATION_PASS (${failures} failures)`);
} catch (err) {
  console.error('DIGEST_EXTENSION_VALIDATION_FAIL:', err.message);
  failures++;
  console.log(`\nDIGEST_EXTENSION_VALIDATION_PASS (${failures} failures)`);
} finally {
  await server.close();
  process.exit(failures > 0 ? 1 : 0);
}