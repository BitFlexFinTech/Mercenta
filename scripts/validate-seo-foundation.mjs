/**
 * §SEO FOUNDATION — VALIDATOR (2026-09-20).
 *
 * Pins the technical discoverability foundation so it cannot silently drift back
 * into "every route is the homepage":
 *
 *   A. ROUTE SSOT — every declared public route carries a title, a description,
 *      an indexable directive, a sitemap changefreq/priority and a UNIQUE path;
 *      the home route is exactly one `/`.
 *   B. PATH → VIEW — `Home.tsx` resolves a direct URL through the SSOT (no
 *      hand-maintained inline path chain) and pushes the URL on navigation.
 *   C. robots.txt — every public route is allowed and every private prefix is
 *      disallowed.
 *   D. sitemap.xml — every public route is listed exactly once and NO private
 *      path is listed.
 *   E. METADATA DECISIONS (pure function, fail-closed) — public routes are
 *      indexable with their OWN canonical; an unknown path, a private path and
 *      an authenticated app environment are all `noindex, nofollow` with NO
 *      canonical.
 *   F. index.html — one canonical element only (the runtime rewrites it), and
 *      the bootstrap description still matches the SSOT.
 *   G. MOUNTED — the single metadata writer is mounted by `App.tsx`.
 *   H. NO CONTENT GENERATION — the route table is a bounded, hand-declared list.
 *
 * ZERO NETWORK: `fetch` is stubbed to throw for the whole run.
 *
 * Run: node scripts/validate-seo-foundation.mjs
 */
import { createServer } from 'vite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
let failures = 0;
const test = (name, ok, detail = '') => {
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};

const read = (p) => readFileSync(resolve(process.cwd(), p), 'utf8');

