/**
 * §Phase 2 — EXPLICIT WORKFLOW ROUTING / GATEWAY ARCHITECTURE (single source of truth).
 *
 * Mercenta must route every material business condition INTENTIONALLY. This file
 * declares the vocabulary ONCE so that:
 *
 *   - the same gateway kind can never mean two different things in two modules,
 *   - no condition can be handled by an invented default,
 *   - a validator can pin the declared semantics.
 *
 * ⚠️ THIS IS NOT A WORKFLOW ENGINE. It is a vocabulary + pure evaluators
 * (`src/lib/routing/gateways.ts`) layered on top of the primitives that ALREADY
 * exist in this codebase:
 *
 *   - canonical events      `src/lib/events/`        (fan-out)
 *   - the work layer        `src/lib/work/`          (a selected route becomes work)
 *   - the automation ledger `src/lib/automation/registry.ts`
 *                            (human approval gate, retry, observable failure,
 *                             escalation, idempotency digest)
 *   - the audit registry    `demoAuditLog`           (why a route was taken)
 *   - the domain port       `src/data/domainRepository.ts`
 *
 * Introducing a second orchestration system is explicitly forbidden: the
 * evaluators RECORD decisions into canonical state and emit canonical events
 * exactly like every other capability.
 */

/** The three gateway kinds Mercenta supports, with their BPMN equivalent. */
export type GatewayKind = 'exclusive' | 'parallel' | 'inclusive';

export interface GatewayKindDefinition {
  id: GatewayKind;
  label: string;
  /** The equivalent notation name, so an architect can map it instantly. */
  notationAlias: 'XOR' | 'AND' | 'OR';
  semantics: string;
  /** How many routes ONE evaluation may select. */
  selection: 'exactly_one' | 'one_or_more' | 'all';
  /**
   * True when this gateway MUST refuse rather than pick a route without a
   * matching condition. Parallel gateways run every branch unconditionally, so
   * they have nothing to refuse — but they still never report completion from
   * one branch alone.
   */
  refusesDefaultSuccess: boolean;
  /** What happens when no condition matches (or when a parallel branch fails). */
  noMatchBehaviour: string;
}

export const GATEWAY_KINDS: Record<GatewayKind, GatewayKindDefinition> = {
  exclusive: {
    id: 'exclusive',
    label: 'Exclusive gateway',
    notationAlias: 'XOR',
    semantics:
      'Exactly ONE route applies. The conditions must be explicit and deterministic, and the gateway refuses when none — or more than one — condition holds. There is no ambiguous default-success path.',
    selection: 'exactly_one',
    refusesDefaultSuccess: true,
    noMatchBehaviour:
      'refused (no_condition_met / multiple_conditions_met) — the decision is recorded as a refusal, never guessed.',
  },
  parallel: {
    id: 'parallel',
    label: 'Parallel gateway',
    notationAlias: 'AND',
    semantics:
      'Every branch executes simultaneously and independently. Branches stay independently observable: one branch failing never erases another branch’s success, and a failure is never hidden by a success elsewhere.',
    selection: 'all',
    refusesDefaultSuccess: false,
    noMatchBehaviour:
      'every branch is evaluated on its own merits; each carries its own outcome, and any failed/retryable branch remains visible in the decision record.',
  },
  inclusive: {
    id: 'inclusive',
    label: 'Inclusive gateway',
    notationAlias: 'OR',
    semantics:
      'ONE OR MORE applicable routes execute, determined ONLY by explicit conditions. It is never implemented as always-all and never as exactly-one: the selected subset is exactly the set of conditions that hold.',
    selection: 'one_or_more',
    refusesDefaultSuccess: true,
    noMatchBehaviour:
      'refused (no_applicable_route) — the evaluation reports that no declared route was applicable rather than executing an arbitrary branch.',
  },
};

/** Display order — the required order (parallel, exclusive, inclusive). */
export const GATEWAY_KIND_ORDER: readonly GatewayKind[] = [
  'parallel',
  'exclusive',
  'inclusive',
] as const;

/** §6 — the three canonical worked examples the platform must satisfy. */
export interface GatewayExample {
  id: 'po_received_fan_out' | 'commercial_gate' | 'product_review_or';
  gatewayKind: GatewayKind;
  title: string;
  /** The branches/conditions, in declaration order. */
  routes: readonly string[];
  note: string;
}

