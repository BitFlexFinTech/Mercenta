/**
 * §12–§18/M12 — BRAND INTELLIGENCE: STRATEGY, SPEED-TO-REVENUE, SOURCE MARKETS,
 * TRADE PROGRAMMES, MARKET-ACCESS TAGGING and the SALES ESTIMATOR (operator view).
 *
 * This EXTENDS the existing Brand Intelligence panel — it does not replace it.
 * The canonical universe is still `prospectStore`, the canonical score is still
 * `scoringEngine`, and every projection here is labelled an ESTIMATE.
 */
import { useEffect, useMemo, useState } from 'react';
import { Card, Button, Input, Select } from '@/components/ui';
import { cn } from '@/utils/cn';
import {
  ACQUISITION_STRATEGIES,
  ACQUISITION_STRATEGY_ORDER,
  ESTIMATE_LABEL,
  SOURCE_MARKETS,
  TRADE_PROGRAMMES,
  TRADE_PARTNERSHIP_DISCLAIMER,
  describeMarketAccessTag,
  rankBySpeedToRevenue,
  resolveSourceMarketId,
  summariseByStrategy,
  type AcquisitionStrategyId,
  type TradeProgrammeId,
} from '@/lib/intelligence/acquisitionStrategy';
import { estimateFromProspect } from '@/lib/intelligence/salesEstimator';
import { setProspectMarketAccess } from '@/lib/intelligence/prospectLifecycle';
import { ensureProspectStore, getProspects } from '@/data/prospectStore';
import { useCanonicalStoreVersion } from '@/data/queries';
import type { BrandProspect } from '@/types';
import { Globe2, Target, Tag, Calculator } from 'lucide-react';

