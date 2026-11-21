/**
 * Static wording-safety gate for hardcoded source text.
 *
 * Enforces the outward-facing wording rule: text a brand, prospect, or the
 * public can see must NEVER name the retail channel ("Amazon", "Vendor
 * Central", "Seller Central", "1P"/first-party). This is a static backstop
 * for the runtime guard (wordingSafety.ts), which only sees user-edited
 * text — hardcoded brand-facing copy in components and seed data is invisible
 * to it, and is exactly where regressions hide.
 *
 * HOW IT DECIDES WHAT TO CHECK
 *  - Comments are blanked (chars -> spaces, newlines preserved) so they are
 *    never matched and reported line numbers match the real source file.
 *  - Banned terms are matched as STANDALONE WORDS (word boundaries). This
 *    skips protected internal identifiers that must stay accurate and are
 *    NOT obfuscated per the rule: live_amazon, under_amazon_review,
 *    amazon_partner, amazon_sp_api, MockAmazonSPAPIClient, and so on.
 *  - Files excluded from the scan:
 *      * the wording guard + its pattern source (definitions, not content)
 *      * src/integrations/registry.ts — operator-facing integration card
 *        titles named by their real third-party product for clarity
 *      * src/integrations/types.ts — IntegrationId JSON-schema keys
 *      * src/components/admin/** and src/components/carrier/** — admin-only
 *        and carrier-only labels (rule: internal/admin-only labels are NOT
 *        linted — clarity over obfuscation)
 *  - src/types.ts is IN scope: its STAGE_LABELS / STATUS_LABELS values are
 *    rendered to brands (e.g. BrandDashboard status badge + activity feed).
 *
 * BANNED_PATTERNS is imported from src/lib/discovery/banned-patterns.mjs —
 * the single definition shared with the runtime guard.
 *
 * Run: node scripts/lint-wording.mjs
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BANNED_PATTERNS } from '../src/lib/discovery/banned-patterns.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const SRC = resolve(root, 'src');

// Exact files + folder prefixes skipped by the scan (see header doc).
const EXCLUDED = [
  'src/lib/discovery/wordingSafety.ts',
  'src/lib/discovery/banned-patterns.mjs',
  'src/integrations/registry.ts',
  'src/integrations/types.ts',
  'src/components/admin/',
  'src/components/carrier/',
  // ── §Phase F audit repair: internal, admin-only, protected or non-copy files ──
  // BI seed evidence: the SOURCE of the market data (with its real URL) must stay
  // accurate for provenance; it is rendered on the admin BI surface only.
  'src/data/brandProspectSeed.ts',
  // BI provenance label rendered in the admin acquisition intelligence panel and
  // asserted by e2e/bi-intelligence-preservation.spec.ts (protected BI behaviour).
  'src/lib/intelligence/prospectIntelligence.ts',
  // A disqualification PREDICATE that matches the prospect's own text
  // (reseller detection) — code, not outward-facing copy.
  'src/lib/intelligence/scoringEngine.ts',
  // Protected Xero demo/mock ledger rows (Xero is a protected integration).
  'src/services/xero/',
  // -- §Phase M12 wording repair: pattern-definition source ----------------------
  // The retail-channel PROGRAMME-CLAIM rule set is a definitions file, exactly the
  // same class as banned-patterns.mjs / wordingSafety.ts above: its regex literals
  // and reasons necessarily contain the channel name in order to MATCH claims.
  // Excluding it does NOT weaken the gate — every string this module RENDERS is
  // asserted channel-neutral by scripts/validate-sales-estimator.mjs
  // ("rendered wording constants name no retail channel").
  // §Founder OS — the internal BI FINDINGS read model. Same class as
  // prospectIntelligence.ts above: it is rendered ONLY on the Super-Admin Control
  // Centre (guarded at render) and its text must stay ACCURATE about the ten
  // approved Vendor Central categories and the canonical `amazonDemand` scoring
  // dimension. No brand-facing component imports it; the brand-safe projection
  // (`brandSafeFindings`) strips every internal-only finding. Excluding it does
  // NOT weaken the gate — every outward-facing surface stays fully linted.
  'src/lib/intelligence/intelligenceLayer.ts',
  // §Phase M12 — pattern-definition source (restored verbatim; it must stay
  // excluded: its regex literals and reasons necessarily contain the channel name
  // in order to MATCH claims).
  'src/lib/intelligence/amazonRelationshipGovernance.ts',
  /* §PUBLIC MESSAGING (2026-11-20) — THE EXEMPTION IS REVERSED.
   *
   * `src/config/positioning.ts` was excluded here on the argument that it DECLARES
   * the approved vocabulary rather than rendering it. That argument was wrong in
   * practice: this module's strings are the copy the public pages actually show,
   * and the live homepage was displaying "Amazon UK 1P vendor infrastructure",
   * "Vendor Central operations", "Brand Registry" and "A+ Content" to visitors
   * while this gate printed "0 outward-facing violations" — because it had been
   * told not to read the file.
   *
   * The Founder confirmed channel-neutral public wording. The nine offending
   * strings were rewritten to channel-neutral English, and this gate now scans
   * the file like any other. A green result here is now earned.
   */
  'src/lib/intelligence/amazonWording.ts',
  // §PHASE 13 — the CLAIMS REGISTRY. Same class as `amazonWording.ts` above: it
  // is a DEFINITIONS / INDEX file whose `concern` text and `example` strings
  // necessarily contain the channel name and the banned phrasings in order to
  // name and TEST them. It renders nothing. Excluding it does NOT weaken the
  // gate — `scripts/validate-claims-registry.mjs` asserts every class points at
  // a real canonical owner, and (section I) that NO component imports it, so it
  // can never become a rendered-copy loophole.
  'src/lib/compliance/claimsRegistry.ts',
  // §PHASE 9 (2026-10-05, follow-up) — THE COUNTRY FRAMEWORK. Same class as
  // `amazonWording.ts` / `claimsRegistry.ts` above: it is the internal DEFINITIONS
  // + PROVENANCE owner whose role LABELS and `source` strings necessarily name the
  // retail channel (to define what an “Amazon marketplace” IS, and to cite the real
  // published marketplace-IDs reference — the data-must-be-real rule requires the
  // publisher be named). It renders nothing a brand can see; its summary is drawn
  // ONLY on the Super-Admin Control Centre. Excluding it does NOT weaken the gate —
  // `scripts/validate-country-framework.mjs` asserts NO brand-facing component
  // imports the owner or its resolver, so it can never become a rendered-copy
  // loophole. Every outward-facing surface stays fully linted.
  'src/config/countryFramework.ts',
  // §PHASE 13 (2026-10-06) — THE AMAZON RELATIONSHIP GOVERNANCE. Same class as
  // `amazonWording.ts` / `claimsRegistry.ts` / `countryFramework.ts` above: it is the
  // internal DEFINITIONS owner of the authoritative-source universe, whose source LABELS
  // necessarily name the retail channel (the vendor agreement IS Amazon Vendor Central's;
  // the data-must-be-real rule requires the real document be named) in order to define what
  // governs the relationship. It renders nothing a brand can see; its summary is drawn ONLY
  // on the Super-Admin Control Centre. Excluding it does NOT weaken the gate —
  // `scripts/validate-amazon-governance.mjs` (§F) asserts NO brand-facing component imports
  // the owner or its resolver, so it can never become a rendered-copy loophole. Every
  // outward-facing surface stays fully linted.
  'src/config/amazonRelationshipGovernance.ts',
];

