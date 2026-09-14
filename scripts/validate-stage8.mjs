// Stage 8 validation: §11 billing engine — invoice generator math, Stripe
// client gating (mock transport), and locked/unlocked Billing panel renders.
import { createServer } from 'vite';
import { renderToString } from 'react-dom/server';
import { createElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });

let failures = 0;
function test(name, cond) {
  console.log(`${cond ? '✓' : '✗'} ${name}`);
  if (!cond) failures++;
}

try {
  const inv = await server.ssrLoadModule('/src/lib/billing/invoice.ts');
  const stripeMod = await server.ssrLoadModule('/src/lib/billing/stripe.ts');
  const brandMod = await server.ssrLoadModule('/src/config/brand.ts');
  const apiMod = await server.ssrLoadModule('/src/data/api.ts');
  const ctxMod = await server.ssrLoadModule('/src/integrations/IntegrationsContext.tsx');
  const panelMod = await server.ssrLoadModule('/src/components/admin/BillingPanel.tsx');

  // ── Invoice generator ──
  const brand = (await apiMod.fetchBrands()).data[0]; // canonical demoStore universe
  const invoice = inv.generateInvoice({
    brand,
    periodStart: '2026-08-01',
    periodEnd: '2026-08-31',
    sequence: 1,
    subscription: { planTier: 'growth', monthlyFee: 499 },
    commissions: [
      { purchaseOrderId: 'PO-8841', poValue: 12400, commissionAmount: 1488 },
      { purchaseOrderId: 'PO-8843', poValue: 5000, commissionAmount: 600 },
    ],
  });
  test('invoice number format', /^INV-202608-[A-Z0-9]+-001$/.test(invoice.number));
  test('platform fee line present at £499',
    invoice.lines[0].description.includes('growth tier') && invoice.lines[0].amountGbp === 499);
  test('both commission lines itemized', invoice.lines.length === 3);
  test('subtotal sums fee + commissions', invoice.subtotalGbp === 499 + 1488 + 600);
  test('brand name merged', invoice.brandName === brand.profile.businessName);

  // No active sub → no fee line, explanatory note instead.
  const noSub = inv.generateInvoice({
    brand, periodStart: '2026-08-01', periodEnd: '2026-08-31',
    sequence: 2,
    commissions: [{ purchaseOrderId: 'PO-X', poValue: 1000, commissionAmount: 120 }],
  });
  test('no-subscription invoice skips fee line + adds note',
    noSub.lines.length === 1 && noSub.notes.length === 1 && noSub.subtotalGbp === 120);

  // Defensive held-commission exclusion.
  const withHeld = inv.generateInvoice({
    brand, periodStart: '2026-08-01', periodEnd: '2026-08-31',
    sequence: 3, excludeHeld: true,
    commissions: [
      { purchaseOrderId: 'PO-SMALL', poValue: 9000, commissionAmount: 1080 },
      { purchaseOrderId: 'PO-HELD', poValue: 15000, commissionAmount: 1800 },
    ],
  });
  test('held high-value commission excluded defensively',
    withHeld.lines.length === 1 && withHeld.lines[0].amountGbp === 1080);

  const html = inv.renderInvoiceHtml(invoice, brandMod.BRAND_LEGAL_NAME);
  test('invoice HTML renders entity/number/total',
    html.includes(brandMod.BRAND_LEGAL_NAME) && html.includes(invoice.number) &&
      html.includes('£' + invoice.subtotalGbp.toFixed(2)));

  // ── Stripe client gating (mock transport must never be called when locked) ──
  let calls = 0;
  const countingTransport = async () => { calls++; return { ok: true, status: 200, json: async () => ({}) }; };

  const locked = stripeMod.createStripeClient(() => null, '/fn', countingTransport);
  let errLocked = '';
  try { await locked.startSubscription('b1', 'starter', 'a@b.c'); }
  catch (e) { errLocked = e.message; }
  test('disconnected → throws connect-required error', /not connected/i.test(errLocked) && calls === 0);

  const sandbox = stripeMod.createStripeClient(
    () => ({ secretRef: 'vault:sandbox', verified: false }), '/fn', countingTransport
  );
  let errSandbox = '';
  try { await sandbox.startSubscription('b1', 'starter', 'a@b.c'); }
  catch (e) { errSandbox = e.message; }
  test('sandbox-only connection refuses to bill', /sandbox/i.test(errSandbox) && calls === 0);

  const live = stripeMod.createStripeClient(
    () => ({ secretRef: 'vault:live', verified: true }), '/fn', countingTransport
  );
  const subResult = await live.startSubscription('b1', 'growth', 'a@b.c');
  test('verified connection bills through transport', subResult.ok === true && calls >= 1);

  // ── Panel renders ──
  const qc = new QueryClient();
  // Brands/subscriptions/commissions must come from ONE data universe
  // (demoStore via api fallbacks) so per-brand joins resolve, as on real tables.
  const brands = (await apiMod.fetchBrands()).data;
  qc.setQueryData(['brands'], { data: brands, source: 'seed' });
  qc.setQueryData(['subscriptions'], {
    data: (await apiMod.fetchSubscriptions()).data,
    source: 'seed',
  });
  const seededCommissions = (await apiMod.fetchCommissions()).data;
  qc.setQueryData(['commissions'], { data: seededCommissions, source: 'seed' });

  const htmlLockedPanel = renderToString(
    createElement(ctxMod.IntegrationsProvider, null,
      createElement(QueryClientProvider, { client: qc },
        createElement(panelMod.BillingPanel)))
  );
  test('billing shows MOCK-mode notice when stripe disconnected (mock-first)',
    htmlLockedPanel.includes('(Mock) mode') && htmlLockedPanel.includes('mock:sub-'));

  const htmlUnlocked = renderToString(
    createElement(ctxMod.IntegrationsProvider, {
      initialState: {
        stripe: { status: 'connected', sandbox: false, lastVerifiedAt: new Date().toISOString() },
      },
    }, createElement(QueryClientProvider, { client: qc },
      createElement(panelMod.BillingPanel)))
  );
  test('unlocked view shows subscriptions table', htmlUnlocked.includes('Brand Subscriptions'));
  // §Phase M10 — REPOINTED to the Phase-D billing surface. The old section
  // headings ('Commission & Platform Invoices', 'Platform fee', 'Commission on
  // purchase order') are no longer rendered text: invoices now render as
  // per-brand cards that carry the canonical `generateInvoice` number and
  // amount, alongside the canonical shipping-margin and deduction totals. The
  // invoice MATHS itself is still asserted directly above via the same
  // generator, so this block asserts the generator's output reaches the DOM.
  test('unlocked view renders a canonical generated invoice per brand',
    /INV-202608-[A-Z0-9]+-\d{3}/.test(htmlUnlocked) && htmlUnlocked.includes('£'));
  test('invoice cards show their line totals (invoice / shipping / deductions)',
    htmlUnlocked.includes('>Invoice<') &&
      htmlUnlocked.includes('>Shipping<') &&
      htmlUnlocked.includes('>Deductions<'));
  test('remittance statements render (gross − commission − deductions = net)',
    htmlUnlocked.includes('Remittance Statements'));

  console.log(failures === 0 ? 'STAGE8_VALIDATION_PASS' : `STAGE8_VALIDATION_FAIL (${failures} failures)`);
} finally {
  await server.close();
}
process.exitCode = failures === 0 ? 0 : 1;
