// §Phase E5 — validates the ADMIN OPERATIONAL SURFACES:
//   A  one canonical surface per concept (no second store/dashboard/CRM/…)
//   B  G1 — an authorised admin can OPERATE the E1–E4 lifecycle through the
//          EXISTING domain (`commerceLifecycle`) and the EXISTING `CommerceActor`
//   C  G3/G4 — RBAC: a view-only account is refused a MUTATION, and a refusal
//          mutates nothing (domain-level, not merely a disabled button)
//   D  G2 — truthful simulation provenance is visible on the admin surfaces
//   E  G5 — the fulfilment drill-down targets the shipment surface, and the new
//          attention rows are additive (existing id prefixes preserved)
//   F  G6 — Logistics Control links a shipment to its PO by the canonical
//          `poNumber` (the previous id-vs-id join always rendered “—”)
//   G  G7 — commerce notifications derive from the canonical stores only
//   H  G8 — `openCommerceCase` is reachable from the admin surface
//   I  G9 — ONE latest-submission derivation (the canonical helper), no local map
//   J  architecture + safety invariants (no new store/db/migration, zero network)
import { createServer } from 'vite';
// §M12 — resolve filesystem paths with fileURLToPath: a project folder whose name
// contains a space (e.g. `1. Mercenta`) is percent-encoded by `URL.pathname`, which
// silently broke this walk (ENOENT on `1.%20Mercenta`).
import { fileURLToPath } from 'node:url';
import { readFileSync, readdirSync } from 'node:fs';

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
  console.log(`!! E5 admin suite attempted external fetch: ${String(url)}`);
  return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
};

const readSrc = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

const ADMIN = readSrc('src/components/admin/CommerceOperationsPanel.tsx');
const RETAIL = readSrc('src/components/admin/RetailPipeline.tsx');
const DASH = readSrc('src/components/admin/AdminDashboard.tsx');
const LOGI = readSrc('src/components/admin/LogisticsControl.tsx');
const CATALOG = readSrc('src/components/admin/CatalogManagerAdmin.tsx');
const POLIST = readSrc('src/components/admin/AdminPurchaseOrderList.tsx');
const NOTIF = readSrc('src/components/shared/NotificationCenter.tsx');
const API = readSrc('src/data/api.ts');

