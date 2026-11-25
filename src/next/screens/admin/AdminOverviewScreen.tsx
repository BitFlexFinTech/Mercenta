/**
 * §WAVE 3 (2026-11-25) — the ADMIN portfolio overview (data).
 *
 * Reads the canonical queries and shapes them for the view. It performs NO
 * mutation and re-derives no business rule: every state label comes from
 * `lib/statusPresentation` and every shipment resolution from
 * `isResolvedShipmentStatus`.
 */
import { useMemo } from 'react';
import {
  useBrands,
  useCommissions,
  useComplianceDocuments,
  useDeductions,
  usePurchaseOrders,
  useShipmentsAll,
} from '@/data/queries';
import { poStatusPresentation } from '@/lib/statusPresentation';
import { isOpenPo, activeShipments, brandNameOf, sumGbp, shipmentsWithExceptions } from './adminPortfolio';
import { AdminOverviewView, type AttentionItem, type BrandRow } from './AdminOverviewView';

export function AdminOverviewScreen({
  onOpenPurchaseOrders,
  onOpenLogistics,
}: {
  onOpenPurchaseOrders: (brandId?: string) => void;
  onOpenLogistics: () => void;
}) {
  const brandsQ = useBrands();
  const posQ = usePurchaseOrders();
  const shipQ = useShipmentsAll();
  const docsQ = useComplianceDocuments();
  const dedQ = useDeductions();
  const commQ = useCommissions();

  const brands = brandsQ.data?.data ?? [];
  const pos = posQ.data?.data ?? [];
  const shipments = shipQ.data?.data ?? [];
  const docs = docsQ.data?.data ?? [];
  const deductions = dedQ.data?.data ?? [];
  const commissions = commQ.data?.data ?? [];

  const brandRows = useMemo<BrandRow[]>(() => {
    return brands.map((brand) => {
      const brandPos = pos.filter((po) => po.brandId === brand.id);
      const openPos = brandPos.filter(isOpenPo);
      const brandDocs = docs.filter((doc) => doc.brandId === brand.id);
      const approved = brandDocs.filter((doc) => doc.status === 'approved').length;
      const brandShipments = activeShipments(shipments.filter((s) => s.brandId === brand.id));
      const brandDeductions = deductions.filter(
        (d) => d.brandId === brand.id && (d.status === 'open' || d.status === 'disputed')
      );
      return {
        id: brand.id,
        name: brand.profile.businessName,
        category: brand.category,
        contractStatus: brand.contractStatus,
        openPos: openPos.length,
        poValue: sumGbp(brandPos.map((po) => po.poValue)),
        complianceLabel: `${approved} of ${brandDocs.length} documents approved`,
        complianceClear: brandDocs.length > 0 && approved === brandDocs.length,
        activeShipments: brandShipments.length,
        openDeductionValue: sumGbp(brandDeductions.map((d) => d.amountGbp)),
      };
    });
  }, [brands, pos, docs, shipments, deductions]);

  const attention = useMemo<AttentionItem[]>(() => {
    const items: AttentionItem[] = [];

    for (const po of pos.filter((p) => p.status === 'received')) {
      items.push({
        id: `po-${po.id}`,
        brand: brandNameOf(brands, po.brandId),
        label: `${po.poNumber} awaiting acknowledgement`,
        context: poStatusPresentation(po.status).label,
        tone: 'warning',
        onClick: () => onOpenPurchaseOrders(po.brandId),
      });
    }

    for (const shipment of shipmentsWithExceptions(shipments)) {
      items.push({
        id: `ship-${shipment.id}`,
        brand: brandNameOf(brands, shipment.brandId),
        label: `${shipment.poNumber ?? shipment.reference} has a carrier exception`,
        context: shipment.carrier,
        tone: 'danger',
        onClick: onOpenLogistics,
      });
    }

    for (const row of brandRows) {
      if (!row.complianceClear) {
        items.push({
          id: `comp-${row.id}`,
          brand: row.name,
          label: 'Compliance documentation is incomplete',
          context: row.complianceLabel,
          tone: 'warning',
          /* No onClick yet: the admin compliance screen arrives in WAVE 3b, and a
             row that navigates to a placeholder is worse than plain information. */
        });
      }
    }

    return items.slice(0, 12);
  }, [pos, brands, shipments, brandRows, onOpenPurchaseOrders, onOpenLogistics]);

  const openPos = pos.filter(isOpenPo);
  const inTransit = activeShipments(shipments);
  const complianceGaps = brandRows.filter((row) => !row.complianceClear).length;
  const paidCommission = commissions.filter((c) => c.status === 'paid');

  return (
    <AdminOverviewView
      brandCount={brands.length}
      portfolioValue={sumGbp(pos.map((po) => po.poValue))}
      openPoCount={openPos.length}
      inTransitCount={inTransit.length}
      exceptionCount={shipmentsWithExceptions(shipments).length}
      complianceGapCount={complianceGaps}
      settledCommissionValue={sumGbp(paidCommission.map((c) => c.commissionAmount ?? 0))}
      brandRows={brandRows}
      attention={attention}
      isLoading={brandsQ.isPending || posQ.isPending || shipQ.isPending}
      isError={brandsQ.isError || posQ.isError || shipQ.isError}
      errorMessage={String(brandsQ.error ?? posQ.error ?? shipQ.error ?? '') || undefined}
      onRetry={() => {
        void brandsQ.refetch();
        void posQ.refetch();
        void shipQ.refetch();
      }}
      onOpenBrand={(brandId) => onOpenPurchaseOrders(brandId)}
      onOpenLogistics={onOpenLogistics}
    />
  );
}