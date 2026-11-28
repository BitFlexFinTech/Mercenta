/**
 * §VERTICAL DATA — THE ONE RESOLVER. BWS AND TALENT NEVER MEET EXCEPT HERE.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * The owner's requirement is absolute: *"The two verticals must be completely isolated
 * from each other… A BWS session sees only BWS data, a Talent session sees only Talent
 * data, neither sees CORE data unless they are supposed to."*
 *
 * Isolation that depends on every screen remembering to filter is not isolation. So the
 * platform has ONE place that knows where each vertical's data lives, and the screens
 * never import a vertical's module directly — they ask this resolver for THEIR vertical.
 *
 * THE THREE PROPERTIES THAT MAKE IT HOLD
 * --------------------------------------
 *  1. **One owner per vertical.** `VERTICAL_DATA_SOURCE` names, for each vertical, the
 *     module that owns its records and the upstream commit they came from. The owner's
 *     repositories are recorded here, not in prose (`src/config/verticals.ts` records WHY
 *     they are the source; this records WHICH module carries them).
 *  2. **Lazy, so a vertical's records are never in another vertical's bundle.** The
 *     imports are dynamic: a CORE session downloads neither module, a BWS session
 *     downloads only `./bws`, a Talent session only `./talent`.
 *  3. **Fail-closed.** An unknown vertical — or `core` asked for a demo bundle — returns
 *     `null` rather than falling back to another vertical's records. A gate
 *     (`scripts/validate-vertical-isolation.mjs`) fails if any other module imports both
 *     `./bws` and `./talent`, if either imports CORE demo data, or if a session can read
 *     another vertical's rows.
 */
import type { OperatingVertical } from '@/types';

/** Where each vertical's records come from — the owner's own repositories. */
export const VERTICAL_DATA_SOURCE: Record<
  OperatingVertical,
  { repo: string | null; commit: string | null; module: string | null }
> = {
  core: { repo: null, commit: null, module: 'src/data/demoData.ts' },
  bws: { repo: 'BitFlexFinTech/Dash-1', commit: 'c40c541', module: 'src/data/bws' },
  talent_commerce: { repo: 'BitFlexFinTech/CAA-TalAg', commit: 'f2d7e61', module: 'src/data/talent' },
};

export type BwsDemoModule = typeof import('./bws');
export type TalentDemoModule = typeof import('./talent');

export type VerticalDemoData =
  | { vertical: 'core'; data: null }
  | { vertical: 'bws'; data: BwsDemoModule }
  | { vertical: 'talent_commerce'; data: TalentDemoModule };

/**
 * Load ONE vertical's demo data, and only that vertical's.
 * `core` returns `null` on purpose: CORE's records are owned by the existing demo store,
 * and handing a CORE surface the BWS or Talent bundle would be the exact leak this file
 * exists to prevent.
 */
export async function loadVerticalDemoData(vertical: OperatingVertical): Promise<VerticalDemoData> {
  switch (vertical) {
    case 'bws': {
      const data = await import('./bws');
      return { vertical: 'bws', data };
    }
    case 'talent_commerce': {
      const data = await import('./talent');
      return { vertical: 'talent_commerce', data };
    }
    case 'core':
      return { vertical: 'core', data: null };
    default:
      /* Fail closed: an unrecognised vertical gets NOTHING, never another vertical's rows. */
      return { vertical: 'core', data: null };
  }
}