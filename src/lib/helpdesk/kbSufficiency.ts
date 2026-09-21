/**
 * §Canonical model §15 / brief §6 — KNOWLEDGE BASE SUFFICIENCY EVALUATOR.
 *
 * The canonical case model is:
 *
 *   BRAND opens a Mercenta case
 *     → Mercenta checks the Knowledge Base · the verified platform data ·
 *       the relevant domain object
 *     → sufficiently supported ⇒ INTERNAL RESOLUTION
 *     → otherwise              ⇒ FOUNDER / SUPER ADMIN REVIEW
 *     → only then, if it is genuinely a retail-channel matter, escalation.
 *
 * This module is the "Mercenta checks" step. It exists so no caller has to
 * inline its own guess about whether a case is answerable, and so that guess
 * is made the same way everywhere.
 *
 * Properties it is required to have (brief §5/§6/§23):
 *   · DETERMINISTIC — a pure function of the case + the canonical stores.
 *     No clock, no randomness, no network, no mutation.
 *   · TENANT-SAFE — a related object must belong to the case's OWN brand.
 *     A reference that resolves into ANOTHER tenant fails closed and says so;
 *     it never resolves, and the other tenant's data is never returned.
 *   · FAIL-CLOSED — anything unknown (unmapped category, an article id that
 *     does not exist, an absent or unresolvable object reference) resolves to
 *     `requires_founder_review`. It can never fall through to "internally
 *     resolvable".
 *   · HONEST — it never invents a retail-channel fact. An `amazon_related`
 *     case is never internally resolvable, however good the Knowledge Base is.
 *   · READ-ONLY — it writes nothing and therefore records no audit entry;
 *     every case STATE transition stays audited by `ticketStore`.
 */
import type { CaseCategory, Ticket } from '@/types';
import { getKnowledgeArticle } from '@/data/knowledgeBase';
import {
  demoPurchaseOrders,
  demoShipments,
  demoComplianceDocs,
  demoDeductions,
  demoCommercePayments,
} from '@/data/demoStore';

/** The three-valued verdict. `not_applicable` is its own state, not a refusal. */
export type CaseSufficiencyVerdict =
  | 'internally_resolvable'
  | 'requires_founder_review'
  | 'not_applicable';

/** The domain objects a case can be anchored to. */
export type CaseContextKind =
  | 'purchase_order'
  | 'shipment'
  | 'deduction'
  | 'payment'
  | 'compliance_document';

export interface CaseContextLookup {
  kind: CaseContextKind;
  /** The reference the case carried (PO number / record id). */
  reference: string;
  /** True only when the record was found AND it belongs to the case's brand. */
  resolved: boolean;
  /** The owning tenant, present only when the record resolved. */
  brandId?: string;
  /**
   * True when the record exists but belongs to a DIFFERENT tenant. This is a
   * refusal, never a resolution — and it is surfaced explicitly so the
   * reviewer can see a mis-filed reference.
   */
  crossTenant: boolean;
  /** Short human explanation, safe to show an operator. */
  detail: string;
}

export interface CaseSufficiency {
  verdict: CaseSufficiencyVerdict;
  /** The Knowledge Base article ids that genuinely exist in the store. */
  articleIds: readonly string[];
  /** The relevant-data lookup result (empty when the category needs none). */
  context: readonly CaseContextLookup[];
  /** Why the verdict is what it is. Never empty for a real verdict. */
  reasons: readonly string[];
}

/**
 * Case category → Knowledge Base articles, resolved against the REAL article
 * store. `amazon_related` deliberately maps to nothing: a case about the retail
 * channel cannot be answered from Mercenta's own guidance, so it must reach a
 * human — the evaluator must never invent a channel answer.
 */
export const CASE_CATEGORY_KB_ARTICLES: Record<CaseCategory, readonly string[]> = {
  po_question: ['kb-purchase-orders'],
  shipment_issue: ['kb-shipments'],
  delivery_issue: ['kb-shipments'],
  deduction: ['kb-purchase-orders', 'kb-shipments'],
  payment_issue: ['kb-guidance'],
  compliance_question: ['kb-compliance'],
  catalogue_issue: ['kb-catalog'],
  amazon_related: [],
  general: ['kb-welcome', 'kb-dashboard'],
};

