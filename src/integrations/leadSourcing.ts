/**
 * §7 — Lead sourcing adapter interface.
 *
 * CSV import is the zero-API launch path. Apollo.io and Instantly.ai publish
 * confirmed public APIs if redundancy is wanted.
 */
import type { Lead } from '@/types';
import { parseLeadsCsv } from '@/lib/marketing';

export interface ICPFilters {
  categories: string[];
  regions: string[];
  description: string;
}

export interface SourcedLeadBatch {
  leads: Lead[];
  skipped: number;
}

export interface LeadSourcingAdapter {
  readonly name: string;
  /** True when the adapter can actually reach a live source. */
  readonly isLive: boolean;
  submitICP(description: string, filters: ICPFilters): Promise<void>;
  fetchNewLeads(since: string): Promise<SourcedLeadBatch>;
}

/** Drag-drop fallback: admin exports a lead list from any tool, we parse it. */
export class CsvImportAdapter implements LeadSourcingAdapter {
  readonly name = 'CSV Import';
  readonly isLive = true;

  async submitICP(description: string, filters: ICPFilters): Promise<void> {
    // ICP is used client-side for fit scoring; nothing to submit upstream.
    void description;
    void filters;
  }

  async fetchNewLeads(since: string, csv?: string): Promise<SourcedLeadBatch> {
    if (!csv) return { leads: [], skipped: 0 };
    void since;
    return parseLeadsCsv(csv);
  }
}