const gbp = (n: number) =>
  `£${n.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const STRATEGY_ICON: Record<AcquisitionStrategyId, typeof Globe2> = {
  uk_brands: Target,
  global_to_uk: Globe2,
};

export function BrandIntelligenceStrategyPanel() {
  const storeVersion = useCanonicalStoreVersion();
  const [prospects, setProspects] = useState<BrandProspect[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [programme, setProgramme] = useState<TradeProgrammeId | ''>('');
  const [partnerSource, setPartnerSource] = useState('');
  const [campaign, setCampaign] = useState('');
  const [sourceCountry, setSourceCountry] = useState('');
  const [message, setMessage] = useState('');
  const [estimate, setEstimate] = useState<Awaited<ReturnType<typeof estimateFromProspect>> | null>(
    null
  );
  const [estimating, setEstimating] = useState(false);

  useEffect(() => {
    ensureProspectStore();
    setProspects(getProspects());
  }, [storeVersion]);

  const ranked = useMemo(() => rankBySpeedToRevenue(prospects), [prospects]);
  const rollup = useMemo(() => summariseByStrategy(prospects), [prospects]);

  const selectedProspect = prospects.find((p) => p.id === selected) ?? null;

  const recordTag = () => {
    if (!selectedProspect) return;
    const event = setProspectMarketAccess(
      selectedProspect.id,
      {
        sourceCountry: sourceCountry || (selectedProspect.countries ?? [])[0],
        programme: programme || undefined,
        partnerSource,
        campaign,
      },
      'staff-001'
    );
    setMessage(
      event
        ? `Market-access route recorded for ${selectedProspect.brand}: ${event.after}`
        : 'Nothing changed — the recorded route already matches.'
    );
    setProspects(getProspects());
  };

  const runEstimate = async () => {
    if (!selectedProspect || estimating) return;
    setEstimating(true);
    setEstimate(null);
    try {
      setEstimate(await estimateFromProspect(selectedProspect));
    } finally {
      setEstimating(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card title="Acquisition strategy — both engines, one destination market">
        <p className="text-ds-label text-zinc-500 mb-3">
          Every projection below is an estimate derived from the stored prospect score —{' '}
          <span className="text-zinc-400">{ESTIMATE_LABEL}</span>. The destination market is the UK in
          both strategies.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {ACQUISITION_STRATEGY_ORDER.map((id) => {
            const def = ACQUISITION_STRATEGIES[id];
            const Icon = STRATEGY_ICON[id];
            const stats = rollup[id];
            return (
              <div
                key={id}
                className="rounded-ds-md border border-hairline p-3"
                data-testid={`strategy-card-${id}`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <Icon className="w-3.5 h-3.5 text-brass-400" />
                  <span className="text-xs font-medium text-strong">{def.label}</span>
                </div>
                <p className="text-ds-micro text-zinc-500 mb-2">{def.summary}</p>
                <div className="grid grid-cols-2 gap-2 text-ds-label font-mono">
                  <p className="text-zinc-400">
                    Tracked: <span className="text-zinc-200">{stats.count}</span>
                  </p>
                  <p className="text-zinc-400">
                    Avg weeks to revenue:{' '}
                    <span className="text-zinc-200">{stats.averageWeeksToRevenue || '—'}</span>
                  </p>
                  <p className="text-zinc-400">
                    Projected revenue:{' '}
                    <span className="text-zinc-200">{gbp(stats.projectedRevenueGbp)}</span>
                  </p>
                  <p className="text-zinc-400">
                    Projected margin:{' '}
                    <span className="text-emerald-300">{gbp(stats.projectedMarginGbp)}</span>
                  </p>
                </div>
                <p className="text-ds-micro text-zinc-600 mt-2">{def.rationale}</p>
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="Speed to revenue — who to contact first">
        <div className="overflow-x-auto">
          <table className="w-full text-xs" data-testid="speed-to-revenue-table">
            <thead>
              <tr className="border-b border-hairline text-left text-zinc-500">
                <th className="px-2 py-1.5">#</th>
                <th className="px-2 py-1.5">Brand</th>
                <th className="px-2 py-1.5">Strategy</th>
                <th className="px-2 py-1.5">Source market</th>
                <th className="px-2 py-1.5">Market access</th>
                <th className="px-2 py-1.5">Score</th>
                <th className="px-2 py-1.5">Proj. revenue</th>
                <th className="px-2 py-1.5">Proj. margin</th>
                <th className="px-2 py-1.5">Weeks</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((r) => {
                const p = prospects.find((x) => x.id === r.prospectId);
                return (
                  <tr
                    key={r.prospectId}
                    className={cn(
                      'border-b border-hairline cursor-pointer hover:bg-tint',
                      selected === r.prospectId ? 'bg-tint' : ''
                    )}
                    data-testid={`speed-row-${r.prospectId}`}
                    onClick={() => {
                      setSelected(r.prospectId);
                      setEstimate(null);
                      setMessage('');
                    }}
                  >
                    <td className="px-2 py-1.5 text-zinc-500">{r.rank}</td>
                    <td className="px-2 py-1.5 text-strong font-medium">{r.brand}</td>
                    <td className="px-2 py-1.5 text-zinc-400">
                      {r.strategy === 'uk_brands' ? 'A · UK' : 'B · global→UK'}
                    </td>
                    <td className="px-2 py-1.5 text-zinc-400">{r.sourceMarketLabel}</td>
                    <td className="px-2 py-1.5 text-zinc-500 text-ds-micro">
                      {describeMarketAccessTag(p?.marketAccess)}
                    </td>
                    <td className="px-2 py-1.5">
                      <span
                        className={cn(
                          'font-bold',
                          r.speedToRevenueScore >= 70
                            ? 'text-emerald-400'
                            : r.speedToRevenueScore >= 50
                              ? 'text-blue-400'
                              : 'text-zinc-500'
                        )}
                      >
                        {r.speedToRevenueScore}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-zinc-300">{gbp(r.projectedRevenueGbp)}</td>
                    <td className="px-2 py-1.5 text-emerald-300">
                      {gbp(r.projectedMercentaMarginGbp)}
                    </td>
                    <td className="px-2 py-1.5 text-zinc-400">{r.timeToRevenueWeeks}</td>
                  </tr>
                );
              })}
              {ranked.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-zinc-600">
                    No prospects in the canonical universe yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Market-access route & sales estimator">
        {!selectedProspect ? (
          <p className="text-xs text-zinc-500" data-testid="strategy-select-hint">
            Select a brand in the speed-to-revenue table to tag its market-access route or run a
            sales estimate.
          </p>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Tag className="w-3.5 h-3.5 text-brass-400" />
                <span className="text-xs font-medium text-strong">{selectedProspect.brand}</span>
                <span className="text-ds-micro text-zinc-500">
                  currently: {describeMarketAccessTag(selectedProspect.marketAccess)}
                </span>
              </div>
              <div className="grid gap-2 sm:grid-cols-4">
                <Select
                  label="Source country"
                  value={sourceCountry}
                  onChange={(e) => setSourceCountry(e.target.value)}
                  options={[
                    { value: '', label: 'Keep as-is' },
                    ...Object.values(SOURCE_MARKETS).map((m) => ({
                      value: m.label,
                      label: m.label,
                    })),
                  ]}
                />
                <Select
                  label="Trade programme"
                  value={programme}
                  onChange={(e) => setProgramme(e.target.value as TradeProgrammeId | '')}
                  options={[
                    { value: '', label: 'None' },
                    ...Object.values(TRADE_PROGRAMMES).map((t) => ({
                      value: t.id,
                      label: t.label,
                    })),
                  ]}
                />
                <Input
                  label="Partner / referral source"
                  value={partnerSource}
                  onChange={(e) => setPartnerSource(e.target.value)}
                  placeholder="e.g. Harare trade delegation"
                />
                <Input
                  label="Campaign"
                  value={campaign}
                  onChange={(e) => setCampaign(e.target.value)}
                  placeholder="e.g. Africa→UK Q4"
                />
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Button variant="tertiary" className="text-xs" onClick={recordTag}>
                  <Tag className="w-3.5 h-3.5" />
                  Record market-access route
                </Button>
                <Button variant="tertiary" className="text-xs" onClick={runEstimate} disabled={estimating}>
                  <Calculator className="w-3.5 h-3.5" />
                  {estimating ? 'Estimating…' : 'Run sales estimate'}
                </Button>
              </div>
              {message && (
                <p className="text-ds-label text-brass-300 mt-2" data-testid="market-access-message">
                  {message}
                </p>
              )}
              <p className="text-ds-micro text-zinc-600 mt-2">{TRADE_PARTNERSHIP_DISCLAIMER}</p>
            </div>

            {estimate && (
              <div
                className="rounded-ds-md border border-hairline p-3 text-ds-label"
                data-testid="admin-sales-estimate"
              >
                <p className="text-xs font-medium text-strong mb-1">
                  Estimated sales — {selectedProspect.brand}
                </p>
                <p className="text-zinc-400 font-mono">
                  {estimate.estimatedMonthlyOrders.low}–{estimate.estimatedMonthlyOrders.high} orders/mo ·
                  revenue {gbp(estimate.estimatedMonthlyRevenueGbp.low)}–{gbp(estimate.estimatedMonthlyRevenueGbp.high)}/mo ·
                  confidence {estimate.confidence} · ASIN evidence {estimate.asinEvidenceCount} ·
                  data mode {estimate.amazonDataMode}
                </p>
                <p className="text-zinc-500 mt-1">{estimate.confidenceReason}</p>
                {estimate.disclaimers.map((d) => (
                  <p key={d} className="text-ds-micro text-zinc-600 mt-1">{d}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

export default BrandIntelligenceStrategyPanel;