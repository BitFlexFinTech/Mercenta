import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useApp } from '@/context/GlobalStateContext';
import { EU_MARKET_ENABLED } from '@/config/customs';
import {
  COMMERCIAL_MODELS,
  COMMERCIAL_MODEL_NOT_SELECTED_LABEL,
  checkCommercialModelSelection,
} from '@/config/commercialModel';
import {
  COMPANY_CENTRE_DISCLAIMER,
  COMPANY_REGISTRATION,
  COMPANIES_HOUSE_MANUAL_ACTIONS,
  CONFIRMATION_STATEMENT_WORKFLOW,
  GOVERNMENT_SECRET_KINDS,
  HMRC_READINESS,
  type GovernmentSecretKind,
} from '@/config/company';
import {
  DEFAULT_LAUNCH_PROFILE,
  LAUNCH_CENTRE_DISCLAIMER,
  LAUNCH_PLATFORMS,
  type LaunchProfile,
} from '@/config/launchPlatforms';
import {
  AI_SPEND_CEILINGS,
  COST_MODEL_INPUTS,
  OPERATING_COSTS_DISCLAIMER,
} from '@/config/operatingCosts';
import { settleBrandPayout } from '@/data/api';
import {
  addApprovedBrand,
  approvedApplicationBrands,
  demoApplications,
  updateApplicationStatus,
} from '@/data/applicationStore';
import {
  companyAuditHistory,
  confirmConfirmationStatementFromRegister,
  deriveDueStatus,
  ensureCompanyStore,
  fileViaOfficialApi,
  getConfirmationStatement,
  getGovernmentSecret,
  getRegistrarSnapshot,
  markGovernmentSecretVerified,
  recordManualFiling,
  recordRegistrarReadFailure,
  recordRegistrarSnapshot,
  storeGovernmentSecret,
  advanceConfirmationStatement,
  approveConfirmationStatement,
  clearGovernmentSecret,
} from '@/data/companyStore';
import {
  commercialModelAuditFor,
  demoCarrierMarkup,
  demoPurchaseOrders,
  getAllCommerceInvoices,
  getAllCommercePayments,
  getBrandCommercialModelRecord,
  getInvoiceNumberLedger,
  setBrandCommercialModel,
  updateCarrierMarkup,
} from '@/data/demoStore';
import {
  ensureLaunchStore,
  getLaunchRecords,
  markLaunchSubmitted,
  updateLaunchRecord,
} from '@/data/launchStore';
import { useBrands, useCanonicalStoreVersion, useCommissions } from '@/data/queries';
import { companiesHouseConnectionCredentials } from '@/integrations/connections';
import { useIntegrations } from '@/integrations/IntegrationsContext';
import { isProviderSimulationSafe, resolveProviderMode } from '@/integrations/types';
import {
  computeBrandNetShare,
  normalisePayoutTrack,
  resolveCommissionRatePct,
} from '@/lib/billing/payouts';
import { PAYMENT_DERIVATION_BASIS, summariseInvoiceLedger } from '@/lib/commerce/invoiceTerms';
import { getApplicableRequirements } from '@/lib/compliance';
import { createCompaniesHouseClientForConnection } from '@/lib/compliance/index';
import { operatingCostSummary } from '@/lib/costs/costSummary';
import { FREE_RUNTIME_MODELS, RUNTIME_TASKS, selectRuntimeModel } from '@/lib/costs/modelPolicy';
import { aiUsageEntries, resetAiUsageLog } from '@/lib/costs/usageLog';
import {
  DEMO_MODEL_A_BRAND_A,
  DEMO_MODEL_B_BRAND_B,
  computeBuyResellModel,
  computeCommissionModel,
  demoShippingCommercialExample,
} from '@/lib/finance/commercialModel';
import {
  evaluatePayoutEligibility,
  getDestinations,
  getPayoutForCommission,
  getReconciliationForPo,
  setDestinationStatus,
} from '@/lib/finance/financialReconciliation';
import {
  buildSubmissionChecklist,
  buildSubmissionPackage,
  launchPlatformIsComplete,
} from '@/lib/founder/launchPackage';
import { createMockMailClient } from '@/lib/mail/mail';
import {
  applicationApprovedTemplate,
  applicationInfoRequestedTemplate,
  applicationRejectedTemplate,
  welcomeEmailTemplate,
} from '@/lib/mail/templates';
import {
  beginOnboardingForManualBrand,
  beginOnboardingFromApplication,
  tenantIdForApplication,
} from '@/lib/onboarding/onboardingLifecycle';
import {
  commissionStatusPresentation,
  payoutDestinationStatusPresentation,
  payoutStatePresentation,
  reconciliationStatePresentation,
} from '@/lib/statusPresentation';
import { supabase } from '@/lib/supabase';
import { useWorkItems } from '@/lib/work/useWork';
import { WORK_SOURCE_LABELS, demoToday, workCounts } from '@/lib/work/workStore';
import { isXeroDemoMode } from '@/services/xero';
import { checkAndReseed } from '@/services/xero/xeroReseed';
import { getFinancialSummary } from '@/services/xero/xeroSync';
import type { ApprovedCategory, StaffMember, StaffRole } from '@/types';
import type { SemanticTone } from '@/next/components/ConsolePrimitives';
import {
  SuperAdminView,
  type SuperAdminTabId,
} from './SuperAdminView';

