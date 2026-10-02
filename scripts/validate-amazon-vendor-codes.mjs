// §AMAZON VENDOR CODES — THE REGISTRY GATE.
//
// WHY THIS EXISTS
// ---------------
// `src/config/amazonVendorCodes.ts` is the SINGLE SOURCE OF TRUTH for the vendor
// codes Mercenta's Amazon Vendor Central account holds and the category each is
// shown against. The Founder provided the list on 2026-10-02 and instructed that
// every category string be kept VERBATIM (exactly as Amazon Vendor Central shows
// it), with two codes left UNCONFIRMED until the Founder checks with Amazon.
//
// This gate EXECUTES the real module (Node's TypeScript stripping) and proves:
//   1. the registry holds exactly 10 codes, with the codes the Founder listed;
//   2. every confirmed category is stored verbatim (never reworded/merged);
//   3. exactly TWO codes are unconfirmed (SV5QE, SV76D), carry a null category,
//      and state the blocker — so a category can never be silently linked to a
//      blank code;
//   4. the lookup honours the rule: an unknown code AND an unconfirmed code both
//      return `null` (the honest answer), never a guessed category.
//
// A change that rewrites a verbatim string, links a blank code, or drops the
// unconfirmed marker FAILS here.

import { readFileSync } from 'node:fs';

let failures = 0;
let checks = 0;
const test = (name, ok, detail) => {
  checks++;
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) {
    failures++;
    if (detail !== undefined) console.log(`      ${String(detail).slice(0, 400)}`);
  }
};

const ROOT = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), 'utf8');

const MODULE = 'src/config/amazonVendorCodes.ts';
const mod = await import(new URL(MODULE, ROOT).href);
const { AMAZON_VENDOR_CODES, categoryForVendorCode, vendorCodeEntry, isVendorCodeCategoryConfirmed } = mod;

/* The Founder's list, verbatim (2026-10-02). `null` = not yet confirmed with Amazon. */
const EXPECTED = [
  { code: '310JT', category: 'Baby' },
  { code: '3X0JM', category: 'Kitchen' },
  { code: '7HGME', category: 'Office' },
  { code: 'AP4KM', category: 'Grocery' },
  { code: 'RWOOY', category: 'Personal Computers Office' },
  { code: 'SURX3', category: 'Home & Kitchen' },
  { code: 'SV5QE', category: null },
  { code: 'SV5UD', category: 'HPCA (Health & Personal Care' },
  { code: 'SV76D', category: null },
  { code: 'X10KV', category: 'Automotive' },
];

/* 1. exactly 10 codes, same order and same codes as the Founder listed */
test('the registry holds exactly 10 vendor codes', AMAZON_VENDOR_CODES.length === 10, AMAZON_VENDOR_CODES.length);
test(
  'every vendor code is present, in the order the Founder listed',
  AMAZON_VENDOR_CODES.map((v) => v.code).join(',') === EXPECTED.map((e) => e.code).join(','),
  AMAZON_VENDOR_CODES.map((v) => v.code).join(',')
);

/* 2. every confirmed category is stored VERBATIM as the Founder gave it */
for (const exp of EXPECTED) {
  const entry = AMAZON_VENDOR_CODES.find((v) => v.code === exp.code);
  if (!entry) {
    test(`code ${exp.code} exists`, false, 'missing');
    continue;
  }
  if (exp.category === null) continue; // handled by the unconfirmed block below
  test(
    `category for ${exp.code} is stored verbatim ("${exp.category}")`,
    entry.category === exp.category && entry.categoryConfirmed === true,
    `got ${JSON.stringify(entry.category)} confirmed=${entry.categoryConfirmed}`
  );
}

/* 3. exactly TWO unconfirmed codes — SV5QE and SV76D — null category + a stated blocker */
const unconfirmed = AMAZON_VENDOR_CODES.filter((v) => !v.categoryConfirmed);
test(
  'exactly two codes are unconfirmed: SV5QE and SV76D',
  unconfirmed.map((v) => v.code).sort().join(',') === 'SV5QE,SV76D',
  unconfirmed.map((v) => v.code).join(',')
);
test(
  'an unconfirmed code carries a null category and states the blocker',
  unconfirmed.every((v) => v.category === null && typeof v.note === 'string' && v.note.length > 0)
);
test(
  'no confirmed code carries a null category',
  AMAZON_VENDOR_CODES.filter((v) => v.categoryConfirmed).every((v) => typeof v.category === 'string' && v.category.length > 0)
);

/* 4. the lookup refuses to guess — unknown code AND blank code both return null */
test('categoryForVendorCode returns a confirmed category', categoryForVendorCode('X10KV') === 'Automotive');
test('categoryForVendorCode returns null for an UNCONFIRMED code (never a guess)', categoryForVendorCode('SV5QE') === null);
test('categoryForVendorCode returns null for an UNKNOWN code', categoryForVendorCode('NOPE-123') === null);
test('isVendorCodeCategoryConfirmed is false for an unconfirmed code', isVendorCodeCategoryConfirmed('SV76D') === false);
test('isVendorCodeCategoryConfirmed is true for a confirmed code', isVendorCodeCategoryConfirmed('310JT') === true);
test('vendorCodeEntry returns undefined for an unknown code', vendorCodeEntry('NOPE-123') === undefined);

/* 5. the module documents that the two blank codes are BLOCKED on Amazon confirmation */
const source = read(MODULE);
test(
  'the module records the Amazon-confirmation block for the blank codes',
  /To Be Confirmed/.test(source) && /Do not guess/i.test(source)
);

console.log(`\n${checks - failures}/${checks} passed`);
if (failures) {
  console.error(`\n${failures} FAILED`);
  process.exit(1);
}
process.exit(0);
