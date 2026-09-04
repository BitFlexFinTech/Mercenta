/**
 * §7/§8 — Marketing automation core (pure, fully testable).
 *
 * Fit scoring gates outreach: leads below the threshold are never enrolled,
 * so outreach volume is only spent on good fits. Sequences pause the moment
 * a reply is detected. Inbound replies matching hot-lead intent are flagged
 * requiresHuman for immediate handoff (the ONLY real-time notification).
 */
import { APPROVED_CATEGORIES, type ApprovedCategory } from '@/types';
import type { Lead } from '@/types';

/* ── Pipeline stages ───────────────────────────────────────────────── */

export const PIPELINE_STAGES = [
  'Scraped',
  'Enriched',
  'Sequenced',
  'Replied',
  'Meeting Booked',
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

/* ── ICP ────────────────────────────────────────────────────────────── */

export interface ICP {
  description: string;
  /** Must each be one of APPROVED_CATEGORIES (§13). */
  categories: ApprovedCategory[];
  /** Brand ORIGIN regions — retail destination stays UK-only. */
  regions: Lead['region'][];
}

export function isValidICP(icp: Partial<ICP>): boolean {
  return (
    typeof icp.description === 'string' &&
    icp.description.trim().length > 0 &&
    Array.isArray(icp.categories) &&
    icp.categories.length > 0 &&
    icp.categories.every((c) => APPROVED_CATEGORIES.includes(c)) &&
    Array.isArray(icp.regions) &&
    icp.regions.length > 0
  );
}

/* ── Fit scoring ────────────────────────────────────────────────────── */

/** Placeholder threshold pending commercial tuning (§0 money/time rule). */
export const FIT_THRESHOLD_PLACEHOLDER = 70;

function textOf(lead: Pick<Lead, 'company' | 'persona' | 'segment' | 'location'>): string {
  return `${lead.company} ${lead.persona} ${lead.segment} ${lead.location}`.toLowerCase();
}

/**
 * 0–100 fit score against the ICP:
 *   +40 region match, +30 approved-category signal, +30 description-keyword
 *   overlap. Deterministic and cheap by design.
 */
export function scoreLeadFit(
  lead: Pick<Lead, 'region' | 'company' | 'persona' | 'segment' | 'location'>,
  icp: ICP
): number {
  let score = 0;

  // +40 region origin match.
  if (icp.regions.includes(lead.region)) score += 40;

  const hay = textOf(lead);

  // +30 approved-category signal (any selected category word appears).
  const catHit = icp.categories.some((cat) =>
    cat.toLowerCase().split(/[\s&]+/).filter((w) => w.length > 3).some((w) => hay.includes(w))
  );
  if (catHit) score += 30;

  // +30 ICP description keyword overlap (≥2 distinct keyword hits = full).
  const keywords = icp.description
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w.length > 4);
  const hits = new Set(keywords.filter((w) => hay.includes(w)));
  if (hits.size >= 2) score += 30;
  else if (hits.size === 1) score += 15;

  return Math.min(100, score);
}

/** §8 auto-enroll: only ≥ threshold, only from Scraped/Enriched stages. */
export function shouldAutoEnroll(fitScore: number, stage: PipelineStage): boolean {
  return (
    fitScore >= FIT_THRESHOLD_PLACEHOLDER &&
    (stage === 'Scraped' || stage === 'Enriched')
  );
}

/* ── Outreach sequence ─────────────────────────────────────────────── */

export interface SequenceStep {
  step: number;
  dayOffset: number;
  subjectTemplate: string;
  purpose: string;
}

/** 4-step sequence; pauses permanently once the lead replies. */
export const SEQUENCE_STEPS: SequenceStep[] = [
  { step: 1, dayOffset: 0, subjectTemplate: 'UK wholesale partnership — {company}', purpose: 'Intro + wholesale pitch' },
  { step: 2, dayOffset: 3, subjectTemplate: 'Re: UK wholesale partnership', purpose: 'Value follow-up (compliance handled)' },
  { step: 3, dayOffset: 7, subjectTemplate: 'Case study — UK placement', purpose: 'Social proof' },
  { step: 4, dayOffset: 10, subjectTemplate: 'Closing the loop', purpose: 'Polite breakup' },
];

/** Replies stop the machine — nothing further is ever auto-sent. */
export function sequencePaused(stage: PipelineStage): boolean {
  return stage === 'Replied' || stage === 'Meeting Booked';
}

/** The next step to send, or null when paused/out of steps. */
export function nextSequenceStep(stage: PipelineStage, stepsSentSoFar: number): SequenceStep | null {
  if (sequencePaused(stage)) return null;
  if (stepsSentSoFar >= SEQUENCE_STEPS.length) return null;
  return SEQUENCE_STEPS[stepsSentSoFar];
}

/* ── §8 Hot-lead handoff ───────────────────────────────────────────── */

const HOT_LEAD_INTENT_KEYWORDS = [
  'price', 'pricing', 'cost', 'quote',
  'call', 'talk', 'chat',
  'can we', "let's", 'interested in discussing',
];

const OBJECTION_KEYWORDS = [
  'too expensive', 'not interested', 'we already have', 'concern about',
];

export interface ReplyClassification {
  wantsHuman: boolean;
  reason?: string;
}

/**
 * Keyword/intent detection on an inbound reply. Match → requiresHuman:true
 * → immediate admin notification with full thread (§8: the only real-time one).
 */
export function classifyInboundReply(body: string): ReplyClassification {
  const lower = body.toLowerCase();

  const intentHit = HOT_LEAD_INTENT_KEYWORDS.find((k) => lower.includes(k));
  if (intentHit) {
    return { wantsHuman: true, reason: `pricing/discussion intent ("${intentHit}")` };
  }

  const objectionHit = OBJECTION_KEYWORDS.find((k) => lower.includes(k));
  if (objectionHit) {
    return { wantsHuman: true, reason: `objection detected ("${objectionHit}")` };
  }

  return { wantsHuman: false };
}

/* ── §7 CSV import adapter (launch path — zero API dependency) ─────── */

const REGION_ALIASES: Record<string, Lead['region']> = {
  us: 'us', usa: 'us', 'united states': 'us', american: 'us',
  eu: 'eu', europe: 'eu', european: 'eu',
  africa: 'africa', african: 'africa',
  canada: 'canada', ca: 'canada', canadian: 'canada',
};

function mapRegion(raw: string): Lead['region'] | null {
  return REGION_ALIASES[raw.trim().toLowerCase()] ?? null;
}

/**
 * Parses a lead-export CSV:
 *   company,persona,email,location,region,segment
 * Malformed rows are skipped and counted; callers surface the count.
 */
export function parseLeadsCsv(csv: string): { leads: Lead[]; skipped: number } {
  const lines = csv.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { leads: [], skipped: 0 };

  // Drop header row if present.
  if (/company/i.test(lines[0]) && /email/i.test(lines[0])) lines.shift();

  const leads: Lead[] = [];
  let skipped = 0;

  for (const line of lines) {
    const [company, persona, email, location, regionRaw, segment] =
      line.split(',').map((c) => c.trim());
    const region = regionRaw ? mapRegion(regionRaw) : null;
    if (!company || !email || !region) {
      skipped++;
      continue;
    }
    leads.push({
      id: `lead-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      persona: persona || '',
      company,
      location: location || '',
      email,
      priority: 'Medium',
      outreachStatus: 'Scraped',
      segment: segment || 'Uncategorized',
      fitScore: 0,
      region,
    });
  }

  return { leads, skipped };
}
