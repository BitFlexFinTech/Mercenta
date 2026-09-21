/**
 * §UNIFIED PLATFORM GAP ANALYSIS + FOUNDATION WORKSTREAM — REGISTRY RECONCILIATION (2026-09-20).
 *
 * Records, in the granular Master Matrix (`requirements-registry.json`), exactly
 * what this increment delivered and what it DISCOVERED — because the standing
 * contract forbids silently dropping discovered work.
 *
 * RULES OBEYED (identical to the other reconcile-*.cjs scripts)
 *  - IDEMPOTENT: re-running replaces the rows it owns, by id.
 *  - It NEVER deletes a historical row.
 *  - It refuses to write a registry with a duplicate id or an unknown status.
 *  - `built_and_tested` is only used where the evidence names a REAL spec or
 *    validator that exists on disk.
 *
 * Run: node scripts/reconcile-unified-gap-foundation-registry.cjs
 */
const fs = require('node:fs');
const path = require('node:path');

const REGISTRY = path.resolve(__dirname, '..', 'requirements-registry.json');
const TODAY = '2026-09-20';
const SOURCE =
  'Unified platform gap analysis + foundation workstream (2026-09-20) — automation kill switch, SEO route-metadata foundation, bounded-AI safety gate';

const registry = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
const entries = registry.entries;

/** COMPLETED + verified this increment (each names a real spec/validator). */
const BUILT_AND_TESTED = [
  [
    'foundation-automation-global-halt',
    'The GLOBAL automation halt (kill switch): one act stops every declared automation. Enforced in the DOMAIN — `runAutomation` returns `skipped_halted` BEFORE it reads or fingerprints any canonical state, so a halted run executes no implementation, raises nothing, emits no event, creates no approval and writes no audit row beyond the halt decision itself. Requires an actor AND a non-empty reason, is audited either way (`automation_halted` / `automation_resumed`), is cleared by the deterministic reset, and is surfaced in the Super-Admin Control Centre with a `data-halted` state',
    'scripts/validate-founder-operating-system.mjs (11 new assertions: skip status, zero side effects, no approval, no audit row, runAllAutomations fully halted, reason required, resume, audit); e2e/founder-operating-system.spec.ts (test 6: engage → halted run reports skipped_halted → clear → runs again)',
  ],
  [
    'foundation-seo-route-metadata',
    'The public route/metadata SINGLE SOURCE OF TRUTH (`src/lib/seo/publicRoutes.ts`) plus the pure builder + the ONE DOM applier (`src/lib/seo/routeMetadata.ts`) and the single mounted writer (`RouteMetadata.tsx`). Fixes the confirmed defect where every route was served with the homepage title and canonicalised to `/`: a declared public route now carries its OWN title, description, canonical URL and `index, follow`; a PRIVATE path, an UNKNOWN path and an AUTHENTICATED app environment are all `noindex, nofollow` with NO canonical (fail-closed)',
    'scripts/validate-seo-foundation.mjs (33 assertions / 0 network calls); e2e/seo-foundation.spec.ts (6 tests, 6 passed in Chromium)',
  ],
  [
    'foundation-seo-robots-sitemap-reconciliation',
    'robots.txt and sitemap.xml are now PINNED against the route SSOT instead of being hand-maintained: the sitemap had already drifted (the public `/explore-uk-market-fit` page, the primary CTA target, was missing). The validator requires every declared public route in both files, every declared private prefix disallowed, no private path in the sitemap, no duplicate URL, and no mass-generated routes (the table is bounded and hand-declared)',
    'scripts/validate-seo-foundation.mjs; public/robots.txt; public/sitemap.xml',
  ],
  [
    'foundation-public-route-url-push',
    'In-app public navigation now pushes the canonical URL and re-applies the route metadata through ONE `navigate()` function (it was a local state setter only, so the address never matched the rendered page). `popstate` is handled, so back/forward re-derives the metadata. The hand-maintained inline path→view chain in `Home.tsx` was replaced by the SSOT resolver',
    'e2e/seo-foundation.spec.ts (test 2: CTA → URL `/explore-uk-market-fit` + canonical + title); scripts/validate-seo-foundation.mjs (SSOT consumption + no inline chain)',
  ],
  [
    'foundation-bounded-ai-gate',
    'The BOUNDED INTELLIGENT DECISION SEAM safety gate: PROVES (not describes) that a model can never be the authority for retail-channel truth, financial movement, credential handling, security permissions, irreversible external actions or legal/compliance authority — free-only model selection with no paid fallback, exactly ONE authorised model-call egress, no client-side credential, NO AI import in any forbidden domain (compliance, finance, payouts, verification, retail-channel client, integration registry, routing), fail-closed provider modes, and zero network',
    'scripts/validate-bounded-ai.mjs (31 assertions, all passing, 0 network calls); e2e/founder-operating-system.spec.ts (test 3 asserts the AI surface truthfully reports that no credential is configured, that the narrative basis is deterministic, and that ZERO external calls were made)',
  ],
];

