import { useState } from 'react';
import { Send, Users } from 'lucide-react';
import {
  EmptyStateBlock,
  ErrorStateBlock,
  InlineStatus,
  LoadingRows,
  PageHeader,
} from '@/next/components/ConsolePrimitives';
import { ConsoleTabs, SectionCard } from '@/next/components/ConsoleCharts';
import type { BrandTeamMember, Message } from '@/types';

export interface BrandTeamMessagesViewProps {
  hasTenant: boolean;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  supportMessages: Message[];
  teamNotes: Message[];
  teamMembers: BrandTeamMember[];
  onSendSupport: (body: string) => Promise<void>;
  onSendTeamNote: (body: string) => Promise<void>;
}

export function BrandTeamMessagesView({
  hasTenant,
  loading,
  error,
  onRetry,
  supportMessages,
  teamNotes,
  teamMembers,
  onSendSupport,
  onSendTeamNote,
}: BrandTeamMessagesViewProps) {
  const [tab, setTab] = useState<'support' | 'notes'>('support');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  if (!hasTenant) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Support & Team"
          description="Direct support messaging with Mercenta and internal team notes."
        />
        <EmptyStateBlock
          title="Sign in as a brand"
          description="Select a partner brand account to view support messages and team notes."
        />
      </div>
    );
  }

  async function submitMessage() {
    if (!draft.trim() || sending) return;
    setSending(true);
    if (tab === 'support') {
      await onSendSupport(draft.trim());
    } else {
      await onSendTeamNote(draft.trim());
    }
    setDraft('');
    setSending(false);
  }

  const activeList = tab === 'support' ? supportMessages : teamNotes;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Support & Team"
        description="Threaded support conversation with Mercenta operations and internal team collaboration notes."
      />

      {error && <ErrorStateBlock message={error} onRetry={onRetry} />}

      <ConsoleTabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'support', label: 'Support Chat', count: supportMessages.length },
          { id: 'notes', label: 'Internal Team Notes', count: teamNotes.length },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SectionCard
            title={tab === 'support' ? 'Mercenta Support Thread' : 'Internal Team Notes'}
            description={
              tab === 'support'
                ? 'Messages route to Mercenta operations and your brand portal.'
                : 'Visible only to invited team members on your brand account.'
            }
          >
            {loading ? (
              <LoadingRows rows={4} label="Loading messages…" />
            ) : (
              <div className="space-y-4">
                <div className="max-h-[420px] overflow-y-auto space-y-2.5 pr-1">
                  {activeList.length === 0 ? (
                    <p className="text-[12px] text-faint py-8 text-center">
                      {tab === 'support'
                        ? 'No support messages yet. Start a conversation below.'
                        : 'No internal team notes recorded yet.'}
                    </p>
                  ) : (
                    activeList.map((m) => (
                      <div
                        key={m.id}
                        className={`rounded-md border p-3 text-[12px] ${
                          m.direction === 'outbound'
                            ? 'border-hairline bg-surface'
                            : 'border-hairline-strong bg-surface-raised'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 text-[11px] text-faint mb-1">
                          <span className="font-medium text-ink-800">{m.sentBy}</span>
                          <span className="font-mono">
                            {new Date(m.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-ink-900 whitespace-pre-wrap">{m.body}</p>
                      </div>
                    ))
                  )}
                </div>

                <div className="pt-3 border-t border-hairline flex items-center gap-2">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        void submitMessage();
                      }
                    }}
                    placeholder={
                      tab === 'support'
                        ? 'Message Mercenta support…'
                        : 'Add an internal note for your team…'
                    }
                    className="flex-1 px-3 py-2 rounded border border-hairline-strong bg-surface-raised text-[12px] text-ink-950"
                  />
                  <button
                    type="button"
                    disabled={!draft.trim() || sending}
                    onClick={() => void submitMessage()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded bg-[var(--mr-accent)] text-on-dark text-[12px] font-medium hover:bg-[var(--mr-accent-600)] disabled:opacity-40"
                  >
                    <Send className="w-3.5 h-3.5" aria-hidden="true" />
                    Send
                  </button>
                </div>
              </div>
            )}
          </SectionCard>
        </div>

        <div>
          <SectionCard title={`Team Roster (${teamMembers.length})`}>
            {teamMembers.length === 0 ? (
              <p className="text-[12px] text-faint flex items-center gap-1.5">
                <Users className="w-4 h-4 text-quiet" aria-hidden="true" />
                No team members invited yet. Manage roles in Settings.
              </p>
            ) : (
              <ul className="divide-y divide-hairline-06">
                {teamMembers.map((m) => (
                  <li key={m.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-2 text-[12px]">
                    <div className="min-w-0">
                      <div className="font-medium text-ink-950 truncate">{m.name}</div>
                      <div className="text-[11px] text-faint truncate">{m.email}</div>
                    </div>
                    <InlineStatus
                      label={m.active ? m.role : `${m.role} (Invited)`}
                      tone={m.active ? 'success' : 'neutral'}
                    />
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
