import {
  ConsoleBarChart,
  ConsoleTrendChart,
  NoticeBanner,
  SectionCard,
  formatGbp,
} from '@/next/components/ConsoleCharts';
import {
  ConsoleTable,
  EmptyStateBlock,
  ErrorStateBlock,
  InlineStatus,
  LoadingRows,
  MetricStrip,
  ConsoleHeader,
  SlideOverDrawer,
  type ConsoleColumn,
  type MetricItem,
  type SemanticTone,
} from '@/next/components/ConsolePrimitives';

export type BwsPortfolioOpsSection =
  | 'brand-portfolio'
  | 'partner-portal'
  | 'import-excise'
  | 'brand-growth'
  | 'reports-analytics'
  | 'settings';

export interface BwsBrandPortfolioRow {
  id: string;
  businessName: string;
  category: string;
  nation: string;
  trackLabel: string;
  contractStatus: string;
  skuCount: number;
  poCount: number;
  poValueGbp: number;
  approvedDocsCount: number;
  totalDocsCount: number;
}

export interface BwsExciseCustomsRow {
  productId: string;
  brandName: string;
  sku: string;
  productName: string;
  commodityCode: string;
  vatStatus: string;
  hazmat: boolean;
  exWorksGbp: number;
}

export interface BwsShipmentCustomsRow {
  id: string;
  reference: string;
  carrier: string;
  origin: string;
  destination: string;
  statusLabel: string;
  statusTone: SemanticTone;
}

export interface BwsGrowthSkuRow {
  sku: string;
  productName: string;
  brandName: string;
  score: number;
  issuesCount: number;
  recommendationCount: number;
}

export interface BwsReportLineRow {
  poNumber: string;
  brandName: string;
  statusLabel: string;
  poValueGbp: number;
  commissionGbp: number;
  orderDate: string;
}

export interface BwsPortfolioOpsViewProps {
  section: BwsPortfolioOpsSection;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  metrics: MetricItem[];
  brands: BwsBrandPortfolioRow[];
  selectedBrandId: string;
  onSelectBrandId: (id: string) => void;
  drawerBrand: BwsBrandPortfolioRow | null;
  onSelectDrawerBrand: (id: string | null) => void;
  partnerPos: {
    id: string;
    poNumber: string;
    statusLabel: string;
    statusTone: SemanticTone;
    poValueGbp: number;
    orderDate: string;
  }[];
  partnerShipments: BwsShipmentCustomsRow[];
  exciseRows: BwsExciseCustomsRow[];
  customsShipments: BwsShipmentCustomsRow[];
  growthSkus: BwsGrowthSkuRow[];
  poTrendSeries: { label: string; value: number }[];
  carrierSeries: { label: string; value: number }[];
  reportRows: BwsReportLineRow[];
  integrationStatuses: { id: string; label: string; mode: string; status: string }[];
  actingStaffName: string;
  canMutate: boolean;
  onExportCsv: (kind: 'pos' | 'commissions') => void;
  onNavigateView: (viewId: string) => void;
}

const SECTION_COPY: Record<
  BwsPortfolioOpsSection,
  { title: string; description: string; bannerTitle: string; bannerMessage: string }
