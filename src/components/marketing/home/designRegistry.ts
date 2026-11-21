/**
 * §LINT FIX (2026-11-19) — THE DESIGN REGISTRY LIVES IN ITS OWN MODULE.
 *
 * `react-refresh/only-export-components` refuses a module that exports BOTH a
 * component and a plain value, because Fast Refresh cannot tell whether an edit
 * changed the component or the value. `HomeDesigns.tsx` exports four components,
 * and the registry that maps a design id to one of them is a plain object — so it
 * moved here. The registry still resolves to the same four components, and the
 * consumer imports the same name from this module, so behaviour is unchanged.
 */
import {
  HomeDesignA,
  HomeDesignB,
  HomeDesignC,
  HomeDesignD,
} from '@/components/marketing/home/HomeDesigns';

/** The design registry — one entry per supplied direction. */
export const HOMEPAGE_DESIGN_COMPONENTS = {
  'a-monolith': HomeDesignA,
  'b-grid': HomeDesignB,
  'c-signal': HomeDesignC,
  'd-mark': HomeDesignD,
} as const;
