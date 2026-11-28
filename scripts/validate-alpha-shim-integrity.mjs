#!/usr/bin/env node
/**
 * §BATCH 4b GATE — A GENERATED SHIM MUST NEVER OVERRIDE A CLASS TAILWIND ALREADY COMPILES
 * (2026-11-28)
 *
 * WHY THIS EXISTS (rule 07 — every fix carries a gate that can fail; rule 08 — a removal
 * leaves an absence guard behind; rule 10 — no claim outlives the thing it describes)
 * -------------------------------------------------------------------------------------
 * THE DEFECT. `src/main.tsx` imports `src/index.css` first and `src/theme-alpha-shims.css`
 * SECOND. Both files define alpha utilities. For any class they BOTH define the shim is the
 * later rule at the same specificity, so the shim is the one that paints.
 *
 * `src/index.css` declares the Lovable palette in its `@theme inline` block
 * (`--color-ink: #000000`, `--color-paper: #FFFFFF`, `--color-signal: #FF6A00`), and Tailwind
 * v4 INLINES those literals — so it compiles `bg-ink/80` to `oklab(0% none none/.8)`, i.e.
 * black at 80%, CORRECTLY. The generator nonetheless mapped the bare `ink` key onto the
 * APPEARANCE-REACTIVE `var(--mr-surface)`, and emitted a second `.bg-ink\/80` painting that.
 * The shim won. A black photo scrim became a WHITE wash in the light appearance, under white
 * text — measured on the running product at 1.41:1 and 1.31:1, text a person cannot read.
 *
 * THE OTHER HALF, found while proving this one: the same stale table made the GENERATOR
 * itself refuse to run (19 unresolved keys — `bg-paper/10`, `text-paper/70`, `bg-signal/20`…),
 * so the committed stylesheet had not been its output since those utilities entered the tree.
 * That is why six `var()`-based alpha utilities had NO shim and were rendering OPAQUE — and
 * why the shim, for a `var()` colour, is genuinely load-bearing: Tailwind v4 DROPS the alpha
 * modifier for a `var()`-based colour (`.bg-zinc-500\/10{background-color:var(--mr-text-muted)}`
 * — no alpha at all). Literal → Tailwind is right and a shim is harmful. `var()` → the shim
 * is the only thing that works.
 *
 * WHAT IT PROVES
 * --------------
 *   S1  the generator and the committed stylesheet are readable and non-empty — a check that
 *       finds nothing is a FAILURE, never a pass (rule 10 §5);
 *   S2  the fixed Lovable palette (`ink` · `paper` · `signal`) is classified LITERAL: it is in
 *       LITERAL_KEYS and is NOT resolved through a theme variable;
 *   S3  the generator declares no shim for those names (`VAR_BY_KEY` and the legacy `TARGETS`
 *       table) — so the wrong mapping cannot be reintroduced by editing one table only;
 *   S4  ABSENCE GUARD — the committed stylesheet authors NO bare-`bg-ink/NN` rule, so the
 *       white-wash rule cannot come back (rule 08 §2: an assertion about a removed thing is
 *       rewritten into a guard that the thing is gone, never deleted);
 *   S5  ONE AUTHOR — regenerating the stylesheet produces a BYTE-IDENTICAL file, so a
 *       hand-edited or stale shim fails the build instead of drifting on (rule 03);
 *   S6  the value S2 relies on still exists: `src/index.css` declares `--color-ink: #000000`
 *       in its `@theme inline` block;
 *   S7  the CASCADE S5/S6 rest on still holds: `src/main.tsx` imports `./index.css` BEFORE
 *       `./theme-alpha-shims.css`. If that order flips, every `var()`-based alpha utility
 *       silently renders fully opaque — the opposite defect — so the order is pinned too.
 *
 * Run: node scripts/validate-alpha-shim-integrity.mjs   (auto-discovered by `npm run validate:all`)
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GENERATOR = path.join(ROOT, 'scripts', 'gen-theme-alpha-shims.mjs');
const SHIMS = path.join(ROOT, 'src', 'theme-alpha-shims.css');
const INDEX_CSS = path.join(ROOT, 'src', 'index.css');
const MAIN = path.join(ROOT, 'src', 'main.tsx');
/** The preserved Lovable palette Tailwind compiles itself — see the generator header. */
const LITERAL_PALETTE = ['ink', 'paper', 'signal'];

