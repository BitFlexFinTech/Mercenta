/**
 * §MERCENTA BRAIN — DETERMINISTIC GRAPH BUILDER.
 *
 * THE ONE RULE THIS FILE EXISTS TO ENFORCE: the Brain is a PROJECTION of the
 * canonical domain, never a second source of truth. Every node names the
 * canonical module/accessor it was read from (`provenance.ref`), every edge
 * names the canonical field that proves it (`edge.evidence`), and nothing is
 * inferred into a fact.
 *
 * DETERMINISM: no `Math.random()`, no `Date.now()`-derived identity. Node ids
 * are `<kind>:<canonicalRef>` and edge ids are `<from>-><to>:<kind>`, so the
 * graph is byte-identical across reloads for identical domain state — which is
 * what makes it testable and what makes the browser suite meaningful.
 *
 * TENANT SAFETY (§8) — enforced HERE, not in the view. A `brand` scope is built
 * from strict tenant filters and REFUSES (empty graph, stated reason) rather
 * than guessing when the tenant is unknown. A brand graph can never contain a
 * prospect, another brand, or Mercenta-internal machinery (automations, agents,
 * integrations, policies), because the builder never runs those branches.
 */
import {
  ALL_DEMO_BRANDS,
  type DemoBrand,
} from '@/data/demoData';
import {
  demoAdCampaigns,
  demoCommerceInvoices,
  demoCommercePayments,
  demoComplianceDocs,
  demoContracts,
  demoMessages,
  demoProductSubmissions,
  demoProducts,
  demoPurchaseOrders,
  demoShipments,
} from '@/data/demoStore';
import { ensureProspectStore, getProspects } from '@/data/prospectStore';
import { normalizeBrandKey } from '@/lib/intelligence/prospectPipeline';
import { demoTickets } from '@/lib/helpdesk/ticketStore';
import { KB_ARTICLES } from '@/data/knowledgeBase';
import {
  allCommercialReadinessRecords,
  tenantIdForReadiness,
} from '@/data/commercialReadinessStore';
import { COMMERCIAL_GATE_ID, COMMERCIAL_READINESS_WORKFLOW_ID } from '@/config/commercialReadiness';
import {
  AUTOMATION_ORDER,
  AUTOMATION_REGISTRY,
  allApprovals,
  automationHalt,
} from '@/lib/automation/registry';
import {
  INTEGRATION_META,
  INTEGRATION_ORDER,
  INTEGRATION_REGISTRY,
  defaultIntegrationMode,
} from '@/integrations/registry';
import { isProviderSimulationSafe } from '@/integrations/types';
import { CATEGORY_DOC_LABELS, getComplianceRequirements } from '@/lib/compliance';
import { MERCENTA_INTENTS } from '@/lib/ai/founderOpsAi';
import { VAT_TREATMENT_CONFIGURED } from '@/config/commercial';
import { AMAZON_PROGRAMME_STATUS } from '@/lib/intelligence/amazonWording';
import {
  DEFAULT_PAYOUT_RAIL,
  NON_PAYOUT_RAIL_PROVIDERS,
  PAYOUT_RAIL_ORDER,
  PAYOUT_RAILS,
  PAYOUT_REQUIRES_HUMAN_APPROVAL,
  SECONDARY_PAYOUT_RAIL,
  payoutRailDefinition,
} from '@/config/payouts';
import {
  AMAZON_PARTNERED_CARRIER,
  MERCENTA_CARRIER_ACCOUNTS,
  SHIPPING_COMMERCIAL_TERMS,
} from '@/config/shipping';
import { APPROVED_CATEGORIES, type ApprovedCategory } from '@/types';
import {
  BRAIN_CLUSTER_LABELS,
  BRAIN_KIND_DEFINITIONS,
  brainEdgeId,
  brainNodeId,
  type BrainCluster,
  type BrainClusterSummary,
  type BrainEdge,
  type BrainEntityKind,
  type BrainGraph,
  type BrainKnowledgeStatus,
  type BrainNode,
  type BrainProperty,
  type BrainProvenance,
  type BrainRelationKind,
  type BrainScope,
} from './types';

/** Compact property builder. */
function prop(label: string, value: string | number | null | undefined, unresolved = false): BrainProperty {
  const present = value !== null && value !== undefined && value !== '';
  return { label, value: present ? String(value) : 'UNKNOWN', unresolved: unresolved || !present };
}

interface NodeInput {
  kind: BrainEntityKind;
  ref: string;
  label: string;
  subtitle?: string;
  tenantId: string | null;
  status?: BrainKnowledgeStatus;
  authority?: BrainNode['authority'];
  provenance: BrainProvenance;
  properties?: BrainProperty[];
  simulated?: boolean;
}

/**
 * Create a node using the kind's canonical cluster/domain defaults. Node ids are
 * derived from the canonical ref so two calls for the same record collapse to
 * one identity (that is why the builder de-duplicates by id at the end).
 */
function makeNode(input: NodeInput): BrainNode {
  const def = BRAIN_KIND_DEFINITIONS[input.kind];
  const node: BrainNode = {
    id: brainNodeId(input.kind, input.ref),
    kind: input.kind,
    label: input.label,
    subtitle: input.subtitle,
    ref: input.ref,
    tenantId: input.tenantId,
    status: input.status ?? 'verified',
    authority: input.authority ?? def.authority,
    provenance: input.provenance,
    properties: input.properties ?? [],
  };
  if (input.simulated !== undefined) node.simulated = input.simulated;
  return node;
}

/** Domain binding for presentation, resolved from the ONE kind catalogue. */
export function brainClusterOf(kind: BrainEntityKind): BrainCluster {
  return BRAIN_KIND_DEFINITIONS[kind].cluster;
}

export function brainDomainOf(kind: BrainEntityKind) {
  return BRAIN_KIND_DEFINITIONS[kind].domain;
}

/**
 * Working set: identity de-duplication for nodes, and DROPPED (not silently
 * kept) edges whose endpoint does not exist. An edge with a missing endpoint is
 * a bug in the builder, and the validator fails on it rather than the UI hiding
 * it — so `finish()` reports how many were dropped.
 */
class GraphDraft {
  private nodes = new Map<string, BrainNode>();
  private edges = new Map<string, BrainEdge>();

  add(node: BrainNode): void {
    const existing = this.nodes.get(node.id);
    if (existing) {
      // Same canonical identity reached by two paths: keep the richer record.
      if ((node.properties?.length ?? 0) > (existing.properties?.length ?? 0)) {
        this.nodes.set(node.id, node);
      }
      return;
    }
    this.nodes.set(node.id, node);
  }

  link(
    from: string,
    to: string,
    kind: BrainRelationKind,
    evidence: string,
    status: BrainKnowledgeStatus = 'verified'
  ): void {
    const id = brainEdgeId(from, to, kind);
    if (this.edges.has(id)) return;
    this.edges.set(id, { id, from, to, kind, evidence, status });
  }

  /** How many edges were dropped because an endpoint was never created. */
  droppedEdges = 0;

