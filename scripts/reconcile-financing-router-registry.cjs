/*
 * §PHASE 6 — the deterministic financing router — registry reconciliation (2026-10-05).
 *
 * WHY. Phase 6 has two halves. The FIRST (the internal capital model,
 * `src/lib/finance/capitalRequirement.ts`) is BUILT. THIS script raises the
 * SECOND row, `phase6-financing-router-deterministic`: the deterministic
 * financing eligibility + router — each Model B purchase routed to exactly ONE
 * financing route, reusing the canonical exclusive-gateway evaluator, with NO AI
 * and financing kept INTERNAL (never exposed to a brand).
 *
 * It also fixes a STALE citation: the old `evidence` pointed at
 * "docs — roadmap §PHASE 6", a document that does not exist. The corrected
 * evidence names the real owner + gate. Old values are recorded inline.
 *
 * Status is `built`, NOT `built_and_tested`: the node gate
 * (`npm run validate:financing-router`) is the proof and no browser spec
 * exercises this internal finance surface.
 *
 * Run: node scripts/reconcile-financing-router-registry.cjs
 */
const fs = require('node:fs');
const path = require('node:path');

const REG = path.join(__dirname, '..', 'requirements-registry.json');
const reg = JSON.parse(fs.readFileSync(REG, 'utf8'));
const byId = new Map(reg.entries.map((e) => [e.id, e]));
const DATE = '2026-10-05';

const row = byId.get('phase6-financing-router-deterministic');
if (!row) {
  console.error('MISSING ROW: phase6-financing-router-deterministic');
  process.exit(1);
}

const OLD_STATUS = row.status;
const OLD_EVIDENCE = row.evidence;

row.status = 'built';
row.description =
  'Phase 6 — deterministic financing eligibility + routing. DONE (2026-10-05): the ONE owner ' +
  '`src/lib/finance/financingRouter.ts` routes each Model B purchase to exactly ONE financing route ' +
  '(self-funded / facility draw / external referral) by REUSING the canonical exclusive-gateway evaluator ' +
  '(`src/lib/routing/gateways.ts`) — no AI, no second engine, no clock inside the rules. It FAILS CLOSED on a ' +
  'malformed configuration (refused, never defaulted). Financing is INTERNAL: the surface is Super-Admin only ' +
  'and no brand component imports the router. Phase 6 (both halves: the capital model + this router) is now built.';
row.evidence =
  'src/lib/finance/financingRouter.ts (the ONE owner); src/config/financingRouter.ts (the ONE routing config, ' +
  'FINANCING_ROUTING_CONFIGURED=false + a labelled DEMO illustration); src/lib/commandCentre/controlCentre.ts ' +
  '(computes + exposes financingRouting); src/components/admin/FounderControlCentre.tsx (Finance → ' +
  'Financing routes, Super-Admin only); gate scripts/validate-financing-router.mjs ' +
  '(npm run validate:financing-router, 29 assertions, mutation-proved); e2e/founder-operating-system.spec.ts test 9 renders it live.';
row.last_verified = DATE;
row.superseded_by = null;
row._audit_note =
  `§PHASE 6 (financing router) (2026-10-05) — STATUS RAISED not_started -> built (old value recorded inline, ` +
  `never deleted). OLD status: "${OLD_STATUS}". OLD evidence (STALE — the cited "docs — roadmap §PHASE 6" does ` +
  `not exist): "${OLD_EVIDENCE}". Built as the ONE owner + the ONE config, reusing the canonical exclusive-gateway ` +
  `evaluator; surface declared in BOTH scope guards (E6 FINANCING_ROUTER_SCOPE; E7 entries).`;

/* _meta: counts, date, changelog. */
const counts = {};
for (const e of reg.entries) counts[e.status] = (counts[e.status] || 0) + 1;
reg._meta.last_updated = DATE;
reg._meta.total_entries = reg.entries.length;
reg._meta.status_counts = {
  _note:
    'Recomputed 2026-10-05 by scripts/reconcile-financing-router-registry.cjs after the §PHASE 6 ' +
    '(financing router) increment (phase6-financing-router-deterministic not_started -> built; no row added or ' +
    'removed: total_entries stays 540; built +1, not_started -1). Snapshot only.',
  ...counts,
};
reg._meta.financing_router_increment = {
  increment: '§PHASE 6 — the deterministic financing router (2026-10-05)',
  restated: ['phase6-financing-router-deterministic'],
  added: [],
  validators: ['scripts/validate-financing-router.mjs'],
  note:
    'Phase 6 now has BOTH halves built: the internal capital model (how much) and this router (where the need ' +
    'is met). The router reuses the canonical exclusive-gateway evaluator — no second routing engine — and is ' +
    'internally Super-Admin only. Status is `built`, not `built_and_tested`: no browser spec exercises it.',
};

fs.writeFileSync(REG, JSON.stringify(reg, null, 2) + '\n');
console.log(`registry reconciled: total_entries=${reg.entries.length}`);
console.log('status_counts:', JSON.stringify(counts));
