# UI/UX REDESIGN WAVE 3 — THE LOGISTICS HUB: CINEMATIC HERO + OPERATIONAL HUB

> Date: 2026-09-22 · Branch: `redesign/foundation` · Session increment: **Wave 3**
> Status: **IMPLEMENTED + BROWSER-VERIFIED** for the hero and the operational Hub it
> sits on. **Wave 3 is NOT fully closed** — see §7 for the itemised remaining work.
> Waves 5 (Super Admin Control Centre) and 6 (product-wide completion) are **NOT
> STARTED**, and **no deployment has been performed.**

## 1. What the Wave 3 requirement actually was

Wave 3 is **the complete Brand Logistics Hub experience**, not a map swap. The
cinematic visualisation is the **HERO SECTION OF THE SAME Logistics Hub page** —
there is not a second page, and the operational controls stay interactive
underneath. Both halves are required.

## 2. The hero — what was built

`src/components/shared/logistics/LogisticsHero.tsx` (section, accessible text
panel, legend, honest-truth notice, attribution) renders
`LogisticsHeroScene.tsx` — a **real WebGL scene** (three + R3F) with a **fixed
camera and no controls at all**:

| Layer | What it draws | Source of the geometry |
|---|---|---|
| World backdrop | The real world landmass silhouette, tilted behind/above the UK tile, carrying the declared international gateways | Natural Earth `ne_110m_land` |
| UK tile | **Extruded UK landmass from the real coastline**, the **real UK strategic road network**, canonical fulfilment-centre markers and Mercenta's declared hub | Natural Earth `ne_10m_admin_0_countries` (UK) + OpenStreetMap motorway/trunk ways (ODbL) |
| Lanes | Declared air, maritime and UK road lanes, plus brand consignment lanes derived from the canonical shipment legs | Declared gateways (real coordinates) + canonical data |
| Traffic | Aircraft (fuselage/wings/tail/engines), container ships (hull/bow/bridge/container stacks), articulated lorries — each an **InstancedMesh** | Authored primitives merged into ONE geometry per type |

## 3. Authentic geography — sources, licences, provenance

Generated, not hand-drawn: `scripts/build-logistics-hero-geo.mjs` downloads the
authoritative datasets, simplifies them (Douglas–Peucker) and commits the result
to `src/data/logisticsHeroGeo.ts` (261 kB raw). The app performs **zero network
calls** at runtime; the raw multi-megabyte downloads live in a gitignored
`.geo-cache/` and are reproducible with `npm run build:hero-geo -- --fetch`.

| Layer | Dataset | Licence | Attribution |
|---|---|---|---|
| World landmass | Natural Earth 1:110m Land | **Public domain** | rendered in the hero |
| UK landmass / coastline | Natural Earth 1:10m Admin 0 Countries (United Kingdom) | **Public domain** | rendered in the hero |
| UK strategic road network (motorway + trunk) | OpenStreetMap, via the Overpass API | **ODbL 1.0 — © OpenStreetMap contributors** | rendered in the hero (`HERO_GEO_PROVENANCE.attribution`) and asserted by the browser suite |

Committed geometry: 46 world land rings (1,156 pts) · 16 UK rings (1,993 pts) ·
6,067 road lines (12,158 pts). No road, port, airport or fulfilment centre is
invented: UK destinations come from `DEFAULT_UK_FC_LIST` (`src/types.ts`) through
`fcCityPoint()` (`src/config/logisticsGeo.ts`), the existing canonical FC
coordinate owner — there is no second FC dataset.

**Declared, not hidden:** the UK tile is enlarged (`HERO_SCENE.ukTile.scale`)
because a true-scale UK is unreadable next to a world plane. Bearings and
relative positions are unchanged, and the hero states the exaggeration in its
notice rather than implying true scale.

## 4. Deterministic simulation

`src/lib/logistics/heroNetwork.ts` is a pure projection: no business state, no
fetching, no randomness. Every lane's phase and speed come from a **stable hash
of its own id**, so a given simulated time always yields identical positions —
which is why the composition is screenshot-stable and testable.

- 22 air lanes from 22 international airports across 9 regions (East Asia, South
  East Asia, South Asia, Middle East, Europe, North America, South America,
  Africa, Oceania) → 5 declared UK airports.
- 22 maritime lanes whose **approach bearing is the real bearing** from the real
  origin port to the real UK port (`bearingDeg`), ending offshore so a ship never
  crosses land.
- 35 road vehicles: the longest motorway way per grid cell (geographic spread
  across the UK) plus **one approach lane per canonical FC city**, built from a
  point ON the authentic road network to the FC node.
- Brand lanes are added only where a canonical leg resolves to geography. A leg
  with no resolvable origin is **not fabricated**.

`HERO_SCENE.budget` caps are **enforced** by `buildHeroNetwork`, not documentation.

## 5. Truth semantics (the part that must never drift)

- Brand lanes carry the canonical leg's own classification
  (`classifyLegTruth`): `simulated` only when the provider positively resolves to
  `simulation`, `live_verified` only with the provider's own identifier,
  otherwise `ambient`.
- Every declared (ambient) lane is **always** `ambient`. The hero states in plain
  words that ambient traffic is **NOT a Mercenta shipment**.
