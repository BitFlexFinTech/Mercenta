/**
 * §Phase 2 — CANONICAL ROUTING DECISION STORE.
 *
 * Single runtime source of truth for routing decisions. It mirrors the contract
 * every other domain store in this codebase follows (`preAuditStore`,
 * `prospectStore`) — there is no second persistence mechanism, no second
 * database and no second event system:
 *
 *   - the in-memory array is the deterministic working set (ZERO network),
 *   - every mutation is mirrored through the SAME domain persistence port
 *     (`src/data/domainRepository.ts → routing_decisions`),
 *   - audit goes to the canonical registry (`demoAuditLog`),
 *   - events go to the EXISTING canonical feed (`src/lib/events/eventFeed.ts`),
 *   - with no Supabase configured the active adapter is memory and the reported
 *     status is honestly `memory-only`.
 *
 * IDEMPOTENCE IS STRUCTURAL, NOT OPTIONAL
 * ---------------------------------------
 * The decision id and the idempotency key are deterministic functions of the
 * gateway inputs (`src/lib/routing/gateways.ts`). This store keeps an index of
 * seen keys: recording the SAME key a second time is SUPPRESSED and reported —
 * no second decision row, no second audit entry, no second event. That is what
 * makes a repeated sweep, a double-click, a retry, a replayed callback or a
 * scheduler rerun safe.
 *
 * A REFUSAL IS NEVER SILENT
 * -------------------------
 * Every refusal reason maps to a declared disposition
 * (`src/config/routing.ts → ROUTE_REFUSAL_DISPOSITIONS`), the refusal emits an
 * `important` event, and the reason is written to the audit registry. Nothing is
 * dropped.
 */
import type { RouteBranchResult, RoutingOwner, WorkflowRoutingDecision } from '@/types';
import {
  ATTENTION_OUTCOMES,
  GATEWAY_KINDS,
  ROUTE_DISPOSITIONS,
  ROUTE_REFUSAL_DISPOSITIONS,
  type RouteDispositionId,
} from '@/config/routing';
import {
  COMMERCIAL_GATE_ID,
  COMMERCIAL_ROUTE_SELECTED_EVENT,
} from '@/config/commercialReadiness';
import { demoAuditLog } from './demoStore';
import {
  MERCENTA_OPS_TENANT,
  createPersistenceMirror,
  getDomainRepository,
  type PersistenceStatus,
  type TenantScope,
} from './domainRepository';
import { emitEvent } from '@/lib/events/eventFeed';
import { demoToday } from '@/lib/work/workStore';
import type { PreAuditScope } from './preAuditStore';
import { notifyCanonicalStoreChange } from '@/lib/domain/canonicalSignal';

/**
 * The scope a reader is asking from. The SAME three-way ownership the pre-audit
 * store established is reused rather than re-declared, so the two visibility
 * rules cannot drift apart.
 */
export type RoutingScope = PreAuditScope;

let decisions: WorkflowRoutingDecision[] = [];
/** idempotency key → decision id. The duplicate guard, in ONE place. */
let byIdempotencyKey = new Map<string, string>();
let duplicatesSuppressed = 0;
let version = 0;
const listeners = new Set<() => void>();

const persistenceMirror = createPersistenceMirror();
const mirror = persistenceMirror.write;

export function getRoutingPersistenceStatus(): PersistenceStatus {
  return persistenceMirror.status();
}

export async function flushRoutingPersistence(): Promise<void> {
  await persistenceMirror.flush();
}

