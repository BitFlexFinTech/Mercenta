# TALENT WORKSPACE — FIELD MAPPING (CAA-TalAg → screens)

**Approved and implemented 2026-11-28.** Every row below is built in
`src/data/talent/talentWorkspaceAdapter.ts`; nothing is invented.

## 1. TalentWorkspaceScreen

| View field | Source | Notes |
|---|---|---|
| `rightsHolders.businessName` | `INITIAL_BRANDS.name` | |
| `rightsHolders.category` | `INITIAL_BRANDS.category` | |
| `rightsHolders.nation` | `INITIAL_BRANDS.originCountry` | |
| `rightsHolders.trackLabel` | `INITIAL_TALENTS.roleSummary` | Owner's decision |
| `rightsHolders.rightsBadge` | `INITIAL_RELATIONSHIPS.relationshipType` + `.ukDistributionRightsConfirmed` | One read-only badge; never labelled "contract status" |
| `rightsHolders.contactPhone` | — | **"—"**: the dataset has no phone field |
| `rightsHolders.productCount` | count of `INITIAL_DISCOVERED_PRODUCTS` for that brand | |
| `productReadiness.ready` | `verification.unknownFields.length === 0` | Owner's decision |
| `productReadiness.unknownFieldCount` | `verification.unknownFields.length` | Rendered "N fields unresolved" |
| `productReadiness.imagePresent` | Boolean of the single `image` field | **There is no image count in the source** |
| `prospects.ukRoute` | `INITIAL_BRANDS.ukWholesaleRouteStatus` | |
| `prospects.verification` | `verification.confidence` + `verification.dateChecked` | The source's own confidence, not a score |
| `ukOpportunities.*` | `INITIAL_UK_ASSESSMENTS` joined to `INITIAL_BRANDS` | |
| `profile.*` | `INITIAL_TALENTS[0]` | Roster record as published |
| `metrics` | counts of the five collections | |

**Removed, with reason (no source):** `poValueGbp`, `commissions` (whole section),
`totalScore`, `tierLabel`, `listingScore`, `submissionStatus`, `imageCount`,
`can*Outreach`, `onOutreachAction`, `onSetOpportunityStage`, `ukStates`,
`brandValueChart`, `integrationStatuses`.

**Sections with no source** (`brand-stores`, `concepts`, `development`, `collections`,
`assets`, `royalties`) render an honest notice rather than empty tables or invented rows.

## 2. TalentApprovalsScreen

| View field | Source | Notes |
|---|---|---|
| `stamps[].subject` | `INITIAL_BRANDS.name` / `INITIAL_DISCOVERED_PRODUCTS.title` | |
| `stamps[].tier` | `verification.verificationTier` | Read-only |
| `stamps[].confidence` | `verification.confidence` | |
| `stamps[].unknownFieldCount` | `verification.unknownFields.length` | |
| `stamps[].dateChecked` | `verification.dateChecked` | |
| `stamps[].evidenceSummary` | `verification.evidenceSummary` | |
| `metrics` | brand count, product count, relationship count, stamp count | All have sources |

**Removed:** the submissions, listings and purchase-orders tabs; `onPollSubmission`,
`onReviewListing`, `onReviewCompliance`, `onApprovePoDraft`. None of those record types
exists in the dataset, so each control would have changed nothing.

A static notice states: *"Approval workflows are not available in the Talent Commerce
workspace. Verification stamps are read-only."*