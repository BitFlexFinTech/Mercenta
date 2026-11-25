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
 *   T7  PROSE IS NOT A CALL SITE (§SUB-BATCH 2) — a class NAMED IN A COMMENT must not be counted, proved
 *       on a sample whose answer is known by construction. This is the gate for the counting defect.
 *   T8  THE DECISION NUMBERS (§SUB-BATCH 2) — spec's `§DECISION-BATCH10-2` classification must EQUAL
 *       what the method classifies now, so a decision cannot be taken on a figure that has since moved.
 *   T9  THE UNCOVERED LITERAL SITES (§SUB-BATCH 2) — the literal sites no shim rule covers are a
 *       RATCHET: they may only fall, and a covered class `src` no longer authors is reported.
 *
 * Run: node scripts/validate-legacy-styling-migration.mjs   (`npm run validate:all` runs it)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  measure,
  measureLiteralWhite,
  classifyLiteralFamily,
  subjectFiles,
  classSites,
  authoredStrings,
  tokensIn,
  LITERAL_WHITE,
} from './measure-legacy-classes.mjs';

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
  /**
   * §REPOINTED §BATCH 7 (2026-11-21) — NOT WEAKENED, AND ACTUALLY STRONGER.
   *
   * This required BOTH families to be non-empty (`grey > 0 && ink > 0`). That was right
   * while the migration was in progress, but it FORCES A FALSE STATE once a family is
   * legitimately exhausted: a finished migration would fail its own gate, which would
   * tempt a later session to keep legacy classes purely to make the number non-zero —
   * the exact trap this validator's own §REPOINTED notes describe.
   *
   * The stable intent is "the walk was non-vacuous and the reader really reads". It now
   * requires: files walked > 0; AT LEAST ONE family still holds subjects (INK does); and
   * a POSITIVE CONTROL — `bg-surface`, a class this codebase certainly uses, must be
   * found, which proves the reader is parsing real class strings and not silently
   * returning zero for everything.
   */
  files.length > 0 &&
    M.filesWalked > 0 &&
    (M.grey.sites > 0 || M.ink.sites > 0) &&
    sitesOf('bg-surface') > 0,
  `walked ${M.filesWalked} files · grey ${M.grey.sites} · ink ${M.ink.sites} · positive control bg-surface ${sitesOf('bg-surface')}`,
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
 * The Batch-10 CEILING. The migration may only reduce these counts. The ceiling is lowered by the batch
 * that lowers the count, recording the new figure here — and lowering it can never be used to make a
 * check pass, because what is compared is the MEASURED value (this is a ceiling, not an equality).
 *
 * §SUB-BATCH 2 (2026-10-16) — LOWERED FROM grey 4,508 / ink 960 / literal 1,676, because those were the
 * counts produced by the DEFECTIVE reader: it matched the raw file text, so a class NAMED IN A COMMENT
 * was counted as a call site. Measured: 13 grey sites, 13 literal sites (all prose) and 100 prose
 * mentions inside `classSites()` — which is what feeds the "is this shim rule still used?" verdict, so a
 * comment could certify a dead rule as live. The reader now takes the strings the parser sees; the
 * ceiling is lowered to the TRUE counts, and lower is the direction that matters.
 */
/**
 * §BATCH 5a (2026-11-21) — LOWERED FROM grey 2,785 / ink 929 to the counts this
 * batch measured after migrating the SHARED PRIMITIVES onto the canonical theme
 * ladder: `src/components/ui.tsx` (the UI kit), `src/components/shared/workspace.tsx`
 * (the frame/header/metric/queue primitives), `DataTable`, `dashboard`, the chart
 * system, `ThemeSelector` and the six `src/components/layout/` files.
 *
 *   · grey 2,785 -> 2,675  (-110): `zinc-*` -> the declared text ladder
 *     (`text-strong` · `text-muted` · `text-faint`) and the surface ladder.
 *   · ink 929 -> 907       (-22): `brass-*` -> `accent-*`, the CANONICAL name for
 *     `--mr-accent` (declared in `tailwind.config.js` this batch as an exact
 *     mirror of `brass`, so the rename moves no pixel); and `bg-ink-*` ->
 *     `bg-surface-*`.
 *
 * §FINDING — THE INK FAMILY COUNTS `surface-*`, WHICH IS NOT AN ALIAS (2026-11-21).
 * The `ink` -> `surface` half of this rename moved sites BETWEEN two members of
 * this very family (`INK` is defined as `ink-N | surface-* | brass-N`), so it
 * lowered the count by almost nothing. That is because `--mr-surface*` is the
 * CANONICAL token name (`src/config/themes.ts`) and `ink` is the alias — so
 * `surface-*` is not legacy at all, and this family cannot reach zero by
 * migration. Recorded as a finding needing a decision (see PROJECT_STATUS.md
 * §BATCH 5a), NOT silently redefined here: changing what a metric counts is
 * exactly the change that must not be made quietly.
 */
