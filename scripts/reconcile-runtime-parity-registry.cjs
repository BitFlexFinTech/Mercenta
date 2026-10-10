/**
 * §RUNTIME PARITY — registry reconciliation (IDEMPOTENT).
 *
 * Records, in the Master Matrix, the workstream that made the CURRENT product
 * the runtime reached by `npm run dev`:
 *
 *   1. the product ADDRESS layer (productRoutes + URL-driven environment/view,
 *      Back/Forward, refresh-in-place);
 *   2. tab-scoped, RBAC-re-validated SESSION PERSISTENCE (no silent sign-out);
 *   3. tour progress persistence (the brand tour stops re-opening on every load);
 *   4. the deterministic SIMULATED consignment seed that makes the Logistics Hub
 *      inspectable (PO-gated, derived from the canonical PO sets);
 *   5. the payout-rail reconciliation of Founder decision T-1 (Payoneer
 *      default / Wise secondary) across all five sources;
 *   6. the new runtime gate + browser spec.
 *
 * Historical treatment: a previously recorded T-1 contradiction row is NOT
 * deleted — it is marked `superseded_by` the reconciliation row.
 *
 * Idempotency: re-running is a no-op (existing ids are skipped; only
 * evidence/last_verified are refreshed).
 *
 * Run: node scripts/reconcile-runtime-parity-registry.cjs
 */
/**
 * §BATCH 5 (2026-10-10) — SUPERSEDED, AND GUARDED AGAINST REGRESSION.
 *
 * This tool's `evidence` strings name MERCENTA SOCIAL artefacts that the owner
 * instructed us to REMOVE COMPLETELY (`e2e/embedded-social.spec.ts`). Because the
 * script REFRESHES a row's evidence when it differs, re-running it would OVERWRITE
 * the reconciled rows in `requirements-registry.json` and re-introduce citations of
 * DELETED files.
 *
 * It is kept (history is never deleted) but REFUSES to run by default; those rows
 * are reconciled by hand and the feature's ABSENCE is guarded by
 * `scripts/validate-retired-platforms.mjs` §2c (rule 08).
 */
if (!process.env.ALLOW_SUPERSEDED_SOCIAL_RECONCILE) {
  console.error(
    'reconcile-runtime-parity-registry.cjs — SUPERSEDED by §BATCH 5 (2026-10-10): Mercenta Social was removed.\n' +
      'Its rows are reconciled in requirements-registry.json and guarded by\n' +
      'scripts/validate-retired-platforms.mjs §2c. Re-running would re-introduce citations of deleted files.\n' +
      'Set ALLOW_SUPERSEDED_SOCIAL_RECONCILE=1 only if you have read that and still intend to run it.'
  );
  process.exit(1);
}
const fs = require('fs');
const path = 'requirements-registry.json';

const reg = JSON.parse(fs.readFileSync(path, 'utf8'));
const byId = (id) => reg.entries.find((e) => e.id === id);

const SOURCE =
  'Runtime parity workstream — the current product as the runtime reached by npm run dev (2026-09-21 session 5)';
const DATE = '2026-09-21';

