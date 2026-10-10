#!/usr/bin/env node
/**
 * §LOGISTICS HUB — OPERATIONAL MAP CONTRACT VALIDATOR.
 *
 * The browser suite proves the map RENDERS and INTERACTS. This validator proves
 * the parts a browser test cannot reach cheaply — and it EXECUTES the real
 * modules (bundled with the project's own esbuild, through the project's own
 * `@/` alias) rather than grepping source text. A source-text assertion would
 * pass even if the arithmetic were wrong.
 *
 * Asserted behaviour:
 *   1  every declared country/city resolves to a real coordinate
 *   2  an UNDECLARED location fails closed (null), never guessed
 *   3  the projection maps every resolvable origin INSIDE the declared frame
 *   4  truth classification is fail-closed:
 *        simulation                 → simulated
 *        not_registered / unknown   → ambient  (NEVER simulated)
 *        live + provider reference  → live_verified
 *        live, no provider reference→ ambient  (never a live claim)
 *   5  a Freight Collect PO permits ONLY the partnered carrier (a Mercenta
 *      carrier account on it is an attributed override, not a universal choice)
 *   6  a Freight Prepaid PO follows the lane rule (international → DHL, UK
 *      domestic → Palletline) and is not hardcoded to one carrier
 *   7  buildOperationalMap draws geometry for resolvable legs, marks
 *      unresolvable ones schematic, and never invents a coordinate
 *   8  the retired mandatory linear logistics chain is not asserted anywhere
 *   9  zero network calls
 *  10  §P5 — the Mercenta Hub is NOT a place on any route: the retired hub
 *      destination fails closed, the map can produce no hub node, and the
 *      destination of every seeded PO/shipment is the FC DECLARED ON THAT PO
 *      (never a Mercenta-chosen site) with an undeclared PO failing closed
 *  11  §BATCH 3 (2026-10-10) — the interactive map is GONE from both surfaces
 *      (ABSENCE GUARD, rule 08): the canvas component is deleted, neither
 *      surface imports/mounts it, no map testid is rendered, and the derivation
 *      the list + inspector still read is KEPT. This check FAILS if the map
 *      returns.
 *
 * NOTE (§BATCH 3): the map UI was removed, but this validator's module
 * assertions 1–10 stay LIVE because `operationsMap.ts` is still the canonical
 * derivation the consignment list and inspector read on both surfaces.
 *
 * Run: node scripts/validate-logistics-map.mjs
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let pass = 0;
let fail = 0;
const errors = [];

function check(name, ok, detail = '') {
  if (ok) {
    pass++;
    console.log(`  PASS  ${name}`);
  } else {
    fail++;
    errors.push(`${name}${detail ? ` — ${detail}` : ''}`);
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

/* ── Bundle the REAL modules and execute them ────────────────────────────── */

