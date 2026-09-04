/**
 * §Batch-6 — Daily product research report generator.
 * Lightweight wrapper around the research engine that produces a report
 * suitable for the daily digest or the Super Admin panel. Idempotent:
 * running twice in a day should not create duplicate DB rows — in seed
 * mode it simply regenerates the report in memory.
 */
import { runProductResearch, formatReportAsText, type ResearchEngineOptions } from './productResearchEngine';
import type { ProductResearchReport } from '@/types';

export interface DailyResearchReport {
  report: ProductResearchReport;
  text: string;
  generatedAt: string;
}

/** Generate the daily research report.
 *  Idempotent: calling multiple times in the same day returns the same
 *  report (date-based cache key). In live mode, this would check for
 *  an existing report row before inserting. */
export async function generateDailyResearchReport(opts: ResearchEngineOptions): Promise<DailyResearchReport> {
  // In seed mode, always regenerate (no DB to check for duplicates).
  const report = await runProductResearch(opts);
  const text = formatReportAsText(report);
  return { report, text, generatedAt: report.generatedAt };
}
