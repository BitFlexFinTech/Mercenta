/**
 * §P6 — "DOCUMENTS FOR THIS PO" — THE LOGISTICS HUB'S DOCUMENT PACK SURFACE.
 *
 * Founder decision 6 (`docs/DASHBOARD_LOGISTICS_CLEANUP_PROGRAMME_2026-09-22.md`):
 * "The Logistics Hub = where brands download shipping labels + ALL PO documents",
 * and decision 9: the pack is produced AUTOMATICALLY on acceptance.
 *
 * WHAT THIS COMPONENT IS
 * ----------------------
 * A presentation of the canonical pack (`src/lib/documents/poDocumentPack.ts`) for
 * ONE purchase order: every document, its purpose, whether it is READY, and the
 * reason when it is not. It adds no business rule of its own:
 *
 *   · the pack (and therefore the document list, the destination, the lane and the
 *     readiness) comes from the ONE owner — nothing is re-derived here;
 *   · a document rendered by an EXISTING dialogue (`carrier_label`,
 *     `freight_waybill`) is opened through the callback the Hub supplies, so there
 *     is one renderer per artefact and the existing waybill/label dialogues are
 *     preserved (programme: "won't touch the existing waybill/label dialogs");
 *   · a document the platform cannot honestly produce is shown as NOT READY with
 *     its reason — never as a blank or a fake;
 *   · a document that does not apply to the lane is shown as NOT APPLICABLE with
 *     the reason, so it is never silently missing from the list.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui';
import { cn } from '@/utils/cn';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Info,
  Printer,
  X,
} from 'lucide-react';
import type { ChannelInstruction, Product, PurchaseOrder } from '@/types';
import { asnForInstruction } from '@/lib/commerce/proxyProcessor';
import {
  buildPoDocumentPack,
  poDocumentFileName,
  poDocumentPackFileName,
  renderPoDocumentPackHtml,
  type PoCarrierReference,
  type PoDocument,
} from '@/lib/documents/poDocumentPack';
/**
 * §P1-fix — the ONE file-export helper. `downloadHtml` is the platform's existing
 * browser file-download seam (no dependency, no network), so the download control
 * reuses it rather than hand-rolling a second `createObjectURL` copy.
 */
import { downloadHtml } from '@/lib/founder/documentExport';
import { buildCollectChain, type CollectChain } from '@/lib/shipping/collectChain';
/** §P12 — the channel's label rule is read from its ONE canonical owner. */
import { channelShipmentLabelsAvailability } from '@/config/shipping';
import { UK_MARKETPLACE_ID } from '@/lib/spapi/transform';


/* ── status presentation ──────────────────────────────────────────────────── */

type DocumentStanding = 'ready' | 'not_ready' | 'not_applicable';

function standingOf(doc: PoDocument): DocumentStanding {
  if (!doc.applicable) return 'not_applicable';
  return doc.ready ? 'ready' : 'not_ready';
}

const STANDING_PRESENTATION: Record<
  DocumentStanding,
  { label: string; className: string; Icon: typeof CheckCircle2 }
> = {
  ready: {
    label: 'Ready',
    className: 'border-state-success/40 bg-state-success/10 text-state-success',
    Icon: CheckCircle2,
  },
  not_ready: {
    label: 'Not ready',
    className: 'border-state-warning/40 bg-state-warning/10 text-state-warning',
    Icon: AlertTriangle,
  },
  not_applicable: {
    label: 'Not applicable',
    className: 'border-hairline-strong bg-tint text-zinc-500',
    Icon: Info,
  },
};

/* ── the printable preview dialogue ───────────────────────────────────────── */

