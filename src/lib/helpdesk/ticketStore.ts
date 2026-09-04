/**
 * §Batch-13 — Helpdesk ticket store.
 *
 * Tickets are the escalation layer on top of the existing messages table.
 * A conversation becomes a ticket when escalated by staff or flagged by the
 * system. Live chat messages flow through the same `messages` table (reusing
 * the existing `logMessage` pipeline) — tickets group those messages into
 * support threads.
 */
import type { Ticket, TicketStatus, TicketPriority, TicketSource, HelpdeskMetrics } from '@/types';
import { demoAuditLog, demoBrands, demoMessages } from '@/data/demoStore';

const uid = (p: string) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

/* ── Seed tickets ─────────────────────────────────────────────────── */

export const demoTickets: Ticket[] = [
  {
    id: 'tkt-001', brandId: 'brand-zambezi',
    messageIds: ['msg-015', 'msg-016', 'msg-017'],
    lastMessagePreview: 'When will my Marula Oil PO be dispatched?',
    lastMessageAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    status: 'open', priority: 'high', source: 'live_chat',
    subject: 'Zambezi — PO dispatch query',
    createdAt: new Date(Date.now() - 5 * 3600000).toISOString(),
    seenByStaff: true, brandOnline: true, category: 'fulfillment',
  },
  {
    id: 'tkt-002', brandId: 'brand-nordhaus',
    messageIds: ['msg-008', 'msg-009'],
    lastMessagePreview: 'Submitted HMRC docs, what is the timeline?',
    lastMessageAt: new Date(Date.now() - 12 * 3600000).toISOString(),
    status: 'open', priority: 'medium',
    assignedToStaffId: 'staff-003', source: 'email',
    subject: 'Nordhaus — compliance timeline',
    createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
    seenByStaff: false, category: 'compliance',
  },
  {
    id: 'tkt-003', brandId: 'brand-apexdrive',
    messageIds: ['msg-023'],
    lastMessagePreview: 'PO-9045 wrong unit pricing — can you correct?',
    lastMessageAt: new Date(Date.now() - 48 * 3600000).toISOString(),
    status: 'pending', priority: 'urgent',
    assignedToStaffId: 'staff-001', source: 'email',
    subject: 'ApexDrive — PO-9045 pricing discrepancy',
    createdAt: new Date(Date.now() - 72 * 3600000).toISOString(),
    slaDeadline: new Date(Date.now() + 24 * 3600000).toISOString(),
    seenByStaff: true, category: 'pricing',
  },
  {
    id: 'tkt-004', brandId: 'brand-harvestlane',
    messageIds: ['msg-021', 'msg-022'],
    lastMessagePreview: 'When is next shipment for PO-9002 scheduled?',
    lastMessageAt: new Date(Date.now() - 96 * 3600000).toISOString(),
    status: 'open', priority: 'low',
    assignedToStaffId: 'staff-002', source: 'live_chat',
    subject: 'Harvest Lane — shipment schedule',
    createdAt: new Date(Date.now() - 120 * 3600000).toISOString(),
    seenByStaff: true, brandOnline: false, category: 'logistics',
  },
  {
    id: 'tkt-005', brandId: 'brand-deskforge',
    messageIds: ['msg-019', 'msg-020'],
    lastMessagePreview: 'Please update our bank sort code per attached letter.',
    lastMessageAt: new Date(Date.now() - 192 * 3600000).toISOString(),
    status: 'resolved', priority: 'medium',
    assignedToStaffId: 'staff-001', source: 'email',
    subject: 'DeskForge — bank details update',
    createdAt: new Date(Date.now() - 240 * 3600000).toISOString(),
    seenByStaff: true, category: 'banking',
  },
];
/* ── CRUD operations ──────────────────────────────────────────────── */

export function createTicket(brandId: string, subject: string, source: TicketSource, priority: TicketPriority = 'medium', category?: string): Ticket {
  const t: Ticket = {
    id: uid('tkt'), brandId, messageIds: [], lastMessagePreview: '',
    lastMessageAt: new Date().toISOString(), status: 'open', priority,
    assignedToStaffId: undefined, source, subject,
    createdAt: new Date().toISOString(), seenByStaff: false, category,
  };
  demoTickets.unshift(t);
  writeTicketAudit('ticket_created', t.id, brandId, `Ticket created via ${source}: ${subject}`);
  return t;
}

