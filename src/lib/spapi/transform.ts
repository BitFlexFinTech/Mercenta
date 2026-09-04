/**
 * §10 step 2 — transform an internal product record into the retail catalog
 * submission payload under Mercenta's credentials.
 *
 * NOTE: field naming follows the Selling Partner vendor catalog model
 * (GTIN identifier, category, pricing, compliance attributes). Exact wire
 * format must be verified against the live API docs when the connection goes
 * live; the shape here is deliberately centralised so only THIS file changes.
 */
import { APPROVED_CATEGORIES } from '@/types';
import type { Product } from '@/types';

export interface CatalogSubmissionPayload {
  marketplaceId: string;
  product: {
    sku: string;
    gtin: string;
    productName: string;
    category: string;
    pricing: {
      currency: 'GBP';
      exWorksPrice: number;
      ukRetailPrice: number;
    };
    compliance: {
      commodityCode: string;
      vatStatus: string;
      hazmat: boolean;
    };
    dimensions: {
      lengthCm: number;
      widthCm: number;
      heightCm: number;
      weightKg: number;
    };
  };
}

/** UK marketplace id for the vendor account. */
export const UK_MARKETPLACE_ID = 'A1F83G8C2ARO7P';

export function transformProductForCatalog(
  product: Product,
  opts: { category?: string; brandName?: string } = {}
): CatalogSubmissionPayload | null {
  // §13 hard guard — never submit outside the approved categories.
  if (
    opts.category !== undefined &&
    !APPROVED_CATEGORIES.includes(opts.category as (typeof APPROVED_CATEGORIES)[number])
  ) {
    return null;
  }

  return {
    marketplaceId: UK_MARKETPLACE_ID,
    product: {
      sku: product.sku,
      gtin: product.barcode,
      productName: product.name,
      category: opts.category ?? 'Home',
      pricing: {
        currency: 'GBP',
        exWorksPrice: product.exWorksPrice,
        ukRetailPrice: product.ukRetailPrice,
      },
      compliance: {
        commodityCode: product.commodityCode,
        vatStatus: product.vatStatus,
        hazmat: product.hazmat,
      },
      dimensions: {
        lengthCm: product.length,
        widthCm: product.width,
        heightCm: product.height,
        weightKg: product.weight,
      },
    },
  };
}

/* ── Submission lifecycle ──────────────────────────────────────────── */

export type SubmissionStatus =
  | 'pending'
  | 'submitted'
  | 'under_amazon_review'
  | 'live'
  | 'rejected';

export const SUBMISSION_STATUS_LABELS: Record<SubmissionStatus, string> = {
  pending: 'Submitted',
  submitted: 'Submitted',
  under_amazon_review: 'Under Retail Review',
  live: 'Live',
  rejected: 'Rejected',
};

/** §8 — rejected submissions NEVER auto-resubmit; they surface for human review. */
export const REJECTION_REQUIRES_HUMAN = true;

/* ── §10 step 4 — purchase orders → commissions ───────────────────── */

import { COMMISSION_AUTO_APPROVE_THRESHOLD_PLACEHOLDER_GBP } from '@/config/commercial';

export interface PurchaseOrderInput {
  purchaseOrderId: string;
  poValue: number; // net GBP
}

export interface CommissionDraft {
  purchaseOrderId: string;
  poValue: number;
  commissionRate: number;
  commissionAmount: number;
  /** true → auto-generate + send invoice; false → hold for admin approval (§8). */
  autoApprove: boolean;
}

export function draftCommissionFromPO(
  po: PurchaseOrderInput,
  commissionRate: number
): CommissionDraft {
  const commissionAmount =
    Math.round(((po.poValue * commissionRate) / 100) * 100) / 100;
  return {
    purchaseOrderId: po.purchaseOrderId,
    poValue: po.poValue,
    commissionRate,
    commissionAmount,
    autoApprove:
      po.poValue < COMMISSION_AUTO_APPROVE_THRESHOLD_PLACEHOLDER_GBP,
  };
}
