/**
 * §S2a — BRAND CASE WORKFLOW + KB SUFFICIENCY — REGISTRY RECONCILIATION (2026-09-20).
 *
 * Records, in the granular Master Matrix (`requirements-registry.json`), exactly
 * what increment S2a delivered and what it DISCOVERED — because the standing
 * contract forbids silently dropping discovered work.
 *
 * RULES OBEYED (identical to the other reconcile-*.cjs scripts)
 *  - IDEMPOTENT: re-running replaces the rows it owns, by id.
 *  - It NEVER deletes a historical row.
 *  - It refuses to write a registry with a duplicate id or an unknown status.
 *  - `built_and_tested` is only used where the evidence names a REAL e2e spec
 *    that exists on disk AND was executed in this session.
 *
 * Run: node scripts/reconcile-s2a-case-workflow-registry.cjs
 */
const fs = require('node:fs');
const path = require('node:path');

const REGISTRY = path.resolve(__dirname, '..', 'requirements-registry.json');
const TODAY = '2026-09-20';
const SOURCE = 'S2a — canonical brand case surface + KB sufficiency evaluator + tenant-safe relevant-data lookup (2026-09-20)';

const registry = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
const entries = registry.entries;

/** COMPLETED + browser-verified this increment. */
const BUILT_AND_TESTED = [
  [
    's2a-kb-sufficiency-evaluator',
    'The Knowledge Base sufficiency evaluator required by the canonical case model (brief §6): given a case it deterministically decides `internally_resolvable` vs `requires_founder_review` vs `not_applicable`. Fail-closed on an unmapped/absent category, an unresolvable reference, a required-but-absent anchor, a retail-channel topic, and a category with no matching Knowledge Base article. Pure: no clock, no randomness, no network, no mutation',
    'scripts/validate-kb-sufficiency.mjs (37 assertions / 0 failures / 0 network calls, exit 0); e2e/brand-case-workflow.spec.ts (3 tests, 3 passed)',
  ],
  [
    's2a-case-relevant-data-lookup',
    'The relevant-data/context lookup for a case: the case related object (purchase order, shipment, deduction, payment, compliance document) is resolved inside the case OWN tenant. A reference belonging to ANOTHER tenant is refused, reported as cross-tenant, and leaks no other-tenant identifier',
    'scripts/validate-kb-sufficiency.mjs (cross-tenant refusal + no-leak assertions); e2e/brand-case-workflow.spec.ts (test 3 tenant isolation)',
  ],
  [
    's2a-brand-case-surface',
    'The brand-facing case surface that was missing entirely: a brand can open a case, link a record it owns, read the Knowledge Base guidance for the category, see the same sufficiency verdict the reviewer will see, and follow its own cases (status, Mercenta resolution, retail-channel response labelled simulated). New brand nav view `cases` (19th brand view)',
    'e2e/brand-case-workflow.spec.ts (3 tests, 3 passed: fail-closed gate → own-record resolution; full chain; cross-tenant refusal)',
  ],
  [
    's2a-case-response-resolution-controls',
    'The case-completion controls the canonical workflow requires: the operator records the retail channel response AS RECEIVED (human-entered — the platform never generates one), and Mercenta resolves the case with a note the brand can read. Closes the gap where the domain functions existed but no surface could reach them',
    'e2e/brand-case-workflow.spec.ts (test 2: escalate → record response → resolve → brand sees resolution)',
  ],
  [
    's2a-card-data-attribute-passthrough',
    'Confirmed defect fixed at the primitive: the shared `Card` component did not forward `data-state`/`data-testid`, so every such attribute written on a Card was silently dropped (including the pre-existing `data-state="helpdesk-cases-panel"`). Now declared explicitly and forwarded to the DOM — the same convention `Button` already documents',
    'src/components/ui.tsx; e2e/brand-case-workflow.spec.ts (all 3 tests depend on Card data-state hooks, so they genuinely fail on the pre-fix code)',
  ],
];

