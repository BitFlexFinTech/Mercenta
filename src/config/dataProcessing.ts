/**
 * §PHASE 15 — THE THIRD-PARTY DATA INVENTORY (the legal/privacy launch gate's
 * one missing repository-side artefact).
 *
 * WHY THIS EXISTS
 * ---------------
 * Phase 15's legal/privacy gate needs "a third-party data inventory". Until now
 * that phrase lived only in `PRODUCTION_READINESS.md` and in the launch gate's
 * BLOCKED reason — there was no inventory anywhere in the repository, so the
 * privacy policy's "who we share it with" was prose and NOTHING failed when a new
 * processor was engaged, or when a registered integration that touches personal
 * data was added, without the policy changing. A policy that can silently fall
 * behind the platform is not a policy.
 *
 * This module is the SINGLE OWNER of that inventory (a Record of Processing
 * Activities, the UK GDPR Article 30 register). Every third party Mercenta
 * engages to run the platform is declared here ONCE, with what personal data it
 * touches, why, on what lawful basis, where the data is held, whether a Data
 * Processing Agreement is required, and which integration-registry provider (if
 * any) it corresponds to. `scripts/validate-data-inventory.mjs` is the gate that
 * makes it real: it EXECUTES this module and forces every registered provider to
 * be either declared here or excluded WITH A REASON, so a new provider can never
 * slip into the platform undeclared.
 *
 * WHAT IS DELIBERATELY NOT HERE
 * -----------------------------
 *  - Supplier NAMES are INTERNAL. They are never rendered on a public surface,
 *    because the public-claims red lines (`src/config/positioning.ts` §11 family
 *    `service-suppliers`) forbid publishing who we buy services from. The public
 *    privacy policy reads the PUBLIC-SAFE projection below (`PUBLIC_PROCESSING_
 *    CATEGORIES`), not the internal names.
 *  - No credential, token or secret is ever stored here.
 *
 * LEGAL SIGN-OFF IS PENDING — AND THAT IS DECLARED, NOT ASSUMED. Building the
 * inventory does NOT clear the gate: a human must still sign off the wording and
 * this register. `DATA_PROCESSING_LEGAL_SIGNOFF` is the ONE declaration of that
 * state, so nothing can claim the gate is closed while it is open.
 *
 * IMPORT DISCIPLINE. This module is imported by a Node validator via TypeScript
 * type-stripping, so it carries NO runtime import — only a type-only one.
 */
import type { IntegrationId } from '@/integrations/types';

/* ── 1. Lawful bases (a closed set — an entry must name one of these) ─────── */

export type ProcessingLawfulBasis =
  | 'contract'
  | 'legal_obligation'
  | 'legitimate_interests'
  | 'consent';

export const PROCESSING_LAWFUL_BASES: readonly ProcessingLawfulBasis[] = [
  'contract',
  'legal_obligation',
  'legitimate_interests',
  'consent',
] as const;

export const PROCESSING_LAWFUL_BASIS_LABELS: Record<ProcessingLawfulBasis, string> = {
  contract: 'Contract performance',
  legal_obligation: 'Legal obligation',
  legitimate_interests: 'Legitimate interests',
  consent: 'Consent',
};

/* ── 2. Personal-data categories (the vocabulary the privacy policy lists) ── */

export type PersonalDataCategory =
  | 'identity'
  | 'contact'
  | 'financial'
  | 'transaction'
  | 'communications'
  | 'technical';

export const PERSONAL_DATA_CATEGORIES: readonly PersonalDataCategory[] = [
  'identity',
  'contact',
  'financial',
  'transaction',
  'communications',
  'technical',
] as const;

export const PERSONAL_DATA_CATEGORY_LABELS: Record<PersonalDataCategory, string> = {
  identity: 'Identity',
  contact: 'Contact',
  financial: 'Financial',
  transaction: 'Transaction',
  communications: 'Communications',
  technical: 'Technical',
};

/* ── 3. Processor categories (the public-safe grouping) ───────────────────── */

export type DataProcessorCategory =
  | 'hosting'
  | 'monitoring'
  | 'retail_channel'
  | 'advertising'
  | 'payments'
  | 'payouts'
  | 'accounting'
  | 'logistics'
  | 'fulfilment'
  | 'email'
  | 'esignature'
  | 'messaging'
  | 'marketing'
  | 'research'
  | 'ai'
  | 'infrastructure'
  | 'compliance'
  | 'product_tours';

