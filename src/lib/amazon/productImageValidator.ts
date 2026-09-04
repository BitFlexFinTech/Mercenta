/**
 * §Batch-21 — Amazon-standard product image validation.
 *
 * Uses the canonical AMAZON_IMAGE_SPECS to validate images and returns
 * per-requirement check results. Works with both real images (URL-based)
 * and mock/placeholder images.
 */
import type { ProductImage } from '@/types';
import { AMAZON_IMAGE_SPECS } from '@/lib/amazon/productImageSpecs';

export interface ValidationCheck {
  id: string;
  label: string;
  severity: 'error' | 'warning' | 'info';
  passed: boolean;
}

/**
 * Validate a single image slot against Amazon's requirements.
 * For mock/placeholder images, returns simulated check results.
 * For real images, would check actual pixel dimensions, white background, etc.
 */
export function validateProductImage(slot: string, url: string, isMock: boolean = true): ValidationCheck[] {
  if (isMock) {
    return validateMockImage(slot, url);
  }
  return validateRealImage(slot, url);
}

function validateMockImage(slot: string, _url: string): ValidationCheck[] {
  if (slot === 'main') {
    return AMAZON_IMAGE_SPECS.main.requirements.map((r) => ({
      id: r.id,
      label: r.label,
      severity: r.severity as 'error' | 'warning' | 'info',
      passed: r.id !== 'bg_white' && r.id !== 'size_1000', // mock main images pass everything except those requiring real checks
    }));
  }
  if (slot.startsWith('alt')) {
    return AMAZON_IMAGE_SPECS.alternate.requirements.map((r) => ({
      id: r.id,
      label: r.label,
      severity: r.severity as 'error' | 'warning' | 'info',
      passed: true, // mock alt images always pass
    }));
  }
  if (slot === 'lifestyle') {
    return AMAZON_IMAGE_SPECS.lifestyle.requirements.map((r) => ({
      id: r.id,
      label: r.label,
      severity: r.severity as 'error' | 'warning' | 'info',
      passed: true,
    }));
  }
  if (slot === 'packaging') {
    return AMAZON_IMAGE_SPECS.packaging.requirements.map((r) => ({
      id: r.id,
      label: r.label,
      severity: r.severity as 'error' | 'warning' | 'info',
      passed: true,
    }));
  }
  return [];
}

function validateRealImage(slot: string, _url: string): ValidationCheck[] {
  // Placeholder for real image validation (would use canvas/image analysis)
  // For now, mark all as unverified (passed: false, severity: info)
  const specs = getSpecsForSlot(slot);
  if (!specs) return [];
  return specs.requirements.map((r: any) => ({
    id: r.id,
    label: r.label,
    severity: r.severity as 'error' | 'warning' | 'info',
    passed: false, // unverified — real check would go here
  }));
}

function getSpecsForSlot(slot: string): any {
  if (slot === 'main') return AMAZON_IMAGE_SPECS.main;
  if (slot.startsWith('alt')) return AMAZON_IMAGE_SPECS.alternate;
  if (slot === 'lifestyle') return AMAZON_IMAGE_SPECS.lifestyle;
  if (slot === 'packaging') return AMAZON_IMAGE_SPECS.packaging;
  return null;
}

/**
 * Create a ProductImage entry from a URL with validation.
 */
export function createProductImage(slot: string, url: string, isMock: boolean = true): ProductImage {
  const checks = validateProductImage(slot, url, isMock);
  const compliant = checks.every((c) => c.severity !== 'error' || c.passed);
  return {
    slot,
    url,
    compliant,
    checks,
    verifiedAt: new Date().toISOString(),
  };
}

/**
 * Generate default product images for demo products.
 * Uses the existing category emoji as the main image and adds mock alt images.
 */
export function generateDefaultProductImages(category: string): ProductImage[] {
  const seed = category.toLowerCase().replace(/[^a-z]/g, '');
  return [
    createProductImage('main', `https://picsum.photos/seed/${seed}-main/400/400`, true),
    createProductImage('alt1', `https://picsum.photos/seed/${seed}-alt1/400/400`, true),
    createProductImage('alt2', `https://picsum.photos/seed/${seed}-alt2/400/400`, true),
    createProductImage('alt3', `https://picsum.photos/seed/${seed}-alt3/400/400`, true),
    { slot: 'lifestyle', url: `https://picsum.photos/seed/${seed}-lifestyle/800/600`, compliant: true, checks: [], verifiedAt: new Date().toISOString() },
    { slot: 'packaging', url: `https://picsum.photos/seed/${seed}-packaging/400/400`, compliant: true, checks: [], verifiedAt: new Date().toISOString() },
  ];
}
