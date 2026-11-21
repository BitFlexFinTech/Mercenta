/**
 * §BRAND REDESIGN (2026-11-21) — THEME-LADDER CLASSES MUST RESOLVE.
 *
 * WHY THIS GATE EXISTS (rule 07 — every fix carries a gate that can fail).
 * ----------------------------------------------------------------------
 * The legacy-styling migration repointed 1,663 literal `white`/`black` sites
 * onto the theme's own text/surface tokens and named its targets `text-strong`,
 * `bg-surface-tint`, … Tailwind never emitted a rule for `text-strong`, because
 * the name was never declared in `tailwind.config.js`. It was therefore a DEAD
 * CLASS in **97 files**: the text silently inherited its parent's colour, and
 * because `--mr-text` (#E8E8E8 / #333333) is genuinely different from
 * `--mr-text-strong` (#FFFFFF / #000000), "strong" text was measurably not
 * strong. Nothing caught it: typecheck, the build, 198 validators and every
 * browser test all passed, because a class that emits no CSS cannot fail.
 *
 * WHAT IT PROVES
 * --------------
 * For every colour-prefixed class the source USES, if its name is part of the
 * theme's own token vocabulary (discovered from `src/config/themes.ts`, the
 * token owner — never a retyped list), then that name MUST resolve to a colour
 * in the RESOLVED Tailwind theme. A name that is in the vocabulary but resolves
 * to nothing is a dead class, and fails.
 *
 * HOW THE VOCABULARY IS DISCOVERED (rule 09 §4 — the command discovers its own
 * gates; rule 10 §2 — a written fact has one author). Every `--mr-*` token in
 * `src/config/themes.ts` contributes its own name and its tail
 * (`--mr-text-strong` → `text-strong`, `strong`; `--mr-surface-tint` →
 * `surface-tint`, `tint`). A used class whose name is NOT in that vocabulary
 * (e.g. `text-left`, `bg-red-500`, `text-ds-micro`, `border-b`) is not a
 * theme-ladder class and is left alone — which is what keeps this gate free of
 * false positives.
 *
 * A CHECK THAT FINDS NOTHING IS A FAILURE (rule 10 §5): if no tokens are found
 * in `themes.ts`, or no classes are discovered in `src/`, the gate FAILS LOUDLY
 * rather than reporting a comfortable green over an empty set.
 *
 * Run: node scripts/validate-theme-classes-resolve.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

let pass = 0;
let fail = 0;
const errors = [];
function check(name, ok, detail = '') {
  if (ok) {
    pass++;
    console.log(`  PASS  ${name}`);
  } else {
    fail++;
    errors.push(`${name}${detail ? ` — ${detail}` : ''}`);
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

/* ── 1. the token vocabulary, discovered from its owner ───────────────────── */

console.log('\n§ 1. The theme token vocabulary is discovered from its owner\n');

const THEMES = read('src/config/themes.ts');
/* The tokens are authored as quoted keys — `'--mr-text-strong': value` — so the
   closing quote sits between the name and the colon. */
