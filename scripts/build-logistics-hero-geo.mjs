#!/usr/bin/env node
/**
 * §WAVE 3 — LOGISTICS HERO: AUTHENTIC GEOGRAPHY GENERATOR.
 *
 * WHY THIS SCRIPT EXISTS
 * ----------------------
 * The cinematic Logistics Hero must draw REAL geography: world landmasses, the
 * UK coastline and the UK strategic road network. Hand-drawing those shapes
 * would be inventing geography (forbidden by the no-invention rule).
 * Downloading them at RUNTIME would make a decorative layer depend on a live
 * third-party service (forbidden by the deterministic architecture).
 *
 * The resolution is this build-time step: fetch the authoritative open datasets
 * once, simplify them, and COMMIT the resulting coordinates as
 * `src/data/logisticsHeroGeo.ts`. The app then reads committed data only — zero
 * network calls at runtime, deterministic geometry, reproducible provenance.
 *
 * SOURCES AND LICENCES (checked, not assumed)
 * -------------------------------------------
 *  1. Natural Earth `ne_10m_admin_0_countries` — UK landmass (coastline).
 *     Licence: PUBLIC DOMAIN. https://www.naturalearthdata.com/about/terms-of-use/
 *  2. Natural Earth `ne_110m_land` — world landmass silhouette (backdrop).
 *     Licence: PUBLIC DOMAIN (same terms).
 *  3. OpenStreetMap via the Overpass API — UK strategic road network
 *     (`highway=motorway|trunk` in the GB admin area).
 *     Licence: ODbL 1.0 — reuse permitted WITH ATTRIBUTION. The attribution is
 *     rendered in the Hero itself (`HERO_GEO_PROVENANCE.attribution`).
 *     https://www.openstreetmap.org/copyright
 *
 * USAGE
 * -----
 *   node scripts/build-logistics-hero-geo.mjs            # use .geo-cache/, no network
 *   node scripts/build-logistics-hero-geo.mjs --fetch    # download into .geo-cache/ first
 *   node scripts/build-logistics-hero-geo.mjs --check    # verify the committed file exists
 *
 * `.geo-cache/` is gitignored: the raw multi-megabyte downloads are NOT tracked,
 * only the simplified, committed projection of them is.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = path.join(ROOT, '.geo-cache');
const OUT = path.join(ROOT, 'src', 'data', 'logisticsHeroGeo.ts');

const SOURCES = {
  countries10: {
    file: 'ne_10m_admin_0_countries.geojson',
    url: 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_countries.geojson',
    label: 'Natural Earth 1:10m Admin 0 Countries',
    licence: 'Public domain (Natural Earth)',
  },
  land110: {
    file: 'ne_110m_land.geojson',
    url: 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson',
    label: 'Natural Earth 1:110m Land',
    licence: 'Public domain (Natural Earth)',
  },
  ukRoads: {
    file: 'uk-strategic-roads-osm.json',
    label: 'OpenStreetMap UK strategic road network (motorway + trunk)',
    licence: 'ODbL 1.0 (© OpenStreetMap contributors)',
  },
};

/* ── Douglas–Peucker line simplification (the standard algorithm) ────────── */

function perpendicularDistance(point, start, end) {
  const [x, y] = point;
  const [x1, y1] = start;
  const [x2, y2] = end;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return Math.hypot(x - x1, y - y1);
  let t = ((x - x1) * dx + (y - y1) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
}

function simplify(points, tolerance) {
  if (points.length <= 2) return points;
  let maxDist = 0;
  let index = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i], points[0], points[points.length - 1]);
    if (dist > maxDist) {
      maxDist = dist;
      index = i;
    }
  }
  if (maxDist <= tolerance) return [points[0], points[points.length - 1]];
  const left = simplify(points.slice(0, index + 1), tolerance);
  const right = simplify(points.slice(index), tolerance);
  return left.slice(0, -1).concat(right);
}

const round = (value, decimals) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

/** Flatten [[lon,lat],…] into the compact [lon,lat,lon,lat,…] form the app reads. */

/* ── Extraction ──────────────────────────────────────────────────────────── */

