/**
 * §OPENSHIP BATCH 10 — THE LEGACY-STYLING MIGRATION GATE (step 1: the measurement).
 *
 * WHY THIS EXISTS
 * ---------------
 * Batch 10 is "the legacy-styling migration": repoint the hardcoded grey / `ink` / `surface` /
 * `brass` class sites onto the theme tokens, then DELETE the `src/index.css` light-shell force-patch
 * block (the `§UI/UX WAVE 1 — LIGHT-SHELL TOKEN REMAP LAYER`) with an absence guard proved able to
 * fail. Before this file, NONE of that was checkable:
 *
 *   · the figures the migration was planned from (spec §12: 2,812 + 857 sites) named no method, so
 *     the migration's own first step — a re-measurement — could not reproduce them (rule 10 §2);
 *   · the force-patch block had no gate at all, so it could grow dead rules for ever, or be deleted
 *     while the class sites it remaps were still there — which would silently break EVERY light
 *     shell (the block is the only reason `text-white`/`border-white/[0.06]` are readable on them).
 *
 * WHAT IT ASSERTS (all figures DERIVED from their owner, never typed in)
 * ---------------------------------------------------------------------
 *   T1  DISCOVERY IS NON-EMPTY — a check that finds nothing is a FAILURE, not a pass (rule 10 §5).
 *   T2  THE DOCUMENT MATCHES THE CODE — spec §12's recorded figures must equal what the method
 *       measures, and must name the method and its date. One method, one owner.
 *   T3  THE RATCHET — no family may grow past its frozen Batch-10 ceiling. A new legacy site fails.
 *   T4  EVERY SHIM RULE IS USED — a rule whose class has no site left in `src` is dead weight and
 *       must be deleted, not kept "just in case".
 *   T5  EVERY SIMPLE SHIM RULE IS NECESSARY — if Tailwind's own palette already resolves the class to
 *       exactly the value the rule declares, the rule changes nothing and must be deleted.
 *   T6  THE ABSENCE GUARD — the force-patch block must exist while any literal-`white` site remains,
 *       and must NOT exist once they are gone. This is the guard the batch must be able to pass.
 *
 * Run: node scripts/validate-legacy-styling-migration.mjs   (`npm run validate:all` runs it)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { measure, measureLiteralWhite, subjectFiles, classSites } from './measure-legacy-classes.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

let checks = 0;
let failures = 0;
function check(name, ok, detail = '') {
  checks++;
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) {
    failures++;
    if (detail) console.log(`      ${detail}`);
  }
}

/* ── THE SUBJECT AND THE MEASUREMENT ─────────────────────────────────────── */
const files = subjectFiles();
const M = measure();
const W = measureLiteralWhite();
const CSS = read('src/index.css');
const SPEC = read('docs/OPENSHIP_REFERENCE_SPEC.md');

/** Every class token authored in `src`, with its site count (the method's own owner). */
const SITE_COUNTS = classSites(files);
const sitesOf = (cls) => SITE_COUNTS.get(cls) || 0;

/* ── T1 — DISCOVERY IS NON-EMPTY ─────────────────────────────────────────── */
check(
  'T1 the method DISCOVERS a non-empty subject (a check that finds nothing is a failure)',
  files.length > 0 && M.grey.sites > 0 && M.ink.sites > 0,
  `walked ${M.filesWalked} files · grey ${M.grey.sites} · ink ${M.ink.sites}`,
);

/* ── T2 — THE DOCUMENT MATCHES THE CODE ──────────────────────────────────── */
const recorded = /§MEASURED-BATCH10:\s*method=([\w./-]+)\s+date=(\d{4}-\d{2}-\d{2})\s+grey=(\d+)\/(\d+)\s+ink=(\d+)\/(\d+)\s+literal=(\d+)\/(\d+)/.exec(SPEC);
check(
  'T2 spec §12 records the measured figures WITH the method and the date (§MEASURED-BATCH10)',
  !!recorded,
  'docs/OPENSHIP_REFERENCE_SPEC.md must carry the machine-readable §MEASURED-BATCH10 line',
);
if (recorded) {
  const [, method, date, gS, gF, iS, iF, lS, lF] = recorded;
  const agree =
    method === 'scripts/measure-legacy-classes.mjs' &&
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    [Number(gS), Number(gF), Number(iS), Number(iF), Number(lS), Number(lF)].join(',') ===
      [M.grey.sites, M.grey.files, M.ink.sites, M.ink.files, W.sites, W.files].join(',');
  check(
    'T2 the recorded figures EQUAL what the method measures now (the document cannot drift)',
    agree,
    `recorded grey ${gS}/${gF} · ink ${iS}/${iF} · literal ${lS}/${lF} ` +
      `| measured grey ${M.grey.sites}/${M.grey.files} · ink ${M.ink.sites}/${M.ink.files} · literal ${W.sites}/${W.files}`,
  );
}

