import { useMemo, useState } from 'react';
import { brandInboxAddress, useBrandComms } from '@/components/shared/BrandComm';
import { useBrands, useMessages } from '@/data/queries';
import { getProspect } from '@/data/prospectStore';
import type { Message } from '@/types';
import { Badge, Button, Card, Input } from '@/components/ui';
import { cn } from '@/utils/cn';
import {
  AlertTriangle,
  Inbox,
  Lock,
  Send,
} from 'lucide-react';

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
          <Badge className="text-[10px] bg-red-500/15 text-red-300 border-red-500/20 flex-shrink-0">
            <AlertTriangle className="w-3 h-3 mr-1" /> Hot lead
          </Badge>
        )}
      </div>
      <p className="text-[11px] text-zinc-500 truncate">
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
        <div className="mt-1.5 flex items-center gap-2 text-[9px] font-mono text-zinc-500">
          <span>{new Date(m.createdAt).toLocaleString()}</span>
          <span>· {m.channel}</span>
          <span>· {m.sentBy}</span>
          {m.requiresHuman && (
            <Badge className="text-[9px] bg-red-500/20 text-red-300 border-red-500/30">
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
    <div className="p-6 space-y-4 max-w-[1400px] mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center">
          <Inbox className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Messages</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Unified inbox — one thread per brand/lead, full history across
            automation and staff
          </p>
        </div>
      </div>

      {!emailLive && !emailSandbox && (
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-lg p-3 text-[11px] text-zinc-500 flex items-start gap-2">
          <Lock className="w-3.5 h-3.5 mt-0.5 text-zinc-600 flex-shrink-0" />
          Power sending is disabled — connect Postmark or SendGrid in Integration
          Settings. Viewing threads and logging notes still works.
        </div>
      )}

      <div className="grid grid-cols-12 gap-4">
        {/* Thread list */}
        <Card className="col-span-12 md:col-span-4 overflow-hidden p-0">
          {threads.map((t) => (
            <ThreadListItem
              key={t.key}
              thread={t}
              active={activeThread?.key === t.key}
              onClick={() => setSelectedKey(t.key)}
            />
          ))}
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
          ) : (
            <p className="text-xs text-zinc-600">No conversations yet.</p>
          )}
        </Card>
      </div>
    </div>
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
        {sendNote && <span className="text-[11px] text-zinc-400">{sendNote}</span>}
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
