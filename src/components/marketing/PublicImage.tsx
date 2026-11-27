/**
 * §PUBLIC SURFACES BATCH 5 (2026-11-27) — THE ONE WAY A PUBLIC PICTURE IS RENDERED.
 *
 * `HomeImage` already solved the real problems of showing a photograph (a reserved box so nothing
 * jumps, the right file for the screen, alt text from the owner, lazy loading). The public content
 * pages and the category guides need exactly that behaviour, so this is the SAME implementation
 * widened to every public picture role rather than a second one that would drift.
 *
 * `HomeImage` now delegates here, which is why there is one `<picture>` in the project and not two.
 *
 * NO TEXT OVER A PICTURE, for the same reason `HomeImage` documents: a caption placed on a
 * photograph needs literal white text and black gradient stops, which cannot follow the theme. A
 * caption here therefore sits BELOW the picture, on the page's own surface, using the theme's tokens.
 *
 * A MISSING FILE DEGRADES, IT DOES NOT BREAK: the box is painted in the page's own surface colour and
 * the layout is unchanged. Because that failure is SILENT, a gate has to catch it, and
 * `scripts/validate-public-page-standard.mjs` (assertion S8) does: it asserts that every role any
 * page names — its `hero` and every block `media` — is declared in the imagery owner
 * (`src/config/homepageImagery.ts`) AND has both files on disk.
 *
 * §CORRECTED 2026-11-27 (BATCH 5 PART 2) — THIS COMMENT NAMED THE WRONG GATE. It said
 * `validate-public-chrome.mjs` asserted it. That check has never read an image role: it counts
 * `<header>`, `<footer>` and `<PublicNav>` occurrences, so a page naming a picture whose file was
 * never fetched rendered an empty box while every gate passed. The claim was false from the day it
 * was written; the assertion now genuinely exists, in the file named above.
 */
import { cn } from '@/utils/cn';
import {
  PUBLIC_IMAGES,
  homeImageLarge,
  homeImageSmall,
  type PublicImageRole,
} from '@/config/homepageImagery';

export type PublicImageRatio = '21/9' | '16/9' | '3/2' | '4/3' | '1/1' | '3/4';

export interface PublicImageProps {
  role: PublicImageRole;
  className?: string;
  /** The reserved box. Set before load, so nothing jumps. */
  ratio?: PublicImageRatio;
  /** Above the fold: load immediately instead of lazily. */
  priority?: boolean;
  /** Rendered BELOW the picture, on the page surface — never laid over the image. */
  caption?: string;
}

export function PublicImage({
  role,
  className,
  ratio = '4/3',
  priority = false,
  caption,
}: PublicImageProps) {
  const { alt } = PUBLIC_IMAGES[role];

  const picture = (
    <div
      className={cn('relative overflow-hidden bg-[var(--mr-surface)]', className)}
      style={{ aspectRatio: ratio.replace('/', ' / ') }}
    >
      <picture>
        <source media="(min-width: 900px)" srcSet={homeImageLarge(role)} />
        <img
          src={homeImageSmall(role)}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding={priority ? 'sync' : 'async'}
          className="absolute inset-0 h-full w-full object-cover"
        />
      </picture>
    </div>
  );

  if (!caption) return picture;

  return (
    <figure className={cn('flex flex-col gap-2', className)}>
      {picture}
      <figcaption className="text-ds-micro leading-relaxed text-[var(--mr-text-muted)]">
        {caption}
      </figcaption>
    </figure>
  );
}