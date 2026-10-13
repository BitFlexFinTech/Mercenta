/**
 * §Phase C — Acquisition workflow (operator surface).
 *
 * ONE shared component renders the whole downstream workflow for a canonical
 * Brand Intelligence prospect, so the BI panel, the ICP/acquisition pipeline and
 * the CRM relationship record all operate the SAME record — no duplicated
 * state, no second conversation history:
 *
 *   BI evidence → ICP identity → contact/targeting → recommendation
 *     → MODIFY / APPROVE / REJECT → send (simulation or connected provider)
 *     → response → Opportunity → relationship timeline + canonical messages
 *
 * Every mutating action goes through the lifecycle engine, which enforces RBAC
 * in the domain layer (`AcquisitionActor.canMutate`) and audits the transition
 * on the prospect timeline AND the platform audit log.
 */
import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useApp } from '@/context/GlobalStateContext';
import { useCanonicalStoreVersion } from '@/data/queries';
import { useBrandComms } from '@/components/shared/BrandComm';
import { useIntegrations } from '@/integrations/IntegrationsContext';
import { Badge, Button, Card, Input, EmptyState } from '@/components/ui';
import { cn } from '@/utils/cn';
import type { AcquisitionRelationship, OnboardingStepId, OpportunityStage, ProspectIntelligenceDigest } from '@/types';
import {
  approveOutreach,
  createOpportunityFromResponse,
  getRelationshipContext,
  listAcquisitionProspects,
  modifyOutreach,
  prepareOutreach,
  rejectOutreach,
  sendOutreach,
  setOpportunityStage,
  simulateResponse,
} from '@/lib/acquisition/outreachLifecycle';
import {
  describeOutreachProvider,
  resolveOutreachTransport,
} from '@/lib/acquisition/outreachSender';
/**
 * §Phase E1 — the opportunity → brand onboarding hand-off. Reads the canonical
 * onboarding record and mutates through the domain lifecycle (RBAC enforced
 * there, not by hiding these buttons).
 */
import {
  beginBrandOnboarding,
  completeOnboardingStep,
  finishBrandOnboarding,
  getOnboardingForProspect,
  isOnboardingEligible,
} from '@/lib/onboarding/onboardingLifecycle';
import { Send, CheckCircle2, XCircle, Pencil, Sparkles, Mail, MessageSquareReply, Trophy, Building2, BadgeCheck } from 'lucide-react';

const STAGE_STYLES: Record<string, string> = {
  'awaiting approval': 'bg-amber-500/15 text-amber-300 border-amber-500/20',
  approved: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
  rejected: 'bg-red-500/15 text-red-300 border-red-500/20',
  sent: 'bg-blue-500/15 text-blue-300 border-blue-500/20',
  responded: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/20',
  qualified: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
  won: 'bg-brass/15 text-brass border-brass/30',
  lost: 'bg-zinc-500/15 text-zinc-400 border-white/[0.08]',
  enrolled: 'bg-purple-500/15 text-purple-300 border-purple-500/20',
  'not enrolled': 'bg-white/[0.05] text-zinc-400 border-white/[0.08]',
};

/** §Phase E1 — onboarding status/step styling (existing palette only). */
const ONBOARDING_STYLES: Record<string, string> = {
  initiated: 'bg-purple-500/15 text-purple-300 border-purple-500/20',
  in_progress: 'bg-blue-500/15 text-blue-300 border-blue-500/20',
  completed: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
};

const ONBOARDING_STEP_STYLES: Record<string, string> = {
  pending: 'bg-white/[0.05] text-zinc-400 border-white/[0.08]',
  in_progress: 'bg-blue-500/15 text-blue-300 border-blue-500/20',
  done: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
};

/**
 * §Phase D2 — the seven canonical BI score dimensions (see `ProspectScore` in
 * types.ts). Rendered from the live canonical record so the operator sees the
 * SAME factor breakdown Brand Intelligence holds — never a recomputation.
 */
