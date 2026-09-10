/**
 * §14 — single access points for the compliance providers (Companies House,
 * HMRC). Mock-first policy: callers never decide mock vs real themselves.
 * Verified non-sandbox connections return the REAL clients; anything else
 * (including `mock:` secret refs) returns the deterministic MOCK clients
 * with identical signatures. Swapping simulation → live is credentials-only.
 */

import {
  createCompaniesHouseClient,
  type ChCredentials,
  type ChFetchLike,
  type CompaniesHouseClient,
} from './companiesHouseClient';
import { createMockCompaniesHouseClient } from './companiesHouseMock';
import { createHmrcClient, type HmrcClient, type HmrcCredentials, type HmrcFetchLike } from './hmrcClient';
import { createMockHmrcClient } from './hmrcMock';
import { isMockChSecret, isMockHmrcSecret } from './mockCredentials';

export type {
  ChCompany,
  ChLookupResult,
  ChCredentials,
  CompaniesHouseClient,
} from './companiesHouseClient';
export type {
  HmrcClient,
  HmrcCredentials,
  HmrcVatStatusResult,
  HmrcFilingInput,
  HmrcFilingResult,
} from './hmrcClient';
export { CH_MOCK_CREDENTIALS, HMRC_MOCK_CREDENTIALS } from './mockCredentials';
export { resetMockCompaniesHouseState, seedCompaniesHouse } from './companiesHouseMock';
export { resetMockHmrcState, simulateHmrcOutage } from './hmrcMock';

export function createCompaniesHouseClientForConnection(
  getConnection: () => ChCredentials | null,
  edgeFunctionBase: string
): { client: CompaniesHouseClient; mode: 'real' | 'mock' } {
  const creds = getConnection();
  if (creds && creds.verified && !isMockChSecret(creds.secretRef)) {
    return { client: createCompaniesHouseClient(() => creds, edgeFunctionBase), mode: 'real' };
  }
  return { client: createMockCompaniesHouseClient(), mode: 'mock' };
}

export function createCompaniesHouseClientForConnectionWithTransport(
  getConnection: () => ChCredentials | null,
  edgeFunctionBase: string,
  transport: ChFetchLike
): { client: CompaniesHouseClient; mode: 'real' | 'mock' } {
  const creds = getConnection();
  if (creds && creds.verified && !isMockChSecret(creds.secretRef)) {
    return { client: createCompaniesHouseClient(() => creds, edgeFunctionBase, transport), mode: 'real' };
  }
  return { client: createMockCompaniesHouseClient(), mode: 'mock' };
}

export function createHmrcClientForConnection(
  getConnection: () => HmrcCredentials | null,
  edgeFunctionBase: string
): { client: Pick<HmrcClient, 'getVatStatus' | 'fileReturn'>; mode: 'real' | 'mock' } {
  const creds = getConnection();
  if (creds && creds.verified && !isMockHmrcSecret(creds.secretRef)) {
    return { client: createHmrcClient(() => creds, edgeFunctionBase), mode: 'real' };
  }
  return { client: createMockHmrcClient(), mode: 'mock' };
}

export function createHmrcClientForConnectionWithTransport(
  getConnection: () => HmrcCredentials | null,
  edgeFunctionBase: string,
  transport: HmrcFetchLike
): { client: Pick<HmrcClient, 'getVatStatus' | 'fileReturn'>; mode: 'real' | 'mock' } {
  const creds = getConnection();
  if (creds && creds.verified && !isMockHmrcSecret(creds.secretRef)) {
    return { client: createHmrcClient(() => creds, edgeFunctionBase, transport), mode: 'real' };
  }
  return { client: createMockHmrcClient(), mode: 'mock' };
}