/** COMPLETED documentation/contract work this increment (no browser spec applies). */
const BUILT = [
  [
    'foundation-gap-analysis-report',
    'The required repository-grounded discovery report for the approved six-investigation workstream: the existing prospective-brand/outbound system identification, the full agent/automation inventory with a safety-control comparison, the evaluation/regression/production-trace architecture status, the visual/design audit with measured taste findings, the SEO/AI-search re-verification, the Nimble evaluation status, the Brand Support and LOA verifications, and the full classification summary using the mandated vocabulary',
    'docs/UNIFIED_PLATFORM_GAP_ANALYSIS_2026-09-20.md',
  ],
  [
    'foundation-repointed-stale-validator-contracts',
    'Three stale validator contracts were REPOINTED (never weakened) to the current canonical source of truth, each with an inline `§… — REPOINTED` comment naming the old contract: 8 → 9 declared automations, 9 → 10 Control Centre views, the attention-source allow-list now includes `commercial_readiness`, and the integrity audit now asserts the canonical `navigate(...)` CTA call instead of the retired local view setter',
    'scripts/validate-founder-operating-system.mjs; scripts/integrity-audit.mjs (integrity audit 62 PASSED / 0 FAILED after the repoint)',
  ],
];

/** DISCOVERED by this pass — classified, owned, never silently dropped. */
const DISCOVERED = [
  [
    'discovered-acquisition-conversion-measurement',
    'The prospective-brand/outbound system reports COUNTS (pipeline totals, per-stage, follow-ups overdue) but derives NO conversion rates (reply rate, positive-reply rate, meeting rate, close rate) and no segment-level reporting (category, region, source, owner, message version). Without rates the placement/list/copy diagnosis step is impossible. The substrate exists — `classifyInboundReply` already distinguishes intent — so the correct implementation reuses it and adds NO new state. Deliberately not built yet: the definitions of "reply", "positive" and "meeting" must be agreed so a second definition cannot contradict the canonical classifier',
    'not_started',
    'docs/UNIFIED_PLATFORM_GAP_ANALYSIS_2026-09-20.md §A.3 (Finding A-1); src/lib/acquisition/acquisitionEngine.ts; src/lib/marketing.ts (classifyInboundReply)',
  ],
  [
    'discovered-acquisition-revenue-floor-and-sla',
    'The external outbound research requires a declared revenue floor (a disqualifying threshold) and a declared response SLA. Neither exists anywhere in the acquisition path. Both are commercial-policy values that disqualify real brands or create an unowned commitment, so they require an explicit Founder decision before anything is built; they must then live in ONE config as declared rules',
    'not_started',
    'docs/UNIFIED_PLATFORM_GAP_ANALYSIS_2026-09-20.md §A.2 (BOUNDARY/ROUTING rows); Founder decision required',
  ],
  [
    'discovered-production-trace-to-regression-pipeline',
    'There is no declared path from an observed production case to a permanent automated regression (trace → sanitise/redact → candidate regression → review/approval → canonical fixture → automated regression). The trace sources exist (canonical events, audit entries, the automation run ledger) and the fixture format exists (the 121 validators), but the conversion path does not. ARCHITECTURE NOW / ACTIVATION LATER: a half-built capture path that could leak production content or credentials into a tracked fixture is a worse risk than no path, and there is no production data to capture yet. It must reuse the existing event/audit/validator infrastructure — a second logging system is forbidden',
    'deferred',
    'docs/UNIFIED_PLATFORM_GAP_ANALYSIS_2026-09-20.md §C.2 (Finding C-1)',
  ],
  [
    'discovered-public-content-model',
    'The architecture for future commercial-intent public content (topic, search intent, audience, commercial relationship, evidence/source, owner, last-verified date, related entities, internal links, structured metadata) does not exist. The route SSOT implemented this increment is its prerequisite (per-route identity, title, description, indexability). Mass-generating content is forbidden and no empty schema was created: the model is justified only once real content is authored',
    'deferred',
    'docs/UNIFIED_PLATFORM_GAP_ANALYSIS_2026-09-20.md §E.2 (E-8)',
  ],
  [
    'discovered-probability-decision-layer',
    'A generic probability/threshold decision layer (deterministic hard constraints → optional model decision → probability/threshold → AUTO / REVIEW / REFUSE) does not exist as a generic mechanism; the platform decides by declared rule. The rest of the seam DOES exist (fail-closed routing gateways, the commercial gate with a `human_review` route, the free-only model policy with refusal, the automation approval gate). Building the probabilistic layer before a calibrated benchmark, threshold validation, licensing verification, latency/cost validation and a deterministic fallback exist would make a model a production dependency, which is forbidden',
    'deferred',
    'docs/UNIFIED_PLATFORM_GAP_ANALYSIS_2026-09-20.md §6; src/lib/costs/modelPolicy.ts; src/lib/routing/gateways.ts',
  ],
  [
    'discovered-micro-typography-and-shim-debt',
    'Measured taste debt: the design system says "Avoid text-[8px]/text-[10px] micro-sizes", but the component tree contains 949 `text-[10px]` and 253 `text-[8px]`/`text-[9px]` occurrences across 134 component files, and `src/theme-alpha-shims.css` (691 lines) still ships a legacy shim layer alongside the token system. The correct treatment is a SYSTEMATIC type-scale pass (token first, then a mechanical migration) followed by shim removal — a partial pass would make the inconsistency worse. Also absent: any visual-regression gate (screenshots are captured but never diffed)',
    'not_started',
    'docs/UNIFIED_PLATFORM_GAP_ANALYSIS_2026-09-20.md §D.2 (D-2/D-3/D-4); Founder approval required for the visual pass',
  ],
  [
    'discovered-representation-authority-record',
    'The Letter of Authorization is fully represented, persisted, tenant-scoped, status-aware, verified and GATING (`letter_of_authorization` is a universal base compliance document that blocks catalogue/PO progression until approved). What does not exist is an explicit representation-authority record — the authorisation itself (signatory identity, effective date, scope, withdrawal) is inferred from a document status rather than declared. Building it requires Founder-agreed fields and wording; legal semantics must not be invented, and the correct implementation extends `evaluateComplianceGate` rather than creating a second document or gate system',
    'not_started',
    'docs/UNIFIED_PLATFORM_GAP_ANALYSIS_2026-09-20.md §H (Finding H-1); src/lib/compliance.ts BASE_REQUIRED_DOCUMENTS',
  ],
  [
    'discovered-unified-workstream-full-suite-not-rerun',
    'The full 358-declaration Playwright suite was NOT re-run in this increment. The affected suites WERE run: `e2e/seo-foundation.spec.ts` 6/6, `e2e/founder-operating-system.spec.ts` 6/6, `e2e/uiux-redesign.spec.ts` 13/13 (plus the broader regression set recorded in PROJECT_STATUS). Recorded as a coverage gap, not a functional defect',
    'not_started',
    'docs/WHOLE_PLATFORM_E2E_COVERAGE_MATRIX.md (updated this increment). Owner: S12',
  ],
];

