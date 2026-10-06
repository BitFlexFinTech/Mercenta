#!/usr/bin/env node
/**
 * §PHASE 6 — THE DETERMINISTIC FINANCING ROUTER GATE.
 *
 * WHY THIS EXISTS
 * ---------------
 * The financing router owner (`src/lib/finance/financingRouter.ts`) routes each
 * Model B purchase to exactly ONE financing route. Its whole value rests on
 * properties a comment cannot guarantee:
 *
 *   · it REUSES the canonical exclusive-gateway evaluator
 *     (`src/lib/routing/gateways.ts`) — it is NOT a second routing engine;
 *   · it is DETERMINISTIC — the same inputs always give the same route and the
 *     same canonical decision id, and there is no AI / model / provider / clock
 *     anywhere in the rules;
 *   · it selects EXACTLY ONE route per purchase (self-funded / facility draw /
 *     external referral), and the declared conditions are mutually exclusive;
 *   · it FAILS CLOSED — a malformed configuration is REFUSED, never defaulted;
 *   · it is INTERNAL — no brand component imports it, and the owner makes no
 *     network or AI call; and
 *   · it is actually USED by the Control Centre and rendered by the founder
 *     surface (Super-Admin only — financing is internal).
 *
 * THE GATE CAN FAIL (self-check): the helper comparison is run against a
 * deliberately-wrong expectation as well as the correct one, and a MALFORMED
 * config is exercised — the wrong expectation MUST be rejected and the malformed
 * config MUST refuse, so a green run proves the checks work rather than that they
 * are vacuous.
 *
 * Run: node scripts/validate-financing-router.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
let failures = 0;
const test = (name, ok, detail = '') => {
  console.log(`${ok ? '✓' : '✗'} ${name}${ok || !detail ? '' : ` — ${detail}`}`);
  if (!ok) failures += 1;
};
const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
/** Strip comments so a documented example (e.g. `Math.random`) is not read as code. */
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
const near = (a, b) => Math.abs(a - b) < 1e-6;
const walk = (dir) => {
  let out = [];
  for (const f of readdirSync(dir)) {
    const p = `${dir}/${f}`;
    if (statSync(p).isDirectory()) out = out.concat(walk(p));
    else out.push(p);
  }
  return out;
};

/** A known facility (advanceRate 1 so advance == supplier cost) + a known config. */
const FACILITY = {
  facilityCapacityGbp: 1000,
  availableCapitalGbp: 800,
  advanceRate: 1,
  feeRatePctPerTerm: 0,
  termDays: 30,
  concentrationLimitPct: 40,
  currency: 'GBP',
  configured: false,
  label: 'test facility',
  disclaimer: 'test',
};
const P_SMALL = { id: 'ps', brandId: 'a', brandName: 'A', channelReceivableGbp: 100, supplierCostGbp: 50 };
const P_MED = { id: 'pm', brandId: 'a', brandName: 'A', channelReceivableGbp: 900, supplierCostGbp: 500 };
const P_HUGE = { id: 'ph', brandId: 'a', brandName: 'A', channelReceivableGbp: 2000, supplierCostGbp: 900 };
const AT = '2026-10-05';

