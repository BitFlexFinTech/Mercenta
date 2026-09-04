// Stage 11 validation: §7 marketing core (ICP validity, fit scoring,
// sequence pause-on-reply, hot-lead classification, CSV import) + §8
// auto-enroll gating + MarketingHub panel render.
import { createServer } from 'vite';
import { renderToString } from 'react-dom/server';
import { createElement } from 'react';

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });

let failures = 0;
function test(name, cond) {
  console.log(`${cond ? '✓' : '✗'} ${name}`);
  if (!cond) failures++;
}

try {
  const m = await server.ssrLoadModule('/src/lib/marketing.ts');
  const lsMod = await server.ssrLoadModule('/src/integrations/leadSourcing.ts');
  const api11Mod = await server.ssrLoadModule('/src/data/api.ts');

  // ── ICP validity (categories locked to APPROVED_CATEGORIES, §13) ──
  const icp = {
    description: 'Premium organic brands already exporting to UK retail',
    categories: ['Health & Personal Care', 'Grocery'],
    regions: ['us', 'eu'],
  };
  test('valid ICP accepted', m.isValidICP(icp) === true);
  test('non-approved category rejected (§13)',
    m.isValidICP({ ...icp, categories: ['Toys'] }) === false);
  test('empty description rejected',
    m.isValidICP({ ...icp, description: '   ' }) === false);

  // ── Fit scoring ──
  const strongUS = {
    region: 'us',
    company: 'Austin Organic Wellness Ltd',
    persona: 'Jane Doe, Founder',
    segment: 'Organic Food & Grocery',
    location: 'Austin TX USA',
  };
  const fitStrong = m.scoreLeadFit(strongUS, icp);
  test(`strong US organic lead scores high (${fitStrong})`,
    fitStrong >= m.FIT_THRESHOLD_PLACEHOLDER);

  const offTargetAfrica = { ...strongUS, region: 'africa' };
  const fitOff = m.scoreLeadFit(offTargetAfrica, icp);
  test('region mismatch drops score by 40', fitOff === fitStrong - 40);

  const capped = m.scoreLeadFit(
    {
      region: 'us',
      company: 'organic grocery wellness premium exporting',
      persona: 'organic premium founder exporting',
      segment: 'Grocery organic premium',
      location: 'United States organic',
    },
    icp
  );
  test('fit score capped at 100', capped <= 100);

  // ── Auto-enroll gating (§8 threshold rule) ──
  test('high-fit Scraped lead eligible for auto-enroll',
    m.shouldAutoEnroll(fitStrong, 'Scraped') === true);
  test('low-fit lead NOT enrolled', m.shouldAutoEnroll(40, 'Scraped') === false);
  test('already-sequenced lead NOT re-enrolled',
    m.shouldAutoEnroll(90, 'Sequenced') === false);

  // ── Sequence pause-on-reply ──
  test('sequence pauses on Replied', m.sequencePaused('Replied') === true);
  test('sequence pauses on Meeting Booked', m.sequencePaused('Meeting Booked') === true);
  test('sequence active for Sequenced', m.sequencePaused('Sequenced') === false);
  test('next step exists mid-sequence', m.nextSequenceStep('Sequenced', 1)?.step === 2);
  test('no next step after reply', m.nextSequenceStep('Replied', 1) === null);
  test('no next step after all steps sent', m.nextSequenceStep('Sequenced', 4) === null);
  test('4-step sequence defined', m.SEQUENCE_STEPS.length === 4);

  // ── Hot-lead classification (§8 intent detection) ──
  test('pricing question → hot lead',
    m.classifyInboundReply('How much does this cost? Can we talk?').wantsHuman === true);
  test('"call me" → hot lead',
    m.classifyInboundReply('Call me this week.').wantsHuman === true);
  test('objection → hot lead',
    m.classifyInboundReply('Honestly too expensive for us right now.').wantsHuman === true);
  test('neutral reply NOT flagged',
    m.classifyInboundReply('Thanks, we will review internally.').wantsHuman === false);

  // ── CSV import adapter (zero-API launch path) ──
  const csv = [
    'company,persona,email,location,region,segment',
    'Acme Organics,Jane Doe,jane@acme.com,Austin TX,us,Organic Food',
    'EuroBotanicals,Klaus Meyer,klaus@eurobot.de,Munich,eu,Cosmetics',
    'BadRow,No Email,no-email@row.com,Somewhere,mars,Unknown',
    'Zambezi Foods,Tendai Moyo,tendai@zf.co.zw,Harare,africa,Food',
  ].join('\n');
  const csvAdapter = new lsMod.CsvImportAdapter();
  await csvAdapter.submitICP(icp.description, {
    categories: icp.categories,
    regions: icp.regions,
    description: icp.description,
  });
  const batch = await csvAdapter.fetchNewLeads(new Date().toISOString(), csv);
  test('CSV parses 3 valid leads', batch.leads.length === 3);
  test('malformed row skipped + counted', batch.skipped === 1);
  test('region aliases mapped (us→us, africa→africa)',
    batch.leads[0].region === 'us' && batch.leads[2].region === 'africa');

  test('ExpleeAdapter fully removed (Stage 3) — no adapter exported',
    typeof lsMod.ExpleeAdapter === 'undefined');

  // ── Panel render (fresh Vite instance — see stage-9 note on shared SSR registries) ──
  const { QueryClient, QueryClientProvider } = await server.ssrLoadModule('@tanstack/react-query');
  const qc = new QueryClient();

  qc.setQueryData(['brands'], { data: (await api11Mod.fetchBrands()).data, source: 'seed' });
  qc.setQueryData(['messages'], { data: (await api11Mod.fetchMessages()).data, source: 'seed' });
  const panelServer = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
  try {
    const pCtx = await panelServer.ssrLoadModule('/src/integrations/IntegrationsContext.tsx');
    const pApp = await panelServer.ssrLoadModule('/src/context/GlobalStateContext.tsx');
    const pPanel = await panelServer.ssrLoadModule('/src/components/admin/MarketingHub.tsx');
    const html = renderToString(
      createElement(pCtx.IntegrationsProvider, null,
        createElement(QueryClientProvider, { client: qc },
          createElement(pApp.AppProvider, null,
            createElement(pPanel.MarketingHub))))
    );
    test('pipeline board shows all 5 stages',
      ['Scraped', 'Enriched', 'Sequenced', 'Replied', 'Meeting Booked'].every((s) => html.includes(s)));
    test('ICP builder renders approved category chips', html.includes('Health &amp; Personal Care'));
    test('explee caveat banner absent — Explee fully removed from UI',
      !html.includes('does not publish a confirmed public API'));
    test('campaign performance table renders', html.includes('Campaign Performance'));
  } finally {
    await panelServer.close();
  }

  console.log(failures === 0 ? 'STAGE11_VALIDATION_PASS' : `STAGE11_VALIDATION_FAIL (${failures} failures)`);
} finally {
  await server.close();
}
process.exitCode = failures === 0 ? 0 : 1;
