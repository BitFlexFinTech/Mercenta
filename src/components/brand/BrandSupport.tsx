/**
 * §Brief §6 — BRAND SUPPORT & CASES (increment S2a).
 *
 * The brand-facing half of the canonical case model:
 *
 *   BRAND opens a Mercenta case
 *     → Mercenta checks the Knowledge Base · verified platform data · the
 *       relevant domain object
 *     → sufficiently supported ⇒ Mercenta resolves it internally
 *     → otherwise              ⇒ Mercenta reviews it personally, and only then
 *                                 (where it is genuinely a channel matter) is it
 *                                 escalated to the retail channel.
 *
 * What the brand sees, and what it deliberately does NOT see:
 *   · only its OWN cases (`listCasesForBrand` filters by the session tenant);
 *   · the Knowledge Base guidance for the category it picked;
 *   · the status of its case, the resolution note, and the retail channel's
 *     response when one exists — labelled as simulated when it is simulated;
 *   · the LINK to a record it already owns, chosen from its own data only.
 *
 * It never shows another tenant's case, an internal-only note, a Founder-only
 * surface, or an invented retail-channel fact. The brand does not manage
 * channel case mechanics; that is Mercenta's job, and this surface says so.
 */
import { useMemo, useReducer, useState } from 'react';
import { Button, Card, Input, Select, StatusBadge, Textarea, type StatusTone } from '@/components/ui';
import { WorkspaceFrame, WorkspaceGrid, WorkspaceHeader, WorkspaceSection } from '@/components/shared/workspace';
import { useApp } from '@/context/GlobalStateContext';
import { demoPurchaseOrders } from '@/data/demoStore';
import { getKnowledgeArticle } from '@/data/knowledgeBase';
import { CASE_ESCALATION_LABELS, createCase, listCasesForBrand } from '@/lib/helpdesk/ticketStore';
import {
  CASE_CATEGORY_KB_ARTICLES,
  evaluateCaseSufficiency,
  type CaseSufficiencyVerdict,
} from '@/lib/helpdesk/kbSufficiency';
import type { CaseCategory, Ticket } from '@/types';

const CATEGORY_OPTIONS: { value: CaseCategory; label: string }[] = [
  { value: 'po_question', label: 'Purchase order question' },
  { value: 'shipment_issue', label: 'Shipment issue' },
  { value: 'delivery_issue', label: 'Delivery issue' },
  { value: 'deduction', label: 'Deduction / chargeback' },
  { value: 'payment_issue', label: 'Payment question' },
  { value: 'compliance_question', label: 'Compliance question' },
  { value: 'catalogue_issue', label: 'Catalogue / listing issue' },
  { value: 'amazon_related', label: 'Retail-channel matter' },
  { value: 'general', label: 'Something else' },
];

const CATEGORY_LABELS: Record<CaseCategory, string> = Object.fromEntries(
  CATEGORY_OPTIONS.map((o) => [o.value, o.label])
) as Record<CaseCategory, string>;

/**
 * Brand-facing verdict wording. The brand deals with MERCENTA — so the surface
 * never talks about a "Founder queue"; it says who will look at it.
 */
const VERDICT_TONE: Record<CaseSufficiencyVerdict, StatusTone> = {
  internally_resolvable: 'success',
  requires_founder_review: 'warning',
  not_applicable: 'neutral',
};

const BRAND_VERDICT_LABELS: Record<CaseSufficiencyVerdict, string> = {
  internally_resolvable: 'Mercenta can normally resolve this from your own data',
  requires_founder_review: 'Mercenta will review this personally before answering',
  not_applicable: 'Already answered',
};

/** A synthetic ticket used only to PREVIEW the guidance for an unopened case. */
function previewTicket(brandId: string, category: CaseCategory, relatedPoNumber?: string): Ticket {
  return {
    id: 'preview',
    brandId,
    messageIds: [],
    lastMessagePreview: '',
    lastMessageAt: '',
    status: 'open',
    priority: 'medium',
    source: 'in_app',
    subject: '',
    createdAt: '',
    seenByStaff: false,
    caseCategory: category,
    escalationState: 'brand_submitted',
    relatedPoNumber: relatedPoNumber?.trim() || undefined,
  };
}

