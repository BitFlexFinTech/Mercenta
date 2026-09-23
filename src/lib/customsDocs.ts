/**
 * §Stage-3 — Auto-generated customs documentation.
 *
 * Commercial Invoice, Detailed Packing List and UKCA Declaration of
 * Conformity are AUTO-GENERATED, pre-filled from:
 *   - the purchase order (SKUs, quantities, values),
 *   - Mercenta's own EORI/VAT as Importer of Record (src/config/customs.ts),
 *   - the brand's product master data (commodity codes).
 *
 * The brand's job is to REVIEW AND CONFIRM — never to recreate a document.
 */
import {
  MERCENTA_EORI,
  MERCENTA_VAT,
  MERCENTA_REGISTERED_ADDRESS,
  DEFAULT_INCOTERMS,
} from '@/config/customs';
import type { Product, PurchaseOrder } from '@/types';

export type CustomsDocType = 'commercial_invoice' | 'packing_list' | 'ukca_declaration';

export interface CustomsDocumentBundle {
  type: CustomsDocType;
  title: string;
  poNumber: string;
  brandName: string;
  html: string;
  /** Auto-populated fields the reviewer should sanity-check. */
  preFilled: { label: string; value: string }[];
}

interface DocContext {
  po: PurchaseOrder;
  brandName: string;
  /**
   * The catalogue products the PO's lines refer to. Typed as the BASE `Product`
   * (§P6): this module reads only `sku`, `vatStatus`, dimensions and weight, so
   * requiring the demo-only `DemoProduct` narrowed the contract without need and
   * forced callers to hold a demo type. `DemoProduct` extends `Product`, so every
   * existing caller is unaffected.
   */
  products: Product[];
}

function headerRows(ctx: DocContext) {
  return [
    ['Exporter / Importer of Record', 'Mercenta Partners Ltd'],
    ['EORI', MERCENTA_EORI],
    ['VAT', MERCENTA_VAT],
    ['Registered Address', MERCENTA_REGISTERED_ADDRESS],
    ['Supplier (Brand)', ctx.brandName],
    ['Purchase Order', ctx.po.poNumber],
    ['Incoterms', DEFAULT_INCOTERMS],
  ];
}

function lineItemTable(ctx: DocContext): string {
  const rows = ctx.po.lineItems
    .map((li) => {
      const product = ctx.products.find((p) => p.sku === li.sku);
      return `<tr>
        <td>${li.sku}</td><td>${li.productName}</td>
        <td>${li.commodityCode}</td>
        <td style="text-align:right">${li.quantity}</td>
        <td style="text-align:right">£${li.unitPrice.toFixed(2)}</td>
        <td style="text-align:right">£${(li.quantity * li.unitPrice).toFixed(2)}</td>
        ${product ? `<td>${product.vatStatus}</td>` : ''}
      </tr>`;
    })
    .join('\n');
  const total = ctx.po.poValue.toFixed(2);
  return `<table width="100%" cellpadding="4" style="border-collapse:collapse">
    <thead><tr>
      <th align="left">SKU</th><th align="left">Description</th>
      <th align="left">Commodity Code</th><th align="right">Qty</th>
      <th align="right">Unit (£)</th><th align="right">Line Total (£)</th>
      <th align="left">VAT</th>
    </tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr><td colSpan="5" align="right"><strong>Net PO Total</strong></td>
    <td align="right"><strong>£${total}</strong></td><td></td></tr></tfoot>
  </table>`;
}

