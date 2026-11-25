/**
 * §WAVE 3j (2026-11-25) — THE CONTROL CENTRE'S SPECIALISED PANELS (the panel model).
 *
 * WHY THIS FILE EXISTS. The Control Centre's owner (`buildControlCentre`) derives
 * ~30 specialised sub-models — the pre-audit and commercial-readiness queues, the
 * capital/financing family, the intelligence family, the framework and education
 * families, the automation family — and WAVE 3i rendered only the ten areas' metric
 * cards, the attention list and the provenance list. Every sub-model was therefore
 * computed and then thrown away. This module is the ONE place that turns those
 * sub-models into panels the screen can draw.
 *
 * THE RULES THIS FILE FOLLOWS
 * - It reads the model. It NEVER computes a figure and never re-derives one: every
 *   row's value is a field the owner already produced (or a `.length` of an array the
 *   owner produced).
 * - Every panel names the CANONICAL OWNER it reports on, so the surface shows
 *   provenance rather than implying it.
 * - Every panel DECLARES the model keys it renders (`modelKeys`). That declaration is
 *   what makes the coverage gate possible: `scripts/validate-control-centre-panels.mjs`
 *   compares the declared keys against the keys of the model the owner actually builds,
 *   so a NEW sub-model added to the owner FAILS the gate until it is drawn. A silently
 *   computed-and-discarded sub-model therefore cannot be re-introduced.
 * - A queue panel carries its rows IN FULL (never a curated subset) and names the model
 *   key they came from, so the gate compares `panel.queue.rows.length` with the model's
 *   own count.
 * - Panels that prove a fail-closed rule show the LIVE example the owner computed, not
 *   a written claim: "computed, not written".
 */
import type {
  CommercialReadinessQueueRow,
  ControlCentreModel,
  ControlCentreSectionId,
  PreAuditQueueRow,
} from '@/lib/commandCentre/controlCentre';
import type { PanelGroup, PanelRow, PanelSpec } from '@/next/components/ConsolePanels';

/* §WAVE 3k — the row and group shapes are the SHARED renderer's (one owner), aliased
   here so a panel definition written in WAVE 3j keeps working unchanged. */
export type ControlPanelRow = PanelRow;
export type ControlPanelGroup = PanelGroup;

/**
 * A canonical queue rendered as a full table. `kind` selects the column set in the
 * view; the rows are the owner's own rows, untouched.
 */
export interface ControlPanelQueue {
  kind: 'pre_audit' | 'commercial_readiness';
  /** The model key these rows came from — asserted against the model by the gate. */
  modelKey: 'preAudit' | 'commercial';
  rows: PreAuditQueueRow[] | CommercialReadinessQueueRow[];
}

export interface ControlPanel extends PanelSpec {
  /** The capability area this panel belongs to, so it draws under its own tab. */
  section: ControlCentreSectionId;
  /** Every model key this panel renders. The coverage gate unions these. */
  modelKeys: (keyof ControlCentreModel)[];
  /** Present only on a panel that renders a whole canonical queue. */
  queue?: ControlPanelQueue;
}

/* ── Formatting helpers (presentation only — no business arithmetic) ─────────── */

const row = (label: string, value: string, tone?: PanelRow['tone'], note?: string): ControlPanelRow => ({
  label,
  value,
  tone,
  note,
});

const count = (n: number) => n.toLocaleString('en-GB');
const money = (n: number) => `£${Math.round(n).toLocaleString('en-GB')}`;
const pct = (n: number, dp = 1) => `${n.toFixed(dp)}%`;
const yesNo = (v: boolean) => (v ? 'YES' : 'NO');
const refuseOrAllow = (refusal: unknown) => (refusal ? 'REFUSED' : 'allowed');
const humanise = (id: string) => id.replace(/_/g, ' ');
const rate = (r: number | null) => (r === null ? 'not enough data to state a rate' : `${(r * 100).toFixed(1)}%`);

/* ── BUSINESS — the platform's own operating frameworks ─────────────────────── */

