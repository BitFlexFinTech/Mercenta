// §WAVE 3m — THE CONSOLE TOKEN GATE (the absence guard + the dead-class guard).
//
// WHY THIS EXISTS. The console was written with raw Tailwind palette classes while its own
// token set in `src/next/next.css` sat unused; that put 1,746 grey-family and 279 literal
// `white`/`black` sites into the legacy-styling measurement and could not be seen by any
// check. The migration repointed every one of them onto the console's OWN classes — and
// this gate makes that state permanent in the two directions that matter:
//
//   A. THE ABSENCE GUARD — the console's CODE authors ZERO grey-family and ZERO literal
//      sites, measured with the project's OWN definition (the family regexes are imported
//      from `scripts/measure-legacy-classes.mjs`, so there is no second definition and the
//      gate cannot drift from the measurement the ratchet is built on).
//   B. THE POSITIVE CONTROL — the migration really happened: the console's code uses the
//      console's own classes, discovered from `next.css`'s own `was <class>` record rather
//      than retyped here.
//   C. THE DEAD-CLASS GUARD — every one of those classes is DECLARED in `next.css`. This is
//      the defect class this project has already paid for once: `text-strong` was never
//      declared, so it emitted no rule in 97 files and "strong" text was measurably not
//      strong, while typecheck, the build and every browser test passed.
//   D. ZERO NETWORK.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { measureFamily, measureLiteralWhite, GREY } from './measure-legacy-classes.mjs';

let failures = 0;
let assertions = 0;
const test = (name, ok, detail = '') => {
  assertions += 1;
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONSOLE_DIR = join(ROOT, 'src/next');
const CSS = readFileSync(join(CONSOLE_DIR, 'next.css'), 'utf8');

const walk = (dir, out = []) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
};
const codeFiles = walk(CONSOLE_DIR);

/* ── ZERO NETWORK ─────────────────────────────────────────────────────────── */
let networkCalls = 0;
globalThis.fetch = async (...args) => {
  networkCalls++;
  throw new Error(`NO LIVE NETWORK ALLOWED IN VALIDATION: ${String(args[0])}`);
};

console.log('── A. the absence guard (the project\'s own definition) ──\n');
const grey = measureFamily(GREY, codeFiles);
const literal = measureLiteralWhite(codeFiles);
test(
  'A0 the gate found console code to check (a check that finds nothing is a failure)',
  codeFiles.length > 20,
  `${codeFiles.length} code file(s)`
);
test(
  'A1 the console authors ZERO grey-family class sites',
  grey.sites === 0,
  `${grey.sites} site(s) in ${grey.files} file(s)`
);
test(
  'A2 the console authors ZERO literal white/black class sites',
  literal.sites === 0,
  `${literal.sites} site(s) in ${literal.files} file(s)`
);

console.log('\n── B/C. the positive control and the dead-class guard ──\n');
/* The migration's own record: every `was <class>` comment in next.css names the class a
   console token replaced. Discovered from the file, never retyped here. */
const migration = [...CSS.matchAll(/\.mercenta-next\s+\.([\w-]+)\s*\{([^}]*?)was\s+([\w/.\\-]+)/g)].map((m) => ({
  token: m[1],
  body: m[2],
  was: m[3],
}));
test(
  'B1 next.css records the migration (a token with the class it replaced)',
  migration.length >= 15,
  `${migration.length} migrated token(s) recorded`
);
const undeclared = migration.filter((m) => !/color|background|background-color|border-color/.test(m.body));
test(
  'C1 every migrated token DECLARES a colour property (no dead class)',
  undeclared.length === 0,
  undeclared.map((m) => m.token).join(', ')
);

/* The positive control: the console's code must actually USE the console's own tokens. */
const allCode = codeFiles.map((f) => readFileSync(f, 'utf8')).join('\n');
const used = migration.filter((m) => new RegExp(`(?<![\\w-])${m.token.replace(/-/g, '\\-')}(?![\\w-])`).test(allCode));
test(
  'B2 the console\'s code USES its own tokens (the migration is real, not just declared)',
  used.length >= 15,
  `${used.length} of ${migration.length} token(s) found in code`
);
const unused = migration.filter((m) => used.includes(m) === false).map((m) => m.token);
test(
  'B3 no migrated token is declared but never used (no speculative token)',
  unused.length === 0,
  unused.join(', ')
);

/* And the classes they replaced must be GONE from the code. */
const leftovers = migration.filter((m) => new RegExp(`(?<![\\w-])${m.was.replace(/[/.-]/g, (c) => `\\${c}`)}(?![\\w/])`).test(allCode));
test(
  'C2 no class a console token replaced is still authored in the code',
  leftovers.length === 0,
  leftovers.map((m) => m.was).join(', ')
);

/* Comments are stripped FIRST, for every scan below: a comment that NAMES the class
   being removed or guarded must never be counted as authoring it — the same rule
   `validate-nav-destinations` applies to its own declaration scan. Defined here,
   before its first use. */
const stripComments = (body) =>
  body
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((line) => line.replace(/\/\/.*$/, ''))
    .join('\n');

