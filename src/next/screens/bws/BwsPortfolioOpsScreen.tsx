import { useMemo, useState } from 'react';
import { fulfillmentTrackLabel } from '@/config/fulfillmentTrack';
import { useApp } from '@/context/GlobalStateContext';
import {
  useAdSpendBudgets,
  useBrands,
  useCommissions,
  useComplianceDocuments,
  useProducts,
  usePurchaseOrders,
  useShipmentsAll,
} from '@/data/queries';
import { useIntegrations } from '@/integrations/IntegrationsContext';
import { downloadCsv } from '@/lib/csv';
import { analyzeProductListing } from '@/lib/intelligence/listingAnalyzer';
import { poStatusPresentation, shipmentStatusPresentation } from '@/lib/statusPresentation';
import { formatGbp } from '@/next/components/ConsoleCharts';
import type { MetricItem, SemanticTone } from '@/next/components/ConsolePrimitives';
import { SuperAdminScreen } from '@/next/screens/admin/SuperAdminScreen';
import {
  BwsPortfolioOpsView,
  type BwsPortfolioOpsSection,
} from './BwsPortfolioOpsView';

function mapTone(t: string): SemanticTone {
  if (t === 'success' || t === 'warning' || t === 'danger' || t === 'info') return t;
  return 'neutral';
}

