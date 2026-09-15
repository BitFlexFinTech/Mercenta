/**
 * §31 — MERCENTA LAUNCH CENTRE: the startup/MVP discovery platforms Mercenta
 * itself should be profiled on.
 *
 * THIS IS ABOUT MERCENTA, NOT ABOUT FINDING BRAND PARTNERS. It prepares Mercenta's
 * own profiles/listings on the platforms below, so the platform can be discovered
 * by founders, investors, journalists and early adopters.
 *
 * HONESTY CONTRACT (§31, §35):
 *   • Mercenta claims NO integration and NO automatic submission anywhere. Where a
 *     platform does not expose an authorised API (none is verified here), this
 *     module generates the COMPLETE submission package and the workflow is
 *     guided/manual.
 *   • `requirementsVerified: false` means exactly that — the current submission
 *     requirements have NOT been checked against the live platform page in this
 *     build. Each record carries `requirementsUrl` so the founder (or a future
 *     session) verifies them before filling anything in, and the UI says "verify"
 *     instead of pretending to know.
 *   • No credentials are stored here. Account/credential state belongs to the
 *     secure integration architecture, never to this config.
 */
import { BRAND_NAME } from './brand';

export type SubmissionChannel = 'form' | 'email' | 'account' | 'manual_review';

export interface LaunchPlatform {
  id: string;
  name: string;
  /** Public site. */
  siteUrl: string;
  /** Where to sign up / create the account. */
  signupUrl: string;
  /** Where the CURRENT submission requirements are published. */
  requirementsUrl: string;
  /** How a launch is actually submitted today. */
  submissionChannel: SubmissionChannel;
  /**
   * Whether Mercenta has verified an AUTHORISED submission API. `false` for every
   * platform in this build: nothing here claims an automated submission exists.
   */
  apiAvailable: false;
  /** The honest state of the requirement research. */
  requirementsVerified: false;
  /** Who sees the listing — why this platform is worth the founder's time. */
  audience: string;
  /** What this platform specifically wants, as far as it is publicly described. */
  knownRequirements: string[];
}
/** The 14 platforms §31 names. Order = the order the founder should work them. */
export const LAUNCH_PLATFORMS: readonly LaunchPlatform[] = [
  {
    id: 'product_hunt',
    name: 'Product Hunt',
    siteUrl: 'https://www.producthunt.com',
    signupUrl: 'https://www.producthunt.com/launch',
    requirementsUrl: 'https://www.producthunt.com/launch',
    submissionChannel: 'account',
    apiAvailable: false,
    requirementsVerified: false,
    audience: 'Early adopters, makers and journalists. The single highest-signal launch day.',
    knownRequirements: [
      'Thumbnail/logo, gallery images and a one-line tagline',
      'A made-by maker profile is required before scheduling',
      'Launch days are limited and scheduled in advance',
    ],
  },
  {
    id: 'indie_hackers',
    name: 'Indie Hackers',
    siteUrl: 'https://www.indiehackers.com',
    signupUrl: 'https://www.indiehackers.com/sign-up',
    requirementsUrl: 'https://www.indiehackers.com/products',
    submissionChannel: 'account',
    apiAvailable: false,
    requirementsVerified: false,
    audience: 'Bootstrapped founders — a natural audience for the Mercenta story.',
    knownRequirements: [
      'A product page linked to a founder profile',
      'A revenue/milestone post performs best',
    ],
  },
  {
    id: 'hacker_news',
    name: 'Hacker News',
    siteUrl: 'https://news.ycombinator.com',
    signupUrl: 'https://news.ycombinator.com/login',
    requirementsUrl: 'https://news.ycombinator.com/showhn.html',
    submissionChannel: 'account',
    apiAvailable: false,
    requirementsVerified: false,
    audience: 'Technical and investor readership. "Show HN" is the sanctioned launch format.',
    knownRequirements: [
      'Post as "Show HN: <name> — <one line>"',
      'No marketing language; technical honesty wins',
    ],
  },
  {
    id: 'betalist',
    name: 'BetaList',
    siteUrl: 'https://betalist.com',
    signupUrl: 'https://betalist.com/submit',
    requirementsUrl: 'https://betalist.com/submit',
    submissionChannel: 'form',
    apiAvailable: false,
    requirementsVerified: false,
    audience: 'Early adopters who want to try new products first.',
    knownRequirements: [
      'Name, URL, tagline, description and screenshots',
      'Usually for pre/post-launch products with an active site',
    ],
  },
  {
    id: 'sourceforge',
    name: 'SourceForge',
    siteUrl: 'https://sourceforge.net',
    signupUrl: 'https://sourceforge.net/account/registration/',
    requirementsUrl: 'https://sourceforge.net/create/',
    submissionChannel: 'form',
    apiAvailable: false,
    requirementsVerified: false,
    audience: 'Software directory traffic; mainly relevant if Mercenta ships a public tool.',
    knownRequirements: ['Project listing requires download/source-hosted content'],
  },
  {
    id: 'uneed',
    name: 'Uneed',
    siteUrl: 'https://www.uneed.best',
    signupUrl: 'https://www.uneed.best/submit-a-tool',
    requirementsUrl: 'https://www.uneed.best/submit-a-tool',
    submissionChannel: 'form',
    apiAvailable: false,
    requirementsVerified: false,
    audience: 'Curated tool directory with a daily ranking.',
    knownRequirements: [
      'Logo, screenshots, short and long descriptions',
      'A launch day can be queued',
    ],
  },
  {
    id: 'peerlist',
    name: 'Peerlist',
    siteUrl: 'https://peerlist.io',
    signupUrl: 'https://peerlist.io/signup',
    requirementsUrl: 'https://peerlist.io/launchpad',
    submissionChannel: 'account',
    apiAvailable: false,
    requirementsVerified: false,
    audience: 'Professional network for builders; Launchpad gives a launch day.',
    knownRequirements: ['Professional profile is required first', 'Logo, tagline, description, links'],
  },
  {
    id: 'microlaunch',
    name: 'Microlaunch',
    siteUrl: 'https://microlaunch.net',
    signupUrl: 'https://microlaunch.net/submit',
    requirementsUrl: 'https://microlaunch.net',
    submissionChannel: 'form',
    apiAvailable: false,
    requirementsVerified: false,
    audience: 'Small, low-noise audience of indie builders.',
    knownRequirements: ['Name, URL, tagline, description'],
  },
  {
    id: 'alternativeto',
    name: 'AlternativeTo',
    siteUrl: 'https://alternativeto.net',
    signupUrl: 'https://alternativeto.net/manage/',
    requirementsUrl: 'https://alternativeto.net/manage/',
    submissionChannel: 'form',
    apiAvailable: false,
    requirementsVerified: false,
    audience: 'People actively looking for a replacement for an existing product.',
    knownRequirements: [
      'List the alternatives Mercenta replaces',
      'Feature list, screenshots, licence type',
    ],
  },
  {
    id: 'dev_hunt',
    name: 'Dev Hunt',
    siteUrl: 'https://devhunt.org',
    signupUrl: 'https://devhunt.org/submit',
    requirementsUrl: 'https://devhunt.org',
    submissionChannel: 'form',
    apiAvailable: false,
    requirementsVerified: false,
    audience: 'Developer-tool discovery. Best if Mercenta exposes a public API/tool.',
    knownRequirements: ['GitHub repo or product URL', 'Short description and category'],
  },
  {
    id: 'saashub',
    name: 'SaaSHub',
    siteUrl: 'https://www.saashub.com',
    signupUrl: 'https://www.saashub.com/submit',
    requirementsUrl: 'https://www.saashub.com/submit',
    submissionChannel: 'form',
    apiAvailable: false,
    requirementsVerified: false,
    audience: 'Software comparison traffic with long-tail search value.',
    knownRequirements: ['Product name, pricing model, category, description'],
  },
  {
    id: 'launching_next',
    name: 'Launching Next',
    siteUrl: 'https://www.launchingnext.com',
    signupUrl: 'https://www.launchingnext.com/submit/',
    requirementsUrl: 'https://www.launchingnext.com/submit/',
    submissionChannel: 'form',
    apiAvailable: false,
    requirementsVerified: false,
    audience: 'Startup directory with newsletter distribution.',
    knownRequirements: ['Name, URL, short + long description, category'],
  },
  {
    id: 'startupbase',
    name: 'StartupBase',
    siteUrl: 'https://startupbase.io',
    signupUrl: 'https://startupbase.io/submit',
    requirementsUrl: 'https://startupbase.io',
    submissionChannel: 'form',
    apiAvailable: false,
    requirementsVerified: false,
    audience: 'Founder/investor directory.',
    knownRequirements: ['Company profile, founders, links, description'],
  },
  {
    id: 'tiny_startups',
    name: 'Tiny Startups',
    siteUrl: 'https://tinystartups.com',
    signupUrl: 'https://tinystartups.com/submit',
    requirementsUrl: 'https://tinystartups.com',
    submissionChannel: 'email',
    apiAvailable: false,
    requirementsVerified: false,
    audience: 'Small newsletter for early-stage products.',
    knownRequirements: ['Short pitch by email/newsletter form', 'Name and link'],
  },
];