const SCORE_FACTORS: { key: keyof ProspectIntelligenceDigest['scoreFactors']; label: string }[] = [
  { key: 'amazonDemand', label: 'Amazon demand' },
  { key: 'poPotential', label: 'PO potential' },
  { key: 'growth', label: 'Growth' },
  { key: 'distributionOpenness', label: 'Distribution openness' },
  { key: 'acceptanceProbability', label: 'Acceptance' },
  { key: 'mercentaFit', label: 'Mercenta fit' },
  { key: 'logisticsSuitability', label: 'Logistics' },
];

export function AcquisitionWorkflow({
  prospectId,
  onChanged,
}: {
  prospectId: string;
  onChanged?: () => void;
}) {
  const { actingStaffId, canCurrentUserMutate, refreshLeadsFromProspects } = useApp();
  const comms = useBrandComms();
  const { integrations } = useIntegrations();
  const qc = useQueryClient();
  const version = useCanonicalStoreVersion();
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [subjectDraft, setSubjectDraft] = useState<string | null>(null);
  const [bodyDraft, setBodyDraft] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const actor = useMemo(
    () => ({ staffId: actingStaffId, canMutate: canCurrentUserMutate }),
    [actingStaffId, canCurrentUserMutate]
  );

  void version; // canonical store change signal → re-read the relationship

  // Direct store reads — the stores are synchronous in-memory singletons; a
  // canonical store change re-renders and re-reads them.
  const relationship: AcquisitionRelationship | null = getRelationshipContext(prospectId);
  const row = listAcquisitionProspects().find((r) => r.prospect.id === prospectId) ?? null;

  /**
   * §Phase D3 — the transport is resolved from the CANONICAL integration mode
   * model (never from ad-hoc booleans) and reports its honest provider state.
   * An unconfigured / unknown / unavailable provider yields the deterministic
   * simulation transport (zero network calls).
   */
  const resolved = useMemo(
    () => resolveOutreachTransport(integrations.email, comms.emailClient),
    [integrations.email, comms.emailClient]
  );
  const transport = resolved.transport;

  if (!relationship || !row) {
    return <EmptyState title="Prospect not found" description="This acquisition record has no canonical Brand Intelligence prospect." />;
  }

  const { prospect, current, responses, opportunity, events, messages } = relationship;
  const stage = row.stage;
  const contact = prospect.contacts[0];
  /** §Phase E1 — canonical onboarding record for this prospect (null before the hand-off). */
  const onboarding = getOnboardingForProspect(prospectId);
  const onboardingReady = isOnboardingEligible(opportunity);
  const subjectValue = subjectDraft ?? current?.subject ?? '';
  const bodyValue = bodyDraft ?? current?.body ?? '';
  const whyContact = current?.evidenceSummary ?? '';
  /** §Phase D2 — canonical BI intelligence, read live by reference. */
  const intel = row.intelligence;

  function refresh(message?: string) {
    if (message) setNotice(message);
    onChanged?.();
    void refreshLeadsFromProspects();
    void qc.invalidateQueries({ queryKey: ['messages'] });
  }

  function run<T>(
    result: { ok: true; value: T } | { ok: false; error: string },
    message: string
  ): boolean {
    if (!result.ok) {
      setError(result.error);
      setNotice(null);
      return false;
    }
    setError(null);
    refresh(message);
    return true;
  }

  function handlePrepare() {
    setSubjectDraft(null);
    setBodyDraft(null);
    run(prepareOutreach(prospectId, actor, 'email'), `Recommendation prepared for ${prospect.brand} — awaiting your approval.`);
  }

  function handleModify() {
    if (!current) return;
    run(
      modifyOutreach(current.id, { subject: subjectValue, body: bodyValue }, actor),
      'Recommendation modified — still awaiting approval.'
    );
  }

  function handleApprove() {
    if (!current) return;
    run(approveOutreach(current.id, actor, 'Approved by operator'), `Approved — ${prospect.brand} is ready to send.`);
  }

  function handleReject() {
    if (!current) return;
    run(rejectOutreach(current.id, rejectReason, actor), 'Recommendation rejected — the brand stays in the pipeline.');
    setRejectReason('');
  }

  async function handleSend() {
    if (!current) return;
    const result = await sendOutreach(current.id, actor, transport);
    run(
      result,
      resolved.live
        ? 'Sent through the connected provider.'
        : 'Sent through the deterministic simulation path (no external network).'
    );
  }

  async function handleSimulateResponse() {
    const result = await simulateResponse(prospectId, actor);
    run(result, 'Simulated inbound response recorded and associated with this prospect.');
  }

  function handleCreateOpportunity() {
    run(createOpportunityFromResponse(prospectId, actor), 'Opportunity created — visible in the Brand CRM relationship context.');
  }

  function handleStage(next: OpportunityStage) {
    if (!opportunity) return;
    run(setOpportunityStage(opportunity.id, next, actor), `Opportunity moved to ${next}.`);
  }

  /* §Phase E1 — the hand-off. Each action is a real domain mutation. */
  function handleStartOnboarding() {
    if (!opportunity) return;
    run(
      beginBrandOnboarding(opportunity.id, actor),
      `Onboarding started for ${prospect.brand} — brand tenant identity created.`
    );
  }

  function handleCompleteStep(stepId: OnboardingStepId) {
    if (!onboarding) return;
    run(completeOnboardingStep(onboarding.id, stepId, actor), `Onboarding step completed: ${stepId}.`);
  }

  function handleFinishOnboarding() {
    if (!onboarding) return;
    run(finishBrandOnboarding(onboarding.id, actor), `${prospect.brand} is now an operational brand.`);
  }

  const canApprove = current?.status === 'pending_approval';
  const canSend = current?.status === 'approved';
  const canRespond = current?.status === 'sent';
  const canCreateOpportunity = responses.length > 0 && !opportunity;
  const stageOptions: OpportunityStage[] = ['contacted', 'responded', 'qualified', 'won', 'lost'];

  return (
    <div className="space-y-3">
      {/* Identity + stage -------------------------------------------------- */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Wrapper carries the machine-readable stage attributes: the shared
            Badge primitive only accepts children/className, so putting a
            data-* attribute on it would silently render nothing. */}
        <span data-stage={stage}>
          <Badge className={cn('text-ds-micro border capitalize', STAGE_STYLES[stage] ?? 'text-zinc-400')}>
            {stage}
          </Badge>
        </span>
        <Badge className="text-ds-micro bg-white/[0.05] text-zinc-300 border-white/[0.08]">
          BI score {prospect.score.total}/100 · {prospect.score.tier}
        </Badge>
        {row.region ? (
          <Badge className="text-ds-micro bg-white/[0.05] text-zinc-300 border-white/[0.08]">
            ICP region {row.region} · {row.lead?.segment}
          </Badge>
        ) : (
          <Badge className="text-ds-micro bg-red-500/10 text-red-300 border-red-500/20">no ICP origin region</Badge>
        )}
        <Badge className="text-ds-micro bg-white/[0.05] text-zinc-400 border-white/[0.08] font-mono">
          {prospect.id} → {row.lead?.id ?? '(unlinked)'}
        </Badge>
        {!canCurrentUserMutate && (
          <Badge className="text-ds-micro bg-zinc-500/10 text-zinc-400 border-white/[0.08]">view-only account</Badge>
        )}
      </div>

      {notice && <p className="text-ds-label text-emerald-400" data-notice="ok">{notice}</p>}
      {error && <p className="text-ds-label text-red-300" data-notice="error">{error}</p>}

      {/* Why we are contacting this brand (BI evidence) -------------------- */}
      <div className="bg-brass-500/5 border border-brass-500/15 rounded-lg p-3" data-section="evidence">
        <p className="text-ds-micro font-semibold text-brass-300 uppercase mb-1">Why we are contacting this brand — BI evidence</p>
        {whyContact ? (
          <pre className="text-ds-label text-brass-300/90 whitespace-pre-wrap font-sans leading-relaxed">{whyContact}</pre>
        ) : (
          <p className="text-ds-label text-zinc-500">
            Prepare a recommendation to attach the canonical Brand Intelligence evidence
            ({prospect.asins.length} ASINs · {prospect.contacts.length} contact(s) · score {prospect.score.total}/100).
          </p>
        )}
      </div>

      {/* Canonical BI intelligence — read live by reference (Phase D2) ------- */}
      <div
        className="border border-white/[0.06] rounded-lg p-3 space-y-2"
        data-section="intelligence"
        data-asin-count={intel.digest.asinCount}
        data-contact-count={intel.digest.contactCount}
        data-distributor-count={intel.digest.distributorCount}
        data-restriction-count={intel.digest.restrictionCount}
        data-growth-signal-count={intel.digest.growthSignalCount}
        data-evidence-count={intel.digest.evidenceCount}
        data-score-total={intel.digest.scoreTotal}
        data-score-tier={intel.digest.scoreTier}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-ds-micro font-semibold text-zinc-400 uppercase">
            Canonical BI intelligence — {intel.digest.asinCount} ASINs · {intel.digest.contactCount} contact(s) · {intel.digest.evidenceCount} evidence
          </p>
          <span className="text-ds-micro text-zinc-600 font-mono">by reference · {intel.prospectId}</span>
        </div>

        {/* Score factors — the canonical seven dimensions, not recomputed */}
        <div className="flex flex-wrap gap-1.5" data-section="intelligence-score">
          {SCORE_FACTORS.map((f) => (
            <span
              key={f.key}
              data-score-factor={f.key}
              className="text-ds-micro bg-white/[0.04] border border-white/[0.06] rounded px-1.5 py-0.5 text-zinc-400"
            >
              {f.label} <span className="text-zinc-200 font-mono">{intel.digest.scoreFactors[f.key]}</span>
            </span>
          ))}
          <Badge className="text-ds-micro bg-white/[0.05] text-zinc-300 border-white/[0.08]">
            total {intel.digest.scoreTotal}/100 · {intel.digest.scoreTier}
          </Badge>
        </div>

        {/* ASIN-level intelligence */}
        {intel.prospect.asins.length > 0 && (
          <div className="overflow-x-auto" data-section="intelligence-asins">
            <table className="w-full text-ds-micro">
              <thead>
                <tr className="text-zinc-500 text-left">
                  <th className="font-medium py-0.5 pr-2">ASIN</th>
                  <th className="font-medium py-0.5 pr-2">Title</th>
                  <th className="font-medium py-0.5 pr-2">BSR</th>
                  <th className="font-medium py-0.5 pr-2">Sellers</th>
                  <th className="font-medium py-0.5 pr-2">Est/mo</th>
                  <th className="font-medium py-0.5 pr-2">Evidence</th>
                </tr>
              </thead>
              <tbody>
                {intel.prospect.asins.map((a) => (
                  <tr key={a.asin} className="border-t border-white/[0.04]" data-asin={a.asin}>
                    <td className="py-0.5 pr-2 font-mono text-zinc-400">{a.asin}</td>
                    <td className="py-0.5 pr-2 text-zinc-300">{a.title}</td>
                    <td className="py-0.5 pr-2 text-zinc-400">#{a.bsr}</td>
                    <td className="py-0.5 pr-2 text-zinc-400">{a.sellerCount}</td>
                    <td className="py-0.5 pr-2 text-zinc-400">
                      {a.estimatedRevenue ? `£${(a.estimatedRevenue / 1000).toFixed(0)}k` : 'n/a'}
                    </td>
                    <td className="py-0.5 pr-2 text-zinc-500">{a.evidence.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Full contact set + distribution context */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div data-section="intelligence-contacts">
            <p className="text-ds-micro text-zinc-500 uppercase mb-0.5">Contacts held by BI ({intel.digest.contactCount})</p>
            {intel.prospect.contacts.length === 0 ? (
              <p className="text-ds-micro text-zinc-600" data-empty="contacts">None held by BI — never fabricated.</p>
            ) : (
              intel.prospect.contacts.map((c) => (
                <p key={`${c.name}-${c.jobTitle}`} className="text-ds-micro text-zinc-300" data-contact={c.name}>
                  {c.name}{c.jobTitle ? `, ${c.jobTitle}` : ''}
                  <span className="text-zinc-500"> · {c.email ?? 'no email on record'} ({c.emailConfidence})</span>
                </p>
              ))
            )}
          </div>
          <div className="space-y-0.5" data-section="intelligence-market">
            <p className="text-ds-micro text-zinc-500 uppercase">Distribution, restrictions & growth</p>
            {intel.prospect.distributors.length === 0 ? (
              <p className="text-ds-micro text-zinc-600">No distributor identified by BI.</p>
            ) : (
              intel.prospect.distributors.map((d) => (
                <p key={d.company} className="text-ds-micro text-zinc-300">
                  {d.company} — {d.territory}{d.exclusive ? ' (exclusive)' : ''}
                  {d.suggestedApproach ? ` · ${d.suggestedApproach.replace(/_/g, ' ')}` : ''}
                </p>
              ))
            )}
            {intel.prospect.restrictions.map((r) => (
              <p key={r.description} className="text-ds-micro text-amber-300/90">
                {r.severity} restriction — {r.description}
              </p>
            ))}
            <p className="text-ds-micro text-zinc-400">
              Wholesale programme: {intel.digest.wholesaleProgramme ? 'yes' : 'no'}
              {intel.prospect.wholesale.minimumOrderQuantity
                ? ` · minimum order ${intel.prospect.wholesale.minimumOrderQuantity}`
                : ' · minimum order not held'}
            </p>
            {intel.prospect.growthSignals.length > 0 && (
              <p className="text-ds-micro text-zinc-400">
                Growth signals ({intel.prospect.growthSignals.length}):{' '}
                {intel.prospect.growthSignals.map((g) => g.type.replace(/_/g, ' ')).join(', ')}
              </p>
            )}
            <p className="text-ds-micro text-zinc-400">
              {intel.prospect.category}
              {intel.prospect.countries?.length ? ` · ${intel.prospect.countries.join(', ')}` : ''}
              {intel.prospect.incumbentChallenged?.length
                ? ` · challenger to ${intel.prospect.incumbentChallenged.join(', ')}`
                : ''}
            </p>
          </div>
        </div>

        {/* Provenance (canonical BI history) + lifecycle */}
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-ds-micro text-zinc-500" data-section="intelligence-provenance">
          <span data-provenance="runs">runs {intel.provenance.runIds.length}</span>
          <span data-provenance="timeline">timeline events {intel.provenance.changeEventIds.length}</span>
          <span data-provenance="snapshots">snapshots {intel.provenance.snapshotDates.length}</span>
          <span data-provenance="sources">
            evidence sources ({intel.provenance.evidenceSources.length}):{' '}
            {intel.provenance.evidenceSources.map((s) => `${s.source} ×${s.count}`).join(', ') || 'none'}
          </span>
          <span>lastChecked {intel.lifecycle.lastChecked?.slice(0, 10) ?? 'not yet'}</span>
          <span>nextCheck {intel.lifecycle.nextCheck?.slice(0, 10) ?? 'not scheduled'}</span>
        </div>
        <p className="text-ds-micro text-zinc-600">
          Read live from the canonical Brand Intelligence record {intel.prospectId} — the same record Brand
          Intelligence and the CRM show. Nothing is copied into a second intelligence store.
        </p>
      </div>

      {/* Contact / targeting ---------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" data-section="targeting">
        <div className="bg-ink-850 border border-white/[0.06] rounded-lg p-2.5">
          <p className="text-ds-micro text-zinc-500 uppercase">Contact / decision-maker</p>
          <p className="text-xs text-zinc-200 mt-0.5">
            {contact ? `${contact.name}${contact.jobTitle ? `, ${contact.jobTitle}` : ''}` : 'Not identified in the BI record'}
          </p>
          <p className="text-ds-micro text-zinc-500 mt-0.5">
            {contact?.email ?? 'hello@….example placeholder until a contact email is verified'}
          </p>
        </div>
        <div className="bg-ink-850 border border-white/[0.06] rounded-lg p-2.5">
          <p className="text-ds-micro text-zinc-500 uppercase">Channel</p>
          <p className="text-xs text-zinc-200 mt-0.5">
            {current?.channel ?? 'email'} · {describeOutreachProvider(resolved.providerState)}
          </p>
          <p className="text-ds-micro text-zinc-500 mt-0.5">Revisions: {relationship.outreach.length} · Messages logged: {messages.length}</p>
        </div>
      </div>

      {/* Recommendation + human approval ---------------------------------- */}
      <div className="border border-white/[0.06] rounded-lg p-3 space-y-2" data-section="recommendation">
        <div className="flex items-center justify-between">
          <p className="text-ds-micro font-semibold text-zinc-400 uppercase">Outreach recommendation</p>
          {current && (
            <span className="text-ds-micro text-zinc-500" data-revision={current.revision ?? 1}>
              revision {current.revision ?? 1} · status {current.status}
              {current.transport ? ` · transport ${current.transport}` : ''}
            </span>
          )}
        </div>

        {current ? (
          <>
            <Input label="Subject" value={subjectValue} onChange={(e) => setSubjectDraft(e.target.value)} readOnly={!canApprove} />
            <textarea
              value={bodyValue}
              onChange={(e) => setBodyDraft(e.target.value)}
              disabled={!canApprove}
              rows={8}
              className="w-full bg-ink-900 border border-white/[0.08] rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-brass-500/40 disabled:opacity-70"
            />
          </>
        ) : (
          <p className="text-ds-label text-zinc-500">
            No recommendation yet. Preparing one runs the canonical BI outreach generator over this
            prospect's real ASIN, score, contact and distributor evidence.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button className="text-xs" data-state="prepare" onClick={handlePrepare} disabled={!canCurrentUserMutate}>
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />{current ? 'Prepare new revision' : 'Prepare recommendation'}
          </Button>
          {canApprove && (
            <>
              <Button className="text-xs" variant="secondary" data-state="modify" onClick={handleModify} disabled={!canCurrentUserMutate}>
                <Pencil className="w-3.5 h-3.5 mr-1.5" />Modify
              </Button>
              <Button className="text-xs" data-state="approve" onClick={handleApprove} disabled={!canCurrentUserMutate}>
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />Approve
              </Button>
              <input
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Rejection reason"
                className="bg-ink-900 border border-white/[0.08] rounded-md px-2 py-1.5 text-ds-label text-white"
              />
              <Button className="text-xs" variant="danger" data-state="reject" onClick={handleReject} disabled={!canCurrentUserMutate}>
                <XCircle className="w-3.5 h-3.5 mr-1.5" />Reject
              </Button>
            </>
          )}
          {canSend && (
            <Button className="text-xs" data-state="send" onClick={() => void handleSend()} disabled={!canCurrentUserMutate}>
              <Send className="w-3.5 h-3.5 mr-1.5" />{transport.mode === 'live' ? 'Send' : 'Send (Simulated)'}
            </Button>
          )}
          {canRespond && (
            <Button className="text-xs" variant="secondary" data-state="simulate-response" onClick={() => void handleSimulateResponse()} disabled={!canCurrentUserMutate}>
              <MessageSquareReply className="w-3.5 h-3.5 mr-1.5" />Simulate response
            </Button>
          )}
          {canCreateOpportunity && (
            <Button className="text-xs" data-state="create-opportunity" onClick={handleCreateOpportunity} disabled={!canCurrentUserMutate}>
              <Trophy className="w-3.5 h-3.5 mr-1.5" />Create opportunity
            </Button>
          )}
          {!canCurrentUserMutate && (
            <span className="text-ds-micro text-amber-300">Read-only account — approval actions are refused.</span>
          )}
        </div>
      </div>

      {/* Responses -------------------------------------------------------- */}
      <div className="border border-white/[0.06] rounded-lg p-3" data-section="responses">
        <p className="text-ds-micro font-semibold text-zinc-400 uppercase mb-1">Responses ({responses.length})</p>
        {responses.length === 0 ? (
          <p className="text-ds-label text-zinc-600">No response recorded yet.</p>
        ) : (
          <div className="space-y-1.5">
            {responses.map((r) => (
              <div key={r.id} className="bg-ink-850 border border-white/[0.06] rounded-lg p-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={cn('text-ds-micro', r.wantsHuman ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/[0.05] text-zinc-300')}>
                    {r.wantsHuman ? 'hot lead' : 'reply'}
                  </Badge>
                  {r.simulated && <Badge className="text-ds-micro bg-amber-500/15 text-amber-300">simulated</Badge>}
                  <span className="text-ds-micro font-mono text-zinc-500">
                    {r.from} · {r.channel} · {r.receivedAt.slice(0, 16).replace('T', ' ')}
                  </span>
                </div>
                <p className="text-ds-label text-zinc-300 mt-1 whitespace-pre-wrap">{r.body}</p>
                {r.classificationReason && (
                  <p className="text-ds-micro text-zinc-500 mt-0.5">Classification: {r.classificationReason}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Opportunity ------------------------------------------------------ */}
      <div className="border border-white/[0.06] rounded-lg p-3" data-section="opportunity">
        <p className="text-ds-micro font-semibold text-zinc-400 uppercase mb-1">Opportunity</p>
        {!opportunity ? (
          <p className="text-ds-label text-zinc-600">No opportunity yet — it is created from a qualified brand response.</p>
        ) : (
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span data-opportunity-stage={opportunity.stage}>
                <Badge className={cn('text-ds-micro border capitalize', STAGE_STYLES[opportunity.stage])}>
                  {opportunity.stage}
                </Badge>
              </span>
              <span className="text-ds-micro text-zinc-400 font-mono">{opportunity.id}</span>
              <span className="text-ds-micro text-zinc-400">BI snapshot {opportunity.biScore}/100 ({opportunity.biTier})</span>
              <span className="text-ds-micro text-zinc-500">owner {opportunity.ownerStaffId}</span>
            </div>
            {opportunity.contactName && (
              <p className="text-ds-label text-zinc-300">
                {opportunity.contactName}{opportunity.contactEmail ? ` · ${opportunity.contactEmail}` : ''}
              </p>
            )}
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {stageOptions.map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant="tertiary"
                  className="text-ds-micro"
                  disabled={!canCurrentUserMutate || s === opportunity.stage}
                  onClick={() => handleStage(s)}
                >
                  {s}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* §Phase E1 — onboarding (opportunity → operational brand tenant) ---- */}
      <div className="border border-white/[0.06] rounded-lg p-3" data-section="onboarding">
        <p className="text-ds-micro font-semibold text-zinc-400 uppercase mb-1">Brand onboarding</p>
        {!opportunity ? (
          <p className="text-ds-label text-zinc-600">Onboarding starts from a qualified opportunity.</p>
        ) : !onboarding ? (
          <div className="space-y-1.5">
            <p className="text-ds-label text-zinc-500">
              No onboarding record yet. Starting it derives the brand tenant identity from this
              opportunity and links the two — the acquisition history is retained, not copied.
            </p>
            <Button
              className="text-xs"
              data-state="start-onboarding"
              disabled={!canCurrentUserMutate || !onboardingReady}
              onClick={handleStartOnboarding}
            >
              <Building2 className="w-3.5 h-3.5 mr-1.5" />Start onboarding
            </Button>
            {!onboardingReady && (
              <p className="text-ds-micro text-amber-300">
                Only a qualified or won opportunity can be onboarded.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span data-onboarding-status={onboarding.status}>
                <Badge className={cn('text-ds-micro border capitalize', ONBOARDING_STYLES[onboarding.status])}>
                  {onboarding.status}
                </Badge>
              </span>
              <span className="text-ds-micro text-zinc-400 font-mono" data-onboarding-tenant>
                {onboarding.brandId}
              </span>
              <span className="text-ds-micro text-zinc-500 font-mono">{onboarding.id}</span>
              <span className="text-ds-micro text-zinc-500">
                from {onboarding.opportunityId} · prospect {onboarding.prospectId}
              </span>
            </div>
            <ol className="space-y-1">
              {onboarding.steps.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-2 border-b border-white/[0.04] pb-1"
                  data-onboarding-step={s.id}
                >
                  <span className="text-ds-label text-zinc-300">
                    <span className="font-mono text-ds-micro text-zinc-500 mr-1.5">{s.id}</span>
                    {s.label}
                  </span>
                  <span className="flex items-center gap-2 flex-shrink-0">
                    <Badge className={cn('text-ds-micro capitalize', ONBOARDING_STEP_STYLES[s.status])}>
                      {s.status.replace('_', ' ')}
                    </Badge>
                    {s.status !== 'done' && onboarding.status !== 'completed' && (
                      <Button
                        size="sm"
                        variant="tertiary"
                        className="text-ds-micro"
                        data-state="complete-step"
                        data-step={s.id}
                        disabled={!canCurrentUserMutate}
                        onClick={() => handleCompleteStep(s.id)}
                      >
                        Complete
                      </Button>
                    )}
                  </span>
                </li>
              ))}
            </ol>
            {onboarding.status !== 'completed' && (
              <Button
                className="text-xs"
                data-state="finish-onboarding"
                disabled={!canCurrentUserMutate}
                onClick={handleFinishOnboarding}
              >
                <BadgeCheck className="w-3.5 h-3.5 mr-1.5" />Complete onboarding
              </Button>
            )}
            {onboarding.status === 'completed' && (
              <p className="text-ds-micro text-emerald-300">
                Operational brand — tenant {onboarding.brandId}
                {onboarding.completedAt ? ` (completed ${onboarding.completedAt.slice(0, 10)})` : ''}.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Relationship timeline + the ONE canonical message thread --------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2" data-section="relationship">
        <div className="border border-white/[0.06] rounded-lg p-3">
          <p className="text-ds-micro font-semibold text-zinc-400 uppercase mb-1">Acquisition timeline ({events.length})</p>
          {events.length === 0 ? (
            <p className="text-ds-label text-zinc-600">No acquisition events yet.</p>
          ) : (
            <div className="space-y-1 max-h-[220px] overflow-y-auto pr-1">
              {events.slice().reverse().map((e) => (
                <div key={e.id} className="text-ds-label border-b border-white/[0.04] pb-1">
                  <span className="font-mono text-ds-micro text-zinc-500 mr-2">{e.type}</span>
                  <span className="text-zinc-300">{e.summary}</span>
                  {e.detail && <p className="text-ds-micro text-zinc-500">{e.detail}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="border border-white/[0.06] rounded-lg p-3">
          <p className="text-ds-micro font-semibold text-zinc-400 uppercase mb-1 flex items-center gap-1">
            <Mail className="w-3 h-3" /> Canonical conversation ({messages.length})
          </p>
          {messages.length === 0 ? (
            <p className="text-ds-label text-zinc-600">No messages logged yet.</p>
          ) : (
            <div className="space-y-1 max-h-[220px] overflow-y-auto pr-1">
              {messages.slice().reverse().map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    'rounded-md px-2 py-1.5 text-ds-label',
                    m.direction === 'outbound' ? 'bg-brass-500/10 text-zinc-300' : 'bg-white/[0.04] text-zinc-400'
                  )}
                >
                  <span className="font-mono text-ds-micro text-zinc-500 mr-2">
                    {m.direction} · {m.channel} · {m.createdAt.slice(0, 16).replace('T', ' ')}
                  </span>
                  <span className="whitespace-pre-wrap">{m.subject ? `${m.subject} — ` : ''}{m.body.slice(0, 180)}</span>
                </div>
              ))}
            </div>
          )}
          <p className="text-ds-micro text-zinc-600 mt-1">
            Same thread as Admin → Messages (single canonical store keyed by {prospect.id}) — no duplicate conversation history.
          </p>
        </div>
      </div>
    </div>
  );
}
