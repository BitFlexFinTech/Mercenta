import { useState } from 'react';
import {
  EmptyStateBlock,
  ErrorStateBlock,
  InlineStatus,
  LoadingRows,
  MetricStrip,
  PageHeader,
} from '@/next/components/ConsolePrimitives';
import { NoticeBanner, SectionCard } from '@/next/components/ConsoleCharts';

export interface MessageEntryRow {
  id: string;
  brandId: string;
  direction: 'inbound' | 'outbound';
  subject?: string;
  body: string;
  channel: string;
  sentBy: string;
  requiresHuman: boolean;
  createdAt: string;
}

export interface MessageThreadRow {
  key: string;
  brandId: string;
  brandName: string;
  messages: MessageEntryRow[];
  hasHotLead: boolean;
}

export interface OutreachFollowupItem {
  id: string;
  title: string;
  sourceLabel: string;
  dueDate: string | null;
}

export interface AdminMessagesViewProps {
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  emailLive: boolean;
  emailSandbox: boolean;
  totalThreads: number;
  totalMessages: number;
  acquisitionCount: number;
  needsHumanCount: number;
  threads: MessageThreadRow[];
  activeThread: MessageThreadRow | null;
  onSelectThread: (key: string) => void;
  threadQuery: string;
  onThreadQueryChange: (next: string) => void;
  needsHumanOnly: boolean;
  onToggleNeedsHuman: () => void;
  onResetFilters: () => void;
  outreachWork: OutreachFollowupItem[];
  sendNote: string | null;
  onSend: (threadKey: string, subject: string, body: string) => Promise<void>;
}

