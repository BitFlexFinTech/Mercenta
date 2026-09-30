#!/usr/bin/env node
/**
 * §BATCH 2f (`AV-042`) — THE PROGRAMME-CLAIM WORDING GATE.
 *
 * WHY THIS EXISTS
 * ---------------
 * `docs/AMAZON_RECONCILIATION_STATUS.md` registered `AV-042` (Wording safeguards,
 * MEDIUM/HIGH): the canonical business rules ban *"guaranteed purchase orders"* /
 * *"Amazon guaranteed POs"* outright, but the programme-claim regex set in
 * `src/lib/intelligence/amazonWording.ts` listed only sales/revenue/acceptance/
 * approval/launch/placement/listing — so a PO-guarantee claim could pass the gate.
 * The register's own evidence pointer also named four further phrasings the
 * canonical `.clinerules/mercenta-business-model.md` bans by name ("we sell
 * directly to Amazon", "we bypass Amazon", "Amazon wholesale loophole", "Amazon
 * will buy your products") that the set did not catch either.
 *
 * Correcting the list once is not the fix: a later edit could drop a rule again.
 * This gate EXECUTES the shipped module (through the project's own Vite/TS
 * pipeline) and fails if:
 *
 *   1  any phrasing the canonical business rules ban is NOT caught;
 *   2  the honest purchase-order vocabulary is wrongly BLOCKED (a gate that
 *      blocks honest copy is as broken as one that passes a banned claim);
 *   3  `sanitiseAmazonClaim` no longer repairs a PO-guarantee claim;
 *   4  the rule set shrinks below the coverage this row requires;
 *   5  the `AV-042` register row reverts to "OPEN — not applied".
 *
 * THE GATE CAN FAIL (self-check): `missedBy()` is run against the CURRENT rules
 * and against a deliberately-deficient copy with the guarantee rules removed —
 * the second MUST report misses, so a green run proves the check works rather
 * than that it is vacuous.
 *
 * Run: node scripts/validate-wording-guard.mjs
 */
import { readFileSync } from 'node:fs';
import { createServer } from 'vite';

const read = (relative) => readFileSync(relative, 'utf8');

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
let failures = 0;
const test = (name, ok, detail = '') => {
  console.log(`${ok ? '✓' : '✗'} ${name}${ok || !detail ? '' : ` — ${detail}`}`);
  if (!ok) failures++;
};

/** Every phrasing the canonical business rules ban, with the rule that must catch it. */
const BANNED = [
  ['guaranteed purchase orders', 'AV-042 — canonical ban'],
  ['guaranteed purchase order', 'AV-042 — singular'],
  ['Amazon guaranteed PO', 'AV-042 — "Amazon guaranteed POs"'],
  ['guaranteed POs', 'AV-042 — plural PO'],
  ['guaranteed PO', 'AV-042 — bare PO'],
  ['your purchase orders are guaranteed', 'AV-042 — reversed phrasing'],
  ['your POs are guaranteed', 'AV-042 — reversed PO phrasing'],
  ['Amazon wholesale loophole', 'business model — banned by name'],
  ['Amazon will buy your products', 'business model — banned by name'],
  ['we sell directly to Amazon', 'business model — banned by name'],
  ['we bypass Amazon', 'business model — banned by name'],
];

/** The honest purchase-order vocabulary the canonical rules REQUIRE. Must pass. */
const HONEST = [
  'Estimated PO opportunity for this brand.',
  'PO potential: the demand potential shown is modelled, not promised.',
  'This is an estimate of PO opportunity, not a committed order.',
  'Projected opportunity only — Mercenta does not control the channel\u2019s decisions.',
];

/** Which banned samples a given rule set fails to catch. */
const missedBy = (rules, samples) =>
  samples.filter(([text]) =>
    !rules.some(({ pattern }) => {
      pattern.lastIndex = 0;
      return pattern.test(text);
    })
  );

try {
  const wording = await server.ssrLoadModule('/src/lib/intelligence/amazonWording.ts');
  const rules = wording.AMAZON_WORDING_RULES;

  console.log('\n── A. every banned phrasing is caught ──');
  test('the rule set has grown to cover purchase-order guarantees',
    rules.length >= 12, `${rules.length} rules`);
  const missed = missedBy(rules, BANNED);
  test('NO banned phrasing escapes the gate',
    missed.length === 0, missed.map((m) => `${m[0]} (${m[1]})`).join(' | '));

  console.log('\n── B. the honest vocabulary is never blocked ──');
  const wronglyBlocked = HONEST.filter((text) => wording.lintAmazonWording(text).programmeHits.length > 0);
  test('honest PO wording passes the programme gate',
    wronglyBlocked.length === 0, wronglyBlocked.join(' | '));

  console.log('\n── C. repair, not silent pass-through ──');
  const repaired = wording.sanitiseAmazonClaim('We can offer Amazon guaranteed POs for your brand.');
  test('a PO-guarantee claim is REMOVED and the honest note appended',
    /\[removed: unverified retail-channel claim\]/.test(repaired) &&
      repaired.includes(wording.AMAZON_NO_APPROVAL_CLAIM) &&
      !/guaranteed/i.test(repaired));

  console.log('\n── D. the gate can FAIL (self-check, not vacuous) ──');
  const withoutGuaranteeRules = rules.filter(({ pattern }) => !/guarantee/i.test(pattern.source));
  const missedWithout = missedBy(withoutGuaranteeRules, BANNED);
  test('removing the guarantee rules makes the SAME check report misses',
    missedWithout.length >= 5, `${missedWithout.length} miss(es)`);

  console.log('\n── E. the register row records the fix (no stale "OPEN") ──');
  const statusDoc = read('docs/AMAZON_RECONCILIATION_STATUS.md');
  const av042Row = statusDoc.split('\n').find((l) => l.startsWith('| AV-042 ')) ?? '';
  test('the AV-042 row exists in the reconciliation status',
    av042Row.length > 0);
  test('the AV-042 row is not still claiming "OPEN — not applied"',
    !/OPEN\s*—\s*not applied/i.test(av042Row), av042Row.slice(0, 120));
} finally {
  await server.close();
}

console.log(failures === 0
  ? '\nWORDING_GUARD_VALIDATION_PASS'
  : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
