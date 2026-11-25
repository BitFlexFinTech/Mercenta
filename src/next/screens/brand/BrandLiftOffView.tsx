import { CheckCircle2, Circle } from 'lucide-react';
import {
  LoadingRows,
  MetricStrip,
  ConsoleHeader,
  type MetricItem,
} from '@/next/components/ConsolePrimitives';
import { SectionCard } from '@/next/components/ConsoleCharts';
import type { LiftOffTerm } from '@/config/liftOff';
import type { LiftOffEligibilityResult } from '@/lib/liftOff/eligibility';

export interface BrandLiftOffViewProps {
  loading: boolean;
  wordmark: string;
  summary: string;
  terms: readonly LiftOffTerm[];
  verificationNote: string;
  termsVerified: boolean;
  statusLabel: string;
  eligibility: LiftOffEligibilityResult;
  comparison: {
    programme: { label: string; for: string; gets: string };
    distribution: { label: string; for: string; gets: string };
  };
  onOpenCases?: () => void;
}

export function BrandLiftOffView({
  loading,
  wordmark,
  summary,
  terms,
  verificationNote,
  termsVerified,
  statusLabel,
  eligibility,
  comparison,
  onOpenCases,
}: BrandLiftOffViewProps) {
  const metrics: MetricItem[] = [
    {
      id: 'programme',
      label: 'Programme status',
      value: statusLabel,
      context: wordmark,
    },
    {
      id: 'eligibility',
      label: 'Criteria satisfied',
      value: loading ? '…' : `${eligibility.met} / ${eligibility.total}`,
      context: eligibility.eligible ? 'Eligible for launch intake' : 'Additional steps pending',
    },
    {
      id: 'terms',
      label: 'Channel terms verification',
      value: termsVerified ? 'Verified' : 'Checked per launch',
      context: 'Fail-closed programme terms',
    },
  ];

  return (
    <div className="space-y-6" data-testid="lift-off-brand-section">
      <ConsoleHeader
        title={wordmark}
        description={summary}
        actions={
          onOpenCases ? (
            <button
              type="button"
              onClick={onOpenCases}
              className="px-3.5 py-2 rounded-ds-md bg-accent text-white text-ds-label font-medium hover:bg-accent-600"
            >
              Request Launch via Support
            </button>
          ) : undefined
        }
      />

      <MetricStrip items={metrics} columns={3} loading={loading} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="How the programme works" description={verificationNote}>
            <ul className="divide-y divide-zinc-200">
              {terms.map((t) => (
                <li key={t.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-ds-body font-medium text-zinc-950">{t.label}</span>
                    {t.basis === 'requires_verification' && (
                      <span className="text-ds-micro font-medium text-state-warning">
                        Checked per launch
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-ds-label text-zinc-600">{t.detail}</p>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard title="Lift Off vs Managed UK Distribution">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[comparison.programme, comparison.distribution].map((item) => (
                <div key={item.label} className="rounded-ds-sm border border-zinc-200 p-4 space-y-1.5">
                  <div className="text-ds-micro font-mono uppercase tracking-[0.06em] text-accent">
                    {item.label}
                  </div>
                  <div className="text-ds-body font-medium text-zinc-950">{item.for}</div>
                  <p className="text-ds-label text-zinc-600">{item.gets}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        <div data-testid="lift-off-eligibility">
          <SectionCard
            title="Eligibility checklist"
            description="Evaluated deterministically from your category, catalogue, compliance gate, and commercial model."
          >
            {loading ? (
              <LoadingRows rows={4} label="Checking Lift Off criteria…" />
            ) : (
              <div className="space-y-3">
                <p className="text-ds-label text-zinc-700 font-medium">
                  {eligibility.met} of {eligibility.total} criteria met.{' '}
                  {eligibility.eligible
                    ? 'Your brand satisfies every criterion Mercenta can check.'
                    : 'Complete remaining criteria to unlock Lift Off intake.'}
                </p>
                <ul className="space-y-2.5">
                  {eligibility.outcomes.map(({ rule, state }) => (
                    <li key={rule.id} className="flex items-start gap-2.5 text-ds-label">
                      {state === 'met' ? (
                        <CheckCircle2 className="w-4 h-4 text-state-success shrink-0 mt-0.5" aria-hidden="true" />
                      ) : (
                        <Circle className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" aria-hidden="true" />
                      )}
                      <div>
                        <div className={state === 'met' ? 'font-medium text-zinc-950' : 'text-zinc-700'}>
                          {rule.label}
                        </div>
                        <p className="text-ds-micro text-zinc-500 mt-0.5">{rule.detail}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
