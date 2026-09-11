/**
 * §Phase C — outreach transport seam (mock-first).
 *
 * The acquisition workflow must ALWAYS be operable with no provider
 * credentials, and must activate a connected provider later WITHOUT changing
 * the workflow. This seam provides exactly that:
 *
 *   simulationOutreachTransport  — deterministic, zero network, always available
 *   transportFromEmailClient(...) — wraps the EXISTING email provider client
 *                                   (`createEmailClient`, lib/messaging/email.ts)
 *                                   which the Integrations card already configures
 *
 * No second simulation framework and no second provider system: the same
 * credentials/sandbox semantics that gate the Messages Hub gate outreach here.
 *
 * §Phase D3 hardening — the transport's provider state is DERIVED from the
 * canonical integration mode model (`modeForState` + the registry default),
 * never from a caller-supplied boolean, and a send is only ever recorded as
 * `live` after the transport is VERIFIED live (credential-verified). Every
 * other state — available/unconfigured, unknown, not_registered, configuring,
 * degraded, error, disabled — resolves to the deterministic simulation
 * transport, which performs ZERO network calls. UNKNOWN is never treated as
 * live, and a live send is never fabricated.
 */
import { integrationMeta } from '@/integrations/registry';
import {
  modeForState,
  type IntegrationState,
  type ProviderResolutionMode,
} from '@/integrations/types';

export interface OutreachTransportRequest {
  to: string;
  subject: string;
  body: string;
}

export interface OutreachTransportResult {
  ok: boolean;
  error?: string;
  /** true when the provider is connected in sandbox mode (no real delivery). */
  sandbox?: boolean;
}

export interface OutreachTransport {
  /** 'simulation' = no live provider connected; 'live' = connected provider. */
  readonly mode: 'simulation' | 'live';
  /** §Phase D3 — the provider state this transport was resolved from (audit/labels). */
  readonly providerState: OutreachProviderState;
  /**
   * §Phase D3 — present on transports that claim `live`. Returns true ONLY when
   * the provider's credentials are actually verified. The domain refuses a live
   * send when this is absent or false (fail closed).
   */
  readonly isVerifiedLive?: () => boolean;
  send(req: OutreachTransportRequest): Promise<OutreachTransportResult>;
}

/**
 * §Phase D3 — the resolved provider state of an outreach transport.
 * Only `live` can perform a real delivery; `not_configured`/`unavailable` are
 * the documented simulation default (`UNKNOWN ≠ LIVE`).
 */
export type OutreachProviderState =
  /** Connected, non-sandbox, credentials verified. */
  | 'live'
  /** Connected in sandbox — no real delivery (no network). */
  | 'sandbox'
  /** No connection exists: the documented deterministic simulation default. */
  | 'not_configured'
  /** The provider reported a problem (degraded/error/disabled) or claimed live without verified credentials. */
  | 'unavailable';

/**
 * §Phase D3 — true only when a transport both claims `live` AND proves its
 * credentials are verified. THE fail-closed check used by the send path.
 */
export function isVerifiedLiveTransport(transport: OutreachTransport): boolean {
  return transport.mode === 'live' && Boolean(transport.isVerifiedLive?.());
}

/** Honest operator-facing description of the resolved provider state. */
export function describeOutreachProvider(state: OutreachProviderState): string {
  switch (state) {
    case 'live':
      return 'connected provider (verified)';
    case 'sandbox':
      return 'sandbox provider (no real delivery)';
    case 'unavailable':
      return 'provider unavailable — simulation (no provider connected)';
    default:
      return 'simulation (no provider connected)';
  }
}

/**
 * Deterministic simulation transport — never performs a network call and never
 * reports itself as a live delivery. This is what runs when no live provider is
 * connected.
 */
export const simulationOutreachTransport: OutreachTransport = {
  mode: 'simulation',
  providerState: 'not_configured',
  async send(): Promise<OutreachTransportResult> {
    return { ok: true, sandbox: true };
  },
};

/**
 * Adapt the existing email provider client into an outreach transport.
 * `live` mirrors a verified, non-sandbox connection.
 *
 * This is the LOW-LEVEL adapter. Product code should prefer
 * `resolveOutreachTransport()`, which derives the mode from the canonical
 * integration state instead of a caller-supplied boolean — and which fails
 * closed when a live claim is not backed by verified credentials.
 */
export function transportFromEmailClient(
  client: {
    send(req: OutreachTransportRequest): Promise<OutreachTransportResult>;
    isLive?(): boolean;
  },
  live: boolean
): OutreachTransport {
  return {
    mode: live ? 'live' : 'simulation',
    providerState: live ? 'live' : 'sandbox',
    /** A live claim is honoured ONLY when the client itself verifies credentials. */
    isVerifiedLive: () => Boolean(live && (client.isLive?.() ?? false)),
    send: (req) => client.send(req),
  };
}

/**
 * §Phase D3 — THE canonical outreach transport resolution.
 *
 * Derives the provider mode from the integration registry's own mode model
 * (`modeForState` + the `email` registry default) so the decision cannot drift
 * from the Integrations Hub, and returns both the transport and the honest
 * provider state.
 *
 * Fail-closed rules:
 *  - only a positively-resolved `live` mode yields a live transport;
 *  - a live mode is downgraded to simulation when no client is available OR the
 *    client's credentials are not verified (never a silent live claim);
 *  - degraded/error/disabled resolve to `unavailable` (simulation, no network);
 *  - available/unconfigured/unknown/not_registered resolve to
 *    `not_configured` (the documented simulation default, no network).
 */
export function resolveOutreachTransport(
  emailState: IntegrationState | undefined,
  client?: { send(req: OutreachTransportRequest): Promise<OutreachTransportResult>; isLive?(): boolean } | null
): ResolvedOutreachTransport {
  const resolvedMode: ProviderResolutionMode = modeForState(
    emailState,
    integrationMeta('email').defaultMode
  );
  const simulate = (providerState: OutreachProviderState): ResolvedOutreachTransport => ({
    transport: simulationOutreachTransport,
    providerState,
    resolvedMode,
    live: false,
  });

  if (resolvedMode === 'live') {
    if (!client) return simulate('unavailable');
    const transport = transportFromEmailClient(client, true);
    return isVerifiedLiveTransport(transport)
      ? { transport, providerState: 'live', resolvedMode, live: true }
      : simulate('unavailable');
  }
  if (resolvedMode === 'simulation') {
    if (!client) return simulate('not_configured');
    return {
      transport: transportFromEmailClient(client, false),
      providerState: 'sandbox',
      resolvedMode,
      live: false,
    };
  }
  if (resolvedMode === 'degraded' || resolvedMode === 'error' || resolvedMode === 'disabled') {
    return simulate('unavailable');
  }
  return simulate('not_configured');
}

/** The resolution result: the transport plus the honest provider state. */
export interface ResolvedOutreachTransport {
  transport: OutreachTransport;
  providerState: OutreachProviderState;
  /** The canonical registry-resolved mode this decision came from (audit/labels). */
  resolvedMode: ProviderResolutionMode;
  /** True ONLY when a real provider delivery is possible. */
  live: boolean;
}
