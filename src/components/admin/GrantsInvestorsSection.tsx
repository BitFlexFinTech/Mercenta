/**
 * §Batch-9 — Grants & Investors research agent (Super Admin only).
 * Shows ranked grants and investors with drill-down detail and
 * human-approval-gated Apply/Reach Out flow.
 */
import { useState } from 'react';
import { runGrantsResearch, draftGrantApplication, draftInvestorOutreach, approveGrantDraft, approveInvestorDraft, getGrantsDrafts, getInvestorDrafts } from '@/lib/grants/researchEngine';
import { Card, Badge, Button } from '@/components/ui';
import { cn } from '@/utils/cn';
import type { GrantOpportunity, InvestorOpportunity, GrantsInvestorsReport } from '@/types';
import {
  FOUNDER_FUNDING_OPPORTUNITIES,
  FUNDING_OPPORTUNITY_TYPE_LABELS,
  FUNDING_PIPELINE_DISCLAIMER,
  FUNDING_STAGE_LABELS,
  generateFundingApplication,
  getFundingPipeline,
  recordFounderApproval,
  recordFundingSubmission,
  type FounderFundingOpportunity,
  type FundingApplicationDraft,
} from '@/lib/founder/fundingPipeline';
import { BRAND_LEGAL_NAME } from '@/config/brand';
import { CLAIM_LABELS } from '@/lib/intelligence/opportunityDiscovery';
import { Download, BadgeDollarSign, X, CheckCircle, Send, Eye, ShieldAlert, FileText } from 'lucide-react';

/**
 * §31/M13c — the legacy grant/investor drafts now use INTERNAL states only
 * (`draft` / `approved_internally`). Mercenta submits and sends nothing on the
 * founder's behalf, so an internal approval is labelled as exactly that and can
 * never be presented as an external event the founder did not perform.
 */
function internalStatusLabel(status: string): string {
  if (status === 'approved_internally') return 'internally approved — NOT submitted externally';
  return 'draft — nothing submitted';
}

/**
 * §31/M13c — the investor-outreach label variant. Same rule: an internal
 * approval is never described as a send.
 */
function internalOutreachLabel(status: string): string {
  if (status === 'approved_internally') return 'internally approved — NOT sent externally';
  return 'draft — nothing sent';
}

