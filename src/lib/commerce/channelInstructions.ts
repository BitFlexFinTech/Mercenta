/**
 * §P4 — THE INSTRUCTION-TO-MERCENTA STORE (the proxy model's write path).
 *
 * WHY THIS MODULE EXISTS
 * ----------------------
 * Mercenta operates the retail-channel account; a brand does not. A brand's
 * accept / reject / backorder decision is therefore an **INSTRUCTION to
 * Mercenta**, and Mercenta performs the channel action
 * (`.clinerules/mercenta-business-model.md`). Before P4 the acknowledgement
 * mutated the PO and created a shipment draft inline, which implied the BRAND
 * performed the channel steps and left the direction of the proxy model
 * unrecorded. This module makes the instruction a first-class canonical record:
 *
 *   brand decision → ChannelInstruction (this module, pending)
 *                  → Mercenta's channel action (`./proxyProcessor`)
 *                  → outcome written back onto the SAME record
 *
 * RULES IMPLEMENTED HERE
 * ----------------------
 * - **Deterministic, idempotent ids** — the same decision for the same PO
 *   produces the same id, so a replay (a second click, a re-run) can never
 *   duplicate an instruction or re-issue a channel action.
 * - **Recorded verbatim** — the lines are stored exactly as issued. Nothing is
 *   re-derived from the PO later, so the instruction remains evidence of what
 *   the brand actually decided.
 * - **Honest provenance** — every record is `mode: 'simulation'` +
 *   `simulated: true` until a live channel connection exists.
 * - **Attributed and audited** — every state change writes a canonical audit
 *   entry and fires the canonical change signal, so every projection re-reads.
 *
 * This module is a LEAF (it imports only the store, the signal and `@/types`),
 * which is what lets `src/data/api.ts` write an instruction without an import
 * cycle back to the shipment seam.
 */
import type {
  ChannelInstruction,
  ChannelInstructionCarton,
  ChannelInstructionLine,
  ChannelInstructionOutcome,
  ChannelInstructionState,
  ChannelInstructionType,
  PurchaseOrder,
  PurchaseOrderLineItem,
} from '@/types';
import { demoAuditLog } from '@/data/demoStore';
import { notifyCanonicalStoreChange } from '@/lib/domain/canonicalSignal';

/** The only mode reachable in this environment. Positively identified. */
const SIMULATION = 'simulation' as const;

/**
 * ONE canonical instruction store, process-wide. Module-level so every surface
 * (the brand's PO list, the admin PO detail, validators) reads the same records.
 */
const channelInstructions: ChannelInstruction[] = [];

/** Test/validator helper. Never called by product code. */
export function resetChannelInstructions(): void {
  channelInstructions.length = 0;
}

/** All instructions, newest first. */
export function listChannelInstructions(filter?: {
  brandId?: string;
  purchaseOrderId?: string;
  type?: ChannelInstructionType;
  state?: ChannelInstructionState;
}): ChannelInstruction[] {
  return channelInstructions
    .filter((i) => !filter?.brandId || i.brandId === filter.brandId)
    .filter((i) => !filter?.purchaseOrderId || i.purchaseOrderId === filter.purchaseOrderId)
    .filter((i) => !filter?.type || i.type === filter.type)
    .filter((i) => !filter?.state || i.state === filter.state)
    .slice()
    .sort((a, b) => (a.issuedAt < b.issuedAt ? 1 : a.issuedAt > b.issuedAt ? -1 : 0));
}

export function getChannelInstruction(id: string): ChannelInstruction | undefined {
  return channelInstructions.find((i) => i.id === id);
}

/** The instruction for one PO and type, if it exists. */
export function getChannelInstructionForPO(
  purchaseOrderId: string,
  type: ChannelInstructionType
): ChannelInstruction | undefined {
  return channelInstructions.find((i) => i.purchaseOrderId === purchaseOrderId && i.type === type);
}

/**
 * Instructions waiting for Mercenta's channel action. The Mercenta-side
 * processor drains exactly this set.
 */
export function pendingChannelInstructions(): ChannelInstruction[] {
  return channelInstructions.filter((i) => i.state === 'pending_mercenta_action');
}

/** §P4 — the deterministic id: one acknowledgement instruction per PO (idempotent). */
export function channelInstructionId(type: ChannelInstructionType, purchaseOrderId: string): string {
  return `instr-${type === 'po_acknowledgement' ? 'ack' : 'pack'}-${purchaseOrderId}`;
}

/**
 * One canonical audit entry for every instruction state change.
 *
 * §P4 — this is ALSO the single canonical change signal for the store: every
 * state change calls `audit()` AFTER applying the change, so the projections
 * (brand PO status panel, admin PO detail, work views) re-read exactly once per
 * mutation. Writing the audit entry and announcing the change are therefore one
 * operation, which is what `scripts/validate-canonical-propagation.mjs` (S2)
 * requires of every canonical mutation.
 */
