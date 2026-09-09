import { useState, useMemo } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { useBrands, useMessages } from '@/data/queries';
import { logMessage } from '@/data/api';
import { Badge, Button, Card } from '@/components/ui';
import { cn } from '@/utils/cn';
import type { Ticket, TicketStatus, TicketPriority } from '@/types';
import { demoTickets, updateTicketStatus, assignTicket, setTicketPriority, markTicketSeen, computeHelpdeskMetrics, getTicketById, appendMessageToTicket } from '@/lib/helpdesk/ticketStore';
import { Inbox, AlertTriangle, Clock, User, Send, Filter, Search, Bot, ArrowUpRight } from 'lucide-react';
const PB: Record<TicketPriority, string> = { urgent: 'bg-red-500/15 text-red-300', high: 'bg-amber-500/15 text-amber-300', medium: 'bg-blue-500/15 text-blue-300', low: 'bg-zinc-500/15 text-zinc-400' };
const PI: Record<TicketPriority, typeof AlertTriangle> = { urgent: AlertTriangle, high: AlertTriangle, medium: Clock, low: Inbox };
const SC: Record<TicketStatus, string> = { open: 'bg-emerald-500/15 text-emerald-300', pending: 'bg-amber-500/15 text-amber-300', resolved: 'bg-zinc-500/15 text-zinc-400' };

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
      'brand-zambezi': 'Let me check dispatch for your Marula Oil PO - updating within 2h.',
      'brand-nordhaus': 'Thank you for submitting HMRC docs. In review - 3-5 business days.',
      'brand-apexdrive': 'I see the pricing discrepancy on PO-9045. Escalating, will reply within 24h.',
      'brand-harvestlane': 'PO-9002 scheduled for next consolidation. Dispatch within 10 days.',
    };
    return m[brandId] ?? 'Thank you. Let me investigate and get back to you.';
  }, [brandId]);
}
export function HelpdeskDashboard() {
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

  const metrics = computeHelpdeskMetrics();
  const overdueCount = demoTickets.filter((t) => t.slaDeadline && new Date(t.slaDeadline) < new Date() && t.status !== 'resolved').length;

  const filteredTickets = useMemo(() => {
    let list = [...demoTickets];
    if (statusFilter !== 'all') list = list.filter((t: Ticket) => t.status === statusFilter);
    if (priorityFilter !== 'all') list = list.filter((t: Ticket) => t.priority === priorityFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((t: Ticket) => t.subject.toLowerCase().includes(q) || t.lastMessagePreview.toLowerCase().includes(q) ||
        brands.find((b: any) => b.id === t.brandId)?.profile.businessName.toLowerCase().includes(q));
    }
    return list.sort((a: Ticket, b: Ticket) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
  }, [statusFilter, priorityFilter, searchQuery, brands]);

  const selectedTicket = selectedTicketId ? getTicketById(selectedTicketId) : null;
  const ticketMessages = useMemo(() => {
    if (!selectedTicket) return [];
    return allMessages.filter((m: any) => selectedTicket.messageIds.includes(m.id));
  }, [selectedTicket, allMessages]);
  const aiSuggestion = useAiSug(selectedTicket?.brandId ?? '', ticketMessages.map((m: any) => m.body).join('\n'));
  const brandName = (id: string) => brands.find((b: any) => b.id === id)?.profile.businessName ?? id;

  function handleSendReply() {
    if (!replyDraft.trim() || !selectedTicket) return;
    logMessage({ brandId: selectedTicket.brandId, channel: 'in_app', direction: 'outbound',
      subject: 'Re: ' + selectedTicket.subject, body: replyDraft, sentBy: 'staff', requiresHuman: false })
      .then((msg) => {
        appendMessageToTicket(selectedTicket.id, msg.id);
        setReplyNote('Reply sent.'); setReplyDraft('');
        setTimeout(() => setReplyNote(null), 3000);
      });
  }
return (
    <div className="p-6 space-y-4 max-w-[1400px] mx-auto">
      <div className="flex items-center gap-3">
        <Inbox className="w-5 h-5 text-brass-400" />
        <div>
          <h2 className="text-lg font-semibold text-white">Helpdesk</h2>
          <p className="text-xs text-zinc-500 mt-0.5">{metrics.openCount} open, {metrics.pendingCount} pending, {metrics.unassignedCount} unassigned</p>
        </div>
      </div>
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
                className="w-full bg-ink-900 border border-white/[0.08] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-brass-500/40" />
            </div>
            <div className="flex gap-1 text-[10px]">
              {(['all', 'open', 'pending', 'resolved'] as const).map((s) => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={'px-2 py-1 rounded-md ' + (statusFilter === s ? 'bg-brass-500/20 text-brass-300' : 'text-zinc-500 hover:text-white')}>
                  {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
            <div className="flex gap-1 text-[10px]">
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
                  <p className="text-[10px] text-zinc-500 truncate">{t.lastMessagePreview}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={'text-[8px] px-1.5 py-0.5 rounded ' + SC[t.status]}>{t.status}</span>
                    <span className={'text-[8px] px-1.5 py-0.5 rounded ' + PB[t.priority]}>{t.priority}</span>
                    {sla && <span className={'text-[8px] ' + sla.cls}>{sla.label}</span>}
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
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-500">
                    <span>{brandName(selectedTicket.brandId)}</span> <span>·</span>
                    <span>{selectedTicket.source === 'live_chat' ? 'Live Chat' : selectedTicket.source}</span> <span>·</span>
                    <span>{new Date(selectedTicket.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <select value={selectedTicket.status} onChange={(e) => updateTicketStatus(selectedTicket.id, e.target.value as TicketStatus, actingStaff?.id)}
                  className="bg-ink-900 border border-white/[0.08] rounded-md px-2 py-1 text-[10px] text-white">
                  {(['open', 'pending', 'resolved'] as const).map((s) => (<option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>))}
                </select>
              </div>
              <div className="flex items-center gap-3 text-[10px]">
                <User className="w-3 h-3 text-zinc-500" />
                <select value={selectedTicket.assignedToStaffId ?? ''} onChange={(e) => assignTicket(selectedTicket.id, e.target.value, actingStaff?.id)}
                  className="bg-ink-900 border border-white/[0.08] rounded-md px-2 py-1 text-[10px] text-white">
                  <option value="">Unassigned</option>
                  {staff.filter((s: any) => s.active).map((s: any) => (<option key={s.id} value={s.id}>{s.name}</option>))}
                </select>
                <Filter className="w-3 h-3 text-zinc-500" />
                <select value={selectedTicket.priority} onChange={(e) => setTicketPriority(selectedTicket.id, e.target.value as TicketPriority, actingStaff?.id)}
                  className="bg-ink-900 border border-white/[0.08] rounded-md px-2 py-1 text-[10px] text-white">
                  {(['urgent', 'high', 'medium', 'low'] as const).map((p) => (<option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>))}
                </select>
                {selectedTicket.slaDeadline && (() => {
                  const s = slaInd(selectedTicket.slaDeadline, selectedTicket.status);
                  return s ? <span className={'text-[9px] font-mono ' + s.cls}>SLA: {s.label}</span> : null;
                })()}
              </div>
              <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
                {ticketMessages.length === 0 && <p className="text-xs text-zinc-600 py-4">No messages yet.</p>}
                {ticketMessages.map((m: any) => (
                  <div key={m.id} className={'flex ' + (m.direction === 'outbound' ? 'justify-end' : 'justify-start')}>
                    <div className={'max-w-[80%] rounded-xl px-3 py-2 text-xs ' + (m.direction === 'outbound' ? 'bg-brass-500/15 text-zinc-200' : 'bg-white/[0.04] text-zinc-300')}>
                      <p className="whitespace-pre-wrap">{m.body}</p>
                      <p className="mt-1 text-[9px] text-zinc-500 font-mono">{new Date(m.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
              {aiSuggestion && (
                <div className="border border-brass-500/20 bg-brass-500/5 rounded-lg p-2.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Bot className="w-3 h-3 text-brass-400" />
                    <span className="text-[10px] font-medium text-brass-300">AI Suggested Reply</span>
                    <button onClick={() => setReplyDraft(aiSuggestion)} className="ml-auto text-[9px] text-zinc-500 hover:text-white">
                      <ArrowUpRight className="w-3 h-3 inline" /> Use
                    </button>
                  </div>
                  <p className="text-[10px] text-zinc-400 italic">{aiSuggestion}</p>
                </div>
              )}
              <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                <textarea value={replyDraft} onChange={(e) => setReplyDraft(e.target.value)}
                  rows={3} placeholder="Type a reply…"
                  className="w-full bg-ink-900 border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brass-500/40" />
                <div className="flex items-center justify-between">
                  {replyNote && <span className="text-[10px] text-zinc-500">{replyNote}</span>}
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
    </div>
  );
}