const NEW = [
  {
    id: 'runtime-product-address-layer',
    description:
      'PRODUCT ADDRESS LAYER (R1) — `src/lib/runtime/productRoutes.ts` is the single declaration of what a product address means (`/admin/*`, `/brand/*`, `/carrier/*`), pure and fail-closed (an unknown segment returns null, never a guessed environment). `setEnvironment` now WRITES the address; `AdminShell`/`BrandShell`/`CarrierShell` derive their view FROM the address, write it back on navigation and re-read it on Back/Forward. `/` remains the public marketing homepage, and a product deep link with no session shows the real login entry while KEEPING the address, so the one-click demo login lands on the REQUESTED destination. An address naming a view the shell cannot render resolves to that environment\'s declared default view instead of rendering an empty workspace.',
    source: SOURCE,
    status: 'built_and_tested',
    evidence:
      'scripts/validate-product-routes.mjs (EXECUTED: 68 PASS / 0 FAIL — parse/round-trip, fail-closed unknown segments, SEO private-prefix parity, nav-id→render-branch completeness, exactly three pushState writers, one environment writer, RBAC gate, `/` still public); e2e/runtime-entry.spec.ts 7 passed; package.json validate:product-routes',
    last_verified: DATE,
    superseded_by: null,
  },
  {
    id: 'runtime-session-persistence',
    description:
      'SESSION PERSISTENCE (R2) — a refresh in the Admin Hub / Brand Portal / Carrier terminal no longer silently signs the user out. `src/lib/runtime/sessionPersistence.ts` stores the demo session in `sessionStorage` (tab-scoped, never `localStorage`) and RE-VALIDATES it on restore through the SAME canonical RBAC allowlist `signIn` uses; a tampered, stale, mismatched-tier or malformed value fails closed to the public entry, an unknown tenant is refused outright, and a restored brand session is re-hydrated through the SAME canonical activation path the login used. The acquisition WORKING SET remains honestly memory-only.',
    source: SOURCE,
    status: 'built_and_tested',
    evidence:
      'scripts/validate-product-routes.mjs (sessionStorage-not-localStorage, fail-closed, clear-on-sign-out assertions); e2e/runtime-entry.spec.ts tests 4, 7, 8 (F5 in place; non-Super-Admin refused at /admin/super_admin; tampered + unknown-tenant + malformed sessions fail closed); e2e/domain-acceptance.spec.ts #6, e2e/domain-persistence.spec.ts #2 and e2e/embedded-social.spec.ts #4 REPOINTED to the new contract with inline notes',
    last_verified: DATE,
    superseded_by: null,
  },
  {
    id: 'runtime-tour-progress-persistence',
    description:
      'TOUR PROGRESS PERSISTENCE (R4) — `TourEngine`\'s module-level progress Map died with the page, so the brand orientation tour re-opened over the portal after EVERY refresh. Progress is now seeded from and written through `sessionStorage` per brand tenant (same `TourProgress` shape, no duplicate type). The auto-start rule is NOT weakened: a genuinely new brand still gets its tour.',
    source: SOURCE,
    status: 'built_and_tested',
    evidence:
      'src/components/shared/TourEngine.tsx (readPersistedTour / writePersistedTour); e2e/tours.spec.ts 10 passed; e2e/embedded-social.spec.ts + e2e/logistics-hub-map.spec.ts (which drive the tour store) passed',
    last_verified: DATE,
    superseded_by: null,
  },
  {
    id: 'runtime-logistics-consignment-seed',
    description:
      'DETERMINISTIC SIMULATED CONSIGNMENT SEED — the Logistics Hub / Logistics Control map could not be inspected because the seeded consignment set was EMPTY (no seeded PO ever carried a shipping status). Each CLEARED demo tenant now owns ONE deterministic lifecycle PO per shipping state (`PO-9200…` / `PO-9210…`, a separate block so PO-9000…PO-9003 are byte-for-byte unchanged), from which the consignment seed derives as before — shipment creation stays PO-GATED and the records are SIMULATED, not live channel POs. Carriers now come from the canonical lane rule (Freight Collect → channel-arranged; UK domestic → Palletline; international → DHL) instead of a carrier cycle that still contained retired carriers.',
    source: SOURCE,
    status: 'built_and_tested',
    evidence:
      'src/data/demoData.ts (DEMO_LIFECYCLE_PURCHASE_ORDERS + canonical carrier derivation); src/data/demoStore.ts (deductions fixture now addresses the ORIGINAL workflow PO block explicitly, so positional deduction→PO mapping cannot drift); e2e/logistics-hub-map.spec.ts 15 passed (incl. REPOINTED test 13 — tenant isolation asserted WITH data on both sides); runtime probe: brand hub 3 rows / 3 legs / 2 nodes, truth filters 3→2→1 with a real empty state, search narrows then clears',
    last_verified: DATE,
    superseded_by: null,
  },
  {
    id: 'runtime-payout-rail-t1-reconciled',
    description:
      'PAYOUT RAIL — FOUNDER DECISION T-1 APPLIED (was: recorded contradiction). Payoneer is now the canonical DEFAULT payout rail (Mercenta\'s primary business + retail-channel payment account) and Wise the SECONDARY rail, reconciled across all five sources: `src/config/payouts.ts` (DEFAULT_PAYOUT_RAIL/SECONDARY_PAYOUT_RAIL), `supabase/functions/payouts-transfer/index.ts` (DEFAULT_RAIL), `.clinerules/mercenta-business-model.md`, `docs/MERCENTA_BUSINESS_MODEL.md` + `docs/INTEGRATIONS.md`, and the registry/validators. No live external account was touched: rail activation remains credential-only and both rails still run their deterministic simulation. Payout arithmetic, the human-approval gate and the Stripe/Xero refusals are UNCHANGED.',
    source: SOURCE,
    status: 'built_and_tested',
    evidence:
      'scripts/validate-edge-functions.mjs (EXECUTED: 46 assertions, 0 failures — repointed default-rail assertions) and scripts/validate-payouts.mjs (EXECUTED: PAYOUT_VALIDATION_PASS); src/integrations/registry.ts + src/integrations/types.ts + BillingPanel/AccountingPanel copy reconciled; e2e/brand-payouts.spec.ts 4 passed',
    last_verified: DATE,
    superseded_by: null,
  },
  {
    id: 'runtime-entry-browser-gate',
    description:
      'RUNTIME ENTRY GATE — `e2e/runtime-entry.spec.ts` is the browser proof that the product is reachable through NORMAL navigation at a real address: `/` is still the marketing homepage (with and without a session), a cold deep link keeps its address and lands on the requested view after the one-click demo login, F5 stays in place, Back/Forward move between product views, every carrier nav destination is honoured at its own address (the API Request Auditor used to render the manifest terminal unchanged), a tier that may not enter an environment gets AccessDenied, and tampered/unknown/malformed persisted sessions fail closed. No page errors and no external calls.',
    source: SOURCE,
    status: 'built_and_tested',
    evidence: 'e2e/runtime-entry.spec.ts (7 tests) — EXECUTED: 7 passed',
    last_verified: DATE,
    superseded_by: null,
  },
];

