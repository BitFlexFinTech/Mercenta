/**
 * §MERCENTA BRAIN — FIRST-CLASS PRODUCT SURFACE (Super Admin / Founder).
 *
 * Answers the third question of the platform's information architecture:
 *
 *   Overview              → "What is happening across Mercenta?"
 *   Operational Dashboard → "What do I need to do?"
 *   MERCENTA BRAIN        → "How is everything connected, what do we know,
 *                            and why?"
 *
 * It is deliberately NOT a decorative network picture. Every node is a canonical
 * record with a provenance pointer, every edge cites the field that proves it,
 * and selecting an entity shows its relationships, its authority model (code /
 * automation / agent / mixed / human) and the destination where the real work
 * happens. The graph is a PROJECTION: it owns no business state and mutates
 * nothing.
 *
 * RBAC: Super Admin only — hidden in the nav for every other tier AND guarded
 * again at render in AdminShell (defense in depth).
 */
import { useMemo, useState } from 'react';
import { buildBrainGraph, brainNodeById, brainStats } from '@/lib/intelligence/brain/buildGraph';
import { layoutBrain } from '@/lib/intelligence/brain/layout';
import {
  BRAIN_AUTHORITY_LABELS,
  BRAIN_AUTHORITY_NOTES,
  BRAIN_KIND_DEFINITIONS,
  BRAIN_RELATION_DEFINITIONS,
  BRAIN_STATUS_LABELS,
  BRAIN_STATUS_TONES,
  type BrainEntityKind,
  type BrainKnowledgeStatus,
  type BrainNode,
  type BrainRelationKind,
} from '@/lib/intelligence/brain/types';
import { BrainCanvas } from '@/components/shared/brain/BrainCanvas';
import { Button, EmptyState, Input, StatusBadge } from '@/components/ui';
import {
  ContextPanel,
  RecordFieldList,
  SegmentedControl,
  WorkspaceFrame,
  WorkspaceGrid,
  WorkspaceHeader,
  WorkspaceSection,
  MetricBand,
  type MetricTileData,
} from '@/components/shared/workspace';
import { ArrowRight, Search } from 'lucide-react';

/** Where the real work for each entity kind actually happens (existing views). */
const DESTINATION: Partial<Record<BrainEntityKind, { view: string; label: string }>> = {
  brand: { view: 'crm', label: 'Brand CRM' },
  prospect: { view: 'brand_intelligence', label: 'Brand Intelligence' },
  product: { view: 'catalog', label: 'Global Catalog' },
  sku: { view: 'catalog', label: 'Global Catalog' },
  asin: { view: 'catalog', label: 'Global Catalog' },
  purchase_order: { view: 'purchase_orders_admin', label: 'Purchase Orders' },
  po_line: { view: 'purchase_orders_admin', label: 'Purchase Orders' },
  shipment: { view: 'logistics', label: 'Logistics Control' },
  invoice: { view: 'billing', label: 'Billing' },
  payment: { view: 'billing', label: 'Billing' },
  case: { view: 'helpdesk', label: 'Helpdesk' },
  conversation: { view: 'messages', label: 'Messages' },
  document: { view: 'compliance', label: 'Compliance Approvals' },
  loa: { view: 'compliance', label: 'Compliance Approvals' },
  contract: { view: 'contracts_admin', label: 'Contract Cycle' },
  commercial_readiness: { view: 'brand_intelligence', label: 'Brand Intelligence' },
  automation: { view: 'control_centre', label: 'Control Centre' },
  agent: { view: 'control_centre', label: 'Control Centre' },
  integration: { view: 'integrations', label: 'Integration Settings' },
  provider: { view: 'integrations', label: 'Integration Settings' },
  policy: { view: 'control_centre', label: 'Control Centre' },
  decision: { view: 'control_centre', label: 'Control Centre' },
  rule: { view: 'compliance', label: 'Compliance Approvals' },
  knowledge: { view: 'helpdesk', label: 'Helpdesk' },
  campaign: { view: 'amazon_ads', label: 'Ad Spend' },
};

const STATUS_FILTERS: { id: string; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'verified', label: 'Verified' },
  { id: 'simulation', label: 'Simulation' },
  { id: 'unknown', label: 'Unknown' },
  { id: 'inference', label: 'Inference' },
];

const CLUSTER_FILTERS: { id: string; label: string }[] = [
  { id: 'all', label: 'All clusters' },
  { id: 'portfolio', label: 'Portfolio' },
  { id: 'catalogue', label: 'Catalogue' },
  { id: 'commerce', label: 'Commerce' },
  { id: 'governance', label: 'Governance' },
  { id: 'platform', label: 'Platform' },
];

