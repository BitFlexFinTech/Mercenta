/*
 * §PHASE 9 — localization / SEO / hreflang — registry reconciliation (2026-10-06).
 *
 * WHY. The Phase-9 row `phase9-localization-seo-hreflang` recorded the locale
 * presentation conventions and the search metadata that must agree with them:
 * languages, number/date formats, timezones, localized URLs, SEO, hreflang, payment
 * availability and market-specific messaging. THIS increment builds the ONE owner
 * (`src/config/localisationSeo.ts`) and the pure fail-closed resolver
 * (`src/lib/localisation/localisationSeo.ts`), wires the hreflang alternates into the
 * SEO runtime (`src/lib/seo/routeMetadata.ts`) and surfaces the framework on the
 * Super-Admin Founder Control Centre, and raises the row to `built`.
 *
 * The row's old evidence ("docs — roadmap §PHASE 9") was a STALE citation, so it is
 * replaced here by the real built artefacts.
 *
 * Run: node scripts/reconcile-localisation-seo-registry.cjs
 */
const fs = require('node:fs');
const path = require('node:path');

const REG = path.join(__dirname, '..', 'requirements-registry.json');
const reg = JSON.parse(fs.readFileSync(REG, 'utf8'));
const byId = new Map(reg.entries.map((e) => [e.id, e]));
const DATE = '2026-10-06';

const row = byId.get('phase9-localization-seo-hreflang');
if (!row) {
  console.error('MISSING ROW: phase9-localization-seo-hreflang');
  process.exit(1);
}

const OLD_STATUS = row.status;
const OLD_EVIDENCE = row.evidence;

row.status = 'built';
row.description =
  'Phase 9 — localization, SEO and hreflang: number/date/time FORMATS, market TIMEZONES, the localized-URL ' +
  'strategy, a FAIL-CLOSED hreflang rule, payment availability and market-specific messaging. ' +
  'BUILT (2026-10-06): the ONE owner `src/config/localisationSeo.ts` declares the SERVED content locales ' +
  '(honest — en-GB only today), the localized-URL strategy, the per-locale number/date/time conventions ' +
  '(separators READ from the platform’s own Intl runtime, never hand-typed) and the per-market IANA ' +
  'timezones, and it names the market-messaging SLOTS by their canonical owner (payment availability → ' +
  '`src/config/payouts.ts`; display/settlement currency → their owners) rather than holding a second copy. ' +
  'The pure resolver `src/lib/localisation/localisationSeo.ts` applies it: a hreflang alternate is emitted ' +
  'ONLY for a language Mercenta actually serves content in (an unserved locale is REFUSED, ' +
  'HREFLANG_LOCALE_NOT_SERVED) and ONLY for a PUBLIC route (a private/unknown path is REFUSED, ' +
  'HREFLANG_ROUTE_NOT_PUBLIC), and x-default always self-references the served default. The alternates are ' +
  'wired into the SEO runtime (`src/lib/seo/routeMetadata.ts` emits the <link rel="alternate" hreflang> ' +
  'tags). Deterministic (no AI, no clock) and internal (Super-Admin surface only).';
row.evidence =
  'src/config/localisationSeo.ts (the ONE owner); src/lib/localisation/localisationSeo.ts (the pure ' +
  'fail-closed resolver); src/lib/seo/routeMetadata.ts (carries + applies the hreflang alternates); ' +
  'src/lib/commandCentre/controlCentre.ts (computes + exposes localisationSeo); ' +
  'src/components/admin/FounderControlCentre.tsx (Finance → Localization, SEO & hreflang, Super-Admin only); ' +
  'gate scripts/validate-localisation-seo.mjs (npm run validate:localisation-seo, 45 assertions, ' +
  'mutation-proved TWICE); e2e/founder-operating-system.spec.ts test 18 renders it live.';
row.last_verified = DATE;
row.superseded_by = null;
row._audit_note =
  `§PHASE 9 (localization / SEO / hreflang) (2026-10-06) — STATUS RAISED not_started -> built (old value ` +
  `recorded inline, never deleted). OLD status: ${JSON.stringify(OLD_STATUS)}. OLD evidence: ${JSON.stringify(OLD_EVIDENCE)} ` +
  `(a STALE "roadmap §PHASE 9" citation, fixed at source). Built as the ONE owner + the pure fail-closed ` +
  `resolver: hreflang is emitted only for a served content locale and only for a public route, x-default ` +
  `self-references the served default, and market-specific wording stays in its canonical owner. Surface ` +
  `declared in BOTH scope guards (E6 PHASE9_LOCALIZATION_SEO_SCOPE; E7 entries).`;

/* _meta: counts, date, changelog. */
const counts = {};
for (const e of reg.entries) counts[e.status] = (counts[e.status] || 0) + 1;
reg._meta.last_updated = DATE;
reg._meta.total_entries = reg.entries.length;
reg._meta.status_counts = {
  _note:
    'Recomputed 2026-10-06 by scripts/reconcile-localisation-seo-registry.cjs after the §PHASE 9 ' +
    '(localization / SEO / hreflang) increment (phase9-localization-seo-hreflang not_started -> built; no row ' +
    'added or removed: total_entries stays 540; built +1, not_started -1). Snapshot only.',
  ...counts,
};
reg._meta.localisation_seo_increment = {
  increment: '§PHASE 9 — localization / SEO / hreflang (2026-10-06)',
  restated: ['phase9-localization-seo-hreflang'],
  added: [],
  validators: ['scripts/validate-localisation-seo.mjs'],
  note:
    'The locale presentation conventions and the search metadata had no owner; the row was described only in ' +
    'the roadmap. The owner + the pure fail-closed resolver declare them once and BRIDGE the existing ' +
    'canonical owners (`src/config/localisation.ts` for locales/currencies, `src/lib/seo/publicRoutes.ts` for ' +
    'the public routes) without re-declaring them: hreflang is emitted only for a served content locale ' +
    '(en-GB today) and only for a public route, x-default self-references the served default, and no page is ' +
    'ever advertised in a language Mercenta does not serve. It is internal (Super-Admin + the SEO runtime) and ' +
    'deterministic (no AI, no clock).',
};

fs.writeFileSync(REG, JSON.stringify(reg, null, 2) + '\n');
console.log(`registry reconciled: total_entries=${reg.entries.length}`);
console.log('status_counts:', JSON.stringify(counts));