export function updateTicketStatus(ticketId: string, status: TicketStatus, actorStaffId?: string): Ticket | null {
  const t = demoTickets.find((x) => x.id === ticketId);
  if (!t) return null;
  const prev = t.status;
  t.status = status;
  if (status === 'resolved') t.seenByStaff = true;
  writeTicketAudit('ticket_status_changed', ticketId, t.brandId, `${prev} → ${status}`, actorStaffId);
  return t;
}

export function assignTicket(ticketId: string, staffId: string, actorStaffId?: string): Ticket | null {
  const t = demoTickets.find((x) => x.id === ticketId);
  if (!t) return null;
  t.assignedToStaffId = staffId;
  writeTicketAudit('ticket_assigned', ticketId, t.brandId, `Assigned to ${staffId}`, actorStaffId);
  return t;
}

export function setTicketPriority(ticketId: string, priority: TicketPriority, actorStaffId?: string): Ticket | null {
  const t = demoTickets.find((x) => x.id === ticketId);
  if (!t) return null;
  t.priority = priority;
  writeTicketAudit('ticket_priority_changed', ticketId, t.brandId, `Priority: ${priority}`, actorStaffId);
  return t;
}

export function markTicketSeen(ticketId: string): Ticket | null {
  const t = demoTickets.find((x) => x.id === ticketId);
  if (!t) return null;
  t.seenByStaff = true;
  return t;
}

export function linkMessageToTicket(ticketId: string, messageId: string): Ticket | null {
  const t = demoTickets.find((x) => x.id === ticketId);
  if (!t) return null;
  if (!t.messageIds.includes(messageId)) t.messageIds.push(messageId);
  const msg = demoMessages.find((m) => m.id === messageId);
  if (msg) { t.lastMessagePreview = msg.body.slice(0, 100); t.lastMessageAt = msg.createdAt; }
  return t;
}

/**
 * Find an open ticket for a brand, or create one if none exists.
 * Used by LiveChatWidget to auto-create tickets from chat messages.
 */
export function findOrCreateTicketForBrand(
  brandId: string,
  subject: string,
  source: TicketSource,
  category?: string
): Ticket {
  // Reuse open ticket if one exists for this brand
  const existing = demoTickets.find(
    (t) => t.brandId === brandId && t.status !== 'resolved'
  );
  if (existing) return existing;
  // Create new ticket
  return createTicket(brandId, subject, source, 'medium', category);
}

/** Append a message ID to a ticket and update its preview. */
export function appendMessageToTicket(ticketId: string, messageId: string): Ticket | null {
  return linkMessageToTicket(ticketId, messageId);
}

/* ── Queries ──────────────────────────────────────────────────────── */

export function getTicketsForBrand(brandId: string): Ticket[] { return demoTickets.filter((t) => t.brandId === brandId); }
export function getTicketById(ticketId: string): Ticket | null { return demoTickets.find((t) => t.id === ticketId) ?? null; }
export function getTicketsByStatus(status: TicketStatus): Ticket[] { return demoTickets.filter((t) => t.status === status); }
export function getUnassignedTickets(): Ticket[] { return demoTickets.filter((t) => t.status !== 'resolved' && !t.assignedToStaffId); }

export function computeHelpdeskMetrics(): HelpdeskMetrics {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const open = demoTickets.filter((t) => t.status === 'open');
  const pending = demoTickets.filter((t) => t.status === 'pending');
  const resolvedToday = demoTickets.filter((t) => t.status === 'resolved' && t.createdAt.startsWith(today));
  const overdue = demoTickets.filter((t) => t.slaDeadline && new Date(t.slaDeadline) < now && t.status !== 'resolved');
  const unassigned = demoTickets.filter((t) => t.status !== 'resolved' && !t.assignedToStaffId);
  return { openCount: open.length, pendingCount: pending.length, resolvedToday: resolvedToday.length, overdueSla: overdue.length, avgResolutionTimeMinutes: 180, unassignedCount: unassigned.length };
}

function writeTicketAudit(action: string, ticketId: string, brandId: string, reason: string, actorStaffId?: string) {
  demoAuditLog.push({
    id: uid('audit'), createdAt: new Date().toISOString(), actorId: actorStaffId ?? 'system',
    action, entityType: 'helpdesk_ticket', entityId: ticketId, brandId, reason,
  });
}