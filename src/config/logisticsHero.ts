/**
 * §WAVE 3 — LOGISTICS HERO: CANONICAL NETWORK CONFIGURATION.
 *
 * WHAT THIS FILE IS
 * -----------------
 * The ONE declaration of the geography, the lane table and the scene contract
 * the cinematic Logistics Hero renders. It is deliberately separate from
 * `src/config/logisticsGeo.ts` (the OPERATIONAL map's geography) but it never
 * competes with it:
 *
 *   - UK fulfilment-centre destinations come from `DEFAULT_UK_FC_LIST`
 *     (`src/types.ts`) through `fcCityPoint()` in `logisticsGeo.ts` — the
 *     existing canonical FC coordinate owner. No second FC dataset exists.
 *   - The Mercenta UK hub comes from `MERCENTA_UK_HUB` (`logisticsGeo.ts`).
 *   - Truth states come from `OPERATIONAL_TRUTH` (`logisticsGeo.ts`).
 *
 * WHAT IS DECLARED HERE (and why that is not "inventing geography")
 * ---------------------------------------------------------------
 * `GLOBAL_LOGISTICS_GATEWAYS` lists REAL, publicly-known port and airport
 * coordinates for the international gateways the Hero animates. They are
 * declared once, with their precision and provenance, exactly as
 * `logisticsGeo.ts` declares real city coordinates. Nothing here claims a
 * Mercenta facility, a carrier relationship, a booked route or a live shipment:
 * traffic on these lanes is AMBIENT network activity and is labelled as such.
 *
 * The landmass, coastline and road geometry are NOT here — they are real
 * published datasets, generated into `src/data/logisticsHeroGeo.ts` by
 * `scripts/build-logistics-hero-geo.mjs` (Natural Earth, public domain;
 * OpenStreetMap roads, ODbL, attributed in the Hero).
 */
import { DEFAULT_UK_FC_LIST, type AmazonFulfilmentCentre } from '@/types';
import { MERCENTA_UK_HUB, fcCityPoint, type GeoPlace } from '@/config/logisticsGeo';

/* ── Scene contract ───────────────────────────────────────────────────────── */

/**
 * The scene is ONE fixed-camera composition:
 *
 *   sea plane (y = 0)      the stage the UK tile sits on
 *   UK tile   (y = lift)   authentic coastline + strategic roads + FC nodes
 *   world backdrop         authentic world silhouette, behind and above the
 *                          tile, giving the global gateway context
 *
 * The camera is DECLARED here and is never moved: the Hero is a fixed-camera,
 * non-interactive visual (no orbit, no pan, no zoom, no pointer capture), so
 * page scrolling is never intercepted.
 */
export const HERO_SCENE = {
  camera: {
    /**
     * FIXED. The framing is computed for a WIDE, SHORT hero panel (the canvas is
     * typically ~3.5:1 at desktop), so the camera sits close enough that the UK
     * tile fills the frame, and the aim is set slightly SOUTH of the tile centre
     * so the tile sits above the copy strip rather than behind it.
     */
    position: [-14, 88, 132] as [number, number, number],
    target: [-2, 2, 16] as [number, number, number],
    fov: 40,
    near: 1,
    far: 1400,
  },
  ukTile: {
    /**
     * LEGIBILITY SCALE — declared, not hidden.
     *
     * A true-scale UK would be ~6 scene units wide next to a world plane, which
     * is unreadable. The tile therefore enlarges the UK about its centroid. This
     * is a rendering scale factor on REAL coordinates: positions, bearings and
     * relative geography are unchanged, and the Hero states the exaggeration in
     * `HERO_TRUTH_NOTICE` rather than implying true scale.
     */
    scale: 12.5,
    /** Vertical lift above the sea plane, in scene units. */
    lift: 6,
    /** Thickness of the extruded landmass. */
    landDepth: 2.8,
    /** Lat/lon bounds of the tile's own projection window. */
    latMin: 49.4,
    latMax: 61.4,
    lonMin: -11.6,
    lonMax: 3.4,
  },
  backdrop: {
    width: 300,
    height: 118,
    latMin: -58,
    latMax: 84,
    lonMin: -180,
    lonMax: 180,
    position: [0, 52, -138] as [number, number, number],
    /** Tilted back so it reads as a horizon rather than a flat panel. */
    rotationX: 0.62,
  },
  /**
   * Bounded entity budgets — the animation is deliberately capped so the Hero
   * stays performant on a laptop GPU and the motion stays readable.
   */
  budget: {
    /**
     * These are ENFORCED caps, not documentation: `buildHeroNetwork` slices the
     * declared lane tables to them. They exist so the animation stays bounded
     * (and therefore performant and readable) no matter how the tables grow.
     */
    maxAircraft: 24,
    maxShips: 24,
    maxRoadVehicles: 48,
    maxBrandLegs: 24,
  },
  simulation: {
    /** Full loop length of every ambient lane, in simulated ms. */
    loopMs: 240_000,
    cruiseAltitude: 46,
    shipHeight: 0.9,
    roadVehicleHeight: 1.1,
  },
} as const;

