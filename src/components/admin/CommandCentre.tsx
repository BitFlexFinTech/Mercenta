/**
 * §32/§34 (M13 Phase 11) — SUPER ADMIN COMMAND CENTRE.
 *
 * Rendered at the TOP of the admin overview so the solo founder's first screen
 * answers "what needs my attention, and what do I do next". Each row is a real
 * derived action with ONE CTA that lands on the exact screen — including Super
 * Admin TABS (Company, Google, Operating Costs, Launch Centre, Applications) via
 * `requestAdminNav`, so no hunting through five screens.
 *
 * Category / region / urgency / value are shown when the underlying record
 * carries them, and nothing here is fabricated: see `buildCommandCentre`.
 */
import { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Card, EmptyState } from '@/components/ui';
import { cn } from '@/utils/cn';
import { requestAdminNav } from '@/data/adminNav';
import { useIntegrations } from '@/integrations/IntegrationsContext';
import {
  buildCommandCentre,
  type CommandAction,
  type CommandBand,
  type CommandCentreModel,
} from '@/lib/commandCentre/commandCentre';
import { Activity, AlertTriangle, CalendarClock, Sparkles } from 'lucide-react';

const BAND_META: Record<CommandBand, { label: string; hint: string; icon: typeof AlertTriangle }> = {
  now: { label: 'NOW', hint: 'Do these first — time-critical or blocking.', icon: AlertTriangle },
  today: { label: 'TODAY', hint: 'Next actions for today.', icon: Activity },
  week: { label: 'THIS WEEK', hint: 'Move these forward this week.', icon: CalendarClock },
};

function priorityBadge(priority: CommandAction['priority']): string {
  switch (priority) {
    case 'urgent':
      return 'bg-red-500/15 text-red-300 border-red-500/20';
    case 'high':
      return 'bg-amber-500/15 text-amber-300 border-amber-500/20';
    default:
      return 'bg-white/[0.06] text-zinc-300 border-white/10';
  }
}

export function CommandCentre({ onNavigate }: { onNavigate?: (view: string) => void }) {
  const { integrations } = useIntegrations();
  const [model, setModel] = useState<CommandCentreModel | null>(null);

  const rebuild = useCallback(() => {
    const issues = Object.entries(integrations)
      .filter(([, state]) => Boolean(state?.error) && !state?.disabled)
      .map(([id, state]) => ({ id, name: id.replace(/_/g, ' '), error: String(state.error) }));
    setModel(buildCommandCentre({ integrationIssues: issues }));
  }, [integrations]);

  useEffect(() => {
    rebuild();
  }, [rebuild]);

  /** Route a CTA: record the intent (tab-aware) then switch shell view. */
  const run = (action: CommandAction) => {
    requestAdminNav({ view: action.navView, tab: action.navTab, source: `command-centre:${action.id}` });
    onNavigate?.(action.navView);
  };

  if (!model) return null;

return (
    <div data-testid="command-centre">
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> Command centre
          </h2>
          <p className="text-ds-label text-zinc-500 mt-1">
            What needs your attention now, and the exact next action for each item.
          </p>
          <p className="text-ds-micro text-zinc-600 mt-0.5" data-testid="command-queue-basis">
            Ranked {model.counts.total > 0 ? `1–${model.counts.total}` : ''} by {model.queueBasis}
          </p>
        </div>
        <div className="flex items-center gap-2 text-ds-micro">
          <Badge className="bg-red-500/15 text-red-300 border-red-500/20">{model.counts.now} now</Badge>
          <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/20">{model.counts.today} today</Badge>
          <Badge className="bg-white/[0.06] text-zinc-300 border-white/10">{model.counts.week} this week</Badge>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {bands.map((band) => {
          const meta = BAND_META[band];
          const Icon = meta.icon;
          const items = model[band];
          return (
            <section key={band} data-testid={`command-band-${band}`}>
              <div className="flex items-center gap-2">
                <Icon className="w-3.5 h-3.5 text-zinc-400" />
                <h3 className="text-ds-label font-semibold tracking-wide text-zinc-300">{meta.label}</h3>
                <span className="text-ds-micro text-zinc-600">{meta.hint}</span>
              </div>
              {items.length === 0 ? (
                <EmptyState title="Nothing here" description={`No ${meta.label.toLowerCase()} actions are outstanding.`} />
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {items.map((a) => (
                    <li
                      key={a.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/[0.06] bg-ink-850 px-3 py-2"
                      data-testid="command-action"
                    >
                      <div className="min-w-[240px] flex-1">
                        <p className="text-xs text-white">
                          {typeof a.rank === 'number' && <span className="text-zinc-500 mr-1">#{a.rank}</span>}
                          {a.title}
                        </p>
                        <p className="text-ds-micro text-zinc-500">{a.detail}</p>
                        {a.why && (
                          <p className="text-ds-micro text-zinc-600" data-testid="command-why">
                            Why: {a.why.factors.map((f) => `${f.label} ${f.points}`).join(' · ')} = {a.why.score}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-ds-micro">
                        {a.category && <span className="text-zinc-500">{a.category}</span>}
                        {a.region && <span className="text-zinc-500">· {a.region}</span>}
                        {typeof a.valueGbp === 'number' && (
                          <span className="text-zinc-400">£{a.valueGbp.toLocaleString('en-GB')}</span>
                        )}
                        <Badge className={cn('text-ds-micro', priorityBadge(a.priority))}>{a.priority}</Badge>
                        <Button variant="secondary" size="sm" className="text-xs" onClick={() => run(a)}>
                          {a.cta}
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 mt-5" data-testid="command-sections">
        {model.sections.map((section) => (
          <div
            key={section.id}
            className="rounded-lg border border-white/[0.06] bg-ink-850 p-3"
            data-testid={`command-section-${section.id}`}
          >
            <p className="text-ds-label font-semibold text-white">{section.label}</p>
            <p className="text-ds-micro text-zinc-600 mt-0.5">{section.description}</p>
            {section.actions.length === 0 ? (
              <p className="text-ds-micro text-zinc-500 mt-2">Nothing outstanding.</p>
            ) : (
              <ul className="mt-2 space-y-1">
                {section.actions.slice(0, 4).map((a) => (
                  <li key={a.id} className="text-ds-micro text-zinc-400">
                    {typeof a.rank === 'number' && <span className="text-zinc-600">#{a.rank} </span>}
                    <span className="text-zinc-300">{a.title}</span>
                    <button type="button" className="ml-1 text-sky-300/90 hover:underline" onClick={() => run(a)}>
                      {a.cta}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </Card>
    </div>
  );
}
  const bands: CommandBand[] = ['now', 'today', 'week'];