/**
 * §MERCENTA BRAIN — CANONICAL ENTITY / RELATIONSHIP / PROVENANCE MODEL.
 *
 * Mercenta Brain is a first-class PRODUCT SURFACE (§2/§3): an
 * intelligence/navigation/relationship environment that answers
 * "how is everything connected, what do we know, and why?"
 *
 * ARCHITECTURAL CONTRACT (non-negotiable):
 *  - The Brain is NOT a second truth system. Every node is derived from the
 *    canonical domain stores / registries / config that already own that fact.
 *    A node carries a `provenance` pointer back to what produced it.
 *  - Agents do not own authoritative business state. Domain services do. The
 *    `authority` field records WHERE a thing's authority actually sits
 *    (`code` | `automation` | `agent` | `mixed` | `human`) — it never grants
 *    authority to the Brain itself.
 *  - UNKNOWN is stated as UNKNOWN, an inference as INFERENCE, a simulation as
 *    SIMULATION, a verified fact as VERIFIED. Nothing is silently promoted
 *    from one to another (§6).
 *  - Tenant isolation is enforced in the BUILDER, not in the view: a
 *    `brand`-scoped graph is constructed from tenant-filtered sources and can
 *    never contain another brand, a prospect, or Mercenta-internal machinery
 *    (§8). There is deliberately no runtime "filter switch" a caller could set
 *    wrongly — the scope is an explicit union and the builder fails closed.
 */
import type { PaletteDomain } from '@/config/themes';
import type { StatusTone } from '@/components/ui';

/**
 * The canonical entity kinds the Brain can represent. Where the repository
 * already has a canonical entity, its name here MATCHES it (compliance
 * documents, product submissions, etc. are not duplicated — see `buildGraph.ts`).
 */
export type BrainEntityKind =
  /* people + organisations */
  | 'founder'
  | 'brand'
  | 'prospect'
  | 'contact'
  /* catalogue */
  | 'product'
  | 'asin'
  | 'sku'
  | 'document'
  /* commerce */
  | 'purchase_order'
  | 'po_line'
  | 'shipment'
  | 'invoice'
  | 'payment'
  | 'payout'
  | 'case'
  | 'conversation'
  /* governance */
  | 'rule'
  | 'policy'
  | 'decision'
  | 'workflow'
  | 'loa'
  | 'compliance_object'
  | 'commercial_readiness'
  | 'contract'
  /* platform */
  | 'amazon'
  | 'integration'
  | 'provider'
  | 'automation'
  | 'agent'
  | 'knowledge'
  | 'campaign'
  | 'source'
  | 'evidence';

/** Visual/IA grouping. Clusters are how a human navigates the graph. */
export type BrainCluster = 'portfolio' | 'catalogue' | 'commerce' | 'governance' | 'platform';

/** Where authority over this object's state actually sits (§7/§24). */
export type BrainAuthority = 'code' | 'automation' | 'agent' | 'mixed' | 'human';

/**
 * The epistemic status of a node (§6). NEVER collapse these four into two:
 * a simulation is not a live fact, and an inference is not a verification.
 */
export type BrainKnowledgeStatus = 'verified' | 'simulation' | 'inference' | 'unknown';

export interface BrainKindDefinition {
  kind: BrainEntityKind;
  /** Human label, singular. */
  label: string;
  cluster: BrainCluster;
  /** Canonical domain colour binding (src/config/themes.ts DOMAIN_COLOURS). */
  domain: PaletteDomain;
  /** The default authority for this kind, overridable per node. */
  authority: BrainAuthority;
  /** Why this kind exists / what it is an instance of. */
  note: string;
}

/**
 * The kind catalogue. This is the ONLY place an entity kind's presentation is
 * declared — a component never re-derives it.
 */
