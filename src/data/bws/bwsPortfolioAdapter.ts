/**
 * §BWS PORTFOLIO OPS — THE FIELD MAPPING, IN CODE (approved 2026-11-28).
 *
 * SOURCE: `src/data/bws/**` (Dash-1 @ `c40c541`). Nothing here invents a value: every
 * field either maps to a real record, or is `null` and rendered as “—” with the reason.
 *
 * THE OWNER'S FOUR DECISIONS, AS IMPLEMENTED
 *  D1 all 88 source brands are listed (not just the 4 portfolio records); a brand with no
 *     portfolio record says so, instead of being hidden or given a fabricated status.
 *  D2 the wholesale price is labelled **Illustrative Wholesale** — never presented as an
 *     ex-Works cost, which the source does not contain.
 *  D3 the growth score IS `AMAZON_UK_LISTINGS.rangeCoveragePct` (a real source figure).
 *  D4 commodity code, VAT status and hazmat stay VISIBLE as “—” with a tooltip naming the
 *     source, because hiding them would hide the gap.
 */
import type { BwsDemoModule } from '@/data/verticalData';
import type { SemanticTone } from '@/next/components/ConsolePrimitives';
import type {
  BwsBrandPortfolioRow,
  BwsExciseCustomsRow,
  BwsGrowthSkuRow,
  BwsPartnerAccountRow,
  BwsReportLineRow,
  BwsShipmentCustomsRow,
} from '@/next/screens/bws/BwsPortfolioOpsView';

/** Status → tone, declared once. An unknown status is `neutral`, never guessed as success. */
function workStatusTone(status: string): SemanticTone {
  const s = status.toLowerCase();
  if (s.includes('queue') || s.includes('prep') || s.includes('in progress')) return 'info';
  if (s.includes('held') || s.includes('block') || s.includes('await')) return 'warning';
  if (s.includes('complete') || s.includes('dispatch') || s.includes('cleared')) return 'success';
  return 'neutral';
}

/** The carrier is named inside the source's own tracking line ("… · Palletline"). */
function carrierOf(tracking: string): string {
  const parts = tracking.split('·').map((p) => p.trim());
  return parts.length > 1 ? parts[parts.length - 1] : tracking.trim();
}

export interface BwsPortfolioDerived {
  brandRows: BwsBrandPortfolioRow[];
  partnerPos: {
    id: string;
    poNumber: string;
    statusLabel: string;
    statusTone: SemanticTone;
    poValueGbp: number;
    orderDate: string;
  }[];
  partnerShipments: BwsShipmentCustomsRow[];
  exciseRows: BwsExciseCustomsRow[];
  customsShipments: BwsShipmentCustomsRow[];
  growthSkus: BwsGrowthSkuRow[];
  poTrendSeries: { label: string; value: number }[];
  carrierSeries: { label: string; value: number }[];
  reportRows: BwsReportLineRow[];
  partnerAccounts: BwsPartnerAccountRow[];
  /** The vendor POs indexed by brand, so the Partner Portal shows only the selected brand's. */
  partnerPosByBrand: Record<string, BwsPortfolioDerived['partnerPos']>;
  totals: { brands: number; skus: number; pos: number; poValueGbp: number; completeDocs: number };
}

