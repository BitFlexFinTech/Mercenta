// §Wave 3 Part 5 — THE STATE-COVERAGE GATE.
//
// WHY THIS EXISTS
// ---------------
// Typecheck, lint and build are blind to the defect this gate protects against:
// a data-backed surface that has no loading state does not merely look
// unfinished — while its query is still resolving it believes its array is
// empty and TELLS THE OPERATOR SO. Measured in a real browser with a slow data
// source (Wave 3 Part 5, 2026-10-08), 13 surfaces did exactly that:
//
//   · brand Purchase Orders painted "No purchase orders for this brand yet.",
//     "Showing 0 of 0" and "Queue value £0" while loading, and then 5 orders and
//     £55,832 when the data arrived;
//   · brand Contracts said "No contracts yet — your distribution agreement is
//     generated when you complete onboarding." to a brand that had four
//     agreements;
//   · Admin Contract Cycle said "No contracts match.", Global Catalog said
//     "No products match the current filters.", Messages said "No threads match
//     the current filters.", Helpdesk said "No messages yet.", Compliance
//     Approvals said "No compliance documents on file."
//
// The rule this gate enforces is one sentence: IF A SURFACE'S RENDER DEPENDS ON
// DATA THAT HAS NOT ARRIVED, THAT RENDER MUST SHOW A LOADING STATE — never an
// empty state and never a zeroed figure.
//
// METHOD — the same server-render harness `validate-stage26.mjs` already uses.
// Every declared view is rendered three times with the REAL component tree:
//   PENDING  an unseeded QueryClient (every query still resolving)
//   EMPTY    every query resolved to `{ data: [] }`
//   SEEDED   the canonical demo seed
// A view whose PENDING render differs from its SEEDED render is a view whose
// presentation depends on the data, so its PENDING render must carry a loading
// cue (`aria-busy`, a pulse skeleton, `role="status"`, or the canonical
// `data-testid="loading-state"`). A view whose pending and seeded renders are
// identical has no data-dependent presentation to protect and is reported as
// NOT DATA-DEPENDENT rather than passed silently.
//
// It also asserts the SINGLE OWNER of that loading region, so the fix cannot
// rot back into a hand-rolled copy per surface.
import { createServer } from 'vite';
import { renderToString } from 'react-dom/server';
import { createElement } from 'react';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { QueryClient } from '@tanstack/react-query';

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
let failures = 0;
const test = (name, cond) => {
  console.log(`${cond ? '✓' : '✗'} ${name}`);
  if (!cond) failures++;
};

/**
 * An ABSENCE GUARD must read CODE, not prose: the project's convention is to
 * RECORD a retired contract in a `§… REPOINTED` comment, so a raw-source search
 * would forbid the very record the rules require. This strips comments only.
 */
