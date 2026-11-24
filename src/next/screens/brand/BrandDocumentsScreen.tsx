import { useMemo, useState } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { useContracts, useDeductions, usePurchaseOrders } from '@/data/queries';
import { demoProfileChangeRequests, requestProfileChange } from '@/data/api';
import { assertBrandScope, scopedBrandId } from '@/lib/auth/rbac';
import { generateRemittanceStatement } from '@/lib/billing/remittance';
import type { Contract } from '@/types';
import {
  BrandDocumentsView,
  type AccountChangeField,
} from './BrandDocumentsView';

function downloadText(name: string, content: string, mime = 'text/html') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function BrandDocumentsScreen() {
  const { session, brandProfile } = useApp();
  const contractsQ = useContracts();
  const posQ = usePurchaseOrders();
  const deductionsQ = useDeductions();

  const [notice, setNotice] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const contracts = useMemo(
    () => assertBrandScope(session, contractsQ.data?.data ?? []),
    [session, contractsQ.data]
  );
  const pos = useMemo(
    () => assertBrandScope(session, posQ.data?.data ?? []),
    [session, posQ.data]
  );
  const deductions = useMemo(
    () => assertBrandScope(session, deductionsQ.data?.data ?? []),
    [session, deductionsQ.data]
  );

  const brandId = scopedBrandId(session) ?? '';
  const signedContracts = contracts.filter((c) => ['signed', 'active'].includes(c.status));

  const remittance = useMemo(() => {
    if (pos.length === 0 || !brandId) return null;
    const dates = pos.map((p) => p.orderDate).sort();
    const st = generateRemittanceStatement({
      brandName: brandProfile.businessName || 'Brand',
      periodStart: dates[0],
      periodEnd: dates[dates.length - 1],
      statementNumber: `RS-${dates[dates.length - 1].slice(0, 7)}-${brandId}`,
      lines: pos.map((p) => ({
        poNumber: p.poNumber,
        grossValue: p.poValue,
        commission: p.commissionAmount,
        deductions: deductions
          .filter((d) => d.purchaseOrderId === p.poNumber)
          .map((d) => ({ type: d.type, amountGbp: d.amountGbp })),
      })),
    });
    return { statementNumber: st.statementNumber, netPaid: st.netPaid, html: st.html };
  }, [pos, deductions, brandId, brandProfile.businessName]);

  const requests = useMemo(() => {
    void tick;
    return demoProfileChangeRequests
      .filter((r) => r.brandId === brandId)
      .map((r) => ({
        id: r.id,
        field: r.field,
        requestedValue: r.requestedValue,
        reason: r.reason,
        status: r.status,
      }));
  }, [brandId, tick]);

  function handleDownloadAgreement(c: Contract) {
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Distribution Agreement — Mercenta Partners</title></head><body style="font-family:Helvetica,Arial,sans-serif;padding:32px"><h1>Distribution Agreement</h1><p>Document reference: ${c.documentUrl || c.id}</p><p>Issued by Mercenta Partners Ltd.</p></body></html>`;
    downloadText(`mercenta-agreement-v${c.version}.html`, html);
  }

  function handleSubmitChangeRequest(input: {
    field: AccountChangeField;
    requestedValue: string;
    reason: string;
  }) {
    try {
      requestProfileChange({
        brandId,
        field: input.field,
        currentValue:
          input.field === 'businessName'
            ? brandProfile.businessName
            : input.field === 'iban'
              ? brandProfile.iban
              : input.field === 'bic'
                ? brandProfile.bic
                : input.field === 'email'
                  ? brandProfile.email
                  : input.field === 'phone'
                    ? brandProfile.phone
                    : brandProfile.signatory,
        requestedValue: input.requestedValue,
        reason: input.reason,
      });
      setNotice('Change request submitted — Mercenta staff will verify and apply it.');
      setTick((t) => t + 1);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Failed to submit change request.');
    }
  }

  return (
    <BrandDocumentsView
      loading={contractsQ.isPending || posQ.isPending}
      error={contractsQ.isError ? String(contractsQ.error) : null}
      onRetry={() => {
        void contractsQ.refetch();
        void posQ.refetch();
      }}
      signedContracts={signedContracts}
      remittance={remittance}
      requests={requests}
      notice={notice}
      onDownloadAgreement={handleDownloadAgreement}
      onDownloadRemittance={() => {
        if (remittance) downloadText(`${remittance.statementNumber}.html`, remittance.html);
      }}
      onSubmitChangeRequest={handleSubmitChangeRequest}
    />
  );
}
export default BrandDocumentsScreen;
