/**
 * §P6 — THE PO DOCUMENT PACK (the ONE owner of "what documents a purchase order
 * has, and whether each one is ready").
 *
 * FOUNDER DECISION 6 (`docs/DASHBOARD_LOGISTICS_CLEANUP_PROGRAMME_2026-09-22.md` §2):
 * "The Logistics Hub = where brands download shipping labels + ALL PO documents …
 * the document pack is the Hub's core deliverable, offered AT ACCEPTANCE", and
 * decision 9: "On PO acceptance, the ASN/shipment/documents are AUTOMATIC".
 *
 * WHAT THE PACK CONTAINS (programme row P6)
 * -----------------------------------------
 *   1  SSCC carton labels          — one GS1 SSCC-18 per carton (vendor-generated,
 *                                    `src/lib/documents/sscc.ts`)
 *   2  carrier label               — rendered by the EXISTING label dialogue
 *   3  freight waybill             — rendered by the EXISTING waybill dialogue
 *   4  packing list / delivery note
 *   5  ASN sheet                   — what Mercenta actually filed
 *   6  customs documents           — INTERNATIONAL LANES ONLY, delegated to the
 *                                    existing owner `src/lib/customsDocs.ts`
 *
 * OWNERSHIP RULES THIS MODULE OBEYS
 * ---------------------------------
 * · The destination is NEVER re-derived here: it comes from
 *   `src/config/destinationFc.ts` (P5), so every document names the FC the
 *   purchase order itself declares and never a Mercenta site.
 * · Customs documents are NOT re-implemented — they are the existing bundle.
 * · The carrier label and the waybill are NOT re-rendered — the pack declares the
 *   renderer, and the Hub opens the existing dialogues. One renderer per artefact.
 * · Nothing is silently omitted: a document that does not apply carries a stated
 *   reason (`applicable: false` + `notApplicableReason`), and one whose source is
 *   not on the record yet is `ready: false` with the reason. A document the
 *   platform cannot honestly produce is never shown as if it existed.
 */
import type { AsnDetail } from '@/data/api';
import type { ChannelInstruction, Product, PurchaseOrder, ShippingLane } from '@/types';
import { destinationLabelForPo } from '@/config/destinationFc';
import { DESTINATION_NOT_DECLARED } from '@/config/logisticsGeo';
import { resolveShippingLane } from '@/lib/shipping/carrierRouting';
import { generateCustomsDocBundle } from '@/lib/customsDocs';
import { SSCC_GS1_PREFIX, SSCC_PLACEHOLDER_NOTICE, ssccForCarton } from './sscc';
import { ASN_PALLET_PROFILE } from '@/config/shipping';

export type PoDocumentKind =
  | 'sscc_carton_labels'
  | 'carrier_label'
  | 'freight_waybill'
  | 'packing_list_delivery_note'
  | 'asn_sheet'
  | 'customs_commercial_invoice'
  | 'customs_packing_list'
  | 'customs_ukca_declaration';

/** How a document is presented. The Hub dispatches on this — never on its title. */
export type PoDocumentRenderer = 'inline_html' | 'carrier_label_dialog' | 'waybill_dialog';

export interface PoDocumentField {
  label: string;
  value: string;
}

/** One carton's generated identifier, as printed on its label. */
export interface PoCartonIdentifier {
  /** 1-based carton number within the consignment. */
  carton: number;
  of: number;
  sku: string;
  quantity: number;
  sscc: string;
  weightKg: number;
  dimensions: string;
  /**
   * §BATCH 2n (`AV-016`) — the 1-based pallet this carton is loaded on, and that
   * pallet's own SSCC container identifier. Present only when the ASN carries a
   * carton→pallet structure (the channel documents the ASN as carrying
   * "carton + pallet structures").
   */
  pallet?: number;
  palletSscc?: string;
}