  finish(scope: BrainScope, exclusions: string[]): BrainGraph {
    const known = new Set(this.nodes.keys());
    const edges: BrainEdge[] = [];
    for (const e of this.edges.values()) {
      if (known.has(e.from) && known.has(e.to)) edges.push(e);
      else this.droppedEdges += 1;
    }
    const nodes = [...this.nodes.values()];
    const byCluster = new Map<BrainCluster, BrainNode[]>();
    for (const n of nodes) {
      const cluster = brainClusterOf(n.kind);
      const list = byCluster.get(cluster) ?? [];
      list.push(n);
      byCluster.set(cluster, list);
    }
    const clusters: BrainClusterSummary[] = ([
      'portfolio',
      'catalogue',
      'commerce',
      'governance',
      'platform',
    ] as BrainCluster[]).map((cluster) => {
      const list = byCluster.get(cluster) ?? [];
      const counts = new Map<BrainEntityKind, number>();
      for (const n of list) counts.set(n.kind, (counts.get(n.kind) ?? 0) + 1);
      return {
        cluster,
        label: BRAIN_CLUSTER_LABELS[cluster],
        nodeCount: list.length,
        kinds: [...counts.entries()]
          .map(([kind, count]) => ({ kind, count }))
          .sort((a, b) => b.count - a.count || a.kind.localeCompare(b.kind)),
      };
    });
    return { scope, nodes, edges, clusters, exclusions };
  }
}

/** Fail-closed graph for an unknown tenant — no data, stated reason. */
function refusedGraph(tenantId: string): BrainGraph {
  return {
    scope: { kind: 'brand', tenantId },
    nodes: [],
    edges: [],
    clusters: [],
    exclusions: [
      `Tenant "${tenantId}" is not a canonical brand. The Brain fails closed rather than showing Mercenta-wide data.`,
    ],
  };
}

/* ── Portfolio layer: the brands themselves — both scopes ─────────────────── */

/**
 * Brand nodes. Called by BOTH scopes, because every other layer attaches to a
 * brand by id — without this the tenant edges would be dropped as
 * endpoint-less, which is exactly the failure the runtime harness caught.
 */
function addPortfolioLayer(draft: GraphDraft, brands: DemoBrand[], mercenta: boolean): void {
  for (const brand of brands) {
    const brandId = brainNodeId('brand', brand.id);
    draft.add(
      makeNode({
        kind: 'brand',
        ref: brand.id,
        label: brand.name,
        subtitle: `${brand.category} · ${brand.market === 'uk' ? 'UK' : 'International'}`,
        tenantId: brand.id,
        status: 'verified',
        provenance: { origin: 'domain_store', ref: 'src/data/demoData.ts ALL_DEMO_BRANDS' },
        properties: [
          prop('Category', brand.category),
          prop(
            'Approved category',
            APPROVED_CATEGORIES.includes(brand.category as ApprovedCategory)
              ? 'Yes'
              : 'NO — outside the ten approved categories',
            !APPROVED_CATEGORIES.includes(brand.category as ApprovedCategory)
          ),
          prop('Market', brand.market === 'uk' ? 'United Kingdom' : 'International'),
          prop('Nation', brand.nation),
          prop('Commercial model', brand.commercialModel),
          prop('Fulfilment track', brand.track),
          prop('Contract status', brand.contractStatus),
          prop('Website', brand.website),
        ],
      })
    );
    if (mercenta) {
      draft.link(FOUNDER_ID, brandId, 'owns', 'Every brand tenant sits under Mercenta.');
    }
  }
}

/* ── Platform layer (MERCENTA SCOPE ONLY — never projected into a brand graph) ── */

const FOUNDER_ID = brainNodeId('founder', 'founder');
const AMAZON_ID = brainNodeId('amazon', 'amazon_uk_vendor');
const AGENT_ID = brainNodeId('agent', 'founder_reasoning_seam');

function addPlatformLayer(draft: GraphDraft): void {
  /* Founder — the human authority above system authority. */
  draft.add(
    makeNode({
      kind: 'founder',
      ref: 'founder',
      label: 'Founder / Super Admin',
      subtitle: 'Human authority',
      tenantId: null,
      status: 'verified',
      provenance: { origin: 'config', ref: 'src/context/GlobalStateContext.tsx (role model: super_admin)' },
      properties: [
        prop('Authority', 'Human — the automated chain stops where system authority ends'),
        prop('Payout approval roles', 'super_admin, admin_staff (src/config/payouts.ts)'),
      ],
    })
  );

  /* Retail channel is added by addChannelLayer() — shared by both scopes. */

  /* Integrations + their declared providers. Mode is the CANONICAL default
     resolution; runtime connection state is owned by the Integrations Hub. */
  for (const id of INTEGRATION_ORDER) {
    const def = INTEGRATION_REGISTRY[id];
    const meta = INTEGRATION_META[id];
    const mode = defaultIntegrationMode(id);
    const safe = isProviderSimulationSafe(mode);
    const integrationNodeId = brainNodeId('integration', id);
    draft.add(
      makeNode({
        kind: 'integration',
        ref: id,
        label: def.name,
        subtitle: meta.category,
        tenantId: null,
        /* Only a POSITIVELY resolved `simulation` is simulation-safe; anything
           else is UNKNOWN here because no live connection state was consulted. */
        status: safe ? 'simulation' : 'unknown',
        provenance: { origin: 'registry', ref: 'src/integrations/registry.ts defaultIntegrationMode' },
        properties: [
          prop('Category', meta.category),
          prop('Default mode', mode),
          prop('Simulation-safe', safe ? 'Yes — positively resolved simulation' : 'No — treated as UNKNOWN/unsafe'),
          prop('Purpose', def.description),
          prop('Credential hint', meta.demoKeyHint ? 'A developer key hint is declared (value never read or shown)' : 'None declared'),
        ],
      })
    );
    draft.link(FOUNDER_ID, integrationNodeId, 'owns', 'Super Admin controls integration activation.');

    for (const option of def.providerOptions ?? []) {
      const providerNodeId = brainNodeId('provider', option.id);
      const providerMode = defaultIntegrationMode(option.id);
      const providerSafe = isProviderSimulationSafe(providerMode);
      draft.add(
        makeNode({
          kind: 'provider',
          ref: option.id,
          label: option.label,
          subtitle: 'Declared provider option',
          tenantId: null,
          status: providerSafe ? 'simulation' : 'unknown',
          provenance: { origin: 'registry', ref: `INTEGRATION_REGISTRY.${id}.providerOptions` },
          properties: [
            prop('Resolved mode', providerMode, providerMode === 'not_registered'),
            prop('Simulation-safe', providerSafe ? 'Yes' : 'No — must not be treated as simulation'),
          ],
        })
      );
      draft.link(integrationNodeId, providerNodeId, 'relates_to', `${id}.providerOptions declares this provider.`);
    }
  }

  /* Automations — execution + authority + failure mode, read from the registry. */
  const halt = automationHalt();
  for (const id of AUTOMATION_ORDER) {
    const def = AUTOMATION_REGISTRY[id];
    const automationId = brainNodeId('automation', id);
    draft.add(
      makeNode({
        kind: 'automation',
        ref: id,
        label: def.name,
        subtitle: def.domain,
        tenantId: null,
        status: 'verified',
        provenance: { origin: 'registry', ref: 'src/lib/automation/registry.ts AUTOMATION_REGISTRY' },
        properties: [
          prop('Purpose', def.description),
          prop('Cadence', `${def.cadence} (${def.cadenceDays}d)`),
          prop('Entry point', def.entryPoint),
          prop('Deterministic', def.deterministic ? 'Yes' : 'No'),
          prop('AI required', def.requiresAi ? 'Optional — degrades to deterministic' : 'No'),
          prop('Approval gate', def.approvalRequired ? 'Yes — stops at blocked_approval' : 'No'),
          prop('Tenant scoped', def.tenantScoped ? 'Yes' : 'No'),
          prop('Idempotency key', def.idempotencyKey),
          prop('Failure mode', 'Recorded as failed with the real error; retryable, never fake success'),
          prop('Manual fallback', 'The declared entry point is invocable by the operator'),
          prop('Kill switch', halt.halted ? `HALTED — ${halt.reason}` : 'Available (one global halt)'),
          prop('Cost policy', def.costNote),
        ],
      })
    );
    draft.link(
      FOUNDER_ID,
      automationId,
      'owns',
      def.approvalRequired
        ? 'A consequential decision stops at blocked_approval until a human decides.'
        : 'Runs under Founder-configured enable/disable state.'
    );

    for (const providerId of def.externalProviders) {
      if (INTEGRATION_ORDER.includes(providerId as (typeof INTEGRATION_ORDER)[number])) {
        draft.link(
          automationId,
          brainNodeId('integration', providerId),
          'uses',
          `AUTOMATION_REGISTRY.${id}.externalProviders declares ${providerId}.`
        );
      }
    }
  }

  /* The bounded reasoning seam. Reasons; owns NO authoritative state. */
  draft.add(
    makeNode({
      kind: 'agent',
      ref: 'founder_reasoning_seam',
      label: 'Founder reasoning seam',
      subtitle: 'Bounded AI — reasoning only',
      tenantId: null,
      status: 'unknown',
      provenance: { origin: 'registry', ref: 'src/lib/ai/founderAiClient.ts (Deterministic | RealOpenRouter)' },
      properties: [
        prop('Live model', null, true),
        prop('Availability', 'Resolved at runtime by aiAvailability()'),
        prop('Declared intents', MERCENTA_INTENTS.map((i) => i.id).join(', ')),
        prop('Mutation capability', 'NONE — the agent cannot write authoritative business state'),
        prop('External action capability', 'NONE — it returns a structured result for domain code'),
        prop('Human gate', 'Any consequential action returns to a human decision'),
        prop('Manual fallback', 'The deterministic client answers when no model is available'),
      ],
    })
  );
  for (const id of AUTOMATION_ORDER) {
    if (AUTOMATION_REGISTRY[id].requiresAi) {
      draft.link(
        brainNodeId('automation', id),
        AGENT_ID,
        'uses',
        `AUTOMATION_REGISTRY.${id}.requiresAi is declared true.`
      );
    }
  }
}

