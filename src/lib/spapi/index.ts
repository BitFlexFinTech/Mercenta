/**
 * §14 — single access point for the SP-API client.
 *
 * Mock-first policy: callers NEVER decide mock vs real themselves. When real
 * credentials exist (a verified, non-sandbox connection from the Integrations
 * wizard) the real Edge-Function-backed client is used; otherwise a fully
 * functional MockAmazonSPAPIClient is returned with identical signatures and
 * shapes. Swapping mock → real later means entering real credentials in the
 * wizard — zero code changes anywhere else.
 */

import { createSpApiClient, type SpApiCredentials } from './client';
import { createMockSpApiClient } from './mockClient';

export type SpApiClient = ReturnType<typeof createSpApiClient>;

export interface SPApiConnectionInput {
  credentials: SpApiCredentials | null;
  edgeFunctionBase: string;
}

export function createSPApiClientForConnection(input: SPApiConnectionInput): {
  client: SpApiClient;
  mode: 'real' | 'mock';
} {
  const { credentials, edgeFunctionBase } = input;
  if (credentials && credentials.verified && !isMockSecretRef(credentials.secretRef)) {
    return { client: createSpApiClient(() => credentials, edgeFunctionBase), mode: 'real' };
  }
  return { client: createMockSpApiClient() as unknown as SpApiClient, mode: 'mock' };
}

/** Mock connects store an obviously-fake secret ref — never mistaken for real. */
export function isMockSecretRef(secretRef: string): boolean {
  return secretRef.startsWith('mock:');
}
