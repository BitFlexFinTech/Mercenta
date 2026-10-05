/**
 * §PHASE 13 — THE CLAIMS REGISTRY (the ONE governance index over every claim
 * Mercenta's outward-facing content may make).
 *
 * WHY THIS EXISTS
 * ---------------
 * The platform already enforces outward-facing claim rules in FOUR separate
 * owners, each with its own gate:
 *
 *   · `src/lib/discovery/banned-patterns.mjs`  → `BANNED_PATTERNS`
 *       the retail channel may never be NAMED in outward copy
 *       (gate: `scripts/lint-wording.mjs`, `npm run validate:wording`)
 *   · `src/lib/intelligence/amazonWording.ts`  → `AMAZON_WORDING_RULES`
 *       no claim of channel approval / guarantee / control, and the phrasings
 *       the canonical business model bans by name
 *       (gate: `scripts/validate-wording-guard.mjs`)
 *   · `src/config/positioning.ts`              → `PUBLIC_CLAIM_RED_LINES`
 *       eight families of claim a PUBLIC surface may never make
 *       (gate: `scripts/validate-public-claims.mjs`)
 *   · `src/config/ukMarketFit.ts`              → `PRE_AUDIT_PROHIBITED_PROMISES`
 *       what the market assessment may never promise
 *       (gate: `scripts/validate-uk-market-fit.mjs`)
 *
 * What was MISSING was the governance layer ABOVE them: no single place
 * declared, in one GREEN / AMBER / RED vocabulary, every class of claim, its
 * status, and which canonical owner enforces it. So "what may we claim, and
 * where is that rule?" could only be answered by reading four files and hoping
 * they agreed.
 *
 * THIS MODULE IS THAT LAYER. It does NOT re-implement a single rule: every
 * class POINTS AT its canonical owner (module + symbol). The rules stay in
 * exactly one place each — this registry is the index that makes the whole set
 * visible, classifies it, and can be executed.
 *
 * THE THREE STATUSES (GREEN = supported · AMBER = requires verification/approval
 * · RED = do not use):
 *
 *   · RED   (`do_not_use`)            — never publish; a canonical owner catches it.
 *   · AMBER (`requires_verification`) — may be used ONLY with its required
 *                                       qualifier (a canonical honest phrase).
 *   · GREEN (`supported`)             — a declared, supported statement.
 *
 * PRINCIPLE (canonical): CHANNEL-NEUTRAL BY DEFAULT, CHANNEL-SPECIFIC WHERE
 * OPERATIONALLY NECESSARY, NEVER MISLEADING.
 *
 * NO RULE IS INVENTED HERE. Every status is derived from an owner that already
 * existed and is already gated; a class whose status could not be derived was
 * left out rather than guessed.
 */
import { BANNED_PATTERNS } from '@/lib/discovery/banned-patterns';
import {
  AMAZON_WORDING_RULES,
  AMAZON_TOS_VERIFICATION_NOTE,
  ESTIMATE_DISCLAIMER,
} from '@/lib/intelligence/amazonWording';
import { PUBLIC_CLAIM_RED_LINES, PUBLIC_COMPANY_NAME } from '@/config/positioning';
import { PRE_AUDIT_PROHIBITED_PROMISES, PRE_AUDIT_HEDGES } from '@/config/ukMarketFit';

/* ── 1. The vocabulary ─────────────────────────────────────────────────── */

/** GREEN = supported · AMBER = requires verification/approval · RED = do not use. */
export type ClaimStatus = 'supported' | 'requires_verification' | 'do_not_use';

export const CLAIM_STATUS_LABEL: Record<ClaimStatus, string> = {
  supported: 'GREEN — supported',
  requires_verification: 'AMBER — requires verification / approval',
  do_not_use: 'RED — do not use',
};

/** The surfaces the registry governs (the Phase 13 declared channels). */
export type ClaimChannel =
  | 'website'
  | 'ai_content'
  | 'email'
  | 'social'
  | 'acquisition'
  | 'sales_material';

export const CLAIM_CHANNELS: readonly ClaimChannel[] = [
  'website',
  'ai_content',
  'email',
  'social',
  'acquisition',
  'sales_material',
];

/* ── 2. The shapes ─────────────────────────────────────────────────────── */

/** A pointer at the canonical OWNER of a rule — never a copy of the rule. */
export interface ClaimSourceRef {
  /** The module that owns the rule (a repo-relative path). */
  module: string;
  /** The exported symbol inside that module. */
  symbol: string;
}