let failures = 0;
let assertions = 0;
const test = (name, ok, detail = '') => {
  assertions += 1;
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
};

console.log('§BATCH 4b — ALPHA-SHIM INTEGRITY GATE');

/* ── S1 — both sources must be readable and non-empty. A gate whose lookup returns
   nothing must FAIL LOUDLY rather than report a comfortable green (rule 10 §5). ── */
for (const file of [GENERATOR, SHIMS, INDEX_CSS, MAIN]) {
  test(
    `S1 ${path.relative(ROOT, file)} is readable and non-empty`,
    existsSync(file) && readFileSync(file, 'utf8').trim().length > 0
  );
}
if (failures > 0) {
  console.log('\nFAIL — cannot check the alpha shims: a source this gate reads is missing.');
  process.exit(1);
}

const generator = readFileSync(GENERATOR, 'utf8');
const shims = readFileSync(SHIMS, 'utf8');

/** Pull `key: 'value'` keys out of a named object literal. Returns null when the
 *  declaration is not found at all — the caller turns that into a FAILURE. */
function objectKeys(source, name) {
  const start = source.indexOf(`const ${name} = {`);
  if (start === -1) return null;
  const end = source.indexOf('\n};', start);
  if (end === -1) return null;
  const keys = new Set();
  for (const m of source.slice(start, end).matchAll(/^\s*'?([a-z][a-z0-9-]*)'?:/gm)) keys.add(m[1]);
  return keys.size ? keys : null;
}

const literalBlock = /const LITERAL_KEYS = new Set\(\[([\s\S]*?)\]\)/.exec(generator);
const literalKeys = literalBlock
  ? new Set([...literalBlock[1].matchAll(/'([a-z-]+)'/g)].map((m) => m[1]))
  : null;
