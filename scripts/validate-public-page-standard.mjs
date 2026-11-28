#!/usr/bin/env node
/**
 * §PUBLIC SURFACES BATCH 5 PART 2 (2026-11-27) — A PUBLIC PAGE CANNOT SHIP BELOW THE STANDARD.
 *
 * WHY THIS EXISTS. The owner set one standard for every public content page:
 * `opening · what you get · how it works · a labelled worked illustration · what it does NOT do ·
 * one next step`. The seven Retail Infrastructure pages met the opening and the next step and very
 * little else: no picture at all, no illustration, and no statement of their own limits. Enriching
 * them by hand fixes those seven pages and nothing else — the next page added, or the next edit to
 * one of these, can drop straight back below the standard with every existing check still green.
 *
 * WHAT IT ASSERTS, all DISCOVERED from the owners (never a retyped list):
 *   S0  the files were found at all (a check that finds nothing is a FAILURE);
 *   S1  the page set was discovered (a vacuous discovery is a FAILURE);
 *   S2  NO PAGE CARRIES HALF THE PAIR — the illustration and the limits section are added by the
 *       same standard, so a page carrying one and not the other is half-finished whichever batch it
 *       belongs to; and any page carrying both must also open with a picture and close with one
 *       `cta`. A page with only a picture is NOT flagged: it is a page a later batch has not reached
 *       yet, which is exactly what `categories` is today (its own treatment, Batch 5 Part 1). The
 *       batch's own completeness is asserted separately, against its derived scope (S1b, S3–S6);
 *   S3  every page in a group the scope names opens with a picture, declared in the imagery owner
 *       and present on disk in both sizes (the group is read from the pages, never retyped);
 *   S4  it carries a labelled worked illustration: a label, an intro, at least three labelled
 *       stages, each with real text;
 *   S5  it states its own limits: at least two, each a real sentence;
 *   S6  it offers exactly ONE next step (`cta`);
 *   S7  THE ILLUSTRATION AND THE LIMITS CARRY NO FIGURE — no currency amount and no percentage.
 *       An illustration of a SEQUENCE must never become an invented claim about money or results;
 *   S8  every picture role ANY page names (hero or block media) is declared and has both files on
 *       disk. `src/components/marketing/PublicImage.tsx` claimed from Batch 5 that
 *       `validate-public-chrome.mjs` asserts this. IT DID NOT — that check only counts chrome, so a
 *       page could name a picture whose file was never fetched and render an empty box while every
 *       gate passed. The assertion now exists, in the gate the comment names;
 *   S9  the renderer actually renders the opening picture, the illustration and the limits (source
 *       assertions against comment-stripped code, so a check cannot pass on a comment alone);
 *   S10 zero network.
 *
 * THE GATE'S SCOPE IS A LIST OF THE GROUPS ENRICHED SO FAR, AND IT IS DERIVED, NOT RETYPED. Each
 * group name is checked against the pages' own `navGroup`, so the members cannot drift from the
 * pages, and a name matching NO page fails the run (a vacuous scope is a failure, not a green).
 *
 * §Phase §PUBLIC SURFACES BATCH 5 PART 3 (2026-11-27) — THE LIST GROWS, IT DOES NOT MOVE. Batch 5
 * Part 2 shipped `['Retail Infrastructure']`; this part APPENDS `'Platform'`. REPLACING the list
 * would have silently stopped checking the seven pages already brought to the standard — a gate that
 * drops its first batch is a weaker gate, not a moved one — so groups are only ever ADDED here, and
 * each addition is made in the same change as the enrichment it covers.
 *
 * §Phase §PUBLIC SURFACES BATCH 5 PART 4 (2026-11-28) — THE LIST GROWS AGAIN, BY THE SAME RULE.
 * `'Solutions'` is APPENDED, so the eleven pages already checked stay checked. Solutions holds four
 * pages — `new-to-uk-market`, `scaling-consumer-brands`, `agencies-service-partners` and the
 * categories page (`PUBLIC_CATEGORY_PAGE`, which already opened with a picture but carried neither
 * the illustration nor the limits). S1b is what makes the append safe: a group name matching NO page
 * fails the run, so this addition cannot quietly become a vacuous scope.
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

/** This batch's scope — the navigation groups whose pages have been enriched, in the order they were done. */
const SCOPE_GROUPS = ['Retail Infrastructure', 'Platform', 'Solutions'];

/* ── S0 — the owners were found at all ────────────────────────────────────── */
const pagesSrc = read('src/config/publicPages.ts');
const imagerySrc = read('src/config/homepageImagery.ts');
const rendererSrc = read('src/components/marketing/PublicContentPage.tsx');

