// Stage 5 (review pass) validation: Contract Cycle document viewers render
// the real clause-block agreement; Messages threads open with a working
// reply pipeline (sandbox + always-log).
import { createServer } from 'vite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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
  const seedMod = await server.ssrLoadModule('/src/data/demoStore.ts');
  const apiMod = await server.ssrLoadModule('/src/data/api.ts');
  const emailMod = await server.ssrLoadModule('/src/lib/messaging/email.ts');
  const g = await server.ssrLoadModule('/src/context/GlobalStateContext.tsx');
  const brandMod = await server.ssrLoadModule('/src/components/brand/BrandContractView.tsx');
  const adminMod = await server.ssrLoadModule('/src/components/admin/ContractsAdminPanel.tsx');
  const hubMod = await server.ssrLoadModule('/src/components/admin/MessagesHub.tsx');
  const ictx = await server.ssrLoadModule('/src/integrations/IntegrationsContext.tsx');

  // ── Brand contract viewer renders the full generated document ──
  const contracts = (await apiMod.fetchContracts()).data.filter((c) => c.status !== 'draft');
  test('non-draft demo contracts exist for viewing', contracts.length > 0);

  const qc = new QueryClient();
  qc.setQueryData(['contracts'], { data: contracts, source: 'seed' });

  const brandHtml = renderToString(
    createElement(g.AppProvider, null,
      createElement(QueryClientProvider, { client: qc },
        createElement(brandMod.BrandContractView)))
  );
  test('brand cards show Open document action', brandHtml.includes('Open document'));
  /**
   * §Wave-3-Part-3 DEFECT FIX — this assertion used to pass for the WRONG reason.
   * `/v\d/` was matching a digit inside the lucide header icon's SVG path data
   * (`…v1…`), NOT the contract's own version — so it could not fail if the
   * contract type/version text genuinely disappeared, and it fired FALSELY the
   * moment the unrelated header icon was removed. React SSR also splits
   * `{type} — v{version}` into separate text nodes joined by `<!-- -->`, so the
   * rendered string is `distribution agreement<!-- --> — v<!-- -->1`. Strip those
   * separators, then assert the contract card's real type + version text — so the
   * test now fails if the card stops rendering them.
   */
  const brandText = brandHtml.replace(/<!--\s*-->/g, '');
  test('brand view lists contract types and versions',
    /distribution agreement\s+—\s+v\d/.test(brandText));

  // ── Admin viewer: View buttons present per row ──

  const adminServer = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
  let adminHtml = '';
  try {
    const aIctx = await adminServer.ssrLoadModule('/src/integrations/IntegrationsContext.tsx');
    /* §SSOT S7 — the panel now reads the acting staff id + mutation right from
       the app context, so the render must provide it, exactly as the app does. */
    const aApp = await adminServer.ssrLoadModule('/src/context/GlobalStateContext.tsx');
    const aPanel = await adminServer.ssrLoadModule('/src/components/admin/ContractsAdminPanel.tsx');
    const aQc = new QueryClient();
    aQc.setQueryData(['brands'], { data: seedMod.demoBrands, source: 'seed' });
    aQc.setQueryData(['contracts'], { data: contracts, source: 'seed' });
    aQc.setQueryData(['fulfillment-scores'], { data: (await apiMod.fetchFulfillmentScores()).data, source: 'seed' });
    adminHtml = renderToString(
      createElement(aApp.AppProvider, null,
        createElement(aIctx.IntegrationsProvider, null,
          createElement(QueryClientProvider, { client: aQc },
            createElement(aPanel.ContractsAdminPanel))))
    );
  } finally {
    await adminServer.close();
  }
  // §Phase M10 — REPOINTED for the canonical DataTable (Phase D). The contracts
  // table now paginates (pageSizeDefault = 10), so only the current page's rows
  // exist in the SSR output; asserting "one View per contract in the dataset"
  // was therefore impossible by construction. The invariants that actually
  // matter are asserted instead:
  //   1. every row on the rendered page carries a View action;
  //   2. the table is backed by the FULL dataset (rows={allContracts}, drafts
  //      included) — never a curated subset;
  //   3. pagination is rendered, so the remaining rows are reachable.
  const adminSrc = readFileSync(
    resolve(process.cwd(), 'src/components/admin/ContractsAdminPanel.tsx'),
    'utf8'
  );
  const viewButtons = (adminHtml.match(/View</g) ?? []).length;
  // React SSR inserts `<!-- -->` separators between adjacent text/expression
  // nodes, so strip them before matching the "1 / N" page indicator.
  const plainAdmin = adminHtml.replace(/<!--[\s\S]*?-->/g, '');
  const pageCount = Number((plainAdmin.match(/1 \/ (\d+)/) ?? [])[1] ?? 0);
  test(
    `admin rows have View actions (${viewButtons} on page 1 of ${pageCount || 1})`,
    viewButtons > 0 && viewButtons <= 10 && (pageCount === 1 || viewButtons === 10)
  );
  // §SSOT S7 — REPOINTED (the old contract, recorded): the admin table used to be
  // backed by a LOCAL `extraDrafts` array merged with the query
  // ("[...extraDrafts, ...(contractsQuery.data?.data ?? [])]"), which was a second
  // source of truth for contracts (it vanished on reload). The table is now the
  // CANONICAL store alone, and every draft/closure goes through the store's writers.
  /**
   * §BATCH 7 (Part 4.1a) — REPOINTED (the old contract is recorded here, rule 07).
   * This pinned the EXACT declaration text. The panel now wraps the SAME canonical
   * derivation in `useMemo` (a react-hooks dependency fix: the array identity was
   * changing every render and a new deep-link effect depends on it), so the check
   * reads the DECLARATION and asserts it derives from the canonical query. Intent
   * unchanged: the table is the canonical store alone, with no local draft state.
   */
  const allContractsDecl = (adminSrc.match(/const allContracts = [^;]+;/) ?? [])[0] ?? '';
  test('admin table is backed by the full canonical dataset, drafts included',
    adminSrc.includes('rows={allContracts}') &&
      /contractsQuery\.data\?\.data/.test(allContractsDecl) &&
      !adminSrc.includes('setExtraDrafts'));
  test('the panel writes drafts and closures through the canonical store',
    adminSrc.includes('saveContractDraft') &&
      adminSrc.includes('renewContract') &&
      adminSrc.includes('terminateContract'));
  test('admin table paginates so every contract is reachable',
    pageCount >= 1 && plainAdmin.includes('aria-label="Next page"'));

  // ── Reply pipeline: sandbox send is logged; disconnected logs failure ──
  let calls = 0;
  const countingTransport = async () => {
    calls++;
    return { ok: true, status: 200, json: async () => ({}) };
  };

  const sandboxClient = emailMod.createEmailClient(
    () => ({ secretRef: 'vault:sandbox', provider: 'postmark', verified: false }),
    '/fn', countingTransport
  );
  const rSandbox = await sandboxClient.send({ to: 'b@x.com', subject: 'S', body: 'B' });
  const logged1 = await apiMod.logMessage({
    brandId: 'brand-x', channel: 'email', direction: 'outbound',
    subject: 'S', body: `[SANDBOX SEND] B`, sentBy: 'staff', requiresHuman: false,
  });
  test('sandbox reply-send ok and logged with SANDBOX marker',
    rSandbox.ok === true && rSandbox.sandbox === true &&
      logged1.body.startsWith('[SANDBOX SEND]'));

  const disconnected = emailMod.createEmailClient(() => null, '/fn', countingTransport);
  const rFail = await disconnected.send(req0());
  function req0() { return { to: 'b@x.com', subject: 'S', body: 'B' }; }
  const logged2 = await apiMod.logMessage({
    brandId: 'brand-x', channel: 'email', direction: 'outbound',
    subject: 'S', body: `[SEND FAILED — EMAIL_NOT_CONNECTED] B`, sentBy: 'staff', requiresHuman: false,
  });
  test('disconnected send still logged (nothing lost)',
    rFail.ok === false && calls === 0 && logged2.body.includes('SEND FAILED'));

  console.log(failures === 0 ? 'STAGE5_REVIEW_PASS' : `STAGE5_REVIEW_FAIL (${failures} failures)`);
} finally {
  await server.close();
}
process.exitCode = failures === 0 ? 0 : 1;
