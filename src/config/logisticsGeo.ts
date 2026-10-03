/**
 * §LOGISTICS HUB — CANONICAL GEOGRAPHIC TRUTH for the operational map.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * The operational map must place real shipments on real coordinates. Inventing
 * coordinates inside a component would violate the single-source-of-truth rule
 * AND the Amazon-truth rule ("do not invent"). This module is the ONE
 * declaration of the geography the Logistics Hub may plot.
 *
 * WHAT PRECISION IS ACTUALLY AVAILABLE (measured, not assumed)
 * ------------------------------------------------------------
 * The repository's shipment records carry place STRINGS, not coordinates:
 *   - `DemoShipment.origin`      = `${brand.nation} facility` → a COUNTRY
 *   - `DemoShipment.destination` = the DESTINATION FC ON THE PURCHASE ORDER
 *     (`src/config/destinationFc.ts` is the ONE owner of that string since P5)
 *   - `INITIAL_SHIPMENTS` (bootstrap.ts) additionally carry real CITIES
 *     (Harare, Durban, Nairobi, Lagos, Cape Town, Austin, Munich) and real UK
 *     gateways (London, Felixstowe, Heathrow, Coventry).
 *   - UK fulfilment centres are declared WITH postcodes in
 *     `src/types.ts → DEFAULT_UK_FC_LIST` — a MERCENTA-MAINTAINED convenience list,
 *     not an Amazon-published directory (register `AV-017`; §Batch 2p).
 *
 * Therefore the map plots COUNTRY-CENTROID precision for country-only origins
 * and CITY precision where a city is actually named.
 *
 * A place string that cannot be resolved is NEVER guessed: `resolveGeoPlace`
 * returns `null` and the caller must render the leg as schematic/undeclared.
 * That is the fail-closed rule, applied to geography.
 *
 * NOT DECLARED HERE (deliberately)
 * --------------------------------
 *  - No carrier rule. Carrier assignment is `src/lib/shipping/carrierRouting.ts`.
 *  - No route chain. The retired mandatory linear chain is NOT reintroduced.
 *  - **No Mercenta-owned node at all.** §P5 removed the Mercenta Hub as a
 *    destination (matrix `D09-13`, register `AV-026`/`AV-027`, decision `T-4`),
 *    so this module declares no hub coordinate and no `mercenta_hub` kind. A
 *    record that still names a Mercenta hub fails closed (null) and is drawn as
 *    a schematic leg — it is never plotted at the hub's old coordinate.
 */

export type GeoNodeKind = 'brand_facility' | 'uk_gateway' | 'amazon_fc';

/** How precise the plotted coordinate actually is. Never inflated. */
export type GeoPrecision = 'city' | 'country_centroid';

export interface GeoPlace {
  /** Stable id derived from the resolved place. */
  id: string;
  /** Human label the map and the detail panel render. */
  label: string;
  kind: GeoNodeKind;
  lat: number;
  lon: number;
  precision: GeoPrecision;
  /** Where the coordinate comes from — shown in the inspector, never hidden. */
  source: string;
}

/**
 * Country centroids. Approximate national centroids, which is the honest
 * precision level for an origin recorded only as a country name.
 */
const COUNTRY_CENTROIDS: Record<string, [number, number]> = {
  'united kingdom': [54.0, -2.0],
  'great britain': [54.0, -2.0],
  'united states': [39.83, -98.58],
  'united states of america': [39.83, -98.58],
  usa: [39.83, -98.58],
  germany: [51.16, 10.45],
  france: [46.6, 2.4],
  italy: [42.8, 12.8],
  spain: [40.46, -3.75],
  netherlands: [52.13, 5.29],
  'south korea': [36.5, 127.9],
  'korea, republic of': [36.5, 127.9],
  switzerland: [46.82, 8.23],
  zimbabwe: [-19.02, 29.15],
  'south africa': [-30.56, 22.94],
  kenya: [-0.02, 37.91],
  nigeria: [9.08, 8.68],
};