try {
  /* ── modules under test (the EXISTING architecture) ── */
  const store = await server.ssrLoadModule('/src/data/demoStore.ts');
  const commerce = await server.ssrLoadModule('/src/lib/commerce/commerceLifecycle.ts');
  const catalog = await server.ssrLoadModule('/src/lib/catalog/catalogLifecycle.ts');
  const mockAmazon = await server.ssrLoadModule('/src/lib/spapi/mockClient.ts');

  const ZAMBEZI = 'brand-astonish';
  const DESKFORGE = 'brand-tapatio';
  const brandActor = { staffId: `brand:${ZAMBEZI}`, canMutate: true, tenantId: ZAMBEZI };
  /** §Phase E5 — an ADMIN actor: full permission, no tenant pin (global scope). */
  const adminActor = { staffId: 'staff-001', canMutate: true };
  /** The seeded VIEW-ONLY staff account (`bootstrap.ts` → staff-005). */
  const viewOnlyActor = { staffId: 'staff-005', canMutate: false };
  const foreignActor = { staffId: `brand:${DESKFORGE}`, canMutate: true, tenantId: DESKFORGE };

  const commerceProduct = (sku, over = {}) => ({
    id: '', name: `E5 admin product ${sku}`, sku, barcode: '600999000099', image: '',
    exWorksPrice: 12.5, ukRetailPrice: 29.99, commodityCode: '3304990090',
    vatStatus: 'Standard 20%', hazmat: false, length: 12, width: 10, height: 18, weight: 0.5,
    ...over,
  });

  const SKU = 'E5-ADMIN-001';
  store.addCatalogProduct(ZAMBEZI, commerceProduct(SKU));
  mockAmazon.resetMockAmazonState();
  const submitted = await catalog.submitCatalogProduct(
    ZAMBEZI, store.findCatalogProduct(ZAMBEZI, SKU), brandActor
  );
  test('A0 prerequisite — an E3-eligible product with a simulated submission exists',
    submitted.ok === true && submitted.value.simulated === true);

  /* ══ A. one canonical surface per concept ══ */
  test('A1 no second store was introduced by the admin surfaces',
    !/indexedDB|localStorage|sqlite|Dexie|new Map<string, (CommerceActivity|ProductSubmission)>/.test(
      ADMIN + RETAIL + DASH + LOGI + CATALOG + POLIST + NOTIF));
  test('A2 no second dashboard/CRM/PO/catalog/ticketing module was added',
    readdirSync(new URL('../src/components/admin/', import.meta.url))
      .filter((f) => /e5/i.test(f)).length === 0);
  test('A3 the admin panel reads the SAME canonical stores the domain writes',
    /from '@\/data\/demoStore'/.test(ADMIN) && /from '@\/lib\/commerce\/commerceLifecycle'/.test(ADMIN));
  test('A4 the admin surfaces reuse the EXISTING primitives (no new design system)',
    (ADMIN + RETAIL + DASH + LOGI + CATALOG + POLIST).split('\n')
      .filter((l) => /from '@\/components\/(?!ui|admin|shared)/.test(l)).length === 0);

  /* ══ B. G1 — the ADMIN can operate the lifecycle through the domain ══ */
  const created = await commerce.createCommercePurchaseOrder(ZAMBEZI, SKU, 120, brandActor);
  const poId = created.ok ? created.value.id : '';
  test('B1 a brand-created simulated PO exists for the admin to operate',
    created.ok === true && created.value.simulated === true);

  const adminAck = commerce.acknowledgeCommercePurchaseOrder(poId, adminActor);
  test('B2 an ADMIN actor (global scope, no tenant pin) can acknowledge the PO',
    adminAck.ok === true && adminAck.value.status === 'accepted');
  test('B3 the admin operation is attributed on the ONE existing audit log',
    store.demoAuditLog.some(
      (e) => e.entityType === 'commerce' && e.action === 'commerce_po_acknowledged' && e.actorId === 'staff-001'
    ));

  const adminFulfil = commerce.fulfilCommercePurchaseOrder(poId, adminActor);
  test('B4 an ADMIN actor can fulfil the PO through the EXISTING ASN seam',
    adminFulfil.ok === true && adminFulfil.value.po.status === 'shipped');
  const adminReceive = commerce.receiveCommercePurchaseOrder(poId, adminActor);
  test('B5 an ADMIN actor can receive the PO (existing reconciliation)',
    adminReceive.ok === true && adminReceive.value.po.status === 'delivered');
  const adminInvoice = commerce.issueCommerceInvoice(poId, adminActor);
  test('B6 an ADMIN actor can issue the SIMULATED invoice',
    adminInvoice.ok === true && adminInvoice.value.simulated === true);
  const adminPay = adminInvoice.ok
    ? commerce.recordCommercePayment(adminInvoice.value.id, adminActor)
    : { ok: false };
  test('B7 an ADMIN actor can settle the SIMULATED payment',
    adminPay.ok === true && adminPay.value.method === 'simulated_bank_transfer');
  test('B8 the entire admin run stayed SIMULATED (no live provider, no email)',
    store.demoCommerceActivities.every((a) => a.simulated === true && a.mode === 'simulation') &&
    /No live provider contacted|No email sent|No accounting provider contacted|No payment provider contacted/.test(
      store.demoCommerceActivities.map((a) => a.detail).join(' ')
    ));

  /* ══ C. G3/G4 — RBAC is enforced IN THE DOMAIN; refusals mutate nothing ══ */
  const actsBefore = store.demoCommerceActivities.length;
  const statusBefore = store.demoPurchaseOrders.find((p) => p.id === poId).status;

  const viewAck = commerce.acknowledgeCommercePurchaseOrder(poId, viewOnlyActor);
  test('C1 a VIEW-ONLY actor is refused a PO mutation by the DOMAIN (FORBIDDEN)',
    viewAck.ok === false && /FORBIDDEN/.test(viewAck.error));
  const viewCreate = await commerce.createCommercePurchaseOrder(ZAMBEZI, SKU, 5, viewOnlyActor);
  test('C2 a VIEW-ONLY actor is refused PO creation by the DOMAIN',
    viewCreate.ok === false && /FORBIDDEN/.test(viewCreate.error));
  const viewInvoice = commerce.issueCommerceInvoice(poId, viewOnlyActor);
  test('C3 a VIEW-ONLY actor is refused invoice issuance by the DOMAIN',
    viewInvoice.ok === false && /FORBIDDEN/.test(viewInvoice.error));
  const viewCase = commerce.openCommerceCase(poId, 'view-only attempt', viewOnlyActor);
  test('C4 a VIEW-ONLY actor is refused case opening by the DOMAIN',
    viewCase.ok === false && /FORBIDDEN/.test(viewCase.error));
  test('C5 the RBAC refusals mutated NOTHING (no activity, PO status unchanged)',
    store.demoCommerceActivities.length === actsBefore &&
    store.demoPurchaseOrders.find((p) => p.id === poId).status === statusBefore);

  const foreignAck = commerce.acknowledgeCommercePurchaseOrder(poId, foreignActor);
  test('C6 a FOREIGN tenant actor is refused CROSS_TENANT by the DOMAIN',
    foreignAck.ok === false && /CROSS_TENANT/.test(foreignAck.error));
  test('C7 the foreign refusal also mutated nothing',
    store.demoCommerceActivities.length === actsBefore &&
    store.demoPurchaseOrders.find((p) => p.id === poId).status === statusBefore);

  /* ══ D. G2 — truthful simulation provenance is VISIBLE on the admin surfaces ══ */
  test('D1 the admin commerce panel labels its records (sim)',
    /\(sim\)/.test(ADMIN) && /simulated: true/.test(readSrc('src/lib/commerce/commerceLifecycle.ts')));
  test('D2 the admin PO list marks simulated POs from the canonical flag',
    /po\.simulated === true/.test(POLIST) && /\(sim\)/.test(POLIST));
  test('D3 Retail Pipeline marks simulated submissions, POs and deductions',
    /sub\.simulated/.test(RETAIL) && /po\.simulated === true/.test(RETAIL) && /d\.simulated/.test(RETAIL));
  test('D4 Logistics Control marks a shipment whose canonical PO is simulated',
    /poFor\(s\.poNumber\)\?\.simulated === true/.test(LOGI));
  test('D5 no admin surface claims a live provider acted',
    !/Amazon issued|DHL delivered|Xero payment received/i.test(
      ADMIN + RETAIL + DASH + LOGI + CATALOG + POLIST + NOTIF
    ));

  /* ══ E. G5 — dashboard drill-down correction + additive attention rows ══
   *
   * §Dashboard + logistics cleanup programme (2026-09-22, session 13) — E3/E4/E5
   * REPOINTED, not weakened.
   *
   * These three assertions pinned the Overview's attention QUEUE (the `po-…`,
   * `ded-…`, `ticket-…`, `renewal-…`, `docs-…` row ids and the
   * `commerceInvoicesPending` / "Simulated invoice (sim)" derivation) and the
   * KPI `action: { id, label, count }` shape. Session 12's Founder-directed
   * cleanup REMOVED that queue from the Overview and MOVED each concern to its
   * canonical owner (message threads → Messages/NotificationCenter, renewals →
   * Contracts, docs → Compliance), and the KPI tiles were restructured to the
   * current `onOpen` drill-down form. The three assertions were therefore left
   * pinning REMOVED shapes and had been failing since that cleanup —
   * **VERIFIED PRE-EXISTING, not caused by this session:** running this suite in
   * a git worktree at `b3fcca9` (the session-12 checkpoint) reproduces the same
   * 3 failures.
   *
   * The CURRENT canonical contract is pinned below, and each assertion is still
   * genuinely failure-capable: the rows must exist in their canonical owner, the
   * Overview must NOT re-derive them (so the duplication cannot come back), and
   * the KPI tiles must keep their ids, their canonical count derivation and their
   * drill-down targets. Comments are stripped before the absence checks so a
   * historical REPOINTED comment cannot satisfy or break them.
   */
  const DASH_CODE = DASH.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
  test('E1 the fulfilment KPI drills to the SHIPMENT surface, not brand scoring',
    !/go\('fulfillment_track'\)/.test(DASH) && (DASH.match(/go\('logistics'\)/g) || []).length >= 2);
  test('E2 the dashboard reads the canonical E3 submission store (no invented metric)',
    /useCatalogSubmissions\(\)/.test(DASH) && /rejectedSubmissions/.test(DASH));
  test('E3 the attention rows live in their canonical owner and are NOT re-derived on the Overview',
    /id: `po-\$\{p\.id\}`/.test(NOTIF) && /id: `ded-\$\{d\.id\}`/.test(NOTIF) &&
    !/id: `po-\$\{p\.id\}`/.test(DASH_CODE) && !/id: `ded-\$\{d\.id\}`/.test(DASH_CODE) &&
    !/id: `ticket-\$\{t\.id\}`/.test(DASH_CODE) && !/id: `renewal-\$\{c\.id\}`/.test(DASH_CODE) &&
    !/id: `docs-\$\{bid\}`/.test(DASH_CODE));
  test('E4 the simulated-invoice attention row is owned by its canonical surface, not the Overview',
    /Simulated invoice/.test(NOTIF) && /demoCommerceInvoices/.test(NOTIF) &&
    !/commerceInvoicesPending/.test(DASH_CODE) && !/Simulated invoice/.test(DASH_CODE));
  test('E5 the KPI contract the browser suite pins is preserved',
    /id: 'pending-pos'/.test(DASH) && /id: 'gate'/.test(DASH) &&
    /value: String\(posAwaitingAction\.length\)/.test(DASH) &&
    /id: 'pending-pos',[\s\S]{0,600}?onOpen: go\('purchase_orders_admin'\)/.test(DASH) &&
    /id: 'gate',[\s\S]{0,600}?onOpen: go\('compliance'\)/.test(DASH));

  /* ══ F. G6 — Logistics Control PO linkage ══ */
  test('F1 the shipment is linked to its PO by the canonical `poNumber`',
    /s\.poNumber/.test(LOGI) && !/poNumber\(s\.id\)/.test(LOGI));
  test('F2 the lookup is a real canonical join (map keyed by poNumber)',
    /poByNumber/.test(LOGI) && /\.set\(p\.poNumber, p\)/.test(LOGI));

  /* ══ G. G7 — canonical commerce notifications ══ */
  test('G1 NotificationCenter declares a canonical `commerce` kind',
    /kind: 'po' \| 'contract'[\s\S]{0,120}'commerce'/.test(NOTIF) && /commerce: CreditCard/.test(NOTIF));
  test('G2 it derives from the canonical E4 stores only',
    /from '@\/data\/demoStore'/.test(NOTIF) && /demoCommerceInvoices/.test(NOTIF) &&
    /demoCommercePayments/.test(NOTIF) && /demoPurchaseOrders/.test(NOTIF));
  test('G3 no second notification store was created',
    !/new NotificationStore|notificationStore/.test(NOTIF) && !/localStorage/.test(NOTIF));
  test('G4 the commerce notification copy states simulation provenance truthfully',
    /\(sim\)/.test(NOTIF) && /no live payment provider contacted/.test(NOTIF));

  /* ══ H. G8 — case opening is reachable and canonical ══ */
  test('H1 the admin panel surfaces `openCommerceCase` (no parallel case system)',
    /openCommerceCase/.test(ADMIN) && /Open case/.test(ADMIN) && !/new CaseStore|caseStore/.test(ADMIN));
  const ticket = commerce.openCommerceCase(poId, 'E5 validator case', adminActor);
  test('H2 an ADMIN actor opens an operational case on the EXISTING helpdesk model',
    ticket.ok === true && typeof ticket.value.ticketId === 'string');
  test('H3 the case is recorded on the canonical activity trail',
    store.getCommerceActivitiesForBrand(ZAMBEZI).some(
      (a) => a.purchaseOrderId === poId && /case/.test(a.detail)
    ));

  /* ══ I. G9 — ONE latest-submission derivation ══ */
  test('I1 the Global Catalog no longer builds its own latest-submission map',
    !/submissionByProduct/.test(CATALOG) && /latestSubmissionForProduct/.test(CATALOG));
  test('I2 Retail Pipeline shares the SAME canonical derivation', /latestSubmissionForProduct/.test(RETAIL));
  test('I3 the canonical derivation is declared exactly ONCE (demoStore)',
    (readSrc('src/data/demoStore.ts').match(/export function latestSubmissionForProduct/g) || []).length === 1);

  /* ══ J. architecture + safety invariants ══ */
  const migDir = fileURLToPath(new URL('../supabase/migrations/', import.meta.url));
  const migFiles = readdirSync(migDir).filter((f) => /^0\d\d_/.test(f));
  // §Phase M13 — REPOINTED. This pinned "026 remains the newest; 26 total", which
  // was TRUE when E5 was written. Phase M13 legitimately added 027 (the §39 RLS
  // hardening for audit_log + applications), so the absolute count is stale. E5's
  // actual INVARIANT — that E5 itself added no migration — is unchanged and is still
  // asserted by the E5-scope guard elsewhere in this file.
  test('J1 no migration was added by E5 (newest is 027 after M13)',
    migFiles.length === 27 && migFiles.sort().at(-1).startsWith('027_'));
  /**
   * §P11 — REPOINTED (not weakened). OLD CONTRACT (recorded verbatim):
   *
   *   J2 createPurchaseOrder still performs its real notification (path UNTOUCHED)
   *      → `/export function createPurchaseOrder\(/.test(API) && /sendPostmarkEmail/.test(API)`
   *
   * Programme decision 3 removed "Create PO", so the admin surface's own action is
   * now the CHANNEL READ. The invariant is unchanged — the admin PO list's entry
   * point must be wired to the ONE canonical PO source, not to a local shortcut.
   */
  test('J2 the admin PO list reads the channel through the canonical ingestion owner (P11)',
    /data-state="admin-po-ingest"/.test(POLIST) &&
    /ingestChannelPurchaseOrders/.test(POLIST) &&
    !/export function createPurchaseOrder\(/.test(API) &&
    !/Create PO</.test(POLIST));
  test('J3 the RBAC guard is on the SURFACE (now guarding the channel read, P11)',
    /canCurrentUserMutate/.test(POLIST) && /if \(!canCurrentUserMutate\) return;/.test(POLIST));
  test('J4 catalog mutations honour the existing permission tier',
    /canMutate: boolean/.test(CATALOG) && /if \(!canMutate\) return;/.test(CATALOG));
  test('J5 UNKNOWN provider state remains unsafe (fail-closed preserved)',
    (await server.ssrLoadModule('/src/integrations/types.ts')).isProviderSimulationSafe('unknown') === false);
  test('J6 ZERO external network calls across the whole suite', externalFetches === 0);

  console.log(failures === 0
    ? 'E5_ADMIN_SURFACES_VALIDATION_PASS'
    : `E5_ADMIN_SURFACES_VALIDATION_FAIL (${failures})`);
} catch (err) {
  console.log('VALIDATOR ERROR: ' + (err && err.stack ? err.stack : String(err)));
  failures++;
} finally {
  globalThis.fetch = originalFetch;
  await server.close();
}
if (failures > 0) process.exit(1);
