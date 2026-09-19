/**
 * §7 Stage-10 — Discovery engine orchestrator.
 *
 * Pipeline: trade-body directories → OpenRouter grounded research →
 * Companies House enrichment → Hunter email verification → Instantly
 * enrolment (wording-linted). Reply routing (hot leads) via the inbound
 * webhook handler below. NO social-media scraping — directories and
 * company registries only.
 *
 * Every provider is behind the mock/real seam; budget caps are enforced
 * before any provider call. Mock clients return realistic simulated data so
 * the full pipeline runs today with zero credentials.
 */

import { chargeService, remainingBudget } from './budget';
import { authoriseAiCall, recordAiCallOutcome } from '@/lib/costs/usageLog';
import { lintOutwardWording } from './wordingSafety';

export interface RawDiscoveryLead {
  companyName: string;
  country: string;
  segment: string;
  sourceDirectory: string;
  website?: string;
}

export interface EnrichedLead extends RawDiscoveryLead {
  companiesHouseNumber?: string;
  incorporatedYear?: number;
  contactEmail?: string;
  emailVerified?: boolean;
  fitScore: number;
}

export type FetchLike = (
  url: string,
  init?: { method?: string; headers?: Record<string, string>; body?: unknown }
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

/* ── Directory stage ─────────────────────────────────────────────────── */

export interface DirectoryClient {
  readonly mode: 'mock' | 'real';
  fetchLeads(segments: string[]): Promise<RawDiscoveryLead[]>;
}

const MOCK_DIRECTORY_POOL: RawDiscoveryLead[] = [
  { companyName: 'Clipper Teas', country: 'United Kingdom', segment: 'Grocery', sourceDirectory: 'UK retailer supplier directory', website: 'clipper-teas.com' },
  { companyName: 'Regatta', country: 'United Kingdom', segment: 'Apparel', sourceDirectory: 'UK apparel exporter directory', website: 'regatta.com' },
  { companyName: 'Logitech', country: 'Switzerland', segment: 'Personal Computer', sourceDirectory: 'EU electronics directory', website: 'logitech.com' },
  { companyName: 'Seep', country: 'United Kingdom', segment: 'Home', sourceDirectory: 'UK consumer goods directory', website: 'seepuk.com' },
  { companyName: 'Autoglym', country: 'United Kingdom', segment: 'Automotive', sourceDirectory: 'UK automotive care directory', website: 'autoglym.com' },
];

export class MockDirectoryClient implements DirectoryClient {
  readonly mode = 'mock' as const;
  async fetchLeads(segments: string[]): Promise<RawDiscoveryLead[]> {
    const seg = new Set(segments.map((s) => s.toLowerCase()));
    return MOCK_DIRECTORY_POOL.filter((l) => seg.size === 0 || seg.has(l.segment.toLowerCase()));
  }
}

/** Real client: fetches published directory pages for offline parsing.
 *  Parsing is deliberately conservative — only structured list data. */
export class RealDirectoryClient implements DirectoryClient {
  readonly mode = 'real' as const;
  constructor(private readonly transport: FetchLike) {}
  async fetchLeads(_segments: string[]): Promise<RawDiscoveryLead[]> {
    // Directory sites publish static listings without a JSON API; the real
    // implementation POSTs the URL list to the discovery Edge Function which
    // fetches + parses server-side (respecting robots.txt).
    throw new Error('RealDirectoryClient requires the /discovery/directory Edge Function to be deployed.');
  }
}

/* ── OpenRouter grounded research ────────────────────────────────────── */

export interface ResearchClient {
  readonly mode: 'mock' | 'real';
  /** Returns a 0–100 fit score + one-line evidence note per lead. */
  scoreFit(lead: RawDiscoveryLead, icpDescription: string): Promise<{ fitScore: number; note: string }>;
}

const ESTIMATED_COST_PER_RESEARCH_CALL_GBP = 0.02;

export class MockResearchClient implements ResearchClient {
  readonly mode = 'mock' as const;
  async scoreFit(lead: RawDiscoveryLead, _icpDescription: string) {
    void _icpDescription;
    // Deterministic pseudo-score from the company name so tests are stable.
    let h = 0;
    for (const c of lead.companyName) h = (h * 31 + c.charCodeAt(0)) % 101;
    return {
      fitScore: 40 + (h % 55),
      note: `Simulated research note: ${lead.companyName} exports in ${lead.segment} (${lead.sourceDirectory}).`,
    };
  }
}

export class RealOpenRouterResearchClient implements ResearchClient {
  readonly mode = 'real' as const;
  constructor(
    private readonly apiKey: string,
    private readonly transport: FetchLike
  ) {}
  async scoreFit(lead: RawDiscoveryLead, icpDescription: string): Promise<{ fitScore: number; note: string }> {
    // §27 — the model is chosen by the runtime policy, never hardcoded here, and
    // the call is authorised (or refused) by the runtime usage log/ceilings.
    const decision = authoriseAiCall({ taskId: 'discovery_fit_scoring', entity: lead.companyName });
    if (!decision.allowed || !decision.decision.model) {
      throw new Error(`AI call not authorised: ${decision.reason}`);
    }
    if (!chargeService('openrouter', ESTIMATED_COST_PER_RESEARCH_CALL_GBP)) {
      throw new Error(`OpenRouter budget cap reached (£${remainingBudget('openrouter').toFixed(2)} left)`);
    }
    const res = await this.transport('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}` },
      body: {
        model: decision.decision.model,
        messages: [
          { role: 'system', content: 'You score B2B export-fit 0-100 with one-line evidence. Respond as JSON {"fitScore":n,"note":"…"}.' },
          { role: 'user', content: `ICP: ${icpDescription}\nCompany: ${lead.companyName} (${lead.country}, ${lead.segment})` },
        ],
      },
    });
    if (!res.ok) {
      recordAiCallOutcome({ taskId: 'discovery_fit_scoring', tokens: 0, status: 'error', note: `OpenRouter HTTP ${res.status}` });
      throw new Error(`OpenRouter HTTP ${res.status}`);
    }
    const body = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: { total_tokens?: number };
    };
    recordAiCallOutcome({
      taskId: 'discovery_fit_scoring',
      tokens: Number(body.usage?.total_tokens ?? 0),
      status: 'ok',
    });
    const parsed = JSON.parse(body.choices?.[0]?.message?.content ?? '{}') as { fitScore?: number; note?: string };
    return { fitScore: Math.max(0, Math.min(100, Number(parsed.fitScore ?? 0))), note: String(parsed.note ?? '') };
  }
}

