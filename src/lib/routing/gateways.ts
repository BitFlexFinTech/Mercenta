/**
 * §Phase 2 — THE ROUTING EVALUATORS (parallel AND / exclusive XOR / inclusive OR,
 * plus sequential, event-based, join, retry, escalation, compensation, terminal).
 *
 * ⚠️ THIS IS NOT A WORKFLOW ENGINE. It is a small set of PURE functions that turn
 * explicit, declared conditions into ONE auditable decision record. Everything
 * the platform already has remains the mechanism:
 *
 *   canonical events → fan-out      the evaluator returns branches; the STORE
 *                                   (`src/data/routingStore.ts`) emits the events
 *   the work layer                  a branch's `action`/`destination` is where the
 *                                   operator acts — no new screen is created here
 *   the automation ledger           human approval / retry / escalation stay there
 *   the audit registry              the store records WHY a route was taken
 *   the domain port                 the store persists the decision like any artefact
 *
 * NON-NEGOTIABLE BEHAVIOUR (declared in `src/config/routing.ts`, pinned by
 * `scripts/validate-routing-gateways.mjs`):
 *   - NO SILENT FALL-THROUGH: an exclusive gateway with no (or several) matching
 *     conditions REFUSES. It never picks a default-success route.
 *   - BRANCH ISOLATION: a failing branch never erases a sibling's success.
 *   - NO FALSE COMPLETION: `terminal` is derived from the join condition, never
 *     from the initiating operation having succeeded.
 *   - IDEMPOTENCE: the decision id and the idempotency key are deterministic
 *     functions of the inputs, so a repeated evaluation cannot create a second
 *     canonical decision.
 *   - ZERO PROVIDER CALLS: routing is decision-making only.
 */
import type {
  GatewayStructureFinding,
  RouteBranchResult,
  RouteConditionEvaluation,
  RouteJoinState,
  RoutingOwner,
  RoutingSubjectRef,
  WorkflowRoutingDecision,
} from '@/types';
import {
  ATTENTION_OUTCOMES,
  BRANCH_OUTCOME_SEMANTICS,
  DEFAULT_JOIN_POLICY,
  GATEWAY_KINDS,
  JOIN_POLICIES,
  ROUTE_REFUSALS,
  STRUCTURAL_FINDINGS_ARE_REFUSING,
  type GatewayKind,
  type JoinPolicy,
  type RouteBranchOutcome,
  type RouteRefusalReason,
} from '@/config/routing';
import { demoToday } from '@/lib/work/workStore';

/* ── Inputs ───────────────────────────────────────────────────────────────── */

/** ONE declared condition the caller has already OBSERVED. The evaluator never guesses. */
export interface GatewayConditionInput {
  /** The declared condition id (from a config SSOT — never invented here). */
  id: string;
  label: string;
  /** The declared rule, in full. */
  rule: string;
  observed: string;
  expected: string;
  /** `null` = could not be evaluated ⇒ fail closed. */
  met: boolean | null;
  notEvaluatedReason?: string | null;
  /** The route this condition selects. */
  routeId: string;
}

/** ONE declared route on the gateway. */
export interface GatewayRouteInput {
  routeId: string;
  label: string;
  /** What the branch does when selected. */
  action: string;
  /** Where the operator acts (an EXISTING destination). */
  destination: string;
  /** For a fan-in: does this branch have to complete? */
  joinRole?: 'required' | 'optional';
  /** The declared compensation if this branch fails. Null ⇒ a human must decide. */
  compensation?: string | null;
  /** Sequential dependency: a route that must be satisfied first. */
  requiresRouteId?: string | null;
}

/** A branch result observed OUTSIDE the evaluator (retry, provider outcome, deadline). */
export interface ObservedBranchInput {
  routeId: string;
  outcome: RouteBranchOutcome;
  reason?: string;
  attempt?: number;
  nextStep?: string | null;
}

export interface GatewayEvaluationInput {
  workflowId: string;
  gatewayId: string;
  subject: RoutingSubjectRef;
  owner: RoutingOwner;
  actor: string;
  routes: readonly GatewayRouteInput[];
  /** Exclusive and inclusive gateways require conditions; a parallel gateway does not. */
  conditions?: readonly GatewayConditionInput[];
  /** Outcomes already observed for branches (fan-in / retry). */
  observed?: readonly ObservedBranchInput[];
  /** Declare a fan-in when the workflow must wait for branches. */
  join?: JoinPolicy | null;
  /** The declared quorum, when `join` is `quorum`. */
  quorum?: number | null;
  /** Deterministic clock override (defaults to the pinned demo clock). */
  at?: string;
}