function DocumentDialog({ doc, onClose }: { doc: PoDocument; onClose: () => void }) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={doc.title}
      data-testid="po-document-dialog"
    >
      <div className="absolute inset-0 bg-surface-hover backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-ds-lg border border-hairline bg-ink-850 shadow-ds-overlay sm:rounded-ds-lg">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-hairline bg-ink-850/95 px-4 py-3 backdrop-blur">
          <div className="min-w-0">
            <h2 className="text-ds-title font-semibold text-strong">{doc.title}</h2>
            <p className="mt-0.5 text-ds-label text-zinc-500">{doc.purpose}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-ds-sm p-1.5 text-zinc-500 transition-ds duration-ds-fast hover:bg-tint hover:text-strong"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {doc.placeholderNotice && (
          <p
            className="border-b border-hairline bg-state-warning/10 px-4 py-2 text-ds-micro leading-relaxed text-state-warning"
            data-testid="po-document-placeholder-notice"
          >
            {doc.placeholderNotice}
          </p>
        )}

        {doc.html ? (
          <iframe
            ref={frameRef}
            title={doc.title}
            srcDoc={doc.html}
            className="h-[60vh] w-full bg-tint"
            data-testid="po-document-frame"
          />
        ) : (
          <div className="p-4">
            <p className="text-ds-body text-zinc-400">
              {doc.notReadyReason ?? 'This document has no printable content yet.'}
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-hairline p-4">
          <span className="text-ds-micro text-zinc-500">
            {doc.cartonIdentifiers?.length
              ? `${doc.cartonIdentifiers.length} carton identifier(s) on this document.`
              : `Lane scope: ${doc.laneScope === 'international' ? 'international lanes' : 'all lanes'}.`}
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            <Button
              onClick={() => frameRef.current?.contentWindow?.print()}
              disabled={!doc.html}
              data-testid="po-document-print"
            >
              <Printer className="h-3.5 w-3.5" />
              Print
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}


/* ── the collect chain ────────────────────────────────────────────────────── */

const CHAIN_STATE_PRESENTATION: Record<
  CollectChain['steps'][number]['state'],
  { label: string; className: string; Icon: typeof CheckCircle2 }
> = {
  done: {
    label: 'Done',
    className: 'text-state-success',
    Icon: CheckCircle2,
  },
  scheduled: {
    label: 'Scheduled',
    className: 'text-state-info',
    Icon: Clock,
  },
  awaiting_channel: {
    label: 'Awaiting the channel',
    className: 'text-zinc-400',
    Icon: Clock,
  },
  not_applicable: {
    label: 'Not applicable',
    className: 'text-zinc-600',
    Icon: Info,
  },
};

/**
 * The DOCUMENTED channel collect chain (request → carrier assigned → ARN →
 * pickup), exactly as `src/lib/shipping/collectChain.ts` derives it. Every step
 * states its own basis, and a step the channel has not performed says so — an ARN
 * is never invented.
 */
export function CollectChainPanel({ chain }: { chain: CollectChain }) {
  return (
    <div className="border-t border-hairline pt-2.5" data-testid="collect-chain">
      <p className="text-ds-micro uppercase tracking-[0.12em] text-zinc-500">
        Channel collect chain
      </p>
      <p className="mt-1 text-ds-micro leading-relaxed text-zinc-400" data-testid="collect-chain-notice">
        {chain.notice}
      </p>
      <ol className="mt-2 space-y-1.5">
        {chain.steps.map((step, index) => {
          const presentation = CHAIN_STATE_PRESENTATION[step.state];
          const Icon = presentation.Icon;
          return (
            <li
              key={step.id}
              className="flex items-start gap-2"
              data-testid={`collect-step-${step.id}`}
              data-state={step.state}
              title={step.basis}
            >
              <span className={cn('mt-0.5 flex-shrink-0', presentation.className)}>
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="text-ds-label text-zinc-200">
                  {index + 1}. {step.label}
                </span>
                <span className={cn('ml-2 font-mono text-ds-micro', presentation.className)}>
                  {presentation.label}
                </span>
                <span className="mt-0.5 block text-ds-micro leading-relaxed text-zinc-500">
                  {step.detail}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}


/* ── "Documents for this PO" ──────────────────────────────────────────────── */

export interface PoDocumentPackPanelProps {
  po: PurchaseOrder;
  brandName: string;
  brandNation?: string | null;
  products: Product[];
  /** The consignment's carrier reference — what a label/waybill resolves against. */
  carrier: PoCarrierReference | null;
  /** The instruction Mercenta actioned (carries the ASN it filed + its outcome). */
  instruction?: ChannelInstruction | null;
  /** The consignment's canonical status — used only by the collect chain. */
  shipmentStatus?: string | null;
  /**
   * Opens the EXISTING waybill / carrier-label dialogue. The pack declares the
   * renderer; the Hub owns the dialogues, so no second renderer exists.
   */
  onOpenCarrierArtefact: (kind: 'carrier_label' | 'freight_waybill') => void;
}

export function PoDocumentPackPanel({
  po,
  brandName,
  brandNation,
  products,
  carrier,
  instruction,
  shipmentStatus,
  onOpenCarrierArtefact,
}: PoDocumentPackPanelProps) {
  const [openDoc, setOpenDoc] = useState<PoDocument | null>(null);

  /**
   * The pack, built by its ONE owner. The ASN is the one Mercenta filed for this
   * PO (`asnForInstruction` is the same derivation the acceptance path used), so
   * the SSCC identifiers and the packing structure on the documents are the ones
   * the channel was told about.
   */
  const pack = useMemo(
    () =>
      buildPoDocumentPack({
        po,
        brandName,
        brandNation,
        products,
        asn: instruction ? asnForInstruction(instruction, po) : null,
        carrier,
        instruction,
      }),
    [po, brandName, brandNation, products, carrier, instruction]
  );

  const chain = useMemo(
    () => buildCollectChain({ po, instruction, shipmentStatus }),
    [po, instruction, shipmentStatus]
  );

  /**
   * §P1-fix — DOWNLOAD ONE DOCUMENT. Only a document this pack produces as HTML
   * (renderer `inline_html`) can be downloaded here; a carrier label / waybill has
   * no file of its own and is downloaded from the dialogue that renders it, so this
   * can never offer a file that does not exist.
   */
  const downloadDocument = (doc: PoDocument) => {
    if (!doc.html) return;
    downloadHtml(poDocumentFileName(doc, pack.poNumber), doc.html);
  };

  /** §P1-fix — DOWNLOAD THE WHOLE PACK as one file (the "ALL PO documents" deliverable). */
  const downloadPack = () => {
    downloadHtml(poDocumentPackFileName(pack), renderPoDocumentPackHtml(pack));
  };

  return (
    <div data-testid="po-documents-panel">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-ds-micro uppercase tracking-[0.12em] text-zinc-500">
          Documents for this PO
        </p>
        <div className="flex items-center gap-2">
          <span className="font-mono text-ds-micro text-zinc-400" data-testid="po-documents-summary">
            {pack.readyCount}/{pack.applicableCount} ready ·{' '}
            {pack.lane === 'international' ? 'International' : 'UK domestic'}
          </span>
          {/* §P1-fix (owner D3 = print AND download) — the WHOLE pack as one file. */}
          <Button
            size="sm"
            variant="secondary"
            data-testid="po-documents-download-pack"
            onClick={downloadPack}
            title={`Download all ${pack.readyCount} ready document(s) as one file`}
          >
            <Download className="h-3 w-3" aria-hidden="true" />
            Download pack
          </Button>
        </div>
      </div>
      <p className="mt-1 text-ds-micro leading-relaxed text-zinc-500">
        Generated automatically when Mercenta accepted {pack.poNumber}. Destination:{' '}
        <span className="text-zinc-300">{pack.destinationLabel}</span>.
      </p>

      <ul className="mt-2 space-y-2">
        {pack.documents.map((doc) => {
          const standing = standingOf(doc);
          const presentation = STANDING_PRESENTATION[standing];
          const Icon = presentation.Icon;
          const reason = doc.notApplicableReason ?? doc.notReadyReason;
          const openable = standing === 'ready';
          return (
            <li
              key={doc.kind}
              className="rounded-ds-md border border-hairline bg-tint p-2.5"
              data-testid={`po-document-${doc.kind}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-ds-label font-medium text-zinc-200">
                    <FileText className="h-3.5 w-3.5 flex-shrink-0 text-zinc-500" aria-hidden="true" />
                    {doc.title}
                  </p>
                  <p className="mt-0.5 text-ds-micro leading-relaxed text-zinc-500">
                    {doc.purpose}
                  </p>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-ds-sm border px-1.5 py-px text-ds-micro font-medium',
                      presentation.className
                    )}
                    data-testid={`po-document-status-${doc.kind}`}
                    data-standing={standing}
                  >
                    <Icon className="h-3 w-3" aria-hidden="true" />
                    {presentation.label}
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!openable}
                    title={reason ?? doc.title}
                    data-testid={`po-document-open-${doc.kind}`}
                    onClick={() => {
                      if (!openable) return;
                      if (doc.renderer === 'inline_html') setOpenDoc(doc);
                      else {
                        onOpenCarrierArtefact(
                          doc.kind === 'carrier_label' ? 'carrier_label' : 'freight_waybill'
                        );
                      }
                    }}
                  >
                    {doc.renderer === 'inline_html' ? 'Open' : 'Print'}
                  </Button>
                  {/*
                    §P1-fix (owner D3 = print AND download) — DOWNLOAD beside Open/Print.
                    Shown only for a document this pack produces as a file (an
                    `inline_html` document); a carrier label / waybill is downloaded
                    from the dialogue that renders it, so this never offers a file
                    that does not exist.
                  */}
                  {openable && doc.html && (
                    <Button
                      size="sm"
                      variant="ghost"
                      title={`Download ${doc.title}`}
                      data-testid={`po-document-download-${doc.kind}`}
                      onClick={() => downloadDocument(doc)}
                    >
                      <Download className="h-3 w-3" aria-hidden="true" />
                      <span className="sr-only">Download {doc.title}</span>
                    </Button>
                  )}
                </div>
              </div>

              {reason && (
                <p
                  className="mt-1.5 text-ds-micro leading-relaxed text-zinc-500"
                  data-testid={`po-document-reason-${doc.kind}`}
                >
                  {reason}
                </p>
              )}

              <dl className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
                {doc.fields.map((field) => (
                  <div key={field.label} className="flex items-baseline gap-1 text-ds-micro">
                    <dt className="text-zinc-600">{field.label}:</dt>
                    <dd className="font-mono text-zinc-400">{field.value}</dd>
                  </div>
                ))}
              </dl>
            </li>
          );
        })}
      </ul>

      <ul className="mt-2 space-y-0.5">
        {pack.notices.map((notice) => (
          <li key={notice} className="text-ds-micro leading-relaxed text-zinc-600">
            {notice}
          </li>
        ))}
      </ul>

      {chain.applies && <CollectChainPanel chain={chain} />}

      {/* §P12 — THE CHANNEL'S OWN LABEL SERVICE IS NA-ONLY. `GetShipmentLabels`
          ("Generate shipping labels from Amazon") is offered in NA only, so the
          pack states the rule here rather than letting a brand expect a
          channel-generated label for a UK/EU consignment. The labels this pack
          renders are MERCENTA'S OWN carrier templates (DHL / Palletline). */}
      <p
        className="border-t border-hairline pt-2.5 text-ds-micro leading-relaxed text-zinc-500"
        data-testid="channel-labels-rule"
      >
        {channelShipmentLabelsAvailability(UK_MARKETPLACE_ID).reason}
      </p>

      {openDoc && <DocumentDialog doc={openDoc} onClose={() => setOpenDoc(null)} />}
    </div>
  );
}