function businessPanels(model: ControlCentreModel): ControlPanel[] {
  const fi = model.founderIntelligence;
  const il = model.integratedLoop;
  const bi = model.intelligence;
  const cf = model.countryFramework;
  const loc = model.localisation;
  const seo = model.localisationSeo;

  return [
    {
      id: 'founder-intelligence',
      section: 'business',
      title: 'Founder questions',
      description:
        'Every standing question is declared once and names the canonical owner that answers it. AI may summarise an answer; an AI-supplied figure is refused.',
      owner: 'src/config/founderIntelligence.ts + src/lib/intelligence/founderIntelligence.ts',
      modelKeys: ['founderIntelligence'],
      groups: [
        {
          label: 'Coverage',
          rows: [
            row('Questions declared', count(fi.questionCount)),
            row('Distinct canonical owners', count(fi.dataOwnerCount)),
            row('AI may summarise', count(fi.aiSummarisableCount), 'info'),
            row(
              'AI may ONLY summarise (never supply a figure)',
              yesNo(fi.aiMayOnlySummarise),
              fi.aiMayOnlySummarise ? 'success' : 'danger'
            ),
            row(
              'Answers come from canonical data',
              yesNo(fi.answersFromCanonicalData),
              fi.answersFromCanonicalData ? 'success' : 'danger'
            ),
            row(
              'One owner, failing closed',
              yesNo(fi.oneOwner && fi.failsClosed),
              fi.oneOwner && fi.failsClosed ? 'success' : 'danger'
            ),
          ],
        },
        {
          label: 'Each question and the owner that answers it',
          rows: fi.questions.map((q) => row(q.question, q.dataOwner, 'neutral', q.about)),
        },
        {
          label: 'Fail-closed proof (computed when the model is built, not written)',
          rows: [
            row(
              fi.exampleRefusal.question,
              refuseOrAllow(fi.exampleRefusal.refusal),
              fi.exampleRefusal.refusal ? 'success' : 'danger',
              fi.exampleRefusal.reason
            ),
          ],
        },
      ],
    },
    {
      id: 'integrated-loop',
      section: 'business',
      title: 'Integrated acquisition → capital → operations loop',
      description:
        'The end-to-end journey declared once. Each stage names the canonical module that owns it; the loop is forward-only and closes into the founder intelligence layer.',
      owner: 'src/config/integratedLoop.ts + src/lib/intelligence/integratedLoop.ts',
      modelKeys: ['integratedLoop'],
      groups: [
        {
          label: 'Shape',
          rows: [
            row('Stages', count(il.stageCount)),
            row('Distinct canonical owners', count(il.distinctOwnerCount)),
            row('Entry stage', il.entryStageId),
            row('Final stage', il.finalStageId),
            row(
              'Closes into founder intelligence',
              yesNo(il.closesIntoFounderIntelligence),
              il.closesIntoFounderIntelligence ? 'success' : 'danger'
            ),
            row('Forward-only (no back-step)', yesNo(il.forwardOnly), il.forwardOnly ? 'success' : 'danger'),
            row(
              'Every stage has a canonical owner',
              yesNo(il.stagesHaveCanonicalOwners),
              il.stagesHaveCanonicalOwners ? 'success' : 'danger'
            ),
          ],
        },
        {
          label: 'Stages, in order',
          rows: il.stages.map((s) =>
            row(s.label, s.dataOwner, 'neutral', s.predecessor ? `after ${s.predecessor}` : 'entry stage')
          ),
        },
        {
          label: 'Fail-closed proof (computed, not written)',
          rows: [
            row(
              `${il.exampleRefusal.from} → ${il.exampleRefusal.to}`,
              refuseOrAllow(il.exampleRefusal.refusal),
              il.exampleRefusal.refusal ? 'success' : 'danger',
              il.exampleRefusal.reason
            ),
          ],
        },
      ],
    },
    {
      id: 'intelligence-findings',
      section: 'business',
      title: 'Intelligence findings',
      description:
        'What the platform has noticed, by domain and by the basis behind each finding — so a simulated or AI-interpreted finding is never mistaken for a canonical record.',
      owner: 'src/lib/intelligence/intelligenceLayer.ts',
      modelKeys: ['intelligence'],
      groups: [
        {
          label: 'Findings',
          rows: [
            row('Findings', count(bi.total)),
            row('Critical', count(bi.critical), bi.critical > 0 ? 'danger' : 'success'),
            row('Important', count(bi.important), bi.important > 0 ? 'warning' : 'success'),
            row('Actionable', count(bi.actionable)),
          ],
        },
        {
          label: 'By domain',
          rows: bi.byDomain.map((d) =>
            row(
              d.label,
              `${count(d.count)} · ${count(d.critical)} critical · ${count(d.important)} important`,
              d.critical > 0 ? 'danger' : d.important > 0 ? 'warning' : 'success'
            )
          ),
        },
        {
          label: 'By basis (how each finding knows what it knows)',
          rows: Object.keys(bi.byBasis).map((key) => row(humanise(key), count(bi.byBasis[key as keyof typeof bi.byBasis]))),
        },
      ],
    },
    {
      id: 'country-framework',
      section: 'business',
      title: 'Country framework',
      description:
        'Every country is classified into one or more of the six declared roles. The marketplace role is factual and sourced, and Zimbabwe is never a marketplace.',
      owner: 'src/config/countryFramework.ts + src/lib/geography/resolveCountry.ts',
      modelKeys: ['countryFramework'],
      groups: [
        {
          label: 'Framework',
          rows: [
            row('Roles declared', count(cf.roles.length)),
            row('Countries classified', count(cf.countryCount)),
            row('Marketplaces', count(cf.marketplaceCount)),
            row(
              'Zimbabwe is never an Amazon marketplace',
              yesNo(cf.zimbabweNeverMarketplace),
              cf.zimbabweNeverMarketplace ? 'success' : 'danger'
            ),
            row(
              'Production priority policy configured',
              yesNo(cf.priorityPolicyConfigured),
              cf.priorityPolicyConfigured ? 'success' : 'warning',
              'FALSE until the founder sets one. The surface states the gap rather than inventing a priority order.'
            ),
          ],
        },
        { label: 'Roles', rows: cf.roles.map((r) => row(r.label, r.kind, 'neutral', r.source)) },
        {
          label: 'Countries by role',
          rows: Object.keys(cf.byRole).map((role) =>
            row(humanise(role), count(cf.byRole[role as keyof typeof cf.byRole]))
          ),
        },
        { label: 'Source', rows: [row('Where the classification comes from', cf.source, 'neutral', cf.basis)] },
      ],
    },
    {
      id: 'localisation',
      section: 'business',
      title: 'Localisation and currency',
      description:
        'Locale, display currency and settlement currency are three separate concepts. A detected country produces a suggestion only; the settlement currency is a commercial-terms fact and is never inferred.',
      owner: 'src/config/localisation.ts + src/lib/localisation/resolveLocalisation.ts',
      modelKeys: ['localisation'],
      groups: [
        {
          label: 'The three concepts',
          rows: [
            row('Concepts declared', count(loc.concepts.length)),
            row('The three concepts stay separate', yesNo(loc.conceptsSeparate), loc.conceptsSeparate ? 'success' : 'danger'),
            row(
              'A detection suggests, it never forces',
              yesNo(loc.suggestionsNeverForce),
              loc.suggestionsNeverForce ? 'success' : 'danger'
            ),
            row('Default locale', loc.defaultLocale),
            row('Default display currency', loc.defaultDisplayCurrency),
          ],
        },
        { label: 'What owns each concept', rows: loc.concepts.map((c) => row(c.label, c.source, 'neutral', c.description)) },
        {
          label: 'Markets',
          rows: loc.markets.map((m) =>
            row(`${m.countryLabel} (${m.countryCode})`, `${m.suggestedLocale} · ${m.suggestedDisplayCurrency}`)
          ),
        },
      ],
    },
    {
      id: 'localisation-seo',
      section: 'business',
      title: 'Localisation, SEO and hreflang',
      description:
        'A hreflang alternate is emitted only for a language Mercenta actually serves content in, and only for a public route. x-default always self-references the served default.',
      owner: 'src/config/localisationSeo.ts + src/lib/localisation/localisationSeo.ts',
      modelKeys: ['localisationSeo'],
      groups: [
        {
          label: 'Hreflang discipline',
          rows: [
            row('Served content locales', seo.servedContentLocales.join(', ') || 'none declared'),
            row('Hreflang default', seo.hreflangDefault),
            row('x-default', seo.hreflangXDefault),
            row(
              'Alternates only for served content locales',
              yesNo(seo.onlyForServedLocales),
              seo.onlyForServedLocales ? 'success' : 'danger'
            ),
            row(
              'x-default self-references the served default',
              yesNo(seo.xDefaultIsSelf),
              seo.xDefaultIsSelf ? 'success' : 'danger'
            ),
            row(
              'Only public routes may carry an alternate',
              yesNo(seo.requiresPublicRoute),
              seo.requiresPublicRoute ? 'success' : 'danger'
            ),
            row('Categories with no public URL refused', count(seo.refusedNonPublic), seo.refusedNonPublic > 0 ? 'warning' : 'neutral'),
          ],
        },
        {
          label: 'Coverage',
          rows: [
            row('Markets', count(seo.marketCount)),
            row('Format conventions', count(seo.formatCount)),
            row('Public routes carrying alternates', count(seo.publicRouteCount)),
            row('Messaging slots', count(seo.messagingSlots.length)),
          ],
        },
        {
          label: 'Markets',
          rows: seo.markets.map((m) => row(`${m.countryLabel} (${m.countryCode})`, `${m.timezone} · ${m.suggestedLocale}`)),
        },
        {
          label: 'Public routes and their alternates',
          rows: seo.publicRouteAlternates.map((p) =>
            row(p.path, `${count(p.alternates.length)} alternate(s) · x-default ${p.xDefault}`, 'neutral', p.title)
          ),
        },
      ],
    },
  ];
}

/* ── BRANDS — onboarding, learning and enablement (the brands tab's "onboarding"
      and "readiness" half; the portfolio half is in the model's own counts) ────── */