/** Real city / UK gateway coordinates. City-level precision. */
const CITY_POINTS: Record<string, { lat: number; lon: number; kind: GeoNodeKind; label: string }> = {
  // ── International origin cities named by the canonical seed ─────────────
  'harare, zimbabwe': { lat: -17.8252, lon: 31.0335, kind: 'brand_facility', label: 'Harare, Zimbabwe' },
  'durban, south africa': { lat: -29.8587, lon: 31.0218, kind: 'brand_facility', label: 'Durban, South Africa' },
  'cape town, south africa': { lat: -33.9249, lon: 18.4241, kind: 'brand_facility', label: 'Cape Town, South Africa' },
  'nairobi, kenya': { lat: -1.2863, lon: 36.8172, kind: 'brand_facility', label: 'Nairobi, Kenya' },
  'lagos, nigeria': { lat: 6.5244, lon: 3.3792, kind: 'brand_facility', label: 'Lagos, Nigeria' },
  'austin, texas, usa': { lat: 30.2672, lon: -97.7431, kind: 'brand_facility', label: 'Austin, Texas, USA' },
  'austin, texas': { lat: 30.2672, lon: -97.7431, kind: 'brand_facility', label: 'Austin, Texas, USA' },
  'munich, germany': { lat: 48.1351, lon: 11.582, kind: 'brand_facility', label: 'Munich, Germany' },
  // ── UK gateways named by the canonical seed ─────────────────────────────
  'felixstowe, uk': { lat: 51.9637, lon: 1.3513, kind: 'uk_gateway', label: 'Port of Felixstowe, UK' },
  'heathrow, uk': { lat: 51.47, lon: -0.4543, kind: 'uk_gateway', label: 'London Heathrow, UK' },
  'london, uk': { lat: 51.5074, lon: -0.1278, kind: 'uk_gateway', label: 'London, UK' },
  'coventry, uk': { lat: 52.4068, lon: -1.5197, kind: 'uk_gateway', label: 'Coventry, UK' },
};

/* §P5 — `MERCENTA_UK_HUB` DELETED.
   It declared Northampton as the destination hub and was read by the Hero, the
   Logistics Hub header and the map. The destination is now the FC on the PO
   (`src/config/destinationFc.ts`), so no Mercenta-owned node exists here at all.
   `src/config/customs.ts → MERCENTA_REGISTERED_ADDRESS` is untouched: it is the
   company's registered address on customs documents, not the shipment route. */

/**
 * UK fulfilment-centre CITY coordinates (Mercenta-maintained list, register
 * `AV-017`; §Batch 2p), keyed by FC city. The CITY is
 * the declared fact (`src/types.ts → DEFAULT_UK_FC_LIST`); the coordinate is
 * city-level only. Amazon destination ASSIGNMENTS themselves are not declared in
 * this repository, so the map never claims a specific FC for a shipment.
 */
const FC_CITY_POINTS: Record<string, [number, number]> = {
  doncaster: [53.5228, -1.1285],
  london: [51.5074, -0.1278],
  tilbury: [51.4605, 0.3617],
  dartford: [51.4463, 0.2181],
  rochester: [51.3883, 0.506],
  'milton keynes': [52.0406, -0.7594],
  'hemel hempstead': [51.7528, -0.4732],
  dunstable: [51.8857, -0.5205],
  bedford: [52.136, -0.4671],
  manchester: [53.4808, -2.2426],
  warrington: [53.39, -2.597],
  bolton: [53.578, -2.4282],
  chesterfield: [53.235, -1.4215],
  'st helens': [53.4535, -2.7361],
  birmingham: [52.4862, -1.8904],
  daventry: [52.2575, -1.1629],
  coalville: [52.7245, -1.3728],
  dunfermline: [56.0719, -3.4523],
  swansea: [51.6214, -3.9436],
};

/**
 * Place strings the platform KNOWS it cannot locate. Declared explicitly so a
 * generic "Brand warehouse" is never silently dropped or guessed — it becomes a
 * visible SCHEMATIC leg with a stated reason.
 */
export const UNLOCATABLE_PLACE_STRINGS: readonly string[] = [
  'brand warehouse',
  'origin depot',
  /** §P5 — a PO that declares no ship-to party records this (never a hub). */
  'destination fc not declared on this po',
] as const;

/**
 * §P5 — the destination string a shipment records when its purchase order
 * declares no ship-to party. The ONE declaration lives here (the geography
 * module owns place strings); `src/config/destinationFc.ts` — the destination
 * owner — imports and re-exports it, so the two can never drift.
 */
export const DESTINATION_NOT_DECLARED = 'Destination FC not declared on this PO';

export interface GeoResolution {
  place: GeoPlace | null;
  /** The input string, echoed back so the UI can always show what was declared. */
  raw: string;
  /** Why it resolved or did not. Rendered in the inspector. */
  reason: string;
}

/**
 * §WAVE 3 — the canonical FC-CITY coordinate accessor.
 *
 * `FC_CITY_POINTS` is the ONE owner of "where is the retail-channel UK
 * fulfilment-centre city X". The operational map reads it through
 * `resolveGeoPlace`; the cinematic Logistics Hero needs the raw coordinate for
 * a city name from `DEFAULT_UK_FC_LIST`, so it reads it through THIS function
 * rather than keeping a second coordinate table.
 *
 * Returns `[lat, lon]`, or `null` for a city the repository has not declared a
 * coordinate for (fail closed — the caller must not guess).
 */
