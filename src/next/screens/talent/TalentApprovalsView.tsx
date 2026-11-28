/**
 * §TALENT APPROVALS — ONE READ-ONLY VERIFICATION TAB (2026-11-28).
 *
 * The previous version had four tabs — submissions, listings, compliance documents and
 * purchase-order drafts — with poll/review/approve/reject actions. The CAA-TalAg dataset
 * contains NONE of those record types and no write store, so every action would have been
 * a control that changed nothing.
 *
 * The owner's decision: remove the three source-less tabs and all write controls, keep ONE
 * Verification tab showing `SourceVerificationStamp` (tier, confidence, unresolved fields,
 * date checked) as read-only, keep the metrics panel, and say plainly on screen that
 * approval workflows are not available here.
 */
import { NoticeBanner, SectionCard } from '@/next/components/ConsoleCharts';
import {
  ConsoleTable,
  EmptyStateBlock,
  ErrorStateBlock,
  InlineStatus,
  LoadingRows,
  MetricStrip,
  PageHeader,
  type ConsoleColumn,
  type MetricItem,
  type SemanticTone,
} from '@/next/components/ConsolePrimitives';

/** The only tab that has a source. The type is kept narrow on purpose. */
export type ApprovalQueueTab = 'verification';

export interface ApprovalVerificationRow {
  id: string;
  /** What the stamp verifies: a brand or a discovered product. */
  subject: string;
  subjectKind: 'Brand' | 'Product';
  /** `verification.verificationTier`. */
  tier: string;
  tierTone: SemanticTone;
  /** `verification.confidence`. */
  confidence: string;
  /** `verification.unknownFields.length`. */
  unknownFieldCount: number;
  /** `verification.dateChecked`. */
  dateChecked: string;
  /** `verification.evidenceSummary`. */
  evidenceSummary: string;
}

export interface TalentApprovalsViewProps {
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  activeTab: ApprovalQueueTab;
  onTabChange: (tab: ApprovalQueueTab) => void;
  metrics: MetricItem[];
  stamps: ApprovalVerificationRow[];
}

function tierTone(tier: string): SemanticTone {
  if (/primary|verified|high/i.test(tier)) return 'success';
  if (/secondary|medium|partial/i.test(tier)) return 'warning';
  return 'neutral';
}

const columns: ConsoleColumn<ApprovalVerificationRow>[] = [
  {
    key: 'subject',
    header: 'Subject',
    render: (r) => (
      <div>
        <div className="font-medium text-ink-950">{r.subject}</div>
        <div className="text-[12px] text-faint">{r.subjectKind}</div>
      </div>
    ),
  },
  {
    key: 'tier',
    header: 'Verification Tier (read-only)',
    render: (r) => <InlineStatus label={r.tier} tone={r.tierTone} />,
  },
  {
    key: 'confidence',
    header: 'Confidence',
    render: (r) => <span className="text-[12px] text-secondary">{r.confidence}</span>,
  },
  {
    key: 'unknown',
    header: 'Unresolved Fields',
    align: 'right',
    render: (r) => <span className="font-mono tabular-nums">{r.unknownFieldCount}</span>,
  },
  {
    key: 'date',
    header: 'Date Checked',
    render: (r) => <span className="text-[12px] text-secondary">{r.dateChecked}</span>,
  },
  {
    key: 'evidence',
    header: 'Evidence',
    hideOnMobile: true,
    render: (r) => <span className="text-[12px] text-ink-600">{r.evidenceSummary}</span>,
  },
];

export function TalentApprovalsView({
  loading,
  error,
  onRetry,
  activeTab,
  onTabChange,
  metrics,
  stamps,
}: TalentApprovalsViewProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Approvals & Verification"
        description="The verification stamps recorded in the CAA-TalAg dataset, shown exactly as the source publishes them."
        meta={<span>Talent Commerce · CAA-TalAg dataset</span>}
      />

      <NoticeBanner
        tone="info"
        title="Read-only"
        message="Approval workflows are not available in the Talent Commerce workspace. Verification stamps are read-only — there is no approve, reject, poll or publish action here."
      />

      {loading ? (
        <LoadingRows rows={6} />
      ) : error ? (
        <ErrorStateBlock message={error} onRetry={onRetry} />
      ) : (
        <>
          <MetricStrip items={metrics} columns={4} />

          <div className="flex flex-wrap items-center gap-2 border-b border-hairline" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'verification'}
              onClick={() => onTabChange('verification')}
              className={`px-3 py-2 text-[13px] font-medium border-b-2 -mb-px ${
                activeTab === 'verification'
                  ? 'border-[var(--mr-accent)] text-ink-950'
                  : 'border-transparent text-faint hover:text-ink-800'
              }`}
            >
              Verification
            </button>
          </div>

          <SectionCard
            title="Verification stamps"
            description="Tier, confidence and unresolved-field count come from each record's own SourceVerificationStamp."
          >
            <ConsoleTable
              rows={stamps}
              columns={columns}
              rowKey={(r) => r.id}
              emptyTitle="No verification stamps"
              emptyDescription="The CAA-TalAg dataset contains no verification stamps."
            />
          </SectionCard>

          <SectionCard title="Not available in this workspace" description="Stated rather than faked.">
            <ul className="text-[13px] text-ink-600 space-y-1 list-disc pl-5">
              <li>Product submissions — no submission records in the dataset.</li>
              <li>Listing recommendations — no recommendation records in the dataset.</li>
              <li>Compliance documents — the dataset holds verification stamps, not documents.</li>
              <li>Purchase-order drafts — no purchase orders exist in this vertical.</li>
            </ul>
          </SectionCard>
        </>
      )}
    </div>
  );
}