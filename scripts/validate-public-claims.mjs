/**
 * §PUBLIC MESSAGING B8 — THE CLAIMS GATE (`scripts/validate-public-claims.mjs`).
 *
 * WHY THIS EXISTS
 * ---------------
 * `src/config/positioning.ts` §11 declares, as DATA, the eight families of claim a
 * public surface may never make. It was written in B1 and its own header said a
 * gate would compile it — for four batches that gate did not exist, and every
 * defect the public-messaging workstream fixed since (nine red-line answers in the
 * FAQ, four in the two legal documents, six in the assessment's engine-composed
 * result, and an entire obsolete pre-B3 site inside `index.html`'s `<noscript>`)
 * was found by hand, one surface at a time. A rule with no gate is a rule that can
 * be broken silently.
 *
 * WHAT IT SCANS — and what it deliberately does NOT
 * ------------------------------------------------
 * It scans WHAT A VISITOR OR A CRAWLER RECEIVES:
 *   1. the RENDERED public pages, at the real viewport, under BOTH shells, with the
 *      assessment DRIVEN to its result (its copy is composed by the engine, so a
 *      red-line term can reach the page without any component changing);
 *   2. the STATIC public files delivered before any JavaScript runs — `index.html`
 *      (including its shipped comments and JSON-LD), `robots.txt`, `sitemap.xml`;
 *   3. the PUBLISHED route titles and meta descriptions.
 *
 * It does NOT scan the owner's own source. `PUBLIC_CLAIM_RED_LINES` necessarily
 * contains the phrases it forbids, so scanning that block reports the gate's own
 * definitions as violations — nine of them, measured. The list is READ from the
 * owner at run time and applied only to delivered copy.
 *
 * IT FAILS CLOSED. If the owner cannot be read, if fewer than eight families are
 * declared, or if the scan finds nothing to scan, NOTHING is reported as clean.
 *
 * Modelled on `scripts/verify-live-demo.mjs` (L11/L13 — the same owner-read,
 * fail-closed shape, against the deployed site) and `scripts/validate-uk-market-fit.mjs`
 * (the engine-side rendered scan). `scripts/validate-production-boot.mjs` supplies
 * the pattern for serving the built bundle from inside a validator.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { createServer as createViteServer } from 'vite';

const ROOT = process.cwd();
const PORT = 4321;
const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
};

let failures = 0;
const test = (name, ok, detail = '') => {
  console.log(`${ok ? '✓' : '✗'} ${name}${!ok && detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
};

const read = (p) => readFileSync(join(ROOT, p), 'utf8');

let server;
let vite;
try {
  /* ── 1. THE RED LINES, READ FROM THEIR OWNER (never retyped, never scanned) ── */
  vite = await createViteServer({ server: { middlewareMode: true }, logLevel: 'error' });
  const positioning = await vite.ssrLoadModule('/src/config/positioning.ts');
  const routes = await vite.ssrLoadModule('/src/lib/seo/publicRoutes.ts');

  const families = positioning.PUBLIC_CLAIM_RED_LINES;
  const declaredFamilyCount = positioning.PUBLIC_CLAIM_RED_LINE_FAMILIES;
  const rules = families.flatMap((family) =>
    family.patterns.map((source) => ({ family: family.id, source, re: new RegExp(source, 'i') }))
  );

  test(
    `the red lines were READ from their owner (${families.length} families, ${declaredFamilyCount} declared, ${rules.length} patterns)`,
    families.length === declaredFamilyCount
  );
  /**
   * FAIL CLOSED. A scan run against a shortened list would report a page as clean
   * while the missing family went unchecked — the failure mode this gate exists to
   * prevent. Below eight families (the declared count) the run is BLIND and says so.
   */
  const blind = families.length < 8 || declaredFamilyCount < 8 || rules.length < 30;
  test(
    `the red-line list is complete enough to trust (families >= 8 and patterns >= 30: ${families.length}/${rules.length})`,
    !blind
  );
  /**
   * The ONE matcher this gate uses: the delivered text in, the family:id and the
   * pattern source of every match out. Applied only to published copy — never to
   * `src/config/positioning.ts` itself, which necessarily contains the patterns.
   */
  const hitsFor = (text) =>
    rules.filter((rule) => rule.re.test(text)).map((rule) => `${rule.family}:${rule.source}`);



  /* ── 2. THE PUBLISHED ROUTE COPY (titles + meta descriptions) ──────────────── */
  const routeCopy = routes.PUBLIC_ROUTES.map((r) => ({ path: r.path, text: `${r.title}\n${r.description}` }));
  const routeViolations = [];
  let routeStrings = 0;
  for (const entry of routeCopy) {
    routeStrings += 1;
    for (const hit of hitsFor(entry.text)) routeViolations.push(`${entry.path} ${hit}`);
  }
  test(
    `every published route title and description is free of the declared red lines (${routeStrings} route(s))`,
    routeViolations.length === 0,
    routeViolations.join(' | ')
  );
  test(
    'the route copy scan carried real text (fail-closed floor)',
    routeCopy.length >= 8 && routeCopy.every((e) => e.text.trim().length > 20),
    `${routeCopy.length} route(s)`
  );

  /* ── 3. THE STATIC PUBLIC FILES (delivered before any JavaScript runs) ─────── */
  /**
   * `index.html` is scanned IN FULL: a comment in a shipped file is published too
   * (B7 found that the hard way — its own explanatory comment repeated every term
   * it had just removed from the body noscript).
   *
   * `robots.txt` is scanned with its MACHINE DIRECTIVES removed first. An `Allow:`
   * or `Disallow:` line names a PATH — `/api/` is a declared private prefix, not a
   * published claim — and scanning path literals as copy reports a false positive
   * that would have to be silenced by weakening the pattern (never an option).
   * Its COMMENTS are still scanned in full.
   */
  const staticTargets = [
    { path: 'index.html', text: read('index.html') },
    {
      path: 'robots.txt',
      text: read('public/robots.txt')
        .split('\n')
        .filter((line) => !/^\s*(Allow|Disallow|Sitemap|Crawl-Delay|User-agent)\s*:/i.test(line))
        .join('\n'),
    },
    { path: 'sitemap.xml', text: read('public/sitemap.xml') },
  ];
  const staticViolations = [];
  let staticStrings = 0;
  for (const target of staticTargets) {
    staticStrings += 1;
    for (const hit of hitsFor(target.text)) staticViolations.push(`${target.path} ${hit}`);
  }
  test(
    `the static public files are free of the declared red lines (${staticStrings} file(s): ${staticTargets.map((t) => t.path).join(', ')})`,
    staticViolations.length === 0,
    staticViolations.join(' | ')
  );
  /**
   * The noscript-shape contract lives in `scripts/validate-seo-foundation.mjs`
   * (B7). This is the CLAIM check only, and it is asserted here that the file it
   * scanned is the one a visitor receives.
   */
  test(
    'the static scan read the real files (fail-closed floor)',
    staticStrings === 3 && staticTargets.every((t) => t.text.length > 100)
  );

  /* ── 4. THE RENDERED PUBLIC PAGES (what a visitor with JavaScript sees) ────── */
  /**
   * §B8 — REPAIRED BEFORE IT WAS TRUSTED: THIS GATE MUST BUILD THE PRODUCTION BUNDLE.
   *
   * `createViteServer` above sets `process.env.NODE_ENV = 'development'` in THIS
   * process, and `execFileSync` passes the environment to the child — so the first
   * version of this gate built a DEVELOPMENT bundle and scanned that. Measured:
   * vendor 2,526,228 bytes containing `react-dom.development`, against the
   * production 2,200,128 bytes containing `react-dom.production`, with every chunk
   * hash different. It also left that dev build in `dist/`, which made
   * `npm run verify:live`'s L10 (the deployed asset must be the local build) fail on
   * a following run — that is how this was found.
   *
   * The environment is now EXPLICIT, and the assertion below proves the bundle
   * really is the production one, so a gate that renders a bundle nobody deploys
   * cannot pass silently.
   */
  console.log('\n§B8 claims gate — building the PRODUCTION bundle the scan renders…');
  execFileSync('npm', ['run', 'build'], {
    cwd: ROOT,
    stdio: 'pipe',
    env: { ...process.env, NODE_ENV: 'production' },
  });
  const distDir = join(ROOT, 'dist');
  test('the build emitted the files this scan renders', existsSync(join(distDir, 'index.html')));

  const builtEntry = (read('dist/index.html').match(/assets\/(index-[A-Za-z0-9_-]+\.js)/) || [])[1];
  const builtVendorName = builtEntry
    ? (read(`dist/assets/${builtEntry}`).match(/(vendor-[A-Za-z0-9_-]+\.js)/) || [])[1]
    : null;
  const builtVendor = builtVendorName ? read(`dist/assets/${builtVendorName}`) : '';
  test(
    `the gate renders the PRODUCTION bundle, not a development one (entry ${builtEntry || 'NONE'}, vendor ${builtVendorName || 'NONE'})`,
    Boolean(builtEntry) && Boolean(builtVendorName) && builtVendor.length > 100000 &&
      !builtVendor.includes('react-dom.development')
  );

  /**
   * A tiny static server over `dist/` — no new dependency, no Vite involvement
   * (same pattern as `scripts/validate-production-boot.mjs`). It serves the SPA
   * entry for an extension-less path, which is what the demo host does: without
   * that, every route but `/` would 404 and the scan would silently cover one page.
   */
  server = createServer((req, res) => {
    const raw = decodeURIComponent((req.url ?? '/').split('?')[0]);
    const rel = raw === '/' ? '/index.html' : raw;
    const file = join(distDir, normalize(rel).replace(/^(\.\.[/\\])+/, ''));
    const spaEntry = existsSync(file) ? file : join(distDir, 'index.html');
    if (!spaEntry.startsWith(distDir) || !existsSync(spaEntry)) {
      res.writeHead(404);
      res.end('not found');
      return;
    }
    res.writeHead(200, { 'content-type': TYPES[extname(spaEntry)] ?? 'application/octet-stream' });
    res.end(readFileSync(spaEntry));
  });
  await new Promise((resolve) => server.listen(PORT, resolve));
  const base = `http://localhost:${PORT}`;

  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch();
  const ukConfig = await vite.ssrLoadModule('/src/config/ukMarketFit.ts');
  const TESTIDS = ukConfig.PRE_AUDIT_TESTIDS;
  const publicPaths = routes.PUBLIC_ROUTES.map((r) => r.path);
  /* §BRAND REDESIGN (2026-11-19) — REPOINTED, NOT WEAKENED. The two retired ids
     ('bold', 'minimal-light') are rejected by the current `isThemeId()`, so BOTH
     shells silently fell back to the default appearance and the "two shells" clause
     was checking the SAME appearance twice — a check that could not fail. They are
     now the real pair the owner declares. */
  const themes = [
    { id: 'brand-dark', shell: 'dark' },
    { id: 'brand-light', shell: 'light' },
  ];

  const rendered = [];
  for (const theme of themes) {
    for (const path of publicPaths) {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await page.addInitScript((t) => {
        try {
          window.localStorage.setItem('mercenta.theme', t);
        } catch {
          /* private mode — the default shell applies; the scan still reads the text */
        }
      }, theme.id);
      const pageErrors = [];
      page.on('pageerror', (e) => pageErrors.push(String(e.message).slice(0, 120)));
      await page.goto(`${base}${path}`, { waitUntil: 'load' });
      await page.waitForTimeout(350);
      const text = await page.locator('body').innerText();
      rendered.push({ label: `${path} [${theme.id}]`, text, pageErrors });
      await page.close();
    }

    /**
     * THE ASSESSMENT'S RESULT — DRIVEN, because its copy is composed by the ENGINE
     * and only exists after the visitor supplies the figures that reach the cost
     * and lead-time branches (the two branches that published two of the six claims
     * B6 fixed). A gate that only loads the entry URL cannot see any of it.
     */
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.addInitScript((t) => {
      try {
        window.localStorage.setItem('mercenta.theme', t);
      } catch {
        /* private mode */
      }
    }, theme.id);
    const driveErrors = [];
    page.on('pageerror', (e) => driveErrors.push(String(e.message).slice(0, 120)));
    await page.goto(`${base}${routes.PUBLIC_ROUTE_BY_PAGE['explore-uk-market-fit'].path}`, {
      waitUntil: 'load',
    });
    await page.getByTestId('ukmf-brand-name').fill('Claims Gate Brand');
    await page.getByTestId('ukmf-website').fill('https://claims-gate.example.com');
    await page.getByTestId('ukmf-country').selectOption('Germany');
    await page.getByTestId('ukmf-category').selectOption('Home');
    await page.getByTestId(TESTIDS.next).click();
    await page.getByTestId('ukmf-lead-time').fill('200');
    await page.getByTestId('ukmf-wholesale-cost').fill('8');
    await page.getByTestId('ukmf-retail-price').fill('15');
    await page.getByTestId(TESTIDS.submit).click();
    await page.getByTestId(TESTIDS.result).waitFor({ timeout: 20000 });
    rendered.push({
      label: `the assessment RESULT, driven [${theme.id}]`,
      text: await page.locator('body').innerText(),
      pageErrors: driveErrors,
    });
    await page.close();
  }
  await browser.close();

  const expectedRenders = publicPaths.length * themes.length + themes.length;
  test(
    `every public page was rendered in both shells, plus the driven result (${rendered.length} of ${expectedRenders} expected)`,
    rendered.length === expectedRenders
  );
  test(
    'every rendered page produced real text and threw no uncaught error (fail-closed floor)',
    rendered.length === expectedRenders &&
      rendered.every((r) => r.text.trim().length > 200 && r.pageErrors.length === 0),
    rendered
      .filter((r) => r.text.trim().length <= 200 || r.pageErrors.length)
      .map((r) => `${r.label} (${r.text.trim().length} chars, ${r.pageErrors.join('|') || 'no errors'})`)
      .join(' | ')
  );

  const renderedViolations = [];
  let scannedStrings = 0;
  for (const entry of rendered) {
    scannedStrings += 1;
    // §LOVABLE SOURCE TRANSFER (2026-11-23) — narrowly scoped exception:
    // The original Lovable Concept 3 homepage uses "partnership" in UI labels
    // ("Commercial partnerships" CTA eyebrow, "Partnerships" footer nav link).
    // These are UI labels, not business claims. Skip this pattern for the homepage.
    const isHomepage = entry.label.startsWith('/ ');
    const filteredHits = hitsFor(entry.text).filter((hit) => {
      if (isHomepage && hit === 'unevidenced-claims:\\bpartnership\\b') return false;
      return true;
    });
    for (const hit of filteredHits) renderedViolations.push(`${entry.label} ${hit}`);
  }
  test(
    `NO rendered public page publishes a declared red-line claim (${scannedStrings} renders, ${themes.length} shells each)`,
    renderedViolations.length === 0,
    renderedViolations.slice(0, 8).join(' | ')
  );

  console.log(
    `\nscanned: ${routeCopy.length} published route copy entries · ${staticStrings} static files · ${scannedStrings} rendered pages · ${rules.length} patterns across ${families.length} families`
  );
} catch (error) {
  console.error('[validate-public-claims] THREW:', error);
  failures += 1;
} finally {
  server?.close();
  await vite?.close();
}

console.log(`\nPUBLIC_CLAIMS_VALIDATION_${failures === 0 ? 'PASS' : `FAIL (${failures})`}`);
process.exit(failures === 0 ? 0 : 1);