function brandsPanels(model: ControlCentreModel): ControlPanel[] {
  const oc = model.onboardingCurriculum;
  const ll = model.learningLoop;
  const ce = model.contextualEducation;
  const sw = model.sharedWorkflows;
  const tr = model.tutorialRecordings;

  return [
    {
      id: 'onboarding-curriculum',
      section: 'brands',
      title: 'Onboarding academy curriculum',
      description:
        'The ordered stages a brand progresses through. A topic — and therefore a stage — is complete only when its VALIDATE gate is satisfied; the final readiness stage is reached only once every teaching stage is complete.',
      owner: 'src/config/onboardingCurriculum.ts + src/lib/education/resolveCurriculum.ts',
      modelKeys: ['onboardingCurriculum'],
      groups: [
        {
          label: 'Curriculum',
          rows: [
            row('Stages', count(oc.stageCount)),
            row('Teaching stages', count(oc.teachingStageCount)),
            row('Topics', count(oc.topicCount)),
            row('Final readiness stage', oc.readinessStageId),
            row(
              'Readiness requires every teaching stage',
              yesNo(oc.finalReadinessRequiresAllStages),
              oc.finalReadinessRequiresAllStages ? 'success' : 'danger'
            ),
          ],
        },
        {
          label: 'Stages, in order',
          rows: oc.stages.map((s) =>
            row(`${s.order}. ${s.label}`, `${count(s.topicCount)} topic(s)`, s.gating ? 'info' : 'neutral', s.kind)
          ),
        },
        {
          label: 'Demo position (labelled — the repository holds a labelled demo brand)',
          rows: [
            row('Current stage', oc.demo.currentStageLabel),
            row('Readiness reached', yesNo(oc.demo.readinessReached), oc.demo.readinessReached ? 'success' : 'warning'),
            ...oc.demo.stages.map((s) =>
              row(
                s.label,
                `${humanise(s.state)} · ${count(s.completedTopics)}/${count(s.totalTopics)} topic(s)`,
                s.state === 'complete' ? 'success' : s.state === 'in_progress' ? 'info' : 'neutral'
              )
            ),
          ],
        },
      ],
    },
    {
      id: 'learning-loop',
      section: 'brands',
      title: 'Brand learning loop',
      description:
        'A brand moves LEARN → WATCH → DO → VALIDATE → COMPLETE. VALIDATE is a gate satisfied only by a real signal — a topic is never complete merely because the brand said so.',
      owner: 'src/config/learningLoop.ts + src/lib/education/resolveLearningProgress.ts',
      modelKeys: ['learningLoop'],
      groups: [
        {
          label: 'The loop',
          rows: [
            row('Stages', count(ll.stageCount)),
            row('The ONE gate stage', humanise(ll.gateStage), 'info'),
            row('Topics', count(ll.topicCount)),
            row(
              'A topic is never complete from a click',
              yesNo(ll.validateRequiresEvidence),
              ll.validateRequiresEvidence ? 'success' : 'danger'
            ),
          ],
        },
        {
          label: 'Stages, in order',
          rows: ll.stages.map((s) =>
            row(s.label, humanise(s.id), s.gate ? 'info' : 'neutral', `${s.meaning} What the brand does: ${s.action}`)
          ),
        },
        {
          label: 'Topics (each reuses the academy seam; no second list)',
          rows: ll.topics.map((t) =>
            row(t.label, `academy stage ${t.academyStage}`, 'neutral', `${t.articleId} · tour ${t.tourId}`)
          ),
        },
        {
          label: 'Demo topic position (labelled)',
          rows: [
            row(ll.demo.label, ll.demo.currentStage, ll.demo.complete ? 'success' : 'warning', `topic ${ll.demo.topicId}`),
            row(
              'Validate gate satisfied',
              yesNo(ll.demo.validateSatisfied),
              ll.demo.validateSatisfied ? 'success' : 'warning'
            ),
          ],
        },
      ],
    },
    {
      id: 'contextual-education',
      section: 'brands',
      title: 'Contextual education',
      description:
        'Each real field on a real screen carries a short "why do we need this?" explanation that links to the canonical Knowledge Base article teaching it and the canonical guided tour of that screen. The help text is never duplicated.',
      owner: 'src/config/contextualEducation.ts + src/lib/education/resolveContextualHelp.ts',
      modelKeys: ['contextualEducation'],
      groups: [
        {
          label: 'Coverage',
          rows: [
            row('Screens explained', count(ce.screenCount)),
            row('Field explanations', count(ce.explanationCount)),
            row('Canonical articles reused', count(ce.articleIds.length)),
            row(
              'Reuses the canonical knowledge base',
              yesNo(ce.reuseCanonicalKb),
              ce.reuseCanonicalKb ? 'success' : 'danger'
            ),
            row(
              'Attaches to the real screens',
              yesNo(ce.attachToRealScreens),
              ce.attachToRealScreens ? 'success' : 'danger'
            ),
          ],
        },
        {
          label: 'Screens',
          rows: ce.screens.map((s) =>
            row(
              s.label,
              `${count(s.fieldCount)} field(s)`,
              s.tourId ? 'info' : 'warning',
              s.tourName ? `guided tour: ${s.tourName}` : 'no guided tour attached'
            )
          ),
        },
        {
          label: 'Explanations',
          rows: ce.explanations.map((e) => row(e.label, e.articleTitle, 'neutral', `${e.why} Screen: ${e.screenLabel}.`)),
        },
        {
          label: 'A labelled demo field (resolved from the owner, never retyped)',
          rows: ce.demo
            ? [
                row(
                  ce.demo.label,
                  ce.demo.articleTitle,
                  'info',
                  `${ce.demo.why}${ce.demo.tourName ? ` Tour: ${ce.demo.tourName}.` : ''}`
                ),
              ]
            : [row('Demo field', 'none declared', 'neutral')],
        },
      ],
    },
    {
      id: 'shared-workflows',
      section: 'brands',
      title: 'Shared workflows',
      description:
        'The canonical journeys through the real screens that the browser tests, the tutorial recordings and the onboarding walkthroughs ALL reuse: the guided tour defines the journey, and its anchors are the same contract the browser test drives.',
      owner: 'src/config/sharedWorkflows.ts + src/lib/education/resolveSharedWorkflow.ts',
      modelKeys: ['sharedWorkflows'],
      groups: [
        {
          label: 'Shared automation',
          rows: [
            row('Workflows', count(sw.workflowCount)),
            row('Consumers sharing one automation', count(sw.consumerCount)),
            row('One owner', yesNo(sw.oneOwner), sw.oneOwner ? 'success' : 'danger'),
            row('Reuses the canonical guided tours', yesNo(sw.reuseCanonicalTours), sw.reuseCanonicalTours ? 'success' : 'danger'),
            row('Maps to real browser specs', yesNo(sw.mapToRealE2eSpecs), sw.mapToRealE2eSpecs ? 'success' : 'danger'),
          ],
        },
        { label: 'Consumers', rows: sw.consumers.map((c) => row(c.label, c.id)) },
        {
          label: 'Workflows',
          rows: sw.workflows.map((w) =>
            row(w.label, `${count(w.stepCount)} step(s)`, 'neutral', `${w.tourName} · ${w.e2eSpec} · ${w.articleTitle}`)
          ),
        },
      ],
    },
    {
      id: 'tutorial-recordings',
      section: 'brands',
      title: 'Tutorial recordings',
      description:
        'The tutorial catalogue with versioning and outdated detection. A recording is current only when its asset genuinely exists AND its compatible UI version equals the one being served — an uncaptured tutorial is pending, and one on an older UI version is detected as outdated.',
      owner: 'src/config/tutorialRecordings.ts + src/lib/education/resolveTutorialRecording.ts',
      modelKeys: ['tutorialRecordings'],
      groups: [
        {
          label: 'Catalogue',
          rows: [
            row('Served UI version', tr.servedUiVersion),
            row('Asset directory', tr.assetDir),
            row('Recordings', count(tr.recordingCount)),
            row('Current (playable today)', count(tr.playableCount), tr.playableCount > 0 ? 'success' : 'warning'),
            row('Detected outdated', count(tr.outdatedCount), tr.outdatedCount > 0 ? 'warning' : 'neutral'),
            row('Pending (no asset captured)', count(tr.pendingCount), tr.pendingCount > 0 ? 'warning' : 'neutral'),
            row('Detects an outdated recording', yesNo(tr.detectsOutdated), tr.detectsOutdated ? 'success' : 'danger'),
            row(
              'Declares the compatible UI version',
              yesNo(tr.declaresCompatibleUiVersion),
              tr.declaresCompatibleUiVersion ? 'success' : 'danger'
            ),
          ],
        },
        {
          label: 'Recordings',
          rows: tr.recordings.map((r) =>
            row(
              r.title,
              humanise(r.status),
              r.status === 'current' ? 'success' : r.status === 'outdated' ? 'warning' : 'neutral',
              `${r.workflowLabel} · tutorial v${r.tutorialVersion} · compatible with UI ${r.compatibleUiVersion}`
            )
          ),
        },
        {
          label: 'Live examples (computed, not written)',
          rows: [
            row(`Current — ${tr.exampleCurrent.id}`, humanise(tr.exampleCurrent.status), 'info', tr.exampleCurrent.reason),
            row(
              `Outdated — ${tr.exampleOutdated.id}`,
              humanise(tr.exampleOutdated.status),
              'warning',
              tr.exampleOutdated.reason
            ),
          ],
        },
      ],
    },
  ];
}

/* ── COMMERCIAL + ACQUISITION — the two canonical queues and the acquisition chain ── */

