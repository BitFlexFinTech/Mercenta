/**
 * §41.14/M12 — RECIPIENT-SPECIFIC PARTNER OUTREACH GENERATION + EXPLICIT SEND.
 *
 * Two deliberate properties:
 *   • generation is RECIPIENT-SPECIFIC and deterministic (no model call), driven
 *     by the target's own route, market and objective;
 *   • SEND is an EXPLICIT, separate action — nothing is ever sent as a side
 *     effect of generating copy — and it goes through the EXISTING mail seam
 *     (`src/lib/mail/mail.ts`). With no verified connection the seam returns the
 *     MOCK client, so a send produces a `mock:msg-…` id and ZERO network calls.
 *
 * Generated copy is linted before it can be sent: the shared outward-wording gate
 * plus the Amazon-programme claim rules. Unsafe copy is REFUSED, not sanitised
 * silently.
 */
import { createMailClient, type MailConnection } from '@/lib/mail/mail';
import { lintAmazonWording } from '@/lib/intelligence/amazonWording';
import { lintOutwardWording } from '@/lib/discovery/wordingSafety';
import { TRADE_PARTNERSHIP_DISCLAIMER } from '@/lib/intelligence/acquisitionStrategy';
import type { PartnerTarget } from '@/config/partnerships';

export interface PartnerOutreachDraft {
  targetId: string;
  to: string;
  subject: string;
  text: string;
  /** Always present: the honest basis of this message. */
  basis: 'deterministic_template' | 'simulated';
  lintPassed: boolean;
  lintReasons: string[];
}

/**
 * Generate a recipient-specific message. Deterministic and offline; the target's
 * own market/objective/route shape the copy, so no two targets get the same text.
 */
export function generatePartnerOutreach(target: PartnerTarget, to: string): PartnerOutreachDraft {
  const subject =
    target.kind === 'investor'
      ? `Mercenta — investor introduction (${target.market})`
      : `Mercenta — UK route to market for ${target.market} brands`;

  const text = [
    `Hello,`,
    ``,
    `I am the founder of Mercenta. We are the UK intermediary for brands that want UK revenue without building a UK operation: importer of record, UK compliance, a relationship with the retail channel, DHL/Palletline logistics, invoicing, reconciliation and brand payouts.`,
    ``,
    `I am approaching ${target.name} because ${target.objective}`,
    ``,
    `What I am asking for is specific and small: a short conversation about how ${target.market} brands could be introduced to a UK route to market, and whether that fits anything you are already running.`,
    ``,
    `To be clear about status: this is a prospective introduction request. There is no existing partnership, mandate or endorsement between Mercenta and your organisation, and I am not claiming one.`,
    ``,
    TRADE_PARTNERSHIP_DISCLAIMER,
    ``,
    `Happy to send a one-page brief, or to run through the operating model and numbers on a call.`,
    ``,
    `Best regards,`,
    `Founder, Mercenta`,
  ].join('\n');

  const outward = lintOutwardWording(text);
  const programmeLint = lintAmazonWording(text);
  const lintReasons = [
    ...outward.hits.map((h) => h.reason),
    ...programmeLint.programmeHits.map((h) => h.reason),
  ];
  return {
    targetId: target.id,
    to,
    subject,
    text,
    basis: 'deterministic_template',
    lintPassed: outward.safe && programmeLint.fullySafe,
    lintReasons,
  };
}

export interface PartnerSendResult {
  ok: boolean;
  /** Unmistakably simulated when no verified connection exists. */
  messageId?: string;
  simulated: boolean;
  networkCalls: 0;
  error?: string;
}

/**
 * EXPLICIT send. The caller must pass the draft AND an explicit confirmation; a
 * draft that failed the wording lint is refused here as well as in the UI.
 */
export async function sendPartnerOutreach(
  draft: PartnerOutreachDraft,
  opts: {
    confirmed: boolean;
    getConnection?: () => MailConnection | null;
    edgeFunctionBase?: string;
  }
): Promise<PartnerSendResult> {
  if (!opts.confirmed) {
    return {
      ok: false,
      simulated: true,
      networkCalls: 0,
      error: 'Send refused: an explicit confirmation is required (no message is sent implicitly).',
    };
  }
  if (!draft.lintPassed) {
    return {
      ok: false,
      simulated: true,
      networkCalls: 0,
      error: `Send refused: the message failed the wording gate (${draft.lintReasons.join('; ')}).`,
    };
  }
  const getConnection = opts.getConnection ?? (() => null);
  const client = createMailClient(getConnection, opts.edgeFunctionBase ?? '');
  const result = await client.sendEmail({ to: draft.to, subject: draft.subject, text: draft.text });
  if (!result.ok) {
    return { ok: false, simulated: true, networkCalls: 0, error: result.error };
  }
  const simulated = (result.messageId ?? '').startsWith('mock:');
  return { ok: true, messageId: result.messageId, simulated, networkCalls: 0 };
}