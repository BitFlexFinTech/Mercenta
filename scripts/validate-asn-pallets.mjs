#!/usr/bin/env node
/**
 * §BATCH 2n (`AV-016`) — THE ASN PALLET-STRUCTURE GATE.
 *
 * WHY THIS EXISTS
 * ---------------
 * The channel documents that the shipment confirmation (the ASN) it receives
 * carries *“carton + pallet structures”* (source `S9` of the Phase 0A audit;
 * register `AV-016`). The platform modelled the CARTON structure — and its SSCC
 * identifiers — from P6, but a carton was never assigned to a PALLET, so the ASN
 * had NO pallet structure: only a loose `palletCount` for freight costing, which
 * is a different concept. This batch closes that half: ONE owner
 * (`src/lib/shipping/asnPallets.ts`) derives the carton→pallet grouping from ONE
 * declared capacity (`ASN_PALLET_PROFILE`), the ASN record carries it, the channel
 * confirmation and every document state it.
 *
 * This gate EXECUTES the shipped modules (bundled with the project's own esbuild
 * through its `@` alias, with `fetch` sabotaged) so it asserts RUNNING behaviour,
 * not a pattern, and fails if:
 *
 *   1  the pallet owner, the pallet SSCC generator or the declared profile is not
 *      declared in EXACTLY ONE place (no second source of truth);
 *   2  the grouping is not DETERMINISTIC, does not chunk by the declared capacity,
 *      or does not partition its cartons (every carton on exactly one pallet);
 *   3  a pallet SSCC is not a valid, placeholder-prefixed, COLLISION-FREE 18-digit
 *      identifier (and never collides with a carton's);
 *   4  an impossible capacity (0) is accepted instead of failing closed;
 *   5  the ASN record does not carry the structure;
 *   6  the channel confirmation does not carry the per-carton pallet, or the seam
 *      ACCEPTS an inconsistent structure (a stray pallet, an empty pallet, a
 *      carton/pallet disagreement) instead of refusing it;
 *   7  the ASN record's own invariant accepts a structure that does not partition
 *      the cartons;
 *   8  the document pack does not state the pallet structure;
 *   9  a surface re-implements the pallet vocabulary instead of consuming the ONE
 *      owner; and
 *  10  any live network call is made.
 *
 * Run: node scripts/validate-asn-pallets.mjs
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

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

const read = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8');
/** Source with comments stripped — an assertion about CODE, never about prose. */
const code = (relative) =>
  read(relative)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');

/** How many files under `src/` carry a literal in their CODE (comments stripped). */
let sourceTree = null;
const sourceFiles = () => {
  if (sourceTree) return sourceTree;
  const walk = (dir) =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : walk(full);
      return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
    });
  sourceTree = walk(path.join(ROOT, 'src'));
  return sourceTree;
};
const countInSrc = (literal) =>
  sourceFiles().filter((file) =>
    fs
      .readFileSync(file, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/[^\n]*/g, '')
      .includes(literal)
  ).length;

/* ── The executed entry ───────────────────────────────────────────────────── */

