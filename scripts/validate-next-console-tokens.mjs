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

console.log('\n── D. zero network ──\n');
test('D1 the whole run made zero live network calls', networkCalls === 0, `${networkCalls} call(s)`);

console.log(`\n${assertions} assertions · ${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);
