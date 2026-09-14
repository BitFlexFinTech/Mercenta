/**
 * §21/M12 — FOUNDER INVESTOR CENTRE CONTENT (Super Admin only).
 *
 * PRIVATE founder material: the pitches, the talking points, the answers to the
 * hard questions, and the meeting practice script. It exists so the solo founder
 * can walk into an investor meeting prepared, in his own voice.
 *
 * HONESTY CONTRACT (non-negotiable, §16/§17):
 *   • no partnership, endorsement or mandate is claimed anywhere — trade bodies
 *     are described strictly as PROSPECTIVE routes;
 *   • no Amazon approval or programme place is claimed;
 *   • every financial figure quoted in a pitch is DERIVED from the canonical
 *     commercial-model arithmetic (`src/lib/finance/commercialModel.ts`) rather
 *     than typed here, so the founder can never quote a number the platform
 *     disagrees with;
 *   • projections are labelled as projections.
 */
import {
  DEMO_MODEL_A_BRAND_A,
  DEMO_MODEL_B_BRAND_B,
  demoShippingCommercialExample,
} from '@/lib/finance/commercialModel';
import { DEMO_VAT_ILLUSTRATION } from '@/config/vat';

const gbp0 = (n: number) =>
  `£${n.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

/** The canonical numbers, formatted ONCE for every pitch that quotes them. */
export const FOUNDER_KEY_FIGURES = {
  modelA: {
    po: gbp0(DEMO_MODEL_A_BRAND_A.retailChannelRevenueGbp),
    rate: `${DEMO_MODEL_A_BRAND_A.commissionRatePct}%`,
    commission: gbp0(DEMO_MODEL_A_BRAND_A.mercentaCommissionGbp),
    brandAmount: gbp0(DEMO_MODEL_A_BRAND_A.brandAmountGbp),
  },
  modelB: {
    revenue: gbp0(DEMO_MODEL_B_BRAND_B.retailChannelRevenueGbp),
    acquisition: gbp0(DEMO_MODEL_B_BRAND_B.brandAcquisitionCostGbp),
    grossSpread: gbp0(DEMO_MODEL_B_BRAND_B.grossCommercialSpreadGbp),
    costs: gbp0(DEMO_MODEL_B_BRAND_B.totalAdditionalCostsGbp),
    netMargin: gbp0(DEMO_MODEL_B_BRAND_B.netMercentaMarginGbp),
  },
  shipping: {
    list: gbp0(demoShippingCommercialExample().carrierListCost),
    carrierCost: gbp0(demoShippingCommercialExample().carrierInvoiceCost),
    brandCharge: gbp0(demoShippingCommercialExample().brandAmountCharged),
    margin: gbp0(demoShippingCommercialExample().grossShippingMargin),
  },
  vatRate: `${DEMO_VAT_ILLUSTRATION.ratePct}%`,
  vatLabel: DEMO_VAT_ILLUSTRATION.label,
} as const;

export interface FounderPitch {
  id: 'one_line' | 'thirty_seconds' | 'sixty_seconds' | 'two_minutes' | 'five_minutes';
  label: string;
  /** Target spoken length. */
  duration: string;
  /** The script, in the founder's own voice. */
  body: string;
}

export const FOUNDER_PITCHES: readonly FounderPitch[] = [
  {
    id: 'one_line',
    label: 'One line',
    duration: '~10 seconds',
    body:
      'Mercenta is the layer between ambitious brands and the UK retail channel — brands get a UK route to market without building one, and the channel gets a single, compliant, accountable supplier.',
  },
  {
    id: 'thirty_seconds',
    label: '30 seconds',
    duration: '~30 seconds',
    body: `Most good brands outside the UK never reach UK shelves. To sell here properly you need an importer of record, UK compliance, a vendor relationship with the channel, logistics, and someone to chase the money. That is a full-time business most brands will never build.