export interface PoDocument {
  kind: PoDocumentKind;
  title: string;
  /** Why the document exists — rendered to the operator, not decorative. */
  purpose: string;
  /** The lane scope it applies to. */
  laneScope: 'all_lanes' | 'international';
  applicable: boolean;
  notApplicableReason?: string;
  ready: boolean;
  notReadyReason?: string;
  /** True when the content is generated/simulated rather than provider-confirmed. */
  simulated: boolean;
  placeholderNotice?: string;
  renderer: PoDocumentRenderer;
  fields: PoDocumentField[];
  html?: string;
  cartonIdentifiers?: PoCartonIdentifier[];
}

export interface PoDocumentPack {
  poId: string;
  poNumber: string;
  brandName: string;
  /** The FC the PO declares (P5) — the destination on every document. */
  destinationLabel: string;
  lane: ShippingLane;
  generatedAt: string;
  documents: PoDocument[];
  applicableCount: number;
  readyCount: number;
  /** Applicable documents whose source is not on the record yet. */
  missing: string[];
  /** Sentences the surface must render so no status is implied. */
  notices: string[];
}

/** The carrier reference a label/waybill needs — from the consignment record. */
export interface PoCarrierReference {
  carrier: string;
  trackingNumber?: string | null;
  waybill?: string | null;
}


/* ── printable helpers ────────────────────────────────────────────────────── */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * The printable shell for the pack's own documents.
 *
 * Kept local to this module on purpose: `src/lib/customsDocs.ts` is an existing,
 * validated contract with its own shell, and re-pointing it at this one would
 * change documents that are already verified for no functional gain. No DATA is
 * duplicated — only the presentation wrapper.
 */
