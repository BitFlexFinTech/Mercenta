/**
 * §P8 — INVENTORY + CHANNEL-IDENTIFIER CONTRACT VALIDATOR.
 *
 * The browser suite proves the surfaces RENDER and ACT. This validator proves the
 * parts a browser test cannot reach cheaply, and it EXECUTES the REAL modules
 * through the PROJECT'S OWN module graph (Vite SSR — the same loader
 * `validate-p7-invoicing`, `validate-e4-commerce` and `validate-work-layer` use)
 * rather than grepping source text: a text assertion would pass even if the
 * arithmetic were wrong.
 *
 * Asserted behaviour (programme decision 5 · programme decision 10 · AV-029):
 *   A  the unit of measure is Eaches/Cases only; a case entry uses the product's
 *      own case pack; an undeclared unit or a case entry with no case pack FAILS
 *      CLOSED (a case is never silently read as one each)
 *   B  every stock figure is DERIVED from the append-only movement ledger —
 *      on-hand / committed / inbound are its sums and available = on-hand −
 *      committed; a movement that would take a bucket negative is refused
 *   C  a counted correction requires a STATED reason; a zero quantity and an
 *      undeclared movement type are refused
 *   D  the status is derived (out of stock / below safety stock / in stock) and an
 *      OVERSOLD position is stated, never clamped
 *   E  the identifier is 10 alphanumeric characters or the unmistakable
 *      SIM-ASIN-… placeholder; a brand declaration requires the
 *      already-exists-on-the-channel confirmation; a placeholder is refused from
 *      a brand; a channel-assigned identifier cannot be replaced by a brand
 *   F  THE PLATFORM NEVER INVENTS A REAL-LOOKING IDENTIFIER — asserted on the
 *      seed, on the generated placeholder and on every source file
 *   G  the CHANNEL half of decision 10 works: the seam returns the identifier when
 *      it accepts the product, and driving the real lifecycle records it
 *   H  RBAC + TENANT ISOLATION hold in the DOMAIN, and every write is audited
 *   I  ONE owner per value across `src/` — no second declaration of the units,
 *      the movement types, the refusals, the identifier rule or the arithmetic
 *   J  ZERO network calls — asserted by intercepting `fetch` AND by source scan
 *
 * Run: node scripts/validate-p8-inventory.mjs
 */
import { createServer } from 'vite';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let pass = 0;
let fail = 0;
const errors = [];

function check(name, ok, detail = '') {
  if (ok) {
    pass++;
    console.log(`  PASS  ${name}`);
  } else {
    fail++;
    errors.push(`${name}${detail ? ` — ${detail}` : ''}`);
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

/* ── Zero-network guard: any intercepted call would be a P8 defect ────────── */

let externalFetches = 0;
globalThis.fetch = async (url) => {
  externalFetches++;
  console.log(`!! P8 suite attempted an external fetch: ${String(url)}`);
  return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
};

const readSrc = (rel) => readFileSync(path.join(ROOT, rel), 'utf8');

/** Every source file under `src/`, for the one-owner assertions. */
function srcFiles(dir = 'src', acc = []) {
  for (const entry of readdirSync(path.join(ROOT, dir))) {
    const rel = `${dir}/${entry}`;
    if (statSync(path.join(ROOT, rel)).isDirectory()) srcFiles(rel, acc);
    else if (/\.(ts|tsx)$/.test(entry)) acc.push(rel);
  }
  return acc;
}

/* ── Load the REAL modules through the project's own graph ────────────────── */

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });

const store = await server.ssrLoadModule('/src/data/demoStore.ts');
const record = await server.ssrLoadModule('/src/lib/inventory/inventoryRecord.ts');
const lifecycle = await server.ssrLoadModule('/src/lib/inventory/inventoryLifecycle.ts');
const asin = await server.ssrLoadModule('/src/lib/catalog/asin.ts');
const catalog = await server.ssrLoadModule('/src/lib/catalog/catalogLifecycle.ts');
const mock = await server.ssrLoadModule('/src/lib/spapi/mockClient.ts');

const BRAND = 'p8-brand-a';
const OTHER = 'p8-brand-b';
const actor = { staffId: `brand:${BRAND}`, canMutate: true, tenantId: BRAND };
const otherActor = { staffId: `brand:${OTHER}`, canMutate: true, tenantId: OTHER };
const viewOnly = { staffId: 'staff-005', canMutate: false, tenantId: BRAND };
const staffActor = { staffId: 'staff-002', canMutate: true };