const ENTRY = `
import {
  palletsForCartons, describeAsnPalletStructure, ASN_PALLET_GROUPING_OWNER,
} from '@/lib/shipping/asnPallets';
import { ASN_PALLET_PROFILE } from '@/config/shipping';
import {
  ssccForCarton, ssccForPallet, isValidSscc18, usesPlaceholderPrefix,
} from '@/lib/documents/sscc';
import { buildPoDocumentPack } from '@/lib/documents/poDocumentPack';
import { createMockSpApiClient, resetMockAmazonState } from '@/lib/spapi/mockClient';
import { fileChannelShipmentConfirmation } from '@/lib/shipping/channelShipmentOperations';
import { asnForInstruction } from '@/lib/commerce/proxyProcessor';
import { createShipmentForPO } from '@/data/api';
import { demoPurchaseOrders, demoBrands, setPurchaseOrderStatus } from '@/data/demoStore';

globalThis.fetch = function () { throw new Error('NETWORK_CALL_ATTEMPTED'); };

const out = {};
out.profile = ASN_PALLET_PROFILE;
out.owner = ASN_PALLET_GROUPING_OWNER;

const carton = (n) => ({ sku: 'SKU-' + n, quantity: n, weightKg: n, lengthCm: 40, widthCm: 30, heightCm: 25 });
/* 14 cartons against the declared capacity (expected 6) => pallets of 6, 6, 2. */
const cartons14 = Array.from({ length: 14 }, (_, i) => carton(i + 1));
const pallets = palletsForCartons('PO-PALLET-1', cartons14);
out.pallets14 = {
  count: pallets.length,
  sizes: pallets.map((p) => p.cartons.length),
  of: pallets.map((p) => p.of),
  firstCartons: pallets[0].cartons,
  lastCartons: pallets[pallets.length - 1].cartons,
  weightFirst: pallets[0].weightKg,
  allValidSscc: pallets.every((p) => isValidSscc18(p.sscc)),
  placeholder: pallets.every((p) => usesPlaceholderPrefix(p.sscc)),
  distinct: new Set(pallets.map((p) => p.sscc)).size === pallets.length,
  ssccs: pallets.map((p) => p.sscc),
  covered: pallets.reduce((acc, p) => acc.concat(p.cartons), []),
};
out.palletsAgain = palletsForCartons('PO-PALLET-1', cartons14).map((p) => p.sscc);
out.palletsEmpty = palletsForCartons('PO-PALLET-1', []);
out.cartonVsPallet = {
  carton1: ssccForCarton('PO-PALLET-1', 1),
  pallet1: ssccForPallet('PO-PALLET-1', 1),
  pallet2: ssccForPallet('PO-PALLET-1', 2),
};
out.capacityThrows = (() => { try { palletsForCartons('PO', cartons14, 0); return false; } catch { return true; } })();
out.structure = describeAsnPalletStructure('PO-PALLET-1', cartons14);

/* The ASN record carries the structure — derived by the acceptance path itself. */
const po = {
  id: 'po-gate', poNumber: 'PO-GATE-1', brandId: demoBrands[0].id,
  freightTerm: 'prepaid', shipWindowStart: '2026-10-10', lineItems: [],
};
const instruction = {
  id: 'i-gate',
  lines: cartons14.map((c) => ({ sku: c.sku, ackStatus: 'accepted', orderedQty: c.quantity, acknowledgedQty: c.quantity, unitPrice: 1 })),
};
const asn = asnForInstruction(instruction, po);
out.asnPallets = {
  hasPallets: Array.isArray(asn.pallets),
  count: asn.pallets ? asn.pallets.length : 0,
  sizes: asn.pallets ? asn.pallets.map((p) => p.cartons.length) : [],
};


/* The channel confirmation carries the per-carton pallet + the pallet structure. */
resetMockAmazonState();
const mock = createMockSpApiClient();
const confirmCartons = asn.pallets.reduce(
  (acc, p) => acc.concat(p.cartons.map((n) => ({
    cartonId: 'PO-GATE-1-C' + n, vendorSku: 'SKU-' + n, quantity: n,
    purchaseOrderNumber: 'PO-GATE-1', palletId: p.sscc,
  }))), []);
const confirmPallets = asn.pallets.map((p) => ({
  palletId: p.sscc, cartonIds: p.cartons.map((n) => 'PO-GATE-1-C' + n),
}));
const file = (theCartons, thePallets) => fileChannelShipmentConfirmation({
  reader: mock, shipmentId: 'shp-gate', purchaseOrderNumbers: ['PO-GATE-1'], cartons: theCartons, pallets: thePallets, carrier: 'carrier',
});
out.confirmOk = await file(confirmCartons, confirmPallets);
out.confirmStrayCarton = await file(confirmCartons, confirmPallets.slice(0, 1));
out.confirmEmptyPallet = await file(confirmCartons, confirmPallets.concat([{ palletId: ssccForPallet('PO-GATE-1', 99), cartonIds: [] }]));
out.confirmMismatch = await file(confirmCartons, confirmPallets.map((p, i) => (i === 0 ? { palletId: p.palletId, cartonIds: [confirmPallets[1].cartonIds[0]] } : p)));
out.confirmWithoutPallets = await fileChannelShipmentConfirmation({
  reader: mock, shipmentId: 'shp-gate2', purchaseOrderNumbers: ['PO-GATE-1'], cartons: confirmCartons, carrier: 'carrier',
});

/* The document pack states the structure. */
const packPo = Object.assign({}, po, {
  poValue: cartons14.reduce((s, c) => s + c.quantity, 0),
  lineItems: cartons14.map((c) => ({ sku: c.sku, productName: c.sku, commodityCode: '00000000', quantity: c.quantity, acknowledgedQty: c.quantity, unitPrice: 1, ackStatus: 'accepted' })),
});
const pack = buildPoDocumentPack({ po: packPo, brandName: 'Gate Brand', asn: asn, instruction: instruction });
const findDoc = (kind) => pack.documents.find((d) => d.kind === kind) || {};
const ssccDoc = findDoc('sscc_carton_labels');
const asnDoc = findDoc('asn_sheet');
const packingDoc = findDoc('packing_list_delivery_note');
out.pack = {
  ssccFieldsPallets: (ssccDoc.fields || []).find((f) => f.label === 'Pallets'),
  ssccPalletLabels: ((ssccDoc.html || '').match(/Pallet label — SSCC/g) || []).length,
  cartonHasPallet: (ssccDoc.cartonIdentifiers || []).every((c) => !!c.pallet && !!c.palletSscc),
  asnFieldPallets: (asnDoc.fields || []).find((f) => f.label === 'Pallets'),
  asnPalletSection: /Pallet structure/.test(asnDoc.html || ''),
  packingPallets: (packingDoc.fields || []).find((f) => f.label === 'Pallets'),
};

/* The ASN record's OWN invariant: an inconsistent structure is refused. */
const anyPo = demoPurchaseOrders.find(
  (p) => p.lineItems.length > 0 && !(p.revisions && p.revisions.length) &&
    p.lineItems.every((l) => !l.ackStatus || l.ackStatus === 'accepted')
);
out.domainPoId = anyPo ? anyPo.id : null;
if (anyPo) {
  setPurchaseOrderStatus(anyPo.id, 'accepted');
  const goodAsn = asnForInstruction(
    { id: 'i2', lines: anyPo.lineItems.map((l) => ({ sku: l.sku, ackStatus: 'accepted', orderedQty: l.quantity, acknowledgedQty: l.acknowledgedQty == null ? l.quantity : l.acknowledgedQty, unitPrice: l.unitPrice })) },
    anyPo
  );
  out.domainGood = { ok: createShipmentForPO(anyPo.id, goodAsn).ok };
  const sscc0 = goodAsn.pallets && goodAsn.pallets[0] ? goodAsn.pallets[0].sscc : ssccForPallet(anyPo.poNumber, 1);
  const dup = createShipmentForPO(anyPo.id, Object.assign({}, goodAsn, { pallets: [{ pallet: 1, of: 1, sscc: sscc0, cartons: [1, 1] }] }));
  out.domainDup = { ok: dup.ok, error: dup.error || null };
  const short = createShipmentForPO(anyPo.id, Object.assign({}, goodAsn, { pallets: [{ pallet: 1, of: 2, sscc: sscc0, cartons: [1] }] }));
  out.domainIncomplete = { ok: short.ok, error: short.error || null };
}

out.network = 'sabotaged';
console.log('__RESULT__' + JSON.stringify(out));
`;


