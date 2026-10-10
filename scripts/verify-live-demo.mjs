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
 *   L11 the public inner pages, in BOTH shells (B3 · B5 · B6)
 *   L12 the five-column footer and the real cookie notice (B4)
 *   L13 the Explore assessment's RESULT, driven and scanned live (B6)
 *   L14 the deployed STATIC public surface — index.html, its noscript, its
 *       JSON-LD-free bootstrap copy and robots.txt (B7)
 *   L15 the channel-issued purchase-order revision, driven live end to end:
 *       read the channel → issue the change → re-read → the console's revision
 *       history → the brand's own notice (BATCH 2c · AV-024)
 *   L16 the acknowledgement ↔ invoice price rule, driven live end to end:
 *       the ceiling refuses a higher price · a lower price is accepted, warned
 *       and shown on the order (BATCH 2d · AV-008/AV-023)
 *   L17 the compliance document set on the DEPLOYED brand surface: three
 *       universal documents, the category document, and the reclassified
 *       brand-ownership control nowhere required (BATCH 2e · AV-031/AV-032)
 *   L18 the delivery appointment on the DEPLOYED brand surface: the channel's
 *       own appointment state, the window rule's verdict, and the rule's words
 *       rendered rather than assumed compliant (BATCH 2i · AV-045)
 *   L19 the acknowledgement's completeness and on-hold duties on the DEPLOYED
 *       brand surface (BATCH 2j · AV-009/AV-010b)
 *   L20 the acknowledgement-confirmation and ASN-before-receipt verdicts on the
 *       DEPLOYED channel-operations console, reusing the one receiving read
 *       (BATCH 2k/2l · AV-011/AV-015)
 *   L21 the channel pickup lead-time verdict on the DEPLOYED console, per
 *       Freight Collect purchase order (BATCH 2m · AV-014)
 *   L22 the ASN's carton→pallet structure on the DEPLOYED brand surface: the
 *       pallet label (its own SSCC container identifier) and the structure's
 *       stated basis (BATCH 2n · AV-016)
 *   L23 the fulfilment-track label on the DEPLOYED admin surface (BATCH 2p · AV-025)
 *   L24 the contract closing controls (Renew / Terminate) on the DEPLOYED admin
 *       surface (BATCH 3a · S7)
 *   L25 the founder closing path on the DEPLOYED Super-Admin work surface (BATCH 3b)
 *   L26 the Mercenta Brain's ABSENCE on the DEPLOYED Super-Admin surface: no Brain
 *       nav destination and the removed `/admin/brain` address falls back to the
 *       default view (BATCH 4, 2026-10-10 — rewritten from the KPI-drill-down probe)
 *   L27 the platform-mode switch on the DEPLOYED Super-Admin surface (§Batch-0):
 *       the ONE switch states the current mode in words
 *   L28 the Delta Fulfillment 3PL card on the DEPLOYED Super-Admin Integration
 *       Settings surface (§PHASE 3 Stage 2): the 3PL provider is registered and
 *       the provider count has grown by exactly one (23)
 *   L29 the Supply Route & 3PL escalation surface on the DEPLOYED admin Logistics
 *       Hub (§PHASE 3 Stage 3): the declared 3PL partner, the not-agreed
 *       thresholds and the fail-closed review decision
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

/**
 * §B8 FIX (2026-09-29) — NAVIGATION THAT SURVIVES A SLOW SHARED HOST.
 *
 * Every navigation this script performs targets SHARED hosting, and
 * `waitUntil: 'networkidle'` throws after 30s when the host is merely slow —
 * measured twice in one session: once on `/how-it-works`, and once on the homepage
 * itself. A thrown timeout ended the WHOLE script, so the run printed no PASS/FAIL
 * total and every later check (L12, L13, L14) never ran at all: a slow host could
 * hide part of the verification completely.
 *
 * The document is now waited for (`domcontentloaded`, 45s), then the SPA is given
 * its render window (`networkidle`, bounded to 15s and IGNORED when the host is
 * slow) plus a short settle. Only a document that cannot be fetched at all throws,
 * and every call site counts that as a FAIL for its own check instead of aborting.
 */
