/**
 * §P13 / S5 — THE ACKNOWLEDGEMENT NOTIFICATION FAN-OUT (in-app + email).
 * §2026-10-12 — the instant-message (WhatsApp/Twilio) channel is REMOVED.
 *
 * WHAT THIS MODULE IS
 * -------------------
 * S1 declared the notification schedule (`PO_ACK_NOTIFICATION_HOURS` = 12/6/2h —
 * Mercenta OPERATIONAL SCHEDULING, never presented as a retail-channel rule), and
 * the window owner already DERIVED which stages a purchase order has reached. But
 * nothing FANNED THEM OUT: the schedule was derivable and delivered nowhere.
 *
 * This module is the fan-out. It is the ONE owner of:
 *   · WHICH channels a message may travel on (the brand's own declared
 *     notification preferences — the canonical record the brand edits in Settings);
 *   · WHERE each channel delivers (the brand's declared destinations, read from the
 *     canonical brand records — never invented);
 *   · WHETHER a channel may be used AT ALL (fail-closed: a channel with no
 *     destination on record is refused with its reason stated);
 *   · WHAT the message says (derived from the window owner + the config-owned rule
 *     text — no surface writes its own copy);
 *   · WHAT WAS DELIVERED, to whom, on which channel, by whom, when, and with which
 *     (mock or provider) reference — the canonical delivery ledger;
 *   · THE FINAL STAGE, at which the S4 producer (`draftOnBehalfRejection`) is
 *     invoked, so Mercenta's on-behalf draft is produced BY THE SWEEP rather than
 *     only when a surface happens to render the purchase order.
 *
 * NO TIMER IS THE SOURCE OF TRUTH
 * -------------------------------
 * There is no `setInterval`/`setTimeout` here. The fan-out is EXPLICITLY INVOKED —
 * by the declared scheduler seam later, by the automation registry today
 * (`src/lib/automation/registry.ts → po_acknowledgement_fanout`) — exactly like the
 * proactive reminder sweep (`src/lib/work/reminderRunner.ts`). The instant is
 * supplied by the caller (`now`), the same seam the window owner takes, so a gate
 * can pin it and a runtime can pass the real clock.
 *
 * IDEMPOTENT BY CONSTRUCTION
 * --------------------------
 * Every delivery carries the deterministic key
 * `po-ack-notify-<poId>-<stage>-<channel>`. A delivery already made is NEVER made
 * twice, so running the fan-out N times with unchanged state delivers each stage on
 * each channel exactly once — which is also what makes a MISSED sweep safe: every
 * stage reached in the meantime is still owed and is delivered on the next run.
 *
 * A refusal is not permanent: it is re-evaluated on every run, so the moment a
 * channel becomes usable (a destination is put on record) the owed message IS
 * delivered and the superseded refusal is named in the audit entry. A refusal whose
 * reason is unchanged is not re-recorded.
 *
 * ATTRIBUTION AND AUDIT
 * ---------------------
 * The SENDER is Mercenta's declared automatic identity (`PO_ACK_SYSTEM_ACTOR_ID`):
 * Mercenta operates the retail-channel relationship, so the reminder is Mercenta's
 * message on the brand's behalf. The TRIGGER is the actor who invoked the sweep.
 * Both are recorded on every delivery, with ONE canonical audit entry per delivery
 * or refusal, so the trail shows who sent it and who invoked it.
 */
import {
  PO_ACK_AUTO_REJECT_REASON,
  PO_ACK_NOTIFICATION_HOURS,
  PO_ACK_ON_BEHALF_WINDOW_HOURS,
  PO_ACK_SYSTEM_ACTOR_ID,
  PO_ACK_WINDOW_RULE_TEXT,
  type PoChannelState,
} from '@/config/purchaseOrders';
import {
  poAcknowledgementWindow,
  poNeedsAutoRejection,
  poNotificationStagesDue,
  type PoNotificationStage,
} from '@/lib/commerce/poAcknowledgementWindow';
import { draftOnBehalfRejection } from '@/data/api';
import { demoAuditLog, demoNotificationPrefs, demoPurchaseOrders } from '@/data/demoStore';
import { ALL_DEMO_BRANDS } from '@/data/demoData';
import type { ProviderResolutionMode } from '@/integrations/types';
import { emitEvent } from '@/lib/events/eventFeed';
import { notifyCanonicalStoreChange } from '@/lib/domain/canonicalSignal';
import { createMailClient, type MailConnection } from '@/lib/mail/mail';
import type { WorkScope } from '@/lib/work/types';
import type { NotificationChannel, PurchaseOrder } from '@/types';

/** The declared event type the fan-out emits (ONE event system, no second feed). */
export const PO_ACK_NOTIFICATION_EVENT = 'po_acknowledgement_notification' as const;

/** Human labels for the channels a message can travel on. */
export const PO_ACK_CHANNEL_LABELS: Record<NotificationChannel, string> = {
  in_app: 'In-app',
  email: 'Email',
};

/** The in-app channel is INTERNAL — Mercenta operates it, so it needs no address. */
export const PO_ACK_IN_APP_DESTINATION = 'in-app (Mercenta-operated)';

/** The notification event these messages belong to (the brand's own preference row). */
export const PO_ACK_EVENT_TYPE = 'po_acknowledgment_deadline' as const;

