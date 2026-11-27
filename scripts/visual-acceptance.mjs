#!/usr/bin/env node
/**
 * §BATCH 8 — THE FULL VISUAL ACCEPTANCE PASS (2026-11-25)
 *
 * The recorded batch plan ends with "BATCH 8 — the full visual pass, then publish:
 * every screen in a real browser in both appearances" (PROJECT_STATUS.md, §BRAND
 * REDESIGN). This script IS that walk.
 *
 * THE INVENTORY IS DISCOVERED, NEVER RETYPED (rule 03). It is read from the
 * declaration each surface actually renders from:
 *   · admin / brand shells → ADMIN_SECTIONS / BRAND_SECTIONS
 *   · the new console      → src/next/navConfig.ts (all four surfaces)
 *   · the public pages     → src/lib/seo/publicRoutes.ts (the SEO route owner)
 * A discovery that returns nothing FAILS (rule 10 §5), and a screen that cannot be
 * reached is recorded as FAIL rather than quietly dropped.
 *
 * WHAT IS RECORDED PER SCREEN, PER APPEARANCE
 *   · the appearance really applied (data-mercenta-theme + computed --mr-bg);
 *   · uncaught page errors, and whether the ErrorBoundary rendered;
 *   · render evidence: characters of real text + the first visible heading;
 *   · horizontal overflow at 1440×900 (a sideways-scrolling screen is a layout
 *     defect neither typecheck nor build can see);
 *   · whether the screen is an honest placeholder ("is not available yet").
 *
 * OUTPUT
 *   screenshots → test-screenshots/acceptance/<appearance>/<area>__<screen>.png  (gitignored)
 *   raw results → test-results/visual-acceptance.json                            (gitignored)
 *   record      → docs/VISUAL_ACCEPTANCE_2026-11-25.md, pinned by
 *                 scripts/validate-visual-acceptance.mjs
 *
 * Usage: node scripts/visual-acceptance.mjs [--list]
 */
import { chromium } from '@playwright/test';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE_URL = 'http://localhost:5182';
const SHOT_DIR = path.join(ROOT, 'test-screenshots', 'acceptance');
const JSON_OUT = path.join(ROOT, 'test-results', 'visual-acceptance.json');
const RECORD_FILE = path.join(ROOT, 'docs', 'VISUAL_ACCEPTANCE_2026-11-25.md');

/** The TWO approved appearances (src/config/themes.ts). Never a third. */
const APPEARANCES = [
  { id: 'brand-dark', bg: '#000000' },
  { id: 'brand-light', bg: '#ffffff' },
];

export const OWNER_FILES = {
  admin: 'src/components/layout/AdminShell.tsx',
  brand: 'src/components/layout/BrandShell.tsx',
  console: 'src/next/navConfig.ts',
  public: 'src/lib/seo/publicRoutes.ts',
};

const LEGACY_NAV = 'nav[aria-label="Primary"]';
const CONSOLE_NAV = 'nav[aria-label="Workspace navigation"]';

/** Remove comments FIRST, so a comment that mentions an id is never counted. */
function stripComments(body) {
  return body
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((line) => line.replace(/\/\/.*$/, ''))
    .join('\n');
}

/**
 * Every `{ … }` object body in a block, by BRACE DEPTH — not by indentation.
 * A first version split on `\n  {` and silently lost two console items that had
 * been written at column 0, which is exactly the invisible omission this pass
 * exists to catch.
 */
function readObjectBodies(block) {
  const bodies = [];
  let depth = 0;
  let start = -1;
  for (let i = 0; i < block.length; i += 1) {
    const ch = block[i];
    if (ch === '{') {
      if (depth === 0) start = i + 1;
      depth += 1;
    } else if (ch === '}') {
      depth -= 1;
      if (depth === 0 && start !== -1) {
        bodies.push(block.slice(start, i));
        start = -1;
      }
    }
  }
  return bodies;
}

/** `export const NAME = [ … ];` or a plain `const NAME = [ … ];` → its object bodies. */
function readItemBodies(source, constName) {
  const start = source.search(new RegExp(`(?:export )?const ${constName}\\s*[:=]`));
  if (start === -1) return null;
  const end = source.indexOf('\n];', start);
  if (end === -1) return null;
  return readObjectBodies(stripComments(source.slice(start, end)));
}

