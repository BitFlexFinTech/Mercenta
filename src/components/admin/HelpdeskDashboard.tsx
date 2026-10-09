import { useState, useMemo, useReducer } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useApp } from '@/context/GlobalStateContext';
import { useBrands, useMessages } from '@/data/queries';
import { logMessage } from '@/data/api';
import { Badge, Button, Card, Input, Select, StatusBadge, type StatusTone } from '@/components/ui';
import { WorkspaceFrame, WorkspaceHeader } from '@/components/shared/workspace';
import { cn } from '@/utils/cn';
import type { Ticket, TicketStatus, TicketPriority } from '@/types';
import { demoTickets, updateTicketStatus, assignTicket, setTicketPriority, markTicketSeen, computeHelpdeskMetrics, getTicketById, appendMessageToTicket, CASE_ESCALATION_LABELS, listCasesAwaitingReview, listAllCases, reviewCase, escalateCaseToProvider, recordProviderCaseResponse, resolveCase } from '@/lib/helpdesk/ticketStore';
import { INTEGRATION_META } from '@/integrations/registry';
import { getKnowledgeArticle } from '@/data/knowledgeBase';
import {
  CASE_SUFFICIENCY_LABELS,
  evaluateCaseSufficiency,
  type CaseSufficiencyVerdict,
} from '@/lib/helpdesk/kbSufficiency';
import { Inbox, AlertTriangle, Clock, User, Send, Filter, Search, Bot, ArrowUpRight, ShieldCheck, ExternalLink } from 'lucide-react';
const PB: Record<TicketPriority, string> = { urgent: 'bg-red-500/15 text-red-300', high: 'bg-amber-500/15 text-amber-300', medium: 'bg-blue-500/15 text-blue-300', low: 'bg-zinc-500/15 text-zinc-400' };
const PI: Record<TicketPriority, typeof AlertTriangle> = { urgent: AlertTriangle, high: AlertTriangle, medium: Clock, low: Inbox };
const SC: Record<TicketStatus, string> = { open: 'bg-emerald-500/15 text-emerald-300', pending: 'bg-amber-500/15 text-amber-300', resolved: 'bg-zinc-500/15 text-zinc-400' };
/** §Brief §6 — the Knowledge Base sufficiency verdict, rendered (never colour-only). */
const SUFFICIENCY_TONE: Record<CaseSufficiencyVerdict, StatusTone> = {
  internally_resolvable: 'success',
  requires_founder_review: 'warning',
  not_applicable: 'neutral',
};

function slaInd(deadline?: string, status?: TicketStatus): { label: string; cls: string } | null {
  if (!deadline || status === 'resolved') return null;
  const h = Math.round((new Date(deadline).getTime() - Date.now()) / 3600000);
  if (h < 0) return { label: `OVERDUE ${Math.abs(h)}h`, cls: 'text-red-400 font-semibold' };
  if (h < 4) return { label: `${h}h left`, cls: 'text-amber-400' };
  return { label: `${h}h`, cls: 'text-zinc-500' };
}

