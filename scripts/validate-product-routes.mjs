/**
 * §RUNTIME PARITY (R5) — PRODUCT ROUTE / NAVIGATION CONTRACT VALIDATOR.
 *
 * Typecheck and build cannot see any of the failures this gate catches. The
 * product can compile perfectly while:
 *
 *   1. an address means the wrong thing (`/admin/brain` resolving to a guessed
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
    ['/admin/brain', 'admin', 'brain'],
    ['/brand/logistics', 'brand', 'logistics'],
    ['/brand/purchase-orders', 'brand', 'purchase-orders'],
    ['/carrier/bak', 'carrier', 'bak'],
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
  for (const [p, env] of [['/admin', 'admin'], ['/brand', 'brand'], ['/carrier', 'carrier']]) {
    const parsed = routes.parseProductPath(p);
    check(`${p} declares ${env} with no view`, parsed?.environment === env && parsed?.view === null,
      JSON.stringify(parsed));
    check(`${p} resolves to the declared default view`,
      routes.viewFromProductPath(env, p) === routes.PRODUCT_DEFAULT_VIEW[env],
      routes.viewFromProductPath(env, p));
    check(`default view for ${env} is declared`,
      typeof routes.PRODUCT_DEFAULT_VIEW[env] === 'string' && routes.PRODUCT_DEFAULT_VIEW[env].length > 0);
  }

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

  /* The three product prefixes are declared ONCE, and match the SEO private set. */
  const publicRoutes = await server.ssrLoadModule('/src/lib/seo/publicRoutes.ts');
  for (const prefix of Object.values(routes.PRODUCT_ENVIRONMENT_PREFIXES)) {
    check(`SEO: ${prefix} is a declared PRIVATE route prefix`,
      publicRoutes.PRIVATE_ROUTE_PREFIXES.includes(prefix));
  }
  check('exactly three product environments are declared',
    Object.keys(routes.PRODUCT_ENVIRONMENT_PREFIXES).length === 3,
    Object.keys(routes.PRODUCT_ENVIRONMENT_PREFIXES).join(','));

  /* ── 2. Every nav id has a render branch (no nav item leads to a blank view) ── */
  const navIds = (src) => [...src.matchAll(/\{ id: '([a-z0-9_]+)'/g)].map((m) => m[1]);
  const renderViews = (src) =>
    new Set([...(src.matchAll(/[a-zA-Z]*[vV]iew === '([a-z0-9_]+)'/g))].map((m) => m[1]));

  for (const [label, file] of [
    ['AdminShell', 'src/components/layout/AdminShell.tsx'],
    ['BrandShell', 'src/components/layout/BrandShell.tsx'],
    ['CarrierShell', 'src/components/layout/CarrierShell.tsx'],
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