/**
 * §BATCH 5b (2026-11-21) — LOWERED FROM grey 2,675 / ink 907 to the counts this
 * batch measured after migrating the REMAINING SHARED COMPONENTS onto the canonical
 * ladder: `BrandGuidance`, `WorkWorkspace`, `TamSamDisplay`, `CommerceSimulationPanel`,
 * `TourEngine`, `LiveChatWidget`, `ImageUploader`, `CsvCatalogImport`,
 * `ShippingCostEstimate`, `BrandComm`, `RoutingRequest`, `CommandPalette`,
 * `NotificationCenter`, `ProductThumb`, `ErrorBoundary`, `UnlockGrowth` and the five
 * `src/components/shared/logistics/` panels.
 *
 *   · grey 2,675 -> 2,401  (-274): `zinc-*` -> the declared text ladder; `parchment`
 *     -> `soft` (the declared `--mr-text-soft` step).
 *   · ink 907 -> 848       (-59): `brass-*` -> `accent-*` (the canonical name); and
 *     `bg-ink-*` -> `bg-surface-*`.
 */
/**
 * §BATCH 6 (2026-11-21) — LOWERED FROM grey 2,401 / ink 848 to the counts this batch
 * measured after migrating the SIGNED-IN BRAND PORTAL onto the canonical ladder: all
 * 23 files in `src/components/brand/` (`BrandPurchaseOrders` · `BrandSettings` ·
 * `OnboardingWizard` · `LogisticsHub` · `BrandTeamMessages` · `ProductCatalog` ·
 * `SalesAnalytics` · `BrandReturns` · `BrandInventory` · `BrandReports` ·
 * `ListingAnalyzer` · `BrandIntelligence` · `DeductionsLedger` · `CommercialReadiness` ·
 * `ComplianceHub` · `BrandDashboard` · `SalesEstimatorCard` · `OnboardingSummary` ·
 * `BrandSupport` · `BrandSelfService` · `BrandContractView` · `LiftOffProgramme` ·
 * `WorkManagement`). ZERO legacy sites remain in that folder.
 *
 *   · grey 2,401 -> 1,832  (-569): `zinc-*` -> the declared text ladder.
 *   · ink 848 -> 759       (-89): `brass-*` -> `accent-*`; `bg-ink-*` -> `bg-surface-*`.
 */
