/**
 * §Phase E3 — product COMPLETENESS (pure decision logic).
 *
 * The single source of truth for "what product information must exist before a
 * product may be submitted". This list is NOT invented: it is the exact
 * prerequisite set `src/data/api.ts → submitCatalogItem` has always enforced
 * before contacting the provider seam. It lives here so the submission
 * validation (api) and the completeness/readiness display (UI + lifecycle)
 * read the SAME list and cannot drift (rule: one source of truth).
 *
 * Zero imports beyond types; zero side effects.
 */
import type { ProductCompleteness } from '@/types';

/**
 * The submission prerequisites, in form order.
 *
 * `hazmat` is a BOOLEAN prerequisite: `false` is a supplied value, not a
 * missing one — exactly the semantics the pre-existing validation used.
 */
export const REQUIRED_SUBMISSION_FIELDS = [
  'commodityCode',
  'vatStatus',
  'hazmat',
  'length',
  'width',
  'height',
  'weight',
] as const;

export type RequiredSubmissionField = (typeof REQUIRED_SUBMISSION_FIELDS)[number];

/** Human labels for the prerequisite fields (single source for UI copy). */
export const REQUIRED_SUBMISSION_FIELD_LABELS: Record<RequiredSubmissionField, string> = {
  commodityCode: 'UK Trade Tariff / Commodity Code',
  vatStatus: 'VAT Status',
  hazmat: 'Hazardous materials declaration',
  length: 'Length',
  width: 'Width',
  height: 'Height',
  weight: 'Weight',
};

/**
 * Is a prerequisite value actually supplied?
 * The pre-existing rule: `undefined`, `null`, or the empty string are missing.
 * `false` and `0` are supplied values (a 0 dimension is still a declared value).
 */
function isSupplied(value: unknown): boolean {
  return value !== undefined && value !== null && value !== '';
}

/** The prerequisite fields still missing on a product payload. */
export function missingSubmissionFields(product: Record<string, unknown> | undefined): string[] {
  if (!product) return [...REQUIRED_SUBMISSION_FIELDS];
  return REQUIRED_SUBMISSION_FIELDS.filter((f) => !isSupplied(product[f]));
}

/**
 * Product completeness, derived — never hand-maintained.
 * `percent` is the honest share of prerequisites satisfied.
 */
export function evaluateProductCompleteness(
  product: Record<string, unknown> | undefined
): ProductCompleteness {
  const missing = missingSubmissionFields(product) as RequiredSubmissionField[];
  const total = REQUIRED_SUBMISSION_FIELDS.length;
  const satisfied = total - missing.length;
  return {
    complete: missing.length === 0,
    missing: [...missing],
    missingLabels: missing.map((f) => REQUIRED_SUBMISSION_FIELD_LABELS[f]),
    percent: Math.round((satisfied / total) * 100),
  };
}