export function AdminMessagesView({
  loading,
  error,
  onRetry,
  emailLive,
  emailSandbox,
  totalThreads,
  totalMessages,
  acquisitionCount,
  needsHumanCount,
  threads,
  activeThread,
  onSelectThread,
  threadQuery,
  onThreadQueryChange,
  needsHumanOnly,
  onToggleNeedsHuman,
  onResetFilters,
  outreachWork,
  sendNote,
  onSend,
}: AdminMessagesViewProps) {
  const [draftSubject, setDraftSubject] = useState('');
  const [draftBody, setDraftBody] = useState('');
  const [sending, setSending] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Messages"
        description="Unified brand and acquisition inbox — one canonical thread per brand or prospect across automation and staff."
        meta={
          <>
            <span>
              {threads.length} of {totalThreads} threads
            </span>
            <span>{totalMessages} messages</span>
            <span>{emailLive ? 'Email live' : emailSandbox ? 'Email sandbox' : 'Sending disabled'}</span>
          </>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={threadQuery}
              onChange={(e) => onThreadQueryChange(e.target.value)}
              placeholder="Search threads…"
              aria-label="Search message threads"
              className="w-52 px-2.5 py-1.5 rounded border border-zinc-300 bg-white text-[12px] text-zinc-950"
            />
            <button
              type="button"
              onClick={onToggleNeedsHuman}
              className={`px-3 py-1.5 rounded border text-[12px] font-medium ${
                needsHumanOnly
                  ? 'border-red-300 bg-red-50 text-red-900'
                  : 'border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50'
              }`}
            >
              Needs human only
            </button>
          </div>
        }
      />

      {!emailLive && !emailSandbox && (
        <NoticeBanner
          tone="info"
          title="Outbound email transport disabled"
          message="Connect Postmark or SendGrid in Integration Settings for live delivery. Reading threads and logging notes still works."
        />
      )}

      {error && <ErrorStateBlock message={error} onRetry={onRetry} />}

      <MetricStrip
        loading={loading}
        columns={4}
        items={[
          {
            id: 'messages-threads',
            label: 'Threads',
            value: String(totalThreads),
            context: `${threads.length} in view`,
            active: !needsHumanOnly && !threadQuery,
            onClick: onResetFilters,
          },
          {
            id: 'messages-count',
            label: 'Messages',
            value: String(totalMessages),
            context: `${acquisitionCount} acquisition`,
            onClick: () => {
              if (needsHumanOnly) onToggleNeedsHuman();
            },
          },
          {
            id: 'messages-needs-human',
            label: 'Needs human',
            value: String(needsHumanCount),
            context: needsHumanCount > 0 ? 'Hot leads' : 'Nothing waiting',
            active: needsHumanOnly,
            onClick: onToggleNeedsHuman,
          },
          {
            id: 'messages-followups',
            label: 'Open follow-ups',
            value: String(outreachWork.length),
            context: 'Outreach work items',
            onClick: onResetFilters,
          },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Thread list */}
        <div className="lg:col-span-4 space-y-4">
          <SectionCard title="Threads" description="Sorted by recent activity">
            {loading ? (
              <LoadingRows rows={5} label="Loading conversations…" />
            ) : threads.length === 0 ? (
              <EmptyStateBlock
                title="No threads match"
                description="Clear the search filter or hot-lead toggle to view all threads."
                actionLabel="Reset filters"
                onAction={onResetFilters}
              />
            ) : (
              <ul className="divide-y divide-zinc-200 -m-4">
                {threads.map((t) => {
                  const active = activeThread?.key === t.key;
                  const last = t.messages[t.messages.length - 1];
                  return (
                    <li key={t.key}>
                      <button
                        type="button"
                        onClick={() => onSelectThread(t.key)}
                        className={`w-full text-left px-4 py-3 transition-colors ${
                          active ? 'bg-zinc-100' : 'hover:bg-zinc-50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[13px] font-semibold text-zinc-950 truncate">
                            {t.brandName}
                          </span>
                          {t.hasHotLead && (
                            <InlineStatus label="Hot lead" tone="danger" dataStatus="needs_human" />
                          )}
                        </div>
                        <p className="mt-1 text-[12px] text-zinc-600 truncate">
                          {last ? last.body.slice(0, 72) : 'No messages yet'}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Open outreach follow-ups" description="Shared with Work Management">
            {outreachWork.length === 0 ? (
              <p className="text-[12px] text-zinc-500">No open outreach follow-up items.</p>
            ) : (
              <ul className="space-y-2 text-[12px]">
                {outreachWork.slice(0, 5).map((w) => (
                  <li key={w.id} className="border-b border-zinc-100 pb-2 last:border-b-0 last:pb-0">
                    <div className="font-medium text-zinc-950">{w.title}</div>
                    <div className="text-zinc-500 font-mono">
                      {w.sourceLabel}
                      {w.dueDate ? ` · due ${w.dueDate}` : ''}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>

        {/* Conversation pane */}
        <div className="lg:col-span-8">
          <SectionCard
            title={activeThread ? activeThread.brandName : 'Conversation'}
            description="Every send is attributed to its actor, appended to the thread, and audited."
          >
            {loading ? (
              <LoadingRows rows={4} label="Loading conversation…" />
            ) : !activeThread ? (
              <EmptyStateBlock
                title="No conversation selected"
                description="Select a brand or prospect thread on the left to inspect messages."
              />
            ) : (
              <div className="space-y-4">
                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                  {activeThread.messages.map((m) => {
                    const outbound = m.direction === 'outbound';
                    return (
                      <div
                        key={m.id}
                        className={`flex ${outbound ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-md border px-3.5 py-2.5 text-[13px] leading-relaxed ${
                            outbound
                              ? 'border-zinc-300 bg-zinc-50 text-zinc-950'
                              : 'border-zinc-200 bg-white text-zinc-900'
                          }`}
                        >
                          {m.subject && (
                            <div className="font-semibold text-zinc-950 mb-1">{m.subject}</div>
                          )}
                          <div className="whitespace-pre-wrap">{m.body}</div>
                          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] font-mono text-zinc-500">
                            <span>{new Date(m.createdAt).toLocaleString()}</span>
                            <span>· {m.channel}</span>
                            <span>· {m.sentBy}</span>
                            {m.requiresHuman && (
                              <InlineStatus label="Needs human" tone="danger" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {(emailLive || emailSandbox) && (
                  <div className="pt-4 border-t border-zinc-200 space-y-2.5">
                    <label className="block text-[12px]">
                      <span className="text-zinc-600 font-medium block mb-1">Subject</span>
                      <input
                        type="text"
                        value={draftSubject}
                        onChange={(e) => setDraftSubject(e.target.value)}
                        placeholder="Re: your wholesale enquiry"
                        className="w-full px-2.5 py-1.5 rounded border border-zinc-300 bg-white text-[12px] text-zinc-950"
                      />
                    </label>
                    <textarea
                      value={draftBody}
                      onChange={(e) => setDraftBody(e.target.value)}
                      rows={3}
                      placeholder="Write a reply…"
                      className="w-full px-3 py-2 rounded border border-zinc-300 bg-white text-[12px] text-zinc-950"
                    />
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      {sendNote && <span className="text-[12px] text-zinc-600">{sendNote}</span>}
                      <button
                        type="button"
                        disabled={!draftBody.trim() || sending}
                        onClick={async () => {
                          if (!draftBody.trim()) return;
                          setSending(true);
                          try {
                            await onSend(activeThread.key, draftSubject, draftBody);
                            setDraftSubject('');
                            setDraftBody('');
                          } finally {
                            setSending(false);
                          }
                        }}
                        className="ml-auto px-3.5 py-1.5 rounded bg-[#C2410C] text-white text-[12px] font-medium hover:bg-[#9A3412] disabled:opacity-40"
                      >
                        {emailSandbox ? 'Send (Sandbox)' : 'Send'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