function audit(action: string, instruction: ChannelInstruction, reason: string, metadata?: Record<string, unknown>): void {
  demoAuditLog.push({
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
    actorId: instruction.issuedBy,
    action,
    entityType: 'channel_instruction',
    entityId: instruction.id,
    brandId: instruction.brandId,
    reason,
    metadata: { instructionType: instruction.type, state: instruction.state, poNumber: instruction.poNumber, ...metadata },
  });
  notifyCanonicalStoreChange();
}

/**
 * §P4 — DERIVE ONE INSTRUCTION LINE FROM THE CANONICAL PO.
 *
 * `PurchaseOrderLineItem.ackStatus` is OPTIONAL. A PO can carry a terminal status
 * (`accepted` / `ready_to_fulfil`) while its lines record no per-line
 * acknowledgement — seeded and legacy records do exactly that, and such a PO was
 * accepted AS A WHOLE. Treating an absent `ackStatus` as a rejection would
 * therefore turn a genuine acceptance into "every line rejected", and Mercenta
 * would (correctly, given that input) file no shipment. So the derivation is:
 *
 *   · a line that POSITIVELY says accepted / rejected / backordered     → that
 *   · a PO whose status is `rejected` (no per-line record)              → rejected
 *   · any other line of a live PO                                       → accepted
 *
 * This is declared ONCE and used by the acknowledgement writer, the brand
 * surface, the admin surface and the processor, so the four can never disagree.
 */
export function instructionLineFor(po: PurchaseOrder, line: PurchaseOrderLineItem): ChannelInstructionLine {
  const ackStatus: ChannelInstructionLine['ackStatus'] =
    line.ackStatus === 'accepted' || line.ackStatus === 'backordered' || line.ackStatus === 'rejected'
      ? line.ackStatus
      : po.status === 'rejected'
        ? 'rejected'
        : 'accepted';
  return {
    sku: line.sku,
    ackStatus,
    orderedQty: line.quantity,
    acknowledgedQty: ackStatus === 'rejected' ? 0 : (line.acknowledgedQty ?? line.quantity),
    ...(line.scheduledShipDate ? { scheduledShipDate: line.scheduledShipDate } : {}),
    ...(line.rejectionCode ? { rejectionCode: line.rejectionCode } : {}),
    unitPrice: line.acknowledgedUnitPrice ?? line.unitPrice,
  };
}

export interface IssueInstructionInput {
  type: ChannelInstructionType;
  brandId: string;
  purchaseOrderId: string;
  poNumber: string;
  issuedBy: string;
  lines: ChannelInstructionLine[];
  cartons?: ChannelInstructionCarton[];
  note?: string;
}

export interface IssueInstructionResult {
  ok: boolean;
  /** The instruction — the EXISTING one when it was already issued (idempotent). */
  instruction?: ChannelInstruction;
  /** TRUE only on the call that actually created the record. */
  created: boolean;
  error?: string;
}

/**
 * §P4 — write the brand's decision as an instruction to Mercenta.
 *
 * Idempotent: issuing the same instruction for the same PO again returns the
 * EXISTING record (`created: false`) instead of duplicating it. It never touches
 * the PO or the channel — writing the instruction is the brand's whole part; the
 * channel action is Mercenta's (`./proxyProcessor`).
 */
export function issueChannelInstruction(input: IssueInstructionInput): IssueInstructionResult {
  if (input.lines.length === 0) {
    return { ok: false, created: false, error: 'INSTRUCTION_EMPTY — an instruction needs at least one line.' };
  }
  const id = channelInstructionId(input.type, input.purchaseOrderId);
  const existing = getChannelInstruction(id);
  if (existing) return { ok: true, instruction: existing, created: false };

  const instruction: ChannelInstruction = {
    id,
    type: input.type,
    brandId: input.brandId,
    purchaseOrderId: input.purchaseOrderId,
    poNumber: input.poNumber,
    issuedBy: input.issuedBy,
    issuedAt: new Date().toISOString(),
    state: 'pending_mercenta_action',
    lines: input.lines.map((l) => ({ ...l })),
    ...(input.cartons ? { cartons: input.cartons.map((c) => ({ ...c })) } : {}),
    ...(input.note ? { note: input.note } : {}),
    mode: SIMULATION,
    simulated: true,
  };
  channelInstructions.push(instruction);
  audit(
    'channel_instruction_issued',
    instruction,
    `${input.issuedBy}: instruction "${input.type}" issued to Mercenta for PO ${input.poNumber} — ` +
      `${input.lines.length} line(s). No channel action performed by the brand; Mercenta performs it.`,
    { lineCount: input.lines.length }
  );
  return { ok: true, instruction, created: true };
}