/**
 * §BATCH 7 (2026-11-21) — LOWERED TO grey 0 · ink 468.
 *
 * THE LEGACY GREY FAMILY IS NOW ZERO ACROSS THE WHOLE PRODUCT. This batch migrated the
 * signed-in ADMIN area (all 56 files in `src/components/admin/`) and then finished the
 * sweep across every remaining `.tsx` and `.ts` source: `src/components/auth/`,
 * `src/components/marketing/`, `src/components/design/`, `src/App.tsx`,
 * `src/components/ui.tsx` and `src/lib/intelligence/intelligenceTypes.ts`.
 *
 *   · grey 1,832 -> 0     : `zinc-*` -> the declared text ladder; `steel` -> `muted`;
 *                           `parchment` -> `soft`; the last six sites lived in
 *                           `src/lib/intelligence/intelligenceTypes.ts`.
 *   · ink 759 -> 468      : `brass-*` -> `accent-*`; `bg-ink-*` -> `bg-surface-*`; the
 *                           four `accent-brass-500` accent-colour utilities ->
 *                           `accent-[var(--mr-accent)]`.
 *
 * THE REMAINING 468 ARE `surface-*`, WHICH IS NOT LEGACY. `INK` is defined as
 * `ink-N | surface-* | brass-N`, but `--mr-surface*` is the CANONICAL token name and
 * `ink` is the alias — so this family cannot reach zero by migration. Recorded as a
 * decision (PROJECT_STATUS.md §BATCH 5a), NOT silently redefined.
 *
 * §CORRECTED 2026-11-25 (WAVE 3l, rule 10) — "THE LEGACY GREY FAMILY IS NOW ZERO ACROSS
 * THE WHOLE PRODUCT" WAS TRUE OF THE APPLICATION AND IS NOT TRUE OF THE WHOLE SUBJECT.
 * The console (`src/next/**`) arrived AFTER this batch and authors 1,746 grey-family and
 * 279 literal `white`/`black` sites, because it declares its own `--color-next-*` tokens
 * and uses none of them. Measured this session with this project's own method, the
 * APPLICATION holds grey 6/1 · ink 483/98 · literal 0/0, and the CONSOLE holds
 * grey 1746/44 · ink 0/0 · literal 279/38. The sentence above is left in place as what it
 * was (a true statement about the application on that date) and this correction is added
 * beneath it, because a claim that survives the thing it describes becomes a false
 * statement about the product.
 *
 * §UPDATED 2026-11-25 (WAVE 3m) — THE CONSOLE IS NOW MIGRATED, SO THE PARAGRAPH ABOVE IS HISTORY. All 1,746 grey
 * and 279 literal sites in `src/next/**` were repointed onto the console's own declared classes (values identical,
 * so nothing moved), and `scripts/validate-next-console-tokens.mjs` now makes that permanent. The whole subject
 * measured grey 6/1 · ink 912/136 · literal 0/0, and the only failure of T3 was the INK arm — which the family's
 * own definition made unreachable by migration.
 *
 * §REPOINTED 2026-11-25 (rule 10; the recorded decision applied) — T3 PASSES NOW, AND THE REASON IS REVIEWABLE.
 * The `ink` family was `ink-N | surface-* | brass-N`, and `surface-*` is the migration's DESTINATION, so the arm
 * could only GROW as the migration succeeded. The Owner's recorded decision — count only the genuinely old names,
 * leave the LIMIT untouched — has been applied in `scripts/measure-legacy-classes.mjs`: the family is now
 * `ink-N | brass-N`, which is what the metric always claimed to measure.
 *
 *   · measured after the repoint: grey 6/1 · ink 127/29 · literal 0/0
 *     (application grey 6/1 · ink 14/2 · literal 0/0; console grey 0/0 · ink 113/27 · literal 0/0).
 *
 * THE CEILING IS DELIBERATELY LEFT AT 468, AND THIS IS NOT A LOOSENING — it was already 468, and the decision was
 * explicitly to leave the LIMIT alone rather than move it. What changed is WHAT IS COUNTED. Stated plainly rather
 * than hidden: the ink arm now has 341 sites of headroom (127 measured against 468), so it is a LOOSE ratchet for
 * this one family; lowering it to the measured 127 is a one-line tightening a later batch may take, and it is not
 * taken here because the Owner's decision was to leave the limit untouched.
 */
const CEILING = { grey: 6, ink: 468, literal: 0, uncovered: 0 };
check('T3 the ratchet: no family has GROWN past the Batch-10 ceiling', (
  M.grey.sites <= CEILING.grey && M.ink.sites <= CEILING.ink && W.sites <= CEILING.literal
), `grey ${M.grey.sites}/${CEILING.grey} · ink ${M.ink.sites}/${CEILING.ink} · literal ${W.sites}/${CEILING.literal}`);

/* ── T7 — PROSE IS NOT A CALL SITE (the defect fixed at source, proved) ──── */
/**
 * §SUB-BATCH 2. The counting defect was: a class mentioned in a COMMENT counted as authored. A fix with
 * no gate comes back (`07-fix-defects-at-source.md` §4), so this check drives the reader with a sample
 * whose answer is known BY CONSTRUCTION: the same three classes appear once in a comment and once in a
 * string literal, and only the string literal may be counted.
 */
const PROSE_SAMPLE = [
  "const a = 1; /* text-white border-white/[0.06] bg-white/[0.02] are the classes */",
  "// hover:text-white",
  "const cls = 'text-white border-white/[0.06] bg-white/[0.02]';",
].join('\n');
const proseCounted = authoredStrings(PROSE_SAMPLE, 'sample.ts').reduce((n, s) => n + tokensIn(LITERAL_WHITE, s.value).length, 0);
check(
  'T7 a class NAMED IN A COMMENT is not a call site (prose is excluded by construction)',
  proseCounted === 3,
  `the sample names three literal classes once in comments and once in a string — the reader counted ${proseCounted}, and must count exactly 3`,
);

/* ── T8 / T9 — THE CLASSIFICATION THE TWO DECISIONS REST ON ─────────────── */
/**
 * §SUB-BATCH 2. The migration's own two decisions (the border hairlines; white text on a saturated
 * fill) must be taken WITH the numbers, so the numbers are recorded in the spec AND machine-read back:
 * a decision recorded from a figure that has since changed is a decision about a different product.
 */
