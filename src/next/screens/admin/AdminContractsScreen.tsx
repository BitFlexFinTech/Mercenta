import { useEffect, useMemo, useState } from 'react';
import { COMMISSION_RATE_PLACEHOLDER, MONTHLY_FEE_PLACEHOLDER_GBP } from '@/config/commercial';
import { fulfillmentTrackLabel } from '@/config/fulfillmentTrack';
import { useApp } from '@/context/GlobalStateContext';
import { renewContract, saveContractDraft, terminateContract } from '@/data/demoStore';
import { useBrands, useContracts, useFulfillmentScores } from '@/data/queries';
import { useIntegrations } from '@/integrations/IntegrationsContext';
import { buildDistributionAgreement } from '@/lib/agreement';
import {
  CONTRACT_STATUS_LABELS,
  createRenewalDraft,
  createTrackAmendment,
  renewalUrgency,
} from '@/lib/contracts';
import { createEsignClient } from '@/lib/esign/esign';
import { useRecordDeepLink } from '@/lib/runtime/recordDeepLink';
import type { Contract, FulfillmentTrack } from '@/types';
import type { SemanticTone } from '@/next/components/ConsolePrimitives';
import {
  AdminContractsView,
  type AdminContractRow,
  type ContractBrandOption,
} from './AdminContractsView';

function statusToneFor(status: Contract['status']): SemanticTone {
  if (status === 'active' || status === 'signed') return 'success';
  if (status === 'draft') return 'neutral';
  if (status === 'terminated') return 'danger';
  if (status === 'expiring') return 'warning';
  return 'info';
}