function printableShell(title: string, reference: string, body: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)} — ${escapeHtml(reference)}</title></head>
  <body style="font-family:Georgia,serif;max-width:760px;margin:32px auto;color:#0C1219">
    <h1 style="font-size:20px">${escapeHtml(title)}</h1>
    <p style="font-size:12px;color:#555">Reference ${escapeHtml(reference)}</p>
    <hr/>
    ${body}
  </body></html>`;
}

function fieldTable(fields: PoDocumentField[]): string {
  return `<table cellpadding="3">${fields
    .map(
      (f) =>
        `<tr><td><strong>${escapeHtml(f.label)}</strong></td><td>${escapeHtml(f.value)}</td></tr>`
    )
    .join('\n')}</table>`;
}

/* ── the cartons the pack describes ───────────────────────────────────────── */

/**
 * One identifier per carton of the consignment.
 *
 * The carton list is the ASN Mercenta filed (or will file) — the pack never
 * invents a carton structure. An empty list means no ASN is on the record, which
 * the SSCC document reports as not ready rather than printing unlabelled cartons.
 */
export function cartonIdentifiersFor(
  poNumber: string,
  cartons: AsnDetail['cartons'],
  pallets?: AsnDetail['pallets']
): PoCartonIdentifier[] {
  return cartons.map((carton, index) => {
    const cartonNumber = index + 1;
    /** §BATCH 2n (`AV-016`) — the pallet this carton loads onto, when a structure exists. */
    const pallet = pallets?.find((p) => p.cartons.includes(cartonNumber));
    return {
      carton: cartonNumber,
      of: cartons.length,
      sku: carton.sku,
      quantity: carton.quantity,
      sscc: ssccForCarton(poNumber, cartonNumber),
      weightKg: carton.weightKg,
      dimensions: `${carton.lengthCm}×${carton.widthCm}×${carton.heightCm} cm`,
      ...(pallet ? { pallet: pallet.pallet, palletSscc: pallet.sscc } : {}),
    };
  });
}

/* ── 1. SSCC carton labels ────────────────────────────────────────────────── */

function ssccLabelsDocument(
  poNumber: string,
  brandName: string,
  destinationLabel: string,
  cartons: PoCartonIdentifier[],
  pallets?: AsnDetail['pallets']
): PoDocument {
  const ready = cartons.length > 0;
  const labels = cartons
    .map(
      (carton) => `
      <div style="border:1px solid #0C1219;padding:12px;margin:10px 0">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em">Carton label — SSCC</div>
        <div style="font-size:16px;font-weight:bold">${escapeHtml(brandName)} · ${escapeHtml(poNumber)}</div>
        <div style="font-size:12px">Carton ${carton.carton} of ${carton.of}</div>
        <div style="font-size:12px">SKU ${escapeHtml(carton.sku)} · ${carton.quantity} units · ${carton.weightKg} kg · ${escapeHtml(carton.dimensions)}</div>
        <div style="font-size:12px">Ship to: ${escapeHtml(destinationLabel)}</div>
        ${
          carton.pallet
            ? `<div style="font-size:12px">Pallet ${carton.pallet}${carton.palletSscc ? ` · ${carton.palletSscc}` : ''}</div>`
            : ''
        }
        <div style="font-family:monospace;font-size:18px;letter-spacing:.12em;margin-top:8px">${carton.sscc}</div>
        <div style="font-size:10px;color:#7a1f1f">${escapeHtml(SSCC_GS1_PREFIX.placeholderLabel)}</div>
      </div>`
    )
    .join('\n');

  /**
   * §BATCH 2n (`AV-016`) — THE PALLET STRUCTURE, printed on the same label sheet.
   *
   * One label per pallet (its own SSCC container identifier and the cartons it
   * carries), so the carton→pallet grouping the ASN declares is on the artefact the
   * warehouse applies. The Mercenta-declared basis is printed beneath it, so it can
   * never be mistaken for a retail-channel rule.
   */
  const palletSection =
    pallets && pallets.length > 0
      ? `
    <h2 style="font-size:15px;margin-top:28px">Pallet structure — label per pallet</h2>
    ${pallets
      .map(
        (pallet) => `
      <div style="border:1px solid #0C1219;padding:12px;margin:10px 0">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em">Pallet label — SSCC</div>
        <div style="font-size:16px;font-weight:bold">${escapeHtml(brandName)} · ${escapeHtml(poNumber)}</div>
        <div style="font-size:12px">Pallet ${pallet.pallet} of ${pallet.of} · cartons ${pallet.cartons.join(', ')} · ${pallet.weightKg} kg</div>
        <div style="font-size:12px">Ship to: ${escapeHtml(destinationLabel)}</div>
        <div style="font-family:monospace;font-size:18px;letter-spacing:.12em;margin-top:8px">${pallet.sscc}</div>
        <div style="font-size:10px;color:#7a1f1f">${escapeHtml(SSCC_GS1_PREFIX.placeholderLabel)}</div>
      </div>`
      )
      .join('\n')}
    <p style="font-size:11px;color:#555">${escapeHtml(ASN_PALLET_PROFILE.basis)}</p>`
      : '';

  return {
    kind: 'sscc_carton_labels',
    title: 'SSCC carton labels',
    purpose:
      'One GS1 SSCC-18 container identifier per carton, and — where the ASN carries a pallet structure — one per pallet, which the ASN declares to the retail channel. Print one label per carton and per pallet and apply them before dispatch.',
    laneScope: 'all_lanes',
    applicable: true,
    ready,
    ...(ready
      ? {}
      : {
          notReadyReason:
            'No carton structure is on the record yet — the labels are generated from the ASN Mercenta files on acceptance.',
        }),
    simulated: true,
    placeholderNotice: SSCC_PLACEHOLDER_NOTICE,
    renderer: 'inline_html',
    fields: [
      { label: 'Cartons', value: String(cartons.length) },
      { label: 'Pallets', value: String(pallets?.length ?? 0) },
      { label: 'SSCC prefix status', value: 'unassigned placeholder (not a licensed GS1 prefix)' },
      { label: 'Ship to', value: destinationLabel },
    ],
    ...(ready
      ? {
          html: printableShell('SSCC carton labels', poNumber, labels + palletSection),
          cartonIdentifiers: cartons,
        }
      : {}),
  };
}

/* ── 2. carrier label + 3. freight waybill (existing renderers) ───────────── */

function carrierLabelDocument(
  destinationLabel: string,
  carrier: PoCarrierReference | null | undefined
): PoDocument {
  const ready = !!carrier?.carrier;
  return {
    kind: 'carrier_label',
    title: 'Carrier shipping label',
    purpose:
      'The carriage label for the consignment, addressed to the fulfilment centre the purchase order declares.',
    laneScope: 'all_lanes',
    applicable: true,
    ready,
    ...(ready
      ? {}
      : {
          notReadyReason:
            'No carrier is recorded on this consignment yet — the label follows the carrier booking.',
        }),
    simulated: true,
    renderer: 'carrier_label_dialog',
    fields: [
      { label: 'Carrier', value: carrier?.carrier ?? '—' },
      { label: 'Tracking number', value: carrier?.trackingNumber ?? '—' },
      { label: 'Ship to', value: destinationLabel },
    ],
  };
}

function waybillDocument(
  poNumber: string,
  destinationLabel: string,
  carrier: PoCarrierReference | null | undefined
): PoDocument {
  const ready = !!carrier?.waybill;
  return {
    kind: 'freight_waybill',
    title: 'Freight waybill',
    purpose:
      'The consignment document that travels with the freight. It exists once the carrier has booked the consignment.',
    laneScope: 'all_lanes',
    applicable: true,
    ready,
    ...(ready
      ? {}
      : {
          notReadyReason:
            'No waybill is booked on this consignment yet — the waybill is issued by the carrier booking, never invented here.',
        }),
    simulated: true,
    renderer: 'waybill_dialog',
    fields: [
      { label: 'Waybill', value: carrier?.waybill ?? '—' },
      { label: 'Carrier', value: carrier?.carrier ?? '—' },
      { label: 'Purchase order', value: poNumber },
      { label: 'Ship to', value: destinationLabel },
    ],
  };
}



/* ── 4. packing list / delivery note ──────────────────────────────────────── */

interface PackingLine {
  sku: string;
  description: string;
  units: number;
  cartons: number;
  weightKg: number;
  dimensions: string;
  basis: string;
}

/**
 * The packing lines — grouped from the ASN's cartons when the ASN is on the
 * record, otherwise from the purchase order's acknowledged volumes (with the
 * basis stated on the document, so a pre-ASN print never claims to be the filed
 * packing list).
 */
function packingLines(
  po: PurchaseOrder,
  cartons: AsnDetail['cartons']
): { lines: PackingLine[]; basis: string } {
  const nameFor = (sku: string) =>
    po.lineItems.find((li) => li.sku === sku)?.productName ?? sku;

  if (cartons.length > 0) {
    const bySku = new Map<string, PackingLine>();
    for (const carton of cartons) {
      const existing = bySku.get(carton.sku);
      const dimensions = `${carton.lengthCm}×${carton.widthCm}×${carton.heightCm} cm`;
      if (existing) {
        existing.units += carton.quantity;
        existing.cartons += 1;
        existing.weightKg += carton.weightKg;
      } else {
        bySku.set(carton.sku, {
          sku: carton.sku,
          description: nameFor(carton.sku),
          units: carton.quantity,
          cartons: 1,
          weightKg: carton.weightKg,
          dimensions,
          basis: 'ASN carton structure filed by Mercenta',
        });
      }
    }
    return { lines: [...bySku.values()], basis: 'ASN carton structure filed by Mercenta' };
  }

  return {
    lines: po.lineItems
      .filter((li) => li.ackStatus !== 'rejected')
      .map((li) => ({
        sku: li.sku,
        description: li.productName,
        units: li.acknowledgedQty ?? li.quantity,
        cartons: 0,
        weightKg: 0,
        dimensions: '—',
        basis: 'acknowledged PO volumes (no ASN carton structure on the record yet)',
      })),
    basis: 'acknowledged PO volumes (no ASN carton structure on the record yet)',
  };
}

function packingListDocument(
  po: PurchaseOrder,
  brandName: string,
  destinationLabel: string,
  cartons: AsnDetail['cartons'],
  pallets?: AsnDetail['pallets']
): PoDocument {
  const { lines, basis } = packingLines(po, cartons);
  const rows = lines
    .map(
      (line) => `<tr>
        <td>${escapeHtml(line.sku)}</td><td>${escapeHtml(line.description)}</td>
        <td style="text-align:right">${line.units}</td>
        <td style="text-align:right">${line.cartons || '—'}</td>
        <td style="text-align:right">${line.weightKg ? `${line.weightKg} kg` : '—'}</td>
        <td>${escapeHtml(line.dimensions)}</td>
      </tr>`
    )
    .join('\n');

  const body = `
    <p>Packing list and delivery note for purchase order ${escapeHtml(po.poNumber)}.</p>
    <p style="font-size:12px">Consignment basis: ${escapeHtml(basis)}.</p>
    <table width="100%" cellpadding="4" style="border-collapse:collapse">
      <thead><tr>
        <th align="left">SKU</th><th align="left">Description</th>
        <th align="right">Units</th><th align="right">Cartons</th>
        <th align="right">Weight</th><th align="left">Carton dims</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <h2 style="font-size:15px;margin-top:24px">Delivery note</h2>
    ${fieldTable([
      { label: 'Supplier (brand)', value: brandName },
      { label: 'Delivery note', value: `DN-${po.poNumber}` },
      { label: 'Deliver to (destination FC)', value: destinationLabel },
      { label: 'Cartons', value: String(cartons.length || '—') },
      /** §BATCH 2n (`AV-016`) — the pallet structure the ASN declares. */
      { label: 'Pallets', value: String(pallets?.length ?? 0) },
    ])}
    <p style="font-size:12px;margin-top:16px">
      Received by: ______________________  Date: ____________  Signature: ______________________
    </p>`;

  return {
    kind: 'packing_list_delivery_note',
    title: 'Packing list & delivery note',
    purpose:
      'The carton-by-carton contents of the consignment, with the delivery note the destination signs on receipt.',
    laneScope: 'all_lanes',
    applicable: true,
    ready: lines.length > 0,
    ...(lines.length > 0
      ? {}
      : { notReadyReason: 'The purchase order carries no acknowledged line to pack.' }),
    simulated: true,
    renderer: 'inline_html',
    fields: [
      { label: 'Lines', value: String(lines.length) },
      { label: 'Cartons', value: String(cartons.length) },
      /** §BATCH 2n (`AV-016`) — the pallet structure the ASN declares. */
      { label: 'Pallets', value: String(pallets?.length ?? 0) },
      { label: 'Basis', value: basis },
    ],
    ...(lines.length > 0
      ? { html: printableShell('Packing list & delivery note', po.poNumber, body) }
      : {}),
  };
}

/* ── 5. ASN sheet ─────────────────────────────────────────────────────────── */

function asnSheetDocument(
  po: PurchaseOrder,
  destinationLabel: string,
  asn: AsnDetail | null | undefined,
  identifiers: PoCartonIdentifier[],
  instruction?: ChannelInstruction | null
): PoDocument {
  const outcome = instruction?.outcome ?? null;
  const filed = outcome?.asn?.filed === true;
  const mode = outcome?.channelAcknowledgement?.mode;
  const units = asn?.cartons.reduce((total, carton) => total + carton.quantity, 0) ?? 0;

  const fields: PoDocumentField[] = [
    { label: 'Purchase order', value: po.poNumber },
    { label: 'ASN reference', value: outcome?.asn?.reference ?? '—' },
    { label: 'Filed with the channel', value: filed ? 'Yes' : 'No' },
    { label: 'Channel call', value: mode ? `${mode}${mode === 'mock' ? ' (no live call)' : ''}` : '—' },
    { label: 'Ship date', value: asn?.shipDate ?? '—' },
    { label: 'Carrier', value: asn?.carrier ?? '—' },
    { label: 'Cartons', value: String(asn?.cartons.length ?? 0) },
    { label: 'Units', value: String(units) },
    { label: 'SSCC identifiers', value: String(identifiers.length) },
    { label: 'Pallets', value: String(asn?.pallets?.length ?? 0) },
    { label: 'Destination FC', value: destinationLabel },
    ...(asn?.lotNumber ? [{ label: 'Lot number', value: asn.lotNumber }] : []),
    ...(asn?.expiryDate ? [{ label: 'Expiry date', value: asn.expiryDate }] : []),
  ];

  /**
   * §BATCH 2n (`AV-016`) — THE PALLET STRUCTURE on the ASN sheet. The channel
   * documents the ASN as carrying "carton + pallet structures", so the sheet that
   * records what Mercenta filed states the pallets and the cartons each carries —
   * with the Mercenta-declared basis, never presented as a channel rule.
   */
  const palletRows = (asn?.pallets ?? [])
    .map(
      (pallet) =>
        `<tr><td>${pallet.pallet} of ${pallet.of}</td><td>${pallet.cartons.join(', ')}</td>` +
        `<td style="text-align:right">${pallet.weightKg} kg</td>` +
        `<td style="font-family:monospace">${pallet.sscc}</td></tr>`
    )
    .join('\n');
  const palletSection =
    (asn?.pallets?.length ?? 0) > 0
      ? `
    <h2 style="font-size:15px;margin-top:24px">Pallet structure</h2>
    <table width="100%" cellpadding="4" style="border-collapse:collapse">
      <thead><tr><th align="left">Pallet</th><th align="left">Cartons</th>
      <th align="right">Weight</th><th align="left">Pallet SSCC</th></tr></thead>
      <tbody>${palletRows}</tbody>
    </table>
    <p style="font-size:11px;color:#555">${escapeHtml(ASN_PALLET_PROFILE.basis)}</p>`
      : '';

  const body = `
    <p>Advance Shipment Notice filed by Mercenta for purchase order ${escapeHtml(po.poNumber)}.</p>
    ${fieldTable(fields)}
    <h2 style="font-size:15px;margin-top:24px">Carton structure</h2>
    <table width="100%" cellpadding="4" style="border-collapse:collapse">
      <thead><tr><th align="left">Carton</th><th align="left">SKU</th>
      <th align="right">Units</th><th align="left">SSCC</th></tr></thead>
      <tbody>${identifiers
        .map(
          (carton) =>
            `<tr><td>${carton.carton} of ${carton.of}</td><td>${escapeHtml(carton.sku)}</td>
             <td style="text-align:right">${carton.quantity}</td>
             <td style="font-family:monospace">${carton.sscc}</td></tr>`
        )
        .join('\n')}</tbody>
    </table>${palletSection}
    <p style="font-size:12px;margin-top:16px">
      The retail channel must receive the shipment confirmation <strong>before</strong> the goods are
      received at the fulfilment centre; missing or delayed shipment confirmations result in chargebacks.
    </p>`;

  return {
    kind: 'asn_sheet',
    title: 'ASN sheet',
    purpose:
      'The record of the Advance Shipment Notice Mercenta filed with the retail channel, with the carton structure and SSCC identifiers it declared.',
    laneScope: 'all_lanes',
    applicable: true,
    ready: filed,
    ...(filed
      ? {}
      : {
          notReadyReason:
            outcome?.asn?.note ??
            'The ASN has not been filed on this purchase order yet — Mercenta files it automatically on acceptance.',
        }),
    simulated: true,
    renderer: 'inline_html',
    fields,
    html: printableShell('ASN sheet', po.poNumber, body),
  };
}

/* ── 6. customs documents (INTERNATIONAL LANES ONLY — delegated owner) ─────── */

const CUSTOMS_KIND_BY_TYPE: Record<string, PoDocumentKind> = {
  commercial_invoice: 'customs_commercial_invoice',
  packing_list: 'customs_packing_list',
  ukca_declaration: 'customs_ukca_declaration',
};

function customsDocuments(
  po: PurchaseOrder,
  brandName: string,
  products: Product[],
  lane: ShippingLane
): PoDocument[] {
  const applicable = lane === 'international';
  const bundle = generateCustomsDocBundle({ po, brandName, products });

  return bundle.map((doc) => ({
    kind: CUSTOMS_KIND_BY_TYPE[doc.type] ?? 'customs_commercial_invoice',
    title: doc.title,
    purpose:
      'Customs documentation for an international lane, auto-generated and pre-filled for review. Mercenta is the Importer of Record.',
    laneScope: 'international' as const,
    applicable,
    ...(applicable
      ? {}
      : {
          notApplicableReason:
            'Customs documentation applies to international lanes; this consignment is a UK domestic move.',
        }),
    ready: applicable,
    simulated: false,
    renderer: 'inline_html' as const,
    fields: doc.preFilled,
    ...(applicable ? { html: doc.html } : {}),
  }));
}

/* ── THE PACK ─────────────────────────────────────────────────────────────── */

/**
 * Build the document pack for one purchase order.
 *
 * Pure and deterministic: every document is derived from records the caller
 * supplies (the PO, its ASN, the instruction Mercenta actioned, the consignment's
 * carrier reference). No clock-dependent content beyond `generatedAt`, no
 * randomness, no network — a reprint is identical and a validator can assert it.
 */
export function buildPoDocumentPack(input: {
  po: PurchaseOrder;
  brandName: string;
  brandNation?: string | null;
  products?: Product[];
  asn?: AsnDetail | null;
  carrier?: PoCarrierReference | null;
  instruction?: ChannelInstruction | null;
  now?: Date;
}): PoDocumentPack {
  const { po, brandName } = input;
  const lane = resolveShippingLane({ brandNation: input.brandNation ?? null });
  const destinationLabel = destinationLabelForPo(po);
  const cartons = input.asn?.cartons ?? [];
  /** §BATCH 2n (`AV-016`) — the ASN's carton→pallet structure, when it carries one. */
  const pallets = input.asn?.pallets;
  const identifiers = cartonIdentifiersFor(po.poNumber, cartons, pallets);

  const documents: PoDocument[] = [
    ssccLabelsDocument(po.poNumber, brandName, destinationLabel, identifiers, pallets),
    carrierLabelDocument(destinationLabel, input.carrier),
    waybillDocument(po.poNumber, destinationLabel, input.carrier),
    packingListDocument(po, brandName, destinationLabel, cartons, pallets),
    asnSheetDocument(po, destinationLabel, input.asn, identifiers, input.instruction),
    ...customsDocuments(po, brandName, input.products ?? [], lane),
  ];

  const applicable = documents.filter((doc) => doc.applicable);

  return {
    poId: po.id,
    poNumber: po.poNumber,
    brandName,
    destinationLabel,
    lane,
    generatedAt: (input.now ?? new Date()).toISOString(),
    documents,
    applicableCount: applicable.length,
    readyCount: applicable.filter((doc) => doc.ready).length,
    missing: applicable.filter((doc) => !doc.ready).map((doc) => doc.title),
    notices: [
      /**
       * Compared against the canonical constant (never a retyped literal): the
       * "not declared" string is owned by `src/config/logisticsGeo.ts`, and a copy
       * here would silently stop matching if that value changed.
       */
      destinationLabel === DESTINATION_NOT_DECLARED
        ? 'This purchase order declares no ship-to party, so no document can name a destination — nothing is substituted.'
        : `Every document names the destination fulfilment centre the purchase order declares: ${destinationLabel}.`,
      lane === 'international'
        ? 'International lane — customs documentation is included.'
        : 'UK domestic lane — customs documentation does not apply and is not produced.',
    ],
  };
}

/**
 * THE ONE RULE for "does this purchase order still owe the brand a document
 * download?" — consumed by the Logistics Hub nav badge and the notification
 * centre, so a badge can never disagree with the pack it points at.
 *
 * The brand's own jobs are: accept/reject/backorder → download & print its
 * shipping documents → ship on time (programme §1). A PO that has been accepted
 * and not yet shipped is therefore still inside that job window.
 */
export function documentsAwaitingDownload(po: PurchaseOrder): boolean {
  return po.status === 'accepted' || po.status === 'ready_to_fulfil';
}

/* ── THE PACK AS A FILE (P1-fix, owner decision D3 = print AND download) ───── */

/**
 * A safe file stem for a download: letters, digits, dot, dash and underscore only.
 * A reference can be pasted from anywhere, so anything else becomes a dash — a
 * filename must never carry a path separator or a shell character.
 */
export function poDocumentFileStem(value: string): string {
  const stem = value
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/\.{2,}/g, '-')
    .replace(/^[.-]+|[.-]+$/g, '');
  return stem || 'document';
}

/** The filename ONE document downloads as (e.g. `PO-9002-packing_list_delivery_note.html`). */
export function poDocumentFileName(doc: PoDocument, poNumber: string): string {
  return `${poDocumentFileStem(poNumber)}-${poDocumentFileStem(doc.kind)}.html`;
}

/** The filename the WHOLE pack downloads as. */
export function poDocumentPackFileName(pack: PoDocumentPack): string {
  return `${poDocumentFileStem(pack.poNumber)}-document-pack.html`;
}

/**
 * Render the WHOLE pack as ONE self-contained HTML file — programme decision 6's
 * "brands download shipping labels + ALL PO documents". It is honest by
 * construction: a document that is applicable and READY is included by its OWN
 * HTML (this module owns it, so nothing is re-rendered here), and a document that
 * is not applicable or not ready is listed WITH ITS REASON rather than omitted or
 * faked. The file therefore never implies an artefact it does not contain.
 */
export function renderPoDocumentPackHtml(pack: PoDocumentPack): string {
  const sections = pack.documents
    .map((doc) => {
      if (doc.applicable && doc.ready && doc.html) {
        return `<section style="page-break-after:always">${doc.html}</section>`;
      }
      const why =
        doc.notApplicableReason ?? doc.notReadyReason ?? 'No printable content is on the record yet.';
      return `<section style="page-break-after:always">
        <h2 style="font-size:16px">${escapeHtml(doc.title)} — not included</h2>
        <p style="color:#555">${escapeHtml(why)}</p>
      </section>`;
    })
    .join('\n');

  return `<!doctype html><html><head><meta charset="utf-8">
  <title>${escapeHtml(pack.poNumber)} — document pack</title></head>
  <body style="font-family:Georgia,serif;max-width:760px;margin:32px auto;color:#0C1219">
    <h1 style="font-size:20px">${escapeHtml(pack.poNumber)} — document pack</h1>
    <p style="font-size:12px;color:#555">
      ${escapeHtml(pack.brandName)} · destination ${escapeHtml(pack.destinationLabel)} ·
      ${pack.readyCount}/${pack.applicableCount} documents ready · generated ${escapeHtml(pack.generatedAt)}
    </p>
    ${pack.notices.map((notice) => `<p style="font-size:12px;color:#555">${escapeHtml(notice)}</p>`).join('\n')}
    <hr/>
    ${sections}
  </body></html>`;
}