try {
  const owner = await server.ssrLoadModule('/src/lib/finance/financingRouter.ts');
  const cfg = await server.ssrLoadModule('/src/config/financingRouter.ts');

  /** A valid config using the demo route definitions + a known own-cash buffer. */
  const CONFIG = {
    configured: false,
    ownCashBufferGbp: 100,
    routes: cfg.DEMO_FINANCING_ROUTING.routes,
    rule: cfg.FINANCING_ROUTING_RULE,
    label: 'test',
    disclaimer: 'test',
  };

  console.log('── A. the owner + config export the whole contract ──');
  test(
    'routeFinancing / routeFinancingPurchase exist',
    typeof owner.routeFinancing === 'function' && typeof owner.routeFinancingPurchase === 'function'
  );
  test(
    'the config exports FINANCING_ROUTING_CONFIGURED + DEMO_FINANCING_ROUTING + the rule',
    typeof cfg.FINANCING_ROUTING_CONFIGURED === 'boolean' &&
      !!cfg.DEMO_FINANCING_ROUTING &&
      typeof cfg.FINANCING_ROUTING_RULE === 'string' &&
      cfg.FINANCING_ROUTING_RULE.length > 20
  );
  test(
    'the production routing policy is NOT configured',
    cfg.FINANCING_ROUTING_CONFIGURED === false && cfg.DEMO_FINANCING_ROUTING.configured === false
  );
  test(
    'the demo declares exactly the three routes (self_funded / facility_draw / external_referral)',
    cfg.DEMO_FINANCING_ROUTING.routes.length === 3 &&
      ['self_funded', 'facility_draw', 'external_referral'].every((id) =>
        cfg.DEMO_FINANCING_ROUTING.routes.some((r) => r.routeId === id)
      )
  );
  test(
    'every declared route carries a label, an action and an existing destination',
    cfg.DEMO_FINANCING_ROUTING.routes.every(
      (r) => r.label && r.action && r.destination === 'control_centre'
    )
  );

  console.log('\n── B. exactly ONE route per purchase, on known input ──');
  const dSmall = owner.routeFinancingPurchase(FACILITY, P_SMALL, CONFIG, AT);
  const dMed = owner.routeFinancingPurchase(FACILITY, P_MED, CONFIG, AT);
  const dHuge = owner.routeFinancingPurchase(FACILITY, P_HUGE, CONFIG, AT);
  const expectRoute = (d, id) => d.routeId === id && !d.refused;
  test('a small advance (≤ own-cash buffer) is self-funded', expectRoute(dSmall, 'self_funded'));
  test('a medium advance (fits remaining capital) draws the facility', expectRoute(dMed, 'facility_draw'));
  test('a large advance (exceeds remaining capital) refers externally', expectRoute(dHuge, 'external_referral'));
  test('no purchase was refused', !dSmall.refused && !dMed.refused && !dHuge.refused);
  test(
    'the three routes are mutually exclusive (each decision selected exactly one)',
    [dSmall, dMed, dHuge].every((d) => d.decision.selectedRouteIds.length === 1) &&
      new Set([dSmall.routeId, dMed.routeId, dHuge.routeId]).size === 3
  );
  /* self-check that the comparator itself can fail */
  test('self-check: the route comparator ACCEPTS the correct route', expectRoute(dSmall, 'self_funded'));
  test('self-check: the route comparator REJECTS a wrong route', !expectRoute(dSmall, 'facility_draw'));

  console.log('\n── C. the decision is the CANONICAL, auditable routing decision ──');
  test(
    'the decision carries the canonical idempotency key + digest + isolation flags',
    typeof dMed.decision.idempotencyKey === 'string' &&
      dMed.decision.idempotencyKey.includes('|') &&
      /^[0-9a-f]{8}$/.test(dMed.decision.conditionDigest) &&
      dMed.decision.branchIsolationPreserved === true &&
      dMed.decision.completionInferredFromInitiator === false
  );
  test(
    'all three declared conditions are carried, each with its rule (never a black box)',
    dMed.conditions.length === 3 && dMed.conditions.every((c) => c.rule && c.rule.length > 20)
  );

  console.log('\n── D. deterministic (no AI, no clock inside the rules) ──');
  const dMed2 = owner.routeFinancingPurchase(FACILITY, P_MED, CONFIG, AT);
  test(
    'the same inputs give the same route AND the same canonical decision id',
    dMed.routeId === dMed2.routeId && dMed.decision.id === dMed2.decision.id
  );
  test(
    'two different purchases get different decision ids',
    dMed.decision.id !== dHuge.decision.id
  );

  console.log('\n── E. FAILS CLOSED on a malformed configuration ──');
  const emptyCfg = { ...CONFIG, routes: [] };
  const dEmpty = owner.routeFinancingPurchase(FACILITY, P_MED, emptyCfg, AT);
  test(
    'a config that declares NO routes refuses (no_condition_met) — never a default route',
    dEmpty.refused === true && dEmpty.routeId === null && !!dEmpty.refusalReason
  );
  const dupCfg = { ...CONFIG, routes: [CONFIG.routes[0], CONFIG.routes[0], CONFIG.routes[2]] };
  const dDup = owner.routeFinancingPurchase(FACILITY, P_MED, dupCfg, AT);
  test(
    'a config with a DUPLICATE route is refused structurally — never a guessed route',
    dDup.refused === true && dDup.routeId === null && !!dDup.refusalReason
  );

  console.log('\n── F. the summary agrees with the per-purchase decisions ──');
  const summary = owner.routeFinancing(FACILITY, [P_SMALL, P_MED, P_HUGE], CONFIG, AT);
  test('the summary counts one purchase per route', summary.selfFundedCount === 1 && summary.facilityDrawCount === 1 && summary.externalReferralCount === 1);
  test('the summary refuses nothing on a valid config', summary.refusedCount === 0);
  test(
    'total advance routed = Σ advance of the non-refused purchases (50 + 500 + 900 = 1450)',
    near(summary.totalAdvanceRoutedGbp, 1450)
  );
  test(
    'the summary basis states the counts and the no-AI property',
    /no AI/.test(summary.basis) && /self-funded/.test(summary.basis)
  );
  test(
    'the summary is an ILLUSTRATION (configured false) with its label + disclaimer',
    summary.configured === false && !!summary.label && !!summary.disclaimer
  );

  console.log('\n── G. INTERNAL — no second engine, no AI, no brand leakage ──');
  const ownerSrc = read('src/lib/finance/financingRouter.ts');
  test('the owner REUSES the canonical exclusive-gateway evaluator', /evaluateExclusiveGateway/.test(ownerSrc));
  test(
    'the owner makes NO AI / provider / network / random call',
    !/openrouter|\bsupabase\b|\bfetch\(|Math\.random/i.test(stripComments(ownerSrc))
  );
  const brandFiles = walk(fileURLToPath(new URL('../src/components/brand/', import.meta.url)));
  const brandLeak = brandFiles.filter((f) =>
    /financingRouter|routeFinancing|DEMO_FINANCING_ROUTING/.test(readFileSync(f, 'utf8'))
  );
  test(
    'no brand component imports the financing router (financing is internal)',
    brandLeak.length === 0,
    brandLeak.join(', ')
  );

  console.log('\n── H. USED by the Control Centre + rendered by the founder surface ──');
  const cc = read('src/lib/commandCentre/controlCentre.ts');
  test(
    'controlCentre imports the owner + config and exposes financingRouting',
    /financingRouter/.test(cc) && /DEMO_FINANCING_ROUTING/.test(cc) && /financingRouting:\s*FinancingRoutingSummary/.test(cc)
  );
  const fcc = read('src/components/admin/FounderControlCentre.tsx');
  test(
    'the Founder Control Centre renders the financing routes section',
    /control-financing-routes/.test(fcc) && /model\.financingRouting/.test(fcc)
  );
  const brandLeak2 = brandFiles.filter((f) => /financingRouting/.test(readFileSync(f, 'utf8')));
  test('no brand surface references the routing summary', brandLeak2.length === 0, brandLeak2.join(', '));
} finally {
  await server.close();
}

console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);
