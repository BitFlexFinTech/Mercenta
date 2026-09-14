/**
 * §Canonical model §3 — THE TWO COMMERCIAL RELATIONSHIP MODELS.
 *
 * Mercenta is the intermediary/proxy/distribution layer between brands and the
 * retail channel. A brand's COMMERCIAL RELATIONSHIP with Mercenta is one of
 * exactly two models, chosen at onboarding and stored on the brand:
 *
 *   Model A — commission / agent-style
 *     The retail channel pays Mercenta; Mercenta keeps an agreed commission and
 *     the remainder is the brand's economic amount.
 *
 *   Model B — buy / resell / distribution
 *     Mercenta acquires the goods from the brand and resells into the retail
 *     channel; Mercenta's gross commercial spread is revenue minus the brand
 *     acquisition cost.
 *
 * ⚠️ NON-NEGOTIABLE SEPARATION (§3): the commercial model is INTERNAL between
 * Mercenta and the brand. It does NOT change the retail-channel COMPLIANCE
 * documentation a product needs. Retail-channel compliance is requirement-driven
 * (`src/lib/compliance.ts`) and is identical under either model — see
 * `RETAIL_CHANNEL_COMPLIANCE_IS_MODEL_INDEPENDENT` below, which is a declared
 * fact precisely so nothing can quietly couple the two.
 *
 * ⚠️ The exact legal/tax treatment of either model is an EXTERNAL accounting
 * decision. Nothing here is legal or tax advice, and no VAT is asserted by this
 * module (see `src/config/commercial.ts` + `src/config/vat.ts`).
 */

export type CommercialModel = 'commission_agent' | 'buy_resell';

export interface CommercialModelDefinition {
  id: CommercialModel;
  /** Operator/investor-facing name. */
  label: string;
  /** One-line description of the money mechanic. */
  summary: string;
  /** Whether Mercenta issues its OWN commercial PO/order to the brand (§5). */
  issuesMercentaBrandOrder: boolean;
  /** Documents that belong to THIS internal commercial relationship. */
  internalDocuments: readonly string[];
}

export const COMMERCIAL_MODELS: Record<CommercialModel, CommercialModelDefinition> = {
  commission_agent: {
    id: 'commission_agent',
    label: 'Model A — Commission / agent-style',
    summary:
      'The retail channel pays Mercenta. Mercenta retains an agreed commission; the remainder is the brand’s economic amount.',
    // Mercenta is the vendor of record, so the retail PO remains the external
    // document and Mercenta's own order to the brand is the internal one.
    issuesMercentaBrandOrder: true,
    internalDocuments: [
      'Mercenta–brand commercial agreement (commission terms)',
      'Commission schedule / rate card',
    ],
  },
  buy_resell: {
    id: 'buy_resell',
    label: 'Model B — Buy / resell / distribution',
    summary:
      'Mercenta acquires the goods from the brand and resells them into the retail channel. Mercenta’s gross commercial spread is retail-channel revenue minus the brand acquisition cost.',
    issuesMercentaBrandOrder: true,
    internalDocuments: [
      'Mercenta–brand purchase agreement (acquisition price)',
      'Mercenta purchase order issued to the brand',
      'Agreed cost schedule (shipping, fees, deductions)',
    ],
  },
};

/** Display order — Model A first (the canonical default example). */
export const COMMERCIAL_MODEL_ORDER: readonly CommercialModel[] = [
  'commission_agent',
  'buy_resell',
] as const;

/**
 * §3 — a DECLARED, testable fact: retail-channel compliance requirements do NOT
 * depend on the commercial model. If a future change ever couples them, this
 * constant is what the validator pins.
 */
export const RETAIL_CHANNEL_COMPLIANCE_IS_MODEL_INDEPENDENT = true;

/**
 * The commercial model chosen at onboarding. Stored on the brand's commercial
 * relationship; a brand with no selection recorded is reported as
 * `not_selected` rather than being silently assumed (§3 fails closed).
 */
export type CommercialModelSelection = CommercialModel | 'not_selected';

export function isCommercialModel(value: string | null | undefined): value is CommercialModel {
  return value === 'commission_agent' || value === 'buy_resell';
}

export interface ResolvedCommercialModel {
  model: CommercialModelSelection;
  /** False when the brand has no model recorded — callers must not guess. */
  selected: boolean;
  /** The model to DISPLAY for a demo/illustration when none is recorded. */
  illustrativeFallback: CommercialModel;
}

/**
 * Resolve a brand's commercial model. An UNRECORDED model resolves to
 * `not_selected` (fail-closed) — the illustrative fallback is reported
 * SEPARATELY and must never be presented as the brand's actual terms.
 */
export function resolveCommercialModel(
  recorded: string | null | undefined
): ResolvedCommercialModel {
  if (recorded && isCommercialModel(recorded)) {
    return { model: recorded, selected: true, illustrativeFallback: recorded };
  }
  return {
    model: 'not_selected',
    selected: false,
    illustrativeFallback: 'commission_agent',
  };
}

/* ── §5/M12 — MANDATORY AT ONBOARDING, CHANGED ONLY BY THE SUPER ADMIN ───── */

/**
 * §5 — a brand cannot finish onboarding without a commercial relationship
 * recorded (fail-closed). Declared as a fact so the onboarding gate and the
 * validators pin the same rule.
 */
export const COMMERCIAL_MODEL_SELECTION_IS_MANDATORY = true;

/**
 * §5/M12 — who may CHANGE a recorded model after onboarding. The founder is the
 * sole Super Admin; the change is always audited (`demoStore.setBrandCommercialModel`).
 */
export const COMMERCIAL_MODEL_CHANGEABLE_BY: readonly string[] = ['Super Admin'];

/** The operator-facing name of the fail-closed unselected state. */
export const COMMERCIAL_MODEL_NOT_SELECTED_LABEL = 'Not selected — commercial relationship required';

/** §4/§19 — the DEMO/illustrative Model A commission rate (20%). */
export const DEMO_COMMISSION_RATE_PCT = 20;

/** §4/§19 — the DEMO/illustrative Model B acquisition share (75% of revenue). */
export const DEMO_ACQUISITION_SHARE_PCT = 75;

/**
 * §5 — the onboarding gate. Returns a fail-closed verdict for whatever the brand
 * has recorded: an unrecorded/unknown value is REFUSED with the reason, never
 * silently defaulted.
 */
export function checkCommercialModelSelection(
  recorded: string | null | undefined
): { ok: true; model: CommercialModel; reason: string } | { ok: false; model: 'not_selected'; reason: string } {
  const resolved = resolveCommercialModel(recorded);
  if (!resolved.selected || !isCommercialModel(resolved.model)) {
    return {
      ok: false,
      model: 'not_selected',
      reason:
        'No commercial relationship has been recorded for this brand. Choose Model A (commission/agent-style) or Model B (buy/resell/distribution) before continuing — the platform never assumes one.',
    };
  }
  return {
    ok: true,
    model: resolved.model,
    reason: `Commercial relationship recorded: ${COMMERCIAL_MODELS[resolved.model].label}.`,
  };
}

/**
 * §5 — the REVERSE-CHECK on the separation rule. Given a retail-channel
 * requirement set computed for a category, the commercial model must not change
 * it. Returns true when both models yield byte-identical requirements. Used by
 * the compliance seam's own guard and by `validate-commercial-models.mjs`.
 */
export const COMMERCIAL_MODEL_CANNOT_CHANGE_COMPLIANCE = RETAIL_CHANNEL_COMPLIANCE_IS_MODEL_INDEPENDENT;
