/**
 * §P13 / S8 — THE ONBOARDING SURFACES, AND THE LINK TO THE ONBOARDING RECORD.
 *
 * S6 repointed the BRAND surfaces and S7 the ADMIN surfaces onto the rule's ONE
 * owner. S8 does the same for the surfaces that TEACH the rule — the brand's
 * onboarding — where the rule was re-typed in SEVEN places and, in four of them,
 * an unsupported consequence was asserted as if the channel documented it:
 *
 *   1. `src/config/tours/tourDefinitions.ts` — the orientation step (*"within 24 hours
 *      or it will be flagged. A flagged PO may result in a vendor performance
 *      deduction"*), the `po-24-hour-rule` step (*"the PO is flagged and may result in
 *      a deduction from the retail channel"*) and the `po-reject-reason` step, which
 *      named three reason codes that are NOT the channel's documented ones;
 *   2. `src/components/shared/TourLoader.tsx` — the legacy Usertour path's
 *      *"Rejection affects your vendor performance"*;
 *   3. `src/types.ts` TOUR_STEPS — the same blurb a second time;
 *   4. `src/data/knowledgeBase.ts` `kb-purchase-orders` — the article BOTH
 *      acknowledgement tour steps link to via `learnMore`, whose body read *"An
 *      unacknowledged order after 24 hours is flagged and can lead to a
 *      vendor-performance deduction."*;
 *   5. `src/components/shared/BrandGuidance.tsx` — the wizard's required
 *      operational-guidance step: an invented *"vendor performance score"*, an
 *      *"ASIN Confirmation Rate … Below 80% triggers review … can delist ASINs"*
 *      threshold, and a hand-typed second copy of `PO_REJECTION_CODES`;
 *   6. `src/components/brand/OnboardingWizard.tsx` — the step intro's *"PO rejections
 *      affect your vendor performance"*.
 *
 * Those claims are recorded as UNSUPPORTED in the platform's own discrepancy register
 * (`docs/AMAZON_RECONCILIATION_STATUS.md` AV-003 — *"No Amazon source reached
 * documents a vendor performance rating or its triggers"*), and the founder directive
 * is that Mercenta invents NOTHING in the channel's purchase-order process.
 *
 * The onboarding surfaces now render ONE derived, config-owned statement
 * (`PO_ACK_ONBOARDING_STATEMENT`), and the brand's acknowledgement of it is no longer
 * local component state: it is a canonical, audited act on the onboarding record
 * (`onboardingLifecycle.acknowledgePurchaseOrderRules`) — the LINK between the
 * onboarding and the purchase-order obligation it creates.
 *
 * Proves, against the REAL modules (no mocks), with `fetch` sabotaged before any
 * module loads.
 */
import { createServer } from 'vite';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/* §6 — no live call is possible anywhere in this run. */
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

/** §6 rule — the OLD contract is recorded inline, so comments are not code. */
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
const src = (p) => readFileSync(p, 'utf8');
const code = (p) => stripComments(src(p));

const cfg = await server.ssrLoadModule('/src/config/purchaseOrders.ts');
const tours = await server.ssrLoadModule('/src/config/tours/tourDefinitions.ts');
const kb = await server.ssrLoadModule('/src/data/knowledgeBase.ts');
const typesMod = await server.ssrLoadModule('/src/types.ts');
const acq = await server.ssrLoadModule('/src/lib/acquisition/outreachLifecycle.ts');
const acqStore = await server.ssrLoadModule('/src/data/acquisitionStore.ts');
const prospectStore = await server.ssrLoadModule('/src/data/prospectStore.ts');
const demoStore = await server.ssrLoadModule('/src/data/demoStore.ts');
const onb = await server.ssrLoadModule('/src/lib/onboarding/onboardingLifecycle.ts');