export interface DataProcessor {
  /** Stable identifier — unique across the inventory. */
  id: string;
  /** INTERNAL supplier name. Never rendered on a public surface. */
  name: string;
  /** Which public-safe category this supplier belongs to. */
  category: DataProcessorCategory;
  /** What this supplier does for Mercenta (internal wording). */
  purpose: string;
  /** Which categories of personal data pass through it. At least one. */
  dataCategories: readonly PersonalDataCategory[];
  /** The ONE lawful basis relied on for this processing. */
  lawfulBasis: ProcessingLawfulBasis;
  /** Where the data is stored/processed (data-residency line). */
  location: string;
  /** Whether a Data Processing Agreement is required with this supplier. */
  dpaRequired: boolean;
  /** The integration-registry provider this corresponds to, or null. */
  provider: IntegrationId | null;
  /** `active` = in use now; `planned` = registered but not relied on yet. */
  status: 'active' | 'planned';
}

/* ── 4. THE INVENTORY — every supplier Mercenta engages ───────────────────── */

export const DATA_PROCESSORS: readonly DataProcessor[] = [
  {
    id: 'platform-hosting',
    name: 'Supabase',
    category: 'hosting',
    purpose: 'Platform hosting, account authentication and storage of account, order and document data.',
    dataCategories: ['identity', 'contact', 'transaction', 'technical'],
    lawfulBasis: 'contract',
    location: 'European Union (Frankfurt)',
    dpaRequired: true,
    provider: null,
    status: 'active',
  },
  {
    id: 'error-monitoring',
    name: 'Sentry',
    category: 'monitoring',
    purpose: 'Error and performance monitoring, so faults in the platform are detected and diagnosed.',
    dataCategories: ['technical'],
    lawfulBasis: 'legitimate_interests',
    location: 'European Union / United States',
    dpaRequired: true,
    provider: null,
    status: 'active',
  },
  {
    id: 'retail-channel-operations',
    name: 'Retail-channel integration (the channel account Mercenta operates)',
    category: 'retail_channel',
    purpose:
      'Collecting the orders and invoices the retail channel sends us, and returning acknowledgements, catalogue and invoice data.',
    dataCategories: ['contact', 'transaction', 'communications'],
    lawfulBasis: 'contract',
    location: 'United Kingdom / European Union',
    dpaRequired: true,
    provider: 'amazon_sp_api',
    status: 'active',
  },
  {
    id: 'advertising-reporting',
    name: 'Channel advertising reporting',
    category: 'advertising',
    purpose: 'Read-only advertising-spend reporting against the channel account Mercenta operates.',
    dataCategories: ['transaction'],
    lawfulBasis: 'legitimate_interests',
    location: 'United Kingdom / European Union',
    dpaRequired: true,
    provider: 'amazon_ads',
    status: 'planned',
  },
  {
    id: 'subscription-billing',
    name: 'Stripe',
    category: 'payments',
    purpose: 'Collecting the flat monthly brand subscription that pays for the platform.',
    dataCategories: ['identity', 'contact', 'financial'],
    lawfulBasis: 'contract',
    location: 'Ireland / United States',
    dpaRequired: true,
    provider: 'stripe',
    status: 'active',
  },
  {
    id: 'brand-payouts',
    name: 'Payoneer',
    category: 'payouts',
    purpose: 'Paying brands the amounts owed to them from their orders — Mercenta’s default payout rail.',
    dataCategories: ['identity', 'contact', 'financial'],
    lawfulBasis: 'contract',
    location: 'United States / European Union',
    dpaRequired: true,
    provider: 'payoneer',
    status: 'active',
  },
  {
    id: 'brand-payouts-secondary',
    name: 'Wise',
    category: 'payouts',
    purpose: 'Alternative payout rail for brand settlements (secondary to the default rail).',
    dataCategories: ['identity', 'contact', 'financial'],
    lawfulBasis: 'contract',
    location: 'United Kingdom / Belgium',
    dpaRequired: true,
    provider: 'wise',
    status: 'planned',
  },
  {
    id: 'accounting-reconciliation',
    name: 'Xero',
    category: 'accounting',
    purpose: 'Accounting and reconciliation of orders, invoices and payments.',
    dataCategories: ['contact', 'transaction', 'financial'],
    lawfulBasis: 'legal_obligation',
    location: 'United Kingdom / European Union',
    dpaRequired: true,
    provider: 'xero',
    status: 'active',
  },
  {
    id: 'international-freight',
    name: 'DHL',
    category: 'logistics',
    purpose: 'Collecting and delivering international consignments, and reporting their progress.',
    dataCategories: ['contact', 'transaction'],
    lawfulBasis: 'contract',
    location: 'European Union / United Kingdom',
    dpaRequired: true,
    provider: 'dhl',
    status: 'active',
  },
  {
    id: 'domestic-freight',
    name: 'Palletline',
    category: 'logistics',
    purpose: 'Collecting and delivering UK-domestic consignments, and reporting their progress.',
    dataCategories: ['contact', 'transaction'],
    lawfulBasis: 'contract',
    location: 'United Kingdom',
    dpaRequired: true,
    provider: 'palletline',
    status: 'active',
  },
  {
    id: 'warehousing-fulfilment',
    name: 'Delta Fulfilment',
    category: 'fulfilment',
    purpose: 'Storing, picking and dispatching stock on a brand’s behalf (the 3PL fulfilment partner).',
    dataCategories: ['contact', 'transaction'],
    lawfulBasis: 'contract',
    location: 'United Kingdom',
    dpaRequired: true,
    provider: 'delta_fulfillment',
    status: 'active',
  },
  {
    id: 'transactional-email',
    name: 'Postmark',
    category: 'email',
    purpose: 'Delivering the transactional messages and documents the service sends (including outreach).',
    dataCategories: ['contact', 'communications'],
    lawfulBasis: 'contract',
    location: 'United States / European Union',
    dpaRequired: true,
    provider: 'email',
    status: 'active',
  },
  {
    id: 'contract-signing',
    name: 'PandaDoc / DocuSign',
    category: 'esignature',
    purpose: 'Sending and storing the agreements a brand signs with Mercenta.',
    dataCategories: ['identity', 'contact', 'transaction'],
    lawfulBasis: 'contract',
    location: 'United States / European Union',
    dpaRequired: true,
    provider: 'esignature',
    status: 'active',
  },
  {
    id: 'operational-messaging',
    name: 'Twilio (WhatsApp Business)',
    category: 'messaging',
    purpose: 'Sending operational messages about a brand’s orders and account.',
    dataCategories: ['contact', 'communications'],
    lawfulBasis: 'contract',
    location: 'United States / European Union',
    dpaRequired: true,
    provider: 'twilio_whatsapp',
    status: 'active',
  },
  {
    id: 'market-research',
    name: 'Lead-sourcing providers (CSV import / Apollo / Instantly)',
    category: 'research',
    purpose: 'Researching the market and identifying businesses Mercenta might work with.',
    dataCategories: ['identity', 'contact'],
    lawfulBasis: 'legitimate_interests',
    location: 'United States / European Union',
    dpaRequired: true,
    provider: 'lead_sourcing',
    status: 'active',
  },
  {
    id: 'contact-discovery',
    name: 'Hunter',
    category: 'research',
    purpose: 'Finding and verifying business contact details for prospecting.',
    dataCategories: ['identity', 'contact'],
    lawfulBasis: 'legitimate_interests',
    location: 'European Union',
    dpaRequired: true,
    provider: 'hunter',
    status: 'planned',
  },
  {
    id: 'outreach-sequencing',
    name: 'Instantly',
    category: 'research',
    purpose: 'Sequencing outreach to prospective brand contacts.',
    dataCategories: ['identity', 'contact', 'communications'],
    lawfulBasis: 'legitimate_interests',
    location: 'United States / European Union',
    dpaRequired: true,
    provider: 'instantly',
    status: 'planned',
  },
  {
    id: 'ai-analysis',
    name: 'OpenRouter (AI models)',
    category: 'ai',
    purpose: 'Running AI-assisted analysis and summarisation over the information Mercenta already holds.',
    dataCategories: ['contact', 'communications', 'transaction'],
    lawfulBasis: 'legitimate_interests',
    location: 'United States / European Union',
    dpaRequired: true,
    provider: 'openrouter',
    status: 'active',
  },
  {
    id: 'document-storage',
    name: 'Google Workspace',
    category: 'infrastructure',
    purpose: 'Storing and sharing internal documents and files.',
    dataCategories: ['identity', 'contact', 'communications'],
    lawfulBasis: 'legitimate_interests',
    location: 'European Union / United States',
    dpaRequired: true,
    provider: 'google',
    status: 'active',
  },
  {
    id: 'company-compliance',
    name: 'Companies House',
    category: 'compliance',
    purpose: 'Meeting company-filing and statutory obligations.',
    dataCategories: ['identity', 'contact'],
    lawfulBasis: 'legal_obligation',
    location: 'United Kingdom',
    dpaRequired: true,
    provider: 'companies_house',
    status: 'active',
  },
  {
    id: 'tax-compliance',
    name: 'HM Revenue & Customs',
    category: 'compliance',
    purpose: 'Meeting tax and Making Tax Digital obligations.',
    dataCategories: ['identity', 'contact', 'financial'],
    lawfulBasis: 'legal_obligation',
    location: 'United Kingdom',
    dpaRequired: true,
    provider: 'hmrc',
    status: 'active',
  },
  {
    id: 'in-product-guidance',
    name: 'UserTour',
    category: 'product_tours',
    purpose: 'Showing optional in-product tours and guidance.',
    dataCategories: ['technical'],
    lawfulBasis: 'legitimate_interests',
    location: 'European Union / United States',
    dpaRequired: true,
    provider: 'usertour',
    status: 'active',
  },
] as const;