/**
 * The legacy shells declare `const X_SECTIONS = [ { label, items: [ { id, label } ] } ]`.
 * An item is `{ id: '<id>', label: '<label>', … }` — id first — so the label that
 * belongs to an id is the first `label:` AFTER it in the same section body.
 */
function readShellSections(source, blockConst) {
  const bodies = readItemBodies(source, blockConst);
  if (!bodies) return null;
  const screens = [];
  for (const body of bodies) {
    const section = /label: '([^']+)'/.exec(body);
    for (const raw of body.match(/id: '([a-z_0-9]+)'/g) || []) {
      const id = /id: '([a-z_0-9]+)'/.exec(raw)[1];
      const after = body.slice(body.indexOf(`id: '${id}'`));
      const label = /label: '([^']+)'/.exec(after);
      screens.push({ id, label: label ? label[1] : id, group: section ? section[1] : '—' });
    }
  }
  return screens;
}

/** `src/next/navConfig.ts` → every surface, with `implemented` read from the item. */
function readConsoleSurfaces(source) {
  const surfaces = [];
  for (const constName of ['CORE_ADMIN_ITEMS', 'CORE_BRAND_ITEMS', 'BWS_ITEMS', 'TALENT_COMMERCE_ITEMS']) {
    const bodies = readItemBodies(source, constName);
    if (!bodies) return null;
    const screens = [];
    for (const body of bodies) {
      const id = /id: '([^']+)'/.exec(body);
      if (!id) continue;
      const label = /label: '([^']+)'/.exec(body);
      const implemented = /implemented: (true|false)/.exec(body);
      screens.push({
        id: id[1],
        label: label ? label[1] : id[1],
        implemented: implemented ? implemented[1] === 'true' : false,
      });
    }
    surfaces.push({ constName, screens });
  }
  return surfaces;
}

/** Where a named import in `source` comes from (`'@/config/x'`), or null. */
function importSourceOf(source, name) {
  for (const m of source.matchAll(/import\s*\{([^}]*)\}\s*from\s*'([^']+)'/g)) {
    const names = m[1].split(',').map((s) => s.trim());
    if (names.indexOf(name) !== -1) return m[2];
  }
  return null;
}

/**
 * The public pages the SEO route table declares — BOTH the literal `path: '/x'`
 * entries AND the ones declared through an imported constant. Left unresolved, the
 * pass reported 7 public pages while the app serves 9, which is exactly the
 * "shows 3 when 11 exist" failure of rule 06 §3.
 */
function readPublicPaths(source, readRel) {
  const paths = [];
  const add = (p) => {
    if (p && p.indexOf('${') === -1 && paths.indexOf(p) === -1) paths.push(p);
  };

  for (const raw of stripComments(source).match(/path: '(\/[^']*)'/g) || []) {
    add(/path: '(\/[^']*)'/.exec(raw)[1]);
  }

  for (const raw of stripComments(source).match(/path: ([A-Z][A-Z0-9_]*)/g) || []) {
    const name = /path: ([A-Z][A-Z0-9_]*)/.exec(raw)[1];
    const from = importSourceOf(source, name);
    if (!from || from.slice(0, 2) !== '@/') continue;
    const base = 'src/' + from.slice(2);
    const mod = readRel(base) || readRel(base + '.ts') || readRel(base + '.tsx');
    if (!mod) continue;
    const def = new RegExp(`export const ${name} = '([^']+)'`).exec(mod);
    if (def) add(def[1]);
  }

  return paths;
}

const SURFACE_META = {
  CORE_ADMIN_ITEMS: { id: 'core_admin', label: 'Operations Console', session: 'admin' },
  CORE_BRAND_ITEMS: { id: 'core_brand', label: 'Partner Portal', session: 'brand' },
  BWS_ITEMS: { id: 'bws', label: 'BWS Workspace', session: 'admin' },
  TALENT_COMMERCE_ITEMS: { id: 'talent_commerce', label: 'Talent Commerce', session: 'admin' },
};

/**
 * THE INVENTORY — ONE function, used by BOTH the walk and the gate, so the record
 * and the check that pins it cannot disagree about what a screen is.
 */