function isExcluded(rel) {
  return EXCLUDED.some((e) =>
    e.endsWith('/') ? rel.startsWith(e) : rel === e
  );
}

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = resolve(dir, entry.name);
    if (entry.isDirectory()) walk(p, acc);
    else if (/\.(ts|tsx)$/.test(entry.name)) acc.push(p);
  }
  return acc;
}

// Blank comment text with spaces but KEEP newlines, so matches inside comments
// are neutralised AND reported line numbers match the real source file.
function blankComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, (m) => m.replace(/[^\n]/g, ' '));
}

/**
 * §PUBLIC CLAIM RED LINES (2026-11-20) — ONE NARROW, COUNTED SUPPRESSION.
 *
 * `PUBLIC_CLAIM_RED_LINES` in `src/config/positioning.ts` is a set of RULES: it
 * lists the phrases public copy must never contain, so it necessarily contains
 * those exact phrases. A copy linter cannot tell a rule from a claim.
 *
 * Rather than re-exempting the whole module (which is what let nine live
 * "Amazon" strings sit in public copy while this gate reported zero violations),
 * only the text between a matching marker pair is blanked. Newlines are
 * preserved, so a violation elsewhere in the same file still reports the right
 * line number.
 *
 * The number of suppressions is ASSERTED at the bottom of this script and must
 * be exactly 1. A second one therefore fails the gate, which stops this
 * mechanism being used to hide rendered copy.
 */
