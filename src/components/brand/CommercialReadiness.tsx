/**
 * §Phase 2 §12/§18 — BRAND COMMERCIAL READINESS.
 *
 * The customer-facing half of the commercial readiness journey. It shows the
 * brand ONLY what it needs:
 *
 *   LEARN      → what the concept is, with the real Knowledge Base article,
 *   UNDERSTAND → why Mercenta is asking (the condition that produced it),
 *   DO         → supply or confirm the value,
 *   VALIDATE   → the record is reassessed through the ONE deterministic gate,
 *   COMPLETE   → the outcome, and what happens next.
 *
 * It NEVER shows internal BI scores, founder-only intelligence, risk notes,
 * another tenant's data or an invented threshold. Tenant isolation is enforced
 * by `useCommercialReadiness({ kind: 'brand', tenantId })`, which is the SAME
 * visibility rule the pre-audit and routing stores use.
 */
import { useMemo, useState } from 'react';
import { Button, EmptyState, StatusBadge, type StatusTone } from '@/components/ui';
import {
  ContextPanel,
  RecordFieldList,
  WorkspaceFrame,
  WorkspaceGrid,
  WorkspaceHeader,
  WorkspaceSection,
} from '@/components/shared/workspace';
import { useApp } from '@/context/GlobalStateContext';
import { useCommercialReadiness } from '@/lib/commercial/useCommercialReadiness';
import { brandActionFields, brandOutcomeSummary, brandProgress } from '@/lib/commercial/brandGuidance';
import { submitCommercialTermsAndReassess } from '@/lib/commercial/commercialReadinessRecorder';
import { COMMERCIAL_BRAND_OUTCOME_DISCLAIMER } from '@/config/commercialReadiness';
import { getKnowledgeArticle } from '@/data/knowledgeBase';
import type { CommercialReadinessRecord } from '@/types';
import type {
  CommercialTermFieldId,
  CommercialValueBasis,
  CommercialViabilityRoute,
} from '@/config/commercialReadiness';

const ROUTE_TONE: Record<CommercialViabilityRoute, StatusTone> = {
  ready: 'success',
  remediation: 'warning',
  blocked: 'danger',
  human_review: 'info',
};

const BASIS_OPTIONS: { id: CommercialValueBasis; label: string }[] = [
  { id: 'actual', label: 'An actual figure we can evidence' },
  { id: 'observed', label: 'Observed in the market' },
  { id: 'estimated', label: 'Our estimate' },
];

