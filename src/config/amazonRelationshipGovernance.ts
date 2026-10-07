/**
 * §PHASE 13 — AMAZON RELATIONSHIP GOVERNANCE (the ONE owner).
 *
 * WHY THIS EXISTS
 * ---------------
 * The registry row `phase13-amazon-relationship-governance` records the CROSS-CUTTING
 * governance of Mercenta's relationship with the retail channel (Amazon Vendor Central).
 * Every outward claim Mercenta makes about that relationship — and every behaviour it
 * relies on as permitted — rests on an AUTHORITATIVE SOURCE: the vendor agreement, the
 * channel's current policies, additional programme terms, the channel's communications to
 * Mercenta, programme documentation, the API/developer agreements, trademark permissions,
 * written permissions and account-specific instructions.
 *
 * This module declares that UNIVERSE OF AUTHORITATIVE SOURCES ONCE, together with the
 * GOVERNANCE RULE over them, so the answer to "may Mercenta say this / do this?" comes from
 * one place instead of being re-inferred on each surface. It does NOT re-declare the
 * wording rule itself — that owner is `src/lib/intelligence/amazonWording.ts` (the claims
 * this governance rests on), and the programme status is REUSED from it, never re-typed.
 *
 * THE HONEST POSITION (fail closed)
 * ---------------------------------
 * Mercenta has NOT yet confirmed its programme relationship with the channel, so NONE of
 * the authoritative sources is `verified` today — they are declared `not_held`. The rule is
 * therefore FAIL-CLOSED by construction: a claim may rest only on a source Mercenta
 * actually holds AND has verified, and with zero verified sources NO relationship claim is
 * currently supported. A source unknown to this registry is REFUSED outright.
 *
 * NO AI, no clock, no randomness, no network: this module is fully deterministic.
 */

/** Whether an authoritative source is held and verified. */
export type AmazonSourceStatus = 'not_held' | 'held_unverified' | 'verified';

/** The declared status values, so nothing can invent a fourth. */
export const AMAZON_SOURCE_STATUSES: readonly AmazonSourceStatus[] = ['not_held', 'held_unverified', 'verified'];

/**
 * One authoritative source of the Mercenta ↔ channel relationship. `canonicalOwner` names
 * the codebase owner of the behaviour the document governs — the governance points at it,
 * it does not restate it.
 */
export interface AmazonAuthoritativeSource {
  /** Stable id used by a claim that cites this source. */
  id: string;
  /** Human label of the document. */
  label: string;
  /** What this document governs (what behaviour/claim it constrains). */
  governs: string;
  /** Whether Mercenta currently holds AND has verified it (honest). */
  status: AmazonSourceStatus;
  /** Where the governed behaviour lives in the codebase (or the slot that owns it). */
  canonicalOwner: string;
}

/**
 * THE AUTHORITATIVE SOURCE UNIVERSE — the nine document classes the relationship rests on.
 * All are `not_held` today because the programme relationship is not confirmed with the
 * channel; none is `verified`, so the governance fails closed (no relationship claim is
 * currently supported). Widening any status requires actually holding and verifying the
 * document.
 */
export const AMAZON_AUTHORITATIVE_SOURCES: readonly AmazonAuthoritativeSource[] = [
  {
    id: 'vendor-agreement',
    label: 'Amazon Vendor Central vendor agreement',
    governs: 'The vendor relationship itself and the vendor-of-record terms Mercenta operates under.',
    status: 'not_held',
    canonicalOwner: 'src/lib/intelligence/amazonWording.ts',
  },
  {
    id: 'current-policies',
    label: 'Current channel programme policies',
    governs: 'The channel’s evergreen programme rules and accepted practices.',
    status: 'not_held',
    canonicalOwner: 'src/lib/intelligence/amazonWording.ts',
  },
  {
    id: 'additional-terms',
    label: 'Additional programme terms',
    governs: 'Supplementary terms layered on the base agreement.',
    status: 'not_held',
    canonicalOwner: 'src/lib/intelligence/amazonWording.ts',
  },
  {
    id: 'amazon-communications',
    label: 'Channel communications / account notices',
    governs: 'Account-specific instructions and notices the channel has sent to Mercenta.',
    status: 'not_held',
    canonicalOwner: 'src/lib/intelligence/amazonWording.ts',
  },
  {
    id: 'program-documentation',
    label: 'Programme documentation',
    governs: 'The programme’s own documentation Mercenta relies on for eligibility and process.',
    status: 'not_held',
    canonicalOwner: 'src/lib/intelligence/amazonWording.ts',
  },
  {
    id: 'api-agreements',
    label: 'API / developer agreements',
    governs: 'The terms of the channel API integration (what Mercenta may call and store).',
    status: 'not_held',
    canonicalOwner: 'src/lib/spapi/client.ts',
  },
  {
    id: 'trademark-permissions',
    label: 'Trademark permissions',
    governs: 'Whether and how the channel’s marks may appear in Mercenta’s outward copy.',
    status: 'not_held',
    canonicalOwner: 'src/lib/intelligence/amazonWording.ts',
  },
  {
    id: 'written-permissions',
    label: 'Written permissions / authorisations',
    governs: 'Any written authorisation Mercenta would cite for a claim it cannot otherwise support.',
    status: 'not_held',
    canonicalOwner: 'src/lib/intelligence/amazonWording.ts',
  },
  {
    id: 'account-instructions',
    label: 'Account instructions',
    governs: 'Channel-given operational instructions specific to Mercenta’s account.',
    status: 'not_held',
    canonicalOwner: 'src/lib/intelligence/amazonWording.ts',
  },
];

