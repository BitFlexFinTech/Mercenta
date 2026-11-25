/**
 * §WAVE 3g (2026-11-25) — THE OPERATING VERTICALS: ONE DECLARATION.
 *
 * Mercenta runs three operating models. Until this file existed the new console's
 * BWS and Talent Commerce surfaces declared 60-odd views with NOTHING in the domain
 * to scope them by, so those views could only have been built by inventing a
 * brand's vertical. This is the owner of that vocabulary — the labels, the honest
 * empty-state wording, and the ONE resolver a surface uses to select its brands.
 *
 * Deliberately NOT here: any claim about which repository holds another vertical's
 * records. That is not recorded in this project, and a guess would be a false
 * statement about the business.
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
 * today: every brand the platform holds belongs to `core`, because the other two
 * operating models are separate businesses. A surface that showed core brands under
 * a BWS heading would be mislabelling them, so it says this instead.
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