/**
 * §Priority-1 — Companies House + HMRC compliance workflows.
 *
 * The domain boundary for the platform's actual government-compliance needs:
 *  - brand company verification through Companies House (lookup → match /
 *    not-found / dissolved / registrar error → retry);
 *  - VAT registration status + VAT/CT return filing through HMRC
 *    (accepted / schema-rejected → retry → accepted).
 *
 * The SAME workflow runs against the mock adapters now and the live adapters
 * later (both behind the identical contracts). The safety gate refuses any
 * run unless the involved provider positively resolves `simulation` —
 * UNKNOWN is never treated as simulation. No simulated action ever performs
 * a network call to a government endpoint.
 */

import { ALL_DEMO_BRANDS } from '@/data/demoData';
import {
  demoAuditLog,
  setCompanyVerification,
  pushHmrcFiling,
  latestHmrcFiling,
} from '@/data/demoStore';
import { emitEvent } from '@/lib/events/eventFeed';
import {
  createCompaniesHouseClientForConnection,
  createHmrcClientForConnection,
  seedCompaniesHouse,
} from './index';
import type { ChCompany } from './companiesHouseClient';
import { isProviderSimulationSafe } from '@/integrations/types';
import type { ProviderResolutionMode } from '@/integrations/types';
import { notifyCanonicalStoreChange } from '@/lib/domain/canonicalSignal';

export interface ComplianceInput {
  getMode?: (id: string) => ProviderResolutionMode;
  actorId?: string;
  /** Deterministic VRN used for simulation (safe, never a real number). */
  vrn?: string;
}

export type ComplianceStatus = 'ok' | 'safety_refused' | 'error';

export interface ComplianceResult {
  ok: boolean;
  status: ComplianceStatus;
  safetyReason?: string;
  error?: string;
  auditIds: string[];
  eventsEmitted: number;
  /** Typed dynamic fields surfaced to UI/scenarios (never `unknown`). */
  company?: string;
  companyNumber?: string;
  registrarStatus?: string;
  vatStatus?: string;
  vrn?: string;
  filingId?: string;
  submissionId?: string;
  filingStatus?: string;
  rejectionReason?: string;
  [key: string]: unknown;
}

/** Seed the simulated registrar with the real demo brand registry. */
export function primeCompaniesHouseRegistrar(): void {
  seedCompaniesHouse(
    ALL_DEMO_BRANDS.map((b) => ({ id: b.id, name: b.name, dissolved: b.id === 'brand-kalahari' }))
  );
}

/** Resolve provider mode with a hard default of `unknown` (never safe). */
function modeFor(ctx: ComplianceInput, provider: string): ProviderResolutionMode {
  return (ctx.getMode ?? (() => 'unknown' as const))(provider);
}

function audit(
  brandId: string,
  actorId: string,
  action: string,
  entityType: string,
  entityId: string,
  reason: string,
  metadata?: Record<string, unknown>
): string {
  const id = `comp-audit-${Date.now()}-${demoAuditLog.length}`;
  demoAuditLog.push({
    id,
    createdAt: new Date().toISOString(),
    actorId,
    action,
    entityType,
    entityId,
    brandId,
    reason,
    metadata,
  });
  notifyCanonicalStoreChange();
  return id;
}

/**
 * Verify a brand company against the Companies House registrar (simulated).
 * Deterministic outcomes per brand; registrar error paths fail and recover
 * on retry.
 */
