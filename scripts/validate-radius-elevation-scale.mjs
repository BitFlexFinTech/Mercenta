#!/usr/bin/env node
/**
 * §PHASE C4 (2026-10-13) — RADIUS + ELEVATION SCALE CONTRACT VALIDATOR.
 *
 * The geometry sibling of `validate-typography-scale.mjs`. It exists because the
 * SAME defect that hit the type scale had already hit the radius scale — measured,
 * not assumed:
 *
 *     rounded-lg 387 · rounded-md 97 · rounded 85 · rounded-xl 58
 *     rounded-full 76 · rounded-2xl 4 · rounded-sm 3         = 630 UNNAMED sites
 *         against
 *     rounded-ds-md 41 · rounded-ds-lg 26 · rounded-ds-sm 22  =  89 NAMED sites
 *
 * …with 19 unnamed shadows beside four named elevation roles, 15 of those being
 * `shadow-2xl` on exactly the surfaces the OVERLAY role exists for. A reader of
 * `docs/DESIGN_SYSTEM.md` was therefore told a scale the product did not render.
 *
 * THE RAMP IS NOT RETYPED HERE. It is DISCOVERED from `tailwind.config.js` (its
 * single owner), and every live describer is compared against what was found —
 * the same method as the type-scale gate, including its most important property:
 * **a discovery that comes back empty is a FAILURE, never a quiet pass.**
 *
 * What it fails on:
 *   1. the ramp is missing, or is not the rename-safe scale the app migrated onto
 *   2. any unnamed radius (`rounded`, `rounded-sm|md|lg|xl`, `rounded-[…]`, or a
 *      per-side form of them) reappears in a class list in `src/`
 *   3. `rounded-2xl` escapes `src/components/marketing/`
 *   4. any unnamed OUTER shadow (`shadow-sm|md|lg|xl|2xl`, bare `shadow`,
 *      `shadow-[…]` that is not `inset`) reappears in `src/`
 *   5. a declared token is never consumed — for the radii, the elevations, or the
 *      focus-shadow tokens (an ABSENCE GUARD: a declared token with no consumer)
 *   6. the elevation roles are not theme-driven for all five themes
 *   7. the canonical `:focus-visible` outline is gone from `src/index.css`
 *   8. a `border-radius` CSS literal states a value the ramp does not declare
 *   9. a live describer (the design-system doc, the phase plan, the registry row,
 *      the tailwind comment) states a radius size the ramp does not declare
 *  10. the migration script and this gate disagree on the class-list test
 *
 * Run: node scripts/validate-radius-elevation-scale.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
/* §SSOT — the ONE class-list scanner, shared with scripts/migrate-radius-elevation.mjs.
   Two implementations of "what is a class" would drift, and a drifting gate reports
   PASS over a site the migration missed. */
import { classStrings } from './lib/design-scale-scan.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let pass = 0;
let fail = 0;
const errors = [];

function check(name, ok, detail = '') {
  if (ok) pass++;
  else {
    fail++;
    errors.push(`${name}${detail ? ` — ${detail}` : ''}`);
  }
}

const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const SCANNER_SRC = read('scripts/lib/design-scale-scan.mjs');

const EXT = new Set(['.ts', '.tsx', '.jsx', '.js', '.css']);
function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (EXT.has(path.extname(entry.name))) out.push(p);
  }
  return out;
}

const SRC_FILES = walk(path.join(ROOT, 'src'));
check(
  'the source walk found files (a check that finds nothing is a FAILURE)',
  SRC_FILES.length > 300,
  `files=${SRC_FILES.length}`
);

/* ── 1. Discover the ramp from its OWNER, then pin it ───────────────────── */

const TW = read('tailwind.config.js');
const radiusBlock = TW.slice(TW.indexOf('borderRadius: {'), TW.indexOf('boxShadow: {'));
const RAMP = {};
for (const m of radiusBlock.matchAll(/(sm|md|lg|pill):\s*'(\d+)px'/g)) RAMP[m[1]] = Number(m[2]);

check(
  'the radius ramp was DISCOVERED from tailwind.config.js (empty discovery = FAILURE)',
  Object.keys(RAMP).length === 4,
  `steps=${Object.keys(RAMP).join('/') || 'none'}`
);

