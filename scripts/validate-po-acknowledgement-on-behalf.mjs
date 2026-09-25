/**
 * §P13 / S4 — THE ON-BEHALF REJECTION DRAFT + THE BRAND'S APPROVAL.
 *
 * S1 proved the window RULE; S2 built the WRITER (`autoRejectPurchaseOrderOnBehalf`)
 * and left it with no producer; S3 made the work layer consume the rule's owner.
 * S4 gives the writer its PRODUCER: Mercenta drafts the channel-REQUIRED rejection
 * at the final notification stage, the brand approves that exact draft, and only
 * then does the writer perform the channel action.
 *
 * Proves, against the REAL modules (no mocks):
 *  1. ONE OWNER: the draft is DERIVED by the window owner (`poOnBehalfRejectionDraft`)
 *     and consumed by the domain layer and both PO surfaces — the reason code, the
 *     rule text, the instants and the availability all come from the owner, and the
 *     draft's CONTENT is never stored as a second copy.
 *  2. The draft is offered EXACTLY when the owner says the rejection is Mercenta's
 *     to perform, and FAILS CLOSED everywhere else (not yet due, past the limit,
 *     unreadable order date, already decided, no obligation).
 *  3. The draft's identity is CONTENT-ADDRESSED: a changed line or window produces a
 *     different draft, so a stale approval can be refused.
 *  4. PRODUCTION is attributed (Mercenta's declared automatic identity, for the
 *     brand's own PO) and AUDITED once — idempotent, and it performs NOTHING.
 *  5. The APPROVAL is the only path that executes the rejection, is bound to the
 *     draft it was shown, is tenant-checked, is attributed to the acting human and
 *     idempotent — and every refusal leaves the purchase order byte-for-byte
 *     unchanged.
 *  6. THE SEED makes the capability genuinely reachable in the running product: the
 *     demo contains a purchase order in the on-behalf state, still inside the
 *     24-hour limit.
 *  7. Zero network calls: `fetch` is sabotaged BEFORE any module loads.
 */
import { createServer } from 'vite';
import { readFileSync } from 'node:fs';

/* §7 — no live call is possible anywhere in this run. */
let fetchCalls = 0;
globalThis.fetch = () => {
  fetchCalls++;
  throw new Error('NETWORK_CALL_ATTEMPTED');
};

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });

let failures = 0;
function test(name, cond, extra) {
  console.log(`${cond ? '✓' : '✗'} ${name}${cond || !extra ? '' : ` — ${extra}`}`);
  if (!cond) failures++;
}

const win = await server.ssrLoadModule('/src/lib/commerce/poAcknowledgementWindow.ts');
const api = await server.ssrLoadModule('/src/data/api.ts');
const cfg = await server.ssrLoadModule('/src/config/purchaseOrders.ts');
const store = await server.ssrLoadModule('/src/data/demoStore.ts');
const instructions = await server.ssrLoadModule('/src/lib/commerce/channelInstructions.ts');

const NOW = new Date();
const HOUR = 3_600_000;

/** The CANONICAL seed rows, captured before any fixture is pushed. */
const SEED_IDS = new Set(store.demoPurchaseOrders.map((p) => p.id));

/** Fixtures are pushed through the REAL store — never a hand-built object. */
function pushPo(over) {
  const po = {
    id: over.id,
    brandId: over.brandId ?? 'brand-tapatio',
    poNumber: over.poNumber,
    status: over.status ?? 'received',
    poValue: 1000,
    commissionRate: 0.2,
    commissionAmount: 200,
    orderDate: over.orderDate,
    ...(over.acknowledgedAt ? { acknowledgedAt: over.acknowledgedAt } : {}),
    lineItems: [
      {
        sku: 'FIX-001',
        productName: 'Fixture line 001',
        quantity: 10,
        unitPrice: 10,
        commodityCode: '0000000000',
      },
    ],
  };
  store.demoPurchaseOrders.push(po);
  return po;
}

