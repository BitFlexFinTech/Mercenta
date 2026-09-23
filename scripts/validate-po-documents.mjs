#!/usr/bin/env node
/**
 * §P6 — PO DOCUMENT PACK CONTRACT VALIDATOR.
 *
 * The browser suite proves the pack RENDERS and OPENS. This validator proves the
 * parts a browser test cannot reach cheaply, and it EXECUTES the real modules
 * (bundled with the project's own esbuild, through the project's own `@/` alias)
 * rather than grepping source text — a source-text assertion would pass even if
 * the arithmetic were wrong.
 *
 * Asserted behaviour:
 *   1  the SSCC check digit implements the PUBLISHED GS1 convention (proved
 *      against the known EAN-13 anchor 400638133393 → 1, and by an independent
 *      weighted-sum recomputation), an SSCC is 18 digits, and the identifier is
 *      DETERMINISTIC (a reprint is byte-identical; cartons and POs never collide)
 *   2  the GS1 company prefix is an explicitly UNASSIGNED placeholder, every
 *      generated identifier uses it, and the label notice states it
 *   3  the pack contains every document the programme requires, and a document
 *      that does not apply carries a STATED reason rather than disappearing
 *   4  customs documents are produced ONLY on an international lane
 *   5  every document names the FC the PURCHASE ORDER declares (P5) — never a
 *      Mercenta site — and an undeclared PO fails closed
 *   6  readiness is honest: an SSCC label needs a carton structure, an ASN sheet
 *      needs a FILED ASN, a waybill needs a booked waybill
 *   7  the pack is deterministic (identical inputs → identical documents)
 *   8  the document-download rule is ONE rule, shared by the nav badge and the
 *      notification centre
 *   9  the collect chain follows the DOCUMENTED order (request → carrier assigned
 *      → ARN → pickup), the pickup lead time is the documented two BUSINESS days,
 *      and NO ARN is ever fabricated — it exists only if the channel record has one
 *  10  zero network calls
 *
 * Run: node scripts/validate-po-documents.mjs
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

/* ── Bundle the REAL modules and execute them ────────────────────────────── */