/* ── 5. Registered providers that process NO personal data ──────────────────
 * The launch gate forces every provider registered in
 * `src/integrations/types.ts → INITIAL_INTEGRATIONS` to be EITHER declared in
 * `DATA_PROCESSORS` above OR listed here WITH A REASON. This is what stops a new
 * integration slipping in undeclared: if it is added to the registry and is not
 * a processor, it must be consciously excluded here, in writing.
 */
export const INVENTORY_EXCLUSIONS: Readonly<Record<string, string>> = {
  keepa:
    'Product price-history data only (public product/market data). No personal data of any data subject passes through it.',
  firecrawl:
    'Public web research for market analysis. It reads publicly published pages; Mercenta stores no personal data collected through it.',
};

/* ── 6. The public-safe projection (what the privacy policy may publish) ────
 * Supplier NAMES never appear on a public surface (positioning.ts §11 family
 * `service-suppliers`). The policy reads THIS list — one row per category — so
 * the "who we share it with" section is DERIVED from the inventory and cannot
 * silently fall behind it. The gate requires every category used by an ACTIVE
 * processor to have a row here, and forbids a row here for a category no
 * processor uses.
 */
export interface PublicProcessingCategory {
  category: DataProcessorCategory;
  /** Public-safe label — names a KIND of supplier, never a company. */
  label: string;
  /** Public-safe purpose — what the kind of supplier does for us. */
  purpose: string;
}

