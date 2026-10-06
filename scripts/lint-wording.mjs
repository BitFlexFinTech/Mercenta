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

function lineOf(indexed, idx) {
  return indexed.slice(0, idx).split('\n').length;
}

const rel = (p) => p.replace(root + '/', '').replace(/\\/g, '/');
const files = walk(SRC).filter((p) => !isExcluded(rel(p)));

const violations = [];
for (const f of files) {
  const original = readFileSync(f, 'utf8');
  const code = blankComments(original); // newlines preserved -> line numbers match original
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

if (violations.length === 0) {
  console.log(`WORDING_LINT_PASS — scanned ${files.length} src files, 0 outward-facing violations`);
  process.exit(0);
}

console.error(`WORDING_LINT_FAIL — ${violations.length} outward-facing violations:`);
for (const v of violations) {
  console.error(`  ${v.file}:${v.line}  banned:${v.label}  →  ${JSON.stringify(v.match)}  | ${v.lineText}`);
}
process.exit(1);
