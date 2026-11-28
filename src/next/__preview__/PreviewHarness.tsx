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
import { BwsIntelligenceView } from '@/next/screens/bws/BwsIntelligenceView';
import { TalentApprovalsView } from '@/next/screens/talent/TalentApprovalsView';
import type { AdCampaign, AdSpendBudget, AdSpendRecommendation, PurchaseOrder } from '@/types';
import '../next.css';

type PreviewScreen =
  | 'purchase_orders'
  | 'logistics'
  | 'ads_brand'
  | 'ads_admin'
  | 'bws_intel'
  | 'talent_approvals';
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

  const logisticsRows = isEmpty ? [] : SAMPLE_LOGISTICS_ROWS;
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
    <div className="mercenta-next min-h-screen bg-[#FAFAFA] text-[#09090B]">
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onExit}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-zinc-300 bg-white text-[12px] font-medium text-zinc-900 hover:bg-zinc-50"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            Back to Workspace
          </button>
          <div>
            <div className="text-[14px] font-semibold text-zinc-950">
              Pure Presentation Preview Harness
            </div>
            <div className="text-[12px] text-zinc-500">
              Renders View components offline without data-layer or context dependencies
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[12px]">
          <select
            aria-label="Select screen to preview"
            value={screen}
            onChange={(e) => setScreen(e.target.value as PreviewScreen)}
            className="px-2.5 py-1.5 rounded border border-zinc-300 bg-white text-zinc-950"
          >
            <option value="purchase_orders">2a · Brand Purchase Orders View</option>
            <option value="logistics">2b · Brand Logistics View</option>
            <option value="ads_brand">2c · Ads Manager (Brand Scope)</option>
            <option value="ads_admin">2c · Ads Manager (Portfolio Scope)</option>
            <option value="bws_intel">5 · BWS Intelligence View</option>
            <option value="talent_approvals">6 · Talent Commerce Approvals View</option>
          </select>

          {screen === 'ads_admin' && (
            <select
              aria-label="Select vertical policy"
              value={vertical}
              onChange={(e) => setVertical(e.target.value as AdsVertical)}
              className="px-2.5 py-1.5 rounded border border-zinc-300 bg-white text-zinc-950"
            >
              <option value="core">Core Admin</option>
              <option value="bws">BWS Campaign Studio</option>
              <option value="talent_commerce">Talent Commerce</option>
            </select>
          )}

          <div className="inline-flex rounded border border-zinc-200 bg-zinc-50 p-0.5">
            {(['populated', 'loading', 'error', 'empty'] as PreviewStateMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setStateMode(mode)}
                className={`px-2.5 py-1 rounded capitalize ${
                  stateMode === mode
                    ? 'bg-zinc-950 text-white font-medium'
                    : 'text-zinc-600 hover:text-zinc-950'
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
              <p className="text-[12px] text-zinc-600">
                Preview slot: PoDocumentQueuePanel renders accepted POs inside the 24h/dispatch window.
              </p>
            )}
            renderDocumentPackSlot={() => (
              <p className="text-[12px] text-zinc-600">
                Preview slot: PoDocumentPackPanel renders commercial invoice, packing list, and carrier labels.
              </p>
            )}
            providerConfigsSlot={
              <p className="text-[12px] text-zinc-600">
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

        {screen === 'bws_intel' && (
          <BwsIntelligenceView
            section="overview"
            loading={isLoading}
            error={isError ? 'Simulated BWS intelligence error.' : null}
            onRetry={() => setStateMode('populated')}
            canMutate
            metrics={[
              { id: 'b', label: 'Portfolio Brands', value: isEmpty ? '0' : '4' },
              { id: 'p', label: 'Tracked Prospects', value: isEmpty ? '0' : '12' },
              { id: 'o', label: 'Opportunities', value: isEmpty ? '0' : '3' },
              { id: 'v', label: 'PO Volume', value: isEmpty ? '£0' : '£45,000' },
            ]}
            countryRows={[]}
            categoryBenchmarks={[]}
            opportunityStates={[]}
            prospects={
              isEmpty
                ? []
                : [
                    {
                      id: 'p-1',
                      brand: 'Sample Producer Co',
                      category: 'Grocery',
                      whyInteresting: 'Export-ready line with active UK wholesaler demand.',
                      totalScore: 84,
                      tier: 'tier_1',
                      tierLabel: 'Attack Now',
                      offerSummary: 'MARKETPLACE ONLY OBSERVED',
                      rawOfferClass: 'MARKETPLACE_ONLY_OBSERVED',
                      ukPresence: false,
                      disqualified: false,
                      leadDistributor: 'None recorded',
                      leadContact: 'Head of Export',
                      wholesaleAvailable: true,
                      distributorProgramme: false,
                      outreachStatus: 'not_enrolled',
                      acquisitionStage: 'not enrolled',
                      canPrepareOutreach: true,
                      canApproveOutreach: false,
                      canSendOutreach: false,
                      canSimulateResponse: false,
                      canCreateOpportunity: false,
                      asins: [],
                      contacts: [],
                      distributors: [],
                    },
                  ]
            }
            selectedProspect={null}
            onSelectProspect={() => {}}
            searchQuery=""
            onSearchQueryChange={() => {}}
            tierFilter=""
            onTierFilterChange={() => {}}
            runningDiscovery={false}
            statusMessage={null}
            onRunDiscovery={() => {}}
            onNavigateSection={() => {}}
            onOutreachAction={() => {}}
            onSetOpportunityStage={() => {}}
          />
        )}

        {screen === 'talent_approvals' && (
          <TalentApprovalsView
            loading={isLoading}
            error={isError ? 'Simulated approvals fetch error.' : null}
            onRetry={() => setStateMode('populated')}
            canMutate
            activeTab="submissions"
            onTabChange={() => {}}
            metrics={[
              { id: 'sub', label: 'Product Submissions', value: isEmpty ? '0' : '2' },
              { id: 'lst', label: 'Listing Recommendations', value: isEmpty ? '0' : '5' },
              { id: 'doc', label: 'Compliance Documents', value: isEmpty ? '0' : '3' },
              { id: 'po', label: 'PO Ack & Drafts', value: isEmpty ? '0' : '1' },
            ]}
            submissions={
              isEmpty
                ? []
                : [
                    {
                      id: 'sub-1',
                      brandId: 'preview-brand',
                      brandName: 'Sample Brand Ltd',
                      productName: 'Sample Signature Edition',
                      sku: 'SKU-100',
                      asin: 'B0PREVIEW1',
                      status: 'under_amazon_review',
                      statusLabel: 'Under Review',
                      statusTone: 'info',
                      submittedAt: '2026-11-24',
                      simulated: true,
                    },
                  ]
            }
            listings={[]}
            complianceDocs={[]}
            purchaseOrders={[]}
            notice={null}
            actionError={null}
            busyId={null}
            onPollSubmission={() => {}}
            onReviewListing={() => {}}
            onReviewCompliance={() => {}}
            onApprovePoDraft={() => {}}
            onOpenPurchaseOrders={() => {}}
          />
        )}
      </main>
    </div>
  );
}
