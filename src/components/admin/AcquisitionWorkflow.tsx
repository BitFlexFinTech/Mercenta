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
import { Badge, Button, Card, Input, EmptyState } from '@/components/ui';
import { cn } from '@/utils/cn';
import type { AcquisitionRelationship, OpportunityStage } from '@/types';
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
  simulationOutreachTransport,
  transportFromEmailClient,
} from '@/lib/acquisition/outreachSender';
import { Send, CheckCircle2, XCircle, Pencil, Sparkles, Mail, MessageSquareReply, Trophy } from 'lucide-react';

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

export function AcquisitionWorkflow({
  prospectId,
  onChanged,
}: {
  prospectId: string;
  onChanged?: () => void;
}) {
  const { actingStaffId, canCurrentUserMutate, refreshLeadsFromProspects } = useApp();
  const comms = useBrandComms();
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

  /** Connected provider → live transport; otherwise the simulation transport. */
  const transport = useMemo(
    () =>
      comms.emailLive || comms.emailSandbox
        ? transportFromEmailClient(comms.emailClient, comms.emailLive)
        : simulationOutreachTransport,
    [comms.emailClient, comms.emailLive, comms.emailSandbox]
  );

  if (!relationship || !row) {
    return <EmptyState title="Prospect not found" description="This acquisition record has no canonical Brand Intelligence prospect." />;
  }

  const { prospect, current, responses, opportunity, events, messages } = relationship;
  const stage = row.stage;
  const contact = prospect.contacts[0];
  const subjectValue = subjectDraft ?? current?.subject ?? '';
  const bodyValue = bodyDraft ?? current?.body ?? '';
  const whyContact = current?.evidenceSummary ?? '';

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
      transport.mode === 'simulation'
        ? 'Sent through the deterministic simulation path (no external network).'
        : 'Sent through the connected provider.'
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
          <Badge className={cn('text-[10px] border capitalize', STAGE_STYLES[stage] ?? 'text-zinc-400')}>
            {stage}
          </Badge>
        </span>
        <Badge className="text-[10px] bg-white/[0.05] text-zinc-300 border-white/[0.08]">
          BI score {prospect.score.total}/100 · {prospect.score.tier}
        </Badge>
        {row.region ? (
          <Badge className="text-[10px] bg-white/[0.05] text-zinc-300 border-white/[0.08]">
            ICP region {row.region} · {row.lead?.segment}
          </Badge>
        ) : (
          <Badge className="text-[10px] bg-red-500/10 text-red-300 border-red-500/20">no ICP origin region</Badge>
        )}
        <Badge className="text-[10px] bg-white/[0.05] text-zinc-400 border-white/[0.08] font-mono">
          {prospect.id} → {row.lead?.id ?? '(unlinked)'}
        </Badge>
        {!canCurrentUserMutate && (
          <Badge className="text-[10px] bg-zinc-500/10 text-zinc-400 border-white/[0.08]">view-only account</Badge>
        )}
      </div>

      {notice && <p className="text-[11px] text-emerald-400" data-notice="ok">{notice}</p>}
      {error && <p className="text-[11px] text-red-300" data-notice="error">{error}</p>}

      {/* Why we are contacting this brand (BI evidence) -------------------- */}
      <div className="bg-brass-500/5 border border-brass-500/15 rounded-lg p-3" data-section="evidence">
        <p className="text-[10px] font-semibold text-brass-300 uppercase mb-1">Why we are contacting this brand — BI evidence</p>
        {whyContact ? (
          <pre className="text-[11px] text-brass-200/90 whitespace-pre-wrap font-sans leading-relaxed">{whyContact}</pre>
        ) : (
          <p className="text-[11px] text-zinc-500">
            Prepare a recommendation to attach the canonical Brand Intelligence evidence
            ({prospect.asins.length} ASINs · {prospect.contacts.length} contact(s) · score {prospect.score.total}/100).
          </p>
        )}
      </div>

      {/* Contact / targeting ---------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" data-section="targeting">
        <div className="bg-ink-850 border border-white/[0.06] rounded-lg p-2.5">
          <p className="text-[10px] text-zinc-500 uppercase">Contact / decision-maker</p>
          <p className="text-xs text-zinc-200 mt-0.5">
            {contact ? `${contact.name}${contact.jobTitle ? `, ${contact.jobTitle}` : ''}` : 'Not identified in the BI record'}
          </p>
          <p className="text-[10px] text-zinc-500 mt-0.5">
            {contact?.email ?? 'hello@….example placeholder until a contact email is verified'}
          </p>
        </div>
        <div className="bg-ink-850 border border-white/[0.06] rounded-lg p-2.5">
          <p className="text-[10px] text-zinc-500 uppercase">Channel</p>
          <p className="text-xs text-zinc-200 mt-0.5">
            {current?.channel ?? 'email'} · {transport.mode === 'live' ? 'connected provider' : 'simulation (no provider connected)'}
          </p>
          <p className="text-[10px] text-zinc-500 mt-0.5">Revisions: {relationship.outreach.length} · Messages logged: {messages.length}</p>
        </div>
      </div>

      {/* Recommendation + human approval ---------------------------------- */}
      <div className="border border-white/[0.06] rounded-lg p-3 space-y-2" data-section="recommendation">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold text-zinc-400 uppercase">Outreach recommendation</p>
          {current && (
            <span className="text-[10px] text-zinc-500" data-revision={current.revision ?? 1}>
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
          <p className="text-[11px] text-zinc-500">
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
                className="bg-ink-900 border border-white/[0.08] rounded-md px-2 py-1.5 text-[11px] text-white"
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
            <span className="text-[10px] text-amber-300">Read-only account — approval actions are refused.</span>
          )}
        </div>
      </div>

      {/* Responses -------------------------------------------------------- */}
      <div className="border border-white/[0.06] rounded-lg p-3" data-section="responses">
        <p className="text-[10px] font-semibold text-zinc-400 uppercase mb-1">Responses ({responses.length})</p>
        {responses.length === 0 ? (
          <p className="text-[11px] text-zinc-600">No response recorded yet.</p>
        ) : (
          <div className="space-y-1.5">
            {responses.map((r) => (
              <div key={r.id} className="bg-ink-850 border border-white/[0.06] rounded-lg p-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={cn('text-[9px]', r.wantsHuman ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/[0.05] text-zinc-300')}>
                    {r.wantsHuman ? 'hot lead' : 'reply'}
                  </Badge>
                  {r.simulated && <Badge className="text-[9px] bg-amber-500/15 text-amber-300">simulated</Badge>}
                  <span className="text-[9px] font-mono text-zinc-500">
                    {r.from} · {r.channel} · {r.receivedAt.slice(0, 16).replace('T', ' ')}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-300 mt-1 whitespace-pre-wrap">{r.body}</p>
                {r.classificationReason && (
                  <p className="text-[9px] text-zinc-500 mt-0.5">Classification: {r.classificationReason}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Opportunity ------------------------------------------------------ */}
      <div className="border border-white/[0.06] rounded-lg p-3" data-section="opportunity">
        <p className="text-[10px] font-semibold text-zinc-400 uppercase mb-1">Opportunity</p>
        {!opportunity ? (
          <p className="text-[11px] text-zinc-600">No opportunity yet — it is created from a qualified brand response.</p>
        ) : (
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span data-opportunity-stage={opportunity.stage}>
                <Badge className={cn('text-[10px] border capitalize', STAGE_STYLES[opportunity.stage])}>
                  {opportunity.stage}
                </Badge>
              </span>
              <span className="text-[10px] text-zinc-400 font-mono">{opportunity.id}</span>
              <span className="text-[10px] text-zinc-400">BI snapshot {opportunity.biScore}/100 ({opportunity.biTier})</span>
              <span className="text-[10px] text-zinc-500">owner {opportunity.ownerStaffId}</span>
            </div>
            {opportunity.contactName && (
              <p className="text-[11px] text-zinc-300">
                {opportunity.contactName}{opportunity.contactEmail ? ` · ${opportunity.contactEmail}` : ''}
              </p>
            )}
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {stageOptions.map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant="tertiary"
                  className="text-[10px]"
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

      {/* Relationship timeline + the ONE canonical message thread --------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2" data-section="relationship">
        <div className="border border-white/[0.06] rounded-lg p-3">
          <p className="text-[10px] font-semibold text-zinc-400 uppercase mb-1">Acquisition timeline ({events.length})</p>
          {events.length === 0 ? (
            <p className="text-[11px] text-zinc-600">No acquisition events yet.</p>
          ) : (
            <div className="space-y-1 max-h-[220px] overflow-y-auto pr-1">
              {events.slice().reverse().map((e) => (
                <div key={e.id} className="text-[11px] border-b border-white/[0.04] pb-1">
                  <span className="font-mono text-[9px] text-zinc-500 mr-2">{e.type}</span>
                  <span className="text-zinc-300">{e.summary}</span>
                  {e.detail && <p className="text-[9px] text-zinc-500">{e.detail}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="border border-white/[0.06] rounded-lg p-3">
          <p className="text-[10px] font-semibold text-zinc-400 uppercase mb-1 flex items-center gap-1">
            <Mail className="w-3 h-3" /> Canonical conversation ({messages.length})
          </p>
          {messages.length === 0 ? (
            <p className="text-[11px] text-zinc-600">No messages logged yet.</p>
          ) : (
            <div className="space-y-1 max-h-[220px] overflow-y-auto pr-1">
              {messages.slice().reverse().map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    'rounded-md px-2 py-1.5 text-[11px]',
                    m.direction === 'outbound' ? 'bg-brass-500/10 text-zinc-300' : 'bg-white/[0.04] text-zinc-400'
                  )}
                >
                  <span className="font-mono text-[9px] text-zinc-500 mr-2">
                    {m.direction} · {m.channel} · {m.createdAt.slice(0, 16).replace('T', ' ')}
                  </span>
                  <span className="whitespace-pre-wrap">{m.subject ? `${m.subject} — ` : ''}{m.body.slice(0, 180)}</span>
                </div>
              ))}
            </div>
          )}
          <p className="text-[9px] text-zinc-600 mt-1">
            Same thread as Admin → Messages (single canonical store keyed by {prospect.id}) — no duplicate conversation history.
          </p>
        </div>
      </div>
    </div>
  );
}