const TOURS_SRC = src('src/config/tours/tourDefinitions.ts');
const TOURS = code('src/config/tours/tourDefinitions.ts');
const LOADER_SRC = src('src/components/shared/TourLoader.tsx');
const LOADER = code('src/components/shared/TourLoader.tsx');
const TYPES_SRC = src('src/types.ts');
const KB_SRC = src('src/data/knowledgeBase.ts');
const GUIDANCE_SRC = src('src/components/shared/BrandGuidance.tsx');
const GUIDANCE = code('src/components/shared/BrandGuidance.tsx');
const WIZARD_SRC = src('src/components/brand/OnboardingWizard.tsx');
const WIZARD = code('src/components/brand/OnboardingWizard.tsx');
const CTX = code('src/context/GlobalStateContext.tsx');
const PIPELINE = code('src/components/admin/OnboardingPipeline.tsx');

const S = cfg.PO_ACK_ONBOARDING_STATEMENT;


/* ── A. ONE OWNER — the statement is DERIVED, never re-typed ─────────────────── */
test(
  'the onboarding statement carries the rule’s OWN config text verbatim',
  S.ruleText === cfg.PO_ACK_WINDOW_RULE_TEXT
);
test(
  'the statement is declared BY REFERENCE (rule text and codes)',
  /PO_ACK_ONBOARDING_STATEMENT = \{/.test(code('src/config/purchaseOrders.ts')) &&
    /ruleText: PO_ACK_WINDOW_RULE_TEXT/.test(code('src/config/purchaseOrders.ts')) &&
    /rejectionCodes: PO_REJECTION_CODES/.test(code('src/config/purchaseOrders.ts'))
);
test(
  'the short form is derived from the window constant (no hand-typed window)',
  (() => {
    /**
     * §BATCH 2j (`AV-009` / `AV-010b`) — REPOINTED, never weakened. The old contract
     * recorded here: this split took EVERYTHING after
     * `PO_ACK_ONBOARDING_STATEMENT = {` to the end of the FILE, so the moment any later
     * declaration in the same config contained the digits of the window (Batch 2j added
     * the on-hold rule, whose text says "24-hour"), the check failed without the
     * statement itself having changed at all. The assertion it MEANS to make is about
     * the STATEMENT'S OWN BODY, so it now reads exactly that: from the statement to its
     * closing `} as const;`. A hand-typed window INSIDE the statement still fails.
     */
    const decl =
      (code('src/config/purchaseOrders.ts').split('PO_ACK_ONBOARDING_STATEMENT = {')[1] ?? '').split(
        '} as const;'
      )[0] ?? '';
    return (
      S.shortText.includes(String(cfg.PO_ACKNOWLEDGEMENT_HOURS)) &&
      /\$\{PO_ACKNOWLEDGEMENT_HOURS\}/.test(decl) &&
      !/\b24\b/.test(decl)
    );
  })()
);
test(
  'the schedule in the statement is derived from the notification array',
  cfg.PO_ACK_NOTIFICATION_HOURS.every((h) => S.text.includes(String(h))) &&
    S.text.includes(cfg.PO_ACK_NOTIFICATION_HOURS.join('/'))
);
test(
  'Mercenta’s own process is LABELLED as Mercenta’s, never as a channel rule',
  /Mercenta's own operating process, not channel rules/.test(S.text) &&
    /Mercenta's own operating process, not channel rules/.test(S.mercentaProcess)
);
test(
  'the rejection reasons are the config/types-owned array (identity, not a copy)',
  S.rejectionCodes === typesMod.PO_REJECTION_CODES
);
test(
  'the ONE paragraph is composed from the rule text and the process sentence',
  S.text.includes(S.ruleText) && S.text.includes('Mercenta reminds you at')
);
test(
  'the statement asserts NO invented consequence anywhere in it',
  !/flagged|vendor performance|delist/i.test(`${S.text} ${S.shortText} ${S.mercentaProcess}`)
);

/* ── B. THE ONBOARDING SURFACES CONSUME THE OWNER ────────────────────────────── */
const orientationStep = tours.ORIENTATION_TOUR.steps.find((s) => s.id === 'orientation-purchase-orders');
const windowStep = tours.PO_ACKNOWLEDGMENT_TOUR.steps.find((s) => s.id === 'po-24-hour-rule');
const reasonStep = tours.PO_ACKNOWLEDGMENT_TOUR.steps.find((s) => s.id === 'po-reject-reason');

test(
  'the guided tours import the statement from its config owner',
  /import \{ PO_ACK_ONBOARDING_STATEMENT \} from '@\/config\/purchaseOrders'/.test(TOURS)
);
test(
  'the orientation PO step renders the OWNER’s paragraph (no re-typed rule)',
  !!orientationStep && orientationStep.description.includes(S.text)
);
test(
  'the PO tour’s 24-hour step renders the OWNER’s paragraph',
  !!windowStep && windowStep.description.includes(S.text)
);
test(
  'the rejection step renders the channel’s DOCUMENTED codes from the owner',
  !!reasonStep &&
    S.rejectionCodes.every((c) => reasonStep.description.includes(c)) &&
    !/Out of stock|Discontinued|Price dispute/.test(TOURS)
);
test(
  'no acknowledgement step re-types the window as prose any more',
  !/within 24 hours of receipt|24 hours to acknowledge/i.test(TOURS)
);
test(
  'the legacy tour loader renders the owner’s short form',
  /import \{ PO_ACK_ONBOARDING_STATEMENT \}/.test(LOADER) &&
    /PO_ACK_ONBOARDING_STATEMENT\.shortText/.test(LOADER)
);
const kbPo = kb.KB_ARTICLES.find((a) => a.id === 'kb-purchase-orders');
test(
  'the knowledge-base article the acknowledgement tours LINK TO teaches the SAME rule',
  !!kbPo && kbPo.summary === S.shortText && kbPo.sections.some((s) => s.body === S.text)
);
test(
  'its title is derived from the window constant (never hand-typed)',
  !!kbPo && kbPo.title.includes(String(cfg.PO_ACKNOWLEDGEMENT_HOURS))
);
test(
  'its rejection-reason section renders the owner’s codes',
  !!kbPo && kbPo.sections.some((s) => S.rejectionCodes.every((c) => s.body.includes(c)))
);
test(
  'the guidance step renders the config-owned rejection codes (no hand-typed prose list)',
  /import \{ PO_REJECTION_CODES \} from '@\/types'/.test(GUIDANCE) &&
    /PO_REJECTION_CODES\.join\(' · '\)/.test(GUIDANCE) &&
    !/TemporarilyUnavailable, InvalidProductIdentifier/.test(GUIDANCE)
);
test(
  'the guidance step no longer asserts an invented consequence as code',
  !/vendor performance score|delist ASINs|Below 80%|ASIN Confirmation Rate/i.test(GUIDANCE)
);
test(
  'the wizard’s guidance step renders the owner’s rule and process',
  /PO_ACK_ONBOARDING_STATEMENT\.ruleText/.test(GUIDANCE) &&
    /PO_ACK_ONBOARDING_STATEMENT\.mercentaProcess/.test(GUIDANCE)
);
test(
  'the wizard step intro no longer asserts an invented consequence',
  !/vendor performance/i.test(WIZARD)
);

/* ── C. THE OLD CONTRACT SURVIVES INLINE (§REPOINTED records are required) ───── */
test(
  'the tours record the OLD orientation wording inline',
  /it will be flagged\. A flagged PO may result in a vendor performance/.test(TOURS_SRC)
);
test(
  'the tours record the OLD rejection-code wording inline',
  /Out of stock[\s\S]{0,40}Discontinued[\s\S]{0,40}Price dispute/.test(TOURS_SRC)
);
test(
  'the knowledge-base article records its OLD body inline',
  /flagged and can lead to a[\s\S]{0,40}vendor-performance deduction/.test(KB_SRC)
);
test(
  'the guidance step records its OLD metric rows inline',
  /ASIN Confirmation Rate[\s\S]{0,220}delist ASINs/.test(GUIDANCE_SRC) &&
    /vendor[\s\S]{0,20}performance score/.test(GUIDANCE_SRC)
);
test(
  'the legacy TOUR_STEPS constant records its OLD blurb inline',
  /rejection affects your[\s\S]{0,20}vendor[\s\S]{0,20}performance/.test(TYPES_SRC)
);
test(
  'the legacy tour loader records its OLD blurb inline',
  /Rejection affects your vendor performance/.test(LOADER_SRC)
);
test(
  'the wizard intro records its OLD wording inline',
  /affect your[\s\S]{0,30}vendor performance is essential/.test(WIZARD_SRC)
);

/* ── D. NO INVENTED CONSEQUENCE REMAINS AS CODE ANYWHERE IN src/ ─────────────── */
function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}
const INVENTED = [
  /vendor performance/i,
  /will be flagged|flagged (?:PO|purchase order)|flagged and can lead/i,
  /delist ASIN/i,
];
/**
 * §S8 — the first version of this check missed a JSX text node whose phrase was WRAPPED
 * ACROSS TWO LINES ("affect my vendor\n performance"), which the S8 functional spec
 * caught in the browser. Whitespace is therefore NORMALISED before matching, so a
 * wrapped copy cannot hide from the gate.
 */