/** A canonical product for the test tenant (idempotent by design). */
let skuSeq = 0;
function makeProduct(overrides = {}) {
  skuSeq += 1;
  const sku = `SKU-P8-${skuSeq}`;
  store.addCatalogProduct(BRAND, {
    id: `prd-${BRAND}-${sku}`,
    name: `P8 widget ${skuSeq}`,
    sku,
    barcode: `600000000${String(skuSeq).padStart(3, '0')}`,
    image: '📦',
    exWorksPrice: 10,
    ukRetailPrice: 25,
    commodityCode: '3304990090',
    vatStatus: 'Standard 20%',
    hazmat: false,
    length: 10,
    width: 10,
    height: 10,
    weight: 1,
    unitsPerCase: 12,
    ...overrides,
  });
  return sku;
}

/** The audit facts of one entity type on the canonical log. */
const auditsFor = (entityType) => store.demoAuditLog.filter((a) => a.entityType === entityType);

/* ══ A. THE UNIT OF MEASURE (decision 5 · AV-029) ══════════════════════════ */

console.log('\nA. Units of measure');
check('A1 the declared units are Eaches and Cases only',
  JSON.stringify(record.INVENTORY_UOMS) === JSON.stringify(['eaches', 'cases']),
  JSON.stringify(record.INVENTORY_UOMS));
check('A2 the declared fallback settings are eaches with no reorder trigger',
  record.INVENTORY_DEFAULT_SETTINGS.uom === 'eaches' && record.INVENTORY_DEFAULT_SETTINGS.safetyStock === 0);
check('A3 an undeclared unit is refused, never coerced',
  record.isInventoryUom('pallets') === false &&
  record.isInventoryUom('') === false &&
  record.isInventoryUom(undefined) === false &&
  record.isInventoryUom('eaches') === true &&
  record.isInventoryUom('cases') === true);
check('A4 an eaches entry converts 1:1 (unitsPerCaseUsed 1)',
  (() => { const c = record.convertEntryToEaches(7, 'eaches', 12); return c.ok && c.eaches === 7 && c.unitsPerCaseUsed === 1; })());
check('A5 a cases entry converts with the product\u2019s OWN case pack',
  (() => { const c = record.convertEntryToEaches(3, 'cases', 12); return c.ok && c.eaches === 36 && c.unitsPerCaseUsed === 12; })());
check('A6 a cases entry with NO declared case pack FAILS CLOSED (never silently 1 each)',
  (() => { const c = record.convertEntryToEaches(3, 'cases', undefined); return !c.ok && c.error.startsWith('INVENTORY_CASE_PACK_UNKNOWN'); })());
check('A7 a zero/negative case pack is treated as undeclared',
  (() => { const c = record.convertEntryToEaches(3, 'cases', 0); return !c.ok && c.error.startsWith('INVENTORY_CASE_PACK_UNKNOWN'); })());
check('A8 unitsPerCaseOf refuses a non-positive or non-finite case pack',
  record.unitsPerCaseOf({ unitsPerCase: 0 }) === undefined &&
  record.unitsPerCaseOf({ unitsPerCase: -4 }) === undefined &&
  record.unitsPerCaseOf({}) === undefined &&
  record.unitsPerCaseOf({ unitsPerCase: 6 }) === 6);

/* ══ B. THE FIGURES ARE DERIVED FROM THE APPEND-ONLY LEDGER ════════════════ */

console.log('\nB. The ledger is the only source of a stock figure');
const t1 = makeProduct();

const r1 = lifecycle.recordStockMovement(
  { brandId: BRAND, sku: t1, type: 'opening', quantity: 100, uom: 'eaches' }, actor);
check('B1 an opening balance is recorded on the on-hand bucket',
  r1.ok && r1.value.bucket === 'on_hand' && r1.value.quantityDelta === 100,
  r1.ok ? `${r1.value.bucket} ${r1.value.quantityDelta}` : r1.error);

const r2 = lifecycle.recordStockMovement(
  { brandId: BRAND, sku: t1, type: 'receipt', quantity: 2, uom: 'cases' }, actor);
check('B2 a case-based receipt is converted to eaches using the product\u2019s case pack',
  r2.ok && r2.value.quantityDelta === 24 && r2.value.unitsPerCaseUsed === 12,
  r2.ok ? `${r2.value.quantityDelta} (pack ${r2.value.unitsPerCaseUsed})` : r2.error);

const r3 = lifecycle.recordStockMovement(
  { brandId: BRAND, sku: t1, type: 'commitment', quantity: 42, uom: 'eaches' }, actor);