const SUPPRESS_START = 'lint-wording:ignore-start';
const SUPPRESS_END = 'lint-wording:ignore-end';
/**
 * The leading `/*` must be followed IMMEDIATELY by the start marker (allowing
 * whitespace). An earlier version of this expression let `[\s\S]` run from the
 * FIRST comment in the file to the marker, which blanked ~500 lines — including
 * the nine rendered "Amazon" strings this change exists to catch. Anchoring the
 * opener is what keeps the suppression to the one block it names.
 */
const SUPPRESS_RE = new RegExp(
  `/\\*\\s*${SUPPRESS_START}[\\s\\S]*?${SUPPRESS_END}\\s*\\*/`,
  'g'
);

function blankSuppressedBlocks(src) {
  return src.replace(SUPPRESS_RE, (m) => m.replace(/[^\n]/g, ' '));
}

let suppressionBlocks = 0;
function countSuppressions(src) {
  suppressionBlocks += (src.match(SUPPRESS_RE) || []).length;
}

function lineOf(indexed, idx) {
  return indexed.slice(0, idx).split('\n').length;
}

const rel = (p) => p.replace(root + '/', '').replace(/\\/g, '/');
const files = walk(SRC).filter((p) => !isExcluded(rel(p)));

const violations = [];
for (const f of files) {
  const original = readFileSync(f, 'utf8');
  // §PUBLIC CLAIM RED LINES — count the suppression blocks, blank exactly those,
  // THEN strip comments. Newlines are preserved throughout, so reported line
  // numbers still match the real source file.
  countSuppressions(original);
  const code = blankComments(blankSuppressedBlocks(original));
// Blank import/from lines — import paths are internal references, never outward-facing
  const noImports = code
    .split('\n')
    .map((line) => (line.trimStart().startsWith('import ') ? line.replace(/[^\n]/g, ' ') : line))
    .join('\n');
  for (const { re, label } of BANNED_PATTERNS) {
    for (const m of noImports.matchAll(re)) {
      const ln = lineOf(code, m.index);
      violations.push({
        file: rel(f),
        line: ln,
        label,
        match: m[0],
        lineText: original.split('\n')[ln - 1].trim(),
      });
    }
  }
}

/* ── §PUBLIC CLAIM RED LINES — THE SUPPRESSION COUNT IS ASSERTED ──────────────
 *
 * Exactly ONE suppression block may exist in the repository: the
 * `PUBLIC_CLAIM_RED_LINES` definitions, whose rules necessarily contain the
 * phrases they forbid. If a second one appears, this gate FAILS — so the
 * mechanism cannot be used to hide rendered copy from the linter.
 */
if (suppressionBlocks !== 1) {
  console.error(
    `WORDING_LINT_FAIL — expected exactly 1 suppression block (the PUBLIC_CLAIM_RED_LINES definitions), found ${suppressionBlocks}.`
  );
  console.error(
    '  A new suppression block is how rendered copy gets hidden from this gate. Fix the copy instead, or justify the block in this script.'
  );
  process.exit(1);
}

if (violations.length === 0) {
  console.log(`WORDING_LINT_PASS — scanned ${files.length} src files, 0 outward-facing violations`);
  process.exit(0);
}

console.error(`WORDING_LINT_FAIL — ${violations.length} outward-facing violations:`);
for (const v of violations) {
  console.error(`  ${v.file}:${v.line}  banned:${v.label}  →  ${JSON.stringify(v.match)}  | ${v.lineText}`);
}
process.exit(1);
