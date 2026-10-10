/**
 * §RUNTIME PARITY (R5) — PRODUCT ROUTE / NAVIGATION CONTRACT VALIDATOR.
 *
 * Typecheck and build cannot see any of the failures this gate catches. The
 * product can compile perfectly while:
 *
 *   1. an address means the wrong thing (`/admin/overview` resolving to a guessed
 *      environment, or an unknown segment being silently defaulted);
 *   2. a NAV ITEM HAS NO RENDER BRANCH — a nav id declared in the shell with no
 *      `{view === 'x' && …}` branch renders an EMPTY PAGE with no error at all.
 *      That is a real class of bug and it is silent in every other gate;
 *   3. the address bar is written by a second, competing code path (which is how
 *      the app ended up with `pushState` in exactly one marketing file and a
 *      product that could not be linked, reloaded or returned to);
 *   4. a session is created without passing the canonical RBAC allowlist;
 *   5. `/` stops being the public marketing homepage.
 *
 * Run: node scripts/validate-product-routes.mjs   (`npm run validate:product-routes`)
 */
import { createServer } from 'vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

let pass = 0;
let fail = 0;
const failures = [];
function check(name, ok, detail = '') {
  if (ok) pass++;
  else {
    fail++;
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
  }
}

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });

try {
  const routes = await server.ssrLoadModule('/src/lib/runtime/productRoutes.ts');
  const persistence = await server.ssrLoadModule('/src/lib/runtime/sessionPersistence.ts');

  /* ── 1. Address → environment + view, and BACK (round-trip, fail-closed) ── */
  const declared = [
    ['/admin/overview', 'admin', 'overview'],
    /* §BATCH 4 (2026-10-10) — REPOINTED: `['/admin/brain','admin','brain']` is
       REMOVED with the surface. `/admin/brain` still PARSES (product paths are
       slug-generic) but names no view the admin shell renders, so it resolves to
       the default view — pinned as an absence assertion below. */
    ['/brand/logistics', 'brand', 'logistics'],
    ['/brand/purchase-orders', 'brand', 'purchase-orders'],
    /* §P9 (programme decision 4) — REPOINTED: `['/carrier/bak','carrier','bak']`
       is REMOVED. The carrier environment no longer exists, so the address it
       used to declare is asserted as FAIL-CLOSED below instead (strictly
       stronger: an address for a removed surface must not resolve at all). */
  ];
  for (const [p, env, view] of declared) {
    const parsed = routes.parseProductPath(p);
    check(`parse ${p} → ${env}/${view}`,
      parsed?.environment === env && parsed?.view === view,
      JSON.stringify(parsed));
    check(`round-trip ${env}/${view} → ${p}`,
      routes.buildProductPath(env, view) === p,
      routes.buildProductPath(env, view));
  }

  /* An environment-only address resolves to its declared DEFAULT view. */
  for (const [p, env] of [['/admin', 'admin'], ['/brand', 'brand']]) {
    const parsed = routes.parseProductPath(p);
    check(`${p} declares ${env} with no view`, parsed?.environment === env && parsed?.view === null,
      JSON.stringify(parsed));
    check(`${p} resolves to the declared default view`,
      routes.viewFromProductPath(env, p) === routes.PRODUCT_DEFAULT_VIEW[env],
      routes.viewFromProductPath(env, p));
    check(`default view for ${env} is declared`,
      typeof routes.PRODUCT_DEFAULT_VIEW[env] === 'string' && routes.PRODUCT_DEFAULT_VIEW[env].length > 0);
  }

  /* §BATCH 4 (2026-10-10) — THE REMOVED BRAIN DESTINATION IS NOT RENDERABLE.
     `parseProductPath('/admin/brain')` still returns a {environment,view} object
     (product paths are slug-generic), so the truth is asserted where it belongs:
     'brain' must not be a view the ADMIN shell declares, which is what makes
     `resolveProductView` fall back to the default view instead of rendering a
     blank workspace. If the destination returns, this FAILS. */
  const adminShellBrainSrc = read('src/components/layout/AdminShell.tsx');
  check("§BATCH4 the removed 'brain' destination is NOT a declared admin nav id",
    !/id:\s*'brain'/.test(adminShellBrainSrc.replace(/\/\*[\s\S]*?\*\//g, '')));

  /* §P9 — THE REMOVED CARRIER ADDRESSES MUST NOT RESOLVE (fail-closed). */
  for (const p of ['/carrier', '/carrier/manifest', '/carrier/bak', '/carrier/auditor']) {
    const parsed = routes.parseProductPath(p);
    check(`§P9 fail-closed: the removed carrier address ${p} is NOT a product address`,
      parsed === null, JSON.stringify(parsed));
  }
  check('§P9: no carrier environment is declared',
    !Object.keys(routes.PRODUCT_ENVIRONMENT_PREFIXES).includes('carrier'),
    Object.keys(routes.PRODUCT_ENVIRONMENT_PREFIXES).join(','));
  check('§P9: the removed carrier environment no longer has a default view',
    !Object.keys(routes.PRODUCT_DEFAULT_VIEW).includes('carrier'),
    Object.keys(routes.PRODUCT_DEFAULT_VIEW).join(','));

  /* FAIL-CLOSED: an unknown/ambiguous address is NEVER guessed into an env. */
  for (const p of ['/', '/faq', '/login', '/adminx', '/admin/brain/extra',
    '/brand/a/b', '/x/admin', '/adminx/brain', '/account']) {
    const parsed = routes.parseProductPath(p);
    check(`fail-closed: ${p} is not a product address`, parsed === null, JSON.stringify(parsed));
  }
  /* Trailing slashes and query strings normalise to the same declared address. */
  check('/admin/ normalises to the declared /admin address',
    routes.parseProductPath('/admin/')?.environment === 'admin' &&
      routes.parseProductPath('/admin/')?.view === null,
    JSON.stringify(routes.parseProductPath('/admin/')));
  check('/brand/logistics?x=1 normalises to the declared view',
    routes.parseProductPath('/brand/logistics?x=1')?.view === 'logistics',
    JSON.stringify(routes.parseProductPath('/brand/logistics?x=1')));

  /* The product prefixes are declared ONCE, and match the SEO private set. */
  const publicRoutes = await server.ssrLoadModule('/src/lib/seo/publicRoutes.ts');
  for (const prefix of Object.values(routes.PRODUCT_ENVIRONMENT_PREFIXES)) {
    check(`SEO: ${prefix} is a declared PRIVATE route prefix`,
      publicRoutes.PRIVATE_ROUTE_PREFIXES.includes(prefix));
  }
  /* §P9 — REPOINTED from `length === 3`: two product environments remain. */
  check('exactly two product environments are declared',
    Object.keys(routes.PRODUCT_ENVIRONMENT_PREFIXES).length === 2,
    Object.keys(routes.PRODUCT_ENVIRONMENT_PREFIXES).join(','));
  check('§P9: the removed carrier prefix is no longer a PRIVATE route prefix',
    !publicRoutes.PRIVATE_ROUTE_PREFIXES.includes('/carrier'),
    publicRoutes.PRIVATE_ROUTE_PREFIXES.join(','));
  check('§P9: an address under the removed carrier prefix still resolves NOT-public (noindex)',
    publicRoutes.resolveRoute('/carrier/manifest')?.kind !== 'public',
    publicRoutes.resolveRoute('/carrier/manifest')?.kind);

  /* ── 2. Every nav id has a render branch (no nav item leads to a blank view) ── */
  const navIds = (src) => [...src.matchAll(/\{ id: '([a-z0-9_]+)'/g)].map((m) => m[1]);
  const renderViews = (src) =>
    new Set([...(src.matchAll(/[a-zA-Z]*[vV]iew === '([a-z0-9_]+)'/g))].map((m) => m[1]));

  /* §P9 (programme decision 4) — REPOINTED: the `['CarrierShell', …]` row is
     REMOVED with the shell it validated. The carrier surface must not merely be
     unrouted — it must be gone — so this block asserts the removal directly. */
  for (const [label, file] of [
    ['AdminShell', 'src/components/layout/AdminShell.tsx'],
    ['BrandShell', 'src/components/layout/BrandShell.tsx'],
  ]) {
    const src = read(file);
    const views = renderViews(src);
    const missing = navIds(src).filter((id) => !views.has(id));
    check(`${label}: every declared nav id has a render branch`, missing.length === 0,
      missing.join(','));
    check(`${label}: nav declares at least one destination`, navIds(src).length > 0);
    check(`${label}: view state is initialised FROM the address`,
      src.includes('resolveProductView('), 'no resolveProductView call');
    check(`${label}: an unrenderable address segment falls back to the default view`,
      /resolveProductView\(\s*'[a-z]+',\s*currentPathname\(\),\s*[A-Z_]+_VIEW_IDS\s*\)/.test(src),
      'resolveProductView is not given the shell\'s renderable view set');
    check(`${label}: navigation WRITES the address`,
      src.includes('pushProductPath('), 'no pushProductPath call');
    check(`${label}: Back/Forward re-reads the address`,
      /addEventListener\('popstate'/.test(src), 'no popstate listener');
  }

  /* ── 2b. §P9 (programme decision 4) — THE CARRIER SURFACE IS GONE ────────
     Not merely unrouted: deleted. These assertions are the ones the removed
     `['CarrierShell', …]` row used to make, repointed to the removal contract
     (and they are the proof that a future session cannot quietly reintroduce a
     carrier login). */
  for (const [label, file] of [
    ['CarrierShell', 'src/components/layout/CarrierShell.tsx'],
    ['CarrierDashboard', 'src/components/carrier/CarrierDashboard.tsx'],
    ['BakLogistics', 'src/components/carrier/BakLogistics.tsx'],
    ['CarrierMonitor', 'src/components/admin/CarrierMonitor.tsx'],
  ]) {
    check(`§P9: ${label} is DELETED`, !fs.existsSync(path.join(ROOT, file)), file);
  }
  /* NOTE — these assertions match CODE, not prose. The §P9 repoint comments
     necessarily QUOTE what was removed (that is the rule), so the source is
     comment-stripped first: otherwise the historical record itself would fail
     the check. */
  const codeOf = (p) =>
    read(p)
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^[ \t]*\/\/.*$/gm, '');
  const appSrc = codeOf('src/App.tsx');
  check('§P9: App no longer imports or renders the carrier shell',
    !appSrc.includes("import('@/components/layout/CarrierShell')") && !appSrc.includes('<CarrierShell'),
    'CarrierShell is still imported or rendered');
  const adminShellSrc = codeOf('src/components/layout/AdminShell.tsx');
  check('§P9: the admin "Carrier Monitor" nav item and render branch are REMOVED',
    !adminShellSrc.includes("id: 'carriers'") && !adminShellSrc.includes('<CarrierIntegrationMonitor'),
    'the Carrier Monitor destination is still wired');
  const envRouterSrc = codeOf('src/components/layout/EnvironmentRouter.tsx');
  check('§P9: the demo environment switcher offers only brand + admin',
    !/id: 'carrier'/.test(envRouterSrc), 'a carrier environment is still offered');
  const loginSrc = read('src/components/auth/Login.tsx');
  check('§P9: the "3PL Carrier Terminal" login card is REMOVED',
    !loginSrc.includes('3PL Carrier Terminal') && !loginSrc.includes("'carrier'"),
    'the carrier login card is still present');
  const typesSrc = read('src/types.ts');
  check('§P9: Environment no longer includes carrier',
    /export type Environment = 'home' \| 'login' \| 'brand' \| 'admin';/.test(typesSrc));
  check('§P9: the "3PL Carrier" session role is REMOVED',
    !/SessionRole =[\s\S]{0,160}'3PL Carrier'/.test(typesSrc),
    'the carrier session role is still declared');
  check('§P9 (decision 1): CarrierId is DHL + Palletline ONLY',
    /export type CarrierId = 'dhl' \| 'palletline';/.test(typesSrc));

  /* The RBAC module is asserted PROGRAMMATICALLY — a source-text match would
     trip over the §P9 repoint comments that necessarily name what was removed. */
  const rbac = await server.ssrLoadModule('/src/lib/auth/rbac.ts');
  check('§P9: no tier can enter a carrier environment',
    Object.values(rbac.TIER_ENVIRONMENTS).every((envs) => !envs.includes('carrier')),
    JSON.stringify(rbac.TIER_ENVIRONMENTS));
  check('§P9: the 3pl tier is gone from both RBAC maps',
    !('3pl' in rbac.TIER_ENVIRONMENTS) && !('3pl' in rbac.VIEW_ALLOWLIST));
  check('§P9: the removed carrier nav view is refused for admin staff',
    rbac.canAccessView('admin_staff', 'carriers') === false);
  check('§P9: the carrier tier no longer exists as a session tier',
    rbac.tierForRole('Brand Partner') === 'brand' &&
      rbac.tierForRole('Mercenta Admin') === 'admin_staff' &&
      rbac.tierForRole('Super Admin') === 'super_admin');

  /* Session persistence must fail closed on a STALE carrier value. */
  check('§P9: persistence re-validation refuses the removed carrier environment',
    persistence.isPersistedSession({
      environment: 'carrier', tier: '3pl', role: '3PL Carrier',
    }) === false,
    'a stale carrier session was accepted');
  check('§P9: persistence still accepts a valid brand session',
    persistence.isPersistedSession({
      environment: 'brand', tier: 'brand', role: 'Brand Partner', tenantId: 'brand-astonish',
    }) === true,
    'a valid session was rejected');

  /* ── 3. The address bar has exactly the declared writers ── */
  const walk = (dir, out = []) => {
    for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
      const rel = `${dir}/${entry.name}`;
      if (entry.isDirectory()) walk(rel, out);
      else if (/\.(tsx|ts)$/.test(entry.name)) out.push(rel);
    }
    return out;
  };
  const srcFiles = walk('src');
  const pushStateWriters = srcFiles.filter((f) =>
    /history\.(pushState|replaceState)\(/.test(read(f))
  );
  check('the address bar is written by exactly three declared modules',
    pushStateWriters.length === 3, pushStateWriters.join(', '));
  for (const expected of [
    'src/lib/runtime/productRoutes.ts',
    'src/components/marketing/Home.tsx',
    'src/context/GlobalStateContext.tsx',
  ]) {
    check(`${expected} is one of the declared writers`, pushStateWriters.includes(expected));
  }

  /* The environment itself has ONE writer: the context provider. */
  const envWriters = srcFiles.filter((f) => /setEnvironmentState\(/.test(read(f)));
  check('environment state has exactly one writer (GlobalStateContext)',
    envWriters.length === 1 && envWriters[0] === 'src/context/GlobalStateContext.tsx',
    envWriters.join(', '));

  /* ── 4. RBAC still gates every session creation path ── */
  const context = read('src/context/GlobalStateContext.tsx');
  const persistenceSrc = read('src/lib/runtime/sessionPersistence.ts');
  check('the RBAC allowlist is consulted before a session is created',
    /canAccessEnvironment\(tier, env\)/.test(context), 'canAccessEnvironment gate missing');
  check('a restored session is re-validated against the allowlist',
    /canAccessEnvironment\(restored\.session!\.tier, declared\.environment\)/.test(context));
  check('restoring a session never bypasses the allowlist',
    /readPersistedSession\(\)/.test(context) && /canAccessEnvironment/.test(context));
  check('session persistence is tab-scoped (sessionStorage, not localStorage)',
    /sessionStorage\.(get|set|remove)Item\(/.test(persistenceSrc) &&
      !/localStorage\.(get|set|remove)Item\(/.test(persistenceSrc),
    'a real storage call is not session-scoped');
  check('a malformed persisted session fails closed (returns null)',
    /return null/.test(persistenceSrc));
  check('persistence exposes the declared API',
    ['readPersistedSession', 'writePersistedSession', 'clearPersistedSession']
      .every((fn) => typeof persistence[fn] === 'function'));
  check('an unknown restored tenant is refused (fail-closed)',
    /unknown restored tenant/.test(context));
  check('sign-out clears the persisted session',
    /clearPersistedSession\(\)/.test(context));

  /* ── 5. `/` is still the public marketing homepage ── */
  const app = read('src/App.tsx');
  check('App routes home/login to the public shell',
    /environment === 'home' \|\| environment === 'login'/.test(app));
  const publicHome = publicRoutes.PUBLIC_ROUTE_BY_PATH['/'];
  check('/ is a declared public route (indexable)', publicHome?.robots === 'index, follow');
  check('the product prefixes are NOT public routes',
    Object.values(routes.PRODUCT_ENVIRONMENT_PREFIXES)
      .every((p) => !publicRoutes.PUBLIC_ROUTE_BY_PATH[p]));
} finally {
  await server.close();
}

console.log(`\n§RUNTIME PARITY — product routes: ${pass} PASS / ${fail} FAIL`);
if (failures.length) {
  console.log('\nFAILURES:');
  for (const f of failures) console.log(` - ${f}`);
}
process.exit(fail === 0 ? 0 : 1);