const tokens = new Set([...THEMES.matchAll(/--mr-([a-z0-9-]+)'?\s*:/g)].map((m) => m[1]));
/**
 * Roles a class NAME may carry: the whole token name and its tail — but ONLY for
 * tokens that belong to a COLOUR family. Without this filter the tail of, say,
 * `--mr-motion-base` is `base`, which collides with Tailwind's own fontSize step
 * `text-base` and produces a false positive. The families below are exactly the
 * colour-bearing `--mr-*` groups; `density-`, `ease-`, `motion-` and `shadow-`
 * carry no colour and are excluded.
 */
const COLOUR_FAMILIES = new Set([
  'accent', 'bg', 'btn', 'card', 'exp', 'feature', 'focus', 'hairline',
  'hover', 'on', 'overlay', 'palette', 'scrollbar', 'state', 'surface', 'text',
]);
const roles = new Set();
for (const t of tokens) {
  const family = t.split('-')[0];
  if (!COLOUR_FAMILIES.has(family)) continue;
  roles.add(t);
  const i = t.indexOf('-');
  if (i > 0) roles.add(t.slice(i + 1));
}
check(
  'the token vocabulary was discovered from src/config/themes.ts (a check that finds nothing is a FAILURE)',
  tokens.size > 0,
  `${tokens.size} tokens`
);
check('the vocabulary is large enough to be real', tokens.size >= 20, `${tokens.size} tokens`);


/* ── 2. what the RESOLVED theme actually offers ──────────────────────────── */

console.log('\n§ 2. The resolved Tailwind theme is loaded\n');

const raw = require(path.join(ROOT, 'tailwind.config.js'));
const resolveConfig = require('tailwindcss/resolveConfig');
const cfg = resolveConfig(raw.default ?? raw);

/** Every colour name the resolved theme declares (DEFAULT collapses to its parent). */
function flattenColours(node, prefix = '', out = new Set()) {
  if (node == null) return out;
  if (typeof node === 'string' || typeof node === 'function') {
    if (prefix) out.add(prefix);
    return out;
  }
  if (Array.isArray(node)) return out;
  if (typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      if (k === 'DEFAULT') {
        if (prefix) out.add(prefix);
        continue;
      }
      flattenColours(v, prefix ? `${prefix}-${k}` : k, out);
    }
  }
  return out;
}
const colourNames = flattenColours(cfg.theme.colors);
check(
  'the resolved theme declares colours (a check that finds nothing is a FAILURE)',
  colourNames.size > 0,
  `${colourNames.size} colour names`
);

/* ── 3. every theme-ladder class the source uses must resolve ────────────── */

console.log('\n§ 3. Every theme-ladder class used in src/ resolves\n');

const PREFIXES = [
  'text', 'bg', 'border', 'divide', 'ring', 'fill', 'stroke',
  'from', 'to', 'via', 'placeholder', 'decoration', 'outline', 'accent', 'caret',
];
const CLASS_RE = new RegExp(`\\b(?:${PREFIXES.join('|')})-([a-z][a-z0-9]*(?:-[a-z0-9]+)*)\\b`, 'g');

/** Walk src/ and collect every class token, with the files that use it. */
const used = new Map();
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(tsx|ts)$/.test(e.name)) {
      /* Strip every `--mr-*` mention first: a token NAME such as
         `--mr-card-border-hover` would otherwise be read as the class
         `border-hover`. Only real class strings may be judged. */
      const text = fs.readFileSync(p, 'utf8').replace(/--mr-[a-z0-9-]+/g, '');
      for (const m of text.matchAll(CLASS_RE)) {
        const cls = m[0];
        const name = cls.slice(cls.indexOf('-') + 1);
        if (!used.has(name)) used.set(name, { cls, files: new Set() });
        used.get(name).files.add(path.relative(ROOT, p));
      }
    }
  }
}
walk(path.join(ROOT, 'src'));
const srcClasses = new Set(used.keys());

/**
 * §BATCH 8 (2026-11-21) — A CLASS USED ONLY IN A TEST IS NOT EMITTED AT ALL.
 *
 * `tailwind.config.js` sets its `content` globs to the index file plus `src/` ONLY, so
 * a class named ONLY inside `e2e/` is NEVER GENERATED. The migration retired the legacy
 * names, so the last `src/` use of `bg-brass-500` and `bg-ink-*` disappeared — and FIVE
 * e2e assertions were still probing them: a probe button built with `bg-brass-500`
 * computed a TRANSPARENT background (the test failed), a locator `div.bg-ink-900` matched
 * nothing, and two regexes expected `border-brass-500/50`. Each was measuring a class the
 * product no longer has.
 *
 * Checking e2e names against the RESOLVED theme would not catch this — `brass-500` is
 * still declared, so it resolves; it is the EMISSION that is missing. The honest test is
 * therefore: every theme-ladder class a test names must ALSO be named in `src/`, which is
 * the only tree Tailwind scans.
 */
const e2eUsed = new Map();
(function walkE2e(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkE2e(p);
    else if (/\.(tsx|ts)$/.test(e.name)) {
      const text = fs.readFileSync(p, 'utf8').replace(/--mr-[a-z0-9-]+/g, '');
      for (const m of text.matchAll(CLASS_RE)) {
        const cls = m[0];
        const name = cls.slice(cls.indexOf('-') + 1);
        if (!roles.has(name)) continue;
        if (!e2eUsed.has(cls)) e2eUsed.set(cls, new Set());
        e2eUsed.get(cls).add(path.relative(ROOT, p));
      }
    }
  }
})(path.join(ROOT, 'e2e'));

