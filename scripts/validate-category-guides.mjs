#!/usr/bin/env node
/**
 * §PUBLIC SURFACES BATCH 5 (2026-11-27) — THE CATEGORIES PAGE CANNOT SHIP INCOMPLETE.
 *
 * WHY THIS EXISTS. The categories page now promises, for each of the ten approved categories, an
 * explanation of what belongs there and a picture of that kind of product. That promise is kept by
 * DATA (`src/config/categoryGuides.ts`), and data can go missing silently: an eleventh category added
 * to `APPROVED_CATEGORIES` would render no card at all, and a picture whose file was never fetched
 * would render an empty box — both while every existing check passed.
 *
 * WHAT IT ASSERTS, all DISCOVERED from the owners (never a retyped list):
 *   C0  both sources were found (a check that finds nothing is a FAILURE);
 *   C1  the guides are EXACTLY the approved categories — none missing, none extra, no duplicates;
 *   C2  every guide answers all three questions, in real sentences, and captions its picture;
 *   C3  every guide's picture is declared in the imagery owner, and every declared category picture
 *       is used by a guide (no orphan files, no undefined role);
 *   C4  both files exist on disk for every picture (`-lg.webp` and `-sm.webp`);
 *   C5  every picture has a licence row in `public/imagery/CREDITS-CATEGORIES.md`;
 *   C6  the page RENDERS the guides (and no longer renders the old pill list);
 *   C7  zero network.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const read = (p) => readFileSync(resolve(ROOT, p), 'utf8');

let failures = 0;
let assertions = 0;
const test = (name, ok, detail = '') => {
  assertions += 1;
  console.log(`${ok ? '\u2713' : '\u2717'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
};

let networkCalls = 0;
globalThis.fetch = async (...args) => {
  networkCalls += 1;
  throw new Error(`NO LIVE NETWORK ALLOWED IN VALIDATION: ${String(args[0])}`);
};

const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

/* ── C0 — the owners were found at all ────────────────────────────────────── */
const typesSrc = read('src/types.ts');
const guidesSrc = read('src/config/categoryGuides.ts');
const imagerySrc = read('src/config/homepageImagery.ts');
const rendererSrc = read('src/components/marketing/PublicContentPage.tsx');
const creditsPath = 'public/imagery/CREDITS-CATEGORIES.md';

const approved = (() => {
  const m = typesSrc.match(/export const APPROVED_CATEGORIES = \[([\s\S]*?)\] as const;/);
  return m ? [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]) : [];
})();

const guideBlock = (() => {
  const at = guidesSrc.indexOf('export const CATEGORY_GUIDES');
  return at === -1 ? '' : guidesSrc.slice(at);
})();

/**
 * §MEASURED, 2026-11-27 — PARSED BY FIELD BOUNDARY, NOT BY INDENTATION.
 *
 * The first version split entries on `\n  {\n`, and one entry that lost its indentation during an
 * edit was silently merged into its neighbour: the gate then reported "missing: Consumer Electronics"
 * — correct, but the PARSER was part of the reason it was easy to get wrong. Splitting on the
 * `category:` key itself makes the parse independent of whitespace, so an entry cannot vanish into the
 * one above it.
 */
