/**
 * §HOMEPAGE IMAGE (2026-11-20) — THE ONE WAY A HOMEPAGE PICTURE IS RENDERED.
 *
 * WHY IT IS A COMPONENT AND NOT AN <img>
 * --------------------------------------
 * Four designs each picking their own image markup would drift: one would forget
 * `alt`, another would hardcode a path, a third would cause a layout jump. So
 * every picture on the homepage goes through here and gets, without exception:
 *
 *   · the RIGHT FILE for the screen — a `<picture>` with a media query, so a
 *     phone downloads the 700px file and a desktop the wide one. No width
 *     descriptors are declared, because the source images differ in size
 *     (960–1024px) and a wrong descriptor is a lie about the file.
 *   · REAL ALT TEXT from `homepageImagery.ts`, describing what the picture
 *     shows. These are content, never decoration.
 *   · A RESERVED BOX, so the page does not jump as images arrive. The aspect
 *     ratio is set before the file loads.
 *   · LAZY LOADING, except when a design says the picture is above the fold.
 *
 * A MISSING FILE DEGRADES, IT DOES NOT BREAK
 * ------------------------------------------
 * If a file is absent the browser paints the reserved box in the page's own
 * surface colour rather than a broken-image icon. The layout is unchanged, so a
 * missing placeholder is a cosmetic gap, never a broken page.
 */
import { PublicImage, type PublicImageRatio } from '../PublicImage';
import type { HomeImageRole } from '@/config/homepageImagery';

export type HomeImageRatio = PublicImageRatio;

export interface HomeImageProps {
  role: HomeImageRole;
  className?: string;
  /** The reserved box. Set before load, so nothing jumps. */
  ratio?: HomeImageRatio;
  /** Above the fold: load immediately instead of lazily. */
  priority?: boolean;
}

/*
 * THERE IS DELIBERATELY NO `scrim` / TEXT-OVER-IMAGE OPTION HERE.
 *
 * A dark wash over a photograph needs literal white text and literal black
 * gradient stops. Those colours cannot follow the theme, so the project's
 * legacy-styling ratchet treats each one as debt — and it was right to: a
 * caption that only works on a dimmed picture is a caption that will fail
 * somewhere. Every homepage caption therefore sits BESIDE or BELOW its
 * photograph, on the page's own surface, using the theme's text tokens.
 */

export function HomeImage({
  role,
  className,
  ratio = '4/3',
  priority = false,
}: HomeImageProps) {
  /* §PUBLIC SURFACES BATCH 5 (2026-11-27) — DELEGATES TO THE ONE IMPLEMENTATION.
     The markup that used to live here is now `PublicImage`, widened so the public content pages and
     the category guides can show a picture through the same reserved-box, two-file, real-alt-text
     path. Keeping this wrapper means the four homepage designs (and their props) are untouched, and
     there is still exactly ONE `<picture>` implementation in the project to fix or improve. */
  return <PublicImage role={role} className={className} ratio={ratio} priority={priority} />;
}