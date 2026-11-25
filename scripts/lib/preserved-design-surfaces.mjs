/**
 * §LOVABLE SOURCE TRANSFER (2026-11-23; declared 2026-11-25) — THE ONE DECLARATION OF
 * THE PRESERVED DESIGN SURFACES.
 *
 * WHY THIS FILE EXISTS (standing rules 03, 07 and 10)
 * ---------------------------------------------------
 * The Lovable Concept 3 homepage arrived as SOURCE rather than as a recreation, and it
 * carries its own type scale, its own radius/elevation system and its own
 * ink/paper/signal palette. Those choices ARE the design, so the product's token gates
 * must not count them — which means more than one validator needs to know the same set
 * of paths.
 *
 * Each of them used to hold its OWN copy of that list. Three hand-maintained copies of
 * one fact is the defect rule 03 forbids, and they had already drifted: two still named
 * `src/assets/images/`, a directory that no longer exists, so two gates went on
 * excluding a path that was gone while the third would have kept counting it. A fourth
 * path added to one copy would silently not apply to the others. This module is the ONE
 * author, and `scripts/validate-preserved-design-surfaces.mjs` pins it.
 *
 * WHAT MAY BE LISTED HERE — AND WHAT MAY NOT
 * ------------------------------------------
 * A path belongs here ONLY when the repository holds the ORIGINAL delivered source file.
 * It is NOT a way to keep newly-written product code out of the gates:
 *   · `src/components/ads/` is deliberately ABSENT. The Ads Management screen is wired
 *     into the admin and brand shells and was repointed onto the declared scale in the
 *     same change that created this module.
 *   · `src/assets/images/` is deliberately ABSENT: it was a byte-identical second copy of
 *     the manifests that sit beside the components they came with, and the duplicate was
 *     removed rather than kept as a second source of the same fact.
 * Adding a path is a reviewable act, not an edit: the gate fails if this set grows.
 */
import path from 'node:path';

/** The preserved design surfaces, as workspace-relative POSIX paths. */
export const PRESERVED_DESIGN_SURFACES = Object.freeze([
  /** The original Lovable components and the asset manifests delivered with them. */
  'src/components/lovable/',
  /** The original Lovable copy (TAGLINE, NAV, INFRASTRUCTURE, CATEGORIES, …). */
  'src/content/',
  /** The original Lovable Concept 3 homepage module, delivered whole. */
  'src/components/marketing/home/DesignE.tsx',
]);

/**
 * True when a workspace-relative path is part of the preserved design source.
 * @param {string} rel a path relative to the repository root, using `/` separators
 * @returns {boolean}
 */
export function isPreservedDesignSurface(rel) {
  return PRESERVED_DESIGN_SURFACES.some((entry) =>
    entry.endsWith('/') ? rel.startsWith(entry) : rel === entry
  );
}

/** The absolute path of every declared surface, for the gate's existence check. */
export function preservedSurfacePaths(root) {
  return PRESERVED_DESIGN_SURFACES.map((entry) => path.resolve(root, entry));
}