export function BwsPortfolioOpsScreen({
  section,
  allowedBrandIds,
  onNavigateView,
}: {
  section: BwsPortfolioOpsSection;
  allowedBrandIds?: Set<string> | null;
  onNavigateView?: (viewId: string) => void;
}) {
  const { session, actingStaff, canCurrentUserMutate } = useApp();
  const { integrations, modes } = useIntegrations();
  const brandsQ = useBrands();
  const productsQ = useProducts();
  const posQ = usePurchaseOrders();
  const shipsQ = useShipmentsAll();
  const docsQ = useComplianceDocuments();
  const commQ = useCommissions();
  const budgetsQ = useAdSpendBudgets();

  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  const [drawerBrandId, setDrawerBrandId] = useState<string | null>(null);

  const brands = useMemo(() => {
    const raw = brandsQ.data?.data ?? [];
    if (!allowedBrandIds) return raw;
    return raw.filter((b) => allowedBrandIds.has(b.id));
  }, [brandsQ.data, allowedBrandIds]);

  const products = useMemo(() => productsQ.data?.data ?? [], [productsQ.data]);
  const pos = useMemo(() => posQ.data?.data ?? [], [posQ.data]);
  const shipments = useMemo(() => shipsQ.data?.data ?? [], [shipsQ.data]);
  const docs = useMemo(() => docsQ.data?.data ?? [], [docsQ.data]);
  const commissions = useMemo(() => commQ.data?.data ?? [], [commQ.data]);
  const budgets = useMemo(() => budgetsQ.data?.data ?? [], [budgetsQ.data]);

  const brandNameMap = useMemo(
    () => new Map(brands.map((b) => [b.id, b.profile.businessName])),
    [brands]
  );

  const brandRows = useMemo(
    () =>
      brands.map((b) => {
        const bPos = pos.filter((p) => p.brandId === b.id);
        const bDocs = docs.filter((d) => d.brandId === b.id);
        return {
          id: b.id,
          businessName: b.profile.businessName,
          category: b.category,
          nation: b.nation ?? '',
          trackLabel: fulfillmentTrackLabel(b.track),
          contractStatus: b.contractStatus,
          skuCount: products.filter((p) => p.brandId === b.id).length,
          poCount: bPos.length,
          poValueGbp: bPos.reduce((s, p) => s + p.poValue, 0),
          approvedDocsCount: bDocs.filter((d) => d.status === 'approved').length,
          totalDocsCount: bDocs.length,
        };
      }),
    [brands, pos, docs, products]
  );

  const activeBrandId =
    brands.find((b) => b.id === selectedBrandId)?.id ?? brands[0]?.id ?? '';

  const partnerPos = useMemo(
    () =>
      pos
        .filter((p) => p.brandId === activeBrandId)
        .map((p) => {
          const pres = poStatusPresentation(p.status);
          return {
            id: p.id,
            poNumber: p.poNumber,
            statusLabel: pres.label,
            statusTone: mapTone(pres.tone),
            poValueGbp: p.poValue,
            orderDate: p.orderDate.slice(0, 10),
          };
        }),
    [pos, activeBrandId]
  );

  const partnerShipments = useMemo(
    () =>
      shipments
        .filter((s) => s.brandId === activeBrandId)
        .map((s) => {
          const pres = shipmentStatusPresentation(s.status);
          return {
            id: s.id,
            reference: s.reference,
            carrier: s.carrier,
            origin: s.origin,
            destination: s.destination,
            statusLabel: pres.label,
            statusTone: mapTone(pres.tone),
          };
        }),
    [shipments, activeBrandId]
  );

  const exciseRows = useMemo(
    () =>
      products
        .filter((p) => !allowedBrandIds || allowedBrandIds.has(p.brandId))
        .map((p) => ({
          productId: p.id,
          brandName: brandNameMap.get(p.brandId) ?? p.brandId,
          sku: p.sku,
          productName: p.name,
          commodityCode: p.commodityCode ?? '',
          vatStatus: p.vatStatus ?? 'standard',
          hazmat: Boolean(p.hazmat),
          exWorksGbp: p.exWorksPrice,
        })),
    [products, allowedBrandIds, brandNameMap]
  );

  const customsShipments = useMemo(
    () =>
      shipments
        .filter((s) => !allowedBrandIds || (s.brandId ? allowedBrandIds.has(s.brandId) : true))
        .filter(
          (s) =>
            s.status === 'uk_customs_cleared' ||
            s.status === 'sea_transit' ||
            s.status === 'air_transit' ||
            s.status === 'bak_depot'
        )
        .map((s) => {
          const pres = shipmentStatusPresentation(s.status);
          return {
            id: s.id,
            reference: s.reference,
            carrier: s.carrier,
            origin: s.origin,
            destination: s.destination,
            statusLabel: pres.label,
            statusTone: mapTone(pres.tone),
          };
        }),
    [shipments, allowedBrandIds]
  );

  const brandCategoryMap = useMemo(
    () => new Map(brands.map((b) => [b.id, b.category])),
    [brands]
  );

  const growthSkus = useMemo(
    () =>
      products
        .filter((p) => !allowedBrandIds || allowedBrandIds.has(p.brandId))
        .map((p) => {
          const analysis = analyzeProductListing(p as unknown as Record<string, unknown>, {
            category: brandCategoryMap.get(p.brandId) ?? 'Home',
            brandId: p.brandId,
          });
          return {
            sku: p.sku,
            productName: p.name,
            brandName: brandNameMap.get(p.brandId) ?? p.brandId,
            score: analysis.healthScore,
            issuesCount: analysis.dimensions.filter((d) => d.score < 60).length,
            recommendationCount: analysis.recommendations.length,
          };
        }),
    [products, allowedBrandIds, brandNameMap, brandCategoryMap]
  );

  const { poTrendSeries, carrierSeries } = useMemo(() => {
    const byMonth = new Map<string, number>();
    for (const po of pos) {
      const m = (po.orderDate ?? '').slice(0, 7);
      if (m) byMonth.set(m, (byMonth.get(m) ?? 0) + po.poValue);
    }
    const byCarrier = new Map<string, number>();
    for (const s of shipments) {
      const key = s.carrier.toUpperCase();
      byCarrier.set(key, (byCarrier.get(key) ?? 0) + 1);
    }
    return {
      poTrendSeries: Array.from(byMonth.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-6)
        .map(([m, value]) => ({ label: m, value: Math.round(value) })),
      carrierSeries: Array.from(byCarrier.entries()).map(([label, value]) => ({
        label,
        value,
      })),
    };
  }, [pos, shipments]);

  const reportRows = useMemo(
    () =>
      pos.map((p) => ({
        poNumber: p.poNumber,
        brandName: brandNameMap.get(p.brandId) ?? p.brandId,
        statusLabel: poStatusPresentation(p.status).label,
        poValueGbp: p.poValue,
        commissionGbp: p.commissionAmount,
        orderDate: p.orderDate.slice(0, 10),
      })),
    [pos, brandNameMap]
  );

  if (section === 'settings' && session?.tier === 'super_admin') {
    return <SuperAdminScreen onNavigateView={onNavigateView} />;
  }

  const totalPoVal = pos.reduce((s, p) => s + p.poValue, 0);
  const totalCommVal = commissions.reduce((s, c) => s + c.commissionAmount, 0);
  const totalAdBudget = budgets.reduce((s, b) => s + b.monthlyBudgetGbp, 0);

  const metrics: MetricItem[] =
    section === 'import-excise'
      ? [
          {
            id: 'hs',
            label: 'SKUs with HS code',
            value: `${exciseRows.filter((r) => Boolean(r.commodityCode)).length} / ${exciseRows.length}`,
          },
          {
            id: 'hazmat',
            label: 'Hazmat SKUs',
            value: String(exciseRows.filter((r) => r.hazmat).length),
          },
          {
            id: 'customs-ship',
            label: 'In-transit / Port clearance',
            value: String(customsShipments.length),
          },
          {
            id: 'docs-ok',
            label: 'Approved compliance docs',
            value: String(docs.filter((d) => d.status === 'approved').length),
          },
        ]
      : section === 'brand-growth'
        ? [
            {
              id: 'avg-score',
              label: 'Mean listing score',
              value:
                growthSkus.length > 0
                  ? `${Math.round(growthSkus.reduce((s, x) => s + x.score, 0) / growthSkus.length)} / 100`
                  : '—',
            },
            {
              id: 'skus',
              label: 'Analysed SKUs',
              value: String(growthSkus.length),
            },
            {
              id: 'ad-budget',
              label: 'Monthly ad budgets',
              value: formatGbp(totalAdBudget),
            },
            {
              id: 'issues',
              label: 'Listing findings',
              value: String(growthSkus.reduce((s, x) => s + x.issuesCount, 0)),
            },
          ]
        : [
            { id: 'brands', label: 'Portfolio brands', value: String(brandRows.length) },
            { id: 'skus', label: 'Active SKUs', value: String(products.length) },
            { id: 'po-val', label: 'PO pipeline value', value: formatGbp(totalPoVal) },
            { id: 'comm', label: 'Commission ledger', value: formatGbp(totalCommVal, 2) },
          ];

  const integrationStatuses = Object.entries(integrations).map(([id, cfg]) => ({
    id,
    label: id.replace(/_/g, ' ').toUpperCase(),
    mode: modes[id as keyof typeof modes] ?? 'simulation',
    status: cfg?.status ?? 'disconnected',
  }));

  const errObj = brandsQ.error || productsQ.error || posQ.error || shipsQ.error || docsQ.error;
  const error =
    errObj instanceof Error ? errObj.message : errObj ? 'Failed to load BWS workspace data.' : null;

  return (
    <BwsPortfolioOpsView
      section={section}
      loading={
        brandsQ.isPending ||
        productsQ.isPending ||
        posQ.isPending ||
        shipsQ.isPending ||
        docsQ.isPending
      }
      error={error}
      onRetry={() => {
        void brandsQ.refetch();
        void productsQ.refetch();
        void posQ.refetch();
        void shipsQ.refetch();
        void docsQ.refetch();
      }}
      metrics={metrics}
      brands={brandRows}
      selectedBrandId={activeBrandId}
      onSelectBrandId={setSelectedBrandId}
      drawerBrand={brandRows.find((b) => b.id === drawerBrandId) ?? null}
      onSelectDrawerBrand={setDrawerBrandId}
      partnerPos={partnerPos}
      partnerShipments={partnerShipments}
      exciseRows={exciseRows}
      customsShipments={customsShipments}
      growthSkus={growthSkus}
      poTrendSeries={poTrendSeries}
      carrierSeries={carrierSeries}
      reportRows={reportRows}
      integrationStatuses={integrationStatuses}
      actingStaffName={actingStaff?.name ?? 'Founder / Super Admin'}
      canMutate={canCurrentUserMutate}
      onExportCsv={(kind) => {
        if (kind === 'pos') {
          downloadCsv(
            'bws-purchase-orders.csv',
            ['PO', 'Brand', 'Status', 'Date', 'ValueGBP'],
            reportRows.map((r) => [
              r.poNumber,
              r.brandName,
              r.statusLabel,
              r.orderDate,
              String(r.poValueGbp),
            ])
          );
        } else {
          downloadCsv(
            'bws-commissions.csv',
            ['PO', 'Brand', 'POValueGBP', 'CommissionGBP', 'Status'],
            commissions.map((c) => [
              c.purchaseOrderId,
              brandNameMap.get(c.brandId) ?? c.brandId,
              String(c.poValue),
              String(c.commissionAmount),
              c.status,
            ])
          );
        }
      }}
      onNavigateView={(viewId) => onNavigateView?.(viewId)}
    />
  );
}