/**
 * The owner of the programme-relationship STATUS. This module does NOT hold a second copy of
 * it — the resolver reads `AMAZON_PROGRAMME_STATUS` from this file and the gate asserts the
 * two agree (reuse, never duplication).
 */
export const AMAZON_PROGRAMME_STATUS_OWNER = 'src/lib/intelligence/amazonWording.ts';

/* ── Pinned invariants (the properties the summary + the gate assert) ─────── */

/** This module is the ONE owner of the authoritative-source universe + the governance rule. */
export const ONE_AMAZON_GOVERNANCE_OWNER = true;
/** The governance fails closed: no source/claim is ever assumed valid. */
export const AMAZON_GOVERNANCE_FAILS_CLOSED = true;
/** Every authoritative source is declared here — none is inferred on a surface. */
export const AMAZON_AUTHORITATIVE_SOURCES_ARE_DECLARED = true;
/** A source that is not verified cannot support a claim. */
export const UNVERIFIED_SOURCE_BLOCKS_CLAIM = true;
/** The wording safeguard stays in its canonical owner; the governance references it. */
export const AMAZON_GOVERNANCE_REUSES_WORDING_OWNER = true;

export const AMAZON_GOVERNANCE_RULES: readonly string[] = [
  'Every outward retail-channel relationship claim must cite an authoritative source Mercenta actually holds and has verified.',
  'A source that is not verified cannot support a claim — the governance fails closed.',
  'A source id unknown to the registry is refused outright.',
  'The programme-relationship status is not confirmed with the channel, so no relationship claim is presented as fact.',
  'Claim wording must still pass the canonical retail-channel wording safeguard.',
];

export const AMAZON_GOVERNANCE_BASIS =
  'A relationship claim is only as good as the authoritative document behind it. Mercenta declares the nine document classes its retail-channel relationship rests on and applies ONE rule over them: a claim may rest only on a source actually held and verified. The programme relationship is not yet confirmed with the channel, so nothing is verified and every relationship claim currently fails closed.';

export const AMAZON_GOVERNANCE_DISCLAIMER =
  'Listing an authoritative source here is not a statement that Mercenta holds it; the status says whether it is held and verified. No relationship claim is supported until the relevant source is verified.';

/* ── Module-load guards (fail closed) ──────────────────────────────────────── */

{
  if (AMAZON_AUTHORITATIVE_SOURCES.length === 0) {
    throw new Error('[amazonRelationshipGovernance] at least one authoritative source must be declared');
  }
  const statuses = new Set(AMAZON_SOURCE_STATUSES);
  const ids = new Set<string>();
  for (const source of AMAZON_AUTHORITATIVE_SOURCES) {
    if (!source.id || !source.label || !source.governs || !source.canonicalOwner) {
      throw new Error(`[amazonRelationshipGovernance] source "${source.id}" is missing a field`);
    }
    if (ids.has(source.id)) {
      throw new Error(`[amazonRelationshipGovernance] duplicate source id "${source.id}"`);
    }
    ids.add(source.id);
    if (!statuses.has(source.status)) {
      throw new Error(`[amazonRelationshipGovernance] source "${source.id}" has an unknown status "${source.status}"`);
    }
  }
}