/* ── T3 — THE RATCHET ────────────────────────────────────────────────────── */
/**
 * The Batch-10 CEILING: the counts measured when the migration opened (2026-10-15). The migration
 * may only reduce them. The ceiling is lowered by the batch that lowers the count, recording the new
 * figure here — and lowering it can never be used to make a check pass, because what is compared is
 * the MEASURED value (this is a ceiling, not an equality).
 */
const CEILING = { grey: 4508, ink: 960, literal: 1676 };
check('T3 the ratchet: no family has GROWN past the Batch-10 ceiling', (
  M.grey.sites <= CEILING.grey && M.ink.sites <= CEILING.ink && W.sites <= CEILING.literal
), `grey ${M.grey.sites}/${CEILING.grey} · ink ${M.ink.sites}/${CEILING.ink} · literal ${W.sites}/${CEILING.literal}`);

/* ── THE FORCE-PATCH BLOCK, PARSED FROM ITS OWN SOURCE ───────────────────── */
const MARKER = 'LIGHT-SHELL TOKEN REMAP LAYER';
const at = CSS.indexOf(MARKER);
const nextDoc = at < 0 ? -1 : CSS.indexOf('\n/**', at + MARKER.length);
const BLOCK = at < 0 ? null : CSS.slice(at, nextDoc < 0 ? CSS.length : nextDoc);

function parseRules(block) {
  const rules = [];
  for (const m of block.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    const selectors = m[1].split(',').map((s) => s.trim()).filter(Boolean);
    const [prop, ...rest] = m[2].split(';')[0].split(':');
    rules.push({ selectors, prop: prop.trim(), value: rest.join(':').trim() });
  }
  return rules;
}
/** The class tokens inside a shim selector, unescaped (`hover\:text-white` → `hover:text-white`). */
const classesOf = (sel) =>
  [...sel.matchAll(/\.((?:[A-Za-z0-9_-]|\\.)+)/g)].map((m) => m[1].replace(/\\/g, ''));

/* ── TAILWIND'S OWN RESOLUTION (imported from its owner, never retyped) ──── */
const { default: twConfig } = await import(pathToFileURL(path.join(ROOT, 'tailwind.config.js')).href);
const TW_COLORS = (twConfig.theme && twConfig.theme.extend && twConfig.theme.extend.colors) || {};
const VARIANT = /^(hover|group-hover|focus|active|disabled|focus-visible):/;

/** What Tailwind itself paints for a colour class, or a stated reason it cannot. */
function twValueFor(cls) {
  const base = cls.replace(VARIANT, '');
  const m = /^(text|bg|border|divide|ring|from|to|via|placeholder|decoration|fill|stroke|accent|caret)-(.+)$/.exec(base);
  if (!m) return { kind: 'not-a-colour-class' };
  let rest = m[2];
  let alpha = null;
  const slash = rest.lastIndexOf('/');
  if (slash > 0) {
    alpha = rest.slice(slash + 1);
    rest = rest.slice(0, slash);
  }
  const dot = rest.lastIndexOf('-');
  const name = dot > 0 ? rest.slice(0, dot) : rest;
  const step = dot > 0 ? rest.slice(dot + 1) : 'DEFAULT';
  let value = TW_COLORS[rest];
  if (value === undefined && TW_COLORS[name] && typeof TW_COLORS[name] === 'object') {
    value = TW_COLORS[name][step] !== undefined ? TW_COLORS[name][step] : TW_COLORS[name].DEFAULT;
  }
  if (typeof value !== 'string') return { kind: 'tailwind-does-not-define-it' };
  /**
   * An alpha modifier on a CSS-variable colour is SILENTLY DROPPED by Tailwind 3.4 (that is why
   * `src/theme-alpha-shims.css` exists); on a literal it becomes an rgba() literal. Either way the
   * class does not resolve to a theme token, so a shim rule for it is doing real work.
   */
  if (alpha) return { kind: 'alpha', literal: !value.startsWith('var(') };
  return { kind: 'plain', value };
}

/* ── T4 / T5 — EVERY SHIM SELECTOR IS USED, AND NECESSARY ───────────────── */
/**
 * CSS comments are stripped BEFORE parsing: this block carries its reasoning in comments, and one of
 * them sits directly above a selector (`2.24:1 → 3.23:1`), where a naive parse read `.24` and `.23`
 * as class tokens and reported two rules "unused" that do not exist.
 */