/**
 * The domain object a category is anchored to. Where one is declared it is
 * REQUIRED: a case that claims to be about PO-9045 is only internally
 * answerable if PO-9045 genuinely exists in that brand's own data.
 */
export const CASE_CATEGORY_CONTEXT: Partial<Record<CaseCategory, CaseContextKind>> = {
  po_question: 'purchase_order',
  shipment_issue: 'shipment',
  delivery_issue: 'shipment',
  deduction: 'deduction',
  payment_issue: 'payment',
  compliance_question: 'compliance_document',
};

const CONTEXT_LABELS: Record<CaseContextKind, string> = {
  purchase_order: 'purchase order',
  shipment: 'shipment',
  deduction: 'deduction',
  payment: 'payment',
  compliance_document: 'compliance document',
};

export function caseContextLabel(kind: CaseContextKind): string {
  return CONTEXT_LABELS[kind];
}

/** Operator/brand-facing verdict words (never colour-only). */
export const CASE_SUFFICIENCY_LABELS: Record<CaseSufficiencyVerdict, string> = {
  internally_resolvable: 'Sufficiently supported — Mercenta can resolve this internally',
  requires_founder_review: 'Not fully supported — Founder / Super Admin review required',
  not_applicable: 'Already past Mercenta review — sufficiency check not applicable',
};

/** A minimal tenant-scoped view of a store row (never the whole row). */
interface TenantScopedRow {
  id?: string;
  brandId?: string;
}

/** The reference a category expects, read off the ticket. */
function contextRefFor(kind: CaseContextKind, ticket: Ticket): string | undefined {
  switch (kind) {
    case 'purchase_order':
      return ticket.relatedPoNumber;
    case 'shipment':
      return ticket.relatedShipmentId;
    case 'deduction':
      return ticket.relatedDeductionId;
    case 'payment':
      return ticket.relatedPaymentId;
    case 'compliance_document':
      return ticket.relatedComplianceDocId;
    default:
      return undefined;
  }
}

/** The canonical rows for a kind, as tenant-scoped views. */
function rowsFor(kind: CaseContextKind): readonly TenantScopedRow[] {
  switch (kind) {
    case 'purchase_order':
      return demoPurchaseOrders;
    case 'shipment':
      return demoShipments;
    case 'deduction':
      return demoDeductions;
    case 'payment':
      return demoCommercePayments;
    case 'compliance_document':
      return demoComplianceDocs;
    default:
      return [];
  }
}

/** A purchase order is keyed by its PO NUMBER; the other kinds by record id. */
function findRow(kind: CaseContextKind, reference: string): TenantScopedRow | undefined {
  if (kind === 'purchase_order') {
    return (demoPurchaseOrders as readonly (TenantScopedRow & { poNumber?: string })[]).find(
      (po) => po.poNumber === reference
    );
  }
  return rowsFor(kind).find((row) => row.id === reference);
}

/**
 * Resolve ONE object reference against the case's OWN tenant.
 *
 * Returns a resolution, a cross-tenant refusal, or an honest "not found".
 * `undefined` means the case carries no reference of that kind.
 */
export function lookupCaseContextObject(
  kind: CaseContextKind,
  reference: string | undefined,
  caseBrandId: string
): CaseContextLookup | undefined {
  const ref = reference?.trim();
  if (!ref) return undefined;

  const row = findRow(kind, ref);
  const label = CONTEXT_LABELS[kind];

  if (!row) {
    return {
      kind,
      reference: ref,
      resolved: false,
      crossTenant: false,
      detail: `No ${label} "${ref}" exists in Mercenta's canonical data — the reference cannot be verified.`,
    };
  }

  if (row.brandId !== caseBrandId) {
    return {
      kind,
      reference: ref,
      resolved: false,
      crossTenant: true,
      detail: `The ${label} "${ref}" belongs to a different tenant — it is NOT available to this case and was not read.`,
    };
  }

  return {
    kind,
    reference: ref,
    resolved: true,
    brandId: row.brandId,
    crossTenant: false,
    detail: `The ${label} "${ref}" was found in this brand's own data.`,
  };
}

