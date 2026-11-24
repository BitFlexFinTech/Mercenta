import { useMemo } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { fulfillmentTrackLabel } from '@/config/fulfillmentTrack';
import { demoReturns } from '@/data/api';
import {
  useCommissions,
  useComplianceDocuments,
  useContracts,
  useDeductions,
  useMessages,
  usePurchaseOrders,
  useShipmentsAll,
} from '@/data/queries';
import { demoCommerceInvoices, demoCommercePayments } from '@/data/demoStore';
import { assertBrandScope } from '@/lib/auth/rbac';
import { computeBrandNetShare, normalisePayoutTrack, resolveCommissionRatePct } from '@/lib/billing/payouts';
import { invoiceIsOutstanding } from '@/lib/commerce/invoiceTerms';
import { poAcknowledgementWindow } from '@/lib/commerce/poAcknowledgementWindow';
import { evaluateComplianceGate } from '@/lib/compliance';
import { orderDateLabel } from '@/lib/dates';
import { demoTickets } from '@/lib/helpdesk/ticketStore';
import {
  commissionStatusPresentation,
  poStatusPresentation,
  shipmentStatusPresentation,
} from '@/lib/statusPresentation';
import { toSemanticTone, type MetricItem } from '@/next/components/ConsolePrimitives';
import { formatGbp } from '@/next/components/ConsoleCharts';
import type { PurchaseOrderStatus } from '@/types';
import { BrandOverviewView } from './BrandOverviewView';

const PO_OPEN: ReadonlySet<PurchaseOrderStatus> = new Set([
  'received',
  'under_review',
  'accepted',
  'ready_to_fulfil',
]);

const DOC_LABELS: Record<string, string> = {
  letter_of_authorization: 'Letter of authorization',
  brand_registry_confirmation: 'Brand ownership confirmation',
  product_safety_ukca: 'Product safety (UKCA)',
  insurance_certificate: 'Insurance certificate',
  cosmetic_notification_cpnp: 'Cosmetic notification (CPNP)',
  food_contact_material: 'Food contact material',
  weee_compliance: 'WEEE compliance',
  type_approval: 'Type approval',
  food_safety_certificate: 'Food safety certificate',
  textile_labelling_compliance: 'Textile labelling compliance',
  baby_product_safety: 'Baby product safety',
};

/* §PORT FIX (2026-11-25) — one shared tone mapper (`toSemanticTone`, owned by the
   console primitives) instead of a second private copy in this screen. */
const mapTone = toSemanticTone;

