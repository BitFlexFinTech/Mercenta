/**
 * Single source of truth for brand identity.
 * NEVER hardcode the brand name as a string literal anywhere else in the
 * codebase — always import from here. Renaming should be a one-line edit to
 * this file plus swapping the logo asset in src/assets/.
 */
export const BRAND_NAME = 'Mercenta Partners';
export const BRAND_LEGAL_NAME = 'Mercenta Partners Ltd';
export const BRAND_DOMAIN = 'mercenta.co.uk';

/**
 * Known exception: index.html keeps a static bootstrap <title> for pre-JS
 * rendering; main.tsx immediately overrides it with BRAND_NAME at runtime.
 * If the brand is renamed, update that one static string too.
 */
