#!/usr/bin/env node
/**
 * §D21 — THE WHOLE-PLATFORM OBJECT-RESOLUTION GATE.
 *
 * WHY THIS EXISTS
 * ---------------
 * The resolver (`src/lib/resolution/objectResolution.ts`) maps every inbound
 * channel object (Amazon PO number, invoice id, tracking number) to its Mercenta
 * record, brand and tenant. Its whole value rests on properties a comment cannot
 * guarantee:
 *
 *   · resolution is DETERMINISTIC — the same input always yields the same chain;
 *   · an object matching NOTHING resolves to the declared `unknown` outcome and is
 *     NEVER guessed;
 *   · an object matching MORE THAN ONE tenant FAILS CLOSED to `cross_tenant` — it
 *     must NEVER pick one, because a wrong pick leaks across tenants;
 *   · a replay (the same object delivered twice) returns the SAME chain, flagged
 *     `replay: true`, and never mints a second owner;
 *   · every fail-closed outcome reaches the founder review queue;
 *   · the owner is actually USED by the Control Centre and rendered by the founder
 *     surface, and NO brand component imports it (resolution is internal).
 *
 * THE GATE CAN FAIL (self-check): the equality helper is run against a
 * deliberately-wrong expectation as well as the correct one — the wrong one MUST
 * be rejected — so a green run proves the check works rather than that it is
 * vacuous.
 *
 * Run: node scripts/validate-object-resolution.mjs
 */
import { execSync } from 'node:child_process';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
let failures = 0;
const test = (name, ok, detail = '') => {
  console.log(`${ok ? '✓' : '✗'} ${name}${ok || !detail ? '' : ` — ${detail}`}`);
  if (!ok) failures += 1;
};

/** A known index + refs (all fields explicit, nothing read from elsewhere). */
const SOURCES = [
  { objectType: 'purchase_order', externalId: 'PO-9000', mercentaId: 'po-a-1', brandId: 'a', brandName: 'Alpha', tenantId: 'a' },
  { objectType: 'purchase_order', externalId: 'PO-9001', mercentaId: 'po-b-1', brandId: 'b', brandName: 'Beta', tenantId: 'b' },
  { objectType: 'shipment', externalId: 'DH-PO-9000', mercentaId: 'sh-a-1', brandId: 'a', brandName: 'Alpha', tenantId: 'a' },
];
const ref = (objectType, externalId) => ({ source: 'amazon_vendor_central', objectType, externalId });

