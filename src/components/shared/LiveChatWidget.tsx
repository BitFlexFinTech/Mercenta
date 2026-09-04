/**
 * §Batch-13 — Brand live chat widget.
 *
 * Floating chat widget in the brand portal that reuses the existing
 * messages table for thread history. Messages are logged via the same
 * logMessage pipeline that admin MessagesHub uses.
 */
import { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { useMessages } from '@/data/queries';
import { logMessage } from '@/data/api';
import { findOrCreateTicketForBrand, appendMessageToTicket } from '@/lib/helpdesk/ticketStore';
import { cn } from '@/utils/cn';
import { MessageSquare, X, Send, MinusCircle, Bot } from 'lucide-react';
import { Button } from '@/components/ui';

export function LiveChatWidget() {
  const { session, brandProfile } = useApp();
  const messagesQuery = useMessages();
  const allMessages = messagesQuery.data?.data ?? [];
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [sentCount, setSentCount] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  const brandId = session?.tenantId ?? '';
  const brandName = brandProfile?.businessName ?? 'Brand';

  // Filter messages for this brand
  const threadMessages = useMemo(() => {
    if (!brandId) return [];
    return allMessages.filter((m) => m.brandId === brandId).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [allMessages, brandId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (open && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [threadMessages.length, open]);

  async function handleSend() {
    if (!draft.trim() || !brandId) return;
    const msg = await logMessage({
      brandId,
      channel: 'in_app',
      direction: 'inbound',
      subject: 'Live chat message',
      body: draft,
      sentBy: 'staff',
      requiresHuman: true,
    });
    // Auto-create or reuse a ticket in the helpdesk for this brand
    const ticket = findOrCreateTicketForBrand(brandId, brandName + ' — live chat', 'live_chat', 'support');
    appendMessageToTicket(ticket.id, msg.id);
    setDraft('');
    setSentCount((c) => c + 1);
  }

  if (!brandId) return null;

  return (
    <>
      {/* Chat button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-brass-500 hover:bg-brass-400 text-white shadow-xl flex items-center justify-center transition-all hover:scale-105"
          aria-label="Open live chat"
        >
          <MessageSquare className="w-5 h-5" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[360px] h-[500px] bg-ink-850 border border-white/[0.08] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-ink-900">
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <div>
                <p className="text-xs font-medium text-white">Mercenta Support</p>
                <p className="text-[9px] text-zinc-500">We typically reply within 2 hours</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
              <MinusCircle className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {threadMessages.length === 0 && sentCount === 0 && (
              <div className="text-center py-8">
                <Bot className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                <p className="text-xs text-zinc-500">Hi! How can we help you today?</p>
                <p className="text-[10px] text-zinc-600 mt-1">
                  Ask about your POs, shipments, compliance status, or anything else.
                </p>
              </div>
            )}
            {threadMessages.map((m) => (
              <div key={m.id} className={cn('flex', m.direction === 'outbound' ? 'justify-start' : 'justify-end')}>
                <div className={cn('max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed',
                  m.direction === 'outbound' ? 'bg-brass-500/15 text-zinc-200' : 'bg-brass-500 text-white'
                )}>
                  <p className="whitespace-pre-wrap">{m.body}</p>
                  <p className="mt-1 text-[9px] text-zinc-500 font-mono">
                    {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            {sentCount > 0 && threadMessages.length === 0 && (
              <p className="text-[10px] text-zinc-600 text-center py-4">Message sent — awaiting reply.</p>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Compose */}
          <div className="p-3 border-t border-white/[0.06] bg-ink-900">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Type your message…"
                className="flex-1 bg-ink-850 border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-brass-500/40"
              />
              <button
                onClick={handleSend}
                disabled={!draft.trim()}
                className="w-8 h-8 rounded-lg bg-brass-500 hover:bg-brass-400 disabled:bg-zinc-700 disabled:text-zinc-500 text-white flex items-center justify-center transition-colors flex-shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}