const varKeys = objectKeys(generator, 'VAR_BY_KEY');
const targetPrefixes = new Set(
  [...generator.matchAll(/\{\s*prefix:\s*'([a-z-]+)\/',/g)].map((m) => m[1] + '/')
);

/* ── S2 — the fixed palette is classified LITERAL. ── */
test(
  'S2 the generator declares LITERAL_KEYS (the literal-colour set was found)',
  literalKeys !== null && literalKeys.size > 0,
  literalKeys
    ? `${literalKeys.size} key(s)`
    : 'LITERAL_KEYS not found — the declaration moved, so this gate is blind'
);
for (const key of LITERAL_PALETTE) {
  test(
    `S2 '${key}' is a LITERAL colour (Tailwind compiles its /opacity itself — no shim)`,
    Boolean(literalKeys?.has(key))
  );
}

/* ── S3 — and no shim is declared for it, in EITHER table. ── */
test(
  'S3 the generator declares VAR_BY_KEY (the resolver table was found)',
  varKeys !== null && varKeys.size > 0,
  varKeys ? `${varKeys.size} key(s)` : 'VAR_BY_KEY not found — the declaration moved, so this gate is blind'
);
for (const key of LITERAL_PALETTE) {
  test(
    `S3 the resolver maps no theme variable for the bare '${key}' key`,
    varKeys !== null && !varKeys.has(key),
    varKeys?.has(key)
      ? `'${key}' resolves through a theme variable again — a shim will override Tailwind`
      : 'declared LITERAL only'
  );
}
for (const prefix of ['bg-ink/', 'bg-paper/', 'bg-signal/', 'border-paper/', 'text-paper/', 'ring-signal/']) {
  test(`S3 the legacy TARGETS table declares no '${prefix}' shim`, !targetPrefixes.has(prefix));
}

/* ── S4 — ABSENCE GUARD (rule 08 §2). The removed rule must stay removed. ── */
const bareInkRules = [...shims.matchAll(/^\.bg-ink\\\/(\d+)\{/gm)].map((m) => m[1]);
test(
  'S4 ABSENCE GUARD — the committed stylesheet authors NO bare `bg-ink/<alpha>` shim',
  bareInkRules.length === 0,
  bareInkRules.length
    ? `found ${bareInkRules.length}: bg-ink/${bareInkRules.join(' · bg-ink/')}`
    : '0 (the white-wash rule is gone)'
);
/* The NUMBERED surface ladder must still be shimmed — its removal would be the opposite bug:
   a `var()`-based colour loses its alpha entirely, because Tailwind drops it. */
const numberedInkRules = [...shims.matchAll(/^\.bg-ink-\d{3}\\\/\d+\{/gm)].length;
test(
  'S4 the NUMBERED ink surface ladder is still shimmed (a `var()` colour needs it)',
  numberedInkRules > 0,
  `${numberedInkRules} rule(s)`
);

/* ── S5 — ONE AUTHOR: regenerating must reproduce the committed file byte for byte. ── */
const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'mercenta-shims-'));
const tmpOut = path.join(tmpDir, 'theme-alpha-shims.css');
let regenerated = null;
let regenerateError = '';
try {
  execFileSync(process.execPath, [GENERATOR, '--out', tmpOut], { cwd: ROOT, stdio: 'pipe' });
  regenerated = readFileSync(tmpOut, 'utf8');
} catch (error) {
  regenerateError = String(error.stdout || '') + String(error.message || '');
} finally {
  rmSync(tmpDir, { recursive: true, force: true });
}
test(
  'S5 the generator RUNS to completion (no unresolved colour key)',
  regenerated !== null,
  regenerated !== null ? 'exit 0' : regenerateError.split('\n').slice(0, 3).join(' ').trim()
);
test(
  'S5 the committed stylesheet IS the generator’s own output (byte-identical)',
  regenerated !== null && regenerated === shims,
  regenerated === null
    ? 'the generator failed, so this cannot be proved'
    : regenerated === shims
      ? 'identical'
      : 'DIFFERS — run `node scripts/gen-theme-alpha-shims.mjs` and commit the result'
);

/* ── S6 — the fixed value S2 relies on is still declared where Tailwind reads it. ── */
const indexCss = readFileSync(INDEX_CSS, 'utf8');
const themeBlock = /@theme\s+inline\s*\{([\s\S]*?)\n\}/.exec(indexCss);
test('S6 src/index.css still declares an `@theme inline` block', themeBlock !== null);
for (const [token, value] of [
  ['--color-ink', '#000000'],
  ['--color-paper', '#FFFFFF'],
  ['--color-signal', '#FF6A00'],
]) {
  test(
    `S6 \`${token}: ${value}\` is still declared (Tailwind compiles the fixed palette from it)`,
    Boolean(themeBlock) && new RegExp(`${token}\\s*:\\s*${value}\\s*;`, 'i').test(themeBlock[1])
  );
}

/* ── S7 — the cascade those rules depend on. ── */
const main = readFileSync(MAIN, 'utf8');
const indexAt = main.indexOf("'./index.css'");
const shimsAt = main.indexOf("'./theme-alpha-shims.css'");
test(
  'S7 src/main.tsx imports ./index.css BEFORE ./theme-alpha-shims.css (the shim is the later rule)',
  indexAt !== -1 && shimsAt !== -1 && indexAt < shimsAt,
  indexAt === -1 || shimsAt === -1
    ? 'one of the two imports was not found — the cascade cannot be verified'
    : indexAt < shimsAt
      ? `index.css @${indexAt} < shims @${shimsAt}`
      : 'ORDER FLIPPED — every `var()`-based alpha utility now renders opaque'
);

console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${assertions - failures}/${assertions} assertions`);
process.exit(failures === 0 ? 0 : 1);
