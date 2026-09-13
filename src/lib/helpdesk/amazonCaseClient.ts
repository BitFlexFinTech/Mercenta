/**
 * §Canonical model §15 — Amazon (provider) CASE escalation seam.
 *
 * Brand case → Mercenta review → **this seam** → Amazon case → response.
 *
 * Fail-closed, exactly like every other provider seam in the platform: the
 * REAL client is chosen only from a positively-resolved connection. Only an
 * explicitly-identified `simulation` provider may produce a simulated case;
 * `unknown` / `not_registered` / `disabled` / `configuring` / `live` with no
 * credentials / `degraded` / `error` all resolve to an UNAVAILABLE client that
 * returns a truthful error — they are never silently treated as simulation.
 *
 * The Mock client is deterministic (same idempotency key ⇒ same case reference)
 * and never performs a network call.
 */
import type { ProviderResolutionMode } from '@/integrations/types';
import { isProviderSimulationSafe } from '@/integrations/types';

export interface CaseOpenResult {
  ok: boolean;
  caseReferenceId?: string;
  error?: string;
  /** True only when this result came from a simulated provider. */
  simulated?: boolean;
}

export interface CaseProviderClient {
  readonly mode: 'simulation' | 'live' | 'unavailable';
  /** Idempotent: the same key returns the same provider case, never a second one. */
  openCase(input: {
    idempotencyKey: string;
    subject: string;
    body: string;
    relatedRef?: string;
  }): Promise<CaseOpenResult>;
}

/** Deterministic hash → short uppercase token (no crypto, no network). */
function shortHash(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36).toUpperCase().padStart(6, '0');
}

/**
 * Marker a case body may carry to deterministically exercise the provider
 * FAILURE path (used by the recovery stage / tests). Never present in
 * production copy.
 */
export const SIMULATED_PROVIDER_FAILURE_MARKER = '[SIMULATE-PROVIDER-FAILURE]';

const mockCases = new Map<string, string>();

/** Test/demo reset — clears the simulated provider case ledger. */
export function resetMockAmazonCases(): void {
  mockCases.clear();
}

export class MockAmazonCaseClient implements CaseProviderClient {
  readonly mode = 'simulation' as const;

  async openCase(input: {
    idempotencyKey: string;
    subject: string;
    body: string;
    relatedRef?: string;
  }): Promise<CaseOpenResult> {
    const existing = mockCases.get(input.idempotencyKey);
    if (existing) return { ok: true, caseReferenceId: existing, simulated: true };

    if (input.body.includes(SIMULATED_PROVIDER_FAILURE_MARKER)) {
      return {
        ok: false,
        error:
          'Simulated provider rejection: the retail-channel case API is unavailable for this request. Retry is safe — no case was created.',
        simulated: true,
      };
    }

    const referenceId = `AMZ-CASE-MOCK-${shortHash(input.idempotencyKey)}`;
    mockCases.set(input.idempotencyKey, referenceId);
    return { ok: true, caseReferenceId: referenceId, simulated: true };
  }
}

/**
 * The unconfigured/unknown client — every non-simulation mode resolves here.
 * It NEVER pretends a case was created.
 */
export class UnavailableAmazonCaseClient implements CaseProviderClient {
  readonly mode = 'unavailable' as const;
  constructor(private readonly resolvedMode: ProviderResolutionMode) {}

  async openCase(): Promise<CaseOpenResult> {
    return {
      ok: false,
      error:
        `The retail-channel case integration is not available in "${this.resolvedMode}" mode. ` +
        'No case was submitted. Resolve the provider connection (or run in simulation) and retry — the same case will not be duplicated.',
    };
  }
}

export interface RealAmazonCaseClientConfig {
  edgeFunctionBase: string;
  secretRef: string;
  transport: import('@/lib/spapi/client').FetchLike;
}

export class RealAmazonCaseClient implements CaseProviderClient {
  readonly mode = 'live' as const;
  constructor(private readonly cfg: RealAmazonCaseClientConfig) {}

  async openCase(input: {
    idempotencyKey: string;
    subject: string;
    body: string;
    relatedRef?: string;
  }): Promise<CaseOpenResult> {
    const res = await this.cfg.transport(`${this.cfg.edgeFunctionBase}/retail-channel/cases`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Secret-Ref': this.cfg.secretRef,
        'Idempotency-Key': input.idempotencyKey,
      },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      return { ok: false, error: `Retail-channel case submission failed (HTTP ${res.status}). No case was created — retry is safe.` };
    }
    const json = (await res.json()) as { caseId?: string };
    return { ok: true, caseReferenceId: json.caseId, simulated: false };
  }
}

/**
 * Choose the client from a POSITIVELY-RESOLVED provider mode.
 * Fail-closed: only `simulation` yields the mock.
 */
export function createCaseProviderClient(
  resolvedMode: ProviderResolutionMode,
  liveConfig?: RealAmazonCaseClientConfig
): CaseProviderClient {
  if (isProviderSimulationSafe(resolvedMode)) return new MockAmazonCaseClient();
  if (resolvedMode === 'live' && liveConfig) return new RealAmazonCaseClient(liveConfig);
  return new UnavailableAmazonCaseClient(resolvedMode);
}