Mercenta is that layer. We find the brand — UK or anywhere in the world — onboard it, get its compliance right, take the purchase orders, ship through DHL or Palletline, reconcile the money, and pay the brand out. We make money two ways: commission, or buying and reselling. Either way the brand gets UK revenue and we get margin on volume we never had to invent.`,
  },
  {
    id: 'sixty_seconds',
    label: '60 seconds',
    duration: '~60 seconds',
    body: `Here is the problem. A brand outside the UK that wants UK revenue has to become a UK operator: importer of record, customs, UKCA compliance, an account with the channel, warehousing, carrier accounts, invoicing, chargebacks, payouts. That is a business, not a feature. Most brands simply don't do it, and the ones that try usually get the compliance or the paperwork wrong.

Mercenta becomes their UK department. We are the intermediary: the order is addressed to us, we identify the brand, the brand approves or rejects it, and we communicate the outcome back through the channel. Compliance is a hard gate — nothing reaches the catalogue until the applicable documents are verified — then shipping on our own DHL and Palletline accounts, then invoice, payment, reconciliation, accounting, and a payout the brand receives only once we have approved it.

We take margin two ways. On a ${FOUNDER_KEY_FIGURES.modelA.po} order at ${FOUNDER_KEY_FIGURES.modelA.rate} commission we keep ${FOUNDER_KEY_FIGURES.modelA.commission} and the brand receives ${FOUNDER_KEY_FIGURES.modelA.brandAmount}. On distribution we buy at ${FOUNDER_KEY_FIGURES.modelB.acquisition} against ${FOUNDER_KEY_FIGURES.modelB.revenue} of revenue — a ${FOUNDER_KEY_FIGURES.modelB.grossSpread} gross spread, and ${FOUNDER_KEY_FIGURES.modelB.netMargin} net after carrier, payment and agreed costs. On top of that we earn shipping margin: a ${FOUNDER_KEY_FIGURES.shipping.list} carrier cost comes down to ${FOUNDER_KEY_FIGURES.shipping.carrierCost} on our negotiated rate and the brand pays ${FOUNDER_KEY_FIGURES.shipping.brandCharge}.

The engine that finds brands is already built. It scores UK brands and brands anywhere in the world on how quickly they can produce revenue — so a one-person company knows exactly who to contact on Monday morning.`,
  },
  {
    id: 'two_minutes',
    label: '2 minutes',
    duration: '~2 minutes',
    body: `Three parts: the problem, what Mercenta does, and how we make money.

The problem. Brands outside the UK can see UK demand but cannot reach it. Getting product onto UK shelves legally means being the importer of record, handling HMRC and UKCA compliance, holding a vendor relationship with the channel, running carrier accounts, absorbing chargebacks and reconciling payments. Brands do not want to build that. The ones who try usually fail on compliance or cash flow.

What Mercenta does. The channel issues its purchase order to Mercenta, not the brand. We identify which brand that order belongs to, route it into that brand's workspace, and the brand approves, rejects or modifies. We then do the work the brand cannot: compliance as a hard gate, shipping on our DHL and Palletline accounts, ASN and fulfilment, invoice, payment, reconciliation, accounting, and a brand payout that a human approves before a penny leaves.

How we make money. Two models, chosen per brand. Commission: on ${FOUNDER_KEY_FIGURES.modelA.po}, ${FOUNDER_KEY_FIGURES.modelA.rate} means ${FOUNDER_KEY_FIGURES.modelA.commission} for Mercenta and ${FOUNDER_KEY_FIGURES.modelA.brandAmount} for the brand. Distribution: we buy at ${FOUNDER_KEY_FIGURES.modelB.acquisition} and sell at ${FOUNDER_KEY_FIGURES.modelB.revenue} — a ${FOUNDER_KEY_FIGURES.modelB.grossSpread} gross spread and, after carrier, payment fees and agreed costs, ${FOUNDER_KEY_FIGURES.modelB.netMargin} net to us. Shipping is a third line: ${FOUNDER_KEY_FIGURES.shipping.list} list on a DHL lane costs us ${FOUNDER_KEY_FIGURES.shipping.carrierCost} on our negotiated rate while the brand pays ${FOUNDER_KEY_FIGURES.shipping.brandCharge}, so the lane itself carries a ${FOUNDER_KEY_FIGURES.shipping.margin} margin.

