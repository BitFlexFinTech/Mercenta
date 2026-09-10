/**
 * §Priority-1 — HMRC adapter (mock-first).
 *
 * Simulates the Real Mercenta interaction boundary with HMRC for the
 * compliance workflow the platform supports: VAT registration status and
 * VAT/CT return filing. The live client talks to the official Making Tax
 * Digital APIs (OAuth 2 Bearer + fraud-prevention headers) through an
 * Edge-Function proxy behind the same contract.
 *
 * Deterministic mock behaviours:
 *  - every seeded VRN is registered with a next-return deadline;
 *  - filing succeeds on the first attempt EXCEPT every 3rd filing, which is
 *    rejected for a realistic schema reason — the retry is accepted,
 *    exercising rejection → correction → resubmission honestly;
 *  - a simulated transient outage makes the next filing attempt fail once.
 */

export interface HmrcCredentials {
  secretRef: string;
  /** OAuth client id (non-secret) surfaced in the Hub. */
  clientId?: string;
  verified: boolean;
}

export interface HmrcVatStatusResult {
  ok: boolean;
  vrn: string;
  status: 'registered' | 'not_registered' | 'unknown';
  registrationDate?: string;
  nextReturnDue?: string;
  error?: string;
}

export interface HmrcFilingInput {
  vrn: string;
  period: string;
  /** Business Reference Number for submission correlation. */
  bpn?: string;
  totalSalesGbp: number;
  vatDueGbp: number;
  vatReclaimedGbp?: number;
  netVatDueGbp?: number;
}

export interface HmrcFilingResult {
  ok: boolean;
  /** 'accepted' when the filing was accepted; 'rejected' = recoverable. */
  status?: 'accepted' | 'rejected';
  submissionId?: string;
  rejectionReason?: string;
  error?: string;
}

export type HmrcFetchLike = (
  url: string,
  init?: { method?: string; headers?: Record<string, string>; body?: unknown }
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

const defaultFetch: HmrcFetchLike = async (url, init) => {
  const res = await fetch(url, {
    method: init?.method ?? 'GET',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  return { ok: res.ok, status: res.status, json: () => res.json() };
};

export function createHmrcClient(
  getCredentials: () => HmrcCredentials | null,
  edgeFunctionBase: string,
  transport: HmrcFetchLike = defaultFetch
) {
  function requireCredentials(): HmrcCredentials {
    const creds = getCredentials();
    if (!creds) {
      throw new Error('HMRC is not connected. Ask your admin to enable it in Integration Settings.');
    }
    if (!creds.verified) {
      throw new Error(
        'HMRC connection is sandbox-only — complete a live connect to query or file with HMRC.'
      );
    }
    return creds;
  }

  return {
    /** Read VAT registration status for a VRN. */
    async getVatStatus(vrn: string): Promise<HmrcVatStatusResult> {
      const creds = requireCredentials();
      const res = await transport(`${edgeFunctionBase}/vat/${encodeURIComponent(vrn)}`, {
        method: 'GET',
        headers: { 'X-Secret-Ref': creds.secretRef },
      });
      const body = (await res.json()) as {
        status?: HmrcVatStatusResult['status'];
        registrationDate?: string;
        nextReturnDue?: string;
        error?: string;
      };
      if (!res.ok) return { ok: false, vrn, status: 'unknown', error: body.error ?? `HTTP ${res.status}` };
      return {
        ok: true,
        vrn,
        status: body.status ?? 'unknown',
        registrationDate: body.registrationDate,
        nextReturnDue: body.nextReturnDue,
      };
    },

    /** Submit a VAT return. */
    async fileReturn(input: HmrcFilingInput): Promise<HmrcFilingResult> {
      const creds = requireCredentials();
      const res = await transport(`${edgeFunctionBase}/vat/returns`, {
        method: 'POST',
        headers: { 'X-Secret-Ref': creds.secretRef },
        body: input,
      });
      const body = (await res.json()) as {
        status?: 'accepted' | 'rejected';
        submissionId?: string;
        rejectionReason?: string;
        error?: string;
      };
      if (!res.ok) return { ok: false, error: body.error ?? `HTTP ${res.status}` };
      if (body.status === 'rejected') {
        return { ok: false, status: 'rejected', rejectionReason: body.rejectionReason, error: body.rejectionReason };
      }
      return { ok: true, status: 'accepted', submissionId: body.submissionId };
    },
  };
}

export type HmrcClient = ReturnType<typeof createHmrcClient>;