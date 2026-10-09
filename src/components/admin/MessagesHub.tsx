import { useMemo, useState } from 'react';
import { brandInboxAddress, useBrandComms } from '@/components/shared/BrandComm';
import { useBrands, useMessages } from '@/data/queries';
import { getProspect } from '@/data/prospectStore';
import type { Message } from '@/types';
import { Badge, Button, Card, Input, LoadingState } from '@/components/ui';
import { cn } from '@/utils/cn';
import {
  AlertTriangle,
  Lock,
  Send,
} from 'lucide-react';
import {
  ContextPanel,
  MetricBand,
  RecordFieldList,
  WorkspaceFrame,
  WorkspaceGrid,
  WorkspaceHeader,
  WorkspaceSection,
  type MetricTileData,
} from '@/components/shared/workspace';
import { useWorkItems } from '@/lib/work/useWork';
import { WORK_SOURCE_LABELS } from '@/lib/work/workStore';

type Thread = {
  key: string;
  brandName: string;
  brandId: string;
  messages: Message[];
};

function ThreadListItem({
  thread,
  active,
  onClick,
}: {
  thread: Thread;
  active: boolean;
  onClick: () => void;
}) {
  const last = thread.messages[thread.messages.length - 1];
  const hot = thread.messages.some((m) => m.requiresHuman);
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-4 py-3 border-b border-white/[0.04] transition-colors',
        active ? 'bg-brass-500/10' : 'hover:bg-white/[0.02]'
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-sm font-medium text-white truncate">{thread.brandName}</span>
        {hot && (
          <Badge className="text-ds-micro bg-red-500/15 text-red-300 border-red-500/20 flex-shrink-0">
            <AlertTriangle className="w-3 h-3 mr-1" /> Hot lead
          </Badge>
        )}
      </div>
      <p className="text-ds-label text-zinc-500 truncate">
        {last ? last.body.slice(0, 60) : ''}
      </p>
    </button>
  );
}