/** COMPLETED documentation this increment (no browser spec applies). */
const BUILT = [
  [
    's2a-master-feature-function-matrix',
    'The Level-1 canonical document required by the brief §2/§3, which was MISSING from the repository: a repository-derived whole-platform feature/function matrix (34 sections, 25 domains, 240 stable ids) with the status vocabulary, the 26 mandated dimensions, a retained contradiction register, the evidence-blocked register, and a numbered gap register with an owning increment for every row',
    'docs/MERCENTA_MASTER_FEATURE_FUNCTION_MATRIX.md (729 lines, created this increment)',
  ],
  [
    's2a-e2e-matrix-reconciliation',
    'The E2E coverage matrix reconciled against the actual repository: the stale S0 inventory (68 specs / 354 declarations) corrected to 66 specs / 358 declarations / 4 skipped, brand views corrected 18 → 19, gap row 13 closed, two new verified chains added, and the object-resolution gap re-owned to S3',
    'docs/WHOLE_PLATFORM_E2E_COVERAGE_MATRIX.md (updated this increment)',
  ],
];

/** Work DISCOVERED by this increment — recorded, never dropped. */
const DISCOVERED = [
  [
    'discovered-whole-platform-object-resolution',
    'Whole-platform object resolution (Amazon event/data → Amazon object → Mercenta object → brand → tenant) does not exist: grep finds no resolver module, no `externalObjectId`/`amazonObjectId` field, and no unresolved-ownership Founder queue. Per-domain tenant scoping IS correct, so this is a genuine new architecture increment rather than a refactor. Deliberately NOT half-built: a partial resolver used by some modules only would be worse than the honest gap',
    'not_started',
    'docs/MERCENTA_MASTER_FEATURE_FUNCTION_MATRIX.md §25 (D21) + §32 row 1; repo-wide grep for resolveObject/resolveAmazonObject/ownershipResolution/exceptionQueue = 0 hits. Owner: S2a (roadmap)',
  ],
  [
    'discovered-payout-rail-default-contradiction',
    'Founder decision T-1 (Payoneer is the canonical PRIMARY/default account; Wise secondary) is DECIDED BUT NOT APPLIED. `src/config/payouts.ts` still declares the inverse (`DEFAULT_PAYOUT_RAIL = "wise"`), as does `.clinerules/mercenta-business-model.md`. S2a deliberately did NOT change payout arithmetic — the contradiction is retained explicitly and owned by S11',
    'not_started',
    'docs/MERCENTA_MASTER_FEATURE_FUNCTION_MATRIX.md §30 (7.1); src/config/payouts.ts:60-64; docs/AMAZON_RECONCILIATION_STATUS.md §4 T-1. Owner: S11',
  ],
  [
    'discovered-logistics-hub',
    'The Logistics Hub (the Brand/Admin logistics workspace that replaces the "Carrier Portal" concept) is not implemented, and provider eligibility is currently a hardcoded lane rule (`international → DHL`, `UK domestic → Palletline`) instead of deriving from brand location, origin, destination, route, PO context, freight terms, configured provider capabilities and provider state',
    'not_started',
    'docs/MERCENTA_MASTER_FEATURE_FUNCTION_MATRIX.md §14 (D10-06, D10-10); src/config/shipping.ts:9-10,37-38; src/lib/shipping/carrierRouting.ts:8-9,130. Owner: Logistics Hub increment',
  ],
  [
    'discovered-logistics-map-engine',
    'The Logistics Map Engine (LIVE VERIFIED / SIMULATED / AMBIENT, with clickable markers and real Mercenta cargo distinguishable from ambient transport) does not exist. No external flight/vessel tracking provider is licensed or activated, and no availability may be claimed',
    'not_started',
    'docs/MERCENTA_MASTER_FEATURE_FUNCTION_MATRIX.md §32 row 3 (D10-11). Owner: S10',
  ],
  [
    'discovered-credential-vault',
    'The durable credential architecture required by T-7 (Super Admin entry, replacement, secure persistence, masked readback, validation, enable/disable, provider-specific fields) is not implemented: credentials currently live in an in-memory Map in the integration layer, which is not sufficient for production',
    'not_started',
    'docs/MERCENTA_MASTER_FEATURE_FUNCTION_MATRIX.md §20 (D16-05); src/integrations/connections.ts + src/integrations/types.ts. Owner: S2c',
  ],
  [
    'discovered-backorder-fail-closed-gate',
    '`isBackOrderAllowed` does not exist anywhere in the repository (grep = 0 hits), so backorder is offered unconditionally — an unsupported claim against Amazon truth. The fail-closed gate (true = may offer; false/missing/unknown = do not offer), the `on_hold` state, ack completeness, the ack↔invoice match rule and the rejected-line re-acknowledgement guard are all outstanding',
    'not_started',
    'docs/MERCENTA_MASTER_FEATURE_FUNCTION_MATRIX.md §13 (D09-05…D09-09); AV-006…AV-010b. Owner: S5',
  ],
  [
    'discovered-routing-request-removal',
    'The Brand-facing Routing Request mechanic must be REMOVED/reconciled (T-6) — not relabelled — and the unsupported "10am Pacific day before ship window closes" claim must go, while `mercenta_hub` must become an optional route rather than a mandatory universal stage',
    'not_started',
    'docs/MERCENTA_MASTER_FEATURE_FUNCTION_MATRIX.md §13 (D09-11…D09-13); src/types.ts:1129; src/components/shared/RoutingRequest.tsx; AV-013/AV-027. Owner: S4',
  ],
  [
    'discovered-full-suite-not-rerun',
    'The full 358-declaration Playwright suite was NOT re-run in S2a. 50 tests across the 6 affected suites were run (50 passed / 0 failed). Recorded as a coverage gap, not a functional defect',
    'not_started',
    'docs/WHOLE_PLATFORM_E2E_COVERAGE_MATRIX.md §16 row 18 (updated this increment). Owner: S12',
  ],
];

