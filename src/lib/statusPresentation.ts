/**
 * §Phase D — single source of truth for how a domain STATUS is presented.
 *
 * Before this module each surface re-invented its own `bg-{colour}-500/15`
 * badge and its own label map, so the same domain state could look different —
 * or imply a stronger state than it actually was — depending on the screen.
 * Presentation is now derived from the status VALUE alone.
 *
 * `tone` is a `StatusTone` from the canonical kit (`src/components/ui.tsx`), so
 * every status renders through `StatusBadge` (dot + text + `role="status"` +
 * `data-status`) and is never colour-only (design system §Semantics).
 *
 * The visible LABELS are deliberately identical to the strings the surfaces
 * already rendered: this is a presentation consolidation, not a copy change.
 */
import type { StatusTone } from '@/components/ui';
import type {
  ApplicationStatus,
  ComplianceDocument,
  DeductionStatus,
  DocumentVerificationStatus,
  OnboardingStatus,
  PaymentReconciliationState,
  PayoutDestinationStatus,
  PayoutState,
  PurchaseOrderStatus,
  ReturnTrackingStatus,
  ShipmentStatus,
} from '@/types';
import { STATUS_LABELS } from '@/types';
import { SUBMISSION_STATUS_LABELS, type SubmissionStatus } from '@/lib/spapi/transform';

export interface StatusPresentation {
  /** Visible label — unchanged from the strings these surfaces already showed. */
  label: string;
  /** Semantic tone from the canonical kit. */
  tone: StatusTone;
  /** Machine-readable status id, rendered as `data-status`. */
  dataStatus: string;
  /** True when this state needs a real action before the workflow can advance. */
  actionable: boolean;
}

export type ComplianceDocStatus = ComplianceDocument['status'];

/**
 * Compliance document states. `missing`/`expired` block the compliance gate and
 * are therefore danger; `uploaded`/`under_review` are in-flight review states and
 * must never look approved.
 */
const COMPLIANCE_DOC_STATUS: Record<ComplianceDocStatus, StatusPresentation> = {
  approved: { label: 'approved', tone: 'success', dataStatus: 'approved', actionable: false },
  uploaded: { label: 'uploaded', tone: 'warning', dataStatus: 'uploaded', actionable: true },
  under_review: { label: 'under review', tone: 'warning', dataStatus: 'under_review', actionable: true },
  missing: { label: 'missing', tone: 'danger', dataStatus: 'missing', actionable: true },
  /** §M2 — verification failed: the document must be REPLACED. */
  rejected: { label: 'rejected', tone: 'danger', dataStatus: 'rejected', actionable: true },
  /** §M2 — replaced by a newer version; retained for the audit trail. */
  superseded: { label: 'superseded', tone: 'neutral', dataStatus: 'superseded', actionable: true },
  expiring: { label: 'expiring', tone: 'info', dataStatus: 'expiring', actionable: true },
  expired: { label: 'expired', tone: 'danger', dataStatus: 'expired', actionable: true },
};

export function complianceDocStatusPresentation(
  status: ComplianceDocStatus | string
): StatusPresentation {
  return (
    COMPLIANCE_DOC_STATUS[status as ComplianceDocStatus] ?? {
      label: String(status).replace(/_/g, ' '),
      tone: 'neutral',
      dataStatus: String(status),
      actionable: true,
    }
  );
}

/* ── §M2 — document verification verdict states ───────────────────────────── */

export type DocumentVerificationStatusKey = DocumentVerificationStatus;

/**
 * Verification verdict states. `verified` is success; `failed` needs a
 * replacement; `unavailable`/`manual_review_required` are honest non-verdicts
 * (no provider ran, nothing was verified) and route to manual review.
 */
const DOCUMENT_VERIFICATION_STATUS: Record<DocumentVerificationStatusKey, StatusPresentation> = {
  not_requested: { label: 'not requested', tone: 'neutral', dataStatus: 'not_requested', actionable: true },
  pending: { label: 'verification pending', tone: 'warning', dataStatus: 'verification_pending', actionable: true },
  verified: { label: 'verified', tone: 'success', dataStatus: 'verified', actionable: false },
  failed: { label: 'verification failed', tone: 'danger', dataStatus: 'verification_failed', actionable: true },
  unavailable: {
    label: 'verification unavailable',
    tone: 'warning',
    dataStatus: 'verification_unavailable',
    actionable: true,
  },
  manual_review_required: {
    label: 'manual review required',
    tone: 'warning',
    dataStatus: 'manual_review_required',
    actionable: true,
  },
};

