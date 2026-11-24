import { useMemo, useState } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { useCommercialReadiness } from '@/lib/commercial/useCommercialReadiness';
import { brandActionFields, brandOutcomeSummary, brandProgress } from '@/lib/commercial/brandGuidance';
import { submitCommercialTermsAndReassess } from '@/lib/commercial/commercialReadinessRecorder';
import {
  COMMERCIAL_BRAND_OUTCOME_DISCLAIMER,
  type CommercialTermFieldId,
  type CommercialValueBasis,
} from '@/config/commercialReadiness';
import { getKnowledgeArticle } from '@/data/knowledgeBase';
import type { CommercialReadinessRecord } from '@/types';
import {
  BrandCommercialReadinessView,
  type BrandReadinessRowView,
} from './BrandCommercialReadinessView';

export function BrandCommercialReadinessScreen() {
  const { session } = useApp();
  const tenantId = session?.tenantId ?? null;
  const records = useCommercialReadiness({ kind: 'brand', tenantId: tenantId ?? '__none__' });

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<
    Record<string, { value: string; basis: CommercialValueBasis }>
  >({});
  const [notice, setNotice] = useState<string | null>(null);

  const rows = useMemo<BrandReadinessRowView[]>(() => {
    return records.map((record) => {
      const summary = brandOutcomeSummary(record);
      const fields = brandActionFields(record);
      const progress = brandProgress(record);
      return {
        record,
        headline: summary.headline,
        explanation: summary.explanation,
        nextStep: summary.nextStep,
        reasons: summary.reasons.map((r) => ({
          ...r,
          articleTitle: getKnowledgeArticle(r.articleId)?.title ?? 'Commercial readiness guide',
        })),
        fields: fields.map((f) => ({
          field: f.field,
          label: f.label,
          what: f.guidance.what,
          action: f.guidance.action,
          becauseOf: f.becauseOf,
          confirmExisting: f.confirmExisting,
          currentValue: f.currentValue,
        })),
        progressSatisfied: progress.satisfied,
        progressTotal: progress.total,
        progressPercent: progress.percent,
      };
    });
  }, [records]);

  const totals = useMemo(() => {
    const ready = rows.filter((r) => r.record.route === 'ready').length;
    const action = rows.filter((r) => r.fields.length > 0).length;
    return { total: rows.length, ready, action };
  }, [rows]);

  function handleChangeDraft(
    key: string,
    patch: Partial<{ value: string; basis: CommercialValueBasis }>
  ) {
    setDrafts((prev) => {
      const current = prev[key] ?? { value: '', basis: 'actual' as CommercialValueBasis };
      return { ...prev, [key]: { ...current, ...patch } };
    });
  }

  function handleSubmitField(record: CommercialReadinessRecord, field: CommercialTermFieldId) {
    const key = `${record.id}|${field}`;
    const draft = drafts[key];
    const raw = draft?.value?.trim() ?? '';
    if (!raw) {
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
        ? 'Saved. Mercenta has reassessed this product; status is unchanged.'
        : `Saved. Mercenta has reassessed this product — status is now ${nextRoute.replace('_', ' ')}.`
    );
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  return (
    <BrandCommercialReadinessView
      loading={false}
      error={null}
      onRetry={() => {}}
      rows={rows}
      totals={totals}
      expandedId={expandedId}
      onToggleExpand={(id) => setExpandedId((prev) => (prev === id ? null : id))}
      drafts={drafts}
      onChangeDraft={handleChangeDraft}
      onSubmitField={handleSubmitField}
      notice={notice}
      disclaimer={COMMERCIAL_BRAND_OUTCOME_DISCLAIMER}
    />
  );
}
export default BrandCommercialReadinessScreen;