const ENTRY = `
import {
  SSCC_GS1_PREFIX, SSCC_LENGTH, SSCC_PLACEHOLDER_NOTICE,
  ssccCheckDigit, buildSscc18, ssccForCarton, isValidSscc18, usesPlaceholderPrefix,
} from '@/lib/documents/sscc';
import {
  buildPoDocumentPack, cartonIdentifiersFor, documentsAwaitingDownload,
} from '@/lib/documents/poDocumentPack';
import {
  PICKUP_LEAD_TIME, earliestRequestedPickUp, buildCollectChain, arnOnRecord,
} from '@/lib/shipping/collectChain';
import { destinationLabelForPo, declaredShipToParty } from '@/config/destinationFc';
import { DESTINATION_NOT_DECLARED } from '@/config/logisticsGeo';

const out = {};

/* 1 — SSCC arithmetic + determinism. */
out.sscc = {
  length: SSCC_LENGTH,
  prefix: SSCC_GS1_PREFIX,
  notice: SSCC_PLACEHOLDER_NOTICE,
  carton1: ssccForCarton('PO-9002', 1),
  carton2: ssccForCarton('PO-9002', 2),
  carton1Again: ssccForCarton('PO-9002', 1),
  otherPo: ssccForCarton('PO-9003', 1),
  valid: isValidSscc18(ssccForCarton('PO-9002', 1)),
  invalid: isValidSscc18('123'),
  placeholderUsed: usesPlaceholderPrefix(ssccForCarton('PO-9002', 1)),
  built: buildSscc18('000000001'),
  throwsOnShortBase: (() => { try { ssccCheckDigit('123'); return false; } catch { return true; } })(),
};

/* 2 — the purchase orders the pack is built for. */
const line = { sku: 'SKU-1', productName: 'Widget', quantity: 100, unitPrice: 10, commodityCode: '1234', ackStatus: 'accepted', acknowledgedQty: 100 };
const intlPo = {
  id: 'po-intl', brandId: 'brand-a', poNumber: 'PO-9100', status: 'ready_to_fulfil',
  shipToParty: declaredShipToParty(0), poValue: 10000, commissionRate: 0.2, commissionAmount: 2000,
  orderDate: '2026-09-01T00:00:00.000Z', freightTerm: 'prepaid', lineItems: [line],
};
const ukPo = { ...intlPo, id: 'po-uk', poNumber: 'PO-9101', freightTerm: 'collect' };
const undeclaredPo = { ...ukPo, id: 'po-none', poNumber: 'PO-9102', shipToParty: undefined };

const asn = {
  cartons: [
    { sku: 'SKU-1', quantity: 60, weightKg: 24, lengthCm: 40, widthCm: 30, heightCm: 25 },
    { sku: 'SKU-1', quantity: 40, weightKg: 16, lengthCm: 40, widthCm: 30, heightCm: 25 },
  ],
  shipDate: '2026-09-20', carrier: 'dhl', lotNumber: 'SIM-LOT-PO-9100', expiryDate: '2028-03-21',
};

const baseOutcome = {
  actionedAt: '2026-09-02T00:00:01.000Z',
  channelAcknowledgement: { ok: true, acknowledgementId: 'MOCK-ACK-00001', status: 'accepted', mode: 'mock' },
  asn: { filed: true, shipmentId: 'shipment-po-intl', reference: 'DH-PO-9100' },
};
const filed = {
  id: 'i1', type: 'po_acknowledgement', brandId: 'brand-a', purchaseOrderId: 'po-intl', poNumber: 'PO-9100',
  issuedBy: 'brand-a', issuedAt: '2026-09-02T00:00:00.000Z', state: 'actioned', lines: [], mode: 'simulation', simulated: true,
  outcome: { ...baseOutcome, routingRequest: { raised: true, carrier: 'dhl', channelArrangesCarrier: false, reference: 'RR-PO-9100' } },
};
const collectFiled = {
  ...filed, id: 'i2', purchaseOrderId: 'po-uk', poNumber: 'PO-9101',
  outcome: {
    ...baseOutcome,
    asn: { filed: true, shipmentId: 'shipment-po-uk', reference: 'AM-PO-9101' },
    routingRequest: { raised: true, carrier: 'amazon_partner', channelArrangesCarrier: true, reference: 'RR-PO-9101', requestedPickUp: '2026-09-24' },
  },
};
const instructed = {
  ...collectFiled, id: 'i3',
  outcome: {
    ...collectFiled.outcome,
    routingInstructions: { arn: 'MOCK-ARN-00042', carrier: 'Amazon Freight', assignedAt: '2026-09-23', mode: 'mock' },
  },
};

const products = [{ id: 'p1', name: 'Widget', sku: 'SKU-1', barcode: '5012345678900', image: '', exWorksPrice: 6, ukRetailPrice: 10, commodityCode: '1234', vatStatus: 'Standard 20%', hazmat: false, length: 40, width: 30, height: 25, weight: 0.4 }];
const packOf = (po, opts) => buildPoDocumentPack({
  po, brandName: 'Brand A', brandNation: opts.nation, products,
  asn: opts.asn ?? null, carrier: opts.carrier ?? null, instruction: opts.instruction ?? null,
});

out.packs = {
  full: packOf(intlPo, { nation: 'Germany', asn, carrier: { carrier: 'dhl', trackingNumber: 'TRK-1', waybill: 'WB-1' }, instruction: filed }),
  ukDomestic: packOf(ukPo, { nation: 'United Kingdom', asn, carrier: { carrier: 'palletline' }, instruction: collectFiled }),
  bare: packOf(intlPo, { nation: 'Germany' }),
  undeclared: packOf(undeclaredPo, { nation: 'United Kingdom', asn }),
  repeat: packOf(intlPo, { nation: 'Germany', asn, carrier: { carrier: 'dhl', trackingNumber: 'TRK-1', waybill: 'WB-1' }, instruction: filed }),
  customsOnUkDomestic: packOf(ukPo, { nation: 'United Kingdom', asn }).documents
    .filter((d) => d.laneScope === 'international')
    .map((d) => ({ kind: d.kind, applicable: d.applicable, reason: d.notApplicableReason ?? null })),
};

out.destination = {
  declared: destinationLabelForPo(intlPo),
  undeclared: destinationLabelForPo(undeclaredPo),
  notDeclaredConstant: DESTINATION_NOT_DECLARED,
};

out.cartons = cartonIdentifiersFor('PO-9100', asn.cartons);

/* 3 — the document-download rule (the ONE rule the badge and notification share). */
const byStatus = (s) => documentsAwaitingDownload({ ...intlPo, status: s });
out.awaiting = {
  received: byStatus('received'),
  under_review: byStatus('under_review'),
  accepted: byStatus('accepted'),
  ready_to_fulfil: byStatus('ready_to_fulfil'),
  shipped: byStatus('shipped'),
  delivered: byStatus('delivered'),
};

/* 4 — the documented collect chain. */
const chainInput = { po: ukPo, now: new Date('2026-09-22T09:00:00Z') };
out.chain = {
  lead: PICKUP_LEAD_TIME,
  monday: earliestRequestedPickUp(new Date('2026-09-21T00:00:00Z')),
  thursday: earliestRequestedPickUp(new Date('2026-09-24T00:00:00Z')),
  friday: earliestRequestedPickUp(new Date('2026-09-25T00:00:00Z')),
  prepaid: buildCollectChain({ po: intlPo, instruction: filed, now: new Date('2026-09-22T09:00:00Z') }),
  requested: buildCollectChain({ ...chainInput, instruction: collectFiled }),
  assigned: buildCollectChain({ ...chainInput, instruction: instructed }),
  noInstruction: buildCollectChain(chainInput),
  collected: buildCollectChain({ ...chainInput, instruction: instructed, shipmentStatus: 'sea_transit' }),
  arnFromRecord: arnOnRecord(instructed),
  arnWithoutRecord: arnOnRecord(collectFiled),
  arnNoInstruction: arnOnRecord(null),
};

console.log('__RESULT__' + JSON.stringify(out));
`;

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mercenta-docs-'));
const entryPath = path.join(tmpDir, 'entry.ts');
const outPath = path.join(tmpDir, 'bundle.mjs');
fs.writeFileSync(entryPath, ENTRY, 'utf8');

