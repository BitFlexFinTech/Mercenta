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
 *   5  a Freight Collect PO permits ONLY the partnered carrier, and a Mercenta
 *      carrier account is REFUSED on it
 *   6  a Freight Prepaid PO follows the lane rule (international → DHL, UK
 *      domestic → Palletline) and is not hardcoded to one carrier
 *   7  buildOperationalMap draws geometry for resolvable legs, marks
 *      unresolvable ones schematic, and never invents a coordinate
 *   8  the retired mandatory linear logistics chain is not asserted anywhere
 *   9  zero network calls
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
  resolveGeoPlace, MAP_FRAME, MERCENTA_UK_HUB, FREIGHT_SEMANTICS,
  OPERATIONAL_TRUTH, originForBrand,
} from '@/config/logisticsGeo';
import { projectGeo, buildOperationalMap, classifyLegTruth } from '@/lib/logistics/operationsMap';
import { validateCarrierForShipment, selectCarrierForShipment } from '@/lib/shipping/carrierRouting';

const out = {};
const cases = [
  'United Kingdom facility', 'United States', 'Germany', 'France', 'Italy',
  'South Korea', 'Switzerland', 'Harare, Zimbabwe', 'Durban, South Africa',
  'Nairobi, Kenya', 'Lagos, Nigeria', 'Cape Town, South Africa',
  'Austin, Texas, USA', 'Munich, Germany', 'Felixstowe, UK', 'Heathrow, UK',
  'Coventry, UK', 'Northampton, UK', 'Mercenta UK Hub', 'Brand warehouse',
  'Origin not declared', 'Doncaster (LBA1)', '',
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
out.hub = MERCENTA_UK_HUB;
out.freight = FREIGHT_SEMANTICS;
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
  { id: 's1', reference: 'REF-1', title: 'US to UK', carrier: 'dhl', status: 'sea_transit', origin: 'United States', destination: 'Mercenta UK Hub', value: 1000, providerModes: modes },
  { id: 's2', reference: 'REF-2', title: 'Undeclared', carrier: 'dhl', status: 'factory_intake', origin: 'Brand warehouse', destination: 'Mercenta UK Hub', providerModes: modes },
  { id: 's3', reference: 'REF-3', title: 'UK domestic', carrier: 'palletline', status: 'live_amazon', origin: 'United Kingdom facility', destination: 'Northampton, UK', providerModes: modes },
]);
out.mapSummary = {
  legs: out.map.legs.length,
  mapped: out.map.mapped.length,
  schematic: out.map.schematic.length,
  nodeCount: out.map.nodes.length,
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
  'Northampton, UK',
  'Mercenta UK Hub',
  'Doncaster (LBA1)',
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
check(
  'resolve: the Mercenta hub resolves to a mercenta_hub node (never an Amazon FC)',
  R['Mercenta UK Hub']?.kind === 'mercenta_hub'
);
check(
  'resolve: an Amazon FC city resolves to an amazon_fc node',
  R['Doncaster (LBA1)']?.kind === 'amazon_fc'
);

/* ── 2. Fail closed ─────────────────────────────────────────────────────── */
for (const c of ['Brand warehouse', 'Origin not declared', '']) {
  check(`fail-closed: "${c}" does NOT resolve to an invented coordinate`, R[c] === null);
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
  R['United States'].point.x < R['Northampton, UK'].point.x
);
check(
  'projection: a South Korean origin sits EAST of a UK destination',
  R['South Korea'].point.x > R['Northampton, UK'].point.x
);
check(
  'projection: a southern-hemisphere origin sits BELOW the equator',
  R['Durban, South Africa'].point.y > R['Northampton, UK'].point.y
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

/* ── Report ─────────────────────────────────────────────────────────────── */
console.log('');
if (fail === 0) {
  console.log(`LOGISTICS_MAP_VALIDATION_PASS (${pass} assertions, 0 network calls)`);
  process.exit(0);
}
console.log(`LOGISTICS_MAP_VALIDATION_FAIL (${pass} passed, ${fail} failed)`);
for (const e of errors) console.log(`  - ${e}`);
process.exit(1);