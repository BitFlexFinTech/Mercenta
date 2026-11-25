/**
 * §WAVE 3e (2026-11-25) — admin helpdesk (data + triage actions).
 *
 * The actions are the store's own commands (`updateTicketStatus`, `setTicketPriority`,
 * `assignTicket`), attributed to the ACTING staff member, and the screen re-reads on
 * the canonical change signal, so a triage is visible immediately — one work path,
 * not a second one.
 */
import { useMemo, useState } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { useBrands, useCanonicalStoreVersion } from '@/data/queries';
import {
  assignTicket,
  demoTickets,
  setTicketPriority,
  updateTicketStatus,
} from '@/lib/helpdesk/ticketStore';
import type { Ticket, TicketPriority, TicketStatus } from '@/types';
import { AdminHelpdeskView, type AdminTicketRow } from './AdminHelpdeskView';

export function AdminHelpdeskScreen() {
  const { staff, actingStaffId } = useApp();
  const brandsQ = useBrands();
  const canonicalVersion = useCanonicalStoreVersion();

  const [brandFilter, setBrandFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [busyTicketId, setBusyTicketId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const brands = brandsQ.data?.data ?? [];

  const allRows = useMemo<AdminTicketRow[]>(() => {
    void canonicalVersion; // re-read the ticket store whenever it changes
    const now = Date.now();
    return demoTickets.map((ticket) => ({
      ticket,
      brandName:
        brands.find((brand) => brand.id === ticket.brandId)?.profile.businessName ??
        ticket.brandId,
      assignedTo: staff.find((member) => member.id === ticket.assignedToStaffId)?.name,
      overdue: Boolean(ticket.slaDeadline && new Date(ticket.slaDeadline).getTime() < now),
    }));
  }, [brands, staff, canonicalVersion]);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return allRows
      .filter((row) => brandFilter === 'all' || row.ticket.brandId === brandFilter)
      .filter((row) => statusFilter === 'all' || row.ticket.status === statusFilter)
      .filter((row) => priorityFilter === 'all' || row.ticket.priority === priorityFilter)
      .filter((row) =>
        query ? row.ticket.subject.toLowerCase().includes(query) : true
      );
  }, [allRows, brandFilter, statusFilter, priorityFilter, search]);

  /* The option lists come from the records that exist, so the screen can never
     offer a status or priority the domain does not have. */
  const statusOptions = useMemo(
    () => Array.from(new Set(allRows.map((row) => row.ticket.status))).sort(),
    [allRows]
  );
  const priorityOptions = useMemo(
    () => Array.from(new Set(allRows.map((row) => row.ticket.priority))).sort(),
    [allRows]
  );

  const selectedRow = selected ? (allRows.find((row) => row.ticket.id === selected.id) ?? null) : null;

  function handleSetStatus(ticket: Ticket, status: TicketStatus): void {
    setBusyTicketId(ticket.id);
    const updated = updateTicketStatus(ticket.id, status, actingStaffId);
    setBusyTicketId(null);
    setNotice(updated ? `Ticket set to ${status}.` : 'That status change was refused.');
  }

  function handleSetPriority(ticket: Ticket, priority: TicketPriority): void {
    setBusyTicketId(ticket.id);
    const updated = setTicketPriority(ticket.id, priority, actingStaffId);
    setBusyTicketId(null);
    setNotice(updated ? `Priority set to ${priority}.` : 'That priority change was refused.');
  }

  function handleAssign(ticket: Ticket, staffId: string): void {
    if (!staffId) return; // the ticket store has no unassign command
    setBusyTicketId(ticket.id);
    const member = staff.find((candidate) => candidate.id === staffId);
    const updated = assignTicket(ticket.id, staffId, actingStaffId);
    setBusyTicketId(null);
    setNotice(
      updated ? `Assigned to ${member?.name ?? staffId}.` : 'That assignment was refused.'
    );
  }

  return (
    <AdminHelpdeskView
      rows={rows}
      totalTickets={allRows.length}
      brandOptions={brands.map((brand) => ({ id: brand.id, name: brand.profile.businessName }))}
      statusOptions={statusOptions}
      priorityOptions={priorityOptions}
      staffOptions={staff.filter((member) => member.active)}
      brandFilter={brandFilter}
      statusFilter={statusFilter}
      priorityFilter={priorityFilter}
      search={search}
      openCount={allRows.filter((row) => row.ticket.status === 'open').length}
      pendingCount={allRows.filter((row) => row.ticket.status === 'pending').length}
      overdueCount={allRows.filter((row) => row.overdue).length}
      selected={selected}
      selectedRow={selectedRow}
      busyTicketId={busyTicketId}
      notice={notice}
      isLoading={brandsQ.isPending}
      isError={brandsQ.isError}
      errorMessage={String(brandsQ.error ?? '') || undefined}
      onRetry={() => void brandsQ.refetch()}
      onChangeBrand={setBrandFilter}
      onChangeStatus={setStatusFilter}
      onChangePriority={setPriorityFilter}
      onChangeSearch={setSearch}
      onSelect={setSelected}
      onSetStatus={handleSetStatus}
      onSetPriority={handleSetPriority}
      onAssign={handleAssign}
    />
  );
}