export async function verifyBrandCompany(
  brandId: string,
  ctx: ComplianceInput = {}
): Promise<ComplianceResult> {
  const auditIds: string[] = [];
  let eventsEmitted = 0;
  const actor = ctx.actorId ?? 'system';
  const mode = modeFor(ctx, 'companies_house');
  if (!isProviderSimulationSafe(mode)) {
    return {
      ok: false,
      status: 'safety_refused',
      safetyReason: `Companies House resolved '${mode}' (not positively SIMULATION). Company verification refused.`,
      auditIds,
      eventsEmitted,
    };
  }
  primeCompaniesHouseRegistrar();
  // Look up by the brand's DISPLAY name — the registrar is seeded by name,
  // and the real Companies House search also queries by company name.
  const brand = ALL_DEMO_BRANDS.find((b) => b.id === brandId);
  const searchName = brand?.name ?? brandId;
  const { client } = createCompaniesHouseClientForConnection(() => null, '/functions/v1/companies-house');
  const lookup = await client.lookupCompany({ companyName: searchName });

  if (!lookup.ok) {
    // Registrar/transport error — recorded; the retry succeeds.
    auditIds.push(audit(brandId, actor, 'compliance_verification_error', 'company', brandId, `Companies House lookup failed (simulated): ${lookup.error ?? 'provider error'}`));
    emitEvent({
      type: 'provider_failure',
      severity: 'important',
      title: 'Companies House lookup failed (simulated)',
      description: `${brandId} — ${lookup.error ?? 'provider error'}. Retry to recover.`,
      entityId: brandId,
      metadata: { provider: 'companies_house', brandId },
    });
    eventsEmitted += 1;
    return { ok: false, status: 'error', error: lookup.error, auditIds, eventsEmitted };
  }

  const match = lookup.match as ChCompany | null;
  if (!match) {
    setCompanyVerification(brandId, {
      companyNumber: `MOCK-CH-NF-${brandId.slice(-6)}`,
      companyName: brandId,
      status: 'not_found',
      source: 'simulation',
    });
    auditIds.push(audit(brandId, actor, 'company_not_found', 'company', brandId, `Companies House returned no match for ${brandId} (simulated)`));
    emitEvent({
      type: 'provider_failure',
      severity: 'important',
      title: 'Company not found at Companies House',
      description: `No active company matched ${brandId}.`,
      entityId: brandId,
      metadata: { provider: 'companies_house', brandId },
    });
    eventsEmitted += 1;
    return { ok: false, status: 'error', error: 'No company match (simulated registrar)', auditIds, eventsEmitted };
  }

  const isActive = match.status === 'active' || match.status === 'voluntary-arrangement';
  setCompanyVerification(brandId, {
    companyNumber: match.companyNumber,
    companyName: match.companyName,
    status: isActive ? 'verified' : 'dissolved',
    incorporatedAt: match.incorporationDate,
    sicCodes: match.sicCodes,
    verifiedAt: new Date().toISOString(),
    source: 'simulation',
  });
  auditIds.push(audit(
    brandId,
    actor,
    isActive ? 'company_verified' : 'company_dissolved',
    'company',
    match.companyNumber,
    `${brandId} ${isActive ? 'verified' : `status ${match.status}`} at Companies House (simulated) — ${match.companyName}`,
    { companyNumber: match.companyNumber, registrarStatus: match.status, sicCodes: match.sicCodes }
  ));
  emitEvent({
    type: 'company_verified',
    severity: 'informational',
    title: `${isActive ? 'Company verified' : `Company status: ${match.status}`} — ${match.companyName}`,
    description: `${brandId} · ${match.companyNumber} · ${match.status} (simulated registrar)`,
    entityId: brandId,
    metadata: { provider: 'companies_house', brandId, companyNumber: match.companyNumber },
  });
  eventsEmitted += 1;

  return {
    ok: true,
    status: 'ok',
    company: match.companyName,
    companyNumber: match.companyNumber,
    registrarStatus: match.status,
    auditIds,
    eventsEmitted,
  };
}
/** Read the current VAT registration status for a brand (simulated). */
export async function checkHmrcStatus(
  brandId: string,
  ctx: ComplianceInput = {}
): Promise<ComplianceResult> {
  const auditIds: string[] = [];
  let eventsEmitted = 0;
  const actor = ctx.actorId ?? 'system';
  const mode = modeFor(ctx, 'hmrc');
  const vrn = ctx.vrn ?? `MOCK-VRN-${brandId.slice(-6)}`;
  if (!isProviderSimulationSafe(mode)) {
    return {
      ok: false,
      status: 'safety_refused',
      safetyReason: `HMRC resolved '${mode}' (not positively SIMULATION). VAT status check refused.`,
      auditIds,
      eventsEmitted,
      vrn,
    };
  }
  const { client } = createHmrcClientForConnection(() => null, '/functions/v1/hmrc');
  const result = await client.getVatStatus(vrn);
  if (!result.ok) {
    auditIds.push(audit(brandId, actor, 'hmrc_status_error', 'vat', vrn, `HMRC VAT status failed (simulated): ${result.error ?? 'provider error'}`));
    return { ok: false, status: 'error', error: result.error, auditIds, eventsEmitted, vrn };
  }
  emitEvent({
    type: 'company_verified',
    severity: 'informational',
    title: `VAT status: ${result.status === 'registered' ? 'Registered' : 'Not registered'}`,
    description: `${brandId} · VRN ${vrn} · next return due ${result.nextReturnDue ?? '—'} (simulated)`,
    entityId: brandId,
    metadata: { provider: 'hmrc', brandId, vrn, status: result.status },
  });
  eventsEmitted += 1;
  return {
    ok: true,
    status: 'ok',
    vatStatus: result.status,
    nextReturnDue: result.nextReturnDue,
    vrn,
    auditIds,
    eventsEmitted,
  };
}