const imageRoles = [...imagerySrc.matchAll(/'([a-z0-9-]+)':\s*\{\s*alt:/g)].map((m) => m[1]);

test(
  'S0 the page owner, the imagery owner and the renderer were all found (a check that finds nothing is a FAILURE)',
  pagesSrc.length > 0 && imageRoles.length > 0 && rendererSrc.length > 0,
  `${pagesSrc.length}c pages · ${imageRoles.length} declared picture roles · ${rendererSrc.length}c renderer`
);

/**
 * §MEASURED — PARSED BY FIELD BOUNDARY, NOT BY INDENTATION.
 *
 * The pages are written two ways: as inline objects inside `PUBLIC_*_PAGES` arrays (4-space
 * indentation) and as `const PAGE_X: PublicContentPage = { … }` blocks (2-space). Splitting on the
 * `id:` key itself makes the parse independent of whitespace, so a reindented entry cannot silently
 * merge into its neighbour — the exact defect `validate-category-guides.mjs` records having paid for.
 */
const pages = pagesSrc
  .split(/(?=\bid:\s*')/)
  .slice(1)
  .map((chunk) => {
    const first = (re) => {
      const m = chunk.match(re);
      return m ? m[1] : '';
    };
    const illustration = (() => {
      const at = chunk.search(/\billustration:\s*\{/);
      if (at === -1) return null;
      const body = chunk.slice(at);
      const end = body.search(/\n\s*(limits:|cta:|availability:)|\n\};/);
      return end === -1 ? body : body.slice(0, end);
    })();
    const limits = (() => {
      const at = chunk.search(/\blimits:\s*\[/);
      if (at === -1) return null;
      const body = chunk.slice(at);
      const end = body.search(/\n\s*\]\s*,/);
      return end === -1 ? body : body.slice(0, end);
    })();
    return {
      id: first(/\bid:\s*'([a-z0-9-]+)'/),
      group: first(/\bnavGroup:\s*'([^']+)'/),
      hero: first(/\bhero:\s*'([a-z0-9-]+)'/),
      media: [...chunk.matchAll(/\bmedia:\s*'([a-z0-9-]+)'/g)].map((m) => m[1]),
      hasIllustration: illustration !== null,
      illustrationLabel: illustration ? first(/\blabel:\s*'([^']+)'/) : '',
      illustrationIntro: illustration ? first(/\bintro:\s*'([^']+)'/) : '',
      stages: illustration
        ? [...illustration.matchAll(/\{\s*label:\s*'([^']+)',\s*detail:\s*'([^']+)',?\s*\}/g)].map((m) => ({
            label: m[1],
            detail: m[2],
          }))
        : [],
      limitLines: limits ? [...limits.matchAll(/'([^']{1,400})'/g)].map((m) => m[1]) : [],
      hasLimits: limits !== null,
      ctas: [...chunk.matchAll(/\bcta:\s*\{/g)].length,
    };
  })
  .filter((p) => p.id);

test(
  'S1 the page set was discovered from its owner (a vacuous discovery is a FAILURE)',
  pages.length >= 20,
  `${pages.length} content pages`
);

/* ── S2 — no page is left half-enriched ──────────────────────────────────── */
const halfPaired = pages.filter((p) => p.hasIllustration !== p.hasLimits);
const incomplete = pages.filter((p) => p.hasIllustration && p.hasLimits && (!p.hero || p.ctas !== 1));
test(
  'S2 no page carries half the illustration/limits pair, and any page carrying both also opens with a picture and closes with one next step',
  halfPaired.length === 0 && incomplete.length === 0,
  [
    ...halfPaired.map((p) => `${p.id}: illustration=${p.hasIllustration} limits=${p.hasLimits}`),
    ...incomplete.map((p) => `${p.id}: hero=${p.hero || '—'} cta=${p.ctas}`),
  ].join(' · ')
);

/* ── the batch's own scope, DERIVED from the pages ────────────────────────── */
const allGroups = [...new Set(pages.map((p) => p.group))];
const scoped = pages.filter((p) => SCOPE_GROUPS.includes(p.group));
const unknownGroups = SCOPE_GROUPS.filter((g) => !allGroups.includes(g));
test(
  `S1b every group named in the scope EXISTS in the pages, and the scope is not empty (${SCOPE_GROUPS.join(' + ')})`,
  unknownGroups.length === 0 && scoped.length > 0,
  [
    unknownGroups.length ? `no page has navGroup: ${unknownGroups.join(', ')}` : '',
    `${scoped.length} of ${pages.length} page(s): ${scoped.map((p) => p.id).join(', ')}`,
  ]
    .filter(Boolean)
    .join(' · ')
);

/* ── S3 — the opening picture, declared and on disk ───────────────────────── */
const heroProblems = [];
for (const p of scoped) {
  if (!p.hero) {
    heroProblems.push(`${p.id}: no hero`);
    continue;
  }
  if (!imageRoles.includes(p.hero)) heroProblems.push(`${p.id}: hero '${p.hero}' is not declared`);
  for (const suffix of ['lg', 'sm']) {
    if (!existsSync(resolve(ROOT, `public/imagery/${p.hero}-${suffix}.webp`)))
      heroProblems.push(`${p.id}: ${p.hero}-${suffix}.webp missing`);
  }
}
test(
  "S3 every page in this batch's scope opens with a picture that is declared and on disk (both sizes)",
  heroProblems.length === 0,
  heroProblems.join(' · ')
);

/* ── S4 — the labelled worked illustration ────────────────────────────────── */
const illustrationProblems = scoped.filter(
  (p) =>
    !p.hasIllustration ||
    p.illustrationLabel.length < 4 ||
    p.illustrationIntro.length < 40 ||
    p.stages.length < 3 ||
    p.stages.some((s) => s.label.length < 3 || s.detail.length < 40)
);
test(
  'S4 every page carries a labelled worked illustration: a label, an intro, and at least three labelled stages',
  illustrationProblems.length === 0,
  illustrationProblems
    .map(
      (p) =>
        `${p.id}: label=${p.illustrationLabel.length}c intro=${p.illustrationIntro.length}c stages=${
          p.stages.length
        }${p.stages.filter((s) => s.detail.length < 40).length ? ' (thin stages)' : ''}`
    )
    .join(' · ')
);

/* ── S5 — what the page does NOT do ───────────────────────────────────────── */
const limitsProblems = scoped.filter(
  (p) => !p.hasLimits || p.limitLines.length < 2 || p.limitLines.some((l) => l.length < 25)
);
test(
  'S5 every page states its own limits — at least two, each a real sentence',
  limitsProblems.length === 0,
  limitsProblems.map((p) => `${p.id}: ${p.limitLines.length} limit(s)`).join(' · ')
);

/* ── S6 — exactly one next step ───────────────────────────────────────────── */
const ctaProblems = scoped.filter((p) => p.ctas !== 1);
test(
  'S6 every page offers exactly one next step (one cta, no more and no fewer)',
  ctaProblems.length === 0,
  ctaProblems.map((p) => `${p.id}: ${p.ctas}`).join(' · ')
);

/* ── S7 — no figure in an illustration or a limit ─────────────────────────── */
/**
 * A money figure or a percentage. Deliberately narrow: it must never fire on ordinary prose, and it
 * must always fire on "£8,000", "20%" or "15 brands".
 */
const FIGURE = /[£$€]\s?\d|\b\d+(\.\d+)?\s?%|\b\d{2,}\s*\+?\s*(brands|clients|customers)\b/i;
const figures = [];
for (const p of scoped) {
  const copy = [
    p.illustrationLabel,
    p.illustrationIntro,
    ...p.stages.flatMap((s) => [s.label, s.detail]),
    ...p.limitLines,
  ];
  for (const line of copy) if (FIGURE.test(line)) figures.push(`${p.id}: ${line.slice(0, 60)}`);
}
test(
  'S7 the illustration and the limits carry no figure (an illustration of a sequence is never an amount)',
  figures.length === 0,
  figures.join(' · ')
);

/* ── S8 — every picture a page names is declared and on disk ─────────────── */
/**
 * THE ASSERTION `PublicImage.tsx` HAS BEEN CLAIMING SINCE BATCH 5 AND NOTHING MADE. A page can name
 * a role whose file was never fetched; `PublicImage` then paints the reserved box in the page's own
 * colour, so the page looks finished and one picture is simply missing. Measured when this was
 * added: the claim pointed at `validate-public-chrome.mjs`, which counts headers, footers and nav.
 */
const namedProblems = [];
for (const p of pages) {
  for (const role of [p.hero, ...p.media].filter(Boolean)) {
    if (!imageRoles.includes(role)) {
      namedProblems.push(`${p.id}: '${role}' is not declared in the imagery owner`);
      continue;
    }
    for (const suffix of ['lg', 'sm']) {
      if (!existsSync(resolve(ROOT, `public/imagery/${role}-${suffix}.webp`)))
        namedProblems.push(`${p.id}: ${role}-${suffix}.webp is missing`);
    }
  }
}
test(
  'S8 every picture ANY page names is declared and exists on disk in both sizes (a missing picture is an empty box, and it was silent before this check)',
  namedProblems.length === 0,
  [...new Set(namedProblems)].join(' · ')
);

/* ── S9 — the renderer renders all three, in code and not in a comment ───── */
const rendererCode = stripComments(rendererSrc);
test(
  'S9 the renderer renders the opening picture, the labelled illustration and the limits (asserted against comment-stripped code)',
  rendererCode.includes('page.hero') &&
    rendererCode.includes('page.illustration.stages.map') &&
    rendererCode.includes('page.limits.map') &&
    rendererCode.includes('PublicImage') &&
    rendererCode.includes('data-testid="public-page-illustration"') &&
    rendererCode.includes('data-testid="public-page-limits"')
);

/* ── S10 — zero network ──────────────────────────────────────────────────── */
test('S10 the whole run made zero live network calls', networkCalls === 0, `${networkCalls} call(s)`);

console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${assertions - failures}/${assertions} assertions`);
process.exit(failures === 0 ? 0 : 1);
