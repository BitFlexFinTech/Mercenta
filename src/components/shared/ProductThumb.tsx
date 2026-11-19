import { Package } from 'lucide-react';
import { cn } from '@/utils/cn';

type ProductThumbSource = {
  name: string;
  image?: string;
  /** The only field this primitive reads from the image set. */
  productImages?: { url: string }[];
};

/**
 * §Wave-3 Part 3 — the SINGLE OWNER for rendering a product's image anywhere in
 * the app. Two surfaces previously duplicated this logic (ProductCatalog and
 * LogisticsHub), and one of them (ProductCatalog) painted the raw `image` value
 * as literal text: for a seeded demo product that value is a URL
 * (`https://picsum.photos/…`), which overflowed its 32px box as garbled
 * overlapping text instead of showing an image.
 *
 * Canonical source of the image, in order:
 *   1. `productImages[0].url` — the Amazon image set (§Batch-21);
 *   2. `image` — the legacy main image (a URL for seeded products, or an
 *      emoji/glyph for bootstrap products).
 *
 * A URL or data-URI renders as an <img>; a glyph renders as text; nothing
 * renders as the neutral package icon. A URL is NEVER painted as text.
 */
export function ProductThumb({
  product,
  size = 40,
  className,
}: {
  product: ProductThumbSource;
  size?: number;
  className?: string;
}) {
  const candidate = product.productImages?.[0]?.url || product.image;
  const isRenderableUrl =
    typeof candidate === 'string' && /^(https?:\/\/|data:image\/)/i.test(candidate);

  /**
   * §Wave-3 Part 3.1 (§BATCH 6, 2026-10-10) — the PLACEHOLDER must SCALE with the
   * box. Both of its sizes used to be hard-coded (`text-lg` = 18px for the glyph,
   * `h-5 w-5` = 20px for the neutral icon), so they did not track `size` at all:
   * the owner's enlargement of the catalogue thumbnail to 64px would have painted
   * a 20px icon adrift inside a 64px tile.
   *
   * The ratios are chosen to reproduce the previously shipped sizes EXACTLY at the
   * size BrandInventory renders (32px → 18px glyph / 20px icon), so no surface that
   * was not asked to change moves; a 64px tile now gets a 36px glyph / 40px icon.
   */
  const glyphPx = Math.round(size * 0.5625);
  const iconPx = Math.round(size * 0.625);

  if (isRenderableUrl) {
    return (
      <img
        src={candidate}
        alt={product.name}
        style={{ width: size, height: size }}
        className={cn('shrink-0 rounded-ds-sm bg-tint object-cover', className)}
      />
    );
  }

  return (
    <span
      style={{ width: size, height: size, fontSize: glyphPx, lineHeight: 1 }}
      aria-hidden="true"
      className={cn(
        'flex shrink-0 items-center justify-center rounded-ds-sm bg-tint',
        className
      )}
    >
      {candidate ? candidate : <Package style={{ width: iconPx, height: iconPx }} className="text-zinc-500" />}
    </span>
  );
}
