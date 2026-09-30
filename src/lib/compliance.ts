import type { ComplianceDocument, ApprovedCategory, BrandAgreementType } from '@/types';

/**
 * §3 Compliance gate — pure decision logic.
 *
 * A brand cannot move from "Onboarding" to "Catalog Sync Enabled" until every
 * required ComplianceDocument is `approved` AND both mandatory legal agreements
 * (§4.1 Logistics SLAs & §4.2 Chargeback Indemnity) are accepted.
 *
 * Document requirements vary by CATEGORY. §AV-031 — the obligations behind the
 * category documents are UK/EU LAW (UKCA, CPNP/SCNP, WEEE, food-contact,
 * EN 71/1888, HACCP/BRC, textile labelling, type approval), and the universal
 * documents are Mercenta's own vendor-of-record obligations. NONE of them is a
 * marketplace rule, and this module never claims one is. This module is the
 * single source of truth for category-specific requirements.
 *
 * It is mirrored server-side by the DB trigger so submissions can never be
 * approved client-side only.
 */

/**
 * Base documents every brand must have approved, regardless of category.
 *
 * §AV-032 — THREE universal documents. `brand_registry_confirmation` used to be
 * a fourth; "Amazon Brand Registry" is a SELLER / brand-owner programme with no
 * vendor obligation behind it, so requiring it could BLOCK a brand on a document
 * nothing actually requires. It has been removed from the hard gate and is now
 * an OPTIONAL Mercenta onboarding control (see `OPTIONAL_MERCENTA_CONTROLS`).
 */
export const BASE_REQUIRED_DOCUMENTS: ComplianceDocument['type'][] = [
  'letter_of_authorization',
  'product_safety_ukca',
  'insurance_certificate',
];

/**
 * §AV-032 — OPTIONAL MERCENTA CONTROLS.
 *
 * Documents Mercenta MAY request as its OWN onboarding control. They are NOT
 * regulatory obligations and NOT marketplace requirements; they are NEVER part
 * of the hard gate, and a brand is NEVER blocked on one. Declared here — rather
 * than silently deleted — so the reclassification is explicit and auditable.
 */
export const OPTIONAL_MERCENTA_CONTROLS: {
  type: ComplianceDocument['type'];
  label: string;
  rationale: string;
}[] = [
  {
    type: 'brand_registry_confirmation',
    label: 'Brand Ownership Confirmation (Mercenta onboarding control)',
    rationale:
      'Optional Mercenta onboarding control. Mercenta MAY ask a brand to confirm it is the authorised owner of the brand it supplies; the mandatory Letter of Authorization already evidences authority, so this is never a requirement and never blocks a brand.',
  },
];

/**
 * Category-specific additional documents.
 * Each category has its own extra requirements, driven by UK/EU product law
 * (§AV-031) — never by a marketplace rule.
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
  brand_registry_confirmation: 'Brand Ownership Confirmation (Mercenta onboarding control)',
  baby_product_safety: 'Baby Product Safety Certificate (EN 71 / EN 1888)',
  cosmetic_notification_cpnp: 'Cosmetic Product Notification (CPNP/SCNP)',
  food_contact_material: 'Food Contact Material Compliance',
  weee_compliance: 'WEEE Compliance Registration',
  type_approval: 'Type Approval Documentation',
  food_safety_certificate: 'Food Safety Certificate (HACCP/BRC)',
  textile_labelling_compliance: 'Textile Labelling Compliance',
};

/* ── §M2 — Requirements as explicit, conditional RULES ───────────────────────
 *
 * The category map above says WHICH document a category needs. M2 makes the
 * REASON and the CONDITION explicit, so a conditional requirement can be
 * represented as a rule rather than being blindly demanded for every product in
 * the category.
 *
 * Interpretive decisions (reconciled against the existing architecture, not a
 * generic internet checklist):
 *
 *  - The three BASE documents are UNIVERSAL: every brand, every category must
 *    hold them, because Mercenta is the vendor of record and carries the
 *    liability. They are never conditional. (`brand_registry_confirmation` was
 *    a fourth until §AV-032 removed it from the hard gate — it is now an
 *    optional Mercenta control, never a requirement.)
 *  - Category documents are CONDITIONAL ON THE PRODUCT, not on the category
 *    name alone. A Kitchen brand that sells no food-contact item does not owe a
 *    food-contact declaration; a Grocery brand selling only shelf-stable dry
 *    goods does not owe an HACCP certificate for a perishable line.
 *  - CONDITIONS DEFAULT TO REQUIRED. If no product context is supplied the
 *    requirement stands — the platform can only NARROW a requirement when it
 *    positively knows the condition does not apply. This keeps the hard gate
 *    fail-closed and preserves every existing requirement count.
 */

export type ComplianceRequirementScope = 'universal' | 'category' | 'conditional';

/**
 * Product/context signals a conditional requirement keys off. Explicitly
 * tri-state: `undefined` means "not known" and therefore the requirement
 * applies (fail-closed).
 */
