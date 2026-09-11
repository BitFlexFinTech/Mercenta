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
 */
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
  send(req: OutreachTransportRequest): Promise<OutreachTransportResult>;
}

/**
 * Deterministic simulation transport — never performs a network call and never
 * reports itself as a live delivery. This is what runs when no live provider is
 * connected.
 */
export const simulationOutreachTransport: OutreachTransport = {
  mode: 'simulation',
  async send(): Promise<OutreachTransportResult> {
    return { ok: true, sandbox: true };
  },
};

/**
 * Adapt the existing email provider client into an outreach transport.
 * `live` mirrors `useBrandComms().emailLive` — a verified, non-sandbox
 * connection. When it is false the transport is the simulation path.
 */
export function transportFromEmailClient(
  client: { send(req: OutreachTransportRequest): Promise<OutreachTransportResult> },
  live: boolean
): OutreachTransport {
  return {
    mode: live ? 'live' : 'simulation',
    send: (req) => client.send(req),
  };
}
