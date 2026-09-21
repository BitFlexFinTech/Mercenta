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
      <div className="flex gap-4 mb-4 border-b border-white/[0.06]">
        <button onClick={() => setActiveTab('support')} className={cn('pb-2 text-xs font-medium', activeTab === 'support' ? 'text-white border-b-2 border-brass-500' : 'text-zinc-500')}>
          <MessageSquare className="w-3.5 h-3.5 inline mr-1" /> Support Chat
        </button>
        <button onClick={() => setActiveTab('notes')} className={cn('pb-2 text-xs font-medium', activeTab === 'notes' ? 'text-white border-b-2 border-brass-500' : 'text-zinc-500')}>
          <Users className="w-3.5 h-3.5 inline mr-1" /> Team Notes
        </button>
      </div>
      <div className="flex-1 flex gap-4 min-h-0">
        <div className="flex-1 flex flex-col min-h-0">
          {activeTab === 'support' && (
            <div className="flex-1 flex flex-col bg-ink-900/50 border border-white/[0.06] rounded-xl overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {supportMessages.length === 0 && (
                  <div className="text-center py-12">
                    <Bot className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                    <p className="text-sm text-zinc-500">Start a conversation with Mercenta support</p>
                    <p className="text-xs text-zinc-600 mt-1">Ask about POs, shipments, compliance, or anything else.</p>
                  </div>
                )}
                {supportMessages.map((m) => (
                  <div key={m.id} className={cn('flex', m.direction === 'outbound' ? 'justify-start' : 'justify-end')}>
                    <div className={cn('max-w-[80%] rounded-xl px-3 py-2 text-xs', m.direction === 'outbound' ? 'bg-zinc-800 text-zinc-200' : 'bg-brass-500 text-white')}>
                      {m.subject !== 'Support message' && m.subject !== 'Live chat message' && (
                        <p className="text-ds-micro text-zinc-500 mb-1 font-medium">{m.subject}</p>
                      )}
                      <p className="whitespace-pre-wrap">{m.body}</p>
                      <p className="mt-1 text-ds-micro text-zinc-500 font-mono">{m.sentBy} &middot; {new Date(m.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              <div className="p-3 border-t border-white/[0.06] bg-ink-900">
                <div className="flex items-center gap-2">
                  <input type="text" value={supportDraft} onChange={(e) => setSupportDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSupportSend(); } }} placeholder="Message Mercenta support..." className="flex-1 bg-ink-850 border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-brass-500/40" />
                  <button onClick={handleSupportSend} disabled={!supportDraft.trim()} className="w-8 h-8 rounded-lg bg-brass-500 hover:bg-brass-400 disabled:bg-zinc-700 disabled:text-zinc-500 text-white flex items-center justify-center flex-shrink-0">
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'notes' && (
            <div className="flex-1 flex flex-col bg-ink-900/50 border border-white/[0.06] rounded-xl overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {teamNotes.length === 0 && (
                  <div className="text-center py-12">
                    <FileText className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                    <p className="text-sm text-zinc-500">No team notes yet</p>
                    <p className="text-xs text-zinc-600 mt-1">Internal notes are visible to everyone on your team.</p>
                  </div>
                )}
                {teamNotes.map((m) => (
                  <div key={m.id} className="bg-ink-850 border border-white/[0.04] rounded-lg px-3 py-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-ds-micro font-medium text-zinc-300">{m.sentBy}</span>
                      <span className="text-ds-micro text-zinc-600 font-mono">{new Date(m.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-zinc-400 whitespace-pre-wrap">{m.body}</p>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              <div className="p-3 border-t border-white/[0.06] bg-ink-900">
                <div className="flex items-center gap-2">
                  <input type="text" value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleNoteSend(); } }} placeholder="Add a note for your team..." className="flex-1 bg-ink-850 border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-brass-500/40" />
                  <button onClick={handleNoteSend} disabled={!noteDraft.trim()} className="w-8 h-8 rounded-lg bg-brass-500 hover:bg-brass-400 disabled:bg-zinc-700 disabled:text-zinc-500 text-white flex items-center justify-center flex-shrink-0">
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="w-56 flex-shrink-0 bg-ink-900/50 border border-white/[0.06] rounded-xl p-3">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-ds-micro font-medium text-zinc-400 uppercase">Team ({teamMembers.length})</span>
          </div>
          <div className="space-y-2">
            {teamMembers.map((m) => (
              <div key={m.id} className="flex items-center gap-2">
                <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-ds-micro font-medium', m.active ? 'bg-brass-500/20 text-brass-300' : 'bg-zinc-800 text-zinc-600')}>
                  {m.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-ds-label text-zinc-300 truncate">{m.name}</p>
                  <div className="flex items-center gap-1">
                    <Badge className="text-ds-micro bg-ink-850 text-zinc-500 px-1">{m.role}</Badge>
                    {!m.active && <span className="text-ds-micro text-zinc-600">(invited)</span>}
                  </div>
                </div>
              </div>
            ))}
            {teamMembers.length === 0 && (
              <p className="text-ds-micro text-zinc-600">No team members invited yet. Add them in Settings.</p>
            )}
          </div>
        </div>
      </div>
    </WorkspaceFrame>
  );
}