const PARTNER_ID = 'a0000000-0000-0000-0000-000000000001';
const HOOK_EDGE_BASE = '/functions/v1/companies-house';
const mailClient = createMockMailClient();

const ROLE_OPTIONS: { value: StaffRole; label: string }[] = [
  { value: 'Super Admin', label: 'Super Admin' },
  { value: 'Business Development', label: 'Business Development' },
  { value: 'Logistics Coordinator', label: 'Logistics Coordinator' },
  { value: 'Cross-Border Logistics Lead', label: 'Cross-Border Logistics Lead' },
  { value: 'UK HMRC Compliance Specialist', label: 'UK HMRC Compliance Specialist' },
  { value: 'Carrier Integration Manager', label: 'Carrier Integration Manager' },
];

const CHANNEL_OPTIONS = [
  'Global Operations',
  'US Brand Pipeline',
  'EU Brand Pipeline',
  'African Brand Pipeline',
  'UK HMRC Compliance',
  'DHL Carrier Integration',
];

const CHANNEL_LABEL: Record<string, string> = {
  form: 'Platform form',
  email: 'Email / newsletter form',
  account: 'In-platform submission',
  manual_review: 'Manual review',
};

let nextStaffSeq = 100;

function mapTone(t: string): SemanticTone {
  if (t === 'success' || t === 'warning' || t === 'danger' || t === 'info') return t;
  return 'neutral';
}

