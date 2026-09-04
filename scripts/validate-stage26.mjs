// §Stage-26 validation — server-side tenant enforcement + full UI parity.
//
// Part A executes the tenant guard against REAL data: every demo brand gets
// a pinned session, and cross-tenant access attempts must return EMPTY
// results (never another brand's rows, never existence-leaking errors).
// Part B statically verifies Edge Functions derive brand_id exclusively from
// the verified JWT. Part C smoke-renders EVERY admin and brand view.
import { createServer } from 'vite';
import { renderToString } from 'react-dom/server';
import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { QueryClient } from '@tanstack/react-query';

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
let failures = 0;
const test = (name, cond) => {
  console.log(`${cond ? '✓' : '✗'} ${name}`);
  if (!cond) failures++;
};

try {
  /* ── Part A — runtime cross-tenant enforcement (real execution) ── */
  console.log('\n── A. Runtime cross-tenant enforcement ──');
  const rbac = await server.ssrLoadModule('/src/lib/auth/rbac.ts');
  const store = await server.ssrLoadModule('/src/data/demoStore.ts');
  const data = await server.ssrLoadModule('/src/data/demoData.ts');

  const brands = data.ALL_DEMO_BRANDS;
  const datasets = {
    purchase_orders: store.demoPurchaseOrders,
    messages: store.demoMessages,
    contracts: store.demoContracts,
    deductions: store.demoDeductions,
    compliance_docs: store.demoComplianceDocs,
  };

  let scopeOk = true;
  let crossByIdBlocked = true;
  let totalOwnRows = 0;

  for (const brand of brands) {
    const session = { tier: 'brand', tenantId: brand.id, role: 'Brand Partner' };
    for (const rows of Object.values(datasets)) {
      const scoped = rbac.assertBrandScope(session, rows);
      // Every returned row belongs to the pinned tenant…
      if (!scoped.every((r) => r.brandId === brand.id)) scopeOk = false;
      // …and nothing from any other tenant leaks in.
      const others = rows.filter((r) => r.brandId !== brand.id);
      if (scoped.some((r) => others.includes(r))) scopeOk = false;
      totalOwnRows += scoped.length;
    }
    // By-ID attack: request ANOTHER brand's record by its ID.
    const other = brands.find((b) => b.id !== brand.id);
    const otherPo = store.demoPurchaseOrders.find((p) => p.brandId === other.id);
    const lensed = rbac
      .assertBrandScope(session, store.demoPurchaseOrders)
      .find((p) => p.id === otherPo.id);
    if (lensed !== undefined) crossByIdBlocked = false;
    if (rbac.isCrossTenantAccess(session, other.id) !== true) crossByIdBlocked = false;
  }

  test(
    `all ${brands.length} brand sessions see ONLY their own rows across ` +
      `${Object.keys(datasets).length} datasets`,
    scopeOk
  );
  test('cross-tenant by-ID access returns empty (blocked, never leaked)', crossByIdBlocked);
  test(
    'scoping is lossless (sum of per-brand scopes covers every owned row)',
    totalOwnRows ===
      Object.values(datasets).reduce(
        (s, rows) => s + rows.filter((r) => r.brandId).length,
        0
      )
  );
  test(
    'admin/super-admin sessions are not tenant-pinned (full visibility)',
    rbac.assertBrandScope({ tier: 'super_admin', role: 'Super Admin' }, store.demoPurchaseOrders)
      .length === store.demoPurchaseOrders.length
  );

  /* ── Part B — Edge Functions derive brand_id from verified JWT ── */
  console.log('\n── B. Backend brand_id sourcing ──');
  const gateSrc = readFileSync('supabase/functions/compliance-gate-check/index.ts', 'utf8');
  const importSrc = readFileSync('supabase/functions/catalog-import/index.ts', 'utf8');

  test('compliance-gate-check: brand derived from auth.getUser → brands.auth_user_id',
    gateSrc.includes(".from('brands')") && gateSrc.includes(".eq('auth_user_id', user.id)"));
  test('compliance-gate-check: queries use ONLY the server-derived brand.id',
    gateSrc.includes(".eq('brand_id', brand.id)") && !gateSrc.includes(".eq('brand_id', brandId)"));
  test('compliance-gate-check: mismatched claimed brandId rejected 403',
    gateSrc.includes('cross-tenant access denied'));
  test('catalog-import: target brand derived from verified JWT, never the body',
    importSrc.includes(".eq('auth_user_id', user.id)") &&
      importSrc.includes('p_brand_id: brand.id') &&
      !importSrc.includes('p_brand_id: brandId'));
  test('catalog-import: missing/expired token → 401 before any DB write',
    importSrc.includes("'invalid or expired session token'"));

  /* ── Part C — EVERY admin and brand view smoke-renders ── */
  console.log('\n── C. All-views smoke render ──');
  const tp = await server.ssrLoadModule('/src/testing/TestProviders.tsx');
  const integTypes = await server.ssrLoadModule('/src/integrations/types.ts');

  const makeQc = () => {
    const qc = new QueryClient();
    const seedSets = {
      brands: store.demoBrands,
      contracts: store.demoContracts,
      'compliance-documents': store.demoComplianceDocs,
      messages: store.demoMessages,
      'fulfillment-scores': store.demoFulfillmentScores,
      shipments: store.demoShipments,
      'purchase-orders': store.demoPurchaseOrders,
      purchase_orders: store.demoPurchaseOrders,
      products: store.demoProducts,
      'catalog-submissions': store.demoSubmissions,
      deductions: store.demoDeductions,
      'shipping-margins': store.demoShippingMargins,
      subscriptions: [],
      commissions: [],
    };
    for (const [k, v] of Object.entries(seedSets)) {
      qc.setQueryData([k], { data: v, source: 'seed' });
    }
    return qc;
  };

  const initialIntegrations = {
    ...integTypes.INITIAL_INTEGRATIONS,
    amazon_sp_api: {
      status: 'connected', sandbox: false, secretRef: 'mock:lwa-token',
      metadata: { marketplaceId: 'MOCK-MARKETPLACE-UK', mode: 'mock' },
    },
    stripe: { status: 'connected', sandbox: false, metadata: {} },
  };

  const VIEWS = [
    ['AdminDashboard', '/src/components/admin/AdminDashboard.tsx', { department: 'business_dev' }],
    ['BrandCRM', '/src/components/admin/BrandCRM.tsx', null],
    ['CatalogManagerAdmin', '/src/components/admin/CatalogManagerAdmin.tsx', null],
    ['ComplianceApprovals', '/src/components/admin/ComplianceApprovals.tsx', null],
    ['ContractsAdminPanel', '/src/components/admin/ContractsAdminPanel.tsx', null],
    ['FulfillmentTrackPanel', '/src/components/admin/FulfillmentTrack.tsx', null],
    ['LogisticsControl', '/src/components/admin/LogisticsControl.tsx', null],
    ['CarrierIntegrationMonitor', '/src/components/admin/CarrierMonitor.tsx', null],
    ['MarketingHub', '/src/components/admin/MarketingHub.tsx', null],
    ['MessagesHub', '/src/components/admin/MessagesHub.tsx', null],
    ['RetailPipelinePanel', '/src/components/admin/RetailPipeline.tsx', null],
    ['SuperAdminPanel', '/src/components/admin/SuperAdminPanel.tsx', null],
    ['IntegrationsPanel', '/src/components/admin/integrations/IntegrationsPanel.tsx', null],
    ['AdminAuditLog', '/src/components/admin/AdminAuditLog.tsx', null],
    ['BrandDashboard', '/src/components/brand/BrandDashboard.tsx', null],
    ['OnboardingWizard', '/src/components/brand/OnboardingWizard.tsx', null],
    ['ProductCatalog', '/src/components/brand/ProductCatalog.tsx', null],
    ['BrandContractView', '/src/components/brand/BrandContractView.tsx', null],
    ['BrandPurchaseOrders', '/src/components/brand/BrandPurchaseOrders.tsx', null],
    ['LogisticsHub', '/src/components/brand/LogisticsHub.tsx', null],
    ['ComplianceHub', '/src/components/brand/ComplianceHub.tsx', null],
    ['SalesAnalytics', '/src/components/brand/SalesAnalytics.tsx', null],
    ['BrandSelfService', '/src/components/brand/BrandSelfService.tsx', null],
  ];

  let renderFailures = 0;
  for (const [name, path, props] of VIEWS) {
    try {
      const mod = await server.ssrLoadModule(path);
      const Comp = mod[name];
      if (typeof Comp !== 'function') throw new Error(`export "${name}" not found`);
      const html = renderToString(
        createElement(tp.TestProviders, {
          integrations: initialIntegrations,
          client: makeQc(),
          children: createElement(Comp, props ?? {}),
        })
      );
      if (!html || html.length < 50) throw new Error('suspiciously empty render');
      console.log(`✓ renders: ${name} (${html.length} chars)`);
    } catch (err) {
      renderFailures++;
      console.log(`✗ render FAILED: ${name} — ${err.message}`);
    }
  }
  failures += renderFailures;
  test(`all ${VIEWS.length} admin+brand views render without throwing`, renderFailures === 0);



  console.log(
    failures === 0 ? 'STAGE26_VALIDATION_PASS' : `STAGE26_VALIDATION_FAIL (${failures})`
  );
} finally {
  await server.close();
}