export function documentVerificationStatusPresentation(
  status: DocumentVerificationStatusKey | string
): StatusPresentation {
  return (
    DOCUMENT_VERIFICATION_STATUS[status as DocumentVerificationStatusKey] ?? {
      label: String(status).replace(/_/g, ' '),
      tone: 'neutral',
      dataStatus: String(status),
      actionable: true,
    }
  );
}

/**
 * Partner-application decision states. `pending`/`flagged`/`info_requested` are
 * open decisions the operator must make; `approved`/`rejected` are final.
 */
const APPLICATION_STATUS: Record<ApplicationStatus, StatusPresentation> = {
  pending: { label: 'Pending', tone: 'info', dataStatus: 'pending', actionable: true },
  flagged: { label: 'Flagged', tone: 'warning', dataStatus: 'flagged', actionable: true },
  info_requested: {
    label: 'Info Requested',
    tone: 'warning',
    dataStatus: 'info_requested',
    actionable: true,
  },
  approved: { label: 'Approved', tone: 'success', dataStatus: 'approved', actionable: false },
  rejected: { label: 'Rejected', tone: 'danger', dataStatus: 'rejected', actionable: false },
};

export function applicationStatusPresentation(
  status: ApplicationStatus | string
): StatusPresentation {
  return (
    APPLICATION_STATUS[status as ApplicationStatus] ?? {
      label: String(status).replace(/_/g, ' '),
      tone: 'neutral',
      dataStatus: String(status),
      actionable: true,
    }
  );
}

/** Every decision state, in workflow order (drives the Applications overview). */
export const APPLICATION_STATUS_ORDER: ApplicationStatus[] = [
  'pending',
  'flagged',
  'info_requested',
  'approved',
  'rejected',
];

/* ── §Phase D2 — commerce lifecycles ──────────────────────────────────────── */

/**
 * Purchase-order lifecycle. The labels are the exact strings the brand PO list
 * already rendered (`STATUS_LABEL` in BrandPurchaseOrders) — consolidated here so
 * the brand list, the admin list and the admin detail can never disagree.
 */
const PO_STATUS: Record<PurchaseOrderStatus, StatusPresentation> = {
  received: { label: 'Received', tone: 'info', dataStatus: 'received', actionable: true },
  under_review: { label: 'Under Review', tone: 'warning', dataStatus: 'under_review', actionable: true },
  accepted: { label: 'Accepted', tone: 'success', dataStatus: 'accepted', actionable: true },
  rejected: { label: 'Rejected', tone: 'danger', dataStatus: 'rejected', actionable: false },
  ready_to_fulfil: {
    label: 'Ready to Fulfil',
    tone: 'brass',
    dataStatus: 'ready_to_fulfil',
    actionable: true,
  },
  shipped: { label: 'Shipped', tone: 'info', dataStatus: 'shipped', actionable: false },
  delivered: { label: 'Delivered', tone: 'success', dataStatus: 'delivered', actionable: false },
};

export function poStatusPresentation(status: PurchaseOrderStatus | string): StatusPresentation {
  return (
    PO_STATUS[status as PurchaseOrderStatus] ?? {
      label: String(status).replace(/_/g, ' '),
      tone: 'neutral',
      dataStatus: String(status),
      actionable: true,
    }
  );
}

/** Canonical purchase-order workflow order (drives the PO status filter). */
export const PO_STATUS_ORDER: PurchaseOrderStatus[] = [
  'received',
  'under_review',
  'accepted',
  'ready_to_fulfil',
  'shipped',
  'delivered',
  'rejected',
];

/**
 * The 24-hour acknowledgement WINDOW of one purchase order (admin detail).
 * `acknowledged` is derived from the PO status, so this is presentation only.
 */