const codeOf = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/** User-visible text of a rendered tree (script tags and markup removed). */
const strip = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;|&#39;|&quot;|&amp;|&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * The loading cues a canonical loading state must produce. `data-testid=
 * "loading-state"` is `ui.tsx → LoadingState` (the one owner); `aria-busy` is
 * what `DataTable`/`MetricBand`/the shells set; `animate-pulse` is the
 * canonical `Skeleton`. A bare `role="status"` is deliberately NOT accepted on
 * its own: an announcement without a visible loading indicator is not a loading
 * state.
 */
const LOADING_CUE = /data-testid="loading-state"|aria-busy="true"|animate-pulse/;

/** Files allowed to contain a loading label: the ONE owner and its callers. */
const OWNER = 'src/components/ui.tsx';

try {
  const tp = await server.ssrLoadModule('/src/testing/TestProviders.tsx');
  const theme = await server.ssrLoadModule('/src/context/ThemeContext.tsx');
  const integTypes = await server.ssrLoadModule('/src/integrations/types.ts');
  const store = await server.ssrLoadModule('/src/data/demoStore.ts');

  const SEED_KEYS = [
    'brands', 'contracts', 'compliance-documents', 'messages', 'fulfillment-scores',
    'shipments', 'purchase-orders', 'purchase_orders', 'products', 'catalog-submissions',
    'deductions', 'shipping-margins', 'subscriptions', 'commissions', 'brand-agreements',
    'ad-spend', 'ad-campaigns', 'ad-recommendations',
  ];

  const seededClient = () => {
    const qc = new QueryClient();
    const sets = {
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
    for (const [k, v] of Object.entries(sets)) qc.setQueryData([k], { data: v, source: 'seed' });
    return qc;
  };

  const emptyClient = () => {
    const qc = new QueryClient();
    for (const k of SEED_KEYS) qc.setQueryData([k], { data: [], source: 'seed' });
    qc.setQueryData(['audit-log-paginated', {}, undefined], { data: [], total: 0, page: 1, pageSize: 20 });
    for (const k of ['products-paginated', 'purchase-orders-paginated', 'shipments-paginated', 'messages-paginated']) {
      qc.setQueryData([k, {}, undefined], { data: [], total: 0, page: 1, pageSize: 20 });
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



  /**
   * The declared view surface. Every admin + brand view that renders a
   * query-backed list, table, band or report — the set the Wave 3 Part 5 sweep
   * measured in a real browser.
   */
  const VIEWS = [
    ['AdminDashboard', '/src/components/admin/AdminDashboard.tsx', { department: 'business_dev' }],
    ['BrandCRM', '/src/components/admin/BrandCRM.tsx', null],
    ['CatalogManagerAdmin', '/src/components/admin/CatalogManagerAdmin.tsx', null],
    ['ComplianceApprovals', '/src/components/admin/ComplianceApprovals.tsx', null],
    ['ContractsAdminPanel', '/src/components/admin/ContractsAdminPanel.tsx', null],
    ['FulfillmentTrackPanel', '/src/components/admin/FulfillmentTrack.tsx', null],
    ['LogisticsControl', '/src/components/admin/LogisticsControl.tsx', null],
    ['MessagesHub', '/src/components/admin/MessagesHub.tsx', null],
    ['RetailPipelinePanel', '/src/components/admin/RetailPipeline.tsx', null],
    ['BillingPanel', '/src/components/admin/BillingPanel.tsx', null],
    ['AmazonAdsDashboard', '/src/components/admin/AmazonAdsDashboard.tsx', null],
    ['HelpdeskDashboard', '/src/components/admin/HelpdeskDashboard.tsx', null],
    ['AdminAuditLog', '/src/components/admin/AdminAuditLog.tsx', null],
    ['BrandDashboard', '/src/components/brand/BrandDashboard.tsx', null],
    ['BrandContractView', '/src/components/brand/BrandContractView.tsx', null],
    ['BrandPurchaseOrders', '/src/components/brand/BrandPurchaseOrders.tsx', null],
    ['BrandSelfService', '/src/components/brand/BrandSelfService.tsx', null],
    ['BrandReports', '/src/components/brand/BrandReports.tsx', null],
    ['SalesAnalytics', '/src/components/brand/SalesAnalytics.tsx', null],
    ['ComplianceHub', '/src/components/brand/ComplianceHub.tsx', null],
    ['LogisticsHub', '/src/components/brand/LogisticsHub.tsx', null],
    ['BrandAdvertising', '/src/components/brand/BrandAdvertising.tsx', null],
  ];

  const render = (Comp, props, client) =>
    renderToString(
      createElement(
        theme.ThemeProvider,
        null,
        createElement(tp.TestProviders, {
          integrations: initialIntegrations,
          client,
          children: createElement(Comp, props ?? {}),
        })
      )
    );

  console.log('\n── A. A data-dependent render must show a loading state ──');
  let dataDependent = 0;
  for (const [name, path, props] of VIEWS) {
    let pText = '';
    let sText = '';
    let pCue = false;
    let renderError = null;
    try {
      const mod = await server.ssrLoadModule(path);
      const Comp = mod[name];
      if (typeof Comp !== 'function') throw new Error(`export "${name}" not found`);
      const pHtml = render(Comp, props, new QueryClient());
      render(Comp, props, emptyClient()); // the EMPTY state must render too
      const sHtml = render(Comp, props, seededClient());
      pText = strip(pHtml);
      sText = strip(sHtml);
      pCue = LOADING_CUE.test(pHtml);
    } catch (err) {
      renderError = err;
    }
    if (renderError) {
      test(`${name} renders its pending, empty and seeded states`, false);
      continue;
    }
    if (pText === sText) {
      // No data-dependent presentation in this harness: nothing to protect.
      console.log(`· ${name} — NOT DATA-DEPENDENT in this harness (pending == seeded)`);
      continue;
    }
    dataDependent++;
    const denial = (pText.match(/\bNo [a-z][^.!?]{0,60}/) ?? [])[0];
    test(
      `${name} shows a loading state while its data is still resolving` +
        (pCue ? '' : ` :: PENDING RENDER DIFFERS FROM SEEDED WITHOUT A LOADING CUE${denial ? ` — it says "${denial}"` : ''}`),
      pCue
    );
  }
  test(`the declared surface really is data-dependent (${dataDependent} of ${VIEWS.length} views)`, dataDependent >= 15);


  console.log('\n── B. ONE owner of the loading region ──');
  const uiSrc = readFileSync(OWNER, 'utf8');
  const wsSrc = readFileSync('src/components/shared/workspace.tsx', 'utf8');
  const layerSrc = readFileSync('src/components/shared/DataTable.tsx', 'utf8');

  test('ui.tsx exports the canonical LoadingState owner', /export function LoadingState\(/.test(uiSrc));
  test('LoadingState announces itself (role=status + aria-busy) and is hooked for specs',
    /role="status"/.test(uiSrc) && /aria-busy="true"/.test(uiSrc) && /data-testid="loading-state"/.test(uiSrc));
  test('the canonical DataTable renders its loading region through LoadingState, not a copy',
    /return <LoadingState rows=\{3\} \/>/.test(uiSrc));
  test('MetricBand renders its loading bars through the canonical Skeleton, not a copy',
    /<Skeleton className="h-2\.5 w-16" \/>/.test(wsSrc) && !/h-2\.5 w-16 animate-pulse/.test(wsSrc));
  test('the search/filter layer FORWARDS loading to the canonical table (its two surfaces rely on it)',
    /loading\?: boolean;/.test(layerSrc) && /loading=\{loading\}/.test(layerSrc));

  /**
   * No component may hand-roll a loading LABEL again. A rendered `>Loading…<` /
   * `>Loading...<` text node outside the owner is the defect this Part exists to
   * prevent (the app root, both shells, the intelligence panel and five public
   * route fallbacks each spelled their own before Wave 3 Part 5).
   */
  const HANDROLLED = new RegExp('>[ ' + String.fromCharCode(9, 10, 13) + ']*Loading(…|[.][.][.])');
  const offenders = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const p = `${dir}/${entry}`;
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.tsx?$/.test(entry) && p !== OWNER && HANDROLLED.test(readFileSync(p, 'utf8'))) offenders.push(p);
    }
  };
  walk('src');
  test(`no file outside ${OWNER} hand-rolls a loading label` + (offenders.length ? ` :: OFFENDERS ${offenders.join(', ')}` : ''),
    offenders.length === 0);

  console.log('\n── C. ONE owner per STATE, and every owner is WIRED (§OPENSHIP BATCH 8) ──');
  const uiOwner = readFileSync(OWNER, 'utf8');
  const boundarySrc = codeOf(readFileSync('src/components/shared/ErrorBoundary.tsx', 'utf8'));
  const shellSrc = readFileSync('src/components/layout/AdminShell.tsx', 'utf8');
  const notifySrc = readFileSync('src/components/shared/NotificationCenter.tsx', 'utf8');
  const chatSrc = readFileSync('src/components/shared/LiveChatWidget.tsx', 'utf8');
  const wsSrc2 = readFileSync('src/components/shared/workspace.tsx', 'utf8');

  /**
   * The five named states of spec §9 each have ONE owner, and it is the same file
   * — so a surface renders a state instead of hand-rolling its own markup (the
   * defect this section exists for: the no-permission state had been copied into
   * SEVEN files, and the error treatment existed in exactly one private copy).
   */
  for (const owner of ['EmptyState', 'LoadingState', 'ErrorState', 'NoPermissionState']) {
    test(`${owner} has its ONE owner in ${OWNER}`, new RegExp(`export function ${owner}\\(`).test(uiOwner));
  }

  /* The reference's own metrics (§9.1 empty, §9.2 loading). */
  test(
    "the empty state takes the reference's block (`py-16`, spec §9.1) and a named title step",
    /className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center"/.test(uiOwner) &&
      /* §REPOINTED §BATCH 5a (2026-11-21) — `text-zinc-200` became `text-strong`. This
         assertion's subject is unchanged (the empty state's title takes a NAMED type
         step); only the colour class it reads moved onto the canonical text ladder. */
      /text-ds-title font-medium tracking-tight text-strong/.test(uiOwner)
  );
  test(
    "the loading row has the reference's anatomy — a leading TILE and two bars (§9.2)",
    /<Skeleton className="h-6 w-6 flex-shrink-0" \/>/.test(uiOwner) &&
      /<Skeleton className="h-3 w-2\/3" \/>/.test(uiOwner) &&
      /<Skeleton className="h-2\.5 w-1\/3" \/>/.test(uiOwner)
  );
  test(
    'ABSENCE GUARD — the skeleton no longer paints the legacy near-white fill (invisible on the light themes)',
    /animate-pulse rounded-ds-sm bg-tint/.test(uiOwner) && !/animate-pulse rounded-ds-sm bg-white/.test(uiOwner)
  );

  /* §9.3 and §9.5 — the two states that had no owner at all. */
  test(
    'the ERROR state is announced and hookable (role=alert + data-testid="error-state")',
    /export function ErrorState\(/.test(uiOwner) &&
      /role="alert"/.test(uiOwner) &&
      /data-testid="error-state"/.test(uiOwner)
  );
  test(
    'the ERROR state renders its recovery control THROUGH the canonical control',
    /onRetry && <Button onClick=\{onRetry\}>/.test(uiOwner)
  );
  test(
    'the NO-PERMISSION state is announced, hookable, and names itself in TEXT (colour is never the only signal)',
    /export function NoPermissionState\(/.test(uiOwner) &&
      /data-testid="no-permission-state"/.test(uiOwner) &&
      /Super Admin access required/.test(uiOwner)
  );

  /* WIRED — an owner nothing renders through is not a fix. */
  test(
    'ABSENCE GUARD — the ErrorBoundary no longer declares the treatment itself (no hardcoded border remains)',
    !/border-white\/\[0\.06\]/.test(boundarySrc)
  );
  test(
    'the ErrorBoundary renders THROUGH ErrorState and still offers its reset control',
    /<ErrorState[\s\S]{0,400}onRetry=\{onReset\}/.test(boundarySrc)
  );
  test(
    'the shell refusal renders THROUGH NoPermissionState (page variant)',
    /<NoPermissionState[\s\S]{0,240}variant="page"/.test(shellSrc)
  );

  /**
   * ABSENCE GUARD — no file may hand-roll the refusal again. The old copies all
   * carried the same `<h3>Super Admin access required</h3>`; if one comes back,
   * the consolidation has silently un-happened.
   */
  const reRolled = [];
  const walkRefusals = (dir) => {
    for (const entry of readdirSync(dir)) {
      const p = `${dir}/${entry}`;
      if (statSync(p).isDirectory()) walkRefusals(p);
      else if (/\.tsx?$/.test(entry) && p !== OWNER && />Super Admin access required</.test(codeOf(readFileSync(p, 'utf8')))) reRolled.push(p);
    }
  };
  walkRefusals('src');
  test(
    'ABSENCE GUARD — no surface outside the owner hand-rolls the no-permission state' +
      (reRolled.length ? ` :: OFFENDERS ${reRolled.join(', ')}` : ''),
    reRolled.length === 0
  );

  /* The two floating panels BATCH 4/6 left: their EMPTY state goes through the owner too. */
  test(
    'the notification panel renders its empty state through the ONE empty-state owner',
    /<EmptyState/.test(notifySrc)
  );
  test(
    'the live-chat panel renders its empty state through the ONE empty-state owner',
    /<EmptyState/.test(chatSrc)
  );

  /* §9.4 — the list-row hover, on the ONE tint, and only where the row ACTS. */
  test(
    'an actionable queue row takes the list-row hover from the theme tint (a non-actionable row does not)',
    /r\.onOpen && 'hover:bg-tint'/.test(wsSrc2)
  );

  /**
   * SELF-CHECK — the predicates added above must be able to FAIL. Each is applied
   * to a deliberately broken sample: the reverted skeleton fill, the re-rolled
   * refusal heading and the boundary's old hardcoded border must all be caught.
   */
  test(
    'SELF-CHECK the BATCH 8 predicates flag the pre-batch sources',
    !/animate-pulse rounded-ds-sm bg-tint/.test("<div className=\"animate-pulse rounded-ds-sm bg-white/[0.06]\" />") &&
      />Super Admin access required</.test('<h3 className="text-sm">Super Admin access required</h3>') &&
      /border-white\/\[0\.06\]/.test('<div className="border border-white/[0.06]">') &&
      !/<ErrorState[\s\S]{0,400}onRetry=\{onReset\}/.test('<div className="border border-white/[0.06]"><button>Try again</button></div>')
  );

  /**
   * SELF-CHECK — the gate above must be able to FAIL. The same predicates are
   * applied to a deliberately broken sample: a denial render with no cue (must
   * be flagged) and a canonical loading render (must not be).
   */
  test('SELF-CHECK the loading-cue predicate flags a denial render and passes a loading render',
    !LOADING_CUE.test('<div class="p-8"><p>No purchase orders for this brand yet.</p></div>') &&
      LOADING_CUE.test('<div data-testid="loading-state" aria-busy="true"></div>') &&
      !LOADING_CUE.test('<div role="status">Loading…</div>') &&
      HANDROLLED.test('<div>Loading...</div>') &&
      HANDROLLED.test('<span className="x">Loading…</span>') &&
      !HANDROLLED.test('<div data-testid="loading-state"></div>'));
} finally {
  await server.close();
}

console.log(`\nAssertions: ${failures} failure(s)`);
console.log(failures === 0 ? 'STATE_COVERAGE_PASS' : `STATE_COVERAGE_FAIL (${failures})`);
process.exitCode = failures === 0 ? 0 : 1;
