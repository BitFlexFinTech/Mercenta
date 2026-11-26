import { PlugZap, RefreshCw } from 'lucide-react';
import {
  ConsoleTabs,
  NoticeBanner,
  SectionCard,
  formatGbp,
} from '@/next/components/ConsoleCharts';
import {
  ConsoleTable,
  EmptyStateBlock,
  ErrorStateBlock,
  InlineStatus,
  LoadingRows,
  MetricStrip,
  ConsoleHeader,
  SlideOverDrawer,
  type ConsoleColumn,
  type MetricItem,
  type SemanticTone,
} from '@/next/components/ConsolePrimitives';
import type { ShipmentStatus } from '@/types';
import type { CarrierProviderConfiguration } from '@/lib/shipping/providerConfiguration';
import type { LogisticsRouteDecision } from '@/lib/fulfillment';

export interface AdminShipmentRow {
  id: string;
  reference: string;
  title: string;
  poNumber: string;
  brandId: string;
  brandName: string;
  carrier: string;
  status: ShipmentStatus;
  statusLabel: string;
  statusTone: SemanticTone;
  origin: string;
  destination: string;
  valueGbp: number;
  delayed: boolean;
  exception: boolean;
  trackingNumber: string | null;
  simulatedPo: boolean;
}

export interface AdminLogisticsSelectedLeg {
  id: string;
  reference: string;
  poNumber: string;
  brandName: string;
  carrier: string;
  origin: string;
  destination: string;
  valueGbp: number;
  truthLabel: string;
  truthTone: SemanticTone;
  truthReason: string;
  channelArranged: boolean;
}

export interface AdminPoDocSummary {
  poId: string;
  poNumber: string;
  brandName: string;
  statusLabel: string;
  destinationLabel: string;
  laneLabel: string;
  readyCount: number;
  applicableCount: number;
  generatedAt?: string;
}

export interface AdminRouteEvaluation {
  partnerName: string;
  partnerRole: string;
  partnerCapability: string;
  deltaModeLabel: string;
  maxDirectDaysLabel: string;
  minPoFreqLabel: string;
  thresholdsBasis: string;
  consignmentOptions: { id: string; label: string }[];
  selectedConsignmentId: string;
  selectedOrigin: string;
  freightMode: string;
  customsLabel: string;
  appointmentLabel: string;
  doorToFcLabel: string;
  planningLeadLabel: string;
  decision: LogisticsRouteDecision;
  decisionLabel: string;
  decisionTone: SemanticTone;
  reasons: string[];
  unknowns: string[];
}

export interface AdminApiLogRow {
  id: string;
  timestamp: string;
  method: string;
  endpoint: string;
  status: number;
}

export interface AdminLogisticsViewProps {
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  totalShipments: number;
  brandsCount: number;
  focus: 'all' | 'in_transit' | 'delayed' | 'exceptions';
  onFocusChange: (next: 'all' | 'in_transit' | 'delayed' | 'exceptions') => void;
  metrics: MetricItem[];
  shipments: AdminShipmentRow[];
  selectedLeg: AdminLogisticsSelectedLeg | null;
  onSelectShipment: (id: string | null) => void;
  providerConfigs: CarrierProviderConfiguration[];
  onOpenIntegrations?: () => void;
  routeEvaluation: AdminRouteEvaluation;
  onSelectRouteConsignment: (id: string) => void;
  poDocSummaries: AdminPoDocSummary[];
  milestoneOptions: { value: ShipmentStatus; label: string }[];
  busyShipmentId: string | null;
  lastCarrierResult: Record<string, string>;
  onUpdateMilestone: (row: AdminShipmentRow, next: ShipmentStatus) => void;
  onRequestDhlUpdate: (row: AdminShipmentRow) => void;
  apiLogs: AdminApiLogRow[];
  logisticsWork: { id: string; sourceLabel: string; title: string; dueDate: string | null }[];
  overdueWorkCount: number;
  dueThisWeekCount: number;
}

