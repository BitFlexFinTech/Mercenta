/**
 * §PHASE 2 — EXPLICIT WORKFLOW ROUTING / GATEWAY ARCHITECTURE — REGISTRY
 * RECONCILIATION (2026-09-19).
 *
 * This stage built the universal routing architecture and the Phase 2
 * commercial-ready seam. It did NOT complete the Phase 2 delivery, which the
 * founder deliberately held back for review. The Master Matrix must say exactly
 * that — what is built and tested, what is in progress, and what remains.
 *
 * RULES OBEYED (same contract as reconcile-roadmap-phase1-registry.cjs)
 *  - IDEMPOTENT: re-running replaces the rows it owns, by id.
 *  - It NEVER deletes a historical row: every pre-existing entry is preserved.
 *  - It refuses to write a registry with a duplicate id or an unknown status.
 *  - A `built_and_tested` row names the SAME-session evidence that proves it.
 *  - A not-started row describes WORK, never a fact.
 *
 * Run: node scripts/reconcile-phase2-routing-registry.cjs
 */
const fs = require('node:fs');
const path = require('node:path');

const REGISTRY = path.resolve(__dirname, '..', 'requirements-registry.json');
const TODAY = '2026-09-19';

const registry = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
const entries = registry.entries;

const SOURCE = 'Phase 2 — explicit workflow routing / gateway architecture (2026-09-19)';

/* ── 1. BUILT + TESTED this stage (evidence produced in this session) ────── */