const RAMP_EXPECTED = { sm: 6, md: 8, lg: 12, pill: 9999 };
check(
  'the declared ramp is the rename-safe scale: sm 6 · md 8 · lg 12 · pill 9999',
  JSON.stringify(RAMP) === JSON.stringify(RAMP_EXPECTED),
  `declared ${JSON.stringify(RAMP)}`
);

/**
 * The values are BOUND, not merely described: `md` 8px and `lg` 12px are the
 * geometry the application already rendered for its dominant controls
 * (`rounded-lg`) and containers (`rounded-xl`), which is what made the migration a
 * RENAME rather than a redesign. Moving either one silently re-renders hundreds of
 * surfaces, so the gate refuses it and the move has to be re-argued deliberately.
 */
check(
  'the control step (md) is 8px and the container step (lg) is 12px',
  RAMP.md === 8 && RAMP.lg === 12,
  `md=${RAMP.md}px lg=${RAMP.lg}px`
);
check('the inline step (sm) is 6px', RAMP.sm === 6, `sm=${RAMP.sm}px`);
check(
  'the pill step (pill) equals Tailwind `rounded-full`, so the alias is safe',
  RAMP.pill === 9999,
  `pill=${RAMP.pill}`
);

const shadowBlock = TW.slice(TW.indexOf('boxShadow: {'), TW.indexOf('transitionProperty: {'));
const ELEV = [...shadowBlock.matchAll(/'(ds-[a-z-]+)':/g)].map((m) => m[1]);
check(
  'the elevation roles were DISCOVERED from tailwind.config.js (empty discovery = FAILURE)',
  ELEV.length >= 4,
  `roles=${ELEV.join('/') || 'none'}`
);
check(
  'the four elevation roles are none · subtle · raised · overlay',
  ['ds-none', 'ds-subtle', 'ds-raised', 'ds-overlay'].every((t) => ELEV.includes(t)),
  ELEV.join('/')
);

/* ── 2. One class-list test, shared with the migration (no drift) ────────── */

const MIGRATE_PATH = 'scripts/migrate-radius-elevation.mjs';
const MIGRATE = read(MIGRATE_PATH);
const GATE_SRC = read('scripts/validate-radius-elevation-scale.mjs');

check(
  'the migration script was found (a check that finds nothing is a FAILURE)',
  MIGRATE.length > 2000,
  `length=${MIGRATE.length}`
);
/** The shared scanner is the ONE implementation — see the module's own header. */
check(
  'the shared class-list scanner exists and exports what both programs need',
  SCANNER_SRC.includes('export function classStrings') && SCANNER_SRC.includes('export const CLASSISH'),
  'scripts/lib/design-scale-scan.mjs'
);
check(
  'BOTH the migration and this gate IMPORT the shared scanner (no second copy to drift)',
  MIGRATE.includes("from './lib/design-scale-scan.mjs'") &&
    GATE_SRC.includes("from './lib/design-scale-scan.mjs'"),
  `migration=${MIGRATE.includes('./lib/design-scale-scan.mjs')} gate=${GATE_SRC.includes('./lib/design-scale-scan.mjs')}`
);
/**
 * The needle is assembled from parts ON PURPOSE. Written literally, this very check
 * would contain the text it searches for, so the gate would always find "a local
 * CLASSISH definition" — in itself. That is the textbook way a self-referential
 * guard becomes a permanent false failure (and then gets deleted as noise).
 */
const LOCAL_COPY_NEEDLE = `const ${'CLASSISH'} =`;
check(
  'NEITHER program keeps its own copy of the class-list test',
  !MIGRATE.includes(LOCAL_COPY_NEEDLE) && !GATE_SRC.includes(LOCAL_COPY_NEEDLE),
  'a local CLASSISH definition was found'
);

/** Occurrence count of a pattern in a piece of text. */
function n(text, re) {
  return (text.match(re) ?? []).length;
}

