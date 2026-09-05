/**
 * §12 — Homepage content model. Single source of truth for every editable
 * string/image slot on the public homepage.
 *
 * Home.tsx renders FROM this model (never hardcoded strings), the Super Admin
 * Homepage Editor edits a draft of it, and "Publish" promotes the draft to
 * the live copy. Icons are logical names resolved to components by Home.
 */

export type HomeIconName =
  | 'truck' | 'shield' | 'package' | 'trending'
  | 'target' | 'award' | 'check' | 'plane' | 'ship';

export interface HomeCardItem {
  /** Optional display label (route steps show a region name). */
  region?: string;
  title: string;
  description: string;
  /** Optional second line (route cards). */
  route?: string;
  icon?: HomeIconName;
  flag?: string;
}

export interface HomepageContent {
  hero: {
    eyebrow: string;
    headingStart: string;
    headingHighlight: string;
    subheading: string;
    primaryCta: string;
    secondaryCta: string;
    trustBadges: [string, string, string];
  };
  tracker: {
    reference: string;
    cargoLabel: string;
    freightMode: string;
    stages: { label: string; done: boolean }[];
  };
  about: {
    heading: string;
    subheading: string;
    points: HomeCardItem[];
  };
  services: {
    heading: string;
    subheading: string;
    cards: HomeCardItem[];
  };
  route: {
    heading: string;
    subheading: string;
    steps: HomeCardItem[];
  };
  finalCta: {
    heading: string;
    subheading: string;
    buttonLabel: string;
    stampLine1: string;
    stampLine2: string;
  };
}

export const DEFAULT_HOMEPAGE_CONTENT: HomepageContent = {
  hero: {
    eyebrow: 'Wholesale Distribution — United Kingdom',
    headingStart: 'From origin depot to',
    headingHighlight: 'UK retail shelf.',
    subheading:
      '{{brand}} purchases your inventory outright, clears UK customs, and delivers your products into direct UK retail placement — reaching the UK\'s largest national retail buyers through a single wholesale agreement. You focus on production; we carry the capital, compliance, and distribution risk.',
    primaryCta: 'Get Started',
    secondaryCta: 'Partner Login',
    trustBadges: ['EORI REGISTERED', 'UKCA COMPLIANT', 'HMRC DIRECT'],
  },
  tracker: {
    reference: 'BXB-2847',
    cargoLabel: 'Mixed Consumer Goods',
    freightMode: 'SEA FREIGHT',
    stages: [
      { label: 'Factory Intake', done: true },
      { label: 'In Transit', done: true },
      { label: 'UK Customs Cleared', done: true },
      { label: 'UK Retail Live', done: false },
    ],
  },
  about: {
    heading: 'Built for brands crossing borders',
    subheading: 'One wholesale partner from purchase order to UK placement.',
    points: [
      { title: 'Our Mission', description: 'Remove every barrier to UK market entry for premium American, European, and African brands.', icon: 'target' },
      { title: 'Compliance First', description: 'EORI, UKCA, and HMRC clearance handled end-to-end by our in-house UK trade team.', icon: 'award' },
      { title: 'Proven Playbook', description: 'A repeatable wholesale pipeline that moves goods from factory floor to UK retail shelves.', icon: 'check' },
    ],
  },
  services: {
    heading: 'Wholesale Distribution & Market Access',
    subheading: 'We purchase inventory wholesale and distribute through our UK network — you invoice us at Ex-Works and we handle everything downstream.',
    cards: [
      { title: 'Full-Service Freight Routing', description: 'End-to-end forwarding across DHL, FedEx, and BAK Logistics — from air courier parcels to heavy container freight through established trade corridors.', icon: 'truck' },
      { title: 'UK Trade Compliance', description: 'EORI, UKCA marking, and HMRC clearance managed in-house. We act as your exclusive UK Importer of Record and keep every shipment audit-ready.', icon: 'shield' },
      { title: 'Wholesale Procurement', description: 'We purchase your inventory wholesale at Ex-Works pricing and carry the capital, customs, and distribution risk on your behalf.', icon: 'package' },
      { title: 'Direct UK Retail Placement', description: 'Structured distribution into direct UK retail placement through our established national buyer channels — one destination, zero friction.', icon: 'trending' },
    ],
  },
  route: {
    heading: 'Three origins, one destination',
    subheading: 'Brands are sourced from North America, Europe, and Africa — every route ends at the same place: UK retail.',
    steps: [
      { title: 'North America', flag: '🇺🇸', route: 'US Brands → DHL/FedEx Air Courier → UK Retail', description: 'US-origin brands enter through our air-courier lanes with export documentation handled outbound.', icon: 'plane' },
      { title: 'Europe', flag: '🇪🇺', route: 'EU Brands → Road Freight → UK Retail', description: 'European brands sourced at origin move by road freight with CE-to-UKCA transitions managed before the border.', icon: 'truck' },
      { title: 'Africa', flag: '🌍', route: 'African Brands → BAK Logistics → Sea/Air → UK Retail', description: 'African brands ship through our Southern African depot network with ZIMRA CD1 clearing and bonded warehousing upstream.', icon: 'ship' },
    ],
  },
  finalCta: {
    heading: 'Ready to enter the UK market?',
    subheading: 'Join brands from the US, Europe, and Africa already scaling through {{brand}}.',
    buttonLabel: 'Get Started',
    stampLine1: 'UK Customs',
    stampLine2: 'Cleared for Retail',
  },
};