export function discoverInventory() {
  const problems = [];
  const readRel = (rel) => {
    const abs = path.join(ROOT, rel);
    return existsSync(abs) ? readFileSync(abs, 'utf8') : null;
  };
  const read = (rel) => {
    const text = readRel(rel);
    if (text === null) problems.push(`${rel} is missing — discovery cannot run (rule 10 §5)`);
    return text;
  };

  const adminSrc = read(OWNER_FILES.admin);
  const brandSrc = read(OWNER_FILES.brand);
  const consoleSrc = read(OWNER_FILES.console);
  const publicSrc = read(OWNER_FILES.public);
  const areas = [];

  if (publicSrc) {
    const paths = readPublicPaths(publicSrc, readRel);
    if (!paths.length) problems.push('public routes: discovery returned NOTHING');
    areas.push({
      area: 'public',
      kind: 'public',
      how: 'navigated directly, no session',
      title: 'Public pages',
      screens: paths.map((p) => ({
        id: p === '/' ? 'home' : p.replace(/^\//, '').replace(/\//g, '-'),
        label: p,
        path: p,
      })),
    });
  }

  const shellAreas = [
    { src: adminSrc, constName: 'ADMIN_SECTIONS', area: 'admin', how: 'signed in as Super Admin — Tadii, nav item clicked', title: 'Admin area (signed in, legacy shell)' },
    { src: brandSrc, constName: 'BRAND_SECTIONS', area: 'brand', how: 'signed in as Astonish, nav item clicked', title: 'Brand portal (signed in, legacy shell)' },
  ];
  for (const { src, constName, area, how, title } of shellAreas) {
    if (!src) continue;
    const screens = readShellSections(src, constName);
    if (!screens || !screens.length) {
      problems.push(`${area} shell: discovery returned NOTHING`);
      continue;
    }
    areas.push({ area, kind: 'shell', how, title, screens });
  }

  if (consoleSrc) {
    const surfaces = readConsoleSurfaces(consoleSrc);
    if (!surfaces || !surfaces.length) problems.push('console nav: discovery returned NOTHING');
    else {
      for (const surface of surfaces) {
        const meta = SURFACE_META[surface.constName];
        if (!surface.screens.length) problems.push(`console ${surface.constName}: discovery returned NOTHING`);
        areas.push({
          area: `console-${meta.id}`,
          kind: 'console',
          surface: meta.label,
          session: meta.session,
          how: `new console (?console=next), surface "${meta.label}", nav item clicked`,
          title: `New console — ${meta.label}`,
          screens: surface.screens,
        });
      }
    }
  }

  return { problems, areas };
}

/* ── THE WALK ──────────────────────────────────────────────────────────────── */

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const norm = (v) => (v || '').trim().toLowerCase();

/** Open the login portal exactly the way `e2e/helpers/auth.ts` does. */
async function openLogin(page) {
  await page.goto(BASE_URL + '/', { waitUntil: 'domcontentloaded', timeout: 20000 });
  const hero = page.getByRole('button', { name: 'Partner Login' }).first();
  if (!(await hero.isVisible({ timeout: 8000 }).catch(() => false))) {
    await page.evaluate(() => {
      try {
        window.sessionStorage.clear();
      } catch {
        /* storage unavailable — nothing to clear */
      }
    });
    await page.goto(BASE_URL + '/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await hero.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
  }
  await hero.click({ timeout: 8000 });
  await page.waitForTimeout(600);
}

async function loginAs(page, card) {
  await openLogin(page);
  await page.click('text=' + card);
  await page.waitForTimeout(1500);
}

/** What a screen actually shows — read from the DOM, never assumed. */
const snapshot = (page) =>
  page.evaluate(() => {
    const root = document.documentElement;
    const cs = getComputedStyle(root);
    const headings = Array.from(document.querySelectorAll('h1,h2,h3')).filter(
      (el) => el.offsetParent !== null && (el.innerText || '').trim().length > 0
    );
    const bodyText = document.body.innerText || '';

    /* ── TEXT CONTRAST (§BATCH 8, added after a REAL defect) ──────────────────
       The Ads Management header was `bg-ink/90`, which the project's alpha-shim
       layer rewrites onto `--mr-surface` (LIGHT in the light appearance), while its
       text came from the fixed Lovable palette (`text-paper` = #FFFFFF). The result
       was white-on-light — invisible — and every automated check passed, because a
       screen full of unreadable text still HAS text. So the walk measures it:
       for each leaf text node, composite its colour over the first opaque ancestor
       background and compute the WCAG contrast ratio. Anything below 1.6:1 is not
       "muted styling", it is effectively invisible, and it is counted. */
    const parse = (c) => {
      const m = /rgba?\(([^)]+)\)/.exec(c || '');
      if (!m) return null;
      const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
      if (p.length < 3 || p.some((n) => Number.isNaN(n))) return null;
      return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
    };
    const lum = ({ r, g, b }) => {
      const f = (v) => {
        const x = v / 255;
        return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const ratio = (a, b) => {
      const l1 = lum(a);
      const l2 = lum(b);
      return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    };
    const composite = (fg, bg) => ({
      r: fg.r * fg.a + bg.r * (1 - fg.a),
      g: fg.g * fg.a + bg.g * (1 - fg.a),
      b: fg.b * fg.a + bg.b * (1 - fg.a),
      a: 1,
    });
    /* The effective background is the COMPOSITE of the WHOLE ancestor chain — not
       the first opaque ancestor within a fixed depth. The new console paints its
       #FAFAFA canvas many levels above some of its text; a shallow walk then
       compared dark text against the body's black and reported "invisible" on
       screens that are perfectly readable. An ancestor carrying a background IMAGE
       or GRADIENT makes the answer unknowable, so those elements are skipped rather
       than guessed at — a measurement that invents a verdict is worse than none. */
    const bgOf = (el) => {
      const chain = [];
      let node = el;
      while (node) {
        chain.push(node);
        node = node.parentElement;
      }
      let acc = { r: 255, g: 255, b: 255, a: 1 };
      let unmeasurable = false;
      for (let i = chain.length - 1; i >= 0; i -= 1) {
        const s = getComputedStyle(chain[i]);
        if (s.backgroundImage && s.backgroundImage !== 'none') unmeasurable = true;
        const c = parse(s.backgroundColor);
        if (c && c.a > 0) acc = composite(c, acc);
      }
      return { bg: acc, unmeasurable };
    };

    let sampled = 0;
    let invisible = 0;
    let worst = null;
    const walk = Array.from(document.querySelectorAll('h1,h2,h3,h4,p,span,button,a,th,td,label,li'));
    for (const el of walk) {
      if (sampled >= 600) break;
      if (el.children.length > 0) continue;
      const text = (el.textContent || '').trim();
      if (text.length < 3) continue;
      if (el.getClientRects().length === 0) continue;
      const style = getComputedStyle(el);
      if (Number(style.visibility === 'hidden') || parseFloat(style.opacity) < 0.5) continue;
      const fg = parse(style.color);
      if (!fg || fg.a < 0.25) continue;
      const { bg, unmeasurable } = bgOf(el);
      if (unmeasurable) continue;
      const r = ratio(composite(fg, bg), bg);
      sampled += 1;
      if (r < 1.6) {
        invisible += 1;
        if (!worst || r < worst.ratio) worst = { ratio: Math.round(r * 100) / 100, text: text.slice(0, 34) };
      }
    }

    return {
      path: location.pathname + location.search,
      theme: root.dataset.mercentaTheme || null,
      bg: cs.getPropertyValue('--mr-bg').trim(),
      overflowX: Math.max(0, root.scrollWidth - root.clientWidth),
      heading: headings[0] ? headings[0].innerText.trim().slice(0, 90) : null,
      chars: bodyText.trim().length,
      sampled,
      invisible,
      worst,
      placeholder: /is not available yet/i.test(bodyText),
      boundary: /something went wrong/i.test(bodyText),
    };
  });

/** One screen: capture it and judge it, without ever inventing a pass. */
async function record(page, appearance, area, screen, errors) {
  errors.page.length = 0;
  errors.console.length = 0;
  await page.waitForTimeout(area.kind === 'console' ? 320 : 520);

  const seen = await snapshot(page).catch((e) => ({ error: String(e) }));
  const shotPath = path.join(SHOT_DIR, appearance.id, `${area.area}__${slug(screen.id)}.png`);
  await page.screenshot({ path: shotPath }).catch(() => {});

  let verdict = 'PASS';
  const notes = [];
  if (seen.error) {
    verdict = 'FAIL';
    notes.push('could not read the page: ' + seen.error);
  } else {
    if (seen.boundary) {
      verdict = 'FAIL';
      notes.push('the error boundary was rendered');
    }
    if (errors.page.length) {
      verdict = 'FAIL';
      notes.push(`${errors.page.length} uncaught page error(s)`);
    }
    if (norm(seen.theme) !== norm(appearance.id)) {
      verdict = 'FAIL';
      notes.push(`appearance is "${seen.theme}" not "${appearance.id}"`);
    }
    if (norm(seen.bg) !== norm(appearance.bg)) {
      verdict = 'FAIL';
      notes.push(`page fill ${seen.bg || '(none)'} is not ${appearance.bg}`);
    }
    if (seen.chars < 80) {
      verdict = 'FAIL';
      notes.push(`only ${seen.chars} characters of text — the screen is empty`);
    }
    if (seen.placeholder) {
      if (verdict === 'PASS') verdict = 'PLACEHOLDER';
      notes.push('honest "not available yet" placeholder');
    }
    if (seen.overflowX > 2) {
      if (verdict === 'PASS') verdict = 'WARN';
      notes.push(`scrolls sideways by ${seen.overflowX}px`);
    }
    /* Text that is effectively invisible is a REAL defect, not muted styling — the
       Ads Management header shipped white-on-light and nothing noticed. Ten or more
       unreadable runs on one screen is a FAIL; even one is recorded. */
    if (seen.invisible > 0 && !seen.placeholder) {
      const detail = `${seen.invisible} of ${seen.sampled} text runs below 1.6:1 (worst ${seen.worst.ratio}:1 "${seen.worst.text}")`;
      if (seen.invisible >= 10) {
        verdict = 'FAIL';
        notes.push(`INVISIBLE TEXT — ${detail}`);
      } else {
        if (verdict === 'PASS') verdict = 'WARN';
        notes.push(`low-contrast text — ${detail}`);
      }
    }
    if (errors.console.length) {
      if (verdict === 'PASS') verdict = 'WARN';
      notes.push(`${errors.console.length} console error(s)`);
    }
  }

  return {
    appearance: appearance.id,
    area: area.area,
    id: screen.id,
    label: screen.label,
    implemented: screen.implemented === undefined ? true : screen.implemented,
    verdict,
    heading: seen.heading || null,
    chars: seen.chars || 0,
    overflowX: seen.overflowX || 0,
    contrast: seen.sampled ? { sampled: seen.sampled, invisible: seen.invisible, worst: seen.worst } : null,
    pageErrors: errors.page.slice(0, 3),
    consoleErrors: errors.console.slice(0, 3),
    notes,
    shot: path.relative(ROOT, shotPath),
  };
}

/**
 * Click a nav item by its label, inside the surface's own nav.
 *
 * NEVER exact-only: a nav item that carries a count badge renders the badge with
 * its own `aria-label` ("4 items needing attention") INSIDE the button, so the
 * button's accessible name is "Purchase Orders 4 items needing attention". An
 * exact-name match therefore timed out on ten perfectly reachable screens — the
 * harness was wrong, not the product, and weakening the badge to suit a test would
 * have been the wrong fix. Exact first, then prefix.
 */
async function clickNav(page, navSelector, label) {
  const nav = page.locator(navSelector).first();
  await nav.waitFor({ state: 'visible', timeout: 15000 });

  let target = nav.getByRole('button', { name: label, exact: true }).first();
  if ((await target.count()) === 0) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    target = nav.getByRole('button', { name: new RegExp(`^${escaped}(\\s|$)`) }).first();
  }
  await target.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {});
  await target.click({ timeout: 8000 });
}

/* ── ONE APPEARANCE ────────────────────────────────────────────────────────── */

/** A fresh browser context per session, with the appearance already chosen. */
async function openSession(browser, appearance, session, errors) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.page.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.console.push(m.text().slice(0, 300));
  });
  await page.goto(BASE_URL + '/', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.evaluate((id) => window.localStorage.setItem('mercenta.theme', id), appearance.id);
  if (session === 'admin') await loginAs(page, 'Super Admin — Tadii');
  if (session === 'brand') await loginAs(page, 'Astonish');
  return { context, page };
}