const BUILT = [
  [
    'phase2-routing-gateway-vocabulary',
    'The explicit routing vocabulary: three gateway kinds (exclusive/XOR, parallel/AND, inclusive/OR) with declared selection semantics, seven branch outcomes, twelve refusal reasons each mapped to an intentional disposition, four join policies, the ten required routing semantics catalogue and the declared idempotency-key format',
    'src/config/routing.ts; scripts/validate-routing-gateways.mjs (101 assertions / 0 failures)',
  ],
  [
    'phase2-routing-exclusive-gateway',
    'Exclusive gateway (XOR): exactly one route is selected; it REFUSES rather than defaulting when no condition holds, when more than one holds (ambiguity), when a condition cannot be evaluated (fail-closed), or when the gateway definition itself is malformed (undeclared route, unrouted condition, duplicate route, contradiction). A refusal is never reported as terminal completion',
    'src/lib/routing/gateways.ts → evaluateExclusiveGateway; validated in the XOR section',
  ],
  [
    'phase2-routing-parallel-gateway',
    'Parallel gateway (AND): every branch is evaluated independently with its own outcome; a failing branch never erases a sibling branch success; a branch whose sequential prerequisite is unmet does not run and says so',
    'src/lib/routing/gateways.ts → evaluateParallelGateway; validated in the AND branch-isolation section',
  ],
  [
    'phase2-routing-inclusive-gateway',
    'Inclusive gateway (OR): the selected subset is exactly the set of conditions that held — never exactly-one and never always-all; an explicitly-false condition marks its route not_applicable with the reason; nothing applicable refuses',
    'src/lib/routing/gateways.ts → evaluateInclusiveGateway; validated in the OR section',
  ],
  [
    'phase2-routing-join-fan-in',
    'Fan-in/join with declared completion conditions (all / declared_subset / quorum / any), required vs optional branches, a declared quorum that is never invented, and explicit states (waiting/satisfied/failed/blocked_human_review). Completion is never inferred from the initiating operation, and timed-out or human-review branches never count',
    'src/lib/routing/gateways.ts → evaluateJoin; validated in the JOIN no-false-completion section',
  ],
  [
    'phase2-routing-sequential-event-compensation',
    'Sequential dependency (a dependent route does not proceed until its prerequisite positively reaches its required state), event-based routing (an event with no declared route is refused and surfaced) and compensation planning (a route with no declared compensation is routed to human review rather than ignored)',
    'src/lib/routing/gateways.ts → evaluateSequentialDependency / evaluateEventRouting / planCompensation',
  ],
  [
    'phase2-routing-idempotence-store',
    'The canonical routing decision store: deterministic decision ids and idempotency keys derived from the gateway inputs; a repeated identical evaluation is SUPPRESSED and reported (no second decision, no second audit entry, no second event), so retries, double-clicks, replays and scheduler re-runs cannot duplicate canonical state',
    'src/data/routingStore.ts; validated in the DETERMINISM + IDEMPOTENCE sections',
  ],
  [
    'phase2-routing-canonical-events',
    'Six canonical routing events added to the EXISTING event union with declared severities, plus optional tenant/idempotency/route/correlation/branch-outcome fields on the canonical event shape. A refusal, a failed branch and an incomplete join are IMPORTANT and cannot be silent',
    'src/lib/events/types.ts; src/data/routingStore.ts → emitRoutingEvents; validated in the EVENTS sections',
  ],
  [
    'phase2-routing-domain-table',
    'Routing decisions persist through the EXISTING domain persistence port (one additive routing_decisions table, one additive persistRoutingDecision method, hydrate extended) — no second database, no second store, with the persistence state reported honestly as memory-only when no Supabase is configured',
    'src/data/domainRepository.ts; validated in the DOMAIN PORT + persistence-status assertions',
  ],
  [
    'phase2-routing-tenant-isolation-audit',
    'Every routing decision carries explicit ownership (public session / ops / brand). Visibility is decided by ONE rule: a public session sees only its own, a brand sees only its own, ops sees all. Every decision is attributed in the canonical audit registry, including the reason a route was taken',
    'src/data/routingStore.ts → ownerMatchesRoutingScope / routeDecisionsForScope; validated in the TENANT + AUDIT sections',
  ],
  [
    'phase2-commercial-readiness-config',
    'The Phase 2 commercial vocabulary: four viability routes (ready/remediation/blocked/human_review) with exactly one that proceeds, the declared commercial term fields with units and required flags, the six value bases (actual/observed/calculated/estimated/assumed/unknown), SEVEN first-class distinct pack concepts (brand MOQ, production MOQ, case pack, master carton, PO quantity, shipment quantity, pallet profile), the declared pack-mathematics rule with its 6×4=24 worked example, the MOQ honour disclaimer, SIX declared thresholds that all ship UNSET, and the seven-condition gate catalogue with its declared precedence ladder',
    'src/config/commercialReadiness.ts; validated in the commercial-declarations assertions',
  ],
  [
    'phase2-commercial-calculator',
    'The deterministic, explainable commercial calculator: pack-profile construction with carton-arithmetic validation and a PO-quantity-below-MOQ finding; unit economics (retail − acquisition − variable costs = contribution) that states its full formula, names every missing input and assumption, and computes NO VAT because the production treatment is undecided; plus the §20 commercial ↔ supply interaction observations',
    'src/lib/commercial/economics.ts; validated by the pack-maths, PO-below-MOQ and unit-economics assertions',
  ],
  [
    'phase2-commercial-viability-gate',
    'The commercial viability gate: it evaluates the seven DECLARED conditions deterministically and in declared order, applies the DECLARED precedence ladder (blocked → remediation → human review → ready) so the exclusive gateway is given mutually exclusive conditions, and hands the result to the EXCLUSIVE gateway evaluator so the route is recorded, audited and idempotent. Missing terms route to remediation, non-viable economics and insufficient capacity BLOCK, and an unevaluable condition fails closed to human review rather than inventing a threshold',
    'src/lib/commercial/commercialGate.ts; validated across the ready / remediation / blocked / human-review cases',
  ],
];

/* ── 2. IN PROGRESS — the two Phase 2 roadmap rows, now PARTIALLY built ──── */

