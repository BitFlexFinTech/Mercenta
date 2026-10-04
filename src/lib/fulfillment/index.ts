/**
 * §PHASE 3 — the fulfilment (3PL) seam's public surface: the deterministic Supply
 * Route Profile, the fail-closed Logistics Escalation Engine, and the mock-first
 * **Delta Fulfillment** adapter. Import from here.
 *
 * The Delta adapter follows the SAME mock-first policy as the DHL and Palletline
 * seams: callers NEVER decide mock vs real themselves. When a verified, non-sandbox
 * connection exists in the Integrations wizard the real Edge-Function-backed client
 * is returned; anything else — including a sandbox connection and an explicit
 * `mock:` secretRef — returns the fully functional MOCK client with identical
 * signatures and shapes. Swapping mock → real later means entering real
 * credentials in the wizard — zero code changes elsewhere. A `mock:` secret ref is
 * never forwarded to a live transport.
 */
import type { FetchLike } from '@/lib/spapi/client';
import {
  createDeltaFulfillmentClient,
  type DeltaFulfillmentClient,
  type DeltaFulfillmentCredentials,
} from './client';
import { createMockDeltaFulfillmentClient } from './mockClient';
import { isMockDeltaSecret } from './transform';

export type {
  FreightMode,
  RouteVariability,
  SupplyRouteInput,
  SupplyRouteProfile,
} from './supplyRoute';
export { SUPPLY_ROUTE_BASIS, buildSupplyRouteProfile } from './supplyRoute';
export type { SupplyRouteRecordInput } from './routeFromRecords';
export {
  ROUTE_DERIVATION_BASIS,
  deriveSupplyRouteInput,
  freightModeForShipmentStatus,
} from './routeFromRecords';
export type {
  LogisticsRouteDecision,
  LogisticsEscalationInput,
  LogisticsEscalationResult,
} from './escalation';
export { evaluateLogisticsEscalation } from './escalation';

export type {
  DeltaFulfillmentClient,
  DeltaFulfillmentCredentials,
  DeltaInboundMilestone,
  DeltaDispatchMilestone,
  DeltaInboundReceiptInput,
  DeltaInboundReceiptResult,
  DeltaInboundReceiptStatusResult,
  DeltaInventoryLevelResult,
  DeltaDispatchInput,
  DeltaDispatchResult,
  DeltaDispatchStatusResult,
  DeltaFulfillmentInvoiceResult,
} from './client';
export {
  DELTA_DISPATCH_MILESTONE_TO_STATUS,
  deltaDispatchMilestoneToShipmentStatus,
  STATUS_TO_DELTA_LABEL,
  DELTA_MOCK_CREDENTIALS,
  isMockDeltaSecret,
} from './transform';
export {
  resetMockDeltaState,
  simulateDeltaTransientFailure,
  mockDispatchForReference,
  mockDeltaFulfillmentCost,
  mockDeltaInventoryLevel,
} from './mockClient';

export interface DeltaFulfillmentConnectionInput {
  credentials: DeltaFulfillmentCredentials | null;
  edgeFunctionBase: string;
}

export function createDeltaFulfillmentClientForConnection(
  input: DeltaFulfillmentConnectionInput
): { client: DeltaFulfillmentClient; mode: 'real' | 'mock' } {
  const { credentials, edgeFunctionBase } = input;
  if (credentials && credentials.verified && !isMockDeltaSecret(credentials.secretRef)) {
    return { client: createDeltaFulfillmentClient(() => credentials, edgeFunctionBase), mode: 'real' };
  }
  return { client: createMockDeltaFulfillmentClient(), mode: 'mock' };
}

/** Transport-injectable variant for automated tests. */
export function createDeltaFulfillmentClientForConnectionWithTransport(
  input: DeltaFulfillmentConnectionInput,
  transport: FetchLike
): { client: DeltaFulfillmentClient; mode: 'real' | 'mock' } {
  const { credentials, edgeFunctionBase } = input;
  if (credentials && credentials.verified && !isMockDeltaSecret(credentials.secretRef)) {
    return {
      client: createDeltaFulfillmentClient(() => credentials, edgeFunctionBase, transport),
      mode: 'real',
    };
  }
  return { client: createMockDeltaFulfillmentClient(), mode: 'mock' };
}