/** §31 — the honest standing note for the whole centre. */
export const LAUNCH_CENTRE_DISCLAIMER =
  'Mercenta provides no automated submission and claims no integration with any platform listed here. Each entry generates a complete submission package and a guided workflow; the founder submits it. Where a platform publishes an authorised API, that can be integrated later as a real provider.';

/** §31 — the launch copy the founder can copy into any of the platforms. */
export interface LaunchProfile {
  tagline: string;
  shortDescription: string;
  longDescription: string;
  categories: string[];
  website: string;
  founderProfile: string;
}

export const DEFAULT_LAUNCH_PROFILE: LaunchProfile = {
  tagline: 'Distribution and channel operations for growing brands',
  shortDescription: `${BRAND_NAME} is the operational layer between a brand and the retail channel: catalogue, purchase orders, shipments, payments and reporting in one place.`,
  longDescription:
    `${BRAND_NAME} takes on the operational channel work that brands would otherwise have to run themselves. ` +
    'A brand uploads and maintains its product information; Mercenta validates and structures it for the destination channel, ' +
    'routes purchase orders into the brand\u2019s workspace, mirrors the brand\u2019s acceptance decision through the authorised integration, ' +
    'handles shipment creation, carrier collection and the payment gate that releases shipping labels, and reports on the economics ' +
    'under the agreed commercial model. Anything that can legitimately be automated is automated.',
  categories: ['B2B software', 'Logistics', 'Ecommerce operations', 'Supply chain'],
  website: 'https://mercenta.co.uk',
  founderProfile:
    'Solo founder-led UK company (Mercenta Partners Ltd). The team remains deliberately small: the platform does the operational work.',
};