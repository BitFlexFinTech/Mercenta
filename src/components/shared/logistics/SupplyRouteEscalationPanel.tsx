/**
 * §PHASE 3 STAGE 3 — THE SUPPLY ROUTE & 3PL ESCALATION PANEL.
 *
 * WHAT IT IS. The operator-facing surface for the Phase 3 model: it states the
 * DECLARED 3PL partner (Delta Fulfillment) and its live provider mode, the
 * escalation posture (the thresholds and their basis), and — for a consignment the
 * operator selects — the DERIVED supply-route profile and the escalation DECISION,
 * with the reasons and every field the records do not hold NAMED as unknown.
 *
 * WHY IT IS HONEST BY CONSTRUCTION. The route is derived only from recorded facts
 * (`src/lib/fulfillment/routeFromRecords.ts`) and the decision comes from the ONE
 * engine (`evaluateLogisticsEscalation`), so the panel cannot invent a lead time, a
 * transit estimate or a threshold. While the escalation thresholds are NOT AGREED
 * (their canonical default) every decision routes to human review and NO 3PL is
 * recommended — the fail-closed posture the registry row requires is what the
 * operator actually sees.
 */
import { useMemo, useState } from 'react';
import { Badge, LoadingState, Select, StatusBadge, type StatusTone } from '@/components/ui';
import { RecordFieldList } from '@/components/shared/workspace';
import {
  ROUTE_DERIVATION_BASIS,
  buildSupplyRouteProfile,
  deriveSupplyRouteInput,
  evaluateLogisticsEscalation,
  type LogisticsRouteDecision,
} from '@/lib/fulfillment';
import { INTEGRATION_MODE_LABELS } from '@/integrations/types';
import { useIntegrations } from '@/integrations/IntegrationsContext';
import {
  DECLARED_3PL_PARTNER,
  FULFILLMENT_ESCALATION_THRESHOLDS,
  getFulfillmentPartner,
} from '@/config/fulfillment';

/** The minimal consignment shape the panel reads — no private record is kept here. */
export interface SupplyRouteConsignment {
  id: string;
  poNumber: string;
  brandName: string;
  brandNation: string | null;
  origin: string | null;
  shipmentStatus: string;
  appointmentRequired: boolean;
}

export interface SupplyRouteEscalationPanelProps {
  consignments: SupplyRouteConsignment[];
  /**
   * Purchase-order frequency per month. It is NOT recorded anywhere yet, so the
   * default is `null` — the engine then fails closed to human review.
   */
  poFrequencyPerMonth?: number | null;
  /**
   * §Wave 3 Part 5 — the caller's consignments are still resolving. Without
   * this, an empty list it has not finished loading was reported as "No
   * consignment is in scope, so there is no route to assess." — a false
   * statement about the operator's shipments (measured by
   * `e2e/state-coverage.spec.ts` against a slow data source).
   */
  loading?: boolean;
}

const DECISION_PRESENTATION: Record<LogisticsRouteDecision, { label: string; tone: StatusTone }> = {
  review: { label: 'Human review required', tone: 'warning' },
  direct_to_fc: { label: 'Direct to the channel FC', tone: 'success' },
  escalate_to_3pl: { label: 'Escalate to a UK buffer (3PL)', tone: 'info' },
};

