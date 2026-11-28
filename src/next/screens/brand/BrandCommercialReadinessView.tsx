import {
  EmptyStateBlock,
  ErrorStateBlock,
  InlineStatus,
  LoadingRows,
  MetricStrip,
  type MetricItem,
} from '@/next/components/ConsolePrimitives';
import { ConsolePageHeader } from '@/next/components/ConsolePageHeader';
import { NoticeBanner, SectionCard } from '@/next/components/ConsoleCharts';
import type {
  CommercialConditionId,
  CommercialTermFieldId,
  CommercialValueBasis,
  CommercialViabilityRoute,
} from '@/config/commercialReadiness';
import type { CommercialReadinessRecord } from '@/types';

export interface BrandActionFieldView {
  field: CommercialTermFieldId;
  label: string;
  what: string;
  action: string;
  becauseOf: CommercialConditionId[];
  confirmExisting: boolean;
  currentValue: number | string | null;
}

export interface BrandReadinessReasonView {
  label: string;
  what: string;
  why: string;
  action: string;
  articleId: string;
  articleTitle: string;
}

export interface BrandReadinessRowView {
  record: CommercialReadinessRecord;
  headline: string;
  explanation: string;
  nextStep: string;
  reasons: BrandReadinessReasonView[];
  fields: BrandActionFieldView[];
  progressSatisfied: number;
  progressTotal: number;
  progressPercent: number;
}

export interface BrandCommercialReadinessViewProps {
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  rows: BrandReadinessRowView[];
  totals: { total: number; ready: number; action: number };
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
  drafts: Record<string, { value: string; basis: CommercialValueBasis }>;
  onChangeDraft: (
    key: string,
    patch: Partial<{ value: string; basis: CommercialValueBasis }>
  ) => void;
  onSubmitField: (record: CommercialReadinessRecord, field: CommercialTermFieldId) => void;
  notice: string | null;
  disclaimer: string;
}

const ROUTE_TONE: Record<CommercialViabilityRoute, 'success' | 'warning' | 'danger' | 'info'> = {
  ready: 'success',
  remediation: 'warning',
  blocked: 'danger',
  human_review: 'info',
};

const BASIS_OPTIONS: { id: CommercialValueBasis; label: string }[] = [
  { id: 'actual', label: 'Actual figure we can evidence' },
  { id: 'observed', label: 'Observed in the market' },
  { id: 'estimated', label: 'Our estimate' },
];

