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
 *   6. the elevation roles are not theme-driven for both brand appearances
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
/*
 * §OPENSHIP BATCH 5 (2026-10-15) — REPOINTED, not weakened. This discovery used to
 * read the keys WITHOUT their prefix (`/(sm|md|lg|pill):\s*'(\d+)px'/`), which
 * accepted the NESTED form `borderRadius: { ds: { sm: … } }` as valid. That shape
 * is the defect this gate now catches: Tailwind 3.4 silently emits NO utility for a
 * nested scale object, so the ramp was declared, documented, consumed 714 times —
 * and rendered as 0px everywhere. The prefix is now REQUIRED, so the inert shape
 * fails here as an EMPTY DISCOVERY rather than passing as a healthy ramp.
 */
for (const m of radiusBlock.matchAll(/'ds-(sm|md|lg|pill)':\s*'(\d+)px'/g)) RAMP[m[1]] = Number(m[2]);

check(
  'the radius ramp was DISCOVERED from tailwind.config.js (empty discovery = FAILURE)',
  Object.keys(RAMP).length === 4,
  `steps=${Object.keys(RAMP).join('/') || 'none'}`
);

/**
 * §OPENSHIP BATCH 3 (2026-10-14) — REPOINTED, NOT WEAKENED.
 *
 * The §PHASE C4 contract was { sm 6 · md 8 · lg 12 } — the geometry the app
 * ALREADY rendered, which is what made that migration a RENAME. The canonical
 * source of the radii is now OpenShip's measured design
 * (docs/OPENSHIP_REFERENCE_SPEC.md §2.2: container 16px · control 12px · small
 * control 8px), so the ramp is { sm 8 · md 12 · lg 16 } and the +4px on every
 * control and container is DELIBERATE, not an accident to be caught.
 *
 * The gate keeps its whole strength and its whole purpose:
 *   · the ramp is still DISCOVERED from tailwind.config.js, never retyped;
 *   · all four steps are still BOUND to exact values, so moving one silently
 *     still fails here and has to be re-argued in the open (that is how this
 *     change is being made: deliberately, with the reference as the reason);
 *   · `ds-pill` is still pinned to Tailwind's own pill step;
 *   · every DESCRIBER of the ramp is still checked for a stale size.
 */
const RAMP_EXPECTED = { sm: 8, md: 12, lg: 16, pill: 9999 };
check(
  'the declared ramp carries the REFERENCE radii: sm 8 · md 12 · lg 16 · pill 9999 (spec §2.2)',
  JSON.stringify(RAMP) === JSON.stringify(RAMP_EXPECTED),
  `declared ${JSON.stringify(RAMP)}`
);

/**
 * The values are BOUND, not merely described. Since §OPENSHIP BATCH 3 they are
 * bound to the REFERENCE's measurement (container 16 · control 12 · small 8)
 * rather than to the app's former geometry; moving any one of them still
 * re-renders hundreds of surfaces, so the gate still refuses it and the move has
 * to be re-argued deliberately — which is exactly what happened here.
 */
check(
  'the control step (md) is 12px and the container step (lg) is 16px',
  RAMP.md === 12 && RAMP.lg === 16,
  `md=${RAMP.md}px lg=${RAMP.lg}px`
);
check('the small-control step (sm) is 8px', RAMP.sm === 8, `sm=${RAMP.sm}px`);
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

/* ── 3b. DECLARED AND CONSUMED IS STILL NOT EMITTED ─────────────────────── */
/*
 * §OPENSHIP BATCH 5 (2026-10-15). This is the assertion that was missing, and it is
 * why the ramp could be declared, documented and consumed 714 times while EVERY one
 * of those sites rendered `border-radius: 0px`: Tailwind 3.4 silently drops a NESTED
 * scale object (`borderRadius: { ds: { sm: … } }` emits no utility at all). Every
 * other check in this file — and in the whole corpus — reads the BLOCK or the
 * SOURCE. None read what Tailwind actually generates.
 *
 * So the config is COMPILED here, in memory, with a raw class list, and the three
 * steps the app uses must come out with their declared value. A check that finds
 * nothing is a FAILURE (rule 10 §5): an empty compile fails every assertion below.
 */
const twPlugin = (await import('tailwindcss')).default;
const postcss = (await import('postcss')).default;
const projectConfig = (await import(new URL('../tailwind.config.js', import.meta.url))).default;
const probe = await postcss([
  twPlugin({
    ...projectConfig,
    content: [{ raw: '<div class="rounded-ds-sm rounded-ds-md rounded-ds-lg"></div>' }],
  }),
]).process('@tailwind utilities;', { from: undefined });
const EMITTED = probe.css;
check(
  'the config COMPILED and produced real utilities (an empty compile is a FAILURE, not a pass)',
  EMITTED.length > 50 && /border-radius:\s*\d/.test(EMITTED),
  `emitted ${EMITTED.length} bytes: ${JSON.stringify(EMITTED.slice(0, 120))}`
);
for (const step of ['sm', 'md', 'lg']) {
  const px = RAMP[step];
  check(
    `\`rounded-ds-${step}\` really EMITS ${px}px from this config (a declared-but-inert scale is a silent no-op)`,
    new RegExp(`\\.rounded-ds-${step}\\s*\\{[^}]*border-radius:\\s*${px}px`).test(EMITTED),
    EMITTED.includes(`rounded-ds-${step}`) ? 'the rule is present with the WRONG value' : 'NO rule was emitted'
  );
}

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
  check(`${v} is declared for BOTH brand appearances`, c === 2, `declared ${c} times`);
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