What makes this fundable rather than a services agency is that the acquisition engine is software. It tracks brands and scores them on demand, compliance readiness, onboarding probability, operational complexity and distance to revenue, then ranks them — so we do not need a sales team to know who to call first.

In the demo I will show you the whole chain running end to end — discovery, compliance gate, purchase order, shipment, payment, payout approval — with real numbers and no live credentials required.`,
  },
  {
    id: 'five_minutes',
    label: '5 minutes',
    duration: '~5 minutes',
    body: `One: the opportunity. UK consumers buy from brands that have no UK operation. For a brand, entering the UK is not a shipping decision, it is a corporate one: importer of record, HMRC and customs, UKCA product compliance, a vendor relationship with the retail channel, carrier accounts, returns, deductions, chargebacks, and being paid in sterling net of all of it. That is why good brands stay out.

Two: what Mercenta is. We are the intermediary layer. The channel's purchase order is issued to Mercenta. We identify the brand it belongs to, route it into that brand's workspace, and the brand's approve / reject / modify decision comes back to us as an instruction, which we communicate through the channel integration. The same pattern runs across acknowledgements, shipments, ASNs, deductions, chargebacks, cases, payments, reconciliation, accounting and payouts.

Three: how we make money. Two commercial models, both live in the product and configurable per brand. Commission: on a ${FOUNDER_KEY_FIGURES.modelA.po} order at ${FOUNDER_KEY_FIGURES.modelA.rate}, Mercenta keeps ${FOUNDER_KEY_FIGURES.modelA.commission} and the brand receives ${FOUNDER_KEY_FIGURES.modelA.brandAmount}. Distribution: we acquire at ${FOUNDER_KEY_FIGURES.modelB.acquisition} and sell at ${FOUNDER_KEY_FIGURES.modelB.revenue} — a ${FOUNDER_KEY_FIGURES.modelB.grossSpread} gross spread and ${FOUNDER_KEY_FIGURES.modelB.netMargin} net after carrier, payment and other agreed costs, shown cost by cost rather than buried. Shipping is a third recurring line: on a DHL lane a ${FOUNDER_KEY_FIGURES.shipping.list} carrier cost becomes ${FOUNDER_KEY_FIGURES.shipping.carrierCost} on our negotiated discount, the brand pays ${FOUNDER_KEY_FIGURES.shipping.brandCharge}, and the lane carries a ${FOUNDER_KEY_FIGURES.shipping.margin} margin. Those rates are configuration, not hard-coded — negotiate better terms and every calculation moves with them.

Four: why this is scalable. The scarce resource here is not capital, it is knowing which brand to contact next. That is the Brand Intelligence engine: it tracks brands and scores demand, competition headroom, category fit, compliance feasibility, logistics feasibility and onboarding probability, then ranks everything by speed-to-revenue — expected margin, probability of onboarding, compliance readiness, retail-channel readiness, operational complexity and distance to revenue. It runs two strategies at once: high-demand UK brands, the near-term revenue engine, and brands anywhere in the world targeting the UK, which is the scale play. It also holds market-access tagging, so we can measure brands discovered, contacted, qualified, onboarded and revenue generated per campaign and per route.

Five: compliance is not optional and it is not our invention. It is a hard gate: a brand or product cannot enter the catalogue-to-order workflow until every applicable document is present and approved — category-aware, fail-closed, with versioned verification records. A commercial agreement never substitutes for a compliance document. That is precisely why a channel can trust one supplier account with many brands behind it.