export function BrandCommercialReadinessView({
  loading,
  error,
  onRetry,
  rows,
  totals,
  expandedId,
  onToggleExpand,
  drafts,
  onChangeDraft,
  onSubmitField,
  notice,
  disclaimer,
}: BrandCommercialReadinessViewProps) {
  const metrics: MetricItem[] = [
    {
      id: 'assessed',
      label: 'Products assessed',
      value: String(totals.total),
      context: 'Tenant commercial evaluations',
    },
    {
      id: 'ready',
      label: 'Commercially ready',
      value: String(totals.ready),
      context: 'Passed all active checks',
    },
    {
      id: 'action',
      label: 'Needs your input',
      value: String(totals.action),
      context: 'Supply or confirm terms',
    },
  ];

  return (
    <div className="space-y-6" data-testid="brand-commercial-readiness">
      <ConsolePageHeader
        title="Commercial Readiness"
        description="What Mercenta needs in order to assess each product commercially, why it is needed, and how to update assumptions. Nothing here is a promise of an order."
      />

      <MetricStrip items={metrics} columns={3} loading={loading} />

      {notice && (
        <NoticeBanner tone="info" title="Assessment update" message={notice} />
      )}

      {error && <ErrorStateBlock message={error} onRetry={onRetry} />}

      {!error && loading && <LoadingRows rows={4} label="Loading commercial assessments…" />}

      {!error && !loading && rows.length === 0 && (
        <EmptyStateBlock
          title="No product has been commercially assessed yet"
          description="When Mercenta assesses a product for commercial readiness it appears here with the exact terms needed from your team."
        />
      )}

      {!error && !loading && rows.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3" data-testid="brand-commercial-product-list">
            {rows.map((row) => {
              const r = row.record;
              const open = expandedId === r.id;
              return (
                <div
                  key={r.id}
                  data-testid="brand-commercial-product"
                  className="border border-hairline bg-surface-raised rounded-md overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => onToggleExpand(r.id)}
                    aria-expanded={open}
                    className="w-full px-4 py-3 flex items-start justify-between gap-4 text-left hover:bg-surface/70 focus-visible:outline-2 focus-visible:outline-[var(--mr-accent)]"
                  >
                    <div className="min-w-0">
                      <div className="text-[14px] font-semibold text-ink-950 truncate">
                        {r.productLabel ?? r.id}
                      </div>
                      <div className="mt-0.5 text-[12px] text-ink-600 tabular-nums font-mono">
                        {row.progressSatisfied} of {row.progressTotal} checks passed · {row.progressPercent}%
                      </div>
                    </div>
                    <div className="shrink-0" data-testid="brand-commercial-route" data-route={r.route}>
                      <InlineStatus label={row.headline} tone={ROUTE_TONE[r.route]} />
                    </div>
                  </button>

                  <div className="border-t border-hairline px-4 py-3 space-y-4">
                    <p className="text-[12px] text-secondary">{row.explanation}</p>

                    {open && (
                      <div className="space-y-4 pt-2 border-t border-hairline">
                        {row.reasons.length > 0 && (
                          <div data-testid="brand-commercial-guidance" className="space-y-2">
                            <h3 className="text-[11px] font-medium uppercase tracking-[0.06em] text-faint">
                              What Mercenta needs, and why
                            </h3>
                            <ul className="space-y-2">
                              {row.reasons.map((reason) => (
                                <li
                                  key={reason.label}
                                  className="rounded border border-hairline bg-surface/70 p-3 text-[12px] space-y-1"
                                >
                                  <div className="font-semibold text-ink-950">{reason.label}</div>
                                  <p className="text-secondary">{reason.what}</p>
                                  <p className="text-ink-600">{reason.why}</p>
                                  <div className="text-[11px] text-[var(--mr-accent)] font-medium">
                                    Guide: {reason.articleTitle}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {row.fields.length === 0 ? (
                          <p className="text-[12px] text-state-success font-medium">
                            Nothing is needed from you right now.
                          </p>
                        ) : (
                          <div data-testid="brand-commercial-missing" className="space-y-3">
                            <h3 className="text-[11px] font-medium uppercase tracking-[0.06em] text-faint">
                              Your actions
                            </h3>
                            <ul className="space-y-3">
                              {row.fields.map((f) => {
                                const key = `${r.id}|${f.field}`;
                                const draft = drafts[key] ?? {
                                  value: f.currentValue != null ? String(f.currentValue) : '',
                                  basis: 'actual' as CommercialValueBasis,
                                };
                                return (
                                  <li
                                    key={f.field}
                                    data-testid={`brand-commercial-field-${f.field}`}
                                    className="rounded border border-hairline p-3 space-y-2"
                                  >
                                    <div className="text-[12px] font-medium text-ink-950">{f.what}</div>
                                    <div className="text-[12px] text-ink-600">{f.action}</div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <input
                                        aria-label={f.label}
                                        value={draft.value}
                                        onChange={(e) => onChangeDraft(key, { value: e.target.value })}
                                        placeholder="Enter value…"
                                        data-testid={`brand-commercial-input-${f.field}`}
                                        className="w-36 px-2.5 py-1.5 rounded border border-hairline-strong bg-surface-raised text-[12px] text-ink-950 tabular-nums"
                                      />
                                      <select
                                        aria-label={`${f.label} basis`}
                                        value={draft.basis}
                                        onChange={(e) =>
                                          onChangeDraft(key, {
                                            basis: e.target.value as CommercialValueBasis,
                                          })
                                        }
                                        data-testid={`brand-commercial-basis-${f.field}`}
                                        className="px-2.5 py-1.5 rounded border border-hairline-strong bg-surface-raised text-[12px] text-ink-950"
                                      >
                                        {BASIS_OPTIONS.map((o) => (
                                          <option key={o.id} value={o.id}>
                                            {o.label}
                                          </option>
                                        ))}
                                      </select>
                                      <button
                                        type="button"
                                        onClick={() => onSubmitField(r, f.field)}
                                        data-testid={`brand-commercial-submit-${f.field}`}
                                        className="px-3 py-1.5 rounded bg-[var(--mr-accent)] text-on-dark text-[12px] font-medium hover:bg-[var(--mr-accent-600)]"
                                      >
                                        Submit for reassessment
                                      </button>
                                    </div>
                                    {f.confirmExisting && (
                                      <p className="text-[11px] text-state-warning">
                                        Mercenta currently holds this as an assumption. Please confirm the actual figure.
                                      </p>
                                    )}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        )}

                        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-hairline text-[12px]">
                          <div>
                            <dt className="text-[11px] uppercase tracking-[0.06em] text-faint">Status</dt>
                            <dd className="mt-0.5 font-medium text-ink-950">{row.headline}</dd>
                          </div>
                          <div>
                            <dt className="text-[11px] uppercase tracking-[0.06em] text-faint">Next step</dt>
                            <dd className="mt-0.5 text-secondary">{row.nextStep}</dd>
                          </div>
                          <div>
                            <dt className="text-[11px] uppercase tracking-[0.06em] text-faint">Checks</dt>
                            <dd className="mt-0.5 font-mono tabular-nums text-ink-950">
                              {row.progressSatisfied}/{row.progressTotal}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-[11px] uppercase tracking-[0.06em] text-faint">Updated</dt>
                            <dd className="mt-0.5 font-mono tabular-nums text-secondary">{r.updatedAt}</dd>
                          </div>
                        </dl>
                        <p className="text-[11px] text-faint">{r.moqDisclaimer}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <p className="text-[11px] text-faint pt-1" data-testid="brand-commercial-disclaimer">
              {disclaimer}
            </p>
          </div>

          <div>
            <SectionCard title="How this works">
              <ol className="space-y-2 text-[12px] text-secondary">
                <li>1. Learn — every field links to a verified guidance topic.</li>
                <li>2. Understand — Mercenta explains which condition requires the term.</li>
                <li>3. Do — supply or confirm the actual or estimated figure.</li>
                <li>4. Validate — deterministic readiness checks run immediately on save.</li>
                <li>5. Complete — outcome and next step update without guesswork.</li>
              </ol>
            </SectionCard>
          </div>
        </div>
      )}
    </div>
  );
}