const ENTRY = `
import {
  resolveGeoPlace, MAP_FRAME, FREIGHT_SEMANTICS,
  OPERATIONAL_TRUTH, originForBrand, DESTINATION_NOT_DECLARED,
} from '@/config/logisticsGeo';
import { projectGeo, buildOperationalMap, classifyLegTruth } from '@/lib/logistics/operationsMap';
import { validateCarrierForShipment, selectCarrierForShipment } from '@/lib/shipping/carrierRouting';
import {
  resolveDestinationFc, destinationLabelForPo, declaredShipToParty,
  declaredDestinationLabel, fcByCode,
} from '@/config/destinationFc';
import { DEMO_PURCHASE_ORDERS, DEMO_SHIPMENTS } from '@/data/demoData';

const out = {};
const cases = [
  'United Kingdom facility', 'United States', 'Germany', 'France', 'Italy',
  'South Korea', 'Switzerland', 'Harare, Zimbabwe', 'Durban, South Africa',
  'Nairobi, Kenya', 'Lagos, Nigeria', 'Cape Town, South Africa',
  'Austin, Texas, USA', 'Munich, Germany', 'Felixstowe, UK', 'Heathrow, UK',
  'Coventry, UK', 'Doncaster (LBA1)', 'Doncaster (LBA1), DN4 5FB',
  'Mercenta UK Hub', 'Northampton, UK', DESTINATION_NOT_DECLARED,
  'Brand warehouse', 'Origin not declared', '',
];
out.resolutions = {};
for (const c of cases) {
  const r = resolveGeoPlace(c);
  out.resolutions[c] = r.place
    ? {
        id: r.place.id,
        lat: r.place.lat,
        lon: r.place.lon,
        kind: r.place.kind,
        precision: r.place.precision,
        point: projectGeo(r.place.lat, r.place.lon),
      }
    : null;
}
out.frame = MAP_FRAME;
out.freight = FREIGHT_SEMANTICS;
out.notDeclared = DESTINATION_NOT_DECLARED;
out.fc = {
  known: fcByCode('LBA1') ? fcByCode('LBA1').code : null,
  lowerCase: fcByCode('lba1') ? fcByCode('lba1').code : null,
  trimmed: fcByCode('  LBA1  ') ? fcByCode('  LBA1  ').code : null,
  unknown: fcByCode('ZZ99'),
  blank: fcByCode('   '),
};
out.destination = {
  full: resolveDestinationFc({ partyId: 'LBA1', name: 'Doncaster (LBA1)', city: 'Doncaster', postcode: 'DN4 5FB' }),
  directoryOnly: resolveDestinationFc({ partyId: 'lba1' }),
  unknownCode: resolveDestinationFc({ partyId: 'ZZ99' }),
  emptyParty: resolveDestinationFc({ partyId: '   ' }),
  noDeclaration: resolveDestinationFc(null),
  declaredLabel: declaredDestinationLabel(0),
  labelForDeclaredPo: destinationLabelForPo({ shipToParty: declaredShipToParty(0) }),
  labelForUndeclaredPo: destinationLabelForPo({}),
  labelForNullPo: destinationLabelForPo(null),
};
out.seed = {
  poCount: DEMO_PURCHASE_ORDERS.length,
  posDeclaringDestination: DEMO_PURCHASE_ORDERS.filter((p) => !!(p.shipToParty && p.shipToParty.partyId)).length,
  allResolveToAFcCity: DEMO_PURCHASE_ORDERS.every((p) => {
    const r = resolveDestinationFc(p.shipToParty);
    return !!r && !!r.place && r.place.kind === 'amazon_fc';
  }),
  distinctFcs: [...new Set(DEMO_PURCHASE_ORDERS.map((p) => (p.shipToParty && p.shipToParty.partyId) || ''))].length,
  shipmentCount: DEMO_SHIPMENTS.length,
  shipmentsMatchTheirPo: DEMO_SHIPMENTS.every((s) => {
    const po = DEMO_PURCHASE_ORDERS.find((p) => p.poNumber === s.poNumber);
    return !!po && destinationLabelForPo(po) === s.destination;
  }),
  hubDestinations: DEMO_SHIPMENTS.filter((s) => /mercenta/i.test(s.destination)).length,
  sample: DEMO_SHIPMENTS.slice(0, 3).map((s) => s.destination),
};
out.truth = OPERATIONAL_TRUTH;
out.originForBrand = {
  uk: originForBrand({ nation: 'United Kingdom' }),
  none: originForBrand(null),
  blank: originForBrand({ nation: '   ' }),
};
const modes = { dhl: 'simulation', palletline: 'simulation' };
out.truthCases = {
  simulation: classifyLegTruth({ providerModes: modes, carrier: 'dhl', providerReference: 'MOCK-1' }),
  unregistered: classifyLegTruth({ providerModes: {}, carrier: 'fedex', providerReference: 'X' }),
  liveNoRef: classifyLegTruth({ providerModes: { dhl: 'live' }, carrier: 'dhl', providerReference: null }),
  liveWithRef: classifyLegTruth({ providerModes: { dhl: 'live' }, carrier: 'dhl', providerReference: 'DHL-REAL-1' }),
  disabled: classifyLegTruth({ providerModes: { dhl: 'disabled' }, carrier: 'dhl', providerReference: 'X' }),
};
out.carrier = {
  collectPartnered: validateCarrierForShipment({ carrier: 'amazon_partner', brandNation: 'United States', freightTerm: 'collect' }),
  collectMercenta: validateCarrierForShipment({ carrier: 'dhl', brandNation: 'United States', freightTerm: 'collect' }),
  partneredOnPrepaid: validateCarrierForShipment({ carrier: 'amazon_partner', brandNation: 'United States', freightTerm: 'prepaid' }),
  prepaidIntl: validateCarrierForShipment({ carrier: 'dhl', brandNation: 'United States', freightTerm: 'prepaid' }),
  prepaidUk: validateCarrierForShipment({ carrier: 'palletline', brandNation: 'United Kingdom', freightTerm: 'prepaid' }),
  prepaidIntlWrong: validateCarrierForShipment({ carrier: 'palletline', brandNation: 'United States', freightTerm: 'prepaid' }),
  unknownCarrier: validateCarrierForShipment({ carrier: 'acme_van', brandNation: 'Germany' }),
  laneIntl: selectCarrierForShipment({ brandNation: 'Germany' }),
  laneUk: selectCarrierForShipment({ brandNation: 'United Kingdom' }),
  laneUnknown: selectCarrierForShipment({}),
};
out.map = buildOperationalMap([
  { id: 's1', reference: 'REF-1', title: 'US to UK', carrier: 'dhl', status: 'sea_transit', origin: 'United States', destination: declaredDestinationLabel(0), value: 1000, providerModes: modes },
  { id: 's2', reference: 'REF-2', title: 'Undeclared', carrier: 'dhl', status: 'factory_intake', origin: 'Brand warehouse', destination: declaredDestinationLabel(1), providerModes: modes },
  { id: 's3', reference: 'REF-3', title: 'UK domestic', carrier: 'palletline', status: 'live_amazon', origin: 'United Kingdom facility', destination: declaredDestinationLabel(2), providerModes: modes },
]);
out.mapSummary = {
  legs: out.map.legs.length,
  mapped: out.map.mapped.length,
  schematic: out.map.schematic.length,
  nodeCount: out.map.nodes.length,
  kinds: [...new Set(out.map.nodes.map((n) => n.kind))].sort(),
  truthCounts: out.map.truthCounts,
  firstGeometry: out.map.legs[0].geometry,
  firstProgress: out.map.legs[0].progress,
  schematicId: out.map.schematic[0] ? out.map.schematic[0].id : null,
};
console.log('__RESULT__' + JSON.stringify(out));
`;

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mercenta-logistics-'));
const entryPath = path.join(tmpDir, 'entry.ts');
const outPath = path.join(tmpDir, 'bundle.mjs');
fs.writeFileSync(entryPath, ENTRY, 'utf8');

