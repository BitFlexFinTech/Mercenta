/**
 * §TALENT COMMERCE DEMO DATA — ONE OWNER, IMPORTED VERBATIM FROM THE OWNER'S SOURCE.
 *
 * SOURCE: `github.com/BitFlexFinTech/CAA-TalAg` ("CAA Dashboard"), commit `f2d7e61`,
 * read in full on 2026-11-28 and copied file-for-file. The owner's decision recorded
 * in `src/config/verticals.ts` names this repository as WHERE THE TALENT RECORDS COME FROM.
 *
 * WHAT IS AND IS NOT EDITED: the five data modules, the one utility they share and
 * `src/types/talent.ts` are the owner's own code and records. The ONLY changes are
 * three import specifiers (`../types/commerce` → `@/types/talent`,
 * `../utils/intelligenceEngine` → `@/lib/talent/intelligenceEngine`,
 * `../data/brandProductMedia` → `@/data/talent/brandProductMedia`), because this
 * repository keeps vertical types in `src/types/` beside the long-standing `src/types.ts`.
 *
 * The 149 image assets the data references were copied from the same commit
 * (`public/images/**`), and only those — the source ships 30 MB of other imagery
 * that no record names.
 *
 * WHY THIS IS ISOLATED (the owner's requirement):
 *   · nothing outside `src/data/talent/**`, `src/lib/talent/**` imports these modules
 *     except `src/data/verticalData.ts` (the ONE resolver) and this barrel;
 *   · it imports NOTHING from CORE demo data and nothing from BWS
 *     (`src/data/bws/**`);
 *   · a gate (`scripts/validate-vertical-isolation.mjs`) fails if either cross-import
 *     ever appears.
 *
 * LABELLING: the source's own `VerificationTier` includes **'Demonstration Data'**, and
 * much of this seed carries it. Nothing here may be presented as a verified fact about
 * a real person, brand or royalty.
 */
export * from './seedData';
export * from './intelligenceSeedData';
export * from './talentPortraits';
export * from './brandProductMedia';
export * from './catalogData';