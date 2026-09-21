// §Phase 2 — validates the EXPLICIT WORKFLOW ROUTING / GATEWAY ARCHITECTURE and
// the Phase 2 commercial readiness seam:
//   A. the declared routing vocabulary (gateway kinds, outcomes, refusals,
//      semantics catalogue, idempotency format, dispositions)
//   B. the EXCLUSIVE gateway (XOR): exactly-one, and refusal on none/ambiguous
//   C. the PARALLEL gateway (AND): branch isolation, sequential prerequisites
//   D. the INCLUSIVE gateway (OR): one-or-more, never exactly-one, never all
//   E. the JOIN (fan-in): no false completion, optional/quorum/timed-out/review
//   F. sequential dependency, event-based routing and compensation
//   G. determinism + IDEMPOTENCE (a repeat cannot duplicate state)
//   H. tenant isolation + audit + canonical events (refusal is never silent)
//   I. the Phase 2 commercial gate (routes, pack maths, MOQ, no invented threshold)
//   J. ZERO live network for the whole run
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
const originalFetch = globalThis.fetch;
let networkCalls = 0;
globalThis.fetch = async (...args) => {
  networkCalls++;
  throw new Error(`NO LIVE NETWORK ALLOWED IN VALIDATION: ${String(args[0])}`);
};

