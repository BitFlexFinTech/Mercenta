/**
 * WhatsApp Escalation — wires Twilio WhatsApp into the hot-lead notification flow.
 *
 * Triggered ONLY when a hot-lead/escalation event fires (a brand explicitly asking
 * for a human, a prospect wanting to book a call/negotiate terms). This is
 * additive to the existing in-app/email notification, never a replacement.
 *
 * Message content: brief, actionable — who, what they need, a direct link back
 * into the relevant conversation/record.
 */

import { getWhatsAppClient, type IWhatsAppClient } from './whatsAppClient';

export interface EscalationEvent {
  type: 'hot_lead' | 'support_escalation' | 'contract_negotiation';
  /**
   * Who triggered this — a brand name, lead company, or support ticket subject.
   */
  subject: string;
  /**
   * Brief summary of what they need, in human-readable form.
   */
  summary: string;
  /**
   * A direct link the recipient can open to act on this escalation.
   */
  actionUrl: string;
  /**
   * E.164 phone number to send the WhatsApp message to.
   */
  notifyPhone: string;
}

export interface EscalationResult {
  ok: boolean;
  channel: 'whatsapp' | 'mock_whatsapp';
  messageSid?: string;
  error?: string;
}

/**
 * Escalate an event via WhatsApp. Returns the result of the send attempt.
 *
 * Only fires for genuinely time-sensitive escalation events — never for
 * routine automated actions. The caller is responsible for classifying the
 * event before calling this function (use classifyInboundReply from marketing.ts).
 */
export async function escalateViaWhatsApp(
  event: EscalationEvent,
  client?: IWhatsAppClient,
): Promise<EscalationResult> {
  const wa = client ?? getWhatsAppClient();

  const messageBody = [
    `🔔 *Mercenta Alert — ${event.type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}*`,
    ``,
    `*${event.subject}*`,
    ``,
    event.summary,
    ``,
    `👉 ${event.actionUrl}`,
    ``,
    `_Mercenta Partners — ${new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' })}_`,
  ].join('\n');

  const result = await wa.sendMessage(event.notifyPhone, messageBody);

  return {
    ok: result.ok,
    channel: client ? 'whatsapp' : 'mock_whatsapp',
    messageSid: result.messageSid,
    error: result.error,
  };
}

/**
 * Convenience wrapper — classifies an inbound reply and escalates via WhatsApp
 * if it's a hot lead, using the provided escalation event data.
 *
 * Only fires for hot-lead classifications (pricing questions, "call me",
 * objections after repeated contact). Non-hot-lead replies are silently ignored.
 */
export async function escalateIfHotLead(
  classification: { wantsHuman: boolean; reason?: string },
  buildEvent: () => EscalationEvent,
): Promise<EscalationResult | null> {
  if (!classification.wantsHuman) return null;
  return escalateViaWhatsApp(buildEvent());
}