/** Mercenta completed the channel action. */
export function markChannelInstructionActioned(
  id: string,
  outcome: ChannelInstructionOutcome
): ChannelInstruction | undefined {
  const instruction = getChannelInstruction(id);
  if (!instruction || instruction.state === 'actioned') return instruction;
  instruction.state = 'actioned';
  instruction.outcome = outcome;
  audit(
    'channel_instruction_actioned',
    instruction,
    `mercenta-proxy: instruction "${instruction.type}" for PO ${instruction.poNumber} actioned — ` +
      `channel acknowledgement ${outcome.channelAcknowledgement?.ok ? 'accepted' : 'not accepted'}` +
      `${outcome.channelAcknowledgement?.acknowledgementId ? ` (${outcome.channelAcknowledgement.acknowledgementId})` : ''}` +
      `${outcome.asn?.filed ? `, ASN ${outcome.asn.shipmentId} filed` : ', ASN not filed'}.`,
    { outcome }
  );
  return instruction;
}

/** Mercenta could NOT complete the channel action (the channel refused). */
export function markChannelInstructionRefused(
  id: string,
  reason: string,
  partialOutcome?: Omit<ChannelInstructionOutcome, 'actionedAt' | 'refusedReason'>
): ChannelInstruction | undefined {
  const instruction = getChannelInstruction(id);
  if (!instruction || instruction.state === 'refused') return instruction;
  instruction.state = 'refused';
  instruction.outcome = { actionedAt: new Date().toISOString(), ...(partialOutcome ?? {}), refusedReason: reason };
  audit(
    'channel_instruction_refused',
    instruction,
    `mercenta-proxy: instruction "${instruction.type}" for PO ${instruction.poNumber} could NOT be completed — ${reason}`,
    { reason }
  );
  return instruction;
}

/**
 * §P12 — RECORD the channel's routing instructions on an instruction Mercenta has
 * already actioned (`GetShipmentDetails`).
 *
 * The channel returns routing instructions — the ARN and the assigned carrier —
 * only AFTER carrier assignment, i.e. on a LATER read than the shipment request
 * that triggered them (programme §3: *"only returns a response after carrier
 * assignment, which occurs either on the same day as the scheduled pickup or one
 * day prior"*). This function is that later read's write path.
 *
 * It RECORDS ONLY WHAT THE CHANNEL RETURNED, and it is idempotent:
 *   · no actioned instruction, or no raised shipment request ⇒ nothing to record;
 *   · an object carrying neither an ARN nor an assignment time is not routing
 *     instructions at all, so the collect chain keeps reporting `awaiting_channel`;
 *   · re-reading identical instructions changes nothing and audits nothing twice.
 */
export function recordChannelRoutingInstructions(
  id: string,
  instructions: NonNullable<ChannelInstructionOutcome['routingInstructions']>,
  actorId: string
): ChannelInstruction | undefined {
  const instruction = getChannelInstruction(id);
  if (!instruction) return undefined;
  const outcome = instruction.outcome;
  if (!outcome?.routingRequest?.raised) return instruction;
  if (!instructions.arn && !instructions.assignedAt) return instruction;
  const existing = outcome.routingInstructions;
  if (
    existing &&
    existing.arn === instructions.arn &&
    existing.assignedAt === instructions.assignedAt
  ) {
    return instruction;
  }
  instruction.outcome = { ...outcome, routingInstructions: instructions };
  audit(
    'channel_routing_instructions_recorded',
    instruction,
    `${actorId}: channel routing instructions recorded for PO ${instruction.poNumber} — ` +
      `ARN ${instructions.arn ?? 'not returned'}${
        instructions.mode === 'mock' ? '. Simulated channel read; no live channel call was made.' : '.'
      }`,
    { instructions }
  );
  return instruction;
}

/**
 * §P4 — return a refused instruction to the queue so Mercenta can retry it.
 *
 * A refusal is never silently retried (an infinite retry loop would hide a real
 * problem): an admin asks for the retry, so the retry is an attributed, audited
 * ACTION with a stated reason.
 */
export function requeueChannelInstruction(
  id: string,
  actorId: string,
  reason: string
): ChannelInstruction | undefined {
  const instruction = getChannelInstruction(id);
  if (!instruction) return undefined;
  if (instruction.state === 'pending_mercenta_action') return instruction;
  const previous = instruction.state;
  instruction.state = 'pending_mercenta_action';
  instruction.outcome = undefined;
  audit(
    'channel_instruction_requeued',
    instruction,
    `${actorId}: instruction "${instruction.type}" for PO ${instruction.poNumber} requeued for retry (was ${previous}) — ${reason}`,
    { previousState: previous, reason }
  );
  return instruction;
}