/* ── Governance layer (policies) — MERCENTA SCOPE ONLY ────────────────────── */

/** Render a declared config object's own fields — never a restated copy. */
function configFields(source: object): BrainProperty[] {
  return Object.entries(source).map(([k, v]) =>
    prop(k, typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v))
  );
}

function addPoliciesLayer(draft: GraphDraft): void {
  /* Policies — declared ONCE in config, read here, never restated. */
  const policies: { ref: string; label: string; detail: BrainProperty[] }[] = [
    {
      ref: 'vat_treatment',
      label: 'VAT treatment',
      detail: [
        prop('Production treatment configured', VAT_TREATMENT_CONFIGURED ? 'Yes' : 'No — fail-closed'),
        prop('Rule', 'No production tax figure is computed until the business decides'),
      ],
    },
    {
      ref: 'payout_rails',
      label: 'Payout rail policy',
      detail: [
        prop('Default rail', `${PAYOUT_RAILS[DEFAULT_PAYOUT_RAIL].label} (${DEFAULT_PAYOUT_RAIL})`),
        prop('Secondary rail', `${PAYOUT_RAILS[SECONDARY_PAYOUT_RAIL].label} (${SECONDARY_PAYOUT_RAIL})`),
        prop('Human approval required', PAYOUT_REQUIRES_HUMAN_APPROVAL ? 'Yes — always' : 'No'),
        prop('Refused as payout rails', NON_PAYOUT_RAIL_PROVIDERS.join(', ') + ' (Stripe bills the subscription only)'),
        prop('Silent substitution', 'FORBIDDEN — an unavailable rail fails into review'),
      ],
    },
    {
      ref: 'shipping_commercial_terms',
      label: 'Shipping commercial terms',
      detail: [
        prop('Mercenta carrier accounts', MERCENTA_CARRIER_ACCOUNTS.join(', ')),
        prop('Channel-partnered carrier', AMAZON_PARTNERED_CARRIER),
        ...configFields(SHIPPING_COMMERCIAL_TERMS),
        prop('Universal mark-up rule', 'NONE — every term is configurable'),
      ],
    },
    {
      ref: 'amazon_wording',
      label: 'Channel wording safeguards',
      detail: [
        prop('Programme status', AMAZON_PROGRAMME_STATUS),
        prop('Rule', 'No claim of a channel programme, permission or guarantee may be asserted'),
      ],
    },
  ];
  for (const p of policies) {
    draft.add(
      makeNode({
        kind: 'policy',
        ref: p.ref,
        label: p.label,
        subtitle: 'Founder/business policy',
        tenantId: null,
        status: 'verified',
        provenance: { origin: 'config', ref: 'src/config (declared policy)' },
        properties: p.detail,
      })
    );
    draft.link(FOUNDER_ID, brainNodeId('policy', p.ref), 'owns', "Business policy is the Founder's authority.");
  }
}

/* ── Channel + rules + knowledge — SHARED (both scopes) ───────────────────── */

/** The retail channel: the counterpart Mercenta operates on the brand's behalf. */
function addChannelLayer(draft: GraphDraft): void {
  draft.add(
    makeNode({
      kind: 'amazon',
      ref: 'amazon_uk_vendor',
      label: 'Retail channel (Amazon UK Vendor)',
      subtitle: 'Operated by Mercenta, not by the brand',
      tenantId: null,
      status: 'verified',
      provenance: { origin: 'config', ref: 'src/lib/intelligence/amazonWording.ts' },
      properties: [
        prop('Programme status', AMAZON_PROGRAMME_STATUS, true),
        prop('Operating model', 'Brand → Mercenta → channel; channel → Mercenta → brand'),
        prop('Direct brand↔channel path', 'NONE — every external action is Mercenta-mediated'),
      ],
    })
  );
}

function addRulesLayer(draft: GraphDraft): void {
  for (const req of getComplianceRequirements()) {
    const isLoa = req.type === 'letter_of_authorization';
    const kind: BrainEntityKind = isLoa ? 'loa' : 'rule';
    const ref = isLoa ? 'letter_of_authorization' : `compliance:${req.type}`;
    draft.add(
      makeNode({
        kind,
        ref,
        label: CATEGORY_DOC_LABELS[req.type] ?? req.type,
        subtitle: isLoa ? 'Universal base requirement — hard gate' : `${req.scope} requirement`,
        tenantId: null,
        status: 'verified',
        provenance: { origin: 'registry', ref: 'src/lib/compliance.ts getComplianceRequirements' },
        properties: [
          prop('Document type', req.type),
          prop('Scope', req.scope),
          prop('Rationale', req.rationale),
          prop('Condition', req.conditionDescription ?? 'Applies unconditionally'),
          prop(
            'Bypassable by admin approval',
            'NO — manual approval overrides workflow state, not regulatory requirements'
          ),
        ],
      })
    );
    draft.link(
      brainNodeId(kind, ref),
      AMAZON_ID,
      'governs',
      'Mercenta acts as vendor of record, so compliance is gated before anything reaches the channel.'
    );
  }
}

/* ── Payout rails, recorded human decisions, and canonical knowledge ───────── */