const guides = guideBlock
  .split(/(?=category:\s*')/)
  .slice(1)
  .map((chunk) => {
    const field = (key) => {
      const m = chunk.match(new RegExp(`${key}:\\s*\\n?\\s*'([^']*)'`));
      return m ? m[1] : '';
    };
    return {
      category: field('category'),
      belongs: field('belongs'),
      strong: field('strong'),
      watchOut: field('watchOut'),
      image: field('image'),
      caption: field('caption'),
    };
  });

const declaredImages = [...imagerySrc.matchAll(/'(cat-[a-z]+)':\s*\{/g)].map((m) => m[1]);

test(
  'C0 the approved list, the guides and the imagery owner were all found (a check that finds nothing is a FAILURE)',
  approved.length === 10 && guides.length > 0 && declaredImages.length > 0,
  `${approved.length} approved · ${guides.length} guides · ${declaredImages.length} declared pictures`
);

/* ── C1 — exactly the approved categories ─────────────────────────────────── */
const guideNames = guides.map((g) => g.category);
const missing = approved.filter((c) => !guideNames.includes(c));
const extra = guideNames.filter((c) => !approved.includes(c));
const duplicated = guideNames.filter((c, i) => guideNames.indexOf(c) !== i);
test(
  'C1 every approved category is explained, and nothing outside the approved list is described',
  missing.length === 0 && extra.length === 0 && duplicated.length === 0,
  [
    missing.length ? `missing: ${missing.join(', ')}` : '',
    extra.length ? `not approved: ${extra.join(', ')}` : '',
    duplicated.length ? `duplicated: ${duplicated.join(', ')}` : '',
  ]
    .filter(Boolean)
    .join(' · ')
);

/* ── C2 — three real answers, and a caption ───────────────────────────────── */
const thin = guides.filter(
  (g) =>
    g.belongs.length < 40 ||
    g.strong.length < 40 ||
    g.watchOut.length < 40 ||
    g.caption.length < 10
);
test(
  'C2 each category says what belongs there, what works and what to watch — in real sentences',
  thin.length === 0,
  thin
    .map(
      (g) =>
        `${g.category}: belongs=${g.belongs.length}c strong=${g.strong.length}c watchOut=${g.watchOut.length}c caption=${g.caption.length}c`
    )
    .join(' · ')
);

/* ── C3 — every picture is declared, and every declared picture is used ───── */
const undeclared = guides.filter((g) => !declaredImages.includes(g.image));
const unusedImages = declaredImages.filter((role) => !guides.some((g) => g.image === role));
test(
  'C3 every guide names a picture the imagery owner declares, and no category picture is left unused',
  undeclared.length === 0 && unusedImages.length === 0,
  [
    undeclared.map((g) => `${g.category} → ${g.image || '(none)'}`).join(', '),
    unusedImages.length ? `unused: ${unusedImages.join(', ')}` : '',
  ]
    .filter(Boolean)
    .join(' · ')
);

/* ── C4 — both files exist on disk ────────────────────────────────────────── */
const missingFiles = [];
for (const role of declaredImages) {
  for (const suffix of ['lg', 'sm']) {
    if (!existsSync(resolve(ROOT, `public/imagery/${role}-${suffix}.webp`))) {
      missingFiles.push(`${role}-${suffix}.webp`);
    }
  }
}
test(
  'C4 every category picture has BOTH files on disk (-lg and -sm)',
  missingFiles.length === 0,
  missingFiles.join(', ')
);

/* ── C5 — every picture has a licence row ─────────────────────────────────── */
const credits = existsSync(resolve(ROOT, creditsPath)) ? read(creditsPath) : '';
const unlicensed = declaredImages.filter((role) => !credits.includes(`\`${role}\``));
test(
  'C5 every category picture is recorded in CREDITS-CATEGORIES.md with its licence (a picture without provenance is not shippable)',
  credits.length > 0 && unlicensed.length === 0,
  credits.length === 0 ? `${creditsPath} is missing` : unlicensed.join(', ')
);

/* ── C6 — the page renders the guides, not the old pills ──────────────────── */
const rendererCode = stripComments(rendererSrc);
test(
  'C6 the categories page renders the guides, and the old pill list is gone (absence guard)',
  rendererCode.includes('CATEGORY_GUIDES.map') &&
    !rendererCode.includes('APPROVED_CATEGORIES.map(') &&
    rendererCode.includes('PublicImage')
);

/* ── C7 — zero network ────────────────────────────────────────────────────── */
test('C7 the whole run made zero live network calls', networkCalls === 0, `${networkCalls} call(s)`);

console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${assertions - failures}/${assertions} assertions`);
process.exit(failures === 0 ? 0 : 1);