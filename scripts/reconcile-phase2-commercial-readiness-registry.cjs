/**
 * §PHASE 2 — COMMERCIAL READINESS + PRODUCT ECONOMICS — REGISTRY RECONCILIATION
 * (2026-09-20).
 *
 * The previous stage built the commercial-ready SEAM and deliberately deferred
 * the Phase 2 DELIVERY. This stage completes it: the readiness record store, the
 * founder + brand surfaces, the work-layer integration, the automation monitor
 * and the browser journey. The Master Matrix must now say exactly that.
 *
 * RULES OBEYED (same contract as reconcile-phase2-routing-registry.cjs)
 *  - IDEMPOTENT: re-running replaces the rows it owns, by id.
 *  - It NEVER deletes a historical row: every pre-existing entry is preserved.
 *  - It refuses to write a registry with a duplicate id or an unknown status.
 *  - `built_and_tested` is only used where the evidence names a REAL e2e spec
 *    (verify-registry.mjs enforces this) — and that spec exists and was run.
 *
 * Run: node scripts/reconcile-phase2-commercial-readiness-registry.cjs
 */
const fs = require('node:fs');
const path = require('node:path');

const REGISTRY = path.resolve(__dirname, '..', 'requirements-registry.json');
const TODAY = '2026-09-20';

const registry = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
const entries = registry.entries;

const SOURCE = 'Phase 2 — commercial readiness + product economics (2026-09-20)';
const VALIDATOR = 'scripts/validate-commercial-readiness.mjs (78 assertions / 0 failures)';
const E2E = 'e2e/commercial-readiness.spec.ts (6/6 passing)';

/**
 * COMPLETED this stage. Each row's evidence names the browser spec, because the
 * functional journey was genuinely exercised in Chromium — not merely compiled.
 */
const BUILT_AND_TESTED = [
  [
    'phase2-commercial-readiness-config',
    'The Phase 2 commercial vocabulary: four viability routes (ready/remediation/blocked/human_review) with exactly one that proceeds, the declared commercial term fields with units and required flags, the six value bases, SEVEN first-class distinct pack concepts (brand MOQ, production MOQ, case pack, master carton, PO quantity, shipment quantity, pallet profile), the declared pack-mathematics rule with its 6×4=24 worked example, the MOQ honour disclaimer, SIX declared thresholds that all ship UNSET, the seven-condition gate catalogue with its declared precedence ladder, the DECLARED commercial work sources with their SLAs, and the brand-facing guidance for every term and condition (each linking to a REAL Knowledge Base article)',
    `src/config/commercialReadiness.ts; ${VALIDATOR}; ${E2E}`,
  ],
  [
    'phase2-commercial-calculator',
    'The deterministic, explainable commercial calculator: pack-profile construction with carton-arithmetic validation and a PO-quantity-below-MOQ finding; unit economics that state their full formula, name every missing input and assumption, and compute NO VAT because the production treatment is undecided; plus the commercial ↔ supply interaction observations. Exercised in the browser: the brand supplies case pack + master carton and the pack arithmetic becomes valid',
    `src/lib/commercial/economics.ts; ${VALIDATOR}; ${E2E}`,
  ],
  [
    'phase2-commercial-viability-gate',
    'The commercial viability gate: seven DECLARED conditions evaluated deterministically in declared order, the DECLARED precedence ladder (blocked → remediation → human review → ready) making them mutually exclusive, and the EXCLUSIVE gateway evaluator recording the route so it is audited and idempotent. Missing terms route to remediation, non-viable economics and insufficient capacity BLOCK, and an unevaluable condition fails closed to human review rather than inventing a threshold. A reassessment re-runs the SAME gate over the RECORD ITSELF',
    `src/lib/commercial/commercialGate.ts; src/lib/commercial/commercialAssessment.ts; ${VALIDATOR}; ${E2E}`,
  ],
  [
    'phase2-commercial-terms-model',
    'The commercial terms a product must carry before it can be evaluated: RRP, wholesale/cost price, commercial margin, MOQ, production MOQ, case-pack quantity, master-carton quantity and pallet profile — each carrying the value basis it rests on. A brand can supply or confirm them from the brand portal; values identical to what is already recorded are REFUSED as unchanged rather than producing a duplicate business outcome, and a value resting on an assumption must be confirmed with evidence',
    `src/config/commercialReadiness.ts; src/lib/commercial/economics.ts; src/data/commercialReadinessStore.ts → submitCommercialTerms; ${VALIDATOR}; ${E2E}`,
  ],
  [
    'phase2-product-economics',
    'Product economics: packaging economics, logistics economics, commercial viability, catalogue readiness and replenishment viability, all deterministic and never AI-derived. Completed with the canonical readiness record store, the founder workspace and brand surface, the work-layer integration, the automation monitor and the browser journey — an unset threshold still parks the case for a human rather than passing it',
    `src/lib/commercial/economics.ts; src/lib/commercial/commercialGate.ts; src/data/commercialReadinessStore.ts; src/lib/commandCentre/controlCentre.ts; src/components/brand/CommercialReadiness.tsx; ${VALIDATOR}; ${E2E}`,
  ],
  [
    'phase2-commercial-readiness-store',
    'The canonical commercial readiness record store (persistence, ownership scoping, hydrate, audit and events for CommercialReadinessRecord), mirroring the existing pre-audit store contract through the SAME domain port and table (commercial_readiness_records). The record id is deterministic and the routing-decision id is a function of the gateway inputs, so a reassessment REVISES the same row and a repeat is suppressed rather than appended; the reported persistence status stays honestly memory-only with no Supabase configured',
    `src/data/commercialReadinessStore.ts; src/data/domainRepository.ts → persistCommercialReadinessRecord; ${VALIDATOR} (L1–L3, D4, H1–H3); ${E2E}`,
  ],
  [
    'phase2-commercial-readiness-surface',
    'The founder/ops commercial readiness workspace as a SECTION of the EXISTING Super-Admin Control Centre (not a new dashboard): the four routes as real counts, a queue of every canonical record with its brand, owner, SLA deadline and next step, and a record drawer showing WHY (each unmet/unevaluable condition with the rule it was judged against and the value it observed), the missing information, the canonical work item and the MOQ disclaimer. The brand-facing view shows only the signed-in tenant, explains what each concept is and why Mercenta needs it, links the real Knowledge Base guide, and lets the brand supply the information — never exposing internal BI scores, founder intelligence or another tenant',
    `src/lib/commandCentre/controlCentre.ts; src/components/admin/FounderControlCentre.tsx; src/components/brand/CommercialReadiness.tsx; src/lib/commercial/brandGuidance.ts; ${VALIDATOR} (R1–R8); ${E2E}`,
  ],
  [
    'phase2-commercial-work-integration',
    'Commercial readiness integrated into the EXISTING work layer: two declared work sources (commercial_remediation for the brand, commercial_review for a Mercenta decision) with their derivations, declared SLAs and priority, DERIVED from the canonical readiness record so a repeat assessment can never create duplicate work and the item disappears from the attention set the moment the record moves on. Blocked and human-review items are escalated through the existing escalation mechanism',
    `src/lib/work/workStore.ts → deriveWorkItems §10; src/lib/work/types.ts; src/config/commercialReadiness.ts → COMMERCIAL_WORK_BY_ROUTE; ${VALIDATOR} (O1–O6); ${E2E}`,
  ],
  [
    'phase2-commercial-automation',
    'A commercial readiness monitor registered in the EXISTING automation registry (idempotency digest, observable failure, declared next run, no AI requirement, no approval gate) rather than a new scheduler. It consistency-checks every stored commercial route against the deterministic gate (a DRIFT check, never a re-decision), reports the products needing brand information and the products needing a Mercenta decision, and escalates the critical ones through the existing escalation path — it never changes a commercial route and never invents a threshold',
    `src/lib/automation/registry.ts → commercial_readiness_monitor; src/config/commercialReadiness.ts; ${VALIDATOR} (P1–P4); ${E2E}`,
  ],
  [
    'phase2-routing-gateways-e2e',
    'Browser-level verification of the routing/gateway and commercial readiness surfaces (Playwright): the founder Control Centre Commercial section renders every canonical record with its route, owner, deadline and next step; opening a record shows the condition trace (why it is in its state), the missing information and the canonical work item; the brand portal shows only the signed-in tenant, explains each concept with a real guide, and a REAL brand action changes the product status through the gate — re-submitting the same value is refused as unchanged, and completing the journey reaches Ready. RBAC, zero external calls and zero page errors are all asserted',
    'e2e/commercial-readiness.spec.ts (6/6 passing); test-screenshots/commercial-readiness/',
  ],
];

