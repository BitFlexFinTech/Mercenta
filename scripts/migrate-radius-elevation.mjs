#!/usr/bin/env node
/**
 * §PHASE C4 — RADIUS + ELEVATION SCALE MIGRATION (idempotent).
 *
 * WHY THIS EXISTS
 * ---------------
 * The design system declared four named radii (`ds-sm` 6 · `ds-md` 10 · `ds-lg` 14
 * · `ds-pill`) and the product rendered five UNNAMED ones. Measured in `src/`
 * before this change:
 *
 *     rounded-lg    387   (8px)   |  rounded-ds-md   41  (10px)
 *     rounded-md     97   (6px)   |  rounded-ds-lg   26  (14px)
 *     rounded        85   (4px)   |  rounded-ds-sm   22  (6px)
 *     rounded-xl     58   (12px)  |  rounded-2xl      4  (16px)
 *     rounded-full   76   (9999px)
 *
 * 630 class sites had no place in the named ramp, and the two named steps that
 * existed were consumed almost nowhere — so a reader of `docs/DESIGN_SYSTEM.md`
 * was told a scale the product did not use. That is a design-system failure, not
 * 630 individual mistakes, which is why the fix is the TOKEN FIRST (repointed in
 * `tailwind.config.js` onto the geometry the app already renders) and then this
 * MECHANICAL migration onto it.
 *
 * WHAT IT DOES — RADIUS
 * ---------------------
 *     rounded         (4px)   →  rounded-ds-sm   (6px)
 *     rounded-sm      (2px)   →  rounded-ds-sm   (6px)
 *     rounded-md      (6px)   →  rounded-ds-sm   (6px)   ← no pixel change
 *     rounded-lg      (8px)   →  rounded-ds-md   (8px)   ← no pixel change
 *     rounded-xl      (12px)  →  rounded-ds-lg   (12px)  ← no pixel change
 *
 * WHAT IT DOES — ELEVATION
 * ------------------------
 * The elevation roles already exist as THEME-DRIVEN tokens in
 * `src/config/themes.ts` (`--mr-shadow-subtle` resting · `--mr-shadow-raised`
 * interactive · `--mr-shadow-overlay` floating · `shadow-ds-focus` ring) — and
 * the app rendered 19 UNNAMED shadows beside them, 15 of those being `shadow-2xl`
 * on modals, popovers, dropdowns and floating cards, i.e. on exactly the surfaces
 * the overlay role exists for:
 *
 *     shadow-2xl                      (15)  →  shadow-ds-overlay    (floating)
 *     shadow-xl                       (1)   →  shadow-ds-overlay    (popover)
 *     hover:shadow-[0_6px_20px_…]     (1)   →  hover:shadow-ds-raised (hover lift)
 *     shadow-lg shadow-brass-500/30   (1)   →  shadow-ds-raised     (see the note)
 *     shadow-sm                       (1)   →  shadow-ds-subtle     (active pill)
 *     shadow-none                     (1)   →  shadow-ds-none       (link button)
 *
 * ONE BEHAVIOUR NOTE, stated rather than hidden: on the active onboarding step the
 * old classes were `shadow-lg shadow-brass-500/30` — a BRASS-TINTED glow. A token
 * shadow bakes its colour INTO the CSS variable, so Tailwind's shadow-colour
 * utility can no longer tint it; the colour class would have become dead weight.
 * The site therefore becomes `shadow-ds-raised` (a neutral lift on a brass fill)
 * and the inert colour class is REMOVED rather than left behind pretending to work.
 *
 * An INSET glow is not elevation and is not migrated: `shadow-[inset_…]` in
 * `src/components/marketing/Home.tsx` is a decorative inner-stamp effect. The gate
 * permits an arbitrary shadow ONLY when it is inset, so an arbitrary OUTER shadow
 * can never hide behind that allowance.
 *
 * WHAT IT DELIBERATELY DOES NOT TOUCH
 * -----------------------------------
 * · `rounded-2xl` (16px) — permitted ONLY on large marketing/hero blocks, the same
 *   way the type scale permits Tailwind's larger sizes above the 20px page step.
 *   The gate asserts it stays inside `src/components/marketing/`.
 * · `rounded-full` — Tailwind's own step and the SAME VALUE as `ds-pill`; an
 *   accepted alias for the pill role, so renaming 76 perfectly self-describing
 *   sites would be churn with no visual effect.
 *
 * THE BARE `rounded` RULE — and the blind spot it fixes
 * ----------------------------------------------------
 * "rounded" is also an ordinary English word (`src/lib/**` prose such as "rounded
 * to two decimals", and comments such as "a rounded banner"), so bare `rounded`
 * is rewritten ONLY inside a STRING LITERAL that is itself a CLASS LIST — a string
 * carrying at least one other Tailwind token (`bg-`, `text-`, `border`, `px-`, …).
 * Comments are therefore never touched (they are not string literals) and a real
 * class list is always caught.
 *
 * That second point is a FIXED BLIND SPOT, not a theory: the first version of this
 * test was "a space whose preceding character cannot end a word", which silently
 * SKIPPED `bg-ink-850 border rounded px-2 py-1` (the word `border` ends in a
 * letter) — two live sites in
 * `src/components/admin/BrandIntelligencePanel.tsx`. A migration whose rule cannot
 * see a real site is worse than no rule, so the test was replaced, not patched.
 *
 * Idempotent: re-running it is a no-op. `--dry-run` reports without writing.
 *
 * Run: node scripts/migrate-radius-elevation.mjs [--dry-run]
 * Gate: npm run validate:radius-elevation  (fails if an unnamed radius or an
 *       unnamed shadow reappears, or if a live describer states a value the
 *       declared scale does not contain)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
/* §SSOT — ONE implementation of "what is a class list", shared with the gate
   (`scripts/validate-radius-elevation-scale.mjs`). If the two disagreed, the gate
   would pass while the migration missed a site. */
