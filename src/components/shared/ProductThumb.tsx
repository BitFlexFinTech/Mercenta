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

  if (isRenderableUrl) {
    return (
      <img
        src={candidate}
        alt={product.name}
        style={{ width: size, height: size }}
        className={cn('shrink-0 rounded-ds-sm bg-white/[0.06] object-cover', className)}
      />
    );
  }

  return (
    <span
      style={{ width: size, height: size }}
      aria-hidden="true"
      className={cn(
        'flex shrink-0 items-center justify-center rounded-ds-sm bg-white/[0.06] text-lg',
        className
      )}
    >
      {candidate ? candidate : <Package className="h-5 w-5 text-zinc-500" />}
    </span>
  );
}
