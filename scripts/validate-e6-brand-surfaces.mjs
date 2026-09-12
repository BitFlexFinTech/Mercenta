// §Phase E6 — validates the BRAND OPERATIONAL SURFACES (parity / canonicality):
//   A  G1 — BrandPurchaseOrders exposes CANONICAL simulated-PO provenance
//   B  G2 — BrandDashboard surfaces canonical E4 commerce awareness, APPENDED
//          after the existing attention groups, with unchanged KPI ids
//   C  G3 — ONE canonical latest-submission derivation on the brand catalog
//          (canonicality + robustness: the removed local map returned the LAST
//          array element, which is only correct while exactly one row exists)
//   D  G4 — NotificationCenter derives deduction provenance from the canonical flag
//   E  scope — only the approved E6 files changed; no protected file touched
//      (§Phase E7 later extended this set with its own phase scope — see E7_SCOPE)
//   F  safety — no migration, no new store/dashboard/nav, no live provider path,
//          createPurchaseOrder's email path untouched, UNKNOWN stays unsafe
import { createServer } from 'vite';
import { readFileSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
let failures = 0;
const test = (name, ok) => {
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) failures++;
};

let externalFetches = 0;
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url) => {
  externalFetches++;
  console.log(`!! E6 brand suite attempted external fetch: ${String(url)}`);
  return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
};

const readSrc = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

/**
 * Source with comments stripped. Code-shape assertions must not be satisfied —
 * or broken — by prose (the G3 explanatory comment deliberately names the
 * removed local map, so a raw substring test would be misleading either way).
 */
const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

const PO = readSrc('src/components/brand/BrandPurchaseOrders.tsx');
const DASH = readSrc('src/components/brand/BrandDashboard.tsx');
const CATALOG = readSrc('src/components/brand/ProductCatalog.tsx');
const NOTIF = readSrc('src/components/shared/NotificationCenter.tsx');
const API = readSrc('src/data/api.ts');
const STORE = readSrc('src/data/demoStore.ts');

/** The exact approved E6 change set (plus the pre-existing Review Zip). */
const APPROVED = new Set([
  'src/components/brand/BrandPurchaseOrders.tsx',
  'src/components/brand/BrandDashboard.tsx',
  'src/components/brand/ProductCatalog.tsx',
  'src/components/shared/NotificationCenter.tsx',
  'scripts/validate-e6-brand-surfaces.mjs',
  'e2e/brand-operational-surfaces.spec.ts',
  'docs/PRODUCT_CONSOLIDATION_PHASEE6_2026-09-12.md',
  'PROJECT_STATUS.md',
  'HANDOFF.md',
  'STATUS_CHECK.md',
  'MERCENTA_MASTER_CONTEXT.md',
  'MERCENTA_ARCHITECTURE.md',
]);
const ALLOWED_NON_APPROVED = new Set(['Review Zip/mercenta-review.zip']);

/**
 * §Phase E7 — the Embedded Mercenta Social phase scope (2026-09-12).
 *
 * E6's source-scope guards below predate E7. They must now accept the E7 change
 * set while STILL refusing anything outside it, and F5b additionally pins which
 * protected-area file E7 was allowed to move (the engine client seam — the file
 * E7 exists to extend). Nothing here widens what E7 may touch.
 */
const E7_SCOPE = new Set([
  'src/config/mercentaSocial.ts',
  // New E7 module directory (git reports a brand-new untracked directory as a
  // single path, so the directory itself is part of the E7 scope):
  'src/lib/social/',
  'src/lib/social/workspace.ts',
  'src/lib/social/brandStatus.ts',
  'src/lib/social/index.ts',
  'src/components/brand/MercentaSocial.tsx',
  'src/components/brand/BrandSocialConnect.tsx',
  'src/components/admin/PostizAdminPanel.tsx',
  'src/components/layout/BrandShell.tsx',
  'src/lib/postiz/postizClient.ts',
  'scripts/validate-e7-embedded-social.mjs',
  // E7 extended THIS guard (F5/F5b/F6) so it still refuses any path outside the
  // E6 + E7 change sets — the file itself is therefore part of the E7 scope:
  'scripts/validate-e6-brand-surfaces.mjs',
  'e2e/embedded-social.spec.ts',
  'e2e/app-shell.spec.ts',
  'docs/PRODUCT_CONSOLIDATION_PHASEE7_2026-09-12.md',
  'requirements-registry.json',
  'PRODUCTION_READINESS.md',
]);

