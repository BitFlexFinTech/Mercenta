import type { ComplianceDocument } from '@/types';

/**
 * §3 Compliance gate — pure decision logic.
 *
 * A brand cannot move from "Onboarding" to "Catalog Sync Enabled" until every
 * required ComplianceDocument is `approved`. This module is the single source
 * of that decision; it is mirrored server-side by the DB trigger in
 * supabase/migrations/0003_catalog_gate.sql so submissions can never be
 * approved client-side only.
 */

/** Documents every brand must have approved, regardless of category.
 * NOTE: 'distribution_agreement' is NOT a ComplianceDocument — it is the
 * brand's Contract. The compliance gate checks that a signed, active Contract
 * of type 'distribution_agreement' exists alongside the required docs below. */
export const REQUIRED_DOCUMENT_TYPES: ComplianceDocument['type'][] = [
  'letter_of_authorization',
  'product_safety_ukca',
  'insurance_certificate',
  'brand_registry_confirmation',
];

export interface GateEvaluation {
  cleared: boolean;
  /** Required docs with no record yet. */
  missing: string[];
  /** Present but not approved (uploaded/under_review/expiring/expired). */
  blocking: { type: string; status: string }[];
  /** Whether a signed distribution agreement contract exists. */
  agreementSigned: boolean;
}

export function evaluateComplianceGate(
  docs: Pick<ComplianceDocument, 'type' | 'status'>[],
  /** Pass true if the brand has a signed/active distribution agreement Contract. */
  hasSignedAgreement = false
): GateEvaluation {
  const missing: string[] = [];
  const blocking: { type: string; status: string }[] = [];

  for (const type of REQUIRED_DOCUMENT_TYPES) {
    const record = docs.find((d) => d.type === type);
    if (!record) {
      missing.push(type);
    } else if (record.status !== 'approved') {
      blocking.push({ type, status: record.status });
    }
  }

  // The distribution agreement is derived from the Contract, not a second doc.
  if (!hasSignedAgreement) {
    missing.push('distribution_agreement');
  }

  return {
    cleared: missing.length === 0 && blocking.length === 0,
    missing,
    blocking,
    agreementSigned: hasSignedAgreement,
  };
}