export function ackWindowPresentation(
  acknowledged: boolean,
  hoursLeft: number,
  minutesLeft: number
): StatusPresentation {
  if (acknowledged) {
    return { label: 'Acknowledged', tone: 'success', dataStatus: 'acknowledged', actionable: false };
  }
  if (hoursLeft <= 0 && minutesLeft <= 0) {
    return { label: 'Deadline passed', tone: 'danger', dataStatus: 'ack_overdue', actionable: true };
  }
  return {
    label: `${hoursLeft}h ${minutesLeft}m left`,
    tone: 'warning',
    dataStatus: 'ack_due',
    actionable: true,
  };
}

/** Per-line acknowledgement outcome (`unacknowledged` renders as `pending`). */
export type AckStatusValue = 'accepted' | 'rejected' | 'backordered' | 'unacknowledged';

const ACK_STATUS: Record<AckStatusValue, StatusPresentation> = {
  accepted: { label: 'accepted', tone: 'success', dataStatus: 'accepted', actionable: false },
  rejected: { label: 'rejected', tone: 'danger', dataStatus: 'rejected', actionable: false },
  backordered: { label: 'backordered', tone: 'warning', dataStatus: 'backordered', actionable: true },
  unacknowledged: { label: 'pending', tone: 'neutral', dataStatus: 'unacknowledged', actionable: true },
};

export function ackStatusPresentation(status: AckStatusValue | string | undefined): StatusPresentation {
  return (
    ACK_STATUS[(status ?? 'unacknowledged') as AckStatusValue] ?? {
      label: String(status).replace(/_/g, ' '),
      tone: 'neutral',
      dataStatus: String(status),
      actionable: true,
    }
  );
}

/** Deduction lifecycle — `open` blocks the brand's money, so it is danger. */
const DEDUCTION_STATUS: Record<DeductionStatus, StatusPresentation> = {
  open: { label: 'open', tone: 'danger', dataStatus: 'open', actionable: true },
  disputed: { label: 'disputed', tone: 'warning', dataStatus: 'disputed', actionable: true },
  accepted: { label: 'accepted', tone: 'info', dataStatus: 'accepted', actionable: false },
  resolved: { label: 'resolved', tone: 'success', dataStatus: 'resolved', actionable: false },
};

export function deductionStatusPresentation(status: DeductionStatus | string): StatusPresentation {
  return (
    DEDUCTION_STATUS[status as DeductionStatus] ?? {
      label: String(status).replace(/_/g, ' '),
      tone: 'neutral',
      dataStatus: String(status),
      actionable: true,
    }
  );
}

/**
 * Catalogue submission lifecycle. The LABELS come from the canonical
 * `SUBMISSION_STATUS_LABELS` (the retail submission vocabulary owner) so no
 * second copy of them exists; only the semantic tone is decided here.
 */
const SUBMISSION_TONES: Record<SubmissionStatus, StatusTone> = {
  pending: 'neutral',
  submitted: 'neutral',
  under_amazon_review: 'info',
  live: 'success',
  rejected: 'danger',
};

export function submissionStatusPresentation(status: SubmissionStatus | string): StatusPresentation {
  const key = status as SubmissionStatus;
  const label = SUBMISSION_STATUS_LABELS[key] ?? String(status).replace(/_/g, ' ');
  return {
    label,
    tone: SUBMISSION_TONES[key] ?? 'neutral',
    dataStatus: String(status),
    actionable: key !== 'live' && key !== 'rejected',
  };
}

/* ── §Phase D2 — shipment lifecycle (brand logistics + carrier) ───────────── */

/**
 * Shipment progression. Labels come from the canonical `STATUS_LABELS`
 * (types.ts) so they are not re-typed here; only the semantic tone is decided
 * in one place. This replaces the per-status COLOUR map the brand logistics hub
 * and the carrier dashboard used to read, which was a third way of presenting
 * the same domain statuses.
 */
const SHIPMENT_TONES: Record<ShipmentStatus, StatusTone> = {
  factory_intake: 'neutral',
  bak_depot: 'warning',
  sea_transit: 'info',
  air_transit: 'info',
  uk_customs_cleared: 'success',
  mercenta_hub: 'brass',
  live_amazon: 'success',
};