/* ── Destinations (canonical records only — never invented) ────────────────── */

/**
 * The brand's declared destination for a channel, read from the CANONICAL brand
 * records:
 *
 *   · `in_app` — internal; the delivery IS the in-app notification.
 *   · `email`  — the brand's declared contact email (`DemoBrand.email`, the
 *                canonical brand declaration the brand rows are generated from).
 *
 * §2026-10-12 — the `sms` (instant-message) destination is GONE with the
 * WhatsApp/Twilio feature. A missing destination is returned as `null` and is NEVER
 * defaulted to a plausible fake address.
 */
export function poAckDestinationFor(brandId: string, channel: NotificationChannel): string | null {
  if (channel === 'in_app') return PO_ACK_IN_APP_DESTINATION;
  return ALL_DEMO_BRANDS.find((b) => b.id === brandId)?.email ?? null;
}

/* ── Channel resolution — fail-closed ─────────────────────────────────────── */

/** How a channel delivers: internal, a positively-resolved simulation, or live. */
export type PoAckChannelMode = 'internal' | 'simulation' | 'live' | ProviderResolutionMode;

export interface PoAckChannelResolution {
  channel: NotificationChannel;
  /** TRUE when the platform can genuinely deliver on this channel NOW. */
  deliverable: boolean;
  /** Why it cannot (null when it can). Never a silent absence. */
  refusal: string | null;
  destination: string | null;
  mode: PoAckChannelMode;
}

/**
 * Resolve ONE channel for ONE brand at this instant.
 *
 * FAIL CLOSED, and never silently: the in-app channel needs no address, and the
 * email channel needs the brand's declared contact email. A channel with no
 * destination on record is refused with its reason stated.
 *
 * §2026-10-12 — the instant-message branch is REMOVED with the WhatsApp/Twilio
 * feature, so only the two internal channels remain and no provider mode is needed.
 */
export function resolvePoAckChannel(
  brandId: string,
  channel: NotificationChannel
): PoAckChannelResolution {
  if (channel === 'in_app') {
    return {
      channel,
      deliverable: true,
      refusal: null,
      destination: PO_ACK_IN_APP_DESTINATION,
      mode: 'internal',
    };
  }

  const destination = poAckDestinationFor(brandId, 'email');
  return destination
    ? { channel, deliverable: true, refusal: null, destination, mode: 'internal' }
    : {
        channel,
        deliverable: false,
        destination: null,
        mode: 'internal',
        refusal: `No contact email is on record for ${brandId}, so no email is sent (fail-closed).`,
      };
}

/**
 * The channels a message may travel on for ONE brand: the brand's OWN declared
 * notification preferences for the acknowledgement event
 * (`NotificationEventType = 'po_acknowledgment_deadline'`), in the declared channel
 * order. A disabled preference, or one with no channel selected, yields NO channels
 * — the brand has said it does not want them.
 *
 * A brand with NO preference record for this event yields no channels (fail closed):
 * the platform never invents a subscription the brand has not declared.
 */
export function poAckChannelsFor(brandId: string): NotificationChannel[] {
  const pref = demoNotificationPrefs.find(
    (p) => p.brandId === brandId && p.eventType === PO_ACK_EVENT_TYPE
  );
  if (!pref || !pref.enabled) return [];
  return [...pref.channels];
}

/* ── The channel clients (declared seam, mock-first) ──────────────────────── */

export interface PoAckChannelMessage {
  channel: NotificationChannel;
  destination: string;
  subject: string;
  body: string;
}

export interface PoAckChannelSendResult {
  ok: boolean;
  reference?: string;
  error?: string;
  /** TRUE when a mock/simulated client performed the send — zero provider calls. */
  simulated: boolean;
}

/**
 * ONE contract for every remaining channel (in-app + email). Both are synchronous /
 * internally mocked. §2026-10-12 — the live instant-message client (which returned a
 * Promise) is REMOVED with the WhatsApp/Twilio feature; the contract still admits a
 * Promise so a future asynchronous channel needs no change here.
 */
export interface PoAckChannelClient {
  readonly channel: NotificationChannel;
  readonly mode: 'internal' | 'simulation' | 'live';
  send(
    input: PoAckChannelMessage & { deliveryId: string }
  ): PoAckChannelSendResult | Promise<PoAckChannelSendResult>;
}

/** The internal in-app channel: the delivery IS the notification record. */
export const PO_ACK_IN_APP_CLIENT: PoAckChannelClient = {
  channel: 'in_app',
  mode: 'internal',
  send: ({ deliveryId }) => ({ ok: true, reference: `in-app:${deliveryId}`, simulated: false }),
};

/**
 * The email channel: the SAME adapter the rest of the platform sends through
 * (`src/lib/mail/mail.ts` — Postmark/SendGrid via the Edge-Function send). With no
 * verified connection the factory returns the MOCK client, whose ids are
 * unmistakably simulated (`mock:msg-…`), so the delivery is LABELLED simulated
 * rather than presented as a provider send.
 */
export function createPoAckEmailClient(
  getConnection: () => MailConnection | null = () => null,
  edgeFunctionBase = ''
): PoAckChannelClient {
  const client = createMailClient(getConnection, edgeFunctionBase);
  return {
    channel: 'email',
    mode: 'internal',
    async send(input) {
      const result = await client.sendEmail({
        to: input.destination,
        subject: input.subject,
        text: input.body,
      });
      return {
        ok: result.ok,
        reference: result.messageId,
        error: result.error,
        simulated: (result.messageId ?? '').startsWith('mock:'),
      };
    },
  };
}

