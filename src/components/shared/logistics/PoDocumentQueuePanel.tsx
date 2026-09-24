/**
 * §P10 (programme §4 P10) — THE PO DOCUMENT DOWNLOAD QUEUE.
 *
 * WHAT THIS COMPLETES
 * -------------------
 * P6 built the document pack and mounted it in the consignment inspector, so a brand
 * could read the documents for ONE PO once it had found that PO's consignment. But the
 * nav badge and the notification centre were already counting the *queue*
 * (`documentsAwaitingDownload`), and the Hub had no destination for it: the count led to
 * a page where the brand had to hunt for the consignment. That is a dead-end count.
 *
 * This panel is that destination. It renders EVERY purchase order inside the window,
 * derived from the SAME ONE rule the badge and the notification use — so the header
 * count and the badge cannot disagree — and it opens the SAME pack component
 * (`PoDocumentPackPanel`) and the SAME waybill/label dialogues. No second document list,
 * no second renderer, no re-derived readiness.
 *
 * SCOPE (`scope`)
 * ---------------
 *   · `brand` — the tenant's own queue. The caller passes tenant-scoped POs; this panel
 *     adds no cross-tenant read of its own.
 *   · `admin` — the Mercenta operations view of the same derived queue, cross-tenant BY
 *     DESIGN (the ops team chases the brands). It names the brand and states that the
 *     pack itself belongs to the brand's own Hub.
 */
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui';
import { ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { poStatusPresentation } from '@/lib/statusPresentation';
import type { ChannelInstruction, Product, PurchaseOrder } from '@/types';
import { asnForInstruction } from '@/lib/commerce/proxyProcessor';
import {
  buildPoDocumentPack,
  documentsAwaitingDownload,
} from '@/lib/documents/poDocumentPack';
import { PoDocumentPackPanel } from './PoDocumentPackPanel';

/** The consignment facts the pack's carrier artefacts read (never a second lookup). */
export interface PoDocumentQueueShipment {
  id: string;
  status: string;
  carrier: string;
  trackingNumber?: string | null;
  waybill?: string | null;
}

export interface PoDocumentQueuePanelProps {
  /** Purchase orders already scoped by the caller (brand: this tenant's own rows). */
  pos: PurchaseOrder[];
  brandNameFor: (brandId: string) => string;
  brandNationFor?: (brandId: string) => string | null;
  products: Product[];
  instructionForPo?: (poId: string) => ChannelInstruction | undefined;
  shipmentForPo?: (poNumber: string) => PoDocumentQueueShipment | null;
  onOpenCarrierArtefact: (
    kind: 'carrier_label' | 'freight_waybill',
    shipmentId: string | null
  ) => void;
  /** `brand` = this tenant's queue; `admin` = the cross-tenant operations view. */
  scope: 'brand' | 'admin';
}

export function PoDocumentQueuePanel({
  pos,
  brandNameFor,
  brandNationFor,
  products,
  instructionForPo,
  shipmentForPo,
  onOpenCarrierArtefact,
  scope,
}: PoDocumentQueuePanelProps) {
  const [openPoId, setOpenPoId] = useState<string | null>(null);

  /** The ONE rule, executed — never a second definition of the window. */
  const queue = useMemo(() => pos.filter(documentsAwaitingDownload), [pos]);

  /** Readiness per row, from the pack's ONE owner. */
  const summaries = useMemo(
    () =>
      queue.map((po) => {
        const instruction = instructionForPo?.(po.id);
        const shipment = shipmentForPo?.(po.poNumber) ?? null;
        const carrier = shipment
          ? {
              carrier: shipment.carrier,
              trackingNumber: shipment.trackingNumber ?? null,
              waybill: shipment.waybill ?? null,
            }
          : null;
        const pack = buildPoDocumentPack({
          po,
          brandName: brandNameFor(po.brandId),
          brandNation: brandNationFor?.(po.brandId) ?? null,
          products,
          asn: instruction ? asnForInstruction(instruction, po) : null,
          carrier,
          instruction: instruction ?? null,
        });
        return { po, instruction, shipment, pack };
      }),
    [queue, brandNameFor, brandNationFor, products, instructionForPo, shipmentForPo]
  );

  return (
    <div data-testid={`po-documents-queue-${scope}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-ds-micro uppercase tracking-[0.12em] text-zinc-500">
          Shipping documents awaiting download
        </p>
        <span className="font-mono text-ds-micro text-zinc-400" data-testid="po-documents-queue-count">
          {summaries.length} of {pos.length} purchase orders
        </span>
      </div>
      <p className="mt-1 text-ds-micro leading-relaxed text-zinc-500">
        {scope === 'brand'
          ? 'Every pack is produced automatically when Mercenta accepts a purchase order, and stays in this queue until its consignment is dispatched.'
          : "The same derived queue the brand sees: Mercenta has already filed the ASN and produced the pack, so this is the brand's remaining job — download and print before dispatch."}
      </p>

      {summaries.length === 0 ? (
        <p className="mt-2 text-ds-body text-zinc-500" data-testid="po-documents-queue-empty">
          Nothing is awaiting download. A pack appears here the moment a purchase order is accepted, and
          leaves the queue when its consignment is dispatched.
        </p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {summaries.map(({ po, instruction, shipment, pack }) => {
            const open = openPoId === po.id;
            const status = poStatusPresentation(po.status);
            const generatedAt = instruction?.outcome?.documentsGeneratedAt;
            return (
              <li
                key={po.id}
                className="rounded-ds-md border border-white/[0.06] bg-white/[0.02]"
                data-testid={`po-documents-queue-row-${po.poNumber}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 p-2.5">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-ds-label font-medium text-zinc-200">
                      <FileText className="h-3.5 w-3.5 flex-shrink-0 text-zinc-500" aria-hidden="true" />
                      <span className="font-mono">{po.poNumber}</span>
                      <span className="font-normal text-zinc-400">{status.label}</span>
                      {scope === 'admin' && (
                        <span className="text-ds-micro text-zinc-500">
                          · {brandNameFor(po.brandId)}
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-ds-micro leading-relaxed text-zinc-500">
                      Destination <span className="text-zinc-300">{pack.destinationLabel}</span> ·{' '}
                      {pack.lane === 'international' ? 'International' : 'UK domestic'} lane ·{' '}
                      <span data-testid={`po-documents-queue-ready-${po.poNumber}`}>
                        {pack.readyCount}/{pack.applicableCount} documents ready
                      </span>
                      {generatedAt && <span className="text-zinc-600"> · generated {generatedAt}</span>}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    data-testid={`po-documents-queue-open-${po.poNumber}`}
                    aria-expanded={open}
                    onClick={() => setOpenPoId(open ? null : po.id)}
                  >
                    {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    {open ? 'Close' : 'Open documents'}
                  </Button>
                </div>

                {open && (
                  <div
                    className="border-t border-white/[0.06] p-2.5"
                    data-testid={`po-documents-queue-panel-${po.poNumber}`}
                  >
                    {/*
                      The pack, rendered by its ONE component. The carrier artefacts open
                      through the EXISTING waybill/label dialogues the caller owns, so no
                      second renderer exists.
                    */}
                    <PoDocumentPackPanel
                      po={po}
                      brandName={brandNameFor(po.brandId)}
                      brandNation={brandNationFor?.(po.brandId) ?? null}
                      products={products}
                      carrier={
                        shipment
                          ? {
                              carrier: shipment.carrier,
                              trackingNumber: shipment.trackingNumber ?? null,
                              waybill: shipment.waybill ?? null,
                            }
                          : null
                      }
                      instruction={instruction ?? null}
                      shipmentStatus={shipment?.status ?? null}
                      onOpenCarrierArtefact={(kind) => onOpenCarrierArtefact(kind, shipment?.id ?? null)}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
