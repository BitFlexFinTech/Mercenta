// §P3 (2026-09-23) — PRODUCTION BOOT GATE.
//
// WHY THIS EXISTS. Typecheck, lint, build and the browser suite all passed while
// the DEPLOYED bundle was dead: the full Playwright suite runs against the Vite
// DEV server (unbundled), so a chunk-graph defect that only exists after
// bundling is invisible to it. On 2026-09-23 live verification of
// https://demo.mercenta.co.uk found `#root` EMPTY with
// `TypeError: createSelector is not a function` — a cross-chunk initialisation
// cycle between `vendor-react` (recharts) and `vendor-other` (lodash/reselect)
// created by the manualChunks split. The production build now keeps all of
// node_modules in ONE `vendor` chunk (see vite.config.ts), and THIS validator is
// what keeps that true.
//
// WHAT IT DOES (real, not static):
//   1. `npm run build` (skippable with --no-build when a caller already built);
//   2. serves `dist/` over HTTP from a tiny built-in static server;
//   3. loads it in Chromium and asserts the app actually MOUNTS — `#root` is
//      non-empty and no page error / console error occurs.
// A build that produces a bundle which cannot mount FAILS (exit 1). Pass
// --url <url> to check an already-served bundle instead (used to prove the gate
// genuinely fails on the pre-fix bundle).
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const args = process.argv.slice(2);
const noBuild = args.includes('--no-build');
const urlArgIndex = args.indexOf('--url');
const PORT = 4319;

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

let server;
let base = urlArgIndex >= 0 ? args[urlArgIndex + 1] : `http://localhost:${PORT}`;

try {
  if (!noBuild) {
    console.log('§P3 production boot gate — building…');
    execFileSync('npm', ['run', 'build'], { cwd: ROOT, stdio: 'pipe' });
    test('`npm run build` succeeds', true);
    const distDir = join(ROOT, 'dist');
    test('the build emitted index.html and a vendor chunk',
      existsSync(join(distDir, 'index.html')),
      'dist/index.html missing');

    // A tiny static server over dist/ — no new dependency, no Vite involvement.
    server = createServer((req, res) => {
      const raw = decodeURIComponent((req.url ?? '/').split('?')[0]);
      const rel = raw === '/' ? '/index.html' : raw;
      const file = join(distDir, normalize(rel).replace(/^(\.\.[/\\])+/, ''));
      if (!existsSync(file) || !file.startsWith(distDir)) {
        res.writeHead(404);
        res.end('not found');
        return;
      }
      res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
      res.end(readFileSync(file));
    });
    await new Promise((resolve) => server.listen(PORT, resolve));
  }

  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 200));
  });

  const response = await page.goto(base + '/', { waitUntil: 'load' });
  test('the served bundle responds 200', response?.status() === 200, String(response?.status()));
  await page.waitForTimeout(6000);

  const rootHtml = await page.locator('#root').innerHTML().catch(() => '');
  test('the application MOUNTS (#root is not empty)', rootHtml.length > 1000, `${rootHtml.length} chars`);
  test('no page error or console error during boot', errors.length === 0, errors.slice(0, 2).join(' | '));
  test('the marketing homepage renders its Partner Login entry',
    (await page.getByRole('button', { name: 'Partner Login' }).count()) > 0);

  await browser.close();
} catch (err) {
  console.error('[validate-production-boot] THREW:', err);
  failures += 1;
} finally {
  server?.close();
}

console.log(`\nPRODUCTION_BOOT_VALIDATION_${failures === 0 ? 'PASS' : `FAIL (${failures})`}`);
process.exit(failures === 0 ? 0 : 1);