export function AdminLogisticsView({
  loading,
  error,
  onRetry,
  totalShipments,
  brandsCount,
  focus,
  onFocusChange,
  metrics,
  shipments,
  selectedLeg,
  onSelectShipment,
  providerConfigs,
  onOpenIntegrations,
  routeEvaluation,
  onSelectRouteConsignment,
  poDocSummaries,
  milestoneOptions,
  busyShipmentId,
  lastCarrierResult,
  onUpdateMilestone,
  onRequestDhlUpdate,
  apiLogs,
  logisticsWork,
  overdueWorkCount,
  dueThisWeekCount,
}: AdminLogisticsViewProps) {
  if (loading) {
    return (
      <div className="space-y-6">
        <ConsoleHeader title="Logistics Hub" description="Loading shipments and carrier state…" />
        <LoadingRows rows={6} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <ConsoleHeader title="Logistics Hub" description="Unable to load logistics state." />
        <ErrorStateBlock message="Could not read shipments or purchase orders." onRetry={onRetry} />
      </div>
    );
  }

  const shipmentColumns: ConsoleColumn<AdminShipmentRow>[] = [
    {
      key: 'po',
      header: 'PO',
      render: (s) => (
        <span className="font-mono text-ds-label font-medium text-ink-950">
          {s.poNumber}
          {s.simulatedPo && <span className="ml-1.5 text-ds-micro text-[#C2410C]">(sim)</span>}
        </span>
      ),
    },
    {
      key: 'brand',
      header: 'Brand',
      render: (s) => <span className="font-medium text-ink-950">{s.brandName}</span>,
    },
    {
      key: 'carrier',
      header: 'Carrier',
      render: (s) => <span className="capitalize text-secondary">{s.carrier.replace(/_/g, ' ')}</span>,
    },
    {
      key: 'reference',
      header: 'Reference',
      hideOnMobile: true,
      render: (s) => <span className="font-mono text-ds-label text-faint">{s.reference}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (s) => (
        <div className="flex flex-wrap items-center gap-2">
          <InlineStatus label={s.statusLabel} tone={s.statusTone} />
          {s.delayed && <InlineStatus label="Delayed" tone="warning" />}
          {s.exception && <InlineStatus label="Exception" tone="danger" />}
        </div>
      ),
    },
    {
      key: 'value',
      header: 'Value',
      align: 'right',
      render: (s) => formatGbp(s.valueGbp),
    },
  ];

  const manifestColumns: ConsoleColumn<AdminShipmentRow>[] = [
    {
      key: 'reference',
      header: 'Reference',
      render: (s) => (
        <div>
          <div className="font-mono text-ds-label text-ink-950">{s.reference}</div>
          <div className="font-mono text-ds-micro text-faint">{s.trackingNumber ?? '—'}</div>
        </div>
      ),
    },
    {
      key: 'shipment',
      header: 'Consignment',
      render: (s) => (
        <div>
          <div className="font-medium text-ink-950">{s.title}</div>
          <div className="text-ds-label text-faint">{s.brandName}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Current status',
      render: (s) => <InlineStatus label={s.statusLabel} tone={s.statusTone} />,
    },
    {
      key: 'controls',
      header: 'Milestone action',
      render: (s) => (
        <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={s.status}
              aria-label={`Update milestone for ${s.reference}`}
              onChange={(e) => onUpdateMilestone(s, e.target.value as ShipmentStatus)}
              className="border border-hairline-strong rounded-ds-sm px-2 py-1 text-ds-label bg-surface-raised text-ink-950"
            >
              {milestoneOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={busyShipmentId === s.id}
              onClick={() => onRequestDhlUpdate(s)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-ds-sm border border-hairline-strong bg-surface-raised text-ds-micro font-medium text-ink-900 hover:bg-surface disabled:opacity-50"
            >
              <RefreshCw className="w-3 h-3" aria-hidden="true" />
              DHL update (sim)
            </button>
          </div>
          {lastCarrierResult[s.id] && (
            <div className="font-mono text-ds-micro text-faint">{lastCarrierResult[s.id]}</div>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <ConsoleHeader
        title="Logistics Hub"
        description="Cross-brand consignments, carrier accounts operated by API, 3PL route escalation, and PO shipping document queue."
        meta={
          <>
            <span className="font-mono tabular-nums">{totalShipments} shipments</span>
            <span className="font-mono tabular-nums">{brandsCount} brands</span>
            <span>Deterministic simulation · zero live carrier calls</span>
          </>
        }
      />

      <MetricStrip items={metrics} columns={4} />

      <ConsoleTabs
        tabs={[
          { id: 'all', label: 'All consignments' },
          { id: 'in_transit', label: 'In transit' },
          { id: 'delayed', label: 'Delayed' },
          { id: 'exceptions', label: 'Exceptions' },
        ]}
        value={focus}
        onChange={onFocusChange}
        ariaLabel="Logistics focus filter"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <SectionCard
            title="Active consignments"
            description="Select any shipment row to inspect route evidence and provenance."
          >
            <ConsoleTable
              rows={shipments}
              columns={shipmentColumns}
              rowKey={(s) => s.id}
              selectedKey={selectedLeg?.id}
              onRowClick={(s) => onSelectShipment(s.id)}
              emptyTitle="No matching consignments"
              emptyDescription="Shipments appear once a purchase order reaches ready-to-fulfil, shipped, or delivered."
            />
          </SectionCard>

          <SectionCard
            title="Carrier API console"
            description="Advance milestones through canonical storage or simulate DHL progression."
          >
            <ConsoleTable
              rows={shipments}
              columns={manifestColumns}
              rowKey={(s) => s.id}
              testId="carrier-manifest"
              emptyTitle="No consignments in current focus"
              emptyDescription="Switch focus filter above to view all consignments."
            />
            {apiLogs.length > 0 && (
              <div className="mt-4 pt-4 border-t border-hairline space-y-1.5 max-h-56 overflow-y-auto" data-testid="carrier-api-log">
                <div className="text-ds-micro uppercase tracking-[0.06em] text-faint">
                  Carrier API request log
                </div>
                {apiLogs.map((log) => (
                  <div key={log.id} className="font-mono text-ds-micro text-secondary border border-hairline rounded-ds-sm px-2.5 py-1.5">
                    <span className="text-faint">{log.timestamp}</span>{' '}
                    <span className="font-semibold text-[#C2410C]">{log.method}</span> {log.endpoint}{' '}
                    <span className="text-state-success">{log.status}</span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Carrier provider configuration"
            description="Declared Mercenta carrier accounts operated by API; brands and carriers never configure credentials here."
            actions={
              onOpenIntegrations && (
                <button
                  type="button"
                  onClick={onOpenIntegrations}
                  className="inline-flex items-center gap-1 text-ds-label font-medium text-[#C2410C] hover:underline"
                >
                  <PlugZap className="w-3.5 h-3.5" aria-hidden="true" />
                  Integration Settings
                </button>
              )
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3" data-testid="carrier-provider-configuration-admin">
              {providerConfigs.map((c) => (
                <div key={c.carrier} className="border border-hairline rounded-ds-md p-3 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-ds-label font-semibold text-ink-950">{c.accountLabel}</span>
                    <InlineStatus
                      label={c.stateLabel}
                      tone={c.operational ? 'success' : 'neutral'}
                    />
                  </div>
                  <p className="text-ds-label text-faint">{c.capabilityLabel}</p>
                  <p className="text-ds-micro text-faint">
                    Lane: {c.laneLabels.join(' · ')} · Service: {c.services.join(' · ')}
                  </p>
                  <p className="text-ds-micro text-faint">{c.basis}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Supply route & 3PL escalation"
            description={`${routeEvaluation.partnerName} (${routeEvaluation.partnerRole}) · ${routeEvaluation.deltaModeLabel}`}
          >
            <div className="space-y-3" data-testid="supply-route-escalation">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-ds-label">
                <div className="border border-hairline rounded-ds-sm p-2.5">
                  <div className="text-faint">Max direct door-to-FC days</div>
                  <div className="font-mono text-ink-950">{routeEvaluation.maxDirectDaysLabel}</div>
                </div>
                <div className="border border-hairline rounded-ds-sm p-2.5">
                  <div className="text-faint">Min PO frequency / month</div>
                  <div className="font-mono text-ink-950">{routeEvaluation.minPoFreqLabel}</div>
                </div>
              </div>
              {routeEvaluation.consignmentOptions.length === 0 ? (
                <p className="text-ds-label text-faint">No consignment available to evaluate.</p>
              ) : (
                <div className="space-y-3 border border-hairline rounded-ds-md p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <select
                      value={routeEvaluation.selectedConsignmentId}
                      onChange={(e) => onSelectRouteConsignment(e.target.value)}
                      aria-label="Select consignment for route evaluation"
                      className="border border-hairline-strong rounded-ds-sm px-2.5 py-1.5 text-ds-label bg-surface-raised"
                    >
                      {routeEvaluation.consignmentOptions.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <InlineStatus
                      label={routeEvaluation.decisionLabel}
                      tone={routeEvaluation.decisionTone}
                    />
                  </div>
                  <dl className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-ds-label">
                    <div><dt className="text-faint">Origin</dt><dd>{routeEvaluation.selectedOrigin}</dd></div>
                    <div><dt className="text-faint">Freight mode</dt><dd>{routeEvaluation.freightMode}</dd></div>
                    <div><dt className="text-faint">Customs</dt><dd>{routeEvaluation.customsLabel}</dd></div>
                    <div><dt className="text-faint">Appointment</dt><dd>{routeEvaluation.appointmentLabel}</dd></div>
                    <div><dt className="text-faint">Door-to-FC</dt><dd>{routeEvaluation.doorToFcLabel}</dd></div>
                    <div><dt className="text-faint">Lead time</dt><dd>{routeEvaluation.planningLeadLabel}</dd></div>
                  </dl>
                  <ul className="text-ds-label text-faint list-disc pl-5 space-y-0.5">
                    {routeEvaluation.reasons.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                  {routeEvaluation.unknowns.length > 0 && (
                    <NoticeBanner
                      tone="warning"
                      title="Unrecorded route fields (fail-closed)"
                      message={routeEvaluation.unknowns.join(' · ')}
                    />
                  )}
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="PO documents awaiting brand download"
            description={`${poDocSummaries.length} pack(s) pending pre-dispatch download across accepted POs.`}
          >
            {poDocSummaries.length === 0 ? (
              <EmptyStateBlock
                title="No shipping packs awaiting download"
                description="Document packs appear when a purchase order is accepted prior to dispatch."
              />
            ) : (
              <ul className="divide-y divide-hairline-06 border border-hairline rounded-ds-md">
                {poDocSummaries.map((p) => (
                  <li key={p.poId} className="px-3 py-2.5 flex flex-wrap items-center justify-between gap-2 text-ds-label">
                    <div>
                      <span className="font-mono font-medium text-ink-950">{p.poNumber}</span>
                      <span className="ml-2 text-faint">{p.brandName}</span>
                      <div className="text-ds-micro text-faint">
                        {p.destinationLabel} · {p.laneLabel}
                        {p.generatedAt ? ` · generated ${p.generatedAt}` : ''}
                      </div>
                    </div>
                    <span className="font-mono text-ink-900">
                      {p.readyCount}/{p.applicableCount} ready
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>

        <aside className="space-y-6">
          <SectionCard title="Operational logistics work">
            <dl className="space-y-1.5 text-ds-label mb-3">
              <div className="flex justify-between">
                <dt className="text-faint">Open items</dt>
                <dd className="font-mono text-ink-950">{logisticsWork.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-faint">Overdue</dt>
                <dd className="font-mono text-ink-950">{overdueWorkCount}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-faint">Due this week</dt>
                <dd className="font-mono text-ink-950">{dueThisWeekCount}</dd>
              </div>
            </dl>
            {logisticsWork.length === 0 ? (
              <p className="text-ds-label text-faint">No open logistics work items.</p>
            ) : (
              <ul className="divide-y divide-hairline-06 border-t border-hairline pt-2">
                {logisticsWork.slice(0, 6).map((w) => (
                  <li key={w.id} className="py-2 text-ds-label">
                    <div className="font-medium text-ink-950">{w.sourceLabel}</div>
                    <div className="text-faint">{w.title}</div>
                    {w.dueDate && <div className="font-mono text-ds-micro text-faint">Due {w.dueDate}</div>}
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </aside>
      </div>

      <SlideOverDrawer
        open={selectedLeg !== null}
        onClose={() => onSelectShipment(null)}
        title={selectedLeg ? selectedLeg.reference : 'Consignment'}
        subtitle={selectedLeg ? `${selectedLeg.brandName} · PO ${selectedLeg.poNumber || '—'}` : undefined}
      >
        {selectedLeg && (
          <div className="space-y-4 text-ds-label" data-testid="admin-logistics-inspector">
            <InlineStatus label={selectedLeg.truthLabel} tone={selectedLeg.truthTone} />
            <dl className="space-y-2 border border-hairline rounded-ds-md p-3">
              <div className="flex justify-between"><dt className="text-faint">Carrier</dt><dd>{selectedLeg.carrier}</dd></div>
              <div className="flex justify-between"><dt className="text-faint">Origin</dt><dd>{selectedLeg.origin}</dd></div>
              <div className="flex justify-between"><dt className="text-faint">Destination</dt><dd>{selectedLeg.destination}</dd></div>
              <div className="flex justify-between"><dt className="text-faint">Value</dt><dd className="font-mono">{formatGbp(selectedLeg.valueGbp)}</dd></div>
            </dl>
            <p className="text-ds-label text-faint">{selectedLeg.truthReason}</p>
            {selectedLeg.channelArranged && (
              <NoticeBanner
                tone="info"
                message="Channel-arranged freight — Mercenta did not assign this carrier account."
              />
            )}
          </div>
        )}
      </SlideOverDrawer>
    </div>
  );
}
