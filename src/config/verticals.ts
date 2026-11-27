/**
 * §WAVE 3g (2026-11-25), CORRECTED 2026-11-27 — THE OPERATING VERTICALS: ONE DECLARATION.
 *
 * Mercenta runs three operating models. Until this file existed the new console's
 * BWS and Talent Commerce surfaces declared 60-odd views with NOTHING in the domain
 * to scope them by, so those views could only have been built by inventing a
 * brand's vertical. This is the owner of that vocabulary — the labels, the honest
 * empty-state wording, and the ONE resolver a surface uses to select its brands.
 *
 * OWNER DECISION 2026-11-27 - WHERE THE OTHER TWO VERTICALS COME FROM, RECORDED.
 * This note used to say that the source of the BWS and Talent records was not
 * recorded in this project, and that a guess would be a false statement about the
 * business. The Owner has now stated the position plainly: this is ONE platform, and
 *    - the BWS records come from   BitFlexFinTech/Dash-1
 *    - the Talent records come from BitFlexFinTech/CAA-TalAg
 * both of which are being IMPORTED INTO THIS REPOSITORY. They are not separate
 * businesses and must never be described as such again. Confirmed by the CAA-TalAg
 * view set, whose 18 screens are the 18 ids this console declares for Talent
 * Commerce. The import programme is recorded in PROJECT_STATUS.md.
 */
import type { DemoBrandRow } from '@/data/demoData';
import type { OperatingVertical } from '@/types';

export const OPERATING_VERTICALS: readonly OperatingVertical[] = [
  'core',
  'bws',
  'talent_commerce',
];

/** How each vertical is named in the product. */
export const VERTICAL_LABELS: Record<OperatingVertical, string> = {
  core: 'Mercenta Core',
  bws: 'Beers, Wines & Spirits',
  talent_commerce: 'Talent Commerce',
};

/** The short form used in a heading. */
export const VERTICAL_SHORT_LABELS: Record<OperatingVertical, string> = {
  core: 'Core',
  bws: 'BWS',
  talent_commerce: 'Talent Commerce',
};

/**
 * What a surface says when its vertical holds no brands. This is the truthful state
 * TODAY, and its cause is now recorded: the BWS and Talent records have NOT been
 * imported yet - they come from BitFlexFinTech/Dash-1 and BitFlexFinTech/CAA-TalAg
 * into THIS repository (see the OWNER DECISION note at the top of this file). Every
 * brand the platform holds belongs to core until that import lands. A surface that
 * showed core brands under a BWS heading would be mislabelling them, so it says
 * this instead.
 */
export const VERTICAL_EMPTY_STATE: Record<OperatingVertical, string> = {
  core: 'No Core brands are onboarded in this environment yet.',
  bws: 'No Beers, Wines & Spirits brands are onboarded in this environment yet.',
  talent_commerce: 'No Talent Commerce relationships are onboarded in this environment yet.',
};

/**
 * A brand's vertical. A row mapped from a database that predates the discriminator
 * resolves to `core` — this platform's own operating model — rather than being
 * silently treated as belonging to one of the other two.
 */
export function verticalOf(brand: { vertical?: OperatingVertical }): OperatingVertical {
  return brand.vertical ?? 'core';
}

/** The brands belonging to one vertical. */
export function brandsInVertical(
  brands: DemoBrandRow[],
  vertical: OperatingVertical
): DemoBrandRow[] {
  return brands.filter((brand) => verticalOf(brand) === vertical);
}
