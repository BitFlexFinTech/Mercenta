/**
 * §Canonical model §13 — single access point for the Palletline client.
 *
 * Mock-first policy (identical to the DHL seam): callers NEVER decide mock vs
 * real themselves. When a verified, non-sandbox connection exists in the
 * Integrations wizard the real Edge-Function-backed client is returned;
 * anything else — including a sandbox connection and an explicit `mock:`
 * secretRef — returns the fully functional MOCK client with identical
 * signatures and shapes. Swapping mock → real later means entering real
 * credentials in the wizard — zero code changes elsewhere. A `mock:` secret ref
 * is never forwarded to a live transport.
 */
import type { FetchLike } from '@/lib/spapi/client';
import {
  createPalletlineClient,
  type PalletlineClient,
  type PalletlineCredentials,
} from './client';
import { createMockPalletlineClient } from './mockClient';
import { isMockPalletlineSecret } from './transform';

export type {
  PalletlineClient,
  PalletlineMilestone,
  PalletlineCredentials,
} from './client';
export {
  PALLETLINE_MILESTONE_TO_STATUS,
  palletlineMilestoneToShipmentStatus,
  STATUS_TO_PALLETLINE_LABEL,
  PALLETLINE_MOCK_CREDENTIALS,
  isMockPalletlineSecret,
} from './transform';
export {
  resetMockPalletlineState,
  simulatePalletlineTransientFailure,
  mockConsignmentForReference,
  mockPalletlineCarrierCost,
} from './mockClient';

export interface PalletlineConnectionInput {
  credentials: PalletlineCredentials | null;
  edgeFunctionBase: string;
}

export function createPalletlineClientForConnection(input: PalletlineConnectionInput): {
  client: PalletlineClient;
  mode: 'real' | 'mock';
} {
  const { credentials, edgeFunctionBase } = input;
  if (credentials && credentials.verified && !isMockPalletlineSecret(credentials.secretRef)) {
    return { client: createPalletlineClient(() => credentials, edgeFunctionBase), mode: 'real' };
  }
  return { client: createMockPalletlineClient(), mode: 'mock' };
}

/** Transport-injectable variant for automated tests. */
export function createPalletlineClientForConnectionWithTransport(
  input: PalletlineConnectionInput,
  transport: FetchLike
): { client: PalletlineClient; mode: 'real' | 'mock' } {
  const { credentials, edgeFunctionBase } = input;
  if (credentials && credentials.verified && !isMockPalletlineSecret(credentials.secretRef)) {
    return {
      client: createPalletlineClient(() => credentials, edgeFunctionBase, transport),
      mode: 'real',
    };
  }
  return { client: createMockPalletlineClient(), mode: 'mock' };
}
