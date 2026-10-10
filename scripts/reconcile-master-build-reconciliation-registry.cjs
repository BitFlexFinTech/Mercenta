/**
 * §S0/S1-a — MASTER BUILD RECONCILIATION — REGISTRY RECONCILIATION (2026-09-20).
 *
 * The master build brief (§29) required a repository-derived reconciliation pass
 * BEFORE any source change. That pass produced two new canonical documents and
 * one confirmed defect fix. This script records exactly that in the Master
 * Matrix — and, because the brief also requires that DISCOVERED WORK is never
 * silently dropped, it records the newly discovered gaps as their own rows
 * (blocked / not_started), owned by the increments that will close them.
 *
 * RULES OBEYED (same contract as the other reconcile-*.cjs scripts)
 *  - IDEMPOTENT: re-running replaces the rows it owns, by id.
 *  - It NEVER deletes a historical row: every pre-existing entry is preserved.
 *  - It refuses to write a registry with a duplicate id or an unknown status.
 *  - `built_and_tested` is only used where the evidence names a REAL e2e spec
 *    (verify-registry.mjs enforces this) — and that spec exists and was run.
 *
 * Run: node scripts/reconcile-master-build-reconciliation-registry.cjs
 */
const fs = require('node:fs');
const path = require('node:path');

const REGISTRY = path.resolve(__dirname, '..', 'requirements-registry.json');
const TODAY = '2026-09-20';

const registry = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
const entries = registry.entries;

const SOURCE = 'Master build reconciliation — increment S0 + S1-a (2026-09-20)';
const VALIDATOR = 'scripts/validate-provider-mode-safety.mjs (52 assertions / 0 failures, exit 0)';

/**
 * COMPLETED this increment. Every `built_and_tested` row names a browser spec
 * that was executed in this session (see the session report for the run output).
 */
const BUILT_AND_TESTED = [
  [
    's1a-provider-mode-safety-validator',
    'The "UNKNOWN ≠ SIMULATION" contract consolidated into ONE regression validator instead of scattered assertions: the predicate (only a positively-resolved `simulation` is safe, including for a missing/undefined mode), provider resolution (`not_registered` for unknown/unregistered), mode derivation (a sandbox connection is never live, operator `disabled` always wins, `needs_attention` distinguishes error from degraded), registry invariants (no provider defaults to live, nothing claims a non-sandbox connection at boot), and BEHAVIOURAL refusal through the real scenario engine (a scenario is refused for every unsafe mode AND when no mode lookup is supplied at all, because the gate defaults to `unknown`)',
    `${VALIDATOR}; e2e/simulation-control.spec.ts (11 tests, re-run this increment)`,
  ],
  [
    's1a-mercentacharts-svg-geometry-fix',
    'The confirmed invalid-SVG-unit defect fixed: the chart helper returned CSS lengths (`12.5px`) that were interpolated into SVG GEOMETRY (`<path d>` and `<polyline points>`), which the SVG grammar does not permit — the browser dropped the geometry and logged a console error on every render. The helper is now a unit-less numeric formatter (`svgNum`) used only by geometry, while the CSS length (`data-chart-lines`) keeps its own unit. Rounding behaviour is unchanged, so the rendered charts are visually identical',
    'src/components/shared/charts/MercentaCharts.tsx; e2e/uiux-redesign.spec.ts (chart render/animation regression); e2e/dashboard.spec.ts (admin Overview regression)',
  ],
];

/** COMPLETED documentation this increment (no browser spec applies). */
const BUILT = [
  [
    's0-whole-platform-e2e-coverage-matrix',
    'The repository-derived whole-platform E2E coverage matrix required by the brief (§3): every shell, environment, canonical role, admin/brand/carrier view, Super Admin sub-tab, interactive control class, domain operation, cross-module chain, permission/tenant/audit/persistence concern, integration and simulation concern — each with its real evidence spec and a coverage state (VERIFIED / PARTIALLY VERIFIED / NOT VERIFIED / NOT AUTOMATED / BLOCKED / INTENTIONALLY EXCLUDED), plus an honest gap register mapped to the owning increment. It records explicitly that "route renders" is not "feature works"',
    'docs/WHOLE_PLATFORM_E2E_COVERAGE_MATRIX.md (360 lines, repository-derived); e2e/app-shell.spec.ts; e2e/work-layer.spec.ts',
  ],
  [
    's0-amazon-reconciliation-status',
    'The Amazon reconciliation status document required by the brief (§20): all 52 audit findings (AV-001…AV-048 including the four lettered sub-items) carry an explicit disposition — KEEP / RELABEL / BUILD / REMOVE-pending-approval / EVIDENCE-BLOCKED / DECISION-REQUIRED — with the owning increment and an honest status. Nothing is applied, no inference is promoted to fact, no Mercenta rule is presented as an Amazon requirement, and the eight outstanding evidence items are listed',
    'docs/AMAZON_RECONCILIATION_STATUS.md (52 dispositions); docs/AMAZON_VENDOR_DISCREPANCY_REGISTER_2026-09-20.md; docs/AMAZON_VENDOR_TRUTH_VALIDATION_2026-09-20.md',
  ],
  [
    's0-founder-decisions-recorded',
    'The Founder decisions that govern the remaining build recorded as authoritative rather than re-asked: T-1 Payoneer is the canonical PRIMARY/default Mercenta and Amazon payment account (Wise secondary, never a silent substitute); T-2 no external carrier users/logins, Logistics Hub is Brand/Admin-facing, existing carrier code reconciled later rather than deleted; T-3 Founder/Super Admin is the human control role, not "Mercenta Operator"; T-4 Mercenta Hub is never a mandatory universal route; T-5 Staff/RBAC retained; T-6 the Brand-facing Routing Request mechanic is removed/reconciled, never relabelled; T-7 the credential architecture must support real entry, replacement, secure persistence, masked readback, validation and enable/disable',
    'docs/AMAZON_RECONCILIATION_STATUS.md §4; docs/WHOLE_PLATFORM_E2E_COVERAGE_MATRIX.md §5/§8; PROJECT_STATUS.md (CURRENT PLATFORM POSITION)',
  ],
];

