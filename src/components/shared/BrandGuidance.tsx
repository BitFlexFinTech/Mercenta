/**
 * §Batch-15 — Brand MOQ/pricing/packaging/PO-rejection guidance.
 *
 * Category-filtered reference sections used in onboarding (required step) and
 * as a prompt when brands first add a product. Single source of truth for all
 * operational guidance — never duplicated.
 */
import { useState } from 'react';
import { Card, Badge } from '@/components/ui';
import { cn } from '@/utils/cn';
import type { ApprovedCategory } from '@/types';
import { PO_REJECTION_CODES } from '@/types';
import { PO_ACK_ONBOARDING_STATEMENT } from '@/config/purchaseOrders';
import {
  Package, DollarSign, AlertTriangle, Shield, Info,
  ChevronDown, ChevronRight, FileText, Scale,
} from 'lucide-react';

/* ── Constants ─────────────────────────────────────────────────────── */

const NET_PPM_BENCHMARKS: {
  categories: ApprovedCategory[];
  minNetPpm: number;
  label: string;
}[] = [
  { categories: ['Home', 'Kitchen', 'Automotive', 'Consumer Electronics', 'Personal Computer'], minNetPpm: 40, label: 'Hardlines ≥ 40%' },
  { categories: ['Baby', 'Office Products', 'Apparel'], minNetPpm: 35, label: 'Softlines ≥ 35%' },
  { categories: ['Health & Personal Care', 'Grocery'], minNetPpm: 30, label: 'Consumables ≥ 30%' },
];

/**
 * Returns the minimum Net PPM benchmark for a given category.
 */
export function getCategoryNetPpmTarget(category?: ApprovedCategory): number {
  if (!category) return 35;
  const match = NET_PPM_BENCHMARKS.find((b) =>
    b.categories.includes(category)
  );
  return match?.minNetPpm ?? 35;
}

/* ── Section: Case Pack & Inner Pack ───────────────────────────────── */