function money(n: number): string {
  return `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function SuperAdminScreen({ onNavigateView }: { onNavigateView?: (viewId: string) => void }) {
  const qc = useQueryClient();
  const canonicalVersion = useCanonicalStoreVersion();
  void canonicalVersion;

  const {
    session,
    staff,
    addStaff,
    removeStaff,
    toggleStaffActive,
    updateStaffRole,
    updateStaffChannel,
    updateStaffTier,
    actingStaff,
    actingStaffId,
    setActingStaffId,
    canCurrentUserMutate,
  } = useApp();
  const { modes } = useIntegrations();
  const brandsQ = useBrands();
  const commissionsQ = useCommissions();

  const [activeTab, setActiveTab] = useState<SuperAdminTabId>('staff');
  const [revision, setRevision] = useState(0);
  const bump = () => setRevision((v) => v + 1);
  void revision;

  // Applications messages
  const [applicationMessage, setApplicationMessage] = useState<string | null>(null);

  // Xero state
  const [xeroConnected, setXeroConnected] = useState<boolean | null>(null);
  const [xeroDemoMode, setXeroDemoMode] = useState(false);
  const [xeroLastSync, setXeroLastSync] = useState<string | null>(null);
  const [xeroDaysSinceReseed, setXeroDaysSinceReseed] = useState<number | null>(null);
  const [xeroSummary, setXeroSummary] = useState<{
    revenue: number;
    expenses: number;
    netProfit: number;
  } | null>(null);
  const [xeroBusy, setXeroBusy] = useState<string | null>(null);
  const [xeroNotice, setXeroNotice] = useState<string | null>(null);
  const [xeroError, setXeroError] = useState<string | null>(null);

  // Payouts & destinations state
  const [payoutBusyId, setPayoutBusyId] = useState<string | null>(null);
  const [payoutNotice, setPayoutNotice] = useState<string | null>(null);
  const [payoutError, setPayoutError] = useState<string | null>(null);
  const [destinationBusyId, setDestinationBusyId] = useState<string | null>(null);
  const [destinationNotice, setDestinationNotice] = useState<string | null>(null);

  // Commercial models state
  const [commercialMessage, setCommercialMessage] = useState<string | null>(null);

  // Company Control Centre state
  const [companyBusy, setCompanyBusy] = useState(false);
  const [companyMessage, setCompanyMessage] = useState<string | null>(null);

  // Launch centre state
  const [launchProfile, setLaunchProfile] = useState<LaunchProfile>(DEFAULT_LAUNCH_PROFILE);
  const [launchMessage, setLaunchMessage] = useState<string | null>(null);

  useEffect(() => {
    ensureCompanyStore();
    ensureLaunchStore();
  }, []);

  const loadXeroStatus = useCallback(async () => {
    const mode = isXeroDemoMode();
    setXeroDemoMode(mode);
    if (!supabase) {
      setXeroConnected(false);
      return;
    }
    const { data: conn } = await supabase
      .from('xero_connections')
      .select('*')
      .eq('partner_id', PARTNER_ID)
      .maybeSingle();
    if (!conn || conn.status !== 'active') {
      setXeroConnected(false);
      return;
    }
    setXeroConnected(true);
    setXeroLastSync(conn.last_synced_at);
    if (conn.last_reset_at) {
      const days = Math.floor((Date.now() - new Date(conn.last_reset_at).getTime()) / 86400000);
      setXeroDaysSinceReseed(days);
    }
    const result = await getFinancialSummary(PARTNER_ID, new Date().toISOString().slice(0, 7));
    if (result.data) {
      setXeroSummary({
        revenue: result.data.revenue,
        expenses: result.data.expenses,
        netProfit: result.data.netProfit,
      });
    }
  }, []);

  useEffect(() => {
    void loadXeroStatus();
  }, [loadXeroStatus]);

  const brands = useMemo(() => brandsQ.data?.data ?? [], [brandsQ.data]);
  const commissions = useMemo(() => commissionsQ.data?.data ?? [], [commissionsQ.data]);
  const allWork = useWorkItems('admin');
  const today = demoToday();
  const counts = workCounts('admin');
  const criticalCount = allWork.filter((w) => w.priority === 'critical').length;

  const isSuperAdmin = session?.tier === 'super_admin';

  const brandName = (brandId: string) =>
    brands.find((b) => b.id === brandId)?.profile.businessName ?? brandId;
  const brandTrack = (brandId: string) =>
    normalisePayoutTrack(brands.find((b) => b.id === brandId)?.track ?? 'financed');

  const workBySource = useMemo(() => {
    const countsMap = new Map<string, number>();
    for (const w of allWork) {
      const label = WORK_SOURCE_LABELS[w.source];
      countsMap.set(label, (countsMap.get(label) ?? 0) + 1);
    }
    return Array.from(countsMap.entries())
      .map(([sourceLabel, count]) => ({ sourceLabel, count }))
      .sort((a, b) => b.count - a.count);
  }, [allWork]);

  const payoutRows = commissions.map((c) => {
    const netShareGbp = computeBrandNetShare({
      poValue: c.poValue,
      commissionRatePct: resolveCommissionRatePct({
        commissionRate: c.commissionRate,
        commissionAmount: c.commissionAmount,
        poValue: c.poValue,
      }),
      fulfillmentTrack: brandTrack(c.brandId),
    });
    const poId = demoPurchaseOrders.find((p) => p.poNumber === c.purchaseOrderId)?.id ?? c.purchaseOrderId;
    const rec = getReconciliationForPo(poId);
    const recPres = rec ? reconciliationStatePresentation(rec.state) : null;
    const payout = getPayoutForCommission(c.id);
    const payoutState =
      payout?.state ?? (evaluatePayoutEligibility(c.id).eligible ? 'eligible' : 'pending');
    const payPres = payoutStatePresentation(payoutState);
    const stPres = commissionStatusPresentation(c.status);
    return {
      id: c.id,
      brandId: c.brandId,
      brandName: brandName(c.brandId),
      purchaseOrderId: c.purchaseOrderId,
      poValue: c.poValue,
      commissionAmount: c.commissionAmount,
      netShareGbp,
      status: c.status,
      statusLabel: stPres.label,
      statusTone: mapTone(stPres.tone),
      payoutStateLabel: payPres.label,
      payoutStateTone: mapTone(payPres.tone),
      payoutBlockedReason:
        payout?.state === 'failed'
          ? payout.failureReason
          : payout?.state === 'pending'
            ? payout.blockedReason
            : undefined,
      reconciliationLabel: recPres ? recPres.label : 'Awaiting remittance',
      reconciliationTone: recPres ? mapTone(recPres.tone) : ('warning' as SemanticTone),
      paymentId: rec?.paymentId,
      createdAt: c.createdAt,
    };
  });

  const destinations = getDestinations().map((d) => {
    const pres = payoutDestinationStatusPresentation(d.status);
    return {
      id: d.id,
      accountName: d.accountName,
      accountRefMasked: d.accountRefMasked,
      bankName: d.bankName,
      status: d.status,
      statusLabel: pres.label,
      statusTone: mapTone(pres.tone),
    };
  });

  const invoiceLedger = getInvoiceNumberLedger();
  const invoiceSummary = summariseInvoiceLedger(
    getAllCommerceInvoices(),
    getAllCommercePayments(),
    new Date().toISOString().slice(0, 10)
  );

  const shippingExample = demoShippingCommercialExample();
  const shippingEconomicsText = `DHL list ${money(shippingExample.carrierListCost)} − negotiated discount ${money(shippingExample.negotiatedDiscountAmount)} = carrier invoice ${money(shippingExample.carrierInvoiceCost)} → brand charged ${money(shippingExample.brandAmountCharged)} → gross shipping margin ${money(shippingExample.grossShippingMargin)} (net ${money(shippingExample.netMercentaRevenue)}).`;

  const commercialRows = brands.map((b) => {
    const record = getBrandCommercialModelRecord(b.id);
    const resolution = checkCommercialModelSelection(record?.model);
    const reqs = getApplicableRequirements(b.category as ApprovedCategory);
    const model = record?.model ?? 'commission_agent';
    const worked =
      model === 'commission_agent'
        ? computeCommissionModel({
            retailChannelRevenueGbp: 10000,
            commissionRatePct: record?.commissionRatePct ?? 20,
          }).formula
        : computeBuyResellModel({
            retailChannelRevenueGbp: 10000,
            brandAcquisitionCostGbp: (10000 * (record?.brandAcquisitionSharePct ?? 75)) / 100,
            carrierCostGbp: 60,
            paymentFeesGbp: 120,
            otherAgreedFeesGbp: 50,
            deductionsGbp: 0,
          }).formula;

    return {
      brandId: b.id,
      brandName: b.profile.businessName,
      category: b.category,
      selectedModel: resolution.ok ? resolution.model : null,
      selectedModelLabel: resolution.ok
        ? COMMERCIAL_MODELS[resolution.model].label
        : COMMERCIAL_MODEL_NOT_SELECTED_LABEL,
      termsSummary: record
        ? record.model === 'commission_agent'
          ? `${record.commissionRatePct}% commission · ${record.source}`
          : `${record.brandAcquisitionSharePct}% acquisition · ${record.source}`
        : 'Unselected',
      requirementCount: reqs.length,
      workedFormula: worked,
    };
  });

  const commercialAudit = brands.flatMap((b) =>
    commercialModelAuditFor(b.id).map((e) => ({
      id: e.id,
      brandName: b.profile.businessName,
      action: e.action,
      modelLabel: String(e.metadata?.model ?? ''),
      actorId: e.actorId,
      reason: e.reason,
      complianceUnchanged: Boolean(e.metadata?.complianceUnchanged),
      createdAt: e.createdAt,
    }))
  );

  // Company Control Centre
  const chMode = resolveProviderMode(modes, 'companies_house');
  const canReadRegister = isProviderSimulationSafe(chMode) || chMode === 'live';
  const companySnapshotRaw = getRegistrarSnapshot();
  const confirmation = getConfirmationStatement();
  const csDue = deriveDueStatus(confirmation.nextDueDate);
  const accountsDue = deriveDueStatus(companySnapshotRaw.record?.nextAccountsDue ?? null);
  const companyActorId = 'super-admin:founder';

  const costRaw = operatingCostSummary();
  const usageEntries = [...aiUsageEntries()].slice(-25).reverse();
  const launchRecs = getLaunchRecords();

  return (
    <SuperAdminView
      loading={brandsQ.isPending && brands.length === 0}
      isSuperAdmin={isSuperAdmin}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      canMutate={canCurrentUserMutate}
      staff={staff}
      actingStaffId={actingStaffId}
      onActingStaffChange={setActingStaffId}
      roleOptions={ROLE_OPTIONS}
      channelOptions={CHANNEL_OPTIONS}
      onAddStaff={({ name, email, role, channel }) => {
        const member: StaffMember = {
          id: `staff-${nextStaffSeq++}`,
          name,
          email,
          role,
          channel,
          active: true,
          permissionTier: 'full',
        };
        addStaff(member);
      }}
      onToggleStaffActive={toggleStaffActive}
      onRemoveStaff={removeStaff}
      onUpdateStaffRole={updateStaffRole}
      onUpdateStaffChannel={updateStaffChannel}
      onUpdateStaffTier={updateStaffTier}
      euMarketEnabled={EU_MARKET_ENABLED}
      carrierMarkups={demoCarrierMarkup}
      onUpdateCarrierMarkup={(id, patch) => {
        updateCarrierMarkup(id, patch);
        bump();
      }}
      oversightBrands={brands.map((b) => ({
        id: b.id,
        businessName: b.profile.businessName,
        category: b.category,
        track: b.track,
        contractStatus: b.contractStatus,
      }))}
      oversightWork={allWork.map((w) => ({
        id: w.id,
        title: w.title,
        sourceLabel: WORK_SOURCE_LABELS[w.source],
        tenantId: w.tenantId,
        dueDate: w.dueDate,
        priority: w.priority,
      }))}
      oversightCounts={{
        open: counts.open,
        overdue: counts.overdue,
        critical: criticalCount,
      }}
      workBySource={workBySource}
      applications={demoApplications}
      approvedBrandCount={approvedApplicationBrands.length}
      applicationMessage={applicationMessage}
      onApplicationAction={async (appId, action, notes) => {
        const app = demoApplications.find((a) => a.id === appId);
        if (!app) return;
        const adm = actingStaff?.name ?? 'Super Admin';
        updateApplicationStatus(appId, action, adm, notes);
        if (action === 'approved') {
          const brandId = tenantIdForApplication(app.id);
          beginOnboardingFromApplication(app.id, {
            staffId: actingStaffId,
            canMutate: canCurrentUserMutate,
          });
          addApprovedBrand({
            id: brandId,
            name: app.companyName,
            category: app.category,
            country: app.country,
            email: `${app.companyName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
            signatory: app.companyName,
            track: 'direct_fulfillment',
          });
          await mailClient.sendEmail({
            to: `${app.companyName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
            ...applicationApprovedTemplate(app.companyName),
          });
          setApplicationMessage(`${app.companyName} approved and onboarding started.`);
        } else if (action === 'rejected') {
          await mailClient.sendEmail({
            to: `${app.companyName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
            ...applicationRejectedTemplate(app.companyName),
          });
          setApplicationMessage(`${app.companyName} rejected.`);
        } else if (action === 'info_requested' && notes) {
          await mailClient.sendEmail({
            to: `${app.companyName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
            ...applicationInfoRequestedTemplate(app.companyName, notes),
          });
          setApplicationMessage(`Information request logged for ${app.companyName}.`);
        } else if (action === 'flagged') {
          setApplicationMessage(`${app.companyName} flagged for review.`);
        }
        bump();
      }}
      onCreateManualBrand={async (input) => {
        if (
          !input.companyName.trim() ||
          !input.contactName.trim() ||
          !input.email.trim() ||
          !input.country.trim()
        ) {
          return { ok: false, error: 'All required fields must be filled.' };
        }
        const onboarding = beginOnboardingForManualBrand(
          {
            name: input.companyName.trim(),
            category: input.category,
            country: input.country.trim(),
            email: input.email.trim(),
            signatory: input.contactName.trim(),
            track: input.track,
          },
          { staffId: actingStaffId, canMutate: canCurrentUserMutate }
        );
        if (!onboarding.ok) return { ok: false, error: onboarding.error };
        addApprovedBrand({
          id: onboarding.value.brandId,
          name: input.companyName.trim(),
          category: input.category,
          country: input.country.trim(),
          email: input.email.trim(),
          signatory: input.contactName.trim(),
          track: input.track,
        });
        await mailClient.sendEmail({
          to: input.email.trim(),
          ...welcomeEmailTemplate(input.contactName.trim()),
        });
        setApplicationMessage(`Created brand tenant ${onboarding.value.brandId} and started onboarding.`);
        bump();
        return { ok: true };
      }}
      xeroConnected={xeroConnected}
      xeroDemoMode={xeroDemoMode}
      xeroLastSync={xeroLastSync}
      xeroDaysSinceReseed={xeroDaysSinceReseed}
      xeroSummary={xeroSummary}
      xeroBusy={xeroBusy}
      xeroNotice={xeroNotice}
      xeroError={xeroError}
      onXeroSaveCredentials={() => {
        setXeroConnected(true);
        setXeroDemoMode(false);
        setXeroLastSync(new Date().toISOString());
        setXeroDaysSinceReseed(0);
        setXeroNotice('Xero credentials saved.');
      }}
      onXeroManualReseed={async () => {
        setXeroBusy('Reseeding…');
        setXeroError(null);
        setXeroNotice(null);
        try {
          const result = await checkAndReseed(PARTNER_ID);
          if (result) {
            setXeroNotice(result.message);
            if (!result.ok) setXeroError(result.error ?? 'Reseed failed.');
          } else {
            setXeroNotice('No reseed needed.');
          }
        } catch (err) {
          setXeroError(err instanceof Error ? err.message : 'Reseed error.');
        } finally {
          setXeroBusy(null);
          await loadXeroStatus();
        }
      }}
      payoutRows={payoutRows}
      payoutBusyId={payoutBusyId}
      payoutNotice={payoutNotice}
      payoutError={payoutError}
      onSettlePayout={async (commissionId) => {
        if (payoutBusyId) return;
        setPayoutBusyId(commissionId);
        setPayoutNotice(null);
        setPayoutError(null);
        const result = await settleBrandPayout(commissionId, actingStaffId);
        setPayoutBusyId(null);
        if (!result.ok) {
          setPayoutError(result.error ?? 'Payout refused.');
          return;
        }
        setPayoutNotice(
          `${result.mode === 'mock' ? 'Simulated' : 'Live'} payout ${result.transferId} — net ${money(
            result.netShareGbp ?? 0
          )}.`
        );
        await qc.invalidateQueries({ queryKey: ['commissions'] });
        await qc.invalidateQueries({ queryKey: ['audit-log'] });
      }}
      destinations={destinations}
      destinationBusyId={destinationBusyId}
      destinationNotice={destinationNotice}
      onReviewDestination={async (destinationId, status) => {
        if (destinationBusyId) return;
        setDestinationBusyId(destinationId);
        const res = setDestinationStatus(
          destinationId,
          status,
          { staffId: actingStaffId, canMutate: canCurrentUserMutate },
          status === 'verified'
            ? {
                verificationMethod: 'Founder / Super Admin review',
                verificationRef: `SIM-VERIFY-${destinationId}`,
              }
            : { reason: 'Suspended pending account review by Mercenta.' }
        );
        setDestinationBusyId(null);
        setDestinationNotice(res.ok ? `Destination ${destinationId} is now ${res.value.status}.` : res.error);
        bump();
        await qc.invalidateQueries({ queryKey: ['commissions'] });
        await qc.invalidateQueries({ queryKey: ['audit-log'] });
      }}
      invoiceRegistry={{
        totalAllocated: invoiceLedger.length,
        voidCount: invoiceLedger.filter((r) => Boolean(r.voidedAt)).length,
        receivablesGbp: invoiceSummary.receivablesGbp,
        upcomingGbp: invoiceSummary.upcomingGbp,
        paymentBasis: PAYMENT_DERIVATION_BASIS,
        recent: invoiceLedger
          .slice(-5)
          .reverse()
          .map((r) => ({ number: r.number, voided: Boolean(r.voidedAt) })),
      }}
      modelAExample={{
        label: COMMERCIAL_MODELS.commission_agent.label,
        retailChannelRevenueGbp: DEMO_MODEL_A_BRAND_A.retailChannelRevenueGbp,
        commissionRatePct: DEMO_MODEL_A_BRAND_A.commissionRatePct,
        mercentaCommissionGbp: DEMO_MODEL_A_BRAND_A.mercentaCommissionGbp,
        brandAmountGbp: DEMO_MODEL_A_BRAND_A.brandAmountGbp,
        vatBasis: DEMO_MODEL_A_BRAND_A.vat.basis,
      }}
      modelBExample={{
        label: COMMERCIAL_MODELS.buy_resell.label,
        summary: COMMERCIAL_MODELS.buy_resell.summary,
        retailChannelRevenueGbp: DEMO_MODEL_B_BRAND_B.retailChannelRevenueGbp,
        brandAcquisitionCostGbp: DEMO_MODEL_B_BRAND_B.brandAcquisitionCostGbp,
        grossCommercialSpreadGbp: DEMO_MODEL_B_BRAND_B.grossCommercialSpreadGbp,
        carrierCostGbp: DEMO_MODEL_B_BRAND_B.costs.carrierCostGbp,
        paymentFeesGbp: DEMO_MODEL_B_BRAND_B.costs.paymentFeesGbp,
        otherAgreedFeesGbp: DEMO_MODEL_B_BRAND_B.costs.otherAgreedFeesGbp,
        deductionsGbp: DEMO_MODEL_B_BRAND_B.costs.deductionsGbp,
        netMercentaMarginGbp: DEMO_MODEL_B_BRAND_B.netMercentaMarginGbp,
        vatBasis: DEMO_MODEL_B_BRAND_B.vat.basis,
      }}
      shippingEconomicsText={shippingEconomicsText}
      commercialRows={commercialRows}
      commercialAudit={commercialAudit}
      commercialMessage={commercialMessage}
      onRecordCommercialModel={(brandId, bName, model, reason) => {
        const res = setBrandCommercialModel({
          brandId,
          model,
          actorId: actingStaffId,
          reason: reason.trim(),
          source: 'admin_override',
        });
        setCommercialMessage(
          res.ok ? `${bName} -> ${COMMERCIAL_MODELS[model].label} recorded and audited.` : res.error
        );
        bump();
      }}
      companyRegistration={{
        legalName: COMPANY_REGISTRATION.legalName,
        companyNumber: COMPANY_REGISTRATION.companyNumber,
        jurisdiction: COMPANY_REGISTRATION.jurisdiction,
        registrarStatusLabel: COMPANY_REGISTRATION.registrarStatusLabel,
        disclaimer: COMPANY_CENTRE_DISCLAIMER,
      }}
      chModeLabel={String(chMode)}
      canReadRegister={canReadRegister}
      companyBusy={companyBusy}
      companyMessage={companyMessage}
      companyReadError={companySnapshotRaw.lastError}
      companySnapshot={{
        readAt: companySnapshotRaw.readAt,
        dataSource: companySnapshotRaw.dataSource,
        status: companySnapshotRaw.record?.status ?? null,
        incorporationDate: companySnapshotRaw.record?.incorporationDate ?? null,
        registeredOfficeAddress: companySnapshotRaw.record?.registeredOfficeAddress ?? null,
        sicCodes: companySnapshotRaw.record?.sicCodes ?? [],
        officers: companySnapshotRaw.officers.map((o) => ({
          name: o.name,
          role: o.role,
          appointedOn: o.appointedOn,
        })),
        psc: companySnapshotRaw.psc.map((p) => ({
          name: p.name,
          description: p.naturesOfControl.join(', ') || p.kind,
        })),
        filings: companySnapshotRaw.filings.map((f) => ({
          transactionId: f.transactionId,
          date: f.date,
          description: f.description,
        })),
        charges: companySnapshotRaw.charges.map((c) => ({
          chargeId: c.chargeId,
          createdAt: c.createdAt,
          description: c.description,
        })),
      }}
      confirmationWorkflow={{
        steps: CONFIRMATION_STATEMENT_WORKFLOW.map((s) => ({
          id: s.id,
          label: s.label,
          detail: s.detail,
        })),
        stage: confirmation.stage,
        nextDueDate: confirmation.nextDueDate,
        dueDateSource: confirmation.dueDateSource,
        csDueLabel: csDue.label,
        csDueState: csDue.state,
        accountsDueDate: companySnapshotRaw.record?.nextAccountsDue ?? null,
        accountsDueLabel: accountsDue.label,
        accountsDueState: accountsDue.state,
        founderApprovedAt: confirmation.founderApprovedAt,
        approvedBy: confirmation.approvedBy,
        recordedReference: confirmation.recordedReference,
        filingMethod: confirmation.filingMethod,
        recordedAt: confirmation.recordedAt,
        registerConfirmedAt: confirmation.registerConfirmedAt,
        filingUrl: COMPANIES_HOUSE_MANUAL_ACTIONS.filing,
      }}
      companyAuditCount={companyAuditHistory().length}
      governmentSecrets={GOVERNMENT_SECRET_KINDS.map((spec) => {
        const rec = getGovernmentSecret(spec.id);
        return {
          id: spec.id,
          label: spec.label,
          purpose: spec.purpose,
          enterAt: spec.enterAt,
          manualActionUrl: spec.manualActionUrl,
          secretRef: rec.secretRef,
          masked: rec.masked,
          verifiedAt: rec.verifiedAt,
        };
      })}
      hmrcReadiness={HMRC_READINESS}
      onReadCompanyRegister={async () => {
        setCompanyBusy(true);
        setCompanyMessage(null);
        try {
          const { client, mode } = createCompaniesHouseClientForConnection(
            companiesHouseConnectionCredentials,
            HOOK_EDGE_BASE
          );
          const recordRes = await client.getCompanyRecord(COMPANY_REGISTRATION.companyNumber);
          if (!recordRes.ok || !recordRes.data) {
            recordRegistrarReadFailure({
              actorId: companyActorId,
              error: recordRes.error ?? 'The registrar returned no company record.',
            });
            setCompanyMessage(recordRes.error ?? 'No company record returned.');
            return;
          }
          const [officersRes, pscRes, filingsRes, chargesRes] = await Promise.all([
            client.getOfficers(COMPANY_REGISTRATION.companyNumber),
            client.getPersonsWithSignificantControl(COMPANY_REGISTRATION.companyNumber),
            client.getFilingHistory(COMPANY_REGISTRATION.companyNumber),
            client.getCharges(COMPANY_REGISTRATION.companyNumber),
          ]);
          recordRegistrarSnapshot({
            mode: mode === 'real' ? 'live' : 'simulation',
            actorId: companyActorId,
            record: recordRes.data,
            officers: officersRes.data ?? [],
            psc: pscRes.data ?? [],
            filings: filingsRes.data ?? [],
            charges: chargesRes.data ?? [],
          });
          setCompanyMessage(
            mode === 'real'
              ? 'Registrar record read via live Companies House connection.'
              : 'Simulated registrar record read — marked SIMULATED.'
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Registrar read failed.';
          recordRegistrarReadFailure({ actorId: companyActorId, error: msg });
          setCompanyMessage(msg);
        } finally {
          setCompanyBusy(false);
          bump();
        }
      }}
      onAdvanceConfirmationReview={() => {
        const res = advanceConfirmationStatement({ stage: 'review', actorId: companyActorId });
        setCompanyMessage(res.ok ? 'Moved to REVIEW.' : res.error);
        bump();
      }}
      onApproveConfirmation={() => {
        const res = approveConfirmationStatement({ actorId: companyActorId });
        setCompanyMessage(res.ok ? 'Approved by founder. Filing step unlocked.' : res.error);
        bump();
      }}
      onFileViaOfficialApi={() => {
        const res = fileViaOfficialApi({ actorId: companyActorId });
        setCompanyMessage(res.ok ? 'Submitted.' : res.error);
        bump();
      }}
      onRecordManualFiling={(reference, filedAt) => {
        const res = recordManualFiling({ reference, filedAt, actorId: companyActorId });
        setCompanyMessage(
          res.ok
            ? 'Filing recorded. Re-read register before verifying.'
            : res.error
        );
        bump();
      }}
      onVerifyFilingOnRegister={() => {
        const res = confirmConfirmationStatementFromRegister({ actorId: companyActorId });
        setCompanyMessage(res.ok ? 'Filing verified against register.' : res.error);
        bump();
      }}
      onStoreGovernmentSecret={(kind, value) => {
        const res = storeGovernmentSecret({
          kind: kind as GovernmentSecretKind,
          value,
          actorId: companyActorId,
        });
        setCompanyMessage(res.ok ? `Stored masked reference ${res.value.masked}.` : res.error);
        bump();
      }}
      onVerifyGovernmentSecret={(kind) => {
        const res = markGovernmentSecretVerified({
          kind: kind as GovernmentSecretKind,
          actorId: companyActorId,
        });
        setCompanyMessage(res.ok ? 'Government credential confirmed working.' : res.error);
        bump();
      }}
      onClearGovernmentSecret={(kind) => {
        const res = clearGovernmentSecret({
          kind: kind as GovernmentSecretKind,
          actorId: companyActorId,
        });
        setCompanyMessage(res.ok ? 'Masked reference cleared.' : res.error);
        bump();
      }}
      operatingCostsDisclaimer={OPERATING_COSTS_DISCLAIMER}
      costSummary={{
        monthlyFixedGbp: costRaw.monthlyFixedGbp,
        aiMonthlySpendGbp: costRaw.ai.monthlySpendGbp,
        projectedMonthGbp: costRaw.projectedMonthGbp,
        monthlyTotalGbp: costRaw.monthlyTotalGbp,
        aiCalls: costRaw.ai.calls,
        aiTokens: costRaw.ai.tokens,
        aiCacheHits: costRaw.ai.cacheHits,
        aiCacheMisses: costRaw.ai.cacheMisses,
        aiRefused: costRaw.ai.refused,
        aiProtectionState: costRaw.ai.protection.state,
        aiProtectionReason: costRaw.ai.protection.reason,
        aiProjectionMonthlyGbp: costRaw.ai.projectionMonthlyGbp,
        freeModelsLabel: `Free runtime models: ${FREE_RUNTIME_MODELS.join(', ')}`,
        ceilingsLabel: `£${AI_SPEND_CEILINGS.dailyGbp}/day, £${AI_SPEND_CEILINGS.monthlyGbp}/month`,
        providers: costRaw.providers.map((p) => ({
          id: p.id,
          name: p.name,
          plan: p.plan,
          billing: p.billing,
          category: p.category,
          fixedMonthlyGbp: p.fixedMonthlyGbp,
          usageActualGbp: p.estimatedTotalGbp - p.fixedMonthlyGbp,
          usageBudgetGbp: p.usageBudgetGbp,
          varianceGbp: p.varianceGbp,
          source: p.source,
          note: p.note,
          manageUrl: p.manageUrl,
        })),
        byTask: costRaw.ai.byTask,
        recentUsage: usageEntries.map((e) => ({
          id: e.id,
          at: e.at,
          taskId: e.taskId,
          model: e.model,
          tokens: e.tokens,
          estimatedCostGbp: e.estimatedCostGbp,
          status: e.status,
          cache: e.cache,
        })),
        modelPolicyRows: Object.values(RUNTIME_TASKS).map((spec) => {
          const d = selectRuntimeModel(spec);
          return { taskId: spec.id, tier: d.tier, model: d.model, reason: d.reason };
        }),
        revenueStreams: costRaw.revenue.streams,
        revenueTotalGbp: costRaw.revenue.totalGbp,
        contributionGrossGbp: costRaw.contribution.grossGbp,
        contributionMarginPct: costRaw.contribution.marginPct,
        contributionProvisional: costRaw.contribution.provisional,
        units: costRaw.units,
        perUnit: costRaw.perUnit,
        costInputs: COST_MODEL_INPUTS.map((ci) => ({
          id: ci.id,
          label: ci.label,
          formattedValue:
            ci.unit === 'percent'
              ? `${ci.value}%`
              : ci.unit === 'GBP/month'
                ? `${money(ci.value)}/month`
                : money(ci.value),
          requiresFounderApproval: ci.requiresFounderApproval,
          note: ci.note,
        })),
        minSubscriptionLabel:
          costRaw.derived.minSubscriptionGbp === null
            ? 'Not computable yet'
            : money(costRaw.derived.minSubscriptionGbp),
        minSubscriptionNote: costRaw.derived.minSubscriptionNote,
        cacToleranceGbp: costRaw.derived.cacToleranceGbp,
        cacToleranceNote: costRaw.derived.cacToleranceNote,
      }}
      onResetAiUsageLog={() => {
        resetAiUsageLog();
        bump();
      }}
      launchDisclaimer={LAUNCH_CENTRE_DISCLAIMER}
      launchItems={LAUNCH_PLATFORMS.map((p) => {
        const rec = launchRecs.find((r) => r.platformId === p.id) ?? {
          platformId: p.id,
          accountStatus: 'not_started' as const,
          profileStatus: 'not_prepared' as const,
          profileUrl: '',
          launchDate: null,
          submittedAt: null,
          notes: '',
        };
        return {
          id: p.id,
          name: p.name,
          channelLabel: CHANNEL_LABEL[p.submissionChannel] ?? p.submissionChannel,
          accountStatus: rec.accountStatus,
          profileStatus: rec.profileStatus,
          complete: launchPlatformIsComplete(rec),
          siteUrl: p.siteUrl,
          signupUrl: p.signupUrl,
          requirementsUrl: p.requirementsUrl,
          requirementsVerified: p.requirementsVerified,
          audience: p.audience,
          checklist: buildSubmissionChecklist(p, rec),
          packageText: buildSubmissionPackage(p, launchProfile),
        };
      })}
      launchProfile={launchProfile}
      launchMessage={launchMessage}
      onUpdateLaunchProfile={(patch) => setLaunchProfile((prev) => ({ ...prev, ...patch }))}
      onPrepareLaunchProfile={(platformId) => {
        const res = updateLaunchRecord({
          platformId,
          actorId: 'super-admin:founder',
          patch: { profileStatus: 'prepared' },
          reason: 'Profile package prepared in Launch Centre',
        });
        setLaunchMessage(res.ok ? `Prepared package for ${platformId}.` : res.error);
        bump();
      }}
      onMarkLaunchSubmitted={(platformId) => {
        const res = markLaunchSubmitted({ platformId, actorId: 'super-admin:founder' });
        setLaunchMessage(res.ok ? `Marked ${platformId} submitted (audited).` : res.error);
        bump();
      }}
      onCopyLaunchText={async (label, text) => {
        try {
          await navigator.clipboard.writeText(text);
          setLaunchMessage(`Copied ${label} package to clipboard.`);
        } catch {
          setLaunchMessage('Clipboard access denied — copy manually from drawer.');
        }
      }}
      onNavigateView={onNavigateView}
    />
  );
}
