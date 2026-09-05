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
    headingStart: 'Your brand. The UK market.',
    headingHighlight: 'No infrastructure required.',
    subheading:
      'Mercenta Partners is a self-service platform that gets independent brands into the UK market. You onboard yourself, manage your catalogue, and track every order in real-time. We handle distribution.',
    primaryCta: 'See if your brand qualifies',
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
    heading: 'How it works',
    subheading: 'Onboard, distribute, manage — all from your portal.',
    points: [
      { title: 'Onboard your brand', description: 'Submit your products and compliance documents. Self-service, no waiting.', icon: 'check' },
      { title: 'We distribute', description: 'Your products go live across major UK retail channels with full logistics handled.', icon: 'truck' },
      { title: 'You manage from your portal', description: 'Acknowledge orders, track shipments, monitor performance. All in real-time.', icon: 'package' },
    ],
  },
  services: {
    heading: 'Full visibility. No black box.',
    subheading: 'You see what we see. Every order, every shipment, every metric — in your portal, in real-time. No monthly reports. No chasing anyone for updates.',
    cards: [
      { title: 'Every Order in Real-Time', description: 'See every order in your portal the moment it\'s placed. No monthly reports. No chasing.', icon: 'package' },
      { title: 'Live Shipment Tracking', description: 'Track every shipment from origin to delivery. You see what we see, always.', icon: 'truck' },
      { title: 'UK-Based Distribution', description: 'Mercenta Partners is a UK-based distribution company working with a curated portfolio of independent brands across health, home, kitchen, and consumer categories.', icon: 'shield' },
      { title: 'Automated Order-to-Fulfilment', description: 'Our platform automates the full order-to-fulfilment cycle, giving brands UK market access without the infrastructure.', icon: 'trending' },
    ],
  },
  route: {
    heading: 'Three origins, one UK destination',
    subheading: 'We source from independent brands worldwide — every route ends at the UK market.',
    steps: [
      { title: 'North America', flag: '🇺🇸', route: 'US Brands → UK Market', description: 'American brands enter through our established trade corridors into major UK retail channels.', icon: 'plane' },
      { title: 'Europe', flag: '🇪🇺', route: 'EU Brands → UK Market', description: 'European brands move by road freight into UK distribution with full compliance handled.', icon: 'truck' },
      { title: 'Africa', flag: '🌍', route: 'African Brands → UK Market', description: 'African brands ship through our depot network into UK retail channels.', icon: 'ship' },
    ],
  },
  finalCta: {
    heading: 'Ready to enter the UK market?',
    subheading: 'Join independent brands already scaling through {{brand}}.',
    buttonLabel: 'See if your brand qualifies',
    stampLine1: 'UK Customs',
    stampLine2: 'Cleared for Retail',
  },
};