export function fcCityPoint(city: string): [number, number] | null {
  const key = city.trim().toLowerCase();
  return FC_CITY_POINTS[key] ?? null;
}

/** The FC city keys this repository can locate (for validators and diagnostics). */
export function fcCityKeys(): string[] {
  return Object.keys(FC_CITY_POINTS).sort();
}

function slug(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function lookupFcCity(text: string): GeoPlace | null {
  const lower = text.toLowerCase();
  for (const [city, [lat, lon]] of Object.entries(FC_CITY_POINTS)) {
    if (lower.includes(city)) {
      return {
        id: `fc_${slug(city)}`,
        label: `${text} — retail-channel UK FC city: ${city}`,
        kind: 'amazon_fc',
        lat,
        lon,
        precision: 'city',
        source: 'src/types.ts → DEFAULT_UK_FC_LIST (city precision)',
      };
    }
  }
  return null;
}

/**
 * Resolve a declared place string to a GeoPlace, or fail closed.
 *
 * Order: exact city/gateway → a retail-channel FC city → country centroid.
 * Anything else returns `null` — the caller MUST render it as schematic.
 *
 * §P5 — the Mercenta-hub branch is GONE. A record still naming a Mercenta hub
 * (or any undeclared place) now fails closed here and is drawn as schematic,
 * because the destination of a consignment is the FC on its PO
 * (`src/config/destinationFc.ts`) and no Mercenta-owned site is on the route.
 */
export function resolveGeoPlace(raw?: string | null): GeoResolution {
  const text = (raw ?? '').trim();
  if (!text) {
    return { place: null, raw: text, reason: 'No location declared on this record.' };
  }
  const lower = text.toLowerCase();

  const city = CITY_POINTS[lower];
  if (city) {
    return {
      place: {
        id: `${city.kind}_${slug(city.label)}`,
        label: city.label,
        kind: city.kind,
        lat: city.lat,
        lon: city.lon,
        precision: 'city',
        source: 'Canonical seed city (src/data/bootstrap.ts)',
      },
      raw: text,
      reason: `Named city/port coordinate: ${city.label}.`,
    };
  }

  const fc = lookupFcCity(text);
  if (fc) {
    return { place: fc, raw: text, reason: 'Matched a retail-channel UK fulfilment-centre city.' };
  }

  for (const [nation, [lat, lon]] of Object.entries(COUNTRY_CENTROIDS)) {
    if (lower.includes(nation)) {
      const label = nation.replace(/\b\w/g, (c) => c.toUpperCase());
      return {
        place: {
          id: `country_${slug(nation)}`,
          label,
          kind: 'brand_facility',
          lat,
          lon,
          precision: 'country_centroid',
          source: 'Country centroid (origin declared as a country only)',
        },
        raw: text,
        reason: `Origin declared as a country ("${text}") — plotted at the national centroid, not a precise site.`,
      };
    }
  }

  return {
    place: null,
    raw: text,
    reason: `"${text}" is not a declared location — plotted schematically, never guessed.`,
  };
}

/* ── Map frame ────────────────────────────────────────────────────────── */

/**
 * The equirectangular frame the SVG projects into. Declared here (not in the
 * component) so the projection and the drawn graticule can never disagree.
 *
 * The bounds deliberately include every origin the platform can actually
 * produce (South Korea → USA) so no record is silently off-canvas.
 */
export const MAP_FRAME = {
  viewBoxWidth: 1000,
  viewBoxHeight: 520,
  lonMin: -135,
  lonMax: 145,
  latMin: -45,
  latMax: 68,
  /** Drawn graticule spacing in degrees. */
  graticuleStep: 15,
} as const;

/** Honest labelling shown on every map render. */
export const MAP_TRUTH_NOTICE =
  'Schematic operational view — real declared coordinates (city where a city is declared, national centroid otherwise). Routes are indicative arcs between declared points, not surveyed road or sea paths.';

/* ── Operational truth states ─────────────────────────────────────────── */

/**
 * How a plotted element is KNOWN. Three states, never conflated:
 *
 *   LIVE VERIFIED  — a provider positively resolved to `live` AND the record
 *                    carries that provider's own identifier. Nothing in this
 *                    repository currently satisfies this, and the map says so
 *                    rather than implying live tracking.
 *   SIMULATED      — the provider mode positively resolves `simulation`
 *                    (`isProviderSimulationSafe`), i.e. the leg is a real,
 *                    working simulation through the canonical adapter seam.
 *   AMBIENT        — no positive provider resolution (unregistered, disabled,
 *                    configuring, degraded, not_registered) OR unknown
 *                    provenance. Contextual only: it may be plotted, but it is
 *                    claimed to be nothing.
 */
export type OperationalTruth = 'live_verified' | 'simulated' | 'ambient';

export interface TruthPresentation {
  label: string;
  short: string;
  tone: 'success' | 'info' | 'neutral';
  /** Stated in the legend and the inspector — the claim being made. */
  claim: string;
}

export const OPERATIONAL_TRUTH: Record<OperationalTruth, TruthPresentation> = {
  live_verified: {
    label: 'Live verified',
    short: 'LIVE',
    tone: 'success',
    claim: 'Provider mode is live and the record carries that provider’s own identifier.',
  },
  simulated: {
    label: 'Simulated',
    short: 'SIM',
    tone: 'info',
    claim: 'Provider mode positively resolves to simulation — no external network call was made.',
  },
  ambient: {
    label: 'Ambient / contextual',
    short: 'AMBIENT',
    tone: 'neutral',
    claim: 'No positive provider resolution — plotted for operational context only, claiming nothing.',
  },
};

/** Truth states in the order the legend and filters render them. */
export const OPERATIONAL_TRUTH_ORDER: readonly OperationalTruth[] = [
  'live_verified',
  'simulated',
  'ambient',
] as const;

/* ── Freight-term semantics (preserved, never invented) ───────────────── */

import type { FreightTerm } from '@/types';

export interface FreightSemantics {
  term: FreightTerm;
  /** Who arranges the carrier. For collect this is the retail channel. */
  arranges: string;
  /** Mercenta's own role, stated plainly. */
  mercentaRole: string;
  /** Which PO window type applies. */
  window: string;
  /** Which PO date fields back that window. */
  windowFields: string;
  /** True when the retail channel controls carrier assignment. */
  channelArranged: boolean;
  label: string;
  detail: string;
}

/**
 * The two freight terms. Semantics come from the canonical PO model
 * (`src/types.ts → FreightTerm`) and the canonical validator
 * (`src/lib/shipping/carrierRouting.ts → validateCarrierForShipment`).
 *
 * The map and the hub read THIS, so the Collect / channel-arranged distinction
 * can never drift between the legend, the inspector and the ASN rules.
 */
export const FREIGHT_SEMANTICS: Record<FreightTerm, FreightSemantics> = {
  collect: {
    term: 'collect',
    label: 'Freight Collect — the retail channel arranges the carrier',
    arranges: 'The retail channel selects and books the carrier. Mercenta does not choose it.',
    mercentaRole:
      'Mercenta follows the channel-assigned carrier on the routing request. Mercenta’s own DHL / Palletline accounts are NOT selected for this leg.',
    window: 'Ship Window (earliest / latest ship date)',
    windowFields: 'shipWindowStart → shipWindowEnd',
    channelArranged: true,
    detail:
      'Because the channel arranges carriage, the partnered-carrier value is the permitted carrier value on this PO. A Mercenta account is NOT selected for this leg; if it is used at all it is an attributed, audited admin override — and a provider that is not positively operational is refused even then.',
  },
  prepaid: {
    term: 'prepaid',
    label: 'Freight Prepaid — carriage arranged through Mercenta',
    arranges:
      'Mercenta arranges carriage using the account the lane rule selects (international → DHL, UK domestic → Palletline).',
    mercentaRole:
      'Mercenta books, pays and invoices the carrier; the brand is charged per the shipping commercial terms.',
    window: 'Delivery Window (the carrier must deliver to the destination within it)',
    windowFields: 'deliveryWindowStart → deliveryWindowEnd',
    channelArranged: false,
    detail:
      'No single carrier is universal: the lane decides the account, and an admin may override a single shipment — attributed and audited.',
  },
};

export function freightSemantics(term?: FreightTerm | null): FreightSemantics | null {
  if (term === 'collect' || term === 'prepaid') return FREIGHT_SEMANTICS[term];
  return null;
}

/* ── Shipment origin — the ONE derivation ─────────────────────────────── */

/**
 * The origin string a domain-created shipment records.
 *
 * WHY THIS EXISTS: the domain previously wrote the literal placeholders
 * `'Brand warehouse'` (auto-draft after PO acknowledgment) and `'Origin depot'`
 * (ASN filing). Neither is a location, so a consignment created through the real
 * workflow could not be plotted on the operational map and its origin could not
 * be reported. The brand's DECLARED nation — already on the canonical brand
 * record — is the honest precision that is actually available at that point in
 * the lifecycle.
 *
 * A brand with no declared nation records an explicit "not declared" origin,
 * which the map renders as schematic. It is never guessed.
 */
export function originForBrand(
  brand?: { nation?: string | null } | null
): string {
  const nation = (brand?.nation ?? '').trim();
  return nation ? `${nation} facility` : 'Origin not declared';
}