import { classStrings, literalEnd } from './lib/design-scale-scan.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');

/** Unambiguous Tailwind radius → canonical token. Order matters. */
const RULES = [
  { from: /rounded-xl\b/g, to: 'rounded-ds-lg', label: 'rounded-xl  (12px) → rounded-ds-lg (12px)' },
  { from: /rounded-lg\b/g, to: 'rounded-ds-md', label: 'rounded-lg   (8px) → rounded-ds-md  (8px)' },
  { from: /rounded-md\b/g, to: 'rounded-ds-sm', label: 'rounded-md   (6px) → rounded-ds-sm  (6px)' },
  { from: /rounded-sm\b/g, to: 'rounded-ds-sm', label: 'rounded-sm   (2px) → rounded-ds-sm  (6px)' },
  /**
   * PER-SIDE radii are the same scale applied to ONE edge, and they need their own
   * rules: a rule written for `rounded-lg` cannot see `rounded-t-lg`. That was a
   * real blind spot — one live site in `src/components/brand/BrandSettings.tsx`
   * survived the first pass and was found by the gate's per-side check, which is
   * exactly the job that check exists to do.
   */
  { from: /rounded-([trblxyse])-xl\b/g, to: 'rounded-$1-ds-lg', label: 'rounded-<side>-xl  → rounded-<side>-ds-lg' },
  { from: /rounded-([trblxyse])-lg\b/g, to: 'rounded-$1-ds-md', label: 'rounded-<side>-lg  → rounded-<side>-ds-md' },
  { from: /rounded-([trblxyse])-md\b/g, to: 'rounded-$1-ds-sm', label: 'rounded-<side>-md  → rounded-<side>-ds-sm' },
  { from: /rounded-([trblxyse])-sm\b/g, to: 'rounded-$1-ds-sm', label: 'rounded-<side>-sm  → rounded-<side>-ds-sm' },
];

