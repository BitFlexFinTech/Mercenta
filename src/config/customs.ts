/**
 * §Stage-3 — Mercenta's OWN customs identity.
 *
 * Mercenta Partners is the Importer of Record. These numbers are what HMRC
 * customs actually uses on commercial invoices, packing lists and
 * declarations — they are AUTO-POPULATED into every generated document.
 * Brands NEVER register for a UK EORI or UK VAT number; that is a core part
 * of the service.
 *
 * ⚠️ PLACEHOLDER VALUES pending issuance/confirmation by finance.
 */
export const MERCENTA_EORI = 'GB-EORI-PENDING-REGISTRATION';
export const MERCENTA_VAT = 'GB-VAT-PENDING-REGISTRATION';

/** Registered UK address used on declarations. Placeholder. */
export const MERCENTA_REGISTERED_ADDRESS =
  'Mercenta Partners Ltd, Distribution Hub, Northampton, UK';

/** Default Incoterms rule applied to shipments (placeholder — confirm with ops). */
export const DEFAULT_INCOTERMS = 'DAP';

/**
 * §Stage-3 — EU Market feature flag.
 * UK-only for now. When product/market strategy changes, flip this flag and
 * the disabled module (Super Admin → Settings) becomes buildable without a
 * rebuild from scratch.
 */
export const EU_MARKET_ENABLED = false;