function docShell(title: string, ctx: DocContext, body: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title} — ${ctx.po.poNumber}</title></head>
  <body style="font-family:Georgia,serif;max-width:760px;margin:32px auto;color:#0C1219">
    <h1>${title}</h1>
    <table cellpadding="3">${headerRows(ctx)
      .map(([k, v]) => `<tr><td><strong>${k}</strong></td><td>${v}</td></tr>`)
      .join('\n')}</table>
    <hr/>
    ${body}
  </body></html>`;
}

export function generateCommercialInvoice(ctx: DocContext): CustomsDocumentBundle {
  const body = `
    <p>Commercial invoice for goods supplied under purchase order ${ctx.po.poNumber}.</p>
    ${lineItemTable(ctx)}
    <p style="font-size:12px">All goods manufactured by ${ctx.brandName} and imported into the
    United Kingdom by Mercenta Partners Ltd acting as Importer of Record.</p>`;
  return {
    type: 'commercial_invoice',
    title: 'Commercial Invoice',
    poNumber: ctx.po.poNumber,
    brandName: ctx.brandName,
    html: docShell('Commercial Invoice', ctx, body),
    preFilled: [
      { label: 'Importer EORI (Mercenta)', value: MERCENTA_EORI },
      { label: 'Importer VAT (Mercenta)', value: MERCENTA_VAT },
      { label: 'Incoterms', value: DEFAULT_INCOTERMS },
      { label: 'Net PO Value', value: `£${ctx.po.poValue.toFixed(2)}` },
    ],
  };
}

export function generatePackingList(ctx: DocContext): CustomsDocumentBundle {
  const rows = ctx.po.lineItems
    .map((li) => {
      const product = ctx.products.find((p) => p.sku === li.sku);
      const cartons = Math.max(1, Math.ceil(li.quantity / 20));
      return `<tr>
        <td>${li.sku}</td><td>${li.productName}</td>
        <td style="text-align:right">${li.quantity}</td>
        <td style="text-align:right">${cartons}</td>
        <td>${product ? `${product.length}×${product.width}×${product.height} cm` : '—'}</td>
        <td>${product ? `${(product.weight * li.quantity).toFixed(1)} kg` : '—'}</td>
      </tr>`;
    })
    .join('\n');
  const body = `
    <p>Detailed packing list for purchase order ${ctx.po.poNumber}.</p>
    <table width="100%" cellpadding="4" style="border-collapse:collapse">
      <thead><tr>
        <th align="left">SKU</th><th align="left">Description</th>
        <th align="right">Units</th><th align="right">Cartons (est.)</th>
        <th align="left">Unit Dims</th><th align="left">Gross Weight</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  return {
    type: 'packing_list',
    title: 'Detailed Packing List',
    poNumber: ctx.po.poNumber,
    brandName: ctx.brandName,
    html: docShell('Detailed Packing List', ctx, body),
    preFilled: [
      { label: 'Consignee EORI (Mercenta)', value: MERCENTA_EORI },
      { label: 'Line Items', value: String(ctx.po.lineItems.length) },
      { label: 'Incoterms', value: DEFAULT_INCOTERMS },
    ],
  };
}

export function generateUkcaDeclaration(ctx: DocContext): CustomsDocumentBundle {
  const productNames = ctx.po.lineItems.map((li) => li.productName).join('; ');
  const body = `
    <p>UKCA Declaration of Conformity</p>
    <p>This declaration of conformity is issued under the sole responsibility of
    the manufacturer. The following products are declared conformant with the
    applicable UK legislation for placement on the UK market:</p>
    <p><strong>${productNames}</strong></p>
    <p>Authorised representative within the UK: Mercenta Partners Ltd (Importer of
    Record), EORI ${MERCENTA_EORI}, VAT ${MERCENTA_VAT}, ${MERCENTA_REGISTERED_ADDRESS}.</p>
    <p>Signed for and on behalf of: ${ctx.brandName}</p>`;
  return {
    type: 'ukca_declaration',
    title: 'UKCA Declaration of Conformity',
    poNumber: ctx.po.poNumber,
    brandName: ctx.brandName,
    html: docShell('UKCA Declaration of Conformity', ctx, body),
    preFilled: [
      { label: 'UK Representative', value: 'Mercenta Partners Ltd (IOR)' },
      { label: 'Products Declared', value: String(ctx.po.lineItems.length) },
    ],
  };
}

/** All three documents for a PO, ready for brand review & confirmation. */
export function generateCustomsDocBundle(ctx: DocContext): CustomsDocumentBundle[] {
  return [
    generateCommercialInvoice(ctx),
    generatePackingList(ctx),
    generateUkcaDeclaration(ctx),
  ];
}
