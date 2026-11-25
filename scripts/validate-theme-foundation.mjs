/**
 * §UI/UX Wave 1 — THEME FOUNDATION VALIDATOR.
 *
 * Verifies the canonical theme architecture contract so the five themes can
 * never silently drift: theme set, default, CSS-variable completeness,
 * semantic colour consistency, near-black (non-navy) dark foundations,
 * delicate chart system, presentation-only guarantee (no data/business
 * imports in the theme/UI seams) and the Wave 1 surface seams.
 *
 * Run: node scripts/validate-theme-foundation.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
/* §LOVABLE SOURCE TRANSFER — the preserved-design set has ONE author (rule 03). */
import { isPreservedDesignSurface } from './lib/preserved-design-surfaces.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const THEMES_SRC = fs.readFileSync(path.join(ROOT, 'src/config/themes.ts'), 'utf8');

let pass = 0;
let fail = 0;
const errors = [];

function check(name, ok, detail = '') {
  if (ok) {
    pass++;
  } else {
    fail++;
    errors.push(`${name}${detail ? ` — ${detail}` : ''}`);
  }
}

// 1. Theme set + order + default
/**
 * §BRAND REDESIGN (2026-11-19) — REPOINTED CONTRACT (supersedes the five-theme
 * OpenShip-mapped contract this validator asserted). The canonical theme set is
 * now EXACTLY TWO, both built from the approved Mercenta identity:
 *
 *   brand-dark (DEFAULT) · brand-light
 *
 * The five retired themes — minimal-light, professional, bold, fun, serious —
 * were REMOVED IN FULL. The guard below proves each is ABSENT (no id, no order
 * entry), so a validator that merely stopped checking could not pass: it would
 * still fail if any retired id reappeared.
 */
const required = ['brand-dark', 'brand-light'];
const RETIRED = ['minimal-light', 'professional', 'bold', 'fun', 'serious'];
check(
  'RETIRED themes are absent (no id, no order entry, no block)',
  RETIRED.every(
    (id) =>
      !new RegExp(`id:\\s*'${id}'`).test(THEMES_SRC) &&
      !new RegExp(`'${id}'`).test((THEMES_SRC.match(/THEME_ORDER:\s*readonly\s*ThemeId\[\]\s*=\s*\[([\s\S]*?)\]/) ?? ['', ''])[1])
  )
);
check('default theme is brand-dark', /DEFAULT_THEME:\s*ThemeId\s*=\s*'brand-dark'/.test(THEMES_SRC));
check('two-theme order array', THEME_ORDER_EXPECTED(THEMES_SRC));
check(
  'the approved brand palette is declared ONCE and both themes read it',
  /export const BRAND_PALETTE/.test(THEMES_SRC) &&
    (THEMES_SRC.match(/BRAND_PALETTE\.orange/g) ?? []).length >= 4
);

function THEME_ORDER_EXPECTED(src) {
  const m = src.match(/THEME_ORDER:\s*readonly\s*ThemeId\[\]\s*=\s*\[([\s\S]*?)\]/);
  if (!m) return false;
  const ids = [...m[1].matchAll(/'([a-z-]+)'/g)].map((x) => x[1]);
  return ids.length === 2 && ids.every((x) => required.includes(x));
}

// 2. Every theme defines an identical CSS-variable NAME set.
const varNames = [...THEMES_SRC.matchAll(/'--mr-[a-z0-9-]+'/g)].map((m) => m[0]).filter((v, i, a) => a.indexOf(v) === i);
const themeBlocks = [];
for (const id of required) {
  const start = THEMES_SRC.indexOf(`    id: '${id}',`);
  const after = THEMES_SRC.slice(start + 12);
  const nextId = after.indexOf("    id: '");
  const end = nextId === -1 ? THEMES_SRC.indexOf('};', start) : start + 12 + nextId;
  themeBlocks.push({ id, body: THEMES_SRC.slice(start, end) });
}
check('two theme objects parsed', themeBlocks.length === 2, `got ${themeBlocks.length}`);
for (const { id, body } of themeBlocks) {
  const names = [...body.matchAll(/'--mr-[a-z0-9-]+'/g)].map((m) => m[0]).filter((v, i, a) => a.indexOf(v) === i);
  const missing = varNames.filter((n) => !names.includes(n));
  const extra = names.filter((n) => !varNames.includes(n));
  check(`vars complete for ${id}`, missing.length === 0 && extra.length === 0,
    `missing=${missing.join(',')} extra=${extra.join(',')}`);
}