function CasePackSection() {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-hairline rounded-ds-md overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-tint transition-colors"
      >
        <span className="flex items-center gap-2 text-xs font-medium text-strong">
          <Package className="w-3.5 h-3.5 text-accent-400" />
          Case Packs & Inner Packs
        </span>
        {open ? <ChevronDown className="w-3 h-3 text-muted" /> : <ChevronRight className="w-3 h-3 text-muted" />}
      </button>
      {open && (
        <div className="px-4 pb-3 space-y-2 text-ds-label text-muted leading-relaxed">
          <p>
            A <strong className="text-strong">case pack</strong> is the smallest shippable
            carton the retail channel will accept. It must match your real minimum viable
            shipment quantity — <strong className="text-strong">never set it to 1</strong>{' '}
            unless you genuinely ship single units per case.
          </p>
          <p>
            An <strong className="text-strong">inner pack</strong> is the quantity inside
            a case that can be sold as a display unit (e.g. 6 bottles per inner, 4 inners
            per case = 24 total). If your product is sold individually through retail but
            packed in multi-packs for wholesale, configure the inner pack correctly —
            otherwise the system may calculate incorrect landed costs.
          </p>
          <div className="bg-surface rounded-ds-sm p-2 text-ds-micro font-mono text-muted space-y-1">
            <p><span className="text-muted">Example:</span> Marula Oil 50ml</p>
            <p className="pl-3">Inner pack: 6 units</p>
            <p className="pl-3">Case pack: 4 inners × 6 = <strong className="text-strong">24 units per case</strong></p>
            <p className="pl-3">If MOQ is one case, minimum wholesale order = 24 units</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Section: Net PPM & Pricing ────────────────────────────────────── */

function NetPpmSection({ category }: { category?: ApprovedCategory }) {
  const [open, setOpen] = useState(false);
  const target = getCategoryNetPpmTarget(category);

  return (
    <div className="border border-hairline rounded-ds-md overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-tint transition-colors"
      >
        <span className="flex items-center gap-2 text-xs font-medium text-strong">
          <DollarSign className="w-3.5 h-3.5 text-accent-400" />
          Net PPM & Wholesale Pricing
        </span>
        {open ? <ChevronDown className="w-3 h-3 text-muted" /> : <ChevronRight className="w-3 h-3 text-muted" />}
      </button>
      {open && (
        <div className="px-4 pb-3 space-y-2 text-ds-label text-muted leading-relaxed">
          <p>
            <strong className="text-strong">Net PPM</strong> (Net Profit Per Mille) = the
            retail channel's profit per 1,000 units sold, expressed as a percentage of
            the selling price.{' '}
            {/*
              §P13 / S8 — REPOINTED (old contract recorded): this sentence used to end
              *"It is the single most important metric for vendor performance."* — the
              same unsupported vendor-performance claim as AV-003. It now states what the
              metric IS and MERCENTA'S own position on it, never an unverified rating.
            */}
            It is the margin the channel makes on your products, and the number Mercenta
            negotiates your wholesale pricing against.
          </p>
          <div className="bg-surface rounded-ds-sm p-2 text-ds-micro font-mono text-muted space-y-1">
            <p className="text-strong font-medium text-ds-label">Net PPM Formula</p>
            <p>Net PPM = ((ASP − COGS − Channel Fees) ÷ ASP) × 1000</p>
            <p className="text-faint mt-1.5">Where:</p>
            <p className="pl-3">ASP = Average Selling Price to consumers</p>
            <p className="pl-3">COGS = Your Ex-Works price + landed costs + Mercenta margin</p>
            <p className="pl-3">Channel Fees = Retail channel fulfilment, co-op, damages allowance</p>
          </div>

          <div className="mt-2">
            <p className="text-xs text-strong font-medium mb-1">
              Your category benchmark:{' '}
              <Badge className="text-ds-micro bg-accent-500/15 text-accent-300">{category ?? 'N/A'} — {target}% minimum Net PPM</Badge>
            </p>
            <table className="w-full text-ds-micro text-muted mt-1.5">
              <thead>
                <tr className="border-b border-hairline text-faint">
                  <th className="text-left font-medium py-1">Type</th>
                  <th className="text-left font-medium py-1">Categories</th>
                  <th className="text-right font-medium py-1">Min Net PPM</th>
                </tr>
              </thead>
              <tbody>
                {NET_PPM_BENCHMARKS.map((b) => (
                  <tr key={b.label} className="border-b border-hairline">
                    <td className="py-1 text-muted">{b.label}</td>
                    <td className="py-1">{b.categories.join(', ')}</td>
                    <td className="py-1 text-right font-mono">{b.minNetPpm}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ⚠ Cost-price lock-in warning — prominently flagged */}
          <div className="bg-state-danger/10 border border-state-danger/20 rounded-ds-md p-3 text-ds-label">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-state-danger flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-state-danger mb-1">⚠ Cost-Price Lock-In Warning</p>
                <p className="text-muted">
                  Once the retail channel accepts a cost price for a product,{' '}
                  <strong className="text-strong">it will auto-reject any attempt to increase it</strong>.{' '}
                  Price decreases are usually accepted without resistance. This means your initial
                  cost pricing is effectively locked — set it too low and you cannot recover margin
                  later. Always price with headroom for currency fluctuation, landed-cost changes,
                  and channel fee increases.
                </p>
              </div>
            </div>
          </div>

          <p className="text-ds-micro text-faint mt-1">
            <strong className="text-muted">Worked example:</strong> If your target ASP is £24.99
            and your category requires Net PPM ≥ 35%, your maximum Ex-Works + landed cost should
            be roughly £16.25 — about 65% of ASP. The system flags products where the implied Net PPM
            falls below the benchmark at submission time.
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Section: Packaging & Labelling Standards ──────────────────────── */

function PackagingSection() {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-hairline rounded-ds-md overflow-hidden">
      <button onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-tint transition-colors">
        <span className="flex items-center gap-2 text-xs font-medium text-strong">
          <Shield className="w-3.5 h-3.5 text-accent-400" />
          Packaging & Labelling Standards
        </span>
        {open ? <ChevronDown className="w-3 h-3 text-muted" /> : <ChevronRight className="w-3 h-3 text-muted" />}
      </button>
      {open && (
        <div className="px-4 pb-3 space-y-2 text-ds-label text-muted leading-relaxed">
          <div className="bg-surface rounded-ds-sm p-2.5 space-y-2">
            <div>
              <p className="text-xs text-strong font-medium mb-1">Carton Marking</p>
              <ul className="list-disc list-inside text-ds-micro space-y-0.5">
                <li>SSCC-18 barcode (GS1-128) on every carton</li>
                <li>PO number, SKU, total unit count on 2+ adjacent faces</li>
                <li>"Made in [Country]" on shipping carton</li>
                <li>Net + gross weight in kg on exterior</li>
              </ul>
            </div>
            <div>
              <p className="text-xs text-strong font-medium mb-1">Barcode Placement</p>
              <ul className="list-disc list-inside text-ds-micro space-y-0.5">
                <li>GTIN-12 (UPC-A) or GTIN-13 (EAN-13) on product or outer</li>
                <li>Must be scannable through polybag</li>
                <li>Multi-pack must have its own barcode — never reuse single-unit</li>
              </ul>
            </div>
            <div>
              <p className="text-xs text-strong font-medium mb-1">Prep Requirements</p>
              <ul className="list-disc list-inside text-ds-micro space-y-0.5">
                <li>Liquids &gt; 120ml: leak-proof polybag, individually wrapped</li>
                <li>Glass/fragile: "Fragile" marking + 2-inch corner padding min</li>
                <li>Sharp items: secure-point packaging, puncture-proof</li>
                <li>Small items (&lt;15cm): polybag with suffocation warning</li>
              </ul>
            </div>
          </div>
          <p className="text-ds-micro text-faint">
            Summary — full specs from Mercenta compliance team. Non-compliance
            may result in returned shipments, chargebacks, or penalties.
          </p>
        </div>
      )}
    </div>
  );
}
/* ── Section: PO-Rejection Consequences ────────────────────────────── */

function PORejectionSection() {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-hairline rounded-ds-md overflow-hidden">
      <button onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-tint transition-colors">
        <span className="flex items-center gap-2 text-xs font-medium text-strong">
          <AlertTriangle className="w-3.5 h-3.5 text-accent-400" />
          PO Rejection — Performance Impact
        </span>
        {open ? <ChevronDown className="w-3 h-3 text-muted" /> : <ChevronRight className="w-3 h-3 text-muted" />}
      </button>
      {open && (
        <div className="px-4 pb-3 space-y-2 text-ds-label text-muted leading-relaxed">
          {/*
            §P13 / S8 — REPOINTED (old contract recorded). This section used to assert
            three UNSUPPORTED consequences, each presented as if the channel documented
            it (`docs/AMAZON_RECONCILIATION_STATUS.md` AV-003 — no Amazon source
            documents a vendor-performance rating, its thresholds or its triggers):

              · "Every purchase order rejection is tracked against your brand's vendor
                 performance score."
              · "ASIN Confirmation Rate — % of ordered lines confirmed. Below 80%
                 triggers review, may reduce future PO volume. Repeat rejections can
                 delist ASINs."
              · "Net PPM Impact — Rejected POs reduce sell-through, lowering Net PPM…"
              · "Valid rejection codes: TemporarilyUnavailable, InvalidProductIdentifier,
                 ObsoleteProduct." — a hand-typed SECOND copy of `PO_REJECTION_CODES`.

            The rule, the documented past-limit action and the channel's documented
            reason codes now come from the ONE owner
            (`src/config/purchaseOrders.ts → PO_ACK_ONBOARDING_STATEMENT`). What remains
            here is MERCENTA'S OWN declared position — Mercenta operates the channel
            account, so it reviews avoidable rejections with the brand — stated as
            Mercenta's process and never as a channel rule.
          */}
          <div className="bg-state-warning/10 border border-state-warning/20 rounded-ds-md p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-state-warning flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-state-warning mb-1">The acknowledgement rule</p>
                <p className="text-muted">{PO_ACK_ONBOARDING_STATEMENT.ruleText}</p>
              </div>
            </div>
          </div>
          {/*
            §BATCH 2b (`AV-006`) — the UPDATE rule, from its ONE owner. Before this
            the 48-hour window was not modelled anywhere, so a brand could not be
            told its real obligation; the sentence is rendered verbatim from
            `src/config/purchaseOrders.ts → PO_ACK_ONBOARDING_STATEMENT.amendmentText`
            rather than re-typed here.
          */}
          <div className="bg-sky-500/10 border border-sky-500/20 rounded-ds-md p-3">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-state-info mb-1">Changing an acknowledgement</p>
                <p className="text-muted">{PO_ACK_ONBOARDING_STATEMENT.amendmentText}</p>
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-start gap-2 text-xs">
              <span className="w-2 h-2 rounded-full bg-red-500/50 flex-shrink-0 mt-1.5" />
              <div>
                <strong className="text-strong">Rejection requires a documented reason code</strong>
                <p className="text-ds-micro text-muted">
                  The channel accepts three rejection reasons —{' '}
                  <span className="font-mono text-muted">{PO_REJECTION_CODES.join(' · ')}</span> — and a
                  rejection that carries the wrong code is treated as avoidable.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2 text-xs">
              <span className="w-2 h-2 rounded-full bg-amber-500/50 flex-shrink-0 mt-1.5" />
              <div>
                <strong className="text-strong">Mercenta's own position (not a channel rule)</strong>
                <p className="text-ds-micro text-muted">
                  Mercenta is the vendor of record on the channel account, so every rejection placed on
                  that account is reviewed with you. Rejecting only what you genuinely cannot supply —
                  and coding it correctly — is how avoidable rejections are kept off the account.
                </p>
              </div>
            </div>
          </div>
          <div className="mt-2 text-ds-micro text-muted border-t border-hairline pt-2">
            <p className="flex items-start gap-1">
              <Info className="w-3 h-3 text-faint flex-shrink-0 mt-0.5" />
              {PO_ACK_ONBOARDING_STATEMENT.mercentaProcess}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
/* ── Acknowledgement checkbox ──────────────────────────────────────── */

function RequiredReadingAck({ ack, setAck }: { ack: boolean; setAck: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-2.5 cursor-pointer bg-surface rounded-ds-md p-3 border border-hairline hover:border-accent-500/30 transition-colors">
      <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)}
        className="mt-0.5 accent-[var(--mr-accent)]" />
      <div>
        <p className="text-xs text-strong font-medium">I acknowledge the guidance above</p>
        {/*
          §P13 / S8 — REPOINTED (old contract recorded): this line used to read
          *"I understand how pricing, packaging, and PO rejections affect my vendor
          performance. I confirm my category's minimum Net PPM benchmark has been
          reviewed."* — the same unsupported vendor-performance claim as AV-003 (a JSX
          text node wrapped across two lines, which is exactly how it survived the first
          pass of the S8 sweep and was caught by the browser spec).
        */}
        <p className="text-ds-micro text-muted mt-0.5">
          I understand the pricing, packaging and purchase-order acknowledgement rules
          above, and that Mercenta — as the vendor of record on the channel account —
          reviews avoidable rejections with me. I confirm my category's minimum Net PPM
          benchmark has been reviewed.
        </p>
      </div>
    </label>
  );
}

/* ── Main exported component ───────────────────────────────────────── */

interface BrandGuidanceProps {
  /** The brand's approved category for filtering benchmarks. */
  category?: ApprovedCategory;
  /** If true, includes acknowledgement checkbox. */
  requireAck?: boolean;
  /** Called when ack state changes. */
  onAckChange?: (v: boolean) => void;
  /** Current ack state (controlled). */
  ack?: boolean;
  /** Which sections to show. Default: all. */
  sections?: ('casepack' | 'netppm' | 'packaging' | 'po_rejection')[];
  /** Compact mode for Add Product interstitial. */
  compact?: boolean;
}

/**
 * §Batch-15 — Category-filtered operational guidance for brands.
 *
 * Used in two contexts:
 * 1. Onboarding (required step, full sections, requires acknowledgement)
 * 2. Add-Product interstitial (compact, PO-rejection + pricing only)
 */
export function BrandGuidance({
  category,
  requireAck = false,
  onAckChange,
  ack = false,
  sections = ['casepack', 'netppm', 'packaging', 'po_rejection'],
  compact = false,
}: BrandGuidanceProps) {
  return (
    <div className={cn('space-y-2', compact ? '' : 'space-y-3')}>
      {!compact && (
        <div className="flex items-center gap-2 mb-1">
          <Scale className="w-4 h-4 text-accent-400" />
          <p className="text-xs text-muted">
            Operational guidance for{' '}
            <strong className="text-strong">{category ?? 'your category'}</strong>
          </p>
        </div>
      )}
      {sections.includes('casepack') && <CasePackSection />}
      {sections.includes('netppm') && <NetPpmSection category={category} />}
      {sections.includes('packaging') && <PackagingSection />}
      {sections.includes('po_rejection') && <PORejectionSection />}
      {requireAck && (
        <div className="pt-1">
          <RequiredReadingAck ack={ack} setAck={onAckChange ?? (() => {})} />
        </div>
      )}
    </div>
  );
}