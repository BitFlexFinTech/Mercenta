import { useMemo, useState, useCallback } from 'react';
import { useBrands, useFulfillmentScores } from '@/data/queries';
import { applyFulfillmentOverride, recalculateAllScores } from '@/data/api';
import type { FulfillmentScore, FulfillmentTrack } from '@/types';
import { fulfillmentTrackLabel } from '@/config/fulfillmentTrack';
import type { DemoBrandRow } from '@/data/demoData';
import { isBorderline, scoreBrand, computeComponentScores, type ScoreInputs } from '@/lib/scoring';
import { Badge, Card, Button, DataTable, Input } from '@/components/ui';
import { WorkspaceFrame, WorkspaceHeader } from '@/components/shared/workspace';
import { cn } from '@/utils/cn';
import {
  ArrowLeft, Info, BarChart3, Table2, Beaker, History, RotateCcw, RefreshCw,
} from 'lucide-react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { useRechartsTokens } from '@/components/shared/charts/rechartsTokens';

type Row = {
  score: FulfillmentScore;
  brand?: DemoBrandRow;
};

function TrackBadge({ track }: { track: FulfillmentTrack }) {
  const map: Record<FulfillmentTrack, string> = {
    direct_fulfillment: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
    financed: 'bg-blue-500/15 text-blue-300 border-blue-500/20',
    unassigned: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20',
  };
  const label = fulfillmentTrackLabel(track);
  return <Badge className={cn('text-ds-micro', map[track])}>{label}</Badge>;
}

function NeedsReviewBadge() {
  return (
    <Badge className="text-ds-micro bg-amber-500/15 text-amber-300 border-amber-500/20">
      Needs review
    </Badge>
  );
}

function ScoreBar({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div>
      <div className="flex justify-between text-ds-label mb-1">
        <span className="text-zinc-400">{label}</span>
        <span className="font-mono text-white">
          {value}/{max}
        </span>
      </div>
      <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
        <div
          className="h-full bg-brass-500/70 rounded-full"
          style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
        />
      </div>
    </div>
  );
}

const TRACK_FILTERS: { value: FulfillmentTrack | 'all'; label: string }[] = [
  { value: 'all', label: 'All tracks' },
  { value: 'direct_fulfillment', label: fulfillmentTrackLabel('direct_fulfillment') },
  { value: 'financed', label: fulfillmentTrackLabel('financed') },
  { value: 'unassigned', label: fulfillmentTrackLabel('unassigned') },
];

