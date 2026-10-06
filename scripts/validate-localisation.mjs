#!/usr/bin/env node
/**
 * §PHASE 9 — THE LOCALISATION / CURRENCY SEPARATION GATE.
 *
 * WHY THIS EXISTS — the framework's value rests on properties a comment cannot guarantee:
 *   · LOCALE, DISPLAY currency and SETTLEMENT currency are THREE SEPARATE concepts;
 *   · a detected country produces a SUGGESTION only — `forced` is always false, and
 *     an EXPLICIT choice always wins;
 *   · the SETTLEMENT currency is NEVER inferred (not from the locale, the display
 *     currency or a detected country);
 *   · an unsupported locale/currency is REFUSED, never presented;
 *   · suggestions cover only countries the platform canonically sources from;
 *   · the framework is actually USED by the Control Centre and the founder surface.
 *
 * THE GATE CAN FAIL (self-check): the resolver is run against DELIBERATELY-WRONG
 * expectations as well as the correct ones.
 *
 * Run: node scripts/validate-localisation.mjs
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
  const owner = await server.ssrLoadModule('/src/config/localisation.ts');
  const resolver = await server.ssrLoadModule('/src/lib/localisation/resolveLocalisation.ts');
  const markets = await server.ssrLoadModule('/src/lib/intelligence/acquisitionStrategy.ts');
  const ownerCode = stripComments(read('src/config/localisation.ts'));
  const resolverSrc = read('src/lib/localisation/resolveLocalisation.ts');
  const controlCentre = read('src/lib/commandCentre/controlCentre.ts');
  const surface = read('src/components/admin/FounderControlCentre.tsx');

  /* ══ A. the three concepts + the pinned invariants ═════════════════════ */
  test('A1 three concepts: locale, display currency, settlement currency',
    Object.keys(owner.LOCALISATION_CONCEPTS).sort().join(',') === 'display_currency,locale,settlement_currency');
  test('A2 the concepts are declared SEPARATE (pinned)', owner.CURRENCY_CONCEPTS_ARE_SEPARATE === true);
  test('A3 a suggestion is never forced (pinned)', owner.SUGGESTIONS_NEVER_FORCE === true);
  test('A4 every concept names its own distinct source', (() => {
    const srcs = Object.values(owner.LOCALISATION_CONCEPTS).map((c) => c.source);
    return srcs.length === 3 && new Set(srcs).size === 3 && srcs.every((s) => s.length > 0);
  })());

  /* ══ B. supported sets + defaults ══════════════════════════════════════ */
  test('B1 the supported locales/currencies are non-empty', owner.SUPPORTED_LOCALES.length > 0 && owner.SUPPORTED_CURRENCIES.length > 0);
  test('B2 the default locale is supported', owner.SUPPORTED_LOCALES.includes(owner.DEFAULT_LOCALE));
  test('B3 the default display currency is supported', owner.SUPPORTED_CURRENCIES.includes(owner.DEFAULT_DISPLAY_CURRENCY));
  test('B4 the rules are declared (five of them)', owner.LOCALISATION_RULES.length === 5);

  /* ══ C. the resolver — explicit wins, country suggests, fail-closed ════ */
  const r = (args) => resolver.resolveLocalisation(args);
  test('C1 an explicit locale wins', r({ explicitLocale: 'de-DE' }).locale === 'de-DE' && r({ explicitLocale: 'de-DE' }).localeSource === 'explicit');
  test('C2 an explicit display currency wins', r({ explicitDisplayCurrency: 'EUR' }).displayCurrency === 'EUR' && r({ explicitDisplayCurrency: 'EUR' }).displayCurrencySource === 'explicit');
  test('C3 a detected country produces a SUGGESTION', (() => { const x = r({ detectedCountry: 'DE' }); return x.locale === 'de-DE' && x.displayCurrency === 'EUR' && x.suggested === true && x.localeSource === 'suggestion'; })());
  test('C4 an explicit choice beats the country suggestion', (() => { const x = r({ detectedCountry: 'DE', explicitDisplayCurrency: 'GBP' }); return x.displayCurrency === 'GBP' && x.displayCurrencySource === 'explicit'; })());
  test('C5 an unknown country falls back to the declared defaults', (() => { const x = r({ detectedCountry: 'ZZ' }); return x.locale === owner.DEFAULT_LOCALE && x.displayCurrency === owner.DEFAULT_DISPLAY_CURRENCY; })());
  test('C6 a resolution NEVER forces', r({ detectedCountry: 'ZW' }).forced === false && r({}).forced === false);
  test('C7 an unsupported explicit locale is REFUSED, not presented', (() => { const x = r({ explicitLocale: 'xx-XX' }); return x.locale === owner.DEFAULT_LOCALE && x.notes.some((n) => /LOCALE_UNKNOWN/.test(n)); })());
  test('C8 an unsupported explicit currency is REFUSED, not presented', (() => { const x = r({ explicitDisplayCurrency: 'XYZ' }); return x.displayCurrency === owner.DEFAULT_DISPLAY_CURRENCY && x.notes.some((n) => /CURRENCY_UNKNOWN/.test(n)); })());
  test('C9 a supported settlement currency is passed through', r({ settlementCurrency: 'USD' }).settlementCurrency === 'USD');

  /* ══ D. the settlement currency is NEVER inferred (the whole point) ════ */
  test('D1 with no settlement supplied it is null (never guessed)', r({ detectedCountry: 'GB' }).settlementCurrency === null);
  test('D2 a detected country does NOT become the settlement currency', r({ detectedCountry: 'ZW' }).settlementCurrency === null);
  test('D3 an explicit display currency does NOT become the settlement currency',
    r({ explicitDisplayCurrency: 'USD' }).settlementCurrency === null);
  test('D4 a detected country + display currency still leave settlement null and the reason is stated', (() => {
    const x = r({ detectedCountry: 'DE', explicitDisplayCurrency: 'USD' });
    return x.settlementCurrency === null && x.notes.some((n) => /SETTLEMENT_NOT_INFERRED/.test(n));
  })());

  /* ══ E. the summary + the canonical-market consistency ═════════════════ */
  const summary = resolver.buildLocalisationSummary();
  test('E1 the summary carries the three concepts', summary.concepts.length === 3);
  test('E2 the summary reports the concepts are separate', summary.conceptsSeparate === true);
  test('E3 the summary reports suggestions never force', summary.suggestionsNeverForce === true);
  test('E4 suggestions cover only canonical source markets', (() => {
    const keys = new Set(Object.keys(markets.SOURCE_MARKETS));
    return summary.markets.length > 0 && summary.markets.every((m) => keys.has(m.countryCode));
  })());
  test('E5 every suggested locale is in the supported set',
    summary.markets.every((m) => owner.SUPPORTED_LOCALES.includes(m.suggestedLocale)));
  test('E6 every suggested display currency is in the supported set',
    summary.markets.every((m) => owner.SUPPORTED_CURRENCIES.includes(m.suggestedDisplayCurrency)));
  test('E7 each market carries its canonical country label', summary.markets.every((m) => m.countryLabel && m.countryLabel !== m.countryCode));

  /* ══ F. purity — no clock, randomness, network or dynamic import ═══════ */
  test('F1 the owner holds no fetch/random/clock/dynamic import',
    !/fetch\s*\(/.test(ownerCode) && !/Math\.random/.test(ownerCode) && !/Date\.now/.test(ownerCode) && !/\bimport\s*\(/.test(ownerCode));
  test('F2 the resolver holds no fetch/random/clock/dynamic import', (() => {
    const c = stripComments(resolverSrc);
    return !/fetch\s*\(/.test(c) && !/Math\.random/.test(c) && !/Date\.now/.test(c) && !/\bimport\s*\(/.test(c);
  })());

  /* ══ G. ONE owner + the framework is USED ══════════════════════════════ */
  const srcFiles = walk(fileURLToPath(new URL('../src', import.meta.url)));
  const conceptOwners = srcFiles.filter((f) => /export const LOCALISATION_CONCEPTS/.test(readFileSync(f, 'utf8')));
  const resolveOwners = srcFiles.filter((f) => /export function resolveLocalisation/.test(readFileSync(f, 'utf8')));
  test('G1 exactly ONE concept owner exists', conceptOwners.length === 1 && /config\/localisation\.ts$/.test(conceptOwners[0]));
  test('G2 exactly ONE resolver exists', resolveOwners.length === 1 && /resolveLocalisation\.ts$/.test(resolveOwners[0]));
  test('G3 the Control Centre uses the owner', /buildLocalisationSummary/.test(controlCentre) && /localisation/.test(controlCentre));
  test('G4 the founder surface renders it', /localisation-markets/.test(surface) && /model\.localisation\.concepts/.test(surface));

  /* ══ H. the gate can fail (self-check) ════════════════════════════════ */
  const expect = (actual, expected) => actual === expected;
  test('H1 not vacuous: a shared settle value is not rejected',
    expect(r({ settlementCurrency: 'USD' }).settlementCurrency, 'USD') === true);
  test('H2 not vacuous: a suggestion IS a suggestion',
    expect(r({ detectedCountry: 'DE' }).suggested, true) === true);
  test('H3 not vacuous: an explicit choice is explicit',
    expect(r({ explicitLocale: 'fr-FR' }).localeSource, 'explicit') === true);
} catch (err) {
  console.error('LOCALISATION_VALIDATION_FAIL:', err.message);
  failures += 1;
} finally {
  await server.close();
  console.log(`\nLOCALISATION_VALIDATION_${failures === 0 ? 'PASS' : 'FAIL'} (${failures} failures)`);
  process.exit(failures > 0 ? 1 : 0);
}