export function BrandSupport() {
  const { session, brandProfile } = useApp();
  const tenantId = session?.tenantId ?? null;

  // demoTickets mutates in place and React cannot observe it — bump on write.
  const [storeTick, bumpStore] = useReducer((x: number) => x + 1, 0);
  void storeTick; // render trigger only (the store itself is not observable)
  const [category, setCategory] = useState<CaseCategory>('po_question');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [relatedPoNumber, setRelatedPoNumber] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  /** The brand's OWN purchase orders — the only records it may link to. */
  const ownPurchaseOrders = useMemo(
    () => (tenantId ? demoPurchaseOrders.filter((po) => po.brandId === tenantId) : []),
    [tenantId]
  );

  const cases = tenantId ? listCasesForBrand(tenantId) : [];

  /** Guidance for the chosen category, from the real Knowledge Base store. */
  const guidance = useMemo(
    () =>
      CASE_CATEGORY_KB_ARTICLES[category]
        .map((id) => getKnowledgeArticle(id))
        .filter((a): a is NonNullable<typeof a> => !!a),
    [category]
  );

  /**
   * The sufficiency preview for the case about to be opened — the SAME
   * canonical evaluator the Mercenta review queue uses, so the brand is never
   * told something the reviewer will contradict.
   */
  const preview = useMemo(
    () => (tenantId ? evaluateCaseSufficiency(previewTicket(tenantId, category, relatedPoNumber)) : null),
    [tenantId, category, relatedPoNumber]
  );

  if (!tenantId) {
    return (
      <WorkspaceFrame>
        <WorkspaceHeader
          eyebrow="BRAND PORTAL · SUPPORT"
          title="Support & Cases"
          description="Open a case with Mercenta and follow its progress."
        />
        <Card className="p-5 text-sm text-muted">
          No brand session is active, so there is no tenant to raise a case for.
        </Card>
      </WorkspaceFrame>
    );
  }

  const canSubmit = subject.trim().length > 0 && description.trim().length > 0;

  const submit = () => {
    if (!canSubmit) {
      setNotice('Add a subject and a description so Mercenta can act on the case.');
      return;
    }
    const created = createCase({
      brandId: tenantId,
      subject: subject.trim(),
      description: description.trim(),
      caseCategory: category,
      source: 'in_app',
      relatedPoNumber: relatedPoNumber.trim() || undefined,
    });
    bumpStore();
    setNotice(
      `Case ${created.caseRef ?? created.id} submitted. Mercenta reviews it before anything is raised with the retail channel.`
    );
    setSubject('');
    setDescription('');
    setRelatedPoNumber('');
  };

  return (
    <WorkspaceFrame>
      <WorkspaceHeader
        eyebrow="BRAND PORTAL · SUPPORT"
        title="Support & Cases"
        description="Tell Mercenta what has happened. Mercenta checks your own platform data and our guidance first, then answers you — and handles the retail channel itself where that is needed."
        meta={
          <span className="text-ds-label text-muted">
            {brandProfile.businessName || 'Your brand'} · {cases.length} case{cases.length === 1 ? '' : 's'} on record
          </span>
        }
      />
      <WorkspaceGrid
        rail={
          <Card className="p-4 space-y-2" data-state="brand-case-guidance">
            <h3 className="text-sm font-semibold text-strong">Guidance for this category</h3>
            <p className="text-ds-label text-muted">{CATEGORY_LABELS[category]}</p>
            {guidance.length === 0 ? (
              <p className="text-ds-label text-state-warning">
                Mercenta has no published guidance for this category — it will be reviewed personally.
              </p>
            ) : (
              <ul className="space-y-2">
                {guidance.map((a) => (
                  <li key={a.id} className="border-t border-hairline pt-2 first:border-0 first:pt-0">
                    <p className="text-ds-label font-medium text-strong">{a.title}</p>
                    <p className="mt-0.5 text-ds-label leading-snug text-muted">{a.summary}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        }
      >
        <WorkspaceSection
          title="Open a case"
          description="Link the purchase order where the case is about one, so Mercenta can verify it against your own records."
        >
          <Card className="p-4 space-y-3" data-state="brand-case-form">
            <Select
              label="What is this about?"
              value={category}
              onChange={(e) => setCategory(e.target.value as CaseCategory)}
              options={CATEGORY_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            />
            <Select
              label="Related purchase order (optional)"
              value={relatedPoNumber}
              onChange={(e) => setRelatedPoNumber(e.target.value)}
              options={[
                { value: '', label: 'Not related to a purchase order' },
                ...ownPurchaseOrders.map((po) => ({ value: po.poNumber, label: po.poNumber })),
              ]}
            />
            <Input
              label="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Short summary of the issue"
            />
            <Textarea
              label="What has happened?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue. Include dates, references and anything you have already checked."
              rows={5}
            />
            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={submit}
                disabled={!canSubmit}
                data-state="brand-case-submit"
                data-testid="brand-case-submit"
              >
                Submit case to Mercenta
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setSubject('');
                  setDescription('');
                  setRelatedPoNumber('');
                  setNotice(null);
                }}
              >
                Clear
              </Button>
            </div>
            {preview && (
              <div className="space-y-1 border-t border-hairline pt-2" data-state="brand-case-verdict">
                <StatusBadge tone={VERDICT_TONE[preview.verdict]} dataStatus={preview.verdict}>
                  {BRAND_VERDICT_LABELS[preview.verdict]}
                </StatusBadge>
                <p className="text-ds-label text-muted">
                  {preview.reasons[preview.reasons.length - 1]}
                </p>
              </div>
            )}
            {notice && (
              <p className="text-ds-label text-accent-300" data-state="brand-case-notice">
                {notice}
              </p>
            )}
          </Card>
        </WorkspaceSection>

        <WorkspaceSection
          title="Your cases"
          description="Every case you have raised with Mercenta, and where each one has got to."
        >
          <Card className="p-4 space-y-3" data-state="brand-case-list">
            {cases.length === 0 ? (
              <p className="text-ds-label text-muted">You have not raised any cases yet.</p>
            ) : (
              cases.map((c) => {
                const sufficiency = evaluateCaseSufficiency(c);
                return (
                  <div
                    key={c.id}
                    className="space-y-1.5 border-t border-hairline pt-2.5 first:border-0 first:pt-0"
                    data-state="brand-case-row"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-ds-label text-accent-300">{c.caseRef ?? c.id}</span>
                      <span className="min-w-[160px] flex-1 text-ds-label text-strong">{c.subject}</span>
                      <span className="text-ds-micro text-muted">
                        {c.caseCategory ? CATEGORY_LABELS[c.caseCategory] : 'Support'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge
                        tone={
                          c.escalationState === 'resolved' || c.escalationState === 'closed'
                            ? 'neutral'
                            : 'info'
                        }
                        dataStatus={c.escalationState ?? 'open'}
                      >
                        {c.escalationState ? CASE_ESCALATION_LABELS[c.escalationState] : 'With Mercenta'}
                      </StatusBadge>
                      {sufficiency.verdict !== 'not_applicable' && (
                        <span className="text-ds-micro text-muted">
                          {BRAND_VERDICT_LABELS[sufficiency.verdict]}
                        </span>
                      )}
                    </div>
                    {c.resolution && (
                      <p className="text-ds-label text-muted" data-state="brand-case-resolution">
                        Mercenta: {c.resolution.note}
                      </p>
                    )}
                    {c.providerResponse && (
                      <p className="text-ds-label text-muted" data-state="brand-case-provider-response">
                        Retail channel{c.amazonCase?.simulated ? ' (simulated)' : ''}:{' '}
                        {c.providerResponse.response}
                      </p>
                    )}
                    {!c.resolution && !c.providerResponse && c.escalationState === 'awaiting_brand_info' && (
                      <p className="text-ds-label text-state-warning">
                        Mercenta needs more information from you to continue.
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </Card>
        </WorkspaceSection>
      </WorkspaceGrid>
    </WorkspaceFrame>
  );
}