export const GATEWAY_EXAMPLES: readonly GatewayExample[] = [
  {
    id: 'po_received_fan_out',
    gatewayKind: 'parallel',
    title: 'PO received → parallel gateway',
    routes: [
      'operations',
      'brand_notification',
      'finance_projection',
      'calendar_deadline',
      'work_item',
      'bi',
      'founder_control_centre',
      'audit',
      'automation',
    ],
    note: 'All branches run independently; a failing branch stays observable.',
  },
  {
    id: 'commercial_gate',
    gatewayKind: 'exclusive',
    title: 'Commercial gate → READY | REMEDIATION | BLOCKED',
    routes: ['ready', 'remediation', 'blocked', 'human_review'],
    note: 'Exactly one route is selected; ambiguity or no match refuses.',
  },
  {
    id: 'product_review_or',
    gatewayKind: 'inclusive',
    title: 'Product requires → compliance | packaging | supply review',
    routes: ['compliance_review', 'packaging_review', 'supply_review'],
    note: 'One, several or all applicable routes execute — determined by conditions.',
  },
] as const;

/* ── Branch outcomes ───────────────────────────────────────────────────────── */

/**
 * The outcome of ONE branch. Deliberately NOT a boolean: a failed branch, a
 * retryable branch, a timed-out branch and a branch parked for human review are
 * four different operational facts and must stay distinguishable.
 */
export type RouteBranchOutcome =
  | 'satisfied'
  | 'not_applicable'
  | 'skipped'
  | 'failed'
  | 'retryable'
  | 'timed_out'
  | 'human_review';

export interface BranchOutcomeSemantics {
  id: RouteBranchOutcome;
  label: string;
  /** Does this outcome count towards a join's completion condition? */
  countsAsComplete: boolean;
  /** Must this outcome remain visible/actionable? */
  requiresAttention: boolean;
  /** The declared next step for this outcome. */
  nextStep: string;
}

export const BRANCH_OUTCOME_SEMANTICS: Record<RouteBranchOutcome, BranchOutcomeSemantics> = {
  satisfied: {
    id: 'satisfied',
    label: 'Satisfied',
    countsAsComplete: true,
    requiresAttention: false,
    nextStep: 'None — the branch completed.',
  },
  not_applicable: {
    id: 'not_applicable',
    label: 'Not applicable',
    countsAsComplete: false,
    requiresAttention: false,
    nextStep: 'None — the condition was explicitly false, and that is recorded.',
  },
  skipped: {
    id: 'skipped',
    label: 'Skipped',
    countsAsComplete: false,
    requiresAttention: false,
    nextStep: 'None — another route was selected by the gateway.',
  },
  failed: {
    id: 'failed',
    label: 'Failed',
    countsAsComplete: false,
    requiresAttention: true,
    nextStep: 'Route to remediation or human review — never reported as success.',
  },
  retryable: {
    id: 'retryable',
    label: 'Failed — retryable',
    countsAsComplete: false,
    requiresAttention: true,
    nextStep: 'Retry under the declared idempotency key; a retry must not duplicate state.',
  },
  timed_out: {
    id: 'timed_out',
    label: 'Timed out',
    countsAsComplete: false,
    requiresAttention: true,
    nextStep: 'Escalate — a timed-out branch never silently becomes satisfied.',
  },
  human_review: {
    id: 'human_review',
    label: 'Awaiting human review',
    countsAsComplete: false,
    requiresAttention: true,
    nextStep: 'An authorised human must decide; the workflow is paused, not complete.',
  },
};

/** Every outcome that means "this branch needs a human to act". */
export const ATTENTION_OUTCOMES: readonly RouteBranchOutcome[] = [
  'failed',
  'retryable',
  'timed_out',
  'human_review',
] as const;

/* ── Refusals ──────────────────────────────────────────────────────────────── */

/**
 * §8 — NO SILENT CONDITIONS. Every one of these is an EXPLICIT refusal with its
 * own recorded reason. A refusal is a first-class outcome, not an error string:
 * it routes to human review / remediation and it is audited.
 */