/* ── The plan (pure: what the declared schedule owes at one instant) ──────── */

/** The declared FINAL notification stage — config-owned, never hand-written. */
export const PO_ACK_FINAL_NOTIFICATION_STAGE: PoNotificationStage = Math.min(
  ...PO_ACK_NOTIFICATION_HOURS
);

/** Deterministic delivery id — never time- or random-derived. */
export function poAckDeliveryId(
  poId: string,
  stage: PoNotificationStage,
  channel: NotificationChannel
): string {
  return `po-ack-notify-${poId}-${stage}-${channel}`.replace(/[^a-zA-Z0-9_-]/g, '-');
}

export interface PoAckNotificationMessage extends PoAckChannelMessage {
  /** Deterministic: `po-ack-notify-<poId>-<stage>-<channel>`. */
  deliveryId: string;
  poId: string;
  poNumber: string;
  brandId: string;
  /** The declared stage that is due (hours remaining when the brand is notified). */
  stage: PoNotificationStage;
  /** TRUE for the final declared stage — where Mercenta drafts the on-behalf rejection. */
  finalStage: boolean;
  /** The ONE operator-facing statement of the window rule (config-owned wording). */
  ruleText: string;
  mode: PoAckChannelMode;
}

export interface PoAckNotificationRefusal {
  deliveryId: string;
  stage: PoNotificationStage;
  channel: NotificationChannel;
  destination: string | null;
  mode: PoAckChannelMode;
  /** Why the channel could not carry the message. Never a silent absence. */
  reason: string;
}

export interface PoAckNotificationPlan {
  poId: string;
  poNumber: string;
  brandId: string;
  /** The owner's own lifecycle state for this PO (Amazon's vocabulary). */
  channelState: PoChannelState;
  /** TRUE when the plan owes anything at all (a message or the final-stage draft). */
  due: boolean;
  /** The declared stages already reached — the owner's own list. */
  stages: PoNotificationStage[];
  finalStage: PoNotificationStage;
  messages: PoAckNotificationMessage[];
  refusals: PoAckNotificationRefusal[];
  /** TRUE when the owner says the channel-required rejection is Mercenta's to perform. */
  draftDue: boolean;
  /** Why nothing is planned (null when something is) — never a silent absence. */
  reason: string | null;
}

