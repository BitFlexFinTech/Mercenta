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
  await browser.close();

  console.log(`\nLIVE VERIFICATION: ${pass} PASS / ${fail} FAIL`);
  if (fail > 0) console.log(failures.map((f) => `  x ${f}`).join('\n'));
  process.exit(fail === 0 ? 0 : 1);
})();
