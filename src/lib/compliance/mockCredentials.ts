/**
 * §Priority-1 — safe MOCK credentials for compliance providers.
 *
 * Every provider that supports simulation must have safe mock credentials
 * (never real secrets, never valid production values, never forwarded to a
 * live provider). These values are opaque tokens used ONLY to identify the
 * in-memory mock configuration. `mock:` prefix is the shared convention the
 * factories use to guarantee a `mock:` secret ref can never reach a live
 * transport.
 */

export const CH_MOCK_CREDENTIALS: {
  apiKey: string;
  companyNumber: string;
  mode: 'simulation';
  description: string;
} = {
  apiKey: 'mock:ch-demo-key',
  companyNumber: 'MOCK-CH-10000001',
  mode: 'simulation',
  description:
    'Simulation-only Companies House configuration. No live query to the registrar is made. Enter a real Companies House API key in Integrations → Companies House to activate live lookups.',
};

export const HMRC_MOCK_CREDENTIALS: {
  clientId: string;
  clientSecret: string;
  mode: 'simulation';
  description: string;
} = {
  clientId: 'mock:hmrc-demo-client',
  clientSecret: 'mock:hmrc-demo-secret',
  mode: 'simulation',
  description:
    'Simulation-only HMRC configuration. No live OAuth handshake or filing is made. Enter real Making Tax Digital credentials in Integrations → HMRC to activate live VAT/CT status and filing.',
};

export function isMockChSecret(secretRef: string): boolean {
  return secretRef.startsWith('mock:');
}

export function isMockHmrcSecret(secretRef: string): boolean {
  return secretRef.startsWith('mock:');
}