function commercialAcquisitionPanels(model: ControlCentreModel): ControlPanel[] {
  const com = model.commercial;
  const pre = model.preAudit;
  const acq = model.acquisition;
  const acqConv = model.acquisitionConversion;
  const ai2 = model.acquisitionIntelligence;
  const uo = model.ukOpportunityStates;
  const or = model.objectResolution;

  return [
    {
      id: 'commercial-readiness-queue',
      section: 'commercial',
      title: 'Commercial readiness queue (every canonical record)',
      description:
        'The product-level commercial queue in full — never a curated subset. Each row states the route, who must act now, the declared deadline and the work item the record raised.',
      owner: 'src/data/commercialReadinessStore.ts via src/lib/commandCentre/controlCentre.ts',
      modelKeys: ['commercial'],
      groups: [],
      queue: { kind: 'commercial_readiness', modelKey: 'commercial', rows: com.rows },
    },
    {
      id: 'commercial-readiness-summary',
      section: 'commercial',
      title: 'Commercial readiness by route',
      description:
        'How the queue resolves by route. A record is ready only through its declared route — it can never silently become ready.',
      owner: 'src/config/commercialReadiness.ts + src/lib/commandCentre/controlCentre.ts',
      modelKeys: ['commercial'],
      groups: [
        {
          label: 'Routes',
          rows: [
            row('Records', count(com.total)),
            row('Ready', count(com.ready), 'success'),
            row('Remediation', count(com.remediation), com.remediation > 0 ? 'warning' : 'neutral'),
            row('Blocked', count(com.blocked), com.blocked > 0 ? 'danger' : 'neutral'),
            row('Under human review', count(com.humanReview), com.humanReview > 0 ? 'info' : 'neutral'),
            row('Needs brand action', count(com.needsBrandAction), com.needsBrandAction > 0 ? 'warning' : 'neutral'),
            row('Needs a Mercenta decision', count(com.needsDecision), com.needsDecision > 0 ? 'warning' : 'neutral'),
            row('Brand guidance articles linked', count(com.brandGuidanceTopics), 'info'),
          ],
        },
      ],
    },
    {
      id: 'pre-audit-queue',
      section: 'acquisition',
      title: 'Explore UK Market Fit pre-audit queue (every canonical assessment)',
      description:
        'Every canonical pre-audit assessment, in full. Each row carries the presence outcome, the qualification, the research mode and whether it has been fed into the acquisition pipeline.',
      owner: 'src/data/preAuditStore.ts via src/lib/commandCentre/controlCentre.ts',
      modelKeys: ['preAudit'],
      groups: [],
      queue: { kind: 'pre_audit', modelKey: 'preAudit', rows: pre.rows },
    },
    {
      id: 'pre-audit-summary',
      section: 'acquisition',
      title: 'Pre-audit outcomes',
      description: 'How the pre-audit queue resolves, and how much of it has been fed into the canonical acquisition pipeline.',
      owner: 'src/config/ukMarketFit.ts + src/data/preAuditStore.ts',
      modelKeys: ['preAudit'],
      groups: [
        {
          label: 'Outcomes',
          rows: [
            row('Assessments', count(pre.total)),
            row('Qualified', count(pre.qualified), 'success'),
            row('Needs information', count(pre.needsInformation), pre.needsInformation > 0 ? 'warning' : 'neutral'),
            row('Ineligible', count(pre.ineligible), 'neutral'),
            row('Not qualified yet', count(pre.unqualified), 'warning'),
            row('Fed into the acquisition pipeline', count(pre.fed), 'info'),
            row('Researched in simulation', count(pre.simulated), pre.simulated > 0 ? 'warning' : 'neutral'),
            row('Founder review requested', count(pre.reviewRequested), pre.reviewRequested > 0 ? 'warning' : 'neutral'),
          ],
        },
      ],
    },
    {
      id: 'acquisition-pipeline',
      section: 'acquisition',
      title: 'Acquisition pipeline',
      description:
        'Every canonical prospect by pipeline stage, with the follow-ups that are due or overdue. A stage that needs attention says so rather than hiding it in a total.',
      owner: 'src/lib/acquisition/acquisitionEngine.ts',
      modelKeys: ['acquisition'],
      groups: [
        {
          label: 'Pipeline',
          rows: [
            row('Prospects', count(acq.total)),
            row('Active', count(acq.active), 'info'),
            row('Disqualified', count(acq.disqualified), acq.disqualified > 0 ? 'neutral' : 'neutral'),
            row('Activated as brands', count(acq.activatedBrands), 'success'),
            row('Awaiting approval', count(acq.awaitingApproval), acq.awaitingApproval > 0 ? 'warning' : 'neutral'),
            row('Follow-ups due', count(acq.followUpsDue), acq.followUpsDue > 0 ? 'warning' : 'neutral'),
            row('Follow-ups overdue', count(acq.followUpsOverdue), acq.followUpsOverdue > 0 ? 'danger' : 'neutral'),
            row('Unassigned', count(acq.unassigned), acq.unassigned > 0 ? 'warning' : 'neutral'),
            row('Duplicate prospect groups', count(acq.duplicates.length), acq.duplicates.length > 0 ? 'warning' : 'neutral'),
          ],
        },
        {
          label: 'Stages',
          rows: acq.stages.map((s) =>
            row(
              s.label,
              `${count(s.count)} · ${pct(s.share, 1)}`,
              s.attention ? 'danger' : 'neutral',
              `records live in ${s.destination}`
            )
          ),
        },
      ],
    },
    {
      id: 'acquisition-conversion',
      section: 'acquisition',
      title: 'Acquisition conversion funnel',
      description:
        'Replied, engaged and converted are the canonical stage each prospect actually reached — never a second reading of the reply text. A rate is stated only when there is enough data to state one.',
      owner: 'src/lib/acquisition/conversionMetrics.ts',
      modelKeys: ['acquisitionConversion'],
      groups: [
        {
          label: 'Funnel',
          rows: [
            row('Prospects considered', count(acqConv.totalRecords)),
            row('Contacted', count(acqConv.counts.contacted)),
            row('Replied', count(acqConv.counts.replied)),
            row('Engaged', count(acqConv.counts.engaged)),
            row('Converted', count(acqConv.counts.converted), acqConv.counts.converted > 0 ? 'success' : 'neutral'),
          ],
        },
        {
          label: 'Rates',
          rows: [
            row('Reply rate', rate(acqConv.rates.replyRate)),
            row('Engagement rate', rate(acqConv.rates.engagementRate)),
            row('Conversion rate', rate(acqConv.rates.conversionRate)),
            row('Replied → engaged', rate(acqConv.rates.replyToEngagementRate)),
          ],
        },
        {
          label: 'By source',
          rows: acqConv.bySource.map((seg) =>
            row(
              humanise(seg.key),
              `${count(seg.counts.contacted)} contacted · ${count(seg.counts.replied)} replied · ${count(seg.counts.converted)} converted`,
              'neutral',
              `reply rate ${rate(seg.rates.replyRate)}`
            )
          ),
        },
        {
          label: 'By category',
          rows: acqConv.byCategory.map((seg) =>
            row(
              humanise(seg.key),
              `${count(seg.counts.contacted)} contacted · ${count(seg.counts.converted)} converted`,
              'neutral',
              `conversion rate ${rate(seg.rates.conversionRate)}`
            )
          ),
        },
        {
          label: 'By owner',
          rows: acqConv.byOwner.map((seg) =>
            row(
              humanise(seg.key),
              `${count(seg.counts.contacted)} contacted · ${count(seg.counts.engaged)} engaged`,
              'neutral',
              `engagement rate ${rate(seg.rates.engagementRate)}`
            )
          ),
        },
      ],
    },
    {
      id: 'acquisition-intelligence',
      section: 'acquisition',
      title: 'Acquisition intelligence at scale',
      description:
        'A signal may rest only on a declared source that supplies its dimension and whose canonical provider is genuinely available. When no provider is available the platform produces no value — it is refused, never fabricated.',
      owner: 'src/config/acquisitionIntelligence.ts + src/lib/intelligence/acquisitionIntelligence.ts',
      modelKeys: ['acquisitionIntelligence'],
      groups: [
        {
          label: 'Position',
          rows: [
            row('Real signals produced today', count(ai2.realSignalCount), ai2.realSignalCount > 0 ? 'success' : 'warning'),
            row('Dimensions declared', count(ai2.dimensions.length)),
            row('Research sources declared', count(ai2.sources.length)),
            row('Sources genuinely available', count(ai2.availableSourceCount), ai2.availableSourceCount > 0 ? 'info' : 'warning'),
            row('Demonstrations allowed', count(ai2.allowedCount), ai2.allowedCount > 0 ? 'success' : 'warning'),
            row('Demonstrations refused', count(ai2.refusedCount), ai2.refusedCount > 0 ? 'success' : 'warning'),
            row('Requires a named source', yesNo(ai2.requiresNamedSource), ai2.requiresNamedSource ? 'success' : 'danger'),
            row('Never fabricates a value', yesNo(ai2.neverFabricates), ai2.neverFabricates ? 'success' : 'danger'),
            row('Reuses the provider registry', yesNo(ai2.sourcesReused), ai2.sourcesReused ? 'success' : 'danger'),
            row('AI summarises only', yesNo(ai2.aiSummarisesOnly), ai2.aiSummarisesOnly ? 'success' : 'danger'),
          ],
        },
        { label: 'Dimensions', rows: ai2.dimensions.map((d) => row(d.label, d.id, 'neutral', d.description)) },
        {
          label: 'Fail-closed proof (computed, not written)',
          rows: [
            row(
              ai2.exampleRefusal.id,
              refuseOrAllow(ai2.exampleRefusal.refusal),
              ai2.exampleRefusal.refusal ? 'success' : 'danger',
              ai2.exampleRefusal.reason
            ),
          ],
        },
      ],
    },
    {
      id: 'uk-opportunity-states',
      section: 'acquisition',
      title: 'UK opportunity states at scale',
      description:
        'Each of the six UK opportunity states is asserted only when every declared evidence source behind it is backed by an available provider. When no provider is available no state is asserted.',
      owner: 'src/config/ukOpportunityStates.ts + src/lib/intelligence/ukOpportunityStates.ts',
      modelKeys: ['ukOpportunityStates'],
      groups: [
        {
          label: 'Position',
          rows: [
            row('Real states asserted today', count(uo.realAssertedCount), uo.realAssertedCount > 0 ? 'success' : 'warning'),
            row('States declared', count(uo.states.length)),
            row('Assertable', count(uo.assertableCount), uo.assertableCount > 0 ? 'info' : 'warning'),
            row('Refused', count(uo.refusedCount), uo.refusedCount > 0 ? 'success' : 'warning'),
            row('Evidence sources declared', count(uo.evidenceSources.length)),
            row(
              'Evidence sources available',
              count(uo.availableEvidenceSourceCount),
              uo.availableEvidenceSourceCount > 0 ? 'info' : 'warning'
            ),
            row('Chain stages the states feed', count(uo.chainStages.length)),
            row('Requires evidence', yesNo(uo.requiresEvidence), uo.requiresEvidence ? 'success' : 'danger'),
            row('Never fabricates a state', yesNo(uo.neverFabricates), uo.neverFabricates ? 'success' : 'danger'),
          ],
        },
        {
          label: 'Fail-closed proof (computed, not written)',
          rows: [
            row(
              uo.exampleRefusal.id,
              refuseOrAllow(uo.exampleRefusal.refusal),
              uo.exampleRefusal.refusal ? 'success' : 'danger',
              uo.exampleRefusal.reason
            ),
          ],
        },
      ],
    },
    /* The resolution index is built from the SAME canonical records (each purchase
       order's number, each consignment's reference), so its panel is derived here. */
    {
      id: 'object-resolution',
      section: 'operations',
      title: 'Whole-platform object resolution',
      description:
        'Every canonical channel object resolves to its Mercenta record, brand and tenant. Anything that does not resolve to exactly one tenant is queued for founder review.',
      owner: 'src/lib/resolution/objectResolution.ts',
      modelKeys: ['objectResolution'],
      groups: [
        {
          label: 'Resolution',
          rows: [
            row('Objects presented', count(or.total)),
            row('Resolved', count(or.resolved), 'success'),
            row('Unresolved', count(or.unknown), or.unknown > 0 ? 'danger' : 'success'),
            row('Cross-tenant conflicts', count(or.crossTenant), or.crossTenant > 0 ? 'danger' : 'success'),
            row('Duplicate deliveries (replays)', count(or.replays), or.replays > 0 ? 'info' : 'neutral'),
            row(
              'Every object resolved to exactly one tenant',
              yesNo(or.fullyResolved),
              or.fullyResolved ? 'success' : 'danger'
            ),
          ],
        },
        {
          label: 'By object type',
          rows: or.byType.map((t) =>
            row(
              humanise(t.objectType),
              `${count(t.resolved)} resolved · ${count(t.unresolved)} unresolved`,
              t.unresolved > 0 ? 'warning' : 'success',
              `${count(t.total)} presented`
            )
          ),
        },
        {
          label: 'Founder review queue',
          rows: [
            row(
              'Items awaiting founder review',
              count(or.unresolved.length),
              or.unresolved.length > 0 ? 'warning' : 'success',
              or.basis
            ),
          ],
        },
      ],
    },
  ];
}