export const BRAIN_KIND_DEFINITIONS: Record<BrainEntityKind, BrainKindDefinition> = {
  founder: { kind: 'founder', label: 'Founder', cluster: 'portfolio', domain: 'communications', authority: 'human', note: 'The human authority above system authority.' },
  brand: { kind: 'brand', label: 'Brand', cluster: 'portfolio', domain: 'communications', authority: 'human', note: 'Canonical tenant (ALL_DEMO_BRANDS).' },
  prospect: { kind: 'prospect', label: 'Prospect', cluster: 'portfolio', domain: 'intelligence', authority: 'code', note: 'Canonical BrandProspect. A prospect is NOT a brand (§23).' },
  contact: { kind: 'contact', label: 'Contact', cluster: 'portfolio', domain: 'communications', authority: 'code', note: 'Prospect decision-maker (ProspectContact).' },
  product: { kind: 'product', label: 'Product', cluster: 'catalogue', domain: 'catalogue', authority: 'code', note: 'Canonical Product / DemoProduct.' },
  asin: { kind: 'asin', label: 'ASIN', cluster: 'catalogue', domain: 'intelligence', authority: 'code', note: 'Retail-channel identifier (ProspectASIN / ProductSubmission.asin).' },
  sku: { kind: 'sku', label: 'SKU', cluster: 'catalogue', domain: 'catalogue', authority: 'code', note: 'The brand SKU a PO line is raised against.' },
  document: { kind: 'document', label: 'Document', cluster: 'catalogue', domain: 'compliance', authority: 'code', note: 'Compliance document record + verification state.' },
  purchase_order: { kind: 'purchase_order', label: 'Purchase order', cluster: 'commerce', domain: 'orders', authority: 'mixed', note: 'External retail-channel identity + Mercenta routing. The brand decision is an INSTRUCTION to Mercenta.' },
  po_line: { kind: 'po_line', label: 'PO line', cluster: 'commerce', domain: 'orders', authority: 'code', note: 'Line-level acknowledgement is the real unit of channel truth.' },
  shipment: { kind: 'shipment', label: 'Shipment', cluster: 'commerce', domain: 'logistics', authority: 'mixed', note: 'PO-gated shipment + ASN.' },
  invoice: { kind: 'invoice', label: 'Invoice', cluster: 'commerce', domain: 'finance', authority: 'code', note: 'CommerceInvoice raised against a PO.' },
  payment: { kind: 'payment', label: 'Payment', cluster: 'commerce', domain: 'finance', authority: 'code', note: 'CommercePayment settling an invoice (simulated bank transfer in the demo).' },
  payout: { kind: 'payout', label: 'Payout', cluster: 'commerce', domain: 'finance', authority: 'human', note: 'A payout NEVER leaves Mercenta without explicit human approval.' },
  case: { kind: 'case', label: 'Case', cluster: 'commerce', domain: 'communications', authority: 'mixed', note: 'Canonical Mercenta case / brand support request (Ticket). The brand never contacts the channel directly.' },
  conversation: { kind: 'conversation', label: 'Conversation', cluster: 'commerce', domain: 'communications', authority: 'code', note: 'Canonical Message threads — there is no second conversation store.' },
  rule: { kind: 'rule', label: 'Rule', cluster: 'governance', domain: 'compliance', authority: 'code', note: 'Deterministic domain rule (e.g. compliance requirement, acknowledgement window).' },
  policy: { kind: 'policy', label: 'Policy', cluster: 'governance', domain: 'compliance', authority: 'human', note: 'Founder/business policy declared once in config.' },
  decision: { kind: 'decision', label: 'Decision', cluster: 'governance', domain: 'compliance', authority: 'human', note: 'A recorded human decision (approval gate, review, override).' },
  workflow: { kind: 'workflow', label: 'Workflow', cluster: 'governance', domain: 'finance', authority: 'code', note: 'A canonical declared workflow (COMMERCIAL_READINESS_WORKFLOW_ID) — the repeatable process a record was raised under.' },
  loa: { kind: 'loa', label: 'LOA', cluster: 'governance', domain: 'compliance', authority: 'human', note: 'letter_of_authorization — universal base requirement and a hard gate.' },
  compliance_object: { kind: 'compliance_object', label: 'Compliance gate', cluster: 'governance', domain: 'compliance', authority: 'code', note: 'Category-aware, fail-closed compliance state for a product/brand.' },
  commercial_readiness: { kind: 'commercial_readiness', label: 'Commercial readiness', cluster: 'governance', domain: 'finance', authority: 'code', note: 'Canonical CommercialReadinessRecord — route decision, never re-derived here.' },
  contract: { kind: 'contract', label: 'Contract', cluster: 'governance', domain: 'compliance', authority: 'human', note: 'Distribution agreement / NDA / rate-card addendum.' },
  amazon: { kind: 'amazon', label: 'Retail channel', cluster: 'platform', domain: 'intelligence', authority: 'code', note: 'The retail channel Mercenta operates. Programme status is not_confirmed_with_amazon — never overstated.' },
  integration: { kind: 'integration', label: 'Integration', cluster: 'platform', domain: 'orders', authority: 'code', note: 'Registered integration (INTEGRATION_REGISTRY).' },
  provider: { kind: 'provider', label: 'Provider', cluster: 'platform', domain: 'orders', authority: 'code', note: 'An external provider whose mode must resolve positively to be simulation-safe.' },
  automation: { kind: 'automation', label: 'Automation', cluster: 'platform', domain: 'orders', authority: 'automation', note: 'Canonical automation registry entry — orchestrates repeatable work.' },
  agent: { kind: 'agent', label: 'Agent', cluster: 'platform', domain: 'intelligence', authority: 'agent', note: 'Bounded reasoning seam. Reasons only; owns no authoritative state.' },
  knowledge: { kind: 'knowledge', label: 'Knowledge', cluster: 'platform', domain: 'intelligence', authority: 'code', note: 'Canonical knowledge base article.' },
  campaign: { kind: 'campaign', label: 'Campaign', cluster: 'platform', domain: 'communications', authority: 'mixed', note: 'Ad/social campaign record.' },
  source: { kind: 'source', label: 'Source', cluster: 'platform', domain: 'intelligence', authority: 'code', note: 'Where a claim was observed.' },
  evidence: { kind: 'evidence', label: 'Evidence', cluster: 'platform', domain: 'intelligence', authority: 'code', note: 'Canonical observation with URL + confidence. Evidence supports a claim; it is not a fact on its own.' },
};