const hoursBack = (h) => new Date(NOW.getTime() - h * HOUR).toISOString();
const draftAudits = (id) =>
  store.demoAuditLog.filter(
    (a) => a.action === 'purchase_order_on_behalf_draft_created' && a.entityId === id
  );
const approveAudits = (id) =>
  store.demoAuditLog.filter(
    (a) => a.action === 'purchase_order_on_behalf_rejection_approved' && a.entityId === id
  );
const rejectAudits = (id) =>
  store.demoAuditLog.filter(
    (a) => a.action === 'purchase_order_auto_rejected' && a.entityId === id
  );
const instructionCount = (id) =>
  instructions.listChannelInstructions({ purchaseOrderId: id }).length;

/* ── 1. ONE OWNER for the draft, its reason code, its rule text and its instants ── */
const API_SRC = readFileSync('src/data/api.ts', 'utf8');
const WIN_SRC = readFileSync('src/lib/commerce/poAcknowledgementWindow.ts', 'utf8');
const BRAND_SRC = readFileSync('src/components/brand/BrandPurchaseOrders.tsx', 'utf8');
const ADMIN_SRC = readFileSync('src/components/admin/AdminPurchaseOrderDetail.tsx', 'utf8');
const TYPES_SRC = readFileSync('src/types.ts', 'utf8');
const DRAFT_INTERFACE =
  TYPES_SRC.match(/export interface PoOnBehalfDraftRecord[\s\S]*?\n\}/)?.[0] ?? '';
