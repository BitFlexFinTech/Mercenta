/**
 * §WAVE 3e (2026-11-25) — ADMIN helpdesk (presentation).
 *
 * This screen DOES act: `setTicketPriority`, `updateTicketStatus` and
 * `assignTicket` are canonical store commands, so triage happens here through the
 * same code paths the rest of the platform uses, recorded against the acting staff
 * member — not a second implementation.
 */
import {
  ConsoleHeader,
  ConsoleTable,
  ErrorStateBlock,
  InlineStatus,
  LoadingRows,
  MetricStrip,
  SlideOverDrawer,
  type ConsoleColumn,
  type MetricItem,
} from '@/next/components/ConsolePrimitives';
import { SectionCard } from '@/next/components/ConsoleCharts';
import type { StaffMember } from '@/types';
import type { Ticket, TicketPriority, TicketStatus } from '@/types';

export interface AdminTicketRow {
  ticket: Ticket;
  brandName: string;
  assignedTo?: string;
  overdue: boolean;
}

export interface AdminHelpdeskViewProps {
  rows: AdminTicketRow[];
  totalTickets: number;
  brandOptions: { id: string; name: string }[];
  statusOptions: string[];
  priorityOptions: string[];
  staffOptions: StaffMember[];
  brandFilter: string;
  statusFilter: string;
  priorityFilter: string;
  search: string;
  openCount: number;
  pendingCount: number;
  overdueCount: number;
  selected: Ticket | null;
  selectedRow: AdminTicketRow | null;
  busyTicketId: string | null;
  notice: string | null;
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  onRetry: () => void;
  onChangeBrand: (value: string) => void;
  onChangeStatus: (value: string) => void;
  onChangePriority: (value: string) => void;
  onChangeSearch: (value: string) => void;
  onSelect: (ticket: Ticket | null) => void;
  onSetStatus: (ticket: Ticket, status: TicketStatus) => void;
  onSetPriority: (ticket: Ticket, priority: TicketPriority) => void;
  onAssign: (ticket: Ticket, staffId: string) => void;
}

const PRIORITY_TONES: Record<TicketPriority, 'neutral' | 'warning' | 'danger'> = {
  low: 'neutral',
  medium: 'neutral',
  high: 'warning',
  urgent: 'danger',
};