function addDecisionLayer(draft: GraphDraft): void {
  /* Payout rails — providers with a Founder-held, human-gated release. */
  for (const rail of PAYOUT_RAIL_ORDER) {
    const def = payoutRailDefinition(rail);
    const railId = brainNodeId('provider', rail);
    draft.add(
      makeNode({
        kind: 'provider',
        ref: rail,
        label: def.label,
        subtitle: `${def.label} payout rail`,
        tenantId: null,
        /* A rail is never assumed simulation-safe: its live activation keys are
           server-side, so the honest Brain status is UNKNOWN until resolution. */
        status: 'unknown',
        provenance: { origin: 'config', ref: 'src/config/payouts.ts PAYOUT_RAILS' },
        properties: [
          prop('Mercenta account', def.accountLabel),
          prop('Destination', def.destinationLabel),
          prop('Simulated transfer prefix', def.simulationIdPrefix),
          prop('Server-side activation keys', def.liveEnvKeys.join(', ') + ' (names only — values are never read)'),
          prop('Role', rail === DEFAULT_PAYOUT_RAIL ? 'DEFAULT' : 'SECONDARY'),
        ],
      })
    );
    draft.link(FOUNDER_ID, railId, 'pays_via', 'No payout leaves Mercenta without explicit human approval.');
  }

  /* Decisions — the real human approval gates currently recorded. */
  for (const approval of allApprovals()) {
    const decisionId = brainNodeId('decision', approval.key);
    draft.add(
      makeNode({
        kind: 'decision',
        ref: approval.key,
        label: `Approval — ${approval.automationId}`,
        subtitle: approval.status,
        tenantId: null,
        status: 'verified',
        provenance: {
          origin: 'runtime_state',
          ref: 'src/lib/automation/registry.ts allApprovals()',
          asOf: approval.requestedAt,
        },
        properties: [
          prop('Decision', approval.status),
          prop('Reason requested', approval.reason),
          prop('Entity', approval.entityId),
          prop('Decided by', approval.decidedBy ?? null, !approval.decidedBy),
          prop('Decision reason', approval.decisionReason ?? null, !approval.decisionReason),
        ],
      })
    );
    draft.link(
      decisionId,
      brainNodeId('automation', approval.automationId),
      approval.status === 'approved' ? 'approved' : 'reviews',
      'The automation stopped at blocked_approval and recorded this human decision.'
    );
    draft.link(FOUNDER_ID, decisionId, 'owns', 'Only a human decision clears a blocked approval.');
  }
}

/* ── Catalogue layer (products / SKUs / ASINs) — both scopes ──────────────── */

/** Prospective research records whose canonical brand key matches this brand. */
function matchedProspects(brandName: string) {
  const key = normalizeBrandKey(brandName);
  return getProspects().filter((p) => normalizeBrandKey(p.brand) === key);
}

function addCatalogueLayer(draft: GraphDraft, brands: DemoBrand[]): void {
  const brandIds = new Set(brands.map((b) => b.id));

  for (const product of demoProducts.filter((p) => brandIds.has(p.brandId))) {
    const productId = brainNodeId('product', product.id);
    draft.add(
      makeNode({
        kind: 'product',
        ref: product.id,
        label: product.name,
        subtitle: `${product.sku} · ${product.brandId}`,
        tenantId: product.brandId,
        status: 'verified',
        provenance: { origin: 'domain_store', ref: 'src/data/demoData.ts DEMO_PRODUCTS' },
        properties: [
          prop('SKU', product.sku),
          prop('EAN / barcode', product.barcode),
          prop('Ex-works price (GBP)', product.exWorksPrice),
          prop('UK retail price (GBP)', product.ukRetailPrice),
          prop('Commodity code', product.commodityCode),
          prop('VAT status', product.vatStatus),
          prop('Hazardous', product.hazmat ? 'Yes' : 'No'),
          prop('Units per case', product.unitsPerCase ?? null),
        ],
      })
    );
    draft.link(
      brainNodeId('brand', product.brandId),
      productId,
      'owns',
      'demoProducts[].brandId — the canonical owning tenant.'
    );

    const skuId = brainNodeId('sku', product.sku);
    draft.add(
      makeNode({
        kind: 'sku',
        ref: product.sku,
        label: product.sku,
        subtitle: product.name,
        tenantId: product.brandId,
        status: 'verified',
        provenance: { origin: 'domain_store', ref: 'src/data/demoData.ts DEMO_PRODUCTS[].sku' },
        properties: [
          prop('Product', product.name),
          prop('Commodity code', product.commodityCode),
          prop('Case pack', product.unitsPerCase ?? null),
        ],
      })
    );
    draft.link(productId, skuId, 'maps_to', 'The product carries this canonical brand SKU.');

    /* Submissions supply the retail-channel identifier, and they are explicitly
       SIMULATED — so an ASIN reached this way is never presented as verified. */
    for (const submission of demoProductSubmissions.filter((s) => s.productId === product.id)) {
      if (!submission.asin) continue;
      const asinId = brainNodeId('asin', submission.asin);
      draft.add(
        makeNode({
          kind: 'asin',
          ref: submission.asin,
          label: submission.asin,
          subtitle: 'Retail-channel identifier (catalogue submission)',
          tenantId: product.brandId,
          status: 'simulation',
          provenance: { origin: 'domain_store', ref: 'src/data/demoStore.ts demoProductSubmissions[].asin' },
          properties: [
            prop('Submission status', submission.status),
            prop('Submission id', submission.submissionId),
            prop('Simulated', submission.simulated ? 'Yes — never a live provider result' : 'No'),
            prop('Rejection reason', submission.rejectionReason ?? 'None'),
          ],
          simulated: submission.simulated,
        })
      );
      draft.link(productId, asinId, 'maps_to', 'The catalogue submission recorded this ASIN for this product.');
    }
  }

  /* ASINs observed by Mercenta research. These are the brand's OWN marketplace
     identifiers, so they are legitimate in a brand-scoped graph; the PROSPECT
     entity that discovered them is not (see addAcquisitionLayer). */
  for (const brand of brands) {
    for (const prospect of matchedProspects(brand.name)) {
      for (const asin of prospect.asins) {
        const asinId = brainNodeId('asin', asin.asin);
        draft.add(
          makeNode({
            kind: 'asin',
            ref: asin.asin,
            label: asin.asin,
            subtitle: asin.title,
            tenantId: brand.id,
            status: 'verified',
            provenance: { origin: 'domain_store', ref: 'src/data/prospectStore.ts getProspects()[].asins' },
            properties: [
              prop('Category', `${asin.category}${asin.subcategory ? ' · ' + asin.subcategory : ''}`),
              prop('Buy-box price (GBP)', asin.price),
              prop('Rating', `${asin.rating} (${asin.reviewCount} reviews)`),
              prop('Best sellers rank', asin.bsr),
              prop('Featured offer holder', asin.featuredOffer ?? null),
              prop('Marketplace sellers', asin.sellerCount),
              prop('Retail seller present', asin.amazonRetailSeller ? 'Yes' : 'No'),
              prop('Source', asin.amazonUrl),
            ],
          })
        );
        draft.link(
          brainNodeId('brand', brand.id),
          asinId,
          'owns',
          'Observed marketplace identifier of this brand (research evidence, source URL retained).'
        );
      }
    }
  }
}
/** Canonical brand-facing knowledge — SHARED by both scopes. */
function addKnowledgeLayer(draft: GraphDraft): void {
  for (const article of KB_ARTICLES) {
    draft.add(
      makeNode({
        kind: 'knowledge',
        ref: article.id,
        label: article.title,
        subtitle: 'Brand-facing knowledge',
        tenantId: null,
        status: 'verified',
        provenance: { origin: 'domain_store', ref: 'src/data/knowledgeBase.ts KB_ARTICLES' },
        properties: [prop('Summary', article.summary), prop('Sections', article.sections.length)],
      })
    );
  }
}

/* ── Commerce layer (orders → fulfilment) — both scopes ────────────────────── */