let result;
try {
  execFileSync(
    path.join(ROOT, 'node_modules/.bin/esbuild'),
    [
      entryPath,
      '--bundle',
      '--format=esm',
      '--platform=node',
      `--alias:@=${path.join(ROOT, 'src')}`,
      '--define:import.meta.env={}',
      `--outfile=${outPath}`,
      '--log-level=error',
    ],
    { cwd: ROOT, stdio: ['ignore', 'inherit', 'inherit'] }
  );
  const stdout = execFileSync(process.execPath, [outPath], { cwd: ROOT, encoding: 'utf8' });
  result = JSON.parse(stdout.split('__RESULT__')[1]);
} catch (error) {
  console.log(`  FAIL  bundling/executing the real modules — ${String(error).slice(0, 500)}`);
  console.log('');
  console.log('LOGISTICS_MAP_VALIDATION_FAIL (0 passed, 1 failed)');
  process.exit(1);
}

const R = result.resolutions;
const F = result.frame;

/* ── 1. Resolution ───────────────────────────────────────────────────────── */
const MUST_RESOLVE = [
  'United Kingdom facility',
  'United States',
  'Germany',
  'France',
  'Italy',
  'South Korea',
  'Switzerland',
  'Harare, Zimbabwe',
  'Durban, South Africa',
  'Nairobi, Kenya',
  'Lagos, Nigeria',
  'Cape Town, South Africa',
  'Austin, Texas, USA',
  'Munich, Germany',
  'Felixstowe, UK',
  'Heathrow, UK',
  'Coventry, UK',
  'Doncaster (LBA1)',
  'Doncaster (LBA1), DN4 5FB',
];
for (const c of MUST_RESOLVE) {
  check(`resolve: "${c}" resolves to a coordinate`, Boolean(R[c]), R[c] ? '' : 'returned null');
}
check(
  'resolve: named cities carry CITY precision',
  R['Harare, Zimbabwe']?.precision === 'city' && R['Munich, Germany']?.precision === 'city'
);
check(
  'resolve: a country-only origin is honest about being a COUNTRY CENTROID',
  R['United States']?.precision === 'country_centroid' &&
    R['Germany']?.precision === 'country_centroid'
);
/**
 * §P5 — REPOINTED. This assertion previously required `'Mercenta UK Hub'` to
 * resolve to a `mercenta_hub` node — the old contract, in which a Mercenta-owned
 * site was the destination of every consignment. The Founder decision removes the
 * hub as a destination (matrix `D09-13`, register `AV-026`/`AV-027`, decision
 * `T-4`), so the destination a PO actually declares is what must resolve, and no
 * hub node kind may exist.
 */
