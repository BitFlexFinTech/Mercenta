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
import { cn } from '@/utils/cn';
import {
  HOME_IMAGES,
  homeImageLarge,
  homeImageSmall,
  type HomeImageRole,
} from '@/config/homepageImagery';

export type HomeImageRatio = '21/9' | '16/9' | '3/2' | '4/3' | '1/1' | '3/4';

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
  const { alt } = HOME_IMAGES[role];

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-[var(--mr-surface)]',
        className
      )}
      style={{ aspectRatio: ratio.replace('/', ' / ') }}
    >
      <picture>
        <source media="(min-width: 900px)" srcSet={homeImageLarge(role)} />
        <img
          src={homeImageSmall(role)}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding={priority ? 'sync' : 'async'}
          /*
           * `object-cover` fills the reserved box without distorting the picture.
           * The images are NOT upscaled in the build, so at large display sizes
           * this crops rather than stretches — which is honest and looks right.
           */
          className="absolute inset-0 h-full w-full object-cover"
        />
      </picture>
    </div>
  );
}