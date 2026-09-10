/**
 * §14 — single access point for the DHL Express client.
 *
 * Mock-first policy: callers NEVER decide mock vs real themselves. When a
 * verified, non-sandbox connection exists in the Integrations wizard the real
 * Edge-Function-backed client is returned; anything else — including a sandbox
 * connection and an explicit `mock:` secretRef — returns the fully functional
 * MOCK client with identical signatures and shapes. Swapping mock → real later
 * means entering real credentials in the wizard — zero code changes elsewhere.
 * A `mock:` secret ref is never forwarded to a live transport.
 */

import { createDhlClient, type DhlClient, type DhlCredentials, type FetchLike } from './client';
import { createMockDhlClient } from './mockClient';
import { isMockDhlSecret } from './transform';

export type { DhlClient, DhlMilestone, DhlCredentials } from './client';
export { MILESTONE_TO_STATUS, milestoneToShipmentStatus, DHL_MOCK_CREDENTIALS } from './transform';
export { resetMockDhlState, simulateDhlTransientFailure, mockWaybillForReference } from './mockClient';

export interface DhlConnectionInput {
  credentials: DhlCredentials | null;
  edgeFunctionBase: string;
}

export function createDhlClientForConnection(input: DhlConnectionInput): {
  client: Pick<DhlClient, 'createShipment' | 'getShipmentStatus' | 'requestPickup'> | DhlClient;
  mode: 'real' | 'mock';
} {
  const { credentials, edgeFunctionBase } = input;
  if (
    credentials &&
    credentials.verified &&
    !isMockDhlSecret(credentials.secretRef)
  ) {
    return {
      client: createDhlClient(() => credentials, edgeFunctionBase),
      mode: 'real',
    };
  }
  return { client: createMockDhlClient() as unknown as DhlClient, mode: 'mock' };
}

/** Transport-injectable variant for automated tests. */
export function createDhlClientForConnectionWithTransport(
  input: DhlConnectionInput,
  transport: FetchLike
): { client: DhlClient; mode: 'real' | 'mock' } {
  const { credentials, edgeFunctionBase } = input;
  if (
    credentials &&
    credentials.verified &&
    !isMockDhlSecret(credentials.secretRef)
  ) {
    return {
      client: createDhlClient(() => credentials, edgeFunctionBase, transport),
      mode: 'real',
    };
  }
  return { client: createMockDhlClient() as unknown as DhlClient, mode: 'mock' };
}