/**
 * §Batch-7 — Manufacturer Sourcing Engine.
 * Uses Alibaba's public verified-supplier signals to find and rank
 * manufacturers. Never scrapes authenticated pages or logs into Alibaba.
 * Output: ranked, deep-dive report format, admin-only.
 */
import type { ManufacturerProfile, ManufacturerSourcingReport } from '@/types';
import { APPROVED_CATEGORIES } from '@/types';
import { createAlibabaClient } from './alibabaClient';

export interface SourcingEngineOptions {
  categories?: string[];
  minScore?: number;
  requireTradeAssurance?: boolean;
  requireVerifiedSupplier?: boolean;
  requireExportsToUk?: boolean;
}

export async function runManufacturerSourcing(opts: SourcingEngineOptions = {}): Promise<ManufacturerSourcingReport> {
  const client = createAlibabaClient();
  const categories = opts.categories ?? [...APPROVED_CATEGORIES];
  const minScore = opts.minScore ?? 50;
  const allSuppliers: ManufacturerProfile[] = [];

  for (const category of categories) {
    const results = await client.searchSuppliers(category);
    allSuppliers.push(...results);
  }

  // Deduplicate by company name
  const seen = new Set<string>();
  const unique = allSuppliers.filter((s) => {
    const key = s.companyName.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Apply filters
  let filtered = unique;
  if (opts.requireTradeAssurance) filtered = filtered.filter((s) => s.tradeAssurance);
  if (opts.requireVerifiedSupplier) filtered = filtered.filter((s) => s.verifiedSupplier);
  if (opts.requireExportsToUk) filtered = filtered.filter((s) => s.exportsToUk);
  filtered = filtered.filter((s) => scoreSupplier(s) >= minScore);

  // Sort by score descending
  filtered.sort((a, b) => scoreSupplier(b) - scoreSupplier(a));

  const topSuppliers = filtered.slice(0, 20);

  return {
    generatedAt: new Date().toISOString(),
    scannedCount: unique.length,
    suppliers: filtered,
    topSuppliers,
    source: 'mock',
    sourceLabel: 'Alibaba (Mock)',
    searchQuery: categories.join(', '),
  };
}

export function formatSourcingReportAsText(report: ManufacturerSourcingReport): string {
  let out = '';
  out += 'Manufacturer Sourcing Report - ' + report.generatedAt.slice(0, 10) + '\n';
  out += 'Source: ' + report.sourceLabel + ' | Scanned: ' + report.scannedCount + ' | Qualified: ' + report.suppliers.length + ' | Top: ' + report.topSuppliers.length + '\n\n';
  out += 'Search categories: ' + report.searchQuery + '\n\n';
  out += '--- TOP SUPPLIERS ---\n\n';
  for (const s of report.topSuppliers) {
    out += (report.topSuppliers.indexOf(s) + 1) + '. ' + s.companyName + '\n';
    out += '   Country: ' + s.country + ' | Category: ' + s.category + ' | Years: ' + s.yearsInBusiness + '\n';
    out += '   Trade Assurance: ' + (s.tradeAssurance ? 'Yes' : 'No') + ' | Verified: ' + (s.verifiedSupplier ? 'Yes' : 'No') + ' | Exports to UK: ' + (s.exportsToUk ? 'Yes' : 'No') + '\n';
    out += '   Rating: ' + (s.rating ?? '-') + '/5 | Response: ' + (s.responseRate ?? '-') + '% | Products: ' + s.productCount + '\n';
    out += '   Capacity: ' + (s.capacity ?? 'N/A') + ' | MOQ: ' + (s.moq ?? 'N/A') + ' | Price: ' + (s.priceRange ?? 'N/A') + '\n';
    out += '   Specializations: ' + s.specializations.join(', ') + '\n';
    out += '   Source: ' + s.sourceUrl + '\n\n';
  }
  return out;
}

function scoreSupplier(s: ManufacturerProfile): number {
  let score = 0;
  if (s.tradeAssurance) score += 30;
  if (s.verifiedSupplier) score += 25;
  if (s.exportsToUk) score += 20;
  score += Math.min(s.yearsInBusiness * 2, 15);
  score += Math.min(s.productCount / 10, 10);
  return score;
}