const IN_PROGRESS = [
  [
    'phase2-commercial-terms-model',
    'Phase 2 — the commercial terms a product must carry before it can be evaluated: RRP, wholesale/cost price, commercial margin, MOQ, production MOQ, case-pack quantity, master-carton quantity and pallet profile. PARTIAL: the vocabulary, the value-basis discipline, the seven distinct pack concepts and the validated carton arithmetic are BUILT and TESTED; the readiness record store, the surfaces and the work-layer integration are NOT started',
    'src/config/commercialReadiness.ts; src/lib/commercial/economics.ts; src/types.ts §PHASE 2 (CommercialTermValue, PackProfile)',
  ],
  [
    'phase2-product-economics',
    'Phase 2 — product economics: packaging economics, logistics economics, commercial viability, catalogue readiness and replenishment viability, all deterministic and never AI-derived. PARTIAL: the deterministic calculator, the supply-interaction observations and the commercial viability gate with its four routes are BUILT and TESTED; the readiness record store, the work/automation integration and the browser journey are NOT started',
    'src/lib/commercial/economics.ts; src/lib/commercial/commercialGate.ts; scripts/validate-routing-gateways.mjs',
  ],
];

/* ── 3. NOT STARTED — the delivery deliberately held back for founder review */

const NOT_STARTED = [
  [
    'phase2-commercial-readiness-store',
    'Phase 2 — the canonical commercial readiness record store (persistence, ownership scoping, hydrate, audit and events for CommercialReadinessRecord), mirroring the existing pre-audit store contract through the same domain port',
    'src/types.ts; CommercialReadinessRecord is declared in the ONE types file; the store is not built',
  ],
  [
    'phase2-commercial-readiness-surface',
    'Phase 2 — the founder/ops commercial readiness surface (extending the EXISTING Control Centre, not a new dashboard) and the brand-facing read-only readiness view that shows what to act on without exposing internal-only economics',
    'src/config/commercialReadiness.ts; the gate and its four routes exist, but no surface renders them yet',
  ],
  [
    'phase2-commercial-work-integration',
    'Phase 2 — commercial readiness integrated into the EXISTING work layer: declared work sources for remediation and human review with their derivations and deadlines, feeding the reminder-runner escalation',
    'src/lib/work/types.ts; no commercial work source is declared on the work layer yet',
  ],
  [
    'phase2-commercial-automation',
    'Phase 2 — a commercial readiness monitor registered in the EXISTING automation registry (idempotency digest, observable failure, human approval gate, declared next run) rather than a new scheduler',
    'src/lib/automation/registry.ts; no commercial monitor is registered yet',
  ],
  [
    'phase2-routing-gateways-e2e',
    'Phase 2 — browser-level verification of the routing/gateway and commercial readiness surfaces (Playwright), covering the routing outcome rendering, the condition trace and the refusal notice',
    'e2e/uk-market-fit.spec.ts; the Phase 2 browser journey does not exist yet',
  ],
];

/**
 * EVIDENCE HYGIENE — `verify-registry.mjs` resolves the FIRST path token in an
 * evidence string, so an evidence string must BEGIN with a real path. Some
 * annotations in this file were written before the path (`src/x.ts → fn`), which
 * makes the checker treat the whole first segment as a filename. This normaliser
 * moves the annotation AFTER the path; NO WORD IS DROPPED, and a row with no path
 * at all is left untouched so it is flagged honestly instead of faked.
 */
function cleanEvidence(evidence) {
  const match = evidence.match(/[\w./-]+\.(tsx|ts|mjs|json)/);
  if (!match) return evidence;
  const path = match[0];
  const at = evidence.indexOf(path);
  const before = evidence
    .slice(0, at)
    .replace(/^[\s;,-]+|[\s;,-]+$/g, '')
    .replace(/^→\s*/, '');
  const after = evidence
    .slice(at + path.length)
    .replace(/^[\s;,-]+/, '')
    .replace(/^→\s*/, '');
  const tail = [before, after].filter(Boolean).join(' ');
  return tail ? `${path}; ${tail}` : path;
}