export function shipmentStatusPresentation(status: string): StatusPresentation {
  const key = status as ShipmentStatus;
  return {
    label: STATUS_LABELS[key] ?? String(status).replace(/_/g, ' '),
    tone: SHIPMENT_TONES[key] ?? 'neutral',
    dataStatus: String(status),
    actionable: key !== 'live_amazon',
  };
}

/* ── §M6 — payment reconciliation / payout lifecycle states ──────────────── */

/** Reconciliation states. Only `reconciled` may make a payout eligible. */
const RECONCILIATION_STATUS: Record<PaymentReconciliationState, StatusPresentation> = {
  pending: { label: 'not reconciled', tone: 'warning', dataStatus: 'pending', actionable: true },
  reconciled: { label: 'reconciled', tone: 'success', dataStatus: 'reconciled', actionable: false },
  exception: { label: 'reconciliation exception', tone: 'danger', dataStatus: 'exception', actionable: true },
};

export function reconciliationStatePresentation(
  state: PaymentReconciliationState | string
): StatusPresentation {
  return (
    RECONCILIATION_STATUS[state as PaymentReconciliationState] ?? {
      label: String(state).replace(/_/g, ' '),
      tone: 'neutral',
      dataStatus: String(state),
      actionable: true,
    }
  );
}

/** Brand payout operational states (the accounting status stays separate). */
const PAYOUT_STATE: Record<PayoutState, StatusPresentation> = {
  pending: { label: 'blocked', tone: 'warning', dataStatus: 'payout_pending', actionable: true },
  eligible: { label: 'payout eligible', tone: 'info', dataStatus: 'payout_eligible', actionable: true },
  submitted: { label: 'payout submitted', tone: 'info', dataStatus: 'payout_submitted', actionable: true },
  settled: { label: 'payout settled', tone: 'success', dataStatus: 'payout_settled', actionable: false },
  failed: { label: 'payout failed', tone: 'danger', dataStatus: 'payout_failed', actionable: true },
};

export function payoutStatePresentation(state: PayoutState | string): StatusPresentation {
  return (
    PAYOUT_STATE[state as PayoutState] ?? {
      label: String(state).replace(/_/g, ' '),
      tone: 'neutral',
      dataStatus: String(state),
      actionable: true,
    }
  );
}

/** Payout destination verification states. An unverified account cannot be paid. */
const PAYOUT_DESTINATION_STATUS: Record<PayoutDestinationStatus, StatusPresentation> = {
  unverified: { label: 'unverified', tone: 'warning', dataStatus: 'unverified', actionable: true },
  verified: { label: 'verified', tone: 'success', dataStatus: 'verified', actionable: false },
  rejected: { label: 'rejected', tone: 'danger', dataStatus: 'rejected', actionable: true },
  suspended: { label: 'suspended', tone: 'danger', dataStatus: 'suspended', actionable: true },
};

export function payoutDestinationStatusPresentation(
  status: PayoutDestinationStatus | string
): StatusPresentation {
  return (
    PAYOUT_DESTINATION_STATUS[status as PayoutDestinationStatus] ?? {
      label: String(status).replace(/_/g, ' '),
      tone: 'neutral',
      dataStatus: String(status),
      actionable: true,
    }
  );
}

/* ── §Phase D2 — compliance gate state ────────────────────────────────────── */

/**
 * The brand's compliance GATE state (derived from the canonical gate rule, never
 * a stored status). The visible labels are the ones the brand dashboard already
 * showed; `data-status` distinguishes "nothing on file yet" from "documents
 * reviewed but not all approved".
 */
export function complianceGatePresentation(
  cleared: boolean,
  documentCount: number
): StatusPresentation {
  if (documentCount === 0) {
    return {
      label: 'Action required',
      tone: 'warning',
      dataStatus: 'gate_no_documents',
      actionable: true,
    };
  }
  return cleared
    ? { label: 'Gate open', tone: 'success', dataStatus: 'gate_open', actionable: false }
    : { label: 'Action required', tone: 'warning', dataStatus: 'gate_action_required', actionable: true };
}