/* ── Global gateways (real coordinates, declared once) ────────────────────── */

export type GatewayKind = 'port' | 'airport';

export interface HeroGateway {
  id: string;
  label: string;
  kind: GatewayKind;
  /** Region label used by the legend. */
  region: string;
  lat: number;
  lon: number;
}

export const GLOBAL_GATEWAY_SOURCE =
  'Publicly published coordinates of the named international port/airport. Declared once here; no Mercenta facility, carrier relationship or booked route is implied.';

export const GLOBAL_LOGISTICS_GATEWAYS: readonly HeroGateway[] = [
  /* Ports */
  { id: 'port_shanghai', label: 'Shanghai (Yangshan)', kind: 'port', region: 'East Asia', lat: 30.62, lon: 122.06 },
  { id: 'port_yantian', label: 'Shenzhen (Yantian)', kind: 'port', region: 'East Asia', lat: 22.56, lon: 114.27 },
  { id: 'port_ningbo', label: 'Ningbo–Zhoushan', kind: 'port', region: 'East Asia', lat: 29.87, lon: 121.55 },
  { id: 'port_busan', label: 'Busan', kind: 'port', region: 'East Asia', lat: 35.1, lon: 129.04 },
  { id: 'port_yokohama', label: 'Yokohama', kind: 'port', region: 'East Asia', lat: 35.45, lon: 139.66 },
  { id: 'port_singapore', label: 'Singapore', kind: 'port', region: 'South East Asia', lat: 1.26, lon: 103.84 },
  { id: 'port_nhava', label: 'Nhava Sheva (Mumbai)', kind: 'port', region: 'South Asia', lat: 18.95, lon: 72.95 },
  { id: 'port_jebel_ali', label: 'Jebel Ali (Dubai)', kind: 'port', region: 'Middle East', lat: 25.01, lon: 55.06 },
  { id: 'port_jeddah', label: 'Jeddah', kind: 'port', region: 'Middle East', lat: 21.48, lon: 39.17 },
  { id: 'port_rotterdam', label: 'Rotterdam', kind: 'port', region: 'Europe', lat: 51.95, lon: 4.14 },
  { id: 'port_hamburg', label: 'Hamburg', kind: 'port', region: 'Europe', lat: 53.55, lon: 9.99 },
  { id: 'port_antwerp', label: 'Antwerp', kind: 'port', region: 'Europe', lat: 51.26, lon: 4.4 },
  { id: 'port_piraeus', label: 'Piraeus', kind: 'port', region: 'Europe', lat: 37.94, lon: 23.62 },
  { id: 'port_valencia', label: 'Valencia', kind: 'port', region: 'Europe', lat: 39.44, lon: -0.32 },
  { id: 'port_los_angeles', label: 'Los Angeles', kind: 'port', region: 'North America', lat: 33.74, lon: -118.27 },
  { id: 'port_newark', label: 'New York / Newark', kind: 'port', region: 'North America', lat: 40.68, lon: -74.14 },
  { id: 'port_savannah', label: 'Savannah', kind: 'port', region: 'North America', lat: 32.08, lon: -81.09 },
  { id: 'port_santos', label: 'Santos', kind: 'port', region: 'South America', lat: -23.96, lon: -46.33 },
  { id: 'port_durban', label: 'Durban', kind: 'port', region: 'Africa', lat: -29.87, lon: 31.03 },
  { id: 'port_mombasa', label: 'Mombasa', kind: 'port', region: 'Africa', lat: -4.06, lon: 39.66 },
  { id: 'port_lagos', label: 'Apapa (Lagos)', kind: 'port', region: 'Africa', lat: 6.44, lon: 3.36 },
  { id: 'port_botany', label: 'Port Botany (Sydney)', kind: 'port', region: 'Oceania', lat: -33.96, lon: 151.22 },
  /* Airports */
  { id: 'air_pudong', label: 'Shanghai Pudong', kind: 'airport', region: 'East Asia', lat: 31.14, lon: 121.81 },
  { id: 'air_baoan', label: 'Shenzhen Bao’an', kind: 'airport', region: 'East Asia', lat: 22.64, lon: 113.81 },
  { id: 'air_incheon', label: 'Incheon (Seoul)', kind: 'airport', region: 'East Asia', lat: 37.46, lon: 126.44 },
  { id: 'air_narita', label: 'Tokyo Narita', kind: 'airport', region: 'East Asia', lat: 35.77, lon: 140.39 },
  { id: 'air_changi', label: 'Singapore Changi', kind: 'airport', region: 'South East Asia', lat: 1.36, lon: 103.99 },
  { id: 'air_mumbai', label: 'Mumbai', kind: 'airport', region: 'South Asia', lat: 19.09, lon: 72.87 },
  { id: 'air_delhi', label: 'Delhi', kind: 'airport', region: 'South Asia', lat: 28.56, lon: 77.1 },
  { id: 'air_dubai', label: 'Dubai', kind: 'airport', region: 'Middle East', lat: 25.25, lon: 55.36 },
  { id: 'air_doha', label: 'Doha', kind: 'airport', region: 'Middle East', lat: 25.27, lon: 51.61 },
  { id: 'air_istanbul', label: 'Istanbul', kind: 'airport', region: 'Europe', lat: 41.26, lon: 28.74 },
  { id: 'air_frankfurt', label: 'Frankfurt', kind: 'airport', region: 'Europe', lat: 50.03, lon: 8.56 },
  { id: 'air_amsterdam', label: 'Amsterdam Schiphol', kind: 'airport', region: 'Europe', lat: 52.31, lon: 4.76 },
  { id: 'air_paris', label: 'Paris Charles de Gaulle', kind: 'airport', region: 'Europe', lat: 49.01, lon: 2.55 },
  { id: 'air_jfk', label: 'New York JFK', kind: 'airport', region: 'North America', lat: 40.64, lon: -73.78 },
  { id: 'air_ord', label: 'Chicago O’Hare', kind: 'airport', region: 'North America', lat: 41.98, lon: -87.9 },
  { id: 'air_lax', label: 'Los Angeles', kind: 'airport', region: 'North America', lat: 33.94, lon: -118.41 },
  { id: 'air_atl', label: 'Atlanta', kind: 'airport', region: 'North America', lat: 33.64, lon: -84.43 },
  { id: 'air_gru', label: 'São Paulo Guarulhos', kind: 'airport', region: 'South America', lat: -23.43, lon: -46.47 },
  { id: 'air_jnb', label: 'Johannesburg', kind: 'airport', region: 'Africa', lat: -26.14, lon: 28.25 },
  { id: 'air_nbo', label: 'Nairobi', kind: 'airport', region: 'Africa', lat: -1.32, lon: 36.93 },
  { id: 'air_los', label: 'Lagos', kind: 'airport', region: 'Africa', lat: 6.58, lon: 3.32 },
  { id: 'air_sydney', label: 'Sydney', kind: 'airport', region: 'Oceania', lat: -33.94, lon: 151.18 },
] as const;

