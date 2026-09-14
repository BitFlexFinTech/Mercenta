// §Canonical model §3/§5/§9/§25 — THE TWO COMMERCIAL MODELS validator.
//
// Proves, with the ACTUAL investor-demo numbers:
//   • Model A (commission/agent) — £10,000 PO @ 20% → £2,000 / £8,000;
//   • Model B (buy/resell) — £10,000 revenue − £7,500 acquisition = £2,500
//     gross spread, with every additional cost STATED SEPARATELY;
//   • the shipping illustration — £100 list → 40% negotiated → £60 cost →
//     £90 brand charge → £30 margin, DERIVED from the canonical terms;
//   • the VAT layer — standard/zero/exempt/unconfigured all behave correctly,
//     and the production treatment is NOT invented;
//   • §3 SEPARATION — the commercial model cannot change retail-channel
//     compliance, and an unrecorded model fails closed.
import { createServer } from 'vite';
import { readFileSync } from 'node:fs';

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
let failures = 0;
let checks = 0;
const test = (name, ok, detail = '') => {
  checks++;
  console.log(`${ok ? '✓' : '✗'} ${name}${!ok && detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

try {
  const cfg = await server.ssrLoadModule('/src/config/commercialModel.ts');
  const vat = await server.ssrLoadModule('/src/config/vat.ts');
  const fin = await server.ssrLoadModule('/src/lib/finance/commercialModel.ts');

  /* ── §3 the two models exist and are separable ────────────────────────── */

  test('exactly two commercial models are defined',
    cfg.COMMERCIAL_MODEL_ORDER.length === 2 &&
      cfg.COMMERCIAL_MODEL_ORDER.includes('commission_agent') &&
      cfg.COMMERCIAL_MODEL_ORDER.includes('buy_resell'));
  test('both models declare the internal Mercenta→brand commercial order (§5)',
    cfg.COMMERCIAL_MODELS.commission_agent.issuesMercentaBrandOrder === true &&
      cfg.COMMERCIAL_MODELS.buy_resell.issuesMercentaBrandOrder === true);
  test('§3 the commercial model CANNOT change retail-channel compliance',
    cfg.RETAIL_CHANNEL_COMPLIANCE_IS_MODEL_INDEPENDENT === true &&
      !read('src/lib/compliance.ts').includes('commercial_model') &&
      !read('src/lib/compliance.ts').includes('buy_resell'));
  test('each model declares its OWN internal documents (not compliance docs)',
    cfg.COMMERCIAL_MODELS.commission_agent.internalDocuments.length >= 2 &&
      cfg.COMMERCIAL_MODELS.buy_resell.internalDocuments.length >= 3);
  test('an unrecorded model FAILS CLOSED (never silently assumed)',
    cfg.resolveCommercialModel(null).model === 'not_selected' &&
      cfg.resolveCommercialModel(undefined).selected === false &&
      cfg.resolveCommercialModel('').model === 'not_selected');
  test('a recorded model resolves as selected',
    cfg.resolveCommercialModel('buy_resell').selected === true &&
      cfg.resolveCommercialModel('buy_resell').model === 'buy_resell');

  /* ── §25 Model A — Brand A: commission ────────────────────────────────── */

  const a = fin.DEMO_MODEL_A_BRAND_A;
  test('Model A: £10,000 retail-channel PO', a.retailChannelRevenueGbp === 10000);
  test('Model A: 20% agreed commission', a.commissionRatePct === 20);
  test('Model A: £2,000 Mercenta commission', a.mercentaCommissionGbp === 2000, `${a.mercentaCommissionGbp}`);
  test('Model A: £8,000 brand economic amount', a.brandAmountGbp === 8000, `${a.brandAmountGbp}`);
  test('Model A: the parts reconcile to the whole',
    a.brandAmountGbp + a.mercentaCommissionGbp === a.retailChannelRevenueGbp);
  test('Model A: the calculation is stated, not just the result',
    typeof a.formula === 'string' && a.formula.includes('20%'));

  /* ── §25 Model B — Brand B: buy/resell ────────────────────────────────── */

  const b = fin.DEMO_MODEL_B_BRAND_B;
  test('Model B: £10,000 retail-channel revenue', b.retailChannelRevenueGbp === 10000);
  test('Model B: £7,500 brand acquisition cost', b.brandAcquisitionCostGbp === 7500);
  test('Model B: £2,500 gross commercial spread', b.grossCommercialSpreadGbp === 2500, `${b.grossCommercialSpreadGbp}`);
  test('Model B: additional costs are shown SEPARATELY, never hidden',
    b.costs.carrierCostGbp === 60 && b.costs.paymentFeesGbp === 120 &&
      b.costs.otherAgreedFeesGbp === 50 && typeof b.costs.deductionsGbp === 'number');
  test('Model B: total additional costs = the sum of the stated parts',
    b.totalAdditionalCostsGbp === 230, `${b.totalAdditionalCostsGbp}`);
  test('Model B: net Mercenta margin = gross spread − stated costs',
    b.netMercentaMarginGbp === 2270, `${b.netMercentaMarginGbp}`);
  test('Model B: the spread is NOT presented as the margin',
    b.grossCommercialSpreadGbp !== b.netMercentaMarginGbp);

  /* ── §12/§25 shipping illustration, derived from the canonical terms ──── */

  const ship = fin.demoShippingCommercialExample();
  test('shipping: £100 carrier list rate', ship.carrierListCost === 100, `${ship.carrierListCost}`);
  test('shipping: 40% negotiated discount = £40 off', ship.negotiatedDiscountAmount === 40, `${ship.negotiatedDiscountAmount}`);
  test('shipping: £60 Mercenta carrier cost', ship.carrierInvoiceCost === 60, `${ship.carrierInvoiceCost}`);
  test('shipping: £90 brand charge', ship.brandAmountCharged === 90, `${ship.brandAmountCharged}`);
  test('shipping: £30 gross shipping margin', ship.grossShippingMargin === 30, `${ship.grossShippingMargin}`);
  test('shipping: carrier cost and brand charge are BOTH retained (not overwritten)',
    ship.carrierInvoiceCost !== ship.brandAmountCharged);
  test('shipping: no universal 90% rule is hardcoded',
    !read('src/config/shipping.ts').includes('0.9') &&
      !read('src/lib/shipping/shippingCalculator.ts').includes('0.9'));

  /* ── §9 VAT layer ─────────────────────────────────────────────────────── */

  test('VAT: the standard UK rate is declared once (20%)',
    vat.UK_STANDARD_VAT_RATE_PCT === 20);
  const std = vat.computeIllustrativeVatGbp(2000);
  test('VAT: standard example — net 2000 + VAT 400 = gross 2400',
    std.netGbp === 2000 && std.vatGbp === 400 && std.grossGbp === 2400);
  test('VAT: net / VAT / gross are returned TOGETHER',
    std.netGbp + std.vatGbp === std.grossGbp);
  const zero = vat.computeVat({ netGbp: 1000, treatment: 'zero_rated' });
  const exempt = vat.computeVat({ netGbp: 1000, treatment: 'exempt' });
  test('VAT: zero-rated and exempt charge no VAT but ARE configured',
    zero.vatGbp === 0 && zero.configured === true &&
      exempt.vatGbp === 0 && exempt.configured === true);
  const unconfigured = vat.computeVat({ netGbp: 1000, treatment: 'configuration_required' });
  test('VAT: an unconfigured treatment computes NO tax figure and says so',
    unconfigured.vatGbp === 0 && unconfigured.configured === false &&
      /no tax amount is computed/i.test(unconfigured.basis));
  test('VAT: an unclassified item resolves fail-closed (never assumed standard)',
    vat.resolveVatTreatmentForItem(undefined) === 'configuration_required' &&
      vat.resolveVatTreatmentForItem('unknown-supply') === 'configuration_required');
  test('VAT: the demo illustration is labelled illustrative, with a disclaimer',
    vat.DEMO_VAT_ILLUSTRATION.label.toLowerCase().includes('illustrative') &&
      vat.DEMO_VAT_ILLUSTRATION.disclaimer.toLowerCase().includes('not configured'));
  test('VAT: the PRODUCTION treatment is still not invented',
    read('src/config/commercial.ts').includes('VAT_TREATMENT_CONFIGURED = false') &&
      read('src/config/commercial.ts').includes("'configuration_required'"));
  test('VAT: the rate is not hardcoded outside the canonical layer',
    !read('src/lib/finance/commercialModel.ts').includes('0.2') &&
      read('src/lib/finance/commercialModel.ts').includes('@/config/vat'));

  /* ── §25 both models are represented in the demo ──────────────────────── */

  test('the demo assigns Model A to Brand A and Model B to Brand B',
    fin.DEMO_BRAND_COMMERCIAL_MODELS.brandA === 'commission_agent' &&
      fin.DEMO_BRAND_COMMERCIAL_MODELS.brandB === 'buy_resell');

  console.log(
    failures === 0
      ? `COMMERCIAL_MODELS_VALIDATION_PASS (${checks} checks)`
      : `COMMERCIAL_MODELS_VALIDATION_FAIL (${failures}/${checks})`
  );
} finally {
  await server.close();
}
if (failures > 0) process.exit(1);
