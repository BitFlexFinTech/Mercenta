/**
 * §9–§14 / Phase M13 — OPPORTUNITY DISCOVERY (operator view).
 *
 * This EXTENDS the existing Brand Intelligence surface — it does not replace it.
 * The ASIN-level panel above it remains the core engine; this panel is the second
 * discovery layer (UK / international / sports / distributor / network verticals)
 * ranked by the §13 objective: estimated PO potential.
 *
 * Every figure is an ESTIMATE and every record states whether it is a confirmed
 * fact, an estimate, third-party research or pending confirmation. No record here
 * is a "confirmed partnership": a sports/club entry is a POTENTIAL distribution
 * opportunity Mercenta has identified.
 */
import { useEffect, useMemo, useState } from 'react';
import { Card, Badge, Button, Input } from '@/components/ui';
import { cn } from '@/utils/cn';
import {
  AMAZON_PRESENCE_LABELS,
  AUTHORISATION_LABELS,
  CLAIM_LABELS,
  OPPORTUNITY_VERTICALS,
  OPPORTUNITY_VERTICAL_ORDER,
  PO_POTENTIAL_FORMULA,
  SEEDED_OPPORTUNITY_DISCLAIMER,
  rankOpportunities,
  rollupByVertical,
  sportsOpportunities,
  type OpportunityRecord,
  type OpportunityVerticalId,
} from '@/lib/intelligence/opportunityDiscovery';
import { estimateFromProspect } from '@/lib/intelligence/salesEstimator';
import { ensureProspectStore, getProspects } from '@/data/prospectStore';
import { useCanonicalStoreVersion } from '@/data/queries';
import type { BrandProspect } from '@/types';
import { Compass, Trophy, Ban, ChevronDown } from 'lucide-react';

