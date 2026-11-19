import { useMemo, useState } from 'react';
import { useContracts, usePurchaseOrders, useDeductions } from '@/data/queries';
import { generateRemittanceStatement } from '@/lib/billing/remittance';
import { requestProfileChange, demoProfileChangeRequests } from '@/data/api';
import { assertBrandScope, scopedBrandId } from '@/lib/auth/rbac';
import { useApp } from '@/context/GlobalStateContext';
import { Badge, Button, Card, Input, LoadingState } from '@/components/ui';
import { WorkspaceFrame, WorkspaceHeader } from '@/components/shared/workspace';
import { cn } from '@/utils/cn';
import { Download, FileText, Landmark } from 'lucide-react';

const CHANGE_FIELDS = [
  'businessName',
  'email',
  'phone',
  'signatory',
  'iban',
  'bic',
] as const;

function download(name: string, content: string, mime = 'text/html') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

/** Minimal standalone HTML wrapper for a stored contract document URL/text. */
function buildAgreementHtml(documentUrl: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Distribution Agreement — Mercenta Partners</title></head><body style="font-family:Helvetica,Arial,sans-serif;padding:32px"><h1>Distribution Agreement</h1><p>Document reference: ${documentUrl || 'n/a'}</p><p>Issued by Mercenta Partners Ltd.</p></body></html>`;
}

function RemittanceRow({ statement }: { statement: ReturnType<typeof generateRemittanceStatement> | null }) {
  if (!statement) return null;
  return (
    <div className="flex items-center justify-between border-b border-hairline py-1.5">
      <span className="flex items-center gap-2 text-ds-label text-zinc-300">
        <FileText className="w-3.5 h-3.5 text-zinc-500" />
        Remittance statement {statement.statementNumber} · net £{statement.netPaid.toFixed(2)}
      </span>
      <Button className="text-ds-micro" onClick={() => download(`${statement.statementNumber}.html`, statement.html)}>
        <Download className="w-3 h-3 mr-1" /> Download
      </Button>
    </div>
  );
}


/**
 * §Stage-25 — brand self-service depth.
 * Document library: download THIS brand's signed contract and its remittance
 * statements (gross → commission → deductions → net). Profile & banking
 * changes route through an admin-approved request flow — banking details are
 * a fraud vector and are never directly self-service editable. All data is
 * tenant-scoped through the session pin, never client-supplied ids.
 */
export function BrandSelfService() {
  const { session, brandProfile } = useApp();
  const contractsQuery = useContracts();
  const posQuery = usePurchaseOrders();
  const deductionsQuery = useDeductions();

  // §Stage-26 — session-derived scoping only.
  const contracts = useMemo(
    () => assertBrandScope(session, contractsQuery.data?.data ?? []),
    [session, contractsQuery.data]
  );
  const pos = useMemo(
    () => assertBrandScope(session, posQuery.data?.data ?? []),
    [session, posQuery.data]
  );
  const deductions = useMemo(
    () => assertBrandScope(session, deductionsQuery.data?.data ?? []),
    [session, deductionsQuery.data]
  );

  const [field, setField] = useState<(typeof CHANGE_FIELDS)[number]>('email');
  const [requestedValue, setRequestedValue] = useState('');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  void version;

  const brandId = scopedBrandId(session) ?? '';
  const signed = contracts.filter((c) => ['signed', 'active'].includes(c.status));

  /** Latest monthly remittance statement for this brand. */
  function buildStatement() {
    if (pos.length === 0 || !brandId) return null;
    const dates = pos.map((p) => p.orderDate).sort();
    const periodStart = dates[0];
    const periodEnd = dates[dates.length - 1];
    return generateRemittanceStatement({
      brandName: brandProfile.businessName || 'Brand',
      periodStart,
      periodEnd,
      statementNumber: `RS-${periodEnd.slice(0, 7)}-${brandId}`,
      lines: pos.map((p) => ({
        poNumber: p.poNumber,
        grossValue: p.poValue,
        commission: p.commissionAmount,
        deductions: deductions
          .filter((d) => d.purchaseOrderId === p.poNumber)
          .map((d) => ({ type: d.type, amountGbp: d.amountGbp })),
      })),
    });
  }

  const myRequests = demoProfileChangeRequests.filter((r) => r.brandId === brandId);

  return (
    <WorkspaceFrame className="space-y-4" testId="brand-documents-account">
      <WorkspaceHeader
        eyebrow="BRAND PORTAL · ACCOUNT"
        title="Documents & Account"
        description="Your contracts, remittance statements and approved account changes"
      />

      <Card title="Document Library">
        <div className="px-1 pb-2 space-y-1.5">
          {/* §Wave 3 Part 5 — "No signed contract yet." was shown while the
              contracts query was still resolving (measured in a real browser). */}
          {contractsQuery.isPending && (
            <LoadingState rows={2} label="Loading your signed documents…" />
          )}
          {!contractsQuery.isPending && signed.length === 0 && (
            <p className="text-ds-label text-zinc-600">No signed contract yet.</p>
          )}
          {!contractsQuery.isPending && signed.map((c) => (
            <div key={c.id} className="flex items-center justify-between border-b border-hairline py-1.5">
              <span className="flex items-center gap-2 text-ds-label text-zinc-300">
                <FileText className="w-3.5 h-3.5 text-zinc-500" />
                Distribution Agreement v{c.version} · {c.status}
              </span>
              <Button
                className="text-ds-micro"
                onClick={() =>
                  download(`mercenta-agreement-v${c.version}.html`, buildAgreementHtml(c.documentUrl))
                }
              >
                <Download className="w-3 h-3 mr-1" /> Download
              </Button>
            </div>
          ))}
          <RemittanceRow statement={buildStatement()} />
        </div>
      </Card>

      <Card title="Request an account change">
        <div className="px-1 pb-2 space-y-2">
          <p className="text-ds-micro text-zinc-600 flex items-center gap-1">
            <Landmark className="w-3 h-3" />
            Banking changes always require Mercenta verification before they apply —
            they are never directly self-service.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="block text-ds-micro text-zinc-500 mb-1">Field</label>
              <select
                value={field}
                onChange={(e) => setField(e.target.value as (typeof CHANGE_FIELDS)[number])}
                className="w-full bg-ink-900 border border-hairline rounded-ds-sm px-2 py-1.5 text-xs text-zinc-300"
              >
                {CHANGE_FIELDS.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
            <Input
              label="New value"
              value={requestedValue}
              onChange={(e) => setRequestedValue(e.target.value)}
            />
            <Input
              label="Reason (required)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <Button
            className="text-xs"
            disabled={!requestedValue.trim() || !reason.trim()}
            onClick={() => {
              try {
                requestProfileChange({
                  brandId,
                  field,
                  currentValue:
                    field === 'businessName'
                      ? brandProfile.businessName
                      : field === 'iban'
                        ? brandProfile.iban
                        : field === 'bic'
                          ? brandProfile.bic
                          : field === 'email'
                            ? brandProfile.email
                            : field === 'phone'
                              ? brandProfile.phone
                              : brandProfile.signatory,
                  requestedValue,
                  reason,
                });
                setNote('Request submitted — Mercenta staff will verify and apply it.');
                setRequestedValue('');
                setReason('');
                setVersion((v) => v + 1);
              } catch (err) {
                setNote(err instanceof Error ? err.message : 'Failed to submit');
              }
            }}
          >
            Submit Request
          </Button>
          {note && <p className="text-ds-micro text-zinc-400">{note}</p>}

          {myRequests.length > 0 && (
            <div className="pt-1">
              <p className="text-ds-micro font-medium text-zinc-500 mb-1">Your requests</p>
              {myRequests.map((r) => (
                <div key={r.id} className="flex items-center justify-between border-b border-hairline py-1">
                  <span className="text-ds-label text-zinc-300 capitalize">
                    {r.field}: {r.requestedValue}
                  </span>
                  <Badge
                    className={cn(
                      'text-ds-micro',
                      r.status === 'pending'
                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/20'
                        : r.status === 'approved'
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20'
                          : 'bg-red-500/15 text-red-300 border-red-500/20'
                    )}
                  >
                    {r.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}

        </div>
      </Card>
    </WorkspaceFrame>
  );
}