function addOrderLayer(draft: GraphDraft, brands: DemoBrand[]): void {
  const brandIds = new Set(brands.map((b) => b.id));
  const pos = demoPurchaseOrders.filter((po) => brandIds.has(po.brandId));

  for (const po of pos) {
    const poId = brainNodeId('purchase_order', po.id);
    const channelStatus: BrainKnowledgeStatus = po.simulated ? 'simulation' : 'verified';
    draft.add(
      makeNode({
        kind: 'purchase_order',
        ref: po.id,
        label: po.poNumber,
        subtitle: `${po.status.replace(/_/g, ' ')} · ${po.freightTerm ?? 'freight term UNKNOWN'}`,
        tenantId: po.brandId,
        status: channelStatus,
        provenance: { origin: 'domain_store', ref: 'src/data/demoStore.ts demoPurchaseOrders', asOf: po.orderDate },
        simulated: po.simulated,
        properties: [
          prop('Status', po.status),
          prop('Net value (GBP)', po.poValue),
          prop('Commission rate %', po.commissionRate),
          prop('Commission (GBP)', po.commissionAmount),
          prop('Order date', po.orderDate),
          prop('Acknowledged at', po.acknowledgedAt ?? null, !po.acknowledgedAt),
          prop('Freight term', po.freightTerm ?? null, !po.freightTerm),
          prop('Ship window', po.shipWindowStart ? `${po.shipWindowStart} → ${po.shipWindowEnd}` : null, !po.shipWindowStart),
          prop('Delivery window', po.deliveryWindowStart ? `${po.deliveryWindowStart} → ${po.deliveryWindowEnd}` : null, !po.deliveryWindowStart),
          prop('Provenance label', po.simulated ? 'SIMULATED operational record' : 'Seed record (not declared as simulation)'),
        ],
      })
    );
    /* Two linked identities, never collapsed: the external channel PO (issued to
       Mercenta) and the brand's own order. The channel sends; the brand owns. */
    draft.link(AMAZON_ID, poId, 'sends', 'The retail channel issues the order to Mercenta.', channelStatus);
    draft.link(poId, brainNodeId('brand', po.brandId), 'belongs_to', 'demoPurchaseOrders[].brandId routes the order into this tenant.', channelStatus);

    for (const line of po.lineItems) {
      const lineRef = `${po.id}:${line.sku}`;
      const lineId = brainNodeId('po_line', lineRef);
      const overAck = line.acknowledgedQty !== undefined && line.acknowledgedQty > line.quantity;
      draft.add(
        makeNode({
          kind: 'po_line',
          ref: lineRef,
          label: `${line.sku} × ${line.quantity}`,
          subtitle: line.ackStatus ?? 'unacknowledged',
          tenantId: po.brandId,
          status: channelStatus,
          provenance: { origin: 'domain_store', ref: `demoPurchaseOrders.${po.id}.lineItems` },
          properties: [
            prop('Product', line.productName),
            prop('Ordered quantity', line.quantity),
            prop('Unit price (GBP)', line.unitPrice),
            prop('Acknowledgement', line.ackStatus ?? 'UNKNOWN — not yet acknowledged', !line.ackStatus),
            prop('Acknowledged quantity', line.acknowledgedQty ?? null, line.acknowledgedQty === undefined),
            prop('Rejection code', line.rejectionCode ?? null, !line.rejectionCode),
            prop('Scheduled ship date', line.scheduledShipDate ?? null, !line.scheduledShipDate),
            prop(
              'Quantity ceiling',
              overAck ? 'EXCEEDS ORDERED QUANTITY — invalid against channel truth' : 'Within the ordered quantity',
              overAck
            ),
          ],
        })
      );
      draft.link(poId, lineId, 'contains', 'The purchase order contains this line item.', channelStatus);
      draft.link(lineId, brainNodeId('sku', line.sku), 'contains', 'The line is raised against this canonical SKU.', channelStatus);
    }
  }

  /* Fulfilment — PO-gated, matched by the canonical PO number. */
  for (const shipment of demoShipments.filter((s) => brandIds.has(s.brandId))) {
    const shipmentId = brainNodeId('shipment', shipment.id);
    const po = pos.find((p) => p.poNumber === shipment.poNumber);
    draft.add(
      makeNode({
        kind: 'shipment',
        ref: shipment.id,
        label: shipment.reference,
        subtitle: `${shipment.status} · ${shipment.carrier}`,
        tenantId: shipment.brandId,
        status: 'verified',
        provenance: { origin: 'domain_store', ref: 'src/data/demoStore.ts demoShipments' },
        properties: [
          prop('Carrier', shipment.carrier),
          prop('Origin', shipment.origin),
          prop('Destination', shipment.destination),
          prop('Value (GBP)', shipment.value),
          prop('Waybill', shipment.waybill ?? null, !shipment.waybill),
          prop('Tracking', shipment.trackingNumber ?? null, !shipment.trackingNumber),
          prop('Delayed', shipment.delayed ? 'Yes' : 'No'),
          prop('Exception', shipment.exception ? 'Yes' : 'No'),
          prop('Gate', 'Shipment creation is PO-gated: a valid eligible PO for this tenant must exist.'),
        ],
      })
    );
    draft.link(brainNodeId('brand', shipment.brandId), shipmentId, 'owns', 'DemoShipment.brandId.');
    if (po) {
      draft.link(shipmentId, brainNodeId('purchase_order', po.id), 'fulfils', 'DemoShipment.poNumber matches the purchase order.');
    }
  }
}

/* ── Money layer (invoice → payment) — both scopes ────────────────────────── */

function addMoneyLayer(draft: GraphDraft, brands: DemoBrand[]): void {
  const brandIds = new Set(brands.map((b) => b.id));

  for (const invoice of demoCommerceInvoices.filter((i) => brandIds.has(i.brandId))) {
    const invoiceId = brainNodeId('invoice', invoice.id);
    draft.add(
      makeNode({
        kind: 'invoice',
        ref: invoice.id,
        label: invoice.number,
        subtitle: `${invoice.status} · £${invoice.subtotalGbp.toFixed(2)}`,
        tenantId: invoice.brandId,
        status: invoice.simulated ? 'simulation' : 'verified',
        provenance: { origin: 'domain_store', ref: 'src/data/demoStore.ts demoCommerceInvoices', asOf: invoice.issuedAt },
        simulated: invoice.simulated,
        properties: [
          prop('Status', invoice.status),
          prop('Subtotal (GBP)', invoice.subtotalGbp),
          prop('Issued at', invoice.issuedAt),
          prop('Paid at', invoice.paidAt ?? null, !invoice.paidAt),
          prop('Mode', invoice.mode),
          prop('Provenance label', invoice.simulated ? 'SIMULATED invoice' : 'Recorded invoice'),
        ],
      })
    );
    draft.link(brainNodeId('brand', invoice.brandId), invoiceId, 'owns', 'CommerceInvoice.brandId.');
    draft.link(invoiceId, brainNodeId('purchase_order', invoice.purchaseOrderId), 'relates_to', 'CommerceInvoice.purchaseOrderId.');
  }

  for (const payment of demoCommercePayments.filter((p) => brandIds.has(p.brandId))) {
    const paymentId = brainNodeId('payment', payment.id);
    draft.add(
      makeNode({
        kind: 'payment',
        ref: payment.id,
        label: `£${payment.amountGbp.toFixed(2)} settled`,
        subtitle: payment.method,
        tenantId: payment.brandId,
        status: payment.simulated ? 'simulation' : 'verified',
        provenance: { origin: 'domain_store', ref: 'src/data/demoStore.ts demoCommercePayments', asOf: payment.at },
        simulated: payment.simulated,
        properties: [
          prop('Amount (GBP)', payment.amountGbp),
          prop('Method', payment.method),
          prop('Settled at', payment.at),
          prop('Mode', payment.mode),
          prop('Live rail claim', 'NONE — this is not a live bank transfer'),
        ],
      })
    );
    draft.link(brainNodeId('brand', payment.brandId), paymentId, 'owns', 'CommercePayment.brandId.');
    draft.link(paymentId, brainNodeId('invoice', payment.invoiceId), 'settles', 'CommercePayment.invoiceId.');
  }
}