function useAiSug(brandId: string, _ctx: string): string | null {
  return useMemo(() => {
    if (!brandId) return null;
    const m: Record<string, string> = {
      'brand-astonish': 'Let me check dispatch for your latest PO - updating within 2h.',
      'brand-seep': 'Thank you for submitting HMRC docs. In review - 3-5 business days.',
      'brand-clipper': 'I see the pricing discrepancy on PO-9045. Escalating, will reply within 24h.',
      'brand-regatta': 'PO-9002 scheduled for next consolidation. Dispatch within 10 days.',
    };
    return m[brandId] ?? 'Thank you. Let me investigate and get back to you.';
  }, [brandId]);
}
export function HelpdeskDashboard() {
  const qc = useQueryClient();
  // The ticket store (demoTickets) mutates in place and is not observable by
  // React — bump the component after every mutation so rows/selects refresh.
  const [storeTick, bumpStore] = useReducer((x: number) => x + 1, 0);
  const { actingStaff, staff } = useApp();
  const brandsQuery = useBrands();
  const messagesQuery = useMessages();
  const brands = useMemo(() => brandsQuery.data?.data ?? [], [brandsQuery.data]);
  const allMessages = useMemo(() => messagesQuery.data?.data ?? [], [messagesQuery.data]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>('tkt-001');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [replyDraft, setReplyDraft] = useState('');
  const [replyNote, setReplyNote] = useState<string | null>(null);
  /* §Brief §6 — case-completion controls. Both values are HUMAN-ENTERED: the
     platform never generates a retail-channel answer. */
  const [caseResponse, setCaseResponse] = useState('');
  const [caseOutcome, setCaseOutcome] = useState<'accepted' | 'rejected' | 'info_required' | 'closed'>('accepted');
  const [caseResolution, setCaseResolution] = useState('');

  const metrics = computeHelpdeskMetrics();
  const overdueCount = demoTickets.filter((t) => t.slaDeadline && new Date(t.slaDeadline) < new Date() && t.status !== 'resolved').length;

  // Deliberately NOT memoized: demoTickets mutates in place (not observable by
  // React), so the list is recomputed on every render after a storeTick bump.
  const filteredTickets = (() => {
    let list = [...demoTickets];
    if (statusFilter !== 'all') list = list.filter((t: Ticket) => t.status === statusFilter);
    if (priorityFilter !== 'all') list = list.filter((t: Ticket) => t.priority === priorityFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((t: Ticket) => t.subject.toLowerCase().includes(q) || t.lastMessagePreview.toLowerCase().includes(q) ||
        brands.find((b: any) => b.id === t.brandId)?.profile.businessName.toLowerCase().includes(q));
    }
    return list.sort((a: Ticket, b: Ticket) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
  })();

  const selectedTicket = selectedTicketId ? getTicketById(selectedTicketId) : null;
  const ticketMessages = useMemo(() => {
    if (!selectedTicket) return [];
    return allMessages.filter((m: any) => selectedTicket.messageIds.includes(m.id));
  }, [selectedTicket, allMessages]);
  const aiSuggestion = useAiSug(selectedTicket?.brandId ?? '', ticketMessages.map((m: any) => m.body).join('\n'));
  const brandName = (id: string) => brands.find((b: any) => b.id === id)?.profile.businessName ?? id;

  /* §Canonical model §15 — Mercenta case review + Amazon escalation. */
  function handleCaseReview(id: string, decision: 'approve_escalation' | 'request_info' | 'reject') {
    const res = reviewCase(
      id,
      actingStaff?.id ?? 'staff-001',
      decision,
      decision === 'request_info' ? 'Please attach the corrected documentation for this case.' : undefined
    );
    setReplyNote(res.ok ? 'Case review recorded.' : res.error ?? 'Review failed.');
    bumpStore();
  }

  async function handleCaseEscalate(id: string) {
    // Fail-closed: the app's OWN documented default mode for Amazon SP-API.
    const res = await escalateCaseToProvider(id, actingStaff?.id ?? 'staff-001', INTEGRATION_META.amazon_sp_api.defaultMode);
    setReplyNote(res.ok ? `Escalated to Amazon (${res.caseReferenceId}).` : res.error ?? 'Escalation failed.');
    bumpStore();
  }

  /** §Brief §6 — record what the retail channel ACTUALLY said (human-entered). */
  function handleCaseResponse(id: string) {
    if (!caseResponse.trim()) {
      setReplyNote('Record what the retail channel actually said before saving — nothing is generated.');
      return;
    }
    const res = recordProviderCaseResponse(id, actingStaff?.id ?? 'staff-001', {
      outcome: caseOutcome,
      response: caseResponse.trim(),
    });
    setReplyNote(res.ok ? 'Retail-channel response recorded.' : res.error ?? 'Could not record the response.');
    if (res.ok) setCaseResponse('');
    bumpStore();
  }

  /** §Brief §6 — Mercenta resolves the case with a note the brand will read. */
  function handleCaseResolve(id: string) {
    if (!caseResolution.trim()) {
      setReplyNote('A resolution needs a note the brand can read.');
      return;
    }
    const res = resolveCase(id, actingStaff?.id ?? 'staff-001', caseResolution.trim());
    setReplyNote(res.ok ? 'Case resolved — the brand can now see the resolution.' : res.error ?? 'Resolve failed.');
    if (res.ok) setCaseResolution('');
    bumpStore();
  }

  function handleSendReply() {
    if (!replyDraft.trim() || !selectedTicket) return;
    logMessage({ brandId: selectedTicket.brandId, channel: 'in_app', direction: 'outbound',
      subject: 'Re: ' + selectedTicket.subject, body: replyDraft, sentBy: 'staff', requiresHuman: false })
      .then((msg) => {
        appendMessageToTicket(selectedTicket.id, msg.id);
        bumpStore();
        // Single source of truth — every query-backed view (Messages Hub,
        // Brand CRM comm panel) must re-read the canonical messages store.
        void qc.invalidateQueries({ queryKey: ['messages'] });
        setReplyNote('Reply sent.'); setReplyDraft('');
        setTimeout(() => setReplyNote(null), 3000);
      });
  }
return (
    <WorkspaceFrame className="space-y-4">
      <WorkspaceHeader
        eyebrow="ADMIN HUB · SUPPORT"
        title="Helpdesk"
        description="Brand support cases reviewed by Mercenta before any channel escalation. Mercenta operates the channel relationship — a brand never contacts the channel directly."
        meta={
          <span className="font-mono text-ds-label text-zinc-500">
            {metrics.openCount} open · {metrics.pendingCount} pending · {metrics.unassignedCount} unassigned
          </span>
        }
      />
      {/* §Canonical model §15 — brand cases require Mercenta review BEFORE any
          escalation to Amazon. Nothing here sends a raw brand report to Amazon. */}
      <Card className="p-3 space-y-2" data-state="helpdesk-cases-panel">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-brass-400" />
          <h3 className="text-sm font-semibold text-white">Brand cases — Mercenta review queue</h3>
          <span className="text-ds-label text-zinc-500">
            {listCasesAwaitingReview().length} awaiting review · {listAllCases().length} total
          </span>
        </div>
        <p className="text-ds-label text-zinc-500">
          A brand case is never sent straight to Amazon. Mercenta reviews and corrects it first; only an
          approved case may be escalated, where the integration is in simulation it is labelled as such.
        </p>
        <div className="space-y-1.5">
          {listCasesAwaitingReview().length === 0 && (
            <p className="text-ds-label text-zinc-600">No cases awaiting review.</p>
          )}
          {listCasesAwaitingReview().map((c) => {
            const sufficiency = evaluateCaseSufficiency(c);
            return (
              <div key={c.id} className="space-y-1 border-t border-white/[0.05] pt-1.5" data-state="case-review-row">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-ds-label font-mono text-brass-300">{c.caseRef ?? c.id}</span>
                  <span className="text-ds-label text-zinc-300 flex-1 min-w-[180px]">{c.subject}</span>
                  <span className="text-ds-micro text-zinc-500">{brandName(c.brandId)}</span>
                  <span className="text-ds-micro text-amber-300" data-state="case-state">
                    {c.escalationState ? CASE_ESCALATION_LABELS[c.escalationState] : 'Unreviewed'}
                  </span>
                  <span className="flex gap-1">
                    <Button className="text-ds-micro px-2 py-0.5" onClick={() => handleCaseReview(c.id, 'approve_escalation')}>
                      Approve escalation
                    </Button>
                    <Button variant="ghost" className="text-ds-micro px-2 py-0.5" onClick={() => handleCaseReview(c.id, 'request_info')}>
                      Request info
                    </Button>
                    <Button variant="ghost" className="text-ds-micro px-2 py-0.5 text-red-300" onClick={() => handleCaseReview(c.id, 'reject')}>
                      Reject
                    </Button>
                  </span>
                </div>
                {/* §Brief §6 — the Mercenta "checks" step: Knowledge Base
                    sufficiency + the relevant object, resolved in THIS tenant. */}
                <div className="flex flex-wrap items-center gap-2" data-state="case-sufficiency">
                  <StatusBadge tone={SUFFICIENCY_TONE[sufficiency.verdict]} dataStatus={sufficiency.verdict}>
                    {CASE_SUFFICIENCY_LABELS[sufficiency.verdict]}
                  </StatusBadge>
                  {sufficiency.articleIds.length > 0 && (
                    <span className="text-ds-micro text-zinc-500" data-state="case-kb">
                      Knowledge Base:{' '}
                      {sufficiency.articleIds
                        .map((id) => getKnowledgeArticle(id)?.title ?? id)
                        .join(' · ')}
                    </span>
                  )}
                </div>
                <ul className="space-y-0.5">
                  {sufficiency.reasons.map((r, i) => (
                    <li key={i} className="text-ds-micro text-zinc-500">
                      {r}
                    </li>
                  ))}
                </ul>
                {sufficiency.context.length > 0 && (
                  <ul className="space-y-0.5" data-state="case-context">
                    {sufficiency.context.map((ctx, i) => (
                      <li
                        key={i}
                        className={cn('text-ds-micro', ctx.resolved ? 'text-zinc-500' : 'text-amber-300')}
                      >
                        {ctx.resolved ? 'Verified · ' : 'Unverified · '}
                        {ctx.detail}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
        {listAllCases().filter((c) => c.escalationState === 'approved_for_escalation').length > 0 && (
          <div className="space-y-1.5 border-t border-white/[0.06] pt-2">
            <p className="text-ds-label text-zinc-400">Reviewed — ready to escalate to Amazon:</p>
            {listAllCases().filter((c) => c.escalationState === 'approved_for_escalation').map((c) => (
              <div key={c.id} className="flex flex-wrap items-center gap-2">
                <span className="text-ds-label font-mono text-brass-300">{c.caseRef ?? c.id}</span>
                <span className="text-ds-label text-zinc-300 flex-1 min-w-[160px]">{c.subject}</span>
                <Button className="text-ds-micro px-2 py-0.5" onClick={() => void handleCaseEscalate(c.id)}>
                  <ExternalLink className="w-3 h-3 mr-1" /> Escalate to Amazon
                </Button>
              </div>
            ))}
          </div>
        )}
        {listAllCases().some((c) => c.amazonCase) && (
          <div className="space-y-1 border-t border-white/[0.06] pt-2">
            <p className="text-ds-label text-zinc-400">Provider cases (truthful state):</p>
            {listAllCases().filter((c) => c.amazonCase).map((c) => (
              <div key={c.id} className="flex flex-wrap items-center gap-2 text-ds-label">
                <span className="font-mono text-brass-300">{c.caseRef ?? c.id}</span>
                <span className="font-mono text-zinc-400">{c.amazonCase?.referenceId}</span>
                <span className="text-zinc-500">{c.amazonCase?.simulated ? 'Simulation — no live Amazon case' : 'Live Amazon case'}</span>
                <span className="text-emerald-300">{c.escalationState ? CASE_ESCALATION_LABELS[c.escalationState] : ''}</span>
              </div>
            ))}
          </div>
        )}
        {/* §Brief §6 — return the channel's answer to the RIGHT case and tenant.
            The response is typed by the operator; the platform never invents one. */}
        {listAllCases().filter((c) => c.amazonCase && !c.providerResponse).length > 0 && (
          <div className="space-y-2 border-t border-white/[0.06] pt-2" data-state="case-response-panel">
            <p className="text-ds-label text-zinc-400">
              Record the retail channel&rsquo;s response as received. Nothing is generated or inferred.
            </p>
            <Input
              label="Response received"
              value={caseResponse}
              onChange={(e) => setCaseResponse(e.target.value)}
              placeholder="What the retail channel said"
            />
            <Select
              label="Outcome"
              value={caseOutcome}
              onChange={(e) => setCaseOutcome(e.target.value as typeof caseOutcome)}
              options={[
                { value: 'accepted', label: 'Accepted' },
                { value: 'rejected', label: 'Rejected' },
                { value: 'info_required', label: 'Information required' },
                { value: 'closed', label: 'Closed by the channel' },
              ]}
            />
            {listAllCases().filter((c) => c.amazonCase && !c.providerResponse).map((c) => (
              <div key={c.id} className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-ds-label text-brass-300">{c.caseRef ?? c.id}</span>
                <span className="min-w-[140px] flex-1 text-ds-label text-zinc-300">{c.subject}</span>
                <Button className="text-ds-micro px-2 py-0.5" data-state="case-record-response" onClick={() => handleCaseResponse(c.id)}>
                  Record response
                </Button>
              </div>
            ))}
          </div>
        )}
        {listAllCases().filter((c) => c.providerResponse && c.escalationState !== 'resolved' && c.escalationState !== 'closed').length > 0 && (
          <div className="space-y-2 border-t border-white/[0.06] pt-2" data-state="case-resolve-panel">
            <p className="text-ds-label text-zinc-400">
              Resolve the case with a note the brand will read.
            </p>
            <Input
              label="Resolution note"
              value={caseResolution}
              onChange={(e) => setCaseResolution(e.target.value)}
              placeholder="What Mercenta has concluded and what happens next"
            />
            {listAllCases()
              .filter((c) => c.providerResponse && c.escalationState !== 'resolved' && c.escalationState !== 'closed')
              .map((c) => (
                <div key={c.id} className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-ds-label text-brass-300">{c.caseRef ?? c.id}</span>
                  <span className="min-w-[140px] flex-1 text-ds-label text-zinc-300">{c.subject}</span>
                  <Button className="text-ds-micro px-2 py-0.5" data-state="case-resolve" onClick={() => handleCaseResolve(c.id)}>
                    Resolve case
                  </Button>
                </div>
              ))}
          </div>
        )}
      </Card>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
        <Card className="p-3"><p className="text-zinc-500">Open</p><p className="text-xl font-bold text-white mt-1">{metrics.openCount}</p></Card>
        <Card className="p-3"><p className="text-zinc-500">Pending</p><p className="text-xl font-bold text-amber-400 mt-1">{metrics.pendingCount}</p></Card>
        <Card className="p-3"><p className="text-zinc-500">Resolved Today</p><p className="text-xl font-bold text-emerald-400 mt-1">{metrics.resolvedToday}</p></Card>
        <Card className="p-3 border-red-500/20"><p className="text-zinc-500">SLA Overdue</p><p className="text-xl font-bold text-red-400 mt-1">{overdueCount}</p></Card>
        <Card className="p-3"><p className="text-zinc-500">Unassigned</p><p className="text-xl font-bold text-zinc-300 mt-1">{metrics.unassignedCount}</p></Card>
      </div>
      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 md:col-span-4 p-0 overflow-hidden">
          <div className="p-3 border-b border-white/[0.06] space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tickets…"
                aria-label="Search tickets"
                className="w-full bg-ink-900 border border-white/[0.08] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-brass-500/40" />
            </div>
            {/* §Wave-3 Part 4 — the filter chip rows WRAP. They were single-line
                `flex` rows inside a `p-0 overflow-hidden` card, so at 768px the
                priority chips (All/Urgent/High/Medium/Low) measured 19px wider than
                the card and the last chip was clipped and unreachable. */}
            <div className="flex flex-wrap gap-1 text-ds-micro">
              {(['all', 'open', 'pending', 'resolved'] as const).map((s) => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={'px-2 py-1 rounded-md ' + (statusFilter === s ? 'bg-brass-500/20 text-brass-300' : 'text-zinc-500 hover:text-white')}>
                  {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1 text-ds-micro">
              {(['all', 'urgent', 'high', 'medium', 'low'] as const).map((p) => (
                <button key={p} onClick={() => setPriorityFilter(p)}
                  className={'px-2 py-1 rounded-md ' + (priorityFilter === p ? 'bg-brass-500/20 text-brass-300' : 'text-zinc-500 hover:text-white')}>
                  {p === 'all' ? 'All' : p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="max-h-[500px] overflow-y-auto divide-y divide-white/[0.04]">
            {filteredTickets.map((t: Ticket) => {
              const Icon = PI[t.priority];
              const sla = slaInd(t.slaDeadline, t.status);
              return (
                <button key={t.id} onClick={() => { setSelectedTicketId(t.id); markTicketSeen(t.id); }}
                  className={'w-full text-left px-3 py-2.5 ' + (selectedTicketId === t.id ? 'bg-brass-500/10' : 'hover:bg-white/[0.02]')}>
                  <div className="flex items-center justify-between gap-1.5 mb-0.5">
                    <span className="text-xs font-medium text-white truncate">{brandName(t.brandId)}</span>
                    <Icon className={'w-3 h-3 ' + (t.priority === 'urgent' ? 'text-red-400' : t.priority === 'high' ? 'text-amber-400' : 'text-zinc-500')} />
                  </div>
                  <p className="text-ds-micro text-zinc-500 truncate">{t.lastMessagePreview}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={'text-ds-micro px-1.5 py-0.5 rounded ' + SC[t.status]}>{t.status}</span>
                    <span className={'text-ds-micro px-1.5 py-0.5 rounded ' + PB[t.priority]}>{t.priority}</span>
                    {sla && <span className={'text-ds-micro ' + sla.cls}>{sla.label}</span>}
                    {!t.seenByStaff && <span className="w-1.5 h-1.5 rounded-full bg-brass-500" />}
                  </div>
                </button>
              );
            })}
            {filteredTickets.length === 0 && <p className="text-xs text-zinc-600 text-center py-6">No tickets match.</p>}
          </div>
        </Card>
        <Card className="col-span-12 md:col-span-8 p-4">
          {selectedTicket ? (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3 border-b border-white/[0.06] pb-3">
                <div>
                  <h3 className="text-sm font-semibold text-white">{selectedTicket.subject}</h3>
                  <div className="flex items-center gap-2 mt-1 text-ds-micro text-zinc-500">
                    <span>{brandName(selectedTicket.brandId)}</span> <span>·</span>
                    <span>{selectedTicket.source === 'live_chat' ? 'Live Chat' : selectedTicket.source}</span> <span>·</span>
                    <span>{new Date(selectedTicket.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <select value={selectedTicket.status} onChange={(e) => { updateTicketStatus(selectedTicket.id, e.target.value as TicketStatus, actingStaff?.id); bumpStore(); }}
                  aria-label="Ticket status"
                  className="bg-ink-900 border border-white/[0.08] rounded-md px-2 py-1 text-ds-micro text-white">
                  {(['open', 'pending', 'resolved'] as const).map((s) => (<option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>))}
                </select>
              </div>
              <div className="flex items-center gap-3 text-ds-micro">
                <User className="w-3 h-3 text-zinc-500" />
                <select value={selectedTicket.assignedToStaffId ?? ''} onChange={(e) => { assignTicket(selectedTicket.id, e.target.value, actingStaff?.id); bumpStore(); }}
                  aria-label="Assign ticket to"
                  className="bg-ink-900 border border-white/[0.08] rounded-md px-2 py-1 text-ds-micro text-white">
                  <option value="">Unassigned</option>
                  {staff.filter((s: any) => s.active).map((s: any) => (<option key={s.id} value={s.id}>{s.name}</option>))}
                </select>
                <Filter className="w-3 h-3 text-zinc-500" />
                <select value={selectedTicket.priority} onChange={(e) => { setTicketPriority(selectedTicket.id, e.target.value as TicketPriority, actingStaff?.id); bumpStore(); }}
                  aria-label="Ticket priority"
                  className="bg-ink-900 border border-white/[0.08] rounded-md px-2 py-1 text-ds-micro text-white">
                  {(['urgent', 'high', 'medium', 'low'] as const).map((p) => (<option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>))}
                </select>
                {selectedTicket.slaDeadline && (() => {
                  const s = slaInd(selectedTicket.slaDeadline, selectedTicket.status);
                  return s ? <span className={'text-ds-micro font-mono ' + s.cls}>SLA: {s.label}</span> : null;
                })()}
              </div>
              <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
                {ticketMessages.length === 0 && <p className="text-xs text-zinc-600 py-4">No messages yet.</p>}
                {ticketMessages.map((m: any) => (
                  <div key={m.id} className={'flex ' + (m.direction === 'outbound' ? 'justify-end' : 'justify-start')}>
                    <div className={'max-w-[80%] rounded-xl px-3 py-2 text-xs ' + (m.direction === 'outbound' ? 'bg-brass-500/15 text-zinc-200' : 'bg-white/[0.04] text-zinc-300')}>
                      <p className="whitespace-pre-wrap">{m.body}</p>
                      <p className="mt-1 text-ds-micro text-zinc-500 font-mono">{new Date(m.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
              {aiSuggestion && (
                <div className="border border-brass-500/20 bg-brass-500/5 rounded-lg p-2.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Bot className="w-3 h-3 text-brass-400" />
                    <span className="text-ds-micro font-medium text-brass-300">AI Suggested Reply</span>
                    <button onClick={() => setReplyDraft(aiSuggestion)} className="ml-auto text-ds-micro text-zinc-500 hover:text-white">
                      <ArrowUpRight className="w-3 h-3 inline" /> Use
                    </button>
                  </div>
                  <p className="text-ds-micro text-zinc-400 italic">{aiSuggestion}</p>
                </div>
              )}
              <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                <textarea value={replyDraft} onChange={(e) => setReplyDraft(e.target.value)}
                  rows={3} placeholder="Type a reply…"
                  className="w-full bg-ink-900 border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brass-500/40" />
                <div className="flex items-center justify-between">
                  {replyNote && <span className="text-ds-micro text-zinc-500">{replyNote}</span>}
                  <Button className="text-xs ml-auto" disabled={!replyDraft.trim()} onClick={handleSendReply}>
                    <Send className="w-3 h-3 mr-1.5" /> Send Reply
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-zinc-600 text-center py-8">Select a ticket.</p>
          )}
        </Card>
      </div>
    </WorkspaceFrame>
  );
}