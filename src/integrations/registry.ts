import type { IntegrationDefinition, IntegrationId } from './types';

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
  rocketchat: {
    id: 'rocketchat',
    name: 'Rocket.Chat',
    description:
      'Self-hosted messaging engine behind the CRM Support Inbox. Community Edition — SSO-bridged with Mercenta auth; one private Group per brand. Mobile app white-label via Rocket.Chat.ReactNative.',
    authMethod: 'api_key',
    fields: [
      { key: 'api_url', label: 'Rocket.Chat URL', placeholder: 'http://localhost:3000', secret: false },
      { key: 'admin_username', label: 'Admin Username', placeholder: 'mercenta-admin', secret: false },
      { key: 'admin_password', label: 'Admin Password', placeholder: 'Admin password', secret: true },
    ],
    testCallDescription: 'Fetch Rocket.Chat info endpoint to verify server is reachable',
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
  'rocketchat',
  'twilio_whatsapp',
  'postiz',
];
