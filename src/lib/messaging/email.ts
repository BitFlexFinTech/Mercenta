/**
 * §9 — Transactional email adapter (Postmark or SendGrid).
 *
 * Provider choice comes from the §14 email connection card, credentials from
 * its secret store reference — never env vars. Disconnected connections
 * refuse to send; sandbox-only connections may send but every message they
 * produce is marked sandbox so the UI can label them honestly.
 *
 * THE ALWAYS-LOG RULE: whatever the transport outcome, the caller must log
 * the Message (logMessage in src/data/api.ts) so nothing is lost when staff
 * change.
 */
import type { FetchLike } from '@/lib/spapi/client';

export interface EmailCredentials {
  secretRef: string;
  /** 'postmark' | 'sendgrid' — chosen on the §14 card. */
  provider: string;
  verified: boolean;
}

export interface SendEmailRequest {
  to: string;
  subject: string;
  body: string;
}

export interface SendEmailResult {
  ok: boolean;
  error?: string;
  /** true when sent through the simulated sandbox path. */
  sandbox?: boolean;
}

const defaultFetch: FetchLike = async (url, init) => {
  const res = await fetch(url, {
    method: init?.method ?? 'POST',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  return { ok: res.ok, status: res.status, json: () => res.json() };
};

export function createEmailClient(
  getCredentials: () => EmailCredentials | null,
  edgeFunctionBase: string,
  transport: FetchLike = defaultFetch
) {
  const credsSafe = (): EmailCredentials | null => {
    try {
      return getCredentials();
    } catch {
      return null;
    }
  };

  return {
    /** True only for verified (non-sandbox) connections — gates real sends. */
    isLive(): boolean {
      const creds = credsSafe();
      return Boolean(creds && creds.verified);
    },

    async send(req: SendEmailRequest): Promise<SendEmailResult> {
      const creds = credsSafe();
      if (!creds) {
        return { ok: false, error: 'EMAIL_NOT_CONNECTED' };
      }
      if (!creds.verified) {
        // Sandbox path: caller logs the message and marks it sandbox-sent.
        return { ok: true, sandbox: true };
      }
      const res = await transport(`${edgeFunctionBase}/send`, {
        method: 'POST',
        headers: { 'X-Secret-Ref': creds.secretRef, 'X-Provider': creds.provider },
        body: req,
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        return { ok: false, error: body.error ?? `HTTP ${res.status}` };
      }
      return { ok: true };
    },
  };
}

