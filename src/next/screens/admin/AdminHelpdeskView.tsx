import { useState } from 'react';
import type { Ticket, TicketPriority, TicketStatus } from '@/types';
import {
  EmptyStateBlock,
  ErrorStateBlock,
  InlineStatus,
  LoadingRows,
  MetricStrip,
  ConsoleHeader,
  type SemanticTone,
} from '@/next/components/ConsolePrimitives';
import { NoticeBanner, SectionCard } from '@/next/components/ConsoleCharts';

export interface HelpdeskCaseItem {
  id: string;
  caseRef?: string;
  subject: string;
  brandId: string;
  brandName: string;
  escalationState?: string;
  escalationLabel: string;
  sufficiencyLabel: string;
  sufficiencyTone: SemanticTone;
  articleTitles: string[];
  reasons: string[];
  context: { detail: string; resolved: boolean }[];
  amazonReferenceId?: string;
  amazonSimulated?: boolean;
  hasProviderResponse: boolean;
}

export interface HelpdeskMessageItem {
  id: string;
  direction: 'inbound' | 'outbound';
  body: string;
  createdAt: string;
}

export interface AdminHelpdeskViewProps {
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  note: string | null;
  metrics: {
    openCount: number;
    pendingCount: number;
    resolvedToday: number;
    overdueCount: number;
    unassignedCount: number;
  };
  awaitingReviewCases: HelpdeskCaseItem[];
  approvedToEscalateCases: HelpdeskCaseItem[];
  providerCases: HelpdeskCaseItem[];
  awaitingResponseCases: HelpdeskCaseItem[];
  readyToResolveCases: HelpdeskCaseItem[];
  onReviewCase: (id: string, decision: 'approve_escalation' | 'request_info' | 'reject') => void;
  onEscalateCase: (id: string) => Promise<void>;
  onRecordProviderResponse: (
    id: string,
    outcome: 'accepted' | 'rejected' | 'info_required' | 'closed',
    response: string
  ) => void;
  onResolveCase: (id: string, resolution: string) => void;
  tickets: Ticket[];
  selectedTicket: Ticket | null;
  onSelectTicket: (id: string) => void;
  ticketMessages: HelpdeskMessageItem[];
  staffOptions: { id: string; name: string }[];
  brandName: (brandId: string) => string;
  statusFilter: TicketStatus | 'all';
  onStatusFilterChange: (next: TicketStatus | 'all') => void;
  priorityFilter: TicketPriority | 'all';
  onPriorityFilterChange: (next: TicketPriority | 'all') => void;
  searchQuery: string;
  onSearchQueryChange: (next: string) => void;
  onUpdateTicketStatus: (ticketId: string, status: TicketStatus) => void;
  onAssignTicket: (ticketId: string, staffId: string) => void;
  onSetTicketPriority: (ticketId: string, priority: TicketPriority) => void;
  suggestedReply: string | null;
  onSendReply: (ticketId: string, body: string) => Promise<void>;
}

function slaLabel(deadline?: string, status?: TicketStatus): string | null {
  if (!deadline || status === 'resolved') return null;
  const h = Math.round((new Date(deadline).getTime() - Date.now()) / 3600000);
  if (h < 0) return `OVERDUE ${Math.abs(h)}h`;
  return h < 4 ? `${h}h left` : `${h}h`;
}