export function FulfillmentTrackPanel() {
  const brandsQuery = useBrands();
  const scoresQuery = useFulfillmentScores();

  /** Local override state (persisted to backend once Supabase is live). */
  const [overrides, setOverrides] = useState<
    Record<string, { track: FulfillmentTrack; reason: string }>
  >({});
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [trackFilter, setTrackFilter] = useState<FulfillmentTrack | 'all'>('all');
  const [minScore, setMinScore] = useState('');
  const [maxScore, setMaxScore] = useState('');
  const [activeTab, setActiveTab] = useState<'list' | 'compare' | 'simulator' | 'history'>('list');
  const [recalcMsg, setRecalcMsg] = useState<string | null>(null);
  const [scoresVersion, setScoresVersion] = useState(0);

  const rows: Row[] = useMemo(() => {
    const brands = brandsQuery.data?.data ?? [];
    const scores = scoresQuery.data?.data ?? [];
    return scores.map((score) => ({
      score: applyOverride(score, overrides[score.brandId]),
      brand: brands.find((b) => b.id === score.brandId),
    }));
  }, [brandsQuery.data, scoresQuery.data, overrides]);

  const filtered = rows.filter(({ score }) => {
    if (trackFilter !== 'all' && score.track !== trackFilter) return false;
    if (minScore !== '' && score.totalScore < Number(minScore)) return false;
    if (maxScore !== '' && score.totalScore > Number(maxScore)) return false;
    return true;
  });

  const selected = rows.find((r) => r.score.brandId === selectedId);

  if (selected) {
    return (
      <DetailView
        row={selected}
        rows={rows}
        onBack={() => setSelectedId(null)}
        onOverride={(track, reason) => {
          // Persist first (audit_log + score row); local state only after success.
          void applyFulfillmentOverride(selected.score.brandId, track, reason).then(
            () =>
              setOverrides((prev) => ({
                ...prev,
                [selected.score.brandId]: { track, reason },
              })),
            (err) => console.error('[FulfillmentTrack] override failed:', err)
          );
        }}
      />
    );
  }

  function handleRecalc() {
    const res = recalculateAllScores();
    setRecalcMsg('Recalculated ' + res.updated + ' brand scores.');
    setScoresVersion(function(v) { return v + 1; });
    setTimeout(function() { setRecalcMsg(null); }, 4000);
  }

  const TABS = [
    { id: 'list' as const, label: 'List', icon: Table2 },
    { id: 'compare' as const, label: 'Compare', icon: BarChart3 },
    { id: 'simulator' as const, label: 'Simulator', icon: Beaker },
    { id: 'history' as const, label: 'History', icon: History },
  ];

  return (
    <WorkspaceFrame className="space-y-4">
      <WorkspaceHeader
        eyebrow="ADMIN HUB · COMMERCE"
        title="Fulfillment Track"
        description="Auto-scored brand placement — Brand-direct supply vs Financed, per brand."
      />

      {/* Tab bar */}
      <div className="flex items-center gap-1 flex-wrap bg-ink-850 border border-white/[0.06] rounded-xl p-1">
        {TABS.map(function(tab) {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={function() { setActiveTab(tab.id); }}
              className={cn('flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors',
                activeTab === tab.id ? 'bg-brass-500 text-white' : 'text-zinc-400 hover:text-white hover:bg-white/[0.06]')}>
              <Icon className="w-3.5 h-3.5" /> {tab.label}
            </button>
          );
        })}
        <div className="ml-auto flex items-center gap-2">
          {recalcMsg && <span className="text-ds-label text-emerald-400">{recalcMsg}</span>}
          <button onClick={handleRecalc}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-blue-500/15 text-blue-300 hover:bg-blue-500/25 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" /> Bulk Recalculate
          </button>
        </div>
      </div>

      {activeTab === 'list' && (
        <>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={trackFilter}
          onChange={(e) => setTrackFilter(e.target.value as FulfillmentTrack | 'all')}
          className="bg-ink-900 border border-white/[0.08] rounded-md px-2.5 py-1.5 text-xs text-white cursor-pointer"
        >
          {TRACK_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <label className="text-xs text-zinc-500 flex items-center gap-1.5">
          Score ≥
          <input
            type="number"
            value={minScore}
            onChange={(e) => setMinScore(e.target.value)}
            placeholder="0"
            className="w-16 bg-ink-900 border border-white/[0.08] rounded-md px-2 py-1 text-xs text-white"
          />
        </label>
        <label className="text-xs text-zinc-500 flex items-center gap-1.5">
          Score ≤
          <input
            type="number"
            value={maxScore}
            onChange={(e) => setMaxScore(e.target.value)}
            placeholder="100"
            className="w-16 bg-ink-900 border border-white/[0.08] rounded-md px-2 py-1 text-xs text-white"
          />
        </label>
        <span className="text-ds-label text-zinc-600 ml-auto">
          {filtered.length} of {rows.length} brands
        </span>
      </div>

      {/* List view — §Phase D: canonical DataTable (row click opens the score
          detail; the borderline/manual-override state stays visible on mobile). */}
      <Card>
        <DataTable
          dataTable="fulfillment-scores"
          caption="Fulfilment score by brand"
          rows={filtered}
          rowKey={({ score }) => score.brandId}
          onRowClick={({ score }) => setSelectedId(score.brandId)}
          emptyMessage="No brands match the current filters."
          columns={[
            {
              key: 'brand',
              label: 'Brand',
              primary: true,
              render: ({ score, brand }) => (
                <span className="text-sm font-medium text-white">
                  {brand?.profile.businessName ?? score.brandId}
                </span>
              ),
            },
            {
              key: 'category',
              label: 'Category',
              render: ({ brand }) => <span className="text-xs text-zinc-400">{brand?.category ?? '—'}</span>,
            },
            {
              key: 'totalScore',
              label: 'Score',
              align: 'right',
              render: ({ score }) => (
                <span
                  className={cn(
                    'font-mono font-semibold',
                    isBorderline(score.totalScore) && !score.manualOverride ? 'text-amber-300' : 'text-white'
                  )}
                >
                  {score.totalScore}
                </span>
              ),
            },
            {
              key: 'track',
              label: 'Track',
              render: ({ score }) => <TrackBadge track={score.track} />,
            },
            {
              key: 'status',
              label: 'Status',
              render: ({ score }) =>
                isBorderline(score.totalScore) && !score.manualOverride ? (
                  <NeedsReviewBadge />
                ) : score.manualOverride ? (
                  <Badge className="text-ds-micro bg-purple-500/15 text-purple-300 border-purple-500/20">
                    Manual override
                  </Badge>
                ) : (
                  <span className="text-ds-label text-zinc-600">Auto</span>
                ),
            },
            {
              key: 'lastCalculated',
              label: 'Last Calculated',
              align: 'right',
              hideBelow: 'lg',
              render: ({ score }) => (
                <span className="font-mono text-ds-label text-zinc-500">
                  {new Date(score.lastCalculated).toLocaleDateString()}
                </span>
              ),
            },
          ]}
        />
      </Card>
      </>
      )}
      {activeTab === 'compare' && <ComparisonView rows={rows} onSelectBrand={function(id) { setSelectedId(id); }} />}
      {activeTab === 'simulator' && <WhatIfSimulator />}
      {activeTab === 'history' && <ScoreHistoryView rows={rows} />}
    </WorkspaceFrame>
  );
}

