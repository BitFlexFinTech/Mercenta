export interface BrandMediaEntry {
  logoUrl?: string;
  imageUrl: string;
  imageCredit: string;
  isLogoMark?: boolean;
}

export interface ProductMediaEntry {
  image: string;
  imageCredit: string;
}

function normKey(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

export const BRAND_MEDIA_BY_ID: Record<string, BrandMediaEntry> = {
  'brd-speed-store': {
    logoUrl: '/images/brands/speed-store.jpg',
    imageUrl: '/images/brands/speed-store.jpg',
    imageCredit: 'Official iShowSpeed Storefront (speed.store)',
  },
  'brd-prime': {
    logoUrl: '/images/brands/prime-hydration.png',
    imageUrl: '/images/products/prime-ksi-nightmare.png',
    imageCredit: 'Official Prime Hydration UK (drinkprime.uk)',
    isLogoMark: true,
  },
  'brd-feastables': {
    logoUrl: '/images/brands/feastables.jpg',
    imageUrl: '/images/brands/feastables.jpg',
    imageCredit: 'Official Feastables Storefront (feastables.com)',
  },
  'brd-rem-beauty': {
    logoUrl: '/images/brands/rem-beauty.png',
    imageUrl: '/images/brands/rem-beauty.png',
    imageCredit: 'Official r.e.m. beauty Catalogue (rembeauty.com)',
  },
  'brd-florence': {
    logoUrl: '/images/brands/florence-by-mills.jpg',
    imageUrl: '/images/brands/florence-by-mills.jpg',
    imageCredit: 'Official Florence by Mills (florencebymillsbeauty.com)',
  },
  'brd-cecred': {
    logoUrl: '/images/brands/cecred.jpg',
    imageUrl: '/images/brands/cecred.jpg',
    imageCredit: 'Official Cécred Collection (cecred.com)',
  },
  'brd-the-outset': {
    logoUrl: '/images/brands/the-outset.png',
    imageUrl: '/images/brands/the-outset.png',
    imageCredit: 'Official The Outset Storefront (theoutset.com)',
    isLogoMark: true,
  },
  'brd-once-upon-farm': {
    logoUrl: '/images/brands/once-upon-a-farm.jpg',
    imageUrl: '/images/brands/once-upon-a-farm.jpg',
    imageCredit: 'Official Once Upon a Farm (onceuponafarmorganics.com)',
  },
  'brd-unwell': {
    logoUrl: '/images/brands/unwell-hydration.png',
    imageUrl: '/images/brands/unwell-hydration.png',
    imageCredit: 'Official Unwell Hydration (drinkunwell.com)',
  },
  'brd-juni': {
    logoUrl: '/images/brands/drink-juni.png',
    imageUrl: '/images/brands/drink-juni.png',
    imageCredit: 'Official DrinkJuni Storefront (drinkjuni.com)',
  },
  'brd-pleasing': {
    logoUrl: '/images/brands/pleasing.jpg',
    imageUrl: '/images/brands/pleasing.jpg',
    imageCredit: 'Official Pleasing Storefront (pleasing.com)',
  },
  'brd-draper-james': {
    logoUrl: '/images/brands/draper-james.jpg',
    imageUrl: '/images/brands/draper-james.jpg',
    imageCredit: 'Official Draper James Storefront (draperjames.com)',
  },
  'brd-cr7': {
    logoUrl: '/images/brands/cr7.png',
    imageUrl: '/images/products/cr7-discovery-set.jpg',
    imageCredit: 'Official CR7 Fragrances (cr7fragrances.store)',
    isLogoMark: true,
  },
  'brd-curry-brand': {
    logoUrl: '/images/brands/curry-brand.png',
    imageUrl: '/images/products/curry-basketball-shoe.jpg',
    imageCredit: 'Under Armour / Curry Brand Official',
    isLogoMark: true,
  },
  'brd-sweet-tooth': {
    logoUrl: '/images/brands/sweet-tooth.jpg',
    imageUrl: '/images/brands/sweet-tooth.jpg',
    imageCredit: 'Fragrance by Sabrina Official (fragrancebysabrina.com)',
  },
  'brd-aviation-gin': {
    logoUrl: '/images/brands/aviation-gin.png',
    imageUrl: '/images/products/aviation-gin-bottle.webp',
    imageCredit: 'Aviation American Gin Official (aviationgin.com)',
    isLogoMark: true,
  },
  'brd-mythical': {
    logoUrl: '/images/brands/mythical.png',
    imageUrl: '/images/brands/mythical.png',
    imageCredit: 'Official Mythical Entertainment Store (mythical.com)',
  },
  'brd-hanx': {
    logoUrl: '/images/brands/hanx-for-our-troops.png',
    imageUrl: '/images/brands/hanx-for-our-troops.png',
    imageCredit: 'Official Hanx For Our Troops (givehanks.com)',
  },
};

export const BRAND_MEDIA_BY_KEY: Record<string, BrandMediaEntry> = {
  ishowspeedofficialmerch: BRAND_MEDIA_BY_ID['brd-speed-store'],
  ishowspeedofficialmerchspeedstore: BRAND_MEDIA_BY_ID['brd-speed-store'],
  primehydration: BRAND_MEDIA_BY_ID['brd-prime'],
  feastables: BRAND_MEDIA_BY_ID['brd-feastables'],
  rembeauty: BRAND_MEDIA_BY_ID['brd-rem-beauty'],
  florencebymills: BRAND_MEDIA_BY_ID['brd-florence'],
  cecred: BRAND_MEDIA_BY_ID['brd-cecred'],
  theoutset: BRAND_MEDIA_BY_ID['brd-the-outset'],
  onceuponafarm: BRAND_MEDIA_BY_ID['brd-once-upon-farm'],
  unwellhydration: BRAND_MEDIA_BY_ID['brd-unwell'],
  junisparklingtea: BRAND_MEDIA_BY_ID['brd-juni'],
  pleasing: BRAND_MEDIA_BY_ID['brd-pleasing'],
  draperjames: BRAND_MEDIA_BY_ID['brd-draper-james'],
  cr7lifestylefragrances: BRAND_MEDIA_BY_ID['brd-cr7'],
  currybrand: BRAND_MEDIA_BY_ID['brd-curry-brand'],
  currybrandunderarmour: BRAND_MEDIA_BY_ID['brd-curry-brand'],
  sweettoothfragrances: BRAND_MEDIA_BY_ID['brd-sweet-tooth'],
  aviationamericangin: BRAND_MEDIA_BY_ID['brd-aviation-gin'],
  mythicalentertainmentstore: BRAND_MEDIA_BY_ID['brd-mythical'],
  hanxforourtroops: BRAND_MEDIA_BY_ID['brd-hanx'],

  // Dynamic Discovery Recipe Brands
  lancome: {
    logoUrl: '/images/brands/lancome.png',
    imageUrl: '/images/products/lancome-perfume.jpg',
    imageCredit: 'Lancôme Official / Wikimedia Commons',
    isLogoMark: true,
  },
  onrunning: {
    logoUrl: '/images/brands/on-running.jpg',
    imageUrl: '/images/brands/on-running.jpg',
    imageCredit: 'On Cloud Running / Wikimedia Commons',
  },
  nike: {
    logoUrl: '/images/brands/nike.png',
    imageUrl: '/images/products/nike-mercurial.jpg',
    imageCredit: 'Nike Official / Wikimedia Commons',
    isLogoMark: true,
  },
  burberry: {
    logoUrl: '/images/brands/burberry.png',
    imageUrl: '/images/brands/burberry.png',
    imageCredit: 'Burberry UK / Wikimedia Commons',
    isLogoMark: true,
  },
  laneige: {
    logoUrl: '/images/brands/laneige.jpg',
    imageUrl: '/images/brands/laneige.jpg',
    imageCredit: 'Laneige Official Catalogue (us.laneige.com)',
  },
  syrnfordheritagecapsule: {
    logoUrl: '/images/brands/syrn.jpg',
    imageUrl: '/images/brands/syrn.jpg',
    imageCredit: 'SYRN Official Catalogue (syrn.com)',
  },
  newbalance: {
    logoUrl: '/images/brands/new-balance.png',
    imageUrl: '/images/products/new-balance-2002r.jpg',
    imageCredit: 'New Balance Official / Wikimedia Commons',
    isLogoMark: true,
  },
  beatsbydre: {
    logoUrl: '/images/brands/beats-by-dre.png',
    imageUrl: '/images/products/beats-studio-pro.jpg',
    imageCredit: 'Beats by Dre Official (beatsbydre.com)',
    isLogoMark: true,
  },
  louisvuitton: {
    logoUrl: '/images/brands/louis-vuitton.png',
    imageUrl: '/images/products/lv-handbag.jpg',
    imageCredit: 'Louis Vuitton / Wikimedia Commons',
    isLogoMark: true,
  },
  adidas: {
    logoUrl: '/images/brands/adidas.png',
    imageUrl: '/images/products/adidas-gazelle.jpg',
    imageCredit: 'Adidas Official / Wikimedia Commons',
    isLogoMark: true,
  },
  charlixcxofficialstorebratukmerch: {
    logoUrl: '/images/brands/charli-xcx-store.png',
    imageUrl: '/images/brands/charli-xcx-store.png',
    imageCredit: 'Official Charli XCX Store (store.charlixcx.com)',
  },
  maisonno9: {
    logoUrl: '/images/brands/maison-no-9.jpg',
    imageUrl: '/images/brands/maison-no-9.jpg',
    imageCredit: 'Maison No. 9 Official (maison9wine.com)',
  },
};

export const PRODUCT_MEDIA_BY_ID: Record<string, ProductMediaEntry> = {
  'dprd-01': {
    image: '/images/products/speed-hoodie.jpg',
    imageCredit: 'speed.store Shooting Star Pullover Product Photo',
  },
  'dprd-02': {
    image: '/images/products/feastables-milk-pack.png',
    imageCredit: 'Feastables Milk Chocolate Packshot (feastables.com)',
  },
  'dprd-03': {
    image: '/images/products/rem-eyeliner-duo.png',
    imageCredit: 'r.e.m. beauty Artistry Product Shot (rembeauty.com)',
  },
  'dprd-04': {
    image: '/images/products/florence-suite-trio.jpg',
    imageCredit: 'Florence by Mills Product Shot (florencebymillsbeauty.com)',
  },
  'dprd-05': {
    image: '/images/products/cecred-ritual-shampoo.jpg',
    imageCredit: 'Cécred Hydrating Shampoo Product Shot (cecred.com)',
  },
  'dprd-06': {
    image: '/images/products/the-outset-kit.png',
    imageCredit: 'The Outset Official Brand Asset (theoutset.com)',
  },
  'dprd-07': {
    image: '/images/products/unwell-watermelon.png',
    imageCredit: 'Unwell Hydration Bottle Packshot (drinkunwell.com)',
  },
  'dprd-08': {
    image: '/images/products/juni-pack.png',
    imageCredit: 'Juni Variety Pack Product Shot (drinkjuni.com)',
  },
  'dprd-09': {
    image: '/images/products/pleasing-fragrance-bundle.jpg',
    imageCredit: 'Pleasing Gift & Fragrance Set (pleasing.com)',
  },
  'dprd-10': {
    image: '/images/products/sabrina-cherry-baby.png',
    imageCredit: 'Fragrance by Sabrina Official Packshot (fragrancebysabrina.com)',
  },
  'dprd-11': {
    image: '/images/products/cr7-discovery-set.jpg',
    imageCredit: 'CR7 Fragrances Gift Set Packshot (cr7fragrances.store)',
  },
  'dprd-12': {
    image: '/images/products/ouaf-blueberry-pw.png',
    imageCredit: 'Once Upon a Farm Packshot (onceuponafarmorganics.com)',
  },
  // Newly added flagship product records for seeded brands that previously lacked products
  'dprd-13': {
    image: '/images/products/prime-ksi-nightmare.png',
    imageCredit: 'Prime Hydration UK 500ml KSI Edition (drinkprime.uk)',
  },
  'dprd-14': {
    image: '/images/products/draper-james-denim-jacket.jpg',
    imageCredit: 'Draper James Apparel Product Photo (draperjames.com)',
  },
  'dprd-15': {
    image: '/images/products/curry-basketball-shoe.jpg',
    imageCredit: 'Under Armour Performance Basketball Footwear (Wikimedia Commons)',
  },
  'dprd-16': {
    image: '/images/products/aviation-gin-bottle.webp',
    imageCredit: 'Aviation American Gin Bottle Campaign (aviationgin.com)',
  },
  'dprd-17': {
    image: '/images/products/mythical-rocks-glass.png',
    imageCredit: 'Mythical Official Store Drinkware (mythical.com)',
  },
  'dprd-18': {
    image: '/images/products/hanx-coffee-bag.png',
    imageCredit: 'Hanx For Our Troops Ground Coffee (givehanks.com)',
  },
  'dprd-19': {
    image: '/images/products/speed-fwc-tee.png',
    imageCredit: 'speed.store Collector Jersey Tee (speed.store)',
  },
  'dprd-20': {
    image: '/images/products/feastables-pb-cups.png',
    imageCredit: 'Feastables Peanut Butter Cups Share Bag (feastables.com)',
  },
  'dprd-21': {
    image: '/images/products/cr7-energy-giftset.jpg',
    imageCredit: 'CR7 Energy 100ml Gift Set (cr7fragrances.store)',
  },
};

export function resolveBrandMedia(brand: {
  id?: string;
  name?: string;
  normalizedName?: string;
  logoUrl?: string;
  imageUrl?: string;
  imageCredit?: string;
}): BrandMediaEntry | undefined {
  if (brand.id && BRAND_MEDIA_BY_ID[brand.id]) {
    return BRAND_MEDIA_BY_ID[brand.id];
  }
  const candidateKeys = [
    brand.normalizedName ? normKey(brand.normalizedName) : '',
    brand.name ? normKey(brand.name) : '',
  ].filter(Boolean);
  for (const k of candidateKeys) {
    if (BRAND_MEDIA_BY_KEY[k]) return BRAND_MEDIA_BY_KEY[k];
  }
  if (brand.imageUrl || brand.logoUrl) {
    return {
      logoUrl: brand.logoUrl,
      imageUrl: brand.imageUrl || brand.logoUrl || '',
      imageCredit: brand.imageCredit || 'Official Brand Visual',
    };
  }
  return undefined;
}

export function resolveProductMediaByKeywords(
  brandNameOrId: string,
  productTitle: string
): ProductMediaEntry | undefined {
  const hay = `${brandNameOrId} ${productTitle}`.toLowerCase();
  if (hay.includes('lancome') || hay.includes('lancôme')) {
    return {
      image: '/images/products/lancome-perfume.jpg',
      imageCredit: 'Lancôme Fragrance Product Archive (Wikimedia Commons)',
    };
  }
  if (hay.includes('on ×') || hay.includes('on running') || hay.includes('cloudzone')) {
    return {
      image: '/images/products/on-cloud-shoes.jpg',
      imageCredit: 'On Cloud Performance Running Footwear (Wikimedia Commons)',
    };
  }
  if (hay.includes('nike') || hay.includes('mercurial')) {
    return {
      image: '/images/products/nike-mercurial.jpg',
      imageCredit: 'Nike Mercurial Football Boot (Wikimedia Commons)',
    };
  }
  if (hay.includes('burberry')) {
    return {
      image: '/images/products/burberry-house.jpg',
      imageCredit: 'Burberry UK Heritage Reference (Wikimedia Commons)',
    };
  }
  if (hay.includes('laneige')) {
    return {
      image: '/images/products/laneige-cream-skin.jpg',
      imageCredit: 'Laneige Official Skincare Packshot (us.laneige.com)',
    };
  }
  if (hay.includes('syrn') || hay.includes('workwear') || hay.includes('ford')) {
    return {
      image: '/images/products/syrn-lace.jpg',
      imageCredit: 'Sydney Sweeney / SYRN Collection Product Photo (syrn.com)',
    };
  }
  if (hay.includes('new balance') || hay.includes('ohtani')) {
    return {
      image: '/images/products/new-balance-2002r.jpg',
      imageCredit: 'New Balance Footwear Reference (Wikimedia Commons)',
    };
  }
  if (hay.includes('beats') || hay.includes('studio pro')) {
    return {
      image: '/images/products/beats-studio-pro.jpg',
      imageCredit: 'Beats Studio Pro Official Hardware Shot (beatsbydre.com)',
    };
  }
  if (hay.includes('louis vuitton')) {
    return {
      image: '/images/products/lv-handbag.jpg',
      imageCredit: 'Louis Vuitton Boutique Display (Wikimedia Commons)',
    };
  }
  if (hay.includes('adidas') || hay.includes('gazelle')) {
    return {
      image: '/images/products/adidas-gazelle.jpg',
      imageCredit: 'Adidas Gazelle Footwear (Wikimedia Commons)',
    };
  }
  if (hay.includes('charli') || hay.includes('brat')) {
    return {
      image: '/images/products/charli-hoodie.png',
      imageCredit: 'Official Charli XCX Store Apparel (store.charlixcx.com)',
    };
  }
  if (hay.includes('maison no. 9') || hay.includes('rosé') || hay.includes('rose')) {
    return {
      image: '/images/products/maison9-rose.jpg',
      imageCredit: 'Maison No. 9 Official Visual (maison9wine.com)',
    };
  }
  if (hay.includes('fruit tree')) {
    return {
      image: '/images/talent/emma-stone.jpg',
      imageCredit: 'Emma Stone · Fruit Tree Productions Reference',
    };
  }
  return undefined;
}