const DRAFT_PURE_REGION = WIN_SRC.slice(
  WIN_SRC.indexOf('export function poOnBehalfRejectionDraft'),
  WIN_SRC.indexOf('export function sortPosByUrgency')
);
test(
  'the domain layer consumes the owner’s draft (no second derivation)',
  /poOnBehalfRejectionDraft/.test(API_SRC) && /poOnBehalfRejectionDraft\(po, now\)/.test(API_SRC)
);
test(
  'the domain layer asks the owner whether the rejection is Mercenta’s to perform',
  /poNeedsAutoRejection/.test(API_SRC)
);
test(
  'both PO surfaces render the owner’s draft, never a hand-built one',
  /poOnBehalfRejectionDraft/.test(BRAND_SRC) &&
    /poOnBehalfRejectionDraft/.test(ADMIN_SRC) &&
    !/PO_ACK_AUTO_REJECT_REASON/.test(BRAND_SRC) &&
    !/PO_ACK_AUTO_REJECT_REASON/.test(ADMIN_SRC)
);
test(
  'the draft’s CONTENT is not stored a second time (address + attribution only)',
  DRAFT_INTERFACE.length > 0 && !/\blines\b/.test(DRAFT_INTERFACE) && !/quantity/.test(DRAFT_INTERFACE)
);
test(
  'the draft derivation is PURE — no clock, no randomness, no store, no network, no React',
  DRAFT_PURE_REGION.length > 0 &&
    !/Date\.now\(|Math\.random\(|fetch\(|demoStore|react/.test(DRAFT_PURE_REGION)
);
test(
  'the reason code and rule text stay config-owned (never re-declared in the owner)',
  !/export const PO_ACK_AUTO_REJECT_REASON/.test(WIN_SRC) &&
    !/export const PO_ACK_WINDOW_RULE_TEXT/.test(WIN_SRC)
);

/* ── 2. WHEN the draft exists — the owner’s own predicate, fail-closed ──────────── */
const midWindow = pushPo({ id: 'po-s4-mid', poNumber: 'PO-S4-MID', orderDate: hoursBack(12) });
const midDraft = win.poOnBehalfRejectionDraft(midWindow, NOW);
test(
  'no draft is offered in the middle of the window, and the refusal names the on-behalf instant',
  midDraft.available === false &&
    /not due yet/.test(midDraft.refusal ?? '') &&
    (midDraft.refusal ?? '').includes(midDraft.autoRejectAt),
  midDraft.refusal
);

const closing = pushPo({ id: 'po-s4-closing', poNumber: 'PO-S4-CLOSING', orderDate: hoursBack(22) });
const closingDraft = win.poOnBehalfRejectionDraft(closing, NOW);
test(
  'the draft IS offered exactly at the on-behalf instant (T−2h)',
  closingDraft.available === true && closingDraft.refusal === null
);
test(
  'the draft names the owner’s own instants (the limit and the on-behalf stage)',
  closingDraft.acknowledgementDeadline === win.poAcknowledgementWindow(closing, NOW).deadline &&
    closingDraft.autoRejectAt === win.poAcknowledgementWindow(closing, NOW).autoRejectAt
);
test(
  'inside the closing window the brand may still decide for itself',
  closingDraft.brandMayStillDecide === true &&
    win.poAcknowledgementWindow(closing, NOW).mustReject === false
);

const pastLimit = pushPo({ id: 'po-s4-past', poNumber: 'PO-S4-PAST', orderDate: hoursBack(25) });
const pastDraft = win.poOnBehalfRejectionDraft(pastLimit, NOW);
test(
  'past the 24-hour limit the draft is still the action that is left',
  pastDraft.available === true && pastDraft.brandMayStillDecide === false
);

const unreadable = pushPo({
  id: 'po-s4-unreadable',
  poNumber: 'PO-S4-UNREADABLE',
  orderDate: 'not-a-date',
});
const unreadableDraft = win.poOnBehalfRejectionDraft(unreadable, NOW);
test(
  'an unreadable order date FAILS CLOSED — no draft is offered',
  unreadableDraft.available === false && /fail-closed/.test(unreadableDraft.refusal ?? '')
);

const decided = pushPo({
  id: 'po-s4-decided',
  poNumber: 'PO-S4-DECIDED',
  orderDate: hoursBack(23),
  acknowledgedAt: NOW.toISOString(),
});
test(
  'a purchase order that already carries a decision drafts nothing',
  win.poOnBehalfRejectionDraft(decided, NOW).available === false
);

const noObligation = pushPo({
  id: 'po-s4-paststatus',
  poNumber: 'PO-S4-PASTSTATUS',
  status: 'accepted',
  orderDate: hoursBack(23),
});
test(
  'a status past the acknowledgement decision drafts nothing',
  win.poOnBehalfRejectionDraft(noObligation, NOW).available === false
);

/* ── 3. The draft’s content IS the channel’s documented rejection ───────────────── */
test(
  'every drafted line is REJECTED with the channel’s own documented reason',
  closingDraft.lines.length === closing.lineItems.length &&
    closingDraft.lines.every(
      (l) => l.ackStatus === 'rejected' && l.rejectionCode === cfg.PO_ACK_AUTO_REJECT_REASON
    )
);
test(
  'the draft’s reason code and rule text ARE the config owner’s',
  closingDraft.rejectionCode === cfg.PO_ACK_AUTO_REJECT_REASON &&
    closingDraft.ruleText === cfg.PO_ACK_WINDOW_RULE_TEXT
);
test(
  'the drafted quantity is the ORDERED quantity (nothing is re-quantified)',
  closingDraft.lines.every((l, i) => l.quantity === closing.lineItems[i].quantity)
);

const changed = pushPo({ id: 'po-s4-changed', poNumber: 'PO-S4-CHANGED', orderDate: hoursBack(23) });
const changedBefore = win.poOnBehalfRejectionDraft(changed, NOW);
changed.lineItems[0].quantity += 5;
const changedAfter = win.poOnBehalfRejectionDraft(changed, NOW);
test(
  'the draft is CONTENT-ADDRESSED — a changed line yields a different draft',
  changedBefore.draftId !== changedAfter.draftId && changedBefore.digest !== changedAfter.digest
);


/* ── 4. PRODUCTION — attributed, audited, idempotent, performs nothing ─────────── */
const produced = pushPo({
  id: 'po-s4-produced',
  poNumber: 'PO-S4-PRODUCED',
  orderDate: hoursBack(23),
});
const auditBefore = store.demoAuditLog.length;
const first = api.draftOnBehalfRejection(produced.id, NOW);
test(
  'Mercenta PRODUCES the draft (the S2 writer now has its producer)',
  first.ok === true && first.created === true && first.draft.available === true,
  JSON.stringify({ ok: first.ok, created: first.created })
);
test(
  'the draft is recorded with its content address and its PRODUCER',
  produced.onBehalfDraft?.id === first.draft.draftId &&
    produced.onBehalfDraft?.digest === first.draft.digest &&
    produced.onBehalfDraft?.createdBy === cfg.PO_ACK_SYSTEM_ACTOR_ID
);
const firstAudit = draftAudits(produced.id);
test(
  'ONE attributed audit entry records the production, for the brand whose PO it is',
  firstAudit.length === 1 &&
    firstAudit[0].actorId === cfg.PO_ACK_SYSTEM_ACTOR_ID &&
    firstAudit[0].brandId === produced.brandId &&
    firstAudit[0].metadata?.draftId === first.draft.draftId,
  JSON.stringify(firstAudit[0]?.metadata ?? null)
);
test(
  'drafting performs NOTHING — the purchase order is untouched',
  !produced.acknowledgedAt &&
    produced.status === 'received' &&
    produced.lineItems.every((l) => !l.ackHistory && !l.ackStatus)
);

const second = api.draftOnBehalfRejection(produced.id, NOW);
test(
  'production is IDEMPOTENT — the same content never records a second draft',
  second.ok === true && second.created === false && draftAudits(produced.id).length === 1
);
test(
  'idempotent production adds no audit entry at all',
  store.demoAuditLog.length === auditBefore + 1,
  String(store.demoAuditLog.length - auditBefore)
);

const refusedDraft = api.draftOnBehalfRejection(midWindow.id, NOW);
test(
  'a draft that is not due is REFUSED and writes nothing',
  refusedDraft.ok === false &&
    /not due yet/.test(refusedDraft.error ?? '') &&
    !midWindow.onBehalfDraft &&
    draftAudits(midWindow.id).length === 0,
  refusedDraft.error
);
test(
  'an unknown purchase order is refused by name',
  api.draftOnBehalfRejection('po-does-not-exist', NOW).ok === false
);

/* ── 5. The APPROVAL — bound to the draft, tenant-checked, the only executor ────── */
const undrafted = pushPo({
  id: 'po-s4-undrafted',
  poNumber: 'PO-S4-UNDRAFTED',
  orderDate: hoursBack(23),
});
const noDraftApproval = api.approveOnBehalfRejection(undrafted.id, {}, NOW);
test(
  'an approval without a produced draft is REFUSED (the brand approves what it was shown)',
  noDraftApproval.ok === false && /no on-behalf draft is on record/.test(noDraftApproval.error ?? ''),
  noDraftApproval.error
);
test(
  'the refused approval performed NOTHING',
  !undrafted.acknowledgedAt &&
    undrafted.status === 'received' &&
    approveAudits(undrafted.id).length === 0
);

const early = pushPo({ id: 'po-s4-early', poNumber: 'PO-S4-EARLY', orderDate: hoursBack(6) });
api.draftOnBehalfRejection(early.id, NOW);
const earlyApproval = api.approveOnBehalfRejection(early.id, {}, NOW);
test(
  'an approval before the on-behalf instant is REFUSED and writes nothing',
  earlyApproval.ok === false && !early.acknowledgedAt && approveAudits(early.id).length === 0,
  earlyApproval.error
);

const tenantPo = pushPo({ id: 'po-s4-tenant', poNumber: 'PO-S4-TENANT', orderDate: hoursBack(23) });
api.draftOnBehalfRejection(tenantPo.id, NOW);
const crossTenant = api.approveOnBehalfRejection(tenantPo.id, { actorBrandId: 'brand-astonish' }, NOW);
test(
  'a CROSS-TENANT approval is refused and writes nothing',
  crossTenant.ok === false &&
    /another tenant/.test(crossTenant.error ?? '') &&
    !tenantPo.acknowledgedAt &&
    approveAudits(tenantPo.id).length === 0,
  crossTenant.error
);

const wrongDraft = api.approveOnBehalfRejection(tenantPo.id, { draftId: 'draft-not-this-one' }, NOW);
test(
  'an approval aimed at a DIFFERENT draft is refused and writes nothing',
  wrongDraft.ok === false &&
    /may only approve the draft it was shown/.test(wrongDraft.error ?? '') &&
    !tenantPo.acknowledgedAt,
  wrongDraft.error
);

const stale = pushPo({ id: 'po-s4-stale', poNumber: 'PO-S4-STALE', orderDate: hoursBack(23) });
api.draftOnBehalfRejection(stale.id, NOW);
stale.lineItems[0].quantity += 5;
const staleApproval = api.approveOnBehalfRejection(stale.id, {}, NOW);
test(
  'a draft that no longer matches the purchase order CANNOT be approved',
  staleApproval.ok === false && /no longer matches/.test(staleApproval.error ?? ''),
  staleApproval.error
);
test(
  'the stale approval wrote NOTHING',
  !stale.acknowledgedAt &&
    stale.lineItems.every((l) => !l.ackHistory && l.ackStatus !== 'rejected') &&
    rejectAudits(stale.id).length === 0
);


/* ── 6. THE HAPPY PATH — the brand approves, Mercenta performs ─────────────────── */
const approved = pushPo({
  id: 'po-s4-approved',
  poNumber: 'PO-S4-APPROVED',
  brandId: 'brand-tapatio',
  orderDate: hoursBack(22.5),
});
api.draftOnBehalfRejection(approved.id, NOW);
const approvedDraftId = approved.onBehalfDraft.id;
const historiesBefore = approved.lineItems.map((l) => (l.ackHistory ?? []).length);
const instructionsBefore = instructionCount(approved.id);
const approval = api.approveOnBehalfRejection(
  approved.id,
  { actorBrandId: 'brand-tapatio', actorLabel: 'Tapatío (brand approval)' },
  NOW
);
test(
  'the brand’s approval EXECUTES the channel rejection through the S2 writer',
  approval.ok === true && approval.timeliness === 'on_behalf',
  JSON.stringify(approval)
);
test(
  'every line ends rejected with the channel’s own documented reason',
  approved.lineItems.every(
    (l) =>
      l.ackStatus === 'rejected' &&
      l.acknowledgedQty === 0 &&
      l.rejectionCode === cfg.PO_ACK_AUTO_REJECT_REASON
  )
);
test(
  'each event is appended with `on_behalf` timeliness (history is never overwritten)',
  approved.lineItems.every(
    (l, i) =>
      (l.ackHistory ?? []).length === historiesBefore[i] + 1 &&
      l.ackHistory.at(-1).timeliness === 'on_behalf'
  )
);
test(
  'the purchase order ends acknowledged and rejected',
  Boolean(approved.acknowledgedAt) && approved.status === 'rejected'
);
test(
  'the decision is issued as an INSTRUCTION to Mercenta, attributed to the writer’s identity',
  approval.instructionId &&
    instructionCount(approved.id) === instructionsBefore + 1 &&
    instructions
      .listChannelInstructions({ purchaseOrderId: approved.id })
      .some((i) => i.id === approval.instructionId && i.issuedBy === cfg.PO_ACK_SYSTEM_ACTOR_ID),
  approval.instructionId
);
test(
  'the approval is ATTRIBUTED to the acting human on the record',
  approved.onBehalfDraft.approvedBy === 'brand-tapatio' &&
    Boolean(approved.onBehalfDraft.approvedAt) &&
    !approved.onBehalfDraft.approvedByAdmin
);
const approvalAudit = approveAudits(approved.id);
test(
  'ONE attributed approval audit names the actor, the draft and the instruction',
  approvalAudit.length === 1 &&
    approvalAudit[0].actorId === 'brand-tapatio' &&
    approvalAudit[0].metadata?.draftId === approvedDraftId &&
    approvalAudit[0].metadata?.digest === approved.onBehalfDraft.digest &&
    approvalAudit[0].metadata?.instructionId === approval.instructionId,
  JSON.stringify(approvalAudit[0]?.metadata ?? null)
);
test(
  'the execution stays attributed separately to Mercenta’s automatic identity',
  rejectAudits(approved.id).length === 1 &&
    rejectAudits(approved.id)[0].actorId === cfg.PO_ACK_SYSTEM_ACTOR_ID
);

const again = api.approveOnBehalfRejection(approved.id, { actorBrandId: 'brand-tapatio' }, NOW);
test(
  'approval is IDEMPOTENT — a decided purchase order is never re-decided',
  again.ok === true && again.alreadyAcknowledged === true
);
test(
  'the second approval wrote NOTHING (one instruction, one rejection, one approval audit)',
  instructionCount(approved.id) === instructionsBefore + 1 &&
    rejectAudits(approved.id).length === 1 &&
    approveAudits(approved.id).length === 1
);

/* ── 7. MERCENTA'S ATTRIBUTED OVERRIDE (the admin path) ────────────────────────── */
const override = pushPo({ id: 'po-s4-override', poNumber: 'PO-S4-OVERRIDE', orderDate: hoursBack(23) });
api.draftOnBehalfRejection(override.id, NOW);
const overrideResult = api.approveOnBehalfRejection(
  override.id,
  { actorStaffId: 'staff-001', actorLabel: 'Mercenta Ops' },
  NOW
);
test(
  'a Mercenta staff approval is recorded as an ATTRIBUTED override',
  overrideResult.ok === true &&
    override.onBehalfDraft.approvedBy === 'staff-001' &&
    override.onBehalfDraft.approvedByAdmin === true &&
    approveAudits(override.id)[0].metadata?.approvedByAdmin === true,
  JSON.stringify(overrideResult)
);

/* ── 8. THE CLOCK SEAM — the same PO, judged at two instants ───────────────────── */
const seam = pushPo({ id: 'po-s4-seam', poNumber: 'PO-S4-SEAM', orderDate: hoursBack(23) });
test(
  'the SAME purchase order drafts nothing earlier and a draft later (instant seam)',
  win.poOnBehalfRejectionDraft(seam, new Date(NOW.getTime() - 10 * HOUR)).available === false &&
    win.poOnBehalfRejectionDraft(seam, NOW).available === true
);

/* ── 9. THE SEED makes the capability reachable in the running product ────────── */
const seededOnBehalf = store.demoPurchaseOrders.filter(
  (p) => SEED_IDS.has(p.id) && win.poOnBehalfRejectionDraft(p, NOW).available
);
test(
  'the SEED really contains a purchase order in the on-behalf state (the demo can exercise it)',
  seededOnBehalf.length > 0,
  seededOnBehalf.map((p) => p.poNumber).join(', ')
);
test(
  'the seeded on-behalf PO is still INSIDE the 24-hour limit, so the brand may also decide for itself',
  seededOnBehalf.every((p) => win.poOnBehalfRejectionDraft(p, NOW).brandMayStillDecide === true)
);
test(
  'the seeded on-behalf PO derives its draft from the owner (reason + instants present)',
  seededOnBehalf.every((p) => {
    const d = win.poOnBehalfRejectionDraft(p, NOW);
    return (
      d.rejectionCode === cfg.PO_ACK_AUTO_REJECT_REASON &&
      Boolean(d.acknowledgementDeadline) &&
      Boolean(d.autoRejectAt)
    );
  })
);

/* ── 10. Zero network calls, and the derivation is deterministic ──────────────── */
test('every assertion above ran with fetch sabotaged (zero network calls)', fetchCalls === 0, String(fetchCalls));
const once = JSON.stringify(win.poOnBehalfRejectionDraft(closing, NOW));
test(
  'the draft derivation is deterministic',
  once === JSON.stringify(win.poOnBehalfRejectionDraft(closing, NOW))
);

await server.close();
console.log(
  failures === 0
    ? '\nPO_ACK_ON_BEHALF_VALIDATION_PASS — every assertion above is green (0 network calls).'
    : `\nPO_ACK_ON_BEHALF_VALIDATION_FAIL — ${failures} assertion(s) failed.`
);
process.exit(failures === 0 ? 0 : 1);

