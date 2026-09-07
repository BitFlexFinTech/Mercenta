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

/**
 * §8 — standardized integration operational mode. The mode model the whole
 * Integrations Hub reads. It is DERIVED from connection state + sandbox flag
 * (see `modeForState`) and can be operator-forced via `disabled`.
 *
 * The cardinal rule: SIMULATION must never be presented or gated as LIVE.
 */
export type IntegrationMode =
  | 'simulation'
  | 'available'
  | 'configuring'
  | 'live'
  | 'degraded'
  | 'error'
  | 'disabled';

export const INTEGRATION_MODE_LABELS: Record<IntegrationMode, string> = {
  simulation: 'Simulation',
  available: 'Available',
  configuring: 'Configuring',
  live: 'Live',
  degraded: 'Degraded',
  error: 'Error',
  disabled: 'Disabled',
};

/** §11 — health snapshot shown in the Hub; never fabricated for LIVE mode. */
export interface IntegrationHealth {
  /** False when the stored credential fails an auth check. */
  authValid?: boolean;
  lastSyncAt?: string;
  lastTestOk?: boolean;
  lastErrorAt?: string;
  errorCount: number;
  /** Provider-reported status when available (SIMULATION may report simulated). */
  providerStatus?: string;
  /** OAuth token expiry, when applicable. */
  credentialExpiry?: string;
  /** Last successful request to the provider. */
  lastSuccessfulRequestAt?: string;
}

/** §36 — conceptual grouping for the Integrations Hub + admin IA. */
export type IntegrationCategory =
  | 'core'
  | 'commerce'
  | 'finance'
  | 'logistics'
  | 'communications'
  | 'marketing'
  | 'data'
  | 'ai'
  | 'compliance'
  | 'infrastructure';

export const INTEGRATION_CATEGORY_LABELS: Record<IntegrationCategory, string> = {
  core: 'Core',
  commerce: 'Commerce',
  finance: 'Finance',
  logistics: 'Logistics',
  communications: 'Communications',
  marketing: 'Marketing',
  data: 'Data',
  ai: 'AI & Research',
  compliance: 'Compliance',
  infrastructure: 'Infrastructure',
};

export interface IntegrationConnectionTestResult {
  ok: boolean;
  httpStatus?: number;
  error?: string;
  data?: unknown;
}

/**
 * §4 — provider contract. Every real integration is a LIVE implementation of
 * this contract; every simulated one is a Mock implementation of the same
 * contract with `isLive: false`. Callers depend only on this interface.
 */
export interface IntegrationProvider {
  id: IntegrationId;
  /** True ONLY when this implementation talks to the real external service. */
  isLive: boolean;
  testConnection(): Promise<IntegrationConnectionTestResult>;
  /** Optional real/simulated health probe. */
  health?(): Promise<IntegrationHealth>;
}

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
  /** §2A — health snapshot for the Integrations Hub. */
  health?: IntegrationHealth;
  /** Operator-forced OFF. Keeps config intact; mode derives to 'disabled'. */
  disabled?: boolean;
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
  return state?.status === 'connected' && !state.sandbox && !state.disabled;
}

/**
 * §8 — derive the operational MODE from connection state. Deterministic:
 * the same state always yields the same mode. Operator `disabled` always
 * wins. A sandbox `connected` is NEVER 'live'.
 */
export function modeForState(
  state: IntegrationState | undefined,
  defaultMode: IntegrationMode
): IntegrationMode {
  if (!state) return defaultMode;
  if (state.disabled) return 'disabled';
  if (state.status === 'connected') return state.sandbox ? 'simulation' : 'live';
  if (state.status === 'connecting') return 'configuring';
  if (state.status === 'code_received') return 'configuring';
  if (state.status === 'needs_attention') return state.error ? 'error' : 'degraded';
  return defaultMode;
}
