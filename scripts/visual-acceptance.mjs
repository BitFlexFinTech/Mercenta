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
/**
 * §BATCH 4 (2026-11-28) — THE COLOUR DECODER: ONE DEFINITION, TWO CONSUMERS.
 *
 * WHY THIS EXISTS (the blind spot this closes)
 * -------------------------------------------
 * The contrast measurement below used to read ONLY `rgb()` / `rgba()`. A browser
 * probe of the RUNNING product (headless Chromium against port 5182, 2026-11-28)
 * showed Chromium returns THREE other syntaxes for the very same palette:
 *
 *   · `oklab(0 0 0 / 0.5)`   — every Tailwind v4 `/opacity` utility, e.g.
 *                              `text-ink/50`, `text-paper/55`;
 *   · `oklch(0.696 0.17 162.48)` — the Lovable tokens `--color-live` and
 *                              `--color-tracker-*` (`src/index.css`);
 *   · `color(srgb 0.0627451 0.0627451 0.0627451 / 0.8)` — what a generated alpha
 *                              shim (`color-mix(in srgb, …)`, `src/theme-alpha-shims.css`)
 *                              serialises to. `bg-ink/80` painted exactly this until
 *                              §BATCH 4b removed its shim — see
 *                              `scripts/validate-alpha-shim-integrity.mjs`.
 *
 * A colour the decoder could not read was SILENTLY SKIPPED (`parse` returned
 * `null` → `continue`), so any text painted with one was never measured at all.
 * Measured on the homepage: “Live listings” (`text-ink/50` → `oklab(0 0 0 / 0.5)`)
 * and “Range · Pricing” (`text-paper/55`) were both invisible to the instrument,
 * and the semi-transparent card fill
 * (`oklab(0.700932 0.142874 0.141699 / 0.06)`) was skipped rather than composited.
 * Blindness that reads as a pass is worse than no measurement.
 *
 * THE CONTRACT — a silent skip can never happen again
 * --------------------------------------------------
 *   { r, g, b, a }   a decodable colour: channels 0–255, alpha 0–1
 *   { none: true }   not a colour at all (`none`, `currentcolor`, `inherit`,
 *                    `unset`, or an empty/non-colour string)
 *   { unreadable }   a colour SYNTAX this decoder does not implement (`lab()`,
 *                    `lch()`, `color(display-p3 …)`, an unresolved `var()`).
 *                    The callers COUNT these, so an unreadable colour is
 *                    reported — never dropped.
 *
 * Implemented spaces: rgb/rgba (numbers and percentages) · hsl/hsla · hwb ·
 * oklab · oklch · color(srgb …) · color(srgb-linear …) · hex. A colour outside
 * the sRGB gamut is clipped, exactly as a display clips it.
 *
 * SELF-CONTAINED ON PURPOSE (rule 03 — single source of truth). Every helper is
 * nested, so `readColor.toString()` is a complete definition that can be injected
 * into the browser with `context.addInitScript` (the walk does that) while
 * `scripts/validate-visual-acceptance-parser.mjs` imports and tests the SAME
 * function in Node. One decoder, two consumers, no second copy to drift.
 */