function loadJson(file) {
  const full = path.join(CACHE, file);
  if (!fs.existsSync(full)) {
    console.error(`MISSING SOURCE: ${full}\nRun with --fetch, or place the dataset in .geo-cache/.`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(full, 'utf8'));
}

function polygonsOf(geometry) {
  if (!geometry) return [];
  return geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
}

function extractCountryRings(geojson, adminName, tolerance, decimals, minArea) {
  const feature = geojson.features.find((f) => f.properties && f.properties.ADMIN === adminName);
  if (!feature) {
    console.error(`Country "${adminName}" not found in the source dataset.`);
    process.exit(1);
  }
  const rings = [];
  for (const polygon of polygonsOf(feature.geometry)) {
    const outer = polygon[0].map(([lon, lat]) => [lon, lat]);
    if (ringArea(outer) < minArea) continue;
    const simplified = simplify(outer, tolerance);
    if (simplified.length < 4) continue;
    rings.push(flatten(simplified, decimals));
  }
  return rings.sort((a, b) => b.length - a.length);
}

function extractWorldRings(geojson, tolerance, decimals, minArea) {
  const rings = [];
  for (const feature of geojson.features) {
    for (const polygon of polygonsOf(feature.geometry)) {
      const outer = polygon[0].map(([lon, lat]) => [lon, lat]);
      if (ringArea(outer) < minArea) continue;
      const simplified = simplify(outer, tolerance);
      if (simplified.length < 4) continue;
      rings.push(flatten(simplified, decimals));
    }
  }
  return rings.sort((a, b) => b.length - a.length);
}

function extractRoadLines(overpass, tolerance, decimals, minLengthDeg) {
  const lines = [];
  for (const element of overpass.elements ?? []) {
    if (element.type !== 'way' || !Array.isArray(element.geometry)) continue;
    const points = element.geometry.map((p) => [p.lon, p.lat]);
    if (points.length < 2) continue;
    let span = 0;
    for (let i = 1; i < points.length; i++) {
      span += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
    }
    if (span < minLengthDeg) continue;
    const simplified = simplify(points, tolerance);
    if (simplified.length < 2) continue;
    lines.push(flatten(simplified, decimals));
  }
  return lines;
}

/* ── Fetching (only with --fetch) ────────────────────────────────────────── */

async function fetchFile(source) {
  const target = path.join(CACHE, source.file);
  if (fs.existsSync(target) && fs.statSync(target).size > 1000) {
    console.log(`cached  ${source.file}`);
    return;
  }
  console.log(`fetch   ${source.url}`);
  const res = await fetch(source.url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${source.url}`);
  fs.writeFileSync(target, Buffer.from(await res.arrayBuffer()));
}

async function fetchRoads() {
  const target = path.join(CACHE, SOURCES.ukRoads.file);
  if (fs.existsSync(target) && fs.statSync(target).size > 1000) {
    console.log(`cached  ${SOURCES.ukRoads.file}`);
    return;
  }
  console.log('fetch   Overpass API — UK motorway + trunk ways');
  const query =
    '[out:json][timeout:300];area["ISO3166-1"="GB"][admin_level=2]->.a;' +
    'way["highway"~"^(motorway|trunk)$"](area.a);out geom;';
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mercenta-build/1.0 (build-time geographic data extraction)',
    },
    body: new URLSearchParams({ data: query }).toString(),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} from the Overpass API`);
  fs.writeFileSync(target, Buffer.from(await res.arrayBuffer()));
}

function flatten(points, decimals) {
  const out = [];
  for (const [lon, lat] of points) out.push(round(lon, decimals), round(lat, decimals));
  return out;
}


/* ── Emission ────────────────────────────────────────────────────────────── */

const HEADER = `/**
 * §WAVE 3 — LOGISTICS HERO GEOGRAPHY (GENERATED — DO NOT EDIT BY HAND).
 *
 * Produced by \`scripts/build-logistics-hero-geo.mjs\`. Regenerate with:
 *   node scripts/build-logistics-hero-geo.mjs --fetch
 *
 * Coordinates are [lon, lat, lon, lat, …] pairs, simplified with
 * Douglas–Peucker and rounded — the raw datasets are multi-megabyte and are
 * NOT tracked (\`.geo-cache/\` is gitignored). Nothing here is hand-drawn: every
 * ring and line is a real published dataset, and the provenance block below is
 * rendered in the Hero as the attribution notice.
 *
 * LICENCES — Natural Earth data is public domain; the UK road network is
 * © OpenStreetMap contributors, ODbL 1.0, and MUST keep its attribution visible
 * wherever it is rendered.
 */

export interface GeoProvenanceEntry {
  /** What the layer draws. */
  layer: string;
  /** The dataset the coordinates come from. */
  dataset: string;
  /** The licence, stated as the licence actually requires. */
  licence: string;
  /** Source URL, for a reviewer to re-verify. */
  source: string;
}

`;

function emit({ worldRings, ukRings, roadLines }) {
  const parts = [HEADER];
  parts.push('export const HERO_GEO_PROVENANCE: { entries: GeoProvenanceEntry[]; attribution: string; generatedAt: string } = {\n');
  parts.push(`  generatedAt: ${JSON.stringify(new Date().toISOString().slice(0, 10))},\n`);
  parts.push('  entries: [\n');
  parts.push(`    {\n      layer: 'World landmass',\n      dataset: ${JSON.stringify(SOURCES.land110.label)},\n      licence: ${JSON.stringify(SOURCES.land110.licence)},\n      source: ${JSON.stringify(SOURCES.land110.url)},\n    },\n`);
  parts.push(`    {\n      layer: 'UK coastline / landmass',\n      dataset: ${JSON.stringify(SOURCES.countries10.label)},\n      licence: ${JSON.stringify(SOURCES.countries10.licence)},\n      source: ${JSON.stringify(SOURCES.countries10.url)},\n    },\n`);
  parts.push(`    {\n      layer: 'UK strategic road network (motorway + trunk)',\n      dataset: ${JSON.stringify(SOURCES.ukRoads.label)},\n      licence: ${JSON.stringify(SOURCES.ukRoads.licence)},\n      source: 'https://overpass-api.de/api/interpreter',\n    },\n`);
  parts.push('  ],\n');
  parts.push(`  attribution:\n    'Geography: Natural Earth (public domain) · UK strategic road network: © OpenStreetMap contributors (ODbL 1.0)',\n};\n\n`);

  const write = (name, doc, rings) => {
    parts.push(`/** ${doc} */\n`);
    parts.push(`export const ${name}: readonly (readonly number[])[] = [\n`);
    for (const ring of rings) parts.push(`  [${ring.join(',')}],\n`);
    parts.push('];\n\n');
  };

  write('WORLD_LAND_RINGS', 'World landmass silhouettes (equirectangular lon/lat pairs).', worldRings);
  write('UK_LAND_RINGS', 'UK landmass rings — authentic coastline, ordered largest first.', ukRings);
  write('UK_STRATEGIC_ROADS', 'UK motorway + trunk road polylines (OSM/ODbL).', roadLines);

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, parts.join(''));
  const bytes = fs.statSync(OUT).size;
  const points = (rings) => rings.reduce((sum, r) => sum + r.length / 2, 0);
  console.log(
    `wrote   ${path.relative(ROOT, OUT)} — ${(bytes / 1024).toFixed(0)} kB · ` +
      `world rings ${worldRings.length} (${points(worldRings)} pts) · ` +
      `UK rings ${ukRings.length} (${points(ukRings)} pts) · ` +
      `road lines ${roadLines.length} (${points(roadLines)} pts)`
  );
}

