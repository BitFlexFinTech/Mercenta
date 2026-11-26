import { useMemo, useReducer, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useApp } from '@/context/GlobalStateContext';
import { logMessage } from '@/data/api';
import { getKnowledgeArticle } from '@/data/knowledgeBase';
import { useBrands, useMessages } from '@/data/queries';
import { INTEGRATION_META } from '@/integrations/registry';
import {
  CASE_SUFFICIENCY_LABELS,
  evaluateCaseSufficiency,
  type CaseSufficiencyVerdict,
} from '@/lib/helpdesk/kbSufficiency';
import {
  CASE_ESCALATION_LABELS,
  appendMessageToTicket,
  assignTicket,
  computeHelpdeskMetrics,
  demoTickets,
  escalateCaseToProvider,
  getTicketById,
  listAllCases,
  listCasesAwaitingReview,
  markTicketSeen,
  recordProviderCaseResponse,
  resolveCase,
  reviewCase,
  setTicketPriority,
  updateTicketStatus,
} from '@/lib/helpdesk/ticketStore';
import type { Ticket, TicketPriority, TicketStatus } from '@/types';
import type { SemanticTone } from '@/next/components/ConsolePrimitives';
import { AdminHelpdeskView, type HelpdeskCaseItem } from './AdminHelpdeskView';

const SUFFICIENCY_TONE: Record<CaseSufficiencyVerdict, SemanticTone> = {
  internally_resolvable: 'success',
  requires_founder_review: 'warning',
  not_applicable: 'neutral',
};

const SUGGESTED_TEMPLATES: Record<string, string> = {
  'brand-astonish': 'Let me check dispatch for your latest PO - updating within 2h.',
  'brand-kitkin': 'Thank you for submitting HMRC docs. In review - 3-5 business days.',
  'brand-tapatio': 'I see the pricing discrepancy on PO-9002. Escalating, will reply within 24h.',
  'brand-lecreuset': 'Thanks — your compliance documents are with our review team.',
};