> = {
  'brand-portfolio': {
    title: 'Brand Portfolio',
    description:
      'Active commercial partner brands across Mercenta fulfilment, compliance, and retail purchase orders.',
    bannerTitle: 'Vertical isolation pending backend schema',
    bannerMessage:
      'Displaying all canonical Mercenta brands because DemoBrandRow / BrandProfile does not yet define a vertical discriminator.',
  },
  'partner-portal': {
    title: 'Partner Portal Stewardship',
    description:
      'Operator read-through of a selected brand’s live purchase orders, active consignments, and document posture.',
    bannerTitle: 'Partner wholesale pathway disclosure',
    bannerMessage:
      'Partner POs, SKUs, and DHL/Palletline shipments are live from canonical Mercenta stores. Third-party wet-bond warehouse routing and WePrep duty-paid prep switches are omitted because those schemas are not modelled.',
  },
  'import-excise': {
    title: 'Import & UK Customs Clearance',
    description:
      'UK commodity codes, VAT status, hazmat declarations, and inbound HMRC port consignments from canonical records.',
    bannerTitle: 'Alcohol excise & AWRS fields omitted (not modelled)',
    bannerMessage:
      'Canonical Product records supply commodityCode, vatStatus, and hazmat; Shipment records supply uk_port_hmrc customs status. Alcohol-specific fields from Dash-1 (ABV%, AWRS registration number, UK excise duty band, and alcohol duty calculator) are intentionally omitted.',
  },
  'brand-growth': {
    title: 'Brand Growth & Listing Quality',
    description:
      'SKU listing readiness analysis paired with canonical ad spend budgets and campaign attribution.',
    bannerTitle: 'Direct-supply sell-through feed disclosure',
    bannerMessage:
      'Listing scores and ad budgets are computed from canonical Product and AdCampaign records. Daily channel buy-box %, ASIN glance views, and A+ Content status are omitted until a live channel reporting feed exists.',
  },
  'reports-analytics': {
    title: 'Reports & Analytics',
    description:
      'Portfolio PO value trajectory, carrier distribution, commission ledger, and CSV downloads.',
    bannerTitle: 'Canonical operational analytics',
    bannerMessage:
      'Charts and CSV exports derive strictly from canonical PurchaseOrder, Shipment, and Commission records without synthetic BWS retail-tier projections.',
  },
  settings: {
    title: 'BWS Workspace Settings',
    description:
      'Integration mode status, acting operator tier, and access notes for BWS workspace configuration.',
    bannerTitle: 'Platform administration access',
    bannerMessage:
      'Full Staff RBAC, Accounting/Xero, Commercial Models, and Companies House settings require a Super Admin session.',
  },
};

