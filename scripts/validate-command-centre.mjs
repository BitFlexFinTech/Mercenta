// §32 / M13 Phase 11 — SUPER ADMIN COMMAND CENTRE validator.
//
// Proves the founder's command centre is REAL and HONEST:
//   • every action is DERIVED from a real store (compliance, Google, POs,
//     shipments, applications, launch, partner targets, prospects, AI cost);
//   • band counts match the band contents exactly;
//   • the 24-hour PO rule is computed, not asserted;
//   • a Super Admin CTA always names a tab that actually exists;
//   • the tab-aware navigation intent is consumed once and only by its owner;
//   • the surface makes ZERO network calls.
import { createServer } from 'vite';
import { readFileSync } from 'node:fs';

let networkCalls = 0;
const realFetch = globalThis.fetch;
globalThis.fetch = (...args) => {
  networkCalls += 1;
  console.error('[validate-command-centre] UNEXPECTED network call:', args[0]);
  return realFetch(...args);
};

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
let failures = 0;
let checks = 0;
const test = (name, ok, detail = '') => {
  checks++;
  console.log(`${ok ? '✓' : '✗'} ${name}${!ok && detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

try {
  const nav = await server.ssrLoadModule('/src/data/adminNav.ts');
  const cc = await server.ssrLoadModule('/src/lib/commandCentre/commandCentre.ts');
  const demo = await server.ssrLoadModule('/src/data/demoStore.ts');
  const companyStore = await server.ssrLoadModule('/src/data/companyStore.ts');
  const costLog = await server.ssrLoadModule('/src/lib/costs/usageLog.ts');

  /* ── the tab-aware navigation intent ─────────────────────────────────── */
  nav.resetAdminNav();
  test('there is no pending navigation intent at rest', nav.peekAdminNavRequest() === null);
  nav.requestAdminNav({ view: 'super_admin', tab: 'company', source: 'validator' });
  test('a request is recorded with its source',
    nav.peekAdminNavRequest()?.tab === 'company' && nav.peekAdminNavRequest()?.source === 'validator');
  test('a panel that does NOT own the view cannot consume the intent',
    nav.consumeAdminNavRequest('brand_intelligence') === null);
  const taken = nav.consumeAdminNavRequest('super_admin');
  test('the owning panel consumes the intent exactly once',
    taken?.tab === 'company' && nav.consumeAdminNavRequest('super_admin') === null);
  nav.resetAdminNav();

  /* ── the derivation ──────────────────────────────────────────────────── */
  companyStore.resetCompanyStore();
  costLog.resetAiUsageLog();
  const now = new Date('2026-09-15T10:00:00.000Z');
  const model = cc.buildCommandCentre({ now });
  test('the three time bands partition the actions with matching counts',
    model.counts.now === model.now.length &&
      model.counts.today === model.today.length &&
      model.counts.week === model.week.length &&
      model.counts.total === model.now.length + model.today.length + model.week.length);
  test('every action carries a CTA and a destination view',
    [...model.now, ...model.today, ...model.week].every((a) => a.cta.length > 3 && a.navView.length > 3));

  /* ── compliance signal (companyStore) ────────────────────────────────── */
  const readRegister = [...model.today, ...model.week].find((a) => a.id === 'company-company-read-register');
  test('an unread company register raises the compliance action on the Company tab',
    Boolean(readRegister) && readRegister?.navView === 'super_admin' && readRegister?.navTab === 'company');

  companyStore.resetCompanyStore();
  companyStore.recordRegistrarSnapshot({
    mode: 'simulation',
    actorId: 'super-admin:founder',
    record: {
      companyNumber: '17457777', companyName: 'Mercenta Partners Ltd', status: 'active', sicCodes: [],
      nextConfirmationStatementDue: '2026-09-20', hasCharges: false, hasInsolvencyHistory: false,
      dataSource: 'simulated_registrar',
    },
  });
  const urgentModel = cc.buildCommandCentre({ now });
  const csAction = urgentModel.now.find((a) => a.id === 'company-company-confirmation-statement');
  test('a confirmation statement due within 30 days is an URGENT NOW action',
    Boolean(csAction) && csAction?.priority === 'urgent' && csAction?.dueDate === '2026-09-20');
  test('the deadline action routes to the Company tab',
    csAction?.navView === 'super_admin' && csAction?.navTab === 'company');

  /* ── AI cost signal ──────────────────────────────────────────────────── */
  companyStore.resetCompanyStore();
  for (let i = 0; i < 12; i++) {
    costLog.aiUsageEntries().push({
      id: `synthetic-${i}`, at: now.toISOString(), taskId: 'x', model: null, tier: 'paid_max',
      tokens: 0, estimatedCostGbp: 3, cache: 'miss', status: 'ok',
    });
  }
  const overModel = cc.buildCommandCentre({ now });
  const aiAction = overModel.now.find((a) => a.id === 'ai-cost-protection');
  test('an exceeded AI ceiling is an URGENT NOW action on the Operating Costs tab',
    Boolean(aiAction) && aiAction?.priority === 'urgent' && aiAction?.navTab === 'costs');
  costLog.resetAiUsageLog();

  /* ── the PO 24-hour rule is computed ─────────────────────────────────── */
  const openPos = demo.demoPurchaseOrders.filter((po) => po.status === 'received' || po.status === 'under_review');
  const poModel = cc.buildCommandCentre({ now });
  const allActions = [...poModel.now, ...poModel.today, ...poModel.week];
  test('every open PO produces exactly one action carrying its value',
    openPos.length > 0 &&
      openPos.every(
        (po) =>
          allActions.filter((a) => a.id === `po-${po.id}`).length === 1 &&
          allActions.find((a) => a.id === `po-${po.id}`)?.valueGbp === po.poValue
      ),
    `${openPos.length} open POs`);
  test('a PO older than 24 hours is urgent; a fresh one is high, not urgent',
    openPos.every((po) => {
      const action = allActions.find((a) => a.id === `po-${po.id}`);
      const hours = (now.getTime() - new Date(po.orderDate).getTime()) / 3600000;
      return hours >= 24 ? action?.priority === 'urgent' : action?.priority === 'high';
    }));

  /* ── shipment exceptions ─────────────────────────────────────────────── */
  const exceptions = demo.demoShipments.filter((s) => s.exception || s.delayed);
  test('every shipment exception/delay is an urgent action routed to logistics',
    exceptions.every((s) => {
      const a = allActions.find((x) => x.id === `shipment-${s.id}`);
      return a?.priority === 'urgent' && a?.navView === 'logistics';
    }),
    `${exceptions.length} exceptions`);

  /* ── integration failures handed in by the shell ─────────────────────── */
  const withIssue = cc.buildCommandCentre({
    now,
    integrationIssues: [{ id: 'email', name: 'email', error: 'HTTP 401' }],
  });
  test('a provider error becomes an urgent NOW action on the Integrations view',
    withIssue.now.some((a) => a.id === 'integration-email' && a.navView === 'integrations'));

  /* ── partnership / opportunity honesty ───────────────────────────────── */
  const partnerActions = poModel.week.filter((a) => a.navView === 'partnerships');
  test('partner actions are labelled as prospective routes (no partnership claimed)',
    partnerActions.length > 0 && partnerActions.every((a) => /prospective route — no relationship exists/.test(a.detail)));
  test('opportunity actions come from the canonical prospect store',
    poModel.sections.find((s) => s.id === 'opportunities')?.actions.every((a) => a.id.startsWith('prospect-')));
  test('all five command sections are present',
    ['opportunities', 'fundraising', 'operations', 'finance', 'ai_cost'].every((id) =>
      poModel.sections.some((s) => s.id === id)));

  /* ── the surface is wired to the real shell ──────────────────────────── */
  const dashboard = read('src/components/admin/AdminDashboard.tsx');
  const superPanel = read('src/components/admin/SuperAdminPanel.tsx');
  const panel = read('src/components/admin/CommandCentre.tsx');
  test('the command centre is rendered on the admin overview',
    /<CommandCentre onNavigate=\{onNavigate\} \/>/.test(dashboard));
  test('the panel routes a CTA through the tab-aware navigation intent',
    /requestAdminNav\(\{ view: action\.navView, tab: action\.navTab/.test(panel) && /onNavigate\?\.\(action\.navView\)/.test(panel));
  test('Super Admin consumes the intent and validates the tab id before selecting it',
    /consumeAdminNavRequest\('super_admin'\)/.test(superPanel) &&
      /SUPER_ADMIN_TABS\.some\(\(t\) => t\.id === req\.tab\)/.test(superPanel));
  test('the panel exposes stable test ids', /data-testid="command-centre"/.test(panel) && /data-testid="command-action"/.test(panel));

  const tabIds = [...superPanel.matchAll(/\{ id: '([a-z_]+)', label:/g)].map((m) => m[1]);
  const tabbedActions = [...poModel.now, ...poModel.today, ...poModel.week].filter((a) => a.navView === 'super_admin');
  test('every Super Admin CTA names a tab that actually exists',
    tabbedActions.length > 0 && tabbedActions.every((a) => Boolean(a.navTab) && tabIds.includes(a.navTab)),
    `${tabbedActions.length} tabbed actions · tabs: ${tabIds.join(',')}`);

  test('the command centre makes ZERO network calls', networkCalls === 0, `observed ${networkCalls}`);
} catch (err) {
  console.error('[validate-command-centre] THREW:', err);
  failures++;
}

console.log(`\nCOMMAND_CENTRE_VALIDATION_${failures === 0 ? 'PASS' : `FAIL (${failures})`} (${checks} checks)`);
process.exit(failures === 0 ? 0 : 1);