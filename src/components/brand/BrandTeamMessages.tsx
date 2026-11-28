/**
 * \u00a7Batch-29 — Brand team & support hub.
 *
 * Single tab covering two needs:
 * 1. Support conversation with Mercenta (reuses the same messages/logMessage
 *    pipeline as the floating LiveChatWidget, but in a full-page view).
 * 2. Internal team messaging (simple threaded notes among the brand's own
 *    invited team members, same brand-scoped messages table).
 */
import { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { useMessages } from '@/data/queries';
import { logMessage } from '@/data/api';
import { demoTeamMembers } from '@/data/demoStore';
import { cn } from '@/utils/cn';
import { Badge } from '@/components/ui';
import { WorkspaceFrame, WorkspaceHeader } from '@/components/shared/workspace';
import { MessageSquare, Send, Users, FileText, Bot } from 'lucide-react';

export function BrandTeamMessages() {
  const { session, brandProfile } = useApp();
  const messagesQuery = useMessages();
  const allMessages = useMemo(() => messagesQuery.data?.data ?? [], [messagesQuery.data]);
  const brandId = session?.tenantId ?? '';
  const brandName = brandProfile?.businessName ?? 'Brand';
  const [supportDraft, setSupportDraft] = useState('');
  const [noteDraft, setNoteDraft] = useState('');
  const [activeTab, setActiveTab] = useState<'support' | 'notes'>('support');
  const bottomRef = useRef<HTMLDivElement>(null);
  const teamMembers = useMemo(() => demoTeamMembers.filter((m) => m.brandId === brandId), [brandId]);
  const supportMessages = useMemo(() => {
    if (!brandId) return [];
    return allMessages.filter((m) => m.brandId === brandId && m.channel !== 'team_note')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [allMessages, brandId]);
  const teamNotes = useMemo(() => {
    if (!brandId) return [];
    return allMessages.filter((m) => m.brandId === brandId && m.channel === 'team_note')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [allMessages, brandId]);

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [supportMessages.length, teamNotes.length]);

  async function handleSupportSend() {
    if (!supportDraft.trim() || !brandId) return;
    await logMessage({ brandId, channel: 'in_app', direction: 'inbound',
      subject: 'Support message', body: supportDraft,
      sentBy: 'staff', requiresHuman: true });
    setSupportDraft('');
  }

  async function handleNoteSend() {
    if (!noteDraft.trim() || !brandId) return;
    await logMessage({ brandId, channel: 'team_note', direction: 'inbound',
      subject: 'team-note: ' + (brandProfile?.signatory ?? brandName),
      body: noteDraft, sentBy: 'staff',
      requiresHuman: false });
    setNoteDraft('');
  }

  if (!brandId) return null;

  return (
    <WorkspaceFrame className="flex h-full flex-col space-y-4">
      <WorkspaceHeader
        eyebrow="BRAND PORTAL · SUPPORT"
        title="Support & Team"
        description="Chat with Mercenta support and message your team."
      />
      <div className="flex gap-4 mb-4 border-b border-hairline">
        <button onClick={() => setActiveTab('support')} className={cn('pb-2 text-xs font-medium', activeTab === 'support' ? 'text-strong border-b-2 border-accent-500' : 'text-muted')}>
          <MessageSquare className="w-3.5 h-3.5 inline mr-1" /> Support Chat
        </button>
        <button onClick={() => setActiveTab('notes')} className={cn('pb-2 text-xs font-medium', activeTab === 'notes' ? 'text-strong border-b-2 border-accent-500' : 'text-muted')}>
          <Users className="w-3.5 h-3.5 inline mr-1" /> Team Notes
        </button>
      </div>
      {/* §discovered-support-team-mobile-pane-overflow — STACKED below `md`. The two panes sit side by side
          from `md` up; on a phone they stack (chat first, the team pane below) so the surface never needs a
          sideways scroll (measured 86–102px of horizontal overflow before this). */}
      <div className="flex-1 flex flex-col gap-4 min-h-0 md:flex-row">
        <div className="flex-1 flex flex-col min-h-0">
          {activeTab === 'support' && (
            <div className="flex-1 flex flex-col bg-surface/50 border border-hairline rounded-ds-lg overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {supportMessages.length === 0 && (
                  <div className="text-center py-12">
                    <Bot className="w-10 h-10 text-faint mx-auto mb-3" />
                    <p className="text-sm text-muted">Start a conversation with Mercenta support</p>
                    <p className="text-xs text-faint mt-1">Ask about POs, shipments, compliance, or anything else.</p>
                  </div>
                )}
                {supportMessages.map((m) => {
                  /* §BATCH 4b — DEFECT FIXED AT SOURCE (2026-11-28). The message META text used
                     `text-muted` regardless of the bubble's own fill. On the outbound bubble
                     (`bg-surface-overlay`) that is correct — a surface colour on a surface. On the
                     INBOUND bubble the fill is `bg-accent-500` (#FF6A00), where `--mr-text-muted`
                     (#A5A5A5) measures **1.17:1**: the sender and timestamp were, measured, not
                     readable. The fill now decides its own tokens (the same rule the send button
                     below already follows with `text-on-accent`), so the meta is `--mr-on-accent`
                     a shade quieter — 7.28:1 at full strength, ~4.8:1 at 80% opacity — on the accent
                     bubble, and unchanged `text-muted` on the surface bubble. Found by
                     `scripts/visual-acceptance.mjs`, which is the only thing that measures this. */
                  const inbound = m.direction !== 'outbound';
                  const onFill = inbound ? 'text-on-accent' : 'text-strong';
                  const onFillQuiet = inbound ? 'text-on-accent opacity-80' : 'text-muted';
                  return (
                  <div key={m.id} className={cn('flex', m.direction === 'outbound' ? 'justify-start' : 'justify-end')}>
                    <div className={cn('max-w-[80%] rounded-ds-lg px-3 py-2 text-xs', inbound ? 'bg-accent-500' : 'bg-surface-overlay', onFill)}>
                      {m.subject !== 'Support message' && m.subject !== 'Live chat message' && (
                        <p className={cn('text-ds-micro mb-1 font-medium', onFillQuiet)}>{m.subject}</p>
                      )}
                      <p className="whitespace-pre-wrap">{m.body}</p>
                      <p className={cn('mt-1 text-ds-micro font-mono', onFillQuiet)}>{m.sentBy} &middot; {new Date(m.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
              <div className="p-3 border-t border-hairline bg-surface">
                <div className="flex items-center gap-2">
                  <input type="text" value={supportDraft} onChange={(e) => setSupportDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSupportSend(); } }} placeholder="Message Mercenta support..." aria-label="Message Mercenta support" className="flex-1 bg-surface-raised border border-hairline rounded-ds-md px-3 py-2 text-xs text-on-accent placeholder-faint focus:outline-none focus:border-accent-500/40" />
                  <button onClick={handleSupportSend} disabled={!supportDraft.trim()} aria-label="Send support message" className="w-8 h-8 rounded-ds-md bg-accent-500 hover:bg-accent-400 disabled:bg-surface-overlay disabled:text-muted text-on-accent flex items-center justify-center flex-shrink-0">
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'notes' && (
            <div className="flex-1 flex flex-col bg-surface/50 border border-hairline rounded-ds-lg overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {teamNotes.length === 0 && (
                  <div className="text-center py-12">
                    <FileText className="w-10 h-10 text-faint mx-auto mb-3" />
                    <p className="text-sm text-muted">No team notes yet</p>
                    <p className="text-xs text-faint mt-1">Internal notes are visible to everyone on your team.</p>
                  </div>
                )}
                {teamNotes.map((m) => (
                  <div key={m.id} className="bg-surface-raised border border-hairline rounded-ds-md px-3 py-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-ds-micro font-medium text-strong">{m.sentBy}</span>
                      <span className="text-ds-micro text-faint font-mono">{new Date(m.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-muted whitespace-pre-wrap">{m.body}</p>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              <div className="p-3 border-t border-hairline bg-surface">
                <div className="flex items-center gap-2">
                  <input type="text" value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleNoteSend(); } }} placeholder="Add a note for your team..." aria-label="Add a note for your team" className="flex-1 bg-surface-raised border border-hairline rounded-ds-md px-3 py-2 text-xs text-on-accent placeholder-faint focus:outline-none focus:border-accent-500/40" />
                  <button onClick={handleNoteSend} disabled={!noteDraft.trim()} aria-label="Send note" className="w-8 h-8 rounded-ds-md bg-accent-500 hover:bg-accent-400 disabled:bg-surface-overlay disabled:text-muted text-on-accent flex items-center justify-center flex-shrink-0">
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="w-full bg-surface/50 border border-hairline rounded-ds-lg p-3 md:w-56 md:flex-shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-3.5 h-3.5 text-muted" />
            <span className="text-ds-micro font-medium text-muted uppercase">Team ({teamMembers.length})</span>
          </div>
          <div className="space-y-2">
            {teamMembers.map((m) => (
              <div key={m.id} className="flex items-center gap-2">
                <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-ds-micro font-medium', m.active ? 'bg-accent-500/20 text-accent-300' : 'bg-surface-overlay text-faint')}>
                  {m.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-ds-label text-strong truncate">{m.name}</p>
                  <div className="flex items-center gap-1">
                    <Badge className="text-ds-micro bg-surface-raised text-muted px-1">{m.role}</Badge>
                    {!m.active && <span className="text-ds-micro text-faint">(invited)</span>}
                  </div>
                </div>
              </div>
            ))}
            {teamMembers.length === 0 && (
              <p className="text-ds-micro text-faint">No team members invited yet. Add them in Settings.</p>
            )}
          </div>
        </div>
      </div>
    </WorkspaceFrame>
  );
}