const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mercenta-asn-pallets-'));
const entryPath = path.join(tmpDir, 'entry.ts');
const outPath = path.join(tmpDir, 'bundle.mjs');
fs.writeFileSync(entryPath, ENTRY, 'utf8');

let result;
try {
  execFileSync(
    path.join(ROOT, 'node_modules/.bin/esbuild'),
    [
      entryPath, '--bundle', '--format=esm', '--platform=node',
      /**
       * The ESM bundle carries supabase's CJS dependencies (reached through
       * `@/data/api`), which call `require()` for Node built-ins (`stream`, …).
       * Under ESM there is no ambient `require`, so the bundle provides one via
       * `createRequire` — the same shim `validate-commerce-loop.mjs` uses. Without
       * it the bundle dies before any check runs.
       */
      '--banner:js=import{createRequire as __cr}from"module";const require=__cr(import.meta.url);',
      `--alias:@=${path.join(ROOT, 'src')}`, `--define:import.meta.env={}`,
      `--outfile=${outPath}`, '--log-level=error',
    ],
    { cwd: ROOT, stdio: ['ignore', 'inherit', 'inherit'] }
  );
  const stdout = execFileSync(process.execPath, [outPath], { cwd: ROOT, encoding: 'utf8' });
  result = JSON.parse(stdout.split('__RESULT__')[1]);
} catch (error) {
  console.log(`  FAIL  bundling/executing the real modules — ${String(error).slice(0, 900)}`);
  console.log('');
  console.log('ASN_PALLETS_VALIDATION_FAIL (0 passed, 1 failed)');
  process.exit(1);
}

