import {
  CatalogBlankProduct,
  CatalogBlankVariant,
  CatalogFilterGroup,
  ProductCategory,
} from '@/types/talent';

export const CATALOG_PRODUCTS: CatalogBlankProduct[] = [];

interface RawCatalogProduct {
  id: number;
  main_category_id?: number;
  type: string;
  type_name: string;
  title: string;
  brand: string | null;
  model: string | null;
  image: string;
  variant_count?: number;
  currency?: string;
  description?: string;
}

interface RawCatalogVariant {
  id: number;
  product_id: number;
  name: string;
  size: string;
  color: string;
  color_code?: string | null;
  image: string;
  price: string;
  in_stock: boolean;
  availability_regions?: Record<string, string>;
}

const USD_TO_GBP = 0.79;

function classifyRawProduct(raw: RawCatalogProduct): {
  filterGroup: Exclude<CatalogFilterGroup, 'All'>;
  category: ProductCategory;
  productionLine: CatalogBlankProduct['productionLine'];
} {
  const hay = `${raw.type} ${raw.type_name} ${raw.title}`.toLowerCase();

  if (hay.includes('jersey') || hay.includes('soccer') || hay.includes('football') || hay.includes('athletic') || raw.type === 'SUBLIMATION' || raw.type === 'CUT-SEW') {
    if (hay.includes('hoodie') || hay.includes('sweatshirt') || hay.includes('fleece') || hay.includes('jacket')) {
      return {
        filterGroup: 'Hoodies & Fleece',
        category: 'Hoodies',
        productionLine: 'UK All-Over-Print Matchday Line',
      };
    }
    if (hay.includes('bag') || hay.includes('backpack') || hay.includes('tote') || hay.includes('sock') || hay.includes('fanny')) {
      return {
        filterGroup: 'Accessories',
        category: 'Accessories',
        productionLine: 'UK All-Over-Print Matchday Line',
      };
    }
    return {
      filterGroup: 'Jerseys & Kits',
      category: 'Graphic T-Shirts',
      productionLine: 'UK All-Over-Print Matchday Line',
    };
  }

  if (hay.includes('hoodie') || hay.includes('sweatshirt') || hay.includes('fleece') || hay.includes('pullover') || hay.includes('crewneck') || hay.includes('jacket') || hay.includes('parka') || raw.type === 'KNITWEAR') {
    return {
      filterGroup: 'Hoodies & Fleece',
      category: 'Hoodies',
      productionLine: 'UK Apparel & Embroidery Hub',
    };
  }

  if (hay.includes('hat') || hay.includes('cap') || hay.includes('beanie') || hay.includes('visor') || hay.includes('bucket') || raw.type === 'EMBROIDERY') {
    return {
      filterGroup: 'Caps & Headwear',
      category: 'Caps & Headwear',
      productionLine: 'UK Apparel & Embroidery Hub',
    };
  }

  if (hay.includes('mug') || hay.includes('tumbler') || hay.includes('bottle') || hay.includes('water') || hay.includes('glass') || hay.includes('candle') || raw.type === 'MUG' || raw.type === 'DRINKWARE' || raw.type === 'CANDLE') {
    return {
      filterGroup: 'Drinkware & Lifestyle',
      category: 'Lifestyle Merchandise',
      productionLine: 'UK Local Print & Drinkware Hub',
    };
  }

  if (hay.includes('poster') || hay.includes('canvas') || hay.includes('print') || hay.includes('sticker') || hay.includes('puzzle') || hay.includes('postcard') || raw.type === 'POSTER' || raw.type === 'FRAMED-POSTER' || raw.type === 'CANVAS' || raw.type === 'STICKER' || raw.type === 'PUZZLE' || raw.type === 'POSTCARD') {
    return {
      filterGroup: 'Collectibles & Prints',
      category: 'Collectibles',
      productionLine: 'UK Archival Art & Collector Foundry',
    };
  }

  if (hay.includes('t-shirt') || hay.includes('tee') || hay.includes('shirt') || hay.includes('tank') || hay.includes('polo') || raw.type === 'T-SHIRT') {
    return {
      filterGroup: 'T-Shirts',
      category: 'Graphic T-Shirts',
      productionLine: 'UK Apparel & Embroidery Hub',
    };
  }

  return {
    filterGroup: 'Accessories',
    category: 'Accessories',
    productionLine: 'UK Local Print & Drinkware Hub',
  };
}

function sanitizeDescription(desc?: string): string {
  if (!desc) return 'UK-fulfilled production blank ready for Amazon UK Vendor Central custom branding.';
  return desc.replace(/printful/gi, 'UK Production Hub');
}

