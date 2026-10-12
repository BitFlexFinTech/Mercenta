// §LIFT OFF — THE LAUNCH PROGRAMME validator.
//
// Proves the programme is ONE declared thing and is actually wired:
//   • it has its OWN name + endorsement, and a public route declared once;
//   • the rules MIRROR the channel's published launch programme, with a named
//     source, and the channel-specific numbers are NOT claimed as verified;
//   • no rule, and no public copy, promises approval, a place or a partnership;
//   • the two customers (programme vs managed distribution) are distinct;
//   • the eligibility check is deterministic AND fail-closed;
//   • the brand portal section and the public page are both wired;
//   • a self-check proves the claim-detector CAN fail.
import { createServer } from 'vite';
import { readFileSync } from 'node:fs';

/* Network instrumentation — the programme must make ZERO calls. */
let networkCalls = 0;
const realFetch = globalThis.fetch;
globalThis.fetch = (...args) => {
  networkCalls += 1;
  console.error('[validate-lift-off] UNEXPECTED network call:', args[0]);
  return realFetch(...args);
};

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
let failures = 0;
let checks = 0;
const test = (name, ok, detail = '') => {
  checks++;
  console.log(`${ok ? '✓' : '✗'} ${name}${!ok && detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

try {
  const cfg = await server.ssrLoadModule('/src/config/liftOff.ts');
  const elig = await server.ssrLoadModule('/src/lib/liftOff/eligibility.ts');

  /* ── identity ─────────────────────────────────────────────────────────── */
  test('the programme has its OWN name and an endorsement line',
    cfg.LIFT_OFF_NAME === 'Lift Off' && cfg.LIFT_OFF_ENDORSEMENT === 'By Mercenta');
  test('the wordmark is "name | endorsement"',
    cfg.LIFT_OFF_WORDMARK === `${cfg.LIFT_OFF_NAME} | ${cfg.LIFT_OFF_ENDORSEMENT}`);
  test('the public route is declared once', cfg.LIFT_OFF_PATH === '/lift-off');

  /* ── the rules mirror the published programme ─────────────────────────── */
  const termIds = cfg.LIFT_OFF_TERMS.map((t) => t.id);
  for (const id of [
    'opening_order', 'order_is_asked_for', 'return_rights', 'advertising_support',
    'sell_through_window', 'channel_decides', 'mercenta_runs_it', 'numeric_thresholds',
  ]) test(`the mirrored rule "${id}" is declared`, termIds.includes(id));
  test('the rules name real, published sources (>= 3)', cfg.LIFT_OFF_RULES_SOURCES.length >= 3);
  test('the channel-specific numbers are NOT claimed as verified', cfg.LIFT_OFF_TERMS_VERIFIED === false);
  test('an honest verification note is present',
    typeof cfg.LIFT_OFF_VERIFICATION_NOTE === 'string' && cfg.LIFT_OFF_VERIFICATION_NOTE.length > 40);

  /* ── no claim of approval / a place / a partnership ───────────────────── */
  const CLAIM = /\bguarantee(d|s)?\b|\bapproved by\b|\bendorsed\b|\bpartnership\b|\bwe control the\b/i;
  const allCopy = [
    cfg.LIFT_OFF_SUMMARY, cfg.LIFT_OFF_VERIFICATION_NOTE,
    ...cfg.LIFT_OFF_TERMS.map((t) => `${t.label} ${t.detail}`),
    ...cfg.LIFT_OFF_PUBLIC_POINTS.map((p) => `${p.title} ${p.body}`),
  ].join(' \n ');
  test('no rule or copy promises approval, a place or a partnership',
    !CLAIM.test(allCopy), (allCopy.match(CLAIM) || [])[0]);
  test('the claim-detector CAN fail (self-check)', CLAIM.test('We guarantee a place in the programme.') === true);

  /* ── two customers, distinct ──────────────────────────────────────────── */
  test('the programme and managed distribution are declared as different customers',
    cfg.LIFT_OFF_VS_DISTRIBUTION.programme.label !== cfg.LIFT_OFF_VS_DISTRIBUTION.distribution.label &&
    cfg.LIFT_OFF_VS_DISTRIBUTION.programme.for !== cfg.LIFT_OFF_VS_DISTRIBUTION.distribution.for);
  /* ── eligibility: deterministic + fail-closed ─────────────────────────── */
  const empty = elig.evaluateLiftOffEligibility({ category: 'NotACategory', productCount: 0, complianceCleared: false, commercialModel: null });
  test('an unknown brand is NOT eligible (fail-closed)', empty.eligible === false && empty.met === 0);
  const all = elig.evaluateLiftOffEligibility({ category: 'Home', productCount: 3, complianceCleared: true, commercialModel: 'commission_agent' });
  test('a fully-qualified brand IS eligible, every criterion met', all.eligible === true && all.met === all.total);
  test('eligibility is deterministic',
    JSON.stringify(elig.evaluateLiftOffEligibility({ category: 'Home', productCount: 3, complianceCleared: true, commercialModel: 'commission_agent' })) === JSON.stringify(all));
  test('the evaluator reads the rules from the ONE owner', all.outcomes.length === cfg.LIFT_OFF_ELIGIBILITY_RULES.length);

  /* ── wiring: brand section ────────────────────────────────────────────── */
  const brandShell = read('src/components/layout/BrandShell.tsx');
  test('the brand portal declares the programme as its own SECTION',
    /label: 'Programme'/.test(brandShell) && /id: 'lift_off', label: 'Lift Off'/.test(brandShell));
  test('the brand portal renders the programme section', /brandView === 'lift_off' && <LiftOffProgramme \/>/.test(brandShell));
  test('the section is lazy-loaded (the shell stays small)', /LiftOffProgramme = lazy\(/.test(brandShell));

  /* ── wiring: public page ──────────────────────────────────────────────── */
  test('the public route is declared in the SEO owner',
    /page: 'lift-off'/.test(read('src/lib/seo/publicRoutes.ts')));
  test('robots.txt allows the public page', /Allow: \/lift-off\b/.test(read('public/robots.txt')));
  test('sitemap.xml lists the public page', /mercenta\.co\.uk\/lift-off</.test(read('public/sitemap.xml')));
  test('the public page is rendered for its route', /page === 'lift-off'/.test(read('src/components/marketing/Home.tsx')));

  /* ── the section is REAL, not decorative ──────────────────────────────── */
  const comp = read('src/components/brand/LiftOffProgramme.tsx');
  test('the brand section renders the mirrored rules from the owner', /LIFT_OFF_TERMS\.map/.test(comp));
  test('the brand section renders the REAL eligibility outcomes',
    /evaluateLiftOffEligibility/.test(comp) && /eligibility\.outcomes/.test(comp));

  /* ── zero network ─────────────────────────────────────────────────────── */
  test('no network call was made', networkCalls === 0);
} catch (e) {
  console.error('validate-lift-off ERROR:', e?.message ?? e);
  failures++;
} finally {
  await server.close();
}

console.log(
  failures === 0
    ? `LIFT_OFF_VALIDATION_PASS (${checks} checks)`
    : `LIFT_OFF_VALIDATION_FAIL (${failures} of ${checks} failed)`
);
process.exit(failures === 0 ? 0 : 1);