/* ── UK gateways ──────────────────────────────────────────────────────────── */

export interface UkGateway extends HeroGateway {
  place: GeoPlace;
}

const ukGateway = (
  id: string,
  label: string,
  kind: GatewayKind,
  lat: number,
  lon: number,
  source: string
): UkGateway => ({
  id,
  label,
  kind,
  region: 'UK',
  lat,
  lon,
  place: { id, label: `${label}, UK`, kind: 'uk_gateway', lat, lon, precision: 'city', source },
});

const UK_GATEWAY_SOURCE = 'Declared UK sea/air gateway — real published coordinates.';
const CANONICAL_HEATHROW_SOURCE =
  'src/config/logisticsGeo.ts → CITY_POINTS (canonical UK gateway already used by the operational map).';

export const UK_LOGISTICS_GATEWAYS: readonly UkGateway[] = [
  ukGateway('uk_port_felixstowe', 'Port of Felixstowe', 'port', 51.9637, 1.3513, UK_GATEWAY_SOURCE),
  ukGateway('uk_port_southampton', 'Port of Southampton', 'port', 50.9, -1.4, UK_GATEWAY_SOURCE),
  ukGateway('uk_port_gateway', 'London Gateway', 'port', 51.51, 0.48, UK_GATEWAY_SOURCE),
  ukGateway('uk_port_liverpool', 'Port of Liverpool', 'port', 53.42, -3.0, UK_GATEWAY_SOURCE),
  ukGateway('uk_port_immingham', 'Port of Immingham', 'port', 53.63, -0.19, UK_GATEWAY_SOURCE),
  ukGateway('uk_air_heathrow', 'London Heathrow', 'airport', 51.47, -0.4543, CANONICAL_HEATHROW_SOURCE),
  ukGateway('uk_air_east_midlands', 'East Midlands', 'airport', 52.83, -1.33, UK_GATEWAY_SOURCE),
  ukGateway('uk_air_stansted', 'London Stansted', 'airport', 51.885, 0.235, UK_GATEWAY_SOURCE),
  ukGateway('uk_air_manchester', 'Manchester', 'airport', 53.35, -2.27, UK_GATEWAY_SOURCE),
  ukGateway('uk_air_prestwick', 'Glasgow Prestwick', 'airport', 55.51, -4.59, UK_GATEWAY_SOURCE),
] as const;