export function mapLiveCatalogProduct(raw: RawCatalogProduct): CatalogBlankProduct {
  const { filterGroup, category, productionLine } = classifyRawProduct(raw);
  const cleanTitle = raw.title.replace(/printful/gi, 'Studio');
  const skuCode = raw.model ? raw.model.replace(/[^a-zA-Z0-9\-| ]/g, '').slice(0, 18) : `SKU-${raw.id}`;

  return {
    id: `LIVE-${raw.id}`,
    liveProductId: raw.id,
    skuCode: skuCode || `SKU-${raw.id}`,
    title: cleanTitle,
    brandSpec: raw.brand ? `${raw.brand} · ${raw.type_name}` : raw.type_name,
    typeName: raw.type_name,
    filterGroup,
    category,
    productionLine,
    image: raw.image,
    description: sanitizeDescription(raw.description),
    fabricSummary: `${raw.type_name}${raw.brand ? ` · ${raw.brand}` : ''} · UK Hub Fulfilled`,
    variantCount: raw.variant_count ?? 1,
    variants: [],
  };
}

export async function fetchLiveCatalogProducts(): Promise<CatalogBlankProduct[]> {
  try {
    const liveRes = await fetch('/api/catalog-feed');
    if (liveRes.ok) {
      const contentType = liveRes.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const json = (await liveRes.json()) as { result?: RawCatalogProduct[] };
        if (Array.isArray(json.result) && json.result.length > 0) {
          return json.result.map(mapLiveCatalogProduct);
        }
      }
    }
  } catch {
    // Fallback to static live snapshot below
  }

  try {
    const snapRes = await fetch('/data/catalog-products.json');
    if (snapRes.ok) {
      const list = (await snapRes.json()) as RawCatalogProduct[];
      if (Array.isArray(list) && list.length > 0) {
        return list.map(mapLiveCatalogProduct);
      }
    }
  } catch {
    // Fallback to built-in catalog seeds
  }

  return CATALOG_PRODUCTS;
}

const variantCache = new Map<number, CatalogBlankVariant[]>();

function buildFallbackVariantsForLiveBlank(blank: CatalogBlankProduct): CatalogBlankVariant[] {
  const isApparel =
    blank.filterGroup === 'T-Shirts' ||
    blank.filterGroup === 'Jerseys & Kits' ||
    blank.filterGroup === 'Hoodies & Fleece';
  const sizes = isApparel ? ['S', 'M', 'L', 'XL', '2XL'] : ['One size'];
  const colors = [
    { name: 'Black', hex: '#141416' },
    { name: 'White', hex: '#F4F4F5' },
    { name: 'Crimson', hex: '#BC1F2F' },
  ];
  const baseGBP =
    blank.filterGroup === 'Hoodies & Fleece'
      ? 22.5
      : blank.filterGroup === 'Jerseys & Kits'
      ? 18.9
      : blank.filterGroup === 'T-Shirts'
      ? 10.8
      : 12.4;

  const list: CatalogBlankVariant[] = [];
  colors.forEach((c, ci) => {
    sizes.forEach((s, si) => {
      list.push({
        id: `${blank.id}-fb-${ci}-${si}`,
        productId: blank.id,
        size: s,
        color: c.name,
        colorHex: c.hex,
        image: blank.image,
        singleUnitCostGBP: Number((baseGBP + (s === '2XL' ? 1.8 : 0)).toFixed(2)),
        inStock: true,
        ukStatus: 'UK Hub In Stock',
      });
    });
  });
  return list;
}

export async function fetchLiveCatalogVariants(
  blank: CatalogBlankProduct
): Promise<CatalogBlankVariant[]> {
  if (blank.variants && blank.variants.length > 0) {
    return blank.variants;
  }
  if (!blank.liveProductId) {
    return buildFallbackVariantsForLiveBlank(blank);
  }
  const cached = variantCache.get(blank.liveProductId);
  if (cached) return cached;

  try {
    const res = await fetch(`/api/catalog-feed/${blank.liveProductId}`);
    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const json = (await res.json()) as {
          result?: { variants?: RawCatalogVariant[] };
        };
        const rawVars = json.result?.variants ?? [];
        if (rawVars.length > 0) {
          const mapped: CatalogBlankVariant[] = rawVars.map((v) => {
            const usd = Number(v.price) || 15;
            const gbp = Number((usd * USD_TO_GBP).toFixed(2));
            const hasUk = Boolean(v.availability_regions?.UK);
            return {
              id: String(v.id),
              productId: blank.id,
              size: v.size || 'One size',
              color: v.color || 'Standard',
              colorHex: v.color_code || '#18181B',
              image: v.image || blank.image,
              singleUnitCostGBP: gbp,
              inStock: v.in_stock,
              ukStatus: hasUk ? 'UK Hub In Stock' : 'UK Express Allocation',
            };
          });
          variantCache.set(blank.liveProductId, mapped);
          return mapped;
        }
      }
    }
  } catch {
    // Fallback below
  }

  return buildFallbackVariantsForLiveBlank(blank);
}