export const PUBLIC_PROCESSING_CATEGORIES: readonly PublicProcessingCategory[] = [
  { category: 'hosting', label: 'Hosting and platform infrastructure', purpose: 'Running the platform, storing your account and order information, and keeping it available.' },
  { category: 'monitoring', label: 'Service monitoring', purpose: 'Detecting and diagnosing faults so the platform stays reliable.' },
  { category: 'retail_channel', label: 'Retail-channel operations', purpose: 'Receiving the orders and invoices the retail channel sends us, and returning our responses.' },
  { category: 'payments', label: 'Subscription billing', purpose: 'Collecting the monthly subscription that pays for the platform.' },
  { category: 'payouts', label: 'Brand settlements', purpose: 'Paying you the amounts owed to you from your orders.' },
  { category: 'accounting', label: 'Accounting and reconciliation', purpose: 'Keeping the accounting records of orders, invoices and payments.' },
  { category: 'logistics', label: 'Freight and delivery', purpose: 'Moving your goods to their destination and reporting their progress.' },
  { category: 'fulfilment', label: 'Warehousing and fulfilment', purpose: 'Storing, picking and dispatching your stock on your behalf.' },
  { category: 'email', label: 'Email delivery', purpose: 'Sending the messages and documents the service requires.' },
  { category: 'esignature', label: 'Contract signing', purpose: 'Sending and storing the agreements you sign with us.' },
  { category: 'messaging', label: 'Messaging', purpose: 'Sending you operational messages about your orders and account.' },
  /* §BATCH 5 (2026-10-10) — REMOVED: { category: 'marketing', label: 'Marketing',
     purpose: 'Sending our marketing communications, only where you have opted in.' }.
     The ONLY marketing-category processor was `marketing-outreach` (the Postiz social
     scheduler), which was deleted with the Mercenta Social feature, so this public
     row described processing the platform no longer declares. `validate-data-inventory`
     asserts the projection and the processors agree in BOTH directions. */
  { category: 'research', label: 'Market and prospect research', purpose: 'Researching the market and identifying businesses we might work with.' },
  { category: 'ai', label: 'AI-assisted analysis', purpose: 'Using AI models to help summarise and analyse the information we hold.' },
  { category: 'infrastructure', label: 'Document and file storage', purpose: 'Storing and sharing documents across the team.' },
  { category: 'compliance', label: 'Company and tax compliance', purpose: 'Meeting our legal, tax and company-filing obligations.' },
  { category: 'product_tours', label: 'In-product guidance', purpose: 'Showing optional in-product tours and guidance.' },
] as const;

/* ── 7. The legal sign-off state (the ONE declaration the launch gate reads) ─
 * Building the inventory does NOT clear Phase 15's legal/privacy gate: a human
 * must still sign off the wording and this register. The launch gate asserts
 * this value is exactly `pending_legal_sign_off`, so the gate cannot be reported
 * closed while it is open — and flipping it is a deliberate, reviewable act.
 */
export const DATA_PROCESSING_LEGAL_SIGNOFF = {
  state: 'pending_legal_sign_off' as const,
  reason:
    'The inventory and the published privacy/terms wording are built and asserted, but both still need a human legal sign-off.',
} as const;

/** The public-safe rows the privacy policy renders. */
export function publicProcessorCategories(): readonly PublicProcessingCategory[] {
  return PUBLIC_PROCESSING_CATEGORIES;
}