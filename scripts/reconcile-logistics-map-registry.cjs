/**
 * §LOGISTICS OPERATIONAL MAP — registry reconciliation (IDEMPOTENT).
 *
 * Adds this increment's genuinely new capabilities to the Master Matrix
 * (`requirements-registry.json`) so the five project-state sources agree.
 *
 * Idempotency: re-running is a no-op. An entry whose id already exists is left
 * untouched (evidence/date refreshed only if they changed), so running the
 * script twice cannot duplicate a row or inflate `total_entries`.
 *
 * Run: node scripts/reconcile-logistics-map-registry.cjs
 */
const fs = require('fs');
const path = 'requirements-registry.json';

const reg = JSON.parse(fs.readFileSync(path, 'utf8'));
const byId = (id) => reg.entries.find((e) => e.id === id);
/**
 * §BATCH 3 (2026-10-10) — SUPERSEDED, AND GUARDED AGAINST REGRESSION.
 *
 * This tool's rows described the INTERACTIVE OPERATIONAL MAP, which the owner
 * instructed us to REMOVE (together with the logistics Hero) from both logistics
 * surfaces. Its `evidence` strings therefore name a DELETED canvas and browser
 * tests that no longer exist, and — because the script REFRESHES a row's evidence
 * when it differs — re-running it would OVERWRITE the reconciled rows in
 * `requirements-registry.json` and re-introduce citations of deleted files.
 *
 * It is kept (history is never deleted) but REFUSES to run by default: the rows
 * it manages are now recorded as `removed` / repointed by hand, and the map's
 * ABSENCE is guarded by `scripts/validate-logistics-map.mjs` §BATCH3 (which fails
 * if the map returns).
 */
if (!process.env.ALLOW_SUPERSEDED_LOGISTICS_MAP_RECONCILE) {
  console.error(
    'reconcile-logistics-map-registry.cjs — SUPERSEDED by §BATCH 3 (2026-10-10): the operational map was removed.\n' +
      'Its rows are reconciled in requirements-registry.json (status "removed" / repointed) and guarded by\n' +
      'scripts/validate-logistics-map.mjs §BATCH3. Re-running would re-introduce citations of deleted files.\n' +
      'Set ALLOW_SUPERSEDED_LOGISTICS_MAP_RECONCILE=1 only if you have read that and still intend to run it.'
  );
  process.exit(1);
}