const rel = (f) => path.relative(ROOT, f);
const RADIUS_BAD = /(?<![\w-])rounded(?![\w-])|rounded-(?:[trblxyse]-)?(?:sm|md|lg|xl)\b|rounded-\[/g;
const SHADOW_BAD = /(?<![\w-])shadow(?![\w-])|shadow-(?:sm|md|lg|xl|2xl)\b/g;
const ARBITRARY_SHADOW = /shadow-\[([^\]]*)\]/g;

const radiusOffenders = [];
const shadowOffenders = [];
const arbitraryOuter = [];
const twoXlFiles = [];
let classStringCount = 0;

for (const file of SRC_FILES) {
  const strings = classStrings(fs.readFileSync(file, 'utf8')).map((s) => s.body);
  classStringCount += strings.length;
  for (const s of strings) {
    for (const m of s.matchAll(RADIUS_BAD)) radiusOffenders.push(`${rel(file)}: ${m[0]}`);
    if (/rounded-2xl\b/.test(s)) twoXlFiles.push(rel(file));
    for (const m of s.matchAll(SHADOW_BAD)) shadowOffenders.push(`${rel(file)}: ${m[0]}`);
    for (const m of s.matchAll(ARBITRARY_SHADOW)) {
      // An inset glow is a decorative inner effect, not elevation, so it is
      // allowed — but ONLY as an inset, so an outer arbitrary shadow can never
      // hide behind the allowance.
      if (!m[1].trim().startsWith('inset')) arbitraryOuter.push(`${rel(file)}: ${m[0]}`);
    }
  }
}

check(
  'class lists were actually found and scanned (a check that finds nothing is a FAILURE)',
  classStringCount > 1000,
  `class strings=${classStringCount}`
);
check(
  'no unnamed radius (`rounded`, `rounded-sm|md|lg|xl`, `rounded-[…]`, or a per-side form) is used in a class list',
  radiusOffenders.length === 0,
  `${radiusOffenders.length}: ${radiusOffenders.slice(0, 5).join(' · ')}`
);
check(
  '`rounded-2xl` is used ONLY on large marketing/hero blocks (src/components/marketing/)',
  twoXlFiles.every((f) => f.startsWith('src/components/marketing/')),
  twoXlFiles.filter((f) => !f.startsWith('src/components/marketing/')).join(' · ')
);
check(
  'no unnamed outer shadow (`shadow`, `shadow-sm|md|lg|xl|2xl`) is used in a class list',
  shadowOffenders.length === 0,
  `${shadowOffenders.length}: ${shadowOffenders.slice(0, 5).join(' · ')}`
);
check(
  'an arbitrary shadow is permitted ONLY when it is `inset` (never an outer elevation)',
  arbitraryOuter.length === 0,
  arbitraryOuter.join(' · ')
);

/* ── 3. Declared is not the same as CONSUMED ─────────────────────────────── */

const SRC_TEXT = SRC_FILES.filter((f) => /\.(tsx|ts|jsx|js)$/.test(f))
  .map((f) => fs.readFileSync(f, 'utf8'))
  .join('\n');

const radiusUse = {
  sm: n(SRC_TEXT, /rounded-(?:[trblxyse]-)?ds-sm/g),
  md: n(SRC_TEXT, /rounded-(?:[trblxyse]-)?ds-md/g),
  lg: n(SRC_TEXT, /rounded-(?:[trblxyse]-)?ds-lg/g),
  // `rounded-full` is the DOCUMENTED alias for the pill step (identical value), so
  // it is a real consumer of the pill role — not a second, competing scale.
  pill: n(SRC_TEXT, /rounded-ds-pill|rounded-full/g),
};
check(
  'every declared radius step is CONSUMED in src/ (a declaration nobody uses is not a design system)',
  Object.values(radiusUse).every((c) => c > 0),
  JSON.stringify(radiusUse)
);

const elevUse = Object.fromEntries(
  ['none', 'subtle', 'raised', 'overlay'].map((r) => [r, n(SRC_TEXT, new RegExp(`shadow-ds-${r}`, 'g'))])
);
check(
  'every declared elevation role is CONSUMED in src/',
  Object.values(elevUse).every((c) => c > 0),
  JSON.stringify(elevUse)
);

