/**
 * §4/§14 — E-signature adapter (DocuSign / PandaDoc), built mock-first.
 *
 * Factory discipline (same seam as the SP-API + Stripe clients):
 *  - a verified live connection returns the REAL client (Edge-Function
 *    envelope send — deploy `/esign/envelope` before production use);
 *  - anything else returns the MOCK client with unmistakably fake envelope
 *    ids (`mock:env-…`) and realistic lifecycle simulation, so the whole
 *    contract send/sign flow is navigable today.
 */
import type { FetchLike } from '@/lib/spapi/client';

export interface EsignConnection {
  /** Chosen provider inside the wizard card ('docusign' | 'pandadoc'). */
  provider?: string;
  secretRef?: string;
  verified: boolean;
}

export type EnvelopeStatus = 'sent' | 'viewed' | 'completed' | 'declined';

export interface SendForSignatureInput {
  contractId: string;
  documentText: string;
  signatoryName: string;
  signatoryEmail: string;
}

export interface EnvelopeResult {
  ok: boolean;
  envelopeId?: string;
  error?: string;
}

export interface EnvelopeStatusResult {
  ok: boolean;
  status?: EnvelopeStatus;
  declineReason?: string;
  error?: string;
}

const defaultFetch: FetchLike = async (url, init) => {
  const res = await fetch(url, {
    method: init?.method ?? 'POST',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  return { ok: res.ok, status: res.status, json: () => res.json() };
};

/* ── Real client ──────────────────────────────────────────────────────── */

export function createRealEsignClient(
  connection: EsignConnection & { secretRef: string },
  edgeFunctionBase: string,
  transport: FetchLike = defaultFetch
) {
  return {
    async sendForSignature(input: SendForSignatureInput): Promise<EnvelopeResult> {
      const res = await transport(`${edgeFunctionBase}/esign-envelope`, {
        method: 'POST',
        headers: { 'X-Secret-Ref': connection.secretRef },
        body: { ...input, provider: connection.provider ?? 'docusign' },
      });
      const body = (await res.json()) as EnvelopeResult;
      if (!res.ok) return { ok: false, error: body.error ?? `HTTP ${res.status}` };
      return { ok: true, envelopeId: body.envelopeId };
    },

    async getEnvelopeStatus(envelopeId: string): Promise<EnvelopeStatusResult> {
      const res = await transport(
        `${edgeFunctionBase}/esign-envelope/${encodeURIComponent(envelopeId)}`,
        { method: 'GET', headers: { 'X-Secret-Ref': connection.secretRef } }
      );
      const body = (await res.json()) as EnvelopeStatusResult;
      if (!res.ok) return { ok: false, error: body.error ?? `HTTP ${res.status}` };
      return { ok: true, status: body.status, declineReason: body.declineReason };
    },
  };
}

/* ── Mock client ──────────────────────────────────────────────────────── */

/**
 * Simulated behaviours:
 *  - envelopes advance sent → viewed → completed on successive polls;
 *  - every 4th envelope is DECLINED after two polls with a realistic reason
 *    so the rejection path stays testable too;
 *  - unknown envelope ids fail exactly like the real API would.
 */
export interface MockEnvelopeState {
  id: string;
  polls: number;
  willDecline: boolean;
}

const envelopes = new Map<string, MockEnvelopeState>();
let envelopeCounter = 0;

export function resetMockEsignState(): void {
  envelopes.clear();
  envelopeCounter = 0;
}

const DECLINE_REASONS = [
  'Signatory rejected the commission rate pending commercial review',
  'Signatory requested redlines to the payment-terms clause',
];

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function createMockEsignClient(): {
  sendForSignature(input: SendForSignatureInput): Promise<EnvelopeResult>;
  getEnvelopeStatus(envelopeId: string): Promise<EnvelopeStatusResult>;
} {
  return {
    async sendForSignature(input: SendForSignatureInput): Promise<EnvelopeResult> {
      await delay(220);
      void input;
      envelopeCounter += 1;
      const id = `mock:env-${String(envelopeCounter).padStart(5, '0')}`;
      envelopes.set(id, {
        id,
        polls: 0,
        willDecline: envelopeCounter % 4 === 0,
      });
      return { ok: true, envelopeId: id };
    },

    async getEnvelopeStatus(envelopeId: string): Promise<EnvelopeStatusResult> {
      await delay(120);
      const env = envelopes.get(envelopeId);
      if (!env) return { ok: false, error: `No such envelope: ${envelopeId}` };
      env.polls += 1;
      if (env.willDecline && env.polls >= 3) {
        return {
          ok: true,
          status: 'declined',
          declineReason: DECLINE_REASONS[envelopeCounter % DECLINE_REASONS.length],
        };
      }
      if (env.polls >= 3) return { ok: true, status: 'completed' };
      if (env.polls === 2) return { ok: true, status: 'viewed' };
      return { ok: true, status: 'sent' };
    },
  };
}

/* ── Factory ──────────────────────────────────────────────────────────── */

/** Nothing outside this factory knows or cares which implementation is active. */
export function createEsignClient(
  getConnection: () => EsignConnection | null,
  edgeFunctionBase: string,
  transport: FetchLike = defaultFetch
) {
  const conn = getConnection();
  if (conn && conn.verified && conn.secretRef) {
    return createRealEsignClient(conn as EsignConnection & { secretRef: string }, edgeFunctionBase, transport);
  }
  return createMockEsignClient();
}