export function BwsPortfolioOpsView({
  section,
  loading,
  error,
  onRetry,
  metrics,
  brands,
  selectedBrandId,
  onSelectBrandId,
  drawerBrand,
  onSelectDrawerBrand,
  partnerPos,
  partnerShipments,
  exciseRows,
  customsShipments,
  growthSkus,
  poTrendSeries,
  carrierSeries,
  reportRows,
  integrationStatuses,
  actingStaffName,
  canMutate,
  onExportCsv,
  onNavigateView,
}: BwsPortfolioOpsViewProps) {
  const copy = SECTION_COPY[section];

  const brandColumns: ConsoleColumn<BwsBrandPortfolioRow>[] = [
    {
      key: 'name',
      header: 'Brand',
      render: (r) => (
        <div>
          <div className="font-medium text-ink-950">{r.businessName}</div>
          <div className="text-ds-label text-faint">
            {r.category} · {r.nation || 'Origin N/A'}
          </div>
        </div>
      ),
    },
    {
      key: 'track',
      header: 'Fulfilment Track',
      render: (r) => <span className="text-ds-label text-secondary">{r.trackLabel}</span>,
    },
    {
      key: 'contract',
      header: 'Contract',
      render: (r) => (
        <InlineStatus
          label={r.contractStatus}
          tone={r.contractStatus === 'active' ? 'success' : 'warning'}
        />
      ),
    },
    {
      key: 'docs',
      header: 'Compliance Docs',
      align: 'right',
      render: (r) => (
        <span className="font-mono tabular-nums text-ds-label">
          {r.approvedDocsCount} / {r.totalDocsCount}
        </span>
      ),
    },
    {
      key: 'poVal',
      header: 'PO Value',
      align: 'right',
      render: (r) => <span className="font-mono tabular-nums">{formatGbp(r.poValueGbp)}</span>,
    },
  ];

  const exciseColumns: ConsoleColumn<BwsExciseCustomsRow>[] = [
    {
      key: 'sku',
      header: 'SKU & Product',
      render: (r) => (
        <div>
          <div className="font-medium text-ink-950">{r.productName}</div>
          <div className="text-ds-label text-faint font-mono">
            {r.sku} · {r.brandName}
          </div>
        </div>
      ),
    },
    {
      key: 'hs',
      header: 'UK Commodity Code',
      render: (r) => (
        <span className="font-mono text-ds-label text-ink-900">
          {r.commodityCode || 'Unassigned'}
        </span>
      ),
    },
    {
      key: 'vat',
      header: 'VAT Status',
      render: (r) => <span className="text-ds-label text-secondary">{r.vatStatus || 'Standard'}</span>,
    },
    {
      key: 'hazmat',
      header: 'Hazmat',
      render: (r) => (
        <InlineStatus
          label={r.hazmat ? 'Hazmat flagged' : 'Non-hazmat'}
          tone={r.hazmat ? 'warning' : 'neutral'}
        />
      ),
    },
    {
      key: 'exw',
      header: 'Ex-Works',
      align: 'right',
      render: (r) => <span className="font-mono tabular-nums">{formatGbp(r.exWorksGbp, 2)}</span>,
    },
  ];

  const growthColumns: ConsoleColumn<BwsGrowthSkuRow>[] = [
    {
      key: 'product',
      header: 'Product',
      render: (r) => (
        <div>
          <div className="font-medium text-ink-950">{r.productName}</div>
          <div className="text-ds-label text-faint font-mono">
            {r.sku} · {r.brandName}
          </div>
        </div>
      ),
    },
    {
      key: 'score',
      header: 'Listing Score',
      align: 'right',
      render: (r) => (
        <InlineStatus
          label={`${r.score} / 100`}
          tone={r.score >= 80 ? 'success' : r.score >= 60 ? 'warning' : 'danger'}
        />
      ),
    },
    {
      key: 'issues',
      header: 'Open Findings',
      align: 'right',
      render: (r) => <span className="font-mono tabular-nums">{r.issuesCount}</span>,
    },
    {
      key: 'recs',
      header: 'Recommendations',
      align: 'right',
      render: (r) => <span className="font-mono tabular-nums">{r.recommendationCount}</span>,
    },
  ];

  const reportColumns: ConsoleColumn<BwsReportLineRow>[] = [
    {
      key: 'po',
      header: 'PO Number',
      render: (r) => <span className="font-mono font-medium text-ink-950">{r.poNumber}</span>,
    },
    {
      key: 'brand',
      header: 'Brand',
      render: (r) => <span>{r.brandName}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <span className="text-ds-label text-secondary">{r.statusLabel}</span>,
    },
    {
      key: 'date',
      header: 'Order Date',
      render: (r) => <span className="font-mono text-ds-label text-faint">{r.orderDate}</span>,
    },
    {
      key: 'value',
      header: 'PO Value',
      align: 'right',
      render: (r) => <span className="font-mono tabular-nums">{formatGbp(r.poValueGbp)}</span>,
    },
    {
      key: 'comm',
      header: 'Commission',
      align: 'right',
      render: (r) => <span className="font-mono tabular-nums">{formatGbp(r.commissionGbp, 2)}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <ConsoleHeader
        title={copy.title}
        description={copy.description}
        actions={
          section === 'reports-analytics' ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onExportCsv('pos')}
                className="px-3.5 py-2 rounded-ds-md border border-hairline-strong bg-surface-raised text-ds-label font-medium text-ink-900 hover:bg-surface"
              >
                Export POs CSV
              </button>
              <button
                type="button"
                onClick={() => onExportCsv('commissions')}
                className="px-3.5 py-2 rounded-ds-md bg-ink-950 text-on-dark text-ds-label font-medium hover:bg-ink-800"
              >
                Export Commissions CSV
              </button>
            </div>
          ) : section === 'brand-growth' ? (
            <button
              type="button"
              onClick={() => onNavigateView('campaign-studio')}
              className="px-3.5 py-2 rounded-ds-md bg-accent text-on-dark text-ds-label font-medium hover:brightness-95"
            >
              Open Campaign Studio
            </button>
          ) : undefined
        }
      />

      <NoticeBanner tone="warning" title={copy.bannerTitle} message={copy.bannerMessage} />

      {loading ? (
        <LoadingRows rows={6} />
      ) : error ? (
        <ErrorStateBlock message={error} onRetry={onRetry} />
      ) : (
        <>
          <MetricStrip items={metrics} columns={4} />

          {section === 'brand-portfolio' && (
            <ConsoleTable
              rows={brands}
              columns={brandColumns}
              rowKey={(r) => r.id}
              selectedKey={drawerBrand?.id}
              onRowClick={(r) => onSelectDrawerBrand(r.id)}
              emptyTitle="No partner brands match current scope"
              emptyDescription="Clear portfolio filters in the top scope bar to inspect brands."
            />
          )}

          {section === 'partner-portal' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <label className="text-ds-label font-medium text-secondary flex items-center gap-2">
                  Inspect Partner Brand:
                  <select
                    aria-label="Select partner brand"
                    value={selectedBrandId}
                    onChange={(e) => onSelectBrandId(e.target.value)}
                    className="px-3 py-1.5 rounded-ds-md border border-hairline-strong bg-surface-raised text-ds-body text-ink-950"
                  >
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.businessName}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SectionCard title="Partner Purchase Orders" description="Canonical POs for selected brand.">
                  {partnerPos.length === 0 ? (
                    <EmptyStateBlock
                      title="No purchase orders"
                      description="This brand does not have recorded POs yet."
                    />
                  ) : (
                    <ul className="divide-y divide-hairline-06">
                      {partnerPos.map((po) => (
                        <li key={po.id} className="py-2.5 flex items-center justify-between gap-3 text-ds-label">
                          <div>
                            <div className="font-mono font-medium text-ink-950">{po.poNumber}</div>
                            <div className="text-ds-label text-faint">{po.orderDate}</div>
                          </div>
                          <div className="text-right space-y-0.5">
                            <div className="font-mono tabular-nums font-medium">
                              {formatGbp(po.poValueGbp)}
                            </div>
                            <InlineStatus label={po.statusLabel} tone={po.statusTone} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </SectionCard>

                <SectionCard title="Partner Consignments" description="Canonical DHL & Palletline shipments.">
                  {partnerShipments.length === 0 ? (
                    <EmptyStateBlock
                      title="No active consignments"
                      description="Accepted POs await ASN dispatch in Wholesale Distribution / Inventory & Fulfilment."
                    />
                  ) : (
                    <ul className="divide-y divide-hairline-06">
                      {partnerShipments.map((s) => (
                        <li key={s.id} className="py-2.5 flex items-center justify-between gap-3 text-ds-label">
                          <div>
                            <div className="font-mono font-medium text-ink-950">
                              {s.reference} · {s.carrier.toUpperCase()}
                            </div>
                            <div className="text-ds-label text-faint">
                              {s.origin} → {s.destination}
                            </div>
                          </div>
                          <InlineStatus label={s.statusLabel} tone={s.statusTone} />
                        </li>
                      ))}
                    </ul>
                  )}
                </SectionCard>
              </div>
            </div>
          )}

          {section === 'import-excise' && (
            <div className="space-y-6">
              <SectionCard
                title="UK Customs & Commodity Declarations"
                description="Commodity codes, VAT classifications, and hazmat indicators read from canonical Product records."
              >
                <ConsoleTable
                  rows={exciseRows}
                  columns={exciseColumns}
                  rowKey={(r) => r.productId}
                />
              </SectionCard>

              <SectionCard
                title="Inbound Customs & Port Shipments"
                description="Shipments clearing UK ports or awaiting customs clearance."
              >
                {customsShipments.length === 0 ? (
                  <EmptyStateBlock
                    title="No shipments currently in customs or port stages"
                    description="Check Inventory & Fulfilment for all active domestic and international movements."
                  />
                ) : (
                  <ul className="divide-y divide-hairline-06">
                    {customsShipments.map((s) => (
                      <li key={s.id} className="py-2.5 flex items-center justify-between gap-3 text-ds-label">
                        <div>
                          <div className="font-mono font-medium text-ink-950">
                            {s.reference} ({s.carrier.toUpperCase()})
                          </div>
                          <div className="text-ds-label text-faint">
                            {s.origin} → {s.destination}
                          </div>
                        </div>
                        <InlineStatus label={s.statusLabel} tone={s.statusTone} />
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>
            </div>
          )}

          {section === 'brand-growth' && (
            <SectionCard
              title="Catalogue Listing Quality Index"
              description="Live diagnostic scores computed by src/lib/intelligence/listingAnalyzer.ts."
            >
              <ConsoleTable
                rows={growthSkus}
                columns={growthColumns}
                rowKey={(r) => r.sku}
              />
            </SectionCard>
          )}

          {section === 'reports-analytics' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SectionCard
                  title="Monthly PO Value Trend"
                  description="Purchase order value grouped by month."
                >
                  <ConsoleTrendChart data={poTrendSeries} />
                </SectionCard>
                <SectionCard
                  title="Consignments by Approved Carrier"
                  description="Canonical DHL vs Palletline volume."
                >
                  <ConsoleBarChart
                    data={carrierSeries}
                    formatValue={(v) => `${v} shipments`}
                  />
                </SectionCard>
              </div>
              <SectionCard title="Purchase Order & Commission Register">
                <ConsoleTable
                  rows={reportRows}
                  columns={reportColumns}
                  rowKey={(r) => r.poNumber}
                />
              </SectionCard>
            </div>
          )}

          {section === 'settings' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SectionCard title="Operator Session">
                <dl className="space-y-2 text-ds-label">
                  <div className="flex justify-between border-b border-hairline pb-2">
                    <dt className="text-faint">Acting staff</dt>
                    <dd className="font-medium text-ink-950">{actingStaffName}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-faint">Write permission</dt>
                    <dd>
                      <InlineStatus
                        label={canMutate ? 'Full mutation rights' : 'Read-only operator'}
                        tone={canMutate ? 'success' : 'warning'}
                      />
                    </dd>
                  </div>
                </dl>
              </SectionCard>

              <SectionCard title="Connected Provider Modes">
                <ul className="divide-y divide-hairline-06 text-ds-label">
                  {integrationStatuses.map((it) => (
                    <li key={it.id} className="py-2 flex items-center justify-between gap-2">
                      <span className="font-medium text-ink-900">{it.label}</span>
                      <span className="font-mono text-ds-label text-faint">
                        {it.status} ({it.mode})
                      </span>
                    </li>
                  ))}
                </ul>
              </SectionCard>
            </div>
          )}
        </>
      )}

      <SlideOverDrawer
        open={Boolean(drawerBrand)}
        onClose={() => onSelectDrawerBrand(null)}
        title={drawerBrand?.businessName ?? 'Brand'}
        subtitle={drawerBrand ? `${drawerBrand.category} · ${drawerBrand.trackLabel}` : undefined}
      >
        {drawerBrand && (
          <div className="space-y-4 text-ds-body">
            <dl className="space-y-2 text-ds-label">
              <div className="flex justify-between border-b border-hairline pb-2">
                <dt className="text-faint">Origin Nation</dt>
                <dd className="font-medium">{drawerBrand.nation || 'Unspecified'}</dd>
              </div>
              <div className="flex justify-between border-b border-hairline pb-2">
                <dt className="text-faint">Contract Status</dt>
                <dd className="font-medium">{drawerBrand.contractStatus}</dd>
              </div>
              <div className="flex justify-between border-b border-hairline pb-2">
                <dt className="text-faint">Listed SKUs</dt>
                <dd className="font-mono tabular-nums">{drawerBrand.skuCount}</dd>
              </div>
              <div className="flex justify-between border-b border-hairline pb-2">
                <dt className="text-faint">Purchase Orders</dt>
                <dd className="font-mono tabular-nums">
                  {drawerBrand.poCount} ({formatGbp(drawerBrand.poValueGbp)})
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-faint">Compliance Documents</dt>
                <dd className="font-mono tabular-nums">
                  {drawerBrand.approvedDocsCount} / {drawerBrand.totalDocsCount} approved
                </dd>
              </div>
            </dl>
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  onSelectBrandId(drawerBrand.id);
                  onSelectDrawerBrand(null);
                  onNavigateView('partner-portal');
                }}
                className="px-3.5 py-2 rounded-ds-md bg-ink-950 text-on-dark text-ds-label font-medium"
              >
                Open in Partner Portal
              </button>
              <button
                type="button"
                onClick={() => {
                  onSelectDrawerBrand(null);
                  onNavigateView('product-catalogue');
                }}
                className="px-3.5 py-2 rounded-ds-md border border-hairline-strong bg-surface-raised text-ds-label font-medium text-ink-900"
              >
                View Catalogue
              </button>
            </div>
          </div>
        )}
      </SlideOverDrawer>
    </div>
  );
}
