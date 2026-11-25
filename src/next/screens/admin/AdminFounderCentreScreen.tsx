/**
 * §WAVE 3k (2026-11-25) — FOUNDER INVESTOR CENTRE (data).
 *
 * Every figure here already has an owner, and this screen re-derives NONE of them:
 *   · the founder's funding opportunities and their application pipeline —
 *     `src/lib/founder/fundingPipeline.ts` (the three REAL opportunities the founder
 *     intends to work, each stating its claim class, plus the stage record);
 *   · the capital requirement, the financing router and the pitch workspace — read
 *     from the platform's ONE derived model (`buildControlCentre`), because the mapping
 *     "which Model B purchases are financed, and at what cost" lives in that owner and
 *     duplicating it here would create a second definition of the same numbers.
 *
 * SUPER-ADMIN ONLY (`founder_centre` is in `SUPER_ADMIN_ONLY_ADMIN_IDS`): the capital
 * case is internal and is never shown to a brand. Nothing here claims a submission, an
 * approval or a verified term that has not actually been recorded.
 */
import { useMemo } from 'react';
import { useCanonicalStoreVersion } from '@/data/queries';
import {
  FOUNDER_FUNDING_OPPORTUNITIES,
  FUNDING_APPLICATION_STAGES,
  FUNDING_STAGE_LABELS,
  POST_SUBMISSION_STAGES,
  FUNDING_PIPELINE_DISCLAIMER,
  FUNDING_SUBMISSION_IS_A_FOUNDER_ACTION,
  FUNDING_GENERATION_IS_AUTOMATED,
  getFundingPipeline,
  fundingPipelineSummary,
  type FounderFundingOpportunity,
  type FundingPipelineEntry,
  type FundingPipelineSummary,
} from '@/lib/founder/fundingPipeline';
import { buildControlCentre } from '@/lib/commandCentre/controlCentre';
import type { CapitalRequirement } from '@/lib/finance/capitalRequirement';
import type { FinancingRoutingSummary } from '@/lib/finance/financingRouter';
import type { PitchWorkspaceSummary } from '@/lib/finance/pitchWorkspace';
import { AdminFounderCentreView } from './AdminFounderCentreView';

export interface FounderCentreModel {
  opportunities: readonly FounderFundingOpportunity[];
  pipeline: FundingPipelineEntry[];
  summary: FundingPipelineSummary;
  stages: readonly string[];
  stageLabels: Record<string, string>;
  postSubmissionStages: readonly string[];
  submissionIsAFounderAction: boolean;
  generationIsAutomated: boolean;
  disclaimer: string;
  capitalRequirement: CapitalRequirement;
  financingRouting: FinancingRoutingSummary;
  pitchWorkspace: PitchWorkspaceSummary;
}

export function AdminFounderCentreScreen({ onNavigate }: { onNavigate: (viewId: string) => void }) {
  const canonicalVersion = useCanonicalStoreVersion();

  const model = useMemo<FounderCentreModel>(() => {
    void canonicalVersion; // re-derived whenever a canonical record changes
    const derived = buildControlCentre();
    return {
      opportunities: FOUNDER_FUNDING_OPPORTUNITIES,
      pipeline: getFundingPipeline(),
      summary: fundingPipelineSummary(),
      stages: FUNDING_APPLICATION_STAGES,
      stageLabels: FUNDING_STAGE_LABELS as Record<string, string>,
      postSubmissionStages: POST_SUBMISSION_STAGES,
      submissionIsAFounderAction: FUNDING_SUBMISSION_IS_A_FOUNDER_ACTION,
      generationIsAutomated: FUNDING_GENERATION_IS_AUTOMATED,
      disclaimer: FUNDING_PIPELINE_DISCLAIMER,
      capitalRequirement: derived.capitalRequirement,
      financingRouting: derived.financingRouting,
      pitchWorkspace: derived.pitchWorkspace,
    };
  }, [canonicalVersion]);

  return <AdminFounderCentreView model={model} onNavigate={onNavigate} />;
}