export function AdminHelpdeskScreen() {
  const qc = useQueryClient();
  const [storeTick, bumpStore] = useReducer((x: number) => x + 1, 0);
  const { actingStaff, staff } = useApp();
  const brandsQuery = useBrands();
  const messagesQuery = useMessages();

  const [selectedTicketId, setSelectedTicketId] = useState<string | null>('tkt-001');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [note, setNote] = useState<string | null>(null);

  const brands = useMemo(() => brandsQuery.data?.data ?? [], [brandsQuery.data]);
  const allMessages = useMemo(() => messagesQuery.data?.data ?? [], [messagesQuery.data]);

  const brandName = (id: string) =>
    brands.find((b) => b.id === id)?.profile.businessName ?? id;

  void storeTick;
  const metrics = computeHelpdeskMetrics();
  const overdueCount = demoTickets.filter(
    (t) => t.slaDeadline && new Date(t.slaDeadline) < new Date() && t.status !== 'resolved'
  ).length;

  const filteredTickets = (() => {
    let list = [...demoTickets];
    if (statusFilter !== 'all') list = list.filter((t) => t.status === statusFilter);
    if (priorityFilter !== 'all') list = list.filter((t) => t.priority === priorityFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (t) =>
          t.subject.toLowerCase().includes(q) ||
          t.lastMessagePreview.toLowerCase().includes(q) ||
          brandName(t.brandId).toLowerCase().includes(q)
      );
    }
    return list.sort(
      (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );
  })();

  const selectedTicket: Ticket | null = selectedTicketId ? getTicketById(selectedTicketId) ?? null : null;
  const ticketMessages = useMemo(() => {
    if (!selectedTicket) return [];
    return allMessages
      .filter((m) => selectedTicket.messageIds.includes(m.id))
      .map((m) => ({
        id: m.id,
        direction: m.direction,
        body: m.body,
        createdAt: m.createdAt,
      }));
  }, [selectedTicket, allMessages]);

  const suggestedReply = selectedTicket
    ? (SUGGESTED_TEMPLATES[selectedTicket.brandId] ??
      'Thank you. Let me investigate and get back to you.')
    : null;

  const mapCase = (c: ReturnType<typeof listAllCases>[number]): HelpdeskCaseItem => {
    const sufficiency = evaluateCaseSufficiency(c);
    return {
      id: c.id,
      caseRef: c.caseRef,
      subject: c.subject,
      brandId: c.brandId,
      brandName: brandName(c.brandId),
      escalationState: c.escalationState,
      escalationLabel: c.escalationState
        ? CASE_ESCALATION_LABELS[c.escalationState]
        : 'Unreviewed',
      sufficiencyLabel: CASE_SUFFICIENCY_LABELS[sufficiency.verdict],
      sufficiencyTone: SUFFICIENCY_TONE[sufficiency.verdict],
      articleTitles: sufficiency.articleIds.map(
        (id) => getKnowledgeArticle(id)?.title ?? id
      ),
      reasons: [...sufficiency.reasons],
      context: [...sufficiency.context],
      amazonReferenceId: c.amazonCase?.referenceId,
      amazonSimulated: c.amazonCase?.simulated,
      hasProviderResponse: Boolean(c.providerResponse),
    };
  };

  const awaitingReviewCases = listCasesAwaitingReview().map(mapCase);
  const allCases = listAllCases().map(mapCase);
  const approvedToEscalateCases = allCases.filter(
    (c) => c.escalationState === 'approved_for_escalation'
  );
  const providerCases = allCases.filter((c) => Boolean(c.amazonReferenceId));
  const awaitingResponseCases = allCases.filter(
    (c) => Boolean(c.amazonReferenceId) && !c.hasProviderResponse
  );
  const readyToResolveCases = allCases.filter(
    (c) => c.hasProviderResponse && c.escalationState !== 'resolved' && c.escalationState !== 'closed'
  );

  const errObj = brandsQuery.error || messagesQuery.error;
  const error =
    errObj instanceof Error ? errObj.message : errObj ? 'Failed to load helpdesk data.' : null;

  return (
    <AdminHelpdeskView
      loading={brandsQuery.isPending || messagesQuery.isPending}
      error={error}
      onRetry={() => {
        void brandsQuery.refetch();
        void messagesQuery.refetch();
      }}
      note={note}
      metrics={{ ...metrics, overdueCount }}
      awaitingReviewCases={awaitingReviewCases}
      approvedToEscalateCases={approvedToEscalateCases}
      providerCases={providerCases}
      awaitingResponseCases={awaitingResponseCases}
      readyToResolveCases={readyToResolveCases}
      onReviewCase={(id, decision) => {
        const res = reviewCase(
          id,
          actingStaff?.id ?? 'staff-001',
          decision,
          decision === 'request_info'
            ? 'Please attach the corrected documentation for this case.'
            : undefined
        );
        setNote(res.ok ? 'Case review recorded.' : res.error ?? 'Review failed.');
        bumpStore();
      }}
      onEscalateCase={async (id) => {
        const res = await escalateCaseToProvider(
          id,
          actingStaff?.id ?? 'staff-001',
          INTEGRATION_META.amazon_sp_api.defaultMode
        );
        setNote(
          res.ok
            ? `Escalated to the retail channel (${res.caseReferenceId}).`
            : res.error ?? 'Escalation failed.'
        );
        bumpStore();
      }}
      onRecordProviderResponse={(id, outcome, response) => {
        if (!response.trim()) {
          setNote('Record what the retail channel actually said before saving.');
          return;
        }
        const res = recordProviderCaseResponse(id, actingStaff?.id ?? 'staff-001', {
          outcome,
          response: response.trim(),
        });
        setNote(
          res.ok
            ? 'Retail-channel response recorded.'
            : res.error ?? 'Could not record response.'
        );
        bumpStore();
      }}
      onResolveCase={(id, resolution) => {
        if (!resolution.trim()) {
          setNote('A resolution requires a note the brand can read.');
          return;
        }
        const res = resolveCase(id, actingStaff?.id ?? 'staff-001', resolution.trim());
        setNote(
          res.ok
            ? 'Case resolved — visible to brand.'
            : res.error ?? 'Resolve failed.'
        );
        bumpStore();
      }}
      tickets={filteredTickets}
      selectedTicket={selectedTicket}
      onSelectTicket={(id) => {
        setSelectedTicketId(id);
        markTicketSeen(id);
        bumpStore();
      }}
      ticketMessages={ticketMessages}
      staffOptions={staff.filter((s) => s.active).map((s) => ({ id: s.id, name: s.name }))}
      brandName={brandName}
      statusFilter={statusFilter}
      onStatusFilterChange={setStatusFilter}
      priorityFilter={priorityFilter}
      onPriorityFilterChange={setPriorityFilter}
      searchQuery={searchQuery}
      onSearchQueryChange={setSearchQuery}
      onUpdateTicketStatus={(ticketId, status) => {
        updateTicketStatus(ticketId, status, actingStaff?.id);
        bumpStore();
      }}
      onAssignTicket={(ticketId, staffId) => {
        assignTicket(ticketId, staffId, actingStaff?.id);
        bumpStore();
      }}
      onSetTicketPriority={(ticketId, priority) => {
        setTicketPriority(ticketId, priority, actingStaff?.id);
        bumpStore();
      }}
      suggestedReply={suggestedReply}
      onSendReply={async (ticketId, body) => {
        const ticket = getTicketById(ticketId);
        if (!ticket || !body.trim()) return;
        const msg = await logMessage({
          brandId: ticket.brandId,
          channel: 'in_app',
          direction: 'outbound',
          subject: `Re: ${ticket.subject}`,
          body: body.trim(),
          sentBy: 'staff',
          requiresHuman: false,
        });
        appendMessageToTicket(ticket.id, msg.id);
        bumpStore();
        await qc.invalidateQueries({ queryKey: ['messages'] });
        setNote('Reply sent.');
      }}
    />
  );
}