const OURS = [
  ...BUILT.map(([id, description, evidence]) => ({
    id,
    description,
    source: SOURCE,
    // §HONEST STATUS: the repository's own vocabulary reserves `built_and_tested`
    // for a row whose evidence names a browser (e2e) spec — `verify-registry.mjs`
    // enforces exactly that. These modules are verified by the Node/vite validator
    // (101 assertions / 0 failures) plus tsc/lint/build, but the Phase 2 browser
    // journey is explicitly NOT written yet (see phase2-routing-gateways-e2e), so
    // `built` is the accurate status and no claim is overstated.
    status: 'built',
    evidence: cleanEvidence(evidence),
  })),
  ...IN_PROGRESS.map(([id, description, evidence]) => ({
    id,
    description,
    source: SOURCE,
    status: 'in_progress',
    evidence: cleanEvidence(evidence),
  })),
  ...NOT_STARTED.map(([id, description, evidence]) => ({
    id,
    description,
    source: SOURCE,
    status: 'not_started',
    evidence: cleanEvidence(evidence),
  })),
];

const ownedIds = new Set(OURS.map((r) => r.id));
if (ownedIds.size !== OURS.length) {
  console.error('REFUSING TO WRITE — this script declares a duplicate id internally.');
  process.exit(1);
}

/* Every pre-existing row is preserved untouched. Nothing is ever removed. */
const preserved = entries.filter((e) => !ownedIds.has(e.id));

const applied = OURS.map((r) => ({
  id: r.id,
  description: r.description,
  source: r.source,
  status: r.status,
  evidence: r.evidence,
  last_verified: TODAY,
  superseded_by: null,
}));

const next = [...preserved, ...applied];

const seen = new Set();
const duplicates = next.filter((e) => {
  if (seen.has(e.id)) return true;
  seen.add(e.id);
  return false;
});
if (duplicates.length > 0) {
  console.error(`REFUSING TO WRITE — duplicate ids: ${duplicates.map((d) => d.id).join(', ')}`);
  process.exit(1);
}

const ALLOWED_STATUS = new Set(registry._meta.status_enum);
const badStatus = next.filter((e) => !ALLOWED_STATUS.has(e.status));
if (badStatus.length > 0) {
  console.error(
    `REFUSING TO WRITE — unknown status: ${badStatus.map((d) => `${d.id}=${d.status}`).join(', ')}`
  );
  process.exit(1);
}

const added = next.length - entries.length;
const replaced = entries.length - preserved.length;

registry.entries = next;
registry._meta.last_updated = TODAY;
registry._meta.total_entries = next.length;
registry._meta.route_gateway_reconciliation = {
  stage: SOURCE,
  note:
    'The explicit routing/gateway architecture and the Phase 2 commercial-ready seam are BUILT and TESTED. The Phase 2 delivery (readiness store, surfaces, work/automation integration, browser journey) is deliberately NOT started, held back for founder review. Every row states which of those it is.',
  added_ids: OURS.map((r) => r.id),
  built: BUILT.length,
  in_progress: IN_PROGRESS.length,
  not_started: NOT_STARTED.length,
  by_status: next.reduce((acc, e) => {
    acc[e.status] = (acc[e.status] ?? 0) + 1;
    return acc;
  }, {}),
};

fs.writeFileSync(REGISTRY, JSON.stringify(registry, null, 2) + '\n');
console.log(
  `ROUTING_GATEWAYS_RECONCILIATION_OK — entries ${entries.length} → ${next.length} (added ${added}, replaced ${replaced}, historical rows deleted 0)`
);
console.log(`  built:            ${BUILT.length} (no e2e reference yet — see phase2-routing-gateways-e2e)`);
console.log(`  in_progress:      ${IN_PROGRESS.length}`);
console.log(`  not_started:      ${NOT_STARTED.length}`);
console.log(`  By status: ${JSON.stringify(registry._meta.route_gateway_reconciliation.by_status)}`);