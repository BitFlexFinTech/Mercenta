#!/usr/bin/env node
/**
 * §BATCH 4 GATE — THE CONTRAST MEASUREMENT MUST SEE EVERY COLOUR (2026-11-28)
 *
 * WHY THIS EXISTS (rule 07 — every fix carries a gate that can fail)
 * -----------------------------------------------------------------
 * `scripts/visual-acceptance.mjs` decides whether text is legible by reading the
 * colours a browser reports. It used to read ONLY `rgb()`/`rgba()`. A probe of the
 * RUNNING product (2026-11-28) showed Chromium returns three other syntaxes for
 * the very same palette:
 *
 *   · `oklab(0 0 0 / 0.5)`        — `text-ink/50`, `text-paper/55`, … (Tailwind v4)
 *   · `oklch(0.696 0.17 162.48)`  — `--color-live`, `--color-tracker-*`
 *   · `color(srgb 0.0627…/0.8)`   — `bg-ink/80`
 *
 * Every colour the decoder could not read was SILENTLY SKIPPED, so text painted
 * with one was never measured — and a screen with unmeasured text reported PASS.
 * That is the failure mode this gate ends: the same class as a check that reads a
 * list which no longer exists and reports a comfortable green (rule 10 §5).
 *
 * WHAT IT PROVES
 * --------------
 *   P1  the decoder reads every syntax the browser returns, against KNOWN values
 *       (references measured from the running product and from the CSS spec);
 *   P2  a colour syntax it cannot read is REPORTED (`unreadable`), never returned
 *       as "no colour" — so the walk counts it and WARNs the screen;
 *   P3  the walk really USES one injected decoder and really COUNTS the unreadable
 *       ones (an absence guard: the rgb-only `parse` cannot come back);
 *   P4  the login portal (a screen the walk never covered) is in the discovered
 *       inventory, reached by the product's own control;
 *   P5  the gate is PROVED ABLE TO FAIL: a decoder with its oklab/oklch branch
 *       removed fails the very same reference checks.
 *
 * One decoder, two consumers (rule 03): this gate imports `readColor` from the
 * walk — there is no second copy of the colour maths to drift.
 *
 * Run: node scripts/validate-visual-acceptance-parser.mjs   (via `npm run validate:all`)
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readColor, READ_COLOR_SOURCE, discoverInventory } from './visual-acceptance.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WALK = path.join(ROOT, 'scripts', 'visual-acceptance.mjs');

let failures = 0;
let assertions = 0;
const test = (name, ok, detail = '') => {
  assertions += 1;
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
};

console.log('§BATCH 4 — VISUAL ACCEPTANCE COLOUR-DECODER GATE');

/* ── P1 — the reference table. Every entry is a colour the browser actually
   reports, with the value it must decode to. `tol` covers the one case where a
   colour lies outside the sRGB gamut: this decoder CLIPS (as a display does),
   so a saturated oklch is allowed to differ from a gamut-mapped hex by ±20. ── */
const REFERENCE = [
  { css: 'rgb(255, 106, 0)', want: { r: 255, g: 106, b: 0, a: 1 }, why: 'the brand signal colour' },
  { css: 'rgba(0, 0, 0, 0.6)', want: { r: 0, g: 0, b: 0, a: 0.6 }, why: 'legacy comma alpha (4th channel)' },
  { css: 'rgb(0 0 0 / 0.25)', want: { r: 0, g: 0, b: 0, a: 0.25 }, why: 'modern slash alpha' },
  { css: 'hsl(200 50% 40%)', want: { r: 51, g: 119, b: 153, a: 1 }, why: 'hsl' },
  { css: 'hwb(200 10% 20%)', want: { r: 26, g: 144, b: 204, a: 1 }, why: 'hwb' },
  { css: 'oklab(0 0 0 / 0.5)', want: { r: 0, g: 0, b: 0, a: 0.5 }, why: 'text-ink/50 — the `/opacity` family' },
  {
    css: 'oklab(0.700932 0.142874 0.141699 / 0.06)',
    want: { r: 255, g: 106, b: 0, a: 0.06 },
    why: 'bg-signal/[0.06] — a semi-transparent token background',
  },
  { css: 'oklch(0.871 0.006 286.286)', want: { r: 212, g: 212, b: 216, a: 1 }, why: '--color-tracker-text (zinc-300, in gamut)' },
  { css: 'oklch(0.696 0.17 162.48)', want: { r: 16, g: 185, b: 129, a: 1 }, tol: 20, why: '--color-live (out of sRGB gamut → clipped)' },
  { css: 'color(srgb 0.0627451 0.0627451 0.0627451 / 0.8)', want: { r: 16, g: 16, b: 16, a: 0.8 }, why: 'bg-ink/80' },
  { css: 'color(srgb-linear 0.5 0.5 0.5)', want: { r: 188, g: 188, b: 188, a: 1 }, why: 'srgb-linear → transfer applied' },
  { css: '#FF6A00', want: { r: 255, g: 106, b: 0, a: 1 }, why: 'hex' },
  { css: '#10b981', want: { r: 16, g: 185, b: 129, a: 1 }, why: 'hex' },
];