export type RouteRefusalReason =
  | 'no_condition_met'
  | 'multiple_conditions_met'
  | 'no_applicable_route'
  | 'condition_not_evaluable'
  | 'undeclared_route'
  | 'unrouted_condition'
  | 'duplicate_route'
  | 'contradictory_conditions'
  | 'join_not_satisfied'
  | 'quorum_not_declared'
  | 'prerequisite_not_reached'
  | 'unknown_event';

export const ROUTE_REFUSALS: Record<RouteRefusalReason, string> = {
  no_condition_met:
    'No declared condition held. An exclusive gateway never falls through to a default route.',
  multiple_conditions_met:
    'More than one condition held in a gateway that permits exactly one. Ambiguity is refused rather than resolved by guessing.',
  no_applicable_route:
    'No declared route was applicable to the observed conditions. Nothing was executed.',
  condition_not_evaluable:
    'A condition could not be evaluated (missing or unreadable input), so the evaluator failed closed instead of assuming it held.',
  undeclared_route: 'A condition points at a route that is not declared on the gateway.',
  unrouted_condition:
    'A declared condition has no route attached to it, so it would be silently dropped.',
  duplicate_route:
    'Two conditions select the same route in a gateway that permits exactly one — the branch is duplicated.',
  contradictory_conditions:
    'Two conditions that cannot both hold were both observed as holding.',
  join_not_satisfied:
    'The join condition is not met. The workflow does not proceed and is not reported complete.',
  quorum_not_declared:
    'A quorum join was requested without a declared quorum. Mercenta does not invent one.',
  prerequisite_not_reached:
    'A sequential dependency has not reached its required state, so the dependent route cannot proceed.',
  unknown_event:
    'An event arrived that has no declared route. It is refused and surfaced rather than ignored.',
};

/* ── Joins (fan-in) ────────────────────────────────────────────────────────── */

/**
 * How a join decides that enough branches have completed. `all` is the default
 * because a fan-in that completes early is the classic false-completion defect.
 */
export type JoinPolicy = 'all' | 'declared_subset' | 'quorum' | 'any';

export interface JoinPolicyDefinition {
  id: JoinPolicy;
  label: string;
  completionCondition: string;
}

export const JOIN_POLICIES: Record<JoinPolicy, JoinPolicyDefinition> = {
  all: {
    id: 'all',
    label: 'All required branches',
    completionCondition:
      'Every REQUIRED branch reached `satisfied`. Optional branches never block progress.',
  },
  declared_subset: {
    id: 'declared_subset',
    label: 'Declared subset',
    completionCondition: 'Every branch explicitly declared REQUIRED reached `satisfied`.',
  },
  quorum: {
    id: 'quorum',
    label: 'Quorum',
    completionCondition:
      'At least the DECLARED number of branches reached `satisfied`. No quorum declared ⇒ refused.',
  },
  any: {
    id: 'any',
    label: 'Any single branch',
    completionCondition:
      'At least one branch reached `satisfied`. Only valid where the business genuinely means "any".',
  },
};

export type JoinState = 'waiting' | 'satisfied' | 'failed' | 'blocked_human_review';

export const JOIN_STATE_LABELS: Record<JoinState, string> = {
  waiting: 'Waiting on branches',
  satisfied: 'Join satisfied',
  failed: 'Join failed',
  blocked_human_review: 'Blocked — human review required',
};

/** The default join policy. `all` is deliberately the safest default. */
export const DEFAULT_JOIN_POLICY: JoinPolicy = 'all';

/* ── §7 — the full routing-semantics catalogue ─────────────────────────────── */

/**
 * Every routing semantic the platform must support or model, with an HONEST
 * statement of where it is honoured. `status: 'declared'` means the platform
 * models it (the decision record carries it) but a dedicated evaluator is not
 * the mechanism — that distinction is deliberate and is pinned by the
 * validator, so this file can never overstate what is implemented.
 */
export type RoutingSemanticId =
  | 'sequential_dependency'
  | 'event_based'
  | 'fan_out'
  | 'fan_in_join'
  | 'human_approval'
  | 'exception'
  | 'retry'
  | 'escalation'
  | 'compensation'
  | 'terminal_completion';