async function main() {
  const args = new Set(process.argv.slice(2));
  fs.mkdirSync(CACHE, { recursive: true });

  if (args.has('--fetch')) {
    await fetchFile(SOURCES.countries10);
    await fetchFile(SOURCES.land110);
    await fetchRoads();
  }

  const worldRings = extractWorldRings(loadJson(SOURCES.land110.file), 0.6, 1, 6);
  const ukRings = extractCountryRings(loadJson(SOURCES.countries10.file), 'United Kingdom', 0.01, 4, 0.02);
  /**
   * OSM splits a motorway into many short ways, so a length filter would throw
   * away most of the network: `minLengthDeg` is therefore tiny (0.002° ≈ 220 m)
   * and only exists to drop stray stubs. Legibility comes from the
   * Douglas–Peucker tolerance, not from discarding corridors.
   */
  const roadLines = extractRoadLines(loadJson(SOURCES.ukRoads.file), 0.012, 4, 0.002);

  if (args.has('--check')) {
    const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    const ok =
      current.includes('export const WORLD_LAND_RINGS') &&
      current.includes('export const UK_LAND_RINGS') &&
      current.includes('export const UK_STRATEGIC_ROADS') &&
      current.includes('HERO_GEO_PROVENANCE');
    console.log(`CHECK ${ok ? 'PASS' : 'FAIL'} — committed geometry module ${ok ? 'present' : 'incomplete'}`);
    process.exit(ok ? 0 : 1);
  }

  emit({ worldRings, ukRings, roadLines });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

/** Keep only rings worth drawing (tiny islands add cost, not legibility). */
function ringArea(ring) {
  let area = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    area += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
  }
  return Math.abs(area / 2);
}