/* ── FINANCE — the internal capital, financing and treasury family.
      Super-Admin only: financing is an internal treasury concern and is never shown
      to a brand. ────────────────────────────────────────────────────────────── */

function financePanels(model: ControlCentreModel): ControlPanel[] {
  const cap = model.capitalRequirement;
  const route = model.financingRouting;
  const life = model.financierLifecycle;
  const pitch = model.pitchWorkspace;
  const out = model.founderOutreach;
  const uni = model.financierUniverse;

  return [
    {
      id: 'capital-requirement',
      section: 'finance',
      title: 'Internal capital requirement (Model B)',
      description:
        'The capital the financed purchases need, what has been drawn, the fees, and whether the draw fits inside the facility. An over-committed facility is STATED, never clamped to zero.',
      owner: 'src/config/financing.ts + src/lib/finance/capitalRequirement.ts',
      modelKeys: ['capitalRequirement'],
      groups: [
        {
          label: 'Facility',
          rows: [
            row(
              'Facility terms configured',
              yesNo(cap.configured),
              cap.configured ? 'success' : 'warning',
              cap.configured ? undefined : 'The terms are an illustration until the founder confirms a real facility.'
            ),
            row('Currency', cap.currency),
            row('Financed purchases', count(cap.outstandingFinancedPurchases)),
            row('Purchases modelled', count(cap.purchases.length)),
            row('Capital required', money(cap.totalRequiredFundingGbp)),
            row('Advance drawn', money(cap.totalAdvanceDrawnGbp)),
            row('Financing fees', money(cap.totalFinancingFeesGbp)),
            row(
              'Available capital after the draw',
              money(cap.availableCapitalAfterGbp),
              cap.availableCapitalAfterGbp < 0 ? 'danger' : 'success',
              cap.availableCapitalAfterGbp < 0 ? 'NEGATIVE — the facility is over-committed. Stated, not hidden.' : undefined
            ),
            row('Facility utilisation', pct(cap.facilityUtilisationPct, 1), cap.withinCapacity ? 'success' : 'danger'),
            row('Draw fits inside the facility', yesNo(cap.withinCapacity), cap.withinCapacity ? 'success' : 'danger'),
          ],
        },
        {
          label: 'Concentration',
          rows: [
            row('Brands financed', count(cap.concentration.length)),
            row(
              'Concentration limit breaches',
              count(cap.concentrationBreaches.length),
              cap.concentrationBreaches.length > 0 ? 'danger' : 'success'
            ),
          ],
        },
        { label: 'Basis', rows: [row('What these figures mean', cap.basis, 'neutral')] },
      ],
    },
    {
      id: 'financing-routing',
      section: 'finance',
      title: 'Financing router',
      description:
        'Each financed purchase is routed to exactly one route — self-funded, a facility draw or an external referral — through the one deterministic router. No AI decides a route.',
      owner: 'src/config/financingRouter.ts + src/lib/finance/financingRouter.ts',
      modelKeys: ['financingRouting'],
      groups: [
        {
          label: 'Routing',
          rows: [
            row('Routing configured', yesNo(route.configured), route.configured ? 'success' : 'warning'),
            row('Currency', route.currency),
            row('Routes declared', count(route.routes.length)),
            row('Decisions made', count(route.decisions.length)),
            row('Self-funded', count(route.selfFundedCount), 'success'),
            row('Facility draw', count(route.facilityDrawCount), 'info'),
            row('External referral', count(route.externalReferralCount), 'info'),
            row(
              'Refused — queued for a human',
              count(route.refusedCount),
              route.refusedCount > 0 ? 'warning' : 'success',
              'A purchase the gateway refuses to route is never forced into a route.'
            ),
            row('Advance routed', money(route.totalAdvanceRoutedGbp)),
          ],
        },
        {
          label: 'By route',
          rows: route.byRoute.map((b) =>
            row(b.label, `${count(b.count)} · ${money(b.advanceGbp)} advance`, b.count > 0 ? 'info' : 'neutral')
          ),
        },
        {
          label: 'Routes and where the operator acts',
          rows: route.routes.map((r) => row(r.label, r.destination, 'neutral', r.action)),
        },
        {
          label: 'Each purchase and the route it took',
          rows: route.decisions.map((d) =>
            row(
              d.brandName,
              d.routeId ? humanise(d.routeId) : 'REFUSED — queued for a human',
              d.refused ? 'warning' : 'info',
              d.rationale
            )
          ),
        },
        { label: 'Basis', rows: [row('What these figures mean', route.basis, 'neutral'), row('Disclaimer', route.disclaimer, 'warning')] },
      ],
    },
    {
      id: 'financier-lifecycle',
      section: 'finance',
      title: 'Financier lifecycle',
      description:
        'The forward-only state machine a financing partner moves through. ACTIVE PARTNER is reachable only through a completed PILOT — a provider is never marked active merely because it was researched.',
      owner: 'src/config/financierLifecycle.ts + src/lib/finance/financierLifecycle.ts',
      modelKeys: ['financierLifecycle'],
      groups: [
        {
          label: 'The machine',
          rows: [
            row('Stages on the forward path', count(life.stageCount)),
            row('Off-ramps', count(life.offRamps.length), 'neutral', 'Available from any active stage.'),
            row('Candidates held', count(life.candidateCount)),
            row('Active partners', count(life.activeCount), life.activeCount > 0 ? 'success' : 'neutral'),
            row('Researched today', count(life.researchedCount), 'info'),
            row('One owner', yesNo(life.oneOwner), life.oneOwner ? 'success' : 'danger'),
            row('Forward-only', yesNo(life.forwardOnly), life.forwardOnly ? 'success' : 'danger'),
            row(
              'Active requires a completed pilot',
              yesNo(life.activeRequiresPilot),
              life.activeRequiresPilot ? 'success' : 'danger'
            ),
            row(
              'Off-ramps reachable from any active stage',
              yesNo(life.offRampsFromAnyActiveStage),
              life.offRampsFromAnyActiveStage ? 'success' : 'danger'
            ),
          ],
        },
        {
          label: 'Forward path, in order',
          rows: life.stages.map((s) => row(s.label, humanise(s.id), 'neutral')),
        },
        { label: 'Off-ramps', rows: life.offRamps.map((s) => row(s.label, humanise(s.id), 'warning')) },
        {
          label: 'Candidates and the stages each may move to',
          rows: life.candidates.map((c) =>
            row(
              c.label,
              c.stageLabel,
              c.illustrative ? 'warning' : 'info',
              c.illustrative
                ? `ILLUSTRATIVE — not a real provider. May move to: ${c.nextStages.map((n) => n.label).join(', ') || 'nothing'}`
                : `May move to: ${c.nextStages.map((n) => n.label).join(', ') || 'nothing'}`
            )
          ),
        },
        {
          label: 'Basis',
          rows: [row('What this means', life.basis, 'neutral'), row('Disclaimer', life.disclaimer, 'warning')],
        },
      ],
    },
    {
      id: 'pitch-workspace',
      section: 'finance',
      title: 'Founder capital / pitch workspace',
      description:
        'The ordered sections Mercenta prepares for a financing partner. AI may help write the narrative, but every financial number comes from its deterministic canonical owner.',
      owner: 'src/config/pitchWorkspace.ts + src/lib/finance/pitchWorkspace.ts',
      modelKeys: ['pitchWorkspace'],
      groups: [
        {
          label: 'Workspace',
          rows: [
            row('Sections', count(pitch.sectionCount)),
            row('Required sections', count(pitch.requiredCount)),
            row('Financial sections', count(pitch.financialCount), 'info'),
            row('Narrative sections', count(pitch.narrativeCount)),
            row('Sections AI may draft', count(pitch.aiDraftableCount), 'info', 'Narrative only — never a figure.'),
            row('One owner', yesNo(pitch.oneOwner), pitch.oneOwner ? 'success' : 'danger'),
            row('Sections are canonical', yesNo(pitch.sectionsCanonical), pitch.sectionsCanonical ? 'success' : 'danger'),
            row(
              'Every financial number is deterministic',
              yesNo(pitch.financialsDeterministic),
              pitch.financialsDeterministic ? 'success' : 'danger'
            ),
            row(
              'Every required section is needed for readiness',
              yesNo(pitch.requiresAllRequiredSections),
              pitch.requiresAllRequiredSections ? 'success' : 'danger'
            ),
          ],
        },
        {
          label: 'Readiness decision (the labelled demo position)',
          rows: [
            row('Ready to present', yesNo(pitch.readiness.ready), pitch.readiness.ready ? 'success' : 'warning'),
            row('Required sections present', `${count(pitch.readiness.presentRequired.length)}/${count(pitch.readiness.requiredCount)}`),
            row(
              'Required sections missing',
              pitch.readiness.missingRequired.length > 0 ? pitch.readiness.missingRequired.join(', ') : 'none',
              pitch.readiness.missingRequired.length > 0 ? 'warning' : 'success'
            ),
            row('Reason', pitch.readiness.reason, pitch.readiness.refusal ? 'warning' : 'neutral'),
          ],
        },
        {
          label: 'Sections',
          rows: pitch.sections.map((s) =>
            row(
              s.label,
              s.required ? 'required' : 'optional',
              s.required ? 'info' : 'neutral',
              `${s.kindLabel} · ${s.sourceOwner ? `figures from ${s.sourceOwner}` : 'no financial source'} · AI may ${s.aiMayDraft ? 'draft the narrative' : 'not draft'}`
            )
          ),
        },
        {
          label: 'Basis',
          rows: [row('What this means', pitch.basis, 'neutral'), row('Disclaimer', pitch.disclaimer, 'warning')],
        },
      ],
    },
    {
      id: 'founder-outreach',
      section: 'finance',
      title: 'Founder outreach pipeline',
      description:
        'The ordered approach Mercenta runs over the financing-partner universe, with a deterministic follow-up cadence in day offsets. Outreach begins at the TARGET stage and is forward-only.',
      owner: 'src/config/founderOutreach.ts + src/lib/finance/founderOutreach.ts',
      modelKeys: ['founderOutreach'],
      groups: [
        {
          label: 'Pipeline',
          rows: [
            row('Entry stage', out.entryStage.label),
            row('Contacted stage', out.contactedStage.label),
            row('Engaged stage', out.engagedStage.label),
            row('Channels declared', count(out.channels.length)),
            row('Touchpoint types declared', count(out.touchpointTypes.length)),
            row('Cadence steps', count(out.cadenceCount)),
            row('One owner', yesNo(out.oneOwner), out.oneOwner ? 'success' : 'danger'),
            row(
              'References the declared channels',
              yesNo(out.referencesDeclaredChannels),
              out.referencesDeclaredChannels ? 'success' : 'danger'
            ),
            row('Forward-only', yesNo(out.forwardOnly), out.forwardOnly ? 'success' : 'danger'),
            row(
              'A follow-up requires an earlier contact',
              yesNo(out.followUpRequiresContact),
              out.followUpRequiresContact ? 'success' : 'danger'
            ),
            row('Requires the target stage', yesNo(out.requiresTargetStage), out.requiresTargetStage ? 'success' : 'danger'),
            row(
              'Cadence is strictly increasing',
              yesNo(out.cadenceStrictlyIncreasing),
              out.cadenceStrictlyIncreasing ? 'success' : 'danger'
            ),
          ],
        },
        {
          label: 'Channels',
          rows: out.channels.map((c) => row(c.label, c.id, 'neutral', c.description)),
        },
        {
          label: 'Touchpoint types, in order',
          rows: out.touchpointTypes.map((t) =>
            row(t.label, t.advancesPipeline ? 'advances the pipeline' : 'does not advance', t.advancesPipeline ? 'info' : 'neutral', t.description)
          ),
        },
        {
          label: 'The cadence (day offsets from the first approach)',
          rows: out.cadence.map((c) => row(`Day ${count(c.dayOffset)}`, c.typeLabel, 'neutral', humanise(c.id))),
        },
        {
          label: 'Labelled illustrative touchpoints and the resolver decision on each (computed, not written)',
          rows: out.demoTouchpoints.map((t) =>
            row(
              `${t.providerLabel} — ${t.channelLabel}`,
              t.allowed ? 'allowed' : 'REFUSED',
              t.allowed ? 'success' : 'warning',
              `${t.typeLabel} on day ${count(t.dayOffset)} · stage ${t.providerStageLabel}${t.illustrative ? ' · ILLUSTRATIVE' : ''}${
                t.allowed ? '' : ' · the resolver REFUSED it'
              }`
            )
          ),
        },
        {
          label: 'Basis',
          rows: [row('What this means', out.basis, 'neutral'), row('Disclaimer', out.disclaimer, 'warning')],
        },
      ],
    },
    {
      id: 'financier-universe',
      section: 'finance',
      title: 'Financier universe',
      description:
        'The real financing-partner universe. A provider enters only with a NAMED, PUBLISHED source and a last-researched date — an unsourced or undated entry, and an illustrative placeholder, are refused. The universe holds no invented provider.',
      owner: 'src/config/financierUniverse.ts + src/lib/finance/financierUniverse.ts',
      modelKeys: ['financierUniverse'],
      groups: [
        {
          label: 'Position',
          rows: [
            row('Real providers today', count(uni.realCount), uni.realCount > 0 ? 'success' : 'warning', uni.realCount === 0 ? 'Zero — nothing is invented to fill the universe.' : undefined),
            row('Provider types declared', count(uni.providerTypes.length)),
            row('Markets declared', count(uni.markets.length)),
            row('Illustrative placeholders', count(uni.illustrativeCount), 'warning'),
            row('Placeholders allowed', count(uni.allowedCount), uni.allowedCount > 0 ? 'neutral' : 'success'),
            row('Placeholders refused', count(uni.refusedCount), uni.refusedCount > 0 ? 'success' : 'warning'),
            row('Requires a named source', yesNo(uni.requiresNamedSource), uni.requiresNamedSource ? 'success' : 'danger'),
            row(
              'Requires a last-researched date',
              yesNo(uni.requiresResearchDate),
              uni.requiresResearchDate ? 'success' : 'danger'
            ),
            row('Fails closed', yesNo(uni.failsClosed), uni.failsClosed ? 'success' : 'danger'),
          ],
        },
        {
          label: 'Provider types',
          rows: uni.providerTypes.map((t) => row(t.label, t.id, 'neutral', t.description)),
        },
        { label: 'Markets', rows: uni.markets.map((m) => row(m.label, m.id, 'neutral')) },
        {
          label: 'The full record a REAL provider must carry',
          rows: uni.recordFields.map((f) =>
            row(f.label, f.requiredForRealEntry ? 'required for a real entry' : 'optional', f.requiredForRealEntry ? 'info' : 'neutral', f.requirement)
          ),
        },
        {
          label: 'Placeholders and the resolver decision on each (computed, not written)',
          rows: uni.illustrative.map((p) =>
            row(
              p.legalName,
              p.allowed ? 'allowed' : 'REFUSED',
              p.allowed ? 'success' : 'warning',
              `${p.providerTypeLabel} · ${p.marketLabels.join(', ') || 'no market'} · ${p.reason}`
            )
          ),
        },
        {
          label: 'Fail-closed proof (computed, not written)',
          rows: [
            row(
              uni.exampleRefusal.legalName,
              refuseOrAllow(uni.exampleRefusal.refusal),
              uni.exampleRefusal.refusal ? 'success' : 'danger',
              uni.exampleRefusal.reason
            ),
          ],
        },
        {
          label: 'Basis',
          rows: [row('What this means', uni.basis, 'neutral'), row('Disclaimer', uni.disclaimer, 'warning')],
        },
      ],
    },
  ];
}

