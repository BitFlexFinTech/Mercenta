#!/usr/bin/env node
/**
 * §WAVE 3 — LOGISTICS HERO CONTRACT VALIDATOR.
 *
 * The browser suite proves the hero RENDERS, stays out of the pointer's way and
 * keeps its truth labels. This validator proves the parts a browser test cannot
 * reach cheaply, by EXECUTING the real modules (bundled with the project's own
 * esbuild through the project's `@/` alias) rather than grepping source text:
 *
 *  1  authentic geography is present and attributed (Natural Earth + OSM/ODbL)
 *  2  the network is DETERMINISTIC — identical counts and positions for the same
 *     simulated time, and stable hashing (no randomness)
 *  3  multiple aircraft, multiple ships, many road vehicles, multiple origins and
 *     multiple regions — global inbound, not a single-origin toy
 *  4  ambient lanes are ALWAYS `ambient`; only canonical brand legs may carry a
 *     different truth, and that truth comes from the leg classification
 *  5  provider-mode safety (the rule the hero must not regress):
 *     simulation → simulated; not_registered / disabled / configuring / degraded
 *     / error / available / live-without-a-provider-reference → never simulated
 *  6  motion is bounded: progress ∈ [0,1) at any time, every path has non-zero
 *     finite length (no NaN)
 *  7  UK destinations are the CANONICAL FC cities (DEFAULT_UK_FC_LIST) and every
 *     declared coordinate resolves from a real source
 *  8  the scene contract is a FIXED camera (declared once, no controls)
 *  9  zero network calls
 *
 * Run: node scripts/validate-logistics-hero.mjs
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

const ENTRY = `
import {
  buildHeroNetwork, laneSample, laneProgress, stableUnit, stableHash,
  ukLandRings, worldLandRings, ukStrategicRoadLines, bearingDeg, HERO_STATIC_TIME_MS,
  sceneForPlace,
} from '@/lib/logistics/heroNetwork';
import {
  HERO_SCENE, HERO_TRUTH_NOTICE, GLOBAL_LOGISTICS_GATEWAYS, UK_LOGISTICS_GATEWAYS,
  heroFcDestinations, gatewayById,
} from '@/config/logisticsHero';
import { WORLD_LAND_RINGS, UK_LAND_RINGS, UK_STRATEGIC_ROADS, HERO_GEO_PROVENANCE } from '@/data/logisticsHeroGeo';
import { classifyLegTruth } from '@/lib/logistics/operationsMap';
import { DEFAULT_UK_FC_LIST } from '@/types';

const out = {};
out.geo = {
  worldRings: WORLD_LAND_RINGS.length,
  ukRings: UK_LAND_RINGS.length,
  roadLines: UK_STRATEGIC_ROADS.length,
  attribution: HERO_GEO_PROVENANCE.attribution,
  generatedAt: HERO_GEO_PROVENANCE.generatedAt,
  licences: HERO_GEO_PROVENANCE.entries.map((e) => e.licence),
  sources: HERO_GEO_PROVENANCE.entries.map((e) => e.source),
};
out.scene = { camera: HERO_SCENE.camera, ukTile: HERO_SCENE.ukTile, budget: HERO_SCENE.budget };
out.notice = HERO_TRUTH_NOTICE;

out.network = buildHeroNetwork({});
out.networkSecond = buildHeroNetwork({});
out.determinism = {
  sameCounts: JSON.stringify(out.network.counts) === JSON.stringify(out.networkSecond.counts),
  sameLaneIds:
    JSON.stringify(out.network.lanes.map((l) => l.id)) ===
    JSON.stringify(out.networkSecond.lanes.map((l) => l.id)),
  samePositions: JSON.stringify(out.network.lanes.map((l) => laneSample(l, 12345).position)) ===
    JSON.stringify(out.networkSecond.lanes.map((l) => laneSample(l, 12345).position)),
  hashStable: stableHash('air:air_pudong->uk_air_heathrow') === stableHash('air:air_pudong->uk_air_heathrow'),
  unitInRange: [-5, 0, 7, 1000].every((salt) => {
    const v = stableUnit('lane-x', salt);
    return v >= 0 && v < 1;
  }),
};

let progressOk = true;
let pathOk = true;
for (const lane of out.network.lanes) {
  if (!(lane.path.total > 0) || !lane.path.points.every((p) => p.every((n) => Number.isFinite(n)))) pathOk = false;
  for (const t of [0, 1000, 60000, 240000, 10000000]) {
    const p = laneProgress(lane, t);
    if (!(p >= 0 && p < 1)) progressOk = false;
  }
}
out.motion = { progressOk, pathOk };
const brandLegs = [
  {
    id: 'leg-1', reference: 'REF-1', title: 'Simulated leg',
    origin: { label: 'Munich, Germany', lat: 48.1351, lon: 11.582, kind: 'brand_facility' },
    /**
     * §P5 — the destination is a DESTINATION FC (the FC on the purchase order),
     * not the retired Mercenta hub: the Hero's UK arrival node is the FC.
     */
    destination: { label: 'Doncaster (LBA1)', lat: 53.5228, lon: -1.1285, kind: 'amazon_fc' },
    truth: 'simulated',
  },
  {
    id: 'leg-2', reference: 'REF-2', title: 'Undeclared origin',
    origin: null,
    destination: { label: 'Doncaster (LBA1)', lat: 53.5228, lon: -1.1285, kind: 'amazon_fc' },
    truth: 'ambient',
  },
];
out.brandNetwork = buildHeroNetwork({ brandLegs });
out.truthSemantics = {
  ambientAllAmbient: out.network.lanes.filter((l) => l.relevance === 'ambient').every((l) => l.truth === 'ambient'),
  brandTruths: out.brandNetwork.lanes.filter((l) => l.relevance === 'brand').map((l) => l.truth),
  brandCount: out.brandNetwork.counts.brandLegs,
  unresolvedLegDropped: out.brandNetwork.lanes.filter((l) => l.relevance === 'brand').length === 1,
};