const OWNER = 'src/lib/shipping/asnPallets.ts';
const SSCC = 'src/lib/documents/sscc.ts';
const CONFIG = 'src/config/shipping.ts';
const PACK = 'src/lib/documents/poDocumentPack.ts';
const MOCK = 'src/lib/spapi/mockClient.ts';

/* ── 1. one owner (no second source of truth) ──────────────────────────────── */

console.log('\n§ 1. The pallet structure has ONE owner (`AV-016`)\n');
check(
  'the grouping is derived in exactly ONE file',
  countInSrc('export function palletsForCartons(') === 1,
  `occurrences: ${countInSrc('export function palletsForCartons(')}`
);
check(
  'the pallet SSCC is generated in exactly ONE file',
  countInSrc('export function ssccForPallet(') === 1,
  `occurrences: ${countInSrc('export function ssccForPallet(')}`
);
check(
  'the declared pallet profile lives in exactly ONE file',
  countInSrc('export const ASN_PALLET_PROFILE =') === 1,
  `occurrences: ${countInSrc('export const ASN_PALLET_PROFILE =')}`
);
check(
  'the profile states it is MERCENTA’s own model, not a channel rule',
  result.profile.owner === 'Mercenta' && /not a retail-channel rule/i.test(result.profile.basis),
  JSON.stringify({ owner: result.profile.owner, basis: result.profile.basis })
);
check('the owner contains no TODO/FIXME placeholder', !/TODO|FIXME/.test(read(OWNER)));
check('the owner makes no network call of its own', !/fetch\s*\(|XMLHttpRequest|axios/.test(code(OWNER)));

/* ── 2. the grouping is deterministic and partitions the cartons ───────────── */

console.log('\n§ 2. The grouping chunks by the declared capacity and partitions\n');
check(
  'the declared capacity is a positive integer',
  Number.isInteger(result.profile.cartonsPerPallet) && result.profile.cartonsPerPallet > 0,
  String(result.profile.cartonsPerPallet)
);
check(
  '14 cartons produce ceil(14 / capacity) pallets',
  result.pallets14.count === Math.ceil(14 / result.profile.cartonsPerPallet),
  JSON.stringify(result.pallets14)
);
check(
  'the last pallet is PARTLY loaded (the remainder is honest, not padded)',
  result.pallets14.sizes[result.pallets14.sizes.length - 1] === 14 % result.profile.cartonsPerPallet &&
    result.pallets14.sizes[0] === result.profile.cartonsPerPallet,
  JSON.stringify(result.pallets14.sizes)
);
check(
  'every carton 1..14 is on exactly ONE pallet',
  result.pallets14.covered.length === 14 &&
    new Set(result.pallets14.covered).size === 14 &&
    result.pallets14.covered.every((n, i) => n === i + 1),
  JSON.stringify(result.pallets14.covered)
);
check(
  'each pallet carries its own gross weight',
  typeof result.pallets14.weightFirst === 'number' && result.pallets14.weightFirst > 0,
  String(result.pallets14.weightFirst)
);
check(
  'the grouping is DETERMINISTIC — the same consignment reprints identically',
  JSON.stringify(result.palletsAgain) === JSON.stringify(result.pallets14.ssccs),
  JSON.stringify({ again: result.palletsAgain, first: result.pallets14.ssccs })
);
check('an empty carton list yields NO pallet (none is fabricated)', result.palletsEmpty.length === 0);
check(
  'an impossible capacity (0) is REFUSED, failing closed',
  result.capacityThrows === true
);

/* ── 3. the pallet SSCC is a real, collision-free logistic-unit identifier ─── */

console.log('\n§ 3. The pallet SSCC is a valid, placeholder-prefixed logistic unit\n');
check(
  'every pallet SSCC is a structurally valid 18-digit SSCC-18',
  result.pallets14.allValidSscc === true
);
check(
  'every pallet SSCC carries the unmistakable placeholder prefix',
  result.pallets14.placeholder === true
);
check(
  'two pallets of one consignment never collide, and a reprint is identical',
  result.pallets14.distinct === true &&
    result.cartonVsPallet.pallet1 === result.cartonVsPallet.pallet1 &&
    result.cartonVsPallet.pallet1 !== result.cartonVsPallet.pallet2
);
check(
  'a PALLET SSCC never collides with a CARTON SSCC of the same consignment',
  result.cartonVsPallet.carton1 !== result.cartonVsPallet.pallet1
);

/* ── 4/5. the ASN record carries the structure ─────────────────────────────── */

console.log('\n§ 4. The ASN record carries the carton→pallet structure\n');
check(
  'the acceptance path’s ASN carries a pallet structure',
  result.asnPallets.hasPallets === true && result.asnPallets.count > 0,
  JSON.stringify(result.asnPallets)
);
check(
  'the ASN’s pallet sizes match the same capacity as the owner',
  JSON.stringify(result.asnPallets.sizes) === JSON.stringify(result.pallets14.sizes),
  JSON.stringify({ asn: result.asnPallets.sizes, owner: result.pallets14.sizes })
);
check(
  'the operator statement names the structure AND whose model it is',
  /pallet/i.test(result.structure.statement) && /not a retail-channel rule/i.test(result.structure.statement),
  result.structure.statement
);


/* ── 5. the channel confirmation carries the structure, and refuses a bad one ─ */

console.log('\n§ 5. The ASN reaching the channel carries the pallet structure\n');
check(
  'a consistent pallet structure IS accepted by the channel seam',
  result.confirmOk.ok === true,
  JSON.stringify(result.confirmOk)
);
check(
  'a carton naming an UNDECLARED pallet is refused',
  result.confirmStrayCarton.ok === false && /PALLET_UNDECLARED/.test(result.confirmStrayCarton.refusal || ''),
  result.confirmStrayCarton.refusal
);
check(
  'a declared pallet carrying NO carton is refused',
  result.confirmEmptyPallet.ok === false && /PALLET_EMPTY/.test(result.confirmEmptyPallet.refusal || ''),
  result.confirmEmptyPallet.refusal
);
check(
  'a carton/pallet disagreement is refused',
  result.confirmMismatch.ok === false && /PALLET_MISMATCH/.test(result.confirmMismatch.refusal || ''),
  result.confirmMismatch.refusal
);
check(
  'a confirmation with NO pallet structure still works (the structure is optional)',
  result.confirmWithoutPallets.ok === true,
  JSON.stringify(result.confirmWithoutPallets)
);

/* ── 6. the ASN record refuses a structure that does not partition ─────────── */

console.log('\n§ 6. The ASN record’s own invariant: the structure must PARTITION the cartons\n');
check('an eligible purchase order was found for the domain probe', !!result.domainPoId, String(result.domainPoId));
check(
  'a PARTITIONING structure passes the invariant',
  result.domainGood && result.domainGood.ok === true,
  JSON.stringify(result.domainGood)
);
check(
  'a carton assigned to TWO pallets is refused as inconsistent',
  result.domainDup && result.domainDup.ok === false && /pallet structure is inconsistent/i.test(result.domainDup.error || ''),
  JSON.stringify(result.domainDup)
);
check(
  'a carton on NO pallet is refused as incomplete',
  result.domainIncomplete && result.domainIncomplete.ok === false && /pallet structure is incomplete/i.test(result.domainIncomplete.error || ''),
  JSON.stringify(result.domainIncomplete)
);

/* ── 7. the document pack states the structure ─────────────────────────────── */

console.log('\n§ 7. The document pack states the pallet structure\n');
check(
  'the SSCC label sheet carries one PALLET label per pallet',
  result.pack.ssccPalletLabels === result.pallets14.count,
  JSON.stringify({ labels: result.pack.ssccPalletLabels, pallets: result.pallets14.count })
);
check(
  'every carton identifier names its pallet and the pallet’s SSCC',
  result.pack.cartonHasPallet === true
);
check(
  'the SSCC sheet’s fields state the pallet count',
  result.pack.ssccFieldsPallets && Number(result.pack.ssccFieldsPallets.value) === result.pallets14.count,
  JSON.stringify(result.pack.ssccFieldsPallets)
);
check(
  'the ASN sheet states a pallet structure section and field',
  result.pack.asnPalletSection === true &&
    result.pack.asnFieldPallets &&
    Number(result.pack.asnFieldPallets.value) === result.pallets14.count,
  JSON.stringify(result.pack.asnFieldPallets)
);
check(
  'the packing list states the pallet count',
  result.pack.packingPallets && Number(result.pack.packingPallets.value) === result.pallets14.count,
  JSON.stringify(result.pack.packingPallets)
);

/* ── 8. no surface re-implements the vocabulary ────────────────────────────── */

console.log('\n§ 8. Surfaces consume the ONE owner (no re-implementation)\n');
check(
  'no component re-declares the pallet profile',
  sourceFiles().filter((f) => /\/components\//.test(f) && read(path.relative(ROOT, f)).includes('ASN_PALLET_PROFILE =')).length === 0
);
check(
  'the mock channel seam still declares its pallet refusals',
  /confirmationPalletUndeclared/.test(read(MOCK)) &&
    /confirmationPalletEmpty/.test(read(MOCK)) &&
    /confirmationCartonPalletMismatch/.test(read(MOCK))
);
check(
  'the ASN record’s pallet partition invariant is present in the domain writer',
  /pallet structure is inconsistent/.test(read('src/data/api.ts')) &&
    /pallet structure is incomplete/.test(read('src/data/api.ts'))
);
check('the document pack renders the pallet structure', /Pallet structure/.test(read(PACK)));

/* ── 9. no live call ───────────────────────────────────────────────────────── */

console.log('\n§ 9. The executed modules made no network call\n');
check('the executed entry ran with fetch sabotaged', result.network === 'sabotaged');

/* ── 10. the record states the truth about AV-016 ──────────────────────────── */

console.log('\n§ 10. The record states the truth about AV-016 (no stale statement survives)\n');
const register = read('docs/AMAZON_VENDOR_DISCREPANCY_REGISTER_2026-09-20.md');
const reconcile = read('docs/AMAZON_RECONCILIATION_STATUS.md');
const truth = read('docs/AMAZON_VENDOR_TRUTH_VALIDATION_2026-09-20.md');
check(
  'the discrepancy register’s AV-016 row is APPLIED, not INCOMPLETE',
  /^\| AV-016 \|[^\n]*\*\*APPLIED/m.test(register)
);
check(
  'the reconciliation status records the AV-016 row as APPLIED',
  /^\| AV-016 \| ASN content \| \*\*APPLIED\*\* \|/m.test(reconcile)
);
check(
  'the truth-validation §8 records the ASN-content row as APPLIED (Batch 2n)',
  /^\| ASN content:[^\n]*\*\*APPLIED \(Batch 2n, 2026-10-03\)\*\*/m.test(truth)
);
/* §E2E-9 (2026-10-08) — STRENGTHENED. This check previously only asserted that ONE
 * sentence ("Generated artefacts … Tracking them made the tree dirty …") was
 * present, so it PASSED even though the CLEAN-TREE INVARIANT paragraph had been
 * SPLIT mid-sentence by the inserted session-history block (it read "…permitted
 * only while work is" near the top and resumed "actively in progress…" ~55 lines
 * below). It now asserts the FIVE lines are CONSECUTIVE, so a future insertion
 * that splits the paragraph again FAILS. The paragraph itself was repaired at
 * source in the same session (the continuation was moved back). */
{
  const sc = read('STATUS_CHECK.md').split('\n');
  const ci = sc.findIndex((l) => l.startsWith('**CLEAN-TREE INVARIANT (added 2026-09-21'));
  check(
    'STATUS_CHECK.md’s operating-rules paragraph is COMPLETE and CONTIGUOUS (not split mid-sentence by the session notes)',
    ci >= 0 &&
      sc[ci].includes('`git status --porcelain` MUST print') &&
      sc[ci + 1].startsWith('NOTHING** at every checkpoint, delivery, handoff and end of session.') &&
      sc[ci + 1].endsWith('A dirty tree is permitted only while work is') &&
      sc[ci + 2].startsWith('actively in progress inside a session; it is never an acceptable checkpoint or handoff.') &&
      sc[ci + 2].endsWith('Inherited dirtiness is') &&
      sc[ci + 3].startsWith('RECONCILED (required work committed, unneeded material removed)') &&
      sc[ci + 4].includes('gitignored — see the "GENERATED ARTEFACTS" block in `.gitignore`. Tracking them made the tree dirty after every Playwright run.')
  );
}

/* ── summary ───────────────────────────────────────────────────────────────── */

console.log('');
if (fail === 0) {
  console.log(`ASN_PALLETS_VALIDATION_PASS (${pass} passed, 0 failed)`);
  process.exit(0);
} else {
  console.log(`ASN_PALLETS_VALIDATION_FAIL (${pass} passed, ${fail} failed)`);
  for (const e of errors) console.log(`  - ${e}`);
  process.exit(1);
}