let result;
try {
  execFileSync(
    path.join(ROOT, 'node_modules/.bin/esbuild'),
    [
      entryPath,
      '--bundle',
      '--format=esm',
      '--platform=node',
      `--alias:@=${path.join(ROOT, 'src')}`,
      '--define:import.meta.env={}',
      `--outfile=${outPath}`,
      '--log-level=error',
    ],
    { cwd: ROOT, stdio: ['ignore', 'inherit', 'inherit'] }
  );
  const stdout = execFileSync(process.execPath, [outPath], { cwd: ROOT, encoding: 'utf8' });
  result = JSON.parse(stdout.split('__RESULT__')[1]);
} catch (error) {
  console.log(`  FAIL  bundling/executing the real modules — ${String(error).slice(0, 600)}`);
  console.log('');
  console.log('PO_DOCUMENTS_VALIDATION_FAIL (0 passed, 1 failed)');
  process.exit(1);
}

/* ── an INDEPENDENT GS1 check-digit implementation, anchored on a known value ── */

/**
 * The published GS1 mod-10 algorithm, written here from the specification rather
 * than imported — weights 3/1 from the rightmost data digit. Anchored on the
 * well-known EAN-13 `4006381333931`, whose check digit is 1: if this
 * implementation returned anything else, the CONVENTION is wrong and every
 * comparison below would be meaningless.
 */
