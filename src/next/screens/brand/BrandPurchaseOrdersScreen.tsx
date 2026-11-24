import { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useApp } from '@/context/GlobalStateContext';
import { useBrands, useCanonicalStoreVersion, usePurchaseOrders } from '@/data/queries';
import { listChannelInstructions } from '@/lib/commerce/channelInstructions';
import { useRecordDeepLink } from '@/lib/runtime/recordDeepLink';
import { BrandCommPanel } from '@/components/shared/BrandComm';
import { CommerceSimulationPanel } from '@/components/shared/CommerceSimulationPanel';
import type { ChannelInstruction } from '@/types';
import {
  runApproveOnBehalf,
  runAuthoriseOnBehalf,
  runPackingCorrection,
  runPoAcknowledgement,
  runWithdrawOnBehalf,
} from './poActions';
import { BrandPurchaseOrdersView } from './BrandPurchaseOrdersView';

export function BrandPurchaseOrdersScreen({
  onOpenLogistics,
}: {
  onOpenLogistics: (poNumber: string) => void;
}) {
  const qc = useQueryClient();
  const { session } = useApp();
  const tenantId = session?.tier === 'brand' ? session.tenantId ?? null : null;
  const brandsQ = useBrands();
  const posQ = usePurchaseOrders();
  const canonicalVersion = useCanonicalStoreVersion();
  const deepLinkPo = useRecordDeepLink('po');

  const brands = brandsQ.data?.data ?? [];
  const activeBrandId = tenantId ?? brands[0]?.id ?? null;
  const activeBrand = brands.find((b) => b.id === activeBrandId);
  const pos = useMemo(
    () => (posQ.data?.data ?? []).filter((p) => p.brandId === activeBrandId),
    [posQ.data, activeBrandId]
  );

  const instructionsByPoId = useMemo(() => {
    void canonicalVersion;
    const map = new Map<string, ChannelInstruction[]>();
    for (const item of listChannelInstructions()) {
      map.set(item.purchaseOrderId, [...(map.get(item.purchaseOrderId) ?? []), item]);
    }
    return map;
  }, [canonicalVersion]);

  const brandLabel = activeBrand?.profile.businessName ?? activeBrandId ?? 'this brand';

  return (
    <BrandPurchaseOrdersView
      pos={pos}
      isLoading={posQ.isPending || brandsQ.isPending}
      isError={posQ.isError || brandsQ.isError}
      errorMessage={String(posQ.error ?? brandsQ.error ?? '') || undefined}
      onRetry={() => {
        void posQ.refetch();
        void brandsQ.refetch();
      }}
      tenantId={activeBrandId}
      brandLabel={brandLabel}
      isFinancedBrand={activeBrand?.track === 'financed'}
      instructionsByPoId={instructionsByPoId}
      deepLinkPoNumber={deepLinkPo}
      onSubmitAck={(po, lines) => runPoAcknowledgement(qc, po.id, lines)}
      onSubmitCorrection={(po, cartons, note) =>
        runPackingCorrection(qc, po, tenantId, cartons, note)
      }
      onApproveOnBehalf={(po, draftId) =>
        runApproveOnBehalf(qc, po, draftId, activeBrandId, brandLabel)
      }
      onAuthoriseOnBehalf={(poId, note) =>
        runAuthoriseOnBehalf(qc, poId, `${activeBrandId ?? 'brand'} (brand)`, note)
      }
      onWithdrawOnBehalf={(poId) =>
        runWithdrawOnBehalf(qc, poId, `${activeBrandId ?? 'brand'} (brand)`)
      }
      onOpenLogistics={onOpenLogistics}
      renderCommPanel={(po) => (
        <BrandCommPanel brandId={po.brandId} compact poRef={po.poNumber} />
      )}
      simulationFooter={<CommerceSimulationPanel />}
    />
  );
}
