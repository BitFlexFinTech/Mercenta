/**
 * Event feed types — canonical event shapes for the real-time event feed.
 * Used by both the internal digest system and the external Personal Assistant bot.
 */

export type EventSeverity = 'critical' | 'important' | 'informational';

export type EventType =
  | 'new_po_above_threshold'
  | 'compliance_doc_expiring'
  | 'deduction_posted'
  | 'contract_signed'
  | 'contract_expired'
  | 'brand_onboarding_complete'
  | 'security_alert'
  | 'test_suite_failure'
  // §Priority-1 — shipment/provider milestone + compliance verification events.
  | 'shipment_milestone'
  | 'provider_failure'
  | 'company_verified'
  | 'hmrc_filing';

export interface PlatformEvent {
  id: string;
  type: EventType;
  severity: EventSeverity;
  title: string;
  description: string;
  actionUrl?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  acknowledged: boolean;
}

export interface EventFeedQuery {
  since?: string;
  severity?: EventSeverity;
  type?: EventType;
  limit?: number;
  acknowledged?: boolean;
}

export const EVENT_SEVERITY_MAP: Record<EventType, EventSeverity> = {
  new_po_above_threshold: 'critical',
  compliance_doc_expiring: 'important',
  deduction_posted: 'important',
  contract_signed: 'critical',
  contract_expired: 'important',
  brand_onboarding_complete: 'informational',
  security_alert: 'critical',
  test_suite_failure: 'important',
  shipment_milestone: 'informational',
  provider_failure: 'important',
  company_verified: 'informational',
  hmrc_filing: 'important',
};