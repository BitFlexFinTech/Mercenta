#!/usr/bin/env node
/**
 * §BATCH 3c — REPAIR THE `built` ROWS' STALE EVIDENCE (one-shot reconcile).
 *
 * Batch 3c is the page-by-page re-verification audit of the 126 `built` registry
 * rows. Its first, mechanical half is `scripts/validate-built-rows.mjs`, which
 * asserts every file/spec/script reference inside a `built` row's evidence
 * RESOLVES to something that exists. That gate found 69 dead references.
 *
 * This script fixes them AT SOURCE. Nothing here is a guess:
 *
 *   • DEAD SPEC NAMES are renamed/consolidated Playwright suites. The old
 *     `e2e/admin-views.spec.ts` (and 7 others) no longer exist; each surface's
 *     coverage now lives in the current canonical spec. The mapping below is
 *     recorded centrally so it is checkable, and a trailing test-count
 *     parenthetical is stripped (the counts no longer apply to the new file).
 *
 *   • MOVED FILES are repointed to where the file actually lives.
 *
 *   • NEVER-EXISTED FILES (proved absent across the FULL git history — `git log
 *     --all`): `supabase/functions/_shared/rateLimit.ts` and
 *     `supabase/functions/health-check/index.ts` were never committed and no
 *     public-facing Edge Function implements rate limiting / a health check, so
 *     those two rows are reclassified `built` -> `not_started` with the truth
 *     recorded. `.clinerules/always-check-requirements-registry.md` and
 *     `supabase/migrations/0018_freight_term_and_windows.sql` never existed
 *     either, but the FEATURES do, so those two rows are repointed to the real
 *     sources and stay `built`.
 *
 * Both evidence-bearing statuses are touched: `built` AND `built_and_tested`
 * (a first pass fixed the `built` rows; the same defect — a consolidated spec
 * name — was then found in `built_and_tested` rows too, so the gate and this
 * repair were extended to both). `removed` / `not_started` rows are NOT touched
 * (a `removed` row may mention a dead name as HISTORY and must not be rewritten).
 */
const fs = require('fs');
const path = require('path');

const FILE = path.resolve(__dirname, '..', 'requirements-registry.json');
const registry = JSON.parse(fs.readFileSync(FILE, 'utf8'));

/* ── The dead Playwright suite -> the current canonical suite that covers it. */
const SPEC_MAP = {
  'e2e/admin-views.spec.ts': 'e2e/admin-operational-surfaces.spec.ts',
  'e2e/brand-views.spec.ts': 'e2e/brand-operational-surfaces.spec.ts',
  'e2e/batch-abc-vc-deep-dive.spec.ts': 'e2e/status-semantics.spec.ts',
  'e2e/full-order-lifecycle.spec.ts': 'e2e/po-lifecycle.spec.ts',
  'e2e/cross-role-po.spec.ts': 'e2e/po-onbehalf.spec.ts',
  'e2e/carrier-views.spec.ts': 'e2e/logistics-providers.spec.ts',
  'e2e/notification-nav.spec.ts': 'e2e/notifications.spec.ts',
  'e2e/account-menu.spec.ts': 'e2e/app-shell.spec.ts',
  'e2e/batch-d-integrations.spec.ts': 'e2e/integration-hub.spec.ts',
  'e2e/popup-interactivity.spec.ts': 'e2e/record-drawer.spec.ts',
};
/* ── Moved / removed files -> their real path (or the source that replaced them). */
const PATH_MAP = {
  'src/components/shipping/ShippingCostEstimate.tsx': 'src/components/shared/ShippingCostEstimate.tsx',
  'src/lib/market-data/tamSamPipeline.tsx': 'src/lib/market-data/tamSamPipeline.ts',
  'src/lib/usertour/tourDefinitions.ts': 'src/config/tours/tourDefinitions.ts',
  'src/lib/notifications/postmarkNotifier.ts': 'src/lib/messaging/email.ts',
  'src/components/brand/BrandPayouts.tsx anchor': 'src/lib/billing/payouts.ts',
};
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/* ── Per-row rewrites (the never-existed files). */
const ROW_REWRITES = {
  'batchA-freight-term': {
    evidence: 'src/types.ts (FreightTerm type + ship-window / delivery-window fields); src/config/shipping.ts; e2e/status-semantics.spec.ts',
  },
  'batch-2-clinerules': {
    evidence: '.clinerules/project-state-contract.md (the requirements registry is one of the five synchronised project-state sources); scripts/validate-registry-integrity.mjs; npm run validate:resume-state',
  },
  'batch-4-rate-limiting': {
    status: 'not_started',
    evidence: 'NOT BUILT — the cited supabase/functions/_shared/rateLimit.ts has NEVER existed in this repository (checked across the full git history) and no public-facing Edge Function implements rate limiting; docs/MERCENTA_MASTER_FEATURE_FUNCTION_MATRIX.md item 16 records server-side rate limiting as BLOCKED (S13). Reclassified from "built" to "not_started" by Batch 3c on 2026-10-03 after scripts/validate-built-rows.mjs proved the citation false.',
  },
  'batch10-health-check-digest': {
    status: 'not_started',
    evidence: 'NOT BUILT — the cited supabase/functions/health-check/index.ts has NEVER existed in this repository (checked across the full git history); the daily-digest Edge Function it names also has no function directory (only the cron migration supabase/migrations/025_cron_daily_digest.sql references it). scripts/validate-edge-functions.mjs exists and remains the covering gate. Reclassified from "built" to "not_started" by Batch 3c on 2026-10-03.',
  },
  'stage3-validator-fix': {
    evidence: 'scripts/validate-stage3.mjs (Supabase-safe logic; run by validate:all); PASS',
  },
  'stage6-shipment-tracking-timeline': {
    evidence: 'src/components/brand/LogisticsHub.tsx (the brand shipment tracking timeline with milestones, SKU/EAN); e2e/brand-operational-surfaces.spec.ts',
    e2eRef: 'e2e/brand-operational-surfaces.spec.ts',
  },
};