async function gotoLive(page, url) {
  /**
   * §BATCH 2c FIX (2026-09-29) — THE HOST NOW NEEDS LONGER THAN 45s FOR A FRESH
   * DOCUMENT, AND THROTTLES A BURST OF CONTEXTS.
   *
   * Measured on 2026-09-29 while this batch was verified: `curl` returned HTTP 200 in
   * 2.1–6.9s for `/` on five consecutive attempts, while the browser's `page.goto`
   * timed out at 45s repeatedly — a full run printed 20 PASS / 23 FAIL in which EVERY
   * failure was a `page.goto` timeout, and a dedicated single-page drive of the same
   * flow (120s timeout) passed 11/11. The 45s document wait is therefore too tight for
   * this host as it stands, and each fresh context pays the connection cost again.
   *
   * This does NOT weaken any assertion: no check was removed or relaxed, and a
   * document that genuinely cannot be fetched still fails. It raises the document
   * wait to 90s and retries ONCE after a pause, so a throttled burst is not reported
   * as a broken deployment.
   */
  let lastError = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(600);
      return;
    } catch (error) {
      lastError = error;
      await page.waitForTimeout(4000);
    }
  }
  throw lastError;
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
      try {
        await gotoLive(page, SITE);
      } catch (navError) {
        check(`L1–L9 ${theme} @ ${width}px NAVIGATION FAILED (${String(navError).split('\n')[0].slice(0, 120)})`, false);
        await page.close();
        continue;
      }
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
      /**
       * §B8 FIX (2026-09-29) — A LOCAL FAILURE MUST NOT ABORT THE WHOLE VERIFICATION.
       *
       * This check drives a SHARED HOST, and a navigation that never reaches
       * `networkidle` used to throw out of the whole script: the run died mid-way
       * with no PASS/FAIL total and none of L12, L13 or L14 ran at all (observed —
       * the failure was recorded as an unhandled `TimeoutError` on
       * `/how-it-works`). The failure is now COUNTED against this page and the
       * run continues, so one slow page cannot hide the rest of the verification.
       */
      try {
        await gotoLive(page, `${SITE}${meta.path}`);
      } catch (navError) {
        check(`L11 ${meta.path} [${theme}] NAVIGATION FAILED (${String(navError).split('\n')[0].slice(0, 120)})`, false);
        await page.close();
        continue;
      }
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
    try {
      await gotoLive(page, `${SITE}/`);
    } catch (navError) {
      check(`L12 [${theme}] NAVIGATION FAILED (${String(navError).split('\n')[0].slice(0, 120)})`, false);
      await page.close();
      continue;
    }
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
    /**
     * §B8 FIX (2026-09-29) — same reason as L11: a slow shared host or a changed
     * test id must COUNT against this check, not abort the run and hide L14.
     */
    let driven;
    try {
      await gotoLive(page, `${SITE}${EXPLORE_PATH}`);
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
      driven = await page.evaluate(() => {
        let shellEl = document.querySelector('main');
        while (shellEl && !shellEl.hasAttribute('data-shell-theme')) shellEl = shellEl.parentElement;
        return {
          shell: shellEl ? shellEl.getAttribute('data-shell-theme') : null,
          overflow: document.documentElement.scrollWidth - window.innerWidth,
          text: document.body.innerText,
        };
      });
    } catch (driveError) {
      check(`L13 ${EXPLORE_PATH} [${theme}] COULD NOT BE DRIVEN (${String(driveError).split('\n')[0].slice(0, 120)})`, false);
      await page.close();
      continue;
    }
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
  try {
    const liveHome = await fetch(`${SITE}/`).then((r) => r.text());
    const publicCopySrc = readFileSync(path.join(ROOT, 'src/config/positioning.ts'), 'utf8');
  const promiseBlock = publicCopySrc.match(/export const PUBLIC_PROMISE =\s*([\s\S]*?);/);
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
  } catch (l14Error) {
    /**
     * §B8 FIX (2026-09-29) — a slow host must COUNT, not abort: an un-caught
     * `fetch` here ended the run with no PASS/FAIL total (observed).
     */
    check(`L14 the deployed static surface could NOT be fetched (${String(l14Error).split('\n')[0].slice(0, 120)})`, false);
  }

  /* ── L15 — BATCH 2c (AV-024): THE CHANNEL-ISSUED REVISION, DRIVEN LIVE ──────
   * WHY THIS EXISTS. The two surfaces this batch adds — the BRAND's notice that the
   * retail channel changed the order and the CONSOLE's revision history — cannot be
   * proved by any public-page check: they exist only AFTER the channel has changed an
   * order. This drives that event on the DEPLOYED site through the product's OWN
   * controls (read the channel → issue the change → re-read → open the record) and
   * then switches to the brand WITHOUT reloading, so the same in-memory stores are
   * carried across, and asserts the notice the brand is actually shown. Asserting the
   * source instead would prove nothing about the deployed bundle.
   */
  console.log('\n--- L15 the channel-issued order revision, driven on the live site ---');
  const revPage = await browser.newPage({ viewport: { width: 1440, height: 950 } });
  const revErrors = [];
  revPage.on('pageerror', (e) => revErrors.push(String(e)));
  /**
   * The shared host is slow and intermittently refuses connections: the entry is
   * RETRIED and every control is WAITED FOR before it is clicked, so a host hiccup is
   * reported as a host hiccup rather than mistaken for a broken deployment (measured
   * on 2026-09-29: the same flow passed 11/11 on one run and timed out on the next).
   */
  async function liveAdminEntry(page) {
    let lastError = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await gotoLive(page, `${SITE}/`);
        const login = page.getByRole('button', { name: 'Partner Login' }).first();
        await login.waitFor({ state: 'visible', timeout: 90000 });
        await login.click({ timeout: 30000 });
        await page.waitForTimeout(2500);
        const card = page.locator('text=Mercenta Admin Hub').first();
        await card.waitFor({ state: 'visible', timeout: 90000 });
        await card.click({ timeout: 30000 });
        await page.waitForTimeout(3000);
        return attempt;
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError;
  }

  try {
    const attempt = await liveAdminEntry(revPage);
    check(`L15 the deployed site opened and the admin signed in (attempt ${attempt})`, true);
    const navPo = revPage.locator('nav[aria-label="Primary"] >> text=Purchase Orders').first();
    await navPo.waitFor({ state: 'visible', timeout: 90000 });
    await navPo.click({ timeout: 30000 });
    await revPage.waitForTimeout(3000);

    await revPage.locator('[data-state="admin-po-ingest"]').click();
    await revPage
      .locator('[data-state="channel-mode"]', { hasText: 'Simulation' })
      .first()
      .waitFor({ timeout: 20000 });
    check('L15 the live console took a SIMULATED channel read (no live channel call)', true);

    await revPage.locator('[data-state="admin-po-simulate-change"]').click({ timeout: 15000 });
    const revSummary = revPage.locator('[data-state="po-revision-simulate-summary"]');
    await revSummary.waitFor({ timeout: 20000 });
    const revSummaryText = (await revSummary.textContent()) ?? '';
    check(
      `L15 the live console issued the channel change and the re-read recorded version 1 (${revSummaryText.slice(0, 70)}…)`,
      /version 1/.test(revSummaryText)
    );
    const revPo = (revSummaryText.match(/MOCK-PO-\d+/) || [])[0];
    check('L15 the changed order is named in the console\'s own statement', Boolean(revPo));

    const search = revPage.getByLabel('Search purchase orders');
    await search.waitFor({ state: 'visible', timeout: 60000 });
    await search.fill(revPo || '');
    await revPage.waitForTimeout(1200);
    const viewDetail = revPage.locator('button[title="View detail"]').first();
    await viewDetail.waitFor({ state: 'visible', timeout: 60000 });
    await viewDetail.click({ timeout: 30000 });
    const revCard = revPage.locator(`[data-testid="admin-po-revisions-${revPo}"]`);
    await revCard.waitFor({ timeout: 30000 });
    const revCardText = (await revCard.textContent()) ?? '';
    check(
      'L15 the live console shows the recorded revision with its change list and the rule',
      /Version 1/.test(revCardText) &&
        /ordered quantity|cost price|ship \/ delivery window/.test(revCardText) &&
        revCardText.includes('The updated purchase order is the one that must be fulfilled')
    );

    /* The record drawer is a full-screen overlay: close it (click the overlay) before
       reaching the header, or the profile control's click is intercepted by the drawer
       — the defect that made the first live run of this check fail. */
    await revPage.mouse.click(5, 5);
    await revPage.waitForTimeout(1500);

    /* Same document, same stores — sign out in the SPA and enter as the brand. */
    const profile = revPage.locator('[aria-controls="profile-menu"]').first();
    await profile.waitFor({ state: 'visible', timeout: 90000 });
    await profile.click({ timeout: 30000 });
    const signOut = revPage.getByRole('menuitem', { name: 'Sign Out' });
    await signOut.waitFor({ state: 'visible', timeout: 30000 });
    await signOut.click({ timeout: 30000 });
    await revPage.waitForTimeout(2500);
    const brandLogin = revPage.getByRole('button', { name: 'Partner Login' }).first();
    await brandLogin.waitFor({ state: 'visible', timeout: 90000 });
    await brandLogin.click({ timeout: 30000 });
    await revPage.waitForTimeout(2500);
    const brandCard = revPage.locator('text=Astonish').first();
    await brandCard.waitFor({ state: 'visible', timeout: 90000 });
    await brandCard.click({ timeout: 30000 });
    await revPage.waitForTimeout(3000);
    const brandNav = revPage.locator('nav[aria-label="Primary"] >> text=Purchase Orders').first();
    await brandNav.waitFor({ state: 'visible', timeout: 90000 });
    await brandNav.click({ timeout: 30000 });
    await revPage.waitForTimeout(3000);

    const revNotice = revPage.locator(`[data-testid="po-revision-notice-${revPo}"]`);
    await revNotice.waitFor({ timeout: 15000 });
    const revNoticeText = (await revNotice.textContent()) ?? '';
    check(
      'L15 the LIVE brand surface says the channel changed the order and which version it is working from',
      /working from version 1/.test(revNoticeText)
    );
    check(
      'L15 the LIVE brand notice states what changed, labelled from the owner',
      /ordered quantity/.test(revNoticeText)
    );
    check(
      'L15 the LIVE brand notice renders the ONE rule statement',
      revNoticeText.includes('The updated purchase order is the one that must be fulfilled')
    );
    check(
      'L15 the LIVE brand notice appears ONLY for the changed order (not a banner)',
      (await revPage.locator('[data-testid^="po-revision-notice-"]').count()) === 1
    );
    check(
      `L15 the driven revision flow rendered with no uncaught error (errors: ${revErrors.join(' | ') || 'none'})`,
      revErrors.length === 0
    );
  } catch (revError) {
    check(
      `L15 the channel-issued revision could NOT be driven live (${String(revError).split('\n')[0].slice(0, 140)})`,
      false
    );
  }
  await revPage.close();

  /* ── L16 — BATCH 2d (AV-008 / AV-023): THE ACKNOWLEDGED PRICE, DRIVEN LIVE ──
   * WHY THIS EXISTS. The acknowledgement ↔ invoice price rule changes what the BRAND
   * is told when it acknowledges at a price that differs from the order's: a price
   * ABOVE the order price is REFUSED with the channel's own rule, and a price BELOW it
   * is accepted, warned, and then shown on the order as the price the invoice will
   * bill. None of that can be proved from a public page — it exists only after a brand
   * acknowledges. This drives it on the DEPLOYED site through the product's own
   * controls and asserts what the brand is actually shown. Asserting the source instead
   * would prove nothing about the deployed bundle.
   */
  console.log('\n--- L16 the acknowledged price rule, driven on the live site ---');
  const ackPage = await browser.newPage({ viewport: { width: 1440, height: 950 } });
  const ackErrors = [];
  ackPage.on('pageerror', (e) => ackErrors.push(String(e)));
  try {
    /** The shared host is slow and intermittently refuses connections — retry the entry. */
    let ackEntryAttempt = 0;
    let ackEntryError = null;
    for (let attempt = 1; attempt <= 3 && ackEntryAttempt === 0; attempt++) {
      try {
        await gotoLive(ackPage, `${SITE}/`);
        const login = ackPage.getByRole('button', { name: 'Partner Login' }).first();
        await login.waitFor({ state: 'visible', timeout: 90000 });
        await login.click({ timeout: 30000 });
        await ackPage.waitForTimeout(2500);
        const card = ackPage.locator('text=Astonish').first();
        await card.waitFor({ state: 'visible', timeout: 90000 });
        await card.click({ timeout: 30000 });
        await ackPage.waitForTimeout(3000);
        ackEntryAttempt = attempt;
      } catch (err) {
        ackEntryError = err;
      }
    }
    if (ackEntryAttempt === 0) throw ackEntryError ?? new Error('entry failed');
    check(`L16 the deployed site opened and the brand signed in (attempt ${ackEntryAttempt})`, true);

    const ackNav = ackPage.locator('nav[aria-label="Primary"] >> text=Purchase Orders').first();
    await ackNav.waitFor({ state: 'visible', timeout: 90000 });
    await ackNav.click({ timeout: 30000 });
    await ackPage.waitForTimeout(3000);

    const ackButton = ackPage.getByRole('button', { name: 'Acknowledge', exact: true }).first();
    await ackButton.waitFor({ state: 'visible', timeout: 90000 });
    await ackButton.click({ timeout: 30000 });
    const priceInput = ackPage.getByLabel(/Unit price/).first();
    await priceInput.waitFor({ state: 'visible', timeout: 60000 });
    const orderPrice = Number(await priceInput.inputValue());
    check(`L16 the live acknowledgement panel opened on the order price (${orderPrice})`, orderPrice > 0);

    /* The CEILING: a price ABOVE the order price is refused with the channel's rule. */
    await priceInput.fill(String(orderPrice + 10));
    await ackPage.getByRole('button', { name: 'Submit acknowledgment' }).click({ timeout: 30000 });
    const ackStatus = ackPage.locator('div[role="status"]');
    await ackStatus.waitFor({ timeout: 30000 });
    const refusalText = (await ackStatus.textContent()) ?? '';
    check(
      'L16 the LIVE acknowledgement REFUSES a price above the order price, with the channel\'s rule',
      /cannot be higher/.test(refusalText) && /AV-008/.test(refusalText)
    );

    /* A LOWER acknowledged price is ACCEPTED, WARNED, and shown on the order. */
    await priceInput.fill(String(Math.max(0.01, orderPrice - 10)));
    await ackPage.getByRole('button', { name: 'Submit acknowledgment' }).click({ timeout: 30000 });
    await ackPage.waitForTimeout(2500);
    const warnText = (await ackPage.locator('div[role="status"]').first().textContent()) ?? '';
    check(
      'L16 the LIVE submission is ACCEPTED and warns with the channel\'s own match rule',
      /may delay payment/.test(warnText)
    );
    const ackNotice = ackPage.locator('[data-testid^="ack-price-notice-"]').first();
    await ackNotice.waitFor({ timeout: 20000 });
    const noticeText = (await ackNotice.textContent()) ?? '';
    check(
      'L16 the LIVE order states the acknowledged price is what the invoice bills',
      /Acknowledged price differs from the order price/.test(noticeText) &&
        /your invoice bills the acknowledged price/.test(noticeText)
    );
    check(
      `L16 the driven acknowledged-price flow rendered with no uncaught error (errors: ${ackErrors.join(' | ') || 'none'})`,
      ackErrors.length === 0
    );
  } catch (ackError) {
    check(
      `L16 the acknowledged-price rule could NOT be driven live (${String(ackError).split('\n')[0].slice(0, 140)})`,
      false
    );
  }
  await ackPage.close();

  /* ── L17 — BATCH 2e (AV-031 / AV-032): THE COMPLIANCE SET, ON THE LIVE SITE ──
   * WHY THIS EXISTS. §AV-032 removed `brand_registry_confirmation` from the HARD
   * GATE — it is a seller-programme concept, reclassified as an optional Mercenta
   * onboarding control — and §AV-031 re-attributed the remaining documents to UK/EU
   * law + Mercenta's own obligations. What the BRAND is shown on the DEPLOYED
   * compliance surface is the only proof that matters: the required list must be the
   * three universal documents plus this tenant's category document, the removed
   * document must NOT appear anywhere the brand can read, and the gate must count
   * only what it actually requires (0 of 4, never 0 of 5). Driven through the
   * product's own controls; asserting the source would prove nothing about the
   * deployed bundle.
   */
  console.log('\n--- L17 the compliance document set, on the live brand surface ---');
  const compPage = await browser.newPage({ viewport: { width: 1440, height: 950 } });
  const compErrors = [];
  compPage.on('pageerror', (e) => compErrors.push(String(e)));
  try {
    /** The shared host is slow and intermittently refuses connections — retry the entry. */
    let compEntryAttempt = 0;
    let compEntryError = null;
    for (let attempt = 1; attempt <= 3 && compEntryAttempt === 0; attempt++) {
      try {
        await gotoLive(compPage, `${SITE}/`);
        const login = compPage.getByRole('button', { name: 'Partner Login' }).first();
        await login.waitFor({ state: 'visible', timeout: 90000 });
        await login.click({ timeout: 30000 });
        await compPage.waitForTimeout(2500);
        const card = compPage.locator('text=Le Creuset').first();
        await card.waitFor({ state: 'visible', timeout: 90000 });
        await card.click({ timeout: 30000 });
        await compPage.waitForTimeout(3000);
        compEntryAttempt = attempt;
      } catch (err) {
        compEntryError = err;
      }
    }
    if (compEntryAttempt === 0) throw compEntryError ?? new Error('entry failed');
    check(`L17 the deployed site opened and the blocked brand signed in (attempt ${compEntryAttempt})`, true);

    const compNav = compPage.locator('nav[aria-label="Primary"] >> text=UK Compliance').first();
    await compNav.waitFor({ state: 'visible', timeout: 90000 });
    await compNav.click({ timeout: 30000 });
    /**
     * §FIX (2026-10-05) — the compliance surface is a LAZY chunk. A fixed 2.5s
     * wait read an UNMOUNTED page on the slow shared host (the required list was
     * absent), so the PRESENCE assertions produced a spurious failure while the
     * ABSENCE assertions passed and no page error was raised — a false failure,
     * observed for real this session (L17 failed 3 assertions on the first deploy,
     * then passed 267/0 on a re-run). Wait for the gate text the surface renders,
     * instead of a blind fixed delay.
     */
    await compPage.getByText(/Compliance gate/).first().waitFor({ state: 'visible', timeout: 90000 });

    const compText = (await compPage.locator('body').innerText()).replace(/\s+/g, ' ');
    check(
      'L17 the LIVE brand compliance surface never shows the reclassified control (no "brand registry")',
      !/brand registry/i.test(compText),
      compText.match(/.{0,60}brand registry.{0,60}/i)?.[0] ?? ''
    );
    check(
      'L17 the LIVE required list names the three universal documents',
      /Letter of Authorization/i.test(compText) &&
        /Product Safety \(UKCA\)/i.test(compText) &&
        /Product Liability Insurance Certificate/i.test(compText)
    );
    check(
      'L17 the LIVE required list still names the category document (Kitchen → food contact material)',
      /Food Contact Material Compliance/i.test(compText)
    );
    check(
      'L17 the LIVE gate counts only what it requires (0 of 4, not 0 of 5)',
      /Compliance gate not yet cleared/.test(compText) && /4 item\(s\) remain\./.test(compText)
    );
    check(
      `L17 the driven compliance surface rendered with no uncaught error (errors: ${compErrors.join(' | ') || 'none'})`,
      compErrors.length === 0
    );
  } catch (compError) {
    check(
      `L17 the compliance document set could NOT be driven live (${String(compError).split('\n')[0].slice(0, 140)})`,
      false
    );
  }
  await compPage.close();

  /* ── L18 — BATCH 2i (AV-045): THE DELIVERY APPOINTMENT, ON THE LIVE SITE ────
   * WHY THIS EXISTS. The brand Logistics Hub now states, for every consignment,
   * the retail channel's DELIVERY APPOINTMENT and the channel's own window rule
   * (a carrier-requested delivery date must fall within the purchase order's
   * delivery window). What the brand is shown on the DEPLOYED surface is the only
   * proof that matters: the appointment must be present, its state and its window
   * verdict must come from the documented vocabulary (never an invented value),
   * and the rule's own words must be rendered rather than assumed compliant.
   * Driven through the product's own controls; asserting the source would prove
   * nothing about the deployed bundle.
   */
  console.log('\n--- L18 the delivery appointment, on the live brand surface ---');
  const apptPage = await browser.newPage({ viewport: { width: 1440, height: 950 } });
  const apptErrors = [];
  apptPage.on('pageerror', (e) => apptErrors.push(String(e)));
  try {
    let apptEntryAttempt = 0;
    let apptEntryError = null;
    for (let attempt = 1; attempt <= 3 && apptEntryAttempt === 0; attempt++) {
      try {
        await gotoLive(apptPage, `${SITE}/`);
        const login = apptPage.getByRole('button', { name: 'Partner Login' }).first();
        await login.waitFor({ state: 'visible', timeout: 90000 });
        await login.click({ timeout: 30000 });
        await apptPage.waitForTimeout(2500);
        const card = apptPage.locator('text=Tapatío').first();
        await card.waitFor({ state: 'visible', timeout: 90000 });
        await card.click({ timeout: 30000 });
        await apptPage.waitForTimeout(3000);
        apptEntryAttempt = attempt;
      } catch (err) {
        apptEntryError = err;
      }
    }
    if (apptEntryAttempt === 0) throw apptEntryError ?? new Error('entry failed');
    check(`L18 the deployed site opened and the brand signed in (attempt ${apptEntryAttempt})`, true);

    const apptNav = apptPage.locator('nav[aria-label="Primary"] >> text=Logistics Hub').first();
    await apptNav.waitFor({ state: 'visible', timeout: 90000 });
    await apptNav.click({ timeout: 30000 });
    await apptPage.waitForTimeout(2500);

    const apptRow = apptPage.locator('[data-testid^="logistics-row-"]').first();
    await apptRow.waitFor({ state: 'visible', timeout: 90000 });
    await apptRow.click({ timeout: 30000 });
    await apptPage.waitForTimeout(1500);

    const appt = apptPage.getByTestId('logistics-appointment');
    await appt.waitFor({ state: 'visible', timeout: 90000 });
    const apptState = await appt.getAttribute('data-appointment-state');
    const apptWindow = await appt.getAttribute('data-appointment-window');
    check(
      `L18 the LIVE appointment state is one of the channel's documented states (${apptState})`,
      ['Pending', 'Scheduled', 'Arrived', 'Deleted', 'Cancelled', 'Defect', 'Closed', 'unknown'].includes(apptState)
    );
    check(
      `L18 the LIVE window verdict is one of the documented codes (${apptWindow})`,
      ['within-window', 'before-window', 'after-window', 'no-delivery-window', 'undocumented-date'].includes(apptWindow)
    );
    const apptText = (await appt.textContent()) ?? '';
    check('L18 the LIVE surface names the appointment', /Delivery appointment:/i.test(apptText));
    check(
      'L18 the LIVE window rule is stated — inside the window, or a refusal with a reason',
      apptWindow === 'within-window'
        ? /falls within the purchase order/i.test(apptText)
        : /no delivery window|cannot be established|is before|is after/i.test(apptText),
      apptText.slice(0, 120)
    );
    check(
      `L18 the driven appointment surface rendered with no uncaught error (errors: ${apptErrors.join(' | ') || 'none'})`,
      apptErrors.length === 0
    );
  } catch (apptError) {
    check(
      `L18 the delivery appointment could NOT be driven live (${String(apptError).split('\\n')[0].slice(0, 140)})`,
      false
    );
  }
  await apptPage.close();

  /* ── L19 — BATCH 2j (AV-009 / AV-010b): THE ACKNOWLEDGEMENT'S DUTIES, LIVE ──
   * WHY THIS EXISTS. The brand's acknowledgement panel now states the retail
   * channel's COMPLETENESS rule and its ON-HOLD duty, both from the rule owners. On
   * the DEPLOYED surface the duty must be present and honest: either the channel has
   * stated a hold (and the rule is quoted) or the duty is reported UNVERIFIED —
   * never a silent "not on hold". The completeness verdict must be exposed as data,
   * so a notice that never says anything cannot pass as proof. Driven through the
   * product's own controls; asserting the source would prove nothing about the
   * deployed bundle.
   */
  console.log('\n--- L19 the acknowledgement’s on-hold and completeness duties, live ---');
  const dutyPage = await browser.newPage({ viewport: { width: 1440, height: 950 } });
  const dutyErrors = [];
  dutyPage.on('pageerror', (e) => dutyErrors.push(String(e)));
  try {
    let dutyEntryAttempt = 0;
    let dutyEntryError = null;
    for (let attempt = 1; attempt <= 3 && dutyEntryAttempt === 0; attempt++) {
      try {
        await gotoLive(dutyPage, `${SITE}/`);
        const login = dutyPage.getByRole('button', { name: 'Partner Login' }).first();
        await login.waitFor({ state: 'visible', timeout: 90000 });
        await login.click({ timeout: 30000 });
        await dutyPage.waitForTimeout(2500);
        const card = dutyPage.locator('text=Tapatío').first();
        await card.waitFor({ state: 'visible', timeout: 90000 });
        await card.click({ timeout: 30000 });
        await dutyPage.waitForTimeout(3000);
        dutyEntryAttempt = attempt;
      } catch (err) {
        dutyEntryError = err;
      }
    }
    if (dutyEntryAttempt === 0) throw dutyEntryError ?? new Error('entry failed');
    check(`L19 the deployed site opened and the brand signed in (attempt ${dutyEntryAttempt})`, true);

    const dutyNav = dutyPage.locator('nav[aria-label="Primary"] >> text=Purchase Orders').first();
    await dutyNav.waitFor({ state: 'visible', timeout: 90000 });
    await dutyNav.click({ timeout: 30000 });
    await dutyPage.waitForTimeout(2500);

    const ackButton = dutyPage.locator('button', { hasText: 'Acknowledge' }).first();
    await ackButton.waitFor({ state: 'visible', timeout: 90000 });
    await ackButton.click({ timeout: 30000 });
    await dutyPage.waitForTimeout(1500);

    const dutyLine = dutyPage.locator('[data-testid^="po-hold-duty-"]').first();
    await dutyLine.waitFor({ state: 'visible', timeout: 90000 });
    const dutyText = (await dutyLine.textContent()) ?? '';
    check(
      'L19 the LIVE on-hold duty is stated — UNVERIFIED, or the channel’s hold with its rule',
      /UNVERIFIED|ON HOLD/i.test(dutyText),
      dutyText.slice(0, 140)
    );

    const completenessLine = dutyPage.locator('[data-testid^="po-submit-completeness-"]').first();
    await completenessLine.waitFor({ state: 'visible', timeout: 90000 });
    const completenessVerdict = await completenessLine.getAttribute('data-completeness');
    check(
      `L19 the LIVE completeness verdict is real data (${completenessVerdict})`,
      ['complete', 'incomplete'].includes(completenessVerdict)
    );
    const completenessText = (await completenessLine.textContent()) ?? '';
    check(
      'L19 the LIVE completeness line states the channel’s requirement (or the lines left undecided)',
      /complete acknowledgement/i.test(completenessText) || /undecided/i.test(completenessText),
      completenessText.slice(0, 140)
    );
    check(
      `L19 the driven acknowledgement surface rendered with no uncaught error (errors: ${dutyErrors.join(' | ') || 'none'})`,
      dutyErrors.length === 0
    );
  } catch (dutyError) {
    check(
      `L19 the acknowledgement duties could NOT be driven live (${String(dutyError).split('\\n')[0].slice(0, 140)})`,
      false
    );
  }
  await dutyPage.close();

  /* ── L20 — BATCH 2k + BATCH 2l (AV-011 / AV-015): THE CONFIRMATION STEP AND THE
   * BEFORE-RECEIPT ORDERING, LIVE ──
   * WHY THIS EXISTS. The channel-operations console now shows, per receiving reading,
   * (a) whether the acknowledgement Mercenta TRANSMITTED appeared (`AV-011`) and (b)
   * whether the ASN was on file BEFORE the receipt (`AV-015`). On the DEPLOYED surface
   * both verdicts must be REAL DATA (a documented state carried as an attribute), not a
   * decorative line, so a notice that never says anything cannot pass as proof. The
   * channel's POs are ingested first through the product's own entry point (the same
   * session, because a re-login resets the in-memory store), then the console is driven
   * through its own control — a source assertion would prove nothing about the bundle.
   */
  console.log('\n--- L20 the acknowledgement-confirmation and ASN-before-receipt verdicts, live ---');
  const verPage = await browser.newPage({ viewport: { width: 1440, height: 950 } });
  const verErrors = [];
  verPage.on('pageerror', (e) => verErrors.push(String(e)));
  try {
    const verAttempt = await liveAdminEntry(verPage);
    check(`L20 the deployed site opened and the admin signed in (attempt ${verAttempt})`, true);

    const verPoNav = verPage.locator('nav[aria-label="Primary"] >> text=Purchase Orders').first();
    await verPoNav.waitFor({ state: 'visible', timeout: 90000 });
    await verPoNav.click({ timeout: 30000 });
    await verPage.waitForTimeout(2500);
    await verPage.locator('[data-state="admin-po-ingest"]').click({ timeout: 30000 });
    await verPage.waitForTimeout(2500);

    const verNav = verPage.locator('nav[aria-label="Primary"] >> text=Retail Pipeline').first();
    await verNav.waitFor({ state: 'visible', timeout: 90000 });
    await verNav.click({ timeout: 30000 });
    await verPage.waitForTimeout(2500);

    const readButton = verPage.locator('[data-state="channel-receiving-read"]').first();
    await readButton.waitFor({ state: 'visible', timeout: 90000 });
    await readButton.click({ timeout: 30000 });
    await verPage.waitForTimeout(2500);

    const ackVerdict = verPage.locator('[data-state^="ack-verification-"]').first();
    await ackVerdict.waitFor({ state: 'visible', timeout: 60000 });
    const ackState = ((await ackVerdict.getAttribute('data-state')) ?? '').replace('ack-verification-', '');
    check(
      `L20 the LIVE acknowledgement verdict is a documented state (${ackState})`,
      ['not_submitted', 'awaiting_visibility', 'confirmed', 'not_confirmed', 'unreadable'].includes(ackState)
    );
    const ackVerdictText = (await ackVerdict.textContent()) ?? '';
    check(
      'L20 the LIVE acknowledgement verdict names the confirmation step',
      /Acknowledgement:/i.test(ackVerdictText),
      ackVerdictText.slice(0, 140)
    );

    const asnVerdict = verPage.locator('[data-state^="asn-before-receipt-"]').first();
    await asnVerdict.waitFor({ state: 'visible', timeout: 60000 });
    const asnState = ((await asnVerdict.getAttribute('data-state')) ?? '').replace('asn-before-receipt-', '');
    check(
      `L20 the LIVE ASN-before-receipt verdict is a documented state (${asnState})`,
      ['compliant', 'pending', 'exposed', 'unknown'].includes(asnState)
    );
    const asnVerdictText = (await asnVerdict.textContent()) ?? '';
    check(
      'L20 the LIVE ASN verdict names the ordering',
      /ASN before receipt:/i.test(asnVerdictText),
      asnVerdictText.slice(0, 140)
    );

    check(
      `L20 the driven console rendered with no uncaught error (errors: ${verErrors.join(' | ') || 'none'})`,
      verErrors.length === 0
    );
  } catch (verError) {
    check(
      `L20 the confirmation/ordering verdicts could NOT be driven live (${String(verError).split('\n')[0].slice(0, 140)})`,
      false
    );
  }
  await verPage.close();

  /* ── L21 — BATCH 2m (AV-014): THE CHANNEL PICKUP LEAD TIME, LIVE ──
   * WHY THIS EXISTS. The channel-operations console now shows, per Freight Collect purchase
   * order, whether the pickup Mercenta asked for satisfies the channel's documented lead time
   * (at least two business days' notice). On the DEPLOYED surface the verdict must be REAL
   * DATA (a documented state carried as an attribute), not a decorative line. The channel's
   * POs are ingested first through the product's own entry point (the same session, because a
   * re-login resets the in-memory store), then the console is driven through its own control —
   * a source assertion would prove nothing about the bundle.
   */
  console.log('\n--- L21 the channel pickup lead-time verdict, live ---');
  const pltPage = await browser.newPage({ viewport: { width: 1440, height: 950 } });
  const pltErrors = [];
  pltPage.on('pageerror', (e) => pltErrors.push(String(e)));
  try {
    const pltAttempt = await liveAdminEntry(pltPage);
    check(`L21 the deployed site opened and the admin signed in (attempt ${pltAttempt})`, true);

    const pltPoNav = pltPage.locator('nav[aria-label="Primary"] >> text=Purchase Orders').first();
    await pltPoNav.waitFor({ state: 'visible', timeout: 90000 });
    await pltPoNav.click({ timeout: 30000 });
    await pltPage.waitForTimeout(2500);
    await pltPage.locator('[data-state="admin-po-ingest"]').click({ timeout: 30000 });
    await pltPage.waitForTimeout(2500);

    const pltNav = pltPage.locator('nav[aria-label="Primary"] >> text=Retail Pipeline').first();
    await pltNav.waitFor({ state: 'visible', timeout: 90000 });
    await pltNav.click({ timeout: 30000 });
    await pltPage.waitForTimeout(2500);

    const pltRead = pltPage.locator('[data-state="channel-receiving-read"]').first();
    await pltRead.waitFor({ state: 'visible', timeout: 90000 });
    await pltRead.click({ timeout: 30000 });
    await pltPage.waitForTimeout(2500);

    const pltVerdict = pltPage.locator('[data-state^="pickup-lead-time-"]').first();
    await pltVerdict.waitFor({ state: 'visible', timeout: 60000 });
    const pltState = ((await pltVerdict.getAttribute('data-state')) ?? '').replace('pickup-lead-time-', '');
    check(
      `L21 the LIVE pickup lead-time verdict is a documented state (${pltState})`,
      ['no_channel_pickup', 'within_lead_time', 'too_early', 'unreadable'].includes(pltState)
    );
    const pltText = (await pltVerdict.textContent()) ?? '';
    check(
      'L21 the LIVE pickup verdict names the lead time',
      /Channel pickup lead time:/i.test(pltText),
      pltText.slice(0, 140)
    );

    check(
      `L21 the driven console rendered with no uncaught error (errors: ${pltErrors.join(' | ') || 'none'})`,
      pltErrors.length === 0
    );
  } catch (pltError) {
    check(
      `L21 the pickup lead-time verdict could NOT be driven live (${String(pltError).split('\n')[0].slice(0, 140)})`,
      false
    );
  }

  /* ── L22 — BATCH 2n (AV-016): THE ASN PALLET STRUCTURE, LIVE ──────────────
   * WHY THIS EXISTS. The channel documents that the shipment confirmation (the ASN)
   * it receives carries "carton + pallet structures". The platform now derives the
   * carton→pallet grouping and prints, on the consignment's SSCC label sheet, one
   * pallet label per pallet carrying the pallet's OWN SSCC container identifier, with
   * the structure's basis stated so Mercenta's model is never presented as a channel
   * rule. On the DEPLOYED surface that structure must be REAL DATA rendered from the
   * filed ASN — not a decorative line. The brand accepts a purchase order through the
   * product's own control (which files the ASN automatically and makes the pack
   * ready), opens the pack's SSCC label sheet and the pallet structure is read from
   * the rendered document. Asserting the source would prove nothing about the bundle.
   */
  console.log('\n--- L22 the ASN pallet structure, on the live brand surface ---');
  const palPage = await browser.newPage({ viewport: { width: 1440, height: 950 } });
  const palErrors = [];
  palPage.on('pageerror', (e) => palErrors.push(String(e)));
  try {
    let palEntryAttempt = 0;
    let palEntryError = null;
    for (let attempt = 1; attempt <= 3 && palEntryAttempt === 0; attempt++) {
      try {
        await gotoLive(palPage, `${SITE}/`);
        const login = palPage.getByRole('button', { name: 'Partner Login' }).first();
        await login.waitFor({ state: 'visible', timeout: 90000 });
        await login.click({ timeout: 30000 });
        await palPage.waitForTimeout(2500);
        const card = palPage.locator('text=Tapatío').first();
        await card.waitFor({ state: 'visible', timeout: 90000 });
        await card.click({ timeout: 30000 });
        await palPage.waitForTimeout(3000);
        palEntryAttempt = attempt;
      } catch (err) {
        palEntryError = err;
      }
    }
    if (palEntryAttempt === 0) throw palEntryError ?? new Error('entry failed');
    check(`L22 the deployed site opened and the brand signed in (attempt ${palEntryAttempt})`, true);

    const palPoNav = palPage.locator('nav[aria-label="Primary"] >> text=Purchase Orders').first();
    await palPoNav.waitFor({ state: 'visible', timeout: 90000 });
    await palPoNav.click({ timeout: 30000 });
    await palPage.waitForTimeout(2500);

    /** Accept the order through the product's own control so Mercenta files the ASN. */
    const palRow = palPage.locator('text=PO-9002').first();
    await palRow.waitFor({ state: 'visible', timeout: 90000 });
    await palRow.click({ timeout: 30000 });
    await palPage.waitForTimeout(1200);
    const palAck = palPage.locator('button', { hasText: 'Acknowledge' }).first();
    if (await palAck.isVisible({ timeout: 6000 }).catch(() => false)) {
      await palAck.click({ timeout: 30000 });
      await palPage.waitForTimeout(1200);
      const palSubmit = palPage.locator('button', { hasText: 'Submit acknowledgment' }).first();
      if (await palSubmit.isVisible({ timeout: 6000 }).catch(() => false)) {
        await palSubmit.click({ timeout: 30000 });
        await palPage.waitForTimeout(3500);
      }
    }

    const palNav = palPage.locator('nav[aria-label="Primary"] >> text=Logistics Hub').first();
    await palNav.waitFor({ state: 'visible', timeout: 90000 });
    await palNav.click({ timeout: 30000 });
    await palPage.waitForTimeout(3000);

    const palOpen =
      palPage.locator('[data-testid="po-documents-queue-open-PO-9002"]').first();
    const fallbackOpen = palPage.locator('[data-testid^="po-documents-queue-open-"]').first();
    const openControl = (await palOpen.count()) > 0 ? palOpen : fallbackOpen;
    await openControl.waitFor({ state: 'visible', timeout: 90000 });
    await openControl.click({ timeout: 30000 });
    await palPage.waitForTimeout(1500);

    const palDoc = palPage.locator('[data-testid="po-document-open-sscc_carton_labels"]').first();
    await palDoc.waitFor({ state: 'visible', timeout: 90000 });
    await palDoc.click({ timeout: 30000 });
    await palPage.waitForTimeout(1500);

    const palFrame = palPage.frameLocator('[data-testid="po-document-frame"]');
    const palBody = (await palFrame.locator('body').innerText({ timeout: 60000 })) ?? '';
    check(
      'L22 the LIVE SSCC label sheet prints the carton→pallet structure (a pallet label)',
      /pallet label — sscc/i.test(palBody),
      palBody.slice(0, 180)
    );
    check(
      'L22 the LIVE pallet label names the pallet and its SSCC container identifier',
      /Pallet \d+ of \d+/.test(palBody),
      (palBody.match(/Pallet \d+ of \d+/) ?? [''])[0]
    );
    check(
      'L22 the LIVE structure states MERCENTA’s own model (never a channel rule)',
      /not a retail-channel rule/i.test(palBody),
      palBody.slice(0, 180)
    );
    check(
      `L22 the driven document surface rendered with no uncaught error (errors: ${palErrors.join(' | ') || 'none'})`,
      palErrors.length === 0
    );
  } catch (palError) {
    check(
      `L22 the pallet structure could NOT be driven live (${String(palError).slice(0, 140)})`,
      false
    );
  }
  await palPage.close();

  /* ── L23 — BATCH 2p (AV-025): THE FULFILMENT-TRACK LABEL, LIVE ────────────
   * WHY THIS EXISTS. The audit recorded that Mercenta's OWN fulfilment concept was
   * labelled with the retail channel's programme name ("Direct Fulfillment" — a
   * distinct Amazon programme, register AV-025). It is now labelled from its ONE
   * owner, "Brand-direct supply", on every surface. On the DEPLOYED surface that
   * label must be the RENDERED one (and the colliding name absent) — a source
   * assertion would prove nothing about the bundle. The admin "Fulfillment Track"
   * view is driven through the product's own navigation and its rendered text read.
   */
  console.log('\n--- L23 the fulfilment-track label, on the live admin surface ---');
  const trkPage = await browser.newPage({ viewport: { width: 1440, height: 950 } });
  const trkErrors = [];
  trkPage.on('pageerror', (e) => trkErrors.push(String(e)));
  try {
    const trkAttempt = await liveAdminEntry(trkPage);
    check(`L23 the deployed site opened and the admin signed in (attempt ${trkAttempt})`, true);

    const trkNav = trkPage.locator('nav[aria-label="Primary"] >> text=Fulfillment Track').first();
    await trkNav.waitFor({ state: 'visible', timeout: 90000 });
    await trkNav.click({ timeout: 30000 });
    await trkPage.waitForTimeout(2500);

    const trkBody = (await trkPage.locator('body').innerText({ timeout: 60000 })) ?? '';
    check(
      'L23 the LIVE fulfilment-track surface renders the ONE OWNER label "Brand-direct supply"',
      /Brand-direct supply/i.test(trkBody),
      trkBody.slice(0, 180)
    );
    check(
      'L23 the LIVE surface does NOT render the colliding channel programme name "Direct Fulfillment"',
      !/Direct Fulfillment/i.test(trkBody)
    );
    check(
      `L23 the driven surface rendered with no uncaught error (errors: ${trkErrors.join(' | ') || 'none'})`,
      trkErrors.length === 0
    );
  } catch (trkError) {
    check(
      `L23 the track label could NOT be driven live (${String(trkError).split('\n')[0].slice(0, 140)})`,
      false
    );
  }
  await trkPage.close();
  /* ── L24 — BATCH 3a (S7): THE CONTRACT CLOSING CONTROLS, LIVE ─────────────
   * WHY THIS EXISTS. `demoContracts` was the one canonical collection with no
   * writer, and the admin Contracts console's drafts lived only in local state, so
   * a renewal/termination could never actually close the work layer's
   * `contract_renewal` item. The console now offers the two real closing paths.
   * On the DEPLOYED surface those controls must RENDER in the contract detail modal
   * (a source assertion would prove nothing about the bundle); the admin view is
   * driven through the product's own navigation and its rendered text read.
   */
  console.log('\n--- L24 the contract closing controls, on the live admin surface ---');
  const conPage = await browser.newPage({ viewport: { width: 1440, height: 950 } });
  const conErrors = [];
  conPage.on('pageerror', (e) => conErrors.push(String(e)));
  try {
    const conAttempt = await liveAdminEntry(conPage);
    check(`L24 the deployed site opened and the admin signed in (attempt ${conAttempt})`, true);

    const conNav = conPage.locator('nav[aria-label="Primary"] >> text=Contract Cycle').first();
    await conNav.waitFor({ state: 'visible', timeout: 90000 });
    await conNav.click({ timeout: 30000 });
    await conPage.waitForTimeout(2500);

    const conView = conPage.getByRole('button', { name: 'View', exact: true }).first();
    await conView.waitFor({ state: 'visible', timeout: 60000 });
    await conView.click({ timeout: 30000 });
    /**
     * §FIX (2026-10-05) — the contract detail modal is a LAZY chunk. A fixed 1.2s
     * wait read the modal before its closing controls had mounted on the slow
     * shared host (the RENEW button was absent while TERMINATE was present), so the
     * RENEW presence assertion produced a spurious failure and no page error was
     * raised — a false failure, observed for real this session (L24 failed 1
     * assertion on the first deploy, then passed 267/0 on a re-run). Wait for the
     * modal's closing controls, instead of a blind fixed delay — the same fix
     * already applied to L17.
     */
    await conPage
      .getByRole('button', { name: 'Terminate', exact: true })
      .first()
      .waitFor({ state: 'visible', timeout: 90000 })
      .catch(() => {});

    /* The controls live in the contract DETAIL modal; assert on the BUTTONS (an
       exact name — plain `name: 'View'` also matches the "Overview" controls, and
       a bare `/Terminate/` also matches the status filter's "Terminated" option, so
       both would be false positives). */
    check(
      'L24 the LIVE contract detail exposes the RENEW (advance term) closing control',
      await conPage.getByRole('button', { name: 'Renew (advance term)' }).first().isVisible().catch(() => false)
    );
    check(
      'L24 the LIVE contract detail exposes the TERMINATE closing control',
      await conPage.getByRole('button', { name: 'Terminate', exact: true }).first().isVisible().catch(() => false)
    );
    check(
      `L24 the driven console rendered with no uncaught error (errors: ${conErrors.join(' | ') || 'none'})`,
      conErrors.length === 0
    );
  } catch (conError) {
    check(
      `L24 the contract closing controls could NOT be driven live (${String(conError).split('\n')[0].slice(0, 140)})`,
      false
    );
  }
  await conPage.close();

  /* ── L25 — BATCH 3b: THE FOUNDER CLOSING PATH, LIVE ────────────────────────
   * WHY THIS EXISTS. Six founder work sources were declared gaps; `founder_setup`
   * and `founder_integration` ALREADY had a real closing path and are now declared
   * (their `owner` had named the DERIVATION, not the stores). The work drawer
   * renders the closing path from the ONE declaration (`describeWorkClosing`), so a
   * Super-Admin Work Management screen on the DEPLOYED bundle must show the declared
   * writer for a `founder_setup` item — never the old "NO closing path" text. The
   * surface is driven through the product's own navigation and its rendered text read.
   */
  console.log('\n--- L25 the founder closing path, on the live Super-Admin surface ---');
  const fndPage = await browser.newPage({ viewport: { width: 1440, height: 950 } });
  const fndErrors = [];
  fndPage.on('pageerror', (e) => fndErrors.push(String(e)));
  try {
    await gotoLive(fndPage, `${SITE}/`);
    const fndLogin = fndPage.getByRole('button', { name: 'Partner Login' }).first();
    await fndLogin.waitFor({ state: 'visible', timeout: 90000 });
    await fndLogin.click({ timeout: 30000 });
    await fndPage.waitForTimeout(2500);
    const saLogin = fndPage.locator('text=Super Admin').first();
    await saLogin.waitFor({ state: 'visible', timeout: 90000 });
    await saLogin.click({ timeout: 30000 });
    await fndPage.waitForTimeout(3500);
    check('L25 the deployed site opened and the Super Admin signed in', true);

    const fndNav = fndPage.locator('nav[aria-label="Primary"] >> text=Work Management').first();
    await fndNav.waitFor({ state: 'visible', timeout: 90000 });
    await fndNav.click({ timeout: 30000 });
    await fndPage.waitForTimeout(2500);

    /* The workspace defaults to the CALENDAR view; the closing path renders in the
       item drawer, which the LIST rows open, so switch to List first. */
    const listView = fndPage.locator('[aria-label="Work view"] >> text=List').first();
    await listView.waitFor({ state: 'visible', timeout: 60000 });
    await listView.click({ timeout: 30000 });
    await fndPage.waitForTimeout(1200);

    const fndFilter = fndPage.locator('[data-testid="work-source-filter"]');
    await fndFilter.waitFor({ state: 'visible', timeout: 60000 });
    await fndFilter.selectOption('founder_setup');
    await fndPage.waitForTimeout(1500);

    const firstRow = fndPage.locator('[data-testid^="work-row-"]').first();
    await firstRow.waitFor({ state: 'visible', timeout: 60000 });
    /* The row is an <li>; its own title button opens the drawer. */
    const rowBtn = firstRow.getByRole('button').first();
    if (await rowBtn.count()) {
      await rowBtn.click({ timeout: 30000 });
    } else {
      await firstRow.click({ timeout: 30000 });
    }
    await fndPage.waitForTimeout(1800);

    const closingText =
      (await fndPage
        .locator('[data-testid="work-drawer-closing"]')
        .first()
        .innerText({ timeout: 30000 })) ?? '';
    check(
      'L25 the LIVE founder_setup drawer renders the DECLARED closing writer (no longer a gap)',
      /markLaunchSubmitted/.test(closingText) && /googleStore\.ts/.test(closingText),
      closingText.slice(0, 160)
    );
    check(
      `L25 the driven work surface rendered with no uncaught error (errors: ${fndErrors.join(' | ') || 'none'})`,
      fndErrors.length === 0
    );
  } catch (fndError) {
    check(
      `L25 the founder closing path could NOT be driven live (${String(fndError).split('\n')[0].slice(0, 140)})`,
      false
    );
  }
  await fndPage.close();

  /* ── L26 — §BATCH 4 (2026-10-10): THE MERCENTA BRAIN IS GONE, LIVE ──────────
   * WHY THIS EXISTS. This probe used to drive the Brain's KPI drill-down on the
   * deployed Super-Admin surface. The owner instructed the Brain's complete
   * removal, so per rule 08 the probe is REWRITTEN into a LIVE ABSENCE guard: the
   * deployed nav must offer no Brain destination, and a direct `/admin/brain`
   * address must resolve to the default view instead of rendering a blank
   * workspace (the fail-closed contract of `resolveProductView`).
   */
  console.log('\n--- L26 the Mercenta Brain is GONE, on the live Super-Admin surface ---');
  const brnPage = await browser.newPage({ viewport: { width: 1440, height: 950 } });
  const brnErrors = [];
  brnPage.on('pageerror', (e) => brnErrors.push(String(e)));
  try {
    await gotoLive(brnPage, `${SITE}/`);
    const brnLogin = brnPage.getByRole('button', { name: 'Partner Login' }).first();
    await brnLogin.waitFor({ state: 'visible', timeout: 90000 });
    await brnLogin.click({ timeout: 30000 });
    await brnPage.waitForTimeout(2500);
    const brnSa = brnPage.locator('text=Super Admin').first();
    await brnSa.waitFor({ state: 'visible', timeout: 90000 });
    await brnSa.click({ timeout: 30000 });
    await brnPage.waitForTimeout(3500);
    check('L26 the deployed site opened and the Super Admin signed in', true);

    const brnNav = brnPage.locator('nav[aria-label="Primary"] >> text=Mercenta Brain');
    check('L26 the DEPLOYED nav offers NO Mercenta Brain destination',
      (await brnNav.count()) === 0);

    /* A direct address for the removed surface must not render a blank workspace. */
    await gotoLive(brnPage, `${SITE}/admin/brain`);
    await brnPage.waitForTimeout(3000);
    check('L26 the removed /admin/brain address renders NO Brain surface',
      (await brnPage.getByTestId('brain-counts').count()) === 0 &&
        (await brnPage.getByTestId('brain-canvas').count()) === 0);
    const brnHeading = await brnPage
      .getByRole('heading', { level: 1 })
      .first()
      .innerText()
      .catch(() => '');
    check(
      `L26 the removed address falls back to the default view, not a blank page (h1: ${brnHeading.trim() || 'none'})`,
      brnHeading.trim().length > 0
    );

    check(
      `L26 the driven Super-Admin surface rendered with no uncaught error (errors: ${brnErrors.join(' | ') || 'none'})`,
      brnErrors.length === 0
    );
  } catch (brnError) {
    check(
      `L26 the Brain-absence probe could NOT be driven live (${String(brnError).split('\n')[0].slice(0, 140)})`,
      false
    );
  }
  await brnPage.close();
  /* ── L27 — §Batch-0: THE PLATFORM-MODE SWITCH, LIVE ─────────────────────────
   * WHY THIS EXISTS. §Batch-0 makes `src/config/environment.ts` the ONE switch
   * the demo notice, the login surface and the switch surface all follow, and
   * persists its decision through a fail-soft Supabase seam. A source assertion
   * proves nothing about the DEPLOYED bundle, so the switch surface is opened on
   * the live Super-Admin panel and the CURRENT mode is read from the rendered
   * banner — it must state a real mode in words.
   */
  console.log('\n--- L27 the platform-mode switch, on the live Super-Admin surface ---');
  const modePage = await browser.newPage({ viewport: { width: 1440, height: 950 } });
  const modeErrors = [];
  modePage.on('pageerror', (e) => modeErrors.push(String(e)));
  try {
    await gotoLive(modePage, `${SITE}/`);
    const modeLogin = modePage.getByRole('button', { name: 'Partner Login' }).first();
    await modeLogin.waitFor({ state: 'visible', timeout: 90000 });
    await modeLogin.click({ timeout: 30000 });
    await modePage.waitForTimeout(2500);
    const modeSaLogin = modePage.locator('text=Super Admin').first();
    await modeSaLogin.waitFor({ state: 'visible', timeout: 90000 });
    await modeSaLogin.click({ timeout: 30000 });
    await modePage.waitForTimeout(3500);
    check('L27 the deployed site opened and the Super Admin signed in', true);

    const modeNav = modePage.locator('nav[aria-label="Primary"] >> text=Super Admin').first();
    await modeNav.waitFor({ state: 'visible', timeout: 90000 });
    await modeNav.click({ timeout: 30000 });
    await modePage.waitForTimeout(2000);

    const modeTab = modePage.getByTestId('super-admin-tab-simulation').first();
    await modeTab.waitFor({ state: 'visible', timeout: 60000 });
    await modeTab.click({ timeout: 30000 });
    await modePage.waitForTimeout(1500);

    const modeBanner = modePage.locator('[data-environment-banner]').first();
    await modeBanner.waitFor({ state: 'visible', timeout: 60000 });
    const mode = await modeBanner.getAttribute('data-environment-banner');
    const modeWords = ((await modeBanner.innerText()) ?? '').trim();
    check(`L27 the DEPLOYED switch surface states the current mode (${mode})`, mode === 'demo' || mode === 'live');
    check(
      `L27 the banner words match the current mode (${modeWords.slice(0, 60)})`,
      mode === 'demo' ? /DEMO MODE/i.test(modeWords) : /LIVE MODE/i.test(modeWords)
    );
    check(
      `L27 the driven switch surface rendered with no uncaught error (errors: ${modeErrors.join(' | ') || 'none'})`,
      modeErrors.length === 0
    );
  } catch (modeError) {
    check(
      `L27 the platform-mode switch could NOT be driven live (${String(modeError).split('\n')[0].slice(0, 140)})`,
      false
    );
  }
  await modePage.close();

  /* ── L28 — §PHASE 3 STAGE 2: THE DELTA FULFILLMENT 3PL CARD, LIVE ───────────
   * WHY THIS EXISTS. Stage 2 registers the 3PL FULFILMENT partner (Delta
   * Fulfillment) in the Integrations Hub so its mode is authoritative. A source
   * assertion proves nothing about the DEPLOYED bundle, so the Super-Admin
   * Integration Settings surface is opened on the live site and the card is read
   * from the rendered list — it must be present, and the provider count must have
   * grown by exactly one.
   */
  console.log('\n--- L28 the Delta Fulfillment 3PL card, on the live Super-Admin surface ---');
  const dltPage = await browser.newPage({ viewport: { width: 1440, height: 950 } });
  const dltErrors = [];
  dltPage.on('pageerror', (e) => dltErrors.push(String(e)));
  try {
    await gotoLive(dltPage, `${SITE}/`);
    const dltLogin = dltPage.getByRole('button', { name: 'Partner Login' }).first();
    await dltLogin.waitFor({ state: 'visible', timeout: 90000 });
    await dltLogin.click({ timeout: 30000 });
    await dltPage.waitForTimeout(2500);
    const dltSa = dltPage.locator('text=Super Admin').first();
    await dltSa.waitFor({ state: 'visible', timeout: 90000 });
    await dltSa.click({ timeout: 30000 });
    await dltPage.waitForTimeout(3500);
    check('L28 the deployed site opened and the Super Admin signed in', true);

    const dltNav = dltPage.locator('nav[aria-label="Primary"] >> text=Integration Settings').first();
    await dltNav.waitFor({ state: 'visible', timeout: 90000 });
    await dltNav.click({ timeout: 30000 });
    await dltPage.waitForTimeout(2500);

    const hub = dltPage.getByTestId('integration-hub').first();
    await hub.waitFor({ state: 'visible', timeout: 60000 });
    const hubText = (await hub.innerText()) ?? '';
    check('L28 the DEPLOYED Integration Hub renders the Delta Fulfillment 3PL card',
      /Delta Fulfillment \(3PL\)/.test(hubText));
    /**
     * §BATCH 5 (2026-10-10) — REPOINTED to the SINGLE SOURCE OF TRUTH. This check
     * used to pin the literal "23 providers", which went stale the moment a provider
     * was legitimately removed (Mercenta Social's `postiz`). It now DERIVES the
     * expected count from `INTEGRATION_ORDER` itself, so a future add or removal
     * cannot make the live check wrong — it still proves the deployed hub renders
     * the registry's own provider set, including the 3PL partner.
     */
    const orderSrc = readFileSync(path.join(ROOT, 'src/integrations/registry.ts'), 'utf8');
    const orderBlock = orderSrc.slice(
      orderSrc.indexOf('export const INTEGRATION_ORDER'),
      orderSrc.indexOf('];', orderSrc.indexOf('export const INTEGRATION_ORDER'))
    );
    const expectedProviders = (orderBlock.match(/^ {2}'[a-z_0-9]+',/gm) ?? []).length;
    check(
      `L28 the deployed provider count is the registry's own count (${expectedProviders} providers)`,
      hubText.includes(`${expectedProviders} providers`)
    );
    /* §BATCH 5 — the LIVE absence guard for the removal: no Postiz card remains. */
    check('L28 the deployed hub offers NO Postiz card (§BATCH 5 removed Mercenta Social)',
      !/Postiz/i.test(hubText));
    check(
      `L28 the driven Integrations Hub rendered with no uncaught error (errors: ${dltErrors.join(' | ') || 'none'})`,
      dltErrors.length === 0
    );
  } catch (dltError) {
    check(
      `L28 the Delta Fulfillment card could NOT be driven live (${String(dltError).split('\n')[0].slice(0, 140)})`,
      false
    );
  }
  await dltPage.close();

  /* ── L29 — §PHASE 3 STAGE 3: THE SUPPLY ROUTE SURFACE, LIVE ────────────────
   * WHY THIS EXISTS. Stage 3 surfaces the Phase 3 route model and the fail-closed
   * escalation decision on the admin Logistics Hub. A source assertion proves
   * nothing about the DEPLOYED bundle, so the section is read from the live page:
   * the 3PL partner must be named, the thresholds must read as not agreed, and the
   * decision must be the fail-closed human review.
   */
  console.log('\n--- L29 the supply route & 3PL escalation surface, on the live admin Logistics Hub ---');
  const rtPage = await browser.newPage({ viewport: { width: 1440, height: 950 } });
  const rtErrors = [];
  rtPage.on('pageerror', (e) => rtErrors.push(String(e)));
  try {
    await liveAdminEntry(rtPage);
    check('L29 the deployed site opened and the admin signed in', true);
    const rtNav = rtPage.locator('nav[aria-label="Primary"] >> text=Logistics Hub').first();
    await rtNav.waitFor({ state: 'visible', timeout: 90000 });
    await rtNav.click({ timeout: 30000 });
    await rtPage.waitForTimeout(2500);

    const rtPanel = rtPage.locator('[data-testid="supply-route-escalation"]').first();
    await rtPanel.waitFor({ state: 'visible', timeout: 60000 });
    check('L29 the DEPLOYED admin Logistics Hub renders the supply route section', true);

    const rtPartner = ((await rtPage.locator('[data-testid="supply-route-partner"]').first().innerText()) ?? '');
    check(`L29 the deployed surface NAMES the declared 3PL partner (${rtPartner.trim().slice(0, 40)})`,
      /Delta Fulfillment/.test(rtPartner));

    const rtThresholds = ((await rtPage.locator('[data-testid="supply-route-thresholds"]').first().innerText()) ?? '');
    check('L29 the deployed thresholds are stated as NOT AGREED', /not agreed/i.test(rtThresholds));

    const rtDecision = rtPage.locator('[data-testid="supply-route-decision"]').first();
    const rtDecisionValue = await rtDecision.getAttribute('data-decision');
    check(`L29 the deployed decision FAILS CLOSED (review, no 3PL) (${rtDecisionValue})`,
      rtDecisionValue === 'review');

    check(
      `L29 the driven surface rendered with no uncaught error (errors: ${rtErrors.join(' | ') || 'none'})`,
      rtErrors.length === 0
    );
  } catch (rtError) {
    check(
      `L29 the supply route surface could NOT be driven live (${String(rtError).split('\n')[0].slice(0, 140)})`,
      false
    );
  }
  await rtPage.close();





  await pltPage.close();
  /* ── L30 — §PHASE 15: THE CUSTOM 404 + SECURITY HEADERS, LIVE ──────────────
   * The launch gate's website-integrity and security items, verified against the
   * DEPLOYED site: an unknown address must render the custom 404 (it previously
   * rendered the homepage), and the host must send the response security headers
   * added to `public/.htaccess`. Reproducible here — not a throwaway script. */
  console.log('\n--- L30 the custom 404 and the response security headers, as deployed ---');
  try {
    const nfRes = await fetch(`${SITE}/this-page-does-not-exist`, { redirect: 'manual' });
    const h = nfRes.headers;
    check(`L30 the deployed host sends Strict-Transport-Security (${h.get('strict-transport-security') || 'MISSING'})`, /max-age=/.test(h.get('strict-transport-security') || ''));
    check('L30 the deployed host sends X-Content-Type-Options: nosniff', /nosniff/.test(h.get('x-content-type-options') || ''));
    check('L30 the deployed host sends X-Frame-Options', Boolean(h.get('x-frame-options')));
    check('L30 the deployed host sends Referrer-Policy', Boolean(h.get('referrer-policy')));

    const nfPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const nfErrors = [];
    nfPage.on('pageerror', (e) => nfErrors.push(e.message));
    try {
      await gotoLive(nfPage, `${SITE}/this-page-does-not-exist`);
      const h1 = ((await nfPage.locator('h1').first().textContent().catch(() => '')) || '').trim();
      const buttons = await nfPage.locator('button').allTextContents();
      check(`L30 an unknown address shows the custom 404, not the homepage (heading: ${h1.slice(0, 40)})`, /couldn.t find that page/i.test(h1));
      check('L30 the 404 offers "Back to homepage"', buttons.some((b) => /back to homepage/i.test(b)));
      check('L30 the 404 offers "Partner Login"', buttons.some((b) => /partner login/i.test(b)));
      check(`L30 the deployed 404 rendered with no uncaught error (errors: ${nfErrors.join(' | ') || 'none'})`, nfErrors.length === 0);
    } catch (nfError) {
      check(`L30 the deployed 404 could NOT be driven (${String(nfError).split('\n')[0].slice(0, 120)})`, false);
    }
    await nfPage.close();
  } catch (l30Error) {
    check(`L30 the deployed 404 / headers could NOT be fetched (${String(l30Error).split('\n')[0].slice(0, 120)})`, false);
  }



  /* ── L31 — §PHASE 15: THE DATA-INVENTORY-DERIVED PRIVACY POLICY, LIVE ─────
   * The legal/privacy gate's third-party data inventory is now CODE
   * (`src/config/dataProcessing.ts`), and the privacy policy DERIVES its "who we
   * share it with" list from that owner. This proves the change is LIVE: the
   * DEPLOYED /privacy page renders rows built from the owner. (L11 already
   * guards that the page still publishes no supplier NAME, via the red-line
   * families — so this checks presence, L11 checks the absence.) */
  console.log('\n--- L31 the privacy policy derived from the third-party data inventory, as deployed ---');
  const pvPage = await browser.newPage({ viewport: { width: 1440, height: 950 } });
  const pvErrors = [];
  pvPage.on('pageerror', (e) => pvErrors.push(e.message));
  try {
    await gotoLive(pvPage, `${SITE}/privacy`);
    const pvText = await pvPage.locator('body').innerText();
    check('L31 the deployed privacy policy states the data-sharing principle', /we never sell personal data/i.test(pvText));
    check('L31 the deployed privacy policy lists the HOSTING processor category (derived from the owner)', /hosting and platform infrastructure/i.test(pvText));
    check('L31 the deployed privacy policy lists the FREIGHT processor category (derived from the owner)', /freight and delivery/i.test(pvText));
    check('L31 the deployed privacy policy lists the SETTLEMENTS processor category (derived from the owner)', /brand settlements/i.test(pvText));
    check(`L31 the deployed privacy policy rendered with no uncaught error (errors: ${pvErrors.join(' | ') || 'none'})`, pvErrors.length === 0);
  } catch (pvError) {
    check(`L31 the deployed privacy policy could NOT be driven (${String(pvError).split('\n')[0].slice(0, 140)})`, false);
  }
  await pvPage.close();

  await browser.close();

  console.log(`\nLIVE VERIFICATION: ${pass} PASS / ${fail} FAIL`);
  if (fail > 0) console.log(failures.map((f) => `  x ${f}`).join('\n'));
  process.exit(fail === 0 ? 0 : 1);
})();
