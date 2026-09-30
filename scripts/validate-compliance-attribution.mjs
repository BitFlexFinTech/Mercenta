#!/usr/bin/env node
/**
 * §BATCH 2e (`AV-031` / `AV-032`) — THE COMPLIANCE-ATTRIBUTION GATE.
 *
 * WHY THIS EXISTS
 * ---------------
 * `docs/AMAZON_RECONCILIATION_STATUS.md` registered two findings:
 *
 *   `AV-032` (UNSUPPORTED) — `brand_registry_confirmation` was a BASE REQUIRED
 *   document, so a brand could be BLOCKED on it, even though "Amazon Brand
 *   Registry" is a SELLER / brand-owner programme with no vendor obligation
 *   behind it. Disposition: RELABEL/REMOVE → reclassify as an OPTIONAL Mercenta
 *   onboarding control, relabelled away from the marketplace term and removed
 *   from the hard gate.
 *
 *   `AV-031` (CONTRADICTED) — the module attributed the compliance-document
 *   obligations to "Amazon UK requirements / marketplace rules" when they are
 *   UK/EU LAW plus Mercenta's own onboarding controls.
 *
 * Correction alone is not the fix: a later edit could put either defect back.
 * This gate EXECUTES the shipped module (through the project's own Vite/TS
 * pipeline) so it asserts RUNNING behaviour, not a pattern, and fails if:
 *
 *   1  `brand_registry_confirmation` returns to the required set (base,
 *      category OR conditional) — a brand could be blocked on it again;
 *   2  a MISSING or REJECTED brand-ownership confirmation affects a gate
 *      decision;
 *   3  the reclassification is not DECLARED (silently dropped rather than
 *      declared as an optional Mercenta control with a stated rationale);
 *   4  the demo seed regenerates a brand_registry_confirmation document, or the
 *      declared demo baseline drifts from the seed;
 *   5  the compliance module (or the demo seed) claims a channel/marketplace
 *      requirement again;
 *   6  another source file re-declares the required-document list by hand.
 *
 * Run: node scripts/validate-compliance-attribution.mjs
 */
import { readFileSync } from 'node:fs';
import { createServer } from 'vite';

const read = (relative) => readFileSync(relative, 'utf8');
/** Source with comments stripped — an assertion about CODE, never about prose. */
const codeOf = (relative) =>
  read(relative)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');

/**
 * Does any single LINE claim the channel requires the documents? Used against
 * the WHOLE source (comments included — a comment is published copy too).
 */
const claimsChannelRequirement = (src) =>
  src
    .split('\n')
    .some((line) => /amazon/i.test(line) && /(requir|marketplace rule)/i.test(line));

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
let failures = 0;
const test = (name, ok, detail = '') => {
  console.log(`${ok ? '✓' : '✗'} ${name}${ok || !detail ? '' : ` — ${detail}`}`);
  if (!ok) failures++;
};

const CATEGORIES = [
  'Home', 'Baby', 'Office Products', 'Health & Personal Care', 'Kitchen',
  'Consumer Electronics', 'Automotive', 'Grocery', 'Personal Computer', 'Apparel',
];
const BRC = 'brand_registry_confirmation';

