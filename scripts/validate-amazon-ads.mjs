// §12 / PHASE 1 (0B.4 #1) — AMAZON ADS DASHBOARD validator.
//
// Proves the REQUIRED Amazon Ads dashboard is now a REAL, WIRED, HONEST surface:
//   • the existing ad-spend seam (AdSpendBudget / demoAdSpend /
//     fetchAdSpendBudgets / useAdSpendBudgets) is CONSUMED, not orphaned;
//   • the amazon_ads integration registry entry + INTEGRATION_ORDER are intact;
//   • the dashboard joins the canonical brand store and is reachable in Super
//     Admin nav (one platform, not a disconnected demo screen);
//   • the surface is simulation-first and clearly labelled simulated (never a
//     fabricated live claim), deterministic (no network / no AI model call);
//   • the operating-costs advertising_commission revenue stream stays honest;
//   • the requirements-registry records amazon_ads (no required feature absent).
import { createServer } from 'vite';
import { readFileSync, existsSync } from 'node:fs';

let failures = 0;
let checks = 0;
const test = (name, ok, detail = '') => {
  checks++;
  console.log(`${ok ? '✓' : '✗'} ${name}${!ok && detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

try {
  const demoStore = await server.ssrLoadModule('/src/data/demoStore.ts');
  const api = await server.ssrLoadModule('/src/data/api.ts');
  const registry = await server.ssrLoadModule('/src/integrations/registry.ts');
  const cost = await server.ssrLoadModule('/src/lib/costs/costSummary.ts');

  /* ── the seam (already existed) ──────────────────────────────────────── */
  const typesSrc = read('src/types.ts');
  test('AdSpendBudget type exists (src/types.ts)', /export interface AdSpendBudget/.test(typesSrc));
  test('demoAdSpend seed exists and is non-empty',
    Array.isArray(demoStore.demoAdSpend) && demoStore.demoAdSpend.length > 0);
  test('fetchAdSpendBudgets seam exists', typeof api.fetchAdSpendBudgets === 'function');

  /* ── registry ───────────────────────────────────────────────────────── */
  test('amazon_ads registered in the integration registry',
    !!registry.INTEGRATION_REGISTRY?.amazon_ads);
  test('amazon_ads is in INTEGRATION_ORDER',
    Array.isArray(registry.INTEGRATION_ORDER) && registry.INTEGRATION_ORDER.includes('amazon_ads'));
  test('amazon_ads category is marketing',
    registry.INTEGRATION_META?.amazon_ads?.category === 'marketing');
  test('registry description names the ad spend dashboard',
    /Ad spend dashboard/.test(registry.INTEGRATION_REGISTRY?.amazon_ads?.description ?? ''));

  /* ── the dashboard surface (the missing build work) ─────────────────── */
  const dashPath = 'src/components/admin/AmazonAdsDashboard.tsx';
  test('Amazon Ads dashboard component exists', existsSync(new URL(`../${dashPath}`, import.meta.url)));
  const dash = read(dashPath);
  test('dashboard CONSUMES useAdSpendBudgets (seam no longer orphaned)',
    /useAdSpendBudgets/.test(dash));
  test('dashboard joins the canonical brand store',
    /useBrands/.test(dash));
  test('dashboard is simulation-first and honestly labelled',
    /Simulated/.test(dash) && /No live ad data is claimed/.test(dash));
  test('dashboard is deterministic (no network call)',
    !/fetch\(|openrouter|openai|chat\/completions/i.test(dash));
  test('dashboard is deterministic (no AI model call)',
    !/selectRuntimeModel|authoriseAiCall|modelPolicy/i.test(dash));
  test('dashboard renders operating-costs advertising_commission honestly',
    /no ad spend revenue recorded yet/.test(dash));

  /* ── seed derivation matches the canonical brand universe ───────────── */
  const brands = demoStore.ALL_DEMO_BRANDS ?? [];
  const expectedActive = brands.filter((_, i) => i % 3 === 0).length;
  const seedActive = demoStore.demoAdSpend.filter((a) => a.status === 'active').length;
  test('ad-spend seed matches the canonical brand universe (i%3 active)',
    seedActive === expectedActive && seedActive > 0 && brands.length >= 10);

  /* ── reachability: one platform, real nav surface ───────────────────── */
  const shell = read('src/components/layout/AdminShell.tsx');
  test('dashboard is a Super Admin nav surface',
    /id: 'amazon_ads'/.test(shell) &&
    /adminView === 'amazon_ads' && <AmazonAdsDashboard/.test(shell) &&
    /import \{ AmazonAdsDashboard \}/.test(shell));

  /* ── operating-costs advertising_commission stays honest ────────────── */
  const streams = cost.revenueByStream();
  const adv = streams.find((s) => s.id === 'advertising_commission');
  test('advertising_commission revenue is £0 / not invented',
    !!adv && adv.gbp === 0 && /no ad spend recorded yet/.test(adv.source));

  /* ── requirements registry + e2e coverage ───────────────────────────── */
  test('e2e spec exists',
    existsSync(new URL('../e2e/amazon-ads-dashboard.spec.ts', import.meta.url)));
  const req = JSON.parse(read('requirements-registry.json'));
  const adsEntries = (req.entries ?? []).filter((e) => e.id && e.id.startsWith('amazon-ads'));
  test('requirements-registry has amazon_ads entries (not absent)',
    adsEntries.length >= 2);

  console.log(`\nAMAZON_ADS_VALIDATION_${failures === 0 ? 'PASS' : `FAIL (${failures})`} (${checks} checks)`);
  process.exit(failures === 0 ? 0 : 1);
} catch (err) {
  console.error('[validate-amazon-ads] THREW:', err);
  failures++;
  console.log(`\nAMAZON_ADS_VALIDATION_FAIL (${failures})`);
  process.exit(1);
}