/* ── Support + communications + campaigns — both scopes ───────────────────── */

function addSupportLayer(draft: GraphDraft, brands: DemoBrand[]): void {
  const brandIds = new Set(brands.map((b) => b.id));
  const pos = demoPurchaseOrders.filter((po) => brandIds.has(po.brandId));

  for (const ticket of demoTickets.filter((t) => brandIds.has(t.brandId))) {
    const caseId = brainNodeId('case', ticket.id);
    const escalated = ticket.amazonCase;
    draft.add(
      makeNode({
        kind: 'case',
        ref: ticket.id,
        label: ticket.caseRef ?? ticket.subject,
        subtitle: `${ticket.status} · ${ticket.escalationState ?? ticket.priority}`,
        tenantId: ticket.brandId,
        status: 'verified',
        provenance: { origin: 'domain_store', ref: 'src/lib/helpdesk/ticketStore.ts demoTickets', asOf: ticket.createdAt },
        properties: [
          prop('Subject', ticket.subject),
          prop('Status', ticket.status),
          prop('Priority', ticket.priority),
          prop('Source', ticket.source),
          prop(
            'Mercenta review',
            ticket.adminReview
              ? `${ticket.adminReview.decision} by ${ticket.adminReview.reviewedByStaffId}`
              : 'Not yet reviewed',
            !ticket.adminReview
          ),
          prop('Escalation state', ticket.escalationState ?? 'Not escalated', !ticket.escalationState),
          prop(
            'Channel case',
            escalated ? `${escalated.referenceId} (${escalated.mode})` : 'None — the brand never contacts the channel directly',
            !escalated
          ),
          prop('Provider response', ticket.providerResponse?.outcome ?? 'None recorded', !ticket.providerResponse),
          prop('Resolution', ticket.resolution?.note ?? 'Open', !ticket.resolution),
        ],
      })
    );
    draft.link(brainNodeId('brand', ticket.brandId), caseId, 'belongs_to', 'Ticket.brandId.');

    const relatedPo = ticket.relatedPoNumber ? pos.find((p) => p.poNumber === ticket.relatedPoNumber) : undefined;
    if (relatedPo) draft.link(caseId, brainNodeId('purchase_order', relatedPo.id), 'concerns', 'Ticket.relatedPoNumber.');
    if (ticket.relatedShipmentId) {
      draft.link(caseId, brainNodeId('shipment', ticket.relatedShipmentId), 'concerns', 'Ticket.relatedShipmentId.');
    }
    if (ticket.relatedComplianceDocId) {
      draft.link(caseId, brainNodeId('document', ticket.relatedComplianceDocId), 'concerns', 'Ticket.relatedComplianceDocId.');
    }
    if (ticket.messageIds.length > 0) {
      draft.link(caseId, brainNodeId('conversation', ticket.brandId), 'relates_to', 'Ticket.messageIds groups canonical messages.');
    }
    if (escalated) {
      draft.link(
        caseId,
        AMAZON_ID,
        'escalates_to',
        'Ticket.amazonCase records Mercenta escalating to the channel — never the brand.',
        escalated.simulated ? 'simulation' : 'verified'
      );
    }
  }

  for (const brand of brands) {
    const messages = demoMessages.filter((m) => m.brandId === brand.id);
    if (messages.length === 0) continue;
    const conversationId = brainNodeId('conversation', brand.id);
    draft.add(
      makeNode({
        kind: 'conversation',
        ref: brand.id,
        label: `${brand.name} thread`,
        subtitle: `${messages.length} messages`,
        tenantId: brand.id,
        status: 'verified',
        provenance: { origin: 'domain_store', ref: 'src/data/demoStore.ts demoMessages' },
        properties: [
          prop('Messages', messages.length),
          prop('Awaiting human reply', messages.filter((m) => m.requiresHuman).length),
          prop('Latest', messages[messages.length - 1]?.createdAt ?? null, !messages.length),
        ],
      })
    );
    draft.link(conversationId, brainNodeId('brand', brand.id), 'belongs_to', 'Message.brandId.');
  }

  for (const campaign of demoAdCampaigns.filter((c) => brandIds.has(c.brandId))) {
    const campaignId = brainNodeId('campaign', campaign.id);
    draft.add(
      makeNode({
        kind: 'campaign',
        ref: campaign.id,
        label: campaign.name,
        subtitle: campaign.status,
        tenantId: campaign.brandId,
        /* The ad provider is NOT positively resolved as simulation, so its
           performance data is UNKNOWN rather than a fabricated number. */
        status: 'unknown',
        provenance: { origin: 'domain_store', ref: 'src/data/demoStore.ts demoAdCampaigns' },
        properties: [
          prop('Status', campaign.status),
          prop('Performance data', 'UNKNOWN — no live ad provider is connected', true),
          prop('Simulation-safe', 'No — the ad provider is not positively resolved as simulation'),
        ],
      })
    );
    draft.link(brainNodeId('brand', campaign.brandId), campaignId, 'owns', 'AdCampaign.brandId.');
  }
}

/* ── Per-brand governance: documents, LOA, contracts, commercial readiness ── */

function addBrandRecordsLayer(draft: GraphDraft, brands: DemoBrand[]): void {
  const brandIds = new Set(brands.map((b) => b.id));

  for (const doc of demoComplianceDocs.filter((d) => brandIds.has(d.brandId))) {
    const isLoa = doc.type === 'letter_of_authorization';
    const docId = brainNodeId(isLoa ? 'loa' : 'document', doc.id);
    draft.add(
      makeNode({
        kind: isLoa ? 'loa' : 'document',
        ref: doc.id,
        label: isLoa ? `LOA on file — version ${doc.version}` : (CATEGORY_DOC_LABELS[doc.type] ?? doc.type),
        subtitle: `${doc.status.replace(/_/g, ' ')} · version ${doc.version}`,
        tenantId: doc.brandId,
        /* A document's recorded STATUS is a verified record; a missing document
           is UNKNOWN provenance rather than an assumed pass. */
        status: doc.status === 'missing' ? 'unknown' : 'verified',
        provenance: {
          origin: 'document',
          ref: 'src/data/demoStore.ts demoComplianceDocs',
        },
        properties: [
          prop('Document type', doc.type),
          prop('Status', doc.status),
          prop('Version', doc.version),
          prop('Reference', doc.reference ?? null, !doc.reference),
          prop('Issuer', doc.issuer ?? null, !doc.issuer),
          prop('Evidence file', doc.fileUrl ?? null, !doc.fileUrl),
        ],
      })
    );
    draft.link(
      brainNodeId('brand', doc.brandId),
      docId,
      isLoa ? 'authorised_by' : 'owns',
      isLoa
        ? 'The LOA is the universal base requirement authorising Mercenta to act for this brand.'
        : 'ComplianceDocument.brandId — the document belongs to this tenant.'
    );
    draft.link(
      docId,
      brainNodeId(isLoa ? 'loa' : 'rule', isLoa ? 'letter_of_authorization' : `compliance:${doc.type}`),
      'relates_to',
      'ComplianceDocument.type equals the requirement this document satisfies.',
      doc.status === 'approved' ? 'verified' : 'inference'
    );
  }

  for (const contract of demoContracts.filter((c) => brandIds.has(c.brandId))) {
    const contractId = brainNodeId('contract', contract.id);
    draft.add(
      makeNode({
        kind: 'contract',
        ref: contract.id,
        label: `${contract.type.replace(/_/g, ' ')} — ${contract.brandId}`,
        subtitle: `${contract.status} · v${contract.version}`,
        tenantId: contract.brandId,
        status: 'verified',
        provenance: { origin: 'document', ref: 'src/data/demoStore.ts demoContracts', asOf: contract.effectiveDate },
        properties: [
          prop('Status', contract.status),
          prop('Commission rate %', contract.commissionRate),
          prop('Monthly fee (GBP)', contract.monthlyFee),
          prop('Fulfilment track', contract.fulfillmentTrack),
          prop('Effective', contract.effectiveDate),
          prop('Renewal', contract.renewalDate),
          prop(
            'Signatories',
            contract.signatories
              .map((s) => (s.signedAt ? `${s.name} (signed)` : `${s.name} (pending)`))
              .join(', ')
          ),
        ],
      })
    );
    draft.link(brainNodeId('brand', contract.brandId), contractId, 'owns', 'Contract.brandId.');
  }
}

