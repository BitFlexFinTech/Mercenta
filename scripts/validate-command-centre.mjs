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
  const partnershipConfig = await server.ssrLoadModule('/src/config/partnerships.ts');
  const acquisition = await server.ssrLoadModule('/src/lib/intelligence/acquisitionStrategy.ts');
  const funding = await server.ssrLoadModule('/src/lib/founder/fundingPipeline.ts');

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
  /**
   * §Dashboard-cleanup (2026-09-22) — REPOINTED to the current canonical source
   * of truth, not weakened.
   *
   * OLD CONTRACT: `/<CommandCentre onNavigate={onNavigate} />/` in
   * `AdminDashboard.tsx` — the command centre was rendered on the admin OVERVIEW.
   *
   * NEW CONTRACT: the command centre is an ACTION surface and is rendered on the
   * CONTROL CENTRE (`FounderControlCentre.tsx`), not on the Overview. This
   * assertion now checks BOTH halves of that contract, so the placement cannot
   * silently drift back: it must be present in the Control Centre AND absent from
   * the Overview.
   */
  const dashboard = read('src/components/admin/AdminDashboard.tsx');
  const controlCentre = read('src/components/admin/FounderControlCentre.tsx');
  const superPanel = read('src/components/admin/SuperAdminPanel.tsx');
  const panel = read('src/components/admin/CommandCentre.tsx');
  test('the command centre is rendered on the Control Centre',
    /<CommandCentre onNavigate=\{onNavigate\} \/>/.test(controlCentre));
  test('the command centre is NOT rendered on the admin overview',
    !/<CommandCentre onNavigate=\{onNavigate\} \/>/.test(dashboard) &&
      !/from '\.\/CommandCentre'/.test(dashboard));
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

  /* ── §27/§28 — the RANKED founder queue with an explicit WHY ─────────── */
  const allQueued = [...model.now, ...model.today, ...model.week];
  test('every action in the queue carries a rank, and the ranks are 1..N exactly once',
    model.queue.length === model.counts.total &&
      model.queue.every((a, i) => a.rank === i + 1) &&
      new Set(model.queue.map((a) => a.rank)).size === model.queue.length);
  test('the queue is ordered by the WHY score (descending)',
    model.queue.every((a, i) => i === 0 || model.queue[i - 1].why.score >= a.why.score),
    model.queue.map((a) => `${a.id}:${a.why.score}`).join(' '));
  test('every action carries an explicit WHY with an observed value per factor',
    allQueued.every((a) => Boolean(a.why) && a.why.factors.length >= 2 &&
      a.why.factors.every((f) => f.label.length > 3 && f.observed.length > 3 && f.points >= 0)));
  test('the WHY score is exactly the sum of its factor points (auditable arithmetic)',
    allQueued.every((a) => a.why.score === a.why.factors.reduce((n, f) => n + f.points, 0)));
  test('no factor exceeds the max declared in COMMAND_FACTORS',
    allQueued.every((a) => a.why.factors.every((f) => f.points <= cc.COMMAND_FACTORS[f.id].max)),
    'a factor scoring above its declared max would mean the ranking disagrees with the stated basis');
  test('the ranking is DECLARED deterministic and states that no AI is used',
    cc.COMMAND_QUEUE_IS_DETERMINISTIC === true && /No AI/.test(cc.COMMAND_QUEUE_BASIS));
  const secondBuild = cc.buildCommandCentre({ now });
  test('rebuilding at the same time produces byte-identical ranks and scores (deterministic)',
    JSON.stringify(secondBuild.queue.map((a) => [a.id, a.rank, a.why.score])) ===
      JSON.stringify(model.queue.map((a) => [a.id, a.rank, a.why.score])));

  /* the relationship slots are derived from the canonical partner targets */
  const embassy = model.queue.find((a) => a.id === 'relationship-embassy');
  const embassyTargets = partnershipConfig.FOUNDER_PARTNER_TARGETS.filter((t) => t.programme === 'british_embassy');
  test('the best embassy route is derived from the canonical embassy targets, not invented',
    Boolean(embassy) && embassyTargets.some((t) => t.market === embassy.region) &&
      embassy.navView === 'partnerships' &&
      /prospective route — no relationship exists/.test(embassy.detail));
  test('the embassy WHY scores relationship readiness from the stored stage',
    Boolean(embassy?.why.factors.find((f) => f.id === 'relationship_readiness' && f.observed.includes('route'))));
  const programme = model.queue.find((a) => a.id === 'relationship-trade-programme');
  const programmeLabels = Object.values(acquisition.TRADE_PROGRAMMES).map((p) => p.label);
  test('the best trade programme slot names a programme from the canonical registry',
    Boolean(programme) && programmeLabels.some((l) => programme.title.includes(l)) &&
      programme.navView === 'partnerships');
  const investor = model.queue.find((a) => a.id === 'founder-investor-route');
  test('the investor slot states the plan figure and that ZERO is committed (no invented commitment)',
    Boolean(investor) && investor.title.includes('£250,000') && investor.title.includes('0 committed') &&
      /no investment has been committed/.test(investor.detail));
  const fundingRoutes = model.queue.filter((a) => a.id.startsWith('funding-route-'));
  test('every funding opportunity is on the queue exactly once at this stage',
    fundingRoutes.length === funding.FOUNDER_FUNDING_OPPORTUNITIES.length &&
      new Set(fundingRoutes.map((a) => a.id)).size === fundingRoutes.length,
    `${fundingRoutes.length} items · ${funding.FOUNDER_FUNDING_OPPORTUNITIES.length} opportunities`);
  const accelerator = fundingRoutes.find((a) => a.id === 'funding-route-fund-solo-founders');
  test('the accelerator slot is the canonical Solo Founders Program route on the Grants tab',
    Boolean(accelerator) && accelerator.title.includes('Solo Founders Program') &&
      accelerator.navView === 'super_admin' && accelerator.navTab === 'grants' &&
      /Mercenta submits nothing/.test(accelerator.detail));
  test('a funding item at an early stage states the canonical next action, not a fabrication',
    fundingRoutes.every((a) => /Next: /.test(a.detail) && a.why.factors.some((f) => f.id === 'funding_relevance')));

  const panelSrc = read('src/components/admin/CommandCentre.tsx');
  const moduleSrc2 = read('src/lib/commandCentre/commandCentre.ts');
  test('the surface renders the rank and the WHY breakdown for every row',
    /data-testid="command-why"/.test(panelSrc) && /a\.why\.factors/.test(panelSrc) &&
      /#\{a\.rank\}/.test(panelSrc) && /data-testid="command-queue-basis"/.test(panelSrc));
  test('the derivation makes no model call and no network call',
    !/\bfetch\s*\(|XMLHttpRequest|openrouter|authoriseAiCall|selectModel/i.test(moduleSrc2));
} catch (err) {
  console.error('[validate-command-centre] THREW:', err);
  failures++;
}

console.log(`\nCOMMAND_CENTRE_VALIDATION_${failures === 0 ? 'PASS' : `FAIL (${failures})`} (${checks} checks)`);
process.exit(failures === 0 ? 0 : 1);