export function readColor(css) {
  const text = String(css == null ? '' : css)
    .trim()
    .toLowerCase();
  const unreadable = () => ({ unreadable: true, css: text });

  const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const clamp255 = (x) => (x < 0 ? 0 : x > 255 ? 255 : x);
  /** linear-light → sRGB transfer, then 0–255. */
  const to255 = (lin) =>
    Math.round(clamp01(lin <= 0.0031308 ? 12.92 * lin : 1.055 * Math.pow(lin, 1 / 2.4) - 0.055) * 255);
  const hslToRgb = (h, s, l) => {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const hp = (((h % 360) + 360) % 360) / 60;
    const x = c * (1 - Math.abs((hp % 2) - 1));
    const m = l - c / 2;
    const t =
      hp < 1 ? [c, x, 0] : hp < 2 ? [x, c, 0] : hp < 3 ? [0, c, x] : hp < 4 ? [0, x, c] : hp < 5 ? [x, 0, c] : [c, 0, x];
    return { r: (t[0] + m) * 255, g: (t[1] + m) * 255, b: (t[2] + m) * 255 };
  };

  if (!text) return { none: true };
  if (text === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
  if (['none', 'currentcolor', 'inherit', 'initial', 'unset', 'revert', 'revert-layer'].includes(text)) {
    return { none: true };
  }

  const hex = /^#([0-9a-f]{3,8})$/.exec(text);
  if (hex) {
    const h = hex[1];
    const short = h.length === 3 || h.length === 4;
    if (!short && h.length !== 6 && h.length !== 8) return unreadable();
    const pair = (i) => parseInt(short ? h[i] + h[i] : h.slice(i * 2, i * 2 + 2), 16);
    return {
      r: pair(0),
      g: pair(1),
      b: pair(2),
      a: (short ? h.length === 4 : h.length === 8) ? pair(3) / 255 : 1,
    };
  }

  const fn = /^([a-z-]+)\(([\s\S]*)\)$/.exec(text);
  if (!fn) return { none: true };
  const name = fn[1];
  const inside = fn[2];
  const slash = inside.indexOf('/');
  const chanPart = (slash === -1 ? inside : inside.slice(0, slash)).trim();
  const alphaPart = slash === -1 ? null : inside.slice(slash + 1).trim();
  let channels = chanPart.includes(',')
    ? chanPart.split(',').map((s) => s.trim()).filter((s) => s !== '')
    : chanPart.split(/\s+/).filter((s) => s !== '');
  /* The legacy comma form carries alpha as a FOURTH channel — `rgba(r,g,b,a)`,
     `hsla(h,s%,l%,a)`. The modern form uses ` / a`. Both are handled: a 4th
     comma-separated channel is taken as alpha and dropped from the channel list,
     so every branch below sees exactly three channels. */
  const legacyAlpha = chanPart.includes(',') && channels.length === 4 ? channels[3] : null;
  if (legacyAlpha !== null) channels = channels.slice(0, 3);

  /** A number, or a percentage returned as a 0–1 fraction. */
  const numOf = (s) => {
    const t = String(s == null ? '' : s).trim();
    const pct = t.endsWith('%');
    const v = parseFloat(t);
    if (!Number.isFinite(v)) return null;
    return { v: pct ? v / 100 : v, pct };
  };
  /** A CSS `<percentage>` where a bare number also means percent (s/l/w/b). */
  const pctOf = (s) => {
    const n = numOf(s);
    return n ? { v: n.pct ? n.v : n.v / 100 } : null;
  };
  /** A hue: a bare angle, or deg/turn/rad/grad. */
  const hueOf = (s) => {
    const t = String(s == null ? '' : s).trim();
    const v = parseFloat(t);
    if (!Number.isFinite(v)) return null;
    if (t.endsWith('turn')) return v * 360;
    if (t.endsWith('rad')) return (v * 180) / Math.PI;
    if (t.endsWith('grad')) return v * 0.9;
    return v;
  };
  const alphaOf = () => {
    if (legacyAlpha !== null) {
      const n = numOf(legacyAlpha);
      return n ? clamp01(n.v) : null;
    }
    if (alphaPart == null) return 1;
    const n = numOf(alphaPart);
    return n ? clamp01(n.v) : null;
  };

  const a = alphaOf();
  if (a === null) return unreadable();

  if (name === 'rgb' || name === 'rgba') {
    if (channels.length !== 3) return unreadable();
    const ch = channels.map((s) => {
      const n = numOf(s);
      return n ? (n.pct ? n.v * 255 : n.v) : null;
    });
    if (ch.some((v) => v === null)) return unreadable();
    return { r: clamp255(ch[0]), g: clamp255(ch[1]), b: clamp255(ch[2]), a };
  }

  if (name === 'hsl' || name === 'hsla') {
    if (channels.length !== 3) return unreadable();
    const h = hueOf(channels[0]);
    const s = pctOf(channels[1]);
    const l = pctOf(channels[2]);
    if (h === null || !s || !l) return unreadable();
    const rgb = hslToRgb(h, clamp01(s.v), clamp01(l.v));
    return { r: Math.round(rgb.r), g: Math.round(rgb.g), b: Math.round(rgb.b), a };
  }

  if (name === 'hwb') {
    if (channels.length !== 3) return unreadable();
    const h = hueOf(channels[0]);
    const w = pctOf(channels[1]);
    const b = pctOf(channels[2]);
    if (h === null || !w || !b) return unreadable();
    const wv = clamp01(w.v);
    const bv = clamp01(b.v);
    if (wv + bv >= 1) {
      const grey = Math.round((wv / (wv + bv)) * 255);
      return { r: grey, g: grey, b: grey, a };
    }
    const base = hslToRgb(h, 1, 0.5);
    const mix = (v) => Math.round(((v / 255) * (1 - wv - bv) + wv) * 255);
    return { r: mix(base.r), g: mix(base.g), b: mix(base.b), a };
  }

  if (name === 'oklab' || name === 'oklch') {
    if (channels.length !== 3) return unreadable();
    const L = numOf(channels[0]);
    if (!L) return unreadable();
    let A;
    let B;
    if (name === 'oklch') {
      const C = numOf(channels[1]);
      const H = hueOf(channels[2]);
      if (!C || H === null) return unreadable();
      const rad = (H * Math.PI) / 180;
      A = C.v * Math.cos(rad);
      B = C.v * Math.sin(rad);
    } else {
      const a1 = numOf(channels[1]);
      const b1 = numOf(channels[2]);
      if (!a1 || !b1) return unreadable();
      A = a1.v;
      B = b1.v;
    }
    const l_ = L.v + 0.3963377774 * A + 0.2158037573 * B;
    const m_ = L.v - 0.1055613458 * A - 0.0638541728 * B;
    const s_ = L.v - 0.0894841775 * A - 1.291485548 * B;
    const l = l_ * l_ * l_;
    const m = m_ * m_ * m_;
    const s = s_ * s_ * s_;
    return {
      r: to255(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
      g: to255(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
      b: to255(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
      a,
    };
  }

  if (name === 'color') {
    const space = channels[0];
    const nums = channels.slice(1).map(numOf);
    if (nums.length !== 3 || nums.some((n) => !n)) return unreadable();
    if (space === 'srgb') {
      /* `color(srgb …)` channels are NON-linear sRGB, 0–1 — multiply only. */
      return {
        r: Math.round(clamp01(nums[0].v) * 255),
        g: Math.round(clamp01(nums[1].v) * 255),
        b: Math.round(clamp01(nums[2].v) * 255),
        a,
      };
    }
    if (space === 'srgb-linear') {
      return { r: to255(nums[0].v), g: to255(nums[1].v), b: to255(nums[2].v), a };
    }
    return unreadable(); /* display-p3, a98-rgb, prophoto-rgb, rec2020, xyz … */
  }

  /* lab() · lch() · color-mix() · light-dark() · an unresolved var() — a colour
     syntax this decoder deliberately does not implement. Reported, not dropped. */
  return unreadable();
}

/** The decoder as a self-contained source string, injected into the browser. */
export const READ_COLOR_SOURCE = `window.__mrReadColor = ${readColor.toString()};`;



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

/**
 * §BATCH 4 (2026-11-28) — THE PRIVATE ROUTE PREFIXES, read from their own owner.
 *
 * `publicRoutes.ts` declares which addresses are PUBLIC (walked as pages) and
 * which are PRIVATE (`PRIVATE_ROUTE_PREFIXES`). The login portal is deliberately
 * private — it must never be indexed — so it was never walked, and the one screen
 * every brand meets before it has any access was the only public-entry screen no
 * capture covered. The prefix list is READ, never retyped; a missing declaration
 * makes discovery FAIL (rule 10 §5) rather than quietly walking fewer screens.
 */
function readPrivateRoutePrefixes(source) {
  const m = /PRIVATE_ROUTE_PREFIXES[^=]*=\s*\[([\s\S]*?)\]/.exec(stripComments(source));
  if (!m) return null;
  return (m[1].match(/'([^']+)'/g) || []).map((s) => s.slice(1, -1));
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

    /**
     * §BATCH 4 (2026-11-28) — THE LOGIN PORTAL IS WALKED NOW.
     *
     * WHERE THE ADDRESS COMES FROM: `/login` is read from `PRIVATE_ROUTE_PREFIXES`
     * in the same file — the owner that already declares it — never retyped.
     *
     * HOW IT IS REACHED: by the product's OWN control, clicking “Partner Login”
     * (`openPortal()` → `setEnvironment('login')`), exactly as a visitor does. The
     * address bar deliberately stays put (the platform keeps a product deep link in
     * place across the login entry), so this screen is recorded with its declared
     * address and the control that reached it.
     */
    const privatePrefixes = readPrivateRoutePrefixes(publicSrc);
    const loginPath = privatePrefixes ? privatePrefixes.find((p) => p === '/login') : null;
    if (!loginPath) {
      problems.push(
        "the login portal: '/login' is no longer declared in PRIVATE_ROUTE_PREFIXES — discovery cannot run (rule 10 §5)"
      );
    } else {
      areas.push({
        area: 'public-entry',
        kind: 'login',
        how: 'clicked “Partner Login” on the public homepage, no session',
        title: 'Public entry — the login portal',
        screens: [{ id: 'login', label: loginPath, path: loginPath }],
      });
    }
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
    /* §BATCH 4 (2026-11-28) — THE DECODER IS THE MODULE'S OWN `readColor`,
       injected once per context with `context.addInitScript(READ_COLOR_SOURCE)`.
       It reads `rgb()/rgba()`, `oklab()`, `oklch()` and `color(srgb …)` — every
       syntax Chromium actually returns for this palette — and REPORTS a colour it
       cannot read instead of returning null and letting the run skip it. A
       missing decoder is a FAILURE, never a silent no-op (rule 10 §5). */
    const readColor = window.__mrReadColor;
    if (typeof readColor !== 'function') {
      return {
        error:
          'the colour decoder was not injected — READ_COLOR_SOURCE must be added with context.addInitScript',
      };
    }
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
      let unreadableBackground = 0;
      for (let i = chain.length - 1; i >= 0; i -= 1) {
        const s = getComputedStyle(chain[i]);
        if (s.backgroundImage && s.backgroundImage !== 'none') unmeasurable = true;
        const c = readColor(s.backgroundColor);
        /* §BATCH 4 — a background this decoder cannot read is NOT skipped in
           silence: the chain is left un-composited, the element is recorded as
           unmeasurable, and the blind count is reported on the row. */
        if (c.unreadable) {
          unmeasurable = true;
          unreadableBackground += 1;
        } else if (!c.none && c.a > 0) {
          acc = composite(c, acc);
        }
      }
      return { bg: acc, unmeasurable, unreadableBackground };
    };

    let sampled = 0;
    let invisible = 0;
    let worst = null;
    /* §BATCH 4 — colours the decoder could not read. They are counted, never
       dropped: a screen whose text could not be measured is NOT claimed clean. */
    let unreadableForeground = 0;
    let unreadableBackground = 0;
    const walk = Array.from(document.querySelectorAll('h1,h2,h3,h4,p,span,button,a,th,td,label,li'));
    /* §OWNER DECISION 2026-11-28 — THE TEXT AN ELEMENT OWNS ITSELF IS MEASURED, NOT ONLY LEAF TEXT.
       MEASURED BLIND SPOT THIS CLOSES. This loop used to `continue` on any element with element
       children, so it only ever measured LEAF text. Text that is a DIRECT child of an element which
       also has element children was therefore never measured at all — and that is exactly where a
       real defect hid: on the public homepage an eyebrow label inherited the LIGHT-surface variant
       while its section was light, rendering `text-paper/50` (white at 50%) on `#FFFFFF` — 1:1,
       invisible — and the walk reported the screen clean because it never looked at it. The probe
       that found it is `test-results/probe-mixed.mjs` (a multi-line label beside two spans).
       Now each candidate's OWN direct text nodes are measured under the element's own computed
       colour, which is what a bare text node inherits; a leaf element still measures its whole text,
       so nothing that was covered before stops being covered. */
    const ownTextOf = (el) =>
      Array.from(el.childNodes)
        .filter((n) => n.nodeType === 3)
        .map((n) => n.textContent || '')
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
    for (const el of walk) {
      if (sampled >= 600) break;
      const text = el.children.length > 0 ? ownTextOf(el) : (el.textContent || '').trim();
      if (text.length < 3) continue;
      if (el.getClientRects().length === 0) continue;
      const style = getComputedStyle(el);
      if (Number(style.visibility === 'hidden') || parseFloat(style.opacity) < 0.5) continue;
      const fg = readColor(style.color);
      if (fg.none) continue;
      if (fg.unreadable) {
        unreadableForeground += 1;
        continue;
      }
      if (fg.a < 0.25) continue;
      const { bg, unmeasurable, unreadableBackground: blindBg } = bgOf(el);
      unreadableBackground += blindBg;
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
      /* §BATCH 4 — how many colours the decoder could not read, so an incomplete
         measurement is visible on the row instead of reading as a clean pass. */
      unreadableForeground,
      unreadableBackground,
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
    /* §BATCH 4 — an UNREADABLE colour is an incomplete measurement, and an
       incomplete measurement must never read as a clean pass. The screen is
       WARNed with the counts so the blind spot is visible in the record. */
    const blindForeground = seen.unreadableForeground || 0;
    const blindBackground = seen.unreadableBackground || 0;
    if (blindForeground + blindBackground > 0) {
      if (verdict === 'PASS') verdict = 'WARN';
      notes.push(
        `colour the decoder could not read — ${blindForeground} text · ${blindBackground} background (NOT claimed clean)`
      );
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
    contrast: seen.sampled
      ? {
          sampled: seen.sampled,
          invisible: seen.invisible,
          worst: seen.worst,
          unreadableForeground: seen.unreadableForeground || 0,
          unreadableBackground: seen.unreadableBackground || 0,
        }
      : null,
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
  /* §BATCH 4 — the colour decoder is injected into EVERY context, before any page
     script runs, so the in-page measurement and the Node gate use the very same
     function (never a second copy to drift). */
  await context.addInitScript({ content: READ_COLOR_SOURCE });
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
        } else if (area.kind === 'login') {
          /* §BATCH 4 — the login portal is reached by its OWN control, never by a
             path guess: “Partner Login” (`openPortal()`) sets the login environment
             while deliberately leaving the address untouched, exactly as a visitor
             experiences it. The screen is then captured like any other. */
          const portal = page.getByRole('button', { name: 'Partner Login' }).first();
          await portal.waitFor({ state: 'visible', timeout: 12000 });
          await portal.click({ timeout: 8000 });
          await page.waitForTimeout(900);
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
    /* 1. PUBLIC — no session at all. The login portal (§BATCH 4) is a public-entry
       screen and is walked in this same guest context, by its own control. */
    const guest = await openSession(browser, appearance, 'guest', errors);
    for (const area of inventory.areas.filter((a) => a.kind === 'public' || a.kind === 'login')) {
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
    '> — it is generated on every run, so it always names the pass the table came from. The FILE NAME',
    '> keeps its original `2026-11-25` because the path is pinned by',
    '> `scripts/validate-visual-acceptance.mjs`; the content is always the LATEST pass, never an',
    '> archive. **No sentence in this banner may carry a hand-written date** — one did (§BATCH 4b,',
    '> 2026-11-28: a parenthetical still said the table had been regenerated on 2026-11-27, so the',
    '> banner contradicted its own generated title), and it was removed rather than re-dated, because',
    '> a hand-maintained date inside a generated file goes stale on the very next run.',
    '',
    '## HOW THE PASS WAS RUN',
    '',
    `- Inventory discovered from: \`${OWNER_FILES.admin}\` · \`${OWNER_FILES.brand}\` · \`${OWNER_FILES.console}\` · \`${OWNER_FILES.public}\``,
    '- Appearances: **brand-dark** (`#000000` page fill) and **brand-light** (`#FFFFFF` page fill) — the two the app allows.',
    '- Browser: headless Chromium at 1440×900, `prefers-reduced-motion: reduce`, so a capture cannot depend on smooth scrolling.',
    '- Sessions: none (public **and the login portal**) · **Astonish** (brand) · **Super Admin — Tadii** (admin), and the same two for the new console.',
    '- The login portal is walked too, reached by its own **Partner Login** control (its declared address `/login` is private, read from the SEO route owner), so the first screen every brand sees is covered.',
    '- Per screen: the applied appearance (`data-mercenta-theme` + computed `--mr-bg`), uncaught page errors, rendered text',
    '  volume and first heading, horizontal overflow, and whether the screen is an honest placeholder.',
    '- Text contrast uses ONE decoder (`readColor`, exported from `scripts/visual-acceptance.mjs`) that reads every syntax Chromium returns — `rgb()/rgba()`, `oklab()`, `oklch()`, `hsl()`, `hwb()` and `color(srgb …)`. A colour it cannot read is COUNTED and the screen is `WARN`ed — never a silent skip.',
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