/** `3h 20m` / `20m` — derived from the owner's own figures. */
function remainingLabel(hoursLeft: number | null, minutesLeft: number | null): string {
  if (hoursLeft === null || minutesLeft === null) return 'an unreadable window';
  const hours = Math.max(0, Math.floor(hoursLeft));
  const minutes = Math.max(0, minutesLeft);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

/** `2026-09-25 14:05` — the instant the window closes, in the operator's own clock. */
function instantLabel(iso: string | null): string {
  if (!iso) return 'an unreadable instant';
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return 'an unreadable instant';
  return d.toISOString().slice(0, 16).replace('T', ' ');
}

/**
 * The message the brand receives — DERIVED, so no surface, client or audit entry
 * writes its own copy. It states the config-owned rule, the time the brand actually
 * has, and — at the final stage — that Mercenta has drafted the channel-required
 * rejection for the brand's approval and that nothing is performed without it.
 *
 * Wording-safe by construction: it says "the retail channel" and never names it.
 */
export function poAckNotificationCopy(input: {
  poNumber: string;
  stage: PoNotificationStage;
  finalStage: boolean;
  hoursLeft: number | null;
  minutesLeft: number | null;
  deadline: string | null;
  draftDue: boolean;
}): { subject: string; body: string } {
  const remaining = remainingLabel(input.hoursLeft, input.minutesLeft);
  const closes = instantLabel(input.deadline);
  const decision = input.finalStage
    ? input.draftDue
      ? `Mercenta has drafted the retail channel's required rejection (${PO_ACK_AUTO_REJECT_REASON}) for your ` +
        `approval — nothing is performed until you approve it.`
      : `This is the final scheduled reminder before the window closes.`
    : `Decide the lines from your Purchase Orders surface — accept, backorder or reject them.`;
  return {
    subject: `PO ${input.poNumber} — ${remaining} left to acknowledge`,
    body:
      `Scheduled reminder (${input.stage}h stage): ${PO_ACK_WINDOW_RULE_TEXT} ${remaining} left of the window ` +
      `(closes ${closes}). ${decision}`,
  };
}

/**
 * THE PURE PLAN for ONE purchase order at ONE instant.
 *
 *   · a PO with NO acknowledgement obligation (or a recorded decision) plans
 *     nothing — there is nothing to remind the brand about;
 *   · an unreadable window plans nothing (fail-closed: the owner's own rule);
 *   · PAST the limit the brand's decision has closed, so the notification schedule
 *     no longer applies: the plan owes only the channel-required rejection, which
 *     Mercenta drafts for approval (`draftDue`) — it does NOT replay the 12/6/2
 *     reminders for an order whose window is gone;
 *   · otherwise the plan carries ONE message per reached stage per DELIVERABLE
 *     channel, and one refusal per reached stage per channel the platform cannot
 *     use — each with its reason.
 */
export function poAckNotificationPlan(
  po: PurchaseOrder,
  now: Date | string | number = new Date(),
  opts: { channels?: readonly NotificationChannel[] } = {}
): PoAckNotificationPlan {
  const window = poAcknowledgementWindow(po, now);
  const draftDue = poNeedsAutoRejection(po, now);
  const base: PoAckNotificationPlan = {
    poId: po.id,
    poNumber: po.poNumber,
    brandId: po.brandId,
    channelState: window.channelState,
    due: false,
    stages: [],
    finalStage: PO_ACK_FINAL_NOTIFICATION_STAGE,
    messages: [],
    refusals: [],
    draftDue,
    reason: null,
  };

  if (window.channelState === 'unknown') {
    return { ...base, reason: window.reason };
  }
  if (window.channelState !== 'new') {
    /** Acknowledged / closed: the decision is recorded, or none was owed. */
    return { ...base, reason: window.reason };
  }

  /** PAST THE LIMIT — the brand's decision has closed (the documented rule). */
  if (window.mustReject) {
    return {
      ...base,
      due: draftDue,
      reason: draftDue
        ? `The 24-hour window closed on ${instantLabel(window.deadline)} — the documented action past the limit ` +
          `is a rejection, so Mercenta drafts it for the brand's approval and the notification schedule no longer ` +
          `applies.`
        : `The 24-hour window closed on ${instantLabel(window.deadline)} and the decision is already recorded.`,
    };
  }

  const stages = poNotificationStagesDue(po, now);
  const channels = opts.channels ?? poAckChannelsFor(po.brandId);
  const messages: PoAckNotificationMessage[] = [];
  const refusals: PoAckNotificationRefusal[] = [];

  for (const stage of stages) {
    const finalStage = stage === base.finalStage;
    const copy = poAckNotificationCopy({
      poNumber: po.poNumber,
      stage,
      finalStage,
      hoursLeft: window.hoursLeft,
      minutesLeft: window.minutesLeft,
      deadline: window.deadline,
      draftDue,
    });
    for (const channel of channels) {
      const resolution = resolvePoAckChannel(po.brandId, channel);
      const deliveryId = poAckDeliveryId(po.id, stage, channel);
      if (!resolution.deliverable || !resolution.destination) {
        refusals.push({
          deliveryId,
          stage,
          channel,
          destination: resolution.destination,
          mode: resolution.mode,
          reason: resolution.refusal ?? `The ${channel} channel cannot deliver for ${po.brandId}.`,
        });
        continue;
      }
      messages.push({
        deliveryId,
        poId: po.id,
        poNumber: po.poNumber,
        brandId: po.brandId,
        stage,
        finalStage,
        ruleText: PO_ACK_WINDOW_RULE_TEXT,
        mode: resolution.mode,
        channel,
        destination: resolution.destination,
        subject: copy.subject,
        body: copy.body,
      });
    }
  }

  return {
    ...base,
    due: messages.length > 0 || refusals.length > 0 || draftDue,
    stages,
    messages,
    refusals,
    reason: null,
  };
}

/* ── The canonical delivery ledger ───────────────────────────────────────── */

/**
 * The declared automation id the fan-out runs under
 * (`src/lib/automation/registry.ts` declares the same id — one source, so the
 * registry entry and this module can never disagree about what is being run).
 */
export const PO_ACK_NOTIFICATION_AUTOMATION_ID = 'po_acknowledgement_fanout';

export type PoAckDeliveryState = 'delivered' | 'dispatching' | 'refused' | 'failed';

export interface PoAckDeliveryRecord {
  /** Deterministic delivery id (`po-ack-notify-<poId>-<stage>-<channel>`). */
  id: string;
  poId: string;
  poNumber: string;
  brandId: string;
  stage: PoNotificationStage;
  finalStage: boolean;
  channel: NotificationChannel;
  destination: string | null;
  mode: PoAckChannelMode;
  subject: string;
  body: string;
  state: PoAckDeliveryState;
  /** The provider's or mock client's own reference (never fabricated). */
  reference: string | null;
  /** TRUE when a mock/simulated client performed the send. */
  simulated: boolean;
  /** Why the channel refused, or why the send failed. Never a silent absence. */
  reason: string | null;
  /** The SENDER — Mercenta's declared automatic identity. */
  sentBy: string;
  /** The TRIGGER — the actor who invoked the fan-out. */
  triggeredBy: string;
  at: string;
  /** The state this record superseded (a refusal that became a delivery). */
  superseded: string | null;
}

/* ── Store state (deterministic ledger — the ONLY mutable state) ──────────── */

const ledger = new Map<string, PoAckDeliveryRecord>();
let stamp = 0;
const listeners = new Set<() => void>();

export function poAckNotificationVersion(): number {
  return stamp;
}

export function subscribePoAckNotifications(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyFanout(): void {
  stamp += 1;
  for (const l of listeners) l();
}

function pushAudit(
  action: string,
  entityId: string,
  tenantId: string,
  reason: string,
  actor: string,
  metadata: Record<string, unknown>
): void {
  demoAuditLog.push({
    id: `audit-po-ack-notify-${entityId}-${demoAuditLog.length}`,
    createdAt: new Date().toISOString(),
    actorId: actor,
    action,
    entityType: 'purchase_order',
    entityId,
    brandId: tenantId,
    reason,
    metadata,
  });
  notifyCanonicalStoreChange();
}

function isThenable(
  value: PoAckChannelSendResult | Promise<PoAckChannelSendResult>
): value is Promise<PoAckChannelSendResult> {
  return typeof (value as Promise<PoAckChannelSendResult>)?.then === 'function';
}

/* ── The fan-out ─────────────────────────────────────────────────────────── */

export interface PoAckFanoutOptions {
  /** The caller clock — the same seam the window owner takes. */
  now?: Date | string | number;
  /** Injected email client (the seam `createMailClient` returns). */
  emailClient?: PoAckChannelClient;
  /** Injected in-app client (the internal channel). */
  inAppClient?: PoAckChannelClient;
}

export interface PoAckChannelSummary {
  channel: NotificationChannel;
  delivered: number;
  refused: number;
  mode: PoAckChannelMode;
  /** The refusal reason when the channel could not be used at all (null when it was). */
  reason: string | null;
}

export interface PoAckFanoutResult {
  /** The instant the fan-out was evaluated at (the caller clock). */
  ranAt: string;
  /** Purchase orders examined in scope. */
  evaluated: number;
  /** Deliveries recorded by THIS run (a repeat run records none). */
  deliveries: PoAckDeliveryRecord[];
  /** Refusals recorded by THIS run (unchanged reasons are not re-recorded). */
  refused: PoAckDeliveryRecord[];
  /** Deliveries/refusals already recorded and therefore suppressed. */
  duplicatesSuppressed: number;
  /** The on-behalf drafts the FINAL stage produced (S4's producer), by draft id. */
  draftsProduced: string[];
  /** Per-channel totals for the run — what actually went out, and what could not. */
  channels: PoAckChannelSummary[];
  notes: string[];
}

/** The client for ONE channel — the declared seam, resolved for this run. */
function clientFor(channel: NotificationChannel, opts: PoAckFanoutOptions): PoAckChannelClient {
  return channel === 'in_app'
    ? opts.inAppClient ?? PO_ACK_IN_APP_CLIENT
    : opts.emailClient ?? createPoAckEmailClient();
}

/**
 * Complete ONE delivery: the state, the reference, the canonical event and the ONE
 * audit entry. Called synchronously for internal/simulated clients, and when a live
 * provider answers.
 */
function recordOutcome(
  record: PoAckDeliveryRecord,
  result: PoAckChannelSendResult,
  actor: string
): PoAckDeliveryRecord {
  const next: PoAckDeliveryRecord = {
    ...record,
    state: result.ok ? 'delivered' : 'failed',
    reference: result.reference ?? null,
    simulated: result.simulated,
    reason: result.ok ? null : result.error ?? 'The channel client refused the send.',
  };
  ledger.set(next.id, next);
  const route = `${PO_ACK_CHANNEL_LABELS[next.channel]} → ${next.destination ?? 'no destination'}`;
  pushAudit(
    result.ok ? 'purchase_order_ack_notification_sent' : 'purchase_order_ack_notification_failed',
    next.poId,
    next.brandId,
    `${PO_ACK_SYSTEM_ACTOR_ID} (triggered by ${actor}): ${route} — "${next.subject}" for PO ${next.poNumber} at the ` +
      `${next.stage}h notification stage${result.ok ? '' : `; the send FAILED: ${next.reason}`}` +
      `${next.simulated ? ' [SIMULATED — no provider call]' : ''}` +
      `${next.superseded ? ` (supersedes ${next.superseded})` : ''}.`,
    actor,
    {
      deliveryId: next.id,
      stage: next.stage,
      channel: next.channel,
      destination: next.destination,
      mode: next.mode,
      simulated: next.simulated,
      reference: next.reference,
      sentBy: next.sentBy,
      triggeredBy: actor,
      superseded: next.superseded,
    }
  );
  emitEvent({
    type: PO_ACK_NOTIFICATION_EVENT,
    severity: next.finalStage ? 'critical' : 'important',
    title: next.subject,
    description: next.body,
    entityId: next.brandId,
    metadata: {
      deliveryId: next.id,
      poId: next.poId,
      poNumber: next.poNumber,
      brandId: next.brandId,
      stage: next.stage,
      channel: next.channel,
      destination: next.destination,
      mode: next.mode,
      state: next.state,
      simulated: next.simulated,
      reference: next.reference,
    },
  });
  notifyFanout();
  return next;
}

/** Deliver ONE message through its channel's client, recording the outcome. */
function deliverPoAckMessage(
  message: PoAckNotificationMessage,
  ctx: { at: string; actor: string; superseded: string | null; opts: PoAckFanoutOptions }
): PoAckDeliveryRecord {
  const client = clientFor(message.channel, ctx.opts);
  const pending: PoAckDeliveryRecord = {
    id: message.deliveryId,
    poId: message.poId,
    poNumber: message.poNumber,
    brandId: message.brandId,
    stage: message.stage,
    finalStage: message.finalStage,
    channel: message.channel,
    destination: message.destination,
    mode: message.mode,
    subject: message.subject,
    body: message.body,
    state: 'dispatching',
    reference: null,
    simulated: false,
    reason: null,
    sentBy: PO_ACK_SYSTEM_ACTOR_ID,
    triggeredBy: ctx.actor,
    at: ctx.at,
    superseded: ctx.superseded,
  };

  let outcome: PoAckChannelSendResult | Promise<PoAckChannelSendResult>;
  try {
    outcome = client.send({
      channel: message.channel,
      destination: message.destination,
      subject: message.subject,
      body: message.body,
      deliveryId: message.deliveryId,
    });
  } catch (error) {
    return recordOutcome(
      pending,
      { ok: false, error: error instanceof Error ? error.message : String(error), simulated: false },
      ctx.actor
    );
  }

  /**
   * A live provider call is genuinely asynchronous: the delivery is recorded as
   * `dispatching` and completed when the provider answers, so it can never be
   * mistaken for a completed send.
   */
  if (isThenable(outcome)) {
    ledger.set(pending.id, pending);
    notifyFanout();
    void Promise.resolve(outcome)
      .then((result) => recordOutcome(pending, result, ctx.actor))
      .catch((error) =>
        recordOutcome(
          pending,
          { ok: false, error: error instanceof Error ? error.message : String(error), simulated: false },
          ctx.actor
        )
      );
    return pending;
  }

  return recordOutcome(pending, outcome, ctx.actor);
}

/** Record ONE refusal — attributed and audited, and only once per reason. */
function recordRefusal(
  refusal: PoAckNotificationRefusal,
  plan: PoAckNotificationPlan,
  ctx: { at: string; actor: string; superseded: string | null }
): PoAckDeliveryRecord {
  const record: PoAckDeliveryRecord = {
    id: refusal.deliveryId,
    poId: plan.poId,
    poNumber: plan.poNumber,
    brandId: plan.brandId,
    stage: refusal.stage,
    finalStage: refusal.stage === plan.finalStage,
    channel: refusal.channel,
    destination: refusal.destination,
    mode: refusal.mode,
    subject: `PO ${plan.poNumber} — ${refusal.stage}h reminder NOT delivered`,
    body: refusal.reason,
    state: 'refused',
    reference: null,
    simulated: false,
    reason: refusal.reason,
    sentBy: PO_ACK_SYSTEM_ACTOR_ID,
    triggeredBy: ctx.actor,
    at: ctx.at,
    superseded: ctx.superseded,
  };
  ledger.set(record.id, record);
  pushAudit(
    'purchase_order_ack_notification_refused',
    plan.poId,
    plan.brandId,
    `${PO_ACK_SYSTEM_ACTOR_ID} (triggered by ${ctx.actor}): the ${PO_ACK_CHANNEL_LABELS[refusal.channel]} reminder ` +
      `for PO ${plan.poNumber} at the ${refusal.stage}h stage was REFUSED — ${refusal.reason}` +
      `${record.superseded ? ` (supersedes ${record.superseded})` : ''}. Nothing was sent, and the brand's other ` +
      `channels are unaffected.`,
    ctx.actor,
    {
      deliveryId: record.id,
      stage: refusal.stage,
      channel: refusal.channel,
      mode: refusal.mode,
      destination: refusal.destination,
      sentBy: record.sentBy,
      triggeredBy: ctx.actor,
      superseded: record.superseded,
    }
  );
  emitEvent({
    type: PO_ACK_NOTIFICATION_EVENT,
    severity: 'important',
    title: record.subject,
    description: refusal.reason,
    entityId: plan.brandId,
    metadata: {
      deliveryId: record.id,
      poId: plan.poId,
      poNumber: plan.poNumber,
      brandId: plan.brandId,
      stage: refusal.stage,
      channel: refusal.channel,
      mode: refusal.mode,
      state: 'refused',
      simulated: false,
    },
  });
  notifyFanout();
  return record;
}

/* ── THE FAN-OUT SWEEP (explicitly invoked, deterministic, idempotent) ────── */

/**
 * Execute ONE fan-out over the purchase orders in scope.
 *
 *   · EXPLICIT — no timer invokes it; the declared scheduler seam
 *     (`describePoAckNotificationFanout`) and the automation registry do.
 *   · TENANT-SAFE — a brand-scope fan-out MUST name its tenant, and a brand run
 *     sees only that brand's purchase orders (fail closed).
 *   · IDEMPOTENT — a delivery already made is never made twice; a refusal whose
 *     reason is unchanged is not re-recorded; the moment a channel becomes usable
 *     the owed message IS delivered and the superseded refusal is named.
 *   · THE FINAL STAGE PRODUCES MERCENTA'S DRAFT — the S4 producer is invoked here,
 *     so the on-behalf draft exists because the schedule reached its final stage,
 *     not because a surface happened to render the purchase order. Nothing is
 *     performed: the brand's (or Mercenta staff's) approval is still the only path
 *     that executes (`src/data/api.ts → approveOnBehalfRejection`).
 */
export function runPoAckNotificationFanout(
  scope: WorkScope = 'admin',
  tenantId?: string | null,
  actor = `automation:${PO_ACK_NOTIFICATION_AUTOMATION_ID}`,
  opts: PoAckFanoutOptions = {}
): PoAckFanoutResult {
  const at = new Date(opts.now ?? Date.now()).toISOString();
  const deliveries: PoAckDeliveryRecord[] = [];
  const refused: PoAckDeliveryRecord[] = [];
  const draftsProduced: string[] = [];
  const notes: string[] = [];
  const channelCounts = new Map<NotificationChannel, PoAckChannelSummary>();

  const bump = (
    channel: NotificationChannel,
    key: 'delivered' | 'refused',
    mode: PoAckChannelMode,
    reason: string | null
  ): void => {
    const row =
      channelCounts.get(channel) ?? { channel, delivered: 0, refused: 0, mode, reason: null };
    row[key] += 1;
    row.mode = mode;
    if (reason) row.reason = reason;
    channelCounts.set(channel, row);
  };

  /** TENANT ISOLATION — fail closed: a brand fan-out must name its tenant. */
  if (scope === 'brand' && !tenantId) {
    return {
      ranAt: at,
      evaluated: 0,
      deliveries,
      refused,
      duplicatesSuppressed: 0,
      draftsProduced,
      channels: [],
      notes: [
        'Refused: a brand-scope fan-out must name its tenant, so NO notification was produced for any brand ' +
          '(fail-closed).',
      ],
    };
  }

  const pos = demoPurchaseOrders
    .filter((po) => (scope === 'brand' ? po.brandId === tenantId : true))
    .sort((a, b) => a.id.localeCompare(b.id));

  let duplicatesSuppressed = 0;

  for (const po of pos) {
    const plan = poAckNotificationPlan(po, at);
    if (!plan.due) continue;

    for (const message of plan.messages) {
      const standing = ledger.get(message.deliveryId);
      if (standing && (standing.state === 'delivered' || standing.state === 'dispatching')) {
        duplicatesSuppressed += 1;
        continue;
      }
      const record = deliverPoAckMessage(message, {
        at,
        actor,
        opts,
        superseded: standing ? `${standing.state}: ${standing.reason ?? standing.reference ?? 'recorded'}` : null,
      });
      deliveries.push(record);
      bump(record.channel, 'delivered', record.mode, null);
    }

    for (const refusal of plan.refusals) {
      const standing = ledger.get(refusal.deliveryId);
      if (standing?.state === 'refused' && standing.reason === refusal.reason) {
        duplicatesSuppressed += 1;
        continue;
      }
      const record = recordRefusal(refusal, plan, {
        at,
        actor,
        superseded: standing ? `${standing.state}: ${standing.reason ?? 'recorded'}` : null,
      });
      refused.push(record);
      bump(record.channel, 'refused', record.mode, record.reason);
    }

    /** THE FINAL STAGE — the S4 producer, invoked by the schedule itself. */
    if (plan.draftDue) {
      const produced = draftOnBehalfRejection(po.id, at);
      if (produced.ok && produced.created && produced.draft) {
        draftsProduced.push(produced.draft.draftId);
        notes.push(
          `PO ${po.poNumber}: the final notification stage produced Mercenta's on-behalf rejection draft ` +
            `${produced.draft.draftId} for the brand's approval — nothing was performed.`
        );
      }
    }
  }

  const channels = [...channelCounts.values()].sort((a, b) => a.channel.localeCompare(b.channel));
  if (deliveries.length > 0 || refused.length > 0 || draftsProduced.length > 0) notifyFanout();

  return {
    ranAt: at,
    evaluated: pos.length,
    deliveries,
    refused,
    duplicatesSuppressed,
    draftsProduced,
    channels,
    notes: [
      `${deliveries.length} message(s) delivered on ${channels.filter((c) => c.delivered > 0).length} channel(s); ` +
        `${refused.length} channel refusal(s) recorded; ${duplicatesSuppressed} already recorded (suppressed).`,
      ...notes,
      ...channels
        .filter((c) => c.refused > 0)
        .map(
          (c) =>
            `${PO_ACK_CHANNEL_LABELS[c.channel]}: ${c.refused} refusal(s) — ${c.reason ?? 'refused'}`
        ),
    ],
  };
}

/* ── Queries (tenant-scoped — fail closed) ───────────────────────────────── */

/**
 * TENANT SCOPE: a brand scope returns ONLY that brand's own deliveries, and a
 * brand scope without a tenant returns NOTHING (fail closed) — the same rule the
 * work layer enforces, so a shared surface can never leak another tenant's
 * notifications.
 */
function inScope(record: PoAckDeliveryRecord, scope: WorkScope, tenantId?: string | null): boolean {
  if (scope !== 'brand') return true;
  return Boolean(tenantId) && record.brandId === tenantId;
}

/** Every delivery/refusal on record, most urgent stage first. */
export function getPoAckDeliveries(
  scope: WorkScope = 'admin',
  tenantId?: string | null
): PoAckDeliveryRecord[] {
  return [...ledger.values()]
    .filter((r) => inScope(r, scope, tenantId))
    .sort((a, b) => a.stage - b.stage || a.id.localeCompare(b.id));
}

/**
 * The IN-APP channel's deliveries — what the brand genuinely SEES in its
 * notification centre. Only completed in-app deliveries: a `dispatching` live send
 * is not presented as a delivered message.
 */
export function poAckInAppDeliveries(
  scope: WorkScope = 'admin',
  tenantId?: string | null
): PoAckDeliveryRecord[] {
  return getPoAckDeliveries(scope, tenantId).filter(
    (r) => r.channel === 'in_app' && r.state === 'delivered'
  );
}

/** Every refusal on record — so a fail-closed channel is observable, never silent. */
export function poAckRefusals(
  scope: WorkScope = 'admin',
  tenantId?: string | null
): PoAckDeliveryRecord[] {
  return getPoAckDeliveries(scope, tenantId).filter((r) => r.state === 'refused');
}

/* ── §P13 / S6 — THE BRAND-SIDE VIEW of ONE reminder ───────────────────────
 *
 * S5 made the schedule REACH the brand and recorded every delivery and every
 * refusal in the canonical ledger. The brand's surfaces must then present what
 * actually happened — the declared stage, the channel the message travelled on,
 * the DESTINATION it reached, and (where a channel the brand subscribed to could
 * not be used) the fail-closed reason, verbatim.
 *
 * ONE owner, so no surface re-reads the ledger, re-states a channel outcome or
 * invents a destination of its own.
 */

/** ONE channel's disposition for ONE reminder (same purchase order, same stage). */
export interface PoAckChannelDisposition {
  channel: NotificationChannel;
  /** The declared human label for the channel (never written by a surface). */
  label: string;
  state: PoAckDeliveryState;
  /** The destination the message reached, or null when none was on record. */
  destination: string | null;
  mode: PoAckChannelMode;
  /** TRUE when a mock/simulated client performed the send (never presented as live). */
  simulated: boolean;
  /** Why the channel refused or failed. Never a silent absence. */
  reason: string | null;
}

/**
 * ONE delivered in-app reminder, WITH every channel that was attempted for the
 * same purchase order at the same declared stage — the refusals included, so the
 * brand can see that a channel it subscribed to could not reach it, and why.
 */
export interface PoAckReminderView {
  /** The IN-APP delivery the brand genuinely reads. */
  delivery: PoAckDeliveryRecord;
  /** Every channel attempted for this PO at this stage (`delivery` included). */
  channels: PoAckChannelDisposition[];
}

/**
 * The brand-side views: the in-app reminders on record, each with its own
 * per-channel disposition. Derived ENTIRELY from the canonical ledger, so a
 * surface can never disagree with what the fan-out actually delivered — and
 * tenant-scoped by the same accessors (`poAckInAppDeliveries` /
 * `getPoAckDeliveries`), which fail closed for a brand scope with no tenant.
 */
export function poAckReminderViews(
  scope: WorkScope = 'admin',
  tenantId?: string | null
): PoAckReminderView[] {
  const messages = getPoAckDeliveries(scope, tenantId);
  return poAckInAppDeliveries(scope, tenantId).map((delivery) => ({
    delivery,
    channels: messages
      .filter((r) => r.poId === delivery.poId && r.stage === delivery.stage)
      .map((r) => ({
        channel: r.channel,
        label: PO_ACK_CHANNEL_LABELS[r.channel],
        state: r.state,
        destination: r.destination,
        mode: r.mode,
        simulated: r.simulated,
        reason: r.reason,
      })),
  }));
}

/**
 * The ONE sentence that states a reminder's channel outcome: every channel that
 * carried the message WITH the destination it reached, then every channel that
 * could not be used WITH its fail-closed reason (verbatim — never paraphrased,
 * never softened). Nothing here is inferred; everything is read from the ledger.
 */
export function poAckReminderChannelDetail(view: PoAckReminderView): string {
  const reached = view.channels
    .filter((c) => c.state === 'delivered')
    .map(
      (c) =>
        `${c.label} → ${c.destination ?? 'no destination on record'}${c.simulated ? ' (simulated)' : ''}`
    );
  const unusable = view.channels
    .filter((c) => c.state === 'refused' || c.state === 'failed')
    .map(
      (c) =>
        `${c.label} unavailable — ${
          c.reason ?? (c.state === 'failed' ? 'the send failed' : 'no reason recorded')
        }`
    );
  return [...reached, ...unusable].join(' · ');
}

/* ── Scheduler seam ───────────────────────────────────────────────────────── */

/**
 * What a real scheduler needs to know. Nothing else in this module is
 * scheduler-specific, so connecting a cron/edge function later is a WIRING change
 * and not a rewrite — the same seam the reminder runner declares.
 */
export function describePoAckNotificationFanout(): {
  cadence: string;
  entryPoint: string;
  scopeArgument: string;
  idempotencyKey: string;
  deterministic: boolean;
  usesTimer: boolean;
  networkCalls: number;
  channels: string;
} {
  return {
    cadence: `at each declared notification stage (${PO_ACK_NOTIFICATION_HOURS.join('/')}h remaining) + on demand`,
    entryPoint: 'runPoAckNotificationFanout(scope, tenantId, actor)',
    scopeArgument: "'admin' | 'brand' (+ tenantId for brand scope)",
    idempotencyKey: '"po-ack-notify-<poId>-<stage>-<channel>" — a delivery is made at most once',
    deterministic: true,
    usesTimer: false,
    networkCalls: 0,
    channels: 'in-app (internal) · email (internal adapter, mock-first)',
  };
}

/* ── Deterministic reset (investor demo) ─────────────────────────────────── */

export interface PoAckFanoutResetResult {
  deliveriesCleared: number;
}

export function resetPoAckNotificationStore(): PoAckFanoutResetResult {
  const deliveriesCleared = ledger.size;
  ledger.clear();
  notifyFanout();
  return { deliveriesCleared };
}