Six: what the funding buys. First, turning the simulation into live accounts — credentials and completion work, not rework; the workflows already exist and run end to end without them. Second, brand acquisition against the ranked pipeline, which is where revenue actually comes from. Third, the compliance and legal groundwork that lets us onboard at volume. The platform is deliberately credential-free today: the whole lifecycle — discovery, compliance, orders, shipment, invoice, payment, reconciliation, accounting, payout with human approval, cases — runs deterministically in simulation. That is what you are about to see.`,
  },
] as const;

/* ─ Investor talking points (§21) ─────────────────────────────────────────── */

export interface FounderTalkingPoint {
  id: string;
  title: string;
  body: string;
}

export const FOUNDER_TALKING_POINTS: readonly FounderTalkingPoint[] = [
  { id: 'problem', title: 'Problem', body: 'Good brands cannot reach the UK profitably on their own. Becoming a UK operator means importer of record, customs, UKCA compliance, a channel relationship, carrier accounts, returns, deductions and payouts. It is a business most brands will not build.' },
  { id: 'solution', title: 'Solution', body: 'Mercenta IS that business, as a platform. The order is addressed to us, the brand responds inside our workspace, and we run compliance, logistics, money flow, accounting and payouts — with a human approving every payout.' },
  { id: 'why_now', title: 'Why now', body: 'Cross-border ecommerce expectations are set, UK compliance is stricter and harder than ever, and brands are actively looking for a UK route. At the same time, the tooling to run this (integrations, deterministic simulation, verification providers) is finally cheap enough for a lean operator.' },
  { id: 'uk_market_opportunity', title: 'UK market opportunity', body: 'The UK is one concentrated, English-language market with a mature retail channel and a single regulatory frame. One importer-of-record relationship and one compliance standard covers it — which is exactly why it works as a first destination market.' },
  { id: 'global_brand_opportunity', title: 'Global brand opportunity', body: 'Every non-UK brand with UK demand is a candidate. The engine sources by country and ranks by speed-to-revenue, so the pipeline is as wide as the world and prioritised by realistic time-to-money.' },
  { id: 'amazon_vendor_opportunity', title: 'Retail-channel opportunity', body: 'Vendor-style relationships reward exactly what Mercenta supplies: documentation, on-time fulfilment, ASN discipline and clean reconciliation. That is our operating discipline, and it is enforced by the platform rather than by memory.' },
  { id: 'brand_intelligence', title: 'Brand Intelligence', body: 'Not a static database. It tracks brands, scores them, models market fit and economics, and ranks them by speed to revenue, with market-access tagging so campaigns and routes can be measured end to end.' },
  { id: 'distribution_model', title: 'Distribution model', body: 'Mercenta can take inventory risk and earn a spread instead of a fee. Distribution turns our balance sheet into the brand\'s advantage and gives us a bigger margin for the risk we carry.' },
  { id: 'revenue_model', title: 'Revenue model', body: 'Commission or net spread, plus shipping margin on every lane, plus an optional flat monthly service. All configuration-driven and visible in the product; nothing is hard-coded.' },
  { id: 'competitive_advantage', title: 'Competitive advantage', body: 'The combination is the moat: brand intelligence that ranks opportunities, compliance as a hard gate, PO-gated logistics on our own carrier accounts, and a money chain with mandatory human approval. Competitors usually do one of those.' },
  { id: 'technology', title: 'Technology', body: 'A single platform where every provider sits behind a swappable seam. Simulation today; credentials activate the real providers later with no workflow redesign. Unknown providers fail closed, so the platform never pretends to be live.' },
  { id: 'scalability', title: 'Scalability', body: 'Onboarding, compliance, orders and payouts are workflow, not bespoke work. Adding a brand is a data exercise; adding a source market is a configuration exercise.' },
  { id: 'international_expansion', title: 'International expansion', body: 'Source markets are enumerated and can be tagged per opportunity, so growth is a matter of adding supply and programmes, not rebuilding the product.' },
  { id: 'government_trade_strategy', title: 'Government / trade partnership strategy', body: 'Trade bodies, embassies, high commissions, chambers and export agencies are the most efficient introductions to export-ready brands. We treat them strictly as a PROSPECTIVE strategy: no partnership is claimed, and the platform is built to measure results per programme when such relationships are agreed.' },
  { id: 'funding_use', title: 'Funding use', body: 'Three buckets: activating live providers (credentials and completion, not rework), brand acquisition against the ranked pipeline, and compliance/legal groundwork to onboard at volume.' },
  { id: 'growth_strategy', title: 'Growth strategy', body: 'Phase one: UK brands to prove time-to-revenue. Phase two: international brands at scale, using the same engine. Phase three: programme partnerships and distribution margin as volume justifies inventory risk.' },
] as const;

/* ─ The business model, explained plainly (investor-facing) ───────────────── */
export interface FounderModelSection {
  id: string;
  title: string;
  body: string;
}

export const FOUNDER_BUSINESS_MODEL: readonly FounderModelSection[] = [
  {
    id: 'model_a',
    title: 'Model A — commission / agent-style',
    body: `Mercenta is the vendor of record with the channel. The channel pays Mercenta; Mercenta keeps an agreed commission and remits the rest to the brand. On the canonical example: a ${FOUNDER_KEY_FIGURES.modelA.po} order at ${FOUNDER_KEY_FIGURES.modelA.rate} commission is ${FOUNDER_KEY_FIGURES.modelA.commission} of Mercenta revenue and ${FOUNDER_KEY_FIGURES.modelA.brandAmount} to the brand. The brand carries the cost of goods; Mercenta carries the channel relationship, compliance, logistics and money flow. It is the fastest model to onboard and the one where Mercenta's fixed cost per order is lowest.`,
  },
  {
    id: 'model_b',
    title: 'Model B — buy / resell / distribution',
    body: `Mercenta buys the goods from the brand and resells into the channel, so Mercenta takes on inventory risk and the margin is a spread rather than a fee. On the canonical example: ${FOUNDER_KEY_FIGURES.modelB.revenue} of revenue against a ${FOUNDER_KEY_FIGURES.modelB.acquisition} acquisition cost is a ${FOUNDER_KEY_FIGURES.modelB.grossSpread} GROSS commercial spread. Costs are then shown separately — carrier, payment fees, other agreed costs, deductions — ${FOUNDER_KEY_FIGURES.modelB.costs} in total on the example — leaving ${FOUNDER_KEY_FIGURES.modelB.netMargin} NET Mercenta margin. The gross spread is not the profit; the net margin is.`,
  },
  {
    id: 'how_mercenta_makes_money',
    title: 'How Mercenta actually makes money',
    body: `Three revenue lines. (1) Commercial margin: either the commission on a sale or the net spread on a distribution trade. (2) Shipping margin: Mercenta holds the DHL and Palletline accounts, so the difference between the negotiated carrier cost and the brand charge is Mercenta's, per shipment. (3) Subscription/administration, where a brand is on a flat monthly service — Stripe bills that and nothing else. Every line is derived from configuration, so improving a negotiated rate or a commission percentage moves the numbers everywhere at once.`,
  },
  {
    id: 'shipping_revenue',
    title: 'Shipping revenue is a real line, not an afterthought',
    body: `On the canonical DHL illustration: a ${FOUNDER_KEY_FIGURES.shipping.list} carrier list cost less our negotiated discount is ${FOUNDER_KEY_FIGURES.shipping.carrierCost} to Mercenta, and the brand is charged ${FOUNDER_KEY_FIGURES.shipping.brandCharge} — a ${FOUNDER_KEY_FIGURES.shipping.margin} gross shipping margin. Crucially, the carrier cost side and the brand charge side are BOTH retained in the platform, never merged, so margin per lane is always auditable. Shipment creation is gated on a valid purchase order, which is also our anti-abuse control on those carrier accounts.`,
  },
  {
    id: 'distribution_economics',
    title: 'Distribution economics',
    body: `Distribution is where Mercenta's balance sheet becomes the brand's advantage: the brand gets paid without waiting for the channel, and Mercenta earns a spread for carrying the risk. Because the platform records every cost separately — carrier, payment, agreed fees, deductions — a distribution trade can be priced line by line, and a trade that looks wrong is blocked for review rather than paid out.`,
  },
  {
    id: 'international_expansion',
    title: 'International expansion',
    body: `The destination market is the UK, and the source market can be anywhere: Africa, the Gulf, Asia, Europe, the Americas, Oceania. That symmetry is deliberate — the platform's identity, compliance, logistics and payout layers do not care where the brand sits, so the same workflow that onboards a UK brand onboards a Zimbabwean or Emirati one. Growth is therefore a matter of adding source markets and brand supply, not rebuilding the product.`,
  },
  {
    id: 'uk_brand_acquisition',
    title: 'UK brand acquisition (the near-term revenue engine)',
    body: `UK brands are the shortest path to a first order: the brand, the market and the logistics lane are already aligned, compliance is usually closer, and onboarding is faster. The intelligence engine ranks them on demand, competition headroom, compliance feasibility, onboarding probability, operational complexity and distance to revenue, so the founder always knows the next call.`,
  },
  {
    id: 'global_brand_acquisition',
    title: 'Global brand acquisition (the scale play)',
    body: `International brands need exactly what Mercenta sells: a UK importer of record, UK compliance, distribution and someone to hold the channel relationship. It is a far larger universe, a longer sales cycle and a higher margin per brand, because the barrier Mercenta removes is bigger. Both strategies are scored by the same engine and can be worked simultaneously.`,
  },
] as const;