/* ── C3. THE MISSING-TOKEN GUARD (§FIX 2026-11-27) ────────────────────────────
 *
 * WHY THIS EXISTS — AND WHY IT IS CALLED C3. The two comment blocks below have always
 * cited "C3, which guards the undeclared `text-strong`", but NO SUCH ASSERTION EXISTED:
 * this gate jumped from C2 straight to the dead-palette guard. The citation was a false
 * statement about the product's own checks, and the defect class it named was therefore
 * unguarded — which is exactly how `text-ink-950` shipped authored at 220 sites (including
 * the console ROOT, `NextShell.tsx`) with NO rule in `next.css`.
 *
 * WHAT THE DEFECT WAS, MEASURED. `text-ink-950` fell through to the application palette,
 * where the ink scale is a SURFACE scale — `tailwind.config.js → ink.950 =
 * var(--mr-bg-deep)`. So the console painted its text in the PAGE-DEEP BACKGROUND colour:
 * black on a near-black card in brand-dark, light-surface on white in brand-light. The
 * visual-acceptance pass measured **1.14:1 in BOTH appearances** — invisible text — on
 * **12 console screens (24 captures)**, up to 23 unreadable runs per screen.
 *
 * WHAT IT ASSERTS. For the `ink` family — whose scale is a surface scale, and which the
 * console must therefore override deliberately — every class the console AUTHORS must have
 * a rule in `next.css`. Both sides are DISCOVERED (rule 09 §4), never retyped: the authored
 * set from the console's own code with comments stripped, the declared set from `next.css`.
 *
 * THE OPACITY VARIANT IS CLOSED TOO, FAIL-CLOSED. A rule for a base class does not cover
 * `bg-ink-950/30`, so such a variant would silently re-introduce the same defect. There are
 * zero such sites today and C3c keeps it that way; its failure message names the class.
 */
console.log('\n── C3. the missing-token guard (the ink family) ──\n');
const INK_AUTHORED = /\b(?:text|bg|border|ring)-ink(?:-\d+)?\b/g;
const INK_OPACITY = /\b(?:text|bg|border|ring)-ink(?:-\d+)?\/\d+/g;
const INK_DECLARED = /\.mercenta-next\s+\.((?:text|bg|border|ring)-ink(?:-\d+)?)\b/g;

const declaredInk = new Set([...CSS.matchAll(INK_DECLARED)].map((m) => m[1]));
const authoredInk = new Set();
const inkOpacitySites = [];
for (const file of codeFiles) {
  const body = stripComments(readFileSync(file, 'utf8'));
  for (const m of body.match(INK_AUTHORED) || []) authoredInk.add(m);
  for (const m of body.match(INK_OPACITY) || []) inkOpacitySites.push(`${file.replace(ROOT + '/', '')}: ${m}`);
}
test(
  'C3a the guard found ink-family classes to check (a check that finds nothing is a failure)',
  authoredInk.size > 0 && declaredInk.size > 0,
  `${authoredInk.size} authored · ${declaredInk.size} declared in next.css`
);
const inkUndeclared = [...authoredInk].filter((c) => declaredInk.has(c) === false).sort();
test(
  'C3b every `ink` class the console authors has a rule in next.css (no fall-through to the surface scale)',
  inkUndeclared.length === 0,
  inkUndeclared.length ? `UNDECLARED: ${inkUndeclared.join(', ')}` : `${authoredInk.size} covered`
);
test(
  'C3c no ink class carries an opacity modifier (a base rule never covers the variant)',
  inkOpacitySites.length === 0,
  inkOpacitySites.slice(0, 5).join(' · ') || 'none authored'
);

/* §BATCH 8 (2026-11-25) — THE DEAD-PALETTE GUARD.
 *
 * WHY THIS EXISTS. The visual acceptance pass measured a real, visible defect that
 * this gate's A/B/C assertions could not see: the Partnerships screen's "YES"
 * answers rendered in #E8E8E8 on a #FAFAFA surface (1.23:1 — invisible). The class
 * was `text-emerald-700`, and after the Tailwind 4 upgrade this project's palette
 * families (`emerald`, `red`, `amber`, `sky`, …) emit NO RULE AT ALL, so the text
 * silently inherited the body colour. A class that emits nothing cannot fail
 * typecheck, the build or any browser test — the same defect class as the
 * undeclared `text-strong` that C3 already guards.
 *
 * The console must therefore use its OWN declared tokens, never a literal Tailwind
 * palette family. The state tones it needs are declared in `next.css`
 * (`text-state-success` · `text-state-warning` · `text-state-danger` ·
 * `text-state-info` · `text-accent`). */
console.log('\n── E. the dead-palette guard ──\n');
const PALETTE_FAMILIES =
  'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';
const PALETTE_SITE = new RegExp(
  `(?<![\\w-])(?:text|bg|border|ring|from|to|via|fill|stroke)-(?:${PALETTE_FAMILIES})-\\d{2,3}(?![\\w-])`,
  'g'
);
const paletteHits = [];
for (const file of codeFiles) {
  const body = stripComments(readFileSync(file, 'utf8'));
  for (const m of body.match(PALETTE_SITE) || []) {
    paletteHits.push(`${file.replace(ROOT + '/', '')}: ${m}`);
  }
}
test(
  'E1 the console authors ZERO literal Tailwind palette-colour classes (they emit no rule here)',
  paletteHits.length === 0,
  paletteHits.slice(0, 8).join(' · ')
);
test(
  'E2 the console declares the state tones the palette classes were replaced with',
  ['text-state-success', 'text-state-warning', 'text-state-danger', 'text-state-info'].every((t) =>
    new RegExp(`\\.mercenta-next \\.${t.replace('-', '\\-')}\\b`).test(CSS)
  ),
  'declared in next.css'
);
test(
  'E3 the console code actually USES at least one declared state tone (the fix is real)',
  /text-state-(success|warning|danger|info)/.test(allCode),
  'state tone(s) found in code'
);

console.log('\n── D. zero network ──\n');
test('D1 the whole run made zero live network calls', networkCalls === 0, `${networkCalls} call(s)`);

console.log(`\n${assertions} assertions · ${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);