check('B3 a commitment lands on the committed bucket',
  r3.ok && r3.value.bucket === 'committed' && r3.value.quantityDelta === 42);

const r4 = lifecycle.recordStockMovement(
  { brandId: BRAND, sku: t1, type: 'inbound_expected', quantity: 5, uom: 'cases' }, actor);
check('B4 an inbound expectation lands on the inbound bucket, converted to eaches',
  r4.ok && r4.value.bucket === 'inbound' && r4.value.quantityDelta === 60,
  r4.ok ? `${r4.value.quantityDelta}` : r4.error);

const derived = lifecycle.inventoryForProduct(BRAND, t1, actor);
const totalsFromLedger = record.bucketTotals(store.getInventoryMovements(BRAND, t1));
check('B5 the derived on-hand equals the ledger sum',
  derived.ok && derived.value.onHand === totalsFromLedger.onHand && derived.value.onHand === 124,
  derived.ok ? `${derived.value.onHand} vs ${totalsFromLedger.onHand}` : derived.error);
check('B6 the derived committed equals the ledger sum',
  derived.ok && derived.value.committed === 42 && derived.value.committed === totalsFromLedger.committed);
check('B7 the derived inbound equals the ledger sum',
  derived.ok && derived.value.inbound === 60 && derived.value.inbound === totalsFromLedger.inbound);
check('B8 available = on-hand − committed',
  derived.ok &&
    derived.value.available === derived.value.onHand - derived.value.committed &&
    derived.value.available === 82,
  derived.ok ? `${derived.value.available}` : derived.error);
check('B9 the record is a PROJECTION: re-deriving from the same ledger is identical',
  (() => {
    const again = lifecycle.inventoryForProduct(BRAND, t1, actor);
    return JSON.stringify(derived.value) === JSON.stringify(again.value);
  })());
check('B10 the ledger is APPEND-ONLY: recording adds and never rewrites an earlier row',
  (() => {
    const before = store.getInventoryMovements(BRAND, t1);
    const n = before.length;
    const first = before[0];
    lifecycle.recordStockMovement(
      { brandId: BRAND, sku: t1, type: 'dispatch', quantity: 4, uom: 'eaches' }, actor);
    const after = store.getInventoryMovements(BRAND, t1);
    return (
      after.length === n + 1 &&
      after[0].id === first.id &&
      after[0].quantityDelta === first.quantityDelta
    );
  })());
check('B11 a dispatch REMOVES from on-hand (the platform declares the direction)',
  (() => {
    const d = lifecycle.inventoryForProduct(BRAND, t1, actor);
    return d.ok && d.value.onHand === 120;
  })());
check('B12 a movement that would take a bucket NEGATIVE is refused',
  (() => {
    const res = lifecycle.recordStockMovement(
      { brandId: BRAND, sku: t1, type: 'dispatch', quantity: 99999, uom: 'eaches' }, actor);
    return !res.ok && res.error.startsWith('INVENTORY_NEGATIVE_BUCKET');
  })());
check('B13 a commitment beyond the on-hand position is ALLOWED (oversold is a real position)',
  (() => {
    const res = lifecycle.recordStockMovement(
      { brandId: BRAND, sku: t1, type: 'commitment', quantity: 200, uom: 'eaches' }, actor);
    const d = lifecycle.inventoryForProduct(BRAND, t1, actor);
    return res.ok && d.ok && d.value.available < 0;
  })());

/* ══ C. THE REFUSALS (never coerced) ══════════════════════════════════════ */

console.log('\nC. Refusals');
const t2 = makeProduct();
lifecycle.recordStockMovement(
  { brandId: BRAND, sku: t2, type: 'opening', quantity: 50, uom: 'eaches' }, actor);

check('C1 a counted correction WITHOUT a reason is refused',
  (() => {
    const res = lifecycle.recordStockMovement(
      { brandId: BRAND, sku: t2, type: 'adjustment', quantity: 5, uom: 'eaches', bucket: 'on_hand' },
      actor);
    return !res.ok && res.error.startsWith('INVENTORY_ADJUSTMENT_REASON_REQUIRED');
  })());
check('C2 a counted correction WITH a reason is accepted and records it',
  (() => {
    const res = lifecycle.recordStockMovement(
      {
        brandId: BRAND,
        sku: t2,
        type: 'adjustment',
        quantity: -3,
        uom: 'eaches',
        bucket: 'on_hand',
        reason: 'Annual stock count',
      },
      actor);
    return res.ok && res.value.quantityDelta === -3 && res.value.reason === 'Annual stock count';
  })());
