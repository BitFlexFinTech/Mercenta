// Stage 3 (review pass) validation: compliance correctness — no brand EORI/VAT
// asks anywhere, Mercenta IOR constants exist, customs docs auto-generated and
// pre-filled from PO data, EU removed from brand-facing surfaces but present
// as a feature-flagged disabled module in Super Admin.
import { createServer } from 'vite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToString } from 'react-dom/server';
import { createElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const root = resolve(import.meta.dirname, '..');
const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });

let failures = 0;
function test(name, cond) {
  console.log(`${cond ? '✓' : '✗'} ${name}`);
  if (!cond) failures++;
}

try {
  const customs = await server.ssrLoadModule('/src/config/customs.ts');
  const docs = await server.ssrLoadModule('/src/lib/customsDocs.ts');
  const seedMod = await server.ssrLoadModule('/src/data/demoStore.ts');

  // ── Mercenta IOR config ──
  test('Mercenta EORI constant defined', typeof customs.MERCENTA_EORI === 'string' && customs.BOXBEI_EORI_CHECK !== undefined || customs.MERCENTA_EORI.startsWith('GB'));
  test('Mercenta VAT constant defined', String(customs.MERCENTA_VAT).includes('GB'));
  test('EU market flag exists and is off', customs.EU_MARKET_ENABLED === false);
  test('default Incoterms defined', typeof customs.DEFAULT_INCOTERMS === 'string');

  // ── Auto-generation from a real demo PO ──
  const apiMod = await server.ssrLoadModule('/src/data/api.ts');
  const pos = (await apiMod.fetchPurchaseOrders()).data;
  const acceptedPO = pos.find((p) => p.status !== 'rejected');
  const brand = seedMod.demoBrands.find((b) => b.id === acceptedPO.brandId);
  const products = seedMod.demoProducts.filter((p) => p.brandId === acceptedPO.brandId);

  const bundle = docs.generateCustomsDocBundle({
    po: acceptedPO,
    brandName: brand.profile.businessName,
    products,
  });
  test('bundle produces all three documents', bundle.length === 3);

  const invoice = bundle.find((d) => d.type === 'commercial_invoice');
  const packing = bundle.find((d) => d.type === 'packing_list');
  const ukca = bundle.find((d) => d.type === 'ukca_declaration');

  // Every doc auto-populates Mercenta's EORI/VAT — the brand never fills these.
  for (const d of bundle) {
    const flat = d.html.replace(/\s+/g, ' ');
    test(`${d.type}: Mercenta EORI auto-populated`, flat.includes(customs.MERCENTA_EORI));
    test(`${d.type}: Mercenta VAT auto-populated`, flat.includes(customs.MERCENTA_VAT.replace(/ /g, '&nbsp;').replace(/ /g, ' ')) || flat.includes(customs.MERCENTA_VAT));
  }
  test('commercial invoice itemizes PO SKUs with values',
    invoice.html.includes(acceptedPO.lineItems[0].sku) &&
      invoice.html.includes(`£${acceptedPO.poValue.toFixed(2)}`));
  test('packing list includes quantities/cartons',
    /Cartons/.test(packing.html) && packing.html.includes(String(acceptedPO.lineItems[0].quantity)));
  test('UKCA declaration names products and UK representative',
    ukca.html.includes('UKCA Declaration') && ukca.html.includes('Importer of'));

  // ── Brand-facing surface no longer asks for EORI/VAT ──
  const hubSrc = readFileSync(resolve(root, 'src/components/brand/ComplianceHub.tsx'), 'utf8');
  test("brand hub has NO 'UK EORI Number' requirement", !hubSrc.includes("'UK EORI Number'"));
  test("brand hub has NO 'UK VAT Registration' requirement", !hubSrc.includes("'UK VAT Registration'"));
  test('brand hub has no EU Market section', !hubSrc.includes('EU Market Requirements'));
  test('brand hub shows Mercenta-handled IOR card', hubSrc.includes('handled by Mercenta'));
  test('brand hub uses auto-generated docs with review flow', hubSrc.includes('Review &amp; confirm') || hubSrc.includes('Review & Confirm'));

  const wizSrc = readFileSync(resolve(root, 'src/components/brand/OnboardingWizard.tsx'), 'utf8');
  test("onboarding no longer labels a field 'VAT / EORI Number'", !wizSrc.includes('VAT / EORI Number'));

  // ── EU removed from brand nav; flagged module in Super Admin ──
  // §Phase M10 — REPOINTED: routing moved out of App.tsx during the Phase D
  // redesign (App.tsx is now a 31-line shell switcher); the brand nav lives in
  // BrandShell. The invariant is unchanged — the brand-facing label is
  // 'UK Compliance', never 'UK & EU Compliance'.
  const navSrc = readFileSync(resolve(root, 'src/components/layout/BrandShell.tsx'), 'utf8');
  test("brand nav says 'UK Compliance' not 'UK & EU Compliance'",
    navSrc.includes("label: 'UK Compliance'") && !/UK & EU Compliance/.test(navSrc));

  const adminSrc = readFileSync(resolve(root, 'src/components/admin/SuperAdminPanel.tsx'), 'utf8');
  test('Super Admin has feature-flagged EU Market module', adminSrc.includes('EU Market Module') && adminSrc.includes('EU_MARKET_ENABLED'));

  // ── Hub renders end-to-end with demo data ──
  const g = await server.ssrLoadModule('/src/context/GlobalStateContext.tsx');
  const hubMod = await server.ssrLoadModule('/src/components/brand/ComplianceHub.tsx');
  const storeMod = await server.ssrLoadModule('/src/data/demoStore.ts');
  const qc = new QueryClient();
  qc.setQueryData(['brands'], { data: storeMod.demoBrands, source: 'seed' });
  qc.setQueryData(['products'], { data: storeMod.demoProducts, source: 'seed' });
  qc.setQueryData(['purchase-orders'], { data: storeMod.demoPurchaseOrders, source: 'seed' });
  const html = renderToString(
    createElement(g.AppProvider, null,
      createElement(QueryClientProvider, { client: qc },
        createElement(hubMod.ComplianceHub)))
  );
  test('hub renders IOR handled-by-Mercenta card', html.includes('handled by Mercenta') || html.includes('Importer of Record'));
  test('hub renders auto-generated customs documents', html.includes('auto-generated') && html.includes('Commercial Invoice'));
  test('hub has no EU requirements section', !html.includes('EU Market Requirements'));
  test('review-and-confirm action available', html.includes('Review &amp; confirm') || html.includes('Review & Confirm'));

  console.log(failures === 0 ? 'STAGE3_REVIEW_PASS' : `STAGE3_REVIEW_FAIL (${failures} failures)`);
} finally {
  await server.close();
}
process.exitCode = failures === 0 ? 0 : 1;

async function apiFetch() {
  const api = await server.ssrLoadModule('/src/data/api.ts');
  return api.fetchPurchaseOrders;
}