const offenders = walk('src')
  .map((f) => ({ f, body: stripComments(readFileSync(f, 'utf8')).replace(/\s+/g, ' ') }))
  .filter(({ body }) => INVENTED.some((re) => re.test(body)))
  .map(({ f }) => f);
test(
  'no src file still asserts the unsupported vendor-performance/flagged consequence as CODE',
  offenders.length === 0,
  offenders.join(', ')
);

/* ── E. THE LINK — the acknowledgement is a canonical, audited act ───────────── */
test(
  'the onboarding owner exports the acknowledgement writer and its audit action',
  typeof onb.acknowledgePurchaseOrderRules === 'function' &&
    onb.PO_RULES_ACKNOWLEDGEMENT_ACTION === 'onboarding_po_rules_acknowledged'
);
test(
  'the writer stores the rule’s OWN config text (never a copy composed in the domain)',
  /poRulesRuleText: PO_ACK_WINDOW_RULE_TEXT/.test(code('src/lib/onboarding/onboardingLifecycle.ts'))
);
test(
  'the wizard passes the acknowledgement EXPLICITLY (never assumed)',
  /completeOnboarding\(\{ poRulesAcknowledged: guidanceAck \}\)/.test(WIZARD) &&
    /completeOnboarding: \(opts\?: \{ poRulesAcknowledged\?: boolean \}\) => void/.test(CTX)
);
test(
  'the wizard’s guidance step is the REQUIRED step that sets it',
  /requireAck/.test(WIZARD) && /if \(step === 6\) return guidanceAck;/.test(WIZARD)
);
test(
  'the admin pipeline renders the LINK in both states (never a silent absence)',
  /data-onboarding-po-rules="acknowledged"/.test(PIPELINE) &&
    /data-onboarding-po-rules="outstanding"/.test(PIPELINE) &&
    /data-po-rules-text=/.test(PIPELINE)
);

