import { useMemo, useReducer, useState } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { demoPurchaseOrders } from '@/data/demoStore';
import { getKnowledgeArticle } from '@/data/knowledgeBase';
import { createCase, listCasesForBrand } from '@/lib/helpdesk/ticketStore';
import {
  CASE_CATEGORY_KB_ARTICLES,
  evaluateCaseSufficiency,
} from '@/lib/helpdesk/kbSufficiency';
import type { CaseCategory, Ticket } from '@/types';
import { BrandSupportView, type CaseCategoryOption } from './BrandSupportView';

const CATEGORY_OPTIONS: CaseCategoryOption[] = [
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

export function BrandSupportScreen() {
  const { session, brandProfile } = useApp();
  const tenantId = session?.tenantId ?? null;
  const [storeTick, bumpStore] = useReducer((x: number) => x + 1, 0);
  void storeTick;

  const [category, setCategory] = useState<CaseCategory>('po_question');
  const [notice, setNotice] = useState<string | null>(null);

  const ownPurchaseOrders = useMemo(
    () => (tenantId ? demoPurchaseOrders.filter((po) => po.brandId === tenantId) : []),
    [tenantId]
  );

  const cases = useMemo(() => {
    void storeTick;
    if (!tenantId) return [];
    return listCasesForBrand(tenantId).map((ticket) => ({
      ticket,
      verdict: evaluateCaseSufficiency(ticket).verdict,
    }));
  }, [tenantId, storeTick]);

  const guidanceArticles = useMemo(
    () =>
      CASE_CATEGORY_KB_ARTICLES[category]
        .map((id) => getKnowledgeArticle(id))
        .filter((a): a is NonNullable<typeof a> => Boolean(a)),
    [category]
  );

  const previewVerdict = useMemo(() => {
    if (!tenantId) return null;
    const synth: Ticket = {
      id: 'preview',
      brandId: tenantId,
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
    };
    const res = evaluateCaseSufficiency(synth);
    return { verdict: res.verdict, reason: res.reasons[res.reasons.length - 1] };
  }, [tenantId, category]);

  function handleSubmitCase(input: {
    category: CaseCategory;
    subject: string;
    description: string;
    relatedPoNumber: string;
  }) {
    if (!tenantId) return;
    const created = createCase({
      brandId: tenantId,
      subject: input.subject,
      description: input.description,
      caseCategory: input.category,
      source: 'in_app',
      relatedPoNumber: input.relatedPoNumber || undefined,
    });
    bumpStore();
    setNotice(
      `Case ${created.caseRef ?? created.id} submitted. Mercenta reviews it before escalating externally.`
    );
  }

  return (
    <BrandSupportView
      hasTenant={Boolean(tenantId)}
      brandName={brandProfile.businessName || 'Your brand'}
      category={category}
      onChangeCategory={setCategory}
      categoryOptions={CATEGORY_OPTIONS}
      ownPurchaseOrders={ownPurchaseOrders}
      guidanceArticles={guidanceArticles}
      previewVerdict={previewVerdict}
      cases={cases}
      notice={notice}
      onSubmitCase={handleSubmitCase}
    />
  );
}
export default BrandSupportScreen;
