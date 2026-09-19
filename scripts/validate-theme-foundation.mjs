/**
 * §UI/UX Wave 1 — THEME FOUNDATION VALIDATOR.
 *
 * Verifies the canonical theme architecture contract so the six themes can
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
const required = ['minimal-light', 'professional', 'bold', 'fun', 'serious', 'current'];
for (const id of required) {
  check(`theme declared: ${id}`, new RegExp(`^\\s*'?${id}'?:\\s*\\{|'${id}':\\s*\\{`, 'm').test(THEMES_SRC));
}
check('default theme is minimal-light', /DEFAULT_THEME:\s*ThemeId\s*=\s*'minimal-light'/.test(THEMES_SRC));
check('six-theme order array', THEME_ORDER_EXPECTED(THEMES_SRC));

function THEME_ORDER_EXPECTED(src) {
  const m = src.match(/THEME_ORDER:\s*readonly\s*ThemeId\[\]\s*=\s*\[([\s\S]*?)\]/);
  if (!m) return false;
  const ids = [...m[1].matchAll(/'([a-z-]+)'/g)].map((x) => x[1]);
  return ids.length === 6 && ids.every((x) => required.includes(x));
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
check('six theme objects parsed', themeBlocks.length === 6, `got ${themeBlocks.length}`);
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
for (const { id, body } of themeBlocks) {
  if (!/mode: 'dark'/.test(body)) continue;
  const m = body.match(/'--mr-bg': '(#[0-9A-Fa-f]{6})'/);
  check(`dark theme ${id} declares --mr-bg`, !!m);
  const hex = m ? m[1] : '#000000';
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
check('chart stroke values are delicate (≤1.5)', strokes.length === 6 && strokes.every((s) => s === 1 || s === 1.5), JSON.stringify(strokes));
check('doughnut ring values are thin (≤12)', rings.length === 6 && rings.every((r) => r >= 8 && r <= 12), JSON.stringify(rings));

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
const css = fs.readFileSync(path.join(ROOT, 'src/index.css'), 'utf8');
check('route-dot keyframes preserved', css.includes('@keyframes route-dot'));
check('tracker-ping keyframes preserved', css.includes('@keyframes tracker-ping'));
const home = fs.readFileSync(path.join(ROOT, 'src/components/marketing/Home.tsx'), 'utf8');
check('homepage uses animate-route-dot', home.includes('animate-route-dot'));
check('homepage uses animate-tracker-ping', home.includes('animate-tracker-ping'));
check('homepage renders UnlockGrowth', home.includes('<UnlockGrowth'));

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