/* ── Commercial readiness — the canonical route decision + its workflow ───── */

function addReadinessLayer(draft: GraphDraft, brands: DemoBrand[], mercenta: boolean): void {
  const brandIds = new Set(brands.map((b) => b.id));
  const workflowId = brainNodeId('workflow', COMMERCIAL_READINESS_WORKFLOW_ID);
  const gateId = brainNodeId('rule', `gate:${COMMERCIAL_GATE_ID}`);
  let anyRecord = false;

  for (const record of allCommercialReadinessRecords()) {
    const ownerTenant = tenantIdForReadiness(record.owner);
    if (!brandIds.has(ownerTenant)) continue;
    anyRecord = true;
    const readinessId = brainNodeId('commercial_readiness', record.id);
    draft.add(
      makeNode({
        kind: 'commercial_readiness',
        ref: record.id,
        label: record.productLabel ?? 'Commercial readiness',
        subtitle: record.refused ? `REFUSED — ${record.route}` : record.route,
        tenantId: ownerTenant,
        status: 'verified',
        provenance: {
          origin: 'domain_store',
          ref: 'src/data/commercialReadinessStore.ts allCommercialReadinessRecords()',
          asOf: record.updatedAt,
        },
        properties: [
          prop('Route', record.route),
          prop('Refused', record.refused ? `Yes — ${record.refusalReason ?? 'reason recorded'}` : 'No'),
          prop('Product reference', record.productRef ?? null, !record.productRef),
          prop('Missing inputs', record.missingInputs.length ? record.missingInputs.join(', ') : 'None'),
          prop('Open questions', record.openQuestions.length ? record.openQuestions.join(', ') : 'None'),
          prop('MOQ disclaimer', record.moqDisclaimer),
          prop('Next step', record.nextStep),
        ],
      })
    );
    draft.link(
      brainNodeId('brand', ownerTenant),
      readinessId,
      'owns',
      "The readiness record's owner resolves to this tenant (tenantIdForReadiness)."
    );
    if (record.productRef) {
      draft.link(readinessId, brainNodeId('sku', record.productRef), 'relates_to', 'CommercialReadinessRecord.productRef names this SKU.');
    }
    draft.link(
      readinessId,
      workflowId,
      'derived_from',
      'CommercialReadinessRecord.routingDecisionId was raised under the canonical commercial readiness workflow.'
    );
  }

  /* The declared workflow + its gateway. Mercenta scope always carries them
     (they are canonical declarations); a brand scope carries them only when the
     brand actually has a readiness record raised under the workflow. */
  if (mercenta || anyRecord) {
    draft.add(
      makeNode({
        kind: 'workflow',
        ref: COMMERCIAL_READINESS_WORKFLOW_ID,
        label: 'Commercial readiness workflow',
        subtitle: 'Declared workflow',
        tenantId: null,
        status: 'verified',
        provenance: { origin: 'config', ref: 'src/config/commercialReadiness.ts COMMERCIAL_READINESS_WORKFLOW_ID' },
        properties: [
          prop('Workflow id', COMMERCIAL_READINESS_WORKFLOW_ID),
          prop('Gateway', COMMERCIAL_GATE_ID),
          prop('Route is exclusive', 'Exactly one route is selected — the gateway refuses rather than guessing'),
          prop('Owner', 'Deterministic domain code (the gate), not an agent'),
        ],
      })
    );
    draft.add(
      makeNode({
        kind: 'rule',
        ref: `gate:${COMMERCIAL_GATE_ID}`,
        label: 'Commercial viability gate',
        subtitle: 'Deterministic exclusive gateway',
        tenantId: null,
        status: 'verified',
        provenance: { origin: 'config', ref: 'src/config/commercialReadiness.ts COMMERCIAL_GATE_ID' },
        properties: [
          prop('Gateway id', COMMERCIAL_GATE_ID),
          prop('Fail-closed', 'An unknown/undeclared commercial relationship is REFUSED, never defaulted'),
          prop('Human gate', 'Records that need a human are escalated, never auto-decided'),
        ],
      })
    );
    draft.link(workflowId, gateId, 'contains', 'COMMERCIAL_GATE_ID is the gateway declared for this workflow.');

    if (mercenta) {
      draft.link(
        brainNodeId('automation', 'commercial_readiness_monitor'),
        workflowId,
        'reviews',
        'AUTOMATION_REGISTRY.commercial_readiness_monitor consistency-checks every stored route against the gate.'
      );
    }
  }
}

/* ── Acquisition layer (PROSPECTS) — MERCENTA SCOPE ONLY ──────────────────── */