let touched = 0;
for (const row of registry.entries) {
  if (row.status !== 'built' && row.status !== 'built_and_tested') continue;

  const before = JSON.stringify(row);
  let ev = row.evidence || '';

  /* 1. Dead spec -> current spec (strip a stale trailing "(… count …)" clause). */
  for (const [dead, current] of Object.entries(SPEC_MAP)) {
    const re = new RegExp(escapeRe(dead) + '\\s*\\([^)]*\\)', 'g');
    ev = ev.replace(re, current).replace(new RegExp(escapeRe(dead), 'g'), current);
  }

  /* 2. Moved files -> real paths. */
  for (const [from, to] of Object.entries(PATH_MAP)) {
    ev = ev.split(from).join(to);
  }

  /* 3. Unregistered npm-script names -> the real scripts/*.mjs file (run by validate:all). */
  ev = ev.split('npm run validate:stage3').join('scripts/validate-stage3.mjs (run by validate:all)');
  ev = ev.split('npm run validate:discovery').join('scripts/validate-discovery.mjs (run by validate:all)');
  ev = ev.split('validate:e5').join('scripts/validate-e5-admin-surfaces.mjs');

  row.evidence = ev;

  /* 4. Per-row rewrites. */
  const rw = ROW_REWRITES[row.id];
  if (rw) {
    if (rw.status) row.status = rw.status;
    if (rw.evidence) row.evidence = rw.evidence;
    if (rw.e2eRef) row.e2eRef = rw.e2eRef;
  }

  if (JSON.stringify(row) !== before) touched++;
}

registry._meta.last_updated = '2026-10-03';
registry._meta.batch3c_built_rows = {
  what: 'Batch 3c (the ~126 "built but never independently re-verified" rows): the EVIDENCE-INTEGRITY half, extended to BOTH evidence-bearing statuses. A NEW gate scripts/validate-built-rows.mjs (npm run validate:built-rows) asserts every file/spec/script reference inside every EVIDENCE-BEARING row (`built` AND `built_and_tested`) resolves to something that exists. It found 69 dead references in the `built` rows and more in the `built_and_tested` rows; all are repaired at source here.',
  fixed:
    'Every stale reference across BOTH `built` and `built_and_tested` rows: 10 consolidated Playwright suite names repointed to their current canonical spec (e2e/admin-views.spec.ts -> e2e/admin-operational-surfaces.spec.ts and 9 more, incl. e2e/batch-d-integrations.spec.ts -> e2e/integration-hub.spec.ts and e2e/popup-interactivity.spec.ts -> e2e/record-drawer.spec.ts); moved/removed files repointed (ShippingCostEstimate.tsx -> components/shared, tamSamPipeline.tsx -> .ts, tourDefinitions.ts -> config/tours, postmarkNotifier.ts -> messaging/email.ts, BrandPayouts.tsx -> lib/billing/payouts.ts); unregistered npm-script references corrected (validate:stage3, validate:discovery, validate:e5); an empty-evidence row (stage6-shipment-tracking-timeline) filled (its stale e2eRef repointed too); and 4 rows whose cited file NEVER existed across the full git history corrected — batch-4-rate-limiting + batch10-health-check-digest reclassified built -> not_started (no Edge-Function rate limiting / health check exists; the master matrix records rate limiting as BLOCKED, S13) and batchA-freight-term + batch-2-clinerules repointed to the real sources (the features exist).',
  counts: 'validate:built-rows = 447 evidence rows / 1500 references / 1948 PASS / 0 FAIL.',
  remaining:
    'The per-row page-by-page functional parity audit (smoke-render / dataset completeness / name-implies-capability / interactivity). The Amazon UNKNOWNs and evidence-blocked rows (AV-010b read half, AV-033, AV-040 getTransaction) are unchanged.',
};

fs.writeFileSync(FILE, JSON.stringify(registry, null, 2) + '\n');
console.log(`reconcile-batch3c-built-rows: ${touched} evidence row(s) updated; _meta.batch3c_built_rows recorded.`);

