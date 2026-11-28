/**
 * §BWS PORTFOLIO OPS — WIRED TO THE OWNER'S DASH-1 RECORDS (2026-11-28).
 *
 * BEFORE THIS CHANGE the screen read CORE hooks (`useBrands`, `useProducts`,
 * `usePurchaseOrders`, `useShipmentsAll`, `useComplianceDocuments`, `useCommissions`,
 * `useAdSpendBudgets`) — i.e. it showed Mercenta's CORE brands under a BWS heading, which
 * is exactly the cross-vertical leak the owner forbade. Those hooks are GONE from this
 * screen. It now asks `useBwsDemo()` for its own vertical, and `buildBwsPortfolio` maps the
 * Dash-1 records onto the view's props field-for-field (mapping table:
 * `docs/BWS_PORTFOLIO_OPS_FIELD_MAPPING.md`).
 *
 * The owner's decisions, honoured here and in the adapter:
 *   D1 all 88 source brands are listed · D2 the price is labelled ILLUSTRATIVE WHOLESALE ·
 *   D3 the growth score is the source's range coverage · D4 absent fields render “—” with
 *   a tooltip naming the source, never a fabricated default.
 *
 * Nothing in this file reaches another vertical's module or CORE's demo store.
 */
import { useMemo, useState } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { useBwsDemo } from '@/data/queries';
import { buildBwsPortfolio } from '@/data/bws/bwsPortfolioAdapter';
import { useIntegrations } from '@/integrations/IntegrationsContext';
import { downloadCsv } from '@/lib/csv';
import { formatGbp } from '@/next/components/ConsoleCharts';
import type { MetricItem } from '@/next/components/ConsolePrimitives';
import { SuperAdminScreen } from '@/next/screens/admin/SuperAdminScreen';
import { BwsPortfolioOpsView, type BwsPortfolioOpsSection } from './BwsPortfolioOpsView';

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
  const [retryToken, setRetryToken] = useState(0);
  const bws = useBwsDemo(retryToken);

  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  const [drawerBrandId, setDrawerBrandId] = useState<string | null>(null);

  /** The mapping runs once per loaded bundle — never per render. */
  const derived = useMemo(
    () => (bws.data?.vertical === 'bws' && bws.data.data ? buildBwsPortfolio(bws.data.data) : null),
    [bws.data]
  );

  const brandRows = useMemo(() => {
    const rows = derived?.brandRows ?? [];
    return allowedBrandIds ? rows.filter((r) => allowedBrandIds.has(r.id)) : rows;
  }, [derived, allowedBrandIds]);

  const activeBrandId =
    brandRows.find((b) => b.id === selectedBrandId)?.id ?? brandRows[0]?.id ?? '';

  const partnerPos = derived?.partnerPosByBrand[activeBrandId] ?? [];

  const metrics: MetricItem[] = !derived
    ? []
    : section === 'import-excise'
      ? [
          {
            id: 'hs',
            label: 'SKUs with HS code',
            value: '0 / ' + derived.exciseRows.length,
          },
          { id: 'hazmat', label: 'Hazmat SKUs', value: '0 / ' + derived.exciseRows.length },
          {
            id: 'customs-ship',
            label: 'Import / bond consignments',
            value: String(derived.customsShipments.length),
          },
          {
            id: 'docs-ok',
            label: 'Compliance records complete',
            value: String(derived.totals.completeDocs),
          },
        ]
      : section === 'brand-growth'
        ? [
            {
              id: 'avg-score',
              label: 'Mean listing coverage',
              value: (() => {
                const scored = derived.growthSkus.filter((g) => g.score !== null);
                if (!scored.length) return '—';
                const mean = scored.reduce((s, g) => s + (g.score ?? 0), 0) / scored.length;
                return `${Math.round(mean)}%`;
              })(),
            },
            {
              id: 'skus',
              label: 'SKUs with a listing record',
              value: `${derived.growthSkus.filter((g) => g.score !== null).length} / ${derived.growthSkus.length}`,
            },
            {
              id: 'brands-listed',
              label: 'Brands with an Amazon UK listing',
              value: String(new Set(derived.growthSkus.filter((g) => g.score !== null).map((g) => g.brandName)).size),
            },
            { id: 'issues', label: 'Open findings', value: '—' },
          ]
        : [
            { id: 'brands', label: 'Portfolio brands', value: String(derived.totals.brands) },
            { id: 'skus', label: 'Active SKUs', value: String(derived.totals.skus) },
            { id: 'pos', label: 'Vendor POs', value: String(derived.totals.pos) },
            { id: 'po-val', label: 'PO value', value: formatGbp(derived.totals.poValueGbp) },
          ];

  const integrationStatuses = Object.entries(integrations).map(([id, cfg]) => ({
    id,
    label: id.replace(/_/g, ' ').toUpperCase(),
    mode: modes[id as keyof typeof modes] ?? 'simulation',
    status: cfg?.status ?? 'disconnected',
  }));

  const error = bws.error ? 'Failed to load the BWS workspace data.' : null;

  if (section === 'settings' && session?.tier === 'super_admin') {
    return <SuperAdminScreen onNavigateView={onNavigateView} />;
  }return (
    <BwsPortfolioOpsView
      section={section}
      loading={bws.loading}
      error={error}
      onRetry={() => setRetryToken((t) => t + 1)}
      metrics={metrics}
      brands={brandRows}
      selectedBrandId={activeBrandId}
      onSelectBrandId={setSelectedBrandId}
      drawerBrand={brandRows.find((b) => b.id === drawerBrandId) ?? null}
      onSelectDrawerBrand={setDrawerBrandId}
      partnerPos={partnerPos}
      partnerShipments={derived?.partnerShipments ?? []}
      exciseRows={derived?.exciseRows ?? []}
      customsShipments={derived?.customsShipments ?? []}
      partnerAccounts={derived?.partnerAccounts ?? []}
      growthSkus={derived?.growthSkus ?? []}
      poTrendSeries={derived?.poTrendSeries ?? []}
      carrierSeries={derived?.carrierSeries ?? []}
      reportRows={derived?.reportRows ?? []}
      integrationStatuses={integrationStatuses}
      actingStaffName={actingStaff?.name ?? 'Mercenta Operator'}
      canMutate={canCurrentUserMutate}
      onExportCsv={(kind) => {
        const rows = derived?.reportRows ?? [];
        if (kind === 'pos') {
          downloadCsv(
            'bws-purchase-orders.csv',
            ['PO', 'Brand', 'Status', 'Date', 'ValueGBP'],
            rows.map((r) => [r.poNumber, r.brandName, r.statusLabel, r.orderDate, String(r.poValueGbp)])
          );
        } else {
          /* BWS is not a commission model: the source carries no commission figure, so the
             export states that rather than printing a fabricated zero. */
          downloadCsv(
            'bws-commissions.csv',
            ['PO', 'Brand', 'POValueGBP', 'CommissionGBP', 'Status'],
            rows.map((r) => [r.poNumber, r.brandName, String(r.poValueGbp), '— not provided by the source', r.statusLabel])
          );
        }
      }}
      onNavigateView={(viewId) => onNavigateView?.(viewId)}
    />
  );
}
