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
  PageHeader,
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
  /** D4 (2026-11-28): the Dash-1 source carries NO commodity code, VAT status or hazmat
   *  flag for any of its 89 products (measured 0/89). They are `null` — rendered as “—”
   *  with a tooltip naming the source — NEVER defaulted to a plausible-looking value
   *  ('Unassigned' / 'Standard' were invented by this view before this change). */
  commodityCode: string | null;
  vatStatus: string | null;
  hazmat: boolean | null;
  /** D2: the source's `illustrativeWholesaleGbp`. Labelled “Illustrative Wholesale”,
   *  never presented as an ex-Works cost, which the source does not contain. */
  illustrativeWholesaleGbp: number | null;
}

/** AWRS / EORI / duty pathway — wired from Dash-1's partner accounts (owner, 2026-11-28). */
export interface BwsPartnerAccountRow {
  brandName: string;
  eori: string;
  awrsUrn: string;
  defaultPathway: string;
  wetBondPartner: string;
  dhlAccount: string;
  accountManager: string;
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
  /** D3: `AMAZON_UK_LISTINGS.rangeCoveragePct`; `null` when the source has no listing. */
  score: number | null;
  issuesCount: number | null;
  recommendationCount: number | null;
}

export interface BwsReportLineRow {
  poNumber: string;
  brandName: string;
  statusLabel: string;
  poValueGbp: number;
  /** BWS is not a commission model; the source has no commission figure. */
  commissionGbp: number | null;
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
  partnerAccounts: BwsPartnerAccountRow[];
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
      'BWS brands imported from the Dash-1 workspace, with their portfolio status, SKU count, vendor POs and compliance records.',
    bannerTitle: 'BWS records: the Dash-1 workspace',
    bannerMessage:
      'All 88 brand records imported from BitFlexFinTech/Dash-1 are listed. Four carry an active portfolio record (wholesale + Vendor Central status); the remaining source brands have no portfolio entry and say so — none is hidden or given a fabricated status.',
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
    bannerTitle: 'AWRS / EORI and duty-bond status, live from Dash-1',
    bannerMessage:
      'Partner accounts supply the Mercenta EORI and AWRS URN, the default duty pathway and the wet-bond partner; import records supply customs and excise-duty status per shipment. Commodity code, VAT status and hazmat are NOT provided by Dash-1 and render as “—” rather than being inferred.',
  },
  'brand-growth': {
    title: 'Brand Growth & Listing Quality',
    description:
      'SKU listing readiness analysis paired with canonical ad spend budgets and campaign attribution.',
    bannerTitle: '1P Vendor Central sell-through feed disclosure',
    bannerMessage:
      'Listing scores and ad budgets are computed from canonical Product and AdCampaign records. Daily Vendor Central 1P buy-box %, ASIN glance views, and A+ Content status are omitted until a live 1P reporting feed exists.',
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
  partnerAccounts,
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
          <div className="text-[12px] text-faint">
            {r.category} · {r.nation || 'Origin N/A'}
          </div>
        </div>
      ),
    },
    {
      key: 'track',
      header: 'Fulfilment Track',
      render: (r) => <span className="text-[12px] text-secondary">{r.trackLabel}</span>,
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
        <span className="font-mono tabular-nums text-[12px]">
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
          <div className="text-[12px] text-faint font-mono">
            {r.sku} · {r.brandName}
          </div>
        </div>
      ),
    },
    {
      key: 'hs',
      header: 'UK Commodity Code',
      render: (r) => (
        <span
          className="font-mono text-[12px] text-faint"
          title="Not provided by the Dash-1 source — no product record carries a commodity code."
        >
          {r.commodityCode ?? '—'}
        </span>
      ),
    },
    {
      key: 'vat',
      header: 'VAT Status',
      render: (r) => (
        <span
          className="text-[12px] text-faint"
          title="Not provided by the Dash-1 source — no product record carries a VAT status."
        >
          {r.vatStatus ?? '—'}
        </span>
      ),
    },
    {
      key: 'hazmat',
      header: 'Hazmat',
      render: (r) =>
        r.hazmat === null ? (
          <span
            className="text-[12px] text-faint"
            title="Not provided by the Dash-1 source — no product record carries a hazmat flag."
          >
            —
          </span>
        ) : (
          <InlineStatus
            label={r.hazmat ? 'Hazmat flagged' : 'Non-hazmat'}
            tone={r.hazmat ? 'warning' : 'neutral'}
          />
        ),
    },
    {
      key: 'wholesale',
      header: 'Illustrative Wholesale',
      align: 'right',
      render: (r) => (
        <span className="font-mono tabular-nums" title="The source's illustrative wholesale price — never an ex-Works cost.">
          {r.illustrativeWholesaleGbp === null ? '—' : formatGbp(r.illustrativeWholesaleGbp, 2)}
        </span>
      ),
    },
  ];

  const growthColumns: ConsoleColumn<BwsGrowthSkuRow>[] = [
    {
      key: 'product',
      header: 'Product',
      render: (r) => (
        <div>
          <div className="font-medium text-ink-950">{r.productName}</div>
          <div className="text-[12px] text-faint font-mono">
            {r.sku} · {r.brandName}
          </div>
        </div>
      ),
    },
    {
      key: 'score',
      header: 'Listing Score',
      align: 'right',
      render: (r) =>
        r.score === null ? (
          <span
            className="text-[12px] text-faint"
            title="Not provided by the Dash-1 source — this brand has no Amazon UK listing record, so there is no range-coverage figure."
          >
            —
          </span>
        ) : (
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
      render: (r) => (
        <span
          className="font-mono tabular-nums text-faint"
          title="Not provided by the Dash-1 source."
        >
          {r.issuesCount === null ? '—' : r.issuesCount}
        </span>
      ),
    },
    {
      key: 'recs',
      header: 'Recommendations',
      align: 'right',
      render: (r) => (
        <span
          className="font-mono tabular-nums text-faint"
          title="Not provided by the Dash-1 source."
        >
          {r.recommendationCount === null ? '—' : r.recommendationCount}
        </span>
      ),
    },
  ];

  const accountColumns: ConsoleColumn<BwsPartnerAccountRow>[] = [
    {
      key: 'brand',
      header: 'Brand',
      render: (r) => <span className="font-medium text-ink-950">{r.brandName}</span>,
    },
    { key: 'eori', header: 'Mercenta EORI', render: (r) => <span className="font-mono text-[12px]">{r.eori}</span> },
    { key: 'awrs', header: 'AWRS URN', render: (r) => <span className="font-mono text-[12px]">{r.awrsUrn}</span> },
    { key: 'pathway', header: 'Default Pathway', render: (r) => <span className="text-[12px]">{r.defaultPathway}</span> },
    { key: 'bond', header: 'Wet-Bond Partner', render: (r) => <span className="text-[12px]">{r.wetBondPartner}</span> },
    { key: 'dhl', header: 'DHL Account', render: (r) => <span className="font-mono text-[12px]">{r.dhlAccount}</span> },
    { key: 'am', header: 'Account Manager', render: (r) => <span className="text-[12px]">{r.accountManager}</span> },
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
      render: (r) => <span className="text-[12px] text-secondary">{r.statusLabel}</span>,
    },
    {
      key: 'date',
      header: 'Order Date',
      render: (r) => <span className="font-mono text-[12px] text-ink-600">{r.orderDate}</span>,
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
      render: (r) => (
        <span
          className="font-mono tabular-nums text-faint"
          title="Not provided by the Dash-1 source — BWS is not a commission model."
        >
          {r.commissionGbp === null ? '—' : formatGbp(r.commissionGbp, 2)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={copy.title}
        description={copy.description}
        actions={
          section === 'reports-analytics' ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onExportCsv('pos')}
                className="px-3.5 py-2 rounded-md border border-hairline-strong bg-surface-raised text-[12px] font-medium text-ink-900 hover:bg-surface"
              >
                Export POs CSV
              </button>
              <button
                type="button"
                onClick={() => onExportCsv('commissions')}
                className="px-3.5 py-2 rounded-md bg-ink-950 text-on-dark text-[12px] font-medium hover:bg-ink-800"
              >
                Export Commissions CSV
              </button>
            </div>
          ) : section === 'brand-growth' ? (
            <button
              type="button"
              onClick={() => onNavigateView('campaign-studio')}
              className="px-3.5 py-2 rounded-md bg-[var(--mr-accent)] text-on-dark text-[12px] font-medium hover:bg-[var(--mr-accent-600)]"
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
                <label className="text-[12px] font-medium text-secondary flex items-center gap-2">
                  Inspect Partner Brand:
                  <select
                    aria-label="Select partner brand"
                    value={selectedBrandId}
                    onChange={(e) => onSelectBrandId(e.target.value)}
                    className="px-3 py-1.5 rounded-md border border-hairline-strong bg-surface-raised text-[14px] text-ink-950"
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
                        <li key={po.id} className="py-2.5 flex items-center justify-between gap-3 text-[13px]">
                          <div>
                            <div className="font-mono font-medium text-ink-950">{po.poNumber}</div>
                            <div className="text-[12px] text-faint">{po.orderDate}</div>
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
                        <li key={s.id} className="py-2.5 flex items-center justify-between gap-3 text-[13px]">
                          <div>
                            <div className="font-mono font-medium text-ink-950">
                              {s.reference} · {s.carrier.toUpperCase()}
                            </div>
                            <div className="text-[12px] text-faint">
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
                description="Read from the Dash-1 records. Commodity code, VAT status and hazmat are NOT present in that source, so they render as “—” with a tooltip — never inferred."
              >
                <ConsoleTable
                  rows={exciseRows}
                  columns={exciseColumns}
                  rowKey={(r) => r.productId}
                />
              </SectionCard>

              <SectionCard
                title="UK Duty, Bond & Account Credentials"
                description="Wired from the Dash-1 partner-account and import records — Mercenta's EORI and AWRS URN per brand, the default duty pathway, and the wet-bond partner."
              >
                <ConsoleTable
                  rows={partnerAccounts}
                  columns={accountColumns}
                  rowKey={(r) => r.brandName}
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
                      <li key={s.id} className="py-2.5 flex items-center justify-between gap-3 text-[13px]">
                        <div>
                          <div className="font-mono font-medium text-ink-950">
                            {s.reference} ({s.carrier.toUpperCase()})
                          </div>
                          <div className="text-[12px] text-faint">
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
                <dl className="space-y-2 text-[13px]">
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
                <ul className="divide-y divide-hairline-06 text-[13px]">
                  {integrationStatuses.map((it) => (
                    <li key={it.id} className="py-2 flex items-center justify-between gap-2">
                      <span className="font-medium text-ink-900">{it.label}</span>
                      <span className="font-mono text-[12px] text-ink-600">
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
          <div className="space-y-4 text-[14px]">
            <dl className="space-y-2 text-[13px]">
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
                className="px-3.5 py-2 rounded-md bg-ink-950 text-on-dark text-[12px] font-medium"
              >
                Open in Partner Portal
              </button>
              <button
                type="button"
                onClick={() => {
                  onSelectDrawerBrand(null);
                  onNavigateView('product-catalogue');
                }}
                className="px-3.5 py-2 rounded-md border border-hairline-strong bg-surface-raised text-[12px] font-medium text-ink-900"
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