const applied = [
  ...BUILT_AND_TESTED.map(([id, description, evidence]) => ({ id, description, evidence, status: 'built_and_tested' })),
  ...BUILT.map(([id, description, evidence]) => ({ id, description, evidence, status: 'built' })),
  ...DISCOVERED.map(([id, description, status, evidence]) => ({ id, description, evidence, status })),
].map((r) => ({
  ...r,
  source: SOURCE,
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
  if (r.status !== 'built_and_tested') return false;
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
registry._meta.s2a_case_workflow = {
  stage: SOURCE,
  note:
    'Increment S2a delivered the brand-facing case surface, the Knowledge Base sufficiency evaluator and the tenant-safe relevant-data lookup that the canonical case model requires, and fixed one confirmed defect in the shared Card primitive. The work DISCOVERED by this pass (object resolution, the payout-rail contradiction, the Logistics Hub, the map engine, the credential vault, the backorder fail-closed gate, the routing re-model and the un-rerun full suite) is recorded as its own rows with an owning increment rather than dropped. No historical row was deleted.',
  added_ids: applied.map((r) => r.id),
  built_and_tested: BUILT_AND_TESTED.length,
  built: BUILT.length,
  discovered: DISCOVERED.length,
  by_status: next.reduce((acc, e) => {
    acc[e.status] = (acc[e.status] ?? 0) + 1;
    return acc;
  }, {}),
};

fs.writeFileSync(REGISTRY, JSON.stringify(registry, null, 2) + '\n');
console.log(
  `S2A_CASE_WORKFLOW_OK — entries ${entries.length} → ${next.length} (added ${added}, replaced ${replaced}, historical rows deleted 0)`
);
console.log(`  built_and_tested: ${BUILT_AND_TESTED.length} · built: ${BUILT.length} · discovered: ${DISCOVERED.length}`);
console.log(`  By status: ${JSON.stringify(registry._meta.s2a_case_workflow.by_status)}`);