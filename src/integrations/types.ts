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
  | 'twilio_whatsapp'
  | 'postiz'
  // §Phase 4 — scenario-required providers registered so their mode is
  // authoritative (docs-verified current state: DHL waiting/simulation,
  // Xero demo/simulation). No longer implicit/unknown.
  | 'dhl'
  // §Canonical model §11 — the UK-domestic Mercenta carrier account. Registered
  // so its mode is authoritative (no adapter yet → `available`, never
  // simulation-by-accident).
  | 'palletline'
  | 'xero'
  // §Priority-1 — compliance providers registered so their mode is
  // authoritative and the safety gate can resolve them (never UNKNOWN).
  | 'companies_house'
  | 'hmrc'
  // §Canonical model §6 / T-1 — the payout rails. Payoneer is the DEFAULT rail
  // Mercenta pays brands through (and the retail-channel payment account); Wise
  // is the SECONDARY rail. Registered so their
  // mode is authoritative and an unregistered rail can never be treated as
  // simulation by accident. Xero (accounting) and Stripe (subscriptions) are
  // explicitly NOT payout rails — see `src/config/payouts.ts`.
  | 'wise'
  | 'payoneer'
  // §21 (M13 Phase 8) — Google Drive / Docs / Sheets / Slides / Calendar via the
  // founder's personal Google account. Registered so its mode is authoritative
  // (OAuth connect, no API-key form) and an unconfigured Google can never be
  // treated as simulation by accident.
  | 'google';

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
  twilio_whatsapp: { status: 'disconnected', sandbox: false },
  postiz: { status: 'disconnected', sandbox: false },
  // §Phase 4 — scenario-required providers with authoritative (docs-verified)
  // simulation default. They are simulation-capable ONLY because current
  // repository state confirms DHL = waiting/simulation, Xero = demo/simulation.
  dhl: { status: 'disconnected', sandbox: false },
  // §Canonical model §11 — registered so the routing rule's carrier resolves
  // authoritatively. No live adapter yet: defaultMode is `available`.
  palletline: { status: 'disconnected', sandbox: false },
  xero: { status: 'disconnected', sandbox: false },
  // §Priority-1 — compliance providers simulation-capable by docs-verified
  // current state (no live credentials held). Registered so the safety gate
  // resolves them authoritatively — never UNKNOWN.
  companies_house: { status: 'disconnected', sandbox: false },
  hmrc: { status: 'disconnected', sandbox: false },
  // §Canonical model §6 — payout rails. Simulation is authoritative until real
  // rail credentials are configured; entering credentials activates the already
  // built `payouts-transfer` Edge Function with no other code change.
  wise: { status: 'disconnected', sandbox: false },
  payoneer: { status: 'disconnected', sandbox: false },
  // §21 (M13 Phase 8) — Google. Disconnected until the founder completes the
  // OAuth flow; the wizard drives it and never claims 'connected' without a
  // confirmed server-side token exchange.
  google: { status: 'disconnected', sandbox: false },
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

/* ── §Phase 4 — authoritative provider-mode safety resolution ───────────── */

/**
 * A provider-resolution mode adds the two states that are NOT positive
 * configuration: `unknown` (a provider listed by a scenario that has no
 * registry entry) and `not_registered`.
 *
 * §UNKNOWN ≠ SIMULATION — only a mode positively identified as `simulation`
 * is safe for simulated execution. Everything else (including `available`,
 * `configuring`, `disabled`, `unknown`, `not_registered`) is NOT provably
 * simulation-isolated and must be treated as UNKNOWN/UNSAFE unless the
 * scenario demonstrably does not require that provider's external execution.
 */
export type ProviderResolutionMode = IntegrationMode | 'unknown' | 'not_registered';

/**
 * The ONLY mode that is simulation-safe. All other modes — including
 * AVAILABLE/UNCONFIGURED and DISABLED — are NOT safe by default.
 */
export function isProviderSimulationSafe(
  mode: ProviderResolutionMode | undefined
): mode is 'simulation' {
  return mode === 'simulation';
}

/**
 * Resolve a provider's current mode from the authoritative modes map.
 * Not present in the map → `not_registered` (unsafe, never simulation).
 */
export function resolveProviderMode(
  modes: Partial<Record<IntegrationId, IntegrationMode>>,
  providerId: string
): ProviderResolutionMode {
  const mode = (modes as Record<string, IntegrationMode | undefined>)[providerId];
  return mode ?? 'not_registered';
}