/* ── Nodes ────────────────────────────────────────────────────────────── */

export interface BrainProperty {
  label: string;
  value: string;
  /** True when the value could not be resolved from a canonical source. */
  unresolved?: boolean;
}

export interface BrainProvenance {
  /** What kind of source produced this node. */
  origin: 'domain_store' | 'registry' | 'config' | 'runtime_state' | 'document';
  /** The exact canonical module / accessor, e.g. `demoStore.demoPurchaseOrders`. */
  ref: string;
  /** ISO timestamp of the record, when the source carries one. */
  asOf?: string;
}

export interface BrainNode {
  /** Stable identity: `<kind>:<canonicalRef>`. */
  id: string;
  kind: BrainEntityKind;
  label: string;
  subtitle?: string;
  /** The canonical record identifier this node projects (never a copy). */
  ref?: string;
  /** Owning tenant. `null` means Mercenta-wide (never shown to a brand). */
  tenantId: string | null;
  status: BrainKnowledgeStatus;
  authority: BrainAuthority;
  provenance: BrainProvenance;
  properties: BrainProperty[];
  tone?: StatusTone;
  /** Truthful simulation flag of the underlying record, when the source states one. */
  simulated?: boolean;
}

/* ── Relationships ────────────────────────────────────────────────────── */

export type BrainRelationKind =
  | 'owns'
  | 'maps_to'
  | 'authorised_by'
  | 'sends'
  | 'belongs_to'
  | 'contains'
  | 'concerns'
  | 'fulfils'
  | 'relates_to'
  | 'settles'
  | 'governs'
  | 'supports'
  | 'changes'
  | 'uses'
  | 'executes'
  | 'approved'
  | 'derived_from'
  | 'escalates_to'
  | 'reviews'
  | 'pays_via';

export interface BrainRelationDefinition {
  kind: BrainRelationKind;
  /** Forward label, e.g. "owns". */
  label: string;
  /** Why the relationship exists in the operating model. */
  note: string;
}