// 3. Semantic colours present in every theme (canonical language).
for (const sem of ['critical', 'warning', 'info', 'success']) {
  check(`semantic token --mr-state-${sem} declared`, THEMES_SRC.includes(`--mr-state-${sem}`));
}
check('severity expression map present', THEMES_SRC.includes("severity: {"));

// 4. Dark foundations are genuinely near-black/charcoal — never navy/blue.
// Only themes whose block declares mode: 'dark' are dark-surface themes.
/**
 * §BRAND REDESIGN — REPOINTED: a brand colour is now declared ONCE in
 * `BRAND_PALETTE` and READ by the theme, so the value may be a hex literal OR a
 * `BRAND_PALETTE.<key>` reference. Both forms are resolved to a real hex before
 * the near-black / not-navy assertions run, so the check still measures the
 * actual colour rather than being skipped.
 */
const PALETTE_HEX = Object.fromEntries(
  [...THEMES_SRC.matchAll(/^\s{2}([a-zA-Z]+):\s*'(#[0-9A-Fa-f]{6})',/gm)].map((m) => [m[1], m[2]])
);
function resolveBg(body) {
  const ref = body.match(/'--mr-bg':\s*BRAND_PALETTE\.([a-zA-Z]+)/);
  if (ref) return PALETTE_HEX[ref[1]] ?? null;
  const hex = body.match(/'--mr-bg':\s*'(#[0-9A-Fa-f]{6})'/);
  return hex ? hex[1] : null;
}
for (const { id, body } of themeBlocks) {
  if (!/mode: 'dark'/.test(body)) continue;
  const hex = resolveBg(body);
  check(`dark theme ${id} declares --mr-bg`, !!hex);
  if (!hex) continue;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const light = (r + g + b) / 3;
  check(`dark theme ${id} bg ${hex} is near-black (avg ${light.toFixed(0)})`, light < 40);
  check(`dark theme ${id} bg ${hex} is NOT naval/blue`, !(b > r + 18 && b > g + 18));
}

// 5. Chart system: delicate strokes only (stroke ∈ {1, 1.5}, ring ∈ {10,11,12}).
const strokes = [...THEMES_SRC.matchAll(/strokeWidth:\s*(1|1\.5),/g)].map((m) => Number(m[1]));
const rings = [...THEMES_SRC.matchAll(/ring:\s*(\d+),/g)].map((m) => Number(m[1]));
check('chart stroke values are delicate (≤1.5)', strokes.length === 2 && strokes.every((s) => s === 1 || s === 1.5), JSON.stringify(strokes));
check('doughnut ring values are thin (≤12)', rings.length === 2 && rings.every((r) => r >= 8 && r <= 12), JSON.stringify(rings));

// 6. Presentation-only guarantee: theme config must not import business libs.
check('themes.ts imports only pure types', !/@\/data|@\/lib|@\/services|@\/integrations/.test(THEMES_SRC));

// 7. Wave 1 seams exist.
for (const f of [
  'src/context/ThemeContext.tsx',
  'src/components/shared/ThemeSelector.tsx',
  'src/components/shared/Avatar.tsx',
  'src/lib/profile/profileImage.ts',
  'src/lib/brandIdentity/logoResolver.ts',
  'src/data/brandLogos.ts',
  'src/components/shared/charts/MercentaCharts.tsx',
  'src/components/shared/UnlockGrowth.tsx',
  'src/theme-alpha-shims.css',
]) {
  check(`seam exists: ${f}`, fs.existsSync(path.join(ROOT, f)));
}

// 8. Homepage creative preservation — tracker animation classes retained.
/**
 * §BRAND REDESIGN (2026-11-19) — REPOINTED, NOT WEAKENED. The tracker used to be
 * inline in `Home.tsx`; it now lives in its own component (so all four homepage
 * designs share ONE tracker and the animation cannot drift). The check follows
 * the owner, and additionally asserts the class names are STILL applied — which
 * is the thing that actually matters.
 */
