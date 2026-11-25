#!/usr/bin/env node
/**
 * §UI/UX Wave 3 — TYPOGRAPHY SCALE CONTRACT VALIDATOR.
 *
 * Locks the canonical operational type scale so the measured taste debt cannot
 * silently return. Finding D-2 of docs/UNIFIED_PLATFORM_GAP_ANALYSIS_2026-09-20.md
 * recorded 1,202 arbitrary sub-12px sizes across 113 component files. This
 * validator fails if:
 *
 *   1. any arbitrary micro size (`text-[8px]`/`[9px]`/`[10px]`) reappears in src/
 *   2. any arbitrary `text-[11px]` reappears (it must be `text-ds-label`)
 *   3. the five canonical tokens are not declared in tailwind.config.js
 *   4. the scale's FLOOR drops below 11px (the readable minimum)
 *   5. the tokens are declared but never actually consumed by the shell and the
 *      workspace primitives — a declaration nobody uses is not a design system
 *   6. docs/DESIGN_SYSTEM.md does not document the scale
 *
 * Run: node scripts/validate-typography-scale.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
/* §LOVABLE SOURCE TRANSFER — the preserved-design set has ONE author (rule 03). */
import { isPreservedDesignSurface } from './lib/preserved-design-surfaces.mjs';

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

function read(p) {
  return fs.readFileSync(path.join(ROOT, p), 'utf8');
}

/**
 * Scanned extensions — must match scripts/migrate-micro-typography.mjs exactly.
 * `.jsx` is included deliberately: the scale gate must cover every file the app
 * can render, not only `.tsx`. (The blind spot this closed was a `.jsx` file that
 * survived the first migration while the first validator reported PASS — see
 * §UIUX Wave 3. That orphan, `PublicFooterTmp1.jsx`, was REMOVED as obsolete in
 * the 2026-09-21 clean-slate reconciliation; the extension coverage stays.)
 */
const EXT = new Set(['.ts', '.tsx', '.jsx', '.js', '.css']);
function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (EXT.has(path.extname(entry.name))) out.push(p);
  }
  return out;
}

const SRC_FILES = walk(path.join(ROOT, 'src'))
  .filter((f) => !isPreservedDesignSurface(path.relative(ROOT, f)));

/* ── 1. No arbitrary micro sizes remain ─────────────────────────────────── */

const MICRO = /text-\[(8|9|10)px\]/g;
const ELEVEN = /text-\[11px\]/g;

/**
 * §PHASE C4 (2026-10-13) — NO ARBITRARY SIZE MAY BYPASS THE NAMES, either.
 *
 * Every size from 11px to 20px now has a canonical token (`ds-micro` 11 ·
 * `ds-label` 12 · `ds-body` 14 · `ds-title` 16 · `ds-page` 20). A `text-[13px]`,
 * `text-[12px]`, `text-[15px]` or `text-[17px]` therefore is not "a slightly
 * different size": it is a size with no name, which is exactly the failure mode
 * this whole scale exists to end (the original debt was 1,202 unnamed sizes).
 * Measured before this check existed: 6 such bypasses in src/ —
 * `ui.tsx` (text-[13px]) · `BrandSupport.tsx` ×3 (text-[12px]) ·
 * `FounderControlCentre.tsx` ×2 (text-[12px]) · `workspace.tsx` (sm:text-[15px]).
 * All six were repointed to the canonical tokens in the same change.
 *
 * Deliberately OUT OF SCOPE: sizes ABOVE 20px (display/metric figures). Those
 * have no token yet, so forbidding them here would fail for the wrong reason;
 * that is a decision for the application-wide pass, not for this gate.
 */
const OPERATIONAL_BYPASS = /text-\[(1[1-9]|20)px\]/g;

const microHits = [];
const elevenHits = [];
const bypassHits = [];
for (const f of SRC_FILES) {
  const src = fs.readFileSync(f, 'utf8');
  const rel = path.relative(ROOT, f);
  const m = src.match(MICRO);
  if (m) microHits.push(`${rel} (${m.length})`);
  const e = src.match(ELEVEN);
  if (e) elevenHits.push(`${rel} (${e.length})`);
  const b = src.match(OPERATIONAL_BYPASS);
  if (b) bypassHits.push(`${rel} (${b.join(', ')})`);
}

