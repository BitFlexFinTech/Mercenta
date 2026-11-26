import { useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { buildDeliveryPerformance } from '@/lib/logistics/deliveryPerformance';
import { buildOperationalMap } from '@/lib/logistics/operationsMap';
import { deriveCarrierEligibility } from '@/lib/shipping/carrierEligibility';
import { resolveAdsSurfacePolicy, type AdsScope, type AdsVertical } from '@/next/adsConfig';
import { AdsManagerView, type AdsPortfolioRow } from '@/next/screens/ads/AdsManagerView';
import {
  BrandLogisticsView,
  type LogisticsRowItem,
} from '@/next/screens/brand/BrandLogisticsView';
import { BrandPurchaseOrdersView } from '@/next/screens/brand/BrandPurchaseOrdersView';
import type { AdCampaign, AdSpendBudget, AdSpendRecommendation, PurchaseOrder } from '@/types';
import '../next.css';

type PreviewScreen = 'purchase_orders' | 'logistics' | 'ads_brand' | 'ads_admin';
type PreviewStateMode = 'populated' | 'loading' | 'error' | 'empty';

const SAMPLE_POS: PurchaseOrder[] = [
  {
    id: 'po-preview-1',
    brandId: 'preview-brand',
    poNumber: 'PO-1000',
    status: 'received',
    poValue: 10000,
    commissionRate: 0.1,
    commissionAmount: 1000,
    orderDate: new Date().toISOString(),
    freightTerm: 'prepaid',
    deliveryWindowEnd: '2026-12-05',
    simulated: true,
    lineItems: [
      {
        sku: 'SKU-100',
        productName: 'Sample Core Product (500 ml)',
        quantity: 500,
        unitPrice: 20,
        commodityCode: '34029090',
      },
    ],
  },
  {
    id: 'po-preview-2',
    brandId: 'preview-brand',
    poNumber: 'PO-2000',
    status: 'accepted',
    poValue: 5000,
    commissionRate: 0.1,
    commissionAmount: 500,
    orderDate: '2026-11-20T09:00:00Z',
    acknowledgedAt: '2026-11-20T12:00:00Z',
    freightTerm: 'collect',
    shipWindowEnd: '2026-12-01',
    simulated: true,
    lineItems: [
      {
        sku: 'SKU-200',
        productName: 'Sample Household Refill',
        quantity: 250,
        unitPrice: 20,
        commodityCode: '34029090',
        ackStatus: 'accepted',
        acknowledgedQty: 250,
      },
    ],
  },
];

const SAMPLE_LOGISTICS_ROWS: LogisticsRowItem[] = [
  {
    id: 'shipment-po-preview-2',
    reference: 'SHP-1000',
    title: 'Sample Brand — PO-2000',
    poNumber: 'PO-2000',
    brandId: 'preview-brand',
    customer: 'Retail Network UK FC',
    value: 10000,
    status: 'sea_transit',
    carrier: 'dhl',
    stage: 'international_forwarding',
    cbm: 10,
    origin: 'Cape Town, South Africa',
    destination: 'Doncaster, UK',
    date: '2026-11-22',
    trackingNumber: 'TRK-1000-SIM',
    delayed: false,
    exception: false,
    waybill: 'WB-1000',
    freightTerm: 'prepaid',
    simulated: true,
    eta: {
      date: '2026-12-04',
      basis: 'channel_window',
      simulated: true,
      source: 'Preview fixture from PO delivery window',
    },
    appointment: {
      state: 'Scheduled',
      basis: 'derived',
      carrierRequestedDeliveryDate: '2026-12-04',
      window: {
        ok: true,
        code: 'within-window',
        reason: 'Requested date falls within the declared PO delivery window.',
      },
      simulated: true,
      source: 'Preview fixture',
    },
  },
];

const SAMPLE_BUDGET: AdSpendBudget = {
  brandId: 'preview-brand',
  monthlyBudgetGbp: 2500,
  spendToDateGbp: 1000,
  acos: 0.2,
  tacos: 0.1,
  status: 'active',
};

const SAMPLE_CAMPAIGNS: AdCampaign[] = [
  {
    id: 'cmp-preview-1',
    brandId: 'preview-brand',
    name: 'SP | Core Brand Defence',
    status: 'active',
    monthlyBudgetGbp: 1500,
    spendToDateGbp: 600,
    impressions: 50000,
    clicks: 1000,
    attributedSalesGbp: 3000,
    acos: 0.2,
    placement: 'Sponsored Products',
    sourceLabel: 'Preview simulation',
  },
  {
    id: 'cmp-preview-2',
    brandId: 'preview-brand',
    name: 'SB | Category Discovery',
    status: 'paused',
    monthlyBudgetGbp: 1000,
    spendToDateGbp: 400,
    impressions: 20000,
    clicks: 500,
    attributedSalesGbp: 1600,
    acos: 0.25,
    placement: 'Sponsored Brands',
    sourceLabel: 'Preview simulation',
  },
];

const SAMPLE_RECOMMENDATIONS: AdSpendRecommendation[] = [
  {
    id: 'rec-preview-1',
    brandId: 'preview-brand',
    month: '2026-12',
    recommendedMonthlyBudgetGbp: 3000,
    basis: 'Illustrative preview proposal based on 20.0% ACOS headroom.',
    status: 'proposed',
    createdAt: '2026-11-24T09:00:00Z',
  },
];

const SAMPLE_PORTFOLIO: AdsPortfolioRow[] = [
  {
    brandId: 'preview-brand',
    brandName: 'Sample Brand Ltd',
    budget: 2500,
    spend: 1000,
    remaining: 1500,
    utilPct: 0.4,
    acos: 0.2,
    tacos: 0.1,
    status: 'active',
  },
];

export function PreviewHarness({ onExit }: { onExit: () => void }) {
  const [screen, setScreen] = useState<PreviewScreen>('purchase_orders');
  const [stateMode, setStateMode] = useState<PreviewStateMode>('populated');
  const [vertical, setVertical] = useState<AdsVertical>('core');

  const isLoading = stateMode === 'loading';
  const isError = stateMode === 'error';
  const isEmpty = stateMode === 'empty';

  const logisticsRows = useMemo(() => (isEmpty ? [] : SAMPLE_LOGISTICS_ROWS), [isEmpty]);
  const logisticsModel = useMemo(
    () =>
      buildOperationalMap(
        logisticsRows.map((r) => ({ ...r, providerModes: { dhl: 'simulation' } }))
      ),
    [logisticsRows]
  );
  const logisticsPerf = useMemo(
    () =>
      buildDeliveryPerformance(
        logisticsModel.legs.map((l) => ({
          status: l.status,
          stage: l.stage,
          truth: l.truth,
          delayed: l.delayed,
          exception: l.exception,
        }))
      ),
    [logisticsModel.legs]
  );
  const eligibility = useMemo(
    () =>
      deriveCarrierEligibility({
        brandNation: null,
        originCountry: logisticsRows[0]?.origin ?? null,
        destinationCountry: logisticsRows[0]?.destination ?? null,
        freightTerm: 'prepaid',
        providerModes: { dhl: 'simulation', palletline: 'simulation' },
      }),
    [logisticsRows]
  );

  const adsScope: AdsScope = screen === 'ads_brand' ? 'brand' : 'admin';
  const adsPolicy = resolveAdsSurfacePolicy(
    screen === 'ads_brand' ? 'core' : vertical,
    adsScope
  );

  return (
    <div className="mercenta-next min-h-screen bg-surface text-ink-950">
      <header className="sticky top-0 z-30 border-b border-hairline bg-surface-raised px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onExit}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-ds-sm border border-hairline-strong bg-surface-raised text-ds-label font-medium text-ink-900 hover:bg-surface"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            Back to Workspace
          </button>
          <div>
            <div className="text-ds-body font-semibold text-strong">
              Pure Presentation Preview Harness
            </div>
            <div className="text-ds-label text-faint">
              Renders View components offline without data-layer or context dependencies
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-ds-label">
          <select
            aria-label="Select screen to preview"
            value={screen}
            onChange={(e) => setScreen(e.target.value as PreviewScreen)}
            className="px-2.5 py-1.5 rounded-ds-sm border border-hairline-strong bg-surface-raised text-strong"
          >
            <option value="purchase_orders">2a · Brand Purchase Orders View</option>
            <option value="logistics">2b · Brand Logistics View</option>
            <option value="ads_brand">2c · Ads Manager (Brand Scope)</option>
            <option value="ads_admin">2c · Ads Manager (Portfolio Scope)</option>
          </select>

          {screen === 'ads_admin' && (
            <select
              aria-label="Select vertical policy"
              value={vertical}
              onChange={(e) => setVertical(e.target.value as AdsVertical)}
              className="px-2.5 py-1.5 rounded-ds-sm border border-hairline-strong bg-surface-raised text-strong"
            >
              <option value="core">Core Admin</option>
              <option value="bws">BWS Campaign Studio</option>
              <option value="talent_commerce">Talent Commerce</option>
            </select>
          )}

          <div className="inline-flex rounded-ds-sm border border-hairline bg-surface p-0.5">
            {(['populated', 'loading', 'error', 'empty'] as PreviewStateMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setStateMode(mode)}
                className={`px-2.5 py-1 rounded-ds-sm capitalize ${
                  stateMode === mode
                    ? 'bg-ink-950 text-on-dark font-medium'
                    : 'text-muted hover:text-strong'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto px-6 py-6">
        {screen === 'purchase_orders' && (
          <BrandPurchaseOrdersView
            pos={isEmpty ? [] : SAMPLE_POS}
            isLoading={isLoading}
            isError={isError}
            errorMessage="Simulated fetch error in preview mode."
            onRetry={() => setStateMode('populated')}
            tenantId="preview-brand"
            brandLabel="Sample Brand Ltd"
            isFinancedBrand={false}
            instructionsByPoId={new Map()}
            onSubmitAck={async () => ({
              ok: true,
              notice: 'Preview callback executed cleanly.',
            })}
            onSubmitCorrection={async () => ({
              ok: true,
              notice: 'Preview packing correction logged.',
            })}
            onApproveOnBehalf={async () => ({ ok: true, notice: 'Preview draft approved.' })}
            onAuthoriseOnBehalf={async () => ({ ok: true, notice: 'Preview authorisation set.' })}
            onWithdrawOnBehalf={async () => ({ ok: true, notice: 'Preview withdrawn.' })}
            onOpenLogistics={() => setScreen('logistics')}
          />
        )}

        {screen === 'logistics' && (
          <BrandLogisticsView
            brandDisplayName="Sample Brand Ltd"
            tenantLabel="preview-brand"
            isBrandSession
            isLoading={isLoading}
            isError={isError}
            errorMessage="Simulated logistics query error."
            onRetry={() => setStateMode('populated')}
            rows={logisticsRows}
            model={logisticsModel}
            performance={logisticsPerf}
            etaCoverage={{
              dated: logisticsRows.length,
              simulated: logisticsRows.length,
              delivered: 0,
              unavailable: 0,
              total: logisticsRows.length,
            }}
            eligibility={eligibility}
            providerModes={{ dhl: 'simulation', palletline: 'simulation' }}
            acceptedUnshippedPos={[]}
            onDownloadHtml={() => {}}
            renderDocumentQueueSlot={() => (
              <p className="text-ds-label text-muted">
                Preview slot: PoDocumentQueuePanel renders accepted POs inside the 24h/dispatch window.
              </p>
            )}
            renderDocumentPackSlot={() => (
              <p className="text-ds-label text-muted">
                Preview slot: PoDocumentPackPanel renders commercial invoice, packing list, and carrier labels.
              </p>
            )}
            providerConfigsSlot={
              <p className="text-ds-label text-muted">
                Preview slot: DHL Express (simulation), Palletline (simulation).
              </p>
            }
          />
        )}

        {(screen === 'ads_brand' || screen === 'ads_admin') && (
          <AdsManagerView
            policy={adsPolicy}
            isLoading={isLoading}
            isError={isError}
            errorMessage="Simulated ads query error."
            onRetry={() => setStateMode('populated')}
            isLiveIntegration={false}
            integrationModeLabel="Simulated (zero external calls)"
            tenantId="preview-brand"
            brandName="Sample Brand Ltd"
            brandBudget={isEmpty ? null : SAMPLE_BUDGET}
            brandCampaigns={isEmpty ? [] : SAMPLE_CAMPAIGNS}
            brandRecommendations={isEmpty ? [] : SAMPLE_RECOMMENDATIONS}
            portfolioRows={isEmpty ? [] : SAMPLE_PORTFOLIO}
            campaignsByBrand={new Map([['preview-brand', isEmpty ? [] : SAMPLE_CAMPAIGNS]])}
            recommendationsByBrand={
              new Map([['preview-brand', isEmpty ? [] : SAMPLE_RECOMMENDATIONS]])
            }
            canStaffMutate
            actingStaffLabel="Preview Staff"
            onSaveBudget={async (_id, val) => ({
              ok: true,
              message: `Preview budget updated to £${val.toLocaleString('en-GB')}.`,
            })}
            onDecideRecommendation={async (_id, dec) => ({
              ok: true,
              message: `Preview recommendation marked ${dec}.`,
            })}
          />
        )}
      </main>
    </div>
  );
}