const NEW = [
  {
    id: 'logistics-operational-map',
    description:
      'LOGISTICS HUB — a real interactive operational map (brand AND admin). Declared lat/lon graticule, nodes for declared origins / UK gateways / the DESTINATION FC on each purchase order (never a Mercenta hub — §P5), one indicative arc per consignment and one marker at its canonical stage progress. Pan (pointer drag), wheel zoom via a non-passive listener plus zoom in/out/reset/Fit controls, click-to-select, click-empty-to-clear, and auto-fit-once to the drawn extents. Selecting a consignment on the map and in the list is ONE shared selection state. Filters (search, lane, status, evidence) drive the drawn set AND the list together.',
    source: 'Complete Platform Redesign — Logistics Hub + operational map (2026-09-21 session 2)',
    status: 'built_and_tested',
    evidence:
      'src/components/shared/logistics/LogisticsMapCanvas.tsx; src/lib/logistics/operationsMap.ts; e2e/logistics-hub-map.spec.ts tests 1-5, 16 + admin tests A/B/C (15 executed tests: real Chromium render, graticule attached, leg/marker counts equal the visible set, zoom changes the rendered level, selection opens the inspector, filters change drawn set and list, search narrows both)',
    last_verified: '2026-09-21',
    superseded_by: null,
  },
  {
    id: 'logistics-operational-truth-labelling',
    description:
      'LOGISTICS HUB — LIVE VERIFIED / SIMULATED / AMBIENT derived from the authoritative provider modes via resolveProviderMode + isProviderSimulationSafe. Fail-closed: an unregistered, disabled, configuring or degraded provider is NEVER simulation; a live provider with no provider-issued identifier is AMBIENT, never a live claim. Each state carries a stated plain-language reason rendered in the inspector and a legend that states the claim it makes. Measured in this environment: 0 live verified, and the surface says so in words rather than implying live tracking.',
    source: 'Complete Platform Redesign — Logistics Hub + operational map (2026-09-21 session 2)',
    status: 'built_and_tested',
    evidence:
      'src/lib/logistics/operationsMap.ts (classifyLegTruth); src/config/logisticsGeo.ts (OPERATIONAL_TRUTH); scripts/validate-logistics-map.mjs (EXECUTED module assertions: simulation→simulated, unregistered→ambient, disabled→ambient, live+no-ref→ambient, live+ref→live_verified); e2e/logistics-hub-map.spec.ts tests 6/7 (executed: legend labels present, live count 0, every row carries a data-truth state and the state word is readable)',
    last_verified: '2026-09-21',
    superseded_by: null,
  },
  {
    id: 'logistics-freight-term-semantics',
    description:
      'LOGISTICS HUB — the two freight terms are surfaced truthfully from the canonical PO model. Freight Collect is labelled CHANNEL-ARRANGED ("Mercenta does not select this carrier") and Freight Prepaid MERCENTA-ARRANGED, with the canonical window fields named. Carrier expectations are read from validateCarrierForShipment / selectCarrierForShipment — the map never assigns a carrier, and a channel-arranged leg exposes NO Mercenta carrier expectation. The retired mandatory linear logistics chain is not reintroduced; stage progress comes from the canonical status→stage map.',
    source: 'Complete Platform Redesign — Logistics Hub + operational map (2026-09-21 session 2)',
    status: 'built_and_tested',
    evidence:
      'src/config/logisticsGeo.ts (FREIGHT_SEMANTICS); src/lib/logistics/operationsMap.ts (channelArranged / expectedCarrier); scripts/validate-logistics-map.mjs (EXECUTED: partnered carrier permitted only on collect, partnered carrier refused on prepaid, international→DHL, UK domestic→Palletline, arbitrary carrier refused, unknown origin defaults international, collect=channel-arranged); e2e/logistics-hub-map.spec.ts tests 8/9/10 (executed: both terms stated on screen, no false Mercenta ownership wording)',
    last_verified: '2026-09-21',
    superseded_by: null,
  },
  {
    id: 'logistics-map-canonical-geography',
    description:
      'LOGISTICS HUB — ONE declaration of the geography the map may plot (src/config/logisticsGeo.ts): country centroids where only a country is declared, real city/port coordinates where a city is named, and the destination fulfilment centres from DEFAULT_UK_FC_LIST (the destination itself is the FC ON THE PURCHASE ORDER — src/config/destinationFc.ts, §P5). An unresolvable place string returns null and the leg is listed as SCHEMATIC — never placed at an invented coordinate; the rendered notice states the precision actually used. A single MAP_FRAME bounds the projection so every origin the platform can produce fits, and the drawn graticule cannot disagree with it.',
    source: 'Complete Platform Redesign — Logistics Hub + operational map (2026-09-21 session 2)',
    status: 'built_and_tested',
    evidence:
      'src/config/logisticsGeo.ts; scripts/validate-logistics-map.mjs (EXECUTED: 20 declared places resolve, city vs country-centroid precision asserted, Mercenta hub is not an Amazon FC, "Brand warehouse"/"Origin not declared"/"" all fail closed, every coordinate projects inside the frame, US west of UK / South Korea east of UK / southern hemisphere below the equator, undeclared leg is schematic not dropped); e2e/logistics-hub-map.spec.ts tests 1/2/4/12 (executed: the graticule is attached, node elements are rendered from declared coordinates, the inspector states the resolution reason and its precision, and the surface is usable with no horizontal overflow at 1440/1280/1024/390)',
    last_verified: '2026-09-21',
    superseded_by: null,
  },
  {
    id: 'logistics-shipment-origin-placeholder-fix',
    description:
      'LOGISTICS — defect fix: domain-created shipments recorded the literal placeholders "Brand warehouse" (auto-draft after PO acknowledgment) and "Origin depot" (ASN filing). Neither is a location, so a consignment created through the real workflow could not be plotted or reported. They now record the brand DECLARED NATION via the single originForBrand derivation, and a brand with no declared nation records an explicit "Origin not declared" rather than a plausible fake.',
    source: 'Complete Platform Redesign — Logistics Hub + operational map (2026-09-21 session 2)',
    status: 'built_and_tested',
    evidence:
      'src/config/logisticsGeo.ts (originForBrand); src/data/api.ts (both creation sites); scripts/validate-logistics-map.mjs (EXECUTED: originForBrand returns a resolvable origin for a declared nation and an explicit not-declared origin otherwise, and neither retired placeholder can be produced); e2e/logistics-hub-map.spec.ts tests 2/4 + admin test B (executed: a consignment created through the real PO -> acknowledge -> ASN lifecycle is plotted and selectable)',
    last_verified: '2026-09-21',
    superseded_by: null,
  },
  {
    id: 'logistics-hub-map-contract-gate',
    description:
      'LOGISTICS HUB — contract gate: `npm run validate:logistics-map` bundles the REAL modules with the project own esbuild through the project own @/ alias and executes them in node, then asserts on observed behaviour (not source text): resolution, fail-closed geography, projection bounds and direction, the fail-closed truth table, the canonical carrier rules, map geometry/schematic split and stage progress. 60 assertions, 0 network calls. Two assertions were REPOINTED to the actual canonical contract after the gate proved them wrong (a Mercenta account on a collect PO is a permitted override, not a refusal) — the gate was corrected, not weakened.',
    source: 'Complete Platform Redesign — Logistics Hub + operational map (2026-09-21 session 2)',
    status: 'built_and_tested',
    evidence:
      'scripts/validate-logistics-map.mjs (LOGISTICS_MAP_VALIDATION_PASS, 60 assertions, 0 network calls); package.json validate:logistics-map; e2e/logistics-hub-map.spec.ts (15 executed tests)',
    last_verified: '2026-09-21',
    superseded_by: null,
  },
  {
    id: 'logistics-hub-workspace-redesign',
    description:
      'LOGISTICS HUB — the brand Inbound Shipments surface rebuilt as an operations workspace on the canonical primitives (WorkspaceFrame/Header/Grid/Section, KpiGroup, ContextPanel, RecordFieldList, SegmentedControl): entity/context bar, KPI band, sticky toolbar with search + evidence + lane filters, the operational map, a filterable consignment list with per-row Waybill/Labels/Track artefacts, and an inspector rail stating stage, route, evidence reason and who arranges carriage. The old page (hardcoded light-mode zinc classes on a dark shell, three carrier tabs, a non-functional New Booking form) was replaced; the fake form was REMOVED rather than restyled because real booking is the canonical ASN flow on Purchase Orders. The admin Logistics Control carries the same map above its per-brand tables, driven by the same focus filter.',
    source: 'Complete Platform Redesign — Logistics Hub + operational map (2026-09-21 session 2)',
    status: 'built_and_tested',
    evidence:
      'src/components/brand/LogisticsHub.tsx; src/components/admin/LogisticsControl.tsx; e2e/logistics-hub-map.spec.ts (15 executed tests incl. artefacts open/close, Escape dismissal, responsive 1440/1280/1024/390 with no horizontal overflow, reduced motion disabling the ambient drift, tenant isolation, no page errors, no external calls)',
    last_verified: '2026-09-21',
    superseded_by: null,
  },
];