export function AdminHelpdeskView({
  rows,
  totalTickets,
  brandOptions,
  statusOptions,
  priorityOptions,
  staffOptions,
  brandFilter,
  statusFilter,
  priorityFilter,
  search,
  openCount,
  pendingCount,
  overdueCount,
  selected,
  selectedRow,
  busyTicketId,
  notice,
  isLoading,
  isError,
  errorMessage,
  onRetry,
  onChangeBrand,
  onChangeStatus,
  onChangePriority,
  onChangeSearch,
  onSelect,
  onSetStatus,
  onSetPriority,
  onAssign,
}: AdminHelpdeskViewProps) {
  const metrics: MetricItem[] = [
    {
      id: 'open',
      label: 'Open tickets',
      value: String(openCount),
      context: 'Awaiting staff action',
      onClick: () => onChangeStatus('open'),
      active: statusFilter === 'open',
    },
    {
      id: 'pending',
      label: 'Pending',
      value: String(pendingCount),
      context: 'Waiting on the brand',
      onClick: () => onChangeStatus('pending'),
      active: statusFilter === 'pending',
    },
    {
      id: 'overdue',
      label: 'Past the SLA target',
      value: String(overdueCount),
      context: overdueCount > 0 ? 'Needs attention today' : 'Nothing overdue',
    },
  ];

  const columns: ConsoleColumn<AdminTicketRow>[] = [
    {
      key: 'ticket',
      header: 'Ticket',
      mobilePrimary: true,
      render: (row) => (
        <div className="min-w-0">
          <div className="font-medium text-zinc-950 truncate">{row.ticket.subject}</div>
          <div className="text-ds-label text-zinc-500 truncate">
            {row.brandName} · {row.ticket.lastMessagePreview}
          </div>
        </div>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (row) => (
        <InlineStatus
          label={row.ticket.priority}
          tone={PRIORITY_TONES[row.ticket.priority]}
          dataStatus={row.ticket.priority}
        />
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <InlineStatus
          label={row.ticket.status}
          tone={row.ticket.status === 'resolved' ? 'success' : 'warning'}
          dataStatus={row.ticket.status}
        />
      ),
    },
    {
      key: 'assignee',
      header: 'Assigned to',
      hideOnMobile: true,
      render: (row) => (
        <span className="text-ds-label text-zinc-600">{row.assignedTo ?? 'Unassigned'}</span>
      ),
    },
    {
      key: 'sla',
      header: 'SLA target',
      align: 'right',
      hideOnMobile: true,
      render: (row) =>
        row.overdue ? (
          <InlineStatus label="Overdue" tone="danger" dataStatus="overdue" />
        ) : (
          <span className="tabular-nums text-ds-label text-zinc-600">
            {row.ticket.slaDeadline ? row.ticket.slaDeadline.slice(0, 10) : '—'}
          </span>
        ),
    },
  ];
return (
    <div>
      <ConsoleHeader
        eyebrow="Mercenta · Governance & Support"
        title="Helpdesk"
        description="Every brand ticket, its priority, who owns it, and the SLA target it is measured against."
      />

      {notice && (
        <p role="status" className="mb-4 text-ds-label text-zinc-700">
          {notice}
        </p>
      )}

      {isError ? (
        <ErrorStateBlock
          title="Tickets could not be loaded"
          message={errorMessage}
          onRetry={onRetry}
        />
      ) : isLoading ? (
        <LoadingRows rows={8} />
      ) : (
        <>
          <MetricStrip items={metrics} columns={3} />

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <input
              type="search"
              value={search}
              onChange={(event) => onChangeSearch(event.target.value)}
              placeholder="Search subject or brand"
              aria-label="Search tickets"
              className="px-3 py-2 text-ds-body border border-zinc-300 rounded-ds-md bg-white text-zinc-950 w-64"
            />
            <select
              value={brandFilter}
              onChange={(event) => onChangeBrand(event.target.value)}
              aria-label="Filter by brand"
              className="px-3 py-2 text-ds-body border border-zinc-300 rounded-ds-md bg-white text-zinc-950"
            >
              <option value="all">All brands</option>
              {brandOptions.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(event) => onChangeStatus(event.target.value)}
              aria-label="Filter by status"
              className="px-3 py-2 text-ds-body border border-zinc-300 rounded-ds-md bg-white text-zinc-950"
            >
              <option value="all">All statuses</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <select
              value={priorityFilter}
              onChange={(event) => onChangePriority(event.target.value)}
              aria-label="Filter by priority"
              className="px-3 py-2 text-ds-body border border-zinc-300 rounded-ds-md bg-white text-zinc-950"
            >
              <option value="all">All priorities</option>
              {priorityOptions.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </div>

          <SectionCard title="Tickets" description={`${rows.length} of ${totalTickets} shown`}>
            <ConsoleTable
              rows={rows}
              columns={columns}
              rowKey={(row) => row.ticket.id}
              onRowClick={(row) => onSelect(row.ticket)}
              emptyTitle="No tickets match these filters"
              emptyDescription="Clear the filters to see the whole portfolio."
            />
          </SectionCard>
        </>
      )}
<SlideOverDrawer
        open={Boolean(selected)}
        onClose={() => onSelect(null)}
        title={selected ? selected.subject : ''}
        subtitle={selectedRow ? selectedRow.brandName : undefined}
        testId="admin-ticket-drawer"
      >
        {selected && (
          <div className="space-y-4">
            <p className="text-ds-body text-zinc-700">{selected.lastMessagePreview}</p>

            <div className="grid grid-cols-1 gap-3">
              <label className="text-ds-body">
                <span className="text-ds-label text-zinc-500 block mb-1">Status</span>
                <select
                  value={selected.status}
                  disabled={busyTicketId === selected.id}
                  onChange={(event) => onSetStatus(selected, event.target.value as TicketStatus)}
                  className="w-full px-3 py-2 text-ds-body border border-zinc-300 rounded-ds-md bg-white text-zinc-950"
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-ds-body">
                <span className="text-ds-label text-zinc-500 block mb-1">Priority</span>
                <select
                  value={selected.priority}
                  disabled={busyTicketId === selected.id}
                  onChange={(event) =>
                    onSetPriority(selected, event.target.value as TicketPriority)
                  }
                  className="w-full px-3 py-2 text-ds-body border border-zinc-300 rounded-ds-md bg-white text-zinc-950"
                >
                  {priorityOptions.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-ds-body">
                <span className="text-ds-label text-zinc-500 block mb-1">Assigned to</span>
                <select
                  value={selected.assignedToStaffId ?? ''}
                  disabled={busyTicketId === selected.id}
                  onChange={(event) => onAssign(selected, event.target.value)}
                  className="w-full px-3 py-2 text-ds-body border border-zinc-300 rounded-ds-md bg-white text-zinc-950"
                >
                  {/* Selecting "Unassigned" would be a false affordance: the ticket
                      store has no unassign command, so it is shown as current state
                      only and cannot be chosen. */}
                  {!selected.assignedToStaffId && (
                    <option value="" disabled>
                      Unassigned
                    </option>
                  )}
                  {staffOptions.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <dl className="border-t border-zinc-200 pt-3 grid grid-cols-2 gap-3 text-ds-body">
              <div>
                <dt className="text-ds-label text-zinc-500">Opened</dt>
                <dd className="font-medium text-zinc-950">{selected.createdAt.slice(0, 10)}</dd>
              </div>
              <div>
                <dt className="text-ds-label text-zinc-500">SLA target</dt>
                <dd className="font-medium text-zinc-950">
                  {selected.slaDeadline ? selected.slaDeadline.slice(0, 10) : 'Not set'}
                </dd>
              </div>
            </dl>
          </div>
        )}
      </SlideOverDrawer>
    </div>
  );
}