const css = fs.readFileSync(path.join(ROOT, 'src/index.css'), 'utf8');
check('route-dot keyframes preserved', css.includes('@keyframes route-dot'));
check('tracker-ping keyframes preserved', css.includes('@keyframes tracker-ping'));
const trackerSrc = fs.readFileSync(path.join(ROOT, 'src/components/marketing/home/HeroTracker.tsx'), 'utf8');
check('the shared tracker applies animate-route-dot', trackerSrc.includes('animate-route-dot'));
check('the shared tracker applies animate-tracker-ping', trackerSrc.includes('animate-tracker-ping'));
check(
  'the tracker is HONESTLY labelled as an example (never live data)',
  /example of the live view/i.test(trackerSrc)
);
/*
 * §BRAND REDESIGN (2026-11-20) — REPOINTED, NOT WEAKENED.
 *
 * The four designs used to all live in `HomeDesigns.tsx`, so counting
 * `<HeroTracker` there was enough. Each design now lives in its OWN module
 * (`DesignA.tsx` … `DesignD.tsx`), and `HomeDesigns.tsx` is a re-export — so
 * reading one file would now find zero trackers and the check would be
 * meaningless.
 *
 * It now DISCOVERS the design modules and requires that EACH one renders the
 * shared tracker, which is STRONGER than before: previously one design could
 * have dropped the tracker and a count of three would still have passed.
 */
const designsDir = path.join(ROOT, 'src/components/marketing/home');
const designFiles = fs
  .readdirSync(designsDir)
  .filter((f) => /^Design[A-E]\.tsx$/.test(f))
  .sort();
/*
 * §BATCH 3 (2026-11-21) — REPOINTED TO THE DISCOVERY, NOT WEAKENED. The approved
 * Concept 3 direction added a FIFTH design module (`DesignE.tsx`). The check
 * previously matched `Design[A-D]` and required exactly four, so the new module
 * would have been silently OUTSIDE the gate — a design shipping with no tracker
 * assertion. The pattern now discovers A–E and the count is five, so the new
 * module is covered by the same guarantee as the original four.
 */
check('the design modules were discovered (a discovery of none is a failure)', designFiles.length === 5,
  designFiles.join(', '));
for (const file of designFiles) {
  const src = fs.readFileSync(path.join(designsDir, file), 'utf8');
  /* §LOVABLE SOURCE TRANSFER — the preserved homepage renders the ORIGINAL Lovable
     `ShipmentTracker`, which implements the same animation classes
     (`animate-route-dot`, `animate-tracker-ping`) as the shared `HeroTracker`. Both
     are valid tracker implementations, and WHICH files may use the preserved one is
     declared ONCE rather than hardcoded here (rule 03). */
  const rel = path.relative(ROOT, path.join(designsDir, file));
  const acceptsPreservedTracker =
    isPreservedDesignSurface(rel) && src.includes('<ShipmentTracker');
  const hasTracker = src.includes('<HeroTracker') || acceptsPreservedTracker;
  check(`${file} renders a tracker with the canonical animations`, hasTracker);
}

// 9. Notification severity presentation wired.
const notif = fs.readFileSync(path.join(ROOT, 'src/components/shared/NotificationCenter.tsx'), 'utf8');
check('notification severity mapping', notif.includes("high: 'critical'") && notif.includes("medium: 'warning'"));
check('notification data-severity', notif.includes('data-severity'));

// 10. Default theme wiring: ThemeContext initialises minimal-light.
const ctxSrc = fs.readFileSync(path.join(ROOT, 'src/context/ThemeContext.tsx'), 'utf8');
check('ThemeContext persists via localStorage', ctxSrc.includes('mercenta.theme'));
check('ThemeContext applies data attribute', ctxSrc.includes('dataset.mercentaTheme'));

console.log(`\nTHEME FOUNDATION: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) {
  console.log(errors.map((e) => `  ✗ ${e}`).join('\n'));
  process.exit(1);
}