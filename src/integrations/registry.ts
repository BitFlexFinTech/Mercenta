import {
  INITIAL_INTEGRATIONS,
  modeForState,
  type IntegrationDefinition,
  type IntegrationCategory,
  type IntegrationId,
  type IntegrationMode,
  type ProviderResolutionMode,
} from './types';

/**
 * Registry of every §14 integration card. Order = display order.
 * Amazon SP-API first — it is the core of the whole platform.
 */
export const INTEGRATION_REGISTRY: Record<IntegrationId, IntegrationDefinition> = {
  amazon_sp_api: {
    id: 'amazon_sp_api',
    name: 'Amazon Selling Partner API',
    description:
      'Vendor catalog submission, purchase orders and invoicing. One-time app registration in the Amazon Developer Console happens outside this wizard; after that the admin never touches credentials again.',
    authMethod: 'oauth',
    fields: [],
    testCallDescription:
      'Harmless Catalog Items read against the connected vendor account',
    oauth: {
      authorizeUrlBase: 'https://sellercentral.amazon.com/apps/authorize/consent',
      clientIdParam: 'application_id',
      clientIdLabel: 'Application ID (from Seller Central)',
    },
  },
  amazon_ads: {
    id: 'amazon_ads',
    name: 'Amazon Ads API',
    description:
      'Ad spend dashboard (§12). Requires the Brand Registry / Seller Central question to be resolved first — see §12.',
    authMethod: 'oauth',
    fields: [],
    testCallDescription: 'Read-only profiles list call',
  },
  stripe: {
    id: 'stripe',
    name: 'Stripe',
    description:
      'Flat monthly brand subscriptions (§11). Commission billing does NOT use Stripe — it is event-driven from real purchase orders.',
    authMethod: 'oauth',
    fields: [],
    testCallDescription: 'Account balance read (read-only scope)',
  },
  esignature: {
    id: 'esignature',
    name: 'E-Signature',
    description:
      'Contract send/sign flow (§4). Confirm with the account owner which provider they hold an account with before wiring the live adapter.',
    authMethod: 'oauth',
    providerOptions: [
      { id: 'docusign', label: 'DocuSign' },
      { id: 'pandadoc', label: 'PandaDoc' },
    ],
    fields: [],
    testCallDescription: 'Fetch account/profile details',
  },
  email: {
    id: 'email',
    name: 'Transactional Email',
    description:
      'Outreach sequencing and messaging hub power-sends (§7/§9). Confirm which provider account exists before wiring.',
    authMethod: 'api_key',
    providerOptions: [
      { id: 'postmark', label: 'Postmark' },
      { id: 'sendgrid', label: 'SendGrid' },
    ],
    fields: [
      {
        key: 'api_key',
        label: 'API Key',
        placeholder: 'Paste the server API token',
        secret: true,
      },
    ],
    testCallDescription: 'Send to the internal inbox-only test address',
  },
  lead_sourcing: {
    id: 'lead_sourcing',
    name: 'Lead Sourcing',
    description:
      'Prospecting feed behind the Marketing hub (§7). CSV import is the zero-API launch path; Apollo.io / Instantly.ai are confirmed-API backups.',
    authMethod: 'api_key',
    providerOptions: [
      { id: 'csv_import', label: 'CSV Import (no API needed)' },
      { id: 'apollo', label: 'Apollo.io' },
      { id: 'instantly', label: 'Instantly.ai' },
    ],
    fields: [
      {
        key: 'api_key',
        label: 'API Key',
        placeholder: 'Leave blank for CSV import',
        secret: true,
      },
    ],
    testCallDescription: 'Fetch one page of recent leads (or validate CSV source)',
  },
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    description:
      'LLM access for grounded discovery research and outreach-copy generation (§7 discovery engine).',
    authMethod: 'api_key',
    fields: [
      {
        key: 'api_key',
        label: 'API Key',
        placeholder: 'Paste the OpenRouter API key',
        secret: true,
      },
    ],
    testCallDescription: 'Validate the key against the OpenRouter auth endpoint',
  },
  hunter: {
    id: 'hunter',
    name: 'Hunter.io',
    description:
      'Email finding and verification for discovered leads (§7 discovery engine).',
    authMethod: 'api_key',
    fields: [
      {
        key: 'api_key',
        label: 'API Key',
        placeholder: 'Paste the Hunter.io API key',
        secret: true,
      },
    ],
    testCallDescription: 'Account read to verify the key',
  },
  instantly: {
    id: 'instantly',
    name: 'Instantly.ai',
    description:
      'Outreach sending on a dedicated cold domain (§7). Sending-only — replies come back via webhook.',
    authMethod: 'api_key',
    fields: [
      {
        key: 'api_key',
        label: 'API Key',
        placeholder: 'Paste the Instantly API key',
        secret: true,
      },
    ],
    testCallDescription: 'Account list read to verify the key',
  },
  keepa: {
    id: 'keepa',
    name: 'Keepa API',
    description:
      'Amazon UK marketplace data for the Product Research Agent (§Batch-6). Tracks prices, sales ranks, and review history to identify product gaps. Requires a Keepa API token (free tier available).',
    authMethod: 'api_key',
    fields: [
      {
        key: 'api_key',
        label: 'API Key',
        placeholder: 'Paste the Keepa API token',
        secret: true,
      },
    ],
    testCallDescription: 'Fetch one page of top sellers from the UK marketplace to verify the key',
  },
  firecrawl: {
    id: 'firecrawl',
    name: 'Firecrawl',
    description:
      'Web-fetching layer for the discovery engine (§Batch-8). Crawls company websites and returns clean structured content for LLM-grounded research. Handles JS-rendered pages. Requires a Firecrawl API key.',
    authMethod: 'api_key',
    fields: [
      {
        key: 'api_key',
        label: 'API Key',
        placeholder: 'Paste the Firecrawl API key',
        secret: true,
      },
    ],
    testCallDescription: 'Crawl a single test URL to verify the API key works',
  },
  usertour: {
    id: 'usertour',
    name: 'Usertour',
    description:
      'Self-hosted onboarding tour platform (MIT-licensed). Builds product tours, checklists, hotspots, and resource centers. SDK loaded in the brand portal for targeted tours by team role.',
    authMethod: 'api_key',
    fields: [
      { key: 'api_url', label: 'Usertour URL', placeholder: 'http://localhost:8090', secret: false },
      { key: 'api_key', label: 'API Key', placeholder: 'Usertour admin API key', secret: true },
    ],
    testCallDescription: 'Fetch Usertour health endpoint to verify connectivity',
  },
  twilio_whatsapp: {
    id: 'twilio_whatsapp',
    name: 'Twilio WhatsApp',
    description:
      'WhatsApp escalation channel for time-sensitive hot-lead notifications and support escalations. Sends brief, actionable alerts to the founder/team when a brand explicitly asks for a human. Additive to the existing in-app/email notification — never replaces it.',
    authMethod: 'api_key',
    fields: [
      { key: 'account_sid', label: 'Twilio Account SID', placeholder: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', secret: true },
      { key: 'auth_token', label: 'Twilio Auth Token', placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', secret: true },
      { key: 'from_number', label: 'WhatsApp Sender Number', placeholder: 'whatsapp:+14155238886', secret: false },
      { key: 'notify_phone', label: 'Notify Phone (E.164)', placeholder: '+447700900000', secret: false },
    ],
    testCallDescription: 'Ping Twilio API to verify the Account SID and Auth Token',
  },
  postiz: {
    id: 'postiz',
    name: 'Postiz',
    description:
      'Self-hosted social media scheduler (AGPL-3.0). Schedule posts to Instagram, TikTok, LinkedIn, X, Facebook, YouTube, and more from the admin Marketing section. Supports AI drafting, agent CLI, and public REST API.',
    authMethod: 'api_key',
    fields: [
      { key: 'api_url', label: 'Postiz URL', placeholder: 'http://localhost:8100', secret: false },
      { key: 'api_key', label: 'API Key', placeholder: 'Postiz admin API key', secret: true },
    ],
    testCallDescription: 'Fetch Postiz health endpoint to verify the server is reachable',
  },
  // §Phase 4 — registered so their MODE is authoritative for scenario safety.
  // Deliberately NOT added to INTEGRATION_ORDER: they have dedicated
  // non-wizard integration paths (Xero: services/xero + AccountingPanel;
  // DHL: provider adapter to be wired when credentials arrive). The wizard
  // must not render an API-key form for an OAuth/enterprise provider.
  dhl: {
    id: 'dhl',
    name: 'DHL UK',
    description: 'Logistics / shipment API. Simulated until production credentials are configured.',
    authMethod: 'api_key',
    fields: [],
    testCallDescription: 'Shipment status query against the connected DHL account',
  },
  palletline: {
    id: 'palletline',
    name: 'Palletline',
    description:
      "UK-domestic palletised-freight carrier — Mercenta's Palletline account, used for UK domestic shipments by the canonical routing rule. Simulated end-to-end (booking, label, collection, depot milestones, exception and failed-delivery recovery, carrier invoice) until real Palletline credentials are entered; the live adapter activates with no code change.",
    authMethod: 'api_key',
    fields: [
      {
        key: 'api_key',
        label: 'API credential (via Edge Function)',
        placeholder: 'Palletline account credential',
        secret: true,
      },
    ],
    testCallDescription: 'Palletline consignment query against the connected Mercenta account',
  },
  /**
   * §PHASE 3 — the 3PL FULFILMENT partner. A 3PL fulfils, it does NOT carry, so
   * this card sits beside the carriers but is not one of them; goods still move on
   * DHL (international) and Palletline (UK domestic). Simulated end-to-end until
   * real credentials are entered.
   */
  delta_fulfillment: {
    id: 'delta_fulfillment',
    name: 'Delta Fulfillment (3PL)',
    description:
      "Mercenta's 3PL fulfilment partner — UK warehousing, an inventory buffer, consolidation and the final-mile hand-off to the channel's fulfilment centre. A 3PL fulfils, it does not carry: goods still move on DHL (international) and Palletline (UK domestic). Simulated end-to-end (inbound receipt, putaway, inventory buffer, outbound dispatch, exception recovery, fulfilment invoice) until real Delta Fulfillment credentials are entered; the live adapter activates with no code change.",
    authMethod: 'api_key',
    fields: [
      {
        key: 'api_key',
        label: 'Account credential (via Edge Function)',
        placeholder: 'Delta Fulfillment account credential',
        secret: true,
      },
    ],
    testCallDescription:
      'Delta Fulfillment inventory query against the connected Mercenta account',
  },
  xero: {
    id: 'xero',
    name: 'Xero',
    description: 'Accounting / financial records. Demo mode (28-day reset + auto-reseed) until live OAuth credentials are configured.',
    authMethod: 'api_key',
    fields: [],
    testCallDescription: 'OAuth connection verified via the dedicated Xero panel',
  },
  companies_house: {
    id: 'companies_house',
    name: 'Companies House',
    description:
      'UK company registry — brand company verification and incorporation lookups (compliance workflow). Simulated registrar until a real API key is configured. Free-tier API key from Companies House.',
    authMethod: 'api_key',
    fields: [
      {
        key: 'api_key',
        label: 'API Key (free tier)',
        placeholder: 'Paste the Companies House API key',
        secret: true,
      },
    ],
    testCallDescription: 'Search the registrar for the company record',
  },
  hmrc: {
    id: 'hmrc',
    name: 'HMRC (Making Tax Digital)',
    description:
      'HMRC — VAT registration status and VAT/CT return filing for the compliance workflow. Simulated until real MTD OAuth credentials are configured. Requires an HMRC developer account + fraud-prevention headers.',
    authMethod: 'api_key',
    fields: [
      {
        key: 'api_key',
        label: 'OAuth access token (via Edge Function)',
        placeholder: 'Paste the MTD access token',
        secret: true,
      },
    ],
    testCallDescription: 'Read VAT registration status for the connected VRN',
  },
  // §Canonical model §6 / T-1 — payout rails. Mercenta pays the BRAND through
  // Payoneer (the canonical PRIMARY/default business + retail-channel payment
  // account) and Wise as the secondary rail. Both are simulated until real
  // credentials are configured; the transfer NEVER auto-sends (human approval).
  wise: {
    id: 'wise',
    name: 'Wise (secondary payout rail)',
    description:
      'Secondary rail, used only when deliberately selected. Simulated until real Wise API credentials are configured; a payout is only ever submitted after Mercenta operator approval.',
    authMethod: 'api_key',
    fields: [
      {
        key: 'api_key',
        label: 'API token (via Edge Function)',
        placeholder: 'Wise API token',
        secret: true,
      },
    ],
    testCallDescription: 'Read the Mercenta Wise business profile (read-only)',
  },
  payoneer: {
    id: 'payoneer',
    name: 'Payoneer (default payout rail)',
    description:
      'Default rail Mercenta pays brand settlements through, and the canonical retail-channel payment account. Simulated until real Payoneer program credentials are configured; never auto-sent without Mercenta operator approval.',
    authMethod: 'api_key',
    fields: [
      {
        key: 'api_key',
        label: 'Program credentials (via Edge Function)',
        placeholder: 'Payoneer program credentials',
        secret: true,
      },
    ],
    testCallDescription: 'Read the Mercenta Payoneer program status (read-only)',
  },
  /**
   * §21 (M13 Phase 8) — Google. OAuth only (never an API-key form): the founder
   * authorizes the personal account and the tokens stay server-side. The setup
   * wizard in Super Admin drives the flow and creates the Drive structure.
   */
  google: {
    id: 'google',
    name: 'Google (Drive, Docs, Sheets, Slides, Calendar)',
    description:
      'The founder\'s personal Google account (mercentapartners@gmail.com). OAuth only — Mercenta never asks for or stores the Google password, and the refresh token is held by the server-side secret store, never the browser.',
    authMethod: 'oauth',
    fields: [],
    testCallDescription: 'Create a test document and read it back through the Drive API',
    oauth: {
      authorizeUrlBase: 'https://accounts.google.com/o/oauth2/v2/auth',
      clientIdParam: 'client_id',
      clientIdLabel: 'Google OAuth Client ID (from Google Cloud Console)',
    },
  },
};

export const INTEGRATION_ORDER: IntegrationId[] = [
  'amazon_sp_api',
  'stripe',
  'esignature',
  'email',
  'amazon_ads',
  'lead_sourcing',
  'openrouter',
  'hunter',
  'instantly',
  'keepa',
  'firecrawl',
  'usertour',
  'twilio_whatsapp',
  'postiz',
  // §Priority-1 — provider control-plane coverage: logistics + compliance +
  // finance providers with authoritative simulation defaults.
  'dhl',
  'palletline',
  'delta_fulfillment',
  'xero',
  'companies_house',
  'hmrc',
  // §Canonical model §6 — payout rails, default first.
  'wise',
  'payoneer',
  // §21 (M13 Phase 8) — Google drives the Docs/Sheets/Slides/Drive integration,
  // so its card belongs in the wizard order (OAuth connect).
  'google',
];

/**
 * §2A — per-integration operating metadata (single source of truth for the
 * Integrations Hub). `defaultMode` is what the integration reports while it
 * has never been connected or explicitly configured. `liveCredentialHint`
 * reflects only the absence/presence of a developer-provided demo key — it is
 * NOT a verified live connection.
 */
export interface IntegrationMeta {
  category: IntegrationCategory;
  defaultMode: IntegrationMode;
  /**
   * Prompt-visible to the operator, never a hard gate: real verified LIVE
   * status only comes from a completed non-sandbox connection.
   */
  demoKeyHint?: string;
}

export const INTEGRATION_META: Record<IntegrationId, IntegrationMeta> = {
  amazon_sp_api: { category: 'commerce', defaultMode: 'simulation' },
  amazon_ads: { category: 'marketing', defaultMode: 'available' },
  stripe: { category: 'finance', defaultMode: 'simulation' },
  esignature: { category: 'commerce', defaultMode: 'available' },
  email: { category: 'communications', defaultMode: 'available', demoKeyHint: 'VITE_POSTMARK_API_KEY' },
  lead_sourcing: { category: 'marketing', defaultMode: 'available' },
  openrouter: { category: 'ai', defaultMode: 'available', demoKeyHint: 'VITE_OPENROUTER_API_KEY' },
  hunter: { category: 'data', defaultMode: 'available', demoKeyHint: 'VITE_HUNTER_API_KEY' },
  instantly: { category: 'marketing', defaultMode: 'available', demoKeyHint: 'VITE_INSTANTLY_API_KEY' },
  keepa: { category: 'data', defaultMode: 'available' },
  firecrawl: { category: 'data', defaultMode: 'available' },
  usertour: { category: 'communications', defaultMode: 'simulation' },
  twilio_whatsapp: { category: 'communications', defaultMode: 'available' },
  postiz: { category: 'marketing', defaultMode: 'available' },
  // §Phase 4 — scenario-required providers. Docs-verified simulation state:
  // DHL waiting/simulation, Xero demo/simulation. Registered so every scenario
  // provider resolves authoritatively (never falls to UNKNOWN).
  dhl: { category: 'logistics', defaultMode: 'simulation' },
  // §Canonical model §11/§13 — the UK-domestic Mercenta carrier account. The
  // mock/real adapter now EXISTS (`src/lib/palletline`), so simulation is the
  // authoritative state: a simulated Palletline consignment is fully demoable
  // with zero network calls, and entering credentials activates the live path.
  palletline: { category: 'logistics', defaultMode: 'simulation' },
  // §PHASE 3 — the 3PL fulfilment partner (Delta Fulfillment). The mock/real
  // adapter now EXISTS (`src/lib/fulfillment/`), so simulation is the
  // authoritative state: a simulated 3PL route is fully demoable with zero
  // network calls, and entering credentials activates the live path.
  delta_fulfillment: { category: 'logistics', defaultMode: 'simulation' },
  xero: { category: 'finance', defaultMode: 'simulation' },
  // §Priority-1 — compliance providers. No live credentials held today;
  // simulation is the authoritative documented state.
  companies_house: { category: 'compliance', defaultMode: 'simulation' },
  hmrc: { category: 'compliance', defaultMode: 'simulation' },
  // §21 (M13 Phase 8) — Google. No OAuth exchange has been completed, so the
  // authoritative documented state is simulation (the setup wizard's mock client).
  google: { category: 'infrastructure', defaultMode: 'simulation' },
  // §Canonical model §6 — payout rails. Simulation is authoritative until real
  // rail credentials exist, and a simulated transfer is unmistakably labelled.
  wise: { category: 'finance', defaultMode: 'simulation' },
  payoneer: { category: 'finance', defaultMode: 'simulation' },
};

export function integrationMeta(id: IntegrationId): IntegrationMeta {
  return INTEGRATION_META[id];
}

/**
 * §M2 — THE canonical default provider-mode resolution for any provider id.
 *
 * Previously this logic existed only inside the investor-demo orchestration.
 * M2's document-verification seam needs the same answer, so it lives here —
 * with the rest of the provider metadata — and the demo delegates to it. One
 * implementation, so a provider can never resolve differently in two places.
 *
 * `not_registered` for anything unknown: never silently simulated.
 */
export function defaultIntegrationMode(providerId: string): ProviderResolutionMode {
  const id = INTEGRATION_ORDER.find((x) => x === providerId);
  if (!id) return 'not_registered';
  return modeForState(INITIAL_INTEGRATIONS[id], integrationMeta(id).defaultMode);
}

/**
 * Truthful developer-key presence check. Returns true only if the hinted env
 * var actually has a non-empty value at runtime. This is a UI hint for the
 * Hub ("a demo key exists for this provider") — NOT a verified LIVE status.
 */
export function hasLiveCredentialHint(id: IntegrationId): boolean {
  const hint = INTEGRATION_META[id]?.demoKeyHint;
  if (!hint) return false;
  const env = (typeof import.meta !== 'undefined' && import.meta.env) as Record<string, string | undefined>;
  const value = env[hint];
  return typeof value === 'string' && value.length > 0;
}
