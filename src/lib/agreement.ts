/**
 * §Stage-2 fix — Distribution Agreement built from SWAPPABLE CLAUSE BLOCKS,
 * not one static document. The Payment Terms clause has two variants driven
 * by the brand's confirmed fulfillmentTrack at generation time:
 *
  *   - direct_fulfillment: brand ships confirmed POs directly to the
 *     Distributor's designated UK fulfilment centre; Mercenta remits the
 *     brand's share of net PO proceeds, less the Retail Performance Fee,
 *     within N business days of receiving payment from the retail channel.
 *
 *   - financed: original clause — Mercenta purchases inventory at agreed
 *     Ex-Works pricing and remits payouts to the brand's nominated account.
 *
 * If the track changes later, the Contract Cycle issues an
 * amendment/addendum (see createTrackAmendment in lib/contracts.ts) rather
 * than silently editing a signed agreement.
 */
import { BRAND_LEGAL_NAME } from '@/config/brand';

export interface AgreementData {
  businessName: string;
  legalEntity?: string;
  /** % of net PO value */
  commissionRate: number;
  /** flat GBP */
  monthlyFee: number;
  /** one of APPROVED_CATEGORIES */
  category: string;
  /** Drives which PAYMENT TERMS clause block is merged in. */
  fulfillmentTrack: 'direct_fulfillment' | 'financed';
  date?: string;
}

const PARTIES_CLAUSE = (d: AgreementData, le: string) => `This Master Wholesale & Distribution Agreement ("Agreement") is entered into
between ${le} ("Distributor"), acting as the Exclusive UK Importer of Record,
and ${d.businessName} ("Brand").

Effective date: ${d.date ?? new Date().toISOString().slice(0, 10)}
Product category: ${d.category}`;

const APPOINTMENT_CLAUSE = `1. APPOINTMENT. Distributor is hereby appointed as the exclusive UK importer
   and wholesale distributor of the Brand's products, routing inventory via
   direct UK retail placement through established national retail networks.`;

/** DIRECT FULFILLMENT variant of the Payment Terms clause block.
 *  Outward-facing wording: the fulfilment destination is described
 *  generically — never by retail-channel name. */
const PAYMENT_TERMS_DIRECT = (d: AgreementData) => `2. PAYMENT TERMS (DIRECT FULFILLMENT). The Brand ships confirmed purchase
   orders directly to Distributor's designated UK fulfilment centre. ${`Distributor retains a Retail Performance Fee of ${d.commissionRate}%`} of net
   PO proceeds and remits the Brand's share within 10 business days of
   Distributor receiving payment from the retail channel. A platform fee of GBP
   ${d.monthlyFee} per month applies.
   [Placeholder rates pending commercial sign-off]`;

/** FINANCED variant of the Payment Terms clause block. */
const PAYMENT_TERMS_FINANCED = (d: AgreementData) => `2. PAYMENT TERMS (FINANCED). Distributor purchases inventory at agreed
   Ex-Works pricing and remits payouts directly to the Brand's nominated
   account, retaining a commission of ${`${
    d.commissionRate
  }%`} of net PO value. A platform fee of GBP ${d.monthlyFee} per month applies.
   [Placeholder rates pending commercial sign-off]`;

const IOR_CLAUSE = `3. IMPORTER OF RECORD. Distributor shall hold valid UK EORI numbers, manage
   HMRC customs declarations, and ensure full UKCA compliance for all imported
   goods.`;

const EXCLUSIVITY_CLAUSE = `4. EXCLUSIVITY. The Brand grants Distributor exclusive rights to import,
   clear, and distribute its products through direct UK retail channels within
   the United Kingdom territory.`;

const COMPLIANCE_GATE_CLAUSE = `5. COMPLIANCE GATE. Catalog synchronisation and retail submission remain
   disabled until all required compliance documents for the category above are
   approved by Distributor's compliance team.`;

const SIGNATURES_CLAUSE = (d: AgreementData, le: string) => `SIGNED for and on behalf of:
  Distributor: ${le}
  Brand: ${d.businessName} — Signatory: ________________`;

/** Ordered clause-block assembly for a given fulfillment track. */
export function buildClauseBlocks(d: AgreementData): string[] {
  const le = d.legalEntity ?? BRAND_LEGAL_NAME;
  const payment =
    d.fulfillmentTrack === 'direct_fulfillment'
      ? PAYMENT_TERMS_DIRECT(d)
      : PAYMENT_TERMS_FINANCED(d);
  return [
    `UK MASTER WHOLESALE & DISTRIBUTION AGREEMENT`,
    PARTIES_CLAUSE(d, le),
    APPOINTMENT_CLAUSE,
    payment,
    IOR_CLAUSE,
    EXCLUSIVITY_CLAUSE,
    COMPLIANCE_GATE_CLAUSE,
    SIGNATURES_CLAUSE(d, le),
  ];
}

export function buildDistributionAgreement(
  data: AgreementData,
  legalEntity: string = BRAND_LEGAL_NAME
): string {
  return buildClauseBlocks({ ...data, legalEntity }).join('\n\n');
}
