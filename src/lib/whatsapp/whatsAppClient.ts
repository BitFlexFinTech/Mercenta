/**
 * WhatsApp Escalation — Twilio WhatsApp Business API client (mock-first).
 *
 * Triggers ONLY for hot-lead/escalation events (a brand explicitly asking for
 * a human, a prospect wanting to book a call/negotiate terms). Never fires for
 * routine automated actions. Additive to the existing in-app/email notification.
 *
 * Mock client always active when no Twilio credentials are configured.
 * Real client activates when Twilio Account SID, Auth Token, and WhatsApp
 * sender number are entered in the Integrations wizard.
 */

export interface WhatsAppMessage {
  to: string;           // E.164 format, e.g. "+447700900000"
  body: string;
  mediaUrl?: string;
}

export interface WhatsAppSendResult {
  ok: boolean;
  messageSid?: string;
  error?: string;
}

export interface IWhatsAppClient {
  ping(): Promise<{ ok: boolean; error?: string }>;
  sendTemplate(to: string, templateName: string, variables: Record<string, string>): Promise<WhatsAppSendResult>;
  sendMessage(to: string, body: string): Promise<WhatsAppSendResult>;
}

/* ── MockClient (no Twilio credentials needed) ──────────────────────────── */

function uid(prefix: string): string {
  return prefix + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
}

export class MockWhatsAppClient implements IWhatsAppClient {
  private sent: { to: string; body: string; timestamp: string }[] = [];

  async ping(): Promise<{ ok: boolean; error?: string }> {
    return { ok: true };
  }

  async sendTemplate(to: string, templateName: string, variables: Record<string, string>): Promise<WhatsAppSendResult> {
    const body = `[Mock Template: ${templateName}] ${JSON.stringify(variables)}`;
    this.sent.push({ to, body, timestamp: new Date().toISOString() });
    return { ok: true, messageSid: uid('WA-mock') };
  }

  async sendMessage(to: string, body: string): Promise<WhatsAppSendResult> {
    this.sent.push({ to, body, timestamp: new Date().toISOString() });
    return { ok: true, messageSid: uid('WA-mock') };
  }

  getSentMessages(): { to: string; body: string; timestamp: string }[] {
    return [...this.sent];
  }
}

/* ── RealClient (Twilio WhatsApp Business API) ───────────────────────────── */

export class RealWhatsAppClient implements IWhatsAppClient {
  constructor(
    private accountSid: string,
    private authToken: string,
    private fromNumber: string, // e.g. "whatsapp:+14155238886"
  ) {}

  private get baseUrl(): string {
    return `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}`;
  }

  private get auth(): string {
    return 'Basic ' + Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
  }

  async ping(): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await fetch(`${this.baseUrl}.json`, { headers: { Authorization: this.auth } });
      return res.ok ? { ok: true } : { ok: false, error: `Twilio returned ${res.status}` };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  async sendTemplate(to: string, templateName: string, variables: Record<string, string>): Promise<WhatsAppSendResult> {
    const params = new URLSearchParams();
    params.append('To', `whatsapp:${to}`);
    params.append('From', this.fromNumber);
    params.append('ContentSid', templateName);
    params.append('ContentVariables', JSON.stringify(variables));

    try {
      const res = await fetch(`${this.baseUrl}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: this.auth,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      });
      const data = await res.json();
      if (res.ok) return { ok: true, messageSid: data.sid };
      return { ok: false, error: data.message || `Twilio error ${res.status}` };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  async sendMessage(to: string, body: string): Promise<WhatsAppSendResult> {
    const params = new URLSearchParams();
    params.append('To', `whatsapp:${to}`);
    params.append('From', this.fromNumber);
    params.append('Body', body);

    try {
      const res = await fetch(`${this.baseUrl}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: this.auth,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      });
      const data = await res.json();
      if (res.ok) return { ok: true, messageSid: data.sid };
      return { ok: false, error: data.message || `Twilio error ${res.status}` };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }
}

/* ── Factory ─────────────────────────────────────────────────────────────── */

let _mockClient: MockWhatsAppClient | null = null;

export function getWhatsAppClient(creds?: {
  accountSid?: string;
  authToken?: string;
  fromNumber?: string;
}): IWhatsAppClient {
  if (creds?.accountSid && creds?.authToken && creds?.fromNumber) {
    return new RealWhatsAppClient(creds.accountSid, creds.authToken, creds.fromNumber);
  }
  if (!_mockClient) _mockClient = new MockWhatsAppClient();
  return _mockClient;
}