check(
  '§P5: the destination string a PO declares resolves to its FC city node',
  R['Doncaster (LBA1), DN4 5FB']?.kind === 'amazon_fc'
);
check(
  'resolve: an Amazon FC city resolves to an amazon_fc node',
  R['Doncaster (LBA1)']?.kind === 'amazon_fc'
);

/* ── 2. Fail closed ─────────────────────────────────────────────────────── */
for (const c of ['Brand warehouse', 'Origin not declared', '']) {
  check(`fail-closed: "${c}" does NOT resolve to an invented coordinate`, R[c] === null);
}
/**
 * §P5 — REPOINTED (old contract recorded inline): this file used to assert that
 * `'Mercenta UK Hub'` resolved to a hub node and that `'Northampton, UK'` — the
 * hub's own city — was a plotable place. Both are now REMOVED as route places, so
 * both must fail closed: nothing can put a Mercenta-owned site back onto a
 * consignment's route, and an undeclared destination cannot be plotted either.
 */
for (const c of ['Mercenta UK Hub', 'Northampton, UK', result.notDeclared]) {
  check(`§P5: "${c}" is NOT a place on any route (fails closed)`, R[c] === null);
}
check(
  'originForBrand: a declared nation produces a resolvable origin',
  result.originForBrand.uk === 'United Kingdom facility'
);
check(
  'originForBrand: no declared nation produces an explicit not-declared origin',
  result.originForBrand.none === 'Origin not declared' &&
    result.originForBrand.blank === 'Origin not declared'
);
check(
  'originForBrand: the retired placeholders are gone',
  !Object.values(result.originForBrand).includes('Brand warehouse') &&
    !Object.values(result.originForBrand).includes('Origin depot')
);

/* ── 3. Projection inside the frame ─────────────────────────────────────── */
const outOfFrame = Object.entries(R).filter(
  ([, v]) =>
    v && (v.point.x < 0 || v.point.x > F.viewBoxWidth || v.point.y < 0 || v.point.y > F.viewBoxHeight)
);
check(
  'projection: every resolved coordinate lands INSIDE the declared frame',
  outOfFrame.length === 0,
  outOfFrame.map(([k]) => k).join(', ')
);
check(
  'projection: a US origin sits WEST of a UK destination (real geography)',
  R['United States'].point.x < R['Doncaster (LBA1), DN4 5FB'].point.x
);
check(
  'projection: a South Korean origin sits EAST of a UK destination',
  R['South Korea'].point.x > R['Doncaster (LBA1), DN4 5FB'].point.x
);
check(
  'projection: a southern-hemisphere origin sits BELOW the equator',
  R['Durban, South Africa'].point.y > R['Doncaster (LBA1), DN4 5FB'].point.y
);