const orphaned = [...e2eUsed.entries()]
  .filter(([cls]) => {
    const name = cls.slice(cls.indexOf('-') + 1);
    return !srcClasses.has(name);
  })
  .map(([cls, files]) => `${cls} (${[...files][0]})`);

check(
  'every theme-ladder class a TEST names is also named in src/ — otherwise Tailwind never emits it',
  orphaned.length === 0,
  orphaned.length === 0
    ? `${e2eUsed.size} ladder class(es) named in e2e/, all emitted from src/`
    : orphaned.slice(0, 8).join(' · ')
);

/**
 * §BATCH 8 (2026-11-21) — THE ABSENCE GUARD (rule 08 §2): THE RETIRED FAMILIES MAY NOT
 * BE NAMED IN A TEST AT ALL.
 *
 * The assertion above is the honest test, but prose in `src/` defeats it: a COMMENT
 * mentioning `bg-brass-500` puts `brass-500` into the src set, so a test naming it would
 * pass. This guard does not depend on that: `brass-*` and `ink-*` are RETIRED aliases
 * (their canonical names are `accent-*` and `surface-*`), so a test that names one is
 * measuring something the product no longer has — which is exactly what happened to five
 * assertions, one of which failed only once the stale dev server was replaced.
 */
const RETIRED = /-((?:brass|ink)(?:-\d{2,3})?)(?![a-zA-Z0-9_-])/g;
const retiredInTests = [];
(function scanRetired(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) scanRetired(p);
    else if (/\.(tsx|ts)$/.test(e.name)) {
      const text = fs.readFileSync(p, 'utf8');
      for (const m of text.matchAll(RETIRED)) {
        retiredInTests.push(`${path.relative(ROOT, p)}: ${m[0]}`);
      }
    }
  }
})(path.join(ROOT, 'e2e'));

check(
  'ABSENCE GUARD — no e2e file names a RETIRED colour family (brass-* / ink-*)',
  retiredInTests.length === 0,
  retiredInTests.length === 0 ? 'none' : retiredInTests.slice(0, 6).join(' · ')
);

check(
  'classes were discovered in src/ (a check that finds nothing is a FAILURE)',
  used.size > 0,
  `${used.size} distinct class names`
);

/** Only names that belong to the theme vocabulary are this gate's business. */
const ladder = [...used.entries()].filter(([name]) => roles.has(name));
check(
  'the theme-ladder subset is non-empty (a check that finds nothing is a FAILURE)',
  ladder.length > 0,
  `${ladder.length} ladder names in use`
);

const dead = ladder
  .filter(([name]) => !colourNames.has(name))
  .map(([name, info]) => ({ name, cls: info.cls, files: [...info.files] }))
  .sort((a, b) => b.files.length - a.files.length);

check(
  'no theme-ladder class used in src/ is DEAD (its name resolves to a colour in the resolved theme)',
  dead.length === 0,
  dead.length === 0
    ? `all ${ladder.length} ladder names resolve`
    : dead
        .slice(0, 12)
        .map((d) => `"${d.cls}" (${d.files.length} file(s), e.g. ${d.files[0]})`)
        .join(' · ')
);

/* ── 4. the gate is proved able to fail ─────────────────────────────────── */

console.log('\n§ 4. The gate is proved able to fail (a check that cannot fail proves nothing)\n');

/** The gate must flag a name that is in the vocabulary but not in the theme. */
const probeDead = (name, resolved) => roles.has(name) && !resolved.has(name);
check(
  'the detector flags a known-dead ladder name and clears a live one',
  probeDead('strong', new Set([...colourNames].filter((n) => n !== 'strong'))) === true &&
    probeDead('strong', colourNames) === false &&
    probeDead('left', colourNames) === false,
  'strong (absent) → flagged · strong (present) → clear · left (not a role) → ignored'
);

/* ── Verdict ─────────────────────────────────────────────────────────────── */

console.log('');
if (fail > 0) {
  console.log(`THEME_CLASSES_RESOLVE_FAILED — ${fail} of ${pass + fail} assertions failed.`);
  for (const e of errors) console.log(`  · ${e}`);
  process.exit(1);
}
console.log(
  `THEME_CLASSES_RESOLVE_PASS — every theme-ladder class the code uses resolves (${pass} assertions).`
);