export function subscribeRoutingStore(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function routingVersion(): number {
  return version;
}

function notify(): void {
  version += 1;
  for (const l of listeners) l();
}

/** The owning tenant id for the persistence port (public → the ops tenant). */
export function tenantIdForRouting(owner: RoutingOwner): string {
  return owner.kind === 'public_session' ? MERCENTA_OPS_TENANT : owner.tenantId;
}

/* ── The ONE visibility rule ─────────────────────────────────────────────── */

export function ownerMatchesRoutingScope(owner: RoutingOwner, scope: RoutingScope): boolean {
  if (scope.kind === 'ops') return true;
  if (scope.kind === 'public_session') {
    return owner.kind === 'public_session' && owner.sessionId === scope.sessionId;
  }
  return owner.kind === 'brand' && owner.tenantId === scope.tenantId;
}

export function routeDecisionsForScope(scope: RoutingScope): WorkflowRoutingDecision[] {
  return decisions.filter((d) => ownerMatchesRoutingScope(d.owner, scope));
}

/** ALL decisions, including every tenant's. Ops/validator use only — never a brand. */
export function allRouteDecisions(): WorkflowRoutingDecision[] {
  return [...decisions];
}

export function getRouteDecision(id: string): WorkflowRoutingDecision | undefined {
  return decisions.find((d) => d.id === id);
}

/** Every decision about ONE canonical record (newest first). */
export function routeDecisionsForSubject(subjectId: string): WorkflowRoutingDecision[] {
  return decisions.filter((d) => d.subject.id === subjectId);
}

/** How many duplicate evaluations this session suppressed. Evidence of idempotence. */
export function routingDuplicatesSuppressed(): number {
  return duplicatesSuppressed;
}

/* ── Audit (the canonical registry — never a second one) ─────────────────── */

function audit(
  action: string,
  decisionId: string,
  reason: string,
  actor: string,
  subjectId?: string
): void {
  demoAuditLog.push({
    id: `audit-${action}-${decisionId}-${demoAuditLog.length}`,
    createdAt: demoToday(),
    actorId: actor,
    action,
    entityType: 'routing_decision',
    entityId: decisionId,
    brandId: subjectId ?? decisionId,
    reason,
  });
  notifyCanonicalStoreChange();
}

/* ── Disposition + the canonical events ──────────────────────────────────── */

/**
 * The declared disposition of a decision. A refusal is NEVER a dead end: this is
 * the mapping that routes it somewhere explicit.
 */
export function routeDispositionFor(decision: WorkflowRoutingDecision): RouteDispositionId {
  if (decision.refused && decision.refusalReason) {
    return ROUTE_REFUSAL_DISPOSITIONS[decision.refusalReason];
  }
  if (decision.join && !decision.join.complete) return 'escalation';
  const attention = decision.branches.filter((b) => ATTENTION_OUTCOMES.includes(b.outcome));
  if (attention.some((b) => b.outcome === 'retryable')) return 'retry';
  if (attention.some((b) => b.outcome === 'human_review')) return 'human_review';
  if (attention.some((b) => b.outcome === 'failed' || b.outcome === 'timed_out')) return 'exception';
  return decision.terminal ? 'blocked' : 'human_review';
}

/** The event tenant scope: a brand-owned decision is brand-scoped, otherwise platform-wide. */
function eventTenantId(owner: RoutingOwner): string | null {
  return owner.kind === 'brand' ? owner.tenantId : null;
}

/**
 * Emit the canonical events for ONE decision. Event emission is INSIDE the
 * idempotence guard (the caller only reaches here on a first-time record), so a
 * duplicate evaluation cannot emit a duplicate event.
 */
function emitRoutingEvents(decision: WorkflowRoutingDecision, disposition: RouteDispositionId): number {
  const base = {
    entityId: decision.id,
    tenantId: eventTenantId(decision.owner),
    idempotencyKey: decision.idempotencyKey,
    routeId: decision.id,
    correlationId: decision.workflowId,
  };
  let emitted = 0;

  if (decision.refused) {
    emitEvent({
      type: 'route_refused',
      severity: 'important',
      title: `${GATEWAY_KINDS[decision.gatewayKind].label} refused`,
      description: decision.refusalDetail ?? 'The gateway refused to select a route.',
      ...base,
      metadata: {
        gatewayId: decision.gatewayId,
        gatewayKind: decision.gatewayKind,
        refusalReason: decision.refusalReason,
        disposition,
        dispositionLabel: ROUTE_DISPOSITIONS[disposition],
        subject: decision.subject,
      },
    });
    emitted += 1;
  }

  const attention = decision.branches.filter((b) => ATTENTION_OUTCOMES.includes(b.outcome));
  if (!decision.refused && attention.length > 0) {
    emitEvent({
      type: 'route_branch_failed',
      severity: 'important',
      title: `${attention.length} branch(es) need attention`,
      description: attention
        .map((b) => `${b.label}: ${b.outcome} — ${b.reason}`)
        .join(' | ')
        .slice(0, 500),
      ...base,
      branchOutcomes: attention.map((b) => ({ routeId: b.routeId, outcome: b.outcome })),
      metadata: { gatewayId: decision.gatewayId, disposition },
    });
    emitted += 1;
  }

  if (decision.join) {
    if (decision.join.complete) {
      emitEvent({
        type: 'route_join_satisfied',
        severity: 'informational',
        title: 'Fan-in satisfied',
        description: `${decision.join.reason} The workflow may proceed.`,
        ...base,
        metadata: { policy: decision.join.policy, state: decision.join.state },
      });
    } else if (decision.join.state !== 'satisfied') {
      emitEvent({
        type: 'route_join_incomplete',
        severity: 'important',
        title: 'Fan-in not satisfied — the workflow is not complete',
        description: `${decision.join.reason} Completion is never inferred from the initiating operation.`,
        ...base,
        metadata: { policy: decision.join.policy, state: decision.join.state },
      });
    }
    emitted += 1;
  }

  if (!decision.refused && !decision.join && attention.length === 0) {
    emitEvent({
      type: 'routing_decision_recorded',
      severity: 'informational',
      title: `${GATEWAY_KINDS[decision.gatewayKind].label} evaluated`,
      description: `Route(s) selected: ${
        decision.selectedRouteIds.join(', ') || 'none'
      }. The decision is recorded and auditable.`,
      ...base,
      metadata: { gatewayId: decision.gatewayId, selected: decision.selectedRouteIds },
    });
    emitted += 1;
  }

  // §21 — the commercial gate's own canonical event, so Phase 2 has a first-class
  // hook without duplicating the generic routing events.
  if (decision.gatewayId === COMMERCIAL_GATE_ID) {
    emitEvent({
      type: COMMERCIAL_ROUTE_SELECTED_EVENT,
      severity: 'important',
      title: `Commercial route: ${decision.selectedRouteIds[0] ?? decision.refusalReason ?? 'none'}`,
      description: decision.refused
        ? `The commercial gate refused (${decision.refusalReason}); disposition ${disposition}.`
        : `The commercial gate selected "${decision.selectedRouteIds.join(', ')}".`,
      ...base,
      metadata: { selected: decision.selectedRouteIds, disposition, subject: decision.subject },
    });
    emitted += 1;
  }

  return emitted;
}

/* ── Attention helper (exactly what an operator must see) ────────────────── */

/** Every branch of a decision that needs a human or an exception path. */
export function attentionBranches(decision: WorkflowRoutingDecision): RouteBranchResult[] {
  return decision.branches.filter((b) => ATTENTION_OUTCOMES.includes(b.outcome));
}

/* ── Mutations ───────────────────────────────────────────────────────────── */

export interface RouteRecordResult {
  ok: boolean;
  /** The canonical decision now in the store (the EXISTING one on a duplicate). */
  decision: WorkflowRoutingDecision | null;
  /** True when an identical decision had already been recorded. */
  duplicateSuppressed: boolean;
  disposition: RouteDispositionId;
  reason: string;
  /** How many canonical events this call emitted (0 on a suppressed duplicate). */
  eventsEmitted: number;
  persistence: PersistenceStatus;
}

/**
 * Record ONE routing decision. IDEMPOTENT BY CONSTRUCTION.
 *
 * A repeated evaluation with the same idempotency key is SUPPRESSED: no second
 * decision, no second audit entry, no second event. The suppression is reported
 * (`duplicateSuppressed: true`) rather than hidden, so a caller can prove the
 * behaviour instead of assuming it.
 */
export function recordRoutingDecision(
  decision: WorkflowRoutingDecision,
  actor: string = decision.actor
): RouteRecordResult {
  const existingId = byIdempotencyKey.get(decision.idempotencyKey);
  const existing = existingId ? getRouteDecision(existingId) : undefined;

  if (existing) {
    duplicatesSuppressed += 1;
    return {
      ok: true,
      decision: existing,
      duplicateSuppressed: true,
      disposition: routeDispositionFor(existing),
      reason: `A decision with the idempotency key "${decision.idempotencyKey}" was already recorded as ${existing.id}. Nothing was written a second time.`,
      eventsEmitted: 0,
      persistence: getRoutingPersistenceStatus(),
    };
  }

  // The id is deterministic, so a re-record of the same id REPLACES in place —
  // it never appends a second row.
  const index = decisions.findIndex((d) => d.id === decision.id);
  if (index >= 0) decisions[index] = decision;
  else decisions = [...decisions, decision];
  byIdempotencyKey.set(decision.idempotencyKey, decision.id);

  mirror('routing_decisions', decision.id, () =>
    getDomainRepository().persistRoutingDecision(decision, tenantIdForRouting(decision.owner))
  );

  const disposition = routeDispositionFor(decision);
  audit(
    decision.refused ? 'routing_decision_refused' : 'routing_decision_recorded',
    decision.id,
    `${GATEWAY_KINDS[decision.gatewayKind].label} on ${decision.subject.type} ${decision.subject.id}: ${
      decision.refused
        ? `REFUSED (${decision.refusalReason}) — ${decision.refusalDetail ?? 'reason not stated'}`
        : `selected ${decision.selectedRouteIds.join(', ') || 'no route'}; terminal=${decision.terminal}`
    }. Disposition: ${disposition} — ${ROUTE_DISPOSITIONS[disposition]}`,
    actor,
    decision.subject.id
  );

  const eventsEmitted = emitRoutingEvents(decision, disposition);
  notify();

  return {
    ok: true,
    decision,
    duplicateSuppressed: false,
    disposition,
    reason: decision.refused
      ? `Recorded the refusal (${decision.refusalReason}); disposition ${disposition}.`
      : `Recorded the decision: route(s) ${
          decision.selectedRouteIds.join(', ') || 'none'
        }; terminal=${decision.terminal}.`,
    eventsEmitted,
    persistence: getRoutingPersistenceStatus(),
  };
}

/* ── Reload semantics ───────────────────────────────────────────────────── */

/**
 * Overlay durable decisions onto the in-memory set, deduped by canonical id.
 * The idempotency index is rebuilt from the durable rows too, so a reload cannot
 * lose the duplicate guard.
 */
export async function hydrateRoutingFromPersistence(
  scope: TenantScope
): Promise<WorkflowRoutingDecision[]> {
  const h = await getDomainRepository().hydrate(scope);
  const byId = new Map(decisions.map((d) => [d.id, d] as const));
  for (const d of h.routingDecisions) {
    byId.set(d.id, d);
    byIdempotencyKey.set(d.idempotencyKey, d.id);
  }
  decisions = [...byId.values()];
  notify();
  return h.routingDecisions;
}

/** Determinism/test helper — wipes state so the next run starts clean. */
export function resetRoutingStore(): void {
  decisions = [];
  byIdempotencyKey = new Map();
  duplicatesSuppressed = 0;
  version = 0;
  persistenceMirror.reset();
  notify();
}