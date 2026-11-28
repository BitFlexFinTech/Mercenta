import { useEffect, useMemo, useState } from 'react';
import { fulfillmentTrackLabel } from '@/config/fulfillmentTrack';
import { applyFulfillmentOverride, recalculateAllScores } from '@/data/api';
import { useBrands, useFulfillmentScores } from '@/data/queries';
import { useRecordDeepLink } from '@/lib/runtime/recordDeepLink';
import { isBorderline, scoreBrand } from '@/lib/scoring';
import type { FulfillmentTrack } from '@/types';
import {
  FulfillmentTrackView,
  type FulfillmentRow,
  type FulfillmentTrackKey,
  type SimulatorInputState,
  type SimulatorOutputState,
} from './FulfillmentTrackView';

export function FulfillmentTrackScreen() {
  const brandsQuery = useBrands();
  const scoresQuery = useFulfillmentScores();

  const [overrides, setOverrides] = useState<
    Record<string, { track: FulfillmentTrack; reason: string }>
  >({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [trackFilter, setTrackFilter] = useState<FulfillmentTrackKey | 'all'>('all');
  const [minScore, setMinScore] = useState('');
  const [maxScore, setMaxScore] = useState('');
  const [recalcMessage, setRecalcMessage] = useState<string | null>(null);
  const [simInputs, setSimInputs] = useState<SimulatorInputState>({
    yearsExporting: 3,
    priorUkEuExport: true,
    hasEori: true,
    annualRevenueGbp: 500000,
    catalogSize: 20,
    workingCapitalAnswer: 'partially',
    hazmatOrPerishableCategory: false,
  });

  const rows: FulfillmentRow[] = useMemo(() => {
    const brands = brandsQuery.data?.data ?? [];
    const scores = scoresQuery.data?.data ?? [];
    return scores.map((rawScore) => {
      const ov = overrides[rawScore.brandId];
      const score = ov
        ? { ...rawScore, track: ov.track, manualOverride: true, overrideReason: ov.reason }
        : rawScore;
      const brand = brands.find((b) => b.id === score.brandId);
      return {
        brandId: score.brandId,
        brandName: brand?.profile.businessName ?? score.brandId,
        category: brand?.category ?? '—',
        totalScore: score.totalScore,
        track: score.track as FulfillmentTrackKey,
        trackLabel: fulfillmentTrackLabel(score.track),
        manualOverride: Boolean(score.manualOverride),
        overrideReason: score.overrideReason,
        borderline: isBorderline(score.totalScore) && !score.manualOverride,
        lastCalculated: new Date(score.lastCalculated).toLocaleDateString('en-GB'),
        tradingHistoryScore: score.tradingHistoryScore,
        exportExperienceScore: score.exportExperienceScore,
        scaleScore: score.scaleScore,
        workingCapitalScore: score.workingCapitalScore,
        categoryRiskScore: score.categoryRiskScore,
        reliabilityScore: score.reliabilityScore,
      };
    });
  }, [brandsQuery.data, scoresQuery.data, overrides]);

  const deepLinkScore = useRecordDeepLink('score');
  useEffect(() => {
    if (!deepLinkScore) return;
    if (rows.some((r) => r.brandId === deepLinkScore)) setSelectedId(deepLinkScore);
  }, [deepLinkScore, rows]);

  const filteredRows = useMemo(
    () =>
      rows.filter((r) => {
        if (trackFilter !== 'all' && r.track !== trackFilter) return false;
        if (minScore !== '' && r.totalScore < Number(minScore)) return false;
        if (maxScore !== '' && r.totalScore > Number(maxScore)) return false;
        return true;
      }),
    [rows, trackFilter, minScore, maxScore]
  );

  const simulatorOutput: SimulatorOutputState = useMemo(() => {
    const res = scoreBrand(simInputs);
    return {
      totalScore: res.components.totalScore,
      proposedTrack: res.proposedTrack as FulfillmentTrackKey,
      proposedTrackLabel: fulfillmentTrackLabel(res.proposedTrack),
      needsManualReview: res.needsManualReview,
      components: [
        { label: 'Trading History', value: res.components.tradingHistoryScore, max: 20 },
        { label: 'Export Experience', value: res.components.exportExperienceScore, max: 15 },
        { label: 'Scale', value: res.components.scaleScore, max: 20 },
        { label: 'Working Capital', value: res.components.workingCapitalScore, max: 20 },
        { label: 'Category Risk', value: res.components.categoryRiskScore, max: 15 },
        { label: 'Reliability', value: res.components.reliabilityScore, max: 10 },
      ],
    };
  }, [simInputs]);

  const errorObj = brandsQuery.error || scoresQuery.error;
  const error =
    errorObj instanceof Error ? errorObj.message : errorObj ? 'Failed to load fulfillment tracks.' : null;

  return (
    <FulfillmentTrackView
      loading={brandsQuery.isPending || scoresQuery.isPending}
      error={error}
      onRetry={() => {
        void brandsQuery.refetch();
        void scoresQuery.refetch();
      }}
      rows={rows}
      filteredRows={filteredRows}
      trackFilter={trackFilter}
      onTrackFilterChange={setTrackFilter}
      minScore={minScore}
      onMinScoreChange={setMinScore}
      maxScore={maxScore}
      onMaxScoreChange={setMaxScore}
      recalcMessage={recalcMessage}
      onBulkRecalculate={() => {
        const res = recalculateAllScores();
        setRecalcMessage(`Recalculated ${res.updated} brand score(s).`);
        void scoresQuery.refetch();
      }}
      selectedRow={rows.find((r) => r.brandId === selectedId) ?? null}
      onSelectRow={setSelectedId}
      onApplyOverride={(brandId, track, reason) => {
        void applyFulfillmentOverride(brandId, track, reason).then(() => {
          setOverrides((prev) => ({ ...prev, [brandId]: { track, reason } }));
          setRecalcMessage(`Override applied for ${brandId}.`);
        });
      }}
      simulatorInputs={simInputs}
      onSimulatorInputsChange={setSimInputs}
      simulatorOutput={simulatorOutput}
      trackOptions={[
        { value: 'direct_fulfillment', label: fulfillmentTrackLabel('direct_fulfillment') },
        { value: 'financed', label: fulfillmentTrackLabel('financed') },
        { value: 'unassigned', label: fulfillmentTrackLabel('unassigned') },
      ]}
    />
  );
}
