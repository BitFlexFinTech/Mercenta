/** §14 — one-click integrations framework. */

export type IntegrationId =
  | 'amazon_sp_api'
  | 'amazon_ads'
  | 'stripe'
  | 'esignature'
  | 'email'
  | 'lead_sourcing'
  | 'openrouter'
  | 'hunter'
  | 'instantly'
  | 'keepa'
  | 'firecrawl'
  | 'usertour'
  | 'rocketchat'
  | 'twilio_whatsapp'
  | 'postiz';

export type IntegrationStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'needs_attention'
  | /** OAuth: authorization code captured, server exchange pending */ 'code_received';

export interface IntegrationField {
  key: string;
  label: string;
  placeholder?: string;
  secret?: boolean;
}

export type AuthMethod = 'oauth' | 'api_key';

export interface ProviderOption {
  id: string;
  label: string;
}

/** §Stage-7 — per-provider OAuth launch configuration (public IDs only). */
export interface OAuthConfig {
  /** e.g. https://sellercentral.amazon.com/apps/authorize/consent */
  authorizeUrlBase: string;
  clientIdParam: string;
  clientIdLabel: string;
}

export interface IntegrationDefinition {
  id: IntegrationId;
  name: string;
  description: string;
  authMethod: AuthMethod;
  /** Optional provider choice within the card (e.g. DocuSign vs PandaDoc). */
  providerOptions?: ProviderOption[];
  fields: IntegrationField[];
  testCallDescription: string;
  /** Present for OAuth providers — clicking Connect launches a real popup. */
  oauth?: OAuthConfig;
}

export interface IntegrationState {
  status: IntegrationStatus;
  /** Chosen provider within the card (e.g. 'postmark'), if applicable. */
  provider?: string;
  connectedAt?: string;
  lastVerifiedAt?: string;
  /** Non-secret metadata shown on the card (e.g. marketplace id). */
  metadata?: Record<string, string>;
  /** Actual error text from the last failed step — never a generic message. */
  error?: string;
  /**
   * TRUE while credentials are simulated locally (no live backend / §14
   * Edge Functions wired yet). A sandbox connection must never be treated
   * as a verified production connection by gating code.
   */
  sandbox: boolean;
}

export type IntegrationsMap = Record<IntegrationId, IntegrationState>;

export const INITIAL_INTEGRATIONS: IntegrationsMap = {
  amazon_sp_api: { status: 'disconnected', sandbox: false },
  amazon_ads: { status: 'disconnected', sandbox: false },
  stripe: { status: 'disconnected', sandbox: false },
  esignature: { status: 'disconnected', sandbox: false },
  email: { status: 'disconnected', sandbox: false },
  lead_sourcing: { status: 'disconnected', sandbox: false },
  openrouter: { status: 'disconnected', sandbox: false },
  hunter: { status: 'disconnected', sandbox: false },
  instantly: { status: 'disconnected', sandbox: false },
  keepa: { status: 'disconnected', sandbox: false },
  firecrawl: { status: 'disconnected', sandbox: false },
  usertour: { status: 'connected', sandbox: true, connectedAt: '2026-09-05T00:00:00.000Z', lastVerifiedAt: '2026-09-05T00:00:00.000Z', metadata: { note: 'Self-hosted Docker service — provisioned via vps-bootstrap.sh on the Mercenta VPS.' } },
  rocketchat: { status: 'disconnected', sandbox: false },
  twilio_whatsapp: { status: 'disconnected', sandbox: false },
  postiz: { status: 'disconnected', sandbox: false },
};

/** API keys are held IN-MEMORY ONLY until Vault-backed storage is wired. */
const apiKeyMemory = new Map<string, string>();

export function rememberApiKey(id: IntegrationId, key: string): void {
  apiKeyMemory.set(id, key);
}

export function peekApiKey(id: IntegrationId): string | undefined {
  return apiKeyMemory.get(id);
}

export function isConnected(state: IntegrationState | undefined): boolean {
  return state?.status === 'connected' && !state.sandbox;
}
