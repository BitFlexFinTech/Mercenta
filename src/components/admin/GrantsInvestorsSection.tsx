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
import { Download, BadgeDollarSign, X, CheckCircle, Send, Eye } from 'lucide-react';

export function GrantsInvestorsSection() {
  const [report, setReport] = useState<GrantsInvestorsReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'grants' | 'investors' | 'drafts'>('grants');
  const [selectedGrant, setSelectedGrant] = useState<string | null>(null);
  const [selectedInvestor, setSelectedInvestor] = useState<string | null>(null);
  const [draftContent, setDraftContent] = useState<string | null>(null);
  const [draftNotice, setDraftNotice] = useState<string | null>(null);

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
      setDraftNotice('Application for ' + approved.grantTitle + ' approved and marked as submitted.');
      setDraftContent(null);
    }
  }

  function handleApproveInvestor(investorId: string) {
    const approved = approveInvestorDraft(investorId, 'Tadii');
    if (approved) {
      setDraftNotice('Outreach to ' + approved.investorName + ' approved and marked as sent.');
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
    <Card className="p-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BadgeDollarSign className="w-4 h-4 text-brass-400" />
          <span className="text-sm font-semibold text-white">Grants & Investors</span>
          <Badge className="text-[9px] bg-brass-500/15 text-brass-400 border-brass-500/20">Super Admin</Badge>
        </div>
        <div className="flex items-center gap-2">
          {report && <Button className="text-[10px]" onClick={handleDownload}><Download className="w-3 h-3 mr-1" /> Download</Button>}
          <Button className="text-xs" onClick={handleRun} disabled={loading}>
            {loading ? 'Researching...' : report ? 'Re-run' : 'Run Research'}
          </Button>
        </div>
      </div>

      <p className="text-[11px] text-zinc-500 mb-3">
        Discovers grants and investors from legitimate public sources (Innovate UK/UKRI, gov.uk).
        Applications and outreach are AI-drafted and staged for review — <strong>never sent
        automatically</strong>. Requires explicit &quot;Approve &amp; Send&quot; action.
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
              <p className="text-[9px] text-zinc-500">Grants</p>
              <p className="text-sm font-semibold text-white">{report.grants.length}</p>
            </div>
            <div className="bg-ink-900 rounded-lg p-2">
              <p className="text-[9px] text-zinc-500">Investors</p>
              <p className="text-sm font-semibold text-white">{report.investors.length}</p>
            </div>
            <div className="bg-ink-900 rounded-lg p-2">
              <p className="text-[9px] text-zinc-500">Drafts</p>
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
                          <Badge className={cn('text-[8px]', g.status === 'open' ? 'bg-emerald-500/15 text-emerald-300' : g.status === 'closing_soon' ? 'bg-amber-500/15 text-amber-300' : 'bg-red-500/15 text-red-300')}>{g.status.replace(/_/g, ' ')}</Badge>
                        </div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">{g.provider} — {g.amountRange} — Deadline: {g.deadline}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold font-mono text-emerald-400">{g.fitScore}</div>
                        <p className="text-[8px] text-zinc-600">/100</p>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="mt-2 pt-2 border-t border-white/[0.06] space-y-1.5">
                        <p className="text-[10px] text-zinc-400 leading-relaxed">{g.fitReason}</p>
                        <p className="text-[10px] text-zinc-500"><span className="text-zinc-400">Eligibility:</span> {g.eligibility}</p>
                        <div className="flex gap-2 pt-1">
                          {!g.draftStarted && !g.submitted && (
                            <Button className="text-[10px]" onClick={() => { handleDraftGrant(g); setSelectedGrant(null); }}>
                              Apply — Draft Application
                            </Button>
                          )}
                          {g.submitted && <Badge className="text-[8px] bg-emerald-500/15 text-emerald-300">Submitted</Badge>}
                          {g.draftStarted && !g.submitted && <Badge className="text-[8px] bg-amber-500/15 text-amber-300">Draft staged</Badge>}
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
                          <Badge className="text-[8px] bg-zinc-500/15 text-zinc-400">{inv.type.replace(/_/g, ' ')}</Badge>
                        </div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">{inv.investmentRange} — {inv.stage.replace(/_/g, ' ')} — {inv.sectors.slice(0, 3).join(', ')}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold font-mono text-emerald-400">{inv.fitScore}</div>
                        <p className="text-[8px] text-zinc-600">/100</p>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="mt-2 pt-2 border-t border-white/[0.06] space-y-1.5">
                        <p className="text-[10px] text-zinc-400 leading-relaxed">{inv.fitReason}</p>
                        <div className="flex gap-2 pt-1">
                          {!inv.draftStarted && !inv.contacted && (
                            <Button className="text-[10px]" onClick={() => { handleDraftInvestor(inv); setSelectedInvestor(null); }}>
                              Reach Out — Draft Email
                            </Button>
                          )}
                          {inv.contacted && <Badge className="text-[8px] bg-emerald-500/15 text-emerald-300">Contacted</Badge>}
                          {inv.draftStarted && !inv.contacted && <Badge className="text-[8px] bg-amber-500/15 text-amber-300">Draft staged</Badge>}
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
                      <Badge className={cn('text-[8px] ml-2', d.status === 'draft' ? 'bg-amber-500/15 text-amber-300' : 'bg-emerald-500/15 text-emerald-300')}>{d.status}</Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button className="text-[9px]" onClick={() => setDraftContent(d.content)}><Eye className="w-2.5 h-2.5 mr-1" /> Review</Button>
                      {d.status === 'draft' && (
                        <Button className="text-[9px]" onClick={() => { handleApproveGrant(d.grantId); setDraftContent(null); }}>
                          <CheckCircle className="w-2.5 h-2.5 mr-1" /> Approve &amp; Send
                        </Button>
                      )}
                    </div>
                  </div>
                  {d.submittedAt && <p className="text-[9px] text-zinc-600 mt-1">Submitted {d.submittedAt} by {d.submittedBy}</p>}
                </div>
              ))}
              {investorDrafts.map((d) => (
                <div key={d.investorId} className="bg-ink-900 rounded-lg border border-white/[0.06] p-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-medium text-white">{d.investorName}</span>
                      <Badge className={cn('text-[8px] ml-2', d.status === 'draft' ? 'bg-amber-500/15 text-amber-300' : 'bg-emerald-500/15 text-emerald-300')}>{d.status}</Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button className="text-[9px]" onClick={() => setDraftContent(d.content)}><Eye className="w-2.5 h-2.5 mr-1" /> Review</Button>
                      {d.status === 'draft' && (
                        <Button className="text-[9px]" onClick={() => { handleApproveInvestor(d.investorId); setDraftContent(null); }}>
                          <Send className="w-2.5 h-2.5 mr-1" /> Approve &amp; Send
                        </Button>
                      )}
                    </div>
                  </div>
                  {d.sentAt && <p className="text-[9px] text-zinc-600 mt-1">Sent {d.sentAt} by {d.sentBy}</p>}
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
  );
}
