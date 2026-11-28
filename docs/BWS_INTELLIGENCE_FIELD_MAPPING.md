# §BWS INTELLIGENCE — FIELD MAPPING (for approval, before any wiring)

**Screen:** `src/next/screens/bws/BwsIntelligenceScreen.tsx` → `BwsIntelligenceView.tsx`
**Sections:** overview · country-discovery · brand-discovery · brand-intelligence · uk-distribution · amazon-uk · pitch-targets · opportunity-assessment
**Today:** reads CORE hooks (`useBrands`, `useProducts`, `usePurchaseOrders`), the CORE **lead** store (`leads`, `refreshLeadsFromProspects`) and the CORE outreach engine.
**Source:** `src/data/bws/**` — COUNTRIES (12) · BRANDS (88) · DISTILLER_DIRECTORY (12) · UK_DISTRIBUTION_RECORDS (88) · AMAZON_UK_LISTINGS (88) · INITIAL_OUTREACH_LOGS (7) · OPPORTUNITY_ASSESSMENTS · PRODUCTS (89) · PORTFOLIO_BRANDS (4).

## 1. COUNTRY ROWS (`countryRows`)
| View field | Today (CORE) | Proposed (BWS) |
|---|---|---|
| country identity | CORE brands grouped by nation | `COUNTRIES` (12): `name`, `isoCode`, `regionGroup` |
| category mix | CORE brand categories | `COUNTRIES.categories[]` (DrinkCategory) |
| brands present | CORE brand count | `COUNTRIES.brandsDiscoveredCount` |
| UK presence / opportunity indicators | derived from CORE | `COUNTRIES.ukPresenceIndicator`, `commercialOpportunityIndicator` (source's own labels) |
| producers featured | CORE | `COUNTRIES.featuredProducers` |
| evidence | CORE | `COUNTRIES.evidenceIds` → `EVIDENCE_RECORDS` (14) |

## 2. CATEGORY BENCHMARKS (`categoryBenchmarks`)
| View field | Today | Proposed |
|---|---|---|
| category TAM/SAM benchmark | CORE `tamSamPipeline` market data | **Decision D5** — this is CORE *market* data, not tenant data. Keep it (market benchmarks are not a brand's records) or derive from BWS (`DrinkCategory` distribution) and drop TAM/SAM. |

## 3. OPPORTUNITY STATES (`opportunityStates`)
| View field | Today | Proposed (BWS) |
|---|---|---|
| state / status | CORE `ukOpportunityStates` engine over CORE brands | `OPPORTUNITY_ASSESSMENTS` — **needs confirmation that this export is populated** (the source's array reported no `id` fields in my count; its shape must be read before wiring) |
| counts | CORE | counts of `OPPORTUNITY_ASSESSMENTS` by status |

## 4. PROSPECTS (`prospects`, `selectedProspect`)
| View field | Today | Proposed (BWS) |
|---|---|---|
| name / origin | CORE leads | `BRANDS` (88) + `DISTILLER_DIRECTORY` (12) |
| tier / score | CORE scoring engine | `BRANDS.ownershipVerification` + `UR?` — **no numeric score exists in the source** → **D6**: show source verification status (text) instead of a fabricated score |
| outreach state | CORE lead lifecycle | `INITIAL_OUTREACH_LOGS` (7): status + note |
| contact info | CORE | `UK_DISTRIBUTION_RECORDS.contactInfo` (88) where a brand has one |

## 5. THE THREE ACTIONS — WHERE THE SOURCE HAS NO EQUIVALENT
| View action | Today | Problem | Proposal |
|---|---|---|---|
| `onRunDiscovery` ("Run discovery") | CORE lead engine refreshes leads from CORE prospects | Dash-1 ships **no discovery engine** — it ships records only | **D7**: relabel to “Re-read Dash-1 records” (honest) or hide the control |
| `onOutreachAction(prepare/approve/send/simulate_response/create_opportunity)` | CORE outreach sender writes to CORE leads | Would write CORE data from a BWS session — a cross-vertical leak | **D8**: read-only in BWS (show the log), or a BWS-local simulated action |
| `onSetOpportunityStage` | CORE opportunity store | Same leak | **D9**: hidden until `OPPORTUNITY_ASSESSMENTS` is confirmed usable |

## 6. WHAT IS SAFE TO MAP NOW (no decisions needed)
`metrics` (counts of the source collections), `searchQuery`/`tierFilter` (view-local state), `canMutate` (session), `actingStaffName` (session).

## 7. DECISIONS — ANSWERED BY THE OWNER 2026-11-28, AND IMPLEMENTED

| # | Decision | Implemented as |
|---|---|---|
| D5 | market sizing | Panel replaced by a plain notice. No TAM/SAM figure is shown. |
| D6 | prospect score | Numeric score and tier columns REMOVED; text indicators only. |
| D7 | "Run discovery" | Button DELETED (not disabled). |
| D8 | outreach actions | All five write controls DELETED; `INITIAL_OUTREACH_LOGS` renders read-only. |
| D9 | opportunity stage | Mutating select + "Set Stage" DELETED; `OPPORTUNITY_ASSESSMENTS.status` is a read-only badge. |

### The two approved row models (final)

`BwsCountrySummaryRow`: `regionKey`, `label` (`COUNTRIES.name`), `brandCount`
(`brandsDiscoveredCount`), `categories`, `ukPresenceIndicator`,
`commercialOpportunityIndicator`, `featuredProducerCount`, `evidenceCount`.
Removed: `productCount`, `leadCount`, `openPoValueGbp` — no source, and 0 would be fabricated.

`BwsProspectRow`: `id`, `brand`, `category`, `website`, `description`,
`ownershipVerification`, `licensingArrangement`, `ukPresenceIndicator`,
`commercialOpportunityIndicator`, `asinCount` (count of `AMAZON_UK_LISTINGS` rows for
that brand), `outreach` (`INITIAL_OUTREACH_LOGS[brandId]` — an OBJECT keyed by brand,
36 entries, **not** an array), `opportunityStatus` (`OPPORTUNITY_ASSESSMENTS.status`).
Removed: `totalScore`, `tier`, `tierLabel`, `rawOfferClass`, `offerSummary`,
`disqualified`, `leadDistributor`, `leadContact`, `wholesaleAvailable`,
`distributorProgramme`, `acquisitionStage`, `opportunityId`, `opportunityStage`,
`asins[]`, `contacts[]`, `distributors[]`, all five `can*Outreach` flags.

**Status: WIRED** (commit `15feee4`). The screen reads `useBwsDemo()` only; the adapter is
`src/data/bws/bwsIntelligenceAdapter.ts`. Evidence: typecheck 0 · build EXIT=0 ·
`validate-vertical-isolation` PASS (66 assertions) · live render 0 page errors, scan button
absent, D5 notice present.
