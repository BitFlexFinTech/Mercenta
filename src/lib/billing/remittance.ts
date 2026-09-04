import { BRAND_LEGAL_NAME } from '@/config/brand';

/**
 * §Stage-19.5 — Remittance statement.
 * The per-payout-period document a brand's bookkeeper actually needs:
 * gross PO value, commission deducted, chargebacks/deductions applied,
 * net amount paid, date. Distinct from the raw commission ledger.
 */
export interface RemittanceInput {
  brandName: string;
  periodStart: string; // ISO date
  periodEnd: string; // ISO date
  statementNumber: string; // e.g. "RS-2026-08-zambezi"
  lines: {
    poNumber: string;
    grossValue: number;
    commission: number;
    deductions: { type: string; amountGbp: number }[];
  }[];
}

export interface RemittanceStatement {
  statementNumber: string;
  brandName: string;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  lines: RemittanceInput['lines'];
  grossTotal: number;
  commissionTotal: number;
  deductionsTotal: number;
  netPaid: number;
  html: string;
}

export function generateRemittanceStatement(input: RemittanceInput): RemittanceStatement {
  const grossTotal = input.lines.reduce((a, l) => a + l.grossValue, 0);
  const commissionTotal = input.lines.reduce((a, l) => a + l.commission, 0);
  const deductionsTotal = input.lines.reduce(
    (a, l) => a + l.deductions.reduce((x, d) => x + d.amountGbp, 0),
    0
  );
  const netPaid = Math.round((grossTotal - commissionTotal - deductionsTotal) * 100) / 100;

  const money = (n: number) => `£${n.toFixed(2)}`;
  const rows = input.lines
    .map(
      (l) => `
      <tr>
        <td>${l.poNumber}</td>
        <td style="text-align:right">${money(l.grossValue)}</td>
        <td style="text-align:right">−${money(l.commission)}</td>
        <td style="text-align:right">${l.deductions.length ? '−' + money(l.deductions.reduce((x, d) => x + d.amountGbp, 0)) : '—'}</td>
      </tr>`
    )
    .join('');

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${input.statementNumber}</title>
<style>body{font-family:Helvetica,Arial,sans-serif;color:#111;padding:32px;font-size:13px}
h1{font-size:18px;margin:0 0 4px}table{width:100%;border-collapse:collapse;margin-top:16px}
th,td{border-bottom:1px solid #ddd;padding:6px 8px;text-align:left}th{text-align:left;font-size:11px;text-transform:uppercase;color:#666}
.totals td{font-weight:bold;border:none}.muted{color:#777;font-size:11px}</style></head><body>
<h1>${BRAND_LEGAL_NAME} — Remittance Statement</h1>
<p class="muted">Statement ${input.statementNumber} · ${input.brandName}<br/>
Period ${input.periodStart} to ${input.periodEnd}</p>
<table><thead><tr><th>Purchase Order</th><th style="text-align:right">Gross</th>
<th style="text-align:right">Commission</th><th style="text-align:right">Deductions</th></tr></thead>
<tbody>${rows}</tbody></table>
<table><tbody class="totals">
<tr><td>Gross PO value</td><td style="text-align:right">${money(grossTotal)}</td></tr>
<tr><td>Commission deducted</td><td style="text-align:right">−${money(commissionTotal)}</td></tr>
<tr><td>Deductions / chargebacks applied</td><td style="text-align:right">−${money(deductionsTotal)}</td></tr>
<tr><td>NET PAID</td><td style="text-align:right">${money(netPaid)}</td></tr>
</tbody></table>
<p class="muted">Generated ${new Date().toISOString().slice(0, 10)} by ${BRAND_LEGAL_NAME}. Rates are placeholders pending commercial sign-off.</p>
</body></html>`;

  return {
    statementNumber: input.statementNumber,
    brandName: input.brandName,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    generatedAt: new Date().toISOString(),
    lines: input.lines,
    grossTotal,
    commissionTotal,
    deductionsTotal,
    netPaid,
    html,
  };
}
