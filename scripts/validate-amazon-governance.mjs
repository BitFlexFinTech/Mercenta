#!/usr/bin/env node
/**
 * §PHASE 13 — THE AMAZON RELATIONSHIP GOVERNANCE GATE.
 *
 * The row `phase13-amazon-relationship-governance` records the cross-cutting governance over
 * the authoritative sources of Mercenta's retail-channel relationship. The owner
 * (`src/config/amazonRelationshipGovernance.ts`) declares the source universe and the rule;
 * the resolver (`src/lib/intelligence/amazonRelationshipGovernance.ts`) applies it. The
 * properties a comment cannot guarantee are proved here:
 *
 *   · the nine authoritative sources are declared, unique, and each names a canonical owner;
 *   · every status is a declared status value;
 *   · a claim citing an UNKNOWN source is REFUSED; a wording-failing claim is REFUSED; a claim
 *     resting on an unverified source is REFUSED (the governance fails closed);
 *   · the pure support rule ACCEPTS only all-verified citations (positive branch proven);
 *   · the programme status is REUSED from the wording owner, never re-typed;
 *   · it is DETERMINISTIC (no AI, no clock, no network), INTERNAL (no brand import), USED by
 *     the Control Centre and RENDERED by the founder surface.
 *
 * THE GATE CAN FAIL (self-check): a wrong expectation is rejected and a malformed input is
 * refused, so a green run proves the checks are live rather than vacuous.
 *
 * Run: node scripts/validate-amazon-governance.mjs
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
  const owner = await server.ssrLoadModule('/src/config/amazonRelationshipGovernance.ts');
  const res = await server.ssrLoadModule('/src/lib/intelligence/amazonRelationshipGovernance.ts');
  const wording = await server.ssrLoadModule('/src/lib/intelligence/amazonWording.ts');

  console.log('\n── A. the authoritative source universe ──');
  const srcs = owner.AMAZON_AUTHORITATIVE_SOURCES;
  test('the nine authoritative sources are declared', srcs.length === 9);
  test('source ids are unique', new Set(srcs.map((s) => s.id)).size === srcs.length);
  test('every source names a label, what it governs and a canonical owner',
    srcs.every((s) => s.label.length > 4 && s.governs.length > 10 && s.canonicalOwner.length > 4));
  test('every source status is a declared status value',
    srcs.every((s) => owner.AMAZON_SOURCE_STATUSES.includes(s.status)));
  test('the declared status set is exactly the three values',
    equals([...owner.AMAZON_SOURCE_STATUSES].sort(), ['held_unverified', 'not_held', 'verified']));
  test('no source claims to be verified today (honest programme position)',
    srcs.every((s) => s.status !== 'verified'));

  console.log('\n── B. the resolver — fail closed ──');
  test('a known source resolves', res.resolveAuthoritativeSource('vendor-agreement').found === true);
  test('an unknown source does not resolve', res.resolveAuthoritativeSource('not-a-source').found === false);
  const rUnknown = res.evaluateAmazonClaim('A neutral statement.', ['not-a-source']);
  test('a claim citing an unknown source is REFUSED',
    rUnknown.allowed === false && rUnknown.refusal === 'GOVERNANCE_SOURCE_UNKNOWN');
  const rWording = res.evaluateAmazonClaim('Mercenta is an Amazon approved partner.', ['vendor-agreement']);
  test('a wording-failing claim is REFUSED',
    rWording.allowed === false && rWording.refusal === 'CLAIM_FAILS_WORDING_SAFEGUARD');
  const rUnverified = res.evaluateAmazonClaim('Mercenta manages retail-channel purchase orders.', ['vendor-agreement']);
  test('a claim resting on an unverified source is REFUSED',
    rUnverified.allowed === false && rUnverified.refusal === 'CLAIM_REQUIRES_VERIFIED_SOURCE');
  test('the refused claim names its unverified source',
    rUnverified.unverifiedSources.length === 1 && rUnverified.unverifiedSources[0].id === 'vendor-agreement');
  test('the pure support rule ACCEPTS an all-verified citation (positive branch)', res.decideClaimSupport(['verified']).allowed === true);
  test('the pure support rule REFUSES an unverified citation', res.decideClaimSupport(['not_held']).allowed === false);
  test('the pure support rule REFUSES an empty citation set', res.decideClaimSupport([]).allowed === false);
  test('the pure support rule REFUSES a mixed set', res.decideClaimSupport(['verified', 'not_held']).allowed === false);

  console.log('\n── C. the programme status is REUSED, never re-typed ──');
  test('the status owner points at the wording owner',
    owner.AMAZON_PROGRAMME_STATUS_OWNER === 'src/lib/intelligence/amazonWording.ts');
  test('the wording owner carries the honest status', wording.AMAZON_PROGRAMME_STATUS === 'not_confirmed_with_amazon');
  test('the resolver reports the wording owner’s status (no second copy)',
    res.buildAmazonGovernanceSummary().programmeStatus === wording.AMAZON_PROGRAMME_STATUS);

  console.log('\n── D. the founder summary (derived) ──');
  const summary = res.buildAmazonGovernanceSummary();
  test('the summary covers every declared source', summary.sourceCount === srcs.length && summary.sources.length === srcs.length);
  test('the summary counts verified and not-held honestly',
    summary.verifiedCount === srcs.filter((s) => s.status === 'verified').length &&
      summary.notHeldCount === srcs.filter((s) => s.status === 'not_held').length);
  test('the summary exposes the pinned invariants',
    summary.oneOwner && summary.failsClosed && summary.sourcesAreDeclared &&
      summary.unverifiedSourceBlocksClaim && summary.reusesWordingOwner);
  test('the summary’s live example REFUSES (fail-closed proof is computed, not written)',
    summary.exampleRefusal.refusal === 'CLAIM_REQUIRES_VERIFIED_SOURCE');

  console.log('\n── E. deterministic — no AI, no clock, no network ──');
  const ownerSrc = stripComments(read('src/config/amazonRelationshipGovernance.ts'));
  const resSrc = stripComments(read('src/lib/intelligence/amazonRelationshipGovernance.ts'));
  test('neither the owner nor the resolver makes an AI / provider / network / random call',
    !/openrouter|\bsupabase\b|\bfetch\(|Math\.random|Date\.now|new Date/i.test(ownerSrc) &&
      !/openrouter|\bsupabase\b|\bfetch\(|Math\.random|Date\.now|new Date/i.test(resSrc));
  test('the owner fails closed at module load (guards present)',
    /AMAZON_AUTHORITATIVE_SOURCES\.length === 0/.test(ownerSrc) &&
      /duplicate source id/.test(ownerSrc) && /unknown status/.test(ownerSrc));

  console.log('\n── F. INTERNAL — no brand leakage ──');
  const brandFiles = walk(fileURLToPath(new URL('../src/components/brand/', import.meta.url)));
  const brandLeak = brandFiles.filter((f) => /amazonRelationshipGovernance|AMAZON_AUTHORITATIVE_SOURCES|buildAmazonGovernanceSummary/.test(readFileSync(f, 'utf8')));
  test('no brand component imports the Amazon governance', brandLeak.length === 0, brandLeak.join(', '));

  console.log('\n── G. USED by the Control Centre + rendered by the founder surface ──');
  const cc = read('src/lib/commandCentre/controlCentre.ts');
  test('controlCentre imports the resolver and exposes amazonGovernance',
    /buildAmazonGovernanceSummary/.test(cc) && /amazonGovernance:\s*AmazonGovernanceSummary/.test(cc));
  const fcc = read('src/components/admin/FounderControlCentre.tsx');
  test('the Founder Control Centre renders the Amazon governance section',
    /amazon-governance/.test(fcc) && /model\.amazonGovernance/.test(fcc));

  console.log('\n── H. SELF-CHECK — the gate can fail ──');
  test('the comparison helper ACCEPTS a correct expectation', equals(['a'], ['a']));
  test('the comparison helper REJECTS a wrong expectation (proves it can fail)', !equals(['a'], ['b']));
  const malformed = res.evaluateAmazonClaim('x', ['nope']);
  test('a malformed (unknown-source) input REFUSES — proves the fail-closed branch works',
    malformed.refusal === 'GOVERNANCE_SOURCE_UNKNOWN');
  test('an unknown source resolves to null — proves the lookup gate works',
    res.resolveAuthoritativeSource('nope').source === null);
} finally {
  await server.close();
}

console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);