export interface RoutingSemantic {
  id: RoutingSemanticId;
  label: string;
  description: string;
  status: 'implemented' | 'declared';
  /** Where the semantic is actually honoured. */
  implementedBy: string;
  /** What proves it works. */
  exercisedBy: string;
}

export const ROUTING_SEMANTICS: readonly RoutingSemantic[] = [
  {
    id: 'sequential_dependency',
    label: 'Sequential dependency',
    description: 'B cannot proceed until A has reached its required state.',
    status: 'implemented',
    implementedBy: 'src/lib/routing/gateways.ts → evaluateSequentialDependency',
    exercisedBy: 'scripts/validate-routing-gateways.mjs',
  },
  {
    id: 'event_based',
    label: 'Event-based routing',
    description: 'The next route depends on which qualifying event occurred.',
    status: 'implemented',
    implementedBy: 'src/lib/routing/gateways.ts → evaluateEventRouting',
    exercisedBy: 'scripts/validate-routing-gateways.mjs',
  },
  {
    id: 'fan_out',
    label: 'Fan-out',
    description: 'One canonical event creates multiple downstream projections/actions.',
    status: 'implemented',
    implementedBy: 'src/lib/routing/gateways.ts → evaluateParallelGateway',
    exercisedBy: 'scripts/validate-routing-gateways.mjs',
  },
  {
    id: 'fan_in_join',
    label: 'Fan-in / join',
    description: 'Multiple required branches converge before the workflow may proceed.',
    status: 'implemented',
    implementedBy: 'src/lib/routing/gateways.ts → evaluateJoin',
    exercisedBy: 'scripts/validate-routing-gateways.mjs',
  },
  {
    id: 'human_approval',
    label: 'Human approval gate',
    description: 'A workflow pauses for authorised human approval.',
    status: 'implemented',
    implementedBy:
      'src/lib/automation/registry.ts (PendingApproval + decideAutomationApproval) and the routing outcome `human_review`',
    exercisedBy: 'scripts/validate-founder-operating-system.mjs + the routing validator',
  },
  {
    id: 'exception',
    label: 'Exception gateway',
    description: 'An abnormal state enters an explicit exception route.',
    status: 'implemented',
    implementedBy:
      'the routing outcomes `failed` / `retryable` / `human_review` plus the work status `blocked`',
    exercisedBy: 'scripts/validate-routing-gateways.mjs',
  },
  {
    id: 'retry',
    label: 'Retry gate',
    description: 'Determines whether an operation is safely retryable.',
    status: 'implemented',
    implementedBy:
      'the `retryable` outcome + the declared idempotency key, and src/lib/automation/registry.ts → retryAutomation',
    exercisedBy: 'scripts/validate-routing-gateways.mjs (retry does not duplicate state)',
  },
  {
    id: 'escalation',
    label: 'Escalation gate',
    description: 'Routes unresolved conditions by declared threshold/deadline.',
    status: 'implemented',
    implementedBy:
      'src/lib/work/reminderRunner.ts (declared deadline boundaries) + the `timed_out` outcome',
    exercisedBy: 'scripts/validate-work-layer.mjs + the routing validator',
  },
  {
    id: 'compensation',
    label: 'Compensation / recovery',
    description: 'Defines what happens when a later failure requires corrective action.',
    status: 'implemented',
    implementedBy:
      'src/lib/routing/gateways.ts → planCompensation (a route with no declared compensation is routed to human review, never ignored)',
    exercisedBy: 'scripts/validate-routing-gateways.mjs',
  },
  {
    id: 'terminal_completion',
    label: 'Terminal / completion gate',
    description: 'Determines whether the workflow is genuinely complete.',
    status: 'implemented',
    implementedBy:
      'src/lib/routing/gateways.ts (join completion + an explicit terminal flag; completion is never inferred from the initiating operation)',
    exercisedBy: 'scripts/validate-routing-gateways.mjs',
  },
] as const;

/* ── Non-negotiable declarations (pinned by the validator) ─────────────────── */