check('C3 a zero quantity is refused',
  (() => {
    const res = lifecycle.recordStockMovement(
      { brandId: BRAND, sku: t2, type: 'receipt', quantity: 0, uom: 'eaches' }, actor);
    return !res.ok && res.error.startsWith('INVENTORY_QUANTITY_INVALID');
  })());
check('C4 a non-numeric quantity is refused',
  (() => {
    const res = lifecycle.recordStockMovement(
      { brandId: BRAND, sku: t2, type: 'receipt', quantity: NaN, uom: 'eaches' }, actor);
    return !res.ok && res.error.startsWith('INVENTORY_QUANTITY_INVALID');
  })());
check('C5 an undeclared movement type is refused',
  (() => {
    const res = lifecycle.recordStockMovement(
      { brandId: BRAND, sku: t2, type: 'teleport', quantity: 5, uom: 'eaches' }, actor);
    return !res.ok && res.error.startsWith('INVENTORY_MOVEMENT_TYPE_UNKNOWN');
  })());
check('C6 an undeclared unit is refused on the write path',
  (() => {
    const res = lifecycle.recordStockMovement(
      { brandId: BRAND, sku: t2, type: 'receipt', quantity: 5, uom: 'pallets' }, actor);
    return !res.ok && res.error.startsWith('INVENTORY_UOM_UNKNOWN');
  })());
check('C7 a case-based movement for a product with NO case pack is refused',
  (() => {
    const noPack = makeProduct({ unitsPerCase: undefined });
    const res = lifecycle.recordStockMovement(
      { brandId: BRAND, sku: noPack, type: 'receipt', quantity: 3, uom: 'cases' }, actor);
    return !res.ok && res.error.startsWith('INVENTORY_CASE_PACK_UNKNOWN');
  })());
check('C8 a negative safety stock is refused',
  (() => {
    const res = lifecycle.setInventorySettings(
      { brandId: BRAND, sku: t2, safetyStock: -5 }, actor);
    return !res.ok && res.error.startsWith('INVENTORY_SAFETY_STOCK_INVALID');
  })());
check('C9 an undeclared unit on the settings path is refused',
  (() => {
    const res = lifecycle.setInventorySettings({ brandId: BRAND, sku: t2, uom: 'pallets' }, actor);
    return !res.ok && res.error.startsWith('INVENTORY_UOM_UNKNOWN');
  })());

/* ══ D. THE DERIVED STATUS ════════════════════════════════════════════════ */

console.log('\nD. Derived status');
check('D1 no stock at all is out of stock',
  record.inventoryStatusOf(0, 0, 10) === 'out_of_stock' &&
  record.inventoryStatusOf(-5, -5, 0) === 'out_of_stock');
check('D2 available below the reorder trigger is below safety stock',
  record.inventoryStatusOf(100, 9, 10) === 'below_safety_stock');
check('D3 available at or above the trigger is in stock',
  record.inventoryStatusOf(100, 10, 10) === 'in_stock' &&
  record.inventoryStatusOf(100, 500, 10) === 'in_stock');
check('D4 an oversold position is BELOW safety stock, never hidden',
  record.inventoryStatusOf(10, -40, 0) === 'below_safety_stock');
check('D5 the tenant summary is ONE derivation (sums + counts)',
  (() => {
    const listed = lifecycle.listBrandInventory(BRAND, actor);
    const summarised = lifecycle.inventorySummaryForBrand(BRAND, actor);
    if (!listed.ok || !summarised.ok) return false;
    const s = summarised.value;
    return (
      s.products === listed.value.length &&
      s.unitsOnHand === listed.value.reduce((a, r) => a + r.onHand, 0) &&
      s.unitsAvailable === listed.value.reduce((a, r) => a + r.available, 0) &&
      s.belowSafetyStock === listed.value.filter((r) => r.status === 'below_safety_stock').length
    );
  })());

/* ══ E. THE CHANNEL IDENTIFIER (decision 10) ══════════════════════════════ */

console.log('\nE. The channel identifier');
check('E1 the identifier shape is 10 alphanumeric characters',
  asin.ASIN_LENGTH === 10 &&
  asin.isAsinShape('B0ABCDEFGH') === true &&
  asin.isAsinShape('b0abcdefgh') === true &&
  asin.isAsinShape('B0ABCDEFG') === false &&
  asin.isAsinShape('B0ABCDEFGHI') === false &&
  asin.isAsinShape('B0ABCDE-GH') === false &&
  asin.isAsinShape('') === false &&
  asin.isAsinShape(undefined) === false);