/* ─ Difficult questions — with answers written to be SPOKEN (§21) ─────────── */

export interface FounderQuestion {
  id: string;
  question: string;
  /** The answer, in the founder's own voice. Honest, specific, no PR gloss. */
  answer: string;
}

export const FOUNDER_DIFFICULT_QUESTIONS: readonly FounderQuestion[] = [
  { id: 'why_brands_use_mercenta', question: 'Why would brands use Mercenta rather than sell direct?', answer: 'Because selling into the UK properly is not a website, it is a corporate operation — importer of record, customs, UKCA compliance, a channel relationship, carrier accounts, deductions and payouts. Most brands will never build that. We already have it, so they get UK revenue without hiring a UK team.' },
  { id: 'why_cant_brands_do_it', question: 'Why can\'t brands do this themselves?', answer: 'Some can, and those brands are not our customer. The ones that cannot are the majority: they lack the UK entity, the compliance knowledge, the carrier rates and the cash-flow tolerance. The specific thing they cannot buy cheaply is the carrier discount and the channel relationship.' },
  { id: 'why_amazon', question: 'Why the retail channel specifically?', answer: 'A vendor-style relationship is predictable: purchase orders, defined fulfilment windows, documented compliance, clear deductions. That suits a platform — the rules are explicit, so most of it can be automated and audited rather than negotiated each time.' },
  { id: 'if_amazon_changes_policy', question: 'What happens if the channel changes its policies?', answer: 'The compliance and workflow layers are rule-driven and configuration-based, not hard-coded, so a policy change is a configuration and document-set change. And the same engine can serve other UK retail channels, because the intermediary role is the product — this channel is the first one, not the only possible one.' },
  { id: 'how_makes_money', question: 'How does Mercenta make money?', answer: `Three lines. Commission or net distribution spread on the sale — ${FOUNDER_KEY_FIGURES.modelA.commission} on the ${FOUNDER_KEY_FIGURES.modelA.po} commission example, or ${FOUNDER_KEY_FIGURES.modelB.netMargin} net on the ${FOUNDER_KEY_FIGURES.modelB.revenue} distribution example. Shipping margin per lane — ${FOUNDER_KEY_FIGURES.shipping.margin} on the ${FOUNDER_KEY_FIGURES.shipping.list} illustration. And an optional flat monthly service fee.` },
  { id: 'model_a_vs_b', question: 'What is the difference between Model A and Model B?', answer: `Model A is commission: we are the vendor of record and keep a fee — ${FOUNDER_KEY_FIGURES.modelA.commission} of ${FOUNDER_KEY_FIGURES.modelA.po}. Model B is distribution: we buy the goods and resell, so our gross spread is ${FOUNDER_KEY_FIGURES.modelB.grossSpread} and our net margin after costs is ${FOUNDER_KEY_FIGURES.modelB.netMargin}. A is faster to onboard; B earns more per order but requires working capital.` },
  { id: 'protects_margin', question: 'What protects Mercenta\'s margin?', answer: 'It is configuration, not convention: the negotiated carrier discount, the brand charge, the commission rate and the acquisition price all live in one place and every calculation reads from there. If a rate degrades, the platform shows it immediately instead of quietly eroding margin.' },
  { id: 'bad_products', question: 'How do you prevent bad products?', answer: 'Nothing enters the catalogue-to-order workflow until the applicable compliance documents are present and verified, category by category, fail-closed. Manual approval can override a workflow state, never a regulatory requirement.' },
  { id: 'manage_compliance', question: 'How do you manage compliance at volume?', answer: 'Requirements are computed from category and product signals by rules, verification is versioned with an evidence trail, and automated verification is used where a provider exists, with manual review where it cannot be. That is auditable, which is exactly what a channel wants.' },
  { id: 'po_rejected', question: 'What happens when a brand rejects a purchase order?', answer: 'The rejection is captured on the order, routed back to Mercenta, and communicated through the channel integration. Because the brand\'s decision is an instruction to us, not an action by the brand, every outcome is recorded and attributable.' },
  { id: 'chargebacks', question: 'How does Mercenta handle chargebacks and deductions?', answer: 'They are first-class records linked to the order, shipment and payment, and they reduce the payout rather than being absorbed invisibly. If the pattern looks wrong, the payout is blocked for review instead of being paid out.' },
  { id: 'payout_process', question: 'How does the payout process work?', answer: 'Order, invoice, payment received, reconciliation, accounting representation, then a payout PROPOSAL. A human approves it, and only then does Wise (our default rail) settle; Payoneer is the secondary rail. Nothing leaves without that approval, and a settled payout can never be duplicated.' },
  { id: 'scalable', question: 'Why is this scalable with one founder?', answer: 'Because the judgement that consumes founder time — who to contact, what they are worth, how long until revenue — is software rather than intuition. The rest is workflow, and the platform enforces it.' },
  { id: 'why_uk_first', question: 'Why start with the UK?', answer: 'One language, one concentrated market, one regulatory frame, one importer-of-record position, and a mature retail channel. It is the smallest amount of complexity that still proves the whole model.' },
  { id: 'acquire_brands', question: 'How do you acquire brands?', answer: 'Two ranked strategies: UK brands for speed, and brands anywhere in the world for scale, both scored and ranked by speed-to-revenue. Outreach is generated and tracked in the same system, so cost per onboarded brand is measurable.' },
  { id: 'why_international', question: 'Why would international brands choose Mercenta?', answer: 'Because we remove the exact barrier that keeps them out: a UK entity is unnecessary, UK compliance is handled, logistics runs on our accounts, and they are paid in their own currency after our reconciliation. They get UK revenue without a UK operation.' },
  { id: 'gov_role', question: 'What is the role of government or embassy partnerships?', answer: 'They are the best introduction route to export-ready brands, and that is a PROSPECTIVE part of the strategy — we claim no existing partnership or endorsement. The platform is built so that when a programme is agreed we can measure brands discovered, contacted, qualified, onboarded and revenue generated per programme.' },
  { id: 'moat', question: 'What is the moat?', answer: 'The combination: a ranked acquisition engine, a fail-closed compliance gate, PO-gated logistics on our own carrier accounts, and a money chain with mandatory human approval. Each element is replicable; the integrated whole, with the audit trail behind it, is not quick to copy.' },
  { id: 'funding_required', question: 'How much funding is required?', answer: 'Enough for three things: activating live provider accounts, running brand acquisition against the ranked pipeline for several quarters, and the compliance and legal groundwork to onboard at volume. I would rather size the round to a milestone than to a target valuation.' },
  { id: 'funding_used_for', question: 'What will the funding be used for?', answer: 'Credentials and completion work to turn simulation into live accounts, brand acquisition at volume, and compliance/legal scale-up. Notably it is NOT rebuilding the product — the workflows already run end to end without credentials, which is what de-risks the spend.' },
  { id: 'milestones', question: 'What milestones will the funding achieve?', answer: 'First onboarded brands live against real provider accounts, then a first purchase order through the full chain to a settled, human-approved payout, then a repeatable acquisition rate measured per source market. Those are the three proof points that make the next round a growth decision rather than a bet.' },
] as const;