export function buildBwsPortfolio(bundle: BwsDemoModule): BwsPortfolioDerived {
  const brands = bundle.BRANDS;
  const products = bundle.PRODUCTS;
  const vendorPos = bundle.INITIAL_VENDOR_CENTRAL_POS;
  const wholesale = bundle.WHOLESALE_ORDERS;
  const compliance = bundle.COMPLIANCE_RECORDS;
  const portfolio = bundle.PORTFOLIO_BRANDS;
  const listings = bundle.AMAZON_UK_LISTINGS;
  const portfolioByBrand = new Map(portfolio.map((p) => [p.brandId, p]));

  /* D1 — all source brands. */
  const brandRows: BwsBrandPortfolioRow[] = brands.map((b) => {
    const pf = portfolioByBrand.get(b.id);
    const bPos = vendorPos.filter((p) => p.brandId === b.id);
    const bDocs = compliance.filter((c) => c.brandName === b.name);
    return {
      id: b.id,
      businessName: b.name,
      category: b.primaryCategory,
      nation: b.countryName,
      trackLabel: pf?.portfolioStatus ?? 'Source brand — no portfolio record',
      contractStatus: pf?.portfolioStatus ?? 'No portfolio record',
      skuCount: products.filter((p) => p.brandId === b.id).length,
      poCount: bPos.length,
      poValueGbp: bPos.reduce((s, p) => s + p.totalCostGbp, 0),
      approvedDocsCount: bDocs.filter((c) => c.documentationStatus === 'Complete').length,
      totalDocsCount: bDocs.length,
    };
});
/* D4 — the three absent fields are null; the View renders “—” with the reason. */
  const exciseRows: BwsExciseCustomsRow[] = products.map((p) => ({
    productId: p.id,
    brandName: p.brandName,
    sku: p.id,
    productName: p.name,
    commodityCode: null,
    vatStatus: null,
    hazmat: null,
    illustrativeWholesaleGbp: p.illustrativeWholesaleGbp,
  }));

  const partnerShipments: BwsShipmentCustomsRow[] = wholesale.map((w) => ({
    id: w.id,
    reference: w.orderNumber,
    carrier: carrierOf(w.deliveryTracking),
    origin: w.warehouse,
    destination: w.counterparty,
    statusLabel: w.fulfilmentStatus,
    statusTone: workStatusTone(w.fulfilmentStatus),
  }));

  /* The duty/bond data the owner asked to be WIRED IN, not disclaimed. */
  const customsShipments: BwsShipmentCustomsRow[] = bundle.IMPORT_EXCISE_RECORDS.map((r) => ({
    id: r.id,
    reference: r.shipmentRef,
    carrier: r.bondFacility,
    origin: r.countryOfOrigin,
    destination: r.supplier,
    statusLabel: `${r.customsStatus} · ${r.exciseDutyStatus}`,
    statusTone: workStatusTone(r.importReadiness),
  }));

  /* D3 — the score IS the source's listing range-coverage figure. */
  const growthSkus: BwsGrowthSkuRow[] = products.map((p) => {
    const listing = listings.find((l) => l.brandId === p.brandId);
    return {
      sku: p.id,
      productName: p.name,
      brandName: p.brandName,
      score: listing?.rangeCoveragePct ?? null,
      issuesCount: null,
      recommendationCount: null,
    };
  });

  const carrierCounts = new Map<string, number>();
  for (const s of partnerShipments) carrierCounts.set(s.carrier, (carrierCounts.get(s.carrier) ?? 0) + 1);

  return {
    brandRows,
    partnerPos: vendorPos.map((p) => ({
      id: p.id,
      poNumber: p.poNumber,
      statusLabel: p.status,
      statusTone: workStatusTone(p.status),
      poValueGbp: p.totalCostGbp,
      orderDate: p.poReceivedDate,
    })),
    partnerShipments,
    exciseRows,
    customsShipments,
    growthSkus,
    poTrendSeries: bundle.GROWTH_SERIES.map((g) => ({ label: g.month, value: Math.round(g.amazonUkGbp) })),
    carrierSeries: Array.from(carrierCounts.entries()).map(([label, value]) => ({ label, value })),
    reportRows: vendorPos.map((p) => ({
      poNumber: p.poNumber,
      brandName: p.brandName,
      statusLabel: p.status,
      poValueGbp: p.totalCostGbp,
      /* BWS is not a commission model — the source has no commission figure. */
      commissionGbp: null,
      orderDate: p.poReceivedDate,
    })),
    partnerAccounts: bundle.PARTNER_ACCOUNTS.map((a) => ({
      brandName: a.brandName,
      eori: a.mercentaEori,
      awrsUrn: a.mercentaAwrsUrn,
      defaultPathway: a.defaultPathway,
      wetBondPartner: a.wetBondPartnerName,
      dhlAccount: a.dhlAccountNumber,
      accountManager: a.mercentaAccountManager,
    })),
    partnerPosByBrand: vendorPos.reduce<Record<string, BwsPortfolioDerived['partnerPos']>>((acc, p) => {
      const row = {
        id: p.id,
        poNumber: p.poNumber,
        statusLabel: p.status,
        statusTone: workStatusTone(p.status),
        poValueGbp: p.totalCostGbp,
        orderDate: p.poReceivedDate,
      };
      (acc[p.brandId] ??= []).push(row);
      return acc;
    }, {}),
    totals: {
      brands: brands.length,
      skus: products.length,
      pos: vendorPos.length,
      poValueGbp: vendorPos.reduce((s, p) => s + p.totalCostGbp, 0),
      completeDocs: compliance.filter((c) => c.documentationStatus === 'Complete').length,
    },
  };
}
