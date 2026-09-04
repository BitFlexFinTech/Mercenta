/**
 * §Batch -4 — Zod-based form validation schemas.
 *
 * Single source of truth for all form input validation across the platform.
 * Every form that writes to the database should validate through these schemas
 * before submission, not through ad hoc checks.
 */
import { z } from 'zod';
import { APPROVED_CATEGORIES } from '@/types';

// ── Brand onboarding ────────────────────────────────────────────────

export const onboardingProfileSchema = z.object({
  businessName: z.string().min(2, 'Business name must be at least 2 characters').max(200),
  category: z.string().refine(
    (val) => (APPROVED_CATEGORIES as readonly string[]).includes(val),
    { message: 'Please select an approved category' }
  ),
  signatory: z.string().min(2, 'Signatory name is required').max(100),
  email: z.string().email('A valid email address is required'),
});

export const onboardingBankingSchema = z.object({
  accountHolder: z.string().min(2).max(100),
  accountNumber: z.string().regex(/^\d{8}$/, 'UK account numbers are 8 digits'),
  sortCode: z.string().regex(/^\d{2}-\d{2}-\d{2}$/, 'Use format XX-XX-XX'),
});

// ── Purchase Orders ────────────────────────────────────────────────

export const poLineAckSchema = z.object({
  sku: z.string().min(1),
  ackStatus: z.enum(['accepted', 'rejected', 'backordered']),
  acknowledgedQty: z.number().int().positive('Quantity must be at least 1'),
  unitPrice: z.number().positive('Unit price must be positive').optional(),
  scheduledShipDate: z.string().optional(),
  rejectionCode: z.string().optional(),
});

export const poAckSubmissionSchema = z.object({
  poId: z.string().min(1),
  lines: z.array(poLineAckSchema).min(1, 'At least one line item must be acknowledged'),
}).refine(
  (data) => data.lines.every((l) => {
    if (l.ackStatus === 'backordered' && !l.scheduledShipDate) return false;
    if (l.ackStatus === 'rejected' && !l.rejectionCode) return false;
    return true;
  }),
  { message: 'Backordered items require a ship date; rejected items require a rejection code' }
);

// ── ASN / Shipment ─────────────────────────────────────────────────

export const asnSchema = z.object({
  poId: z.string().min(1),
  cartons: z.record(z.string(), z.number().int().min(0)).refine(
    (c) => Object.values(c).some((q) => q > 0),
    'At least one carton must have quantity > 0'
  ),
  shipDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format'),
  carrier: z.string().min(1, 'Carrier is required'),
  proNumber: z.string().optional(),
  bolNumber: z.string().optional(),
  trailerNumber: z.string().optional(),
  lotNumber: z.string().optional(),
  expiryDate: z.string().optional(),
});

// ── Products / Catalog ─────────────────────────────────────────────

export const productSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(200),
  sku: z.string().min(1, 'SKU is required').max(50),
  barcode: z.string().optional(),
  exWorksPrice: z.number().positive('Ex-works price must be positive'),
  ukRetailPrice: z.number().positive('UK retail price must be positive'),
  commodityCode: z.string().regex(/^\d{10}$/, 'Commodity code must be 10 digits').optional(),
  vatStatus: z.enum(['Standard 20%', 'Zero-rated', 'Reduced 5%', 'Exempt']).optional(),
  hazmat: z.boolean().optional(),
  unitsPerCase: z.number().int().positive().optional(),
  caseOrderable: z.boolean().optional(),
});

// ── Settings / Bank Information ────────────────────────────────────

export const bankInfoSchema = z.object({
  accountHolder: z.string().min(2).max(100),
  bankName: z.string().min(2).max(100),
  accountNumber: z.string().regex(/^\d{8}$/, 'Must be exactly 8 digits'),
  sortCode: z.string().regex(/^\d{2}-\d{2}-\d{2}$/, 'Use format XX-XX-XX'),
  iban: z.string().optional(),
  swift: z.string().optional(),
});

// ── Return Addresses ────────────────────────────────────────────────

export const returnAddressSchema = z.object({
  label: z.string().min(1).max(100),
  line1: z.string().min(1, 'Address line 1 is required').max(200),
  line2: z.string().optional(),
  city: z.string().min(1, 'City is required').max(100),
  postcode: z.string().regex(/^[A-Z]{1,2}\d{1,2}\s?\d[A-Z]{2}$/i, 'Enter a valid UK postcode'),
  country: z.literal('United Kingdom'),
  isDefault: z.boolean().optional(),
});

// ── Helpers ────────────────────────────────────────────────────────

/** Type-safe wrapper: returns { ok: true, data } or { ok: false, error }. */
export function validate<T>(schema: z.ZodSchema<T>, input: unknown): { ok: true; data: T } | { ok: false; error: string } {
  const result = schema.safeParse(input);
  if (result.success) return { ok: true, data: result.data };
  return { ok: false, error: result.error.issues.map((i) => i.message).join('; ') };
}

/** Check a single field against its schema — for inline validation feedback. */
export function validateField<T>(schema: z.ZodSchema<T>, field: keyof T, value: unknown): string | null {
  // Use partial to validate a single field: pick the field, make the schema partial for just that key
  const fieldSchema = z.object({ [field]: (schema as unknown as z.ZodObject<any>).shape[field] });
  const result = fieldSchema.safeParse({ [field]: value });
  if (result.success) return null;
  return result.error.issues[0]?.message ?? 'Invalid';
}