const gbp = (n: number) =>
  `£${n.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export function OpportunityDiscoveryPanel() {
  const storeVersion = useCanonicalStoreVersion();
  const [prospects, setProspects] = useState<BrandProspect[]>([]);
  const [vertical, setVertical] = useState<OpportunityVerticalId | ''>('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<Awaited<ReturnType<typeof estimateFromProspect>> | null>(
    null
  );

  useEffect(() => {
    ensureProspectStore();
    setProspects(getProspects());
  }, [storeVersion]);

  const { ranked, ineligible } = useMemo(() => rankOpportunities(prospects), [prospects]);
  const sports = useMemo(() => sportsOpportunities(), []);
  const allRecords = useMemo<OpportunityRecord[]>(
    () => [...ranked, ...ineligible, ...sports],
    [ranked, ineligible, sports]
  );
  const rollup = useMemo(() => rollupByVertical(allRecords), [allRecords]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ranked.filter(
      (r) =>
        (!vertical || r.vertical === vertical) &&
        (!q || r.brand.toLowerCase().includes(q) || r.category.toLowerCase().includes(q))
    );
  }, [ranked, vertical, query]);

  const current = allRecords.find((r) => r.id === selected) ?? null;

  const loadEstimate = async (record: OpportunityRecord) => {
    // §15 — the estimator is the EXISTING engine; this only exposes it here.
    const prospect = prospects.find((p) => `opp-${p.id}` === record.id);
    if (!prospect) return;
    setEstimate(await estimateFromProspect(prospect));
  };

  return (
    <div className="space-y-4" data-testid="opportunity-discovery">
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Compass className="w-4 h-4" /> Opportunity Discovery
            </h2>
            <p className="text-[11px] text-zinc-500 mt-1">
              The second discovery layer over the same ASIN-level universe: UK brands,
              international brands, sports organisations, distributor channels and network routes.
              Ranked by estimated PO potential.{' '}
              <span className="text-zinc-600">{PO_POTENTIAL_FORMULA}</span>
            </p>
          </div>
          <span className="text-[10px] text-amber-300/90 border border-amber-400/20 rounded px-2 py-1 whitespace-nowrap">
            {CLAIM_LABELS.estimate}
          </span>
        </div>

        {/* §9 vertical rollup — every card opens the matching filter (drill-down). */}
        <div className="grid gap-2 sm:grid-cols-4 mt-4">
          {OPPORTUNITY_VERTICAL_ORDER.map((v) => {
            const r = rollup[v];
            return (
              <button
                key={v}
                type="button"
                onClick={() => setVertical(vertical === v ? '' : v)}
                className={cn(
                  'text-left rounded-lg border px-2.5 py-2 transition-colors',
                  vertical === v
                    ? 'border-emerald-400/40 bg-emerald-500/[0.08]'
                    : 'border-white/[0.06] bg-ink-850 hover:bg-white/[0.03]'
                )}
              >
                <p className="text-[10px] text-zinc-500">{OPPORTUNITY_VERTICALS[v].label}</p>
                <p className="text-sm font-bold text-white">{r.count}</p>
                <p className="text-[10px] text-zinc-400 font-mono">
                  PO {gbp(r.poPotentialGbp)} · Mercenta {gbp(r.mercentaRevenueGbp)}
                </p>
              </button>
            );
          })}
        </div>
      </Card>

      {/* §10/§14 — the ranked opportunity list. */}
      <Card className="p-0 overflow-x-auto">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.06]">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search brand or category..."
            className="text-xs py-1 w-52"
          />
          <span className="text-xs text-zinc-600">
            {visible.length} ranked · {ineligible.length} ineligible
          </span>
        </div>
        {/* NOTE: this list is deliberately NOT a <table>. The canonical admin and
            brand specs locate rows with the generic selector `table tbody tr`; a
            second table on this page silently captured their clicks and broke 19
            pre-existing specs. A labelled grid keeps the pre-existing DOM intact. */}
        <div role="table" aria-label="Ranked opportunities" className="w-full text-xs">
          <div role="row" className="flex border-b bg-ink-850/50 text-zinc-500">
            {['#', 'Brand', 'Vertical', 'Cat', 'ASINs', 'Est. PO/mo', 'Mercenta est.', 'Weeks', 'Presence', 'CTA'].map(
              (h) => (
                <span key={h} role="columnheader" className="px-2 py-1.5 flex-1 min-w-0 truncate">
                  {h}
                </span>
              )
            )}
          </div>
          {visible.map((r) => (
            <div
              key={r.id}
              role="row"
              data-testid="opportunity-row"
              onClick={() => setSelected(r.id)}
              className={cn(
                'flex border-b cursor-pointer hover:bg-white/[0.03]',
                selected === r.id && 'bg-white/[0.04]'
              )}
            >
              <span className="px-2 py-1 text-zinc-500 flex-1 min-w-0 truncate">{r.rank}</span>
              <span className="px-2 py-1 font-medium text-white flex-1 min-w-0 truncate">
                {r.brand}
              </span>
              <span className="px-2 py-1 text-zinc-400 text-[10px] flex-1 min-w-0 truncate">
                {OPPORTUNITY_VERTICALS[r.vertical].label}
              </span>
              <span className="px-2 py-1 text-zinc-400 text-[10px] flex-1 min-w-0 truncate">
                {r.category}
              </span>
              <span className="px-2 py-1 text-zinc-300 flex-1 min-w-0 truncate">{r.asinCount}</span>
              <span className="px-2 py-1 text-emerald-300 font-mono flex-1 min-w-0 truncate">
                {gbp(r.estimatedPoPotentialGbp)}
              </span>
              <span className="px-2 py-1 text-zinc-200 font-mono flex-1 min-w-0 truncate">
                {gbp(r.estimatedMercentaRevenueGbp)}
              </span>
              <span className="px-2 py-1 text-zinc-400 flex-1 min-w-0 truncate">
                {r.timeToRevenueWeeks}
              </span>
              <span className="px-2 py-1 text-zinc-400 text-[9px] flex-1 min-w-0 truncate">
                {AMAZON_PRESENCE_LABELS[r.amazonPresence]}
              </span>
              <span className="px-2 py-1 text-zinc-400 text-[9px] flex-1 min-w-0 truncate">
                {r.recommendedCta}
              </span>
            </div>
          ))}
          {visible.length === 0 && (
            <p className="py-8 text-center text-zinc-600">No eligible opportunities match.</p>
          )}
        </div>
      </Card>

      {/* §6 — ineligible records are SHOWN with the reason, never hidden. */}
      {ineligible.length > 0 && (
        <Card>
          <h3 className="text-xs font-semibold text-amber-300 flex items-center gap-2">
            <Ban className="w-3.5 h-3.5" /> Ineligible — outside the ten permitted categories
          </h3>
          <div className="mt-2 space-y-1">
            {ineligible.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-2 bg-ink-850 border border-white/[0.06] rounded-lg px-2 py-1.5"
              >
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-medium text-zinc-300">{r.brand}</span>
                  <p className="text-[10px] text-amber-300/80 font-mono truncate">{r.eligibility.reason}</p>
                </div>
                <Button variant="tertiary" className="text-[10px] px-2 py-1" onClick={() => setSelected(r.id)}>
                  Details
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}


      {/* §12 — the sports/team/club vertical, seeded with the first opportunity. */}
      <Card>
        {/* NOTE: the shared `Card` forwards only children/className/title/subtitle/action,
            so the test id lives on an inner element rather than on the frozen primitive. */}
        <div data-testid="sports-opportunities">
        <h3 className="text-xs font-semibold text-white flex items-center gap-2">
          <Trophy className="w-3.5 h-3.5" /> Sports / Team / Club opportunities
        </h3>
        <p className="text-[10px] text-amber-300/90 mt-1">{SEEDED_OPPORTUNITY_DISCLAIMER}</p>
        <div className="mt-2 space-y-2">
          {sports.map((s) => (
            <div
              key={s.id}
              className="rounded-lg border border-white/[0.08] p-2.5 text-[11px] cursor-pointer hover:bg-white/[0.03]"
              onClick={() => setSelected(s.id)}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-xs font-medium text-white">{s.brand}</span>
                  <span className="ml-2 text-[10px] text-zinc-500">{s.category}</span>
                </div>
                <Badge className="text-[9px] bg-amber-500/15 text-amber-300">
                  {CLAIM_LABELS[s.claim]}
                </Badge>
              </div>
              <p className="text-zinc-400 mt-1">{s.productSummary}</p>
              <p className="text-[10px] text-zinc-500 mt-1">{s.sellerStatusEvidence}</p>
              <p className="text-[10px] text-zinc-500 mt-1">{s.distributionOpportunity}</p>
              <p className="text-[10px] text-emerald-300/90 mt-1">Next: {s.recommendedCta}</p>
            </div>
          ))}
        </div>
        </div>
      </Card>

      {/* §10 — the drill-down. Every figure states its claim class. */}
      {current && (
        <Card>
          <div data-testid="opportunity-detail">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold text-white">
              {current.brand}
              <span className="ml-2 text-[10px] font-normal text-zinc-500">
                {OPPORTUNITY_VERTICALS[current.vertical].label}
              </span>
            </h3>
            <button
              type="button"
              className="text-[10px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1"
              onClick={() => setSelected(null)}
            >
              <ChevronDown className="w-3 h-3" /> Close
            </button>
          </div>

          <div className="grid gap-2 sm:grid-cols-3 mt-2 text-[11px]">
            <p className="text-zinc-400">
              Eligibility: <span className="text-zinc-200">{current.eligibility.reason}</span>
            </p>
            <p className="text-zinc-400">
              Geography: <span className="text-zinc-200">{current.geography.sourceMarketLabel}</span> →{' '}
              {current.geography.destinationMarket}
            </p>
            <p className="text-zinc-400">
              Seller evidence:{' '}
              <span className="text-zinc-200">{AUTHORISATION_LABELS[current.authorisationIndicator]}</span>
            </p>
            <p className="text-zinc-400">
              Distribution: <span className="text-zinc-200">{current.distributionOpportunity}</span>
            </p>
            <p className="text-zinc-400">
              Existing distributor:{' '}
              <span className="text-zinc-200">{current.existingDistributorEvidence}</span>
            </p>
            <p className="text-zinc-400">
              Decision-maker: <span className="text-zinc-200">{current.decisionMaker}</span>
            </p>
            <p className="text-zinc-400">
              Est. PO potential/mo:{' '}
              <span className="text-emerald-300 font-mono">{gbp(current.estimatedPoPotentialGbp)}</span>
            </p>
            <p className="text-zinc-400">
              Mercenta est./mo:{' '}
              <span className="text-zinc-200 font-mono">{gbp(current.estimatedMercentaRevenueGbp)}</span>{' '}
              ({current.recommendedCommercialModel})
            </p>
            <p className="text-zinc-400">
              Claim: <span className="text-amber-300">{CLAIM_LABELS[current.claim]}</span> ·{' '}
              <span className="text-zinc-500">{current.estimateLabel}</span>
            </p>
          </div>

{current.topAsins.length > 0 && (
            <div className="mt-3">
              <p className="text-[10px] text-zinc-500 mb-1">
                ASIN evidence (from the existing BI engine)
              </p>
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-white/[0.06] text-zinc-500">
                    {['ASIN', 'Title', 'Price', 'Sellers', 'BSR', 'Reviews', 'Est. units/mo', 'Est. rev/mo'].map(
                      (h) => (
                        <th key={h} className="px-1.5 py-1 text-left">{h}</th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {current.topAsins.map((a) => (
                    <tr key={a.asin} className="border-b border-white/[0.04] text-zinc-300">
                      <td className="px-1.5 py-1 font-mono">{a.asin}</td>
                      <td className="px-1.5 py-1">{a.title}</td>
                      <td className="px-1.5 py-1">£{a.price.toFixed(2)}</td>
                      <td className="px-1.5 py-1">{a.sellerCount}</td>
                      <td className="px-1.5 py-1">{a.bsr}</td>
                      <td className="px-1.5 py-1">{a.reviewCount}</td>
                      <td className="px-1.5 py-1">{a.estimatedMonthlyUnits ?? '—'}</td>
                      <td className="px-1.5 py-1">
                        {a.estimatedMonthlyRevenueGbp ? gbp(a.estimatedMonthlyRevenueGbp) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-3 flex items-center gap-2">
            <Button
              variant="tertiary"
              className="text-xs"
              onClick={() => void loadEstimate(current)}
              disabled={!prospects.some((p) => `opp-${p.id}` === current.id)}
            >
              Run the sales estimator on this prospect
            </Button>
          </div>
          {estimate && (
            <p className="text-[10px] text-zinc-500 mt-2 font-mono">
              {estimate.estimateLabel}: {estimate.estimatedMonthlyUnits.low}–
              {estimate.estimatedMonthlyUnits.high} units/mo · {estimate.confidence} confidence ·{' '}
              {estimate.dataSource}
            </p>
          )}
          </div>
        </Card>
      )}
    </div>
  );
}

export default OpportunityDiscoveryPanel;