export function AdminHelpdeskView({
  loading,
  error,
  onRetry,
  note,
  metrics,
  awaitingReviewCases,
  approvedToEscalateCases,
  providerCases,
  awaitingResponseCases,
  readyToResolveCases,
  onReviewCase,
  onEscalateCase,
  onRecordProviderResponse,
  onResolveCase,
  tickets,
  selectedTicket,
  onSelectTicket,
  ticketMessages,
  staffOptions,
  brandName,
  statusFilter,
  onStatusFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  searchQuery,
  onSearchQueryChange,
  onUpdateTicketStatus,
  onAssignTicket,
  onSetTicketPriority,
  suggestedReply,
  onSendReply,
}: AdminHelpdeskViewProps) {
  const [caseResponse, setCaseResponse] = useState('');
  const [caseOutcome, setCaseOutcome] = useState<'accepted' | 'rejected' | 'info_required' | 'closed'>(
    'accepted'
  );
  const [caseResolution, setCaseResolution] = useState('');
  const [replyDraft, setReplyDraft] = useState('');

  return (
    <div className="space-y-6">
      <ConsoleHeader
        title="Helpdesk"
        description="Brand support cases reviewed by Mercenta before any channel escalation. Mercenta operates the channel relationship directly."
        meta={
          <span>
            {metrics.openCount} open · {metrics.pendingCount} pending · {metrics.unassignedCount}{' '}
            unassigned
          </span>
        }
      />

      {note && <NoticeBanner tone="info" title="Helpdesk update" message={note} />}
      {error && <ErrorStateBlock message={error} onRetry={onRetry} />}

      <MetricStrip
        loading={loading}
        columns={4}
        items={[
          {
            id: 'hd-open',
            label: 'Open tickets',
            value: String(metrics.openCount),
            context: 'Requires response',
            active: statusFilter === 'open',
            onClick: () => onStatusFilterChange(statusFilter === 'open' ? 'all' : 'open'),
          },
          {
            id: 'hd-pending',
            label: 'Pending',
            value: String(metrics.pendingCount),
            context: 'Awaiting partner or channel',
            active: statusFilter === 'pending',
            onClick: () => onStatusFilterChange(statusFilter === 'pending' ? 'all' : 'pending'),
          },
          {
            id: 'hd-overdue',
            label: 'SLA overdue',
            value: String(metrics.overdueCount),
            context: 'Past target deadline',
            onClick: () => onStatusFilterChange('all'),
          },
          {
            id: 'hd-awaiting',
            label: 'Cases awaiting review',
            value: String(awaitingReviewCases.length),
            context: `${metrics.resolvedToday} resolved today`,
            onClick: () => onStatusFilterChange('all'),
          },
        ]}
      />

      {/* Mercenta Case Review & Channel Escalation Queue */}
      <SectionCard
        title="Brand Cases — Mercenta Review Queue"
        description="Brand cases are checked against Knowledge Base sufficiency and reviewed before optional escalation to the retail channel."
      >
        <div className="space-y-4">
          {awaitingReviewCases.length === 0 ? (
            <p className="text-ds-label text-faint">No cases awaiting review.</p>
          ) : (
            <div className="divide-y divide-hairline-06 border border-hairline rounded-ds-md">
              {awaitingReviewCases.map((c) => (
                <div key={c.id} className="p-3 space-y-2" data-state="case-review-row">
                  <div className="flex flex-wrap items-center gap-2 justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-ds-label text-accent">
                        {c.caseRef ?? c.id}
                      </span>
                      <span className="text-ds-label font-semibold text-ink-950">{c.subject}</span>
                      <span className="text-ds-label text-faint">· {c.brandName}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onReviewCase(c.id, 'approve_escalation')}
                        className="px-2.5 py-1 rounded-ds-sm bg-ink-950 text-on-dark text-ds-micro font-medium hover:bg-ink-800"
                      >
                        Approve escalation
                      </button>
                      <button
                        type="button"
                        onClick={() => onReviewCase(c.id, 'request_info')}
                        className="px-2.5 py-1 rounded-ds-sm border border-hairline-strong bg-surface-raised text-ds-micro font-medium text-ink-800 hover:bg-surface"
                      >
                        Request info
                      </button>
                      <button
                        type="button"
                        onClick={() => onReviewCase(c.id, 'reject')}
                        className="px-2.5 py-1 rounded-ds-sm border border-state-danger/20 bg-state-danger/10 text-state-danger text-ds-micro font-medium hover:bg-state-danger/10"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <InlineStatus label={c.sufficiencyLabel} tone={c.sufficiencyTone} />
                    {c.articleTitles.length > 0 && (
                      <span className="text-ds-micro text-faint">
                        KB: {c.articleTitles.join(' · ')}
                      </span>
                    )}
                  </div>
                  {c.reasons.length > 0 && (
                    <ul className="text-ds-micro text-faint list-disc pl-4 space-y-0.5">
                      {c.reasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}

          {approvedToEscalateCases.length > 0 && (
            <div className="border-t border-hairline pt-3 space-y-2">
              <div className="text-ds-label font-semibold text-ink-950">
                Reviewed — Ready to escalate to the retail channel
              </div>
              {approvedToEscalateCases.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-2 text-ds-label"
                >
                  <span>
                    <span className="font-mono text-accent mr-2">{c.caseRef ?? c.id}</span>
                    <span className="text-ink-950 font-medium">{c.subject}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => void onEscalateCase(c.id)}
                    className="px-2.5 py-1 rounded-ds-sm bg-accent text-on-dark text-ds-micro font-medium hover:brightness-95"
                  >
                    Escalate to the retail channel
                  </button>
                </div>
              ))}
            </div>
          )}

          {providerCases.length > 0 && (
            <div className="border-t border-hairline pt-3 space-y-1.5">
              <div className="text-ds-label font-semibold text-ink-950">Provider cases</div>
              {providerCases.map((c) => (
                <div key={c.id} className="flex flex-wrap items-center gap-3 text-ds-label">
                  <span className="font-mono text-accent">{c.caseRef ?? c.id}</span>
                  <span className="font-mono text-faint">{c.amazonReferenceId}</span>
                  <span className="text-faint">
                    {c.amazonSimulated ? 'Simulation — no live retail-channel case' : 'Live retail-channel case'}
                  </span>
                  <InlineStatus label={c.escalationLabel} tone="info" />
                </div>
              ))}
            </div>
          )}

          {awaitingResponseCases.length > 0 && (
            <div className="border-t border-hairline pt-3 space-y-2">
              <div className="text-ds-label font-semibold text-ink-950">
                Record retail channel response (human-entered)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  value={caseResponse}
                  onChange={(e) => setCaseResponse(e.target.value)}
                  placeholder="What the retail channel said…"
                  className="sm:col-span-2 px-2.5 py-1.5 rounded-ds-sm border border-hairline-strong bg-surface-raised text-ds-label text-ink-950"
                />
                <select
                  value={caseOutcome}
                  onChange={(e) =>
                    setCaseOutcome(
                      e.target.value as 'accepted' | 'rejected' | 'info_required' | 'closed'
                    )
                  }
                  className="px-2.5 py-1.5 rounded-ds-sm border border-hairline-strong bg-surface-raised text-ds-label text-ink-950"
                >
                  <option value="accepted">Accepted</option>
                  <option value="rejected">Rejected</option>
                  <option value="info_required">Information required</option>
                  <option value="closed">Closed by channel</option>
                </select>
              </div>
              {awaitingResponseCases.map((c) => (
                <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 text-ds-label">
                  <span>
                    <span className="font-mono text-accent mr-2">{c.caseRef ?? c.id}</span>
                    {c.subject}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      onRecordProviderResponse(c.id, caseOutcome, caseResponse);
                      if (caseResponse.trim()) setCaseResponse('');
                    }}
                    className="px-2.5 py-1 rounded-ds-sm border border-hairline-strong bg-surface-raised text-ds-micro font-medium text-ink-900 hover:bg-surface"
                  >
                    Record response
                  </button>
                </div>
              ))}
            </div>
          )}

          {readyToResolveCases.length > 0 && (
            <div className="border-t border-hairline pt-3 space-y-2">
              <div className="text-ds-label font-semibold text-ink-950">Resolve case</div>
              <input
                type="text"
                value={caseResolution}
                onChange={(e) => setCaseResolution(e.target.value)}
                placeholder="Resolution note for the brand…"
                className="w-full px-2.5 py-1.5 rounded-ds-sm border border-hairline-strong bg-surface-raised text-ds-label text-ink-950"
              />
              {readyToResolveCases.map((c) => (
                <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 text-ds-label">
                  <span>
                    <span className="font-mono text-accent mr-2">{c.caseRef ?? c.id}</span>
                    {c.subject}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      onResolveCase(c.id, caseResolution);
                      if (caseResolution.trim()) setCaseResolution('');
                    }}
                    className="px-2.5 py-1 rounded-ds-sm bg-ink-950 text-on-dark text-ds-micro font-medium hover:bg-ink-800"
                  >
                    Resolve case
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </SectionCard>

      {/* Tickets split workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5">
          <SectionCard
            title="Support Tickets"
            actions={
              <div className="flex flex-wrap items-center gap-1.5">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchQueryChange(e.target.value)}
                  placeholder="Search tickets…"
                  aria-label="Search tickets"
                  className="w-36 px-2 py-1 rounded-ds-sm border border-hairline-strong bg-surface-raised text-ds-label text-ink-950"
                />
                <select
                  value={priorityFilter}
                  onChange={(e) => onPriorityFilterChange(e.target.value as TicketPriority | 'all')}
                  aria-label="Priority filter"
                  className="px-2 py-1 rounded-ds-sm border border-hairline-strong bg-surface-raised text-ds-label text-ink-950"
                >
                  <option value="all">Priority: all</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            }
          >
            {tickets.length === 0 ? (
              <EmptyStateBlock
                title="No tickets match"
                description="Reset search or status filters to inspect all support tickets."
              />
            ) : (
              <ul className="divide-y divide-hairline-06 -m-4 max-h-[520px] overflow-y-auto">
                {tickets.map((t) => {
                  const active = selectedTicket?.id === t.id;
                  const sla = slaLabel(t.slaDeadline, t.status);
                  return (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => onSelectTicket(t.id)}
                        className={`w-full text-left px-4 py-3 ${
                          active ? 'bg-tint' : 'hover:bg-surface'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-ds-label font-semibold text-ink-950 truncate">
                            {brandName(t.brandId)}
                          </span>
                          <span className="text-ds-micro font-mono uppercase text-faint">
                            {t.priority}
                          </span>
                        </div>
                        <div className="text-ds-label text-secondary truncate mt-0.5">{t.subject}</div>
                        <div className="mt-1 flex items-center gap-2 text-ds-micro font-mono text-faint">
                          <span>{t.status}</span>
                          {sla && <span className="text-state-danger">· {sla}</span>}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>
        </div>

        <div className="lg:col-span-7">
          <SectionCard title={selectedTicket ? selectedTicket.subject : 'Ticket Detail'}>
            {!selectedTicket ? (
              <EmptyStateBlock
                title="Select a ticket"
                description="Choose a support ticket on the left to manage assignment, SLA status, and replies."
              />
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-hairline text-ds-label">
                  <div className="text-faint">
                    {brandName(selectedTicket.brandId)} ·{' '}
                    {new Date(selectedTicket.createdAt).toLocaleDateString()}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={selectedTicket.status}
                      onChange={(e) =>
                        onUpdateTicketStatus(selectedTicket.id, e.target.value as TicketStatus)
                      }
                      aria-label="Ticket status"
                      className="px-2 py-1 rounded-ds-sm border border-hairline-strong bg-surface-raised text-ds-label"
                    >
                      <option value="open">Open</option>
                      <option value="pending">Pending</option>
                      <option value="resolved">Resolved</option>
                    </select>
                    <select
                      value={selectedTicket.assignedToStaffId ?? ''}
                      onChange={(e) => onAssignTicket(selectedTicket.id, e.target.value)}
                      aria-label="Assign ticket to"
                      className="px-2 py-1 rounded-ds-sm border border-hairline-strong bg-surface-raised text-ds-label"
                    >
                      <option value="">Unassigned</option>
                      {staffOptions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={selectedTicket.priority}
                      onChange={(e) =>
                        onSetTicketPriority(selectedTicket.id, e.target.value as TicketPriority)
                      }
                      aria-label="Ticket priority"
                      className="px-2 py-1 rounded-ds-sm border border-hairline-strong bg-surface-raised text-ds-label"
                    >
                      <option value="urgent">Urgent</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                </div>

                {loading ? (
                  <LoadingRows rows={3} label="Loading ticket messages…" />
                ) : ticketMessages.length === 0 ? (
                  <p className="text-ds-label text-faint">No messages recorded on this ticket yet.</p>
                ) : (
                  <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                    {ticketMessages.map((m) => (
                      <div
                        key={m.id}
                        className={`rounded-ds-md border px-3 py-2 text-ds-label ${
                          m.direction === 'outbound'
                            ? 'border-hairline-strong bg-surface ml-8'
                            : 'border-hairline bg-surface-raised mr-8'
                        }`}
                      >
                        <div className="whitespace-pre-wrap text-ink-900">{m.body}</div>
                        <div className="mt-1 text-ds-micro font-mono text-faint">
                          {new Date(m.createdAt).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {suggestedReply && (
                  <div className="border border-hairline rounded-ds-md p-3 bg-canvas-70 text-ds-label">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-ink-950">Suggested Reply Template</span>
                      <button
                        type="button"
                        onClick={() => setReplyDraft(suggestedReply)}
                        className="text-accent font-medium hover:underline"
                      >
                        Insert draft
                      </button>
                    </div>
                    <p className="text-faint">{suggestedReply}</p>
                  </div>
                )}

                <div className="pt-2 border-t border-hairline space-y-2">
                  <textarea
                    value={replyDraft}
                    onChange={(e) => setReplyDraft(e.target.value)}
                    rows={3}
                    placeholder="Type a reply…"
                    className="w-full px-3 py-2 rounded-ds-sm border border-hairline-strong bg-surface-raised text-ds-label text-ink-950"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      disabled={!replyDraft.trim()}
                      onClick={() => {
                        void onSendReply(selectedTicket.id, replyDraft).then(() =>
                          setReplyDraft('')
                        );
                      }}
                      className="px-3.5 py-1.5 rounded-ds-sm bg-accent text-on-dark text-ds-label font-medium hover:brightness-95 disabled:opacity-40"
                    >
                      Send Reply
                    </button>
                  </div>
                </div>
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
