/**
 * §21 (M13 Phase 8) — Google single access point.
 *
 * Callers never decide mock vs real themselves: `createGoogleClientForConnection`
 * returns the REAL client only for a verified, non-sandbox connection whose
 * secret ref is a `vault:` handle. Every other state (no connection, sandbox,
 * `mock:` ref) returns the MOCK client, which is labelled `simulated` on every
 * result. Swapping simulation → live is credentials-only.
 */
import {
  createGoogleClient,
  type GoogleClient,
  type GoogleCredentials,
  type GoogleFetchLike,
} from './googleClient';
import { createMockGoogleClient } from './googleMock';

export type {
  GoogleClient,
  GoogleCredentials,
  GoogleItem,
  GoogleOpResult,
  GoogleSearchResult,
  GoogleFetchLike,
} from './googleClient';
export { resetMockGoogleState, mockGoogleDriveContents } from './googleMock';

export function createGoogleClientForConnection(
  getConnection: () => GoogleCredentials | null,
  edgeFunctionBase: string
): { client: GoogleClient | ReturnType<typeof createMockGoogleClient>; mode: 'real' | 'mock' } {
  const creds = getConnection();
  if (creds && creds.verified && !creds.secretRef.startsWith('mock:')) {
    return { client: createGoogleClient(() => creds, edgeFunctionBase), mode: 'real' };
  }
  return { client: createMockGoogleClient(), mode: 'mock' };
}

export function createGoogleClientForConnectionWithTransport(
  getConnection: () => GoogleCredentials | null,
  edgeFunctionBase: string,
  transport: GoogleFetchLike
): { client: GoogleClient | ReturnType<typeof createMockGoogleClient>; mode: 'real' | 'mock' } {
  const creds = getConnection();
  if (creds && creds.verified && !creds.secretRef.startsWith('mock:')) {
    return { client: createGoogleClient(() => creds, edgeFunctionBase, transport), mode: 'real' };
  }
  return { client: createMockGoogleClient(), mode: 'mock' };
}
