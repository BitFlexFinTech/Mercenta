import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useIntegrations } from '@/integrations/IntegrationsContext';
import { createEmailClient } from '@/lib/messaging/email';
import { logMessage } from '@/data/api';
import { useMessages } from '@/data/queries';
import { Button, Input } from '@/components/ui';
import { cn } from '@/utils/cn';
import { MessageSquare, Phone, Send } from 'lucide-react';

/**
 * §Stage-17 — THE brand communication layer.
 * One send pipeline, one call-log pipeline, one thread history. The Messages
 * Hub, Brand CRM, and Purchase Orders all render through this module — none
 * of them duplicates transport or logging logic.
 */

/** Deterministic demo inbox address per brand (same derivation as before). */
export function brandInboxAddress(businessName: string | undefined): string {
  const slug = businessName?.toLowerCase().replace(/[^a-z]/g, '') || 'brand';
  return `hello@${slug}.example`;
}

type EmailResult = { ok: boolean; sandbox?: boolean; error?: string };

export function useBrandComms() {
  const qc = useQueryClient();
  const { integrations } = useIntegrations();
  const email = integrations.email;
  const emailLive = email?.status === 'connected' && !email.sandbox;
  const emailSandbox = email?.status === 'connected' && email.sandbox;

  /** §9 real send pipeline — credentials from the §14 email card. */
  const emailClient = useMemo(() => {
    const creds =
      email?.status === 'connected'
        ? {
            secretRef: `vault:email-${email.provider ?? 'postmark'}`,
            provider: email.provider ?? 'postmark',
            verified: !email.sandbox,
          }
        : null;
    return createEmailClient(() => creds, '/functions/v1/send-email');
  }, [email]);

  /** ALWAYS-LOG RULE: the message is recorded whatever the transport does. */
  async function sendToBrand(
    brandId: string,
    to: string,
    subject: string,
    body: string,
    poRef?: string
  ): Promise<EmailResult> {
    const result = await emailClient.send({
      to,
      subject: subject || '(no subject)',
      body,
    });
    await logMessage({
      brandId,
      channel: 'email',
      direction: 'outbound',
      subject: subject || '(no subject)',
      body:
        result.ok && !result.sandbox
          ? body
          : `[${result.ok ? 'SANDBOX SEND' : `SEND FAILED — ${result.error}`}] ${body}`,
      sentBy: 'staff',
      requiresHuman: false,
      poRef,
    });
    await qc.invalidateQueries({ queryKey: ['messages'] });
    return result;
  }

  /** A logged call lands in the same thread timeline as messages. */
  async function logCall(brandId: string, note: string, poRef?: string): Promise<void> {
    await logMessage({
      brandId,
      channel: 'call',
      direction: 'outbound',
      subject: 'Call logged',
      body: note,
      sentBy: 'staff',
      requiresHuman: false,
      poRef,
    });
    await qc.invalidateQueries({ queryKey: ['messages'] });
  }

  return { sendToBrand, logCall, emailLive, emailSandbox, emailClient };
}

/**
 * Inline communication panel for ONE brand: thread preview + message
 * composer + "Log a call". Embeddable anywhere a brand is in context.
 */
export function BrandCommPanel({
  brandId,
  brandName,
  compact = false,
  poRef,
}: {
  brandId: string;
  brandName?: string;
  compact?: boolean;
  /** §Stage-24 — tie the message to the specific PO it's about. */
  poRef?: string;
}) {
  const { sendToBrand, logCall, emailLive, emailSandbox } = useBrandComms();
  const messagesQuery = useMessages();

  const [tab, setTab] = useState<'message' | 'call'>('message');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [callNote, setCallNote] = useState('');
  const [note, setNote] = useState<string | null>(null);

  const thread = (messagesQuery.data?.data ?? [])
    .filter((m) => m.brandId === brandId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const preview = thread.slice(-4);

  async function handleSend() {
    if (!body.trim()) return;
    const result = await sendToBrand(brandId, brandInboxAddress(brandName), subject, body, poRef);
    setNote(
      result.sandbox
        ? 'Logged as sandbox send — connect a live provider for real delivery.'
        : result.ok
          ? 'Message sent and logged to the brand thread.'
          : `Send failed (${result.error}) — logged anyway so nothing is lost.`
    );
    setSubject('');
    setBody('');
  }

  async function handleLogCall() {
    if (!callNote.trim()) return;
    await logCall(brandId, `[CALL] ${callNote.trim()}`, poRef);
    setNote('Call logged to the brand timeline.');
    setCallNote('');
  }

  return (
    <div className="space-y-2">
      {/* Thread preview */}
      <div className={cn('space-y-1.5 overflow-y-auto', compact ? 'max-h-[120px]' : 'max-h-[180px]')}>
        {preview.length === 0 && (
          <p className="text-[11px] text-zinc-600">No messages with this brand yet.</p>
        )}
        {preview.map((m) => (
          <div
            key={m.id}
            className={cn(
              'rounded-lg px-3 py-2 text-[11px] leading-relaxed',
              m.direction === 'outbound'
                ? 'bg-brass-500/10 text-zinc-300'
                : 'bg-white/[0.04] text-zinc-400'
            )}
          >
            <span className="font-mono text-[9px] text-zinc-500 mr-2">
              {new Date(m.createdAt).toLocaleString()} · {m.channel}
            </span>
            <span className="whitespace-pre-wrap">{m.body}</span>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 pt-1">
        <button
          onClick={() => setTab('message')}
          className={cn(
            'flex items-center gap-1 px-2 py-1 rounded-md text-[11px]',
            tab === 'message' ? 'bg-brass-500/15 text-brass-300' : 'text-zinc-500 hover:text-white'
          )}
        >
          <MessageSquare className="w-3 h-3" /> Message
        </button>
        <button
          onClick={() => setTab('call')}
          className={cn(
            'flex items-center gap-1 px-2 py-1 rounded-md text-[11px]',
            tab === 'call' ? 'bg-brass-500/15 text-brass-300' : 'text-zinc-500 hover:text-white'
          )}
        >
          <Phone className="w-3 h-3" /> Log a call
        </button>
      </div>

      {!emailLive && !emailSandbox && tab === 'message' && (
        <p className="text-[10px] text-zinc-600">
          Power sending disabled — connect Postmark/SendGrid in Integrations. Messages are still
          logged to the thread.
        </p>
      )}

      {tab === 'message' ? (
        <div className="space-y-2">
          <Input
            label="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Re: your wholesale enquiry"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={compact ? 2 : 3}
            placeholder="Write a reply…"
            className="w-full bg-ink-900 border border-white/[0.08] rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-brass-500/40"
          />
          <Button className="text-xs" disabled={!body.trim()} onClick={() => void handleSend()}>
            <Send className="w-3.5 h-3.5 mr-1.5" />
            {emailSandbox ? 'Send (Sandbox)' : 'Send'}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <textarea
            value={callNote}
            onChange={(e) => setCallNote(e.target.value)}
            rows={compact ? 2 : 3}
            placeholder="What was discussed on the call?"
            className="w-full bg-ink-900 border border-white/[0.08] rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-brass-500/40"
          />
          <Button
            className="text-xs"
            disabled={!callNote.trim()}
            onClick={() => void handleLogCall()}
          >
            <Phone className="w-3.5 h-3.5 mr-1.5" />
            Log call to timeline
          </Button>
        </div>
      )}

      {note && <p className="text-[10px] text-zinc-400">{note}</p>}
    </div>
  );
}