/** File a VAT return with HMRC (simulated): accepted, rejected, or error. */
export async function fileHmrcReturn(
  brandId: string,
  input: { period: string; totalSalesGbp: number; vatDueGbp: number },
  ctx: ComplianceInput = {}
): Promise<ComplianceResult> {
  const auditIds: string[] = [];
  let eventsEmitted = 0;
  const actor = ctx.actorId ?? 'system';
  const mode = modeFor(ctx, 'hmrc');
  const vrn = ctx.vrn ?? `MOCK-VRN-${brandId.slice(-6)}`;
  if (!isProviderSimulationSafe(mode)) {
    return {
      ok: false,
      status: 'safety_refused',
      safetyReason: `HMRC resolved '${mode}' (not positively SIMULATION). VAT filing refused.`,
      auditIds,
      eventsEmitted,
      vrn,
    };
  }
  const { client } = createHmrcClientForConnection(() => null, '/functions/v1/hmrc');
  const filing = await client.fileReturn({
    vrn,
    period: input.period,
    totalSalesGbp: input.totalSalesGbp,
    vatDueGbp: input.vatDueGbp,
    netVatDueGbp: Math.round(input.vatDueGbp * 100) / 100,
  });

  const record = pushHmrcFiling({
    brandId,
    vrn,
    period: input.period,
    type: 'vat_return',
    status: filing.ok ? 'accepted' : filing.status === 'rejected' ? 'rejected' : 'error',
    submissionId: filing.submissionId,
    rejectionReason: filing.rejectionReason,
    filedAt: new Date().toISOString(),
    agency: 'simulation',
  });
  auditIds.push(audit(
    brandId,
    actor,
    filing.ok
      ? 'hmrc_filing_accepted'
      : filing.status === 'rejected'
        ? 'hmrc_filing_rejected'
        : 'hmrc_filing_error',
    'hmrc_filing',
    record.id,
    filing.ok
      ? `VAT return ${input.period} accepted (simulated) — ${filing.submissionId ?? ''}`
      : filing.status === 'rejected'
        ? `VAT return ${input.period} REJECTED (simulated): ${filing.rejectionReason ?? 'schema error'}`
        : `VAT return ${input.period} errored (simulated): ${filing.error ?? filing.rejectionReason ?? 'provider error'}`,
    { provider: 'hmrc', vrn, period: input.period, totalSalesGbp: input.totalSalesGbp, vatDueGbp: input.vatDueGbp }
  ));
  emitEvent({
    type: 'hmrc_filing',
    severity: filing.ok ? 'informational' : 'important',
    title: filing.ok
      ? `VAT return ${input.period} accepted`
      : filing.status === 'rejected'
        ? `VAT return ${input.period} rejected — needs correction`
        : `VAT return ${input.period} errored`,
    description: filing.ok
      ? `${brandId} · VRN ${vrn} · accepted (simulated) · ${filing.submissionId ?? ''}`
      : `${brandId} · VRN ${vrn} · ${filing.rejectionReason ?? filing.error ?? 'provider error'}`,
    entityId: brandId,
    metadata: { provider: 'hmrc', brandId, vrn, period: input.period, status: record.status },
  });
  eventsEmitted += 1;

  return {
    ok: filing.ok,
    status: filing.ok ? 'ok' : 'error',
    filingId: record.id,
    submissionId: filing.submissionId,
    filingStatus: record.status,
    rejectionReason: filing.rejectionReason,
    error: filing.error,
    auditIds,
    eventsEmitted,
  };
}

/** Read the latest stored filing state for a brand (pure store read). */
export function getLatestVatFiling(brandId: string) {
  return latestHmrcFiling(brandId, 'vat_return');
}
export { demoCompanyVerifications } from '@/data/demoStore';