let added = 0;
let refreshed = 0;
for (const row of NEW) {
  const existing = byId(row.id);
  if (existing) {
    existing.evidence = row.evidence;
    existing.last_verified = DATE;
    refreshed++;
  } else {
    reg.entries.push(row);
    added++;
  }
}

/* ── Historical treatment: supersede any recorded T-1 contradiction row ─── */
for (const id of [
  'd11-08-payout-rail-default-contradiction',
  'payout-rail-default-contradiction',
  'runtime-payout-rail-contradiction',
]) {
  const row = byId(id);
  if (row) {
    row.superseded_by = 'runtime-payout-rail-t1-reconciled';
    row.evidence = `${row.evidence} — SUPERSEDED by 'runtime-payout-rail-t1-reconciled' (T-1 applied across all five sources, 2026-09-21).`;
    row.last_verified = DATE;
  }
}

reg._meta = reg._meta || {};
reg._meta.last_reconciled = DATE;
reg._meta.total_entries = reg.entries.length;

fs.writeFileSync(path, JSON.stringify(reg, null, 2) + '\n');

console.log(
  `RUNTIME PARITY RECONCILE: added ${added}, refreshed ${refreshed}, total_entries ${reg.entries.length}`
);
console.log('ids: ' + NEW.map((r) => r.id).join(', '));
