/**
 * §WAVE 3k (2026-11-25) — BRAND INTELLIGENCE (presentation).
 *
 * Renders the ranking its screen derives, through the shared panel renderer. No figure
 * is computed here. The surface shows the ten-category rule FIRING (the ineligible
 * brands are listed with their reasons, not hidden), states that every monetary figure
 * is an estimate, and never presents an unranked opportunity as a ranked one.
 */
import { ConsoleHeader, MetricStrip } from '@/next/components/ConsolePrimitives';
import { SectionCard } from '@/next/components/ConsoleCharts';
import { PanelCard, type PanelSpec, type PanelRow } from '@/next/components/ConsolePanels';
import {
  AMAZON_PRESENCE_LABELS,
  AUTHORISATION_LABELS,
  CLAIM_LABELS,
  OPPORTUNITY_VERTICALS,
  OPPORTUNITY_VERTICAL_ORDER,
  PO_POTENTIAL_FORMULA,
  SEEDED_OPPORTUNITY_DISCLAIMER,
} from '@/lib/intelligence/opportunityDiscovery';
import { APPROVED_CATEGORIES } from '@/types';
import type { BrandIntelligenceModel } from './AdminBrandIntelligenceScreen';

export interface AdminBrandIntelligenceViewProps {
  model: BrandIntelligenceModel;
  onNavigate: (viewId: string) => void;
}

const count = (n: number) => n.toLocaleString('en-GB');
const money = (n: number) => `£${Math.round(n).toLocaleString('en-GB')}`;
const humanise = (id: string) => id.replace(/_/g, ' ');
const claimLabel = (claim: string) => CLAIM_LABELS[claim as keyof typeof CLAIM_LABELS] ?? humanise(claim);

const row = (label: string, value: string, tone?: PanelRow['tone'], note?: string): PanelRow => ({
  label,
  value,
  tone,
  note,
});

function buildPanels(model: BrandIntelligenceModel): PanelSpec[] {
  const { ranked, ranking, sports, rollup } = model;

  return [
    {
      id: 'brand-intelligence-ranking',
      title: 'Ranked opportunities',
      description:
        'Every eligible brand, ranked by estimated retail-channel PO potential — the platform’s own ranking objective — with speed to revenue as the decisive second. Every figure is an ESTIMATE and every record states its claim class.',
      owner: 'src/lib/intelligence/opportunityDiscovery.ts (rankOpportunities)',
      groups: [
        {
          label: 'Position',
          rows: [
            row('Prospects considered', count(model.prospectsConsidered)),
            row('Ranked (eligible)', count(ranked.length), ranked.length > 0 ? 'success' : 'warning'),
            row(
              'Retained but NOT ranked (ineligible)',
              count(ranking.ineligible.length),
              ranking.ineligible.length > 0 ? 'warning' : 'neutral',
              'The ten-category rule forbids spending effort outside the permitted categories, but nothing is dropped silently.'
            ),
            row('Seeded sports opportunities', count(sports.length), 'info', 'Unranked while their ASIN evidence is empty — see the panel below.'),
          ],
        },
        {
          label: 'Each ranked opportunity (PO potential, highest first)',
          rows: ranked.map((r) =>
            row(
              `${r.rank}. ${r.brand}`,
              money(r.estimatedPoPotentialGbp),
              'info',
              `${r.category} · ${OPPORTUNITY_VERTICALS[r.vertical].label} · ${count(r.asinCount)} ASIN(s) · ${
                AMAZON_PRESENCE_LABELS[r.amazonPresence]
              } · ${AUTHORISATION_LABELS[r.authorisationIndicator]} · ${claimLabel(r.claim)}`
            )
          ),
        },
        {
          label: 'What the ranking is built on',
          rows: [
            row('PO potential', PO_POTENTIAL_FORMULA, 'neutral', 'The ranking objective — never a bare vanity figure.'),
            row(
              'Recommended action',
              ranked.length > 0 ? ranked[0].recommendedCta : 'no eligible opportunity yet',
              'info',
              ranked.length > 0 ? `for ${ranked[0].brand}, the strongest opportunity today` : undefined
            ),
          ],
        },
      ],
    },
    {
      id: 'brand-intelligence-ineligible',
      title: 'Excluded by the ten-category rule',
      description:
        'Mercenta may prospect and evaluate ONLY the ten approved retail-channel categories. An unknown category is ineligible — fail-closed, never treated as “probably fine” — and the brand is RETAINED here with the reason rather than deleted.',
      owner: 'src/lib/intelligence/opportunityDiscovery.ts (categoryEligibility) + src/types.ts (APPROVED_CATEGORIES)',
      groups: [
        {
          label: 'Excluded, with the reason',
          rows:
            ranking.ineligible.length === 0
              ? [row('Nothing is excluded', '0', 'success', 'Every prospect considered sits inside a permitted category.')]
              : ranking.ineligible.map((r) => row(r.brand, humanise(r.eligibility.eligibility), 'warning', r.eligibility.reason)),
        },
        {
          label: `The ${APPROVED_CATEGORIES.length} permitted categories (checked by the gate, not by eye)`,
          rows: APPROVED_CATEGORIES.map((c) => row(c, 'permitted', 'success')),
        },
      ],
    },
    {
      id: 'brand-intelligence-verticals',
      title: 'The eight discovery verticals',
      description:
        'Where the opportunities sit. Each vertical states what kind of claim its records make, so a potential distribution opportunity is never presented as a confirmed partnership.',
      owner: 'src/lib/intelligence/opportunityDiscovery.ts (rollupByVertical)',
      groups: [
        {
          label: 'Rollup by vertical',
          rows: OPPORTUNITY_VERTICAL_ORDER.map((id) => {
            const bucket = rollup[id];
            return row(
              OPPORTUNITY_VERTICALS[id].label,
              `${count(bucket.count)} record(s) · ${money(bucket.poPotentialGbp)} PO potential`,
              bucket.count > 0 ? 'info' : 'neutral',
              `${money(bucket.mercentaRevenueGbp)} estimated Mercenta revenue · ${OPPORTUNITY_VERTICALS[id].claimDuty}`
            );
          }),
        },
      ],
    },
    {
      id: 'brand-intelligence-sports',
      title: 'Sports / team / club opportunities',
      description:
        'Hand-seeded opportunities that are NOT derived from a brand prospect. They are deliberately UNRANKED while their ASIN evidence is empty — an unranked opportunity is honest; a ranked one with no evidence would not be.',
      owner: 'src/lib/intelligence/opportunityDiscovery.ts (sportsOpportunities)',
      groups: [
        {
          label: 'Seeded opportunities',
          rows: sports.map((s) =>
            row(
              s.brand,
              'not ranked — no ASIN evidence yet',
              'warning',
              `${s.category} · ${s.sellerStatusEvidence} · next: ${s.recommendedCta}`
            )
          ),
        },
        {
          label: 'The standing honesty line',
          rows: [row('What this is and is not', SEEDED_OPPORTUNITY_DISCLAIMER, 'warning')],
        },
      ],
    },
  ];
}

