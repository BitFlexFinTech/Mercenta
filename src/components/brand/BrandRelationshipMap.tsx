/**
 * §BRAND INTELLIGENCE — TENANT-SCOPED RELATIONSHIP MAP.
 *
 * The brand's OWN slice of the same relationship architecture the Mercenta Brain
 * uses, built by the SAME builder with `scope: { kind: 'brand', tenantId }`.
 *
 * WHY THIS IS NOT THE BRAIN (§8): the Brain is Mercenta-wide and shows
 * prospects, the acquisition pipeline, automations, agents, provider machinery,
 * payout rails and Founder policy. This surface is constructed from
 * tenant-filtered sources and CANNOT contain any of those, because the builder
 * never runs those branches for a brand scope — the isolation is enforced in the
 * domain layer, not by a filter someone could forget to apply.
 *
 * A brand sees: its own products, ASINs, SKUs, purchase orders and lines,
 * shipments, invoices, payments, cases, conversations, compliance documents, its
 * LOA, its contracts and its commercial-readiness records — plus the retail
 * channel it is connected to THROUGH Mercenta. It never sees another tenant, and
 * there is no direct brand↔channel path.
 */
import { useMemo, useState } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { buildBrainGraph, brainStats } from '@/lib/intelligence/brain/buildGraph';
import { useCanonicalStoreVersion } from '@/data/queries';
import { layoutBrain } from '@/lib/intelligence/brain/layout';
import {
  BRAIN_AUTHORITY_LABELS,
  BRAIN_KIND_DEFINITIONS,
  BRAIN_STATUS_LABELS,
  BRAIN_STATUS_TONES,
} from '@/lib/intelligence/brain/types';
import { BrainCanvas } from '@/components/shared/brain/BrainCanvas';
import { ContextPanel, WorkspaceSection } from '@/components/shared/workspace';
import { EmptyState, StatusBadge } from '@/components/ui';

const LIST_LIMIT = 40;

