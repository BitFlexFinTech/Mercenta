#!/usr/bin/env node
/**
 * §OWNER DECISION 2026-11-27 GATE — ONE HEADER AND ONE FOOTER PER PUBLIC PAGE.
 *
 * WHY THIS EXISTS. Design E was ported from the supplied Concept 3 HTML complete with its
 * own `<header>` and its own `<footer>`, while `Home.tsx` renders the shared `PublicNav`
 * and `PublicFooter` for every public page. The front page therefore carried TWO top bars
 * (z-50 and z-40, both pinned to the top of the same screen) and TWO footers — visible
 * clutter, clashing colours, and a second hardcoded copy of the footer's columns and
 * copyright.
 *
 * NOTHING COULD SEE IT. The validator corpus measures classes, tokens and registries; the
 * visual walk measures text, contrast and overflow per screen — neither counts chrome.
 * The defect was finally exposed by the product's OWN end-to-end spec: with two `<footer>`
 * elements, `page.locator('footer')` resolves to two nodes and `e2e/public-chrome.spec.ts`
 * failed in strict mode on two tests. The corpus does not run the e2e specs, so that signal
 * was never collected.
 *
 * WHAT IT ASSERTS, all DISCOVERED from the code (never a retyped list):
 *   P0  a check that finds nothing is a FAILURE — both sets must be non-empty;
 *   P1  NO page-design component renders its own `<header>` or `<footer>`. A design
 *       contributes SECTIONS; the page composition supplies the chrome exactly once;
 *   P2  every page that renders the shared chrome renders `<PublicFooter>` ONCE and
 *       `<PublicNav>` ONCE — the count is asserted, not assumed;
 *   P3  the canonical `PublicFooter` declares exactly one `<footer>` element, so "one
 *       footer" has a single owner and cannot become two inside it;
 *   P4  the homepage composition declares BOTH, so a page cannot silently lose its chrome;
 *   P5  zero network.
 *
 * The runtime half of the same contract is `e2e/public-chrome.spec.ts`, which asserts the
 * rendered page in a real browser. Static half here, runtime half there: the class is
 * closed at both ends.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';

const ROOT = '/Users/tadii/Desktop/1. Mercenta';
const MARKETING = join(ROOT, 'src/components/marketing');
const FOOTER_FILE = join(MARKETING, 'PublicFooter.tsx');

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

/** Every `.tsx` under the marketing tree, discovered by walking it. */
const walk = (dir, out = []) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith('.tsx')) out.push(full);
  }
  return out;
};

const marketingFiles = walk(MARKETING);
const read = (p) => readFileSync(p, 'utf8');
/**
 * §FIXED 2026-11-27 — COMMENTS ARE STRIPPED BEFORE ANY DISCOVERY. The first version
 * discovered the page set with `read(p).includes('<PublicFooter')`, and the comment
 * recording WHY Design E's band was deleted NAMES `<PublicFooter>` — so Design E was
 * counted as a page rendering the shared chrome, and P2 failed on a file that renders no
 * chrome at all. A comment that mentions a symbol must never be read as authoring it: the
 * same rule this project already applies to its own class and route scans.
 */
const clean = (p) =>
  read(p)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((line) => line.replace(/\/\/.*$/, ''))
    .join('\n');

/* ── the two sets, discovered ─────────────────────────────────────────────── */
const designFiles = marketingFiles.filter((p) => /\/home\/Design[A-Z]\.tsx$/.test(p));
const pageFiles = marketingFiles.filter((p) => clean(p).includes('<PublicFooter'));

console.log('\u00a7OWNER DECISION 2026-11-27 — ONE HEADER AND ONE FOOTER PER PUBLIC PAGE\n');
test(
  'P0 the design set and the page set were both discovered (a check that finds nothing is a FAILURE)',
  designFiles.length >= 5 && pageFiles.length >= 8,
  `${designFiles.length} design(s) \u00b7 ${pageFiles.length} page(s) rendering the shared chrome`
);

/* ── P1 — a design renders SECTIONS, never chrome ─────────────────────────── */
const offenders = [];
for (const file of designFiles) {
  const body = clean(file);
  const footers = (body.match(/<footer\b/g) || []).length;
  const headers = (body.match(/<header\b/g) || []).length;
  if (footers || headers) offenders.push(`${basename(file)}: ${headers} header(s), ${footers} footer(s)`);
}
test(
  'P1 no page-design component renders its own <header> or <footer> (the page supplies the chrome once)',
  offenders.length === 0,
  offenders.join(' \u00b7 ')
);

/* ── P2 — one nav, one footer, on every page that renders the chrome ──────── */
const wrongCounts = [];
for (const file of pageFiles) {
  const body = read(file);
  const footers = (body.match(/<PublicFooter\b/g) || []).length;
  const navs = (body.match(/<PublicNav\b/g) || []).length;
  if (footers !== 1 || navs !== 1) {
    wrongCounts.push(`${basename(file)}: ${navs} nav, ${footers} footer`);
  }
}
test(
  'P2 every public page renders exactly ONE <PublicNav> and ONE <PublicFooter>',
  wrongCounts.length === 0,
  wrongCounts.join(' \u00b7 ')
);

/* ── P3 — the footer owns exactly one <footer> element ───────────────────── */
const footerElements = (read(FOOTER_FILE).match(/<footer\b/g) || []).length;
test(
  'P3 the canonical PublicFooter declares exactly ONE <footer> element',
  footerElements === 1,
  `${footerElements} element(s)`
);

/* ── P4 — the homepage composition keeps BOTH pieces of chrome ───────────── */
const homeBody = read(join(MARKETING, 'Home.tsx'));
test(
  'P4 the homepage composition declares both the nav and the footer',
  /<PublicNav\b/.test(homeBody) && /<PublicFooter\b/.test(homeBody)
);

/* ── P5 — zero network ───────────────────────────────────────────────────── */
test('P5 the whole run made zero live network calls', networkCalls === 0, `${networkCalls} call(s)`);

console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${assertions - failures}/${assertions} assertions`);
process.exit(failures === 0 ? 0 : 1);