/* ── §Phase D2 — onboarding, returns and outages ──────────────────────────── */

/** Brand onboarding record lifecycle (Onboarding Pipeline). */
const ONBOARDING_STATUS: Record<OnboardingStatus, StatusPresentation> = {
  initiated: { label: 'Awaiting acceptance', tone: 'warning', dataStatus: 'initiated', actionable: true },
  accepted: { label: 'Accepted', tone: 'info', dataStatus: 'accepted', actionable: true },
  in_progress: { label: 'In progress', tone: 'info', dataStatus: 'in_progress', actionable: true },
  completed: { label: 'Operational', tone: 'success', dataStatus: 'completed', actionable: false },
};

export function onboardingStatusPresentation(status: OnboardingStatus | string): StatusPresentation {
  return (
    ONBOARDING_STATUS[status as OnboardingStatus] ?? {
      label: String(status).replace(/_/g, ' '),
      tone: 'neutral',
      dataStatus: String(status),
      actionable: true,
    }
  );
}

/** Physical returns tracking lifecycle (warehouse → brand confirmation). */
const RETURN_TRACKING_STATUS: Record<ReturnTrackingStatus, StatusPresentation> = {
  received_at_warehouse: { label: 'received at warehouse', tone: 'info', dataStatus: 'received_at_warehouse', actionable: true },
  quality_checked: { label: 'quality checked', tone: 'warning', dataStatus: 'quality_checked', actionable: true },
  forwarded_to_brand: { label: 'forwarded to brand', tone: 'info', dataStatus: 'forwarded_to_brand', actionable: true },
  confirmed_by_brand: { label: 'confirmed by brand', tone: 'success', dataStatus: 'confirmed_by_brand', actionable: false },
};

export function returnTrackingStatusPresentation(
  status: ReturnTrackingStatus | string
): StatusPresentation {
  return (
    RETURN_TRACKING_STATUS[status as ReturnTrackingStatus] ?? {
      label: String(status).replace(/_/g, ' '),
      tone: 'neutral',
      dataStatus: String(status),
      actionable: true,
    }
  );
}

/** Brand-declared PO outage window status (Settings → PO Outages). */
export function poOutageStatusPresentation(status: string): StatusPresentation {
  const map: Record<string, StatusPresentation> = {
    active: { label: 'active', tone: 'warning', dataStatus: 'active', actionable: true },
    expired: { label: 'expired', tone: 'neutral', dataStatus: 'expired', actionable: false },
    cancelled: { label: 'cancelled', tone: 'danger', dataStatus: 'cancelled', actionable: false },
  };
  return (
    map[status] ?? {
      label: status.replace(/_/g, ' '),
      tone: 'neutral',
      dataStatus: status,
      actionable: true,
    }
  );
}

/* ── §Phase D2 — urgency presentations (computed, never a stored status) ──── */

/**
 * Commission-billing decision for a purchase order that has been accepted
 * (Retail Pipeline). Derived from the auto-approve threshold, never stored.
 */
export function billingDecisionPresentation(
  autoInvoice: boolean,
  commissionGbp: number
): StatusPresentation {
  return autoInvoice
    ? {
        label: `Auto-invoice (£${commissionGbp.toLocaleString()} commission)`,
        tone: 'success',
        dataStatus: 'auto_invoice',
        actionable: false,
      }
    : {
        label: 'Held for approval',
        tone: 'warning',
        dataStatus: 'held_for_approval',
        actionable: true,
      };
}

/** §Phase S — the social engine's OWN post lifecycle vocabulary
 *  (`DRAFT · QUEUE · PUBLISHED · ERROR`, verified in the deployed engine). This
 *  is a presentation of MERGED engine state, not new business state: nothing here
 *  can turn an unpublished post into "published". */
export type SocialPostStateValue = 'DRAFT' | 'QUEUE' | 'PUBLISHED' | 'ERROR';