check('E2 the placeholder is unmistakable and can never be mistaken for a real identifier',
  asin.isSimulatedAsin('SIM-ASIN-FOO') === true &&
  asin.isAsinShape(asin.simulatedAsinFor('SKU-1')) === false,
  asin.simulatedAsinFor('SKU-1'));
check('E3 the placeholder is DETERMINISTIC from the SKU',
  asin.simulatedAsinFor('SKU-1') === asin.simulatedAsinFor('SKU-1') &&
  asin.simulatedAsinFor('SKU-1').startsWith(asin.ASIN_SIMULATION_PREFIX));
check('E4 a brand declaration requires the existing-listing confirmation',
  (() => {
    const res = asin.validateBrandAsin('B0ABCDEFGH', false);
    return !res.ok && res.error.startsWith('ASIN_REQUIRES_EXISTING_LISTING');
  })());
check('E5 a brand may never supply the simulated placeholder',
  (() => {
    const res = asin.validateBrandAsin('SIM-ASIN-SKU1', true);
    return !res.ok && res.error.startsWith('ASIN_PLACEHOLDER');
  })());
check('E6 a brand declaration must have the real shape, normalised',
  (() => {
    const bad = asin.validateBrandAsin('nope', true);
    const good = asin.validateBrandAsin(' b0abcdefgh ', true);
    return !bad.ok && bad.error.startsWith('ASIN_SHAPE') && good.ok && good.asin === 'B0ABCDEFGH';
  })());
check('E7 a channel-assigned identifier OUTRANKS a brand declaration',
  asin.canReplaceIdentifier({ asin: 'B0ABCDEFGH', source: 'channel_assigned' }, 'brand_declared') === false &&
  asin.canReplaceIdentifier({ asin: 'B0ABCDEFGH', source: 'channel_assigned' }, 'channel_assigned') === true &&
  asin.canReplaceIdentifier({ asin: 'B0ABCDEFGH', source: 'brand_declared' }, 'channel_assigned') === true &&
  asin.canReplaceIdentifier(undefined, 'brand_declared') === true);
check('E8 the derived identifier state is none / pending the channel / assigned',
  asin.deriveAsinState(undefined, false) === 'none' &&
  asin.deriveAsinState(undefined, true) === 'pending_channel' &&
  asin.deriveAsinState({ asin: 'X' }, false) === 'assigned');
check('E9 the rule is stated where the identifier is handled',
  asin.ASIN_RULES.length >= 4 && /AV-035/.test(asin.ASIN_RULE_SOURCE));

const t3 = makeProduct();
check('E10 the DOMAIN refuses a placeholder from a brand',
  (() => {
    const res = lifecycle.declareBrandAsin(
      { brandId: BRAND, sku: t3, asin: 'SIM-ASIN-NOPE', productExistsOnChannel: true }, actor);
    return !res.ok && res.error.startsWith('ASIN_PLACEHOLDER');
  })());
check('E11 the DOMAIN refuses a declaration without the listing confirmation',
  (() => {
    const res = lifecycle.declareBrandAsin(
      { brandId: BRAND, sku: t3, asin: 'B0ABCDEFGH', productExistsOnChannel: false }, actor);
    return !res.ok && res.error.startsWith('ASIN_REQUIRES_EXISTING_LISTING');
  })());
check('E12 a valid brand declaration is recorded with its SOURCE and audited',
  (() => {
    const before = store.demoAuditLog.length;
    const res = lifecycle.declareBrandAsin(
      { brandId: BRAND, sku: t3, asin: 'B0ABCDEFGH', productExistsOnChannel: true }, actor);
    const ident = store.getProductIdentifier(BRAND, t3);
    const audit = store.demoAuditLog[store.demoAuditLog.length - 1];
    return (
      res.ok && ident && ident.asin === 'B0ABCDEFGH' && ident.source === 'brand_declared' &&
      ident.brandConfirmedExistingListing === true && ident.simulated === false &&
      store.demoAuditLog.length === before + 1 &&
      audit.action === 'inventory_identifier_declared' &&
      audit.entityType === 'product_identifier' && audit.actorId === actor.staffId
    );
  })());