async function runAppearance(appearance, inventory) {
  const rows = [];
  const errors = { page: [], console: [] };
  const browser = await chromium.launch({ headless: true });
  mkdirSync(path.join(SHOT_DIR, appearance.id), { recursive: true });

  const walkArea = async (page, area) => {
    for (const screen of area.screens) {
      try {
        if (area.kind === 'public') {
          await page.goto(BASE_URL + screen.path, { waitUntil: 'domcontentloaded', timeout: 20000 });
          await page.waitForTimeout(700);
        } else if (area.kind === 'shell') {
          /* §FIX 2026-11-27 — THE LEGACY SHELL IS REACHED THROUGH THE CONSOLE'S OWN
             SWITCH, NOT BY A BARE `?console=legacy`.

             MEASURED DEFECT THIS CLOSES. The previous line was
             `page.goto(BASE_URL + '/?console=legacy')`. That URL renders THE PUBLIC
             HOMEPAGE, not the legacy shell: the app derives its environment from the
             PATH (`/admin/...` = admin, `/` = public), so the legacy nav
             (`nav[aria-label="Primary"]`) was never on the page, every
             `clickNav` waited out its 15 s timeout, and the walk died as soon as it
             reached the legacy areas — the stall recorded as "30 captures".

             PROVEN FIX (headless Chromium, this repository, 2026-11-27): clicking the
             console's own "Legacy UI" button keeps the session's path (`/admin/overview`)
             and renders the legacy AdminShell, whose `nav[aria-label="Primary"]` carries
             all 28 declared admin items. Using the product's own control means the
             recorder drives the app exactly as a user does, and needs no knowledge of
             route prefixes.

             The guard makes this idempotent: the switch is visible only while the
             console is showing, so the second and later screens of the same area skip
             it and go straight to their nav click. */
          const legacySwitch = page.getByRole('button', { name: 'Legacy UI' }).first();
          if (await legacySwitch.isVisible({ timeout: 3000 }).catch(() => false)) {
            await legacySwitch.click({ timeout: 5000 });
            await page.waitForTimeout(600);
          }
          await clickNav(page, LEGACY_NAV, screen.label);
        } else {
          await clickNav(page, CONSOLE_NAV, screen.label);
        }
        rows.push(await record(page, appearance, area, screen, errors));
      } catch (e) {
        rows.push({
          appearance: appearance.id,
          area: area.area,
          id: screen.id,
          label: screen.label,
          implemented: screen.implemented === undefined ? true : screen.implemented,
          verdict: 'FAIL',
          heading: null,
          chars: 0,
          overflowX: 0,
          pageErrors: errors.page.slice(0, 3),
          consoleErrors: errors.console.slice(0, 3),
          notes: ['could not be reached: ' + String(e).split('\n')[0].slice(0, 160)],
          shot: null,
        });
      }
    }
  };

  try {
    /* 1. PUBLIC — no session at all. */
    const guest = await openSession(browser, appearance, 'guest', errors);
    for (const area of inventory.areas.filter((a) => a.kind === 'public')) {
      await walkArea(guest.page, area);
    }
    await guest.context.close();

    /* 2. BRAND — one session: the brand shell, then its console surface. */
    const brand = await openSession(browser, appearance, 'brand', errors);
    for (const area of inventory.areas.filter((a) => a.area === 'brand')) {
      await walkArea(brand.page, area);
    }
    const brandConsole = inventory.areas.filter((a) => a.session === 'brand');
    if (brandConsole.length) {
      await brand.page.goto(BASE_URL + '/?console=next');
      await brand.page.locator(CONSOLE_NAV).first().waitFor({ state: 'visible', timeout: 20000 });
      for (const area of brandConsole) {
        await brand.page.getByRole('tab', { name: area.surface, exact: true }).first().click();
        await brand.page.waitForTimeout(500);
        await walkArea(brand.page, area);
      }
    }
    await brand.context.close();

    /* 3. ADMIN — one session: the admin shell, then its three console surfaces. */
    const admin = await openSession(browser, appearance, 'admin', errors);
    for (const area of inventory.areas.filter((a) => a.area === 'admin')) {
      await walkArea(admin.page, area);
    }
    const adminConsole = inventory.areas.filter((a) => a.session === 'admin');
    if (adminConsole.length) {
      await admin.page.goto(BASE_URL + '/?console=next');
      await admin.page.locator(CONSOLE_NAV).first().waitFor({ state: 'visible', timeout: 20000 });
      for (const area of adminConsole) {
        await admin.page.getByRole('tab', { name: area.surface, exact: true }).first().click();
        await admin.page.waitForTimeout(500);
        await walkArea(admin.page, area);
      }
    }
    await admin.context.close();
  } finally {
    await browser.close();
  }

  console.log(`  ${appearance.id}: ${rows.length} screen(s) walked`);
  return rows;
}