/* ── COMPLIANCE, AI and AUDIT ───────────────────────────────────────────────── */

function complianceAiAuditPanels(model: ControlCentreModel): ControlPanel[] {
  const gov = model.amazonGovernance;
  const ai = model.ai;
  const audit = model.audit;

  return [
    {
      id: 'amazon-relationship-governance',
      section: 'compliance',
      title: 'Amazon relationship governance',
      description:
        'Every claim about the channel relationship must rest on a source Mercenta actually holds AND that has been verified. Nothing is verified with the channel today, so every relationship claim fails closed.',
      owner: 'src/config/amazonRelationshipGovernance.ts + src/lib/intelligence/amazonRelationshipGovernance.ts',
      modelKeys: ['amazonGovernance'],
      groups: [
        {
          label: 'Position',
          rows: [
            row('Programme status', humanise(gov.programmeStatus), 'warning', `Declared by ${gov.programmeStatusOwner}.`),
            row('Authoritative sources declared', count(gov.sourceCount)),
            row('Sources actually held', count(gov.sources.length - gov.notHeldCount), gov.notHeldCount > 0 ? 'warning' : 'success'),
            row('Sources verified with the channel', count(gov.verifiedCount), gov.verifiedCount > 0 ? 'success' : 'warning'),
            row('Sources not held', count(gov.notHeldCount), gov.notHeldCount > 0 ? 'warning' : 'success'),
            row('One owner', yesNo(gov.oneOwner), gov.oneOwner ? 'success' : 'danger'),
            row('Fails closed', yesNo(gov.failsClosed), gov.failsClosed ? 'success' : 'danger'),
            row('Sources are declared, not implied', yesNo(gov.sourcesAreDeclared), gov.sourcesAreDeclared ? 'success' : 'danger'),
            row(
              'An unverified source blocks the claim',
              yesNo(gov.unverifiedSourceBlocksClaim),
              gov.unverifiedSourceBlocksClaim ? 'success' : 'danger'
            ),
            row(
              'Reuses the wording owner',
              yesNo(gov.reusesWordingOwner),
              gov.reusesWordingOwner ? 'success' : 'danger',
              'The banned wording list is not duplicated here.'
            ),
          ],
        },
        {
          label: 'Fail-closed proof (computed, not written)',
          rows: [
            row(
              gov.exampleRefusal.claim,
              refuseOrAllow(gov.exampleRefusal.refusal),
              gov.exampleRefusal.refusal ? 'success' : 'danger',
              gov.exampleRefusal.reason
            ),
          ],
        },
        {
          label: 'Basis',
          rows: [row('What this means', gov.basis, 'neutral'), row('Disclaimer', gov.disclaimer, 'warning')],
        },
      ],
    },
    {
      id: 'ai-availability',
      section: 'ai',
      title: 'AI availability',
      description:
        'Whether AI is genuinely available, the free model that would be used, and what still works when it is not. Never "nothing" — the degraded answer is always stated.',
      owner: 'src/lib/ai/founderAiClient.ts',
      modelKeys: ['ai'],
      groups: [
        {
          label: 'State',
          rows: [
            row('Provider', ai.provider),
            row('Declared mode', humanise(ai.mode), 'info'),
            row('Simulation-safe', yesNo(ai.simulationSafe), ai.simulationSafe ? 'info' : 'neutral'),
            row('Availability', humanise(ai.state), ai.state === 'free_model_ready' ? 'success' : 'warning'),
            row('Free model that would be used', ai.model ?? 'none — AI is not available', ai.model ? 'info' : 'warning'),
            row('Reason', ai.reason),
            row('Paid fallback allowed', yesNo(ai.paidFallbackAllowed), ai.paidFallbackAllowed ? 'danger' : 'success'),
            row('Credential seam', humanise(ai.credentialSeam), 'info', 'The key is never held in the browser.'),
          ],
        },
        { label: 'What still works without AI', rows: [row('Degradation', ai.degradation, 'neutral')] },
      ],
    },
    {
      id: 'audit-trail',
      section: 'audit',
      title: 'Recent audit entries',
      description:
        'The most recent canonical audit records, each naming the actor, the action, the recorded reason and the destination the record lives in. History is never destroyed.',
      owner: 'src/data/demoStore.ts (the canonical audit log)',
      modelKeys: ['audit'],
      groups: [
        {
          label: `Latest ${audit.length} entries`,
          rows: audit.map((entry) =>
            row(
              `${entry.actor} — ${humanise(entry.action)}`,
              entry.at,
              'neutral',
              `${entry.reason} · recorded in ${humanise(entry.destination)}`
            )
          ),
        },
      ],
    },
  ];
}