check('E13 a brand declaration cannot replace a channel-assigned identifier',
  (() => {
    const t = makeProduct();
    const fromChannel = lifecycle.populateAsinFromChannel(
      { brandId: BRAND, sku: t, asin: 'B0CHANNEL1', simulated: false },
      { staffId: `brand:${BRAND}`, canMutate: true, tenantId: BRAND });
    const res = lifecycle.declareBrandAsin(
      { brandId: BRAND, sku: t, asin: 'B0BRANDXXX', productExistsOnChannel: true }, actor);
    return (
      fromChannel.ok &&
      !res.ok &&
      res.error.startsWith('ASIN_AUTHORITY_ORDER') &&
      store.getProductIdentifier(BRAND, t).asin === 'B0CHANNEL1'
    );
  })());

/* ══ F. THE PLATFORM NEVER INVENTS A REAL-LOOKING IDENTIFIER ═════════════ */

console.log('\nF. No invented identifier anywhere');
/**
 * ONLY the rows the SEED created are in scope here: the tests above legitimately
 * record brand-declared and channel identifiers, and this assertion is about the
 * fixture the platform itself ships.
 */
const seededIdentifiers = store
  .getAllProductIdentifiers()
  .filter((i) => i.recordedBy === 'seed:demo-baseline');
check('F1 every identifier the SEED created is the unmistakable placeholder',
  seededIdentifiers.length > 0 &&
    seededIdentifiers.every((i) => asin.isSimulatedAsin(i.asin) && i.simulated === true),
  `${seededIdentifiers.length} seeded identifier(s)`);
check('F2 no seeded identifier has the real 10-character shape',
  seededIdentifiers.every((i) => !asin.isAsinShape(i.asin)),
  seededIdentifiers.map((i) => i.asin).slice(0, 3).join(', '));
