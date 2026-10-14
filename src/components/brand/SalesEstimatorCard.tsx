/**
 * §18/M12 — THE AMAZON SALES ESTIMATOR (brand-facing).
 *
 * A brand enters what it actually knows about a product and receives an
 * ESTIMATED monthly sales range plus the resulting Mercenta economics under its
 * own commercial model. The result is ALWAYS labelled as an estimate: this is a
 * modelled projection over a simulated planning dataset, never measured Amazon
 * data, and it never promises a launch, a listing or an approval.
 */
import { useMemo, useState } from 'react';
import { Card, Badge, Button, Input, Select } from '@/components/ui';
import { APPROVED_CATEGORIES } from '@/types';
import {
  estimateAmazonSales,
  modelBornToRunOpportunity,
  salesDataProviderModes,
} from '@/lib/intelligence/salesEstimator';
import { COMMERCIAL_MODELS, isCommercialModel } from '@/config/commercialModel';
import { useApp } from '@/context/GlobalStateContext';
import { TrendingUp, Info, Calculator } from 'lucide-react';

const gbp = (n: number) =>
  `£${n.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const CONFIDENCE_CLASS: Record<string, string> = {
  low: 'bg-amber-500/15 text-amber-300',
  medium: 'bg-blue-500/15 text-blue-300',
  high: 'bg-emerald-500/15 text-emerald-300',
};

export function SalesEstimatorCard() {
  const { brandProfile } = useApp();
  const [category, setCategory] = useState<string>(
    brandProfile.category ?? APPROVED_CATEGORIES[0]
  );
  const [price, setPrice] = useState('24.99');
  const [competitors, setCompetitors] = useState('12');
  const [reviews, setReviews] = useState('0');
  const [packSize, setPackSize] = useState('1');
  const [maturity, setMaturity] = useState('2');
  const [showBornToRun, setShowBornToRun] = useState(false);

  const model = isCommercialModel(brandProfile.commercialModel)
    ? brandProfile.commercialModel
    : 'commission_agent';

  const estimate = useMemo(
    () =>
      estimateAmazonSales({
        category,
        priceGbp: Number(price) || 0,
        competitorCount: Number(competitors) || 0,
        reviewCount: Number(reviews) || 0,
        packSize: Number(packSize) || 1,
        listingMaturity: Number(maturity) || 3,
      }),
    [category, price, competitors, reviews, packSize, maturity]
  );

  const bornToRun = useMemo(
    () =>
      showBornToRun
        ? modelBornToRunOpportunity({
            category,
            priceGbp: Number(price) || 0,
            competitorCount: Number(competitors) || 0,
            reviewCount: Number(reviews) || 0,
            packSize: Number(packSize) || 1,
            listingMaturity: Number(maturity) || 3,
            currentlyOnAmazon: false,
            model,
          })
        : null,
    [showBornToRun, category, price, competitors, reviews, packSize, maturity, model]
  );

  const providerModes = useMemo(() => salesDataProviderModes(), []);

  return (
    <Card title="Retail-Channel Sales Estimator">
      <p className="text-ds-label text-zinc-500 mb-3">
        Enter what you know about the product. You get an{' '}
        <strong className="text-zinc-400">estimated</strong> sales range and the Mercenta economics
        under your agreed commercial model ({COMMERCIAL_MODELS[model].label}).
      </p>

      <div className="grid gap-3 sm:grid-cols-3 mb-4">
        <Select
          label="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          options={APPROVED_CATEGORIES.map((c) => ({ value: c, label: c }))}
        />
        <Input label="Retail price (£)" value={price} onChange={(e) => setPrice(e.target.value)} />
        <Input label="Pack size (units per sale)" value={packSize} onChange={(e) => setPackSize(e.target.value)} />
        <Input label="Competing listings" value={competitors} onChange={(e) => setCompetitors(e.target.value)} />
        <Input label="Your reviews (if any)" value={reviews} onChange={(e) => setReviews(e.target.value)} />
        <Select
          label="Listing maturity"
          value={maturity}
          onChange={(e) => setMaturity(e.target.value)}
          options={[
            { value: '1', label: '1 — brand new' },
            { value: '2', label: '2 — early' },
            { value: '3', label: '3 — established' },
            { value: '4', label: '4 — strong' },
            { value: '5', label: '5 — category leader' },
          ]}
        />
      </div>

      <div className="rounded-ds-md border border-white/[0.08] p-3" data-testid="sales-estimate-result">
        <div className="flex items-center gap-2 mb-2">
          <Calculator className="w-3.5 h-3.5 text-brass-400" />
          <span className="text-xs font-medium text-white">Estimated monthly sales</span>
          <Badge className={`text-ds-micro ${CONFIDENCE_CLASS[estimate.confidence]}`}>
            {estimate.confidence} confidence
          </Badge>
        </div>
        <div className="grid gap-2 sm:grid-cols-3 text-ds-label font-mono">
          <div>
            <p className="text-zinc-500">Orders / month</p>
            <p className="text-zinc-200">
              {estimate.estimatedMonthlyOrders.low} – {estimate.estimatedMonthlyOrders.high}
            </p>
          </div>
          <div>
            <p className="text-zinc-500">Units / month</p>
            <p className="text-zinc-200">
              {estimate.estimatedMonthlyUnits.low} – {estimate.estimatedMonthlyUnits.high}
            </p>
          </div>
          <div>
            <p className="text-zinc-500">Revenue / month</p>
            <p className="text-emerald-300">
              {gbp(estimate.estimatedMonthlyRevenueGbp.low)} –{' '}
              {gbp(estimate.estimatedMonthlyRevenueGbp.high)}
            </p>
          </div>
        </div>
        <p className="text-ds-micro text-zinc-500 mt-2">
          Midpoint revenue {gbp(estimate.estimatedMonthlyRevenueGbp.mid)}/month ·{' '}
          {gbp(estimate.estimatedAnnualRevenueGbp.mid)}/year. {estimate.confidenceReason}
        </p>
      </div>

      <div className="mt-3 space-y-1.5">
        {estimate.disclaimers.map((d) => (
          <p key={d} className="text-ds-micro text-zinc-600 flex items-start gap-1.5">
            <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
            {d}
          </p>
        ))}
        <p className="text-ds-micro text-zinc-600">
          Data providers: {providerModes.map((p) => `${p.provider} → ${p.mode}`).join(' · ')} — no live
          data connection is claimed or used.
        </p>
      </div>

      <div className="mt-3 border-t border-white/[0.06] pt-3">
        <Button variant="tertiary" className="text-xs" onClick={() => setShowBornToRun((v) => !v)}>
          <TrendingUp className="w-3.5 h-3.5" />
          {showBornToRun ? 'Hide' : 'Model'} a new-to-channel launch
        </Button>
        {bornToRun && (
          <div
            className="mt-2 rounded-ds-md border border-white/[0.08] p-3 text-ds-label"
            data-testid="born-to-run-result"
          >
            <p className="text-xs font-medium text-white mb-1">Launch modelling — simulation only</p>
            <p className="text-zinc-400 font-mono">
              New to the retail channel: {bornToRun.newToAmazon ? 'yes' : 'no'} · projected initial
              demand {bornToRun.projectedInitialMonthlyOrders} orders/month · suggested first
              quantity {bornToRun.suggestedLaunchQuantity} units · estimated launch revenue{' '}
              {gbp(bornToRun.estimatedLaunchRevenueGbp)}
            </p>
            <p className="text-zinc-400 font-mono mt-1">{bornToRun.economics.formula}</p>
            <p className="text-ds-micro text-amber-300/90 mt-1">
              Programme status: {bornToRun.programmeStatus} — Mercenta does not claim retail-channel
              approval and this model submits nothing to the retail channel.
            </p>
            {bornToRun.disclaimers.map((d) => (
              <p key={d} className="text-ds-micro text-zinc-600 mt-1">{d}</p>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

export default SalesEstimatorCard;