let added = 0;
let refreshed = 0;
for (const entry of NEW) {
  const existing = byId(entry.id);
  if (existing) {
    if (existing.evidence !== entry.evidence || existing.last_verified !== entry.last_verified) {
      existing.evidence = entry.evidence;
      existing.last_verified = entry.last_verified;
      refreshed += 1;
    }
    continue;
  }
  reg.entries.push(entry);
  added += 1;
}

/**
 * §DISCOVERED ROW CLOSURE — `discovered-logistics-map-engine`.
 *
 * That row was raised when the Logistics Map Engine genuinely did not exist
 * ("does not exist", grep-confirmed). The engine NOW exists and is verified, so
 * leaving the row as written would be completed work falsely listed as
 * remaining (project-state contract). The row is NOT deleted: its status and
 * description are corrected to record what actually remains — the licensed
 * external flight/vessel tracking provider, which is still not available.
 */
const mapEngineRow = byId('discovered-logistics-map-engine');
if (mapEngineRow) {
  mapEngineRow.description =
    'CLOSED IN PART 2026-09-21 — the Logistics Map Engine NOW EXISTS and is browser-verified: ' +
    'an interactive operational map with declared coordinates, clickable markers, and a truthful ' +
    'LIVE VERIFIED / SIMULATED / AMBIENT distinction (see logistics-operational-map). What remains ' +
    'outstanding is the LICENSED EXTERNAL tracking provider for live flight/vessel positions: no such ' +
    'provider is licensed or activated, so the map plots declared consignment coordinates and states ' +
    'plainly that 0 legs are live-verified. No availability of live third-party tracking may be claimed.';
  mapEngineRow.status = 'deferred';
  mapEngineRow.superseded_by = 'logistics-operational-map';
  mapEngineRow.last_verified = '2026-09-21';
  mapEngineRow.evidence =
    'src/components/shared/logistics/LogisticsMapCanvas.tsx; src/lib/logistics/operationsMap.ts; ' +
    'e2e/logistics-hub-map.spec.ts (15 executed tests); scripts/validate-logistics-map.mjs (60 executed assertions)';
}

reg._meta.last_updated = '2026-09-21';
reg._meta.total_entries = reg.entries.length;
reg._meta.logistics_operational_map_increment = {
  increment: 'Complete Platform Redesign — Logistics Hub + operational map (2026-09-21 session 2)',
  added: NEW.map((e) => e.id),
  note:
    'The Logistics Hub had no operational map, no truth labelling and no canonical geography before this increment, and its booking form was non-functional. These rows record the map, the truth labelling, the freight-term semantics, the canonical geography, the shipment-origin placeholder fix, the executed contract gate and the workspace redesign. This script is idempotent: re-running adds nothing and duplicates nothing.',
};

fs.writeFileSync(path, JSON.stringify(reg, null, 2) + '\n');
console.log(`entries now ${reg.entries.length} (added ${added}, refreshed ${refreshed})`);