/* ── Enrichment (Companies House) + email verification (Hunter) ──────── */

export interface EnrichmentClient {
  readonly mode: 'mock' | 'real';
  enrich(lead: RawDiscoveryLead): Promise<{ companiesHouseNumber?: string; incorporatedYear?: number }>;
}

export class MockEnrichmentClient implements EnrichmentClient {
  readonly mode = 'mock' as const;
  async enrich(lead: RawDiscoveryLead) {
    if (!lead.website) return {};
    let h = 0;
    for (const c of lead.companyName) h = (h * 17 + c.charCodeAt(0)) % 900000;
    return { companiesHouseNumber: `MOCK-CH-${String(100000 + h)}`, incorporatedYear: 2012 + (h % 12) };
  }
}

export class RealCompaniesHouseClient implements EnrichmentClient {
  readonly mode = 'real' as const;
  constructor(private readonly apiKey: string, private readonly transport: FetchLike) {}
  async enrich(lead: RawDiscoveryLead) {
    if (!chargeService('companieshouse', 0)) throw new Error('Companies House budget cap reached');
    if (!/united kingdom|uk/i.test(lead.country)) return {}; // CH is UK-only
    const url = `https://api.company-information.service.gov.uk/search/companies?q=${encodeURIComponent(lead.companyName)}&items_per_page=1`;
    const auth = 'Basic ' + btoa(`${this.apiKey}:`);
    const res = await this.transport(url, { headers: { Authorization: auth } });
    if (!res.ok) throw new Error(`Companies House HTTP ${res.status}`);
    const body = (await res.json()) as { items?: { company_number?: string; date_of_creation?: string }[] };
    const item = body.items?.[0];
    return {
      companiesHouseNumber: item?.company_number,
      incorporatedYear: item?.date_of_creation ? Number(item.date_of_creation.slice(0, 4)) : undefined,
    };
  }
}