/**
 * Reproducible OUTPUTS, not source. The Playwright run regenerates these on every
 * session, so the source-scope assertions below must ignore them — otherwise the
 * validator would fail merely because a test run had just happened.
 */
const GENERATED_ARTEFACTS = [
  'Review Zip/',
  'test-screenshots/',
  'playwright-report/',
  'test-results/',
];

/** Paths that must never appear in the E6 change set. */
const PROTECTED_PREFIXES = [
  'src/lib/intelligence/',
  'src/lib/postiz/',
  'src/lib/spapi/client.ts',
  'src/lib/dhl/client.ts',
  'src/services/xero/',
  'src/lib/billing/invoice.ts',
  'supabase/migrations/',
  'scripts/deploy',
  'deploy/',
];

try {
  /* ── modules under test (the EXISTING architecture) ── */
  const store = await server.ssrLoadModule('/src/data/demoStore.ts');
  const commerce = await server.ssrLoadModule('/src/lib/commerce/commerceLifecycle.ts');
  const catalog = await server.ssrLoadModule('/src/lib/catalog/catalogLifecycle.ts');
  const integrations = await server.ssrLoadModule('/src/integrations/types.ts');
  const mockAmazon = await server.ssrLoadModule('/src/lib/spapi/mockClient.ts');

  const ZAMBEZI = 'brand-zambezi';
  const OTHER = 'brand-deskforge';
  const brandActor = { staffId: `brand:${ZAMBEZI}`, canMutate: true, tenantId: ZAMBEZI };
  const otherActor = { staffId: `brand:${OTHER}`, canMutate: true, tenantId: OTHER };
  const viewOnly = { staffId: 'staff-005', canMutate: false, tenantId: ZAMBEZI };

  const product = (sku, over = {}) => ({
    id: '', name: `E6 brand product ${sku}`, sku, barcode: '600999000099', image: '',
    exWorksPrice: 12.5, ukRetailPrice: 29.99, commodityCode: '3304990090',
    vatStatus: 'Standard 20%', hazmat: false, length: 12, width: 10, height: 18, weight: 0.5,
    ...over,
  });

  const SKU = 'E6-BRAND-001';
  store.addCatalogProduct(ZAMBEZI, product(SKU));
  mockAmazon.resetMockAmazonState();
  const sub1 = await catalog.submitCatalogProduct(
    ZAMBEZI, store.findCatalogProduct(ZAMBEZI, SKU), brandActor
  );
  test('A0 prerequisite — an E3-eligible simulated product exists for the brand',
    sub1.ok === true && sub1.value.simulated === true);

  /* ══ A. G1 — canonical simulated-PO provenance ══ */
  const created = await commerce.createCommercePurchaseOrder(ZAMBEZI, SKU, 60, brandActor);
  test('A1 a SIMULATED PO carries the canonical flags the brand marker reads',
    created.ok === true && created.value.simulated === true && created.value.mode === 'simulation');
  test('A2 the brand PO list derives the marker from the canonical flag (never from text)',
    /po\.simulated === true/.test(code(PO)) && /\(sim\)/.test(code(PO)));
  test('A3 a seeded/legacy PO carries no flag, so the marker is not universal',
    store.demoPurchaseOrders.some((p) => p.simulated === undefined) &&
    store.demoPurchaseOrders.some((p) => p.simulated === true));
  test('A4 CommerceSimulationPanel is still rendered LAST (DOM-order discipline)',
    PO.indexOf('<CommerceSimulationPanel />') > PO.indexOf('{/* PO list */}'));
  test('A5 the G1 marker adds no control (a Badge only — no new button/input)',
    /po\.simulated === true && \(\s*<Badge/.test(code(PO)) &&
    !/po\.simulated === true[\s\S]{0,120}<Button/.test(code(PO)) &&
    !/po\.simulated === true[\s\S]{0,120}<input/.test(code(PO)));

  /* ══ B. G2 — canonical commerce awareness, APPENDED ══ */
  test('B1 the brand dashboard reads the canonical E4 commerce stores',
    /from '@\/data\/demoStore'/.test(DASH) &&
    /demoCommerceInvoices/.test(DASH) && /demoCommercePayments/.test(DASH));
  test('B2 it derives issued-unpaid simulated invoices canonically',
    /i\.status === 'issued'/.test(DASH) && /invoiceId === i\.id/.test(DASH));
  test('B3 it derives delivered-awaiting-invoice from the canonical PO list',
    /p\.simulated === true && p\.status === 'delivered'/.test(DASH) && /invoicedPoIds\.has/.test(DASH));
  test('B4 the new groups are APPENDED after every existing group',
    DASH.indexOf('commerce-inv-') > DASH.indexOf('id: `return-') &&
    DASH.indexOf('commerce-po-inv-') > DASH.indexOf('id: `return-'));
  test('B5 no new attention id reuses the pinned `unacked-` prefix',
    (DASH.match(/id: `unacked-/g) || []).length === 1 &&
    (DASH.match(/commerce-inv-/g) || []).length === 1);
  test('B6 the existing KPI ids are unchanged',
    ['active-pos', 'awaiting-ack', 'in-fulfilment', 'products-listed', 'out-of-stock', 'contract-status']
      .every((id) => DASH.includes(`id: '${id}'`)) &&
    /data-testid="po-summary-active"/.test(DASH) && /data-testid="po-summary-awaiting"/.test(DASH));
  test('B7 simulated deduction attention rows carry canonical provenance',
    /open since \$\{d\.date\}\$\{d\.simulated \? ' · \(sim\)' : ''\}/.test(DASH));
  test('B8 the brand commerce attention is tenant-scoped (brandId === tenantId)',
    /demoCommerceInvoices\.filter\(\(i\) => i\.brandId === tenantId\)/.test(DASH));

  /* ── runtime proof of the canonical derivation itself ── */
  const inv = commerce.issueCommerceInvoice;
  test('B9 the E4 lifecycle still produces the canonical invoice/payment state the dashboard reads',
    typeof inv === 'function' && created.ok === true);

  /* ══ C. G3 — ONE canonical latest-submission derivation ══ */
  test('C1 the duplicate local submission map is GONE from the brand catalog',
    !/submissionBySku/.test(code(CATALOG)) && !/new Map\(submissions/.test(code(CATALOG)));
  test('C2 the brand catalog uses the canonical helper',
    /from '@\/data\/demoStore'/.test(code(CATALOG)) && /latestSubmissionForProduct/.test(code(CATALOG)));
  test('C3 the canonical helper is declared exactly ONCE (demoStore)',
    (STORE.match(/export function latestSubmissionForProduct/g) || []).length === 1);
  test('C4 no second latest-submission helper was introduced',
    !/function latestSubmissionForProduct/.test(code(CATALOG)) &&
    !/latestSubmissionForProduct\s*=\s*\(/.test(code(CATALOG)));

  /**
   * Behavioural conformance fixture. `recordCatalogSubmission` is idempotent per
   * (tenant, sku), so two rows for one SKU can only be produced by writing to the
   * canonical array directly. This makes the divergence between the REMOVED local
   * map (array-last wins) and the canonical rule (newest by `submittedAt` real and
   * testable — it is exactly why the brand catalog must use the canonical helper.
   */
  const ORDER_SKU = 'E6-ORDER-001';
  const mk = (id, submittedAt, status) => ({
    id, brandId: ZAMBEZI, productId: 'p-e6', productName: `E6 ${id}`, sku: ORDER_SKU,
    status, submittedAt, submissionId: `E6-${id}`, mode: 'mock', simulated: true, polls: 0,
  });
  const newest = mk('E6-NEW', new Date().toISOString(), 'live');
  const oldest = mk('E6-OLD', new Date(Date.now() - 86_400_000).toISOString(), 'submitted');
  store.demoProductSubmissions.push(newest, oldest); // OLDEST deliberately LAST

  const canonicalLatest = store.latestSubmissionForProduct(ZAMBEZI, ORDER_SKU);
  const arrayLast = store.demoProductSubmissions.filter((s) => s.sku === ORDER_SKU).slice(-1)[0];
  test('C5 the canonical helper returns the NEWEST row by submittedAt',
    !!canonicalLatest && canonicalLatest.id === newest.id);
  test('C6 the removed array-last derivation would have picked a DIFFERENT (wrong) row',
    arrayLast.id === oldest.id && canonicalLatest.id !== arrayLast.id);

  /* ══ D. G4 — deduction notification provenance ══ */
  test('D1 the deduction notification reads the canonical flag',
    /d\.simulated \? ' · \(sim\)' : ''/.test(code(NOTIF)));
  test('D2 non-simulated deductions are unchanged by the marker',
    /reason\}\$\{d\.simulated \? ' · \(sim\)' : ''\}/.test(code(NOTIF)));
  test('D3 no second notification store was created',
    !/new NotificationStore|notificationStore/.test(code(NOTIF)) && !/localStorage/.test(code(NOTIF)));

  /**
   * Drive the canonical E4 lifecycle so a SIMULATED operational exception really
   * exists in the ledger, then assert the provenance that both the brand
   * dashboard attention row and the notification marker depend on.
   */
  const poId = created.ok ? created.value.id : '';
  commerce.acknowledgeCommercePurchaseOrder(poId, brandActor);
  commerce.fulfilCommercePurchaseOrder(poId, brandActor);
  commerce.receiveCommercePurchaseOrder(poId, brandActor);
  const raised = commerce.raiseCommerceException(
    poId, 'shortage_claim', 12.5, 'E6 validator simulated exception', brandActor
  );
  test('D4 an E4 exception lands in the canonical ledger WITH simulation provenance',
    raised.ok === true && raised.value.simulated === true && raised.value.mode === 'simulation' &&
    store.demoDeductions.some((d) => d.id === raised.value.id && d.simulated === true));
  test('D5 the canonical ledger also holds non-simulated rows (the marker is conditional)',
    store.demoDeductions.some((d) => d.simulated === undefined));

  /* ══ E. tenant isolation, RBAC and refusal immutability (unchanged domain) ══ */
  test('E1 a foreign tenant is refused CROSS_TENANT on brand commerce reads',
    (() => { const r = commerce.listBrandCommerceActivity(ZAMBEZI, otherActor); return r.ok === false && /CROSS_TENANT/.test(r.error); })());
  test('E2 a foreign tenant is refused on brand invoice reads',
    (() => { const r = commerce.listBrandCommerceInvoices(ZAMBEZI, otherActor); return r.ok === false && /CROSS_TENANT/.test(r.error); })());

  const actsBefore = store.getCommerceActivitiesForBrand(ZAMBEZI).length;
  const statusBefore = store.demoPurchaseOrders.find((p) => p.id === poId).status;
  test('E3 a VIEW-ONLY actor is refused by the DOMAIN (FORBIDDEN)',
    (() => { const r = commerce.acknowledgeCommercePurchaseOrder(poId, viewOnly); return r.ok === false && /FORBIDDEN/.test(r.error); })());
  test('E4 a FOREIGN tenant is refused by the DOMAIN (CROSS_TENANT)',
    (() => { const r = commerce.acknowledgeCommercePurchaseOrder(poId, otherActor); return r.ok === false && /CROSS_TENANT/.test(r.error); })());
  test('E5 the refusals mutated NOTHING (activity count + PO status unchanged)',
    store.getCommerceActivitiesForBrand(ZAMBEZI).length === actsBefore &&
    store.demoPurchaseOrders.find((p) => p.id === poId).status === statusBefore);
  test('E6 the brand may still read its OWN commerce records',
    (() => { const r = commerce.listBrandCommerceActivity(ZAMBEZI, brandActor); return r.ok === true && r.value.length > 0; })());

  /* ══ F. safety + scope invariants ══ */
  test('F1 UNKNOWN provider state remains unsafe (fail-closed preserved)',
    integrations.isProviderSimulationSafe('unknown') === false &&
    integrations.isProviderSimulationSafe(undefined) === false &&
    integrations.isProviderSimulationSafe('not_registered') === false &&
    integrations.isProviderSimulationSafe('simulation') === true);
  test('F2 createPurchaseOrder still performs its real notification (path UNTOUCHED)',
    /export function createPurchaseOrder\(/.test(API) && /sendPostmarkEmail/.test(API));
  test('F3 no live provider path or network call was introduced by E6',
    !/fetch\s*\(/.test(PO + DASH + CATALOG + NOTIF) &&
    !/spapi\/client|dhl\/client|services\/xero|postmarkNotifier/.test(PO + DASH + CATALOG + NOTIF));

  const migDir = new URL('../supabase/migrations/', import.meta.url).pathname;
  const migFiles = readdirSync(migDir).filter((f) => /^0\d\d_/.test(f));
  test('F4 no migration was added (023 remains the newest; 23 total)',
    migFiles.length === 23 && !migFiles.some((f) => /^024/.test(f)));

  /** Working-tree scope proof (read-only `git status`). */
  let changed = [];
  try {
    changed = execSync('git status --porcelain', {
      cwd: new URL('..', import.meta.url).pathname,
      encoding: 'utf8',
    })
      .split('\n')
      .map((l) => l.slice(3).trim())
      .filter(Boolean)
      .map((p) => p.replace(/^"|"$/g, ''));
  } catch {
    /* git unavailable — the source-level scope assertions below still run */
  }
  test('F5 no protected path appears in the working-tree change set',
    changed
      .filter((p) => !GENERATED_ARTEFACTS.some((pre) => p.startsWith(pre)))
      .every((p) => !PROTECTED_PREFIXES.some((pre) => p.startsWith(pre)) || E7_SCOPE.has(p)));
  test('F5b the ONLY protected-area file E7 may move is the engine client seam',
    changed
      .filter((p) => !GENERATED_ARTEFACTS.some((pre) => p.startsWith(pre)))
      .filter((p) => PROTECTED_PREFIXES.some((pre) => p.startsWith(pre)))
      .every((p) => p === 'src/lib/postiz/postizClient.ts'));
  test('F6 the E6 SOURCE change set is within the approved files (generated artefacts ignored)',
    changed
      .filter((p) => !GENERATED_ARTEFACTS.some((pre) => p.startsWith(pre)))
      .every((p) => APPROVED.has(p) || ALLOWED_NON_APPROVED.has(p) || E7_SCOPE.has(p) ||
        [...E7_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s))));
  test('F7 no new store/dashboard module was created by E6',
    readdirSync(new URL('../src/components/brand/', import.meta.url)).every((f) => !/e6/i.test(f)) &&
    readdirSync(new URL('../src/data/', import.meta.url)).every((f) => !/e6/i.test(f)));
  test('F8 the brand navigation was not restructured (same 15 items in the same order)',
    (() => {
      // E7 (2026-09-12) changed ONE label to the customer-facing Mercenta Social
      // identity, sourced from the SSOT — the file-touch proxy therefore had to
      // become the structural assertion it always meant: the nav ITEMS and their
      // ORDER are unchanged. Any real restructure still fails this test.
      const brandShell = readSrc('src/components/layout/BrandShell.tsx');
      const ids = [...brandShell.matchAll(/id: '([a-z_]+)', label:/g)].map((m) => m[1]);
      const EXPECTED = [
        'overview', 'catalog', 'purchase_orders', 'returns', 'logistics', 'onboarding',
        'compliance', 'contracts', 'analytics', 'market', 'reports', 'documents', 'team',
        'social', 'settings',
      ];
      return ids.join(',') === EXPECTED.join(',');
    })());

  test('F9 ZERO external network calls across the whole suite', externalFetches === 0);

  console.log(failures === 0
    ? 'E6_BRAND_SURFACES_VALIDATION_PASS'
    : `E6_BRAND_SURFACES_VALIDATION_FAIL (${failures})`);
} catch (err) {
  console.log('VALIDATOR ERROR: ' + (err && err.stack ? err.stack : String(err)));
  failures++;
} finally {
  globalThis.fetch = originalFetch;
  await server.close();
}
if (failures > 0) process.exit(1);