const near = (got, want, tol) =>
  !!got && !got.none && !got.unreadable && ['r', 'g', 'b', 'a'].every((k) => Math.abs(got[k] - want[k]) <= tol);
const referenceFailures = (read) =>
  REFERENCE.filter((c) => !near(read(c.css), c.want, c.tol == null ? 0.001 : c.tol)).map((c) => c.css);

const p1 = referenceFailures(readColor);
test(
  'P1 the decoder reads every syntax the browser returns, against known values',
  p1.length === 0,
  p1.length ? `FAILED ${p1.join(' · ')}` : `${REFERENCE.length} references`
);

/* ── P2 — nothing is ever silently dropped. A colour syntax this decoder does not
   implement must be REPORTED as `unreadable` (so it is counted), and only a
   genuine non-colour may read as `none`. ── */
const MUST_BE_UNREADABLE = [
  'lab(50% 40 59.5)',
  'lch(50% 40 59.5)',
  'color(display-p3 1 0 0)',
  'var(--mr-ink)',
  'color-mix(in srgb, red, blue)',
];
const MUST_BE_NONE = ['none', 'currentcolor', 'inherit', 'unset', ''];
const wrong = MUST_BE_UNREADABLE.filter((c) => !readColor(c).unreadable).concat(
  MUST_BE_NONE.filter((c) => !!readColor(c).unreadable)
);
test(
  'P2 an unsupported colour is REPORTED (never dropped), a non-colour is not',
  wrong.length === 0,
  wrong.length ? `WRONG ${wrong.join(' · ')}` : `${MUST_BE_UNREADABLE.length} reported · ${MUST_BE_NONE.length} non-colours`
);
test(
  'P2 `transparent` decodes to a zero-alpha colour (not `none`, not `unreadable`)',
  (() => {
    const t = readColor('transparent');
    return !t.none && !t.unreadable && t.a === 0;
  })()
);

/* ── P3 — an ABSENCE GUARD over the walk's own source (rule 08). The decoder must
   be injected once per context, the unreadable counts must be real and read, and
   the rgb-only `parse` must be gone for good. ── */
const walk = readFileSync(WALK, 'utf8');
test(
  'P3 the walk injects the one decoder per context',
  READ_COLOR_SOURCE.indexOf('window.__mrReadColor') !== -1 &&
    walk.indexOf('context.addInitScript({ content: READ_COLOR_SOURCE })') !== -1 &&
    walk.indexOf('window.__mrReadColor') !== -1,
  'context.addInitScript(READ_COLOR_SOURCE)'
);
test(
  'P3 the walk COUNTS colours it cannot read (text and background)',
  walk.indexOf('unreadableForeground += 1') !== -1 &&
    walk.indexOf('unreadableBackground += 1') !== -1 &&
    walk.indexOf('const blindForeground = seen.unreadableForeground || 0') !== -1,
  'counted and surfaced on the row'
);
test(
  'P3 the rgb-only parser cannot come back (absence guard)',
  walk.indexOf('const parse = (c) =>') === -1 && walk.indexOf('const fg = parse(style.color)') === -1,
  'no second, rgb-only decoder'
);
test(
  'P3 a screen with an unreadable colour is WARNed, never claimed clean',
  /blindForeground \+ blindBackground > 0/.test(walk) && /NOT claimed clean/.test(walk),
  'the verdict cannot stay PASS'
);

/* ── P4 — the login portal is in the discovered inventory, reached by the app's own
   control, so the walk cannot quietly cover 147 of 148 screens (§06 §3). ── */
const inventory = discoverInventory();
const loginArea = inventory.areas.find((a) => a.screens.some((s) => s.id === 'login'));
const loginScreen = loginArea && loginArea.screens.find((s) => s.id === 'login');
test(
  'P4 discovery returns screens (a check that finds nothing is a FAILURE)',
  inventory.problems.length === 0 && inventory.areas.length > 0,
  inventory.problems.length ? inventory.problems.join(' · ') : `${inventory.areas.length} areas`
);
test(
  'P4 the login portal is walked, at its declared address, by its own control',
  !!loginScreen && loginScreen.path === '/login' && /Partner Login/.test(loginArea.how) && loginArea.kind === 'login',
  loginScreen ? `${loginArea.area} ${loginScreen.path} — ${loginArea.how}` : 'MISSING'
);

/* ── P5 — the gate is PROVED ABLE TO FAIL. Remove the oklab/oklch branch from a
   copy of the SAME source and confirm the very same checks now fail. ── */
const broken = new Function(
  `return (${readColor.toString().replace(/name === 'oklab' \|\| name === 'oklch'/, 'false')})`
)();
const brokenFailures = referenceFailures(broken);
test(
  'P5 a decoder with its oklab/oklch branch removed FAILS these checks (gate bites)',
  brokenFailures.length > 0,
  brokenFailures.length ? `caught ${brokenFailures.length} reference(s)` : 'the mutation was NOT detected — the checks prove nothing'
);

console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${assertions - failures}/${assertions} assertions`);
process.exit(failures === 0 ? 0 : 1);