const applied = [
  ...BUILT_AND_TESTED.map(([id, description, evidence]) => ({
    id,
    description,
    status: 'built_and_tested',
    evidence,
    source: SOURCE,
    last_updated: TODAY,
  })),
  ...BUILT.map(([id, description, evidence]) => ({
    id,
    description,
    status: 'built',
    evidence,
    source: SOURCE,
    last_updated: TODAY,
  })),
  ...DISCOVERED.map(([id, description, status, evidence]) => ({
    id,
    description,
    status,
    evidence,
    source: SOURCE,
    last_updated: TODAY,
  })),
];

const ownedIds = new Set(applied.map((r) => r.id));
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

/** Every `built_and_tested` row must name a spec/validator that actually exists. */
const missingSpecs = applied.filter((r) => {
  if (r.status !== 'built_and_tested') return false;
  const specs = r.evidence.match(/e2e\/[\w.-]+\.spec\.ts|scripts\/[\w.-]+\.mjs/g) ?? [];
  return specs.length === 0 || specs.some((s) => !fs.existsSync(path.resolve(__dirname, '..', s)));
});
if (missingSpecs.length > 0) {
  console.error(
    `REFUSING TO WRITE — built_and_tested without a real spec/validator: ${missingSpecs.map((r) => r.id).join(', ')}`
  );
  process.exit(1);
}

const added = next.length - entries.length;
const replaced = entries.length - preserved.length;

registry.entries = next;
registry._meta.last_updated = TODAY;
registry._meta.total_entries = next.length;
registry._meta.unified_gap_foundation = {
  stage: SOURCE,
  note:
    'The unified workstream delivered three foundational capabilities (the global automation halt, the SEO route-metadata SSOT with fail-closed noindex and robots/sitemap reconciliation, and the bounded-AI safety gate) plus the required repository-grounded gap analysis. The work DISCOVERED by this pass (acquisition conversion measurement, the revenue floor and response SLA decisions, the production-trace→regression pipeline, the public content model, the probability decision layer, micro-typography/shim debt, the representation-authority record and the un-rerun full suite) is recorded as its own rows with an owner rather than dropped. No historical row was deleted; no Amazon disposition was applied.',
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
  `UNIFIED_GAP_FOUNDATION_OK — entries ${entries.length} → ${next.length} (added ${added}, replaced ${replaced}, historical rows deleted 0)`
);
console.log(`  built_and_tested: ${BUILT_AND_TESTED.length} · built: ${BUILT.length} · discovered: ${DISCOVERED.length}`);
console.log(`  By status: ${JSON.stringify(registry._meta.unified_gap_foundation.by_status)}`);

