/**
 * §7/§9/§14 — Transactional email adapter (Postmark / SendGrid), mock-first.
 *
 * Factory discipline: a verified live connection returns the REAL client
 * (Edge-Function send — deploy `/email/send` before production use);
 * anything else returns the MOCK client with unmistakably fake message ids
 * (`mock:msg-…`) so outreach sequencing is fully navigable today.
 */
import type { FetchLike } from '@/lib/spapi/client';

export interface MailConnection {
  /** Chosen provider inside the wizard card ('postmark' | 'sendgrid'). */
  provider?: string;
  secretRef?: string;
  verified: boolean;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
}

export interface SendEmailResult {
  ok: boolean;
  messageId?: string;
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

export function createRealMailClient(
  connection: MailConnection & { secretRef: string },
  edgeFunctionBase: string,
  transport: FetchLike = defaultFetch
) {
  return {
    async sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
      const res = await transport(`${edgeFunctionBase}/send-email`, {
        method: 'POST',
        headers: { 'X-Secret-Ref': connection.secretRef },
        body: { ...input, provider: connection.provider ?? 'postmark' },
      });
      const body = (await res.json()) as SendEmailResult;
      if (!res.ok) return { ok: false, error: body.error ?? `HTTP ${res.status}` };
      return { ok: true, messageId: body.messageId };
    },
  };
}

/* ── Mock client ──────────────────────────────────────────────────────── */

/**
 * Simulated behaviours:
 *  - well-formed addresses deliver with a `mock:msg-…` id;
 *  - malformed addresses simulate a realistic hard bounce so downstream
 *    bounce-handling code stays testable.
 */
export function createMockMailClient(): { sendEmail(input: SendEmailInput): Promise<SendEmailResult> } {
  return {
    async sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
      await delay(180);
      const addr = input.to.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(addr)) {
        return {
          ok: false,
          error: `Invalid recipient address "${addr}" — message not sent`,
        };
      }
      mockMessageCounter += 1;
      return { ok: true, messageId: `mock:msg-${String(mockMessageCounter).padStart(5, '0')}` };
    },
  };
}

let mockMessageCounter = 0;

export function resetMockMailState(): void {
  mockMessageCounter = 0;
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/* ── Factory ──────────────────────────────────────────────────────────── */

/** Nothing outside this factory knows or cares which implementation is active. */
export function createMailClient(
  getConnection: () => MailConnection | null,
  edgeFunctionBase: string,
  transport: FetchLike = defaultFetch
) {
  const conn = getConnection();
  if (conn && conn.verified && conn.secretRef) {
    return createRealMailClient(conn as MailConnection & { secretRef: string }, edgeFunctionBase, transport);
  }
  return createMockMailClient();
}