function DetailView({
  row,
  rows,
  onBack,
  onOverride,
}: {
  row: Row;
  rows?: Row[];
  onBack: () => void;
  onOverride: (track: FulfillmentTrack, reason: string) => void;
}) {
  const { score, brand } = row;
  const [overrideTrack, setOverrideTrack] = useState<FulfillmentTrack>(score.track);
  const [overrideReason, setOverrideReason] = useState(score.overrideReason ?? '');
  // §UI/UX Wave 2 — canonical chart tokens for the score radar.
  const CHART = useRechartsTokens();

  const borderline = isBorderline(score.totalScore) && !score.manualOverride;

  return (
    <div className="p-6 space-y-4 max-w-[1100px] mx-auto">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to list
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">
            {brand?.profile.businessName ?? score.brandId}
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {brand?.category ?? '—'} · Last calculated{' '}
            {new Date(score.lastCalculated).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {borderline && <NeedsReviewBadge />}
          <span className="font-mono text-3xl font-bold text-white">{score.totalScore}</span>
          <TrackBadge track={score.track} />
        </div>
      </div>

      {/* Score breakdown */}
      <Card title="Score Breakdown">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 p-1">
          <ScoreBar label="Trading history (years exporting)" value={score.tradingHistoryScore} max={20} />
          <ScoreBar label="Export experience (UK/EU + EORI)" value={score.exportExperienceScore} max={15} />
          <ScoreBar label="Scale (revenue / catalog size)" value={score.scaleScore} max={20} />
          <ScoreBar label="Working capital (30–90 day funding)" value={score.workingCapitalScore} max={20} />
          <ScoreBar label="Category risk" value={score.categoryRiskScore} max={15} />
          <ScoreBar label="Reliability (on-time ship rate)" value={score.reliabilityScore} max={10} />
        </div>
        {/* Radar chart */}
        {rows && rows.length > 0 && (function() {
          const radarData = [
            { component: 'History', value: score.tradingHistoryScore, fullMark: 20 },
            { component: 'Export', value: score.exportExperienceScore, fullMark: 15 },
            { component: 'Scale', value: score.scaleScore, fullMark: 20 },
            { component: 'Working Cap', value: score.workingCapitalScore, fullMark: 20 },
            { component: 'Category', value: score.categoryRiskScore, fullMark: 15 },
            { component: 'Reliability', value: score.reliabilityScore, fullMark: 10 },
          ];
          return (
            <div className="mt-4 border-t border-white/[0.06] pt-4">
              <h4 className="text-xs font-medium text-zinc-400 mb-3">Score Radar</h4>
              <ResponsiveContainer width="100%" height={240}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke={CHART.grid} />
                  <PolarAngleAxis dataKey="component" tick={{ fill: CHART.axis, fontSize: 10 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 20]} tick={{ fill: CHART.axis, fontSize: 9 }} />
                  <Radar name="Score" dataKey="value" stroke={CHART.palette[0]} fill={CHART.palette[0]} fillOpacity={0.3} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          );
        })()}
        {borderline && (
          <div className="mt-4 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-ds-label text-amber-200 flex items-start gap-2">
            <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            Score falls in the 55–74 borderline band — auto-assignment is held for
            manual review and batched into the daily digest rather than applied silently.
          </div>
        )}
      </Card>

      {/* Manual override */}
      <Card title="Manual Override">
        <div className="space-y-3">
          <p className="text-ds-label text-zinc-600">
            Overrides take precedence over the scoring engine and are logged to the
            audit trail.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <select
              value={overrideTrack}
              onChange={(e) => setOverrideTrack(e.target.value as FulfillmentTrack)}
              className="bg-ink-900 border border-white/[0.08] rounded-md px-2.5 py-2 text-xs text-white cursor-pointer"
            >
              <option value="direct_fulfillment">{fulfillmentTrackLabel('direct_fulfillment')}</option>
              <option value="financed">{fulfillmentTrackLabel('financed')}</option>
              <option value="unassigned">{fulfillmentTrackLabel('unassigned')}</option>
            </select>
            <input
              type="text"
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="Reason (required — logged to audit trail)"
              className="bg-ink-900 border border-white/[0.08] rounded-md px-2.5 py-2 text-xs text-white"
            />
          </div>
          <button
            onClick={() => onOverride(overrideTrack, overrideReason)}
            disabled={!overrideReason.trim()}
            className={cn(
              'text-xs font-medium px-4 py-2 rounded-lg transition-colors',
              overrideReason.trim()
                ? 'bg-brass-500 hover:bg-brass-400 text-white'
                : 'bg-white/[0.05] text-zinc-600 cursor-not-allowed'
            )}
          >
            Apply Override
          </button>
        </div>
      </Card>

      {/* Financing status — placeholders until a real PO-finance provider is wired */}
      {(row.score.track === 'financed' || score.track === 'financed') && (
        <Card title="Financing Status">
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Facility', value: 'PO Finance Facility A' },
              { label: 'Drawn Amount', value: '£—' },
              { label: 'Available Headroom', value: '£—' },
            ].map((f) => (
              <div key={f.label}>
                <div className="text-ds-micro text-zinc-600 font-medium mb-1">{f.label}</div>
                <div className="text-sm font-mono text-white">{f.value}</div>
              </div>
            ))}
          </div>
          <p className="text-ds-micro text-zinc-600 mt-3">
            Placeholder fields — a real PO-finance provider is not wired yet.
          </p>
        </Card>
      )}
    </div>
  );
}

