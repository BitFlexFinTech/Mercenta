/**
 * §5/M12 — COMMERCIAL RELATIONSHIP CONTROL (Super Admin only).
 *
 * The founder is the sole Super Admin. This view:
 *   • shows BOTH commercial models with the canonical worked figures;
 *   • lets the operator record/change a brand's model, with a mandatory reason;
 *   • shows the resulting canonical audit trail (history is never destroyed);
 *   • states, with computed evidence, that the model CANNOT change the
 *     retail-channel compliance documents the brand's products require.
 *
 * It reads the ONE canonical store (`demoStore`) and the ONE arithmetic module
 * (`lib/finance/commercialModel`) — nothing is re-derived here.
 */
import { useMemo, useState } from 'react';
import { Card, Badge, Button, Input, Select } from '@/components/ui';
import { cn } from '@/utils/cn';
import {
  COMMERCIAL_MODELS,
  COMMERCIAL_MODEL_ORDER,
  COMMERCIAL_MODEL_CHANGEABLE_BY,
  COMMERCIAL_MODEL_CANNOT_CHANGE_COMPLIANCE,
  COMMERCIAL_MODEL_NOT_SELECTED_LABEL,
  checkCommercialModelSelection,
  type CommercialModel,
} from '@/config/commercialModel';
import {
  DEMO_MODEL_A_BRAND_A,
  DEMO_MODEL_B_BRAND_B,
  computeBuyResellModel,
  computeCommissionModel,
  demoShippingCommercialExample,
} from '@/lib/finance/commercialModel';
import {
  demoBrands,
  demoBrandCommercialModels,
  commercialModelAuditFor,
  getBrandCommercialModelRecord,
  setBrandCommercialModel,
} from '@/data/demoStore';
import { getApplicableRequirements } from '@/lib/compliance';
import type { ApprovedCategory } from '@/types';
import { Lock, ArrowRight, ShieldCheck } from 'lucide-react';