try {
  const routes = await server.ssrLoadModule('/src/lib/seo/publicRoutes.ts');
  const meta = await server.ssrLoadModule('/src/lib/seo/routeMetadata.ts');

  const originalFetch = globalThis.fetch;
  let networkCalls = 0;
  globalThis.fetch = async (...args) => {
    networkCalls++;
    throw new Error(`NO LIVE NETWORK ALLOWED IN VALIDATION: ${String(args[0])}`);
  };

  /* ── A. The route SSOT ──────────────────────────────────────────────────── */
  const declared = routes.PUBLIC_ROUTES;
  test('public routes are declared', declared.length >= 8, String(declared.length));
  test(
    'every public route declares a title, a description, a sitemap entry and index,follow',
    declared.every(
      (r) =>
        r.title.trim().length > 0 &&
        r.description.trim().length > 20 &&
        r.robots === 'index, follow' &&
        Boolean(r.changefreq) &&
        /^\d\.\d$/.test(r.priority)
    )
  );
  const paths = declared.map((r) => r.path);
  test('every public path is unique', new Set(paths).size === paths.length);
  test('exactly one home route ("/") is declared', paths.filter((p) => p === '/').length === 1);
  const ukFit = await server.ssrLoadModule('/src/config/ukMarketFit.ts');
  test(
    'the assessment route comes from the canonical pre-audit config (no second path literal)',
    routes.PUBLIC_ROUTE_BY_PAGE['explore-uk-market-fit'].path === ukFit.EXPLORE_UK_MARKET_FIT_PATH
  );
  const brand = await server.ssrLoadModule('/src/config/brand.ts');
  test(
    'the site origin is derived from the ONE brand config',
    routes.SITE_ORIGIN === `https://${brand.BRAND_DOMAIN}`,
    routes.SITE_ORIGIN
  );
  test('the private prefix list is declared and non-empty', routes.PRIVATE_ROUTE_PREFIXES.length >= 6);

  /* ── B. Path → view resolution is SSOT-driven ───────────────────────────── */
  const homeSource = read('src/components/marketing/Home.tsx');
  test('Home.tsx resolves a direct URL through the route SSOT', homeSource.includes("from '@/lib/seo/publicRoutes'"));
  test(
    'the hand-maintained inline path chain is gone',
    !/path === '\/faq'/.test(homeSource) && !/path === '\/privacy'/.test(homeSource)
  );
  test(
    'in-app navigation pushes the URL and applies the target metadata',
    homeSource.includes('history.pushState') && homeSource.includes('applyRouteMetadata')
  );
  test(
    'normalizePath strips a trailing slash and collapses duplicates',
    routes.normalizePath('/faq//') === '/faq' && routes.normalizePath('') === '/'
  );

  /* ── C. robots.txt ──────────────────────────────────────────────────────── */
  const robots = read('public/robots.txt');
  const missingAllow = declared
    .map((r) => r.path)
    .filter((p) => !robots.includes(`Allow: ${p}`) && !(p === '/' && robots.includes('Allow: /$')));
  test('robots.txt allows every declared public route', missingAllow.length === 0, missingAllow.join(', '));
  const missingDisallow = routes.PRIVATE_ROUTE_PREFIXES.filter((p) => !robots.includes(`Disallow: ${p}`));
  test('robots.txt disallows every declared private prefix', missingDisallow.length === 0, missingDisallow.join(', '));
  test('robots.txt points at the sitemap', /Sitemap: https:\/\/mercenta\.co\.uk\/sitemap\.xml/.test(robots));

  /* ── D. sitemap.xml ─────────────────────────────────────────────────────── */
  const sitemap = read('public/sitemap.xml');
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const missingLoc = declared
    .map((r) => (r.path === '/' ? `${routes.SITE_ORIGIN}/` : `${routes.SITE_ORIGIN}${r.path}`))
    .filter((u) => !locs.includes(u));
  test('sitemap.xml lists every declared public route', missingLoc.length === 0, missingLoc.join(', '));
  test('sitemap.xml lists no duplicate URL', new Set(locs).size === locs.length);
  test(
    'sitemap.xml lists NO private path',
    !locs.some((u) => /(\/admin|\/brand|\/carrier|\/login|\/account|\/dashboard|\/internal|\/api\/)/.test(u))
  );
  test('the sitemap and robots.txt agree on the public set', locs.length === declared.length, `${locs.length} vs ${declared.length}`);

  /* ── E. Metadata decisions (fail-closed) ────────────────────────────────── */
  const faq = meta.buildRouteMetadata({ pathname: '/faq', environment: 'home' });
  test(
    'a public route is indexable with its OWN canonical',
    faq.robots === 'index, follow' && faq.canonicalUrl === 'https://mercenta.co.uk/faq',
    String(faq.canonicalUrl)
  );
  test('a public route carries its own title (not the homepage title)', faq.title.includes('FAQ') && faq.title !== declared[0].title, faq.title);
  const home = meta.buildRouteMetadata({ pathname: '/', environment: 'home' });
  test('the home route canonicalises to the site root with a trailing slash', home.canonicalUrl === 'https://mercenta.co.uk/', String(home.canonicalUrl));
  const unknown = meta.buildRouteMetadata({ pathname: '/not-a-declared-page', environment: 'home' });
  test('an UNKNOWN path is noindex,nofollow', unknown.robots === 'noindex, nofollow');
  test('an UNKNOWN path carries NO canonical (never the homepage)', unknown.canonicalUrl === null);
  const privatePath = meta.buildRouteMetadata({ pathname: '/admin/purchase-orders', environment: 'home' });
  test('a private path is noindex,nofollow with no canonical', privatePath.robots === 'noindex, nofollow' && privatePath.canonicalUrl === null);
  const authed = meta.buildRouteMetadata({ pathname: '/', environment: 'admin' });
  test('an AUTHENTICATED environment is private even at "/"', authed.robots === 'noindex, nofollow' && authed.canonicalUrl === null);
  test(
    'every non-home public route resolves to its declared page',
    declared.filter((r) => r.page !== 'home').every((r) => routes.resolveRoute(r.path).route?.page === r.page)
  );

  /* ── F. index.html ──────────────────────────────────────────────────────── */
  const indexHtml = read('index.html');
  test('index.html declares exactly ONE canonical element', (indexHtml.match(/rel="canonical"/g) ?? []).length === 1);
  test('the canonical element is the runtime-rewritable bootstrap (id="route-canonical")', indexHtml.includes('id="route-canonical"'));
  test('the bootstrap canonical is documented as bootstrap-only', /BOOTSTRAP ONLY/.test(indexHtml));
  test('the bootstrap description still matches the SSOT home description', indexHtml.includes(declared[0].description.slice(0, 60)));

  /* ── G. The writer is mounted ───────────────────────────────────────────── */
  const appSource = read('src/App.tsx');
  test('App.tsx mounts the single metadata writer', appSource.includes('RouteMetadata'));
  test('the writer is the ONLY place that sets document.title at runtime', !read('src/main.tsx').includes('document.title'));

  /* ── H. No content generation ───────────────────────────────────────────── */
  test('the route table is bounded and hand-declared (no generated pages)', declared.length <= 12, String(declared.length));

  globalThis.fetch = originalFetch;
  console.log(`\n-- network calls during validation: ${networkCalls} --`);
  console.log(
    failures === 0 ? 'SEO_FOUNDATION_VALIDATION_PASS' : `SEO_FOUNDATION_VALIDATION_FAIL (${failures})`
  );
} finally {
  await server.close();
}
if (failures > 0) process.exit(1);
