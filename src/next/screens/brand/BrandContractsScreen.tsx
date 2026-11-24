import { useEffect, useMemo, useState } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { useContracts } from '@/data/queries';
import { useRecordDeepLink } from '@/lib/runtime/recordDeepLink';
import { buildDistributionAgreement } from '@/lib/agreement';
import type { Contract } from '@/types';
import { BrandContractsView } from './BrandContractsView';

export function BrandContractsScreen() {
  const { brandProfile, session } = useApp();
  const contractsQ = useContracts();
  const nowIso = new Date().toISOString();
  const tenantId = session?.tier === 'brand' ? session.tenantId ?? null : null;

  const contracts = useMemo(
    () =>
      (contractsQ.data?.data ?? [])
        .filter((c) => (tenantId ? c.brandId === tenantId : true))
        .filter((c) => c.status !== 'draft'),
    [contractsQ.data, tenantId]
  );

  const [viewingId, setViewingId] = useState<string | null>(null);
  const viewing = contracts.find((c) => c.id === viewingId) ?? null;

  const deepLinkContract = useRecordDeepLink('contract');
  useEffect(() => {
    if (!deepLinkContract) return;
    if (contracts.some((c) => c.id === deepLinkContract)) {
      setViewingId(deepLinkContract);
    }
  }, [deepLinkContract, contracts]);

  function renderAgreement(contract: Contract): string {
    return buildDistributionAgreement({
      businessName: brandProfile.businessName || 'Brand',
      commissionRate: contract.commissionRate,
      monthlyFee: contract.monthlyFee,
      category: brandProfile.category || 'Home',
      fulfillmentTrack:
        contract.fulfillmentTrack === 'unassigned' ? 'financed' : contract.fulfillmentTrack,
      date: contract.effectiveDate || undefined,
    });
  }

  function handleDownload(contract: Contract) {
    const blob = new Blob([renderAgreement(contract)], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `distribution-agreement-v${contract.version}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <BrandContractsView
      loading={contractsQ.isPending}
      error={contractsQ.isError ? String(contractsQ.error) : null}
      onRetry={() => void contractsQ.refetch()}
      contracts={contracts}
      nowIso={nowIso}
      viewingContract={viewing}
      viewingText={viewing ? renderAgreement(viewing) : ''}
      onOpenContract={(id) => setViewingId(id)}
      onCloseContract={() => setViewingId(null)}
      onDownloadContract={handleDownload}
    />
  );
}
export default BrandContractsScreen;