/* ── 4. Truth classification is fail-closed ─────────────────────────────── */
const T = result.truthCases;
check('truth: simulation mode → simulated', T.simulation.truth === 'simulated', T.simulation.truth);
check(
  'truth: an UNREGISTERED provider is NEVER simulated (ambient)',
  T.unregistered.truth === 'ambient',
  T.unregistered.truth
);
check(
  'truth: a DISABLED provider is never simulated (ambient)',
  T.disabled.truth === 'ambient',
  T.disabled.truth
);
check(
  'truth: live WITHOUT a provider reference is ambient, never a live claim',
  T.liveNoRef.truth === 'ambient',
  T.liveNoRef.truth
);
check(
  'truth: live WITH a provider reference is live_verified',
  T.liveWithRef.truth === 'live_verified',
  T.liveWithRef.truth
);
check(
  'truth: every state states WHY in plain language',
  Object.values(T).every((t) => typeof t.reason === 'string' && t.reason.length > 40)
);
check(
  'truth: the three states are declared with distinct labels and tones',
  result.truth.live_verified.short === 'LIVE' &&
    result.truth.simulated.short === 'SIM' &&
    result.truth.ambient.short === 'AMBIENT'
);

/* ── 5/6. Carrier semantics ─────────────────────────────────────────────── */
const C = result.carrier;
check(
  'collect: the partnered carrier is permitted ONLY on a collect PO',
  C.collectPartnered.ok === true && C.collectPartnered.amazonArranged === true
);
check(
  'collect: the partnered carrier is REFUSED when the PO is NOT collect',
  C.partneredOnPrepaid.ok === false,
  JSON.stringify(C.partneredOnPrepaid)
);
/**
 * REPOINTED (§Canonical business model §11): a Mercenta carrier account on a
 * collect PO is NOT refused — the canonical rule explicitly permits either of
 * Mercenta's own accounts as an admin override, and refuses only carriers that
 * are not Mercenta accounts. This assertion encodes the real contract.
 */
check(
  'collect: a Mercenta account on a collect PO is a permitted override, not a refusal',
  C.collectMercenta.ok === true && C.collectMercenta.expected === 'dhl',
  JSON.stringify(C.collectMercenta)
);
check(
  'prepaid: international lane uses DHL',
  C.prepaidIntl.ok === true && C.laneIntl.carrier === 'dhl'
);
check(
  'prepaid: UK domestic lane uses Palletline',
  C.prepaidUk.ok === true && C.laneUk.carrier === 'palletline'
);
check(
  'prepaid: the OTHER Mercenta account is a permitted admin override (real contract)',
  C.prepaidIntlWrong.ok === true && C.prepaidIntlWrong.expected === 'dhl',
  JSON.stringify(C.prepaidIntlWrong)
);
check(
  'carrier: an arbitrary carrier is REFUSED',
  C.unknownCarrier.ok === false && C.unknownCarrier.error.includes('not a Mercenta carrier account')
);
check(
  'carrier: an unknown origin defaults to the INTERNATIONAL lane (conservative)',
  C.laneUnknown.lane === 'international'
);
check(
  'freight: collect is declared CHANNEL-ARRANGED and prepaid is NOT',
  result.freight.collect.channelArranged === true &&
    result.freight.prepaid.channelArranged === false
);
check(
  'freight: the two terms use the canonical PO window fields',
  result.freight.collect.windowFields === 'shipWindowStart → shipWindowEnd' &&
    result.freight.prepaid.windowFields === 'deliveryWindowStart → deliveryWindowEnd'
);