/** Nothing falls through silently; every unmatched condition refuses explicitly. */
export const NO_SILENT_FALL_THROUGH = true;
/** An exclusive gateway refuses ambiguity instead of resolving it by order. */
export const EXCLUSIVE_GATEWAY_REFUSES_AMBIGUITY = true;
/** A parallel branch failing never erases a sibling branch's success. */
export const PARALLEL_BRANCH_ISOLATION = true;
/** A join never completes merely because the initiating operation succeeded. */
export const JOIN_NEVER_INFERS_FROM_INITIATOR = true;
/** The declared outcome for a condition nothing else can handle. */
export const UNHANDLED_CONDITION_ROUTES_TO: RouteBranchOutcome = 'human_review';
/** Routing is pure decision-making: it never calls a provider itself. */
export const ROUTING_MAKES_ZERO_PROVIDER_CALLS = true;
/** The declared format of the idempotency key. */
export const ROUTING_KEY_FORMAT = '<workflowId>|<gatewayId>|<conditionDigest>';
/** A repeated identical evaluation must not create a second canonical decision. */
export const ROUTING_IS_IDEMPOTENT = true;

/* ── Structure findings (§8 — no unreachable/duplicate/contradictory branch) ── */

export type GatewayStructureFindingKind =
  | 'undeclared_route'
  | 'unrouted_condition'
  | 'duplicate_route'
  | 'unreachable_route'
  | 'contradictory_conditions';

export const GATEWAY_STRUCTURE_FINDING_LABELS: Record<GatewayStructureFindingKind, string> = {
  undeclared_route: 'A condition selects a route that is not declared',
  unrouted_condition: 'A declared condition has no route attached',
  duplicate_route: 'Two conditions select the same route',
  unreachable_route: 'A declared route no condition can select',
  contradictory_conditions: 'Two conditions with the same rule disagree',
};

/**
 * The finding kinds that make a decision structurally INVALID. A decision
 * carrying any of these is refused even before its conditions are read — the
 * gateway itself is malformed and must not be trusted.
 */
export const STRUCTURAL_FINDINGS_ARE_REFUSING: readonly GatewayStructureFindingKind[] = [
  'undeclared_route',
  'unrouted_condition',
  'duplicate_route',
  'contradictory_conditions',
] as const;

/* ── Test ids (browser tests select on these, never on copy) ───────────────── */

export const ROUTING_TEST_IDS = {
  commercialGate: 'routing-commercial-gate',
  routeBadge: 'routing-route-badge',
  routeTrace: 'routing-route-trace',
  refusalNotice: 'routing-refusal-notice',
  joinState: 'routing-join-state',
} as const;

/* ── §8 — every refusal has an INTENTIONAL disposition ───────────────────── */

/**
 * A refusal is never a dead end. Each refusal reason is mapped to the disposition
 * the platform must take, so "no silent conditions" holds all the way through: a
 * refused gateway is routed somewhere explicit and its reason is audited.
 */
export type RouteDispositionId =
  | 'human_review'
  | 'remediation'
  | 'blocked'
  | 'exception'
  | 'retry'
  | 'escalation';

export const ROUTE_DISPOSITIONS: Record<RouteDispositionId, string> = {
  human_review:
    'Parked for an authorised human decision. Nothing proceeds until that decision is recorded.',
  remediation:
    'A fixable gap was identified. The named gap is raised for correction, then re-evaluated.',
  blocked: 'Definitively unmet. Nothing proceeds and the state is reported honestly as blocked.',
  exception:
    'An abnormal state. It enters the explicit exception path with an observable, attributed record.',
  retry:
    'Safely retryable under the declared idempotency key. A retry must not duplicate canonical state.',
  escalation:
    'Unresolved past its declared boundary. It is escalated under the existing escalation rules.',
};

export const ROUTE_REFUSAL_DISPOSITIONS: Record<RouteRefusalReason, RouteDispositionId> = {
  no_condition_met: 'human_review',
  multiple_conditions_met: 'human_review',
  no_applicable_route: 'human_review',
  condition_not_evaluable: 'human_review',
  undeclared_route: 'exception',
  unrouted_condition: 'exception',
  duplicate_route: 'exception',
  contradictory_conditions: 'exception',
  join_not_satisfied: 'escalation',
  quorum_not_declared: 'human_review',
  prerequisite_not_reached: 'remediation',
  unknown_event: 'exception',
};