export interface ClaimClass {
  id: string;
  status: ClaimStatus;
  /** What class of claim this is, in plain words. */
  concern: string;
  /** Why the status is what it is. */
  why: string;
  /** The channels this class governs. */
  channels: readonly ClaimChannel[];
  /** The canonical owner that enforces (RED) or qualifies (AMBER) this class. */
  source: ClaimSourceRef;
  /**
   * RED: an example that the OWNER must catch (the gate executes the owner).
   * GREEN: an example the owners must NOT block.
   * AMBER: a statement of the class (the qualifier is required with it).
   */
  example: string;
  /** AMBER only: the exact qualifier constant that MUST accompany the claim. */
  requiredQualifier?: ClaimSourceRef;
}

/* ── 3. The canonical owners, named once ───────────────────────────────── */

const OWNER_BANNED_PATTERNS = 'src/lib/discovery/banned-patterns.mjs';
const OWNER_AMAZON_WORDING = 'src/lib/intelligence/amazonWording.ts';
const OWNER_POSITIONING = 'src/config/positioning.ts';
const OWNER_UK_MARKET_FIT = 'src/config/ukMarketFit.ts';

const ALL_CHANNELS = CLAIM_CHANNELS;
const PUBLIC_CHANNELS: readonly ClaimChannel[] = ['website', 'social', 'sales_material'];
const GENERATED_CHANNELS: readonly ClaimChannel[] = ['ai_content', 'email', 'acquisition', 'sales_material'];

/* ── 4. THE REGISTRY ───────────────────────────────────────────────────── */

/**
 * Every class of claim, its status, and the canonical owner that enforces or
 * qualifies it. Ordered RED → AMBER → GREEN.
 */