/* Real canonical record through the REAL acquisition workflow (no fixtures). */
const STAFF = { staffId: 'staff-001', canMutate: true };
acqStore.resetAcquisitionStore();
prospectStore.resetProspectStore();
const outreach = acq.prepareOutreach('prospect-tapatio', STAFF);
acq.approveOutreach(outreach.value.record.id, STAFF);
await acq.sendOutreach(outreach.value.record.id, STAFF);
await acq.simulateResponse('prospect-tapatio', STAFF);
const created = acq.createOpportunityFromResponse('prospect-tapatio', STAFF);
acq.setOpportunityStage(created.value.id, 'qualified', STAFF);
const record = onb.beginBrandOnboarding(created.value.id, STAFF).value;

test(
  'an unacknowledged onboarding record claims NOTHING (fail-closed)',
  !!record && !record.poRulesAcknowledgedAt && !record.poRulesRuleText
);
test(
  'a VIEW-ONLY actor is refused (RBAC in the domain, not by hiding a control)',
  (() => {
    const r = onb.acknowledgePurchaseOrderRules(record.id, { staffId: 'staff-005', canMutate: false });
    return r.ok === false && /FORBIDDEN/.test(r.error);
  })()
);
test(
  'an unknown onboarding id is NOT_FOUND',
  (() => {
    const r = onb.acknowledgePurchaseOrderRules('onb-nope', STAFF);
    return r.ok === false && /NOT_FOUND/.test(r.error);
  })()
);
const otherTenant = onb.beginOnboardingForManualBrand(
  {
    name: 'Gate Other Brand',
    category: 'Home',
    country: 'United Kingdom',
    email: 'gate-other@example.invalid',
    signatory: 'Gate Tester',
    track: 'financed',
  },
  STAFF
).value;
test(
  'a brand-pinned session may NOT acknowledge another tenant’s record',
  (() => {
    const r = onb.acknowledgePurchaseOrderRules(record.id, {
      staffId: `brand:${otherTenant.brandId}`,
      canMutate: true,
      tenantId: otherTenant.brandId,
    });
    return r.ok === false && /CROSS_TENANT/.test(r.error);
  })()
);
test(
  'the brand session CAN acknowledge its OWN record (tenant-pinned, same tenant)',
  onb.acknowledgePurchaseOrderRules(record.id, {
    staffId: `brand:${record.brandId}`,
    canMutate: true,
    tenantId: record.brandId,
  }).ok === true
);
const acknowledged = acqStore.getOnboardingById(record.id);
test(
  'the record now carries the acknowledgement, the actor and the EXACT wording shown',
  !!acknowledged?.poRulesAcknowledgedAt &&
    acknowledged.poRulesAcknowledgedBy === `brand:${record.brandId}` &&
    acknowledged.poRulesRuleText === cfg.PO_ACK_WINDOW_RULE_TEXT
);
test(
  'the acknowledgement is in the ONE platform audit log, with the real tenant',
  demoStore.demoAuditLog.some(
    (a) =>
      a.action === onb.PO_RULES_ACKNOWLEDGEMENT_ACTION &&
      a.entityId === record.id &&
      a.brandId === record.brandId
  )
);
test(
  'the acknowledgement is on the acquisition relationship timeline',
  acqStore
    .getAcquisitionEvents('prospect-tapatio')
    .some((e) => e.type === 'onboarding_po_rules_acknowledged')
);
const auditBefore = demoStore.demoAuditLog.filter(
  (a) => a.action === onb.PO_RULES_ACKNOWLEDGEMENT_ACTION
).length;
const again = onb.acknowledgePurchaseOrderRules(record.id, STAFF);
test(
  'it is IDEMPOTENT — a repeated acknowledgement changes nothing and audits nothing twice',
  again.ok === true &&
    again.value.poRulesAcknowledgedAt === acknowledged.poRulesAcknowledgedAt &&
    demoStore.demoAuditLog.filter((a) => a.action === onb.PO_RULES_ACKNOWLEDGEMENT_ACTION).length ===
      auditBefore
);
test(
  'the rule text on the record IS the config owner’s text (one owner, proven twice)',
  acknowledged.poRulesRuleText === cfg.PO_ACK_WINDOW_RULE_TEXT && acknowledged.poRulesRuleText === S.ruleText
);
test('§6 — the whole run made ZERO network calls', fetchCalls === 0);

console.log(
  `\n${failures === 0 ? 'PO_ACK_ONBOARDING_SURFACES_VALIDATION_PASS' : 'PO_ACK_ONBOARDING_SURFACES_VALIDATION_FAIL'} — ${failures} failure(s)`
);
await server.close();
process.exit(failures === 0 ? 0 : 1);
