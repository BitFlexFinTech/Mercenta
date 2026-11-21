/**
 * §Sprint — BRAND work management destination.
 *
 * The same operating workspace, strictly tenant-scoped: `scope="brand"` with the
 * session's own tenantId, so the store filters inside `getWorkItems` and a brand
 * can never see another tenant's work. Hand-off actions route into the brand's
 * OWN existing destinations.
 */
import { useApp } from '@/context/GlobalStateContext';
import { NewTaskPanel, WorkWorkspace } from '@/components/shared/WorkWorkspace';
import { ContextPanel } from '@/components/shared/workspace';
import { demoToday, getWorkItems, workActor } from '@/lib/work/workStore';

function BrandRailExtras({ tenantId, actor }: { tenantId: string | null; actor: string }) {
  const mine = getWorkItems('brand', tenantId);
  const bySource = mine.reduce<Record<string, number>>((acc, w) => {
    acc[w.source] = (acc[w.source] ?? 0) + 1;
    return acc;
  }, {});
  const top = Object.entries(bySource)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  return (
    <>
      <NewTaskPanel scope="brand" tenantId={tenantId} actor={actor} />
      <ContextPanel title="Your open work">
        {top.length === 0 ? (
          <p className="text-ds-label text-faint">Nothing outstanding on your account.</p>
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
        <p className="mt-2 text-ds-micro text-faint">
          {mine.length} item(s) · your account only · as at {demoToday()}
        </p>
      </ContextPanel>
    </>
  );
}

export function BrandWorkManagement({ onNavigate }: { onNavigate: (view: string) => void }) {
  const { session } = useApp();
  const tenantId = session?.tenantId ?? null;
  const actor = workActor(session);
  return (
    <WorkWorkspace
      scope="brand"
      tenantId={tenantId}
      actor={actor}
      eyebrow="Brand Portal · Operations"
      title="Tasks & Deadlines"
      description="What your account needs to do next — retail-channel PO acknowledgements, documents to renew, contracts coming up, returns actions and anything you have added yourself."
      onNavigate={onNavigate}
      openLabel="Open"
      contextExtra={<BrandRailExtras tenantId={tenantId} actor={actor} />}
    />
  );
}

export function BrandWorkCalendar({ onNavigate }: { onNavigate: (view: string) => void }) {
  const { session } = useApp();
  const tenantId = session?.tenantId ?? null;
  const actor = workActor(session);
  return (
    <WorkWorkspace
      scope="brand"
      tenantId={tenantId}
      initialView="calendar"
      actor={actor}
      eyebrow="Brand Portal · Operations"
      title="Your Calendar"
      description="Your deadlines in one place — acknowledgement windows, document expiries, contract renewals, returns actions and the tasks you have added."
      onNavigate={onNavigate}
      openLabel="Open"
      contextExtra={<NewTaskPanel scope="brand" tenantId={tenantId} actor={actor} />}
    />
  );
}
