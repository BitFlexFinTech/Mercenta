/**
 * §Phase 2 §18 — WHAT THE BRAND IS ASKED FOR, AND WHY.
 *
 * "Never make the brand know something Mercenta can teach them." This module
 * turns a canonical readiness record into the exact, customer-facing action list:
 * which commercial fields the brand must supply or confirm, why Mercenta is
 * asking NOW (the evaluated condition that produced the request), and the real
 * Knowledge Base article that explains the concept.
 *
 * It exposes ONLY customer-facing information: no internal score, no risk note,
 * no founder-only intelligence and no other tenant's data.
 */
import type { CommercialReadinessRecord } from '@/types';
import {
  COMMERCIAL_BRAND_CONDITION_GUIDANCE,
  COMMERCIAL_BRAND_ROUTE_GUIDANCE,
  COMMERCIAL_BRAND_TERM_GUIDANCE,
  type CommercialBrandGuidance,
  type CommercialConditionId,
  type CommercialTermFieldId,
} from '@/config/commercialReadiness';

export interface BrandActionField {
  field: CommercialTermFieldId;
  label: string;
  guidance: CommercialBrandGuidance;
  /** The evaluated conditions that make this field necessary right now. */
  becauseOf: CommercialConditionId[];
  /** True when a value is recorded but rests on an assumption and must be confirmed. */
  confirmExisting: boolean;
  /** The value already on record, when there is one. */
  currentValue: number | string | null;
}

/** Which fields each declared condition needs the brand to settle. */
const CONDITION_FIELDS: Record<CommercialConditionId, CommercialTermFieldId[]> = {
  required_terms_present: [],
  terms_are_evaluable: [],
  economics_supportive: ['expected_uk_retail', 'wholesale_cost'],
  moq_supports_intended_volume: ['moq'],
  pack_mathematics_valid: ['case_pack', 'master_carton'],
  supply_capacity_supports_demand: ['supply_capacity'],
  lead_time_within_agreed_limit: ['production_lead_time'],
};

/**
 * The fields the brand must act on, in a stable declared order, with the reason.
 * Derived ONLY from the record's own evaluated conditions — nothing is invented.
 */
export function brandActionFields(record: CommercialReadinessRecord): BrandActionField[] {
  const needs = new Map<CommercialTermFieldId, Set<CommercialConditionId>>();

  const add = (field: CommercialTermFieldId, because: CommercialConditionId) => {
    const set = needs.get(field) ?? new Set<CommercialConditionId>();
    set.add(because);
    needs.set(field, set);
  };

  for (const id of record.missingTermFieldIds) add(id, 'required_terms_present');

  for (const c of record.conditions) {
    const needsAction = !c.met || c.notEvaluatedReason !== null;
    if (!needsAction) continue;
    for (const field of CONDITION_FIELDS[c.id as CommercialConditionId] ?? []) {
      add(field, c.id as CommercialConditionId);
    }
  }

  // A value recorded on an assumption has to be confirmed, not re-supplied blindly.
  for (const t of record.terms) {
    if (t.basis === 'assumed' || t.basis === 'unknown') add(t.field, 'terms_are_evaluable');
  }

  return [...needs.entries()]
    .map(([field, conditions]) => {
      const current = record.terms.find((t) => t.field === field) ?? null;
      const def = current?.label ?? field;
      return {
        field,
        label: def,
        guidance: COMMERCIAL_BRAND_TERM_GUIDANCE[field],
        becauseOf: [...conditions],
        confirmExisting: Boolean(current && (current.basis === 'assumed' || current.basis === 'unknown')),
        currentValue: current?.value ?? null,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}

export interface BrandOutcomeSummary {
  headline: string;
  explanation: string;
  nextStep: string;
  /** Plain-language reasons, one per unmet/unevaluable condition. */
  reasons: { label: string; what: string; why: string; action: string; articleId: string }[];
  /** True when the brand has something to do right now. */
  brandActionRequired: boolean;
}

/** The customer-facing outcome for ONE record. Never exposes internal data. */
export function brandOutcomeSummary(record: CommercialReadinessRecord): BrandOutcomeSummary {
  const route = COMMERCIAL_BRAND_ROUTE_GUIDANCE[record.route];
  const reasons = record.conditions
    .filter((c) => !c.met || c.notEvaluatedReason !== null)
    .map((c) => {
      const g = COMMERCIAL_BRAND_CONDITION_GUIDANCE[c.id as CommercialConditionId];
      return { label: c.label, what: g.what, why: g.why, action: g.action, articleId: g.articleId };
    });
  const fields = brandActionFields(record);
  return {
    headline: route.headline,
    explanation: route.explanation,
    nextStep: record.nextStep,
    reasons,
    brandActionRequired: fields.length > 0,
  };
}

/** The number of steps the brand can see progressing (used for a progress display). */
export function brandProgress(record: CommercialReadinessRecord): {
  total: number;
  satisfied: number;
  percent: number;
} {
  const total = record.conditions.length;
  const satisfied = record.conditions.filter((c) => c.met).length;
  return { total, satisfied, percent: total === 0 ? 0 : Math.round((satisfied / total) * 100) };
}