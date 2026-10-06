#!/usr/bin/env node
/**
 * §PHASE 10 — THE PRODUCT IDENTITY LAYER GATE.
 *
 * WHY THIS EXISTS
 * ---------------
 * The identity owner (`src/lib/catalog/productIdentity.ts`) decides what a raw
 * identifier IS and HOW a source-market product relates to the UK one. Its whole
 * value rests on properties a comment cannot guarantee:
 *
 *   · it REUSES the canonical channel-identifier shape (`src/lib/catalog/asin.ts`)
 *     — it is NOT a second ASIN rule;
 *   · the barcode rule is the PUBLISHED GS1 modulo-10 check digit, applied to
 *     every GTIN length;
 *   · it is DETERMINISTIC — no clock, randomness, network or AI anywhere in it;
 *   · it FAILS CLOSED — a malformed identifier is REFUSED and an unprovable
 *     relationship is `unknown`, never a guess;
 *   · it is the ONLY owner — and the pre-audit engine NO LONGER carries its own
 *     identifier regex or relationship heuristic.
 *
 * THE GATE CAN FAIL (self-check): the GS1 helper, the classifier and the
 * relationship are each run against a DELIBERATELY-WRONG expectation as well as
 * the correct one; the wrong expectation MUST be rejected and a malformed input
 * MUST refuse, so a green run proves the checks work rather than that they are
 * vacuous.
 *
 * Run: node scripts/validate-product-identity.mjs
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
/** Strip comments so a documented example is not read as code. */
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
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