/* ── AUTOMATION — the catalogue, the runs, the human approvals, the provider
      dependencies, the trigger seam and the credential vault. ────────────────── */

function automationPanels(model: ControlCentreModel): ControlPanel[] {
  const sum = model.automationSummary;
  const runs = model.automation;
  const approvals = model.approvals;
  const deps = model.dependencies;
  const sched = model.scheduler;
  const vault = model.credentialVault;

  return [
    {
      id: 'automation-summary',
      section: 'automation',
      title: 'Automation catalogue',
      description:
        'What is declared, enabled, genuinely run and failing. An automation that has never run says so rather than showing a healthy zero.',
      owner: 'src/lib/automation/registry.ts',
      modelKeys: ['automationSummary'],
      groups: [
        {
          label: 'Catalogue',
          rows: [
            row('Declared', count(sum.declared)),
            row('Enabled', count(sum.enabled), 'success'),
            row('Disabled', count(sum.disabled), 'neutral'),
            row('Never run', count(sum.neverRun), sum.neverRun > 0 ? 'warning' : 'success'),
            row('Runs succeeded', count(sum.succeeded), 'success'),
            row('Runs failed', count(sum.failed), sum.failed > 0 ? 'danger' : 'success'),
            row('Degraded', count(sum.degraded), sum.degraded > 0 ? 'warning' : 'success'),
            row('Awaiting approval', count(sum.awaitingApproval), sum.awaitingApproval > 0 ? 'warning' : 'neutral'),
            row('Total runs recorded', count(sum.totalRuns)),
            row('Retryable failures', count(sum.retryableFailures), sum.retryableFailures > 0 ? 'warning' : 'neutral'),
          ],
        },
      ],
    },
    {
      id: 'automation-runs',
      section: 'automation',
      title: 'Automations and their last run',
      description: 'Every declared automation with its cadence, its last run state and its failure count.',
      owner: 'src/lib/automation/registry.ts',
      modelKeys: ['automation'],
      groups: [
        {
          label: 'Automations',
          rows: runs.map((a) =>
            row(
              a.name,
              humanise(a.status),
              a.status === 'never_run' ? 'warning' : a.failureCount > 0 || a.degraded ? 'danger' : 'success',
              `${humanise(a.domain)} · ${a.cadence} · ${count(a.failureCount)} failure(s)${
                a.approvalsPending > 0 ? ` · ${count(a.approvalsPending)} awaiting approval` : ''
              }${a.requiresAi ? ' · needs AI' : ''}${a.optionalDependency ? ' · depends on an optional provider' : ''}`
            )
          ),
        },
      ],
    },
    {
      id: 'automation-approvals',
      section: 'automation',
      title: 'Approvals waiting on a human',
      description:
        'An automation never approves its own consequential action. Each entry names the record it concerns and the recorded reason.',
      owner: 'src/lib/automation/registry.ts',
      modelKeys: ['approvals'],
      groups: [
        {
          label: 'Approvals',
          rows:
            approvals.length === 0
              ? [row('Nothing is waiting', '0', 'success', 'The real state of the approval queue.')]
              : approvals.map((a) =>
                  row(
                    humanise(a.automationId),
                    humanise(a.status),
                    a.status === 'pending' ? 'warning' : 'neutral',
                    `${a.reason} · record ${a.entityId} · requested ${a.requestedAt}${
                      a.decidedBy ? ` · decided by ${a.decidedBy}` : ''
                    }`
                  )
                ),
        },
      ],
    },
    {
      id: 'automation-dependencies',
      section: 'automation',
      title: 'Provider dependencies',
      description:
        'What each automation depends on, the provider mode, and what happens when it is unavailable. A provider is treated as simulated only when its mode positively resolves to simulation.',
      owner: 'src/lib/automation/registry.ts',
      modelKeys: ['dependencies'],
      groups: [
        {
          label: 'Dependencies',
          rows: deps.map((d) =>
            row(
              d.label,
              humanise(d.mode),
              d.simulationSafe ? 'info' : 'warning',
              `${count(d.requiredBy.length)} automation(s) · ${
                d.requiredForCoreOperations ? 'REQUIRED for core operations' : 'never required for core operations'
              } · ${d.degradation}`
            )
          ),
        },
      ],
    },
    {
      id: 'automation-scheduler',
      section: 'automation',
      title: 'How automation is triggered',
      description:
        'The scheduler seam: what was chosen, what it costs, what it adds, and the alternatives that were evaluated and rejected.',
      owner: 'src/lib/automation/registry.ts (describeAutomationScheduler)',
      modelKeys: ['scheduler'],
      groups: [
        {
          label: 'Chosen mechanism',
          rows: [
            row('Chosen', sched.chosen, 'info'),
            row('Cost', `$${sched.costUsd.toFixed(2)}`, 'success'),
            row(
              'New dependencies',
              sched.newDependencies.length === 0 ? 'none' : sched.newDependencies.join(', '),
              sched.newDependencies.length === 0 ? 'success' : 'warning'
            ),
            row('Uses a timer', yesNo(sched.usesTimer), sched.usesTimer ? 'warning' : 'success'),
            row('Deterministic', yesNo(sched.deterministic), sched.deterministic ? 'success' : 'danger'),
            row('Entry point', sched.entryPoint, 'neutral', sched.mechanism),
          ],
        },
        {
          label: 'Alternatives evaluated',
          rows: sched.evaluatedAlternatives.map((a) => row(a.option, a.cost, 'neutral', a.verdict)),
        },
      ],
    },
    {
      id: 'credential-vault',
      section: 'automation',
      title: 'Credential vault (T-7)',
      description:
        'One contract per integration provider, derived from the canonical registry. A credential is usable only when the provider is declared, a value is stored, the credential is enabled, every required field is present AND the store is durable. Only a mask is ever read back — never the value.',
      owner: 'src/config/credentialVault.ts + src/lib/integrations/resolveCredentialVault.ts',
      modelKeys: ['credentialVault'],
      groups: [
        {
          label: 'Durability and coverage',
          rows: [
            row(
              'Store is durable',
              yesNo(vault.durableStore),
              vault.durableStore ? 'success' : 'warning',
              vault.durableStore
                ? undefined
                : 'The store the integration layer holds today is in-memory, so no provider resolves as a production credential.'
            ),
            row('Providers with a contract', count(vault.providerCount)),
            row('Credentials stored', count(vault.storedCount), vault.storedCount > 0 ? 'info' : 'warning'),
            row('Usable credentials', count(vault.usableCount), vault.usableCount > 0 ? 'success' : 'warning'),
            row('Disabled', count(vault.disabledCount), 'neutral'),
            row('Not stored', count(vault.notStoredCount), 'warning'),
            row('One owner', yesNo(vault.oneOwner), vault.oneOwner ? 'success' : 'danger'),
            row(
              'Reuses the provider-field owner',
              yesNo(vault.reusesProviderFieldOwner),
              vault.reusesProviderFieldOwner ? 'success' : 'danger'
            ),
            row('Masks the readback', yesNo(vault.masksReadback), vault.masksReadback ? 'success' : 'danger'),
            row('Never exposes the value', yesNo(vault.neverExposesValue), vault.neverExposesValue ? 'success' : 'danger'),
            row('Fails closed', yesNo(vault.failsClosed), vault.failsClosed ? 'success' : 'danger'),
          ],
        },
        {
          label: 'Providers',
          rows: vault.providers.map((p) =>
            row(
              p.providerId,
              humanise(p.status),
              p.usable ? 'success' : 'warning',
              `${p.authMethod === 'oauth' ? 'OAuth' : 'API key'} · ${count(p.secretFieldKeys.length)} secret field(s) · mask ${
                p.masked ?? 'none'
              } · ${p.reason}`
            )
          ),
        },
        {
          label: 'Live examples (computed, not written)',
          rows: [
            row(
              `${vault.exampleUsable.providerId} — usable path`,
              vault.exampleUsable.usable ? 'USABLE' : 'refused',
              vault.exampleUsable.usable ? 'success' : 'warning',
              `${vault.exampleUsable.reason} · mask ${vault.exampleUsable.masked ?? 'none'}`
            ),
            row(
              `${vault.exampleNotDurable.providerId} — non-durable store`,
              vault.exampleNotDurable.usable ? 'USABLE' : 'REFUSED',
              vault.exampleNotDurable.usable ? 'danger' : 'warning',
              vault.exampleNotDurable.reason
            ),
          ],
        },
        {
          label: 'Basis',
          rows: [row('What this means', vault.basis, 'neutral'), row('Disclaimer', vault.disclaimer, 'warning')],
        },
      ],
    },
  ];
}

/* ── The ONE entry point ─────────────────────────────────────────────────────── */

/**
 * Every specialised panel the Control Centre can draw, derived from the model and
 * nothing else. The union of each panel's `modelKeys` plus the keys the screen's own
 * metric strip, attention list and provenance list render is the WHOLE model — the
 * coverage gate asserts exactly that, so no sub-model can be computed and discarded.
 */
export function buildControlPanels(model: ControlCentreModel): ControlPanel[] {
  return [
    ...businessPanels(model),
    ...brandsPanels(model),
    ...commercialAcquisitionPanels(model),
    ...financePanels(model),
    ...complianceAiAuditPanels(model),
    ...automationPanels(model),
  ];
}

/** The panels that belong to one capability area, in declaration order. */
export function panelsForSection(
  panels: readonly ControlPanel[],
  section: ControlCentreSectionId
): ControlPanel[] {
  return panels.filter((panel) => panel.section === section);
}
