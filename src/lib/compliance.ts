import type { ComplianceDocument, ApprovedCategory, BrandAgreementType } from '@/types';

/**
 * §3 Compliance gate — pure decision logic.
 *
 * A brand cannot move from "Onboarding" to "Catalog Sync Enabled" until every
 * required ComplianceDocument is `approved` AND both mandatory legal agreements
 * (§4.1 Logistics SLAs & §4.2 Chargeback Indemnity) are accepted.
 *
 * Document requirements vary by CATEGORY — Amazon UK requires different
 * compliance documents for Baby products vs Consumer Electronics vs Grocery.
 * This module is the single source of truth for category-specific requirements.
 *
 * It is mirrored server-side by the DB trigger so submissions can never be
 * approved client-side only.
 */

/** Base documents every brand must have approved, regardless of category. */
export const BASE_REQUIRED_DOCUMENTS: ComplianceDocument['type'][] = [
  'letter_of_authorization',
  'product_safety_ukca',
  'insurance_certificate',
  'brand_registry_confirmation',
];

/**
 * Category-specific additional documents.
 * Each category has its own extra requirements based on Amazon UK marketplace rules.
 */
export const CATEGORY_SPECIFIC_DOCUMENTS: Record<ApprovedCategory, ComplianceDocument['type'][]> = {
  'Home': [],
  'Baby': ['baby_product_safety'],
  'Office Products': [],
  'Health & Personal Care': ['cosmetic_notification_cpnp'],
  'Kitchen': ['food_contact_material'],
  'Consumer Electronics': ['weee_compliance'],
  'Automotive': ['type_approval'],
  'Grocery': ['food_safety_certificate'],
  'Personal Computer': ['weee_compliance'],
  'Apparel': ['textile_labelling_compliance'],
};

/**
 * Get ALL required document types for a given category.
 * Combines base + category-specific documents.
 */
export function getRequiredDocumentsForCategory(category: ApprovedCategory): ComplianceDocument['type'][] {
  const categoryDocs = CATEGORY_SPECIFIC_DOCUMENTS[category] ?? [];
  return [...BASE_REQUIRED_DOCUMENTS, ...categoryDocs];
}

/** Human-readable labels for category-specific documents. */
export const CATEGORY_DOC_LABELS: Record<ComplianceDocument['type'], string> = {
  letter_of_authorization: 'Letter of Authorization',
  product_safety_ukca: 'Product Safety (UKCA)',
  insurance_certificate: 'Product Liability Insurance Certificate',
  brand_registry_confirmation: 'Brand Registry Confirmation',
  baby_product_safety: 'Baby Product Safety Certificate (EN 71 / EN 1888)',
  cosmetic_notification_cpnp: 'Cosmetic Product Notification (CPNP/SCNP)',
  food_contact_material: 'Food Contact Material Compliance',
  weee_compliance: 'WEEE Compliance Registration',
  type_approval: 'Type Approval Documentation',
  food_safety_certificate: 'Food Safety Certificate (HACCP/BRC)',
  textile_labelling_compliance: 'Textile Labelling Compliance',
};

/** Legacy flat list — kept for backward compat. Use getRequiredDocumentsForCategory() instead. */
export const REQUIRED_DOCUMENT_TYPES: ComplianceDocument['type'][] = BASE_REQUIRED_DOCUMENTS;

/**
 * §Legal — Mandatory brand agreements that must be accepted before catalog sync
 * is enabled. These are checked alongside the document requirements.
 */
export const REQUIRED_BRAND_AGREEMENTS: BrandAgreementType[] = [
  'logistics_sla',
  'chargeback_indemnity',
];

export const AGREEMENT_LABELS: Record<BrandAgreementType, string> = {
  logistics_sla: 'Logistics SLAs & Carrier Alignment (§4.1)',
  chargeback_indemnity: 'Chargeback Remediation & Financial Indemnity (§4.2)',
};

export interface GateEvaluation {
  cleared: boolean;
  /** Required docs with no record yet. */
  missing: string[];
  /** Present but not approved (uploaded/under_review/expiring/expired). */
  blocking: { type: string; status: string }[];
  /** Whether a signed distribution agreement contract exists. */
  agreementSigned: boolean;
  /** Whether mandatory brand agreements have been accepted. */
  logisticsSlaAccepted: boolean;
  chargebackIndemnityAccepted: boolean;
}

/**
 * Evaluate the compliance gate for a brand.
 * @param docs - The brand's compliance documents
 * @param category - The brand's product category
 * @param hasSignedAgreement - Whether the brand has a signed/active distribution agreement
 * @param logisticsSlaAccepted - Whether the brand accepted Logistics SLAs
 * @param chargebackIndemnityAccepted - Whether the brand accepted Chargeback Indemnity
 */
export function evaluateComplianceGate(
  docs: Pick<ComplianceDocument, 'type' | 'status'>[],
  category?: ApprovedCategory,
  hasSignedAgreement = false,
  logisticsSlaAccepted = false,
  chargebackIndemnityAccepted = false
): GateEvaluation {
  const missing: string[] = [];
  const blocking: { type: string; status: string }[] = [];

  // Get the full set of required docs for this category
  const requiredTypes = category
    ? getRequiredDocumentsForCategory(category)
    : BASE_REQUIRED_DOCUMENTS;

  for (const type of requiredTypes) {
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

  // §Legal — brand agreement checks
  if (!logisticsSlaAccepted) {
    missing.push('logistics_sla_agreement');
  }
  if (!chargebackIndemnityAccepted) {
    missing.push('chargeback_indemnity_agreement');
  }

  return {
    cleared: missing.length === 0 && blocking.length === 0,
    missing,
    blocking,
    agreementSigned: hasSignedAgreement,
    logisticsSlaAccepted,
    chargebackIndemnityAccepted,
  };
}
