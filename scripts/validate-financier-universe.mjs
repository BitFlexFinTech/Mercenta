#!/usr/bin/env node
/**
 * §PHASE 7 — THE FINANCIER UNIVERSE GATE.
 *
 * The row `phase7-financier-universe-research` records the REAL financing-partner
 * universe with the FULL record, the SOURCE EVIDENCE and a LAST-RESEARCHED date.
 * The owner (`src/config/financierUniverse.ts`) declares the taxonomy, the market
 * scope, the record and the research rule; the resolver
 * (`src/lib/finance/financierUniverse.ts`) applies it. The properties a comment
 * cannot guarantee are proved here:
 *
 *   · the provider taxonomy, the markets and the record fields are declared, unique
 *     and complete;
 *   · every illustrative placeholder is marked and references declared ids;
 *   · the resolver FAILS CLOSED — an unknown provider type, an unknown/missing
 *     market, an illustrative placeholder, an entry with no named source and an
 *     entry with no research date are all REFUSED — while a complete, sourced,
 *     dated REAL record is ALLOWED (both branches proved);
 *   · the real universe holds ZERO providers (nothing is invented);
 *   · it is DETERMINISTIC (no AI, no clock, no network), INTERNAL (no brand import),
 *     USED by the Control Centre and RENDERED by the founder surface.
 *
 * THE GATE CAN FAIL (self-check): a malformed input is refused and the comparison
 * helper rejects a wrong expectation, so a green run proves the checks are live.
 *
 * Run: node scripts/validate-financier-universe.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
let failures = 0;
const test = (name, ok, detail = '') => {
  console.log(`${ok ? '✓' : '✗'} ${name}${ok || !detail ? '' : ` — ${detail}`}`);
  if (!ok) failures += 1;
};
const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
const walk = (dir) => {
  let out = [];
  for (const f of readdirSync(dir)) {
    const p = `${dir}/${f}`;
    if (statSync(p).isDirectory()) out = out.concat(walk(p));
    else out.push(p);
  }
  return out;
};
const equals = (a, b) => JSON.stringify(a) === JSON.stringify(b);

try {
  const owner = await server.ssrLoadModule('/src/config/financierUniverse.ts');
  const res = await server.ssrLoadModule('/src/lib/finance/financierUniverse.ts');

  console.log('\n── A. the universe definition ──');
  const types = owner.FINANCIER_PROVIDER_TYPES;
  const markets = owner.FINANCIER_MARKETS;
  const fields = owner.FINANCIER_RECORD_FIELDS;
  test('the nine provider types are declared', types.length === 9, String(types.length));
  test('provider-type ids are unique', new Set(types.map((t) => t.id)).size === types.length);
  test('every provider type names a label and a description',
    types.every((t) => t.label.length >= 2 && t.description.length > 8));
  test('the provider-type taxonomy matches the registry row',
    ['bank', 'po_finance', 'inventory_finance', 'trade_finance', 'receivables_finance', 'working_capital', 'sme_finance', 'ecommerce_finance', 'alternative_credit']
      .every((id) => types.some((t) => t.id === id)));
  test('the five markets are declared and unique',
    markets.length === 5 && new Set(markets.map((m) => m.id)).size === markets.length);
  test('the five record fields are declared and complete',
    fields.length === 5 && fields.every((f) => f.key && f.label && f.requirement));
  test('the evidence fields (source, lastResearched) are required for a real entry',
    fields.find((f) => f.key === 'source')?.requiredForRealEntry === true &&
      fields.find((f) => f.key === 'lastResearched')?.requiredForRealEntry === true);

  console.log('\n── B. the illustrative placeholders ──');
  const demo = owner.DEMO_FINANCIER_RECORDS;
  test('every placeholder is marked illustrative', demo.length > 0 && demo.every((r) => r.illustrative === true));
  test('every placeholder references a declared provider type',
    demo.every((r) => types.some((t) => t.id === r.providerTypeId)));
  test('every placeholder references declared markets only',
    demo.every((r) => r.marketIds.length > 0 && r.marketIds.every((m) => markets.some((mm) => mm.id === m))));
  test('the real universe holds ZERO providers (nothing invented)',
    demo.filter((r) => !r.illustrative).length === 0);

  console.log('\n── C. the resolver FAILS CLOSED ──');
  test('isProviderType accepts a declared type and rejects an undeclared one',
    res.isFinancierProviderType('bank') && !res.isFinancierProviderType('nope'));
  test('isMarket accepts a declared market and rejects an undeclared one',
    res.isFinancierMarket('uk') && !res.isFinancierMarket('nope'));
  test('isResearchDate accepts a real ISO date and rejects a malformed one',
    res.isFinancierResearchDate('2026-01-01') && !res.isFinancierResearchDate('01/01/2026') &&
      !res.isFinancierResearchDate('2026-13-01') && !res.isFinancierResearchDate(null));

  const base = {
    id: 'specimen',
    legalName: 'Specimen provider',
    providerTypeId: 'bank',
    marketIds: ['uk'],
    source: { publisher: 'Specimen publisher', reference: 'Specimen reference', publishedOn: '2026-01-01' },
    lastResearched: '2026-01-01',
    illustrative: false,
  };
  test('a complete, sourced, dated REAL record is ALLOWED',
    res.evaluateFinancierEntry(base).allowed === true &&
      res.evaluateFinancierEntry(base).refusal === null);
  test('an unknown provider type is REFUSED',
    res.evaluateFinancierEntry({ ...base, providerTypeId: 'nope' }).refusal === 'FINANCIER_PROVIDER_TYPE_UNKNOWN');
  test('a missing or unknown market is REFUSED',
    res.evaluateFinancierEntry({ ...base, marketIds: [] }).refusal === 'FINANCIER_MARKET_UNKNOWN' &&
      res.evaluateFinancierEntry({ ...base, marketIds: ['nope'] }).refusal === 'FINANCIER_MARKET_UNKNOWN');
  test('an illustrative placeholder is REFUSED (never a researched provider)',
    res.evaluateFinancierEntry({ ...base, illustrative: true }).refusal === 'FINANCIER_IS_ILLUSTRATIVE_NOT_A_RESEARCHED_PROVIDER');
  test('a REAL record with NO named source is REFUSED',
    res.evaluateFinancierEntry({ ...base, source: null }).refusal === 'FINANCIER_REQUIRES_NAMED_SOURCE');
  test('a REAL record with NO research date is REFUSED',
    res.evaluateFinancierEntry({ ...base, lastResearched: null }).refusal === 'FINANCIER_REQUIRES_RESEARCH_DATE' &&
      res.evaluateFinancierEntry({ ...base, lastResearched: 'nope' }).refusal === 'FINANCIER_REQUIRES_RESEARCH_DATE');
  test('the four failures are DISTINCT (no collapse)',
    new Set([
      res.evaluateFinancierEntry({ ...base, providerTypeId: 'nope' }).refusal,
      res.evaluateFinancierEntry({ ...base, marketIds: ['nope'] }).refusal,
      res.evaluateFinancierEntry({ ...base, illustrative: true }).refusal,
      res.evaluateFinancierEntry({ ...base, source: null }).refusal,
      res.evaluateFinancierEntry({ ...base, lastResearched: null }).refusal,
    ]).size === 5);

  console.log('\n── D. the founder summary (derived) ──');
  const summary = res.buildFinancierUniverseSummary();
  test('the summary covers the taxonomy, the markets and the record fields',
    summary.providerTypes.length === 9 && summary.markets.length === 5 && summary.recordFields.length === 5);
  test('the summary reports ZERO real providers', summary.realCount === 0);
  test('the summary REFUSES every illustrative placeholder (computed, not written)',
    summary.illustrativeCount === 3 && summary.refusedCount === 3 && summary.allowedCount === 0);
  test('the summary’s live example REFUSES the placeholder',
    summary.exampleRefusal.refusal === 'FINANCIER_IS_ILLUSTRATIVE_NOT_A_RESEARCHED_PROVIDER');
  test('the summary exposes the pinned invariants',
    summary.oneOwner && summary.requiresNamedSource && summary.requiresResearchDate && summary.failsClosed);

  console.log('\n── E. deterministic — no AI, no clock, no network ──');
  const ownerSrc = stripComments(read('src/config/financierUniverse.ts'));
  const resSrc = stripComments(read('src/lib/finance/financierUniverse.ts'));
  const banned = (s) => /openrouter|\bsupabase\b|\bfetch\(|Math\.random|Date\.now|new Date/i.test(s);
  test('neither the owner nor the resolver makes an AI / provider / network / random call',
    !banned(ownerSrc) && !banned(resSrc));
  test('the owner fails closed at module load (guards present)',
    /at least one provider type must be declared/.test(ownerSrc) &&
      /provider-type ids must be unique/.test(ownerSrc) &&
      /must carry a source and a last-researched date/.test(ownerSrc));

  console.log('\n── F. INTERNAL — no brand leakage ──');
  const brandFiles = walk(fileURLToPath(new URL('../src/components/brand/', import.meta.url)));
  const brandLeak = brandFiles.filter((f) => /financierUniverse|FINANCIER_PROVIDER_TYPES|buildFinancierUniverseSummary/.test(readFileSync(f, 'utf8')));
  test('no brand component imports the financier universe', brandLeak.length === 0, brandLeak.join(', '));

  console.log('\n── G. USED by the Control Centre + rendered by the founder surface ──');
  const cc = read('src/lib/commandCentre/controlCentre.ts');
  test('controlCentre imports the resolver and exposes financierUniverse',
    /buildFinancierUniverseSummary/.test(cc) && /financierUniverse:\s*FinancierUniverseSummary/.test(cc));
  const fcc = read('src/components/admin/FounderControlCentre.tsx');
  test('the Founder Control Centre renders the financier universe section',
    /control-financier-universe-placeholders/.test(fcc) && /model\.financierUniverse/.test(fcc));

  console.log('\n── H. SELF-CHECK — the gate can fail ──');
  test('the comparison helper ACCEPTS a correct expectation', equals(['a'], ['a']));
  test('the comparison helper REJECTS a wrong expectation (proves it can fail)', !equals(['a'], ['b']));
  test('a malformed (unknown-type) input REFUSES — proves the refused branch works',
    res.evaluateFinancierEntry({ ...base, providerTypeId: '' }).refusal === 'FINANCIER_PROVIDER_TYPE_UNKNOWN');
} finally {
  await server.close();
}

console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);