function gs1CheckDigit(base) {
  let sum = 0;
  for (let i = 0; i < base.length; i += 1) {
    const digit = Number(base[base.length - 1 - i]);
    sum += digit * (i % 2 === 0 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10;
}

/**
 * The PUBLISHED completeness property: the weighted sum of a COMPLETE GS1
 * identifier is ≡ 0 (mod 10) when the digits are weighted from the RIGHT starting
 * with 1 — because the check digit itself sits in the rightmost (weight-1)
 * position. Verified above on the EAN-13 anchor before it is used on an SSCC.
 */
function gs1FullSum(digits) {
  let sum = 0;
  for (let i = 0; i < digits.length; i += 1) {
    sum += Number(digits[digits.length - 1 - i]) * (i % 2 === 0 ? 1 : 3);
  }
  return sum;
}

const S = result.sscc;

/* ── 1. SSCC-18 arithmetic, determinism and the placeholder prefix ────────── */

check(
  'anchor: the independent GS1 implementation reproduces the known EAN-13 check digit (400638133393 → 1)',
  gs1CheckDigit('400638133393') === 1,
  `got ${gs1CheckDigit('400638133393')}`
);
check(
  '§P6: the module uses the SAME published GS1 convention as the independent implementation',
  S.valid === true &&
    Number(S.carton1[S.carton1.length - 1]) === gs1CheckDigit(S.carton1.slice(0, 17)) &&
    Number(S.built[S.built.length - 1]) === gs1CheckDigit(S.built.slice(0, 17))
);
check(
  '§P6: an SSCC is exactly 18 digits and passes its own validator',
  S.carton1.length === S.length && S.length === 18 && S.valid === true
);
check(
  'anchor: the independent implementation reproduces the known EAN-13 completeness property (4006381333931 sums to 90)',
  gs1FullSum('4006381333931') === 90 && gs1FullSum('4006381333931') % 10 === 0
);
check(
  '§P6: the whole 18-digit identifier satisfies the GS1 weighted sum (total ≡ 0 mod 10)',
  gs1FullSum(S.carton1) % 10 === 0 && gs1FullSum(S.carton2) % 10 === 0,
  `carton1 sums to ${gs1FullSum(S.carton1)}, carton2 to ${gs1FullSum(S.carton2)}`
);
check(
  '§P6: a malformed identifier FAILS the validator (it cannot pass everything)',
  S.invalid === false
);
check(
  '§P6: the check-digit function refuses a base that is not 17 digits',
  S.throwsOnShortBase === true
);
check(
  '§P6: generation is DETERMINISTIC — the same carton reprints identically',
  S.carton1 === S.carton1Again
);
check(
  '§P6: two cartons of one PO never collide, and two POs never collide',
  S.carton1 !== S.carton2 && S.carton1 !== S.otherPo
);
check(
  '§P6: the GS1 prefix is declared an UNASSIGNED placeholder (all zeros, status stated)',
  S.prefix.status === 'placeholder_unassigned' &&
    /^0+$/.test(S.prefix.value) &&
    S.prefix.placeholderLabel.length > 0
);
check(
  '§P6: every generated identifier uses the placeholder prefix',
  S.placeholderUsed === true
);
check(
  '§P6: the label notice states the placeholder status in words an operator reads',
  S.notice.includes(S.prefix.placeholderLabel) && /not a licensed GS1 identifier/i.test(S.notice)
);

/* ── 2. the pack contains every required document ────────────────────────── */

const FULL = result.packs.full;
const REQUIRED_KINDS = [
  'sscc_carton_labels',
  'carrier_label',
  'freight_waybill',
  'packing_list_delivery_note',
  'asn_sheet',
  'customs_commercial_invoice',
  'customs_packing_list',
  'customs_ukca_declaration',
];

check(
  '§P6: the pack contains every document the programme row requires',
  REQUIRED_KINDS.every((kind) => FULL.documents.some((d) => d.kind === kind)),
  REQUIRED_KINDS.filter((k) => !FULL.documents.some((d) => d.kind === k)).join(', ')
);
check(
  '§P6: an international pack has ALL EIGHT documents applicable',
  FULL.applicableCount === 8 && FULL.documents.filter((d) => d.applicable).length === 8
);
check(
  '§P6: a fully-formed pack is complete — every applicable document is ready',
  FULL.readyCount === 8 && FULL.missing.length === 0,
  FULL.missing.join(', ')
);
check(
  '§P6: the pack summary is derived, not asserted (readyCount ≤ applicableCount ≤ documents)',
  FULL.readyCount <= FULL.applicableCount && FULL.applicableCount <= FULL.documents.length
);

/* ── 3. the destination is the PO's declared FC (P5) ─────────────────────── */

const DEST = result.destination;
const allText = (pack) =>
  pack.documents
    .map(
      (d) =>
        `${d.title} ${d.purpose} ${(d.fields ?? []).map((f) => `${f.label} ${f.value}`).join(' ')} ${d.html ?? ''}`
    )
    .join(' ');

check(
  '§P5: the pack names the FC the PO declares',
  DEST.declared === FULL.destinationLabel && FULL.destinationLabel.length > 0,
  FULL.destinationLabel
);
check(
  '§P5: no document anywhere names a Mercenta site as the destination',
  !/mercenta\s*(uk\s*)?hub/i.test(allText(FULL)) &&
    !/mercenta\s*(uk\s*)?hub/i.test(allText(result.packs.undeclared))
);
check(
  '§P5: an undeclared PO FAILS CLOSED to the explicit not-declared string',
  DEST.undeclared === DEST.notDeclaredConstant &&
    result.packs.undeclared.destinationLabel === DEST.notDeclaredConstant
);
check(
  '§P5: an undeclared PO says so rather than substituting a site',
  result.packs.undeclared.notices.some((n) => /declares no ship-to party/i.test(n))
);
check(
  '§P6: the SSCC carton labels carry one identifier per ASN carton',
  FULL.documents.find((d) => d.kind === 'sscc_carton_labels').cartonIdentifiers.length === 2 &&
    result.cartons.length === 2 &&
    result.cartons[0].of === 2 &&
    result.cartons[1].carton === 2
);

/* ── 4. customs documents are INTERNATIONAL ONLY, with a stated reason ───── */

const UK = result.packs.ukDomestic;
check(
  '§P6: a UK domestic lane produces NO applicable customs document',
  UK.documents.filter((d) => d.laneScope === 'international').every((d) => d.applicable === false)
);
check(
  '§P6: the three customs documents are still LISTED on a UK lane, each with its reason',
  result.packs.customsOnUkDomestic.length === 3 &&
    result.packs.customsOnUkDomestic.every(
      (d) => d.applicable === false && /international/i.test(d.reason ?? '')
    )
);
check(
  '§P6: a UK domestic pack has the five lane-neutral documents applicable',
  UK.applicableCount === 5 && UK.documents.filter((d) => d.applicable).length === 5
);
check(
  '§P6: on that lane the waybill is the ONE honest gap — no carrier has booked it yet',
  UK.readyCount === 4 && UK.missing.length === 1 && UK.missing[0] === 'Freight waybill',
  `${UK.readyCount} ready, missing: ${UK.missing.join(', ')}`
);
check(
  '§P6: the lane decision is stated in the pack notices',
  UK.notices.some((n) => /customs documentation does not apply/i.test(n)) &&
    FULL.notices.some((n) => /customs documentation is included/i.test(n))
);

/* ── 5. readiness is honest ─────────────────────────────────────────────── */

const BARE = result.packs.bare;
const bareStatus = (kind) => BARE.documents.find((d) => d.kind === kind);
check(
  '§P6: without an ASN on the record the SSCC labels are NOT READY, with the reason',
  bareStatus('sscc_carton_labels').ready === false &&
    /no carton structure is on the record/i.test(bareStatus('sscc_carton_labels').notReadyReason ?? '')
);
check(
  '§P6: without a filed ASN the ASN sheet is NOT READY, with the reason',
  bareStatus('asn_sheet').ready === false &&
    (bareStatus('asn_sheet').notReadyReason ?? '').length > 0
);
check(
  '§P6: without a carrier the label and waybill are NOT READY (never invented)',
  bareStatus('carrier_label').ready === false && bareStatus('freight_waybill').ready === false
);
check(
  '§P6: the packing list is ready from the acknowledged PO volumes and SAYS that is its basis',
  bareStatus('packing_list_delivery_note').ready === true &&
    (bareStatus('packing_list_delivery_note').fields.some((f) => /acknowledged PO volumes/i.test(f.value)) ||
      (bareStatus('packing_list_delivery_note').html ?? '').includes('acknowledged PO volumes'))
);
check(
  '§P6: the pack reports the honest gap list rather than implying completeness',
  BARE.missing.length === 4 &&
    BARE.readyCount === 4 &&
    BARE.missing.includes('SSCC carton labels') &&
    BARE.missing.includes('ASN sheet')
);
check(
  '§P6: the filed ASN makes the ASN sheet READY and it reports the ASN reference',
  FULL.documents.find((d) => d.kind === 'asn_sheet').ready === true &&
    FULL.documents.find((d) => d.kind === 'asn_sheet').fields.some((f) => f.value === 'DH-PO-9100')
);
check(
  '§P6: the ASN sheet carries the documented chargeback rule',
  /must receive the shipment confirmation/i.test(
    FULL.documents.find((d) => d.kind === 'asn_sheet').html ?? ''
  )
);

/* ── 6. determinism ─────────────────────────────────────────────────────── */

const strip = (pack) => JSON.stringify({ ...pack, generatedAt: null });
check(
  '§P6: identical inputs produce a byte-identical pack (only generatedAt differs)',
  strip(FULL) === strip(result.packs.repeat)
);

/* ── 7. ONE document-download rule, shared by badge and notification ────── */

const A = result.awaiting;
check(
  '§P6: the download rule covers exactly the accepted → pre-ship window',
  A.accepted === true &&
    A.ready_to_fulfil === true &&
    A.received === false &&
    A.under_review === false &&
    A.shipped === false &&
    A.delivered === false
);
const navSource = fs.readFileSync(path.join(ROOT, 'src/lib/nav/navBadges.ts'), 'utf8');
const notifSource = fs.readFileSync(
  path.join(ROOT, 'src/components/shared/NotificationCenter.tsx'),
  'utf8'
);
check(
  '§P6: the nav badge and the notification centre both use that ONE rule (no second definition)',
  navSource.includes('documentsAwaitingDownload') && notifSource.includes('documentsAwaitingDownload')
);



/* ── 8. the documented collect chain ────────────────────────────────────── */

const C = result.chain;
const stepState = (chain, id) => (chain.steps.find((s) => s.id === id) ?? {}).state;
check(
  '§P6: the pickup lead time is the DOCUMENTED channel rule (2 business days, owned by the channel)',
  C.lead.businessDays === 2 && C.lead.owner === 'retail channel' && C.lead.basis.includes('AV-014')
);
check(
  '§P6: the earliest requested pickup skips WEEKENDS (Mon→Wed, Thu→Mon, Fri→Tue)',
  C.monday === '2026-09-23' && C.thursday === '2026-09-28' && C.friday === '2026-09-29',
  `${C.monday} / ${C.thursday} / ${C.friday}`
);
check(
  '§P6: the chain is documented in order — request → carrier assigned → ARN → pickup',
  C.requested.steps.map((s) => s.id).join(',') === 'shipment_request,carrier_assigned,arn,pickup'
);
check(
  '§P6: a prepaid lane is NOT APPLICABLE to the whole channel chain',
  C.prepaid.applies === false && C.prepaid.steps.every((s) => s.state === 'not_applicable')
);
check(
  '§P6: a collect PO with no channel response shows the request pending and the rest awaiting the channel',
  C.noInstruction.applies === true &&
    stepState(C.noInstruction, 'shipment_request') === 'awaiting_channel' &&
    stepState(C.noInstruction, 'carrier_assigned') === 'awaiting_channel' &&
    stepState(C.noInstruction, 'arn') === 'awaiting_channel'
);
check(
  '§P6: the raised routing request is DONE, with the channel pickup date it asked for',
  stepState(C.requested, 'shipment_request') === 'done' && C.requested.requestedPickUp === '2026-09-24'
);
check(
  '§P6: pickup is SCHEDULED (not claimed as performed) while the goods have not moved',
  stepState(C.requested, 'pickup') === 'scheduled'
);
check(
  '§P6: pickup becomes DONE only once the consignment has left the pre-collection stage',
  stepState(C.collected, 'pickup') === 'done'
);
check(
  '§P6: NO ARN IS EVER FABRICATED — it exists only when the channel record carries one',
  C.arnFromRecord === 'MOCK-ARN-00042' &&
    C.arnWithoutRecord === null &&
    C.arnNoInstruction === null &&
    C.requested.arn === null &&
    C.noInstruction.arn === null
);
check(
  '§P6: carrier assignment and the ARN come from the channel record, together',
  stepState(C.assigned, 'carrier_assigned') === 'done' && stepState(C.assigned, 'arn') === 'done'
);
check(
  '§P6: every chain step states the documented basis it rests on',
  C.requested.steps.every((s) => typeof s.basis === 'string' && s.basis.length > 20)
);

/* ── 9. zero network calls ──────────────────────────────────────────────── */

const PURE_MODULES = [
  'src/lib/documents/sscc.ts',
  'src/lib/documents/poDocumentPack.ts',
  'src/lib/shipping/collectChain.ts',
];
for (const rel of PURE_MODULES) {
  const source = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  check(
    `no-network: ${rel} performs no network call`,
    !/\bfetch\s*\(/.test(code) && !/XMLHttpRequest|axios|navigator\.sendBeacon/.test(code)
  );
}

/* ── Report ─────────────────────────────────────────────────────────────── */

console.log('');
if (fail === 0) {
  console.log(`PO_DOCUMENTS_VALIDATION_PASS (${pass} assertions, 0 network calls)`);
  process.exit(0);
}
console.log(`PO_DOCUMENTS_VALIDATION_FAIL (${pass} passed, ${fail} failed)`);
for (const e of errors) console.log(`  - ${e}`);
process.exit(1);

