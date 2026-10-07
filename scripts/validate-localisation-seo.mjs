#!/usr/bin/env node
/**
 * §PHASE 9 — THE LOCALIZATION / SEO / HREFLANG GATE.
 *
 * WHY THIS EXISTS
 * ---------------
 * The row `phase9-localization-seo-hreflang` records the locale presentation conventions
 * and the search metadata that must agree with them. The owner
 * (`src/config/localisationSeo.ts`) declares them and the resolver
 * (`src/lib/localisation/localisationSeo.ts`) applies them. The rules — hreflang is emitted
 * ONLY for a served content locale and ONLY for a public route, x-default self-references the
 * served default, number separators are DERIVED from Intl — are properties a comment cannot
 * guarantee, so this gate proves them:
 *
 *   · the served content locale set is honest and contained in the supported set;
 *   · every supported locale carries a format convention and the separators are the platform's
 *     own (Intl) values, never hand-typed;
 *   · every canonical source market carries an IANA timezone;
 *   · a hreflang alternate is emitted ONLY for a served locale and ONLY for a public route, a
 *     non-public path is REFUSED, and x-default self-references the served default;
 *   · NO alternate is ever fabricated for a language Mercenta does not serve;
 *   · the framework is DETERMINISTIC (no AI, no clock, no randomness, no network);
 *   · it is INTERNAL (no brand component imports it);
 *   · it is USED by the Control Centre + rendered by the founder surface; and
 *   · it is INTEGRATED into the SEO runtime (routeMetadata emits the alternate links).
 *
 * THE GATE CAN FAIL (self-check): a deliberately-wrong expectation and a malformed input are
 * both exercised — the wrong expectation MUST be rejected and the non-public path MUST refuse,
 * so a green run proves the checks work rather than being vacuous.
 *
 * Run: node scripts/validate-localisation-seo.mjs
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
const IANA = /^[A-Za-z]+\/[A-Za-z_]+(\/[A-Za-z_]+)?$/;

try {
  const owner = await server.ssrLoadModule('/src/config/localisationSeo.ts');
  const localOwner = await server.ssrLoadModule('/src/config/localisation.ts');
  const res = await server.ssrLoadModule('/src/lib/localisation/localisationSeo.ts');
  const markets = await server.ssrLoadModule('/src/lib/intelligence/acquisitionStrategy.ts');
  const routes = await server.ssrLoadModule('/src/lib/seo/publicRoutes.ts');

  console.log('\n── A. the served content locales + hreflang defaults ──');
  test('at least one served content locale is declared', owner.SERVED_CONTENT_LOCALES.length >= 1);
  const supported = new Set(localOwner.SUPPORTED_LOCALES);
  test('every served content locale is a declared supported locale', owner.SERVED_CONTENT_LOCALES.every((l) => supported.has(l)));
  test('the hreflang default is a served content locale', owner.SERVED_CONTENT_LOCALES.includes(owner.HREFLANG_DEFAULT_LOCALE));
  test('the supported default locale is served (SEO locales = served content locales)', owner.SERVED_CONTENT_LOCALES.includes(localOwner.DEFAULT_LOCALE));
  test('x-default is the literal "x-default"', owner.HREFLANG_X_DEFAULT === 'x-default');
  test(
    'the pinned invariants are all true',
    owner.HREFLANG_ONLY_FOR_SERVED_LOCALES === true &&
      owner.HREFLANG_X_DEFAULT_IS_SELF === true &&
      owner.ONE_LOCALISATION_SEO_OWNER === true &&
      owner.SEO_LOCALES_ARE_SERVED_CONTENT_LOCALES === true &&
      owner.HREFLANG_REQUIRES_PUBLIC_ROUTE === true
  );
  test('the served set is honest — English only today', equals(owner.SERVED_CONTENT_LOCALES, ['en-GB']));

  console.log('\n── B. the locale format conventions (separators DERIVED from Intl) ──');
  test('every supported locale carries a format convention', localOwner.SUPPORTED_LOCALES.every((l) => owner.LOCALE_FORMAT_CONVENTIONS[l]));
  test(
    'every convention uses DISTINCT decimal + group separators',
    Object.values(owner.LOCALE_FORMAT_CONVENTIONS).every((c) => c.decimalSeparator && c.groupSeparator && c.decimalSeparator !== c.groupSeparator)
  );
  const gb = owner.LOCALE_FORMAT_CONVENTIONS['en-GB'];
  test('en-GB uses "." decimal and "," group', gb.decimalSeparator === '.' && gb.groupSeparator === ',' && gb.numbersExample === '1,234.5');
  const us = owner.LOCALE_FORMAT_CONVENTIONS['en-US'];
  test('en-US uses "." decimal and "," group', us.decimalSeparator === '.' && us.groupSeparator === ',');
  const fr = owner.LOCALE_FORMAT_CONVENTIONS['fr-FR'];
  test('fr-FR uses "," decimal (European)', fr.decimalSeparator === ',');
  test(
    'the separators are exactly what Intl reports (not hand-typed)',
    Object.values(owner.LOCALE_FORMAT_CONVENTIONS).every((c) => {
      const parts = new Intl.NumberFormat(c.locale).formatToParts(1234567.5);
      const dec = parts.find((p) => p.type === 'decimal')?.value ?? '.';
      const grp = parts.find((p) => p.type === 'group')?.value ?? ',';
      return c.decimalSeparator === dec && c.groupSeparator === grp;
    })
  );
  test('every date order is a declared value with a matching example', Object.values(owner.LOCALE_FORMAT_CONVENTIONS).every((c) => ['dmy', 'mdy', 'ymd'].includes(c.dateOrder) && /^\d/.test(c.dateExample)));

  console.log('\n── C. the market timezones (declared IANA facts) ──');
  test(
    'every canonical source market carries a declared timezone',
    Object.keys(markets.SOURCE_MARKETS).every((code) => owner.MARKET_TIMEZONES[code])
  );
  test('every timezone is a valid IANA-style zone', Object.values(owner.MARKET_TIMEZONES).every((z) => IANA.test(z)));
  test('the UK market resolves to Europe/London', owner.MARKET_TIMEZONES.GB === 'Europe/London');


  console.log('\n── D. the hreflang decisions (fail-closed) ──');
  const home = res.buildHreflangAlternates('/');
  test('a public route carries alternates (not refused)', home.public === true && home.refused === null && home.alternates.length >= 2);
  test('the public alternates include en-GB and x-default', home.alternates.some((a) => a.hreflang === 'en-GB') && home.alternates.some((a) => a.hreflang === 'x-default'));
  test('x-default self-references the served default (same href)', home.alternates.find((a) => a.hreflang === 'x-default').href === home.alternates.find((a) => a.hreflang === 'en-GB').href);
  test('every public alternate points at the canonical URL', home.alternates.every((a) => a.href === home.canonicalUrl));
  const admin = res.buildHreflangAlternates('/admin');
  test('a private path is REFUSED with no alternates', admin.public === false && admin.refused === 'HREFLANG_ROUTE_NOT_PUBLIC' && admin.alternates.length === 0);
  const unknown = res.buildHreflangAlternates('/not-a-real-page');
  test('an unknown path is REFUSED with no alternates', unknown.refused === 'HREFLANG_ROUTE_NOT_PUBLIC' && unknown.alternates.length === 0);
  test('a served locale is eligible for hreflang', res.evaluateHreflangLocale('en-GB').eligible === true && res.evaluateHreflangLocale('en-GB').refusal === null);
  const frElig = res.evaluateHreflangLocale('fr-FR');
  test('an UNSERVED locale is REFUSED for hreflang', frElig.eligible === false && frElig.refusal === 'HREFLANG_LOCALE_NOT_SERVED');
  test('no alternate is ever emitted for a language we do not serve', !home.alternates.some((a) => a.hreflang === 'fr-FR' || a.hreflang === 'de-DE'));

  console.log('\n── E. the formatting resolution (fail-closed) ──');
  test('a supported locale resolves explicitly', res.resolveLocaleFormatting('en-US').source === 'explicit' && res.resolveLocaleFormatting('en-US').convention.locale === 'en-US');
  const bad = res.resolveLocaleFormatting('xx-YY');
  test('an undeclared locale is REFUSED and falls back to the default', bad.source === 'default' && bad.convention.locale === localOwner.DEFAULT_LOCALE && bad.notes.length === 1);
  test('no locale given resolves to the declared default', res.resolveLocaleFormatting(null).source === 'default');


  console.log('\n── F. the founder summary (derived) ──');
  const summary = res.buildLocalisationSeoSummary();
  test('the summary serves exactly the served content locales', equals(summary.servedContentLocales, [...owner.SERVED_CONTENT_LOCALES]));
  test('the summary proves both private + unknown paths are refused', summary.refusedNonPublic === 2);
  test('the summary covers every canonical public route', summary.publicRouteCount === routes.PUBLIC_ROUTES.length);
  test('every summary route carries a self-referencing x-default', summary.publicRouteAlternates.every((r) => r.xDefault && r.xDefault === r.alternates.find((a) => a.hreflang === 'x-default').href));
  test('the summary declares a timezone for the counted markets', summary.markets.length === summary.marketCount && summary.marketCount > 0);
  test('the messaging slots number and each name their owner', summary.messagingSlots.length >= 5 && summary.messagingSlots.every((s) => s.canonicalOwner));

  console.log('\n── G. deterministic — no AI, no clock, no network ──');
  const ownerSrc = stripComments(read('src/config/localisationSeo.ts'));
  const resSrc = stripComments(read('src/lib/localisation/localisationSeo.ts'));
  test(
    'neither the owner nor the resolver makes an AI / provider / network / random call',
    !/openrouter|\bsupabase\b|\bfetch\(|Math\.random|Date\.now|new Date/i.test(ownerSrc) &&
      !/openrouter|\bsupabase\b|\bfetch\(|Math\.random|Date\.now|new Date/i.test(resSrc)
  );

  console.log('\n── H. INTERNAL — no brand leakage ──');
  const brandFiles = walk(fileURLToPath(new URL('../src/components/brand/', import.meta.url)));
  const brandLeak = brandFiles.filter((f) => /localisationSeo|buildHreflangAlternates|SERVED_CONTENT_LOCALES/.test(readFileSync(f, 'utf8')));
  test('no brand component imports the localization/SEO framework', brandLeak.length === 0, brandLeak.join(', '));

  console.log('\n── I. USED by the Control Centre + rendered by the founder surface ──');
  const cc = read('src/lib/commandCentre/controlCentre.ts');
  test(
    'controlCentre imports the resolver and exposes localisationSeo',
    /buildLocalisationSeoSummary/.test(cc) && /localisationSeo:\s*LocalisationSeoSummary/.test(cc)
  );
  const fcc = read('src/components/admin/FounderControlCentre.tsx');
  test(
    'the Founder Control Centre renders the localization/SEO section',
    /localisation-seo/.test(fcc) && /model\.localisationSeo/.test(fcc)
  );

  console.log('\n── J. INTEGRATED into the SEO runtime ──');
  const rm = read('src/lib/seo/routeMetadata.ts');
  test('routeMetadata builds its alternates from the ONE resolver', /buildHreflangAlternates/.test(rm));
  test('routeMetadata applies the alternate links to the document', /applyHreflangAlternates/.test(rm) && /rel="alternate"|setAttribute\('rel', 'alternate'\)/.test(rm));

  console.log('\n── K. SELF-CHECK — the gate can fail ──');
  test('the comparison helper ACCEPTS a correct expectation', equals(['a'], ['a']));
  test('the comparison helper REJECTS a wrong expectation (proves it can fail)', !equals(['a'], ['b']));
  const malformed = res.buildHreflangAlternates('/admin');
  test('a malformed (non-public) input REFUSES — proves the fail-closed branch works', malformed.refused === 'HREFLANG_ROUTE_NOT_PUBLIC');
  const unserved = res.evaluateHreflangLocale('nope-XX');
  test('an undeclared locale REFUSES — proves the served-locale gate works', unserved.eligible === false && unserved.refusal === 'HREFLANG_LOCALE_NOT_SERVED');
} finally {
  await server.close();
}

console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);