export function GrantsInvestorsSection() {
  const [report, setReport] = useState<GrantsInvestorsReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'grants' | 'investors' | 'drafts'>('grants');
  const [selectedGrant, setSelectedGrant] = useState<string | null>(null);
  const [selectedInvestor, setSelectedInvestor] = useState<string | null>(null);
  const [draftContent, setDraftContent] = useState<string | null>(null);
  const [draftNotice, setDraftNotice] = useState<string | null>(null);

  /* §10/§31 — the founder's OWN funding/accelerator pipeline (real routes). */
  const [pipelineVersion, setPipelineVersion] = useState(0);
  const [fundingDraft, setFundingDraft] = useState<FundingApplicationDraft | null>(null);
  const [fundingNotice, setFundingNotice] = useState<string | null>(null);
  const [submissionRefs, setSubmissionRefs] = useState<Record<string, string>>({});
  const [submissionConfirmed, setSubmissionConfirmed] = useState<string[]>([]);

  const pipeline = getFundingPipeline();
  void pipelineVersion;

  function handleGenerateFunding(o: FounderFundingOpportunity) {
    const draft = generateFundingApplication(o.id);
    if (!draft) {
      setFundingNotice('No draft was generated — that opportunity is not in the pipeline.');
      return;
    }
    setFundingDraft(draft);
    setFundingNotice(
      draft.lintPassed
        ? `Draft generated for ${o.organisation}. NOTHING has been submitted: review it, record your approval, then submit it yourself through the programme's own channel.`
        : `Draft generated for ${o.organisation} but it FAILED the wording gate: ${draft.lintReasons.join('; ')}`
    );
  }

  function handleApproveFunding(o: FounderFundingOpportunity) {
    const r = recordFounderApproval({
      opportunityId: o.id,
      approvedBy: `${BRAND_LEGAL_NAME} — sole director (Super Admin)`,
    });
    setFundingNotice(
      r.ok
        ? `Approval recorded for ${o.organisation}. Mercenta submits nothing — submit it yourself and then record the reference.`
        : `Refused: ${r.error}`
    );
    setPipelineVersion((v) => v + 1);
  }

  function handleRecordSubmission(o: FounderFundingOpportunity) {
    const reference = submissionRefs[o.id] ?? '';
    const r = recordFundingSubmission({
      opportunityId: o.id,
      actor: `${BRAND_LEGAL_NAME} — sole director (Super Admin)`,
      reference,
      confirmed: submissionConfirmed.includes(o.id),
    });
    setFundingNotice(
      r.ok
        ? `Submission recorded for ${o.organisation} with reference ${reference.trim()}.`
        : `Refused: ${r.error}`
    );
    setPipelineVersion((v) => v + 1);
  }

  async function handleRun() {
    setLoading(true);
    setError(null);
    try {
      const result = await runGrantsResearch({ activeOnly: true, minFitScore: 50 });
      setReport(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Research failed');
    } finally { setLoading(false); }
  }

  function handleDownload() {
    if (!report) return;
    const text = formatReport(report);
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'grants-investors-report-' + report.generatedAt.slice(0, 10) + '.txt';
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleDraftGrant(grant: GrantOpportunity) {
    const draft = draftGrantApplication(grant);
    setDraftContent(draft.content);
    setDraftNotice('Draft application created for ' + grant.title + '. Review and approve to send.');
  }

  function handleDraftInvestor(investor: InvestorOpportunity) {
    const draft = draftInvestorOutreach(investor);
    setDraftContent(draft.content);
    setDraftNotice('Draft outreach created for ' + investor.name + '. Review and approve to send.');
  }

  function handleApproveGrant(grantId: string) {
    const approved = approveGrantDraft(grantId, 'Tadii');
    if (approved) {
      setDraftNotice(
        'Application for ' +
          approved.grantTitle +
          ' is APPROVED INTERNALLY. Nothing has been submitted to the provider — submit it yourself, then record the submission in the funding pipeline below.'
      );
      setDraftContent(null);
    }
  }

  function handleApproveInvestor(investorId: string) {
    const approved = approveInvestorDraft(investorId, 'Tadii');
    if (approved) {
      setDraftNotice(
        'Outreach to ' +
          approved.investorName +
          ' is APPROVED INTERNALLY. Nothing has been sent — send it yourself through your own channel, or use the Recipient-specific outreach flow in the Partnerships Centre.'
      );
      setDraftContent(null);
    }
  }

  const grantsDrafts = getGrantsDrafts();
  const investorDrafts = getInvestorDrafts();
function formatReport(r: GrantsInvestorsReport): string {
  let out = 'Grants & Investors Report - ' + r.generatedAt.slice(0, 10) + '\n';
  out += 'Source: ' + r.sourceLabel + '\n\n';
  out += '--- GRANTS (' + r.grants.length + ') ---\n\n';
  for (const g of r.grants) {
    out += g.title + ' (' + g.provider + ')\n';
    out += '   Amount: ' + g.amountRange + ' | Deadline: ' + g.deadline + ' | Score: ' + g.fitScore + '/100\n';
    out += '   Fit: ' + g.fitReason + '\n\n';
  }
  out += '--- INVESTORS (' + r.investors.length + ') ---\n\n';
  for (const i of r.investors) {
    out += i.name + ' (' + i.type.replace(/_/g, ' ') + ')\n';
    out += '   Range: ' + i.investmentRange + ' | Stage: ' + i.stage.replace(/_/g, ' ') + ' | Score: ' + i.fitScore + '/100\n';
    out += '   Fit: ' + i.fitReason + '\n\n';
  }
  return out;
}

  return (
    <div className="space-y-4">
    <Card className="p-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BadgeDollarSign className="w-4 h-4 text-brass-400" />
          <span className="text-sm font-semibold text-white">Grants & Investors</span>
          <Badge className="text-ds-micro bg-brass-500/15 text-brass-400 border-brass-500/20">Super Admin</Badge>
        </div>
        <div className="flex items-center gap-2">
          {report && <Button className="text-ds-micro" onClick={handleDownload}><Download className="w-3 h-3 mr-1" /> Download</Button>}
          <Button className="text-xs" onClick={handleRun} disabled={loading}>
            {loading ? 'Researching...' : report ? 'Re-run' : 'Run Research'}
          </Button>
        </div>
      </div>

      <p className="text-ds-label text-zinc-500 mb-3">
        Discovers grants and investors from legitimate public sources (Innovate UK/UKRI, gov.uk).
        Applications and outreach are AI-drafted and staged for review — <strong>never sent
        automatically</strong>. Requires an explicit internal approval — Mercenta never sends.
      </p>

      {error && <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-xs text-red-300 mb-3">{error}</div>}

      {draftNotice && (
        <div className="bg-brass-500/10 border border-brass-500/20 rounded-lg p-3 text-xs text-brass-300 mb-3 flex items-center justify-between">
          <span>{draftNotice}</span>
          <button onClick={() => setDraftNotice(null)} className="text-brass-400 hover:text-brass-300"><X className="w-3 h-3" /></button>
        </div>
      )}
{!report && !loading && (
        <div className="text-center py-8">
          <BadgeDollarSign className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <p className="text-xs text-zinc-500">Run research to discover grants and investor opportunities</p>
        </div>
      )}

      {loading && (
        <div className="text-center py-6">
          <div className="animate-pulse text-xs text-zinc-400">Researching grants and investors...</div>
        </div>
      )}

      {report && (
        <>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-ink-900 rounded-lg p-2">
              <p className="text-ds-micro text-zinc-500">Grants</p>
              <p className="text-sm font-semibold text-white">{report.grants.length}</p>
            </div>
            <div className="bg-ink-900 rounded-lg p-2">
              <p className="text-ds-micro text-zinc-500">Investors</p>
              <p className="text-sm font-semibold text-white">{report.investors.length}</p>
            </div>
            <div className="bg-ink-900 rounded-lg p-2">
              <p className="text-ds-micro text-zinc-500">Drafts</p>
              <p className="text-sm font-semibold text-brass-400">{grantsDrafts.length + investorDrafts.length}</p>
            </div>
          </div>

          <div className="flex gap-1 mb-3 border-b border-white/[0.06]">
            <button onClick={() => setTab('grants')} className={cn('px-3 py-1.5 text-xs font-medium rounded-t transition-colors', tab === 'grants' ? 'text-white border-b-2 border-brass-500' : 'text-zinc-500 hover:text-zinc-300')}>Grants ({report.grants.length})</button>
            <button onClick={() => setTab('investors')} className={cn('px-3 py-1.5 text-xs font-medium rounded-t transition-colors', tab === 'investors' ? 'text-white border-b-2 border-brass-500' : 'text-zinc-500 hover:text-zinc-300')}>Investors ({report.investors.length})</button>
            <button onClick={() => setTab('drafts')} className={cn('px-3 py-1.5 text-xs font-medium rounded-t transition-colors', tab === 'drafts' ? 'text-white border-b-2 border-brass-500' : 'text-zinc-500 hover:text-zinc-300')}>Drafts ({grantsDrafts.length + investorDrafts.length})</button>
          </div>
{tab === 'grants' && (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {report.grants.map((g) => {
                const isSelected = selectedGrant === g.id;
                return (
                  <div key={g.id} className={cn('rounded-lg border p-2.5 cursor-pointer transition-all', isSelected ? 'bg-brass-500/10 border-brass-500/30' : 'bg-ink-900 border-white/[0.06] hover:border-white/[0.12]')}
                    onClick={() => setSelectedGrant(isSelected ? null : g.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium text-white truncate">{g.title}</span>
                          <Badge className={cn('text-ds-micro', g.status === 'open' ? 'bg-emerald-500/15 text-emerald-300' : g.status === 'closing_soon' ? 'bg-amber-500/15 text-amber-300' : 'bg-red-500/15 text-red-300')}>{g.status.replace(/_/g, ' ')}</Badge>
                        </div>
                        <div className="text-ds-micro text-zinc-500 mt-0.5">{g.provider} — {g.amountRange} — Deadline: {g.deadline}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold font-mono text-emerald-400">{g.fitScore}</div>
                        <p className="text-ds-micro text-zinc-600">/100</p>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="mt-2 pt-2 border-t border-white/[0.06] space-y-1.5">
                        <p className="text-ds-micro text-zinc-400 leading-relaxed">{g.fitReason}</p>
                        <p className="text-ds-micro text-zinc-500"><span className="text-zinc-400">Eligibility:</span> {g.eligibility}</p>
                        <div className="flex gap-2 pt-1">
                          {!g.draftStarted && !g.submitted && (
                            <Button className="text-ds-micro" onClick={() => { handleDraftGrant(g); setSelectedGrant(null); }}>
                              Apply — Draft Application
                            </Button>
                          )}
                          {g.submitted && <Badge className="text-ds-micro bg-emerald-500/15 text-emerald-300">Submitted</Badge>}
                          {g.draftStarted && !g.submitted && <Badge className="text-ds-micro bg-amber-500/15 text-amber-300">Draft staged</Badge>}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
{tab === 'investors' && (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {report.investors.map((inv) => {
                const isSelected = selectedInvestor === inv.id;
                return (
                  <div key={inv.id} className={cn('rounded-lg border p-2.5 cursor-pointer transition-all', isSelected ? 'bg-brass-500/10 border-brass-500/30' : 'bg-ink-900 border-white/[0.06] hover:border-white/[0.12]')}
                    onClick={() => setSelectedInvestor(isSelected ? null : inv.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium text-white truncate">{inv.name}</span>
                          <Badge className="text-ds-micro bg-zinc-500/15 text-zinc-400">{inv.type.replace(/_/g, ' ')}</Badge>
                        </div>
                        <div className="text-ds-micro text-zinc-500 mt-0.5">{inv.investmentRange} — {inv.stage.replace(/_/g, ' ')} — {inv.sectors.slice(0, 3).join(', ')}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold font-mono text-emerald-400">{inv.fitScore}</div>
                        <p className="text-ds-micro text-zinc-600">/100</p>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="mt-2 pt-2 border-t border-white/[0.06] space-y-1.5">
                        <p className="text-ds-micro text-zinc-400 leading-relaxed">{inv.fitReason}</p>
                        <div className="flex gap-2 pt-1">
                          {!inv.draftStarted && !inv.contacted && (
                            <Button className="text-ds-micro" onClick={() => { handleDraftInvestor(inv); setSelectedInvestor(null); }}>
                              Reach Out — Draft Email
                            </Button>
                          )}
                          {inv.contacted && <Badge className="text-ds-micro bg-emerald-500/15 text-emerald-300">Contacted</Badge>}
                          {inv.draftStarted && !inv.contacted && <Badge className="text-ds-micro bg-amber-500/15 text-amber-300">Draft staged</Badge>}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
{tab === 'drafts' && (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {grantsDrafts.length === 0 && investorDrafts.length === 0 && (
                <p className="text-xs text-zinc-600 text-center py-4">No drafts yet. Click &quot;Apply&quot; or &quot;Reach Out&quot; on a grant or investor to create a draft.</p>
              )}
              {grantsDrafts.map((d) => (
                <div key={d.grantId} className="bg-ink-900 rounded-lg border border-white/[0.06] p-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-medium text-white">{d.grantTitle}</span>
                      <Badge className={cn('text-ds-micro ml-2', d.status === 'draft' ? 'bg-amber-500/15 text-amber-300' : 'bg-emerald-500/15 text-emerald-300')}>{internalStatusLabel(d.status)}</Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button className="text-ds-micro" onClick={() => setDraftContent(d.content)}><Eye className="w-2.5 h-2.5 mr-1" /> Review</Button>
                      {d.status === 'draft' && (
                        <Button className="text-ds-micro" onClick={() => { handleApproveGrant(d.grantId); setDraftContent(null); }}>
                          <CheckCircle className="w-2.5 h-2.5 mr-1" /> Approve internally
                        </Button>
                      )}
                    </div>
                  </div>
                  {d.approvedAt && <p className="text-ds-micro text-zinc-600 mt-1">Internally approved {d.approvedAt} by {d.approvedBy} — no external submission is recorded</p>}
                </div>
              ))}
              {investorDrafts.map((d) => (
                <div key={d.investorId} className="bg-ink-900 rounded-lg border border-white/[0.06] p-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-medium text-white">{d.investorName}</span>
                      <Badge className={cn('text-ds-micro ml-2', d.status === 'draft' ? 'bg-amber-500/15 text-amber-300' : 'bg-emerald-500/15 text-emerald-300')}>{internalOutreachLabel(d.status)}</Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button className="text-ds-micro" onClick={() => setDraftContent(d.content)}><Eye className="w-2.5 h-2.5 mr-1" /> Review</Button>
                      {d.status === 'draft' && (
                        <Button className="text-ds-micro" onClick={() => { handleApproveInvestor(d.investorId); setDraftContent(null); }}>
                          <Send className="w-2.5 h-2.5 mr-1" /> Approve internally
                        </Button>
                      )}
                    </div>
                  </div>
                  {d.approvedAt && <p className="text-ds-micro text-zinc-600 mt-1">Internally approved {d.approvedAt} by {d.approvedBy} — no external send is recorded</p>}
                </div>
              ))}
            </div>
          )}

          {draftContent && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setDraftContent(null)}>
              <div className="bg-ink-850 border border-white/[0.08] rounded-xl p-5 w-[600px] max-h-[80vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-white">Draft Preview</h3>
                  <button onClick={() => setDraftContent(null)} className="text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
                </div>
                <pre className="text-xs text-zinc-300 whitespace-pre-wrap font-sans leading-relaxed">{draftContent}</pre>
              </div>
            </div>
          )}
        </>
      )}
    </Card>

    <Card className="p-4" title="Founder funding & accelerator pipeline">
      <div className="space-y-3" data-testid="funding-pipeline">
        <p className="text-ds-micro text-amber-300/90 flex items-start gap-1.5">
          <ShieldAlert className="w-3 h-3 mt-0.5 flex-shrink-0" />
          {FUNDING_PIPELINE_DISCLAIMER}
        </p>

        {fundingNotice && (
          <div
            className="bg-ink-900 border border-white/[0.06] rounded-lg p-2.5 text-ds-label text-zinc-300"
            data-testid="funding-notice"
          >
            {fundingNotice}
          </div>
        )}

        {FOUNDER_FUNDING_OPPORTUNITIES.map((o) => {
          const entry = pipeline.find((e) => e.opportunityId === o.id);
          const approved = Boolean(entry?.approval);
          const submitted = Boolean(entry?.submission);
          return (
            <div
              key={o.id}
              className="bg-ink-900 rounded-lg border border-white/[0.06] p-3"
              data-testid={`funding-opportunity-${o.id}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-white">
                    {o.organisation}
                    <Badge className="text-ds-micro ml-2 bg-white/[0.06] text-zinc-300">
                      {FUNDING_OPPORTUNITY_TYPE_LABELS[o.opportunityType]}
                    </Badge>
                  </p>
                  <p className="text-ds-micro text-zinc-500 mt-0.5">{o.geography}</p>
                  <a
                    href={o.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-ds-micro text-sky-300/90 hover:underline"
                  >
                    {o.url}
                  </a>
                </div>
                <span data-testid={`funding-stage-${o.id}`}>
                  <Badge className="text-ds-micro bg-brass-500/15 text-brass-400 border-brass-500/20">
                    {FUNDING_STAGE_LABELS[entry?.stage ?? 'discovered']}
                  </Badge>
                </span>
              </div>
              <div className="mt-2 space-y-0.5 text-ds-micro text-zinc-400">
                <p>
                  {o.fundingAmount
                    ? `Amount: ${o.fundingAmount.value} [${CLAIM_LABELS[o.fundingAmount.claim]}]`
                    : 'Amount: NOT STATED in the research — verify on the programme site.'}
                </p>
                <p>
                  {o.equityTerms
                    ? `Terms: ${o.equityTerms.value} [${CLAIM_LABELS[o.equityTerms.claim]}]`
                    : 'Terms: NOT STATED in the research — verify on the programme site.'}
                </p>
                <p>
                  Eligibility: {o.eligibility.value} [{CLAIM_LABELS[o.eligibility.claim]}]
                </p>
                <p>
                  Deadline:{' '}
                  {o.applicationDeadline ??
                    'NOT STATED in the research — verify on the programme site'}
                </p>
                <p>Required documents: {o.requiredDocuments.join(' · ')}</p>
                <p className="text-zinc-500">Next action: {entry?.nextAction ?? o.nextAction}</p>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Button className="text-ds-micro" onClick={() => handleGenerateFunding(o)}>
                  <FileText className="w-2.5 h-2.5 mr-1" /> Generate application
                </Button>
                <Button
                  className="text-ds-micro"
                  onClick={() => handleApproveFunding(o)}
                  disabled={approved}
                  data-testid={`funding-approve-${o.id}`}
                >
                  <CheckCircle className="w-2.5 h-2.5 mr-1" />
                  {approved ? 'Approval recorded' : 'Record founder approval'}
                </Button>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input
                  className="bg-ink-850 border border-white/[0.08] rounded px-2 py-1 text-ds-micro text-zinc-200 w-44"
                  placeholder="Programme reference"
                  value={submissionRefs[o.id] ?? ''}
                  onChange={(e) =>
                    setSubmissionRefs((prev) => ({ ...prev, [o.id]: e.target.value }))
                  }
                  data-testid={`funding-submission-ref-${o.id}`}
                />
                <label className="flex items-center gap-1.5 text-ds-micro text-zinc-400">
                  <input
                    type="checkbox"
                    checked={submissionConfirmed.includes(o.id)}
                    onChange={(e) =>
                      setSubmissionConfirmed((prev) =>
                        e.target.checked ? [...prev, o.id] : prev.filter((x) => x !== o.id)
                      )
                    }
                    data-testid={`funding-submission-confirm-${o.id}`}
                  />
                  I submitted this myself (Mercenta does not submit)
                </label>
                <Button
                  className="text-ds-micro"
                  onClick={() => handleRecordSubmission(o)}
                  disabled={submitted}
                  data-testid="funding-submit"
                >
                  {submitted ? 'Submission recorded' : 'Record my submission'}
                </Button>
              </div>

              {entry?.submission && (
                <p className="text-ds-micro text-emerald-300/90 mt-1">
                  Recorded: {entry.submission.reference} · {entry.submission.submittedAt} · by{' '}
                  {entry.submission.recordedBy}
                </p>
              )}
            </div>
          );
        })}

        {fundingDraft && (
          <div
            className="bg-ink-900 border border-white/[0.06] rounded-lg p-3"
            data-testid="funding-draft"
          >
            <p className="text-ds-label text-zinc-300">
              {fundingDraft.submissionStatus} · wording gate:{' '}
              {fundingDraft.lintPassed ? 'PASS' : `FAIL (${fundingDraft.lintReasons.join('; ')})`} ·
              basis: {fundingDraft.basis}
            </p>
            <pre className="whitespace-pre-wrap text-ds-micro text-zinc-300 bg-ink-850 border border-white/[0.06] rounded-lg p-2 mt-2 max-h-60 overflow-y-auto">
              {fundingDraft.content}
            </pre>
          </div>
        )}
      </div>
    </Card>
    </div>
  );
}