check(
  'no arbitrary sub-12px size remains in src/ (text-[8px]|[9px]|[10px])',
  microHits.length === 0,
  microHits.slice(0, 5).join(', ')
);
check(
  'no arbitrary text-[11px] remains in src/ (use text-ds-label)',
  elevenHits.length === 0,
  elevenHits.slice(0, 5).join(', ')
);
check(
  'no arbitrary px size inside the 11–20px operational range remains in src/ (every step there has a name)',
  bypassHits.length === 0,
  bypassHits.slice(0, 5).join(', ')
);

/* ── 2. DISCOVER the scale from its OWNER, then assert the contract ─────── */
/*
 * The sizes below are READ OUT of `tailwind.config.js` rather than retyped, so a
 * document can be compared against the truth instead of against a second copy of
 * it (`10-describers-must-match-reality` §2 — a written fact has one author).
 */

const TW = read('tailwind.config.js');
check('tailwind declares a fontSize scale', /fontSize:\s*\{/.test(TW));

const DISCOVERED = new Map(
  [...TW.matchAll(/'ds-([a-z]+)':\s*\['(\d+)px'/g)].map((m) => [m[1], Number(m[2])])
);
check(
  'the type scale was DISCOVERED from tailwind.config.js (a check that finds nothing is a FAILURE)',
  DISCOVERED.size >= 5,
  `discovered=${DISCOVERED.size}`
);

/**
 * §PHASE C4 — THE CONTRACT (Owner decision D-2, docs/PHASE_C_TO_G_PLAN_2026-10-13.md).
 * `ds-body` was 13px while the application's real body text was `text-sm` (14px)
 * in 258 places across 75 files — a body step two steps BELOW the default. The
 * Owner approved 14px body, and the title step moved with it because a 14px body
 * under a 15px title is a 1px step, which is not a hierarchy.
 */
const TOKENS = {
  micro: 11,
  label: 12,
  body: 14,
  title: 16,
  page: 20,
};

for (const [token, px] of Object.entries(TOKENS)) {
  check(
    `token ds-${token} declared at ${px}px`,
    DISCOVERED.get(token) === px,
    `found ${DISCOVERED.get(token) ?? 'nothing'}`
  );
}
check(
  'the body step is at least 14px — the readable body size the Owner approved',
  (DISCOVERED.get('body') ?? 0) >= 14,
  `body=${DISCOVERED.get('body') ?? 'n/a'}`
);
check(
  'the title step is at least 2px above the body step (a 1px step is not a hierarchy)',
  (DISCOVERED.get('title') ?? 0) >= (DISCOVERED.get('body') ?? 0) + 2,
  `title=${DISCOVERED.get('title') ?? 'n/a'} body=${DISCOVERED.get('body') ?? 'n/a'}`
);

/* ── 3. The floor is 11px — nothing smaller may be declared ─────────────── */

const declaredSizes = [...DISCOVERED.values()];
check('a type scale was actually parsed', DISCOVERED.size >= 5, `parsed=${DISCOVERED.size}`);
check(
  'the operational type scale floor is 11px (nothing smaller)',
  declaredSizes.length > 0 && Math.min(...declaredSizes) >= 11,
  `min=${declaredSizes.length ? Math.min(...declaredSizes) : 'n/a'}`
);

/* ── 4. Declared AND consumed (a declaration nobody uses is not a system) ─ */

const CONSUMERS = [
  'src/components/layout/Sidebar.tsx',
  'src/components/layout/Header.tsx',
  'src/components/layout/EnvironmentRouter.tsx',
  'src/components/shared/workspace.tsx',
  'src/components/shared/dashboard.tsx',
];
for (const f of CONSUMERS) {
  const src = read(f);
  check(`${f} consumes the canonical type tokens`, src.includes('text-ds-micro') || src.includes('text-ds-label'));
}

/* ── 5. Documented ──────────────────────────────────────────────────────── */

const DOC = read('docs/DESIGN_SYSTEM.md');
check('docs/DESIGN_SYSTEM.md documents the operational type scale', DOC.includes('text-ds-micro'));
check('docs/DESIGN_SYSTEM.md states the 11px floor', /11px/.test(DOC));

/* ── 6. §PHASE C4 — THE DESCRIBERS MUST STATE THE DISCOVERED SIZES ──────── */
/*
 * THE DEFECT THIS CLOSES (`10-describers-must-match-reality`)
 * -----------------------------------------------------------
 * The sizes above are declared ONCE, in `tailwind.config.js`. Changing them there
 * and leaving the prose alone is exactly how a document came to describe a
 * removed carrier shell as present (2026-10-11) — one tool described the product,
 * another described a product that no longer existed, and nothing compared them.
 * So every LIVE describer of this scale is now compared against the owner:
 *
 *   · `docs/DESIGN_SYSTEM.md` — THE owner document for the design system;
 *   · `docs/PHASE_C_TO_G_PLAN_2026-10-13.md` — the approved plan of record;
 *   · `requirements-registry.json` → the row `uiux-wave3-operational-type-scale`,
 *     the row that states the scale as the platform's contract.
 *
 * The rule is deliberately strict: ANY pairing of a token with a size that the
 * owner does not declare fails — a stale table row, a stale sentence, a stale
 * registry claim. Dated session records deeper in `PROJECT_STATUS.md` /
 * `HANDOFF.md` are NOT scanned: they are the history of when each value held, and
 * the project preserves them verbatim by design.
 */

/**
 * `token` paired with a size, e.g. `` `text-ds-body` | 13px `` or
 * `` `ds-body` 13px `` — the forms these documents actually use.
 *
 * The gap may contain neither a newline nor a backtick, and that is deliberate:
 * without it the pattern crossed from one token into the NEXT one and reported a
 * false pairing — measured on 2026-10-13, the sentence "`text-xs` (12px) is the
 * same size as `text-ds-label`, and `text-sm` (14px) is the same size as
 * `text-ds-body`" produced "ds-label paired with 14px". A gate that fails for the
 * wrong reason is worse than no gate: it makes the real failure unreadable.
 */
/**
 * A LINE THAT RECORDS A MUTATION IS HISTORY, NOT A CLAIM ABOUT THE SCALE.
 *
 * The mutation-proof rule REQUIRES evidence of the form "`ds-body` set back to
 * 13px -> 2 assertions red; restored byte-identical". Judged as a plain pairing,
 * that evidence reads as a stale size and the gate failed on it the first time it
 * was written (measured 2026-10-13, 1 of 26 red). A gate that punishes the
 * evidence it demands is a gate that will be written around, so a line carrying an
 * explicit mutation/negative-test marker is skipped — and only that line.
 */
const MUTATION_RECORD = /NEGATIVE TEST|MUTATION|set back|restored byte-identical/i;

/** The whole line containing a match (a JSON field is one line; markdown is one row). */
function lineAt(text, index) {
  const start = text.lastIndexOf('\n', index) + 1;
  const end = text.indexOf('\n', index);
  return text.slice(start, end === -1 ? text.length : end);
}

function stalePairings(text, tokens) {
  const bad = [];
  for (const [token, px] of Object.entries(tokens)) {
    const re = new RegExp('`(?:text-)?ds-' + token + '`[^`\\n]{0,24}?(\\d+)px', 'g');
    for (const m of text.matchAll(re)) {
      if (Number(m[1]) === px) continue;
      if (MUTATION_RECORD.test(lineAt(text, m.index))) continue;
      bad.push(`ds-${token} paired with ${m[1]}px (declared ${px}px)`);
    }
  }
  return bad;
}

const DESCRIBERS = [
  { file: 'docs/DESIGN_SYSTEM.md', text: DOC },
  { file: 'docs/PHASE_C_TO_G_PLAN_2026-10-13.md', text: read('docs/PHASE_C_TO_G_PLAN_2026-10-13.md') },
];

for (const { file, text } of DESCRIBERS) {
  const bad = stalePairings(text, TOKENS);
  check(`${file} states only the DECLARED token sizes`, bad.length === 0, bad.join('; '));
}

const REGISTRY = read('requirements-registry.json');
const scaleRow = (REGISTRY.match(/"id":\s*"uiux-wave3-operational-type-scale"[\s\S]{0,4000}?\n    \}/) || [''])[0];
check(
  'the registry row `uiux-wave3-operational-type-scale` was found (a check that finds nothing is a FAILURE)',
  scaleRow.length > 0,
  `length=${scaleRow.length}`
);
const registryBad = stalePairings(scaleRow, TOKENS);
check('the registry states only the DECLARED token sizes', registryBad.length === 0, registryBad.join('; '));

/* The tailwind comment block is a describer too — it must agree with its own code. */
const twComment = TW.slice(0, TW.indexOf('fontSize:'));
const twBad = stalePairings(twComment, TOKENS);
check(
  'the tailwind.config.js comment block states only the DECLARED token sizes',
  twBad.length === 0,
  twBad.join('; ')
);

/* ── Report ─────────────────────────────────────────────────────────────── */

if (fail > 0) {
  console.error(`TYPOGRAPHY_SCALE_VALIDATION_FAIL (${fail} of ${pass + fail})`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log(`TYPOGRAPHY_SCALE_VALIDATION_PASS (${pass} assertions, 0 network calls)`);