try {
  const owner = await server.ssrLoadModule('/src/lib/catalog/productIdentity.ts');
  const ownerSrc = read('src/lib/catalog/productIdentity.ts');
  const engineSrc = read('src/lib/preaudit/ukMarketFitEngine.ts');
  const ownerCode = stripComments(ownerSrc);
  const engineCode = stripComments(engineSrc);

  /* ══ A. the GS1 check digit is the published rule ═══════════════════════ */
  // Known-valid real barcodes: EAN-13, UPC-A, EAN-8.
  test('A1 a valid GTIN-13 is accepted', owner.isValidGs1CheckDigit('5012345678900') === true);
  test('A2 a valid UPC-A is accepted', owner.isValidGs1CheckDigit('036000291452') === true);
  test('A3 a valid EAN-8 is accepted', owner.isValidGs1CheckDigit('96385074') === true);
  test('A4 a single-digit change breaks the check digit', owner.isValidGs1CheckDigit('5012345678901') === false);
  test('A5 a non-numeric value is refused', owner.isValidGs1CheckDigit('50A2345678900') === false);
  test('A6 a one-character value is refused (no payload)', owner.isValidGs1CheckDigit('5') === false);

  /* ══ B. the declared vocabulary ════════════════════════════════════════ */
  test('B1 the four GTIN lengths are declared once', eq(owner.GTIN_LENGTHS, [8, 12, 13, 14]));
  test('B2 the rules are declared (five of them)', owner.PRODUCT_IDENTITY_RULES.length === 5);
  test('B3 the fail-closed rule is stated', owner.PRODUCT_IDENTITY_RULES.some((r) => /unknown/.test(r)));

  /* ══ C. classification — kind, and refusal ═════════════════════════════ */
  const cls = (v) => owner.classifyIdentifier(v);
  test('C1 a channel identifier is classified as an ASIN', cls('B0FIXTURE1').ok === true && cls('B0FIXTURE1').kind === 'asin');
  test('C2 a lowercase identifier is normalised, not rejected', cls('b0fixture1').ok === true && cls('b0fixture1').value === 'B0FIXTURE1');
  test('C3 a 13-digit valid barcode is a GTIN-13', cls('5012345678900').ok === true && cls('5012345678900').kind === 'gtin13');
  test('C4 a 12-digit valid barcode is a GTIN-12', cls('036000291452').ok === true && cls('036000291452').kind === 'gtin12');
  test('C5 an 8-digit valid barcode is a GTIN-8', cls('96385074').ok === true && cls('96385074').kind === 'gtin8');
  test('C6 a bad check digit is REFUSED (fail closed)', cls('5012345678901').ok === false && /CHECK_DIGIT/.test(cls('5012345678901').error));
  test('C7 a digit count that is not a GTIN length is REFUSED', cls('1234567890').ok === false && /NOT_A_GTIN/.test(cls('1234567890').error));
  test('C8 a bare word is REFUSED', cls('HELLO').ok === false);
  test('C9 an empty value is REFUSED', cls('   ').ok === false && /EMPTY/.test(cls('   ').error));
  test('C10 an all-digit value is never misread as a channel identifier', (() => { const r = cls('1234567890'); return r.ok === false || r.kind !== 'asin'; })());

  /* ══ D. parsing the canonical fields ═══════════════════════════════════ */
  const parsed = owner.parseProductIdentifiers(['B0FIXTURE1', '5012345678900']);
  test('D1 the channel identifier is parsed', parsed.sourceAsin === 'B0FIXTURE1');
  test('D2 the barcode fills gtin AND ean (GTIN-13)', parsed.gtin === '5012345678900' && parsed.ean === '5012345678900');
  test('D3 no UPC is invented', parsed.upc === null);
  const mixed = owner.parseProductIdentifiers(['036000291452', 'B0AB12CD34', '123', '5012345678901']);
  test('D4 a UPC-A fills upc', mixed.upc === '036000291452');
  test('D5 malformed values are refused, with the reason preserved',
    mixed.refused.length === 2 && mixed.refused.every((r) => typeof r.error === 'string' && r.error.length > 0));
  test('D6 duplicates do not double-count', owner.parseProductIdentifiers(['B0FIXTURE1', 'B0FIXTURE1']).accepted.length === 1);

  /* ══ E. the match relationship — strongest evidence first, else unknown ══ */
  const rel = (args) => owner.deriveMatchRelationship(args);
  test('E1 nothing to compare against → unknown (never a guess)',
    rel({ source: { brand: 'Acme', identifiers: ['B0ACME0001'] }, observation: null }) === 'unknown');
  test('E2 a shared barcode is EXACT',
    rel({ source: { brand: 'A', identifiers: ['5012345678900'] }, uk: { brand: 'Totally Different', identifiers: ['5012345678900'] } }) === 'exact');
  test('E3 a shared channel identifier is EXACT',
    rel({ source: { brand: 'A', identifiers: ['B0ACME0001'] }, uk: { brand: 'B', identifiers: ['B0ACME0001'] } }) === 'exact');
  test('E4 identical normalised identity is EXACT',
    rel({ source: { brand: 'Acme', model: 'X-1', productName: 'Widget' }, uk: { brand: 'acme', model: 'x1', productName: 'WIDGET' } }) === 'exact');
  test('E5 same brand + same model is PROBABLE',
    rel({ source: { brand: 'Acme', model: 'X1', productName: 'Widget' }, uk: { brand: 'Acme', model: 'X1', productName: 'Widget Deluxe' } }) === 'probable');
  test('E6 same brand, different model is RELATED',
    rel({ source: { brand: 'Acme', model: 'X1' }, uk: { brand: 'Acme', model: 'X2', productName: 'Other' } }) === 'related');
  test('E7 different brands, no shared identity is NONE',
    rel({ source: { brand: 'Acme', model: 'X1' }, uk: { brand: 'Zenith', model: 'Z9' } }) === 'none');
  test('E8 a stated UK observation is used only when no identity is available',
    rel({ source: { brand: 'Acme' }, observation: { exactListed: true } }) === 'exact' &&
    rel({ source: { brand: 'Acme' }, observation: { equivalentListed: true } }) === 'probable' &&
    rel({ source: { brand: 'Acme' }, observation: {} }) === 'none');

  /* ══ F. determinism + purity ═══════════════════════════════════════════ */
  test('F1 the same inputs always give the same answer (determinism)',
    eq(owner.parseProductIdentifiers(['B0FIXTURE1', '5012345678900']), owner.parseProductIdentifiers(['B0FIXTURE1', '5012345678900'])) &&
    owner.deriveMatchRelationship({ source: { brand: 'A', identifiers: ['B0ACME0001'] }, uk: { brand: 'B', identifiers: ['B0ACME0001'] } }) === 'exact');
  test('F2 no network call, no randomness, no clock, no dynamic import in the owner',
    !/fetch\s*\(/.test(ownerCode) && !/Math\.random/.test(ownerCode) && !/Date\.now/.test(ownerCode) && !/new Date\b/.test(ownerCode) && !/\bimport\s*\(/.test(ownerCode));
  test('F3 the channel-identifier shape is REUSED, not re-declared',
    /from '@\/lib\/catalog\/asin'/.test(ownerSrc) && !/\[A-Z0-9\]\{10\}/.test(ownerCode));
  test('F4 the canonical brand key is REUSED, not re-declared',
    /normalizeBrandKey/.test(ownerSrc) && /from '@\/lib\/intelligence\/prospectPipeline'/.test(ownerSrc));

  /* ══ G. ONE owner + the engine consolidated onto it ════════════════════ */
  const srcFiles = walk(fileURLToPath(new URL('../src', import.meta.url)));
  const gs1Owners = srcFiles.filter((f) => /export function isValidGs1CheckDigit/.test(readFileSync(f, 'utf8')));
  const parseOwners = srcFiles.filter((f) => /export function parseProductIdentifiers/.test(readFileSync(f, 'utf8')));
  test('G1 exactly ONE GS1 check-digit owner exists', gs1Owners.length === 1 && /productIdentity\.ts$/.test(gs1Owners[0]));
  test('G2 exactly ONE identifier-parsing owner exists', parseOwners.length === 1 && /productIdentity\.ts$/.test(parseOwners[0]));
  test('G3 the pre-audit engine no longer carries its own identifier regex',
    !/B0\[A-Z0-9\]/.test(engineCode) && !/\\d\{8,14\}/.test(engineCode) && !/asinLike|gtinLike/.test(engineCode));
  test('G4 the pre-audit engine reads the identity rules from the owner',
    /parseProductIdentifiers/.test(engineCode) && /deriveMatchRelationship/.test(engineCode) && /from '@\/lib\/catalog\/productIdentity'/.test(engineSrc));

  /* ══ H. the gate can fail (self-check) ════════════════════════════════ */
  const wrongExpectation = (actual, expected) => actual === expected;
  test('H1 the GS1 helper is not vacuous (a wrong expectation is rejected)',
    wrongExpectation(owner.isValidGs1CheckDigit('5012345678900'), false) === false);
  test('H2 the classifier is not vacuous (a valid barcode is not "unrecognised")',
    wrongExpectation(owner.classifyIdentifier('5012345678900').ok, false) === false);
  test('H3 the relationship is not vacuous (a shared identity is not "unknown")',
    wrongExpectation(owner.deriveMatchRelationship({ source: { brand: 'A', identifiers: ['B0ACME0001'] }, uk: { brand: 'B', identifiers: ['B0ACME0001'] } }), 'unknown') === false);
} catch (err) {
  console.error('PRODUCT_IDENTITY_VALIDATION_FAIL:', err.message);
  failures += 1;
} finally {
  await server.close();
  console.log(`\nPRODUCT_IDENTITY_VALIDATION_${failures === 0 ? 'PASS' : 'FAIL'} (${failures} failures)`);
  process.exit(failures > 0 ? 1 : 0);
}