/* ── THE RECORD ────────────────────────────────────────────────────────────── */

const BEGIN = '<!-- BEGIN GENERATED ACCEPTANCE TABLE -->';
const END = '<!-- END GENERATED ACCEPTANCE TABLE -->';
const FINDINGS_HEADING = '## WHAT THE PASS FOUND';

function writeRecord(inventory, rows) {
  const screens = inventory.areas.flatMap((area) => area.screens.map((screen) => ({ area, screen })));
  const byKey = new Map();
  for (const row of rows) byKey.set(`${row.area}::${row.id}::${row.appearance}`, row);

  const cell = (row) => (row ? row.verdict : '—');
  const table = [
    '| # | Area | Screen | Reached by | brand-dark | brand-light |',
    '|---|------|--------|------------|------------|-------------|',
  ];
  screens.forEach(({ area, screen }, index) => {
    const dark = byKey.get(`${area.area}::${screen.id}::brand-dark`);
    const light = byKey.get(`${area.area}::${screen.id}::brand-light`);
    const name = screen.implemented === false ? `${screen.label} _(placeholder)_` : screen.label;
    table.push(
      `| ${index + 1} | ${area.area} | ${name} | ${area.how} | ${cell(dark)} | ${cell(light)} |`
    );
  });

  const tally = (v) => rows.filter((r) => r.verdict === v).length;
  const fails = rows.filter((r) => r.verdict === 'FAIL');

  /* The authored part survives a re-run: a machine can prove a screen rendered,
     but only a person can say what it looks like. */
  let authored = '';
  if (existsSync(RECORD_FILE)) {
    const old = readFileSync(RECORD_FILE, 'utf8');
    const at = old.indexOf(FINDINGS_HEADING);
    if (at !== -1) authored = old.slice(at + FINDINGS_HEADING.length).replace(/^\n+/, '').trimEnd();
  }
  if (!authored) {
    authored =
      '_Not yet written. Run the pass, look at `test-screenshots/acceptance/`, and record here what changed._';
  }

  const doc = [
    `# §BATCH 8 — THE FULL VISUAL ACCEPTANCE PASS (${new Date().toISOString().slice(0, 10)})`,
    '',
    '> **THIS IS A GENERATED RECORD, AND IT IS PINNED.** The table below is written by',
    '> `node scripts/visual-acceptance.mjs`, which walks every screen the product declares in BOTH',
    '> appearances in a real Chromium browser. `scripts/validate-visual-acceptance.mjs` re-derives the',
    '> same inventory from the same declarations and FAILS if this record stops covering a screen — so',
    '> it cannot go stale, and it cannot quietly claim a screen it never walked. Only the',
    '> `WHAT THE PASS FOUND` section below is written by hand.',
    '>',
    '> **THE TITLE DATE IS THE DATE OF THE PASS THAT PRODUCED THIS TABLE, NOT A HISTORICAL LABEL**',
    '> (regenerated 2026-11-27 after the console port changed 44 console screens from placeholders to',
    '> real screens). The FILE NAME keeps its original `2026-11-25` because the path is pinned by',
    '> `scripts/validate-visual-acceptance.mjs`; the content is always the LATEST pass, never an',
    '> archive — so no reader has to infer a date from the file name.',
    '',
    '## HOW THE PASS WAS RUN',
    '',
    `- Inventory discovered from: \`${OWNER_FILES.admin}\` · \`${OWNER_FILES.brand}\` · \`${OWNER_FILES.console}\` · \`${OWNER_FILES.public}\``,
    '- Appearances: **brand-dark** (`#000000` page fill) and **brand-light** (`#FFFFFF` page fill) — the two the app allows.',
    '- Browser: headless Chromium at 1440×900, `prefers-reduced-motion: reduce`, so a capture cannot depend on smooth scrolling.',
    '- Sessions: none (public) · **Astonish** (brand) · **Super Admin — Tadii** (admin), and the same two for the new console.',
    '- Per screen: the applied appearance (`data-mercenta-theme` + computed `--mr-bg`), uncaught page errors, rendered text',
    '  volume and first heading, horizontal overflow, and whether the screen is an honest placeholder.',
    '- Screenshots are reproducible output and are NOT committed: `test-screenshots/acceptance/<appearance>/<area>__<screen>.png`.',
    '',
    '## THE MEASURED RESULT',
    '',
    `- **${screens.length} screens**, each walked in **both** appearances → **${screens.length * 2} captures attempted**, **${rows.length} recorded**.`,
    `- Verdicts: **PASS ${tally('PASS')}** · **PLACEHOLDER ${tally('PLACEHOLDER')}** · **WARN ${tally('WARN')}** · **FAIL ${tally('FAIL')}**.`,
    fails.length
      ? `- **FAILING SCREENS — ${fails.length}:** ${fails.map((f) => `${f.area}/${f.id} (${f.appearance})`).join(' · ')}`
      : '- No screen failed: every walked screen rendered real content in both appearances, with no uncaught page error.',
    '',
    BEGIN,
    ...table,
    END,
    '',
    FINDINGS_HEADING,
    '',
    authored,
    '',
  ].join('\n');

  mkdirSync(path.dirname(RECORD_FILE), { recursive: true });
  writeFileSync(RECORD_FILE, doc);
  return { screens: screens.length, fails };
}