export interface ComplianceProductContext {
  category?: ApprovedCategory;
  /** Product is placed in contact with food → food-contact declaration. */
  touchesFood?: boolean;
  /** Product is an electrical/electronic item → WEEE. */
  isElectrical?: boolean;
  /** Product is a cosmetic → CPNP/SCNP notification. */
  isCosmetic?: boolean;
  /** Product is a textile/apparel item → textile labelling. */
  isTextile?: boolean;
  /** Product is a vehicle part → type approval. */
  isAutomotive?: boolean;
  /** Product is a child/baby item → EN 71 / EN 1888 safety. */
  isBaby?: boolean;
  /** Product is perishable/food → HACCP/BRC certificate. */
  isPerishable?: boolean;
}

export interface ComplianceRequirement {
  type: ComplianceDocument['type'];
  scope: ComplianceRequirementScope;
  /** Why Mercenta requires this document — shown to the brand, auditable. */
  rationale: string;
  /** For conditional requirements: the signal the rule keys off. */
  condition?: keyof Omit<ComplianceProductContext, 'category'>;
  /** Optional human description of the condition. */
  conditionDescription?: string;
}

const BASE_REQUIREMENT_RATIONALE: Record<string, string> = {
  letter_of_authorization:
    'Mercenta acts as vendor of record on the retail channel and must hold explicit authority from the brand.',
  product_safety_ukca:
    'Products placed on the UK market must carry a valid UKCA conformity position.',
  insurance_certificate:
    'Mercenta carries product liability exposure for goods it distributes.',
};

interface CategoryRequirementRule {
  condition: keyof Omit<ComplianceProductContext, 'category'>;
  conditionDescription: string;
  rationale: string;
}

