/**
 * §BRAND REDESIGN (2026-11-19) — THE APPROVED MERCENTA LOCKUP, APPEARANCE-AWARE.
 *
 * WHY THIS EXISTS (the defect it closes)
 * --------------------------------------
 * The footer rendered ONE asset — the approved transparent DARK master (a WHITE
 * wordmark) — on every background. On the light appearance that is a white
 * wordmark on a white footer: invisible. The brand guidelines require both
 * variants ("provide both dark and light variants; geometry must remain
 * identical, with only the intended foreground/background inversion").
 *
 * Both variants are the APPROVED OUTLINED MASTERS, copied verbatim. Nothing is
 * redrawn, recoloured or approximated, and the tagline geometry (starts beneath
 * the M, ends in line with the final A) is the master's own — because the tagline
 * is part of the outlined artwork, not typed text.
 */
import { useOptionalTheme } from '@/context/ThemeContext';
import { BRAND_NAME } from '@/config/brand';
import lockupDark from '@/assets/mercenta-logo-lockup.svg';
import lockupLight from '@/assets/mercenta-logo-lockup-light.svg';

export function BrandLockup({
  className,
  alt,
  variant,
}: {
  className?: string;
  alt?: string;
  variant?: 'dark' | 'light';
}) {
  /* §SAFE READ — `useOptionalTheme` returns null outside the provider, so an
     export/harness path cannot crash. The documented default is brand-dark. */
  const theme = useOptionalTheme();
  const isDark = variant ? variant === 'dark' : (theme ? theme.isDark : true);
  return (
    <img
      src={isDark ? lockupDark : lockupLight}
      alt={alt ?? `${BRAND_NAME} — Global Brands. UK Distribution. Smarter Growth.`}
      className={className}
    />
  );
}
