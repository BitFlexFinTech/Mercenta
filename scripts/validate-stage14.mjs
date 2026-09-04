// §14 — re-confirms the compliance correctness fixes with OUTPUT-level proof:
//   1. brands are never asked for their own UK EORI/UK VAT; Mercenta's own
//      (clearly-labelled placeholders) pre-fill every customs field
//   2. EU Market exists only as a disabled Super-Admin feature flag
//   3. Payment Terms clause genuinely differs by fulfillment track in real
//      generated contract output — not just in code
import { readFileSync } from 'node:fs';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
let failures = 0;
const test = (name, ok) => {
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) failures++;
};
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

try {
  const cfg = await server.ssrLoadModule('/src/config/customs.ts');
  const agreement = await server.ssrLoadModule('/src/lib/agreement.ts');
  const docs = await server.ssrLoadModule('/src/lib/customsDocs.ts');

  // ── 1. EORI/VAT posture ──
  test('BoxBee/Mercenta EORI is an unmistakable placeholder',
    cfg.MERCENTA_EORI === 'GB-EORI-PENDING-REGISTRATION');
  test('Mercenta VAT is an unmistakable placeholder',
    cfg.MERCENTA_VAT === 'GB-VAT-PENDING-REGISTRATION');

  // Generated customs docs embed Mercenta's values, never the brand's.
  const po = {
    id: 'po-x', brandId: 'brand-zambezi', poNumber: 'PO-9999', status: 'accepted',
    poValue: 5000, commissionRate: 12, commissionAmount: 600, orderDate: '2026-08-01',
    lineItems: [{ sku: 'S1', productName: 'P', quantity: 10, unitPrice: 100, commodityCode: '3924909990' }],
  };
  const bundle = docs.generateCustomsDocBundle({ po, brandName: 'Zambezi Organic Extracts Ltd', products: [] });
  const allText = bundle.map((b) => JSON.stringify(b)).join('\n');
  test('every customs doc embeds Mercenta EORI placeholder', allText.includes('GB-EORI-PENDING-REGISTRATION'));
  test('every customs doc embeds Mercenta VAT placeholder', allText.includes('GB-VAT-PENDING-REGISTRATION'));
  test('docs name Mercenta Partners Ltd as Importer of Record', allText.includes('Mercenta Partners Ltd'));

  // No brand-facing component asks for UK EORI / UK VAT registration inputs.
  for (const f of [
    'src/components/brand/OnboardingWizard.tsx',
    'src/components/brand/ProductCatalog.tsx',
    'src/components/brand/LogisticsHub.tsx',
    'src/components/brand/ComplianceHub.tsx',
  ]) {
    const src = read(f);
    test(`${f.split('/').pop()}: no UK EORI/VAT input ask`,
      !/label[^>]*>?\s*["'`]?(UK\s+)?(EORI|VAT)\s*(number|registration)?["'`]?\s*(input|<)/i.test(src) &&
      !/placeholder=.(UK\s+)?(GB\s*)?(EORI|VAT)/i.test(src));
  }
  // Onboarding agreement states Mercenta holds the UK EORI.
  test('onboarding agreement assigns UK EORI to Mercenta, not the brand',
    /hold valid UK EORI numbers/.test(read('src/components/brand/OnboardingWizard.tsx')));

  // ── 2. EU Market flag posture ──
  const appSrc = read('src/App.tsx');
  const sidebarSrc = read('src/components/layout/Sidebar.tsx');
  const adminSrc = read('src/components/admin/SuperAdminPanel.tsx');
  const customsCfg = read('src/config/customs.ts');
  test('EU_MARKET_ENABLED is false', /EU_MARKET_ENABLED\s*=\s*false/.test(customsCfg));
  test('no EU Market item in app nav or sidebar', !/EU Market/i.test(appSrc + sidebarSrc));
  test('disabled EU module card lives under Super Admin only',
    adminSrc.includes('EU Market Module') && adminSrc.includes('Disabled'));

  // ── 3. Payment Terms clause varies by track in REAL output ──
  const base = {
    businessName: 'Test Brand Ltd',
    commissionRate: 12,
    monthlyFee: 250,
    category: 'Home',
  };
  const directOut = agreement.buildDistributionAgreement({ ...base, fulfillmentTrack: 'direct_fulfillment' });
  const financedOut = agreement.buildDistributionAgreement({ ...base, fulfillmentTrack: 'financed' });
  test('generated contracts differ between tracks', directOut !== financedOut);
  test('direct output contains DIRECT FULFILLMENT payment clause',
    directOut.includes('PAYMENT TERMS (DIRECT FULFILLMENT)'));
  test('financed output contains FINANCED payment clause',
    financedOut.includes('PAYMENT TERMS (FINANCED)'));
  test('neither output leaks the other variant',
    !directOut.includes('(FINANCED)') && !financedOut.includes('(DIRECT FULFILLMENT)'));
  test('both outputs wording-safe (no retail-channel naming)',
    !/amazon|vendor central|\b1P\b/i.test(directOut + financedOut));
  test('legal entity pulled from BRAND_LEGAL_NAME config in both',
    directOut.includes('Mercenta Partners Ltd') && financedOut.includes('Mercenta Partners Ltd'));

  console.log(failures === 0 ? 'STAGE14_VALIDATION_PASS' : `STAGE14_VALIDATION_FAIL (${failures})`);
} finally {
  await server.close();
}
if (failures > 0) process.exit(1);
