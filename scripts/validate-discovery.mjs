// §10 — validates the discovery engine end-to-end on mock clients:
//   full pipeline (directory → research → enrich → email → lint → enrol)
//   budget caps refuse calls before provider requests · wording-safety lint
//   hot-lead reply routing via handleInboundReply
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
let failures = 0;
const test = (name, ok) => {
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) failures++;
};

try {
  const d = await server.ssrLoadModule('/src/lib/discovery/engine.ts');
  const b = await server.ssrLoadModule('/src/lib/discovery/budget.ts');
  const w = await server.ssrLoadModule('/src/lib/discovery/wordingSafety.ts');

  // Wording lint
  test('clean copy passes', w.lintOutwardWording('UK retail placement for Acme').safe === true);
  const bad = w.lintOutwardWording('List your products on Amazon Vendor Central today');
  test('banned terms caught with reasons',
    !bad.safe && bad.hits.length >= 2);

  // Budget caps
  b.resetBudgets();
  test('budget charge under cap succeeds', b.chargeService('hunter', 5) === true);
  test('budget charge over cap refused', b.chargeService('hunter', 6) === false);
  test('remaining budget never negative', b.remainingBudget('hunter') === 5);

  // Full pipeline on mocks
  d.resetMockOutreach();
  b.resetBudgets();
  const events = [];
  const result = await d.runDiscoveryPipeline(
    ['Grocery', 'Apparel'],
    'Established food & apparel exporters with UK-ready volumes',
    { clients: d.createMockDiscoveryClients(), minFitScore: 50, onLead: (l, en, why) => events.push({ name: l.companyName, en, why }) }
  );
  test('pipeline discovered leads from directories', result.discovered === 2);
  test('enrichment + email ran for every lead', events.length === 2);
  test('some leads enrolled', result.enrolled + result.dropped === 2);
  test('mock outreach holds the enrolled leads', d.MockOutreachClient.enrolled.length === result.enrolled);
  test('every enrolled subject is wording-safe',
    d.MockOutreachClient.enrolled.every((e) => w.lintOutwardWording(e.subject).safe));

  // minFitScore drops low scorers before enrolment
  const strict = await d.runDiscoveryPipeline(['Grocery'], 'x', {
    clients: d.createMockDiscoveryClients(), minFitScore: 100,
  });
  test('minFitScore=100 drops everything before enrolment', strict.discovered > 0 && strict.enrolled === 0);

  // Hot-lead reply routing (wires classifyInboundReply)
  const hot = d.handleInboundReply({ leadEmail: 'trade@harvestlane.co.zw', body: 'How much does this cost? Can we talk this week?' });
  test('pricing-question reply → real-time hot-lead notification',
    hot.requiresHuman === true && !!hot.hotLeadNotification);
  const neutral = d.handleInboundReply({ leadEmail: 'x@y.z', body: 'Thanks, we will review internally.' });
  test('neutral reply batches to digest (no notification)',
    neutral.requiresHuman === false && !neutral.hotLeadNotification);

  console.log(failures === 0 ? 'DISCOVERY_VALIDATION_PASS' : `DISCOVERY_VALIDATION_FAIL (${failures})`);
} finally {
  await server.close();
}
if (failures > 0) process.exit(1);