export const CLAIMS_REGISTRY: readonly ClaimClass[] = [
  /* ── RED — do not use ─────────────────────────────────────────────────── */
  {
    id: 'channel-name',
    status: 'do_not_use',
    concern: 'Naming the retail channel in outward copy.',
    why: 'A prospect or the public must never be shown which channel Mercenta operates (canonical outward-wording rule).',
    channels: ALL_CHANNELS,
    source: { module: OWNER_BANNED_PATTERNS, symbol: 'BANNED_PATTERNS' },
    example: 'List your products on Amazon Vendor Central today',
  },
  {
    id: 'programme-approval',
    status: 'do_not_use',
    concern: 'Claiming channel approval, endorsement, partnership or an official programme place.',
    why: 'Mercenta holds no such approval; claiming one is a false statement about a relationship.',
    channels: ALL_CHANNELS,
    source: { module: OWNER_AMAZON_WORDING, symbol: 'AMAZON_WORDING_RULES' },
    example: 'We are an Amazon approved partner.',
  },
  {
    id: 'guaranteed-outcome',
    status: 'do_not_use',
    concern: 'Promising a guaranteed sales, revenue, acceptance, approval, launch, placement or listing outcome.',
    why: 'The channel decides those outcomes; Mercenta does not control them.',
    channels: ALL_CHANNELS,
    source: { module: OWNER_AMAZON_WORDING, symbol: 'AMAZON_WORDING_RULES' },
    example: 'Your sales are guaranteed.',
  },
  {
    id: 'guaranteed-purchase-order',
    status: 'do_not_use',
    concern: 'Promising a guaranteed purchase order.',
    why: 'The canonical business rules ban "guaranteed purchase orders" outright; the honest vocabulary is PO potential / estimated PO opportunity / demand potential.',
    channels: ALL_CHANNELS,
    source: { module: OWNER_AMAZON_WORDING, symbol: 'AMAZON_WORDING_RULES' },
    example: 'We can offer guaranteed purchase orders for your brand.',
  },
  {
    id: 'channel-control',
    status: 'do_not_use',
    concern: 'Implying Mercenta controls or decides a channel decision.',
    why: 'Mercenta operates the account; it does not control the channel.',
    channels: ALL_CHANNELS,
    source: { module: OWNER_AMAZON_WORDING, symbol: 'AMAZON_WORDING_RULES' },
    example: 'We control Amazon pricing for your brand.',
  },
  {
    id: 'banned-by-name',
    status: 'do_not_use',
    concern: 'Phrasings the canonical business model bans by name.',
    why: 'These conceal, evade or overstate the relationship ("we bypass Amazon", "Amazon wholesale loophole", "we sell directly to Amazon", "Amazon will buy your products").',
    channels: ALL_CHANNELS,
    source: { module: OWNER_AMAZON_WORDING, symbol: 'AMAZON_WORDING_RULES' },
    example: 'We bypass Amazon and sell directly to Amazon.',
  },
  {
    id: 'public-surface-red-line',
    status: 'do_not_use',
    concern:
      "A PUBLIC surface may never make these eight families of claim (structure, regulated position, suppliers, commercial arithmetic, platform internals, another company's rules, unevidenced claims, the channel name).",
    why: 'Publishing any of them is either a false statement or an intellectual-property leak.',
    channels: PUBLIC_CHANNELS,
    source: { module: OWNER_POSITIONING, symbol: 'PUBLIC_CLAIM_RED_LINES' },
    example: 'Trusted by 500 brands.',
  },
  {
    id: 'assessment-prohibited-promise',
    status: 'do_not_use',
    concern: 'A promise the market assessment may never make.',
    why: 'The assessment reports evidence; it does not promise a commercial outcome.',
    channels: ['website', 'ai_content'],
    source: { module: OWNER_UK_MARKET_FIT, symbol: 'PRE_AUDIT_PROHIBITED_PROMISES' },
    example: 'guaranteed listing',
  },

  /* ── AMBER — requires verification / approval ─────────────────────────── */
  {
    id: 'projection-estimate',
    status: 'requires_verification',
    concern: 'An estimate, projection, forecast or modelled figure.',
    why: 'A modelled figure is not measured data; it must carry the estimate disclaimer so it is never read as a promise or as real channel data.',
    channels: GENERATED_CHANNELS,
    source: { module: OWNER_AMAZON_WORDING, symbol: 'ESTIMATE_DISCLAIMER' },
    example: 'Estimated PO opportunity for this brand.',
    requiredQualifier: { module: OWNER_AMAZON_WORDING, symbol: 'ESTIMATE_DISCLAIMER' },
  },
  {
    id: 'programme-reference',
    status: 'requires_verification',
    concern: 'Any reference to a channel programme, its terms or its eligibility rules.',
    why: 'The current vendor terms / account agreement have NOT been verified in this build, so any programme statement must carry the verification note.',
    channels: ['ai_content', 'sales_material'],
    source: { module: OWNER_AMAZON_WORDING, symbol: 'AMAZON_TOS_VERIFICATION_NOTE' },
    example: 'Programme eligibility is described below.',
    requiredQualifier: { module: OWNER_AMAZON_WORDING, symbol: 'AMAZON_TOS_VERIFICATION_NOTE' },
  },
  {
    id: 'assessment-finding',
    status: 'requires_verification',
    concern: 'A market-assessment finding (a fit score, demand, risk or opportunity).',
    why: 'An assessment finding is derived from partial evidence; it must be hedged with the declared honest vocabulary.',
    channels: ['website', 'ai_content'],
    source: { module: OWNER_UK_MARKET_FIT, symbol: 'PRE_AUDIT_HEDGES' },
    example: 'Demand appears to be strong for this category.',
    requiredQualifier: { module: OWNER_UK_MARKET_FIT, symbol: 'PRE_AUDIT_HEDGES' },
  },

  /* ── GREEN — supported ────────────────────────────────────────────────── */
  {
    id: 'supported-company-fact',
    status: 'supported',
    concern: 'A declared, supported company fact (the legal name and jurisdiction).',
    why: 'A real company publishes its legal identity; this is a supported statement, not a claim.',
    channels: PUBLIC_CHANNELS,
    source: { module: OWNER_POSITIONING, symbol: 'PUBLIC_COMPANY_NAME' },
    example: PUBLIC_COMPANY_NAME,
  },
];

/* ── 5. Resolving a class to its canonical owner's matcher ─────────────── */

/**
 * The forbidden patterns of each RED owner, read from the owner at module load
 * — never retyped. Keyed by the owner's SYMBOL, because that is what a class
 * points at.
 */
const RED_PATTERNS_BY_SYMBOL: Record<string, readonly RegExp[]> = {
  BANNED_PATTERNS: BANNED_PATTERNS.map((b) => b.re),
  AMAZON_WORDING_RULES: AMAZON_WORDING_RULES.map((r) => r.pattern),
  PUBLIC_CLAIM_RED_LINES: PUBLIC_CLAIM_RED_LINES.flatMap((family) =>
    family.patterns.map((source) => new RegExp(source, 'i'))
  ),
  PRE_AUDIT_PROHIBITED_PROMISES: PRE_AUDIT_PROHIBITED_PROMISES.map(
    (phrase) => new RegExp(`\\b${phrase}\\b`, 'i')
  ),
};

