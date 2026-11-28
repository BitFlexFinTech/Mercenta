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

## 7. DECISIONS I NEED
- **D5** category benchmarks: keep CORE TAM/SAM market data in a BWS screen, or drop it?
- **D6** prospect score: source verification text, or no score column?
- **D7** “Run discovery”: relabel honestly, or remove?
- **D8** outreach actions: read-only, or BWS-local simulation?
- **D9** opportunity stage changes: hide until the source export is proven?

**No wiring has been written for this screen.** The three false statements to fix in it are the section descriptions that say data comes from "canonical Mercenta stores" / "UK category TAM/SAM benchmarks" — they must name Dash-1 once wired.