const SOCIAL_POST_STATE: Record<SocialPostStateValue, StatusPresentation> = {
  DRAFT: { label: 'Draft', tone: 'neutral', dataStatus: 'draft', actionable: false },
  QUEUE: { label: 'Queued', tone: 'info', dataStatus: 'queued', actionable: true },
  PUBLISHED: { label: 'Published', tone: 'success', dataStatus: 'published', actionable: false },
  ERROR: { label: 'Failed', tone: 'danger', dataStatus: 'failed', actionable: true },
};

export function socialPostStatePresentation(state: SocialPostStateValue | string): StatusPresentation {
  return (
    SOCIAL_POST_STATE[state as SocialPostStateValue] ?? {
      label: String(state ?? 'unknown'),
      tone: 'neutral',
      dataStatus: 'unknown',
      actionable: true,
    }
  );
}

/** §Phase D6 — contract lifecycle. The CRM history previously printed the raw
 *  enum (`under_review`) while every other surface had settled on one label per
 *  state; this is that one label. */
export type ContractStatusValue =
  | 'draft'
  | 'sent'
  | 'under_review'
  | 'signed'
  | 'active'
  | 'expiring'
  | 'terminated';

const CONTRACT_STATUS: Record<ContractStatusValue, StatusPresentation> = {
  draft: { label: 'Draft', tone: 'neutral', dataStatus: 'draft', actionable: false },
  sent: { label: 'Sent', tone: 'info', dataStatus: 'sent', actionable: true },
  under_review: { label: 'Under review', tone: 'warning', dataStatus: 'under_review', actionable: true },
  signed: { label: 'Signed', tone: 'success', dataStatus: 'signed', actionable: false },
  active: { label: 'Active', tone: 'success', dataStatus: 'active', actionable: false },
  expiring: { label: 'Expiring', tone: 'warning', dataStatus: 'expiring', actionable: true },
  terminated: { label: 'Terminated', tone: 'danger', dataStatus: 'terminated', actionable: false },
};

export function contractStatusPresentation(status: ContractStatusValue | string): StatusPresentation {
  return (
    CONTRACT_STATUS[status as ContractStatusValue] ?? {
      label: String(status ?? 'unknown'),
      tone: 'neutral',
      dataStatus: 'unknown',
      actionable: true,
    }
  );
}

/**
 * §Phase D6 — commission → brand payout lifecycle.
 *
 * `accrued`/`invoiced` are money the brand is OWED and are therefore actionable
 * (a payout has to be settled); `paid` is terminal. Previously this lifecycle had
 * NO canonical presentation, which is why the Accounting surface rendered the
 * raw status with no semantic contract at all.
 */
export type CommissionStatus = 'accrued' | 'invoiced' | 'paid';

const COMMISSION_STATUS: Record<CommissionStatus, StatusPresentation> = {
  accrued: { label: 'accrued', tone: 'warning', dataStatus: 'accrued', actionable: true },
  invoiced: { label: 'invoiced', tone: 'info', dataStatus: 'invoiced', actionable: true },
  paid: { label: 'paid', tone: 'success', dataStatus: 'paid', actionable: false },
};

export function commissionStatusPresentation(status: CommissionStatus | string): StatusPresentation {
  return (
    COMMISSION_STATUS[status as CommissionStatus] ?? {
      label: String(status ?? 'unknown'),
      tone: 'neutral',
      dataStatus: 'unknown',
      actionable: true,
    }
  );
}

/**
 * The 24-hour acknowledgement window is a REAL Vendor Central rule, and its
 * urgency is computed from the order date at render time. It is presentation
 * only — the domain status is the PO's own status.
 */
export function ackDeadlinePresentation(hoursLeft: number): StatusPresentation {
  if (hoursLeft <= 0) {
    return {
      // §Dashboard-cleanup P0 — AV-002: state the RISK, never an unsupported
      // certainty (the register records "forced cancellation" as an inference).
      label: 'Ack deadline PASSED — at risk of cancellation',
      tone: 'danger',
      dataStatus: 'ack_overdue',
      actionable: true,
    };
  }
  return {
    label: `Ack within ${hoursLeft}h`,
    tone: hoursLeft <= 6 ? 'danger' : 'warning',
    dataStatus: hoursLeft <= 6 ? 'ack_urgent' : 'ack_due',
    actionable: true,
  };
}