/**
 * ABSENCE GUARD — a focus-shadow token declared with no consumer fails. That is how
 * `ds-focus` and `ds-focus-danger` were caught (declared in `tailwind.config.js`,
 * rendered nowhere, the focus mechanism being the canonical `:focus-visible`
 * outline) and REMOVED rather than left as dead declarations. Proved able to fail
 * by re-adding one — see the §PHASE C4 record.
 */
const deadFocusTokens = ELEV.filter((t) => /focus/.test(t) && !SRC_TEXT.includes(`shadow-${t}`));
check(
  'no focus-shadow token is declared without a consumer (ABSENCE GUARD for the removed ds-focus tokens)',
  deadFocusTokens.length === 0,
  deadFocusTokens.join(' · ')
);

/* ── 4. The elevation roles are theme-driven for ALL five themes ─────────── */

const THEMES = read('src/config/themes.ts');
for (const v of ['--mr-shadow-subtle', '--mr-shadow-raised', '--mr-shadow-overlay']) {
  /**
   * The DECLARATION is matched (`'--mr-shadow-raised':`), not the bare name.
   * Measured 2026-10-13 by the negative test itself: with a bare-name match, a theme
   * that had lost the role still passed, because the renamed declaration
   * `'--mr-shadow-raised-OLD':` CONTAINS the name as a substring — the count stayed at
   * five while a theme rendered with no raised elevation at all. A gate that counts
   * substrings measures spelling, not the thing it claims to measure.
   */
  const c = n(THEMES, new RegExp(`'${v}':`, 'g'));
  check(`${v} is declared for all five themes`, c === 5, `declared ${c} times`);
}

/* ── 5. The CSS layer states no radius outside the ramp ──────────────────── */