export function SupplyRouteEscalationPanel({
  consignments,
  poFrequencyPerMonth = null,
  loading = false,
}: SupplyRouteEscalationPanelProps) {
  const { modes } = useIntegrations();
  const partner = getFulfillmentPartner(DECLARED_3PL_PARTNER);
  const deltaMode = modes.delta_fulfillment;
  const thresholds = FULFILLMENT_ESCALATION_THRESHOLDS;

  const [selectedId, setSelectedId] = useState<string>(consignments[0]?.id ?? '');
  const selected = consignments.find((c) => c.id === selectedId) ?? consignments[0] ?? null;

  const evaluated = useMemo(() => {
    if (!selected) return null;
    const route = buildSupplyRouteProfile(
      deriveSupplyRouteInput({
        origin: selected.origin,
        brandNation: selected.brandNation,
        shipmentStatus: selected.shipmentStatus,
        appointmentRequired: selected.appointmentRequired,
      })
    );
    const result = evaluateLogisticsEscalation({ route, poFrequencyPerMonth });
    return { route, result };
  }, [selected, poFrequencyPerMonth]);

  return (
    <div className="space-y-3" data-testid="supply-route-escalation">
      <div className="flex flex-wrap items-center gap-2">
        <span data-testid="supply-route-partner">
          <Badge>{partner.name}</Badge>
        </span>
        <StatusBadge tone="neutral" dataStatus={partner.role}>
          {partner.role === '3pl' ? '3PL — fulfils, does not carry' : partner.role}
        </StatusBadge>
        <span data-testid="supply-route-partner-mode">
          <StatusBadge tone={deltaMode === 'simulation' ? 'info' : 'neutral'} dataStatus={deltaMode}>
            {INTEGRATION_MODE_LABELS[deltaMode]}
          </StatusBadge>
        </span>
      </div>
      <p className="text-ds-micro leading-relaxed text-muted">
        {partner.capability.label}. {partner.basis}
      </p>

      <div data-testid="supply-route-thresholds">
        <RecordFieldList
          fields={[
            {
              label: 'Max direct door-to-FC days',
              value:
                thresholds.maxDirectDoorToFcDays === null
                  ? 'Not agreed'
                  : String(thresholds.maxDirectDoorToFcDays),
            },
            {
              label: 'Min PO frequency / month',
              value:
                thresholds.minPoFrequencyPerMonth === null
                  ? 'Not agreed'
                  : String(thresholds.minPoFrequencyPerMonth),
            },
          ]}
        />
        <p className="mt-1 text-ds-micro leading-relaxed text-muted">{thresholds.basis}</p>
      </div>

      {loading ? (
        <LoadingState rows={2} label="Loading the consignments in scope…" />
      ) : !selected || !evaluated ? (
        <p className="text-ds-label text-muted" data-testid="supply-route-empty">
          No consignment is in scope, so there is no route to assess.
        </p>
      ) : (
        <>
          <Select
            label="Consignment"
            value={selected.id}
            onChange={(e) => setSelectedId(e.target.value)}
            options={consignments.map((c) => ({ value: c.id, label: `${c.poNumber} · ${c.brandName}` }))}
            className="max-w-md"
          />

          <div data-testid="supply-route-profile">
            <RecordFieldList
              fields={[
                { label: 'Origin', value: selected.origin ?? 'Not recorded' },
                { label: 'Freight mode', value: evaluated.route.freightMode },
                {
                  label: 'Customs required',
                  value: evaluated.route.customsRequired
                    ? 'Yes — international lane'
                    : 'No — UK domestic lane',
                },
                {
                  label: 'Appointment',
                  value: evaluated.route.appointmentRequired ? 'Required' : 'Not required',
                },
                {
                  label: 'Door-to-FC (days)',
                  value:
                    evaluated.route.totalDoorToFcDays === null
                      ? 'Unknown'
                      : String(evaluated.route.totalDoorToFcDays),
                },
                {
                  label: 'Planning lead time (days)',
                  value:
                    evaluated.route.planningLeadTimeDays === null
                      ? 'Unknown'
                      : String(evaluated.route.planningLeadTimeDays),
                },
              ]}
            />
          </div>

          <div data-testid="supply-route-decision" data-decision={evaluated.result.decision}>
            <StatusBadge
              tone={DECISION_PRESENTATION[evaluated.result.decision].tone}
              dataStatus={evaluated.result.decision}
            >
              {DECISION_PRESENTATION[evaluated.result.decision].label}
            </StatusBadge>
            <ul data-testid="supply-route-reasons" className="mt-1.5 space-y-0.5">
              {evaluated.result.reasons.map((reason) => (
                <li key={reason} className="text-ds-micro leading-relaxed text-muted">
                  {reason}
                </li>
              ))}
            </ul>
          </div>

          {evaluated.route.unknowns.length > 0 && (
            <div data-testid="supply-route-unknowns">
              <p className="text-ds-micro uppercase tracking-[0.12em] text-muted">
                Not recorded — reported, never estimated
              </p>
              <ul className="mt-1 space-y-0.5">
                {evaluated.route.unknowns.map((unknown) => (
                  <li key={unknown} className="text-ds-micro leading-relaxed text-muted">
                    {unknown}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-ds-micro leading-relaxed text-muted" data-testid="supply-route-basis">
            {ROUTE_DERIVATION_BASIS}
          </p>
        </>
      )}

      <p className="text-ds-micro leading-relaxed text-muted" data-testid="supply-route-activation">
        {partner.activation}
      </p>
    </div>
  );
}