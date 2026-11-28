/**
 * §BWS DEMO DATA — ONE OWNER, IMPORTED VERBATIM FROM THE OWNER'S SOURCE.
 *
 * SOURCE: `github.com/BitFlexFinTech/Dash-1` ("BWS Dashboard"), commit `c40c541`,
 * read in full on 2026-11-28 and copied file-for-file. The owner's decision recorded
 * in `src/config/verticals.ts` names this repository as WHERE THE BWS RECORDS COME FROM.
 *
 * WHAT IS AND IS NOT EDITED: the four data modules and `src/types/bws.ts` are the
 * owner's own code and records. The ONLY change is the type-import specifier
 * (`../types/bws` → `@/types/bws`), because this repository keeps its vertical types
 * in `src/types/`, beside the long-standing `src/types.ts`.
 *
 * WHY THIS IS ISOLATED (the owner's requirement):
 *   · nothing outside `src/data/bws/**` imports these modules except
 *     `src/data/verticalData.ts` (the ONE resolver) and this barrel;
 *   · it imports NOTHING from CORE demo data (`src/data/demoData.ts` /
 *     `demoStore.ts`) and nothing from Talent (`src/data/talent/**`);
 *   · a BWS session therefore cannot see CORE or Talent rows through this path,
 *     and a gate (`scripts/validate-vertical-isolation.mjs`) fails if either
 *     cross-import ever appears.
 *
 * Every record here is DEMONSTRATION DATA. The source's own vocabulary says so
 * (its `VerificationStatus` and the illustrative GBP fields), and no figure in it
 * may be presented as a verified fact about a real business.
 */
export * from './bwsData';
export * from './globalCatalogExpansion';
export * from './southAfricaWineExpansion';
export * from './fullResearchExpansion';