const CLASSIFICATION = classifyLiteralFamily(files);
const COVERED_MARKER = /§DECISION-BATCH10-2:\s*method=([\w./-]+)\s+date=(\d{4}-\d{2}-\d{2})\s+literal=(\d+)\/(\d+)\s+border=(\d+)\s+text=(\d+)\s+bg=(\d+)\s+divide=(\d+)\s+ring=(\d+)\s+solid=(\d+)\s+tint=(\d+)\s+uncovered=(\d+)/;
const decision = COVERED_MARKER.exec(SPEC);
check(
  'T8 spec records the CLASSIFICATION the decisions rest on (§DECISION-BATCH10-2, with method + date)',
  !!decision,
  'docs/OPENSHIP_REFERENCE_SPEC.md must carry the machine-readable §DECISION-BATCH10-2 line',
);
if (decision) {
  const [, method, date, lS, lF, border, text, bg, divide, ring, solid, tint, uncovered] = decision;
  const prefix = (k) => (CLASSIFICATION.byPrefix.find(([p]) => p === k) || [, 0])[1];
  const agree =
    method === 'scripts/measure-legacy-classes.mjs' &&
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    [Number(lS), Number(lF), Number(border), Number(text), Number(bg), Number(divide), Number(ring), Number(solid), Number(tint)].join(',') ===
      [CLASSIFICATION.sites, W.files, prefix('border'), prefix('text'), prefix('bg'), prefix('divide'), prefix('ring'), CLASSIFICATION.textSites.onFillSolid, CLASSIFICATION.textSites.onFillTint].join(',');
  check(
    'T8 the recorded classification EQUALS what the method classifies now',
    agree,
    `recorded literal ${lS}/${lF} border ${border} text ${text} bg ${bg} divide ${divide} ring ${ring} solid ${solid} tint ${tint} ` +
      `| measured literal ${CLASSIFICATION.sites}/${W.files} border ${prefix('border')} text ${prefix('text')} bg ${prefix('bg')} ` +
      `divide ${prefix('divide')} ring ${prefix('ring')} solid ${CLASSIFICATION.textSites.onFillSolid} tint ${CLASSIFICATION.textSites.onFillTint} ` +
      `· recorded uncovered ${uncovered}`,
  );
}

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

/**
 * ── T9 — THE LITERAL SITES THE BLOCK NEVER COVERS (a ratchet, and the third decision's numbers) ──
 *
 * §SUB-BATCH 2. Not every authored literal class has a shim selector. Those sites paint LITERALLY on a
 * light shell — which is correct for a scrim (`bg-black/70`), intentional for a printable document
 * (`bg-white text-black`), and a defect for an INTERACTION state (a `hover:border-white/20` hairline over
 * a #FAFAFA surface is invisible, so the hover does not read). The measured count is therefore recorded
 * as a CEILING: the migration may only reduce it, and a NEW uncovered literal site fails here.
 */
const coveredBase = new Set();
for (const r of rules) {
  for (const sel of r.selectors) {
    for (const c of classesOf(sel)) {
      /**
       * The variant is stripped BEFORE the family test: a selector like `.hover\:bg-white\/\[0\.1\]:hover`
       * yields `hover:bg-white/[0.1]`, which does NOT start with a property prefix — testing it un-stripped
       * made every VARIANT-covered class look uncovered (measured: `hover:bg-white/[0.1]` 4 sites and
       * `group-hover:border-white/[0.3]` 1 site were reported as uncovered although the block remaps both).
       */
      const base = c.replace(/^(?:[a-z-]+:)+/, '');
      if (/^(?:text|bg|border|divide|ring|from|to|via|placeholder|decoration)-(?:white|black)/.test(base)) {
        coveredBase.add(base);
      }
    }
  }
}
const uncoveredLiteral = CLASSIFICATION.byBase.filter(([base]) => !coveredBase.has(base));
const uncoveredSites = uncoveredLiteral.reduce((n, [, c]) => n + c, 0);
console.log(
  `      T9 measured: ${uncoveredSites} uncovered literal sites in ${uncoveredLiteral.length} classes (ceiling ${CEILING.uncovered}) — ` +
    uncoveredLiteral.map(([b, c]) => `${b} ${c}`).join(' · '),
);
check(
  'T9 the literal sites NO shim rule covers have not grown past the recorded ceiling (ratchet)',
  uncoveredSites <= CEILING.uncovered,
  `uncovered ${uncoveredSites}/${CEILING.uncovered} sites in ${uncoveredLiteral.length} classes: ` +
    uncoveredLiteral.map(([b, c]) => `${b} ${c}`).join(' · '),
);
check(
  'T9 every class the block DOES cover is a class src still authors (no coverage of a class that is gone)',
  [...coveredBase].every((b) => CLASSIFICATION.byBase.some(([base]) => base === b)),
  [...coveredBase].filter((b) => !CLASSIFICATION.byBase.some(([base]) => base === b)).join(' · ') || '',
);

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