/* ── 7. Map geometry ────────────────────────────────────────────────────── */
const M = result.mapSummary;
check('map: three legs in, three legs out', M.legs === 3, String(M.legs));
check('map: two legs are plotted', M.mapped === 2, String(M.mapped));
check(
  'map: the undeclared leg is SCHEMATIC, not dropped and not guessed',
  M.schematic === 1 && M.schematicId === 's2',
  `${M.schematic}/${M.schematicId}`
);
check('map: nodes are derived from declared places only', M.nodeCount >= 3, String(M.nodeCount));
/**
 * §P5 — the map's node vocabulary contains NO hub kind: the destination node of
 * a consignment is its destination FC (`amazon_fc`), because the destination is
 * the FC on the PO. A hub node could only come back by re-declaring the hub.
 */
check(
  '§P5: the map produces amazon_fc destination nodes and NO mercenta_hub node',
  M.kinds.includes('amazon_fc') && !M.kinds.includes('mercenta_hub'),
  M.kinds.join(', ')
);
check(
  'map: the plotted US→UK leg has real geometry with a marker on the arc',
  Boolean(M.firstGeometry) &&
    M.firstGeometry.from.x < M.firstGeometry.to.x &&
    M.firstGeometry.marker.x >= M.firstGeometry.from.x &&
    M.firstGeometry.marker.x <= M.firstGeometry.to.x
);
check(
  'map: progress follows the canonical stage (sea_transit → international_forwarding)',
  M.firstProgress > 0.3 && M.firstProgress < 0.6,
  String(M.firstProgress)
);
check(
  'map: truth counts match the input provenance (all simulation here)',
  M.truthCounts.simulated === 3 && M.truthCounts.live_verified === 0,
  JSON.stringify(M.truthCounts)
);

/* ── 8. Retired chain must not return ───────────────────────────────────── */
const HUB_SRC = fs.readFileSync(path.join(ROOT, 'src/components/brand/LogisticsHub.tsx'), 'utf8');
const MAP_MODULE = fs.readFileSync(path.join(ROOT, 'src/lib/logistics/operationsMap.ts'), 'utf8');
check(
  'chain: the retired MANDATORY linear logistics chain is not asserted in the hub',
  !/mandatory[\s\S]{0,120}factory_intake/i.test(HUB_SRC)
);
check(
  'chain: stage progression comes from the canonical status → stage map',
  MAP_MODULE.includes('STAGE_BY_STATUS')
);

/* ── 10. §P5 — the destination FC on the PO (the hub is not a place) ─────── */
const D = result.destination;
const S = result.seed;
check(
  '§P5: an FC code resolves through the canonical directory (case/space tolerant)',
  result.fc.known === 'LBA1' && result.fc.lowerCase === 'LBA1' && result.fc.trimmed === 'LBA1',
  JSON.stringify(result.fc)
);
check(
  '§P5: an UNKNOWN or blank FC code resolves to NOTHING (never a guessed centre)',
  result.fc.unknown === null && result.fc.blank === null
);
check(
  "§P5: the PO's OWN declaration wins (the channel is authoritative — AV-017)",
  D.full.partyId === 'LBA1' &&
    D.full.name === 'Doncaster (LBA1)' &&
    D.full.city === 'Doncaster' &&
    D.full.place?.kind === 'amazon_fc' &&
    D.full.label === 'Doncaster (LBA1), DN4 5FB',
  JSON.stringify(D.full)
);
check(
  '§P5: a PO that names only the code is completed from the canonical directory',
  D.directoryOnly.partyId === 'LBA1' &&
    D.directoryOnly.city === 'Doncaster' &&
    D.directoryOnly.place?.kind === 'amazon_fc'
);
check(
  '§P5: an FC code this repository does not carry is still NAMED, but never plotted',
  D.unknownCode.partyId === 'ZZ99' &&
    D.unknownCode.place === null &&
    D.unknownCode.label.includes('ZZ99'),
  JSON.stringify(D.unknownCode)
);
check(
  '§P5: a PO that declares NO destination resolves to the explicit not-declared string',
  D.emptyParty === null &&
    D.noDeclaration === null &&
    D.labelForUndeclaredPo === result.notDeclared &&
    D.labelForNullPo === result.notDeclared
);
check(
  '§P5: a declared destination label is exactly what the domain records',
  D.labelForDeclaredPo === D.declaredLabel && /LBA1/.test(D.declaredLabel),
  D.labelForDeclaredPo
);
check(
  '§P5: every seeded PO declares a destination that resolves to a real FC city',
  S.poCount > 0 && S.posDeclaringDestination === S.poCount && S.allResolveToAFcCity,
  `${S.posDeclaringDestination}/${S.poCount}`
);
check('§P5: the seed genuinely spans several destination FCs', S.distinctFcs > 1, String(S.distinctFcs));
check(
  "§P5: every seeded consignment carries ITS PO's declared destination",
  S.shipmentCount > 0 && S.shipmentsMatchTheirPo,
  `${S.shipmentCount} consignments`
);
check(
  '§P5: NO seeded consignment is destined for a Mercenta site',
  S.hubDestinations === 0,
  S.sample.join(' | ')
);