function addAcquisitionLayer(draft: GraphDraft): void {
  for (const prospect of getProspects()) {
    const prospectId = brainNodeId('prospect', prospect.id);
    const inApprovedCategory = APPROVED_CATEGORIES.includes(prospect.category as ApprovedCategory);
    draft.add(
      makeNode({
        kind: 'prospect',
        ref: prospect.id,
        label: prospect.brand,
        subtitle: `${prospect.category} · ${prospect.outreachStatus}`,
        tenantId: null,
        /* Research data with no live provider is SIMULATION-labelled, never
           presented as a verified marketplace fact. */
        status: prospect.source === 'live' ? 'verified' : 'simulation',
        provenance: { origin: 'domain_store', ref: 'src/data/prospectStore.ts getProspects()', asOf: prospect.lastResearched },
        properties: [
          prop('Category', prospect.category),
          prop('Maturity', prospect.brandMaturity),
          prop('Outreach status', prospect.outreachStatus),
          prop('Disqualified', prospect.disqualified ? `Yes — ${prospect.disqualificationReason ?? 'reason recorded'}` : 'No'),
          prop('Source mode', prospect.source === 'live' ? 'live' : 'mock — no live provider produced this record'),
          prop(
            'Approved category',
            inApprovedCategory ? 'Yes' : 'NO — outside the ten approved categories',
            !inApprovedCategory
          ),
          prop('Website', prospect.website ?? null, !prospect.website),
          prop('ASINs discovered', prospect.asins.length),
          prop('Evidence items', prospect.evidence.length),
        ],
      })
    );
    draft.link(FOUNDER_ID, prospectId, 'owns', 'The acquisition pipeline is Mercenta-internal.');

    for (const contact of prospect.contacts ?? []) {
      const contactRef = `${prospect.id}:${contact.name}`;
      const contactId = brainNodeId('contact', contactRef);
      draft.add(
        makeNode({
          kind: 'contact',
          ref: contactRef,
          label: contact.name,
          subtitle: `${contact.jobTitle} · ${contact.company}`,
          tenantId: null,
          status: 'verified',
          provenance: {
            origin: 'document',
            ref: `BrandProspect.${prospect.id}.contacts`,
            asOf: contact.lastVerified,
          },
          properties: [
            prop('Job title', contact.jobTitle),
            prop('Company', contact.company),
            prop('Country', contact.country ?? null, !contact.country),
            prop('Email', contact.email ?? null, !contact.email),
            prop('Email confidence', contact.emailConfidence),
            prop('Phone', contact.phone ?? null, !contact.phone),
            prop('Phone confidence', contact.phoneConfidence),
            prop('LinkedIn', contact.linkedInUrl ?? null, !contact.linkedInUrl),
            prop('Source', contact.source),
            prop('Last verified', contact.lastVerified),
          ],
        })
      );
      draft.link(prospectId, contactId, 'relates_to', 'BrandProspect.contacts declares this decision-maker.');
    }

    /* Evidence → source. Evidence SUPPORTS a claim; it is never the claim. */
    for (const [index, item] of (prospect.evidence ?? []).entries()) {
      const evidenceRef = `${prospect.id}:${index}:${item.field}`;
      const evidenceId = brainNodeId('evidence', evidenceRef);
      draft.add(
        makeNode({
          kind: 'evidence',
          ref: evidenceRef,
          label: `${item.field}: ${item.value}`,
          subtitle: `${item.classification} · ${item.confidence} confidence`,
          tenantId: null,
          status: 'verified',
          provenance: {
            origin: 'document',
            ref: `BrandProspect.${prospect.id}.evidence`,
            asOf: item.dateObserved,
          },
          properties: [
            prop('Claim field', item.field),
            prop('Observed value', item.value),
            prop('Classification', item.classification),
            prop('Confidence', item.confidence),
            prop('Source name', item.source),
            prop('Source URL', item.sourceUrl),
            prop('Observed', item.dateObserved),
            prop('Notes', item.notes ?? null, !item.notes),
          ],
        })
      );
      draft.link(evidenceId, prospectId, 'supports', `BrandProspect.${prospect.id}.evidence[${index}] supports this record.`);

      const sourceRef = `${normalizeBrandKey(item.source)}|${item.sourceUrl}`;
      const sourceId = brainNodeId('source', sourceRef);
      draft.add(
        makeNode({
          kind: 'source',
          ref: sourceRef,
          label: item.source,
          subtitle: 'Observed source',
          tenantId: null,
          status: 'verified',
          provenance: {
            origin: 'document',
            ref: `BrandProspect.${prospect.id}.evidence[${index}].sourceUrl`,
            asOf: item.dateObserved,
          },
          properties: [prop('URL', item.sourceUrl), prop('First observed', item.dateObserved)],
        })
      );
      draft.link(evidenceId, sourceId, 'derived_from', 'ProspectEvidence.source / sourceUrl.');
    }

    /* A prospect BECOMES a brand — matched by canonical brand key, never guessed. */
    for (const brand of ALL_DEMO_BRANDS) {
      if (normalizeBrandKey(brand.name) !== normalizeBrandKey(prospect.brand)) continue;
      draft.link(
        prospectId,
        brainNodeId('brand', brand.id),
        'maps_to',
        'normalizeBrandKey(prospect.brand) equals normalizeBrandKey(brand.name) — this prospect is a tenant.'
      );
    }
  }
}

/* ── Orchestrator ─────────────────────────────────────────────────────────── */

const MERCENTA_EXCLUSIONS: string[] = [
  'This is the Mercenta-wide graph. It contains prospects, Mercenta-internal automations, agents, integrations, payout rails and business policy — none of which may ever be shown to a brand tenant.',
  'A node marked INFERENCE is not a verified fact, and a node marked SIMULATION is not a live external result. The Brain never promotes one to the other.',
];

function brandExclusions(brand: DemoBrand): string[] {
  return [
    `Tenant-scoped graph for ${brand.name}. It was constructed from tenant-filtered sources — no runtime filter was applied to a Mercenta-wide graph.`,
    'Deliberately EXCLUDED from a brand graph: other brands, prospects and the acquisition pipeline, Mercenta automations and their run history, the AI reasoning seam, integration/provider machinery, payout rails, Founder business policy, and Mercenta-wide decisions.',
    "The retail channel appears because it is the counterpart Mercenta operates on the brand's behalf. There is NO direct brand↔channel path: every external action is Mercenta-mediated.",
  ];
}

/**
 * Build the Brain for an explicit scope. Deterministic: identical canonical
 * domain state produces an identical graph.
 */
export function buildBrainGraph(scope: BrainScope): BrainGraph {
  ensureProspectStore();
  const draft = new GraphDraft();

  if (scope.kind === 'brand') {
    const brand = ALL_DEMO_BRANDS.find((b) => b.id === scope.tenantId);
    if (!brand) return refusedGraph(scope.tenantId);
    const brands = [brand];
    addPortfolioLayer(draft, brands, false);
    addChannelLayer(draft);
    addRulesLayer(draft);
    addKnowledgeLayer(draft);
    addCatalogueLayer(draft, brands);
    addBrandRecordsLayer(draft, brands);
    addReadinessLayer(draft, brands, false);
    addOrderLayer(draft, brands);
    addMoneyLayer(draft, brands);
    addSupportLayer(draft, brands);
    return draft.finish(scope, brandExclusions(brand));
  }

  const brands = [...ALL_DEMO_BRANDS];
  addPortfolioLayer(draft, brands, true);
  addPlatformLayer(draft);
  addChannelLayer(draft);
  addPoliciesLayer(draft);
  addRulesLayer(draft);
  addDecisionLayer(draft);
  addKnowledgeLayer(draft);
  addCatalogueLayer(draft, brands);
  addBrandRecordsLayer(draft, brands);
  addReadinessLayer(draft, brands, true);
  addAcquisitionLayer(draft);
  addOrderLayer(draft, brands);
  addMoneyLayer(draft, brands);
  addSupportLayer(draft, brands);
  return draft.finish(scope, MERCENTA_EXCLUSIONS);
}

/* ── Read helpers (used by the surfaces — no second derivation) ───────────── */

export function brainNodeById(graph: BrainGraph, id: string): BrainNode | undefined {
  return graph.nodes.find((n) => n.id === id);
}

export function brainEdgesFor(graph: BrainGraph, nodeId: string): BrainEdge[] {
  return graph.edges.filter((e) => e.from === nodeId || e.to === nodeId);
}

/** Edges that use a node as their SUBJECT (outgoing), for relationship inspection. */
export function brainOutgoing(graph: BrainGraph, nodeId: string): BrainEdge[] {
  return graph.edges.filter((e) => e.from === nodeId);
}

export function brainIncoming(graph: BrainGraph, nodeId: string): BrainEdge[] {
  return graph.edges.filter((e) => e.to === nodeId);
}

export interface BrainStats {
  nodes: number;
  edges: number;
  kinds: number;
  byStatus: Record<BrainKnowledgeStatus, number>;
  byAuthority: Record<string, number>;
  unprovenanced: number;
}

/** Integrity summary. `unprovenanced` must always be 0 — every node names a source. */
export function brainStats(graph: BrainGraph): BrainStats {
  const byStatus: Record<BrainKnowledgeStatus, number> = {
    verified: 0,
    simulation: 0,
    inference: 0,
    unknown: 0,
  };
  const byAuthority: Record<string, number> = {};
  let unprovenanced = 0;
  for (const n of graph.nodes) {
    byStatus[n.status] += 1;
    byAuthority[n.authority] = (byAuthority[n.authority] ?? 0) + 1;
    if (!n.provenance?.ref) unprovenanced += 1;
  }
  return {
    nodes: graph.nodes.length,
    edges: graph.edges.length,
    kinds: new Set(graph.nodes.map((n) => n.kind)).size,
    byStatus,
    byAuthority,
    unprovenanced,
  };
}

/** True when this node is inside the given scope's tenant boundary. */
export function isNodeInScope(node: BrainNode, scope: BrainScope): boolean {
  if (scope.kind === 'mercenta') return true;
  return node.tenantId === null || node.tenantId === scope.tenantId;
}