export interface EmailVerificationClient {
  readonly mode: 'mock' | 'real';
  /** Returns a plausible contact email + verified flag. */
  findVerifiedEmail(lead: RawDiscoveryLead): Promise<{ contactEmail: string; verified: boolean }>;
}

export class MockEmailClient implements EmailVerificationClient {
  readonly mode = 'mock' as const;
  async findVerifiedEmail(lead: RawDiscoveryLead) {
    const domain = lead.website?.replace(/^https?:\/\//, '').replace(/\/$/, '') ?? 'example.com';
    return { contactEmail: `trade@${domain}`, verified: true };
  }
}

export class RealHunterClient implements EmailVerificationClient {
  readonly mode = 'real' as const;
  constructor(private readonly apiKey: string, private readonly transport: FetchLike) {}
  async findVerifiedEmail(lead: RawDiscoveryLead): Promise<{ contactEmail: string; verified: boolean }> {
    const domain = lead.website?.replace(/^https?:\/\//, '').split('/')[0];
    if (!domain || !chargeService('hunter', 0.02)) {
      throw new Error(`Hunter skipped (no domain or budget cap; £${remainingBudget('hunter').toFixed(2)} left)`);
    }
    const res = await this.transport(
      `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=${encodeURIComponent(this.apiKey)}`
    );
    if (!res.ok) throw new Error(`Hunter HTTP ${res.status}`);
    const body = (await res.json()) as { data?: { emails?: { value?: string; verification?: { status?: string } }[] } };
    const first = body.data?.emails?.[0];
    return {
      contactEmail: first?.value ?? `trade@${domain}`,
      verified: first?.verification?.status === 'valid',
    };
  }
}

/* ── Outreach enrolment (Instantly) + wording lint ───────────────────── */

export interface OutreachClient {
  readonly mode: 'mock' | 'real';
  /** Enrols a lead into the outreach campaign. Cold domain, sending only. */
  enrol(lead: { contactEmail: string; companyName: string }, copySubject: string): Promise<{ ok: boolean; error?: string }>;
}

const enrolledMock: { email: string; subject: string }[] = [];

export function resetMockOutreach(): void {
  enrolledMock.length = 0;
}

export class MockOutreachClient implements OutreachClient {
  readonly mode = 'mock' as const;
  async enrol(lead: { contactEmail: string; companyName: string }, copySubject: string) {
    enrolledMock.push({ email: lead.contactEmail, subject: copySubject });
    return { ok: true };
  }
  static get enrolled() {
    return [...enrolledMock];
  }
}

export class RealInstantlyClient implements OutreachClient {
  readonly mode = 'real' as const;
  constructor(private readonly apiKey: string, private readonly transport: FetchLike) {}
  async enrol(lead: { contactEmail: string; companyName: string }, _copySubject: string): Promise<{ ok: boolean; error?: string }> {
    void _copySubject;
    if (!chargeService('instantly', 0.01)) throw new Error('Instantly budget cap reached');
    const res = await this.transport('https://api.instantly.ai/api/v1/lead/add', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}` },
      body: { leads: [{ email: lead.contactEmail, company_name: lead.companyName }] },
    });
    if (!res.ok) return { ok: false, error: `Instantly HTTP ${res.status}` };
    return { ok: true };
  }
}

/* ── Pipeline orchestrator ───────────────────────────────────────────── */

export interface DiscoveryClients {
  directory: DirectoryClient;
  research: ResearchClient;
  enrichment: EnrichmentClient;
  email: EmailVerificationClient;
  outreach: OutreachClient;
}

/** Mock set — full pipeline runs with zero credentials. */
export function createMockDiscoveryClients(): DiscoveryClients {
  return {
    directory: new MockDirectoryClient(),
    research: new MockResearchClient(),
    enrichment: new MockEnrichmentClient(),
    email: new MockEmailClient(),
    outreach: new MockOutreachClient(),
  };
}

/**
 * Runs discovery → research → enrichment → email → lint → enrol.
 * Leads scoring below `minFitScore` are dropped before enrolment.
 * Generated/enrolled copy must pass the wording-safety lint first.
 */
export async function runDiscoveryPipeline(
  segments: string[],
  icpDescription: string,
  opts: {
    clients: DiscoveryClients;
    minFitScore?: number;
    subjectTemplate?: string;
    onLead?: (lead: EnrichedLead, enrolled: boolean, dropReason?: string) => void;
  }
): Promise<{ discovered: number; enriched: number; enrolled: number; dropped: number }> {
  const minFitScore = opts.minFitScore ?? 60;
  const raws = await opts.clients.directory.fetchLeads(segments);
  let enriched = 0;
  let enrolledCount = 0;
  let dropped = 0;

  for (const raw of raws) {
    const { fitScore } = await opts.clients.research.scoreFit(raw, icpDescription);
    const chInfo = await opts.clients.enrichment.enrich(raw);
    const { contactEmail, verified } = await opts.clients.email.findVerifiedEmail(raw);
    const lead: EnrichedLead = { ...raw, ...chInfo, contactEmail, emailVerified: verified, fitScore };

    if (fitScore < minFitScore) {
      dropped += 1;
      opts.onLead?.(lead, false, `fit score ${fitScore} < ${minFitScore}`);
      continue;
    }

    const subject = (opts.subjectTemplate ?? 'UK retail placement for {{company}}').replace(
      '{{company}}',
      raw.companyName
    );
    const lint = lintOutwardWording(subject);
    if (!lint.safe) {
      dropped += 1;
      opts.onLead?.(lead, false, `wording lint: ${lint.hits[0]?.reason}`);
      continue;
    }

    const enrol = await opts.clients.outreach.enrol({ contactEmail, companyName: raw.companyName }, subject);
    if (!enrol.ok) {
      dropped += 1;
      opts.onLead?.(lead, false, enrol.error);
      continue;
    }
    enriched += 1;
    enrolledCount += 1;
    opts.onLead?.(lead, true);
  }

  return { discovered: raws.length, enriched, enrolled: enrolledCount, dropped };
}

/* ── Inbound reply routing (wires the previously-dead classifier) ────── */

import { classifyInboundReply } from '@/lib/marketing';

export interface ReplyEvent {
  leadEmail: string;
  body: string;
}

export interface ReplyRouteResult {
  requiresHuman: boolean;
  classification: ReturnType<typeof classifyInboundReply>;
  /** Set when requiresHuman — the ONLY real-time notification trigger. */
  hotLeadNotification?: { leadEmail: string; reason: string };
}

/**
 * Webhook entry point for inbound replies. Hot-lead replies (pricing
 * questions, "call me", objections after repeated contact) fire a real-time
 * human notification; everything else batches into the daily digest.
 */
export function handleInboundReply(ev: ReplyEvent): ReplyRouteResult {
  const classification = classifyInboundReply(ev.body);
  return {
    requiresHuman: classification.wantsHuman,
    classification,
    ...(classification.wantsHuman
      ? { hotLeadNotification: { leadEmail: ev.leadEmail, reason: 'reply signals wanting a human' } }
      : {}),
  };
}


