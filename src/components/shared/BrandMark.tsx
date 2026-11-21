/**
 * §BRAND REDESIGN (2026-11-19) — THE APPROVED MERCENTA MARK, APPEARANCE-AWARE.
 *
 * WHY THIS COMPONENT EXISTS (a real defect it closes)
 * ---------------------------------------------------
 * The mark's two approved variants are WHITE-on-dark and BLACK-on-light (the
 * brand guidelines: "provide both dark and light variants; geometry must remain
 * identical, with only the intended foreground/background inversion").
 *
 * The first implementation pointed a single asset at the mark and used
 * `fill="currentColor"` to make it adapt. That does NOT work for an SVG loaded
 * through `<img>`: the image is an isolated document, so `currentColor` resolves
 * against the SVG's OWN root (black) and never against the host page. Measured
 * on the rendered homepage: the mark painted black on the black header — i.e.
 * invisible.
 *
 * So the variant is chosen HERE, from the live appearance, and the correct
 * asset is rendered. One component, one decision, every call site consistent.
 */
import { useOptionalTheme } from '@/context/ThemeContext';
import { BRAND_NAME } from '@/config/brand';
import markDark from '@/assets/mercenta-mark-dark-bg.svg';
import markLight from '@/assets/mercenta-mark-light-bg.svg';

export function BrandMark({ className, alt }: { className?: string; alt?: string }) {
  /* §SAFE READ: `useOptionalTheme` returns null outside the provider, so a
     harness or export path cannot crash. The documented default is brand-dark. */
  const theme = useOptionalTheme();
  const isDark = theme ? theme.isDark : true;
  return (
    <img
      src={isDark ? markDark : markLight}
      alt={alt ?? `${BRAND_NAME} mark`}
      className={className}
    />
  );
}