export const BRAIN_RELATION_DEFINITIONS: Record<BrainRelationKind, BrainRelationDefinition> = {
  owns: { kind: 'owns', label: 'owns', note: 'Tenant ownership — enforced by the domain, not by the graph.' },
  maps_to: { kind: 'maps_to', label: 'maps to', note: 'Identity mapping between two canonical identifiers.' },
  authorised_by: { kind: 'authorised_by', label: 'authorised by', note: 'LOA / agreement authority for Mercenta to act.' },
  sends: { kind: 'sends', label: 'sends', note: 'The retail channel issues an order to Mercenta.' },
  belongs_to: { kind: 'belongs_to', label: 'belongs to', note: 'Tenant membership of an operational record.' },
  contains: { kind: 'contains', label: 'contains', note: 'Composition (a PO contains lines; a line names a SKU).' },
  concerns: { kind: 'concerns', label: 'concerns', note: 'A case concerns a real operational record.' },
  fulfils: { kind: 'fulfils', label: 'fulfils', note: 'A shipment fulfils a purchase order.' },
  relates_to: { kind: 'relates_to', label: 'relates to', note: 'A recorded relationship between two canonical records.' },
  settles: { kind: 'settles', label: 'settles', note: 'A payment settles an invoice.' },
  governs: { kind: 'governs', label: 'governs', note: 'A rule determines whether something may proceed.' },
  supports: { kind: 'supports', label: 'supports', note: 'Evidence supports a claim — it never becomes the claim.' },
  changes: { kind: 'changes', label: 'changes', note: 'A human decision changes a rule or state.' },
  uses: { kind: 'uses', label: 'uses', note: 'A mechanism reads canonical knowledge.' },
  executes: { kind: 'executes', label: 'executes', note: 'Automation executes repeatable work.' },
  approved: { kind: 'approved', label: 'approved', note: 'A human gate approved an action.' },
  derived_from: { kind: 'derived_from', label: 'derived from', note: 'Provenance: this node was derived from that record.' },
  escalates_to: { kind: 'escalates_to', label: 'escalates to', note: 'Mercenta review escalates to the channel — never the brand directly.' },
  reviews: { kind: 'reviews', label: 'reviews', note: 'Mercenta reviews before anything external happens.' },
  pays_via: { kind: 'pays_via', label: 'pays via', note: 'Payout rail — Mercenta never substitutes a rail silently.' },
};

export interface BrainEdge {
  id: string;
  from: string;
  to: string;
  kind: BrainRelationKind;
  /** Why this edge exists, naming the canonical field that proves it. */
  evidence: string;
  status: BrainKnowledgeStatus;
}

/* ── Graph ────────────────────────────────────────────────────────────── */

export type BrainScope = { kind: 'mercenta' } | { kind: 'brand'; tenantId: string };

export interface BrainClusterSummary {
  cluster: BrainCluster;
  label: string;
  nodeCount: number;
  kinds: { kind: BrainEntityKind; count: number }[];
}

export interface BrainGraph {
  scope: BrainScope;
  nodes: BrainNode[];
  edges: BrainEdge[];
  clusters: BrainClusterSummary[];
  /** Honest, non-optional statement of what this graph does NOT contain. */
  exclusions: string[];
}

export const BRAIN_CLUSTER_LABELS: Record<BrainCluster, string> = {
  portfolio: 'Portfolio',
  catalogue: 'Catalogue',
  commerce: 'Commerce',
  governance: 'Governance',
  platform: 'Platform',
};

/** Canonical knowledge-status presentation — the four states are never merged. */
export const BRAIN_STATUS_LABELS: Record<BrainKnowledgeStatus, string> = {
  verified: 'VERIFIED',
  simulation: 'SIMULATION',
  inference: 'INFERENCE',
  unknown: 'UNKNOWN',
};

export const BRAIN_STATUS_TONES: Record<BrainKnowledgeStatus, StatusTone> = {
  verified: 'success',
  simulation: 'info',
  inference: 'warning',
  unknown: 'neutral',
};

export const BRAIN_AUTHORITY_LABELS: Record<BrainAuthority, string> = {
  code: 'CODE',
  automation: 'AUTOMATION',
  agent: 'AGENT',
  mixed: 'MIXED',
  human: 'HUMAN',
};

export const BRAIN_AUTHORITY_NOTES: Record<BrainAuthority, string> = {
  code: 'Deterministic domain code owns this state. No reasoning is required.',
  automation: 'Repeatable work is orchestrated by the canonical automation registry.',
  agent: 'Reasoning is required. The agent interprets; it never mutates authoritative state.',
  mixed: 'Code owns the state; a human decision or an external counterpart completes the loop.',
  human: 'Authority sits with a human. The system stops and waits.',
};

/** Stable node id — deterministic, never random. */
export function brainNodeId(kind: BrainEntityKind, ref: string): string {
  return `${kind}:${ref}`;
}

/** Stable edge id — deterministic, never random. */
export function brainEdgeId(from: string, to: string, kind: BrainRelationKind): string {
  return `${from}->${to}:${kind}`;
}