export function gatewayById(id: string): HeroGateway | undefined {
  return (
    GLOBAL_LOGISTICS_GATEWAYS.find((g) => g.id === id) ??
    (UK_LOGISTICS_GATEWAYS as readonly HeroGateway[]).find((g) => g.id === id)
  );
}

/* ── UK destinations (canonical FC list — no second dataset) ──────────────── */

export interface HeroFcDestination {
  /** The canonical FC city (one entry per city, not per FC code). */
  city: string;
  /** The FC codes that sit in that city, from DEFAULT_UK_FC_LIST. */
  codes: string[];
  place: GeoPlace;
}

/**
 * Derive the Hero's UK destinations from the canonical FC list. The coordinate
 * comes from `fcCityPoint()` (`logisticsGeo.ts`) — the same owner the
 * operational map uses — so the two surfaces can never disagree about where a
 * fulfilment-centre city is.
 */
export function heroFcDestinations(
  list: readonly AmazonFulfilmentCentre[] = DEFAULT_UK_FC_LIST
): HeroFcDestination[] {
  const byCity = new Map<string, string[]>();
  for (const fc of list) {
    const codes = byCity.get(fc.city) ?? [];
    codes.push(fc.code);
    byCity.set(fc.city, codes);
  }
  const out: HeroFcDestination[] = [];
  for (const [city, codes] of byCity) {
    const point = fcCityPoint(city);
    if (!point) continue;
    out.push({
      city,
      codes,
      place: {
        id: `fc_city_${city.toLowerCase().replace(/[^a-z]+/g, '_')}`,
        label: `${city} (${codes.join(', ')})`,
        kind: 'amazon_fc',
        lat: point[0],
        lon: point[1],
        precision: 'city',
        source:
          'src/types.ts → DEFAULT_UK_FC_LIST (city) + src/config/logisticsGeo.ts → FC city coordinates',
      },
    });
  }
  return out;
}

export const MERCENTA_HUB_PLACE: GeoPlace = {
  id: MERCENTA_UK_HUB.id,
  label: MERCENTA_UK_HUB.label,
  kind: 'mercenta_hub',
  lat: MERCENTA_UK_HUB.lat,
  lon: MERCENTA_UK_HUB.lon,
  precision: 'city',
  source: MERCENTA_UK_HUB.source,
};

/**
 * Honest labelling rendered under the Hero. It states what the animation IS
 * (indicative lanes between declared points on real geography), what the tile
 * scale is, and what the traffic does NOT claim.
 */
export const HERO_TRUTH_NOTICE =
  'Indicative network view on real geography. Land and coastline are Natural Earth (public domain); the UK strategic road network is © OpenStreetMap contributors (ODbL). The UK tile is enlarged for legibility — bearings and relative positions are unchanged. Lanes are indicative paths between declared gateways, not surveyed sea or air routes. Ambient traffic is network context, NOT a Mercenta shipment.';

