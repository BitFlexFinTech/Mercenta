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
import type { ApplicationStatus, ComplianceDocument } from '@/types';

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