const BLOCK_CLEAN = (BLOCK || '').replace(/\/\*[\s\S]*?\*\//g, '');
const rules = parseRules(BLOCK_CLEAN);
/** State-hook helpers — they carry no colour of their own (`group`, `peer`). */
const HOOKS = new Set(['group', 'peer']);
const unused = [];
const redundant = [];
const restoreRules = [];
const variantRules = [];
const anomalies = [];
for (const r of rules) {
  /**
   * Analysis is PER SELECTOR, never per rule: one rule may list five selectors of which three are
   * live and two are dead (`.divide-white/[0.04]` … `/[0.08]`), and mixing them makes the verdict
   * meaningless.
   */
  for (const sel of r.selectors) {
    const classes = classesOf(sel);
    const hooks = classes.filter((c) => HOOKS.has(c));
    const withColour = classes.filter((c) => !HOOKS.has(c));
    /** T4 — used: every COLOUR class the selector names must still be authored somewhere in `src`.
     *  State hooks (`group`) carry no colour, so they are excluded — they are Tailwind markers, not
     *  classes a component chooses. */
    for (const c of withColour) {
      if (sitesOf(c) === 0) unused.push(`${c} (in ${sel})`);
    }
    if (withColour.length === 1) {
      /**
       * A DIRECT REMAP (or a variant of one): the class resolves to the declared value unless this
       * rule says otherwise. If Tailwind already paints exactly that value, the rule changes nothing
       * and is redundant. A VARIANT remap is the same test — Tailwind paints `hover:text-white` the
       * same literal as `text-white`, so the test carries over unchanged.
       */
      const own = withColour[0];
      const tw = twValueFor(own);
      if (VARIANT.test(own)) variantRules.push(own);
      if (tw.kind === 'plain' && tw.value === r.value) redundant.push(`${own} → ${r.value} (in ${sel})`);
    } else if (withColour.length === 0) {
      /** A selector with no colour class at all is a parse anomaly, never a rule — reported, not guessed. */
      anomalies.push(sel);
    } else {
      /**
       * A RESTORE rule (`[light] .bg-state-danger.text-white`): it exists to undo a direct remap on a
       * SATURATED FILL, where the remapped text colour would be unreadable. It is checked the other
       * way round — its declared value must equal what Tailwind paints for the class it restores,
       * which is what proves it RESTORES the original rather than inventing a fourth colour — and at
       * least one of the fills it guards must still exist (a guard over five fills, three of them
       * live, is a live guard; one over nothing at all is dead weight).
       */
      const own = withColour[withColour.length - 1];
      const guards = withColour.slice(0, -1);
      const tw = twValueFor(own);
      restoreRules.push({
        sel,
        own,
        restores: tw.kind === 'plain' ? tw.value === r.value : null,
        guardUsed: guards.length > 0 && guards.some((c) => sitesOf(c) > 0),
      });
    }
  }
}
const shimPresent = !!BLOCK && rules.length > 0;

check(
  'T4 every shim rule targets a class still AUTHORED in src (no rule kept for a class that is gone)',
  unused.length === 0,
  unused.length ? `unused: ${unused.join(' · ')}` : '',
);
check(
  'T5 no simple shim rule merely REPEATS what Tailwind already resolves (no redundant rule)',
  redundant.length === 0,
  redundant.length ? `redundant: ${redundant.join(' · ')}` : '',
);
check(
  'T5b every RESTORE rule restores the fill own colour, over at least one live fill',
  restoreRules.every((r) => r.restores === true && r.guardUsed),
  restoreRules.map((r) => `${r.own}: restores=${r.restores} guardUsed=${r.guardUsed}`).join(' · '),
);
check(
  'T5c the block carries NO dead-by-absence selector and NO redundant rule (see the two lists above)',
  unused.length === 0 && redundant.length === 0,
  `unused=${unused.length} · redundant=${redundant.length} · variant remaps checked: ${variantRules.join(', ')}` +
    (anomalies.length ? ` · PARSE ANOMALIES: ${anomalies.join(' · ')}` : ''),
);

/* ── T6 — THE ABSENCE GUARD ─────────────────────────────────────────────── */
check(
  'T6 the light-shell force-patch block EXISTS while literal-white sites remain (and only then)',
  shimPresent === (W.sites > 0),
  shimPresent
    ? `block present with ${W.sites} literal sites — correct while the migration is open`
    : `block ${BLOCK ? 'present' : 'ABSENT'} with ${W.sites} literal sites — ` +
      (W.sites > 0
        ? 'deleting it now would leave every light shell unreadable (this is the guard the batch must satisfy)'
        : 'the migration is complete, so the block must be GONE'),
);

console.log(failures === 0
  ? `LEGACY_STYLING_VALIDATION_PASS (${checks} checks)`
  : `LEGACY_STYLING_VALIDATION_FAIL (${failures} of ${checks})`);
if (failures > 0) process.exit(1);