/**
 * The relevant-data lookup for a case: every object reference the case carries,
 * each resolved (or refused) inside the case's own tenant.
 */
export function lookupCaseContext(ticket: Ticket): CaseContextLookup[] {
  const category = ticket.caseCategory;
  const kinds = new Set<CaseContextKind>();

  // The category's required anchor, plus any reference the case actually
  // carries — so a mis-filed reference on any category is still surfaced.
  const required = category ? CASE_CATEGORY_CONTEXT[category] : undefined;
  if (required) kinds.add(required);
  for (const kind of Object.values(CASE_CATEGORY_CONTEXT)) {
    if (kind && contextRefFor(kind, ticket)) kinds.add(kind);
  }

  return [...kinds]
    .map((kind) => lookupCaseContextObject(kind, contextRefFor(kind, ticket), ticket.brandId))
    .filter((r): r is CaseContextLookup => !!r);
}

/**
 * The sufficiency evaluation. Read-only and deterministic.
 *
 * Order of refusal (every branch fails closed):
 *   1. a case already past Mercenta review      ⇒ `not_applicable`
 *   2. no typed category                        ⇒ Founder review
 *   3. a supplied reference that is cross-tenant or unresolvable
 *                                               ⇒ Founder review
 *   4. a required anchor that was never supplied ⇒ Founder review
 *   5. a retail-channel (`amazon_related`) case ⇒ Founder review
 *   6. no Knowledge Base article resolves       ⇒ Founder review
 *   7. otherwise                                ⇒ internally resolvable
 */
export function evaluateCaseSufficiency(ticket: Ticket): CaseSufficiency {
  const state = ticket.escalationState;
  if (state && state !== 'brand_submitted' && state !== 'under_mercenta_review') {
    return {
      verdict: 'not_applicable',
      articleIds: [],
      context: [],
      reasons: [
        'This case has already passed Mercenta review, so the sufficiency check no longer applies to it.',
      ],
    };
  }

  const reasons: string[] = [];
  const context = lookupCaseContext(ticket);
  const category = ticket.caseCategory;

  if (!category) {
    reasons.push(
      'The case carries no typed category, so no Knowledge Base article or platform data can be matched to it.'
    );
  }

  for (const c of context.filter((x) => !x.resolved)) {
    reasons.push(
      c.crossTenant
        ? `${c.detail} Mercenta review is required before this reference can be used.`
        : `${c.detail} Mercenta review is required.`
    );
  }

  if (category) {
    const requiredKind = CASE_CATEGORY_CONTEXT[category];
    if (requiredKind && !contextRefFor(requiredKind, ticket)?.trim()) {
      reasons.push(
        `A case in this category must name the ${CONTEXT_LABELS[requiredKind]} it is about before Mercenta can answer it from verified platform data.`
      );
    }
  }

  const articleIds = category
    ? CASE_CATEGORY_KB_ARTICLES[category].filter((id) => !!getKnowledgeArticle(id))
    : [];

  if (category === 'amazon_related') {
    reasons.push(
      'The case concerns the retail channel. Mercenta answers a channel matter through a Mercenta review and, where appropriate, an escalation with the retail channel itself — it is never resolved internally from guidance alone.'
    );
  } else if (category && articleIds.length === 0) {
    reasons.push(
      'No Knowledge Base article matches this case category, so there is no supported internal answer.'
    );
  }

  const verdict: CaseSufficiencyVerdict =
    reasons.length === 0 ? 'internally_resolvable' : 'requires_founder_review';

  if (verdict === 'internally_resolvable') {
    reasons.push(
      `Supported by ${articleIds.length} Knowledge Base article${articleIds.length === 1 ? '' : 's'}` +
        (context.length > 0
          ? ` and ${context.length} verified platform record${context.length === 1 ? '' : 's'}.`
          : '.')
    );
  }

  return { verdict, articleIds, context, reasons };
}