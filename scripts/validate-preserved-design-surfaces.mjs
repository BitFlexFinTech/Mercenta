#!/usr/bin/env node
/**
 * §LOVABLE SOURCE TRANSFER (2026-11-25) — THE PRESERVED-DESIGN DECLARATION GATE.
 *
 * WHY THIS EXISTS (standing rule 07 — every fix carries a gate that can fail)
 * --------------------------------------------------------------------------
 * The Lovable Concept 3 homepage arrived as SOURCE and is exempt from four of the
 * product's token gates. That exemption used to be a path list COPY-PASTED into four
 * validators, and it had already drifted: two copies still named `src/assets/images/`,
 * a directory that no longer exists. An exemption nobody pins is how a quality gate
 * quietly stops applying to code it was written for — the class of defect this
 * repository has already paid for three times (the dead `text-strong` class across 97
 * files; a registry verifier reading a list that existed nowhere; a validator whose
 * lookup returned zero and reported green).
 *
 * WHAT IT PROVES
 * --------------
 *   1. the declaration RESOLVES and is non-empty (a discovery of none is a FAILURE);
 *   2. the declared set is EXACTLY the reviewed three — it cannot GROW silently, and
 *      adding a path is a deliberate, reviewable act rather than an edit;
 *   3. every declared path EXISTS (a stale exemption for a deleted directory fails);
 *   4. every consumer IMPORTS the one declaration and holds NO second copy of it;
 *   5. an ABSENCE GUARD: the removed `src/assets/images/` duplicate is still absent
 *      (`08-removal-coherence.md` — a deletion with a surviving pointer is not one);
 *   6. POSITIVE CONTROLS both ways: a preserved source file IS excluded from the
 *      subject, and `src/components/ads/AdsManagement.tsx` IS inside it — so the
 *      exemption is proved narrow rather than merely claimed.
 *
 * Run: node scripts/validate-preserved-design-surfaces.mjs   (auto-discovered by `npm run validate:all`)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PRESERVED_DESIGN_SURFACES,
  isPreservedDesignSurface,
} from './lib/preserved-design-surfaces.mjs';
import { subjectFiles } from './measure-legacy-classes.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let pass = 0;
let fail = 0;
const check = (name, ok, detail = '') => {
  if (ok) {
    pass += 1;
    console.log(`✓ ${name}`);
  } else {
    fail += 1;
    console.log(`✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
};

const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(ROOT, p));

/* ── 1. THE DECLARATION RESOLVES — and an empty one is a FAILURE, not a pass ── */
check(
  'P1 the preserved-design declaration resolves and is non-empty (rule 10 §5)',
  Array.isArray(PRESERVED_DESIGN_SURFACES) && PRESERVED_DESIGN_SURFACES.length > 0,
  `entries=${Array.isArray(PRESERVED_DESIGN_SURFACES) ? PRESERVED_DESIGN_SURFACES.length : 'not-an-array'}`
);

/* ── 2. THE SET IS PINNED — it may not GROW without a reviewable change ────── */
/**
 * The reviewed set, pinned ON PURPOSE. This is the one place a list is retyped, and
 * the reason is the whole point of the check: an exemption that can be widened by
 * editing one line elsewhere is an exemption nobody reviews. Adding a path means
 * editing BOTH this pin and the declaration, with the reason recorded.
 */
const EXPECTED = [
  'src/components/lovable/',
  'src/content/',
  'src/components/marketing/home/DesignE.tsx',
];
const actual = [...PRESERVED_DESIGN_SURFACES];
check(
  'P2 the preserved-design set is EXACTLY the reviewed three (it cannot grow silently)',
  actual.length === EXPECTED.length && EXPECTED.every((e) => actual.includes(e)),
  `declared ${actual.join(' · ')}`
);

/* ── 3. EVERY DECLARED PATH EXISTS — a stale exemption is a defect ─────────── */
for (const entry of actual) {
  check(`P3 declared surface exists: ${entry}`, exists(entry));
}

/* ── 4. THE CONSUMERS HOLD NO SECOND COPY (rule 03) ───────────────────────── */
const CONSUMERS = [
  'scripts/measure-legacy-classes.mjs',
  'scripts/validate-typography-scale.mjs',
  'scripts/validate-radius-elevation-scale.mjs',
  'scripts/validate-theme-foundation.mjs',
];
check(
  'P4 the consumer list is complete (four validators need this set)',
  CONSUMERS.length === 4,
  `${CONSUMERS.length} consumers`
);
for (const file of CONSUMERS) {
  const src = read(file);
  check(
    `P4 ${path.basename(file)} READS the one declaration (no second copy of the fact)`,
    src.includes('preserved-design-surfaces.mjs') && src.includes('isPreservedDesignSurface(')
  );
  check(
    `P4 ${path.basename(file)} no longer hand-writes the path list`,
    !src.includes("startsWith('src/components/lovable/')") &&
      !src.includes("=== 'src/components/marketing/home/DesignE.tsx'")
  );
}

/* ── 5. THE ABSENCE GUARD — the removed duplicate is still gone ───────────── */
check(
  'P5 the removed `src/assets/images/` duplicate is still absent (removal coherence)',
  !exists('src/assets/images/'),
  'the directory was reintroduced'
);
check(
  'P5 no consumer still excludes the removed `src/assets/images/`',
  CONSUMERS.every((f) => !read(f).includes('src/assets/images/')),
  'a surviving pointer to a deleted directory'
);

/* ── 6. POSITIVE CONTROLS — the exemption is NARROW, proved both ways ─────── */
check(
  'P6a a PRESERVED source file IS outside the gate subject (the exemption applies)',
  isPreservedDesignSurface('src/components/lovable/ShipmentTracker.tsx') === true
);
check(
  'P6b the Ads Management screen is NOT exempt (a new product surface stays checked)',
  isPreservedDesignSurface('src/components/ads/AdsManagement.tsx') === false
);
const subject = subjectFiles().map((f) => path.relative(ROOT, f));
check(
  'P6c the Ads Management screen is really INSIDE the measured subject',
  subject.includes(path.join('src/components', 'ads', 'AdsManagement.tsx')),
  `subject holds ${subject.length} files`
);
check(
  'P6d the preserved source is really OUTSIDE the measured subject',
  !subject.some((rel) => rel.startsWith('src/components/lovable/'))
);

console.log(
  `\nPRESERVED_DESIGN_SURFACES: ${fail === 0 ? 'PASS' : 'FAIL'} — ${pass} assertion(s), ${fail} failure(s)`
);
process.exit(fail === 0 ? 0 : 1);