/* ── Deterministic identity + idempotency ─────────────────────────────────── */

/** Stable JSON — keys sorted, so the digest never depends on object order. */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`;
}

/** FNV-1a over the canonical string — deterministic, dependency-free, no clock. */
function fnv1aHex(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/**
 * The digest of everything that can legitimately change a routing outcome: the
 * declared routes, the evaluated conditions and the observed branch results. A
 * repeated identical evaluation therefore produces the SAME digest — which is
 * what makes the decision id and the idempotency key stable.
 */
export function conditionDigest(input: {
  gatewayId: string;
  routes: readonly GatewayRouteInput[];
  conditions?: readonly GatewayConditionInput[];
  observed?: readonly ObservedBranchInput[];
  join?: JoinPolicy | null;
  quorum?: number | null;
}): string {
  const canonical = stableStringify({
    gatewayId: input.gatewayId,
    routes: input.routes.map((r) => [
      r.routeId,
      r.requiresRouteId ?? null,
      r.joinRole ?? 'required',
    ]),
    conditions: (input.conditions ?? []).map((c) => [c.id, c.routeId, c.met]),
    observed: (input.observed ?? []).map((o) => [o.routeId, o.outcome, o.attempt ?? 1]),
    join: input.join ?? null,
    quorum: input.quorum ?? null,
  });
  return fnv1aHex(canonical);
}

export function routeDecisionId(workflowId: string, gatewayId: string, digest: string): string {
  return `route-${workflowId}-${gatewayId}-${digest}`;
}

/** `<workflowId>|<gatewayId>|<conditionDigest>` — the declared key format. */
export function routingIdempotencyKey(
  workflowId: string,
  gatewayId: string,
  digest: string
): string {
  return `${workflowId}|${gatewayId}|${digest}`;
}

/* ── §8 — structural analysis + condition evaluation ─────────────────────── */

export interface GatewayStructureInput {
  gatewayKind: GatewayKind;
  routes: readonly GatewayRouteInput[];
  conditions?: readonly GatewayConditionInput[];
}

/**
 * Analyse the GATEWAY DEFINITION itself, before any business outcome is read.
 *
 * This is the check that catches the §8 forbidden cases — an undeclared route, a
 * condition with no route (which would be silently dropped), a duplicated branch,
 * a route no condition can ever reach, and two conditions that contradict each
 * other. A decision carrying a REFUSING finding is refused outright: the gateway
 * is malformed and must not be trusted.
 */
export function analyseGatewayStructure(input: GatewayStructureInput): GatewayStructureFinding[] {
  const findings: GatewayStructureFinding[] = [];
  const conditions = input.conditions ?? [];
  const declared = new Set(input.routes.map((r) => r.routeId));

  for (const c of conditions) {
    if (!c.routeId) {
      findings.push({
        kind: 'unrouted_condition',
        detail: `Condition "${c.id}" has no route attached, so it would be silently dropped.`,
        routeId: null,
        conditionId: c.id,
      });
      continue;
    }
    if (!declared.has(c.routeId)) {
      findings.push({
        kind: 'undeclared_route',
        detail: `Condition "${c.id}" selects route "${c.routeId}", which is not declared on this gateway.`,
        routeId: c.routeId,
        conditionId: c.id,
      });
    }
  }

  if (input.gatewayKind === 'exclusive') {
    const byRoute = new Map<string, string[]>();
    for (const c of conditions) {
      if (!c.routeId) continue;
      byRoute.set(c.routeId, [...(byRoute.get(c.routeId) ?? []), c.id]);
    }
    for (const [routeId, conditionIds] of byRoute) {
      if (conditionIds.length > 1) {
        findings.push({
          kind: 'duplicate_route',
          detail: `Route "${routeId}" is selected by ${conditionIds.length} conditions in a gateway that permits exactly one (${conditionIds.join(', ')}).`,
          routeId,
          conditionId: null,
        });
      }
    }
  }

  if (input.gatewayKind !== 'parallel') {
    const reachable = new Set(conditions.map((c) => c.routeId));
    for (const route of input.routes) {
      if (!reachable.has(route.routeId)) {
        findings.push({
          kind: 'unreachable_route',
          detail: `Route "${route.routeId}" is declared but no condition can ever select it.`,
          routeId: route.routeId,
          conditionId: null,
        });
      }
    }
  }

  // §8 — a contradiction is a GENUINE defect, not merely two conditions that
  // share a rule. Two legitimate cases:
  //   (a) the SAME condition id is declared twice and the two declarations
  //       disagree about whether it held — the config is self-contradictory;
  //   (b) two conditions that own the SAME route under the SAME rule disagree.
  // Deliberately NOT flagged: several conditions that share one declared rule
  // while describing DIFFERENT routes (a rule can legitimately be evaluated
  // per-route, as the commercial gate's declared precedence ladder does).
  const byConditionId = new Map<string, GatewayConditionInput[]>();
  for (const c of conditions) {
    byConditionId.set(c.id, [...(byConditionId.get(c.id) ?? []), c]);
  }
  for (const [id, group] of byConditionId) {
    if (group.length < 2) continue;
    const metValues = new Set(group.filter((c) => c.met !== null).map((c) => c.met));
    if (metValues.size > 1) {
      findings.push({
        kind: 'contradictory_conditions',
        detail: `Condition "${id}" is declared ${group.length} times and the declarations disagree about whether it held.`,
        routeId: group[0].routeId,
        conditionId: id,
      });
    }
  }

  const byRuleAndRoute = new Map<string, GatewayConditionInput[]>();
  for (const c of conditions) {
    const key = `${c.routeId}|${c.rule}`;
    byRuleAndRoute.set(key, [...(byRuleAndRoute.get(key) ?? []), c]);
  }
  for (const [key, group] of byRuleAndRoute) {
    if (group.length < 2) continue;
    const metValues = new Set(group.filter((c) => c.met !== null).map((c) => c.met));
    if (metValues.size > 1) {
      findings.push({
        kind: 'contradictory_conditions',
        detail: `Conditions ${group
          .map((c) => c.id)
          .join(', ')} judge the same route (${key.split('|')[0]}) under the same rule and disagree about whether it held.`,
        routeId: group[0].routeId,
        conditionId: group[0].id,
      });
    }
  }

  return findings;
}

/** True when any finding makes the gateway structurally untrustworthy. */
export function hasRefusingFinding(findings: readonly GatewayStructureFinding[]): boolean {
  return findings.some((f) => STRUCTURAL_FINDINGS_ARE_REFUSING.includes(f.kind));
}

/**
 * Turn declared conditions into canonical evaluations. A condition that could not
 * be evaluated is carried as `met: false` WITH its reason — never assumed true.
 */
export function evaluateConditions(
  conditions: readonly GatewayConditionInput[]
): RouteConditionEvaluation[] {
  return conditions.map((c) => ({
    id: c.id,
    label: c.label,
    rule: c.rule,
    observed: c.observed,
    expected: c.expected,
    met: c.met === true,
    notEvaluatedReason:
      c.met === null
        ? (c.notEvaluatedReason ?? 'The condition could not be evaluated from the available input.')
        : null,
    routeId: c.routeId,
  }));
}

/* ── Branches + fan-in (join) ─────────────────────────────────────────────── */

/** Build ONE branch result. `observable` is always true — isolation is structural. */
export function buildBranch(
  route: GatewayRouteInput,
  outcome: RouteBranchOutcome,
  reason: string,
  options: { attempt?: number; nextStep?: string | null } = {}
): RouteBranchResult {
  const semantics = BRANCH_OUTCOME_SEMANTICS[outcome];
  return {
    routeId: route.routeId,
    label: route.label,
    outcome,
    action: route.action,
    destination: route.destination,
    reason,
    nextStep: options.nextStep === undefined ? (semantics.requiresAttention ? semantics.nextStep : null) : options.nextStep,
    attempt: options.attempt ?? 1,
    observable: true,
    compensation: outcome === 'failed' || outcome === 'timed_out' ? (route.compensation ?? null) : null,
  };
}

/** The observed outcome for a route, when the caller supplied one. */
function observedFor(
  observed: readonly ObservedBranchInput[] | undefined,
  routeId: string
): ObservedBranchInput | undefined {
  return observed?.find((o) => o.routeId === routeId);
}

export interface JoinEvaluationInput {
  policy?: JoinPolicy | null;
  quorum?: number | null;
  branches: readonly RouteBranchResult[];
  routes: readonly GatewayRouteInput[];
}

/**
 * Evaluate the fan-in (join). The completion condition is DECLARED, never
 * inferred: a workflow with a join does not complete because the initiating
 * operation succeeded, and a timed-out or human-review branch never counts.
 */
export function evaluateJoin(input: JoinEvaluationInput): RouteJoinState {
  const policy = input.policy ?? DEFAULT_JOIN_POLICY;
  const branchOutcome = new Map(input.branches.map((b) => [b.routeId, b.outcome] as const));

  const requiredRouteIds = input.routes
    .filter((r) => (r.joinRole ?? 'required') === 'required')
    .map((r) => r.routeId);
  const optionalRouteIds = input.routes
    .filter((r) => r.joinRole === 'optional')
    .map((r) => r.routeId);

  const idsWith = (outcome: RouteBranchOutcome) =>
    input.branches.filter((b) => b.outcome === outcome).map((b) => b.routeId);

  const satisfiedRouteIds = idsWith('satisfied');
  const failedRouteIds = idsWith('failed');
  const retryableRouteIds = idsWith('retryable');
  const timedOutRouteIds = idsWith('timed_out');
  const humanReviewRouteIds = idsWith('human_review');

  const satisfiedRequired = requiredRouteIds.filter((id) => branchOutcome.get(id) === 'satisfied');

  let complete = false;
  let reason: string;

  switch (policy) {
    case 'any':
      complete = satisfiedRouteIds.length > 0;
      reason = JOIN_POLICIES.any.completionCondition;
      break;
    case 'quorum':
      if (input.quorum == null) {
        complete = false;
        reason = `${ROUTE_REFUSALS.quorum_not_declared} (${JOIN_POLICIES.quorum.completionCondition})`;
      } else {
        complete = satisfiedRouteIds.length >= input.quorum;
        reason = `${satisfiedRouteIds.length} of ${input.quorum} declared quorum branches satisfied.`;
      }
      break;
    case 'declared_subset':
    case 'all':
    default:
      complete = requiredRouteIds.length > 0 && satisfiedRequired.length === requiredRouteIds.length;
      reason =
        requiredRouteIds.length === 0
          ? 'No branch was declared required, so the join can never be satisfied.'
          : `${satisfiedRequired.length} of ${requiredRouteIds.length} required branches satisfied.`;
      break;
  }

  let state: RouteJoinState['state'];
  if (humanReviewRouteIds.length > 0) state = 'blocked_human_review';
  else if (complete) state = 'satisfied';
  else if (failedRouteIds.length > 0) state = 'failed';
  else state = 'waiting';

  // A join in a non-satisfied state is never complete, whatever the policy said.
  if (state !== 'satisfied') complete = false;

  return {
    policy,
    state,
    requiredRouteIds,
    optionalRouteIds,
    satisfiedRouteIds,
    failedRouteIds,
    retryableRouteIds,
    timedOutRouteIds,
    humanReviewRouteIds,
    quorum: policy === 'quorum' ? (input.quorum ?? null) : null,
    complete,
    reason,
  };
}

/** True when nothing needs a human and no join is outstanding. */
function deriveTerminal(branches: readonly RouteBranchResult[], join: RouteJoinState | null): boolean {
  if (join) return join.complete;
  return !branches.some((b) => ATTENTION_OUTCOMES.includes(b.outcome));
}

/* ── The decision assembler ───────────────────────────────────────────────── */

interface AssembledDecisionParts {
  gatewayKind: GatewayKind;
  conditions: RouteConditionEvaluation[];
  branches: RouteBranchResult[];
  selectedRouteIds: string[];
  refused: boolean;
  refusalReason: RouteRefusalReason | null;
  refusalDetail: string | null;
  join: RouteJoinState | null;
  structure: GatewayStructureFinding[];
}

function assembleDecision(
  input: GatewayEvaluationInput,
  parts: AssembledDecisionParts
): WorkflowRoutingDecision {
  const digest = conditionDigest(input);
  const at = input.at ?? demoToday();
  return {
    id: routeDecisionId(input.workflowId, input.gatewayId, digest),
    workflowId: input.workflowId,
    gatewayId: input.gatewayId,
    gatewayKind: parts.gatewayKind,
    owner: input.owner,
    subject: input.subject,
    conditions: parts.conditions,
    branches: parts.branches,
    selectedRouteIds: parts.selectedRouteIds,
    refused: parts.refused,
    refusalReason: parts.refusalReason,
    refusalDetail: parts.refusalDetail,
    join: parts.join,
    // A REFUSAL IS NEVER COMPLETION: nothing was selected, so the workflow
    // explicitly has not finished. Terminal is derived only for a decision that
    // actually selected a route (and, when a join is declared, satisfied it).
    terminal: parts.refused ? false : deriveTerminal(parts.branches, parts.join),
    completionInferredFromInitiator: false,
    idempotencyKey: routingIdempotencyKey(input.workflowId, input.gatewayId, digest),
    conditionDigest: digest,
    branchIsolationPreserved: true,
    structure: parts.structure,
    actor: input.actor,
    createdAt: at,
    updatedAt: at,
  };
}

/** The refusing structural finding, when the gateway definition itself is broken. */
function structuralRefusal(
  gatewayKind: GatewayKind,
  findings: readonly GatewayStructureFinding[]
): { reason: RouteRefusalReason; detail: string } | null {
  if (!hasRefusingFinding(findings)) return null;
  const order: GatewayStructureFinding['kind'][] = [
    'unrouted_condition',
    'undeclared_route',
    'duplicate_route',
    'contradictory_conditions',
  ];
  const kind = order.find((k) => findings.some((f) => f.kind === k));
  const finding = findings.find((f) => f.kind === kind);
  const reasonByKind: Record<string, RouteRefusalReason> = {
    unrouted_condition: 'unrouted_condition',
    undeclared_route: 'undeclared_route',
    duplicate_route: 'duplicate_route',
    contradictory_conditions: 'contradictory_conditions',
  };
  return {
    reason: reasonByKind[kind ?? 'undeclared_route'],
    detail: `${GATEWAY_KINDS[gatewayKind].label} refused before evaluation: ${
      finding?.detail ?? 'the gateway definition is structurally invalid.'
    }`,
  };
}

/** Every declared route, skipped, with the refusal reason recorded. */
function allSkipped(routes: readonly GatewayRouteInput[], reason: string): RouteBranchResult[] {
  return routes.map((r) => buildBranch(r, 'skipped', reason, { nextStep: null }));
}

/* ── A. EXCLUSIVE GATEWAY (XOR) — exactly one route ───────────────────────── */

/**
 * Evaluate an exclusive gateway. Exactly ONE route may be selected.
 *
 * It REFUSES rather than guessing when:
 *   - the gateway definition itself is structurally broken,
 *   - any condition could not be evaluated (fail-closed),
 *   - no condition held (`no_condition_met`),
 *   - more than one condition held (`multiple_conditions_met`).
 */
export function evaluateExclusiveGateway(input: GatewayEvaluationInput): WorkflowRoutingDecision {
  const conditions = input.conditions ?? [];
  const evaluated = evaluateConditions(conditions);
  const structure = analyseGatewayStructure({
    gatewayKind: 'exclusive',
    routes: input.routes,
    conditions,
  });

  const refuse = (reason: RouteRefusalReason, detail: string): WorkflowRoutingDecision => {
    const skipped = allSkipped(input.routes, detail);
    return assembleDecision(input, {
      gatewayKind: 'exclusive',
      conditions: evaluated,
      branches: skipped,
      selectedRouteIds: [],
      refused: true,
      refusalReason: reason,
      refusalDetail: detail,
      join: input.join
        ? evaluateJoin({
            policy: input.join,
            quorum: input.quorum,
            branches: skipped,
            routes: input.routes,
          })
        : null,
      structure,
    });
  };

  const structural = structuralRefusal('exclusive', structure);
  if (structural) return refuse(structural.reason, structural.detail);

  const notEvaluable = conditions.filter((c) => c.met === null);
  if (notEvaluable.length > 0) {
    return refuse(
      'condition_not_evaluable',
      `${ROUTE_REFUSALS.condition_not_evaluable} Unevaluable: ${notEvaluable
        .map((c) => `${c.id} (${c.notEvaluatedReason ?? 'reason not stated'})`)
        .join('; ')}`
    );
  }

  const matched = conditions.filter((c) => c.met === true);
  if (matched.length === 0) {
    return refuse(
      'no_condition_met',
      `${ROUTE_REFUSALS.no_condition_met} Evaluated ${conditions.length} declared condition(s) and none held.`
    );
  }
  if (matched.length > 1) {
    return refuse(
      'multiple_conditions_met',
      `${ROUTE_REFUSALS.multiple_conditions_met} Held: ${matched
        .map((c) => c.id)
        .join(', ')}.`
    );
  }

  const winning = matched[0];
  const branches = input.routes.map((route) => {
    if (route.routeId !== winning.routeId) {
      return buildBranch(
        route,
        'skipped',
        `Exactly one route applies: condition "${winning.id}" selected "${winning.routeId}", so this route was not selected.`,
        { nextStep: null }
      );
    }
    const observed = observedFor(input.observed, route.routeId);
    if (observed) {
      return buildBranch(
        route,
        observed.outcome,
        observed.reason ?? 'The selected route reported this outcome.',
        { attempt: observed.attempt, nextStep: observed.nextStep }
      );
    }
    return buildBranch(
      route,
      'satisfied',
      `Selected because condition "${winning.id}" held (${winning.rule}).`
    );
  });

  const join = input.join
    ? evaluateJoin({ policy: input.join, quorum: input.quorum, branches, routes: input.routes })
    : null;

  return assembleDecision(input, {
    gatewayKind: 'exclusive',
    conditions: evaluated,
    branches,
    selectedRouteIds: [winning.routeId],
    refused: false,
    refusalReason: null,
    refusalDetail: null,
    join,
    structure,
  });
}

/* ── B. PARALLEL GATEWAY (AND) — every branch, independently ─────────────── */

/** Outcomes that mean the branch actually ran. */
const ATTEMPTED_OUTCOMES: readonly RouteBranchOutcome[] = [
  'satisfied',
  'failed',
  'retryable',
  'timed_out',
  'human_review',
];

/**
 * Evaluate a parallel gateway. EVERY declared branch is evaluated on its own
 * merits.
 *
 * Two rules this function exists to guarantee:
 *   1. a branch failing never erases a sibling branch's success — each result is
 *      carried separately and `branchIsolationPreserved` is recorded;
 *   2. a branch whose sequential dependency has not been met does NOT run, and
 *      says so, instead of being reported as satisfied.
 */
export function evaluateParallelGateway(input: GatewayEvaluationInput): WorkflowRoutingDecision {
  const structure = analyseGatewayStructure({
    gatewayKind: 'parallel',
    routes: input.routes,
    conditions: input.conditions,
  });

  const branches = input.routes.map((route) => {
    if (route.requiresRouteId) {
      const prereq = observedFor(input.observed, route.requiresRouteId);
      if (!prereq || prereq.outcome !== 'satisfied') {
        return buildBranch(
          route,
          'skipped',
          `Sequential dependency not met: "${route.requiresRouteId}" has not reached satisfied, so this branch did not run.`,
          {
            nextStep: `Satisfy "${route.requiresRouteId}" first, then evaluate this branch again.`,
          }
        );
      }
    }
    const observed = observedFor(input.observed, route.routeId);
    if (observed) {
      return buildBranch(
        route,
        observed.outcome,
        observed.reason ?? 'The branch reported this outcome.',
        { attempt: observed.attempt, nextStep: observed.nextStep }
      );
    }
    return buildBranch(
      route,
      'satisfied',
      'The branch executed; parallel branches run independently of one another.'
    );
  });

  const join = input.join
    ? evaluateJoin({ policy: input.join, quorum: input.quorum, branches, routes: input.routes })
    : null;

  return assembleDecision(input, {
    gatewayKind: 'parallel',
    conditions: evaluateConditions(input.conditions ?? []),
    branches,
    selectedRouteIds: branches
      .filter((b) => ATTEMPTED_OUTCOMES.includes(b.outcome))
      .map((b) => b.routeId),
    // A parallel gateway has no condition to refuse on: a failing branch is an
    // EXCEPTION carried on that branch, never a gateway refusal.
    refused: false,
    refusalReason: null,
    refusalDetail: null,
    join,
    structure,
  });
}

/* ── C. INCLUSIVE GATEWAY (OR) — one OR MORE applicable routes ───────────── */

/**
 * Evaluate an inclusive gateway. The selected subset is EXACTLY the set of
 * conditions that held.
 *
 * It is deliberately NOT implemented as "always all" and NOT as "exactly one":
 *   - a condition that held selects its route,
 *   - a condition that was explicitly false marks its route `not_applicable`,
 *   - nothing holding refuses (`no_applicable_route`) rather than executing an
 *     arbitrary branch.
 */
export function evaluateInclusiveGateway(input: GatewayEvaluationInput): WorkflowRoutingDecision {
  const conditions = input.conditions ?? [];
  const evaluated = evaluateConditions(conditions);
  const structure = analyseGatewayStructure({
    gatewayKind: 'inclusive',
    routes: input.routes,
    conditions,
  });

  const refuse = (reason: RouteRefusalReason, detail: string): WorkflowRoutingDecision => {
    const marked = input.routes.map((route) => {
      const owned = conditions.filter((c) => c.routeId === route.routeId);
      const explicitlyApplicable = owned.some((c) => c.met === true);
      const explicitlyFalse = owned.length > 0 && owned.every((c) => c.met === false);
      return buildBranch(
        route,
        explicitlyApplicable ? 'skipped' : explicitlyFalse ? 'not_applicable' : 'skipped',
        detail,
        { nextStep: null }
      );
    });
    return assembleDecision(input, {
      gatewayKind: 'inclusive',
      conditions: evaluated,
      branches: marked,
      selectedRouteIds: [],
      refused: true,
      refusalReason: reason,
      refusalDetail: detail,
      join: input.join
        ? evaluateJoin({
            policy: input.join,
            quorum: input.quorum,
            branches: marked,
            routes: input.routes,
          })
        : null,
      structure,
    });
  };

  const structural = structuralRefusal('inclusive', structure);
  if (structural) return refuse(structural.reason, structural.detail);

  const notEvaluable = conditions.filter((c) => c.met === null);
  if (notEvaluable.length > 0) {
    return refuse(
      'condition_not_evaluable',
      `${ROUTE_REFUSALS.condition_not_evaluable} Unevaluable: ${notEvaluable
        .map((c) => `${c.id} (${c.notEvaluatedReason ?? 'reason not stated'})`)
        .join('; ')}`
    );
  }

  const applicable = conditions.filter((c) => c.met === true);
  if (applicable.length === 0) {
    return refuse(
      'no_applicable_route',
      `${ROUTE_REFUSALS.no_applicable_route} Evaluated ${conditions.length} declared condition(s); none applied.`
    );
  }

  const selectedRoutes = new Set(applicable.map((c) => c.routeId));

  const branches = input.routes.map((route) => {
    const owning = conditions.filter((c) => c.routeId === route.routeId);
    if (!selectedRoutes.has(route.routeId)) {
      const falsified = owning.filter((c) => c.met === false).map((c) => c.id);
      return buildBranch(
        route,
        owning.length === 0 ? 'skipped' : 'not_applicable',
        owning.length === 0
          ? 'No declared condition selects this route, so it was not applicable.'
          : `The declared condition(s) ${falsified.join(', ')} were explicitly FALSE, so this route is not applicable.`,
        { nextStep: null }
      );
    }
    const observed = observedFor(input.observed, route.routeId);
    if (observed) {
      return buildBranch(
        route,
        observed.outcome,
        observed.reason ?? 'The applicable route reported this outcome.',
        { attempt: observed.attempt, nextStep: observed.nextStep }
      );
    }
    const winning = owning.filter((c) => c.met === true).map((c) => c.id);
    return buildBranch(
      route,
      'satisfied',
      `Applicable because condition(s) ${winning.join(', ')} held.`
    );
  });

  const join = input.join
    ? evaluateJoin({ policy: input.join, quorum: input.quorum, branches, routes: input.routes })
    : null;

  return assembleDecision(input, {
    gatewayKind: 'inclusive',
    conditions: evaluated,
    branches,
    selectedRouteIds: [...selectedRoutes],
    refused: false,
    refusalReason: null,
    refusalDetail: null,
    join,
    structure,
  });
}

/* ── D. Sequential dependency — B cannot proceed until A is in its required state ── */

export interface SequentialDependencyInput {
  prerequisiteRouteId: string;
  /** The outcome the prerequisite has produced; null when it has not run at all. */
  prerequisiteOutcome: RouteBranchOutcome | null;
  /** The state the prerequisite must reach (almost always `satisfied`). */
  requiredOutcome: RouteBranchOutcome;
  dependentRouteId: string;
}

export interface SequentialDependencyResult {
  canProceed: boolean;
  refusalReason: RouteRefusalReason | null;
  reason: string;
}

/**
 * Evaluate a sequential dependency. A dependent route does NOT proceed on the
 * assumption that its prerequisite "probably" succeeded — the prerequisite must
 * have positively reached its required state.
 */
export function evaluateSequentialDependency(
  input: SequentialDependencyInput
): SequentialDependencyResult {
  if (input.prerequisiteOutcome === null) {
    return {
      canProceed: false,
      refusalReason: 'prerequisite_not_reached',
      reason: `"${input.dependentRouteId}" cannot proceed: the prerequisite route "${input.prerequisiteRouteId}" has not run yet, so it has not reached "${input.requiredOutcome}".`,
    };
  }
  if (input.prerequisiteOutcome !== input.requiredOutcome) {
    return {
      canProceed: false,
      refusalReason: 'prerequisite_not_reached',
      reason: `"${input.dependentRouteId}" cannot proceed: "${input.prerequisiteRouteId}" is "${input.prerequisiteOutcome}", not "${input.requiredOutcome}". ${BRANCH_OUTCOME_SEMANTICS[input.prerequisiteOutcome].nextStep}`,
    };
  }
  return {
    canProceed: true,
    refusalReason: null,
    reason: `"${input.prerequisiteRouteId}" reached "${input.requiredOutcome}", so "${input.dependentRouteId}" may proceed.`,
  };
}

/* ── E. Event-based routing ───────────────────────────────────────────────── */

export interface EventRoutingInput {
  eventId: string;
  /** The DECLARED map of canonical event id → route id. */
  routes: Record<string, string>;
}

export interface EventRoutingResult {
  matched: boolean;
  routeId: string | null;
  refusalReason: RouteRefusalReason | null;
  reason: string;
}

/**
 * Route to the next step based on WHICH qualifying event occurred. An event with
 * no declared route is refused (`unknown_event`) and surfaced — never ignored and
 * never treated as "nothing happened".
 */
export function evaluateEventRouting(input: EventRoutingInput): EventRoutingResult {
  const routeId = input.routes[input.eventId];
  if (!routeId) {
    return {
      matched: false,
      routeId: null,
      refusalReason: 'unknown_event',
      reason: `${ROUTE_REFUSALS.unknown_event} Event "${input.eventId}" is not in the declared route map (${
        Object.keys(input.routes).join(', ') || 'no events declared'
      }).`,
    };
  }
  return {
    matched: true,
    routeId,
    refusalReason: null,
    reason: `Event "${input.eventId}" routes to "${routeId}" as declared.`,
  };
}

/* ── F. Compensation / recovery ───────────────────────────────────────────── */

export interface CompensationPlan {
  routeId: string;
  /** The declared compensation action, or null when none is declared. */
  action: string | null;
  /** True when no compensation is declared — an authorised human must decide. */
  requiresHuman: boolean;
  attempt: number;
  reason: string;
}

/**
 * Determine what happens when a SELECTED branch later fails.
 *
 * A route with no declared compensation is NOT silently ignored: it is routed to
 * human review, because an uncompensated failure is exactly the situation an
 * operator has to see.
 */
export function planCompensation(
  route: GatewayRouteInput,
  failureReason: string,
  attempt = 1
): CompensationPlan {
  if (route.compensation) {
    return {
      routeId: route.routeId,
      action: route.compensation,
      requiresHuman: false,
      attempt,
      reason: `Compensation declared for "${route.routeId}": ${route.compensation} (failure: ${failureReason}).`,
    };
  }
  return {
    routeId: route.routeId,
    action: null,
    requiresHuman: true,
    attempt,
    reason: `No compensation is declared for "${route.routeId}" (failure: ${failureReason}). The failure is routed to human review rather than ignored.`,
  };
}