check('F3 no source file fabricates an ASIN by concatenating a prefix onto a SKU',
  (() => {
    const offenders = srcFiles().filter((rel) => /`B0\$\{/.test(readSrc(rel)));
    return offenders.length === 0;
  })());
check('F4 the simulation prefix is declared exactly once in `src/`',
  srcFiles().filter((rel) => /ASIN_SIMULATION_PREFIX\s*=/.test(readSrc(rel))).length === 1);

/* ══ G. THE CHANNEL HALF OF DECISION 10 (through the real seam) ══════════ */

console.log('\nG. Mercenta populates the identifier when the channel accepts the product');
mock.resetMockAmazonState();
const client = mock.createMockSpApiClient();
const t4 = makeProduct();
const registration = await client.submitCatalogItem({
  id: `prd-${BRAND}-${t4}`,
  name: `P8 channel probe ${t4}`,
  sku: t4,
});
check('G0 the seam accepted the submission (mock-first)',
  registration.ok && !!registration.submissionId, registration.error ?? '');

/** The seam's own response, polled until it resolves. */
let seamAsin;
for (let i = 0; i < 4 && !seamAsin; i += 1) {
  const st = await client.getSubmissionStatus(registration.submissionId);
  if (st.status === 'live') seamAsin = st.asin;
}
check('G1 the seam returns an identifier ONLY when it accepts the product, and it is the placeholder',
  typeof seamAsin === 'string' &&
    seamAsin.startsWith(asin.ASIN_SIMULATION_PREFIX) &&
    !asin.isAsinShape(seamAsin),
  String(seamAsin));

/* The same submission, driven through the real catalog LIFECYCLE. */
mock.resetMockAmazonState();
const registration2 = await client.submitCatalogItem({ id: 'probe', name: 'probe', sku: t4 });
const submissionId = registration2.submissionId;
store.recordCatalogSubmission({
  brandId: BRAND,
  productId: `prd-${BRAND}-${t4}`,
  productName: t4,
  sku: t4,
  submissionId,
  mode: 'mock',
  simulated: true,
});
const canonicalSubmissionId = store.catalogSubmissionId(BRAND, t4);
let last;
for (let i = 0; i < 3; i += 1) {
  last = await catalog.pollCatalogSubmission(canonicalSubmissionId, actor);
}
check('G2 driving the REAL lifecycle to acceptance records the canonical identifier',
  last?.ok && last.value.status === 'live' && !!store.getProductIdentifier(BRAND, t4),
  last?.ok ? last.value.status : last?.error);
const identFromChannel = store.getProductIdentifier(BRAND, t4);
check('G3 the recorded identifier came from the CHANNEL, marked simulated while the provider is mocked',
  !!identFromChannel &&
    identFromChannel.source === 'channel_assigned' &&
    identFromChannel.simulated === true &&
    asin.isSimulatedAsin(identFromChannel.asin),
  identFromChannel ? `${identFromChannel.source} simulated=${identFromChannel.simulated}` : 'missing');
check('G4 the submission and the canonical identifier CANNOT drift (both from the one response)',
  (() => {
    const sub = store.getCatalogSubmission(canonicalSubmissionId);
    return !!sub && !!identFromChannel && sub.asin === identFromChannel.asin;
  })());
const identifierAuditsBefore = store.demoAuditLog.filter(
  (a) => a.action === 'inventory_identifier_recorded' && a.entityId === `${BRAND}:${t4}`
).length;
const rePoll = await catalog.pollCatalogSubmission(canonicalSubmissionId, actor);
const identifierAuditsAfter = store.demoAuditLog.filter(
  (a) => a.action === 'inventory_identifier_recorded' && a.entityId === `${BRAND}:${t4}`
).length;
check('G5 re-polling an accepted submission does NOT re-record or re-audit the identifier',
  rePoll.ok &&
    identifierAuditsAfter === identifierAuditsBefore &&
    store.getProductIdentifier(BRAND, t4).asin === identFromChannel.asin,
  `audit facts ${identifierAuditsBefore} → ${identifierAuditsAfter}`);

/* ══ H. RBAC + TENANT ISOLATION + AUDIT (in the DOMAIN) ══════════════════ */

console.log('\nH. RBAC, tenant isolation and audit');
check('H1 a tenant-pinned actor may not READ another tenant\u2019s inventory',
  (() => {
    const res = lifecycle.listBrandInventory(OTHER, actor);
    return !res.ok && res.error.startsWith('CROSS_TENANT');
  })());
check('H2 a tenant-pinned actor may not WRITE another tenant\u2019s inventory',
  (() => {
    const res = lifecycle.recordStockMovement(
      { brandId: OTHER, sku: t1, type: 'receipt', quantity: 5, uom: 'eaches' }, actor);
    return !res.ok && res.error.startsWith('CROSS_TENANT');
  })());
check('H3 a view-only actor may not write',
  (() => {
    const res = lifecycle.recordStockMovement(
      { brandId: BRAND, sku: t1, type: 'receipt', quantity: 5, uom: 'eaches' }, viewOnly);
    return !res.ok && res.error.startsWith('FORBIDDEN');
  })());
check('H4 a view-only actor MAY read',
  (() => {
    const res = lifecycle.listBrandInventory(BRAND, viewOnly);
    return res.ok && Array.isArray(res.value);
  })());
check('H5 a view-only actor may not declare an identifier',
  (() => {
    const res = lifecycle.declareBrandAsin(
      { brandId: BRAND, sku: t1, asin: 'B0ABCDEFGH', productExistsOnChannel: true }, viewOnly);
    return !res.ok && res.error.startsWith('FORBIDDEN');
  })());
check('H6 every movement writes an attributed audit fact on the canonical log',
  (() => {
    const t = makeProduct();
    const before = auditsFor('inventory_movement').length;
    lifecycle.recordStockMovement(
      { brandId: BRAND, sku: t, type: 'opening', quantity: 30, uom: 'eaches' }, actor);
    const after = auditsFor('inventory_movement');
    const last = after[after.length - 1];
    return after.length === before + 1 && last.actorId === actor.staffId && last.brandId === BRAND;
  })());
check('H7 the settings write is audited too',
  (() => {
    const t = makeProduct();
    const before = auditsFor('inventory_settings').length;
    lifecycle.setInventorySettings({ brandId: BRAND, sku: t, safetyStock: 25 }, actor);
    return auditsFor('inventory_settings').length === before + 1;
  })());
check('H8 the admin override requires a stated reason',
  (() => {
    const res = lifecycle.adminOverrideAsin(
      { brandId: BRAND, sku: t1, asin: 'B0OVERRIDE', reason: '   ' }, staffActor);
    return !res.ok && res.error.startsWith('ASIN_REASON_REQUIRED');
  })());
check('H9 the admin override is REFUSED for a brand-pinned actor',
  (() => {
    const res = lifecycle.adminOverrideAsin(
      { brandId: BRAND, sku: t1, asin: 'B0OVERRIDE', reason: 'correction' }, actor);
    return !res.ok && res.error.includes('brand-pinned');
  })());
check('H10 the admin override succeeds for staff, attributed, and is audited',
  (() => {
    const before = store.demoAuditLog.length;
    const res = lifecycle.adminOverrideAsin(
      { brandId: BRAND, sku: t1, asin: 'B0OVERRIDE', reason: 'data-entry correction' },
      staffActor);
    const audit = store.demoAuditLog[store.demoAuditLog.length - 1];
    return (
      res.ok &&
      res.value.asin === 'B0OVERRIDE' &&
      store.demoAuditLog.length === before + 1 &&
      audit.action === 'inventory_identifier_overridden' &&
      audit.actorId === staffActor.staffId &&
      /data-entry correction/.test(audit.reason)
    );
  })());

/* ══ I. ONE OWNER PER VALUE ACROSS `src/` (§03) ══════════════════════════ */

console.log('\nI. Single source of truth');
const files = srcFiles();
const declarationsOf = (pattern) => files.filter((rel) => pattern.test(readSrc(rel)));

check('I1 the unit list is declared exactly once',
  declarationsOf(/INVENTORY_UOMS\s*[:=]/).length === 1,
  declarationsOf(/INVENTORY_UOMS\s*[:=]/).join(', '));
check('I2 the movement-type list is declared exactly once',
  declarationsOf(/INVENTORY_MOVEMENT_TYPES\s*[:=]/).length === 1,
  declarationsOf(/INVENTORY_MOVEMENT_TYPES\s*[:=]/).join(', '));
check('I3 the refusal codes are declared exactly once',
  declarationsOf(/INVENTORY_REFUSALS\s*=/).length === 1,
  declarationsOf(/INVENTORY_REFUSALS\s*=/).join(', '));
check('I4 the buckets are declared exactly once',
  declarationsOf(/INVENTORY_BUCKETS\s*[:=]/).length === 1);
check('I5 available = on-hand − committed is computed in exactly ONE place',
  declarationsOf(/available\s*=\s*onHand\s*-\s*committed/).length === 1,
  declarationsOf(/available\s*=\s*onHand\s*-\s*committed/).join(', '));
check('I6 the status vocabulary is declared exactly once',
  declarationsOf(/INVENTORY_STATUS_LABELS\s*[:=]/).length === 1);
check('I7 no component re-derives an on-hand figure from the case pack',
  (() => {
    const offenders = files.filter((rel) => {
      if (!/^src\/components\//.test(rel)) return false;
      const src = readSrc(rel);
      // The removed P8 defect: an invented on-hand figure from unitsPerCase.
      return /unitsPerCase[^\n]*\*\s*\d/.test(src) || /\*\s*10[^\n]*onHand/i.test(src);
    });
    return offenders.length === 0;
  })());
check('I8 every surface reads the canonical inventory lifecycle, not the raw ledger',
  (() => {
    const surfaces = [
      'src/components/brand/BrandInventory.tsx',
      'src/components/admin/CatalogManagerAdmin.tsx',
      'src/components/brand/BrandReports.tsx',
    ];
    return surfaces.every((rel) => /@\/lib\/inventory\/inventoryLifecycle/.test(readSrc(rel)));
  })());

/* ══ J. ZERO NETWORK ═════════════════════════════════════════════════════ */

console.log('\nJ. Zero network');
check('J1 the whole suite made ZERO external calls', externalFetches === 0, `${externalFetches} call(s)`);
check('J2 the inventory + identifier owners perform no network calls of their own',
  (() => {
    const owned = [
      'src/lib/inventory/inventoryRecord.ts',
      'src/lib/inventory/inventoryLifecycle.ts',
      'src/lib/catalog/asin.ts',
    ];
    return owned.every((rel) => !/\bfetch\s*\(|axios|XMLHttpRequest|EventSource/.test(readSrc(rel)));
  })());
check('J3 the surface states the figures are Mercenta\u2019s own and are never a channel reading',
  /never a channel reading/.test(readSrc('src/lib/inventory/inventoryRecord.ts')) &&
  /INVENTORY_DERIVATION_BASIS/.test(readSrc('src/components/brand/BrandInventory.tsx')));

/* ── Summary ─────────────────────────────────────────────────────────────── */

await server.close();

console.log(`\n${'─'.repeat(72)}`);
console.log(`§P8 inventory + channel identifier — ${pass} passed, ${fail} failed`);
if (fail > 0) {
  console.log('\nFailures:');
  for (const e of errors) console.log(`  • ${e}`);
  process.exit(1);
}
console.log('PASS — §P8 inventory contract holds');
process.exit(0);
check('G6 the channel path is audited',
  store.demoAuditLog.some(
    (a) => a.action === 'inventory_identifier_recorded' && a.entityType === 'product_identifier'
  ));