/** The category document rules, with the condition each one keys off. */
const CATEGORY_REQUIREMENT_RULES: Record<ComplianceDocument['type'], CategoryRequirementRule | undefined> = {
  letter_of_authorization: undefined,
  product_safety_ukca: undefined,
  insurance_certificate: undefined,
  brand_registry_confirmation: undefined,
  baby_product_safety: {
    condition: 'isBaby',
    conditionDescription: 'Requires a Baby-category product intended for children.',
    rationale: 'Child-safety conformity (EN 71 / EN 1888) applies to every child-facing item.',
  },
  cosmetic_notification_cpnp: {
    condition: 'isCosmetic',
    conditionDescription: 'Requires a cosmetic/personal-care product.',
    rationale: 'Cosmetic products must hold a valid CPNP/SCNP notification before UK supply.',
  },
  food_contact_material: {
    condition: 'touchesFood',
    conditionDescription: 'Requires a product that contacts food.',
    rationale: 'Food-contact materials must be declared compliant under UK food-contact rules.',
  },
  weee_compliance: {
    condition: 'isElectrical',
    conditionDescription: 'Requires an electrical/electronic product.',
    rationale: 'Producers of electrical equipment must be registered for WEEE take-back.',
  },
  type_approval: {
    condition: 'isAutomotive',
    conditionDescription: 'Requires a vehicle/automotive part.',
    rationale: 'Automotive components require type-approval documentation for UK supply.',
  },
  food_safety_certificate: {
    condition: 'isPerishable',
    conditionDescription: 'Requires a perishable food product.',
    rationale: 'Perishable food lines require a recognised food-safety certification (HACCP/BRC).',
  },
  textile_labelling_compliance: {
    condition: 'isTextile',
    conditionDescription: 'Requires a textile/apparel product.',
    rationale: 'Textile goods must carry compliant fibre-composition labelling.',
  },
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

  // §M2 — evaluate against the LATEST version of each requirement. With one
  // record per type (every pre-M2 record and every seeded document) this is
  // identical to the previous `find()`; once a brand replaces a rejected
  // document, the replacement — not the superseded version — is what the gate
  // must judge.
  const latest = latestDocumentsByType(docs);

  for (const type of requiredTypes) {
    const record = latest.get(type);
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

/* ── §M2 — Requirement resolution (rule-driven, fail-closed) ──────────────── */

/**
 * Every requirement applicable to a brand/category, as explicit rules.
 * Universal rules first, then category rules — the same ORDER the gate has
 * always evaluated, so no behaviour shifts.
 */
export function getComplianceRequirements(category?: ApprovedCategory): ComplianceRequirement[] {
  const universal: ComplianceRequirement[] = BASE_REQUIRED_DOCUMENTS.map((type) => ({
    type,
    scope: 'universal' as const,
    rationale:
      BASE_REQUIREMENT_RATIONALE[type] ??
      'Required for every brand operating through Mercenta.',
  }));
  const categoryDocs = category ? CATEGORY_SPECIFIC_DOCUMENTS[category] ?? [] : [];
  const conditional: ComplianceRequirement[] = categoryDocs.map((type) => {
    const rule = CATEGORY_REQUIREMENT_RULES[type];
    return {
      type,
      scope: rule ? ('conditional' as const) : ('category' as const),
      rationale: rule?.rationale ?? 'Required for this product category.',
      ...(rule
        ? { condition: rule.condition, conditionDescription: rule.conditionDescription }
        : {}),
    };
  });
  return [...universal, ...conditional];
}

/**
 * The requirements that ACTUALLY apply, given whatever the platform positively
 * knows about the product. A conditional requirement is dropped ONLY when its
 * signal is explicitly `false`; unknown signals leave it required (fail-closed).
 */
export function getApplicableRequirements(
  category?: ApprovedCategory,
  context?: ComplianceProductContext
): ComplianceRequirement[] {
  return getComplianceRequirements(category).filter((req) => {
    if (req.scope !== 'conditional' || !req.condition || !context) return true;
    const signal = context[req.condition];
    return signal !== false;
  });
}

/**
 * §M2 — context-aware required document types. With no context this returns
 * exactly `getRequiredDocumentsForCategory(category)` (the existing canonical
 * answer), so every existing caller and test is unchanged.
 */
export function getRequiredDocumentsForContext(
  category: ApprovedCategory,
  context?: ComplianceProductContext
): ComplianceDocument['type'][] {
  return getApplicableRequirements(category, context).map((r) => r.type);
}

/**
 * §M2 — the requirement a single document type satisfies, including WHY it is
 * required. Used by the brand-facing standing view and the audit trail.
 */
export function requirementForDocumentType(
  type: ComplianceDocument['type'],
  category?: ApprovedCategory
): ComplianceRequirement | undefined {
  return getComplianceRequirements(category).find((r) => r.type === type);
}

/** §M2 — document states that BLOCK the gate (everything except `approved`). */
export const BLOCKING_COMPLIANCE_DOC_STATUSES: ComplianceDocument['status'][] = [
  'missing',
  'uploaded',
  'under_review',
  'rejected',
  'superseded',
  'expiring',
  'expired',
];

/**
 * §M2 — the canonical, brand-facing standing: exactly what is required, what is
 * in each review state, what needs replacing, and what is blocking. Derived from
 * the canonical gate rule — never a second hand-maintained list.
 */
export interface BrandComplianceStanding {
  cleared: boolean;
  required: ComplianceDocument['type'][];
  approved: ComplianceDocument['type'][];
  missing: ComplianceDocument['type'][];
  underReview: ComplianceDocument['type'][];
  failed: ComplianceDocument['type'][];
  needsReplacement: ComplianceDocument['type'][];
  superseded: ComplianceDocument['type'][];
  blocking: { type: string; status: string; reason: string }[];
  agreementSigned: boolean;
  agreementsAccepted: boolean;
}

export function describeBrandComplianceStanding(
  docs: ComplianceDocument[],
  evaluation: GateEvaluation,
  required: ComplianceDocument['type'][]
): BrandComplianceStanding {
  const byType = new Map(docs.map((d) => [d.type as string, d]));
  const group = (statuses: ComplianceDocument['status'][]) =>
    required.filter((t) => {
      const d = byType.get(t);
      return d ? statuses.includes(d.status) : false;
    });
  return {
    cleared: evaluation.cleared,
    required,
    approved: group(['approved']),
    missing: required.filter((t) => !byType.has(t)),
    underReview: group(['uploaded', 'under_review', 'expiring']),
    failed: group(['rejected']),
    needsReplacement: group(['rejected', 'expired']),
    superseded: group(['superseded']),
    blocking: evaluation.blocking.map((b) => ({
      type: b.type,
      status: b.status,
      reason:
        b.status === 'rejected'
          ? 'verification failed — replacement required'
          : b.status === 'superseded'
            ? 'superseded by a newer version'
            : b.status === 'under_review' || b.status === 'uploaded'
              ? 'under verification'
              : b.status === 'expired'
                ? 'the document has expired'
                : 'not approved',
    })),
    agreementSigned: evaluation.agreementSigned,
    agreementsAccepted: evaluation.logisticsSlaAccepted && evaluation.chargebackIndemnityAccepted,
  };
}


/**
 * §M2 — THE canonical per-requirement view: for each document type, the LATEST
 * version on file. A brand may hold several versions of the same requirement
 * (a rejected document and its replacement); every consumer that asks "what is
 * the state of this requirement?" must read the latest, never an older record.
 *
 * Tie-break is deterministic: higher `version` wins, then later array position.
 */
export function latestDocumentsByType<T extends { type: string; version?: number }>(
  docs: T[]
): Map<string, T> {
  const map = new Map<string, T>();
  docs.forEach((doc, index) => {
    const current = map.get(doc.type);
    if (!current) {
      map.set(doc.type, doc);
      return;
    }
    const currentVersion = current.version ?? 1;
    const docVersion = doc.version ?? 1;
    if (docVersion > currentVersion) map.set(doc.type, doc);
    else if (docVersion === currentVersion) {
      const currentIndex = docs.indexOf(current);
      if (currentIndex < index) map.set(doc.type, doc);
    }
  });
  return map;
}