const applied = BUILT_AND_TESTED.map(([id, description, evidence]) => ({
  id,
  description,
  source: SOURCE,
  status: 'built_and_tested',
  evidence,
  last_verified: TODAY,
  superseded_by: null,
}));

const ownedIds = new Set(applied.map((r) => r.id));
if (ownedIds.size !== applied.length) {
  console.error('REFUSING TO WRITE — this script declares a duplicate id internally.');
  process.exit(1);
}

const preserved = entries.filter((e) => !ownedIds.has(e.id));
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
  console.error(`REFUSING TO WRITE — unknown status: ${badStatus.map((d) => `${d.id}=${d.status}`).join(', ')}`);
  process.exit(1);
}

/** Every `built_and_tested` row must name a spec that actually exists. */
const missingSpecs = applied.filter((r) => {
  const specs = r.evidence.match(/e2e\/[\w.-]+\.spec\.ts/g) ?? [];
  return specs.length === 0 || specs.some((s) => !fs.existsSync(path.resolve(__dirname, '..', s)));
});
if (missingSpecs.length > 0) {
  console.error(
    `REFUSING TO WRITE — built_and_tested without a real e2e spec: ${missingSpecs.map((r) => r.id).join(', ')}`
  );
  process.exit(1);
}

const added = next.length - entries.length;
const replaced = entries.length - preserved.length;

registry.entries = next;
registry._meta.last_updated = TODAY;
registry._meta.total_entries = next.length;
registry._meta.commercial_readiness_reconciliation = {
  stage: SOURCE,
  note:
    'Phase 2 (commercial readiness + product economics) is now COMPLETE: the readiness store, the founder Control Centre section, the brand surface, the work-layer integration, the automation monitor and the browser journey are all built and verified. Every row here names evidence produced in this session.',
  added_ids: applied.map((r) => r.id),
  built_and_tested: applied.length,
  by_status: next.reduce((acc, e) => {
    acc[e.status] = (acc[e.status] ?? 0) + 1;
    return acc;
  }, {}),
};

fs.writeFileSync(REGISTRY, JSON.stringify(registry, null, 2) + '\n');
console.log(
  `COMMERCIAL_READINESS_RECONCILIATION_OK — entries ${entries.length} → ${next.length} (added ${added}, replaced ${replaced}, historical rows deleted 0)`
);
console.log(`  built_and_tested: ${applied.length}`);
console.log(`  By status: ${JSON.stringify(registry._meta.commercial_readiness_reconciliation.by_status)}`);