/** Merge an admin override onto a base score row. */
function applyOverride(
  score: FulfillmentScore,
  override?: { track: FulfillmentTrack; reason: string }
): FulfillmentScore {
  if (!override) return score;
  return {
    ...score,
    track: override.track,
    manualOverride: true,
    overrideReason: override.reason,
  };
}

function ComparisonView({ rows, onSelectBrand }: { rows: Row[]; onSelectBrand: (id: string) => void }) {
  return (
    <Card title="Score Comparison">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] text-xs text-zinc-500">
              <th className="text-left font-medium px-3 py-2">Brand</th>
              <th className="text-right font-medium px-3 py-2">Total</th>
              <th className="text-right font-medium px-3 py-2">History</th><th className="text-right font-medium px-3 py-2">Export</th>
              <th className="text-right font-medium px-3 py-2">Scale</th><th className="text-right font-medium px-3 py-2">Working Cap</th>
              <th className="text-right font-medium px-3 py-2">Category</th><th className="text-right font-medium px-3 py-2">Reliability</th>
              <th className="text-left font-medium px-3 py-2">Track</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {rows.map(function({ score, brand }) {
              return (
                <tr key={score.brandId} onClick={function() { onSelectBrand(score.brandId); }}
                  className="hover:bg-white/[0.02] transition-colors cursor-pointer">
                  <td className="px-3 py-2 text-xs font-medium text-white">{brand?.profile.businessName ?? score.brandId}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs text-white">{score.totalScore}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs text-zinc-300">{score.tradingHistoryScore}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs text-zinc-300">{score.exportExperienceScore}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs text-zinc-300">{score.scaleScore}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs text-zinc-300">{score.workingCapitalScore}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs text-zinc-300">{score.categoryRiskScore}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs text-zinc-300">{score.reliabilityScore}</td>
                  <td className="px-3 py-2"><TrackBadge track={score.track} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function WhatIfSimulator() {
  const [inputs, setInputs] = useState<ScoreInputs>({
    yearsExporting: 3, priorUkEuExport: true, hasEori: true,
    annualRevenueGbp: 500000, catalogSize: 20,
    workingCapitalAnswer: 'partially', hazmatOrPerishableCategory: false,
  });
  const result = scoreBrand(inputs);
  const COMPONENTS = [
    { label: 'Trading History', value: result.components.tradingHistoryScore, max: 20 },
    { label: 'Export Experience', value: result.components.exportExperienceScore, max: 15 },
    { label: 'Scale', value: result.components.scaleScore, max: 20 },
    { label: 'Working Capital', value: result.components.workingCapitalScore, max: 20 },
    { label: 'Category Risk', value: result.components.categoryRiskScore, max: 15 },
    { label: 'Reliability', value: result.components.reliabilityScore, max: 10 },
  ];

  function set<K extends keyof ScoreInputs>(key: K, value: ScoreInputs[K]) {
    setInputs(function(prev) { return { ...prev, [key]: value }; });
  }

  return (
    <Card title="What-If Scoring Simulator" subtitle="Adjust inputs to see how the score changes">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-1">
        <div className="space-y-3">
          <div>
            <label className="text-ds-micro text-zinc-500 font-medium block mb-1">Years Exporting</label>
            <input type="number" value={inputs.yearsExporting} onChange={function(e) { set('yearsExporting', Number(e.target.value)); }}
              className="w-full bg-ink-900 border border-white/[0.08] rounded-md px-2.5 py-2 text-xs text-white" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={inputs.priorUkEuExport} onChange={function(e) { set('priorUkEuExport', e.target.checked); }} />
            <span className="text-xs text-zinc-300">Prior UK/EU export</span>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={inputs.hasEori} onChange={function(e) { set('hasEori', e.target.checked); }} />
            <span className="text-xs text-zinc-300">Has EORI number</span>
          </div>
          <div>
            <label className="text-ds-micro text-zinc-500 font-medium block mb-1">Annual Revenue (GBP)</label>
            <input type="number" value={inputs.annualRevenueGbp} onChange={function(e) { set('annualRevenueGbp', Number(e.target.value)); }}
              className="w-full bg-ink-900 border border-white/[0.08] rounded-md px-2.5 py-2 text-xs text-white" />
          </div>
          <div>
            <label className="text-ds-micro text-zinc-500 font-medium block mb-1">Catalog Size (SKUs)</label>
            <input type="number" value={inputs.catalogSize} onChange={function(e) { set('catalogSize', Number(e.target.value)); }}
              className="w-full bg-ink-900 border border-white/[0.08] rounded-md px-2.5 py-2 text-xs text-white" />
          </div>
          <div>
            <label className="text-ds-micro text-zinc-500 font-medium block mb-1">Working Capital</label>
            <select value={inputs.workingCapitalAnswer} onChange={function(e) { set('workingCapitalAnswer', e.target.value as any); }}
              className="w-full bg-ink-900 border border-white/[0.08] rounded-md px-2.5 py-2 text-xs text-white cursor-pointer">
              <option value="yes">Yes</option><option value="partially">Partially</option><option value="no">No</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={inputs.hazmatOrPerishableCategory} onChange={function(e) { set('hazmatOrPerishableCategory', e.target.checked); }} />
            <span className="text-xs text-zinc-300">Hazmat / perishable category</span>
          </div>
        </div>
        <div className="space-y-4">
          <div className="text-center">
            <div className="text-5xl font-bold text-white">{result.components.totalScore}</div>
            <div className="text-xs text-zinc-500 mt-1">Total Score</div>
            <div className="mt-2"><TrackBadge track={result.proposedTrack} /></div>
            {result.needsManualReview && <div className="mt-2 text-ds-micro text-amber-400">Borderline score — needs manual review</div>}
          </div>
          <div className="space-y-2">
            {COMPONENTS.map(function(c) {
              return (
                <div key={c.label}>
                  <div className="flex justify-between text-ds-micro mb-0.5">
                    <span className="text-zinc-500">{c.label}</span>
                    <span className="text-zinc-300 font-mono">{c.value}/{c.max}</span>
                  </div>
                  <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                    <div className="h-full bg-brass-500/70 rounded-full" style={{ width: (c.value / c.max * 100) + '%' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}

function ScoreHistoryView({ rows }: { rows: Row[] }) {
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const selected = rows.find(function(r) { return r.score.brandId === selectedBrandId; });
  if (!rows.length) {
    return <Card title="Score History"><p className="text-xs text-zinc-600 p-4">No score data available.</p></Card>;
  }
  return (
    <Card title="Score History" subtitle="Score changes tracked over time">
      <div className="space-y-3 p-1">
        <select value={selectedBrandId ?? ''} onChange={function(e) { setSelectedBrandId(e.target.value || null); }}
          className="bg-ink-900 border border-white/[0.08] rounded-md px-2.5 py-1.5 text-xs text-white cursor-pointer">
          <option value="">Select a brand...</option>
          {rows.map(function(r) {
            return <option key={r.score.brandId} value={r.score.brandId}>{r.brand?.profile.businessName ?? r.score.brandId}</option>;
          })}
        </select>
        {selected && (
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-white">{selected.brand?.profile.businessName ?? selected.score.brandId}</span>
                <span className="text-xs text-zinc-500 ml-2">{selected.brand?.category ?? ''}</span>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-white">{selected.score.totalScore}</div>
                <div className="text-ds-micro text-zinc-500">Last: {new Date(selected.score.lastCalculated).toLocaleDateString()}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-ds-micro">
              <div className="bg-ink-900 rounded p-2"><span className="text-zinc-500">Track:</span> <span className="text-white">{selected.score.track.replace(/_/g, ' ')}</span></div>
              <div className="bg-ink-900 rounded p-2"><span className="text-zinc-500">Override:</span> <span className="text-white">{selected.score.manualOverride ? 'Yes' : 'No'}</span></div>
              <div className="bg-ink-900 rounded p-2"><span className="text-zinc-500">History:</span> <span className="text-white">{selected.score.tradingHistoryScore}/20</span></div>
              <div className="bg-ink-900 rounded p-2"><span className="text-zinc-500">Export:</span> <span className="text-white">{selected.score.exportExperienceScore}/15</span></div>
              <div className="bg-ink-900 rounded p-2"><span className="text-zinc-500">Scale:</span> <span className="text-white">{selected.score.scaleScore}/20</span></div>
              <div className="bg-ink-900 rounded p-2"><span className="text-zinc-500">Working Cap:</span> <span className="text-white">{selected.score.workingCapitalScore}/20</span></div>
              <div className="bg-ink-900 rounded p-2"><span className="text-zinc-500">Category:</span> <span className="text-white">{selected.score.categoryRiskScore}/15</span></div>
              <div className="bg-ink-900 rounded p-2"><span className="text-zinc-500">Reliability:</span> <span className="text-white">{selected.score.reliabilityScore}/10</span></div>
            </div>
          </div>
        )}
        <p className="text-ds-micro text-zinc-600">Score history updates when "Bulk Recalculate" is run.</p>
      </div>
    </Card>
  );
}
