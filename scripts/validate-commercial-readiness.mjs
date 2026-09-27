// §Phase 2 — validates the COMPLETED commercial readiness + product economics
// delivery end to end, as a BUSINESS journey rather than a code shape:
//   A. the declared commercial vocabulary, work sources, SLAs and brand guidance
//   B. the four seeded canonical cases produce exactly the four declared routes
//   C. HAPPY PATH     — product → assessment → ready
//   D. MISSING INFO   — remediation → brand action → reassessment → progress
//   E. REMEDIATION    — correction → reassessment → ready
//   F. BLOCKED        — cannot incorrectly become ready
//   G. HUMAN REVIEW   — cannot silently become ready
//   H. DUPLICATE      — no duplicate record / work / event
//   I. FAILURE        — a refused submission does not report progress
//   J. RETRY          — idempotent business outcome
//   K. TENANT ISOLATION + RBAC
//   L. PERSISTENCE    — honest memory-only, hydrate never fabricates
//   M. DOWNSTREAM     — readiness connects forward to the next stage
//   N. AUDIT          — every state change is traceable
//   O. WORK           — outstanding actions are real work and resolve correctly
//   P. AUTOMATION     — registered, idempotent, never changes a commercial route
//   Q. ZERO live network for the whole run
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
let failures = 0;
let assertions = 0;
const test = (name, ok, detail = '') => {
  assertions += 1;
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};

/* ── ZERO NETWORK for the whole run ──────────────────────────────────────── */
let networkCalls = 0;
globalThis.fetch = async (...args) => {
  networkCalls++;
  throw new Error(`NO LIVE NETWORK ALLOWED IN VALIDATION: ${String(args[0])}`);
};

