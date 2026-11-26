import { useMemo, useState } from 'react';
import { brandInboxAddress, useBrandComms } from '@/components/shared/BrandComm';
import { getProspect } from '@/data/prospectStore';
import { useBrands, useMessages } from '@/data/queries';
import { useWorkItems } from '@/lib/work/useWork';
import { WORK_SOURCE_LABELS } from '@/lib/work/workStore';
import {
  AdminMessagesView,
  type MessageThreadRow,
} from './AdminMessagesView';

export function AdminMessagesScreen() {
  const comms = useBrandComms();
  const brandsQuery = useBrands();
  const messagesQuery = useMessages();

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [threadQuery, setThreadQuery] = useState('');
  const [needsHumanOnly, setNeedsHumanOnly] = useState(false);
  const [sendNote, setSendNote] = useState<string | null>(null);

  const brands = useMemo(() => brandsQuery.data?.data ?? [], [brandsQuery.data]);
  const allMessages = useMemo(() => messagesQuery.data?.data ?? [], [messagesQuery.data]);

  const threads: MessageThreadRow[] = useMemo(() => {
    const map = new Map<string, MessageThreadRow>();
    for (const m of allMessages) {
      if (!map.has(m.brandId)) {
        const brand = brands.find((b) => b.id === m.brandId);
        const prospect = brand ? undefined : getProspect(m.brandId);
        map.set(m.brandId, {
          key: m.brandId,
          brandId: m.brandId,
          brandName:
            brand?.profile.businessName ??
            (prospect ? `${prospect.brand} (prospect)` : m.brandId),
          messages: [],
          hasHotLead: false,
        });
      }
      const entry = map.get(m.brandId)!;
      entry.messages.push({
        id: m.id,
        brandId: m.brandId,
        direction: m.direction,
        subject: m.subject,
        body: m.body,
        channel: m.channel,
        sentBy: m.sentBy,
        requiresHuman: m.requiresHuman,
        createdAt: m.createdAt,
      });
      if (m.requiresHuman) entry.hasHotLead = true;
    }
    return Array.from(map.values()).sort((a, b) => b.messages.length - a.messages.length);
  }, [allMessages, brands]);

  const visibleThreads = useMemo(() => {
    const q = threadQuery.trim().toLowerCase();
    return threads.filter((t) => {
      if (needsHumanOnly && !t.hasHotLead) return false;
      if (!q) return true;
      return (
        t.brandName.toLowerCase().includes(q) ||
        t.messages.some(
          (m) =>
            (m.subject ?? '').toLowerCase().includes(q) ||
            m.body.toLowerCase().includes(q)
        )
      );
    });
  }, [threads, threadQuery, needsHumanOnly]);

  const activeThread =
    visibleThreads.find((t) => t.key === selectedKey) ??
    threads.find((t) => t.key === selectedKey) ??
    visibleThreads[0] ??
    null;

  const needsHumanCount = threads.filter((t) => t.hasHotLead).length;
  const acquisitionCount = threads.filter((t) => !brands.some((b) => b.id === t.brandId)).length;

  const outreachWork = useWorkItems('admin')
    .filter((w) => w.source === 'outreach_followup')
    .map((w) => ({
      id: w.id,
      title: w.title,
      sourceLabel: WORK_SOURCE_LABELS[w.source],
      dueDate: w.dueDate,
    }));

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
          ? 'Message logged to the thread.'
          : `Send failed (${result.error}) — logged anyway so nothing is lost.`
    );
  }

  const errObj = brandsQuery.error || messagesQuery.error;
  const error =
    errObj instanceof Error ? errObj.message : errObj ? 'Failed to load messages.' : null;

  return (
    <AdminMessagesView
      loading={brandsQuery.isPending || messagesQuery.isPending}
      error={error}
      onRetry={() => {
        void brandsQuery.refetch();
        void messagesQuery.refetch();
      }}
      emailLive={comms.emailLive}
      emailSandbox={comms.emailSandbox}
      totalThreads={threads.length}
      totalMessages={allMessages.length}
      acquisitionCount={acquisitionCount}
      needsHumanCount={needsHumanCount}
      threads={visibleThreads}
      activeThread={activeThread}
      onSelectThread={setSelectedKey}
      threadQuery={threadQuery}
      onThreadQueryChange={setThreadQuery}
      needsHumanOnly={needsHumanOnly}
      onToggleNeedsHuman={() => setNeedsHumanOnly((v) => !v)}
      onResetFilters={() => {
        setThreadQuery('');
        setNeedsHumanOnly(false);
      }}
      outreachWork={outreachWork}
      sendNote={sendNote}
      onSend={handleSend}
    />
  );
}