const gbp = (n: number) =>
  `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function CommercialModelsPanel() {
  const [version, setVersion] = useState(0);
  const [reason, setReason] = useState('');
  const [draft, setDraft] = useState<Record<string, CommercialModel>>({});
  const [message, setMessage] = useState('');

  const shipping = useMemo(() => demoShippingCommercialExample(), []);
  // Read fresh from the canonical store on every render — `version` is bumped by
  // this panel's own writes, so no memo can ever show a stale relationship.
  void version;
  const rows = demoBrands.map((b) => {
    const record = getBrandCommercialModelRecord(b.id);
    const resolution = checkCommercialModelSelection(record?.model);
    // The retail-channel requirements for this brand's category — computed the
    // same way for BOTH models, which is the point.
    const requirements = getApplicableRequirements(b.category as ApprovedCategory);
    return { brand: b, record, resolution, requirementCount: requirements.length };
  });

  const apply = (brandId: string, brandName: string) => {
    const model = draft[brandId];
    if (!model) {
      setMessage(`Choose a model for ${brandName} first.`);
      return;
    }
    const r = setBrandCommercialModel({
      brandId,
      model,
      actorId: 'staff-001',
      reason: reason.trim() || '',
      source: 'admin_override',
    });
    if (!r.ok) {
      setMessage(r.error);
      return;
    }
    setMessage(`${brandName} → ${COMMERCIAL_MODELS[model].label} recorded and audited.`);
    setReason('');
    setDraft((d) => {
      const next = { ...d };
      delete next[brandId];
      return next;
    });
    setVersion((v) => v + 1);
  };

  return (
    <div className="space-y-4">
      <Card title="Commercial relationship — the two models">
        <p className="text-xs text-zinc-400 mb-3">
          A brand's commercial relationship with Mercenta is{' '}
          <strong className="text-zinc-200">internal</strong> and chosen at onboarding. It is a
          separate concept from the retail-channel compliance documents the brand's products
          require:{' '}
          {COMMERCIAL_MODEL_CANNOT_CHANGE_COMPLIANCE ? (
            <span className="text-emerald-300">
              changing Model A ↔ Model B can never add, remove or waive a compliance requirement
            </span>
          ) : (
            <span className="text-red-300">SEPARATION BROKEN — investigate immediately</span>
          )}
          . Changes after onboarding are restricted to {COMMERCIAL_MODEL_CHANGEABLE_BY.join(', ')} and
          are always audited.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-white/[0.08] p-3" data-testid="model-a-illustration">
            <div className="flex items-center gap-2 mb-1.5">
              <Badge className="bg-emerald-500/15 text-emerald-300">Model A</Badge>
              <span className="text-xs font-medium text-white">
                {COMMERCIAL_MODELS.commission_agent.label}
              </span>
            </div>
            <dl className="space-y-1 text-[11px] font-mono">
              <div className="flex justify-between"><dt className="text-zinc-500">Retail-channel PO</dt><dd className="text-zinc-200">{gbp(DEMO_MODEL_A_BRAND_A.retailChannelRevenueGbp)}</dd></div>
              <div className="flex justify-between"><dt className="text-zinc-500">Commission rate</dt><dd className="text-zinc-200">{DEMO_MODEL_A_BRAND_A.commissionRatePct}%</dd></div>
              <div className="flex justify-between"><dt className="text-zinc-500">Mercenta commission</dt><dd className="text-emerald-300">{gbp(DEMO_MODEL_A_BRAND_A.mercentaCommissionGbp)}</dd></div>
              <div className="flex justify-between"><dt className="text-zinc-500">Brand economic amount</dt><dd className="text-zinc-200">{gbp(DEMO_MODEL_A_BRAND_A.brandAmountGbp)}</dd></div>
            </dl>
            <p className="text-[10px] text-zinc-500 mt-2">{DEMO_MODEL_A_BRAND_A.vat.basis}</p>
          </div>

          <div className="rounded-lg border border-white/[0.08] p-3" data-testid="model-b-illustration">
            <div className="flex items-center gap-2 mb-1.5">
              <Badge className="bg-blue-500/15 text-blue-300">Model B</Badge>
              <span className="text-xs font-medium text-white">
                {COMMERCIAL_MODELS.buy_resell.label}
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 mb-2">{COMMERCIAL_MODELS.buy_resell.summary}</p>
            <dl className="space-y-1 text-[11px] font-mono">
              <div className="flex justify-between"><dt className="text-zinc-500">Retail-channel revenue</dt><dd className="text-zinc-200">{gbp(DEMO_MODEL_B_BRAND_B.retailChannelRevenueGbp)}</dd></div>
              <div className="flex justify-between"><dt className="text-zinc-500">Brand acquisition cost</dt><dd className="text-zinc-200">{gbp(DEMO_MODEL_B_BRAND_B.brandAcquisitionCostGbp)}</dd></div>
              <div className="flex justify-between border-t border-white/[0.06] pt-1"><dt className="text-zinc-400">GROSS commercial spread</dt><dd className="text-amber-300">{gbp(DEMO_MODEL_B_BRAND_B.grossCommercialSpreadGbp)}</dd></div>
              <div className="flex justify-between"><dt className="text-zinc-500">Carrier</dt><dd className="text-zinc-300">{gbp(DEMO_MODEL_B_BRAND_B.costs.carrierCostGbp)}</dd></div>
              <div className="flex justify-between"><dt className="text-zinc-500">Payment fees</dt><dd className="text-zinc-300">{gbp(DEMO_MODEL_B_BRAND_B.costs.paymentFeesGbp)}</dd></div>
              <div className="flex justify-between"><dt className="text-zinc-500">Other agreed costs</dt><dd className="text-zinc-300">{gbp(DEMO_MODEL_B_BRAND_B.costs.otherAgreedFeesGbp)}</dd></div>
              <div className="flex justify-between"><dt className="text-zinc-500">Deductions</dt><dd className="text-zinc-300">{gbp(DEMO_MODEL_B_BRAND_B.costs.deductionsGbp)}</dd></div>
              <div className="flex justify-between border-t border-white/[0.06] pt-1"><dt className="text-zinc-400">NET Mercenta margin</dt><dd className="text-emerald-300">{gbp(DEMO_MODEL_B_BRAND_B.netMercentaMarginGbp)}</dd></div>
            </dl>
            <p className="text-[10px] text-zinc-500 mt-2">
              {gbp(DEMO_MODEL_B_BRAND_B.grossCommercialSpreadGbp)} is the commercial{' '}
              <em>spread</em>; {gbp(DEMO_MODEL_B_BRAND_B.netMercentaMarginGbp)} is the net margin
              after the stated costs. {DEMO_MODEL_B_BRAND_B.vat.basis}
            </p>
          </div>
        </div>

        <div className="mt-3 rounded-lg border border-white/[0.08] p-3" data-testid="shipping-economics">
          <p className="text-xs font-medium text-white mb-1">
            Shipping economics — canonical terms, derived (never hardcoded)
          </p>
          <p className="text-[11px] font-mono text-zinc-400">
            DHL list {gbp(shipping.carrierListCost)} − negotiated discount{' '}
            {gbp(shipping.negotiatedDiscountAmount)} = carrier invoice{' '}
            {gbp(shipping.carrierInvoiceCost)} → brand charged {gbp(shipping.brandAmountCharged)} →
            gross shipping margin {gbp(shipping.grossShippingMargin)} (net{' '}
            {gbp(shipping.netMercentaRevenue)}). Carrier cost and brand charge are BOTH retained.
          </p>
        </div>
      </Card>

      <Card title="Brands — recorded commercial relationship">
        {message && <p className="text-xs text-brass-300 mb-2" data-testid="commercial-model-message">{message}</p>}
        <div className="mb-3 max-w-sm">
          <Input
            label="Reason (required for any change — audited)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. agreed at the quarterly review with the brand"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/[0.06] text-left text-zinc-500">
                <th className="px-2 py-1.5">Brand</th>
                <th className="px-2 py-1.5">Category</th>
                <th className="px-2 py-1.5">Recorded model</th>
                <th className="px-2 py-1.5">Terms</th>
                <th className="px-2 py-1.5">Retail-channel required documents</th>
                <th className="px-2 py-1.5">Change to</th>
                <th className="px-2 py-1.5" />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ brand, record, resolution, requirementCount }) => (
                <tr key={brand.id} className="border-b border-white/[0.04]" data-testid={`commercial-model-row-${brand.id}`}>
                  <td className="px-2 py-1.5 text-white font-medium">{brand.profile.businessName}</td>
                  <td className="px-2 py-1.5 text-zinc-400">{brand.category}</td>
                  <td className="px-2 py-1.5">
                    {resolution.ok ? (
                      <Badge
                        className={cn(
                          'text-[9px]',
                          resolution.model === 'commission_agent'
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : 'bg-blue-500/15 text-blue-300'
                        )}
                      >
                        {COMMERCIAL_MODELS[resolution.model as CommercialModel].label}
                      </Badge>
                    ) : (
                      <Badge className="text-[9px] bg-amber-500/15 text-amber-300">
                        {COMMERCIAL_MODEL_NOT_SELECTED_LABEL}
                      </Badge>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-zinc-400 font-mono text-[10px]">
                    {record
                      ? record.model === 'commission_agent'
                        ? `${record.commissionRatePct}% commission`
                        : `${record.brandAcquisitionSharePct}% acquisition share`
                      : '—'}
                    {record && <span className="text-zinc-600"> · {record.source}</span>}
                  </td>
                  <td className="px-2 py-1.5 text-zinc-400">
                    <span className="inline-flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" />
                      {requirementCount} required — identical under either model
                    </span>
                  </td>
                  <td className="px-2 py-1.5">
                    <Select
                      value={draft[brand.id] ?? ''}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, [brand.id]: e.target.value as CommercialModel }))
                      }
                      options={[
                        { value: '', label: 'Select…' },
                        ...COMMERCIAL_MODEL_ORDER.map((id) => ({
                          value: id,
                          label: COMMERCIAL_MODELS[id].label,
                        })),
                      ]}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <Button
                      variant="tertiary"
                      className="text-[10px] px-2 py-1"
                      onClick={() => apply(brand.id, brand.profile.businessName)}
                    >
                      <Lock className="w-3 h-3" />
                      Record change
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-zinc-600 mt-2">
          {demoBrandCommercialModels.length} brands hold a recorded commercial relationship. The
          compliance column is computed by <code>getApplicableRequirements</code> and is deliberately
          shown beside the model column so the separation is visible, not merely asserted.
        </p>
      </Card>

      <Card title="Audit trail — commercial relationship">
        {rows.every((r) => commercialModelAuditFor(r.brand.id).length === 0) ? (
          <p className="text-xs text-zinc-500" data-testid="commercial-model-audit-empty">
            No operator changes recorded yet. Seeded demo assignments are marked <code>demo_seed</code>.
          </p>
        ) : (
          <div className="space-y-1.5" data-testid="commercial-model-audit">
            {rows.flatMap((r) =>
              commercialModelAuditFor(r.brand.id).map((e) => (
                <div key={e.id} className="flex items-start gap-2 text-[11px] border-b border-white/[0.04] pb-1.5">
                  <ArrowRight className="w-3 h-3 text-zinc-600 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <span className="text-zinc-300">{r.brand.profile.businessName}</span>
                    <span className="text-zinc-500">
                      {' '}· {e.action} · {String(e.metadata?.model ?? '')}
                    </span>
                    <p className="text-zinc-600">
                      {e.actorId} — {e.reason} · compliance unchanged:{' '}
                      {String(e.metadata?.complianceUnchanged)} · {e.createdAt}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </Card>

      <Card title="Worked reverse-check — each brand's own agreed terms">
        <p className="text-[10px] text-zinc-500 mb-2">
          The same canonical functions the investor demo uses, driven by each brand's recorded terms,
          so a brand's own numbers can never disagree with the demo's.
        </p>
        <div className="grid gap-2 md:grid-cols-2 text-[11px] font-mono">
          {rows.slice(0, 4).map(({ brand, record }) => {
            const model = record?.model ?? 'commission_agent';
            if (model === 'commission_agent') {
              const r = computeCommissionModel({
                retailChannelRevenueGbp: 10_000,
                commissionRatePct: record?.commissionRatePct ?? 20,
              });
              return (
                <p key={brand.id} className="text-zinc-400">{r.formula}</p>
              );
            }
            const r = computeBuyResellModel({
              retailChannelRevenueGbp: 10_000,
              brandAcquisitionCostGbp: (10_000 * (record?.brandAcquisitionSharePct ?? 75)) / 100,
              carrierCostGbp: 60,
              paymentFeesGbp: 120,
              otherAgreedFeesGbp: 50,
              deductionsGbp: 0,
            });
            return <p key={brand.id} className="text-zinc-400">{r.formula}</p>;
          })}
        </div>
      </Card>
    </div>
  );
}

export default CommercialModelsPanel;