- The site-wide `UNKNOWN → SIMULATION` defect is **not** reintroduced: the
  validator asserts `unknown`, `not_registered`, `disabled`, `configuring`,
## 6. Verification (all executed in this session)

| Gate | Result |
|---|---|
| `npx tsc --noEmit -p tsconfig.app.json` | **0 errors** |
| `npx eslint src/` | **0 problems** |
| `npm run build` | **PASS** (5.69 s). BrandShell chunk 600.30 kB / 180.83 kB gzip — the hero geometry + three.js now load with the brand shell; recorded as a real cost, not explained away |
| `node scripts/validate-logistics-hero.mjs` | **LOGISTICS_HERO_VALIDATION_PASS — 53 assertions**, runtime executed, **0 network calls** |
| `node scripts/validate-logistics-map.mjs` | **LOGISTICS_MAP_VALIDATION_PASS — 60 assertions** (unchanged) |
| `npx playwright test e2e/logistics-hero.spec.ts` | **10 passed** |
| `npx playwright test e2e/logistics-hub-map.spec.ts` | **15 passed** (no regression) |

Browser assertions (real Chromium): one page holding BOTH the hero and the
operational map; `pointer-events: none` on the scene host; the page genuinely
scrolls with the pointer parked over the hero (container-agnostic: the hero must
move); 22 aircraft / 22 ships / 35 road vehicles / 44 gateway origins / 9
regions; authentic attributed geometry present in the browser; all three truth
labels rendered with counts, live count 0; ambient explicitly "NOT a Mercenta
shipment"; the same canonical consignments plotted; reduced motion keeps a
meaningful static view and says so; **zero external network calls**; the
operational controls remain interactive; no horizontal overflow at 1440 / 1024 /
390.

**Visual verification was performed by screenshot review, not assumed:** the
first three compositions were rejected on real captured images (the UK tile was
unreadable at 26% of the frame; the overlay was light-on-light in the Minimal
Light theme because `ink-950` resolves to near-white there; ships rendered across
the land because the tile was lifted above the sea plane and ships sailed under
it). Each defect was fixed at its cause — a closer declared camera, no theme
tokens in the cinematic overlay, and a sea plane coplanar with the tile base —
and re-captured.

## 7. Honest scope statement — what is NOT done

**Wave 3 remaining (in the matrix / roadmap):**
1. **PO acknowledgement backorder gate** — `isBackOrderAllowed` does not exist
   anywhere in the repository (grep = 0 hits), so backorder is still offered
   unconditionally. Amazon's documented rule gates it per line. **Not fixed in
   this increment** (`discovered-backorder-fail-closed-gate`).
2. **Brand-facing Routing Request + the unsupported "10am Pacific" claim** — still
   present in `src/types.ts` and `src/components/shared/RoutingRequest.tsx`.
   Explicitly **not** treated as Amazon truth; removal/reconciliation was **not
   executed** here (`discovered-routing-request-removal`, T-6).
3. **Carrier provider-eligibility derivation** — the eligibility rule is the
   declared lane rule (international → DHL, UK domestic → Palletline) plus the
   partnered-carrier rule for Freight Collect. A derivation from brand location,
   origin, destination, route, PO context, freight terms, provider capabilities
   and provider state is **not built** (`discovered-logistics-hub`, second half).
4. **ETA on the shipment record** — there is no ETA field in the domain model, so
   the Hub cannot present a truthful ETA. What exists is the carrier milestone
   timeline. Adding ETA is a domain change, not a UI change.
5. **Delivery-performance aggregation inside the Hub** — not present; monitoring
   dashboards exist elsewhere in the product. Recorded, not invented.
6. **Consolidation** and **customs documents** are **not** Hub features in the
   authoritative matrix (customs appears as a shipment STAGE, `uk_port_hmrc`), so
   no feature was invented for them.
7. The **admin** Logistics Control keeps its existing interactive operational map
   and does not show the hero (the requirement was the Brand Logistics Hub). Not
   a regression — recorded for a future decision.

**Waves 5 and 6: NOT STARTED.** No credential vault, no Super Admin Control
Centre work, no product-wide completion pass. **No deployment has been performed.**

## 8. Files changed in this increment

**New**: `src/config/logisticsHero.ts` · `src/lib/logistics/heroNetwork.ts` ·
`src/components/shared/logistics/LogisticsHero.tsx` ·
`src/components/shared/logistics/LogisticsHeroScene.tsx` ·
`src/data/logisticsHeroGeo.ts` (generated) ·
`scripts/build-logistics-hero-geo.mjs` · `scripts/validate-logistics-hero.mjs` ·
`e2e/logistics-hero.spec.ts` · this document.
**Modified**: `src/components/brand/LogisticsHub.tsx` (the hero section added to
the SAME page) · `src/config/logisticsGeo.ts` (`fcCityPoint`/`fcCityKeys`
accessors — the FC coordinate owner is unchanged) · `package.json` (two scripts) ·
`.gitignore` (`.geo-cache/`).
  `degraded`, `error`, `available` and `live`-without-a-provider-reference all
  resolve to `ambient`, never `simulated`.