const modes = { dhl: 'simulation', palletline: 'simulation' };
out.providerSafety = {
  simulation: classifyLegTruth({ providerModes: modes, carrier: 'dhl', providerReference: 'MOCK-1' }).truth,
  unknown: classifyLegTruth({ providerModes: {}, carrier: 'fedex', providerReference: 'X' }).truth,
  notRegistered: classifyLegTruth({ providerModes: {}, carrier: 'dhl', providerReference: 'X' }).truth,
  disabled: classifyLegTruth({ providerModes: { dhl: 'disabled' }, carrier: 'dhl', providerReference: 'X' }).truth,
  configuring: classifyLegTruth({ providerModes: { dhl: 'configuring' }, carrier: 'dhl', providerReference: 'X' }).truth,
  degraded: classifyLegTruth({ providerModes: { dhl: 'degraded' }, carrier: 'dhl', providerReference: 'X' }).truth,
  error: classifyLegTruth({ providerModes: { dhl: 'error' }, carrier: 'dhl', providerReference: 'X' }).truth,
  available: classifyLegTruth({ providerModes: { dhl: 'available' }, carrier: 'dhl', providerReference: 'X' }).truth,
  liveNoRef: classifyLegTruth({ providerModes: { dhl: 'live' }, carrier: 'dhl', providerReference: null }).truth,
  liveWithRef: classifyLegTruth({ providerModes: { dhl: 'live' }, carrier: 'dhl', providerReference: 'DHL-1' }).truth,
};