try {
  const cfg = await server.ssrLoadModule('/src/config/routing.ts');
  const gw = await server.ssrLoadModule('/src/lib/routing/gateways.ts');
  const store = await server.ssrLoadModule('/src/data/routingStore.ts');
  const events = await server.ssrLoadModule('/src/lib/events/eventFeed.ts');
  const eventTypes = await server.ssrLoadModule('/src/lib/events/types.ts');
  const domain = await server.ssrLoadModule('/src/data/domainRepository.ts');
  const cr = await server.ssrLoadModule('/src/config/commercialReadiness.ts');
  const econ = await server.ssrLoadModule('/src/lib/commercial/economics.ts');
  const gate = await server.ssrLoadModule('/src/lib/commercial/commercialGate.ts');

  const resetAll = () => {
    store.resetRoutingStore();
    events.resetEvents();
  };

  const owner = { kind: 'ops', tenantId: 'mercenta-ops' };
  const subject = { type: 'preaudit_assessment', id: 'preaudit-acme-1', label: 'Acme' };

  const route = (routeId, extra = {}) => ({
    routeId,
    label: routeId,
    action: `do ${routeId}`,
    destination: 'control_centre',
    ...extra,
  });
  const cond = (id, routeId, met, extra = {}) => ({
    id,
    label: id,
    rule: `rule ${id}`,
    observed: `observed ${id}`,
    expected: `expected ${id}`,
    met,
    routeId,
    ...extra,
  });
  const base = (overrides = {}) => ({
    workflowId: 'wf-test',
    gatewayId: 'gw-test',
    subject,
    owner,
    actor: 'staff:validator',
    routes: [route('a'), route('b'), route('c')],
    ...overrides,
  });

  /* ── A. The declared routing vocabulary ─────────────────────────────────── */
  test('routing: silent fall-through is declared forbidden', cfg.NO_SILENT_FALL_THROUGH === true);
  test(
    'routing: an exclusive gateway refuses rather than defaulting',
    cfg.GATEWAY_KINDS.exclusive.selection === 'exactly_one' &&
      cfg.GATEWAY_KINDS.exclusive.refusesDefaultSuccess === true &&
      cfg.GATEWAY_KINDS.exclusive.notationAlias === 'XOR'
  );
  test(
    'routing: a parallel gateway runs every branch and never refuses on one failure',
    cfg.GATEWAY_KINDS.parallel.selection === 'all' &&
      cfg.GATEWAY_KINDS.parallel.refusesDefaultSuccess === false &&
      cfg.GATEWAY_KINDS.parallel.notationAlias === 'AND'
  );
  test(
    'routing: an inclusive gateway is one-or-more (never exactly-one, never all)',
    cfg.GATEWAY_KINDS.inclusive.selection === 'one_or_more' &&
      cfg.GATEWAY_KINDS.inclusive.notationAlias === 'OR'
  );
  test(
    'routing: the three canonical examples are declared (PO fan-out, commercial gate, review OR)',
    cfg.GATEWAY_EXAMPLES.length === 3 &&
      cfg.GATEWAY_EXAMPLES.map((e) => e.id).join(',') ===
        'po_received_fan_out,commercial_gate,product_review_or'
  );
  test(
    'routing: the PO fan-out declares all nine downstream branches',
    cfg.GATEWAY_EXAMPLES.find((e) => e.id === 'po_received_fan_out').routes.length === 9
  );
  test(
    'routing: the ten required routing semantics are declared with an honest status',
    cfg.ROUTING_SEMANTICS.length === 10 &&
      cfg.ROUTING_SEMANTICS.every(
        (s) =>
          (s.status === 'implemented' || s.status === 'declared') &&
          s.implementedBy.length > 0 &&
          s.exercisedBy.length > 0
      )
  );
  test(
    'routing: every refusal reason has an explicit disposition (no dead ends)',
    Object.keys(cfg.ROUTE_REFUSALS).length >= 12 &&
      Object.keys(cfg.ROUTE_REFUSALS).every((r) => Boolean(cfg.ROUTE_REFUSAL_DISPOSITIONS[r])) &&
      Object.keys(cfg.ROUTE_REFUSAL_DISPOSITIONS).length === Object.keys(cfg.ROUTE_REFUSALS).length
  );
  test(
    'routing: branch outcomes distinguish failed / retryable / timed-out / human-review',
    cfg.BRANCH_OUTCOME_SEMANTICS.failed.countsAsComplete === false &&
      cfg.BRANCH_OUTCOME_SEMANTICS.retryable.countsAsComplete === false &&
      cfg.BRANCH_OUTCOME_SEMANTICS.timed_out.countsAsComplete === false &&
      cfg.BRANCH_OUTCOME_SEMANTICS.human_review.countsAsComplete === false &&
      cfg.BRANCH_OUTCOME_SEMANTICS.satisfied.countsAsComplete === true
  );
  test(
    'routing: join completion is never inferred from the initiator',
    cfg.JOIN_NEVER_INFERS_FROM_INITIATOR === true &&
      cfg.JOIN_POLICIES.all.completionCondition.includes('REQUIRED')
  );
  test(
    'routing: the idempotency key format is declared and honoured by the builder',
    cfg.ROUTING_KEY_FORMAT === '<workflowId>|<gatewayId>|<conditionDigest>' &&
      gw.routingIdempotencyKey('wf', 'gw', 'abc') === 'wf|gw|abc'
  );

  /* ── B. EXCLUSIVE gateway (XOR) ────────────────────────────────────────── */
  resetAll();
  const xorOne = gw.evaluateExclusiveGateway(
    base({ conditions: [cond('c1', 'a', true), cond('c2', 'b', false), cond('c3', 'c', false)] })
  );
  test(
    'XOR: exactly one route is selected when exactly one condition holds',
    xorOne.selectedRouteIds.length === 1 &&
      xorOne.selectedRouteIds[0] === 'a' &&
      xorOne.refused === false
  );
  test(
    'XOR: the unselected branches are explicitly skipped, not silently dropped',
    xorOne.branches.filter((b) => b.outcome === 'skipped').length === 2 &&
      xorOne.branches.every((b) => b.reason.length > 0)
  );
  test('XOR: a settled single-route decision is terminal', xorOne.terminal === true);

  const xorNone = gw.evaluateExclusiveGateway(
    base({ conditions: [cond('c1', 'a', false), cond('c2', 'b', false)] })
  );
  test(
    'XOR: NO condition holding REFUSES (no silent default-success path)',
    xorNone.refused === true &&
      xorNone.refusalReason === 'no_condition_met' &&
      xorNone.selectedRouteIds.length === 0 &&
      xorNone.branches.every((b) => b.outcome !== 'satisfied')
  );
  test(
    'XOR: the refusal maps to a declared disposition (human review) and is not terminal',
    store.routeDispositionFor(xorNone) === cfg.ROUTE_REFUSAL_DISPOSITIONS.no_condition_met &&
      store.routeDispositionFor(xorNone) === 'human_review' &&
      xorNone.terminal === false
  );

  const xorMany = gw.evaluateExclusiveGateway(
    base({ conditions: [cond('c1', 'a', true), cond('c2', 'b', true)] })
  );
  test(
    'XOR: an AMBIGUOUS match is refused rather than resolved by guessing',
    xorMany.refused === true &&
      xorMany.refusalReason === 'multiple_conditions_met' &&
      xorMany.refusalDetail.includes('c1') &&
      xorMany.refusalDetail.includes('c2')
  );

  const xorUnevaluable = gw.evaluateExclusiveGateway(
    base({
      conditions: [
        cond('c1', 'a', null, { notEvaluatedReason: 'input missing' }),
        cond('c2', 'b', true),
      ],
    })
  );
  test(
    'XOR: an unevaluable condition fails CLOSED (never assumed true)',
    xorUnevaluable.refused === true && xorUnevaluable.refusalReason === 'condition_not_evaluable'
  );

  const xorUndeclared = gw.evaluateExclusiveGateway(base({ conditions: [cond('c1', 'zzz', true)] }));
  test(
    'XOR: a condition pointing at an undeclared route is refused (structure checked first)',
    xorUndeclared.refused === true && xorUndeclared.refusalReason === 'undeclared_route'
  );

  const xorDuplicate = gw.evaluateExclusiveGateway(
    base({ conditions: [cond('c1', 'a', true), cond('c2', 'a', false)] })
  );
  test(
    'XOR: two conditions selecting the same route is refused as a duplicate branch',
    xorDuplicate.refused === true && xorDuplicate.refusalReason === 'duplicate_route'
  );

  const xorUnrouted = gw.evaluateExclusiveGateway(
    base({ conditions: [{ ...cond('c1', 'a', true), routeId: '' }, cond('c2', 'b', false)] })
  );
  test(
    'XOR: a condition with no route attached would be dropped silently — so it is refused',
    xorUnrouted.refused === true && xorUnrouted.refusalReason === 'unrouted_condition'
  );

  const xorContradiction = gw.evaluateExclusiveGateway(
    base({
      conditions: [
        { ...cond('c1', 'a', true), rule: 'same rule' },
        { ...cond('c1', 'b', false), rule: 'same rule' },
      ],
    })
  );
  test(
    'XOR: the SAME condition id declared twice with disagreeing outcomes is refused as contradictory',
    xorContradiction.refused === true &&
      xorContradiction.refusalReason === 'contradictory_conditions'
  );
  // The regression this validator caught: one declared rule evaluated per-route
  // is legitimate (the commercial gate's precedence ladder does exactly this) and
  // must NOT be reported as a contradiction.
  const sharedRuleStructure = gw.analyseGatewayStructure({
    gatewayKind: 'exclusive',
    routes: [route('a'), route('b')],
    conditions: [
      { ...cond('x1', 'a', true), rule: 'one shared rule' },
      { ...cond('x2', 'b', false), rule: 'one shared rule' },
    ],
  });
  test(
    'routing: one shared rule evaluated per-route is NOT a contradiction (no false positive)',
    !sharedRuleStructure.some((f) => f.kind === 'contradictory_conditions')
  );

  const xorFailed = gw.evaluateExclusiveGateway(
    base({
      routes: [route('a', { compensation: 'reverse the notification' }), route('b'), route('c')],
      conditions: [cond('c1', 'a', true), cond('c2', 'b', false)],
      observed: [{ routeId: 'a', outcome: 'failed', reason: 'provider unavailable', attempt: 2 }],
    })
  );
  test(
    'XOR: a failed selected branch is an OBSERVED failure, not a refusal and not a success',
    xorFailed.refused === false &&
      xorFailed.refusalReason === null &&
      xorFailed.branches.find((b) => b.routeId === 'a').outcome === 'failed' &&
      xorFailed.terminal === false
  );
  test(
    'XOR: a failed branch keeps its declared compensation and attempt number',
    xorFailed.branches.find((b) => b.routeId === 'a').compensation ===
      'reverse the notification' &&
      xorFailed.branches.find((b) => b.routeId === 'a').attempt === 2
  );
  test(
    'routing: every decision declares that completion was NOT inferred from the initiator',
    [xorOne, xorNone, xorMany, xorFailed].every(
      (d) => d.completionInferredFromInitiator === false && d.branchIsolationPreserved === true
    )
  );

  /* ── C. PARALLEL gateway (AND) ─────────────────────────────────────────── */
  const parAll = gw.evaluateParallelGateway(base());
  test(
    'AND: every declared branch executes and stays independently observable',
    parAll.branches.length === 3 &&
      parAll.branches.every((b) => b.outcome === 'satisfied' && b.observable === true) &&
      parAll.refused === false
  );

  const parOneFails = gw.evaluateParallelGateway(
    base({ observed: [{ routeId: 'b', outcome: 'failed', reason: 'BI projection failed' }] })
  );
  test(
    'AND: one branch failing NEVER erases a sibling branch success',
    parOneFails.branches.find((b) => b.routeId === 'a').outcome === 'satisfied' &&
      parOneFails.branches.find((b) => b.routeId === 'c').outcome === 'satisfied' &&
      parOneFails.branches.find((b) => b.routeId === 'b').outcome === 'failed'
  );
  test(
    'AND: the failure is not hidden — the decision is not terminal',
    parOneFails.terminal === false && parOneFails.refused === false
  );
  test(
    'AND: the failed branch maps to an exception disposition',
    store.routeDispositionFor(parOneFails) === 'exception'
  );

  const parPrereq = gw.evaluateParallelGateway(
    base({
      routes: [route('a'), route('b', { requiresRouteId: 'a' })],
      observed: [{ routeId: 'a', outcome: 'failed', reason: 'no' }],
    })
  );
  test(
    'AND: a branch whose sequential prerequisite has not been satisfied does NOT run',
    parPrereq.branches.find((b) => b.routeId === 'b').outcome === 'skipped' &&
      parPrereq.branches.find((b) => b.routeId === 'b').reason.includes('Sequential dependency') &&
      parPrereq.branches.find((b) => b.routeId === 'b').nextStep.includes('a')
  );

  /* ── D. INCLUSIVE gateway (OR) ─────────────────────────────────────────── */
  const orSome = gw.evaluateInclusiveGateway(
    base({ conditions: [cond('c1', 'a', true), cond('c2', 'b', true), cond('c3', 'c', false)] })
  );
  test(
    'OR: ONE OR MORE applicable routes execute (two of the three here)',
    orSome.selectedRouteIds.length === 2 &&
      orSome.selectedRouteIds.includes('a') &&
      orSome.selectedRouteIds.includes('b') &&
      orSome.refused === false
  );
  test(
    'OR: an explicitly-false condition marks its route not_applicable with the reason',
    orSome.branches.find((b) => b.routeId === 'c').outcome === 'not_applicable' &&
      orSome.branches.find((b) => b.routeId === 'c').reason.includes('c3')
  );

  const orAllBranches = gw.evaluateInclusiveGateway(
    base({ conditions: [cond('c1', 'a', true), cond('c2', 'b', true), cond('c3', 'c', true)] })
  );
  test(
    'OR: it is NOT implemented as exactly-one — every applicable branch runs',
    orAllBranches.selectedRouteIds.length === 3
  );

  const orNone = gw.evaluateInclusiveGateway(
    base({ conditions: [cond('c1', 'a', false), cond('c2', 'b', false)] })
  );
  test(
    'OR: no applicable route REFUSES rather than executing an arbitrary branch',
    orNone.refused === true &&
      orNone.refusalReason === 'no_applicable_route' &&
      orNone.selectedRouteIds.length === 0
  );

  const orUnreachable = gw.evaluateInclusiveGateway(
    base({ conditions: [cond('c1', 'a', true)], routes: [route('a'), route('zz')] })
  );
  test(
    'OR: a declared route no condition can select is reported as a structure finding',
    orUnreachable.structure.some((f) => f.kind === 'unreachable_route' && f.routeId === 'zz')
  );

  /* ── E. FAN-IN (join) ──────────────────────────────────────────────────── */
  const joinAll = gw.evaluateParallelGateway(base({ join: 'all' }));
  test(
    'JOIN: all required branches satisfied → the join is satisfied and complete',
    joinAll.join.state === 'satisfied' && joinAll.join.complete === true && joinAll.terminal === true
  );

  const joinOneFailed = gw.evaluateParallelGateway(
    base({ join: 'all', observed: [{ routeId: 'b', outcome: 'failed', reason: 'branch failed' }] })
  );
  test(
    'JOIN: the workflow does NOT falsely complete when a required branch failed',
    joinOneFailed.join.complete === false &&
      joinOneFailed.join.state === 'failed' &&
      joinOneFailed.terminal === false
  );
  test(
    'JOIN: an incomplete join routes to escalation',
    store.routeDispositionFor(joinOneFailed) === 'escalation'
  );

  const joinOptional = gw.evaluateParallelGateway(
    base({
      routes: [route('a'), route('b', { joinRole: 'optional' }), route('c')],
      join: 'all',
      observed: [{ routeId: 'b', outcome: 'failed', reason: 'optional branch failed' }],
    })
  );
  test(
    'JOIN: an OPTIONAL branch never blocks completion, but its failure stays visible',
    joinOptional.join.complete === true &&
      joinOptional.join.optionalRouteIds.includes('b') &&
      joinOptional.branches.find((b) => b.routeId === 'b').outcome === 'failed'
  );

  const joinQuorumMissing = gw.evaluateParallelGateway(base({ join: 'quorum' }));
  test(
    'JOIN: a quorum join with no declared quorum is refused, never invented',
    joinQuorumMissing.join.complete === false &&
      joinQuorumMissing.join.reason.includes('quorum') &&
      joinQuorumMissing.terminal === false
  );

  const joinQuorumTwo = gw.evaluateParallelGateway(
    base({
      join: 'quorum',
      quorum: 2,
      observed: [
        { routeId: 'a', outcome: 'satisfied' },
        { routeId: 'b', outcome: 'satisfied' },
        { routeId: 'c', outcome: 'failed', reason: 'third branch failed' },
      ],
    })
  );
  test(
    'JOIN: a declared quorum of 2 is met by 2 satisfied branches',
    joinQuorumTwo.join.complete === true && joinQuorumTwo.join.quorum === 2
  );

  const joinTimedOut = gw.evaluateParallelGateway(
    base({
      join: 'all',
      observed: [{ routeId: 'b', outcome: 'timed_out', reason: 'deadline passed' }],
    })
  );
  test(
    'JOIN: a TIMED-OUT branch never counts as satisfied',
    joinTimedOut.join.timedOutRouteIds.includes('b') &&
      joinTimedOut.join.complete === false &&
      joinTimedOut.terminal === false
  );

  const joinHuman = gw.evaluateParallelGateway(
    base({
      join: 'all',
      observed: [{ routeId: 'b', outcome: 'human_review', reason: 'needs approval' }],
    })
  );
  test(
    'JOIN: a branch awaiting human approval blocks the join rather than completing it',
    joinHuman.join.state === 'blocked_human_review' &&
      joinHuman.join.complete === false &&
      joinHuman.terminal === false
  );

  /* ── F. Sequential dependency, event routing, compensation ─────────────── */
  const seqNotRun = gw.evaluateSequentialDependency({
    prerequisiteRouteId: 'po_acknowledged',
    prerequisiteOutcome: null,
    requiredOutcome: 'satisfied',
    dependentRouteId: 'shipment_created',
  });
  test(
    'SEQUENTIAL: a dependent route cannot proceed on an assumption — the prerequisite must have run',
    seqNotRun.canProceed === false && seqNotRun.refusalReason === 'prerequisite_not_reached'
  );
  const seqFailed = gw.evaluateSequentialDependency({
    prerequisiteRouteId: 'po_acknowledged',
    prerequisiteOutcome: 'failed',
    requiredOutcome: 'satisfied',
    dependentRouteId: 'shipment_created',
  });
  test(
    'SEQUENTIAL: a FAILED prerequisite does not satisfy the dependency',
    seqFailed.canProceed === false && seqFailed.reason.includes('failed')
  );
  const seqOk = gw.evaluateSequentialDependency({
    prerequisiteRouteId: 'po_acknowledged',
    prerequisiteOutcome: 'satisfied',
    requiredOutcome: 'satisfied',
    dependentRouteId: 'shipment_created',
  });
  test('SEQUENTIAL: a satisfied prerequisite lets the dependent route proceed', seqOk.canProceed === true);

  const evKnown = gw.evaluateEventRouting({
    eventId: 'po_received',
    routes: { po_received: 'operations_fanout', po_cancelled: 'exception_route' },
  });
  test(
    'EVENT: a declared event routes to its declared route',
    evKnown.matched === true && evKnown.routeId === 'operations_fanout'
  );
  const evUnknown = gw.evaluateEventRouting({ eventId: 'never_declared', routes: { a: 'b' } });
  test(
    'EVENT: an UNDECLARED event is refused and surfaced, never ignored',
    evUnknown.matched === false &&
      evUnknown.refusalReason === 'unknown_event' &&
      cfg.ROUTE_REFUSAL_DISPOSITIONS.unknown_event === 'exception'
  );

  const compDeclared = gw.planCompensation(route('a', { compensation: 'reverse it' }), 'boom', 3);
  test(
    'COMPENSATION: a declared compensation is returned with its attempt number',
    compDeclared.action === 'reverse it' && compDeclared.requiresHuman === false && compDeclared.attempt === 3
  );
  const compMissing = gw.planCompensation(route('a'), 'boom');
  test(
    'COMPENSATION: an UNdeclared compensation routes to human review rather than being ignored',
    compMissing.action === null && compMissing.requiresHuman === true
  );

  /* ── G. Determinism + idempotence + audit + events ─────────────────────── */
  const demoStore = await server.ssrLoadModule('/src/data/demoStore.ts');
  resetAll();
  const buildOnce = () =>
    gw.evaluateExclusiveGateway(
      base({
        conditions: [cond('c1', 'a', true), cond('c2', 'b', false)],
        observed: [{ routeId: 'a', outcome: 'satisfied' }],
      })
    );
  const d1 = buildOnce();
  const d2 = buildOnce();
  test(
    'DETERMINISM: an identical evaluation produces an identical decision id and idempotency key',
    d1.id === d2.id &&
      d1.idempotencyKey === d2.idempotencyKey &&
      d1.conditionDigest === d2.conditionDigest
  );
  const d3 = gw.evaluateExclusiveGateway(
    base({ conditions: [cond('c1', 'a', false), cond('c2', 'b', true)] })
  );
  test(
    'DETERMINISM: a different outcome produces a different digest and id',
    d3.conditionDigest !== d1.conditionDigest && d3.id !== d1.id
  );
  test(
    'DETERMINISM: the decision id is the declared deterministic format',
    d1.id === `route-${d1.workflowId}-${d1.gatewayId}-${d1.conditionDigest}`
  );

  const rec1 = store.recordRoutingDecision(d1);
  test(
    'STORE: the first record writes ONE decision and emits its events',
    rec1.duplicateSuppressed === false &&
      rec1.eventsEmitted >= 1 &&
      store.allRouteDecisions().length === 1
  );
  const auditFor = (id) => demoStore.demoAuditLog.filter((e) => e.entityId === id).length;
  test('AUDIT: the routing decision is attributed in the canonical audit registry', auditFor(d1.id) === 1);

  const rec2 = store.recordRoutingDecision(d1);
  test(
    'IDEMPOTENCE: recording the SAME decision twice suppresses the duplicate entirely',
    rec2.duplicateSuppressed === true &&
      rec2.eventsEmitted === 0 &&
      store.allRouteDecisions().length === 1 &&
      store.routingDuplicatesSuppressed() === 1
  );
  test('IDEMPOTENCE: no second audit entry is written for the duplicate', auditFor(d1.id) === 1);
  test(
    'IDEMPOTENCE: no second event is emitted for the duplicate',
    events.queryEvents({ type: 'routing_decision_recorded' }).length === 1
  );

  const retrySameKey = store.recordRoutingDecision({ ...d1, actor: 'staff:someone-else' });
  test(
    'IDEMPOTENCE: a retry of the same evaluation is still suppressed (the key is the contract)',
    retrySameKey.duplicateSuppressed === true && store.allRouteDecisions().length === 1
  );

  resetAll();
  const refusalRec = store.recordRoutingDecision(xorNone);
  const refusedEvents = events.queryEvents({ type: 'route_refused' });
  test(
    'EVENTS: a refusal emits an IMPORTANT canonical event (it is never silent)',
    refusalRec.duplicateSuppressed === false &&
      refusedEvents.length === 1 &&
      refusedEvents[0].severity === 'important'
  );
  test(
    'EVENTS: the refusal event carries the reason and the disposition',
    refusedEvents[0].metadata.refusalReason === 'no_condition_met' &&
      refusedEvents[0].metadata.disposition === 'human_review'
  );

  resetAll();
  const broadcast = gw.evaluateParallelGateway(
    base({ observed: [{ routeId: 'b', outcome: 'failed', reason: 'branch died' }] })
  );
  store.recordRoutingDecision(broadcast);
  const branchFailedEvents = events.queryEvents({ type: 'route_branch_failed' });
  test(
    'EVENTS: a failed branch is surfaced with per-branch outcomes (fan-out stays observable)',
    branchFailedEvents.length === 1 &&
      branchFailedEvents[0].severity === 'important' &&
      branchFailedEvents[0].branchOutcomes.length === 1 &&
      branchFailedEvents[0].branchOutcomes[0].outcome === 'failed'
  );
  test(
    'EVENTS: the fan-out event carries a correlation id for the workflow',
    branchFailedEvents[0].correlationId === 'wf-test'
  );

  resetAll();
  store.recordRoutingDecision(joinOneFailed);
  const joinIncomplete = events.queryEvents({ type: 'route_join_incomplete' });
  test(
    'EVENTS: an incomplete join emits an IMPORTANT event and the record is not terminal',
    joinIncomplete.length === 1 &&
      joinIncomplete[0].severity === 'important' &&
      store.allRouteDecisions()[0].terminal === false
  );

  test(
    'DOMAIN PORT: routing decisions persist through the ONE domain port (same table list)',
    domain.DOMAIN_TABLES.routingDecisions === 'routing_decisions' &&
      Array.isArray(domain.emptyHydratedState().routingDecisions)
  );
  test(
    'STORE: persistence is reported honestly (memory-only with no Supabase configured)',
    store.getRoutingPersistenceStatus().backend === domain.getDomainRepository().backend &&
      store.getRoutingPersistenceStatus().durable === false
  );

  /* ── H. Tenant isolation ───────────────────────────────────────────────── */
  resetAll();
  const brandOwner = { kind: 'brand', tenantId: 'brand-acme' };
  const otherBrand = { kind: 'brand', tenantId: 'brand-other' };
  const publicOwner = { kind: 'public_session', sessionId: 'session-1' };
  const brandDecision = {
    ...d1,
    id: `${d1.id}-brand`,
    owner: brandOwner,
    idempotencyKey: `${d1.idempotencyKey}|brand`,
  };
  const otherDecision = {
    ...d2,
    id: `${d2.id}-other`,
    owner: otherBrand,
    idempotencyKey: `${d2.idempotencyKey}|other`,
  };
  const publicDecision = {
    ...d3,
    id: `${d3.id}-pub`,
    owner: publicOwner,
    idempotencyKey: `${d3.idempotencyKey}|pub`,
  };
  store.recordRoutingDecision(brandDecision);
  store.recordRoutingDecision(otherDecision);
  store.recordRoutingDecision(publicDecision);

  const brandScopeRows = store.routeDecisionsForScope({ kind: 'brand', tenantId: 'brand-acme' });
  test(
    'TENANT: a brand sees ONLY its own routing decisions',
    brandScopeRows.length === 1 && brandScopeRows[0].owner.tenantId === 'brand-acme'
  );
  test(
    'TENANT: a brand can never observe another brand decision',
    store
      .routeDecisionsForScope({ kind: 'brand', tenantId: 'brand-other' })
      .every((d) => d.owner.tenantId === 'brand-other')
  );
  test(
    'TENANT: a public session sees ONLY its own decision',
    store.routeDecisionsForScope({ kind: 'public_session', sessionId: 'session-1' }).length === 1 &&
      store.routeDecisionsForScope({ kind: 'public_session', sessionId: 'session-2' }).length === 0
  );
  test(
    'TENANT: ops sees every decision (Mercenta operates the platform)',
    store.routeDecisionsForScope({ kind: 'ops' }).length === 3
  );
  test(
    'TENANT: a brand-owned event carries the brand tenant id',
    events.queryEvents({ type: 'routing_decision_recorded' }).filter((e) => e.tenantId === 'brand-acme')
      .length === 1
  );
  test(
    'TENANT: a platform/public event carries a null tenant rather than inventing one',
    events.queryEvents({ type: 'routing_decision_recorded' }).some((e) => e.tenantId === null)
  );
  resetAll();
  store.recordRoutingDecision(xorNone, 'staff:validator');
  test(
    'AUDIT: a refusal is recorded with its reason and its disposition',
    demoStore.demoAuditLog.some(
      (e) =>
        e.entityType === 'routing_decision' &&
        e.action === 'routing_decision_refused' &&
        e.reason.includes('no_condition_met') &&
        e.reason.includes('human_review')
    )
  );

  /* ── I. The Phase 2 commercial gate ────────────────────────────────────── */
  test(
    'commercial: the declared precedence ladder is pinned (blocked → remediation → human review → ready)',
    cr.COMMERCIAL_GATE_PRECEDENCE.join(',') === 'blocked,remediation,human_review,ready'
  );
  test(
    'commercial: the four routes are declared with exactly one that proceeds',
    cr.COMMERCIAL_VIABILITY_ROUTE_ORDER.length === 4 &&
      cr.COMMERCIAL_VIABILITY_ROUTE_ORDER.filter(
        (r) => cr.COMMERCIAL_VIABILITY_ROUTE_DEFINITIONS[r].proceeds
      ).length === 1 &&
      cr.COMMERCIAL_VIABILITY_ROUTE_DEFINITIONS.ready.proceeds === true
  );
  test(
    'commercial: NO commercial threshold has been invented (all unset, fail-closed)',
    Object.values(cr.COMMERCIAL_THRESHOLDS).every((t) => t.value === null && t.configured === false) &&
      cr.COMMERCIAL_THRESHOLD_UNSET_ROUTES_TO === 'human_review'
  );
  test(
    'commercial: the seven pack/MOQ concepts are declared as DISTINCT concepts',
    Object.keys(cr.PACK_CONCEPTS).length === 7 &&
      cr.PACK_CONCEPTS.brand_moq.distinctFrom.includes('production_moq') &&
      cr.PACK_CONCEPTS.brand_moq.distinctFrom.includes('po_quantity') &&
      cr.PACK_CONCEPTS.po_quantity.distinctFrom.includes('shipment_quantity')
  );
  test(
    'commercial: no single success score and no overall opportunity score are declared absent',
    cr.NO_SINGLE_SUCCESS_SCORE === true && cr.NO_OVERALL_OPPORTUNITY_SCORE === true
  );
  test(
    'commercial: pack maths is validated (6 units/case × 4 cases/carton = 24)',
    econ.packMathsWorkedExample().unitsPerMasterCarton === 24 &&
      econ.packMathsWorkedExample().valid === true
  );
  const badPack = econ.buildPackProfile({
    casePack: 6,
    casesPerCarton: 4,
    brandMoq: 500,
    poQuantity: 120,
  });
  test(
    'commercial: a PO quantity BELOW the brand MOQ is reported as a commercial issue',
    badPack.valid === false && badPack.issue.includes('brand MOQ')
  );
  test(
    'commercial: the MOQ disclaimer refuses to imply a channel honours an MOQ',
    econ.PACK_MOQ_DISCLAIMER.includes('does not establish') &&
      cr.CHANNEL_WILL_HONOUR_MOQ_IS_UNSUPPORTED === true
  );

  const makeTerms = () => [
    econ.commercialTermValue({
      field: 'expected_uk_retail',
      value: 20,
      basis: 'observed',
      source: 'UK listing',
      observedAt: '2026-09-01',
    }),
    econ.commercialTermValue({ field: 'wholesale_cost', value: 8, basis: 'actual', source: 'brand quote' }),
    econ.commercialTermValue({ field: 'currency', value: 'GBP', basis: 'actual' }),
  ];
  const gateBase = (overrides = {}) => ({
    owner,
    actor: 'staff:validator',
    subject,
    assessmentId: 'preaudit-acme-1',
    supplyProfileId: 'supply-acme-1',
    productOpportunityId: 'product-opp-acme-1',
    dedupeKey: 'acme',
    terms: makeTerms(),
    pack: { brandMoq: 50, casePack: 6, casesPerCarton: 4, poQuantity: 120 },
    intendedOrderQuantity: 120,
    projectedDemandUnits: 100,
    declaredSupplyCapacityUnits: 200,
    supplyVariability: 'low',
    planningLeadTimeDays: 30,
    agreedMaxLeadTimeDays: 45,
    ...overrides,
  });

  const readyGate = gate.evaluateCommercialViability(gateBase());
  test(
    'commercial gate: a complete, positive-economics case is READY with exactly one selected route',
    readyGate.route === 'ready' &&
      readyGate.refused === false &&
      readyGate.decision.selectedRouteIds.length === 1 &&
      readyGate.decision.gatewayKind === 'exclusive'
  );
  test(
    'commercial gate: it evaluates the SEVEN declared conditions in their declared order',
    readyGate.conditions.length === 7 &&
      readyGate.conditions.map((c) => c.id).join(',') ===
        cr.COMMERCIAL_CONDITIONS.map((c) => c.id).join(',')
  );
  test(
    'commercial gate: every condition carries its rule and the value it observed',
    readyGate.conditions.every(
      (c) => c.rule.length > 0 && c.observed.length > 0 && c.expected.length > 0
    )
  );
  test(
    'commercial gate: the pack profile is carried with the declared rule',
    readyGate.pack.unitsPerMasterCarton === 24 && readyGate.pack.rule === cr.PACK_MATHS_RULE
  );
  test(
    'commercial gate: the MOQ disclaimer travels with the evaluation',
    readyGate.moqDisclaimer === econ.PACK_MOQ_DISCLAIMER
  );

  const missingGate = gate.evaluateCommercialViability(gateBase({ terms: [] }));
  test(
    'commercial gate: MISSING required terms route to REMEDIATION (negative case)',
    missingGate.route === 'remediation' &&
      missingGate.missingInputs.some((m) => m.includes('wholesale_cost')) &&
      missingGate.refused === false
  );

  const negativeEconomics = gate.evaluateCommercialViability(
    gateBase({
      terms: [
        econ.commercialTermValue({ field: 'expected_uk_retail', value: 5, basis: 'observed' }),
        econ.commercialTermValue({ field: 'wholesale_cost', value: 9, basis: 'actual' }),
        econ.commercialTermValue({ field: 'currency', value: 'GBP', basis: 'actual' }),
      ],
    })
  );
  test(
    'commercial gate: economics that cannot work are BLOCKED, not softened',
    negativeEconomics.route === 'blocked' && negativeEconomics.refused === false
  );

  const unevaluableGate = gate.evaluateCommercialViability(gateBase({ agreedMaxLeadTimeDays: null }));
  test(
    'commercial gate: no agreed lead-time limit fails CLOSED to human review (no invented rule)',
    unevaluableGate.route === 'human_review' &&
      unevaluableGate.conditions
        .find((c) => c.id === 'lead_time_within_agreed_limit')
        .notEvaluatedReason.includes('universal')
  );

  const assumedGate = gate.evaluateCommercialViability(
    gateBase({
      terms: [
        econ.commercialTermValue({ field: 'expected_uk_retail', value: 20, basis: 'assumed' }),
        econ.commercialTermValue({ field: 'wholesale_cost', value: 8, basis: 'assumed' }),
        econ.commercialTermValue({ field: 'currency', value: 'GBP', basis: 'actual' }),
      ],
    })
  );
  test(
    'commercial gate: a term resting on an ASSUMPTION is a fixable gap, not evidence',
    assumedGate.conditions.find((c) => c.id === 'terms_are_evaluable').met === false &&
      assumedGate.route === 'remediation'
  );

  const supplyBlockedGate = gate.evaluateCommercialViability(
    gateBase({ declaredSupplyCapacityUnits: 10, projectedDemandUnits: 5000 })
  );
  test(
    'commercial gate: insufficient supply capacity BLOCKS (the §20 commercial ↔ supply interaction)',
    supplyBlockedGate.route === 'blocked' &&
      supplyBlockedGate.supplyObservations.find(
        (o) => o.kind === 'strong_demand_with_insufficient_capacity'
      ).detected === true
  );

  resetAll();
  const gateRec = store.recordRoutingDecision(readyGate.decision, 'staff:validator');
  const commercialEvents = events.queryEvents({ type: 'commercial_route_selected' });
  test(
    'commercial gate: recording the decision emits the canonical COMMERCIAL_ROUTE_SELECTED event',
    gateRec.duplicateSuppressed === false &&
      commercialEvents.length === 1 &&
      commercialEvents[0].metadata.selected.includes('ready')
  );
  const gateRecAgain = store.recordRoutingDecision(readyGate.decision, 'staff:validator');
  test(
    'commercial gate: a repeated evaluation cannot duplicate the commercial route (idempotent)',
    gateRecAgain.duplicateSuppressed === true &&
      events.queryEvents({ type: 'commercial_route_selected' }).length === 1
  );

  const readyRecord = readyGate.record;
  test(
    'commercial record: it REFERENCES the Phase 1 entities by id (no parallel entity)',
    readyRecord.assessmentId === 'preaudit-acme-1' &&
      readyRecord.supplyProfileId === 'supply-acme-1' &&
      readyRecord.productOpportunityId === 'product-opp-acme-1' &&
      readyRecord.routingDecisionId === readyGate.decision.id
  );
  test(
    'commercial record: it declares the MOQ disclaimer and states what is missing',
    readyRecord.moqDisclaimer.length > 0 &&
      Array.isArray(readyRecord.missingInputs) &&
      Array.isArray(readyRecord.openQuestions)
  );
  test(
    'commercial gate: the no-margin-threshold case is recorded as an open question, not a verdict',
    readyGate.openQuestions.some((q) => q.includes('No minimum gross margin threshold'))
  );

  /* ── J. The event model stays ONE union ────────────────────────────────── */
  test(
    'events: every Phase 2 routing event has a declared severity (exhaustive map)',
    [
      'routing_decision_recorded',
      'route_refused',
      'route_branch_failed',
      'route_join_satisfied',
      'route_join_incomplete',
      'commercial_route_selected',
    ].every((t) => Boolean(eventTypes.EVENT_SEVERITY_MAP[t]))
  );
  test(
    'events: refusal / branch failure / incomplete join are IMPORTANT, never neutral',
    eventTypes.EVENT_SEVERITY_MAP.route_refused === 'important' &&
      eventTypes.EVENT_SEVERITY_MAP.route_branch_failed === 'important' &&
      eventTypes.EVENT_SEVERITY_MAP.route_join_incomplete === 'important'
  );
  test(
    'events: ONE feed only — the Phase 2 events use the existing emitter',
    typeof events.emitEvent === 'function' && typeof events.queryEvents === 'function'
  );

  /* ── Zero network ──────────────────────────────────────────────────────── */
  test(
    `routing: ZERO live network calls across the whole run (observed: ${networkCalls})`,
    networkCalls === 0
  );
} catch (err) {
  failures += 1;
  console.error('✗ VALIDATOR THREW:', err && err.stack ? err.stack : err);
} finally {
  globalThis.fetch = originalFetch;
  await server.close();
}

console.log(
  `\nROUTING GATEWAYS + PHASE 2 COMMERCIAL READINESS: ${
    failures === 0 ? 'PASS' : 'FAIL'
  } — ${assertions} assertion(s), ${failures} failure(s)`
);
process.exit(failures === 0 ? 0 : 1);