/** Unnamed Tailwind shadow → the canonical elevation ROLE it actually is. */
const SHADOW_RULES = [
  {
    from: /shadow-lg shadow-brass-500\/30/g,
    to: 'shadow-ds-raised',
    label: 'shadow-lg + brass glow  → shadow-ds-raised',
  },
  {
    from: /hover:shadow-\[0_6px_20px_rgba\(0,0,0,0\.3\)\]/g,
    to: 'hover:shadow-ds-raised',
    label: 'hover:shadow-[0_6px_20px_…] → hover:shadow-ds-raised',
  },
  { from: /shadow-2xl\b/g, to: 'shadow-ds-overlay', label: 'shadow-2xl (15) → shadow-ds-overlay' },
  { from: /shadow-xl\b/g, to: 'shadow-ds-overlay', label: 'shadow-xl       → shadow-ds-overlay' },
  { from: /shadow-lg\b/g, to: 'shadow-ds-raised', label: 'shadow-lg       → shadow-ds-raised' },
  { from: /shadow-sm\b/g, to: 'shadow-ds-subtle', label: 'shadow-sm       → shadow-ds-subtle' },
  { from: /shadow-none\b/g, to: 'shadow-ds-none', label: 'shadow-none     → shadow-ds-none' },
];

/**
 * A bare `rounded` (4px) as a whole token — never inside `rounded-lg`/`grounded`.
 * It is applied ONLY to a class-list string (see the shared scanner), which is what
 * keeps English prose and comments untouched.
 */
const BARE = /(?<![\w-])rounded(?![\w-])/g;

const EXT = new Set(['.ts', '.tsx', '.jsx', '.js', '.css']);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (EXT.has(path.extname(entry.name))) out.push(p);
  }
  return out;
}

const ALL_RULES = [...RULES, ...SHADOW_RULES];
const dryRun = process.argv.includes('--dry-run');
const FILES = walk(SRC);
let filesChanged = 0;
let totalReplacements = 0;
const perRule = Object.fromEntries(ALL_RULES.map((r) => [r.label, 0]));
let bareCount = 0;
const bareSites = [];

/**
 * Rewrite ONE class-list body. Every rule — the unambiguous Tailwind names AND the
 * bare `rounded` — is applied here, which means a rewrite can only ever land in a
 * real class list: never in a comment (where the project RECORDS its changes) and
 * never in English prose.
 */
function rewriteBody(body, file) {
  let out = body;
  for (const rule of ALL_RULES) {
    const hits = (out.match(rule.from) ?? []).length;
    if (hits === 0) continue;
    perRule[rule.label] += hits;
    totalReplacements += hits;
    out = out.replace(rule.from, rule.to);
  }
  if (BARE.test(out)) {
    BARE.lastIndex = 0;
    out = out.replace(BARE, () => {
      bareCount += 1;
      bareSites.push(`${path.relative(ROOT, file)}: ${body.trim().slice(0, 110)}`);
      return 'rounded-ds-sm';
    });
  }
  return out;
}

for (const file of FILES) {
  const before = fs.readFileSync(file, 'utf8');
  let after = before;

  // Rewrite from the END of the file backwards, so each splice keeps the indexes of
  // the strings still to come valid.
  for (const s of [...classStrings(before)].reverse()) {
    const rewritten = rewriteBody(s.body, file);
    if (rewritten === s.body) continue;
    after = `${after.slice(0, s.index)}${s.quote}${rewritten}${s.quote}${after.slice(literalEnd(s))}`;
  }

  if (after !== before) {
    filesChanged += 1;
    if (!dryRun) fs.writeFileSync(file, after);
  }
}

console.log(`${dryRun ? '[DRY RUN] ' : ''}RADIUS + ELEVATION SCALE MIGRATION`);
for (const [label, n] of Object.entries(perRule)) {
  console.log(`  ${label.padEnd(46)} ${n}`);
}
console.log(`  ${'bare rounded (4px) → rounded-ds-sm (6px)'.padEnd(46)} ${bareCount}`);
console.log(
  `  files scanned: ${FILES.length} · files changed: ${filesChanged} · replacements: ${totalReplacements}`
);
if (dryRun && bareSites.length) {
  console.log('\n  BARE `rounded` SITES (read each one — a prose hit here is a bug):');
  for (const s of bareSites) console.log(`    ${s}`);
}
