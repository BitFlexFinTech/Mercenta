#!/usr/bin/env node
/**
 * §PHASE 9 — THE COUNTRY FRAMEWORK GATE.
 *
 * WHY THIS EXISTS — the framework's value rests on properties a comment cannot guarantee:
 *   · every country is classified into ONE OR MORE of the SIX roles;
 *   · the marketplace role is FACTUAL, sourced, and only ever held with a published
 *     marketplace id;
 *   · **Zimbabwe is NEVER an Amazon marketplace** (it is an operating/home brand-origin
 *     market) — the single hard invariant;
 *   · a brand-origin market is EXACTLY the canonical source-market list — there is no
 *     second, hand-maintained list;
 *   · an unlisted country resolves to NO roles and is REFUSED (fail closed);
 *   · the UK marketplace id is REUSED from its canonical home (never retyped), and the
 *     North American ids match the canonical NA id set;
 *   · the framework is actually USED by the Control Centre and the founder surface.
 *
 * THE GATE CAN FAIL (self-check): the resolver is exercised against inputs that must
 * (and must not) resolve, so a change that broke the invariant or the fail-closed
 * behaviour would fail here.
 *
 * Run: node scripts/validate-country-framework.mjs
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

try {
  const owner = await server.ssrLoadModule('/src/config/countryFramework.ts');
  const resolver = await server.ssrLoadModule('/src/lib/geography/resolveCountry.ts');
  const transform = await server.ssrLoadModule('/src/lib/spapi/transform.ts');
  const shipping = await server.ssrLoadModule('/src/config/shipping.ts');
  const strategy = await server.ssrLoadModule('/src/lib/intelligence/acquisitionStrategy.ts');
  const ownerCode = stripComments(read('src/config/countryFramework.ts'));
  const resolverSrc = read('src/lib/geography/resolveCountry.ts');
  const controlCentre = read('src/lib/commandCentre/controlCentre.ts');
  const surface = read('src/components/admin/FounderControlCentre.tsx');

  const r = (c) => resolver.resolveCountry(c);
  const hasRole = (c, role) => (r(c)?.roles ?? []).includes(role);

  /* ══ A. the six roles + the pinned invariants ═══════════════════════════ */
  test('A1 six roles declared',
    Object.keys(owner.COUNTRY_ROLES).sort().join(',') ===
      'accelerator_priority_market,acquisition_priority_market,amazon_marketplace,brand_origin_market,future_market,localization_only');
  test('A2 Zimbabwe is NEVER a marketplace (pinned)', owner.ZIMBABWE_IS_NEVER_AN_AMAZON_MARKETPLACE === true);
  test('A3 the marketplace role requires a sourced id (pinned)', owner.MARKETPLACE_ROLE_REQUIRES_A_SOURCED_ID === true);
  test('A4 every role names its kind and its source', Object.values(owner.COUNTRY_ROLES).every(
    (d) => (d.kind === 'factual' || d.kind === 'policy') && typeof d.source === 'string' && d.source.length > 0));
  test('A5 the marketplace role is FACTUAL; the priority roles are POLICY',
    owner.COUNTRY_ROLES.amazon_marketplace.kind === 'factual' &&
      owner.COUNTRY_ROLES.acquisition_priority_market.kind === 'policy');
  test('A6 Zimbabwe holds the brand-origin role and NOT the marketplace role',
    hasRole('ZW', 'brand_origin_market') && !hasRole('ZW', 'amazon_marketplace'));
  test('A7 Zimbabwe resolves with no marketplace id', (r('ZW')?.marketplaceId ?? null) === null);

  /* ══ B. the marketplace facts ═══════════════════════════════════════════ */
  const markets = owner.AMAZON_MARKETPLACES;
  test('B1 the marketplace set is non-empty', Object.keys(markets).length > 0);
  test('B2 the marketplace set spans the continents',
    new Set(Object.values(markets).map((m) => m.continent)).size >= 5);
  test('B3 every marketplace carries a non-empty id and the ONE source',
    Object.values(markets).every((m) => m.marketplaceId && m.marketplaceId.length > 0 && m.source === owner.AMAZON_MARKETPLACE_SOURCE));
  test('B4 the UK marketplace id EQUALS the canonical UK_MARKETPLACE_ID (no drift)',
    markets.GB.marketplaceId === transform.UK_MARKETPLACE_ID);
  test('B5 the declared North American ids are the canonical NA id set',
    ['US', 'CA', 'MX'].every((c) => shipping.CHANNEL_NA_MARKETPLACE_IDS.includes(markets[c].marketplaceId)));
  test('B6 Zimbabwe is ABSENT from the marketplace set', !Object.prototype.hasOwnProperty.call(markets, 'ZW'));
  test('B7 South Africa IS a marketplace (a real, sourced fact)',
    markets.ZA?.marketplaceId === 'AE08WJ6YKNBMC');

  /* ══ C. brand-origin markets are REUSED, never re-listed ════════════════ */
  test('C1 brand-origin markets are EXACTLY the canonical source-market list', (() => {
    const got = resolver.countriesByRole('brand_origin_market').map((c) => c.code).sort().join(',');
    const want = Object.keys(strategy.SOURCE_MARKETS).sort().join(',');
    return got === want;
  })());
  const srcFiles = walk(fileURLToPath(new URL('../src', import.meta.url)));
  const sourceListOwners = srcFiles.filter((f) => /export const SOURCE_MARKETS\s*[:=]/.test(readFileSync(f, 'utf8')));
  test('C2 there is exactly ONE source-market list (no second owner)', sourceListOwners.length === 1);

  /* ══ D. the resolver — resolve, and FAIL CLOSED ═════════════════════════ */
  test('D1 a marketplace resolves with its published id', r('US')?.marketplaceId === 'ATVPDKIKX0DER');
  test('D2 Zimbabwe is a brand-origin market with no marketplace id',
    hasRole('ZW', 'brand_origin_market') && r('ZW')?.marketplaceId === null);
  test('D3 an unlisted country resolves to null and no roles', r('ZZ') === null && resolver.rolesForCountry('ZZ').length === 0);
  test('D4 an unlisted country is NOT a marketplace', resolver.isAmazonMarketplace('ZZ') === false);
  test('D5 blank/null inputs fail closed',
    resolver.rolesForCountry(null).length === 0 && resolver.rolesForCountry('').length === 0 && resolver.resolveCountry(null) === null);
  test('D6 an acquisition-priority market is ALSO a brand-origin market',
    resolver.countriesByRole('acquisition_priority_market').every((c) => c.roles.includes('brand_origin_market')));


  /* ══ E. the summary ════════════════════════════════════════════════════ */
  const summary = resolver.buildCountryFrameworkSummary();
  test('E1 the summary carries the six roles', summary.roles.length === 6);
  test('E2 the summary counts every marketplace', summary.marketplaceCount === Object.keys(markets).length);
  test('E3 the summary reports Zimbabwe is never a marketplace', summary.zimbabweNeverMarketplace === true);
  test('E4 the priority policy is declared UNCONFIGURED', summary.priorityPolicyConfigured === false);
  test('E5 every resolved country carries a label and a continent',
    summary.countries.every((c) => c.label && c.label !== c.code && c.continent));

  /* ══ F. purity — no clock, randomness, network or dynamic import ═══════ */
  test('F1 the owner holds no fetch/random/clock/dynamic import',
    !/fetch\s*\(/.test(ownerCode) && !/Math\.random/.test(ownerCode) && !/Date\.now/.test(ownerCode) && !/\bimport\s*\(/.test(ownerCode));
  test('F2 the resolver holds no fetch/random/clock/dynamic import', (() => {
    const c = stripComments(resolverSrc);
    return !/fetch\s*\(/.test(c) && !/Math\.random/.test(c) && !/Date\.now/.test(c) && !/\bimport\s*\(/.test(c);
  })());

  /* ══ G. ONE owner + the framework is USED ══════════════════════════════ */
  const marketplaceOwners = srcFiles.filter((f) => /export const AMAZON_MARKETPLACES\s*[:=]/.test(readFileSync(f, 'utf8')));
  const resolverOwners = srcFiles.filter((f) => /export function resolveCountry\s*\(/.test(readFileSync(f, 'utf8')));
  test('G1 exactly ONE marketplace owner exists', marketplaceOwners.length === 1 && /config\/countryFramework\.ts$/.test(marketplaceOwners[0]));
  test('G2 exactly ONE resolver exists', resolverOwners.length === 1 && /resolveCountry\.ts$/.test(resolverOwners[0]));
  test('G3 the Control Centre uses the owner', /buildCountryFrameworkSummary/.test(controlCentre) && /countryFramework/.test(controlCentre));
  test('G4 the founder surface renders it', /country-framework/.test(surface) && /model\.countryFramework\.roles/.test(surface));
  // The owner is excluded from the outward-facing wording lint (its labels + source
  // strings must name the channel). This assertion keeps that exclusion from becoming
  // a rendered-copy loophole: NO brand-facing component may import the owner.
  const brandFiles = walk(fileURLToPath(new URL('../src/components/brand', import.meta.url)));
  test('G5 NO brand-facing component imports the country-framework owner',
    brandFiles.every((f) => !/countryFramework|geography\/resolveCountry/.test(readFileSync(f, 'utf8'))));

  /* ══ H. the gate can fail (self-check) ════════════════════════════════ */
  const expect = (actual, expected) => actual === expected;
  test('H1 not vacuous: a real marketplace IS a marketplace', expect(resolver.isAmazonMarketplace('US'), true) === true);
  test('H2 not vacuous: Zimbabwe DOES resolve (it is a declared market)', expect(r('ZW') !== null, true) === true);
  test('H3 not vacuous: a marketplace id is a non-empty string', expect(markets.DE.marketplaceId.length > 0, true) === true);
} catch (err) {
  console.error('COUNTRY_FRAMEWORK_VALIDATION_FAIL:', err.message);
  failures += 1;
} finally {
  await server.close();
  console.log(`\nCOUNTRY_FRAMEWORK_VALIDATION_${failures === 0 ? 'PASS' : 'FAIL'} (${failures} failures)`);
  process.exit(failures > 0 ? 1 : 0);
}