const LIST_LIMIT = 120;

export function MercentaBrain({ onNavigate }: { onNavigate?: (view: string) => void }) {
  const graph = useMemo(() => buildBrainGraph({ kind: 'mercenta' }), []);
  const layout = useMemo(() => layoutBrain(graph), [graph]);
  const stats = useMemo(() => brainStats(graph), [graph]);

  const [query, setQuery] = useState('');
  const [cluster, setCluster] = useState('all');
  const [status, setStatus] = useState('all');
  const [kind, setKind] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return graph.nodes.filter((node) => {
      if (cluster !== 'all' && BRAIN_KIND_DEFINITIONS[node.kind].cluster !== cluster) return false;
      if (status !== 'all' && node.status !== status) return false;
      if (kind !== 'all' && node.kind !== kind) return false;
      if (!needle) return true;
      return (
        node.label.toLowerCase().includes(needle) ||
        (node.subtitle ?? '').toLowerCase().includes(needle) ||
        node.kind.includes(needle) ||
        (node.ref ?? '').toLowerCase().includes(needle)
      );
    });
  }, [graph.nodes, query, cluster, status, kind]);

  const visibleIds = useMemo(() => new Set(visible.map((n) => n.id)), [visible]);
  const selected = selectedId ? brainNodeById(graph, selectedId) : undefined;
  const selectedRelations = useMemo(
    () => (selectedId ? graph.edges.filter((e) => e.from === selectedId || e.to === selectedId) : []),
    [graph.edges, selectedId]
  );

  const kindOptions = useMemo(() => {
    const counts = new Map<BrainEntityKind, number>();
    for (const node of graph.nodes) counts.set(node.kind, (counts.get(node.kind) ?? 0) + 1);
    return [
      { id: 'all', label: `All types (${graph.nodes.length})` },
      ...[...counts.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([k, count]) => ({ id: k, label: `${BRAIN_KIND_DEFINITIONS[k].label} (${count})` })),
    ];
  }, [graph.nodes]);

  const kpis: MetricTileData[] = [
    {
      id: 'entities',
      label: 'Entities',
      value: String(stats.nodes),
      context: `${stats.kinds} distinct types, every one with canonical provenance`,
      tone: 'info',
      statusText: 'Projected from domain',
      domain: 'intelligence',
    },
    {
      id: 'relationships',
      label: 'Relationships',
      value: String(stats.edges),
      context: 'Each edge cites the canonical field that proves it',
      tone: 'info',
      statusText: 'Evidence-backed',
      domain: 'orders',
    },
    {
      id: 'verified',
      label: 'Verified',
      value: String(stats.byStatus.verified),
      context: 'Read directly from a canonical store, registry or config',
      tone: 'success',
      statusText: 'VERIFIED',
      domain: 'compliance',
    },
    {
      id: 'simulation',
      label: 'Simulation',
      value: String(stats.byStatus.simulation),
      context: 'Labelled simulated — never presented as a live external result',
      tone: 'info',
      statusText: 'SIMULATION',
      domain: 'logistics',
    },
    {
      id: 'unknown',
      label: 'Unknown',
      value: String(stats.byStatus.unknown),
      context: 'Stated as unknown rather than guessed. Unknown is never treated as simulation',
      tone: 'neutral',
      statusText: 'UNKNOWN',
      domain: 'risk',
    },
    {
      id: 'human',
      label: 'Human authority',
      value: String(stats.byAuthority.human ?? 0),
      context: 'Where authority sits with a person and the system stops',
      tone: 'brass',
      statusText: 'HUMAN',
      domain: 'communications',
    },
  ];

  const clearFilters = () => {
    setQuery('');
    setCluster('all');
    setStatus('all');
    setKind('all');
  };

  return (
    <WorkspaceFrame>
      <WorkspaceHeader
        eyebrow="Admin hub · Intelligence"
        title="Mercenta Brain"
        description="How everything is connected, what we know, and why. Every entity is a canonical record and every relationship cites the field that proves it. The Brain reads the operating system — it never writes to it."
        status={<StatusBadge tone="info" dataStatus="info">Super Admin</StatusBadge>}
        meta={
          <>
            <span className="font-mono text-ds-micro text-zinc-500" data-testid="brain-counts">
              {stats.nodes} entities · {stats.edges} relationships · {stats.kinds} types
            </span>
            <span className="text-ds-micro text-zinc-600">0 network calls — projection only</span>
          </>
        }
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[190px] flex-1 sm:max-w-xs">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500"
                aria-hidden="true"
              />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search entities, kinds, references…"
                ariaLabel="Search the Brain"
                dataTestid="brain-search"
                className="pl-8"
              />
            </div>
            <SegmentedControl
              items={CLUSTER_FILTERS}
              active={cluster}
              onSelect={setCluster}
              ariaLabel="Filter by cluster"
              className="hidden xl:inline-flex"
            />
            <SegmentedControl
              items={STATUS_FILTERS}
              active={status}
              onSelect={setStatus}
              ariaLabel="Filter by knowledge status"
            />
            <label className="flex items-center gap-1.5">
              <span className="sr-only">Filter by entity type</span>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value)}
                data-testid="brain-kind-filter"
                className="rounded-ds-md border border-white/[0.08] bg-white/[0.02] px-2 py-1.5 text-ds-label text-zinc-300"
              >
                {kindOptions.map((option) => (
                  <option key={option.id} value={option.id} className="bg-ink-850">
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <Button variant="tertiary" size="sm" onClick={clearFilters} data-testid="brain-clear-filters">
              Clear
            </Button>
          </div>
        }
      />

      <div className="mb-4">
        <MetricBand items={kpis} />
      </div>

      <WorkspaceGrid
        rail={
          <>
            <ContextPanel title="Selected entity">
              {selected ? (
                <BrainEntityInspector
                  node={selected}
                  relations={selectedRelations}
                  graphLabel={(id) => brainNodeById(graph, id)?.label ?? id}
                  onSelect={setSelectedId}
                  onNavigate={onNavigate}
                />
              ) : (
                <p className="text-ds-label leading-snug text-zinc-400" data-testid="brain-inspector-empty">
                  Select an entity in the graph or the list to inspect its relationships, provenance and authority model.
                </p>
              )}
            </ContextPanel>

            <ContextPanel title="Knowledge status">
              <ul className="space-y-1.5">
                {(['verified', 'simulation', 'inference', 'unknown'] as BrainKnowledgeStatus[]).map((s) => (
                  <li key={s} className="flex items-center justify-between gap-2">
                    <StatusBadge tone={BRAIN_STATUS_TONES[s]} dataStatus={s}>
                      {BRAIN_STATUS_LABELS[s]}
                    </StatusBadge>
                    <span className="font-mono text-ds-label text-zinc-400">{stats.byStatus[s]}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-ds-micro leading-snug text-zinc-500">
                These four states are never merged. An inference is not a fact and a simulation is not a live result.
              </p>
            </ContextPanel>

            <ContextPanel title="What the Brain does not contain">
              <ul className="space-y-1.5">
                {graph.exclusions.map((line) => (
                  <li key={line} className="text-ds-micro leading-snug text-zinc-400">
                    {line}
                  </li>
                ))}
              </ul>
            </ContextPanel>
          </>
        }
      >
        <WorkspaceSection
          title="Operating graph"
          description="Radial clusters are the information architecture. Drag to pan, scroll or use the controls to zoom, click an entity to inspect it."
          domain="intelligence"
        >
          <BrainCanvas
            graph={graph}
            layout={layout}
            visibleIds={visibleIds}
            selectedId={selectedId}
            onSelect={setSelectedId}
            className="h-[420px] sm:h-[520px]"
          />
        </WorkspaceSection>

        <WorkspaceSection
          title={`Entities (${visible.length} of ${graph.nodes.length})`}
          description="The keyboard- and screen-reader-accessible equivalent of the graph. Selecting here selects in the graph."
          action={
            kind !== 'all' ? (
              <Button variant="ghost" size="sm" onClick={() => setKind('all')}>
                Clear type filter
              </Button>
            ) : undefined
          }
        >
          {visible.length === 0 ? (
            <div data-testid="brain-empty">
              <EmptyState
                title="No entity matches these filters"
                description="Nothing was hidden and nothing was invented — the filters simply exclude every entity. Clear a filter to continue."
              />
            </div>
          ) : (
            <ul className="divide-y divide-white/[0.05] overflow-hidden rounded-ds-lg border border-white/[0.06] bg-ink-850">
              {visible.slice(0, LIST_LIMIT).map((node) => {
                const isSelected = node.id === selectedId;
                return (
                  <li key={node.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(node.id)}
                      aria-pressed={isSelected}
                      data-testid={`brain-entity-${node.id}`}
                      className={`flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-left transition-ds duration-ds-fast ${
                        isSelected ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'
                      }`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-medium text-white">{node.label}</span>
                        <span className="block truncate font-mono text-ds-micro text-zinc-500">
                          {node.kind} · {node.ref}
                        </span>
                      </span>
                      <span className="hidden text-ds-micro uppercase tracking-wide text-zinc-500 sm:inline">
                        {BRAIN_AUTHORITY_LABELS[node.authority]}
                      </span>
                      <StatusBadge tone={BRAIN_STATUS_TONES[node.status]} dataStatus={node.status}>
                        {BRAIN_STATUS_LABELS[node.status]}
                      </StatusBadge>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {visible.length > LIST_LIMIT && (
            <p className="mt-2 text-ds-micro text-zinc-500">
              Showing the first {LIST_LIMIT} of {visible.length} entities. Narrow the filters to see the rest — the count above is
              always the true total.
            </p>
          )}
        </WorkspaceSection>
      </WorkspaceGrid>
    </WorkspaceFrame>
  );
}

/**
 * Entity inspector — the "why" surface. Shows the entity's canonical fields,
 * the authority model that owns it, every relationship with the evidence that
 * proves it, and the provenance pointer back to the record it was read from.
 */
function BrainEntityInspector({
  node,
  relations,
  graphLabel,
  onSelect,
  onNavigate,
}: {
  node: BrainNode;
  relations: { id: string; from: string; to: string; kind: BrainRelationKind; evidence: string }[];
  graphLabel: (id: string) => string;
  onSelect: (id: string) => void;
  onNavigate?: (view: string) => void;
}) {
  const def = BRAIN_KIND_DEFINITIONS[node.kind];
  const destination = DESTINATION[node.kind];
  return (
    <div className="space-y-3" data-testid="brain-inspector">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge tone={BRAIN_STATUS_TONES[node.status]} dataStatus={node.status}>
          {BRAIN_STATUS_LABELS[node.status]}
        </StatusBadge>
        <span className="text-ds-micro uppercase tracking-wide text-zinc-500">{def.label}</span>
      </div>
      <p className="text-xs font-medium leading-snug text-white" data-testid="brain-inspector-label">
        {node.label}
      </p>
      {node.subtitle && <p className="text-ds-micro leading-snug text-zinc-500">{node.subtitle}</p>}
      <p className="text-ds-micro leading-snug text-zinc-400">{def.note}</p>

      <RecordFieldList fields={node.properties.map((p) => ({ label: p.label, value: p.value }))} />

      <div className="border-t border-white/[0.06] pt-2">
        <p className="text-ds-micro font-semibold uppercase tracking-[0.14em] text-zinc-500">Execution &amp; authority</p>
        <p className="mt-1 text-ds-label font-medium text-zinc-200">{BRAIN_AUTHORITY_LABELS[node.authority]}</p>
        <p className="text-ds-micro leading-snug text-zinc-400" data-testid="brain-authority-note">
          {BRAIN_AUTHORITY_NOTES[node.authority]}
        </p>
      </div>

      <div className="border-t border-white/[0.06] pt-2">
        <p className="text-ds-micro font-semibold uppercase tracking-[0.14em] text-zinc-500">
          Relationships ({relations.length})
        </p>
        {relations.length === 0 ? (
          <p className="mt-1 text-ds-micro text-zinc-500">
            No relationship is recorded for this entity. That is stated rather than filled with a plausible-looking edge.
          </p>
        ) : (
          <ul className="mt-1 space-y-1.5" data-testid="brain-relations">
            {relations.slice(0, 40).map((edge) => {
              const outgoing = edge.from === node.id;
              const otherId = outgoing ? edge.to : edge.from;
              return (
                <li key={edge.id} className="text-ds-micro leading-snug">
                  <button
                    type="button"
                    onClick={() => onSelect(otherId)}
                    className="text-left text-zinc-300 underline-offset-2 hover:text-white hover:underline"
                  >
                    <span className="font-mono text-zinc-500">{outgoing ? '→' : '←'}</span>{' '}
                    <span className="text-zinc-400">{BRAIN_RELATION_DEFINITIONS[edge.kind].label}</span>{' '}
                    {graphLabel(otherId)}
                  </button>
                  <span className="block pl-4 text-zinc-600">{edge.evidence}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="border-t border-white/[0.06] pt-2">
        <p className="text-ds-micro font-semibold uppercase tracking-[0.14em] text-zinc-500">Provenance</p>
        <p className="mt-1 font-mono text-ds-micro leading-snug text-zinc-400" data-testid="brain-provenance">
          {node.provenance.origin} · {node.provenance.ref}
          {node.provenance.asOf ? ` · as of ${node.provenance.asOf}` : ''}
        </p>
      </div>

      {destination && onNavigate && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onNavigate(destination.view)}
          data-testid="brain-open-destination"
        >
          Open {destination.label} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}