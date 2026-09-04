/**
 * §11 — Internal invoice generator.
 *
 * Itemizes, per brand per billing period:
 *   - the flat monthly platform fee (subscription tier), plus
 *   - each PO's commission accrued in that period (event-driven from real
 *     purchase orders — never part of the Stripe subscription).
 *
 * Pure function so it can be unit-tested and rendered to HTML/PDF later.
 */
import { COMMISSION_AUTO_APPROVE_THRESHOLD_PLACEHOLDER_GBP } from '@/config/commercial';

export interface InvoiceCommissionLineInput {
  purchaseOrderId: string;
  poValue: number;
  commissionAmount: number;
}

export interface InvoiceLine {
  description: string;
  amountGbp: number;
}

export interface Invoice {
  number: string;
  brandId: string;
  brandName: string;
  periodStart: string;
  periodEnd: string;
  lines: InvoiceLine[];
  subtotalGbp: number;
  /** UK VAT is handled at payment level; invoices show net figures. */
  notes: string[];
  createdAt: string;
}

export interface GenerateInvoiceInput {
  /** Structural brand reference (works with any brand row shape). */
  brand: { id: string; profile: { businessName: string } };
  periodStart: string;
  periodEnd: string;
  sequence: number;
  /** Include the flat monthly platform fee line (omit if no active sub). */
  subscription?: { planTier: 'starter' | 'growth'; monthlyFee: number };
  commissions: InvoiceCommissionLineInput[];
  /** Commissions ≥ threshold are NOT invoiced automatically (§8) — excluded here. */
  excludeHeld?: boolean;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function generateInvoice(input: GenerateInvoiceInput): Invoice {
  const lines: InvoiceLine[] = [];
  const notes: string[] = [];

  if (input.subscription) {
    lines.push({
      description: `Platform fee — ${input.subscription.planTier} tier (${input.periodStart.slice(0, 7)})`,
      amountGbp: round2(input.subscription.monthlyFee),
    });
  } else {
    notes.push('No active subscription — platform fee not billed this period.');
  }

  let includedCommissions = input.commissions;
  if (input.excludeHeld) {
    const before = includedCommissions.length;
    // Held commissions (PO value ≥ auto-approve threshold) are filtered out
    // defensively here even though they should already be excluded upstream.
    includedCommissions = includedCommissions.filter(
      (c) => c.poValue < COMMISSION_AUTO_APPROVE_THRESHOLD_PLACEHOLDER_GBP
    );
    if (includedCommissions.length !== before) {
      notes.push('High-value commissions (≥ approval threshold) excluded pending review.');
    }
  }

  for (const c of includedCommissions) {
    lines.push({
      description: `Commission on purchase order ${c.purchaseOrderId} (PO value £${round2(c.poValue).toLocaleString()})`,
      amountGbp: round2(c.commissionAmount),
    });
  }

  const subtotalGbp = round2(lines.reduce((sum, l) => sum + l.amountGbp, 0));
  const periodTag = input.periodStart.slice(0, 7).replace('-', '');
  const brandTag = input.brand.id.split('-').pop()?.slice(0, 5).toUpperCase() ?? 'BRAND';

  return {
    number: `INV-${periodTag}-${brandTag}-${String(input.sequence).padStart(3, '0')}`,
    brandId: input.brand.id,
    brandName: input.brand.profile.businessName,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    lines,
    subtotalGbp,
    notes,
    createdAt: new Date().toISOString(),
  };
}

/** Render an Invoice to a printable HTML document (template-based, no PDF lib needed). */
export function renderInvoiceHtml(invoice: Invoice, legalEntity: string): string {
  const rows = invoice.lines
    .map(
      (l) =>
        `<tr><td>${l.description}</td><td style="text-align:right">£${l.amountGbp.toFixed(2)}</td></tr>`
    )
    .join('\n');
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${invoice.number}</title></head>
<body style="font-family:Georgia,serif;max-width:720px;margin:40px auto;color:#0C1219">
  <h1>Invoice ${invoice.number}</h1>
  <p>
    From: ${legalEntity}<br/>
    To: ${invoice.brandName}<br/>
    Period: ${invoice.periodStart} – ${invoice.periodEnd}
  </p>
  <table width="100%" cellpadding="6" style="border-collapse:collapse">
    <thead><tr><th align="left">Description</th><th align="right">Amount (GBP)</th></tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr><td align="right"><strong>Total</strong></td>
    <td align="right"><strong>£${invoice.subtotalGbp.toFixed(2)}</strong></td></tr></tfoot>
  </table>
  ${invoice.notes.map((n) => `<p style="font-size:12px">Note: ${n}</p>`).join('\n')}
</body></html>`;
}
