/**
 * §Access-gate — Brand application store (demo mode).
 *
 * Stores applications in memory while Supabase is not configured.
 * When Supabase is live, reads/writes go through the applications table.
 */
import type { BrandApplication, ApplicationStatus, LinkVerificationStatus } from '@/types';

export const demoApplications: BrandApplication[] = [];

let appIdCounter = 0;

export function submitApplication(input: {
  companyName: string;
  country: string;
  category: string;
  skuCount: number | null;
  monthlyRevenue: string | null;
  websiteUrl: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  websiteStatus: LinkVerificationStatus | null;
  instagramStatus: LinkVerificationStatus | null;
  facebookStatus: LinkVerificationStatus | null;
  referralSource: string | null;
  description: string | null;
}): BrandApplication {
  appIdCounter += 1;
  const app: BrandApplication = {
    id: `app-${String(appIdCounter).padStart(4, '0')}`,
    ...input,
    status: 'pending',
    adminNotes: null,
    createdAt: new Date().toISOString(),
    reviewedAt: null,
    reviewedBy: null,
  };
  demoApplications.unshift(app);
  return app;
}

export function updateApplicationStatus(
  appId: string,
  status: ApplicationStatus,
  reviewedBy: string,
  adminNotes?: string | null
): BrandApplication | null {
  const idx = demoApplications.findIndex((a) => a.id === appId);
  if (idx === -1) return null;
  demoApplications[idx] = {
    ...demoApplications[idx],
    status,
    reviewedAt: new Date().toISOString(),
    reviewedBy,
    ...(adminNotes !== undefined ? { adminNotes } : {}),
  };
  return demoApplications[idx];
}

export function getApplicationById(appId: string): BrandApplication | undefined {
  return demoApplications.find((a) => a.id === appId);
}

export function getApplicationsByStatus(status?: ApplicationStatus): BrandApplication[] {
  if (status) return demoApplications.filter((a) => a.status === status);
  return [...demoApplications];
}

export interface ApprovedBrandEntry {
  id: string;
  name: string;
  category: string;
  country: string;
  email: string;
  signatory: string;
  track: 'direct_fulfillment' | 'financed';
}

/** Brands created via application approval or manual creation. */
export const approvedApplicationBrands: ApprovedBrandEntry[] = [];

export function addApprovedBrand(entry: ApprovedBrandEntry): void {
  // Remove existing entry with same id if re-approving
  const existing = approvedApplicationBrands.findIndex((b) => b.id === entry.id);
  if (existing !== -1) {
    approvedApplicationBrands.splice(existing, 1);
  }
  approvedApplicationBrands.push(entry);
}

export function getApprovedBrandById(brandId: string): ApprovedBrandEntry | undefined {
  return approvedApplicationBrands.find((b) => b.id === brandId);
}