export function AdminBrandIntelligenceView({ model, onNavigate }: AdminBrandIntelligenceViewProps) {
  const panels = buildPanels(model);
  const totalPo = model.ranked.reduce((sum, r) => sum + r.estimatedPoPotentialGbp, 0);
  const verticalsUsed = OPPORTUNITY_VERTICAL_ORDER.filter((id) => model.rollup[id].count > 0).length;

  const cards = [
    {
      id: 'prospects-considered',
      label: 'Prospects considered',
      value: count(model.prospectsConsidered),
      context: 'the canonical prospect store',
      destination: 'crm',
    },
    {
      id: 'ranked',
      label: 'Ranked opportunities',
      value: count(model.ranked.length),
      context: 'inside permitted categories',
      destination: 'crm',
    },
    {
      id: 'ineligible',
      label: 'Excluded by category',
      value: count(model.ranking.ineligible.length),
      context: 'retained, never dropped',
      destination: 'control_centre',
    },
    {
      id: 'sports',
      label: 'Sports opportunities',
      value: count(model.sports.length),
      context: 'unranked — no evidence yet',
      destination: 'partnerships',
    },
    {
      id: 'po-potential',
      label: 'Estimated PO potential',
      value: money(totalPo),
      context: 'an estimate, not a commitment',
      destination: 'accounting',
    },
    {
      id: 'verticals',
      label: 'Verticals with records',
      value: `${count(verticalsUsed)}/${count(OPPORTUNITY_VERTICAL_ORDER.length)}`,
      context: 'of the declared verticals',
      destination: 'control_centre',
    },
  ];

  return (
    <div>
      <ConsoleHeader
        eyebrow="Mercenta · Brands & Growth"
        title="Brand Intelligence"
        description="Which brands are worth pursuing, ranked by estimated retail-channel PO potential — and which are excluded by the ten-category rule, listed rather than hidden."
        meta={<span>{count(model.allRecords.length)} record(s) on the board</span>}
      />

      <MetricStrip
        columns={6}
        items={cards.map((c) => ({
          id: c.id,
          label: c.label,
          value: c.value,
          context: c.context,
          onClick: () => onNavigate(c.destination),
          testId: `brand-intelligence-${c.id}`,
        }))}
      />

      <div className="space-y-4" data-testid="brand-intelligence-panels">
        {panels.map((panel) => (
          <PanelCard key={panel.id} panel={panel} />
        ))}
      </div>

      <div className="mt-4">
        <SectionCard
          title="What this surface never does"
          description="Stated so it cannot be mistaken for a capability."
        >
          <ul className="list-disc pl-5 space-y-1 text-ds-body text-zinc-700">
            <li>
              It never prospects, estimates or ranks a product outside the ten permitted categories, and it
              never hides an excluded brand — the reason is shown.
            </li>
            <li>
              It never presents an estimate as a commitment, and never calls a purchase order “guaranteed”:
              these are estimated PO potential figures, labelled as estimates.
            </li>
            <li>
              It never claims a partnership. A sports or channel opportunity is a potential distribution
              opportunity Mercenta has identified.
            </li>
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}
