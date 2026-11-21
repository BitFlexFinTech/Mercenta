/**
 * §Sprint — ADMIN / SUPER ADMIN work management destination.
 *
 * Composes the shared operating workspace over the platform-wide work layer
 * (LIST · KANBAN · CALENDAR) and adds the operator's own context rail. The
 * hand-off actions route into the EXISTING admin destinations — the work layer
 * never duplicates a record surface.
 */
import { useApp } from '@/context/GlobalStateContext';
import { NewTaskPanel, WorkWorkspace } from '@/components/shared/WorkWorkspace';
import { ContextPanel } from '@/components/shared/workspace';
import { demoToday, getWorkItems, workActor } from '@/lib/work/workStore';

function WorkRailExtras({ actor }: { actor: string }) {
  const bySource = getWorkItems('admin').reduce<Record<string, number>>((acc, w) => {
    acc[w.source] = (acc[w.source] ?? 0) + 1;
    return acc;
  }, {});
  const top = Object.entries(bySource)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  return (
    <>
      <NewTaskPanel scope="admin" actor={actor} />
      <ContextPanel title="Where work comes from">
        {top.length === 0 ? (
          <p className="text-ds-label text-faint">No open work right now.</p>
        ) : (
          <ul className="space-y-1">
            {top.map(([src, n]) => (
              <li key={src} className="flex items-center justify-between gap-2 text-ds-label">
                <span className="text-muted">{src.replace(/_/g, ' ')}</span>
                <span className="font-mono text-strong">{n}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-ds-micro text-faint">As at {demoToday()} · platform-wide.</p>
      </ContextPanel>
    </>
  );
}

export function AdminWorkManagement({ onNavigate }: { onNavigate: (view: string) => void }) {
  const { session, role } = useApp();
  const actor = workActor(session);
  /**
   * §P3 — Super Admin is the ONLY session that may see the founder-console items
   * (company register, funding routes, applications, integrations, cost
   * protection). It is a positive declaration, so an ordinary admin session gets
   * the operational work only — the same list, without the founder records.
   */
  const isSuperAdmin = role === 'Super Admin';
  return (
    <WorkWorkspace
      scope="admin"
      actor={actor}
      includeSuperAdminOnly={isSuperAdmin}
      eyebrow="Admin Hub · Operations"
      title="Work Management"
      description={
        isSuperAdmin
          ? 'THE single action list — every unit of outstanding work across the portfolio (PO acknowledgements, compliance gates, contract renewals, deductions, carrier exceptions, returns, outreach follow-ups) PLUS the founder console: company compliance, platform setup, brand applications, integration health, funding routes and cost protection, ranked with the declared WHY. Work is never listed anywhere else.'
          : 'Every unit of outstanding work across the portfolio — PO acknowledgements, compliance gates, contract renewals, deductions, carrier exceptions, returns and outreach follow-ups — with owners, deadlines and a full activity trail.'
      }
      onNavigate={onNavigate}
      contextExtra={<WorkRailExtras actor={actor} />}
    />
  );
}

export function AdminWorkCalendar({ onNavigate }: { onNavigate: (view: string) => void }) {
  const { session } = useApp();
  const actor = workActor(session);
  return (
    <WorkWorkspace
      scope="admin"
      initialView="calendar"
      actor={actor}
      eyebrow="Admin Hub · Operations"
      title="Operations Calendar"
      description="Deadlines derived from real platform state — acknowledgement windows, ship and delivery windows, document expiries, contract renewals, deduction windows and returns actions."
      onNavigate={onNavigate}
      contextExtra={<NewTaskPanel scope="admin" actor={actor} />}
    />
  );
}