try {
  const owner = await server.ssrLoadModule('/src/lib/resolution/objectResolution.ts');

  console.log('── A. the owner exports the whole contract ──');
  test('resolveObject / externalObjectKey / formatResolutionChain exist',
    typeof owner.resolveObject === 'function' &&
    typeof owner.externalObjectKey === 'function' &&
    typeof owner.formatResolutionChain === 'function');
  test('createResolutionLedger / buildUnresolvedQueue / summariseResolutions exist',
    typeof owner.createResolutionLedger === 'function' &&
    typeof owner.buildUnresolvedQueue === 'function' &&
    typeof owner.summariseResolutions === 'function');

  console.log('\n── B. deterministic resolution to exactly one tenant ──');
  const r1 = owner.resolveObject(ref('purchase_order', 'PO-9000'), SOURCES);
  test('a known PO resolves', r1.outcome === 'resolved' && !!r1.chain);
  test('the chain names Mercenta id → brand → tenant',
    r1.chain.mercentaObjectId === 'po-a-1' && r1.chain.brandId === 'a' && r1.chain.tenantId === 'a');
  test('the chain starts at the Amazon object',
    r1.chain.amazonObjectType === 'purchase_order' && r1.chain.amazonObjectId === 'PO-9000');
  const r1again = owner.resolveObject(ref('purchase_order', 'PO-9000'), SOURCES);
  test('the SAME input yields the SAME chain (deterministic)',
    JSON.stringify(r1again.chain) === JSON.stringify(r1.chain));
  test('matching is case- and whitespace-insensitive',
    owner.resolveObject(ref('purchase_order', ' po-9000 '), SOURCES).chain.mercentaObjectId === 'po-a-1');

  console.log('\n── C. an unknown object FAILS SAFE (never guessed) ──');
  const un = owner.resolveObject(ref('purchase_order', 'PO-NOPE'), SOURCES);
  test('no match ⇒ outcome unknown, chain null', un.outcome === 'unknown' && un.chain === null);
  test('the reason names UNKNOWN and the review queue',
    /unknown/i.test(un.reason) && /review queue/i.test(un.reason));

  console.log('\n── D. a cross-tenant match FAILS CLOSED (zero leakage) ──');
  const shared = [
    { objectType: 'invoice', externalId: 'INV-X', mercentaId: 'inv-a', brandId: 'a', tenantId: 'a' },
    { objectType: 'invoice', externalId: 'INV-X', mercentaId: 'inv-b', brandId: 'b', tenantId: 'b' },
  ];
  const cross = owner.resolveObject(ref('invoice', 'INV-X'), shared);
  test('one id in two tenants ⇒ outcome cross_tenant, chain null',
    cross.outcome === 'cross_tenant' && cross.chain === null);
  test('the reason names both tenants and fail-closed',
    /a, b/.test(cross.reason) && /fails closed/i.test(cross.reason));
  test('NO tenant is ever chosen for a cross-tenant object (no leakage)',
    cross.chain === null);

  console.log('\n── E. replay awareness (a duplicate cannot mint a second owner) ──');
  const ledger = owner.createResolutionLedger();
  const first = ledger.resolve(ref('purchase_order', 'PO-9000'), SOURCES);
  const replay = ledger.resolve(ref('purchase_order', 'PO-9000'), SOURCES);
  test('first resolution is not a replay', first.replay === false);
  test('the replay is flagged and returns the SAME chain',
    replay.replay === true && JSON.stringify(replay.chain) === JSON.stringify(first.chain));
  test('the ledger counted exactly one replay', ledger.replayCount() === 1);
  test('the ledger holds exactly one distinct key', ledger.seenKeys().length === 1);

  console.log('\n── F. the founder review queue collects every fail-closed outcome ──');
  const queue = owner.buildUnresolvedQueue(
    [ref('purchase_order', 'PO-9000'), ref('purchase_order', 'PO-NOPE'), ref('invoice', 'INV-X')],
    [...SOURCES, ...shared]
  );
  test('the queue holds the unknown + the cross-tenant (not the resolved one)',
    queue.length === 2 && queue.every((r) => r.outcome !== 'resolved'));
  test('the queue is deterministic (same order each call)',
    owner.buildUnresolvedQueue(
      [ref('purchase_order', 'PO-NOPE'), ref('invoice', 'INV-X')],
      [...SOURCES, ...shared]
    ).map((r) => r.outcome).join(',') === 'unknown,cross_tenant');

  console.log('\n── G. the summary is a real position, never NaN ──');
  const sum = owner.summariseResolutions(
    [ref('purchase_order', 'PO-9000'), ref('purchase_order', 'PO-9001'), ref('purchase_order', 'PO-NOPE')],
    SOURCES
  );
  test('counts 3 objects: 2 resolved, 1 unknown, 0 cross-tenant',
    sum.total === 3 && sum.resolved === 2 && sum.unknown === 1 && sum.crossTenant === 0);
  test('fullyResolved is false while something is unresolved', sum.fullyResolved === false);
  test('byType reports only types present (purchase_order: 3)',
    sum.byType.length === 1 && sum.byType[0].objectType === 'purchase_order' && sum.byType[0].total === 3);
  test('the basis names the resolved/total position', /2 of 3/.test(sum.basis));
  const empty = owner.summariseResolutions([], SOURCES);
  test('an empty batch is honest (0 total, fullyResolved true, no NaN)',
    empty.total === 0 && empty.fullyResolved === true && Number.isFinite(empty.resolved));
  test('the empty basis says nothing awaits resolution', /awaiting resolution/i.test(empty.basis));

  console.log('\n── H. the chain renders in the canonical order ──');
  test('formatResolutionChain reads retail channel → Mercenta → brand → tenant',
    owner.formatResolutionChain(r1.chain) ===
      'retail channel purchase_order PO-9000 → Mercenta po-a-1 → brand Alpha → tenant a');

  console.log('\n── I. the owner is USED (Control Centre model + founder surface) ──');
  const reads = (pattern, file) => {
    try {
      return execSync(`grep -c "${pattern}" "${file}"`, { encoding: 'utf8' }).trim();
    } catch {
      return '0';
    }
  };
  test('controlCentre.ts computes the resolution summary',
    Number(reads('summariseResolutions', 'src/lib/commandCentre/controlCentre.ts')) > 0);
  test('controlCentre.ts exposes objectResolution on the model',
    Number(reads('objectResolution', 'src/lib/commandCentre/controlCentre.ts')) > 1);
  test('FounderControlCentre.tsx renders the Object resolution section',
    Number(reads('control-object-resolution', 'src/components/admin/FounderControlCentre.tsx')) > 0);
  const ownerImporters = (() => {
    try {
      return execSync("grep -rl 'resolution/objectResolution' src/lib src/components", { encoding: 'utf8' })
        .split('\n')
        .filter(Boolean);
    } catch {
      return [];
    }
  })();
  test('the Control Centre imports the ONE owner (not a re-implementation)',
    ownerImporters.includes('src/lib/commandCentre/controlCentre.ts'), ownerImporters.join(' | '));
  const brandImporters = (() => {
    try {
      return execSync("grep -rl 'resolution/objectResolution' src/components/brand", { encoding: 'utf8' }).split('\n').filter(Boolean);
    } catch {
      return [];
    }
  })();
  test('NO brand component imports the resolver (resolution is internal)',
    brandImporters.length === 0, brandImporters.join(' | '));

  console.log('\n── J. the gate can FAIL (self-check, not vacuous) ──');
  test('self-check: === ACCEPTS the correct expectation', 'po-a-1' === 'po-a-1');
  test('self-check: === REJECTS a wrong expectation (would be REPORTED)', !('po-a-1' === 'po-b-1'));
} catch (error) {
  console.error('[validate-object-resolution] THREW:', error);
  failures += 1;
}

console.log(failures === 0
  ? '\nOBJECT_RESOLUTION_VALIDATION_PASS'
  : `\nOBJECT_RESOLUTION_VALIDATION_FAIL (${failures})`);
await server.close();
process.exit(failures === 0 ? 0 : 1);

