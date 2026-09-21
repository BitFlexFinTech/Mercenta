/**
 * Real-Time Event Feed — generalized event system for the Personal Assistant bot
 * and the existing digest/notification system.
 *
 * Both the internal digest and the external Personal Assistant bot (in Grok Bot)
 * consume from this single feed. Events are tagged with severity so consumers
 * can decide what's WhatsApp-worthy vs. digest-only.
 *
 * Threshold: PO value above £50k triggers a critical event.
 * Compliance: documents expiring within N days trigger an important event.
 */

import type { PlatformEvent, EventFeedQuery, EventSeverity } from './types';
import { notifyCanonicalStoreChange } from '@/lib/domain/canonicalSignal';
export { EVENT_SEVERITY_MAP } from './types';
export type { PlatformEvent, EventType, EventSeverity, EventFeedQuery } from './types';

const PO_THRESHOLD_GBP = 50000;

/* ── In-memory event store (mock-first — real store uses Supabase) ──── */

const events: PlatformEvent[] = [];
let eventCounter = 0;

function uid(): string {
  return `evt-${Date.now()}-${(++eventCounter).toString(36)}`;
}

/**
 * Emit a new event into the feed. Both the internal system and the external
 * Personal Assistant bot consume from this single feed.
 */
export function emitEvent(evt: Omit<PlatformEvent, 'id' | 'createdAt' | 'acknowledged'>): PlatformEvent {
  const full: PlatformEvent = {
    id: uid(), ...evt,
    createdAt: new Date().toISOString(),
    acknowledged: false,
  };
  events.push(full);
  notifyCanonicalStoreChange();
  return full;
}

/* ── Convenience emitters ───────────────────────────────────────────── */

export function emitLargePoEvent(poId: string, brandId: string, value: number): PlatformEvent | null {
  if (value < PO_THRESHOLD_GBP) return null;
  return emitEvent({
    type: 'new_po_above_threshold', severity: 'critical',
    title: `Large PO: £${(value / 1000).toFixed(1)}k`,
    description: `PO ${poId} for brand ${brandId} exceeds £${(PO_THRESHOLD_GBP / 1000).toFixed(0)}k threshold.`,
    actionUrl: `/admin/purchase-orders/${poId}`, entityId: brandId,
    metadata: { poId, value },
  });
}

export function emitComplianceEvent(docId: string, brandId: string, docType: string, daysUntilExpiry: number): PlatformEvent {
  return emitEvent({
    type: 'compliance_doc_expiring', severity: 'important',
    title: `${docType} expiring in ${daysUntilExpiry} days`,
    description: `Compliance doc ${docType} for brand ${brandId} expires in ${daysUntilExpiry} days.`,
    actionUrl: `/admin/compliance/${docId}`, entityId: brandId,
    metadata: { docId, docType, daysUntilExpiry },
  });
}

export function emitDeductionEvent(deductionId: string, brandId: string, amount: number, reason: string): PlatformEvent {
  return emitEvent({
    type: 'deduction_posted', severity: 'important',
    title: `Deduction: £${(amount / 100).toFixed(2)}`,
    description: `Chargeback for brand ${brandId}: ${reason} — £${(amount / 100).toFixed(2)}`,
    actionUrl: `/admin/deductions/${deductionId}`, entityId: brandId,
    metadata: { deductionId, amount, reason },
  });
}

export function emitContractEvent(contractId: string, brandId: string, signed: boolean): PlatformEvent {
  return emitEvent({
    type: signed ? 'contract_signed' : 'contract_expired',
    severity: signed ? 'critical' : 'important',
    title: signed ? 'Contract signed' : 'Contract expired',
    description: `Contract for brand ${brandId} was ${signed ? 'signed' : 'expired'}.`,
    actionUrl: `/admin/contracts/${contractId}`, entityId: brandId,
    metadata: { contractId },
  });
}

export function emitOnboardingEvent(brandId: string, brandName: string): PlatformEvent {
  return emitEvent({
    type: 'brand_onboarding_complete', severity: 'informational',
    title: `${brandName} completed onboarding`,
    description: `Brand ${brandName} (${brandId}) completed onboarding.`,
    actionUrl: `/admin/brands/${brandId}`, entityId: brandId,
    metadata: { brandName },
  });
}

export function emitSecurityAlert(title: string, description: string, metadata?: Record<string, unknown>): PlatformEvent {
  return emitEvent({
    type: 'security_alert', severity: 'critical', title, description,
    actionUrl: '/admin/monitoring', metadata,
  });
}

export function emitTestFailure(suite: string, failures: number): PlatformEvent {
  return emitEvent({
    type: 'test_suite_failure', severity: 'important',
    title: `Test suite failed: ${suite}`,
    description: `${failures} test(s) failed in ${suite}.`,
    actionUrl: '/admin/monitoring',
    metadata: { suite, failures },
  });
}

/* ── Queries ─────────────────────────────────────────────────────────── */

export function queryEvents(query: EventFeedQuery = {}): PlatformEvent[] {
  let result = [...events];
  if (query.since) result = result.filter((e) => e.createdAt >= query.since!);
  if (query.severity) result = result.filter((e) => e.severity === query.severity);
  if (query.type) result = result.filter((e) => e.type === query.type);
  if (query.acknowledged !== undefined) result = result.filter((e) => e.acknowledged === query.acknowledged);
  result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (query.limit && query.limit > 0) result = result.slice(0, query.limit);
  return result;
}

export function acknowledgeEvent(eventId: string): boolean {
  const evt = events.find((e) => e.id === eventId);
  if (!evt) return false;
  evt.acknowledged = true;
  return true;
}

/**
 * Get unacknowledged events above a severity threshold.
 * Useful for the Personal Assistant bot to decide what's WhatsApp-worthy.
 */
export function getUnacknowledgedAbove(severity: EventSeverity): PlatformEvent[] {
  const order: EventSeverity[] = ['critical', 'important', 'informational'];
  const minIdx = order.indexOf(severity);
  return events.filter((e) => !e.acknowledged && order.indexOf(e.severity) <= minIdx);
}

export function resetEvents(): void {
  events.length = 0;
  eventCounter = 0;
}