/* ─ Meeting practice (§21) — rehearse each segment with a target time ──────── */

export interface FounderPracticeSegment {
  id: string;
  label: string;
  targetTime: string;
  /** What to actually do in this segment. */
  direction: string;
  /** The canonical thing to show/say, where one exists. */
  cue: string;
}

export const FOUNDER_MEETING_PRACTICE: readonly FounderPracticeSegment[] = [
  {
    id: 'opening',
    label: 'Opening',
    targetTime: '30 seconds',
    direction:
      'Start with why the meeting exists and what you will show. Do not open with the product tour — open with the problem.',
    cue: 'One sentence on the problem, one on what Mercenta is, then: "I will show you the whole chain working, then the numbers."',
  },
  {
    id: 'pitch',
    label: 'Pitch',
    targetTime: '2 minutes (stretch to 5)',
    direction:
      'Deliver the 2-minute pitch from memory, then offer the 5-minute version only if they engage with the numbers.',
    cue: 'Use the pitch tabs on this page; the figures fill themselves from the live configuration.',
  },
  {
    id: 'demo_narration',
    label: 'Demo narration',
    targetTime: '4 minutes',
    direction:
      'Run the investor demo and narrate the stages as ONE story: discovery → compliance gate → order → shipment → money → review → payout → audit. Say out loud that it is deterministic and zero-network.',
    cue: 'Expected: every stage green, network calls 0, identical replay digest. Then show Model A and Model B side by side.',
  },
  {
    id: 'financial_explanation',
    label: 'Financial explanation',
    targetTime: '2 minutes',
    direction:
      'Explain the three revenue lines separately — commercial margin, shipping margin, subscription — and be explicit that the Model B gross spread is NOT the profit.',
    cue: `Model A: ${FOUNDER_KEY_FIGURES.modelA.commission} of ${FOUNDER_KEY_FIGURES.modelA.po}. Model B: ${FOUNDER_KEY_FIGURES.modelB.grossSpread} gross → ${FOUNDER_KEY_FIGURES.modelB.netMargin} net. Shipping: ${FOUNDER_KEY_FIGURES.shipping.margin} per ${FOUNDER_KEY_FIGURES.shipping.list} lane.`,
  },
  {
    id: 'difficult_questions',
    label: 'Difficult questions',
    targetTime: '10 minutes',
    direction:
      'Work the difficult-questions list out loud, in order, without reading the answers. Answer the actual question first, then add one supporting fact — never two.',
    cue: 'If you do not know, say so and say what you will verify. Never guess a compliance or legal position.',
  },
  {
    id: 'closing',
    label: 'Closing',
    targetTime: '1 minute',
    direction:
      'Ask for the specific next step: a follow-up with the milestone plan, or the introduction you actually need. Then stop talking.',
    cue: 'Three proof points: brands live against real accounts, a first PO through to a settled payout, and a repeatable acquisition rate per source market.',
  },
] as const;

/**
 * The canonical caution to display above every pitch/demo claim. It exists so no
 * founder-facing surface can drift into claiming a partnership or Amazon approval.
 */
export const FOUNDER_HONESTY_NOTICE =
  'Internal preparation material, not external marketing. Projections are labelled as projections. No government, embassy, trade-body or retail-channel partnership, approval or endorsement is claimed or implied anywhere in this material.';