/**
 * §Batch-13 — Brand live chat widget.
 *
 * §FLOAT-LAUNCHER (2026-10-05) — MOVED INTO SHELL CHROME.
 *
 * The collapsed trigger used to be a `fixed bottom-6 right-6 z-50 w-12 h-12`
 * floating button. Because the workspace `<main>` is the scroll container, that
 * button permanently covered the bottom-right 48×48 region — exactly where
 * table row actions and drawer footers come to rest. A REAL regression was
 * caught by it once (migrating Product Catalog to the taller canonical header
 * pushed a catalogue row into the launcher band and made "Check result"
 * unclickable); the underlying collision was only MITIGATED then, never fixed
 * at the root.
 *
 * It is now an INLINE control in the header chrome that opens the panel as a
 * header-anchored dropdown — the same pattern already used by the profile menu,
 * ThemeSelector and NotificationCenter. No fixed bottom-right element remains,
 * so the corner can never be covered again. The message / ticket behaviour is
 * unchanged: messages still log through `logMessage` into the canonical store
 * and still open a helpdesk ticket, exactly as before.
 */
import { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { EmptyState } from '@/components/ui';
import { useMessages } from '@/data/queries';
import { logMessage } from '@/data/api';
import { findOrCreateTicketForBrand, appendMessageToTicket } from '@/lib/helpdesk/ticketStore';
import { cn } from '@/utils/cn';
import { MessageSquare, Send, MinusCircle, Bot } from 'lucide-react';

export function LiveChatWidget() {
  const { session, brandProfile } = useApp();
  const messagesQuery = useMessages();
  const allMessages = useMemo(() => messagesQuery.data?.data ?? [], [messagesQuery.data]);
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
    <div className="relative" data-testid="live-chat-widget">
      {/*
        §FLOAT-LAUNCHER — the trigger is INLINE header chrome, never a fixed
        corner overlay. It opens the panel below it as a header-anchored
        dropdown, so it can never cover a table's bottom-right row actions.
      */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="live-chat-panel"
        aria-label={open ? 'Close support chat' : 'Open support chat'}
        title="Support chat"
        data-testid="live-chat-trigger"
        className="relative flex h-9 w-9 items-center justify-center rounded-ds-md text-zinc-500 transition-ds duration-ds-fast hover:bg-tint hover:text-zinc-200"
      >
        <MessageSquare className="h-4 w-4" aria-hidden="true" />
      </button>

      {/* Chat panel — header-anchored dropdown (same shape as the profile menu) */}
      {open && (
        <div
          id="live-chat-panel"
          role="dialog"
          aria-label="Mercenta support chat"
          data-testid="live-chat-panel"
          className="ds-card absolute right-0 top-full z-50 mt-2 flex h-[500px] max-h-[70vh] w-[360px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-ds-lg border bg-ink-850 shadow-ds-overlay animate-fade-in"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-hairline bg-ink-900">
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <div>
                <p className="text-xs font-medium text-strong">Mercenta Support</p>
                <p className="text-ds-micro text-zinc-500">We typically reply within 2 hours</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-zinc-500 hover:text-strong transition-colors">
              <MinusCircle className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {threadMessages.length === 0 && sentCount === 0 && (
              <EmptyState
                icon={<Bot className="h-5 w-5" aria-hidden="true" />}
                title="Hi! How can we help you today?"
                description="Ask about your POs, shipments, compliance status, or anything else."
              />
            )}
            {threadMessages.map((m) => (
              <div key={m.id} className={cn('flex', m.direction === 'outbound' ? 'justify-start' : 'justify-end')}>
                <div className={cn('max-w-[85%] rounded-ds-lg px-3 py-2 text-xs leading-relaxed',
                  m.direction === 'outbound' ? 'bg-brass-500/15 text-zinc-200' : 'bg-brass-500 text-strong'
                )}>
                  <p className="whitespace-pre-wrap">{m.body}</p>
                  <p className="mt-1 text-ds-micro text-zinc-500 font-mono">
                    {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            {sentCount > 0 && threadMessages.length === 0 && (
              <p className="text-ds-micro text-zinc-600 text-center py-4">Message sent — awaiting reply.</p>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Compose */}
          <div className="p-3 border-t border-hairline bg-ink-900">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Type your message…"
                className="flex-1 bg-ink-850 border border-hairline rounded-ds-md px-3 py-2 text-xs text-strong placeholder-zinc-600 focus:outline-none focus:border-brass-500/40"
              />
              <button
                onClick={handleSend}
                disabled={!draft.trim()}
                className="w-8 h-8 rounded-ds-md bg-brass-500 hover:bg-brass-400 disabled:bg-zinc-700 disabled:text-zinc-500 text-strong flex items-center justify-center transition-colors flex-shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}