/**
 * DISCOVERED WORK — recorded, never dropped. Each row names the increment that
 * owns it. None of these is claimed as done.
 */
const DISCOVERED = [
  [
    's0-discovered-live-spapi-edge-functions-missing',
    'DISCOVERED (S0): the real SP-API transport calls three Edge Function routes — `/catalog-items`, `/purchase-orders` and `/shipments/confirm` — and NONE of them exists in supabase/functions (the present set is catalog-import, discovery-directory, esign-envelope, instantly-reply-webhook, payouts-transfer, send-email, xero-token, xero-webhook). The live SP-API path is therefore UNIMPLEMENTED, not merely uncredentialed, and simulation is currently the only working path. Owner: S7',
    'blocked',
    'src/lib/spapi/client.ts (three routes with no matching Edge Function); supabase/functions/ (9 functions present); docs/WHOLE_PLATFORM_E2E_COVERAGE_MATRIX.md §11 row 19',
  ],
  [
    's0-discovered-payout-rail-priority-inversion',
    'DISCOVERED (S0): the canonical payout configuration declares the INVERSE of Founder decision T-1 — src/config/payouts.ts sets DEFAULT_PAYOUT_RAIL = "wise" with Payoneer secondary, and .clinerules/mercenta-business-model.md, docs/INTEGRATIONS.md, scripts/validate-payouts.mjs and e2e/brand-payouts.spec.ts all encode the same order. Reconciling Payoneer-primary is therefore a five-source change plus two test layers, and must not be done by guesswork. Owner: S11',
    'not_started',
    'src/config/payouts.ts (DEFAULT_PAYOUT_RAIL / SECONDARY_PAYOUT_RAIL); docs/AMAZON_RECONCILIATION_STATUS.md §4 (T-1)',
  ],
  [
    's0-discovered-operator-terminology-reconciliation',
    'DISCOVERED (S0): the phrase "Mercenta operator" is used as a human review role in nine source locations, which contradicts Founder decision T-3 (the canonical human control role is Founder / Super Admin). This is a wording reconciliation only — the existing Staff/RBAC functionality is retained per T-5 and must not be deleted to remove the terminology. DONE — RELABELLED (2026-10-05): the phrase was replaced with "Founder / Super Admin" across 16 `src/` occurrences + 1 Edge Function (10 files); gate `npm run validate:operator-terminology`.',
    'built',
    'scripts/validate-operator-terminology.mjs (npm run validate:operator-terminology); docs/MERCENTA_MASTER_FEATURE_FUNCTION_MATRIX.md (D13-14); docs/AMAZON_RECONCILIATION_STATUS.md (T-3)',
  ],
  [
    's0-discovered-carrier-architecture-disposition',
    'DISCOVERED (S0): a carrier environment, a 3PL session tier with its own view allowlist and three carrier views already exist, which Founder decision T-2 retires (no external carrier users/logins). The code must NOT be deleted blindly: it is referenced by the RBAC tier tables and by browser specs. The dependency analysis and safe retirement belong to the Logistics Hub increment. Owner: Logistics Hub increment (S3/S4)',
    'blocked',
    'src/lib/auth/rbac.ts (TIER_ENVIRONMENTS / VIEW_ALLOWLIST 3pl); src/components/layout/CarrierShell.tsx; docs/WHOLE_PLATFORM_E2E_COVERAGE_MATRIX.md §8',
  ],
  [
    's0-discovered-pagination-and-error-boundary-coverage-gap',
    'DISCOVERED (S0): no browser spec asserts pagination behaviour (page switching, page size, totals) and no spec asserts that an ErrorBoundary actually contains a real render fault, even though six ErrorBoundary sites and six pagination-bearing modules exist. Recorded as a coverage gap, not a functional defect. Owner: S12',
    'not_started',
    'docs/WHOLE_PLATFORM_E2E_COVERAGE_MATRIX.md §10 rows 9 and 18 (68 specs scanned — no pagination or error-boundary assertion found)',
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
registry._meta.master_build_reconciliation = {
  stage: SOURCE,
  note:
    'Increment S0 (documentation truth) and S1-a (one confirmed defect + the consolidated provider-mode safety regression) are complete and verified. The two new canonical documents are repository-derived; the 52 Amazon findings now carry explicit dispositions (0 of 52 applied); and the work DISCOVERED by the reconciliation pass is recorded as its own rows with an owning increment rather than dropped.',
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
  `MASTER_BUILD_RECONCILIATION_OK — entries ${entries.length} → ${next.length} (added ${added}, replaced ${replaced}, historical rows deleted 0)`
);
console.log(`  built_and_tested: ${BUILT_AND_TESTED.length} · built: ${BUILT.length} · discovered: ${DISCOVERED.length}`);
console.log(`  By status: ${JSON.stringify(registry._meta.master_build_reconciliation.by_status)}`);