try {
  const cfg = await server.ssrLoadModule('/src/config/commercialReadiness.ts');
  const store = await server.ssrLoadModule('/src/data/commercialReadinessStore.ts');
  const recorder = await server.ssrLoadModule('/src/lib/commercial/commercialReadinessRecorder.ts');
  const routing = await server.ssrLoadModule('/src/data/routingStore.ts');
  const events = await server.ssrLoadModule('/src/lib/events/eventFeed.ts');
  const work = await server.ssrLoadModule('/src/lib/work/workStore.ts');
  const preAudit = await server.ssrLoadModule('/src/data/preAuditStore.ts');
  const automation = await server.ssrLoadModule('/src/lib/automation/registry.ts');
  const demoData = await server.ssrLoadModule('/src/data/demoData.ts');
  const demoStore = await server.ssrLoadModule('/src/data/demoStore.ts');
  const kb = await server.ssrLoadModule('/src/data/knowledgeBase.ts');
  const seed = await server.ssrLoadModule('/src/data/commercialReadinessSeed.ts');

  const resetAll = () => {
    store.resetCommercialReadinessStore();
    routing.resetRoutingStore();
    events.resetEvents();
    work.resetWorkStore();
    preAudit.resetPreAuditStore();
  };

  resetAll();
  const all = store.allCommercialReadinessRecords();
  const counts = store.commercialReadinessCounts();
  /**
   * §O — the work set as it stands IMMEDIATELY after the canonical seed, before
   * any validator journey mutates a route. This is what proves a remediation
   * record genuinely raised DERIVED work and that the brand action later removes
   * it (asserted separately in O3).
   */
  const workAtSeed = work.getWorkItems('admin', null, { includeResolved: true }).map((w) => ({ ...w }));

  /* ── A. The declared commercial vocabulary ──────────────────────────────── */
  test(
    'A1 the declared commercial work sources are exactly remediation + review',
    cfg.COMMERCIAL_WORK_SOURCE_IDS.length === 2 &&
      cfg.COMMERCIAL_WORK_SOURCE_IDS.includes('commercial_remediation') &&
      cfg.COMMERCIAL_WORK_SOURCE_IDS.includes('commercial_review')
  );
  test(
    'A2 ready raises NO work; remediation is the brand action; blocked/review are Mercenta decisions',
    cfg.COMMERCIAL_WORK_BY_ROUTE.ready.source === null &&
      cfg.COMMERCIAL_WORK_BY_ROUTE.remediation.source === 'commercial_remediation' &&
      cfg.COMMERCIAL_WORK_BY_ROUTE.remediation.owner === 'brand' &&
      cfg.COMMERCIAL_WORK_BY_ROUTE.blocked.source === 'commercial_review' &&
      cfg.COMMERCIAL_WORK_BY_ROUTE.human_review.source === 'commercial_review' &&
      cfg.COMMERCIAL_WORK_BY_ROUTE.blocked.priority === 'critical'
  );
  test(
    'A3 every declared SLA is a positive whole number of days (never random)',
    Object.values(cfg.COMMERCIAL_WORK_BY_ROUTE).every(
      (d) => d.slaDays === null || (Number.isInteger(d.slaDays) && d.slaDays > 0)
    )
  );
  const termFields = cfg.COMMERCIAL_TERM_FIELDS.map((f) => f.id);
  const conditionIds = cfg.COMMERCIAL_CONDITIONS.map((c) => c.id);
  test(
    'A4 EVERY declared commercial term has brand-facing guidance',
    termFields.every((id) => Boolean(cfg.COMMERCIAL_BRAND_TERM_GUIDANCE[id]))
  );
  test(
    'A5 EVERY declared commercial condition has brand-facing guidance',
    conditionIds.every((id) => Boolean(cfg.COMMERCIAL_BRAND_CONDITION_GUIDANCE[id]))
  );
  test(
    'A6 every guidance entry names what/why/action and a REAL Knowledge Base article',
    [...Object.values(cfg.COMMERCIAL_BRAND_TERM_GUIDANCE), ...Object.values(cfg.COMMERCIAL_BRAND_CONDITION_GUIDANCE)].every(
      (g) =>
        Boolean(g.what && g.why && g.action) &&
        g.academyStage >= 1 &&
        g.academyStage <= 5 &&
        Boolean(kb.getKnowledgeArticle(g.articleId))
    )
  );
  test(
    'A7 every route has brand-facing route guidance',
    cfg.COMMERCIAL_VIABILITY_ROUTE_ORDER.every((r) => Boolean(cfg.COMMERCIAL_BRAND_ROUTE_GUIDANCE[r]?.headline))
  );
  test(
    'A8 NO commercial threshold is invented (every one ships UNSET)',
    Object.values(cfg.COMMERCIAL_THRESHOLDS).every((t) => t.configured === false && t.value === null) &&
      cfg.COMMERCIAL_THRESHOLD_UNSET_ROUTES_TO === 'human_review'
  );
  test(
    'A9 the brand-facing outcome never promises an order',
    cfg.COMMERCIAL_BRAND_OUTCOME_DISCLAIMER.includes('not a promise') &&
      cfg.COMMERCIAL_BRAND_OUTCOME_DISCLAIMER.includes('does not guarantee an order')
  );
  test(
    'A10 the declared lifecycle events are added to the EXISTING event union',
    cfg.COMMERCIAL_READINESS_EVENT_TYPES.length === 3 &&
      cfg.COMMERCIAL_READINESS_EVENT_TYPES.every((t) => Boolean(events.EVENT_SEVERITY_MAP[t]))
  );
  test(
    'A11 the readiness surface extends the EXISTING Super-Admin destination (no new dashboard)',
    cfg.COMMERCIAL_READINESS_SURFACE.adminDestination === 'control_centre' &&
      cfg.COMMERCIAL_READINESS_SURFACE.brandView === 'commercial_readiness'
  );

  /* ── B. The four seeded canonical cases ─────────────────────────────────── */
  test('B1 four canonical readiness records exist', counts.total === 4, `total=${counts.total}`);
  test(
    'B2 one record per declared route',
    counts.byRoute.ready === 1 &&
      counts.byRoute.remediation === 1 &&
      counts.byRoute.blocked === 1 &&
      counts.byRoute.human_review === 1,
    JSON.stringify(counts.byRoute)
  );
  const byBrand = (tenantId) => all.filter((r) => r.owner.kind === 'brand' && r.owner.tenantId === tenantId);
  test(
    'B3 each seeded case produces the route it declares',
    seed.COMMERCIAL_READINESS_DEMO_EXPECTATIONS.length === 4 &&
      seed.COMMERCIAL_READINESS_DEMO_EXPECTATIONS.every((e) => {
        const mine = byBrand(e.brandId);
        return mine.some((r) => r.route === e.expectedRoute);
      })
  );
  test(
    'B4 every record references a REAL Phase 1 assessment and supply profile',
    all.every((r) => {
      const a = preAudit.getPreAuditAssessment(r.assessmentId);
      return Boolean(a) && a.supplyProfile.id === r.supplyProfileId && r.supplyProfileId.length > 0;
    })
  );
  test(
    'B5 every record references a REAL canonical product',
    all.every((r) => demoData.DEMO_PRODUCTS.some((p) => p.id === r.productRef))
  );
  test(
    'B6 every record carries the MOQ disclaimer and a next step',
    all.every((r) => r.moqDisclaimer.length > 20 && r.nextStep.length > 5)
  );
  test(
    'B7 every record carries its evaluation trace (rule + observed value per condition)',
    all.every(
      (r) =>
        r.conditions.length === conditionIds.length &&
        r.conditions.every((c) => c.rule.length > 5 && c.observed.length > 0)
    )
  );
  test(
    'B8 every record retains the assessment basis, so a reassessment is reproducible',
    all.every((r) => r.assessmentInput !== null)
  );

  /* ── C. HAPPY PATH — product → assessment → ready ───────────────────────── */
  const ready = all.find((r) => r.route === 'ready');
  test(
    'C1 the ready product has NO unmet and NO unevaluable condition',
    ready.conditions.every((c) => c.met && c.notEvaluatedReason === null)
  );
  test('C2 the ready product reports zero missing inputs', ready.missingInputs.length === 0);
  test(
    'C3 the ready route proceeds and names the next declared stage',
    cfg.COMMERCIAL_VIABILITY_ROUTE_DEFINITIONS.ready.proceeds === true &&
      ready.nextStep === cfg.COMMERCIAL_VIABILITY_ROUTE_DEFINITIONS.ready.nextStep
  );
  const readyReassess = recorder.reassessCommercialReadiness(ready.id, 'staff:validator');
  test(
    'C4 re-running an unchanged assessment is SUPPRESSED, not re-decided',
    readyReassess.write.duplicateSuppressed === true &&
      readyReassess.routing.duplicateSuppressed === true &&
      readyReassess.write.record.route === 'ready'
  );

  /* ── D/E. MISSING INFO → brand action → reassessment → progress ─────────── */
  const remediation = all.find((r) => r.route === 'remediation');
  test(
    'D1 the remediation product names the genuinely missing REQUIRED field',
    remediation.missingTermFieldIds.includes('currency') &&
      remediation.conditions.some((c) => c.id === 'required_terms_present' && !c.met)
  );
  const beforeEvents = events.queryEvents({}).length;
  const step1 = recorder.submitCommercialTermsAndReassess(
    remediation.id,
    [{ field: 'currency', value: 'GBP', basis: 'actual' }],
    'brand:validator'
  );
  test(
    'D2 the brand action is accepted and the record is REASSESSED',
    step1.submission.ok === true &&
      step1.submission.accepted.includes('currency') &&
      step1.reassessment !== null &&
      step1.reassessment.write.revision === true
  );
  test(
    'D3 the reassessment records the route TRANSITION (remediation → later stage)',
    step1.reassessment.write.previousRoute === 'remediation' &&
      step1.reassessment.write.record.route !== 'remediation',
    `→ ${step1.reassessment.write.record.route}`
  );
  test(
    'D4 the reassessment keeps the SAME record (a reassessment is never a second record)',
    step1.reassessment.write.record.id === remediation.id &&
      store.allCommercialReadinessRecords().length === 4
  );
  test(
    'D5 the missing-field list SHRANK (the brand action moved the product on)',
    step1.reassessment.write.record.missingTermFieldIds.length < remediation.missingTermFieldIds.length
  );
  const afterStep1Events = events.queryEvents({}).length;
  test('D6 the brand action and reassessment are both on the canonical event feed', afterStep1Events > beforeEvents);

  /* ── E. REMEDIATION — correction → reassessment → READY ────────────────── */
  const step2 = recorder.submitCommercialTermsAndReassess(
    remediation.id,
    [
      { field: 'case_pack', value: 6, basis: 'actual' },
      { field: 'master_carton', value: 24, basis: 'actual' },
    ],
    'brand:validator'
  );
  test(
    'E1 supplying the pack information makes the carton arithmetic evaluable and VALID',
    step2.reassessment !== null &&
      step2.reassessment.evaluation.pack.valid === true &&
      step2.reassessment.evaluation.pack.unitsPerMasterCarton === 24
  );
  test(
    'E2 the product reaches READY through real brand actions alone',
    step2.reassessment.write.record.route === 'ready',
    `route=${step2.reassessment.write.record.route}`
  );
  test(
    'E3 the ready route after remediation has no unmet condition',
    step2.reassessment.write.record.conditions.every((c) => c.met)
  );

  /* ── F. BLOCKED — cannot incorrectly become ready ───────────────────────── */
  const blocked = all.find((r) => r.route === 'blocked');
  test(
    'F1 the blocked product is blocked by the OBSERVED economics (a definitively unmet condition)',
    blocked.conditions.some((c) => c.id === 'economics_supportive' && !c.met) && blocked.refused === false
  );
  const blockedStep = recorder.submitCommercialTermsAndReassess(
    blocked.id,
    [
      { field: 'currency', value: 'GBP', basis: 'actual' },
      { field: 'moq', value: 100, basis: 'actual' },
    ],
    'brand:validator'
  );
  test(
    'F2 supplying unrelated information does NOT make a blocked product ready',
    blockedStep.reassessment !== null && blockedStep.reassessment.write.record.route === 'blocked'
  );
  test(
    'F3 no route can be ready while a declared condition is unmet',
    blockedStep.reassessment.write.record.route !== 'ready' ||
      blockedStep.reassessment.write.record.conditions.every((c) => c.met)
  );

  /* ── G. HUMAN REVIEW — cannot silently become ready ─────────────────────── */
  const humanReview = all.find((r) => r.route === 'human_review');
  test(
    'G1 the human-review product has at least one UNEVALUABLE condition (fail closed)',
    humanReview.conditions.some((c) => c.notEvaluatedReason !== null) && humanReview.openQuestions.length > 0
  );
  const humanReassess = recorder.reassessCommercialReadiness(humanReview.id, 'staff:validator');
  test(
    'G2 a reassessment with unchanged information does NOT drift to ready',
    humanReassess.write.duplicateSuppressed === true && humanReassess.write.record.route === 'human_review'
  );
  test(
    'G3 the human-review route requires a human and is a refusal',
    cfg.COMMERCIAL_VIABILITY_ROUTE_DEFINITIONS.human_review.requiresHuman === true &&
      cfg.COMMERCIAL_VIABILITY_ROUTE_DEFINITIONS.human_review.refusal === true
  );

  /* ── H. DUPLICATE ACTION — no duplicate record / work / event ──────────── */
  const eventsBeforeDup = events.queryEvents({}).length;
  const auditBeforeDup = demoStore.demoAuditLog.filter((a) => a.entityType === 'commercial_readiness').length;
  const dup1 = recorder.submitCommercialTermsAndReassess(
    remediation.id,
    [{ field: 'case_pack', value: 6, basis: 'actual' }],
    'brand:validator'
  );
  test(
    'H1 repeating the SAME brand action is suppressed (no second business outcome)',
    dup1.unchanged === true &&
      dup1.submission.ok === false &&
      dup1.submission.ignored.length === 1 &&
      dup1.reassessment === null &&
      dup1.submission.reason.includes('Nothing changed')
  );
  test(
    'H2 the duplicate produced no second record, event or audit entry',
    store.allCommercialReadinessRecords().length === 4 &&
      events.queryEvents({}).length === eventsBeforeDup &&
      demoStore.demoAuditLog.filter((a) => a.entityType === 'commercial_readiness').length === auditBeforeDup
  );
  test(
    'H3 duplicate suppression is counted, so the behaviour is provable not assumed',
    store.commercialReadinessCounts().duplicatesSuppressed > 0
  );

  /* ── I. FAILURE — a refused submission never reports progress ───────────── */
  const routeBeforeFail = store.getCommercialReadinessRecord(humanReview.id).route;
  const fail = recorder.submitCommercialTermsAndReassess(
    humanReview.id,
    [
      { field: 'not_a_declared_field', value: 5, basis: 'actual' },
      { field: 'moq', value: 500, basis: 'assumed' },
      { field: 'rrp', value: null, basis: 'actual' },
    ],
    'brand:validator'
  );
  test(
    'I1 an undeclared field, an assumed basis and an empty value are ALL refused',
    fail.submission.ok === false && fail.submission.refused.length === 3 && fail.reassessment === null
  );
  test(
    'I2 a refused submission leaves the commercial route untouched (no fake progress)',
    store.getCommercialReadinessRecord(humanReview.id).route === routeBeforeFail
  );
  const missingRecord = recorder.reassessCommercialReadiness('commercial-readiness-nope', 'staff:validator');
  test('I3 reassessing an unknown record fails explicitly rather than inventing one', missingRecord === null);

  /* ── J. RETRY — idempotent business outcome ────────────────────────────── */
  const workBeforeRetry = work.getWorkItems('admin', null, { includeResolved: true }).map((w) => w.id).sort();
  const retry1 = recorder.reassessCommercialReadiness(humanReview.id, 'staff:validator');
  const retry2 = recorder.reassessCommercialReadiness(humanReview.id, 'staff:validator');
  const workAfterRetry = work.getWorkItems('admin', null, { includeResolved: true }).map((w) => w.id).sort();
  test(
    'J1 a retry produces no new routing decision, no new record and no new work',
    retry1.write.duplicateSuppressed === true &&
      retry2.write.duplicateSuppressed === true &&
      store.allCommercialReadinessRecords().length === 4 &&
      JSON.stringify(workBeforeRetry) === JSON.stringify(workAfterRetry)
  );

  /* ── K. TENANT ISOLATION + RBAC ─────────────────────────────────────────── */
  const brandA = demoData.DEMO_MODEL_A_BRAND_ID;
  const brandB = demoData.DEMO_MODEL_B_BRAND_ID;
  const scopeA = store.readinessRecordsForScope({ kind: 'brand', tenantId: brandA });
  const scopeB = store.readinessRecordsForScope({ kind: 'brand', tenantId: brandB });
  const scopeOps = store.readinessRecordsForScope({ kind: 'ops' });
  test('K1 a brand scope sees only its own two records', scopeA.length === 2 && scopeB.length === 2);
  test('K2 no brand can see another brand’s commercial data', !scopeA.some((r) => r.owner.tenantId === brandB) &&
    !scopeB.some((r) => r.owner.tenantId === brandA));
  test('K3 ops sees every record', scopeOps.length === 4);
  test(
    'K4 the visibility rule is the SAME function the routing store declared (one rule, not two)',
    store.ownerMatchesReadinessScope === routing.ownerMatchesRoutingScope
  );
  test(
    'K5 a public session sees nothing of a brand’s commercial data',
    store.readinessRecordsForScope({ kind: 'public_session', sessionId: 'public-session-demo' }).length === 0
  );
  const brandWork = work.getWorkItems('brand', brandA);
  test(
    'K6 the work layer scopes commercial work to the owning tenant',
    brandWork.every((w) => w.tenantId === brandA)
  );

  /* ── L. PERSISTENCE — honest memory-only, hydrate never fabricates ──────── */
  const pstatus = store.getCommercialReadinessPersistenceStatus();
  test(
    'L1 the persistence status is HONEST (memory backend, not durable, writes mirrored)',
    pstatus.backend === 'memory' && pstatus.durable === false && pstatus.writes > 0,
    `${pstatus.backend}/${pstatus.state}/writes=${pstatus.writes}`
  );
  test(
    'L2 every readiness write went through the ONE domain port to the canonical table',
    pstatus.lastWrite?.table === 'commercial_readiness_records'
  );
  const hydrated = await store.hydrateCommercialReadinessFromPersistence({ kind: 'ops' });
  test(
    'L3 hydrate reports the truth: nothing durable exists, so nothing is fabricated',
    Array.isArray(hydrated) && hydrated.length === 0 && store.allCommercialReadinessRecords().length === 4
  );

  /* ── M. DOWNSTREAM — readiness connects forward ─────────────────────────── */
  const readyNow = store.getCommercialReadinessRecord(remediation.id);
  test(
    'M1 a ready product carries the declared next step into the next readiness stage',
    readyNow.route === 'ready' &&
      readyNow.nextStep === cfg.COMMERCIAL_VIABILITY_ROUTE_DEFINITIONS.ready.nextStep &&
      cfg.COMMERCIAL_VIABILITY_ROUTE_DEFINITIONS.ready.proceeds === true
  );
  test(
    'M2 the record keeps its Phase 1 + supply references so the next stage continues the SAME record',
    readyNow.assessmentId === remediation.assessmentId &&
      readyNow.supplyProfileId === remediation.supplyProfileId &&
      readyNow.productRef === remediation.productRef
  );

  /* ── N. AUDIT — every state change is traceable ─────────────────────────── */
  const auditRows = demoStore.demoAuditLog.filter((a) => a.entityType === 'commercial_readiness');
  test(
    'N1 assessment, reassessment and brand submission are all audited with an actor',
    auditRows.length >= 6 && auditRows.every((a) => Boolean(a.actorId) && Boolean(a.reason))
  );
  test(
    'N2 the audit trail carries the route transition, not just an opaque id',
    auditRows.some((a) => a.reason.includes('remediation →') || a.reason.includes('→ ready'))
  );
  test(
    'N3 the routing decisions behind the records are on the canonical routing store',
    routing.allRouteDecisions().filter((d) => d.gatewayId === cfg.COMMERCIAL_GATE_ID).length >= 4
  );

  /* ── O. WORK — outstanding actions are real work and resolve correctly ──── */
  const openWork = work.getWorkItems('admin', null, { includeResolved: true });
  const remediationWork = workAtSeed.filter((w) => w.source === 'commercial_remediation');
  const reviewWork = workAtSeed.filter((w) => w.source === 'commercial_review');
  test(
    'O1 a remediation record produced REAL derived work owned by the brand',
    remediationWork.length >= 1 &&
      remediationWork.every(
        (w) => w.entity.type === 'commercial_readiness' && w.dueDate !== null && w.owner.startsWith('brand:')
      ),
    `${remediationWork.length} item(s)`
  );
  test(
    'O2 blocked / human-review records produced review work owned by Mercenta',
    reviewWork.length >= 2 && reviewWork.every((w) => w.owner.startsWith('staff:')),
    `${reviewWork.length} item(s)`
  );
  test(
    'O3 after the brand supplies the information the remediation work disappears (no stale task)',
    !openWork.some(
      (w) =>
        w.source === 'commercial_remediation' &&
        store.getCommercialReadinessRecord(w.entity.id)?.route === 'ready'
    ) && remediationWork.length > openWork.filter((w) => w.source === 'commercial_remediation').length
  );
  test(
    'O4 the work item is DERIVED, so resolving the underlying issue removes it automatically',
    [...remediationWork, ...reviewWork].every((w) => w.derived === true)
  );
  test(
    'O5 the derived id is deterministic (a repeat can never create a second item)',
    new Set(openWork.map((w) => w.id)).size === openWork.length
  );
  const stillOpen = openWork.find((w) => w.source === 'commercial_review');
  /**
   * §SSOT S2 — REPOINTED, NOT WEAKENED. OLD CONTRACT (recorded): `O6 a commercial
   * work item is resolvable and leaves the attention set` — it called
   * `work.resolveWorkItem(...)` on a DERIVED item, which is the defect S2 removes
   * (a ticked task hiding record-qualified work). The invariant asserted now is the
   * stronger one the rule actually states: the item's EXISTENCE tracks the RECORD,
   * in BOTH directions, and the work layer cannot resolve it at all.
   */
  let reviewRefusal = null;
  try {
    work.resolveWorkItem(stillOpen.id, 'staff:validator', 'Decision recorded');
  } catch (e) {
    reviewRefusal = e;
  }
  test(
    'O6 the work layer REFUSES to resolve a commercial work item (the record owns its status)',
    reviewRefusal !== null &&
      reviewRefusal.name === 'DERIVED_RESOLUTION_REFUSED' &&
      work.getWorkItems('admin', null).some((w) => w.id === stillOpen.id)
  );
  const reviewRecordId = stillOpen.entity.id;
  const routeBeforeClose = store.getCommercialReadinessRecord(reviewRecordId)?.route;
  recorder.reassessCommercialReadiness(reviewRecordId, 'staff:validator');
  const routeAfterClose = store.getCommercialReadinessRecord(reviewRecordId)?.route;
  const stillDerives = cfg.COMMERCIAL_WORK_BY_ROUTE[routeAfterClose]?.source === 'commercial_review';
  test(
    'O7 the item exists EXACTLY while the record qualifies (one source of truth, both directions)',
    stillDerives === work.getWorkItems('admin', null).some((w) => w.id === stillOpen.id) &&
      routeAfterClose === routeBeforeClose,
    `route=${routeAfterClose} derives=${stillDerives}`
  );

  /* ── P. AUTOMATION — registered, idempotent, never changes a route ──────── */
  test(
    'P1 the commercial readiness monitor is registered in the EXISTING automation registry',
    Boolean(automation.AUTOMATION_REGISTRY.commercial_readiness_monitor) &&
      automation.AUTOMATION_ORDER.includes('commercial_readiness_monitor') &&
      automation.AUTOMATION_REGISTRY.commercial_readiness_monitor.approvalRequired === false &&
      automation.AUTOMATION_REGISTRY.commercial_readiness_monitor.requiresAi === false
  );
  const routesBeforeMonitor = store.allCommercialReadinessRecords().map((r) => `${r.id}:${r.route}`).join('|');
  const run1 = automation.runAutomation('commercial_readiness_monitor', { actor: 'staff:validator' });
  const routesAfterMonitor = store.allCommercialReadinessRecords().map((r) => `${r.id}:${r.route}`).join('|');
  test(
    'P2 the monitor runs deterministically and reports the real route mix',
    run1.status === 'succeeded' &&
      run1.notes.some((n) => n.includes('4 commercial readiness record(s)')) &&
      run1.notes.some((n) => n.includes('No route drift'))
  );
  test('P3 the monitor NEVER changes a commercial route', routesBeforeMonitor === routesAfterMonitor);
  const run2 = automation.runAutomation('commercial_readiness_monitor', { actor: 'staff:validator' });
  test(
    'P4 a second identical run is duplicate-suppressed (idempotent, no duplicate notifications)',
    run2.status === 'duplicate_suppressed'
  );

  /* ── R. SURFACES — the founder Control Centre + the brand view ──────────── */
  const cc = await server.ssrLoadModule('/src/lib/commandCentre/controlCentre.ts');
  const guidance = await server.ssrLoadModule('/src/lib/commercial/brandGuidance.ts');
  const model = cc.buildControlCentre();
  test(
    'R1 the Control Centre carries a COMMERCIAL section (extending it, not a second dashboard)',
    model.metrics.commercial.length >= 5 &&
      cc.CONTROL_CENTRE_SECTIONS.some((s) => s.id === 'commercial' && s.destination === 'control_centre')
  );
  test(
    'R2 the founder queue shows EVERY canonical record (dataset completeness, never a curated subset)',
    model.commercial.total === store.allCommercialReadinessRecords().length &&
      model.commercial.rows.length === model.commercial.total,
    `${model.commercial.rows.length}/${model.commercial.total}`
  );
  test(
    'R3 every founder row explains WHY: the unmet/unevaluable condition, the owner, the deadline and the work item',
    model.commercial.rows.every(
      (r) =>
        r.route === 'ready' ||
        r.unmet.length + r.unevaluable.length > 0 ||
        r.missingInputs.length > 0
    ) &&
      model.commercial.rows.every((r) => r.ownerLabel === 'Brand' || r.ownerLabel === 'Mercenta') &&
      model.commercial.rows
        .filter((r) => r.route !== 'ready')
        .every((r) => r.dueDate !== null && r.workItemId !== null)
  );
  test(
    'R4 the ready product raises NO work item on the founder surface',
    model.commercial.rows.filter((r) => r.route === 'ready').every((r) => r.workItemId === null)
  );
  test(
    'R5 a blocked / under-review product is raised as an ATTENTION item for the founder',
    model.attention.filter((a) => a.source === 'commercial_readiness').length >= 2
  );
  test(
    'R6 the brand view lists what to DO and WHY, per record, from the record alone',
    store
      .readinessRecordsForScope({ kind: 'ops' })
      .every((r) => {
        const s = guidance.brandOutcomeSummary(r);
        const fields = guidance.brandActionFields(r);
        return (
          s.headline.length > 3 &&
          s.explanation.length > 10 &&
          s.reasons.every((x) => x.what.length > 5 && x.why.length > 5 && x.action.length > 5) &&
          (r.route === 'ready' ? fields.length === 0 : fields.length > 0)
        );
      })
  );
  test(
    'R7 the brand guidance never exposes an internal score or another tenant',
    Object.values(cfg.COMMERCIAL_BRAND_ROUTE_GUIDANCE).every(
      (g) => !/score|rating|risk grade|internal/i.test(`${g.headline} ${g.explanation}`)
    ) &&
      Object.values(cfg.COMMERCIAL_BRAND_TERM_GUIDANCE).every(
        (g) => !/score|internal|founder/i.test(`${g.what} ${g.why} ${g.action}`)
      )
  );
  test(
    'R8 brand progress is real arithmetic over the declared conditions',
    store.readinessRecordsForScope({ kind: 'ops' }).every((r) => {
      const p = guidance.brandProgress(r);
      return p.total === r.conditions.length && p.satisfied <= p.total && p.percent >= 0 && p.percent <= 100;
    })
  );

  /* ── Q. ZERO live network ───────────────────────────────────────────────── */
  test('Q1 the whole validation performed ZERO live network calls', networkCalls === 0, `networkCalls=${networkCalls}`);

  console.log(`\n${assertions} assertions, ${failures} failure(s)`);
  if (failures > 0) process.exitCode = 1;
} catch (err) {
  console.error('VALIDATOR ERROR:', err);
  process.exitCode = 1;
} finally {
  await server.close();
}