export function BrandOverviewScreen({
  onNavigate,
}: {
  onNavigate: (viewId: string, poNumber?: string) => void;
}) {
  const { session, brandProfile, products } = useApp();
  const tenantId = session?.tenantId ?? '';
  const posQ = usePurchaseOrders();
  const shipQ = useShipmentsAll();
  const docsQ = useComplianceDocuments();
  const contractsQ = useContracts();
  const commQ = useCommissions();
  const dedQ = useDeductions();
  const msgQ = useMessages();

  const scopeBrand = useMemo(() => {
    /* §PORT FIX (2026-11-25) — `assertBrandScope` is declared `(session, rows)`.
       The AI Studio snapshot called it `(rows, session)`, so the generic resolved
       to the wrong type and every downstream field read failed to compile. */
    const pos = assertBrandScope(session, posQ.data?.data ?? []);
    const shipments = assertBrandScope(session, shipQ.data?.data ?? []);
    const docs = assertBrandScope(session, docsQ.data?.data ?? []);
    const contracts = assertBrandScope(session, contractsQ.data?.data ?? []);
    const commissions = assertBrandScope(session, commQ.data?.data ?? []);
    const deductions = assertBrandScope(session, dedQ.data?.data ?? []);
    const messages = assertBrandScope(session, msgQ.data?.data ?? []);
    return { pos, shipments, docs, contracts, commissions, deductions, messages };
  }, [posQ.data, shipQ.data, docsQ.data, contractsQ.data, commQ.data, dedQ.data, msgQ.data, session]);

  const track = normalisePayoutTrack(
    (brandProfile as { fulfillmentTrack?: 'financed' | 'direct_fulfillment' })?.fulfillmentTrack ?? 'financed'
  );

  const commissionRows = useMemo(
    () =>
      scopeBrand.commissions.map((c) => {
        const rate = resolveCommissionRatePct({
          commissionRate: c.commissionRate,
          commissionAmount: c.commissionAmount,
          poValue: c.poValue,
        });
        const net = computeBrandNetShare({
          poValue: c.poValue,
          commissionRatePct: rate,
          fulfillmentTrack: track,
        });
        const p = commissionStatusPresentation(c.status);
        return {
          id: c.id,
          poNumber: c.purchaseOrderId,
          poValue: c.poValue,
          commissionAmount: c.commissionAmount,
          netShare: net,
          statusLabel: p.label,
          statusTone: mapTone(p.tone),
          createdAt: c.createdAt,
          rawStatus: c.status,
        };
      }),
    [scopeBrand.commissions, track]
  );

  const netPaid = commissionRows
    .filter((c) => c.rawStatus === 'paid')
    .reduce((s, c) => s + c.netShare, 0);
  const netPending = commissionRows
    .filter((c) => c.rawStatus !== 'paid')
    .reduce((s, c) => s + c.netShare, 0);
  const totalPoValue = scopeBrand.pos.reduce((s, p) => s + p.poValue, 0);
  const openPos = scopeBrand.pos.filter((p) => PO_OPEN.has(p.status));
  /* §PORT FIX (2026-11-25) — `PoAcknowledgementWindow` carries no `status`; the
     real "still awaiting acknowledgement" signal is `actionable`. */
  const awaitingAck = openPos.filter((p) => p.status === 'received' || poAcknowledgementWindow(p).actionable);
  const openDeductions = scopeBrand.deductions.filter((d) => d.status === 'open' || d.status === 'disputed');
  const openReturns = demoReturns.filter((r) => r.brandId === tenantId);
  /* §PORT FIX (2026-11-25) — `TicketStatus` is `open | pending | resolved`; there
     is no `closed`, so "still open" is simply "not resolved". */
  const openTickets = demoTickets.filter((t) => t.brandId === tenantId && t.status !== 'resolved');
  const unpaidInvoices = demoCommerceInvoices.filter(
    (inv) => inv.brandId === tenantId && invoiceIsOutstanding(inv, demoCommercePayments)
  );
  /* §PORT FIX (2026-11-25) — the canonical field is `isAvailable`, and "out of
     stock" is the explicit `false` (the convention used by `BrandDashboard`). */
  const oosProducts = products.filter((p) => p.isAvailable === false);

  const earningsMetrics: MetricItem[] = [
    {
      id: 'earned-paid',
      label: 'Net paid to brand',
      value: formatGbp(netPaid),
      context: 'Settled payouts (simulated)',
      onClick: () => onNavigate('documents'),
      testId: 'kpi-value-paid',
    },
    {
      id: 'earned-pending',
      label: 'Pending payout',
      value: formatGbp(netPending),
      context: 'Awaiting settlement window',
      onClick: () => onNavigate('analytics'),
    },
    {
      id: 'po-volume',
      label: 'Total PO value',
      value: formatGbp(totalPoValue),
      context: `${scopeBrand.pos.length} orders`,
      onClick: () => onNavigate('purchase_orders'),
      testId: 'po-summary-total',
    },
    {
      id: 'open-po-queue',
      label: 'Open POs',
      value: String(openPos.length),
      context: `${awaitingAck.length} needing ack review`,
      onClick: () => onNavigate('purchase_orders'),
    },
  ];

  const accountMetrics: MetricItem[] = [
    {
      id: 'catalogue-skus',
      label: 'Active products',
      value: String(products.length),
      context: `${oosProducts.length} marked unavailable`,
      onClick: () => onNavigate('catalog'),
    },
    {
      id: 'deductions-open',
      label: 'Open deductions',
      value: String(openDeductions.length),
      context: formatGbp(openDeductions.reduce((s, d) => s + d.amountGbp, 0)),
      onClick: () => onNavigate('analytics'),
    },
    {
      id: 'returns-count',
      label: 'Recorded returns',
      value: String(openReturns.length),
      context: `${openReturns.reduce((s, r) => s + r.quantity, 0)} units`,
      onClick: () => onNavigate('returns'),
    },
    {
      id: 'tickets-invoices',
      label: 'Cases & invoices',
      value: String(openTickets.length + unpaidInvoices.length),
      context: `${openTickets.length} cases · ${unpaidInvoices.length} unpaid invoices`,
      onClick: () => onNavigate('cases'),
    },
  ];

  const monthlySeries = useMemo(() => {
    const byMonth = new Map<string, number>();
    for (const c of commissionRows) {
      const m = c.createdAt.slice(0, 7);
      byMonth.set(m, (byMonth.get(m) ?? 0) + c.netShare);
    }
    return Array.from(byMonth.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([label, value]) => ({ label, value: Math.round(value) }));
  }, [commissionRows]);

  const hasSignedContract = scopeBrand.contracts.some(
    (c) => c.type === 'distribution_agreement' && (c.status === 'signed' || c.status === 'active')
  );
  const gate = evaluateComplianceGate(
    scopeBrand.docs,
    brandProfile?.category as Parameters<typeof evaluateComplianceGate>[1],
    hasSignedContract
  );

  return (
    <BrandOverviewView
      brandName={brandProfile?.businessName || tenantId || 'Brand'}
      contractStatusLabel={hasSignedContract ? 'Distribution agreement signed' : 'Agreement pending'}
      trackLabel={fulfillmentTrackLabel(track)}
      isLoading={posQ.isPending || shipQ.isPending || docsQ.isPending || commQ.isPending}
      isError={posQ.isError || shipQ.isError}
      errorMessage={String(posQ.error ?? shipQ.error ?? '') || undefined}
      onRetry={() => {
        void posQ.refetch();
        void shipQ.refetch();
      }}
      earningsMetrics={earningsMetrics}
      accountMetrics={accountMetrics}
      monthlySeries={monthlySeries}
      openPos={openPos.slice(0, 8).map((po) => {
        const pres = poStatusPresentation(po.status);
        return {
          id: po.id,
          poNumber: po.poNumber,
          orderDateLabel: orderDateLabel(po.orderDate),
          unitCount: po.lineItems.reduce((s, i) => s + i.quantity, 0),
          poValue: po.poValue,
          statusLabel: pres.label,
          statusTone: mapTone(pres.tone),
        };
      })}
      activeShipments={scopeBrand.shipments.slice(0, 6).map((s) => {
        const pres = shipmentStatusPresentation(s.status);
        return {
          id: s.id,
          poNumber: s.poNumber ?? '—',
          carrier: s.carrier,
          reference: s.reference,
          route: `${s.origin} → ${s.destination}`,
          statusLabel: pres.label,
          statusTone: mapTone(pres.tone),
          hasException: Boolean(s.exception),
        };
      })}
      commissions={commissionRows}
      complianceGateCleared={gate.cleared}
      complianceSummaryLabel={`${scopeBrand.docs.filter((d) => d.status === 'approved').length} of ${scopeBrand.docs.length} documents approved`}
      complianceDocs={scopeBrand.docs.map((d) => ({
        label: DOC_LABELS[d.type] ?? d.type,
        present: d.status === 'approved',
        statusLabel: d.status,
      }))}
      recentMessages={scopeBrand.messages
        .slice()
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 5)
        .map((m) => ({
          id: m.id,
          subject: m.subject ?? m.body,
          direction: m.direction,
          at: m.createdAt,
        }))}
      onNavigate={onNavigate}
    />
  );
}
