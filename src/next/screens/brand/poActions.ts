import type { QueryClient } from '@tanstack/react-query';
import {
  acknowledgePurchaseOrder,
  approveOnBehalfRejection,
  authoriseOnBehalfDecisions,
  withdrawOnBehalfAuthorisation,
  type PoLineAckSubmission,
} from '@/data/api';
import { instructionLineFor, issueChannelInstruction } from '@/lib/commerce/channelInstructions';
import { processPendingChannelInstructions } from '@/lib/commerce/proxyProcessor';
import type { PurchaseOrder } from '@/types';

async function invalidatePoSideEffects(qc: QueryClient): Promise<void> {
  await Promise.all([
    qc.invalidateQueries({ queryKey: ['purchase_orders'] }),
    qc.invalidateQueries({ queryKey: ['purchase-orders'] }),
    qc.invalidateQueries({ queryKey: ['shipments'] }),
    qc.invalidateQueries({ queryKey: ['deductions'] }),
  ]);
}

export async function runPoAcknowledgement(
  qc: QueryClient,
  poId: string,
  lineAcks: PoLineAckSubmission[]
): Promise<{ ok: boolean; notice: string }> {
  const result = acknowledgePurchaseOrder(poId, lineAcks);
  if (!result.ok) {
    return { ok: false, notice: result.error ?? 'Acknowledgment failed.' };
  }
  const processed = await processPendingChannelInstructions();
  const outcome = processed.map((i) => i.outcome).find((o): o is NonNullable<typeof o> => !!o);
  const notice = [
    'Decision issued to Mercenta.',
    outcome?.channelAcknowledgement?.ok
      ? `Mercenta filed the acknowledgement with the retail channel (${outcome.channelAcknowledgement.acknowledgementId}, ${outcome.channelAcknowledgement.status})${outcome.channelAcknowledgement.mode === 'mock' ? ' — simulated, no live call' : ''}.`
      : '',
    outcome?.routingRequest?.raised
      ? `Mercenta raised the routing request (${outcome.routingRequest.reference}).`
      : '',
    outcome?.asn?.filed ? `Mercenta filed the ASN (${outcome.asn.reference}).` : outcome?.asn?.note ?? '',
    outcome?.asn?.deductionId
      ? `Shortfall logged as deduction ${outcome.asn.deductionId} — Mercenta will dispute or accept it.`
      : '',
    outcome?.refusedReason
      ? `Mercenta could not complete the channel action: ${outcome.refusedReason}`
      : '',
    ...(result.warnings ?? []),
  ]
    .filter(Boolean)
    .join(' · ');

  await invalidatePoSideEffects(qc);
  return { ok: true, notice };
}

export async function runPackingCorrection(
  qc: QueryClient,
  po: PurchaseOrder,
  tenantId: string | null,
  cartons: Record<string, number>,
  note: string
): Promise<{ ok: boolean; notice: string }> {
  const issued = issueChannelInstruction({
    type: 'packing_correction',
    brandId: po.brandId,
    purchaseOrderId: po.id,
    poNumber: po.poNumber,
    issuedBy: tenantId ?? po.brandId,
    lines: po.lineItems.map((l) => instructionLineFor(po, l)),
    cartons: Object.entries(cartons).map(([sku, quantity]) => ({ sku, quantity })),
    ...(note.trim() ? { note: note.trim() } : {}),
  });
  if (!issued.ok) {
    return { ok: false, notice: issued.error ?? 'Packing correction failed.' };
  }
  const alreadyExisted = !issued.created;
  const processed = alreadyExisted ? [] : await processPendingChannelInstructions();
  const outcome = processed.map((i) => i.outcome).find((o): o is NonNullable<typeof o> => !!o);
  const notice = [
    alreadyExisted
      ? 'A packing correction is already recorded for this PO.'
      : 'Packing correction sent to Mercenta.',
    outcome?.asn?.filed ? `Mercenta filed the ASN (${outcome.asn.reference}).` : outcome?.asn?.note ?? '',
    outcome?.asn?.deductionId
      ? `Shortfall logged as deduction ${outcome.asn.deductionId} — Mercenta will dispute or accept it.`
      : '',
    outcome?.refusedReason
      ? `Mercenta could not complete the channel action: ${outcome.refusedReason}`
      : '',
  ]
    .filter(Boolean)
    .join(' · ');

  await invalidatePoSideEffects(qc);
  return { ok: true, notice };
}

export async function runApproveOnBehalf(
  qc: QueryClient,
  po: PurchaseOrder,
  draftId: string,
  viewingBrandId: string | null,
  brandLabel: string
): Promise<{ ok: boolean; notice: string }> {
  const result = approveOnBehalfRejection(po.id, {
    actorBrandId: viewingBrandId ?? undefined,
    actorLabel: `${brandLabel} (brand approval)`,
    draftId,
  });
  if (!result.ok) {
    return { ok: false, notice: result.error ?? 'Approval failed.' };
  }
  const processed = await processPendingChannelInstructions();
  const outcome = processed.map((i) => i.outcome).find((o): o is NonNullable<typeof o> => !!o);
  const notice = [
    `Approved — Mercenta performed the retail channel's required rejection on your behalf (draft ${result.draftId}).`,
    outcome?.channelAcknowledgement?.ok
      ? `Channel acknowledgement ${outcome.channelAcknowledgement.acknowledgementId} (${outcome.channelAcknowledgement.status})${outcome.channelAcknowledgement.mode === 'mock' ? ' — simulated, no live call' : ''}.`
      : '',
    outcome?.refusedReason
      ? `Mercenta could not complete the channel action: ${outcome.refusedReason}`
      : '',
  ]
    .filter(Boolean)
    .join(' · ');

  await invalidatePoSideEffects(qc);
  return { ok: true, notice };
}

export async function runAuthoriseOnBehalf(
  qc: QueryClient,
  poId: string,
  actor: string,
  note: string
): Promise<{ ok: boolean; notice: string }> {
  const result = authoriseOnBehalfDecisions(poId, { recordedBy: actor, note });
  await invalidatePoSideEffects(qc);
  return {
    ok: result.ok,
    notice: result.ok
      ? result.written
        ? 'Recorded: Mercenta may decide this order for you. It will be attributed to you.'
        : 'This order already carries your authorisation.'
      : result.error ?? 'Refused.',
  };
}

export async function runWithdrawOnBehalf(
  qc: QueryClient,
  poId: string,
  actor: string
): Promise<{ ok: boolean; notice: string }> {
  const result = withdrawOnBehalfAuthorisation(poId, {
    withdrawnBy: actor,
    reason: 'The brand withdrew its authorisation from its own order screen.',
  });
  await invalidatePoSideEffects(qc);
  return {
    ok: result.ok,
    notice: result.ok
      ? 'Authorisation withdrawn. Mercenta will not decide this order for you.'
      : result.error ?? 'Refused.',
  };
}