function MessageBubble({ m }: { m: Message }) {
  const outbound = m.direction === 'outbound';
  return (
    <div className={cn('flex', outbound ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[75%] rounded-xl px-4 py-3 text-xs leading-relaxed',
          outbound
            ? 'bg-brass-500/15 text-zinc-200'
            : 'bg-white/[0.04] text-zinc-300'
        )}
      >
        {m.subject && (
          <div className="font-medium text-white mb-1">{m.subject}</div>
        )}
        <div className="whitespace-pre-wrap">{m.body}</div>
        <div className="mt-1.5 flex items-center gap-2 text-ds-micro font-mono text-zinc-500">
          <span>{new Date(m.createdAt).toLocaleString()}</span>
          <span>· {m.channel}</span>
          <span>· {m.sentBy}</span>
          {m.requiresHuman && (
            <Badge className="text-ds-micro bg-red-500/20 text-red-300 border-red-500/30">
              needs human
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

export function MessagesHub() {
  const comms = useBrandComms();
  const emailLive = comms.emailLive;
  const emailSandbox = comms.emailSandbox;

  const brandsQuery = useBrands();
  const messagesQuery = useMessages();
  /**
   * §Wave 3 Part 5 — ONE LOADING FLAG: "No threads match the current filters."
   * and "No conversations yet." were shown while the brand + message queries
   * were still resolving (measured in a real browser with a slow data source).
   */
  const commsPending = brandsQuery.isPending || messagesQuery.isPending;

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [sendNote, setSendNote] = useState<string | null>(null);

  const allMessages = useMemo(
    () => messagesQuery.data?.data ?? [],
    [messagesQuery.data]
  );

  const threads: Thread[] = useMemo(() => {
    const brands = brandsQuery.data?.data ?? [];
    const map = new Map<string, Thread>();
    for (const m of allMessages) {
      if (!map.has(m.brandId)) {
        const brand = brands.find((b) => b.id === m.brandId);
        // §Phase C — a thread keyed by a CANONICAL BI prospect id (prospect-* /
        // p-*) is an acquisition conversation, not a demo brand: resolve its
        // display name from the same canonical store so the ONE message thread
        // is intelligible here without a second conversation store.
        const prospect = brand ? undefined : getProspect(m.brandId);
        map.set(m.brandId, {
          key: m.brandId,
          brandId: m.brandId,
          brandName: brand?.profile.businessName ?? (prospect ? `${prospect.brand} (prospect)` : m.brandId),
          messages: [],
        });
      }
      map.get(m.brandId)!.messages.push(m);
    }
    return Array.from(map.values()).sort((a, b) => b.messages.length - a.messages.length);
  }, [allMessages, brandsQuery.data]);

  const activeThread =
    threads.find((t) => t.key === selectedKey) ?? threads[0] ?? null;

  /* §Sprint 2 — real thread filtering (search + needs-human), over the ONE
     canonical message set. */
  const [threadQuery, setThreadQuery] = useState('');
  const [needsHumanOnly, setNeedsHumanOnly] = useState(false);
  const visibleThreads = useMemo(() => {
    const q = threadQuery.trim().toLowerCase();
    return threads.filter((t) => {
      if (needsHumanOnly && !t.messages.some((m) => m.requiresHuman)) return false;
      if (!q) return true;
      return (
        t.brandName.toLowerCase().includes(q) ||
        t.messages.some((m) => (m.subject ?? '').toLowerCase().includes(q) || m.body.toLowerCase().includes(q))
      );
    });
  }, [threads, threadQuery, needsHumanOnly]);

  const needsHumanThreads = threads.filter((t) => t.messages.some((m) => m.requiresHuman));
  const acquisitionThreads = threads.filter((t) => !brandsQuery.data?.data.some((b) => b.id === t.brandId));

  /* §Sprint 2 — the SAME work layer: outreach follow-ups are the CRM side of
     this inbox, so the operator sees the chase list beside the thread. */
  const outreachWork = useWorkItems('admin').filter((w) => w.source === 'outreach_followup');

  const metrics: MetricTileData[] = [
    {
      id: 'messages-threads',
      label: 'Threads',
      value: String(threads.length),
      size: 'hero',
      tone: 'info',
      statusText: `${visibleThreads.length} in view`,
      context: 'One thread per brand or acquisition prospect',
      domain: 'catalogue',
      onOpen: () => {
        setThreadQuery('');
        setNeedsHumanOnly(false);
      },
      testId: 'messages-metric-threads',
      valueTestId: 'messages-metric-threads-value',
    },
    {
      id: 'messages-count',
      label: 'Messages',
      value: String(allMessages.length),
      tone: 'info',
      statusText: `${acquisitionThreads.length} acquisition`,
      context: 'Full canonical history across automation and staff',
      domain: 'compliance',
      onOpen: () => setNeedsHumanOnly(false),
      testId: 'messages-metric-count',
      valueTestId: 'messages-metric-count-value',
    },
    {
      id: 'messages-needs-human',
      label: 'Needs human',
      value: String(needsHumanThreads.length),
      tone: needsHumanThreads.length > 0 ? 'danger' : 'success',
      statusText: needsHumanThreads.length > 0 ? 'Hot leads' : 'Nothing waiting',
      context: 'Threads the automation has flagged for a person',
      domain: 'finance',
      onOpen: () => setNeedsHumanOnly(true),
      testId: 'messages-metric-needs-human',
      valueTestId: 'messages-metric-needs-human-value',
    },
    {
      id: 'messages-followups',
      label: 'Open follow-ups',
      value: String(outreachWork.length),
      tone: outreachWork.length > 0 ? 'warning' : 'success',
      statusText: 'Outreach work items',
      context: 'CRM follow-ups raised into the canonical work layer',
      domain: 'logistics',
      onOpen: () => {
        setThreadQuery('');
        setNeedsHumanOnly(false);
      },
      testId: 'messages-metric-followups',
      valueTestId: 'messages-metric-followups-value',
    },
  ];

  /** §9 send via THE shared brand communication layer — no local pipeline. */
  async function handleSend(threadKey: string, subject: string, body: string) {
    const brandName = threads.find((t) => t.key === threadKey)?.brandName;
    const result = await comms.sendToBrand(
      threadKey,
      brandInboxAddress(brandName),
      subject,
      body
    );
    setSendNote(
      result.sandbox
        ? 'Logged as sandbox send — connect a live provider for real delivery.'
        : result.ok
          ? null
          : `Send failed (${result.error}) — logged anyway so nothing is lost.`
    );
  }

  return (
    <WorkspaceFrame className="space-y-4">
      <WorkspaceHeader
        eyebrow="Admin Hub · Communications"
        title="Messages"
        description="Unified inbox — one thread per brand/lead, full history across automation and staff. Sending goes through the shared brand-communication layer; when no live provider is connected every send is logged as a labelled sandbox send, never claimed as delivered."
        meta={
          <>
            <span className="font-mono text-ds-label text-zinc-500">
              {visibleThreads.length} of {threads.length} threads
            </span>
            <span className="font-mono text-ds-label text-zinc-500">{allMessages.length} messages</span>
            <span className="font-mono text-ds-label text-zinc-500">
              {emailLive ? 'email live' : emailSandbox ? 'email sandbox' : 'sending disabled'}
            </span>
          </>
        }
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <Input
              label=""
              value={threadQuery}
              onChange={(e) => setThreadQuery(e.target.value)}
              placeholder="Search threads…"
              className="w-48"
              dataTestid="messages-search"
            />
            <button
              type="button"
              onClick={() => setNeedsHumanOnly((v) => !v)}
              data-testid="messages-needs-human-filter"
              className={cn(
                'rounded-lg px-2.5 py-1 text-ds-label font-medium transition-colors',
                needsHumanOnly
                  ? 'bg-red-500/20 text-red-200'
                  : 'bg-white/[0.04] text-zinc-400 hover:bg-white/[0.08] hover:text-white'
              )}
            >
              Needs human only
            </button>
          </div>
        }
      />

      <MetricBand items={metrics} columns={4} />

      {!emailLive && !emailSandbox && (
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-lg p-3 text-ds-label text-zinc-500 flex items-start gap-2">
          <Lock className="w-3.5 h-3.5 mt-0.5 text-zinc-600 flex-shrink-0" />
          Power sending is disabled — connect Postmark or SendGrid in Integration
          Settings. Viewing threads and logging notes still works.
        </div>
      )}

      <WorkspaceGrid
        rail={
          <>
            <ContextPanel title="Open outreach follow-ups">
              <RecordFieldList
                fields={[
                  { label: 'Open items', value: String(outreachWork.length) },
                  { label: 'Threads', value: String(threads.length) },
                  { label: 'Needs human', value: String(needsHumanThreads.length) },
                ]}
              />
              <ul className="mt-2 space-y-1.5">
                {outreachWork.slice(0, 5).map((w) => (
                  <li key={w.id} className="text-ds-label leading-snug text-zinc-400">
                    <span className="font-medium text-zinc-200">{WORK_SOURCE_LABELS[w.source]}</span>
                    {' · '}
                    {w.title}
                    {w.dueDate && <span className="font-mono text-zinc-600"> · due {w.dueDate}</span>}
                  </li>
                ))}
                {outreachWork.length === 0 && (
                  <li className="text-ds-label text-zinc-500">No outreach follow-ups open.</li>
                )}
              </ul>
              <p className="mt-2 text-ds-label leading-snug text-zinc-400">
                These are the same CRM follow-ups Work Management lists — resolving one there
                clears it here.
              </p>
            </ContextPanel>
            <ContextPanel title="Delivery truth">
              <p className="text-ds-label leading-snug text-zinc-400">
                Nothing on this screen claims a live delivery. Every send is attributed to its
                actor, written to the brand thread and recorded in the platform audit log.
              </p>
            </ContextPanel>
          </>
        }
      >
      <div className="grid grid-cols-12 gap-4">
        {/* Thread list */}
        <Card className="col-span-12 md:col-span-4 overflow-hidden p-0" data-testid="messages-thread-list">
          {/* §Wave 3 Part 5 — the list must not say "No threads match the current
              filters." while the brand + message queries are still resolving
              (measured in a real browser with a slow data source). */}
          {commsPending && <LoadingState rows={5} label="Loading conversations…" />}
          {!commsPending && visibleThreads.map((t) => (
            <ThreadListItem
              key={t.key}
              thread={t}
              active={activeThread?.key === t.key}
              onClick={() => setSelectedKey(t.key)}
            />
          ))}
          {!commsPending && visibleThreads.length === 0 && (
            <p className="px-4 py-4 text-ds-label text-zinc-600">No threads match the current filters.</p>
          )}
        </Card>

        {/* Thread view */}
        <Card className="col-span-12 md:col-span-8 p-5">
          {activeThread ? (
            <>
              <h3 className="text-sm font-semibold text-white mb-4">
                {activeThread.brandName}
              </h3>
              <div className="space-y-3 mb-5 max-h-[420px] overflow-y-auto pr-1">
                {activeThread.messages.map((m) => (
                  <MessageBubble key={m.id} m={m} />
                ))}
              </div>

              {(emailLive || emailSandbox) && (
                <ComposeBox
                  sandbox={emailSandbox}
                  onSend={(subject, body) =>
                    void handleSend(activeThread.key, subject, body)
                  }
                  onNote={setSendNote}
                  sendNote={sendNote}
                />
              )}
            </>
          ) : commsPending ? (
            <LoadingState rows={4} label="Loading conversations…" />
          ) : (
            <p className="text-xs text-zinc-600">No conversations yet.</p>
          )}
        </Card>
      </div>
      </WorkspaceGrid>
    </WorkspaceFrame>
  );
}

function ComposeBox({
  sandbox,
  sendNote,
  onSend,
  onNote,
}: {
  sandbox: boolean;
  sendNote: string | null;
  onSend: (subject: string, body: string) => void;
  onNote: (note: string | null) => void;
}) {
  const [draftSubject, setDraftSubject] = useState('');
  const [draftBody, setDraftBody] = useState('');

  return (
    <div className="space-y-2 pt-3 border-t border-white/[0.06]">
      <Input
        label="Subject"
        value={draftSubject}
        onChange={(e) => setDraftSubject(e.target.value)}
        placeholder="Re: your wholesale enquiry"
      />
      <textarea
        value={draftBody}
        onChange={(e) => setDraftBody(e.target.value)}
        rows={3}
        placeholder="Write a reply…"
        className="w-full bg-ink-900 border border-white/[0.08] rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-brass-500/40"
      />
      <div className="flex items-center justify-between">
        {sendNote && <span className="text-ds-label text-zinc-400">{sendNote}</span>}
        <Button
          className="text-xs ml-auto"
          disabled={!draftBody.trim()}
          onClick={() => {
            if (!draftBody.trim()) return;
            onSend(draftSubject, draftBody);
            setDraftSubject('');
            setDraftBody('');
            onNote('Message logged to the thread.');
          }}
        >
          <Send className="w-3.5 h-3.5 mr-1.5" />
          {sandbox ? 'Send (Sandbox)' : 'Send'}
        </Button>
      </div>
    </div>
  );
}