/* ── 11. §BATCH 3 (2026-10-10) — THE INTERACTIVE MAP IS GONE (ABSENCE GUARD) ──
 *
 * The owner instructed the operational map's removal from BOTH logistics
 * surfaces. Rule 08 (removal coherence) requires this check — which used to
 * assert the map RENDERED — to become an ABSENCE guard: it must now prove the
 * map is GONE, and it must FAIL if the map is ever re-introduced.
 *
 * The DERIVATION is deliberately NOT removed. `src/lib/logistics/operationsMap.ts`
 * is still the ONE owner the consignment list and the consignment inspector on
 * BOTH surfaces read (verified by reading both surfaces, not assumed), so the
 * module assertions above remain LIVE and meaningful. Only the map-only helpers
 * (`truthPresentation`, `isLegInMotion`) and the canvas component were removed.
 */
const HUB_SURFACE = fs.readFileSync(path.join(ROOT, 'src/components/brand/LogisticsHub.tsx'), 'utf8');
const CONTROL_SURFACE = fs.readFileSync(
  path.join(ROOT, 'src/components/admin/LogisticsControl.tsx'),
  'utf8'
);
check(
  '§BATCH3: the map canvas component is DELETED',
  !fs.existsSync(path.join(ROOT, 'src/components/shared/logistics/LogisticsMapCanvas.tsx'))
);
check(
  '§BATCH3: the brand hub does NOT import or mount the map canvas',
  !/import\s*\{[^}]*\bLogisticsMapCanvas\b/.test(HUB_SURFACE) && !/<LogisticsMapCanvas\b/.test(HUB_SURFACE)
);
check(
  '§BATCH3: the admin control does NOT import or mount the map canvas',
  !/import\s*\{[^}]*\bLogisticsMapCanvas\b/.test(CONTROL_SURFACE) &&
    !/<LogisticsMapCanvas\b/.test(CONTROL_SURFACE)
);
check(
  '§BATCH3: neither surface renders a map testid',
  !/logistics-map'|admin-logistics-map|logistics-marker-|logistics-map-evidence|logistics-map-legend/.test(
    HUB_SURFACE + CONTROL_SURFACE
  )
);
check(
  '§BATCH3: the derivation is KEPT — the list + inspector on both surfaces still read it',
  fs.existsSync(path.join(ROOT, 'src/lib/logistics/operationsMap.ts')) &&
    HUB_SURFACE.includes('buildOperationalMap(') &&
    CONTROL_SURFACE.includes('buildOperationalMap(')
);
check(
  '§BATCH3: the map-only helpers are gone from the derivation',
  !MAP_MODULE.includes('export function isLegInMotion') &&
    !MAP_MODULE.includes('export function truthPresentation')
);

/* ── Report ─────────────────────────────────────────────────────────────── */
console.log('');
if (fail === 0) {
  console.log(`LOGISTICS_MAP_VALIDATION_PASS (${pass} assertions, 0 network calls)`);
  process.exit(0);
}
console.log(`LOGISTICS_MAP_VALIDATION_FAIL (${pass} passed, ${fail} failed)`);
for (const e of errors) console.log(`  - ${e}`);
process.exit(1);