/** The forbidden patterns a RED class is enforced by (empty for non-RED). */
export function redPatternsFor(cls: ClaimClass): readonly RegExp[] {
  if (cls.status !== 'do_not_use') return [];
  return RED_PATTERNS_BY_SYMBOL[cls.source.symbol] ?? [];
}

/** The qualifier TEXT of a class's required qualifier, or null if unresolvable. */
export function qualifierText(ref: ClaimSourceRef): string | null {
  if (ref.symbol === 'ESTIMATE_DISCLAIMER') return ESTIMATE_DISCLAIMER;
  if (ref.symbol === 'AMAZON_TOS_VERIFICATION_NOTE') return AMAZON_TOS_VERIFICATION_NOTE;
  if (ref.symbol === 'PRE_AUDIT_HEDGES') return PRE_AUDIT_HEDGES.requiresVerification;
  return null;
}

/* ── 6. The lint ───────────────────────────────────────────────────────── */

export interface ClaimHit {
  classId: string;
  pattern: string;
  reason: string;
  index: number;
}

export interface ClaimLintResult {
  /** True when NO RED class is violated (RED is the hard block). */
  safe: boolean;
  /** The worst status present in the text. */
  verdict: ClaimStatus;
  /** RED hits (a superset of the channel-wording hit shape). */
  hits: ClaimHit[];
  redHits: ClaimHit[];
  /** The AMBER classes applicable to the channel, with the qualifier each requires. */
  requiresVerification: { classId: string; qualifier: string }[];
}

/**
 * Classify a piece of content against the registry.
 *
 * RED is a hard block (`safe === false`). AMBER does not block — it names the
 * qualifier the copy must carry; a caller decides whether that is satisfied.
 */
export function lintClaims(text: string, channel?: ClaimChannel): ClaimLintResult {
  const redHits: ClaimHit[] = [];
  for (const cls of CLAIMS_REGISTRY) {
    if (cls.status !== 'do_not_use') continue;
    if (channel && !cls.channels.includes(channel)) continue;
    for (const re of redPatternsFor(cls)) {
      re.lastIndex = 0;
      const m = re.exec(text);
      if (m) redHits.push({ classId: cls.id, pattern: re.source, reason: cls.concern, index: m.index });
    }
  }
  const requiresVerification = CLAIMS_REGISTRY.filter(
    (cls) => cls.status === 'requires_verification' && (!channel || cls.channels.includes(channel))
  )
    .map((cls) => ({
      classId: cls.id,
      qualifier: cls.requiredQualifier ? qualifierText(cls.requiredQualifier) ?? '' : '',
    }))
    .filter((entry) => entry.qualifier.length > 0);

  return {
    safe: redHits.length === 0,
    verdict: redHits.length
      ? 'do_not_use'
      : requiresVerification.length
        ? 'requires_verification'
        : 'supported',
    hits: redHits,
    redHits,
    requiresVerification,
  };
}

/** The classes that govern a channel. */
export function claimClassesForChannel(channel: ClaimChannel): readonly ClaimClass[] {
  return CLAIMS_REGISTRY.filter((cls) => cls.channels.includes(channel));
}

/** A short machine-readable summary of the registry (used by the gate/reporting). */
export function registrySummary(): {
  total: number;
  byStatus: Record<ClaimStatus, number>;
  channels: readonly ClaimChannel[];
} {
  const byStatus: Record<ClaimStatus, number> = {
    supported: 0,
    requires_verification: 0,
    do_not_use: 0,
  };
  for (const cls of CLAIMS_REGISTRY) byStatus[cls.status] += 1;
  return { total: CLAIMS_REGISTRY.length, byStatus, channels: CLAIM_CHANNELS };
}

/* ── 7. Module-load guards (fail closed) ───────────────────────────────── */

if (CLAIMS_REGISTRY.length === 0) {
  throw new Error('[claimsRegistry] CLAIMS_REGISTRY must not be empty');
}
for (const cls of CLAIMS_REGISTRY) {
  if (!cls.id || !cls.concern || !cls.why) {
    throw new Error(`[claimsRegistry] claim class "${cls.id}" is incomplete`);
  }
  if (!cls.source.module || !cls.source.symbol) {
    throw new Error(`[claimsRegistry] claim class "${cls.id}" has no canonical source`);
  }
  if (cls.status === 'requires_verification' && !cls.requiredQualifier) {
    throw new Error(`[claimsRegistry] AMBER class "${cls.id}" declares no required qualifier`);
  }
  if (cls.status === 'do_not_use' && redPatternsFor(cls).length === 0) {
    throw new Error(`[claimsRegistry] RED class "${cls.id}" resolves to no enforcement pattern`);
  }
}

