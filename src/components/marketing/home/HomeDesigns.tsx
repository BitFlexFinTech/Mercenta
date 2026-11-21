/**
 * §BRAND REDESIGN (2026-11-20) — THE FOUR HOMEPAGE DESIGNS, NOW GENUINELY FOUR.
 *
 * WHAT WAS WRONG
 * --------------
 * This module used to define all four designs inline, and all four rendered the
 * SAME nine sections from `./sections` in the SAME ORDER:
 *
 *   <ManifestStrip /> <JourneyLedger /> <ServiceCards /> <ProofSections />
 *   <UnlockGrowth />  <CategoryStrip />
 *
 * Only the hero wrapper differed. That is why the four directions looked like one
 * design in four colourways — the composition, which is what actually makes a
 * design a design, was identical across all four.
 *
 * WHAT CHANGED
 * ------------
 * Each direction now lives in its own module and composes its OWN sections, with
 * its own order, grid, typography, density and imagery:
 *
 *   A — Monolith        one column of type · hero is TYPE ONLY · services as a
 *                       numbered ledger · one photograph, low, as a band
 *   B — Grid Editorial  split hero with a 2x2 photo grid · multi-column ·
 *                       photo + text service grid · captions throughout
 *   C — Signal          centred hero led by the tracker · mono stat strip ·
 *                       dense list · route as a signal line · images are the
 *                       WORK surface, inset · console-framed panels
 *   D — Mark            the WORDMARK at enormous scale IS the hero · two
 *                       full-width image bands with the mark laid across them ·
 *                       asymmetric services with oversized numerals
 *
 * WHAT IS STILL SHARED, DELIBERATELY
 * ----------------------------------
 * `designShared.tsx` holds ONLY what must not differ between designs:
 *   · the three preserved homepage actions (Explore UK Market Fit · Partner
 *     Login · Request Partner Access) — the same destination in all four;
 *   · the tracker animation component (`HeroTracker`), never reimplemented;
 *   · the approved content model — all four read the same copy.
 *
 * These export names are unchanged, so `designRegistry.ts` and the Super-Admin
 * design picker keep working without an edit.
 */
export { DesignA as HomeDesignA } from './DesignA';
export { DesignB as HomeDesignB } from './DesignB';
export { DesignC as HomeDesignC } from './DesignC';
export { DesignD as HomeDesignD } from './DesignD';
/** §BATCH 3 (2026-11-21) — the approved Concept 3 direction, added additively. */
export { DesignE as HomeDesignE } from './DesignE';
export type { HomeDesignProps } from './designShared';