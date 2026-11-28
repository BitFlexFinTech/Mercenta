import { useState } from 'react';
import {
  EmptyStateBlock,
  InlineStatus,
  } from '@/next/components/ConsolePrimitives';
import { ConsolePageHeader } from '@/next/components/ConsolePageHeader';
import { NoticeBanner, SectionCard } from '@/next/components/ConsoleCharts';
import { CASE_ESCALATION_LABELS } from '@/lib/helpdesk/ticketStore';
import type { CaseSufficiencyVerdict } from '@/lib/helpdesk/kbSufficiency';
import type { CaseCategory, KBArticle, PurchaseOrder, Ticket } from '@/types';

export interface CaseCategoryOption {
  value: CaseCategory;
  label: string;
}

export interface BrandSupportCaseRow {
  ticket: Ticket;
  verdict: CaseSufficiencyVerdict;
}

export interface BrandSupportViewProps {
  hasTenant: boolean;
  brandName: string;
  category: CaseCategory;
  onChangeCategory: (c: CaseCategory) => void;
  categoryOptions: CaseCategoryOption[];
  ownPurchaseOrders: PurchaseOrder[];
  guidanceArticles: KBArticle[];
  previewVerdict: { verdict: CaseSufficiencyVerdict; reason?: string } | null;
  cases: BrandSupportCaseRow[];
  notice: string | null;
  onSubmitCase: (input: {
    category: CaseCategory;
    subject: string;
    description: string;
    relatedPoNumber: string;
  }) => void;
}

const BRAND_VERDICT_LABELS: Record<CaseSufficiencyVerdict, string> = {
  internally_resolvable: 'Mercenta can normally resolve this from your own data',
  requires_founder_review: 'Mercenta will review this personally before answering',
  not_applicable: 'Already answered',
};

const VERDICT_TONE: Record<CaseSufficiencyVerdict, 'success' | 'warning' | 'neutral'> = {
  internally_resolvable: 'success',
  requires_founder_review: 'warning',
  not_applicable: 'neutral',
};