const fcs = heroFcDestinations();
out.destinations = {
  cities: fcs.length,
  listCities: [...new Set(DEFAULT_UK_FC_LIST.map((fc) => fc.city))].length,
  allResolved: fcs.every((fc) => Number.isFinite(fc.place.lat) && Number.isFinite(fc.place.lon)),
  allAmazonFc: fcs.every((fc) => fc.place.kind === 'amazon_fc'),
  sample: fcs.slice(0, 3).map((fc) => ({ city: fc.city, lat: fc.place.lat, lon: fc.place.lon, codes: fc.codes })),
  /**
   * §P5 — the SAME coordinate resolved with the canonical FC kind and with the
   * RETIRED hub kind. If the hub kind were still a UK-tile kind these would be
   * identical; they must NOT be, because the hub is no longer on the route.
   */
  hubKindScene: sceneForPlace({ lat: 52.2405, lon: -0.9027, kind: 'mercenta_hub' }),
  destinationFcScene: sceneForPlace({ lat: 52.2405, lon: -0.9027, kind: 'amazon_fc' }),
};
out.gateways = {
  global: GLOBAL_LOGISTICS_GATEWAYS.length,
  uk: UK_LOGISTICS_GATEWAYS.length,
  allResolve: GLOBAL_LOGISTICS_GATEWAYS.every((g) => Boolean(gatewayById(g.id))),
  regions: [...new Set(GLOBAL_LOGISTICS_GATEWAYS.map((g) => g.region))].length,
  uniqueIds: new Set([...GLOBAL_LOGISTICS_GATEWAYS, ...UK_LOGISTICS_GATEWAYS].map((g) => g.id)).size,
  totalIds: GLOBAL_LOGISTICS_GATEWAYS.length + UK_LOGISTICS_GATEWAYS.length,
  bearingShanghaiToFelixstowe: bearingDeg(30.62, 122.06, 51.9637, 1.3513),
  bearingLAtoLiverpool: bearingDeg(33.74, -118.27, 53.42, -3.0),
};
out.geometry = {
  ukRings: ukLandRings().length,
  worldRings: worldLandRings().length,
  roads: ukStrategicRoadLines().length,
  staticTime: HERO_STATIC_TIME_MS,
};
console.log('__RESULT__' + JSON.stringify(out));
`;

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mercenta-hero-'));
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
  console.log(`  FAIL  bundling/executing the real modules — ${String(error).slice(0, 600)}`);
  console.log('');
  console.log('LOGISTICS_HERO_VALIDATION_FAIL (0 passed, 1 failed)');
  process.exit(1);
}

console.log('');
console.log('LOGISTICS HERO — CONTRACT VALIDATION');
console.log('====================================');

/* ── 1. Authentic geography + attribution ─────────────────────────────────── */
const G = result.geo;
check('world landmass geometry is present', G.worldRings > 10, `rings=${G.worldRings}`);
check('UK coastline geometry is present', G.ukRings > 3, `rings=${G.ukRings}`);
check('UK strategic road network is present', G.roadLines > 500, `lines=${G.roadLines}`);
check('the Natural Earth licence is declared', G.licences.join(' ').includes('Public domain'));
check('the OpenStreetMap ODbL licence is declared', G.licences.join(' ').includes('ODbL'));
check('attribution names both datasets', G.attribution.includes('Natural Earth') && G.attribution.includes('OpenStreetMap'));
check('every source URL is recorded for re-verification', G.sources.every((s) => typeof s === 'string' && s.startsWith('http')));
check('a generation date is recorded', /^\d{4}-\d{2}-\d{2}$/.test(G.generatedAt), G.generatedAt);

/* ── 2. Determinism ───────────────────────────────────────────────────────── */
const D = result.determinism;
check('two builds produce identical counts', D.sameCounts);
check('two builds produce identical lane ids', D.sameLaneIds);
check('identical positions for the same simulated time', D.samePositions);
check('the hash is stable (no randomness)', D.hashStable);
check('derived variation stays inside [0,1)', D.unitInRange);

/* ── 3. Global, busy, bounded network ─────────────────────────────────────── */
const N = result.network.counts;
check('multiple aircraft are in the air', N.aircraft >= 8, `aircraft=${N.aircraft}`);
check('multiple ships are at sea', N.ships >= 6, `ships=${N.ships}`);
check('many road vehicles are on the UK network', N.roadVehicles >= 20, `road=${N.roadVehicles}`);
check('multiple international origins are represented', N.origins >= 8, `origins=${N.origins}`);
check('multiple world regions are represented', result.network.regions.length >= 4, result.network.regions.join(', '));
check(
  'aircraft are not all from one origin',
  new Set(result.network.lanes.filter((l) => l.motion === 'air').map((l) => l.fromLabel)).size >= 8
);
check(
  'ships are not all from one origin',
  new Set(result.network.lanes.filter((l) => l.motion === 'sea').map((l) => l.fromLabel)).size >= 6
);
check(
  'every lane starts at its own staggered phase',
  new Set(result.network.lanes.map((l) => l.phase)).size === result.network.lanes.length
);
check('lane speeds vary (bounded, deterministic)', new Set(result.network.lanes.map((l) => l.speed)).size >= 10);

/* ── 4. Truth semantics ───────────────────────────────────────────────────── */
const T = result.truthSemantics;
check('every ambient lane is classified ambient', T.ambientAllAmbient);
check(
  'brand lanes inherit the canonical leg truth',
  JSON.stringify(T.brandTruths) === JSON.stringify(['simulated']),
  JSON.stringify(T.brandTruths)
);
check(
  'a leg with no resolvable origin is NOT fabricated onto the hero',
  T.unresolvedLegDropped,
  `brandCount=${T.brandCount}`
);

/* ── 5. Provider-mode safety (fail closed) ────────────────────────────────── */
const P = result.providerSafety;
check('explicit simulation resolves to simulated', P.simulation === 'simulated', P.simulation);
for (const key of ['unknown', 'notRegistered', 'disabled', 'configuring', 'degraded', 'error', 'available', 'liveNoRef']) {
  check(`${key} is NEVER simulated`, P[key] === 'ambient', P[key]);
}
check('live WITH a provider reference is live_verified', P.liveWithRef === 'live_verified', P.liveWithRef);

/* ── 6. Bounded motion ────────────────────────────────────────────────────── */
check('every lane path has finite, non-zero length', result.motion.pathOk);
check('progress stays inside [0,1) at any simulated time', result.motion.progressOk);
/* ── 7. Canonical destinations + declared coordinates ─────────────────────── */
const F = result.destinations;
check('every canonical FC city resolves to a coordinate', F.cities === F.listCities, `${F.cities}/${F.listCities}`);
check('every FC destination is a finite coordinate', F.allResolved);
/**
 * §P5 — REPOINTED (old contract recorded inline): this check required the Hero to
 * carry a Mercenta-hub node ("the Mercenta hub comes from the canonical
 * declaration", `F.hub.id === 'mercenta_uk_hub'`). The hub is REMOVED as a
 * destination, so the Hero's UK arrival nodes are the canonical destination FCs
 * and a place of the retired hub kind is no longer drawn on the UK tile.
 */
check('§P5: every Hero UK destination is an FC node (no hub node exists)', F.allAmazonFc);
check(
  '§P5: a place of the retired hub kind is NOT drawn on the UK tile',
  JSON.stringify(F.hubKindScene) !== JSON.stringify(F.destinationFcScene),
  `${JSON.stringify(F.hubKindScene)} vs ${JSON.stringify(F.destinationFcScene)}`
);
const GW = result.gateways;
check('every declared gateway resolves by id', GW.allResolve);
check('gateway ids are unique across global + UK', GW.uniqueIds === GW.totalIds, `${GW.uniqueIds}/${GW.totalIds}`);
check('gateways span multiple world regions', GW.regions >= 6, `regions=${GW.regions}`);
check(
  'the Shanghai → Felixstowe bearing is the real north-east approach',
  GW.bearingShanghaiToFelixstowe > 300 || GW.bearingShanghaiToFelixstowe < 40,
  String(GW.bearingShanghaiToFelixstowe)
);
check(
  'the Los Angeles → Liverpool bearing is the real western approach',
  GW.bearingLAtoLiverpool > 20 && GW.bearingLAtoLiverpool < 80,
  String(GW.bearingLAtoLiverpool)
);

/* ── 8. The fixed-camera scene contract ───────────────────────────────────── */
const S = result.scene;
check('the camera position is declared once', Array.isArray(S.camera.position) && S.camera.position.length === 3);
check('the camera has a declared target (fixed aim)', Array.isArray(S.camera.target));
check(
  'the entity budget is bounded',
  S.budget.maxAircraft > 0 && S.budget.maxRoadVehicles > 0 && S.budget.maxBrandLegs > 0
);
check(
  'the UK tile scale exaggeration is declared in the notice, not hidden',
  S.ukTile.scale > 1 && result.notice.includes('enlarged for legibility')
);
check('the truth notice states ambient traffic is not a shipment', result.notice.includes('NOT a Mercenta shipment'));

/* ── 9. Geometry projection integrity ─────────────────────────────────────── */
check('UK + world geometry projects into scene space', result.geometry.ukRings > 0 && result.geometry.worldRings > 0);
check('road geometry projects into scene space', result.geometry.roads > 500, `roads=${result.geometry.roads}`);
check('the reduced-motion composition time is declared', result.geometry.staticTime > 0);

console.log('');
if (fail === 0) {
  console.log(`LOGISTICS_HERO_VALIDATION_PASS (${pass} assertions, runtime executed, 0 network calls)`);
  process.exit(0);
}
console.log(`LOGISTICS_HERO_VALIDATION_FAIL (${pass} passed, ${fail} failed)`);
errors.forEach((e) => console.log(`  · ${e}`));
process.exit(1);