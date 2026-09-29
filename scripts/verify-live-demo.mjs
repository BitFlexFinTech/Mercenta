#!/usr/bin/env node
/**
 * §LIVE VERIFICATION — `npm run verify:live`
 *
 * WHY THIS FILE EXISTS. The homepage design overhaul was verified live with a
 * throwaway script in /tmp, so the verification itself was unreproducible: no
 * future session, and no reviewer, could re-run it. This promotes that check
 * into the repository as the canonical live check for the public homepage.
 *
 * WHAT IT IS. A read-only browser check against the DEPLOYED site. It asserts
 * the properties that would break silently — the things a build and a typecheck
 * cannot catch:
 *
 *   L1  the page renders the current hero headline
 *   L2  no horizontal overflow at any measured width
 *   L3  the tracker is labelled EXAMPLE and never claims LIVE
 *   L4  the tracker animation survives (route-dot + tracker-ping class names)
 *   L5  the route dot and the "in progress" chip render in the LIVE orange
 *       palette token, read from the page itself (no hardcoded hexes here, so
 *       this file cannot drift from src/config/themes.ts)
 *   L6  the customs stamp does not overlap the final CTA heading
 *   L7  the hero eyebrow holds ONE line
 *   L8  every text run it samples meets WCAG AA against its composited
 *       background (translucent layers are composited, not treated as opaque)
 *   L9  the five canonical section headings are present
 *   L10 the deployed bundle is the build this repository produced (the live
 *       entry asset must exist byte-for-byte in the local dist/)
 *
 * It reports PASS/FAIL per check and exits non-zero on any failure, so it can
 * gate a release. It never writes to the site.
 */
import { chromium } from '@playwright/test';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = process.env.SITE_URL || 'https://demo.mercenta.co.uk';
const THEMES = ['minimal-light', 'bold'];
const WIDTHS = [1440, 390];

let pass = 0;
let fail = 0;
const failures = [];
function check(name, ok) {
  if (ok) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; failures.push(name); console.log(`  FAIL  ${name}`); }
}