export function BrandSupportView({
  hasTenant,
  brandName,
  category,
  onChangeCategory,
  categoryOptions,
  ownPurchaseOrders,
  guidanceArticles,
  previewVerdict,
  cases,
  notice,
  onSubmitCase,
}: BrandSupportViewProps) {
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [relatedPoNumber, setRelatedPoNumber] = useState('');

  if (!hasTenant) {
    return (
      <div className="space-y-6">
        <ConsolePageHeader
          title="Support & Cases"
          description="Open a case with Mercenta and follow resolution progress."
        />
        <EmptyStateBlock
          title="No brand session active"
          description="Select a partner brand account to submit or review support cases."
        />
      </div>
    );
  }

  const categoryLabel =
    categoryOptions.find((o) => o.value === category)?.label ?? 'Support';
  const canSubmit = subject.trim().length > 0 && description.trim().length > 0;

  function submit() {
    if (!canSubmit) return;
    onSubmitCase({
      category,
      subject: subject.trim(),
      description: description.trim(),
      relatedPoNumber: relatedPoNumber.trim(),
    });
    setSubject('');
    setDescription('');
    setRelatedPoNumber('');
  }

  return (
    <div className="space-y-6">
      <ConsolePageHeader
        title="Support & Cases"
        description="Mercenta verifies your platform records and guidance first, then resolves directly or handles retail-channel escalation on your behalf."
        meta={
          <span>
            {brandName || 'Your brand'} · {cases.length} case{cases.length === 1 ? '' : 's'} on record
          </span>
        }
      />

      {notice && <NoticeBanner tone="success" message={notice} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <SectionCard
            title="Open a Case"
            description="Link a purchase order where applicable so Mercenta can inspect canonical records automatically."
          >
            <div className="space-y-3 text-[12px]" data-state="brand-case-form">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="space-y-1">
                  <span className="text-ink-600">What is this about?</span>
                  <select
                    value={category}
                    onChange={(e) => onChangeCategory(e.target.value as CaseCategory)}
                    className="w-full px-2.5 py-1.5 rounded border border-hairline-strong bg-surface-raised text-ink-950"
                  >
                    {categoryOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-ink-600">Related PO (optional)</span>
                  <select
                    value={relatedPoNumber}
                    onChange={(e) => setRelatedPoNumber(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded border border-hairline-strong bg-surface-raised text-ink-950"
                  >
                    <option value="">Not related to a purchase order</option>
                    {ownPurchaseOrders.map((po) => (
                      <option key={po.poNumber} value={po.poNumber}>
                        {po.poNumber}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="block space-y-1">
                <span className="text-ink-600">Subject</span>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Short summary of the issue"
                  className="w-full px-3 py-1.5 rounded border border-hairline-strong bg-surface-raised text-ink-950"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-ink-600">Details</span>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Include dates, SKUs, ASN/POD references, and checks already completed."
                  className="w-full px-3 py-2 rounded border border-hairline-strong bg-surface-raised text-ink-950"
                />
              </label>
              {previewVerdict && (
                <div className="rounded border border-hairline bg-surface px-3 py-2 space-y-1">
                  <InlineStatus
                    label={BRAND_VERDICT_LABELS[previewVerdict.verdict]}
                    tone={VERDICT_TONE[previewVerdict.verdict]}
                    dataStatus={previewVerdict.verdict}
                  />
                  {previewVerdict.reason && (
                    <p className="text-ink-600">{previewVerdict.reason}</p>
                  )}
                </div>
              )}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={!canSubmit}
                  onClick={submit}
                  data-testid="brand-case-submit"
                  className="px-4 py-1.5 rounded bg-[var(--mr-accent)] text-on-dark font-medium hover:bg-[var(--mr-accent-600)] disabled:opacity-40"
                >
                  Submit Case to Mercenta
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSubject('');
                    setDescription('');
                    setRelatedPoNumber('');
                  }}
                  className="px-3 py-1.5 rounded border border-hairline-strong bg-surface-raised text-secondary"
                >
                  Clear
                </button>
              </div>
            </div>
          </SectionCard>

          <SectionCard title={`Your Cases (${cases.length})`}>
            {cases.length === 0 ? (
              <p className="text-[12px] text-faint">You have not raised any cases yet.</p>
            ) : (
              <ul className="divide-y divide-hairline-06" data-state="brand-case-list">
                {cases.map(({ ticket: c, verdict }) => (
                  <li key={c.id} className="py-3 first:pt-0 last:pb-0 space-y-1.5" data-state="brand-case-row">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
                      <div>
                        <span className="font-mono text-[var(--mr-accent)] font-medium mr-2">
                          {c.caseRef ?? c.id}
                        </span>
                        <span className="font-medium text-ink-950">{c.subject}</span>
                      </div>
                      <InlineStatus
                        label={
                          c.escalationState
                            ? CASE_ESCALATION_LABELS[c.escalationState]
                            : 'With Mercenta'
                        }
                        tone={
                          c.escalationState === 'resolved' || c.escalationState === 'closed'
                            ? 'neutral'
                            : 'info'
                        }
                      />
                    </div>
                    <div className="text-[11px] text-faint">
                      {categoryOptions.find((o) => o.value === c.caseCategory)?.label ?? 'Support'}
                      {verdict !== 'not_applicable' ? ` · ${BRAND_VERDICT_LABELS[verdict]}` : ''}
                    </div>
                    {c.resolution && (
                      <p className="text-[12px] text-secondary">Mercenta: {c.resolution.note}</p>
                    )}
                    {c.providerResponse && (
                      <p className="text-[12px] text-secondary">
                        Retail channel{c.amazonCase?.simulated ? ' (simulated)' : ''}:{' '}
                        {c.providerResponse.response}
                      </p>
                    )}
                    {!c.resolution &&
                      !c.providerResponse &&
                      c.escalationState === 'awaiting_brand_info' && (
                        <p className="text-[12px] text-state-warning">
                          Mercenta needs additional information from you to continue.
                        </p>
                      )}
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>

        <div>
          <SectionCard
            title="Category Guidance"
            description={categoryLabel}
          >
            {guidanceArticles.length === 0 ? (
              <p className="text-[12px] text-state-warning">
                No published Knowledge Base article covers this category yet — a specialist will review personally.
              </p>
            ) : (
              <ul className="divide-y divide-hairline-06 space-y-2">
                {guidanceArticles.map((a) => (
                  <li key={a.id} className="pt-2 first:pt-0 text-[12px]">
                    <div className="font-medium text-ink-950">{a.title}</div>
                    <p className="text-ink-600 mt-0.5 leading-relaxed">{a.summary}</p>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