try {
  const compliance = await server.ssrLoadModule('/src/lib/compliance.ts');
  const seed = await server.ssrLoadModule('/src/data/demoData.ts');
  const store = await server.ssrLoadModule('/src/data/demoStore.ts');

  /* ── A. §AV-032 — it is NOT a requirement, and it never blocks ─────────── */
  console.log('\n── A. §AV-032 — brand_registry_confirmation is not (and never blocks) a requirement ──');

  test('the base required set is exactly the three vendor obligations',
    compliance.BASE_REQUIRED_DOCUMENTS.length === 3 &&
      ['letter_of_authorization', 'product_safety_ukca', 'insurance_certificate']
        .every((t) => compliance.BASE_REQUIRED_DOCUMENTS.includes(t)),
    compliance.BASE_REQUIRED_DOCUMENTS.join(', '));
  test('no category requires it',
    CATEGORIES.every((c) => !compliance.getRequiredDocumentsForCategory(c).includes(BRC)),
    CATEGORIES.filter((c) => compliance.getRequiredDocumentsForCategory(c).includes(BRC)).join(', '));
  test('no resolved requirement set contains it (base OR conditional)',
    CATEGORIES.every((c) => !compliance.getApplicableRequirements(c).some((r) => r.type === BRC)));
  test('the universal requirement list excludes it',
    !compliance.getComplianceRequirements().some((r) => r.type === BRC));
  test('the reclassification is DECLARED as an optional Mercenta control (not silently dropped)',
    compliance.OPTIONAL_MERCENTA_CONTROLS.some((c) => c.type === BRC),
    compliance.OPTIONAL_MERCENTA_CONTROLS.map((c) => c.type).join(', '));
  test('the optional control states WHY it is optional, in its own words',
    compliance.OPTIONAL_MERCENTA_CONTROLS
      .filter((c) => c.type === BRC)
      .every((c) => typeof c.rationale === 'string' && c.rationale.length > 40 &&
        /optional/i.test(c.rationale)));

  const docsWith = (status) => [
    { type: 'letter_of_authorization', status: 'approved' },
    { type: 'product_safety_ukca', status: 'approved' },
    { type: 'insurance_certificate', status: 'approved' },
    { type: BRC, status },
  ];
  const missingGate = compliance.evaluateComplianceGate(docsWith('missing'), 'Home', true, true, true);
  test('a MISSING brand-ownership confirmation never blocks the gate',
    missingGate.cleared === true &&
      !missingGate.missing.includes(BRC) &&
      !missingGate.blocking.some((b) => b.type === BRC),
    `cleared=${missingGate.cleared} missing=${missingGate.missing.join(',')}`);
  test('a REJECTED brand-ownership confirmation never blocks the gate',
    compliance.evaluateComplianceGate(docsWith('rejected'), 'Home', true, true, true).cleared === true);

  /* ── B. §AV-032 — the demo seed reflects the reclassification ──────────── */
  console.log('\n── B. §AV-032 — the demo seed holds no such document ──');

  const seedDocs = store.demoComplianceDocs;
  const brcDocs = seedDocs.filter((d) => d.type === BRC);
  test('the demo holds NO brand_registry_confirmation record at all',
    brcDocs.length === 0, `${brcDocs.length} record(s)`);
  test('the demo document baseline matches the seed',
    seedDocs.length === seed.DEMO_COMPLIANCE_BASELINE.documents,
    `declared ${seed.DEMO_COMPLIANCE_BASELINE.documents} · actual ${seedDocs.length}`);
  const blockingDocs = seedDocs.filter((d) => d.status === 'missing' || d.status === 'rejected');
  test('the demo blocking-document baseline matches the seed',
    blockingDocs.length === seed.DEMO_COMPLIANCE_BASELINE.blockingDocuments,
    `declared ${seed.DEMO_COMPLIANCE_BASELINE.blockingDocuments} · actual ${blockingDocs.length}`);

  /* ── C. §AV-031 — attributed to law + Mercenta, never to the channel ───── */
  console.log('\n── C. §AV-031 — no channel/marketplace requirement claim ──');

  test('the compliance module claims no channel requirement',
    !claimsChannelRequirement(read('src/lib/compliance.ts')));
  test('the demo seed claims no channel requirement',
    !claimsChannelRequirement(read('src/data/demoData.ts')));
  test('the display label no longer names the seller programme',
    !/brand registry/i.test(compliance.CATEGORY_DOC_LABELS[BRC]),
    compliance.CATEGORY_DOC_LABELS[BRC]);
  test('the compliance module CODE contains no marketplace-requirement claim',
    !/amazon/i.test(codeOf('src/lib/compliance.ts')));

  /* ── D. Single source of truth for the required set ────────────────────── */
  console.log('\n── D. the required set has ONE owner ──');
  test('the admin overview does not re-declare the required-document list',
    !/brand_registry_confirmation/.test(codeOf('src/components/admin/AdminDashboard.tsx')) &&
      !/const REQUIRED_DOC_TYPES/.test(codeOf('src/components/admin/AdminDashboard.tsx')));
} finally {
  await server.close();
}
console.log(failures === 0
  ? '\nALL COMPLIANCE-ATTRIBUTION CHECKS PASSED'
  : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