export function AdminContractsScreen() {
  const { integrations } = useIntegrations();
  const { actingStaffId, canCurrentUserMutate } = useApp();
  const actor = actingStaffId ?? 'staff:contracts';
  const esign = integrations.esignature;
  const esignLive = esign?.status === 'connected' && !esign.sandbox;

  const brandsQuery = useBrands();
  const contractsQuery = useContracts();
  const scoresQuery = useFulfillmentScores();

  const [lastEnvelope, setLastEnvelope] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const brands = useMemo(() => brandsQuery.data?.data ?? [], [brandsQuery.data]);
  const allContracts = useMemo(() => contractsQuery.data?.data ?? [], [contractsQuery.data]);
  const scores = useMemo(() => scoresQuery.data?.data ?? [], [scoresQuery.data]);

  const deepLinkContract = useRecordDeepLink('contract');
  useEffect(() => {
    if (!deepLinkContract) return;
    if (allContracts.some((c) => c.id === deepLinkContract)) {
      setSelectedId(deepLinkContract);
    }
  }, [deepLinkContract, allContracts]);

  const rows: AdminContractRow[] = useMemo(() => {
    const nowIso = new Date().toISOString();
    return allContracts.map((c) => {
      const brand = brands.find((b) => b.id === c.brandId);
      const brandName = brand?.profile.businessName ?? c.brandId;
      const brandCategory = brand?.category ?? 'Home';
      return {
        id: c.id,
        brandId: c.brandId,
        brandName,
        brandCategory,
        type: c.type,
        commissionRate: c.commissionRate,
        monthlyFee: c.monthlyFee,
        fulfillmentTrack: c.fulfillmentTrack,
        trackLabel: fulfillmentTrackLabel(c.fulfillmentTrack),
        status: c.status,
        statusLabel: CONTRACT_STATUS_LABELS[c.status],
        statusTone: statusToneFor(c.status),
        effectiveDate: c.effectiveDate,
        renewalDate: c.renewalDate,
        urgency: renewalUrgency(c.renewalDate, nowIso),
        signatoriesCount: c.signatories.length,
        version: c.version,
        agreementPreview: buildDistributionAgreement({
          businessName: brandName,
          commissionRate: c.commissionRate,
          monthlyFee: c.monthlyFee,
          category: brandCategory,
          fulfillmentTrack:
            c.fulfillmentTrack === 'unassigned' ? 'financed' : c.fulfillmentTrack,
        }),
        raw: c,
      };
    });
  }, [allContracts, brands]);

  const selectedContract = rows.find((r) => r.id === selectedId) ?? null;

  const brandVersions = useMemo(() => {
    if (!selectedContract) return [];
    return rows
      .filter((r) => r.brandId === selectedContract.brandId)
      .sort((a, b) => b.version - a.version);
  }, [rows, selectedContract]);

  const brandOptions: ContractBrandOption[] = useMemo(
    () =>
      brands.map((b) => {
        const s = scores.find((sc) => sc.brandId === b.id);
        return {
          id: b.id,
          businessName: b.profile.businessName,
          category: b.category,
          defaultRate: COMMISSION_RATE_PLACEHOLDER,
          defaultFee: MONTHLY_FEE_PLACEHOLDER_GBP,
          defaultTrack: s?.track ?? 'unassigned',
        };
      }),
    [brands, scores]
  );

  const statusOptions = useMemo(
    () =>
      Object.entries(CONTRACT_STATUS_LABELS).map(([id, label]) => ({
        id,
        label,
      })),
    []
  );

  const errObj = contractsQuery.error || brandsQuery.error;
  const error =
    errObj instanceof Error ? errObj.message : errObj ? 'Failed to load contracts.' : null;

  return (
    <AdminContractsView
      loading={contractsQuery.isPending || brandsQuery.isPending}
      error={error}
      onRetry={() => {
        void contractsQuery.refetch();
        void brandsQuery.refetch();
      }}
      canMutate={canCurrentUserMutate}
      esignLive={esignLive}
      lastEnvelope={lastEnvelope}
      rows={rows}
      brandOptions={brandOptions}
      statusOptions={statusOptions}
      statusFilter={statusFilter}
      onStatusFilterChange={setStatusFilter}
      searchQuery={searchQuery}
      onSearchQueryChange={setSearchQuery}
      selectedContract={selectedContract}
      onSelectContract={(row) => setSelectedId(row?.id ?? null)}
      brandVersions={brandVersions}
      trackLabels={{
        direct_fulfillment: fulfillmentTrackLabel('direct_fulfillment'),
        financed: fulfillmentTrackLabel('financed'),
        unassigned: fulfillmentTrackLabel('unassigned'),
      }}
      buildAgreementText={(params) =>
        buildDistributionAgreement({
          businessName: params.businessName,
          commissionRate: params.commissionRate,
          monthlyFee: params.monthlyFee,
          category: params.category,
          fulfillmentTrack:
            params.fulfillmentTrack === 'unassigned' ? 'financed' : params.fulfillmentTrack,
        })
      }
      onCreateContract={async ({ brand, rate, fee, track, previewText }) => {
        if (!canCurrentUserMutate) return;
        const today = new Date();
        const inOneYear = new Date(today.getTime() + 365 * 24 * 60 * 60 * 1000);
        const draft: Contract = {
          id: `contract-${brand.id}-${Date.now()}`,
          brandId: brand.id,
          type: 'distribution_agreement',
          status: 'draft',
          commissionRate: rate,
          monthlyFee: fee,
          fulfillmentTrack: track,
          effectiveDate: today.toISOString().slice(0, 10),
          renewalDate: inOneYear.toISOString().slice(0, 10),
          documentUrl: '',
          signatories: [],
          version: 1,
        };
        saveContractDraft(draft, actor);
        const esignClient = createEsignClient(() => null, '/fn');
        const res = await esignClient.sendForSignature({
          contractId: draft.id,
          documentText: previewText,
          signatoryName: brand.businessName,
          signatoryEmail: 'signatory-PENDING@example.com',
        });
        setLastEnvelope(res.ok && res.envelopeId ? res.envelopeId : null);
      }}
      onCreateRenewalDraft={(contract) => {
        if (!canCurrentUserMutate) return;
        saveContractDraft(createRenewalDraft(contract), actor);
        setSelectedId(null);
      }}
      onCreateAmendment={(contract) => {
        if (!canCurrentUserMutate) return;
        const newTrack: FulfillmentTrack =
          contract.fulfillmentTrack === 'financed' ? 'direct_fulfillment' : 'financed';
        saveContractDraft(createTrackAmendment(contract, newTrack), actor);
        setSelectedId(null);
      }}
      onRenew={(contractId) => {
        if (!canCurrentUserMutate) return;
        renewContract(contractId, actor);
        setSelectedId(null);
      }}
      onTerminate={(contractId) => {
        if (!canCurrentUserMutate) return;
        terminateContract(contractId, actor, 'Terminated from the Contract Cycle console');
        setSelectedId(null);
      }}
    />
  );
}