export function CommercialReadiness() {
  const { session } = useApp();
  const tenantId = session?.tenantId ?? null;
  const records = useCommercialReadiness({ kind: 'brand', tenantId: tenantId ?? '__none__' });

  const [expanded, setExpanded] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { value: string; basis: CommercialValueBasis }>>({});
  const [notice, setNotice] = useState<string | null>(null);

  const totals = useMemo(() => {
    const ready = records.filter((r) => r.route === 'ready').length;
    const action = records.filter((r) => brandActionFields(r).length > 0).length;
    return { total: records.length, ready, action };
  }, [records]);

  const setDraft = (key: string, patch: Partial<{ value: string; basis: CommercialValueBasis }>) =>
    setDrafts((d) => {
      const current = d[key] ?? { value: '', basis: 'actual' as CommercialValueBasis };
      return { ...d, [key]: { ...current, ...patch } };
    });

  const submit = (record: CommercialReadinessRecord, field: CommercialTermFieldId) => {
    const key = `${record.id}|${field}`;
    const draft = drafts[key];
    const raw = draft?.value?.trim() ?? '';
    if (raw === '') {
      setNotice('Enter the value before submitting.');
      return;
    }
    const numeric = Number(raw);
    const outcome = submitCommercialTermsAndReassess(
      record.id,
      [{ field, value: Number.isNaN(numeric) ? raw : numeric, basis: draft?.basis ?? 'actual' }],
      `brand:${tenantId ?? 'unknown'}`
    );
    if (!outcome.submission.ok) {
      setNotice(outcome.submission.reason);
      return;
    }
    const nextRoute = outcome.reassessment?.write.record.route ?? record.route;
    setNotice(
      nextRoute === record.route
        ? 'Saved. Mercenta has reassessed this product; the status is unchanged for now.'
        : `Saved. Mercenta has reassessed this product — the status is now ${nextRoute.replace('_', ' ')}.`
    );
    setDrafts((d) => {
      const copy = { ...d };
      delete copy[key];
      return copy;
    });
  };

  return (
    <WorkspaceFrame>
      <WorkspaceHeader
        eyebrow="Catalogue · Commercial readiness"
        title="Commercial readiness"
        description="What Mercenta needs in order to assess each of your products commercially, why it is needed, and what to do about it. Nothing here is a promise of an order."
        meta={
          <>
            <span className="text-ds-label text-zinc-500">{totals.total} product(s) assessed</span>
            <span className="text-ds-label text-zinc-500">{totals.ready} commercially ready</span>
            <span className="text-ds-label text-zinc-500">{totals.action} needing your information</span>
          </>
        }
      />

      {notice && (
        <div
          className="rounded-ds-lg border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-ds-label text-zinc-200"
          data-testid="brand-commercial-notice"
          role="status"
        >
          {notice}
        </div>
      )}

      <WorkspaceGrid
        rail={
          <ContextPanel title="How this works">
            <ol className="space-y-1.5 text-ds-label text-zinc-400">
              <li>1. Learn — every field links to a short guide.</li>
              <li>2. Understand — Mercenta shows why it is asking.</li>
              <li>3. Do — add or confirm the figure.</li>
              <li>4. Validate — the checks run automatically when you save.</li>
              <li>5. Complete — you are told the outcome and the next step.</li>
            </ol>
          </ContextPanel>
        }
      >
        <div data-testid="brand-commercial-readiness">
          <WorkspaceSection
            title="Your products"
            description="Each product shows its commercial status, what is needed, and what happens next."
            domain="catalogue"
          >
            {records.length === 0 ? (
              <EmptyState
                title="No product has been commercially assessed yet"
                description="When Mercenta assesses a product for commercial readiness it appears here, with exactly what is needed from you."
              />
            ) : (
              <ul className="space-y-3" data-testid="brand-commercial-product-list">
                {records.map((r) => {
                  const summary = brandOutcomeSummary(r);
                  const fields = brandActionFields(r);
                  const progress = brandProgress(r);
                  const open = expanded === r.id;
                  return (
                    <li
                      key={r.id}
                      data-testid="brand-commercial-product"
                      className="rounded-ds-lg border border-white/[0.06] bg-white/[0.02]"
                    >
                      <button
                        type="button"
                        className="flex w-full items-start justify-between gap-3 px-3.5 py-3 text-left"
                        onClick={() => setExpanded(open ? null : r.id)}
                        aria-expanded={open}
                      >
                        <span className="min-w-0">
                          <span className="block text-sm font-medium text-zinc-100">
                            {r.productLabel ?? r.id}
                          </span>
                          <span className="mt-0.5 block text-ds-label text-zinc-500">
                            {progress.satisfied} of {progress.total} checks passed · {progress.percent}%
                          </span>
                        </span>
                        <span
                          className="shrink-0"
                          data-testid="brand-commercial-route"
                          data-route={r.route}
                        >
                          <StatusBadge tone={ROUTE_TONE[r.route]}>{summary.headline}</StatusBadge>
                        </span>
                      </button>

                      <div className="border-t border-white/[0.06] px-3.5 py-3">
                        <p className="text-ds-label text-zinc-300">{summary.explanation}</p>
                        {open && (
                          <ProductDetail
                            record={r}
                            summary={summary}
                            fields={fields}
                            progress={progress}
                            drafts={drafts}
                            setDraft={setDraft}
                            submit={submit}
                          />
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            <p className="mt-4 text-ds-micro text-zinc-500" data-testid="brand-commercial-disclaimer">
              {COMMERCIAL_BRAND_OUTCOME_DISCLAIMER}
            </p>
          </WorkspaceSection>
        </div>
      </WorkspaceGrid>
    </WorkspaceFrame>
  );
}

/**
 * The expanded, customer-facing detail for ONE product: why Mercenta is asking,
 * what the brand must do, and the outcome. A separate component so the action
 * loop is readable and the field list, guidance and submit button can be tested
 * independently of the list.
 */
function ProductDetail({
  record,
  summary,
  fields,
  progress,
  drafts,
  setDraft,
  submit,
}: {
  record: CommercialReadinessRecord;
  summary: ReturnType<typeof brandOutcomeSummary>;
  fields: ReturnType<typeof brandActionFields>;
  progress: ReturnType<typeof brandProgress>;
  drafts: Record<string, { value: string; basis: CommercialValueBasis }>;
  setDraft: (key: string, patch: Partial<{ value: string; basis: CommercialValueBasis }>) => void;
  submit: (record: CommercialReadinessRecord, field: CommercialTermFieldId) => void;
}) {
  return (
    <>
      {summary.reasons.length > 0 && (
        <div className="mt-3" data-testid="brand-commercial-guidance">
          <p className="text-ds-micro font-semibold uppercase tracking-[0.14em] text-zinc-500">
            What Mercenta needs, and why
          </p>
          <ul className="mt-1.5 space-y-2">
            {summary.reasons.map((reason) => (
              <li key={reason.label} className="text-ds-label">
                <span className="text-zinc-200">{reason.label}</span>
                <span className="block text-ds-micro text-zinc-400">{reason.what}</span>
                <span className="block text-ds-micro text-zinc-500">{reason.why}</span>
                <a
                  className="mt-0.5 inline-block text-ds-micro text-state-info underline"
                  href={`#kb:${reason.articleId}`}
                  title={getKnowledgeArticle(reason.articleId)?.title ?? 'Guide'}
                >
                  Learn more — {getKnowledgeArticle(reason.articleId)?.title ?? 'guide'}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {fields.length === 0 ? (
        <p className="mt-3 text-ds-label text-state-success">Nothing is needed from you right now.</p>
      ) : (
        <div className="mt-3" data-testid="brand-commercial-missing">
          <p className="text-ds-micro font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Your actions
          </p>
          <ul className="mt-1.5 space-y-3">
            {fields.map((f) => {
              const key = `${record.id}|${f.field}`;
              const draft = drafts[key] ?? { value: '', basis: 'actual' as CommercialValueBasis };
              return (
                <li key={f.field} data-testid={`brand-commercial-field-${f.field}`}>
                  <p className="text-ds-label text-zinc-200">{f.guidance.what}</p>
                  <p className="text-ds-micro text-zinc-500">{f.guidance.action}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <input
                      aria-label={f.label}
                      className="w-32 rounded-ds-md border border-white/[0.12] bg-ink-900 px-2 py-1 text-ds-label text-zinc-100"
                      value={draft.value}
                      onChange={(e) => setDraft(key, { value: e.target.value })}
                      data-testid={`brand-commercial-input-${f.field}`}
                    />
                    <select
                      aria-label={`${f.label} basis`}
                      className="rounded-ds-md border border-white/[0.12] bg-ink-900 px-2 py-1 text-ds-label text-zinc-100"
                      value={draft.basis}
                      onChange={(e) => setDraft(key, { basis: e.target.value as CommercialValueBasis })}
                      data-testid={`brand-commercial-basis-${f.field}`}
                    >
                      {BASIS_OPTIONS.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      className="text-xs"
                      onClick={() => submit(record, f.field)}
                      data-testid={`brand-commercial-submit-${f.field}`}
                    >
                      Submit for reassessment
                    </Button>
                  </div>
                  {f.confirmExisting && (
                    <p className="mt-1 text-ds-micro text-state-warning">
                      Mercenta currently holds this as an assumption. Please confirm the real figure.
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="mt-3">
        <RecordFieldList
          fields={[
            { label: 'Status', value: summary.headline },
            { label: 'Next step', value: summary.nextStep },
            { label: 'Checks passed', value: `${progress.satisfied} of ${progress.total}` },
            { label: 'Last assessed', value: record.updatedAt },
          ]}
        />
      </div>

      <p className="mt-3 text-ds-micro text-zinc-600">{record.moqDisclaimer}</p>
    </>
  );
}