import { useMemo, useState } from 'react';
import {
  useBrands,
  useCommissions,
  useDeductions,
  useShippingMargins,
  useSubscriptions,
} from '@/data/queries';
import { useIntegrations } from '@/integrations/IntegrationsContext';
import { generateInvoice } from '@/lib/billing/invoice';
import { generateRemittanceStatement } from '@/lib/billing/remittance';
import { downloadCsv } from '@/lib/csv';
import {
  AdminBillingView,
  type AdminBillingBrandCard,
  type BillingFocus,
  type RemittanceStatementDetail,
} from './AdminBillingView';

export function AdminBillingScreen() {
  const { integrations } = useIntegrations();
  const stripe = integrations.stripe;
  const stripeLive = stripe?.status === 'connected' && !stripe.sandbox;

  const brandsQuery = useBrands();
  const subsQuery = useSubscriptions();
  const commQuery = useCommissions();
  const marginsQuery = useShippingMargins();
  const deductionsQuery = useDeductions();

  const [focus, setFocus] = useState<BillingFocus>('all');
  const [selectedStatement, setSelectedStatement] = useState<RemittanceStatementDetail | null>(null);

  const allBrands = useMemo(() => brandsQuery.data?.data ?? [], [brandsQuery.data]);
  const subs = useMemo(() => subsQuery.data?.data ?? [], [subsQuery.data]);
  const comms = useMemo(() => commQuery.data?.data ?? [], [commQuery.data]);
  const margins = useMemo(() => marginsQuery.data?.data ?? [], [marginsQuery.data]);
  const deductions = useMemo(() => deductionsQuery.data?.data ?? [], [deductionsQuery.data]);

  const brandCards: AdminBillingBrandCard[] = useMemo(() => {
    const visible = allBrands.filter((b) => {
      if (focus === 'all') return true;
      if (focus === 'subscriptions') {
        const sub = subs.find((s) => s.brandId === b.id);
        return Boolean(sub && sub.status === 'active');
      }
      if (focus === 'commissions') return comms.some((c) => c.brandId === b.id);
      return deductions.some((d) => d.brandId === b.id);
    });

    return visible.map((b) => {
      const sub = subs.find((s) => s.brandId === b.id);
      const brandComms = comms.filter((c) => c.brandId === b.id);
      const brandMargins = margins.filter((m) => m.brandId === b.id);
      const brandDeductions = deductions.filter((d) => d.brandId === b.id);
      const inv = generateInvoice({
        brand: b,
        periodStart: '2026-08-01',
        periodEnd: '2026-08-31',
        sequence: allBrands.indexOf(b) + 1,
        subscription:
          sub && sub.status === 'active'
            ? { planTier: sub.planTier, monthlyFee: sub.monthlyFee }
            : undefined,
        commissions: brandComms,
      });
      const marginTotal = brandMargins.reduce(
        (acc, m) => acc + (m.brandBilledPrice - m.carrierCostPrice),
        0
      );
      const dedTotal = brandDeductions.reduce((acc, d) => acc + d.amountGbp, 0);

      const stmt = generateRemittanceStatement({
        brandName: b.profile.businessName,
        periodStart: '2026-08-01',
        periodEnd: '2026-08-31',
        statementNumber: `RS-2026-08-${b.id.slice(0, 8)}`,
        lines: brandComms.map((c) => ({
          poNumber: c.purchaseOrderId,
          grossValue: c.poValue,
          commission: c.commissionAmount,
          deductions: brandDeductions
            .filter((d) => d.purchaseOrderId === c.purchaseOrderId)
            .map((d) => ({ type: d.type, amountGbp: d.amountGbp })),
        })),
      });

      const stmtLines = stmt.lines.map((l) => {
        const lineDed = l.deductions.reduce((s, d) => s + d.amountGbp, 0);
        return {
          poNumber: l.poNumber,
          grossValue: l.grossValue,
          commission: l.commission,
          deductions: l.deductions,
          net: l.grossValue - l.commission - lineDed,
        };
      });

      const remittance: RemittanceStatementDetail = {
        brandName: b.profile.businessName,
        statementNumber: stmt.statementNumber,
        periodStart: '2026-08-01',
        periodEnd: '2026-08-31',
        grossTotal: stmtLines.reduce((s, l) => s + l.grossValue, 0),
        commissionTotal: stmtLines.reduce((s, l) => s + l.commission, 0),
        deductionsTotal: stmtLines.reduce(
          (s, l) => s + l.deductions.reduce((dSum, d) => dSum + d.amountGbp, 0),
          0
        ),
        netPaid: stmt.netPaid,
        lines: stmtLines,
      };

      return {
        brandId: b.id,
        brandName: b.profile.businessName,
        planTier: sub?.planTier,
        subStatus: sub?.status,
        invoiceNumber: inv.number,
        invoiceSubtotalGbp: inv.subtotalGbp,
        invoiceNotes: inv.notes,
        shippingMarginGbp: marginTotal,
        deductionsTotalGbp: dedTotal,
        hasCommissions: brandComms.length > 0,
        remittance,
      };
    });
  }, [allBrands, focus, subs, comms, margins, deductions]);

  const periodTotals = useMemo(
    () => ({
      invoiced: allBrands.reduce((acc, b, i) => {
        const sub = subs.find((s) => s.brandId === b.id);
        const inv = generateInvoice({
          brand: b,
          periodStart: '2026-08-01',
          periodEnd: '2026-08-31',
          sequence: i + 1,
          subscription:
            sub && sub.status === 'active'
              ? { planTier: sub.planTier, monthlyFee: sub.monthlyFee }
              : undefined,
          commissions: comms.filter((c) => c.brandId === b.id),
        });
        return acc + inv.subtotalGbp;
      }, 0),
      shipping: margins.reduce((acc, m) => acc + (m.brandBilledPrice - m.carrierCostPrice), 0),
      deductions: deductions.reduce((acc, d) => acc + d.amountGbp, 0),
      activeSubs: subs.filter((s) => s.status === 'active').length,
    }),
    [allBrands, subs, comms, margins, deductions]
  );

  const errorObj =
    brandsQuery.error || subsQuery.error || commQuery.error || marginsQuery.error || deductionsQuery.error;
  const error =
    errorObj instanceof Error ? errorObj.message : errorObj ? 'Failed to load billing.' : null;

  return (
    <AdminBillingView
      loading={
        brandsQuery.isPending ||
        subsQuery.isPending ||
        commQuery.isPending ||
        marginsQuery.isPending ||
        deductionsQuery.isPending
      }
      error={error}
      onRetry={() => {
        void brandsQuery.refetch();
        void subsQuery.refetch();
        void commQuery.refetch();
        void marginsQuery.refetch();
        void deductionsQuery.refetch();
      }}
      stripeLive={stripeLive}
      focus={focus}
      onFocusChange={setFocus}
      totalBrands={allBrands.length}
      periodInvoicedGbp={periodTotals.invoiced}
      activeSubscriptionsCount={periodTotals.activeSubs}
      shippingMarginGbp={periodTotals.shipping}
      totalDeductionsGbp={periodTotals.deductions}
      deductionsPostedCount={deductions.length}
      brands={brandCards}
      onExportCommissionCsv={(brandId) => {
        const brandComms = comms.filter((c) => c.brandId === brandId);
        downloadCsv(
          `commission-${brandId}.csv`,
          ['PO', 'Gross', 'Commission', 'Status'],
          brandComms.map((c) => [
            c.purchaseOrderId,
            String(c.poValue),
            String(c.commissionAmount),
            c.status,
          ])
        );
      }}
      selectedStatement={selectedStatement}
      onSelectStatement={setSelectedStatement}
    />
  );
}
