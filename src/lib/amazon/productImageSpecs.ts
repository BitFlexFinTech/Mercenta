/**
 * §Stage-25 — Amazon product image specifications.
 * Based on Amazon's published image requirements for the UK retail channel.
 * Shared source of truth — used by Catalog Manager for image compliance checks.
 */
export const AMAZON_IMAGE_SPECS = {
  main: {
    label: 'Main Product Image',
    description: 'Hero image on the product detail page and search results.',
    requirements: [
      { id: 'bg_white', label: 'Pure white background (RGB 255,255,255)', severity: 'error' },
      { id: 'size_1000', label: 'At least 1000 px on the longest side', severity: 'error' },
      { id: 'fill_85', label: 'Product fills at least 85% of the image frame', severity: 'error' },
      { id: 'no_text', label: 'No text, logos, watermarks, or graphics overlaid', severity: 'error' },
      { id: 'no_other_products', label: 'No other products, accessories, or props', severity: 'error' },
      { id: 'jpg_preferred', label: 'JPEG format preferred (PNG, TIFF, GIF accepted)', severity: 'warning' },
      { id: 'sRGB', label: 'sRGB colour profile recommended', severity: 'warning' },
    ],
  },
  alternate: {
    label: 'Alternate Images (Alt 1–6)',
    description: 'Up to 6 additional views accessible via image gallery.',
    requirements: [
      { id: 'alt_size_1000', label: 'At least 1000 px on the longest side', severity: 'error' },
      { id: 'alt_show_product', label: 'Clearly show the product or its features', severity: 'error' },
      { id: 'alt_no_text', label: 'No promotional text, logos, or watermarks', severity: 'error' },
      { id: 'alt_white_or_context', label: 'White background or contextual lifestyle setting', severity: 'warning' },
    ],
  },
  lifestyle: {
    label: 'Lifestyle Image',
    description: 'Shows the product in use in a real-world setting.',
    requirements: [
      { id: 'ls_natural', label: 'Natural setting — product in use by a model or in context', severity: 'error' },
      { id: 'ls_1000', label: 'At least 1000 px on the longest side', severity: 'error' },
      { id: 'ls_no_overlay', label: 'No text overlays or promotional badges', severity: 'error' },
    ],
  },
  packaging: {
    label: 'Packaging Shot',
    description: 'Shows the product packaging as the customer receives it.',
    requirements: [
      { id: 'pkg_visible', label: 'Packaging fully visible and readable', severity: 'error' },
      { id: 'pkg_1000', label: 'At least 1000 px on the longest side', severity: 'error' },
    ],
  },
  general: {
    label: 'General Requirements',
    description: 'Apply to all product images on the retail channel.',
    requirements: [
      { id: 'gen_zoom', label: '1000+ px enables zoom-on-hover feature', severity: 'info' },
      { id: 'gen_9_max', label: 'Maximum 9 images per product (1 main + 8 alternates)', severity: 'info' },
      { id: 'gen_consistent', label: 'Consistent image style across a brand\'s catalogue', severity: 'info' },
    ],
  },
} as const;

export type ImageSpecSeverity = 'error' | 'warning' | 'info';

export interface ImageSpec {
  label: string;
  description: string;
  requirements: { id: string; label: string; severity: ImageSpecSeverity }[];
}

export function getImageSpecsForTab(tabId: string): ImageSpec | null {
  const map: Record<string, keyof typeof AMAZON_IMAGE_SPECS> = {
    main: 'main',
    alt1: 'alternate',
    alt2: 'alternate',
    alt3: 'alternate',
    alt4: 'alternate',
    alt5: 'alternate',
    alt6: 'alternate',
    lifestyle: 'lifestyle',
    packaging: 'packaging',
  };
  const key = map[tabId];
  return key ? (AMAZON_IMAGE_SPECS[key] as unknown as ImageSpec) : null;
}