/* ── MAIN ──────────────────────────────────────────────────────────────────── */

async function main() {
  const inventory = discoverInventory();
  const total = inventory.areas.reduce((n, a) => n + a.screens.length, 0);

  console.log('§BATCH 8 — THE FULL VISUAL ACCEPTANCE PASS');
  for (const area of inventory.areas) {
    const implemented = area.screens.filter((s) => s.implemented !== false).length;
    console.log(
      `  ${area.area.padEnd(22)} ${String(area.screens.length).padStart(3)} screen(s)` +
        (area.kind === 'console'
          ? ` — ${implemented} implemented, ${area.screens.length - implemented} placeholder`
          : '')
    );
  }
  console.log(
    `  TOTAL ${total} screen(s) x ${APPEARANCES.length} appearances = ${total * APPEARANCES.length} captures`
  );

  if (inventory.problems.length) {
    for (const p of inventory.problems) console.error(`x ${p}`);
    process.exit(1);
  }
  if (!total) {
    console.error('x discovery returned NOTHING — a check that finds nothing is a FAILURE (rule 10 section 5)');
    process.exit(1);
  }
  if (process.argv.includes('--list')) return;

  const reachable = await fetch(BASE_URL + '/')
    .then((r) => r.ok)
    .catch(() => false);
  if (!reachable) {
    console.error(`x nothing is serving ${BASE_URL} — run "npm run dev" first (port 5182 is pinned)`);
    process.exit(1);
  }

  const rows = [];
  for (const appearance of APPEARANCES) {
    console.log(`\n-- ${appearance.id} --`);
    rows.push(...(await runAppearance(appearance, inventory)));
  }

  mkdirSync(path.dirname(JSON_OUT), { recursive: true });
  writeFileSync(
    JSON_OUT,
    JSON.stringify({ generatedAt: new Date().toISOString(), inventory, rows }, null, 2)
  );

  const { fails } = writeRecord(inventory, rows);
  console.log(`\n  record written: ${path.relative(ROOT, RECORD_FILE)}`);
  console.log(`  raw results:    ${path.relative(ROOT, JSON_OUT)}`);
  if (fails.length) {
    console.error(`\nx ${fails.length} screen(s) FAILED:`);
    for (const f of fails) console.error(`   ${f.area}/${f.id} (${f.appearance}) — ${f.notes.join('; ')}`);
    process.exit(1);
  }
  console.log('\nOK — every walked screen passed in both appearances');
}

const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