const CSS = SRC_FILES.filter((f) => f.endsWith('.css'))
  .map((f) => fs.readFileSync(f, 'utf8'))
  .join('\n')
  .replace(/\/\*[\s\S]*?\*\//g, ''); // a comment DESCRIBES a value; it does not render one
const declaredPx = new Set(['0', String(RAMP.sm), String(RAMP.md), String(RAMP.lg), '9999']);
const cssBad = [...CSS.matchAll(/border-radius:\s*([\d.]+)px/g)]
  .map((m) => m[1])
  .filter((v) => !declaredPx.has(v));
check(
  'every `border-radius` literal in src CSS is a value the ramp declares',
  cssBad.length === 0,
  cssBad.join(', ')
);
check(
  'the canonical `:focus-visible` outline survives (a radius cleanup must never remove the keyboard indicator)',
  /:focus-visible[^{]*\{[^}]*outline:\s*2px solid var\(--mr-focus/.test(CSS),
  'the focus-visible outline block was not found'
);

/* ── 6. The canonical primitives use the ROLES, not just the tokens ──────── */

const UI = read('src/components/ui.tsx');
const uiLg = n(UI, /rounded-ds-lg/g);
const uiMd = n(UI, /rounded-ds-md/g);
const uiSm = n(UI, /rounded-ds-sm/g);
check('the CONTAINER steps are used by the container primitives (Card, Modal)', uiLg >= 2, `count=${uiLg}`);
check(
  'the CONTROL step is used by the control primitives (Button, Input, Select, Textarea)',
  uiMd >= 3,
  `count=${uiMd}`
);
check(
  'the INLINE step is used by the inline primitives (Alert, Skeleton, pagination, checkbox)',
  uiSm >= 2,
  `count=${uiSm}`
);
check(
  'the four elevation roles are used by the primitives (flat link, resting card, raised primary, overlay modal)',
  ['ds-none', 'ds-subtle', 'ds-raised', 'ds-overlay'].every((t) => UI.includes(`shadow-${t}`)),
  'a role is missing from src/components/ui.tsx'
);

/* ── 7. Every LIVE describer agrees with the discovered ramp ─────────────── */

/**
 * A line that RECORDS a repoint or a negative test is HISTORY, not a claim about
 * the scale — and the rules REQUIRE that evidence to exist, so a gate that punished
 * it would be a gate written around. Only such a line is skipped.
 */
const HISTORY_LINE = /NEGATIVE TEST|MUTATION|set back|restored byte-identical|REPOINT/i;

function lineAt(text, index) {
  const start = text.lastIndexOf('\n', index) + 1;
  const end = text.indexOf('\n', index);
  return text.slice(start, end === -1 ? text.length : end);
}

/** `` `ds-md` (10px…) `` shapes that disagree with the declared ramp. */
function staleClaims(text) {
  const bad = [];
  for (const [step, px] of Object.entries(RAMP)) {
    const re = new RegExp('`(?:rounded-)?ds-' + step + '`[^`\\n]{0,14}?(\\d+)', 'g');
    for (const m of text.matchAll(re)) {
      if (Number(m[1]) === px) continue;
      if (HISTORY_LINE.test(lineAt(text, m.index))) continue;
      bad.push(`ds-${step} paired with ${m[1]} (declared ${px})`);
    }
  }
  return bad;
}

/**
 * Shadow tokens a describer names that the declared scale does not contain. A line
 * that RECORDS a removed token (marked §REPOINTED, the project's convention for
 * preserving an old contract) is history and is skipped — otherwise the gate would
 * forbid exactly the record the rules require it to keep.
 */
function undeclaredShadowNames(text) {
  return [...text.matchAll(/`shadow-(ds-[a-z-]+)`/g)]
    .filter((m) => !ELEV.includes(m[1]))
    .filter((m) => !HISTORY_LINE.test(lineAt(text, m.index)))
    .map((m) => m[1]);
}

const DESC_DOC = read('docs/DESIGN_SYSTEM.md');
const DESC_PLAN = read('docs/PHASE_C_TO_G_PLAN_2026-10-13.md');
const REGISTRY = read('requirements-registry.json');
const rowMatch = REGISTRY.match(
  /"id":\s*"uiux-phase-c4-radius-elevation-scale"[\s\S]{0,6000}?\n    \}/
);
const DESC_ROW = rowMatch ? rowMatch[0] : '';
const DESC_TW_RADIUS = TW.slice(TW.indexOf('THE ONE RADIUS SCALE'), TW.indexOf('borderRadius: {'));
const DESC_TW_ELEV = TW.slice(TW.indexOf('THE ELEVATION SCALE, and ONE REMOVAL'), TW.indexOf('boxShadow: {'));

check(
  'the registry row `uiux-phase-c4-radius-elevation-scale` was found (a check that finds nothing is a FAILURE)',
  DESC_ROW.length > 0,
  'row not found'
);
check(
  'the tailwind radius comment was found (a check that finds nothing is a FAILURE)',
  DESC_TW_RADIUS.length > 500,
  `length=${DESC_TW_RADIUS.length}`
);
check(
  'the tailwind elevation comment was found (a check that finds nothing is a FAILURE)',
  DESC_TW_ELEV.length > 500,
  `length=${DESC_TW_ELEV.length}`
);

for (const [file, text] of [
  ['docs/DESIGN_SYSTEM.md', DESC_DOC],
  ['docs/PHASE_C_TO_G_PLAN_2026-10-13.md', DESC_PLAN],
  ['requirements-registry.json (the §PHASE C4 row)', DESC_ROW],
  ['tailwind.config.js (the radius comment)', DESC_TW_RADIUS],
  ['tailwind.config.js (the elevation comment)', DESC_TW_ELEV],
]) {
  const stale = staleClaims(text);
  check(`${file} states only the DECLARED radius sizes`, stale.length === 0, stale.join('; '));
  const ghosts = undeclaredShadowNames(text);
  check(`${file} names only DECLARED shadow tokens`, ghosts.length === 0, ghosts.join(', '));
}

/* ── Report ─────────────────────────────────────────────────────────────── */

if (fail > 0) {
  console.error(`RADIUS_ELEVATION_SCALE_VALIDATION_FAIL (${fail} of ${pass + fail})`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log(
  `RADIUS_ELEVATION_SCALE_VALIDATION_PASS (${pass} assertions · ramp ${JSON.stringify(RAMP)} · ` +
    `class strings scanned ${classStringCount} · use ${JSON.stringify(radiusUse)} ${JSON.stringify(elevUse)})`
);