export function BrandRelationshipMap() {
  const { session } = useApp();
  const tenantId = session?.tenantId;

  const storeVersion = useCanonicalStoreVersion();
  /*
   * §CANONICAL PROPAGATION — rebuilt on every canonical domain change, so this
   * tenant-scoped projection reflects the brand's own live records rather than a
   * snapshot taken at mount. Tenant scope is unchanged: it is still the caller's
   * session tenant id, and an unknown tenant still builds no graph at all.
   */
  const graph = useMemo(() => {
    // `storeVersion` is the canonical change signal, not data: reading it is what
    // ties this tenant-scoped projection to canonical state.
    void storeVersion;
    return tenantId ? buildBrainGraph({ kind: 'brand', tenantId }) : null;
  }, [tenantId, storeVersion]);
  const layout = useMemo(() => (graph ? layoutBrain(graph) : null), [graph]);
  const stats = useMemo(() => (graph ? brainStats(graph) : null), [graph]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (!graph || !layout || !stats) {
    return (
      <WorkspaceSection title="Your records, connected" domain="intelligence">
        <EmptyState
          title="No tenant is in scope"
          description="This map is built for a signed-in brand tenant. Without a tenant it shows nothing rather than Mercenta-wide data."
        />
      </WorkspaceSection>
    );
  }

  const visibleIds = new Set(graph.nodes.map((n) => n.id));
  const selected = selectedId ? graph.nodes.find((n) => n.id === selectedId) : undefined;
  const selectedRelations = selectedId ? graph.edges.filter((e) => e.from === selectedId || e.to === selectedId) : [];

  return (
    <WorkspaceSection
      title="Your records, connected"
      description="How your products, orders, shipments, documents and cases relate to each other — and where Mercenta sits between you and the retail channel."
      domain="intelligence"
    >
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1" data-testid="brand-map-counts">
        <span className="font-mono text-ds-micro text-zinc-500">
          {stats.nodes} of your records · {stats.edges} relationships
        </span>
        <StatusBadge tone="info" dataStatus="info">
          Your tenant only
        </StatusBadge>
      </div>

      <BrainCanvas
        graph={graph}
        layout={layout}
        visibleIds={visibleIds}
        selectedId={selectedId}
        onSelect={setSelectedId}
        className="h-[320px] sm:h-[400px]"
        testId="brand-map-canvas"
      />

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <ContextPanel title={selected ? `Selected — ${BRAIN_KIND_DEFINITIONS[selected.kind].label}` : 'Select a record'}>
          {selected ? (
            <div className="space-y-2" data-testid="brand-map-inspector">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone={BRAIN_STATUS_TONES[selected.status]} dataStatus={selected.status}>
                  {BRAIN_STATUS_LABELS[selected.status]}
                </StatusBadge>
                <span className="text-ds-micro uppercase tracking-wide text-zinc-500">
                  {BRAIN_AUTHORITY_LABELS[selected.authority]}
                </span>
              </div>
              <p className="text-xs font-medium leading-snug text-white">{selected.label}</p>
              {selected.subtitle && <p className="text-ds-micro text-zinc-500">{selected.subtitle}</p>}
              <ul className="space-y-1">
                {selected.properties.slice(0, 10).map((property) => (
                  <li key={property.label} className="flex items-start justify-between gap-3 text-ds-micro">
                    <span className="text-zinc-500">{property.label}</span>
                    <span className="text-right text-zinc-300">{property.value}</span>
                  </li>
                ))}
              </ul>
              <div className="border-t border-white/[0.06] pt-2">
                <p className="text-ds-micro font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  Relationships ({selectedRelations.length})
                </p>
                <ul className="mt-1 space-y-1" data-testid="brand-map-relations">
                  {selectedRelations.slice(0, 12).map((edge) => {
                    const outgoing = edge.from === selected.id;
                    const otherId = outgoing ? edge.to : edge.from;
                    const other = graph.nodes.find((n) => n.id === otherId);
                    return (
                      <li key={edge.id} className="text-ds-micro leading-snug text-zinc-400">
                        <span className="font-mono text-zinc-500">{outgoing ? '→' : '←'}</span>{' '}
                        <span className="text-zinc-300">{other?.label ?? otherId}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
              <p className="text-ds-micro text-zinc-600" data-testid="brand-map-provenance">
                Source: {selected.provenance.ref}
              </p>
            </div>
          ) : (
            <p className="text-ds-label leading-snug text-zinc-400" data-testid="brand-map-inspector-empty">
              Select a record in the map or the list to see what it connects to.
            </p>
          )}
        </ContextPanel>

        <ContextPanel title="What this map never shows">
          <ul className="space-y-1.5">
            {graph.exclusions.map((line) => (
              <li key={line} className="text-ds-micro leading-snug text-zinc-400">
                {line}
              </li>
            ))}
          </ul>
        </ContextPanel>
      </div>

      <ul className="mt-3 divide-y divide-white/[0.05] overflow-hidden rounded-ds-lg border border-white/[0.06] bg-ink-850">
        {graph.nodes.slice(0, LIST_LIMIT).map((node) => (
          <li key={node.id}>
            <button
              type="button"
              onClick={() => setSelectedId(node.id)}
              aria-pressed={node.id === selectedId}
              data-testid={`brand-map-entity-${node.id}`}
              className={`flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-left transition-ds duration-ds-fast ${
                node.id === selectedId ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'
              }`}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium text-white">{node.label}</span>
                <span className="block truncate font-mono text-ds-micro text-zinc-500">
                  {BRAIN_KIND_DEFINITIONS[node.kind].label}
                </span>
              </span>
              <StatusBadge tone={BRAIN_STATUS_TONES[node.status]} dataStatus={node.status}>
                {BRAIN_STATUS_LABELS[node.status]}
              </StatusBadge>
            </button>
          </li>
        ))}
      </ul>
      {graph.nodes.length > LIST_LIMIT && (
        <p className="mt-2 text-ds-micro text-zinc-500">
          Showing the first {LIST_LIMIT} of {graph.nodes.length} records.
        </p>
      )}
    </WorkspaceSection>
  );
}