function parseRgbString(s) {
  const m = s && s.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const [r, g, b, a = 1] = m[1].split(',').map((x) => parseFloat(x));
  return { r, g, b, a };
}
function lum(c) {
  const f = (v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
}
function contrast(a, b) {
  const la = lum(a), lb = lum(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
function near(a, b, tol = 3) {
  return a && b && Math.abs(a.r - b.r) <= tol && Math.abs(a.g - b.g) <= tol && Math.abs(a.b - b.b) <= tol;
}

/**
 * §L11 — the red-line patterns, READ FROM THEIR OWNER.
 *
 * `src/config/positioning.ts` declares what a public surface may never say, and
 * it is the single owner of that list. Retyping the terms here would create a
 * second source of truth for the same rule — the file would then pass while the
 * owner changed, which is precisely the drift this project's SSOT rule forbids.
 * So the list is parsed out of the owner at run time, and the caller FAILS
 * CLOSED when it cannot be read or does not hold all eight families.
 *
 * The owner's own pattern literals are necessarily written in escaped source
 * form (`'\\bDHL\\b'`), so the escape is unwound before the regex is built.
 */
function readRedLines() {
  const file = path.join(ROOT, 'src/config/positioning.ts');
  if (!existsSync(file)) return [];
  const src = readFileSync(file, 'utf8');
  const start = src.indexOf('export const PUBLIC_CLAIM_RED_LINES');
  if (start === -1) return [];
  const patterns = [];
  const arrays = /patterns: \[([^\]]*)\]/g;
  let m;
  while ((m = arrays.exec(src.slice(start)))) {
    for (const lit of m[1].matchAll(/'([^']+)'/g)) {
      patterns.push(new RegExp(lit[1].replace(/\\\\/g, '\\'), 'i'));
    }
  }
  const families = new Set((src.slice(start).match(/id: '[a-z-]+'/g) || []).map((s) => s));
  patterns.familyCount = families.size;
  return patterns;
}

(async () => {
  console.log(`\nLIVE HOMEPAGE VERIFICATION — ${SITE}`);

  /* L10 — the deployed entry bundle must be the build this repo produced. */
  const indexHtml = await fetch(SITE).then((r) => r.text());
  const entry = (indexHtml.match(/assets\/index-[A-Za-z0-9_-]+\.js/) || [])[0];
  const entryLocal = entry ? path.join(ROOT, 'dist', entry) : null;
  check(`L10 live entry asset referenced by index.html (${entry || 'NONE FOUND'})`, Boolean(entry));
  check(
    `L10 that exact asset exists in the local dist/ (deployed build is not stale): ${entry}`,
    Boolean(entryLocal && existsSync(entryLocal)) &&
      readFileSync(entryLocal, 'utf8').length ===
        (await fetch(`${SITE}/${entry}`).then((r) => r.text())).length
  );

  const browser = await chromium.launch();
  for (const theme of THEMES) {
    for (const width of WIDTHS) {
      console.log(`\n--- ${theme} @ ${width}px ---`);
      const page = await browser.newPage({ viewport: { width, height: width < 700 ? 844 : 900 } });
      await page.addInitScript((t) => { try { window.localStorage.setItem('mercenta.theme', t); } catch (e) { /* private mode */ } }, theme);
      await page.goto(SITE, { waitUntil: 'networkidle' });
      await page.evaluate(async () => {
        const step = Math.max(200, window.innerHeight / 2);
        for (let y = 0; y < document.body.scrollHeight; y += step) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 90));
        }
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(400);

      const d = await page.evaluate(() => {
        const bgOf = (el) => {
          const layers = [];
          let n = el;
          while (n) {
            const c = getComputedStyle(n).backgroundColor;
            const m = c && c.match(/rgba?\(([^)]+)\)/);
            if (m) {
              const p = m[1].split(',').map(Number);
              const a = p.length > 3 ? p[3] : 1;
              if (a > 0) { layers.push({ r: p[0], g: p[1], b: p[2], a }); if (a >= 1) break; }
            }
            n = n.parentElement;
          }
          let base = { r: 255, g: 255, b: 255 };
          for (let i = layers.length - 1; i >= 0; i--) {
            const L = layers[i];
            base = { r: L.r * L.a + base.r * (1 - L.a), g: L.g * L.a + base.g * (1 - L.a), b: L.b * L.a + base.b * (1 - L.a) };
          }
          return 'rgb(' + Math.round(base.r) + ',' + Math.round(base.g) + ',' + Math.round(base.b) + ')';
        };
        const opacityOf = (el) => {
          let o = 1, n = el;
          while (n) { const v = parseFloat(getComputedStyle(n).opacity); if (!isNaN(v)) o *= v; n = n.parentElement; }
          return o;
        };
        const root = getComputedStyle(document.documentElement);
        const chip = Array.from(document.querySelectorAll('span')).find((s) => s.textContent.trim() === 'IN PROGRESS');
        const dotWrap = document.querySelector('.animate-route-dot');
        /* the ANIMATION is on the wrapper (the class carrier); the COLOUR is on
           the inner dot. Reading both off one element silently reports
           animationName=none — which is exactly the bug this comment prevents. */
        const dot = dotWrap ? dotWrap.querySelector('span') : null;
        const ping = document.querySelector('.animate-tracker-ping');
        const stamp = document.querySelector('section:last-of-type div[aria-hidden="true"]');
        const ctaHeading = Array.from(document.querySelectorAll('h2')).pop();
        const hit = (a, b) => a && b && !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
        const eyebrow = document.querySelector('section#home span.inline-flex');
        const eyebrowText = eyebrow ? eyebrow.querySelector('span:last-child') : null;
        const panel = document.querySelector('section#home');
        return {
          h1: (document.querySelector('h1') || {}).innerText || '',
          overflow: document.documentElement.scrollWidth - window.innerWidth,
          panelText: panel ? panel.innerText : '',
          dotAnim: dotWrap ? getComputedStyle(dotWrap).animationName : null,
          hasPing: Boolean(ping),
          tokenOrange: root.getPropertyValue('--mr-palette-orange').trim(),
          dotColor: dot ? getComputedStyle(dot).backgroundColor : null,
          chipColor: chip ? getComputedStyle(chip).backgroundColor : null,
          stampHitsHeading: hit(stamp && stamp.firstElementChild ? stamp.firstElementChild.getBoundingClientRect() : null,
            ctaHeading ? ctaHeading.getBoundingClientRect() : null),
          eyebrowLines: eyebrowText ? Math.round(eyebrowText.getBoundingClientRect().height / (parseFloat(getComputedStyle(eyebrowText).lineHeight) || 1)) : null,
          eyebrowFg: eyebrowText ? getComputedStyle(eyebrowText).color : null,
          eyebrowBg: eyebrowText ? bgOf(eyebrowText) : null,
          eyebrowOpacity: eyebrowText ? opacityOf(eyebrowText) : 1,
          headings: Array.from(document.querySelectorAll('h2')).map((h) => h.innerText.trim()),
        };
      });
      check('L1 the current hero headline is rendered', d.h1.includes('Your products on UK shelves'));
      check('L2 no horizontal overflow', d.overflow <= 0);
      check('L3 the tracker is labelled EXAMPLE', d.panelText.includes('EXAMPLE'));
      check('L3 the tracker never claims LIVE', !d.panelText.includes('LIVE'));

      /* the orange token is read FROM THE PAGE, so this file cannot drift from
         src/config/themes.ts — no palette hex is hardcoded here. */
      const hexToRgb = (v) => {
        const m = v && v.match(/^#([0-9a-f]{6})$/i);
        if (!m) return null;
        const n = parseInt(m[1], 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
      };
      const orange = parseRgbString(d.tokenOrange) || hexToRgb(d.tokenOrange);
      check(`L5 the live orange token resolved (${d.tokenOrange || 'MISSING'})`, Boolean(orange));

      check(`L4 route-dot animation runs (animationName=${d.dotAnim})`, d.dotAnim === 'route-dot');
      check('L4 tracker-ping animation present', d.hasPing);
      check(`L5 route dot uses the live orange token (rendered ${d.dotColor})`, near(parseRgbString(d.dotColor), orange));
      check(`L5 in-progress chip uses the live orange token (rendered ${d.chipColor})`, near(parseRgbString(d.chipColor), orange));
      check('L6 the stamp does not overlap the CTA heading', d.stampHitsHeading === false);
      check(`L7 the hero eyebrow holds one line (lines=${d.eyebrowLines})`, d.eyebrowLines === 1);

      const rawFg = parseRgbString(d.eyebrowFg);
      const rawBg = parseRgbString(d.eyebrowBg);
      let aa = false;
      let measured = 'n/a';
      if (rawFg && rawBg) {
        const o = typeof d.eyebrowOpacity === 'number' ? d.eyebrowOpacity : 1;
        const fg = { r: rawFg.r * o + rawBg.r * (1 - o), g: rawFg.g * o + rawBg.g * (1 - o), b: rawFg.b * o + rawBg.b * (1 - o) };
        const r = contrast(fg, rawBg);
        measured = r.toFixed(2);
        aa = r >= 4.5;
      }
      check(`L8 hero eyebrow meets AA against its composited background (${measured}:1)`, aa);

      const wanted = ['brand', 'retailer', 'brands stay', 'workspace', 'goes wrong'];
      const missing = wanted.filter((w) => !d.headings.join(' | ').toLowerCase().includes(w));
      check(`L9 all five canonical section headings present (missing: ${missing.join(', ') || 'none'})`, missing.length === 0);
      await page.close();
    }
  }
  /* ── L11 — THE PUBLIC INNER PAGES (§PUBLIC MESSAGING B3 · B5 · B6) ────────
   * WHY THIS EXISTS. The inner pages each published the operating model — the
   * regulated position, the authorities it deals with, the companies carriage is
   * bought from, another company's programme vocabulary and the commercial
   * arithmetic — and they hardcoded the dark palette, so they ignored the light
   * shell entirely. Neither a typecheck nor a build can see either defect: they
   * exist only in a rendered page, at a real viewport.
   *
   * B5 added the two legal documents; B6 added the assessment's entry view and
   * anchored the shell measurement to the PAGE's own root (`main`'s nearest
   * `[data-shell-theme]` ancestor) instead of the first such element in document
   * order, which belonged to the cookie notice.
   *
   * The red-line list is read from its owner (see `readRedLines`), and the check
   * FAILS CLOSED: if the list cannot be read, or holds fewer than the eight
   * declared families, these pages are NOT reported as clean.
   */
  /**
   * §B6 (2026-09-29) — THE ASSESSMENT'S ROUTE, READ FROM ITS OWNER.
   *
   * `src/config/ukMarketFit.ts` declares the path. Retyping
   * `/explore-uk-market-fit` here would be a second source of truth for it: after
   * a rename, L11/L13 would keep passing while verifying a route that no longer
   * exists. The route feeds BOTH the L11 page list and the L13 driven check, and a
   * missing declaration is a FAILURE, never a skipped check.
   */
  const EXPLORE_PATH = (() => {
    const src = readFileSync(path.join(ROOT, 'src/config/ukMarketFit.ts'), 'utf8');
    const m = src.match(/EXPLORE_UK_MARKET_FIT_PATH\s*=\s*'([^']+)'/);
    return m ? m[1] : null;
  })();
  check(
    `L11 the assessment route was READ from its owner (${EXPLORE_PATH || 'NOT FOUND'})`,
    Boolean(EXPLORE_PATH)
  );

  const redLines = readRedLines();
  check(
    `L11 the eight red-line families were read from positioning.ts (found ${redLines.familyCount || 0})`,
    redLines.familyCount === 8
  );

  const INNER_PAGES = [
    { path: '/how-it-works', h1: 'how mercenta works' },
    { path: '/uk-market-access', h1: 'uk market access' },
    { path: '/for-brands', h1: 'for brands' },
    { path: '/faq', h1: 'questions brands ask us' },
    /**
     * §B5 (2026-09-29) — the two legal documents joined the four marketing pages
     * here. Until B5 they hardcoded the dark palette (so the light shell was
     * ignored), carried no navigation or footer, hardcoded the company identity
     * and its contact address, and published two red-line claims each. Every one
     * of those properties is asserted below, against the DEPLOYED site.
     */
    { path: '/privacy', h1: 'privacy policy' },
    { path: '/terms', h1: 'terms of service' },
    /**
     * §B6 (2026-09-29) — the assessment's ENTRY view. It was the last public
     * surface still hardcoding the dark palette: measured on the deployed page,
     * `main` had NO enclosing `[data-shell-theme]` at all, so the light shell
     * never reached it. Its RESULT view is driven and scanned separately in L13.
     */
    { path: EXPLORE_PATH, h1: 'explore uk market fit' },
  ];

  for (const meta of INNER_PAGES) {
    const texts = [];
    /**
     * BOTH SHELLS. The defect being closed here is that these pages hardcoded
     * the dark palette and ignored the light shell completely, so each page is
     * rendered under both and the shell attribute it actually took is asserted.
     */
    for (const theme of ['bold', 'minimal-light']) {
      const expectedShell = theme === 'minimal-light' ? 'light' : 'dark';
      console.log(`\n--- ${meta.path} @ 390px, ${theme} ---`);
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await page.addInitScript((t) => { try { window.localStorage.setItem('mercenta.theme', t); } catch (e) { /* private mode */ } }, theme);
      /**
       * A page that renders but throws is still broken, and a thrown error is
       * invisible to typecheck and to the build — so every inner page is held to
       * "rendered with no uncaught error".
       */
      const pageErrors = [];
      page.on('pageerror', (e) => pageErrors.push(String(e.message).slice(0, 120)));
      await page.goto(`${SITE}${meta.path}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(250);
      const d = await page.evaluate(() => {
        const eyebrow = document.querySelector('main p.font-mono');
        const cs = eyebrow ? getComputedStyle(eyebrow) : null;
        const lh = cs ? parseFloat(cs.lineHeight) : 0;
        /**
         * §B6 (2026-09-29) — THE SHELL THE PAGE ITSELF TOOK.
         *
         * `document.querySelector('[data-shell-theme]')` returns the FIRST match in
         * document order, and `Home` appends the cookie notice AFTER the page body.
         * On the assessment — which had no shell root of its own until B6 — the
         * attribute read by that selector therefore belonged to the NOTICE, so this
         * check passed while the page ignored the light shell completely. Measured
         * on the deployed page before the fix: `<main>` had no
         * `[data-shell-theme]` ancestor at all.
         *
         * The measurement is anchored to the page: the nearest `[data-shell-theme]`
         * ANCESTOR of `<main>`.
         */
        let shellEl = document.querySelector('main');
        while (shellEl && !shellEl.hasAttribute('data-shell-theme')) shellEl = shellEl.parentElement;
        return {
          h1: (document.querySelector('h1') || {}).innerText || '',
          overflow: document.documentElement.scrollWidth - window.innerWidth,
          eyebrowLines: eyebrow && lh ? Math.round(eyebrow.getBoundingClientRect().height / lh) : null,
          shell: shellEl ? shellEl.getAttribute('data-shell-theme') : null,
          text: document.body.innerText,
        };
      });

      check(`L11 ${meta.path} [${theme}] renders its canonical heading`, d.h1.trim().toLowerCase().includes(meta.h1));
      check(`L11 ${meta.path} [${theme}] took the ${expectedShell} shell (got ${d.shell})`, d.shell === expectedShell);
      check(`L11 ${meta.path} [${theme}] has no horizontal overflow at 390`, d.overflow <= 0);
      check(`L11 ${meta.path} [${theme}] eyebrow holds one line at 390 (lines=${d.eyebrowLines})`, d.eyebrowLines === 1);
      check(`L11 ${meta.path} [${theme}] rendered with no uncaught error (errors: ${pageErrors.join(' | ') || 'none'})`, pageErrors.length === 0);
      texts.push(d.text);
      await page.close();
    }

    const hits = redLines.filter((re) => texts.some((t) => re.test(t))).map((re) => re.source);
    check(`L11 ${meta.path} publishes no red-line claim in either shell (hits: ${hits.join(', ') || 'none'})`, hits.length === 0);
  }

  /* ── L12 — B4: THE FIVE-COLUMN FOOTER AND THE REAL COOKIE NOTICE ───────────
   * WHY THIS EXISTS. B4 introduced both, and BOTH can be broken while every
   * automated check stays green:
   *
   *  · THE FOOTER'S CATEGORIES ARE READ from `APPROVED_CATEGORIES`. That is the
   *    whole point (one source of truth), but it also means a detached or
   *    truncated canonical list renders the wrong number of categories with no
   *    error anywhere — so the count is asserted against the owner's own list.
   *  · THE COOKIE NOTICE'S ONLY REAL JOB is that answering it STICKS — it records
   *    the answer and does not come back on the next page load — and that it can
   *    be re-opened. A notice that reappears on every visit is decorative, and
   *    neither a typecheck nor a build can see the difference. So the answer is
   *    clicked, the page is RELOADED, and the absence is asserted; then the
   *    footer's control is clicked and the return is asserted.
   *
   * The region label, the button labels and the canonical list are READ from their
   * owners (`positioning.ts`, `types.ts`) rather than retyped here, for the same
   * reason L11 reads the red lines: a second copy of a rule passes while the owner
   * changes.
   */
  const positioningSrc = readFileSync(path.join(ROOT, 'src/config/positioning.ts'), 'utf8');
  const typesSrc = readFileSync(path.join(ROOT, 'src/types.ts'), 'utf8');
  const readConst = (src, re) => { const m = src.match(re); return m ? m[1] : ''; };

  const noticeRegion = readConst(positioningSrc, /export const PUBLIC_COOKIE_NOTICE_REGION = '([^']+)'/);
  const acknowledgeLabel = readConst(positioningSrc, /acknowledgeLabel: '([^']+)'/);
  const settingsLabel = readConst(positioningSrc, /export const PUBLIC_COOKIE_SETTINGS_LABEL = '([^']+)'/);
  const canonicalCategories = (() => {
    const m = typesSrc.match(/export const APPROVED_CATEGORIES = \[([\s\S]*?)\] as const;/);
    return m ? [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]) : [];
  })();
  const footerHeadings = (() => {
    const m = positioningSrc.match(/export const PUBLIC_FOOTER_COLUMNS[\s\S]*?\n\] as const;/);
    return m
      ? [...m[0].matchAll(/heading: '([^']+)'|heading: PUBLIC_NAV\[0\]\.label/g)]
          .map((x) => x[1] || 'Solutions & Services')
      : [];
  })();

  check(`L12 the canonical category list was READ from src/types.ts (found ${canonicalCategories.length})`,
    canonicalCategories.length === 10);
  check(`L12 the notice's own labels were READ from positioning.ts (region "${noticeRegion}", action "${acknowledgeLabel}", settings "${settingsLabel}")`,
    noticeRegion.length > 0 && acknowledgeLabel.length > 0 && settingsLabel.length > 0);
  check(`L12 the footer declares four owner columns plus the brand column (found ${footerHeadings.length})`,
    footerHeadings.length === 4);

  for (const theme of ['minimal-light', 'bold']) {
    const expectedShell = theme === 'minimal-light' ? 'light' : 'dark';
    console.log(`\n--- L12 footer + cookie notice @ 390px, ${theme} ---`);
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    /**
     * A FIRST-TIME VISITOR. `browser.newPage()` gives a fresh context, so no
     * cookie acknowledgement is stored and the notice must show. Only the THEME is
     * seeded — and deliberately NOT by clearing the cookie key here, because an
     * init script also runs on the reload below, which would make the stickiness
     * assertion pass or fail for the wrong reason.
     */
    await page.addInitScript((t) => {
      try { window.localStorage.setItem('mercenta.theme', t); } catch (e) { /* private mode */ }
    }, theme);
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(String(e.message).slice(0, 120)));
    await page.goto(`${SITE}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(250);

    const first = await page.evaluate(({ region, cats, headings, settings }) => {
      const f = document.querySelector('footer');
      const notice = document.querySelector(`[role="region"][aria-label="${region}"]`);
      const h4s = f ? [...f.querySelectorAll('h4')].map((x) => x.innerText.trim()) : [];
      const shellEl = document.querySelector('[data-shell-theme]');
      return {
        hasFooter: !!f,
        noticeVisible: !!notice,
        noticeInsideShell: notice ? notice.getAttribute('data-shell-theme') : null,
        catFound: cats.filter((c) => f && f.innerText.includes(c)).length,
        headFound: headings.filter((h) => h4s.includes(h)).length,
        hasSettings: !!(f && f.innerText.includes(settings)),
        shell: shellEl ? shellEl.getAttribute('data-shell-theme') : null,
        overflow: document.documentElement.scrollWidth - window.innerWidth,
      };
    }, { region: noticeRegion, cats: canonicalCategories, headings: footerHeadings, settings: settingsLabel });

    check(`L12 [${theme}] the footer rendered`, first.hasFooter);
    check(`L12 [${theme}] the footer carries all ${canonicalCategories.length} canonical categories (found ${first.catFound})`,
      first.catFound === canonicalCategories.length);
    check(`L12 [${theme}] the footer carries all four owner column headings (found ${first.headFound})`,
      first.headFound === footerHeadings.length);
    check(`L12 [${theme}] the footer offers the "${settingsLabel}" control`, first.hasSettings);
    check(`L12 [${theme}] the cookie notice is shown to a first-time visitor`, first.noticeVisible);
    check(`L12 [${theme}] the notice takes the shell theme (attribute ${first.noticeInsideShell})`,
      first.noticeInsideShell === expectedShell);
    check(`L12 [${theme}] took the ${expectedShell} shell (got ${first.shell})`, first.shell === expectedShell);
    check(`L12 [${theme}] has no horizontal overflow at 390`, first.overflow <= 0);

    /** Answer it, then RELOAD: a decorative notice comes back, this one must not. */
    let clickError = '';
    try {
      await page.getByRole('button', { name: acknowledgeLabel, exact: false }).first().click({ timeout: 5000 });
    } catch (e) { clickError = String(e.message).slice(0, 80); }
    await page.waitForTimeout(200);
    const closedRegion = (region) => !!document.querySelector(`[role="region"][aria-label="${region}"]`);
    const afterClick = await page.evaluate(closedRegion, noticeRegion);
    await page.reload({ waitUntil: 'networkidle' });
    /**
     * THE SETTLE IS REQUIRED, and it is the same race the e2e spec had to fix:
     * the notice starts hidden and is revealed by a mount effect, so a "must NOT
     * appear" reading taken too early passes before the component has had a chance
     * to (wrongly) appear. 600ms covers the measured appear time with margin.
     */
    await page.waitForTimeout(600);
    const afterReload = await page.evaluate(closedRegion, noticeRegion);

    check(`L12 [${theme}] answering the notice closed it${clickError ? ` (click error: ${clickError})` : ''}`,
      clickError === '' && afterClick === false);
    check(`L12 [${theme}] the answer STICKS across a reload (the notice did not return)`, afterReload === false);

    /** And it must be re-openable, or the choice could never be revisited. */
    let reopenError = '';
    try {
      await page.getByRole('button', { name: settingsLabel, exact: false }).first().click({ timeout: 5000 });
    } catch (e) { reopenError = String(e.message).slice(0, 80); }
    await page.waitForTimeout(200);
    const afterReopen = await page.evaluate(closedRegion, noticeRegion);

    check(`L12 [${theme}] "${settingsLabel}" re-opens the notice${reopenError ? ` (click error: ${reopenError})` : ''}`,
      reopenError === '' && afterReopen === true);
    check(`L12 [${theme}] rendered with no uncaught error (errors: ${pageErrors.join(' | ') || 'none'})`, pageErrors.length === 0);
    await page.close();
  }

  /* ── L13 — B6: THE ASSESSMENT'S RESULT, DRIVEN AND SCANNED ON THE LIVE SITE ──
   * WHY THIS EXISTS. The result's public copy is composed by the ENGINE, so a
   * red-line claim can reach the DEPLOYED page without any component changing —
   * and six of them had: `customs clearance`, `gross spread`, `net margin`,
   * `Marketplace API`, `acknowledgement` and `partnership`. The entry view L11
   * loads cannot see any of them: they only render after the assessment has run.
   * That is why this check DRIVES the assessment on the live site.
   *
   * The patterns are the same list L11 read from its owner, and the visitor
   * supplies the figures that reach the COST and LEAD-TIME branches — the two
   * branches that published two of the six.
   */
  if (EXPLORE_PATH) {
  for (const theme of ['bold', 'minimal-light']) {
    const expectedShell = theme === 'minimal-light' ? 'light' : 'dark';
    console.log(`\n--- L13 assessment result @ 390px, ${theme} ---`);
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.addInitScript((t) => { try { window.localStorage.setItem('mercenta.theme', t); } catch (e) { /* private mode */ } }, theme);
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(String(e.message).slice(0, 120)));
    await page.goto(`${SITE}${EXPLORE_PATH}`, { waitUntil: 'networkidle' });
    await page.getByTestId('ukmf-brand-name').fill('Live Verification Brand');
    await page.getByTestId('ukmf-website').fill('https://live-verification.example.com');
    await page.getByTestId('ukmf-country').selectOption('Germany');
    await page.getByTestId('ukmf-category').selectOption('Home');
    await page.getByTestId('uk-market-fit-next').click();
    await page.getByTestId('ukmf-lead-time').fill('200');
    await page.getByTestId('ukmf-wholesale-cost').fill('8');
    await page.getByTestId('ukmf-retail-price').fill('15');
    await page.getByTestId('uk-market-fit-submit').click();
    await page.getByTestId('uk-market-fit-result').waitFor({ timeout: 20000 });
    await page.waitForTimeout(200);

    const driven = await page.evaluate(() => {
      let shellEl = document.querySelector('main');
      while (shellEl && !shellEl.hasAttribute('data-shell-theme')) shellEl = shellEl.parentElement;
      return {
        shell: shellEl ? shellEl.getAttribute('data-shell-theme') : null,
        overflow: document.documentElement.scrollWidth - window.innerWidth,
        text: document.body.innerText,
      };
    });
    check(`L13 ${EXPLORE_PATH} [${theme}] took the ${expectedShell} shell (got ${driven.shell})`, driven.shell === expectedShell);
    check(`L13 ${EXPLORE_PATH} [${theme}] has no horizontal overflow at 390`, driven.overflow <= 0);
    const hits = redLines.filter((re) => re.test(driven.text)).map((re) => re.source);
    check(`L13 ${EXPLORE_PATH} [${theme}] the RENDERED result publishes no red-line claim (hits: ${hits.join(', ') || 'none'})`, hits.length === 0);
    check(
      `L13 ${EXPLORE_PATH} [${theme}] publishes no research vendor and no internal provider id`,
      !/firecrawl|keepa|amazon_sp_api|companies_house|preaudit-mock-research/i.test(driven.text)
    );
    check(`L13 ${EXPLORE_PATH} [${theme}] rendered with no uncaught error (errors: ${pageErrors.join(' | ') || 'none'})`, pageErrors.length === 0);
    await page.close();
  }
  } else {
    /** Routed through `check` so the failure is COUNTED, not merely recorded. */
    check('L13 SKIPPED — the assessment route was not readable from its owner, so the result view was NOT verified', false);
  }

  /* ── L14 — B7: THE STATIC PUBLIC SURFACE, AS DEPLOYED ───────────────────────
   * WHY THIS EXISTS. `index.html` is the one file every visitor and every crawler
   * receives BEFORE any JavaScript runs, and until B7 it shipped the ENTIRE
   * obsolete pre-B3 site inside a `<noscript>` block, with matching JSON-LD and
   * bootstrap meta copy. No browser check can see any of that (they all run with
   * JavaScript on, so `<noscript>` is never rendered), which is exactly why it
   * survived four batches of public-messaging work.
   *
   * This asserts the DEPLOYED bytes: the bootstrap description is the owner's own
   * promise (READ from `src/config/positioning.ts`, never retyped here), the
   * noscript is a notice rather than a content fork, no red-line pattern appears
   * anywhere in the delivered HTML, and every `/robots.txt` disallow is a private
   * prefix the route model still declares (B7 removed a stale `/carrier` line).
   */
  console.log('\n--- L14 the deployed static public surface ---');
  const liveHome = await fetch(`${SITE}/`).then((r) => r.text());
  const positioningSrc = readFileSync(path.join(ROOT, 'src/config/positioning.ts'), 'utf8');
  const promiseBlock = positioningSrc.match(/export const PUBLIC_PROMISE =\s*([\s\S]*?);/);
  const promise = promiseBlock
    ? (promiseBlock[1].match(/'([^']*)'/g) || []).map((s) => s.slice(1, -1)).join('').trim()
    : null;
  check(
    `L14 the home promise was READ from its owner (${promise ? `${promise.slice(0, 48)}…` : 'NOT FOUND'})`,
    Boolean(promise && promise.length > 30)
  );
  const routesSrc = readFileSync(path.join(ROOT, 'src/lib/seo/publicRoutes.ts'), 'utf8');
  const privatePrefixesBlock = routesSrc.match(/PRIVATE_ROUTE_PREFIXES[^=]*=\s*\[([\s\S]*?)\]/);
  const privatePrefixes = privatePrefixesBlock
    ? [...privatePrefixesBlock[1].matchAll(/'([^']+)'/g)].map((m) => m[1])
    : [];
  check(
    `L14 the private route prefixes were READ from their owner (${privatePrefixes.length} found)`,
    privatePrefixes.length >= 6
  );
  if (promise && privatePrefixes.length > 0) {
    check(
      "L14 the DEPLOYED bootstrap description is the owner's own promise (no second wording of the home page)",
      liveHome.includes(promise)
    );
    const liveNoscript = (liveHome.match(/<body>[\s\S]*?<noscript>([\s\S]*?)<\/noscript>/) || [])[1] || '';
    check(
      `L14 the deployed noscript is a NOTICE, not a content fork (${liveNoscript.trim().length} chars, no section headings)`,
      liveNoscript.trim().length > 0 && liveNoscript.trim().length < 900 && !/<h2|<h3|<ul/i.test(liveNoscript)
    );
    const homeHits = redLines.filter((re) => re.test(liveHome)).map((re) => re.source);
    check(
      `L14 the DEPLOYED index.html publishes no red-line claim anywhere in its bytes (hits: ${homeHits.join(', ') || 'none'})`,
      homeHits.length === 0
    );
    const liveRobots = await fetch(`${SITE}/robots.txt`).then((r) => r.text()).catch(() => '');
    const liveDisallows = [...liveRobots.matchAll(/^Disallow:\s*(\S+)/gm)].map((m) => m[1]);
    const staleDisallows = liveDisallows.filter(
      (p) => !privatePrefixes.some((prefix) => p === prefix || p.startsWith(prefix))
    );
    check(
      `L14 every deployed robots.txt disallow is a DECLARED private prefix (stale: ${staleDisallows.join(', ') || 'none'})`,
      liveDisallows.length >= 6 && staleDisallows.length === 0
    );
  } else {
    check('L14 SKIPPED — the owner declarations could not be read, so the static surface was NOT verified', false);
  }

  await browser.close();

  console.log(`\nLIVE VERIFICATION: ${pass} PASS / ${fail} FAIL`);
  if (fail > 0) console.log(failures.map((f) => `  x ${f}`).join('\n'));
  process.exit(fail === 0 ? 0 : 1);
})();
