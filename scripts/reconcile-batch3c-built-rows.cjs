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
 * Only rows whose status is `built` are touched. `built_and_tested` / `removed`
 * rows are OUT of this batch's declared scope (some `removed` rows mention the
 * dead names as HISTORY and must not be rewritten); they carry the same defect
 * class and are recorded as remaining Batch 3c work.
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
};
/* ── Moved files -> their real path. */
const PATH_MAP = {
  'src/components/shipping/ShippingCostEstimate.tsx': 'src/components/shared/ShippingCostEstimate.tsx',
  'src/lib/market-data/tamSamPipeline.tsx': 'src/lib/market-data/tamSamPipeline.ts',
  'src/lib/usertour/tourDefinitions.ts': 'src/config/tours/tourDefinitions.ts',
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
};

let touched = 0;
for (const row of registry.entries) {
  if (row.status !== 'built') continue;

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

  /* 3. validate:stage3 is not a registered npm script. */
  ev = ev.split('npm run validate:stage3').join('scripts/validate-stage3.mjs (run by validate:all)');

  row.evidence = ev;

  /* 4. Per-row rewrites. */
  const rw = ROW_REWRITES[row.id];
  if (rw) {
    if (rw.status) row.status = rw.status;
    if (rw.evidence) row.evidence = rw.evidence;
  }

  if (JSON.stringify(row) !== before) touched++;
}

registry._meta.last_updated = '2026-10-03';
registry._meta.batch3c_built_rows = {
  what: 'Batch 3c (the ~126 "built but never independently re-verified" rows): the evidence-integrity half. A NEW gate scripts/validate-built-rows.mjs (npm run validate:built-rows) asserts every file/spec/script reference inside a `built` row resolves to something that exists; the stale references it found were repaired at source here.',
  fixed:
    '69 dead references repaired across the `built` rows: 8 consolidated Playwright suite names repointed to their current canonical spec (e2e/admin-views.spec.ts -> e2e/admin-operational-surfaces.spec.ts and 7 more); 3 moved files repointed (ShippingCostEstimate.tsx -> components/shared, tamSamPipeline.tsx -> .ts, tourDefinitions.ts -> config/tours); the unregistered `validate:stage3` reference corrected; and 4 rows whose cited file NEVER existed across the full git history corrected — batch-4-rate-limiting and batch10-health-check-digest reclassified built -> not_started (no Edge-Function rate limiting / health check exists; the master matrix records rate limiting as BLOCKED, S13) and batchA-freight-term + batch-2-clinerules repointed to the real sources (the features exist).',
  remaining:
    '22 built_and_tested rows and 1 removed row ALSO name a consolidated spec; the `removed` row (batchE-carrier-views-e2e) mentions it as HISTORY and is correct as written; the 22 are a SEPARATE defect class (their built_and_tested status is unsupported by a live spec reference) and are the next slice of Batch 3c. The per-row page-by-page functional parity audit (smoke-render / dataset completeness / name-implies-capability / interactivity) also remains.',
};

fs.writeFileSync(FILE, JSON.stringify(registry, null, 2) + '\n');
console.log(`reconcile-batch3c-built-rows: ${touched} built row(s) updated; _meta.batch3c_built_rows recorded.`);

