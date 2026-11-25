/**
 * §WAVE 3k (2026-11-25) — THE SHARED PANEL RENDERER.
 *
 * WHY THIS MOVED HERE. WAVE 3j built a declarative panel renderer inside the Control
 * Centre's view. WAVE 3k adds three more super-admin surfaces that need exactly the
 * same thing — a titled card of labelled rows, each value carrying its own tone and an
 * optional plain-language note, with the canonical owner shown at the foot. Copying it
 * into three more files would create four renderers that drift; this is the ONE owner.
 *
 * THE RULES IT KEEPS (unchanged from WAVE 3j)
 * - It renders; it never computes. Every value comes from the caller's own model.
 * - A group with no rows says so plainly rather than rendering a bare heading.
 * - The canonical owner is always visible, so provenance is shown, never implied.
 * - The card carries `data-testid={`control-panel-${id}`}`, which the browser gate and
 *   `scripts/validate-control-centre-panels.mjs` both rely on.
 */
import type { ReactNode } from 'react';
import type { StatusTone } from '@/components/ui';
import { SectionCard } from './ConsoleCharts';

export interface PanelRow {
  label: string;
  value: string;
  tone?: StatusTone;
  /** The sentence that explains what the value means, in plain words. */
  note?: string;
}

export interface PanelGroup {
  label: string;
  rows: PanelRow[];
}

export interface PanelSpec {
  id: string;
  title: string;
  description: string;
  /** The canonical module that produces every figure in this panel. */
  owner: string;
  groups: PanelGroup[];
}

export const TONE_TEXT: Record<string, string> = {
  success: 'text-emerald-700',
  warning: 'text-amber-700',
  danger: 'text-red-700',
  info: 'text-sky-700',
  brass: 'text-amber-800',
  neutral: 'text-zinc-700',
};

/** One labelled row. Presentation only — the value is the caller's. */
export function PanelRowLine({ item }: { item: PanelRow }) {
  return (
    <div className="py-2 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-0.5">
      <dt className="text-ds-body text-zinc-600">{item.label}</dt>
      <dd className="text-right">
        <span
          className={`text-ds-body font-medium tabular-nums ${
            TONE_TEXT[item.tone ?? 'neutral'] ?? 'text-zinc-700'
          }`}
        >
          {item.value}
        </span>
        {item.note && (
          <span className="block text-ds-label font-normal text-zinc-500 max-w-2xl">{item.note}</span>
        )}
      </dd>
    </div>
  );
}

/** A titled card of labelled groups, with the canonical owner named at the foot. */
export function PanelCard({ panel, actions }: { panel: PanelSpec; actions?: ReactNode }) {
  return (
    <SectionCard
      title={panel.title}
      description={panel.description}
      actions={actions}
      testId={`control-panel-${panel.id}`}
    >
      {panel.groups.map((group) => (
        <div key={group.label} className="mb-5 last:mb-0">
          <h3 className="text-ds-micro font-medium uppercase tracking-[0.06em] text-zinc-500">
            {group.label}
          </h3>
          {group.rows.length === 0 ? (
            <p className="mt-1.5 text-ds-label text-zinc-500">
              Nothing is recorded for this yet. The panel shows the real state of these records rather than
              a filled-in placeholder.
            </p>
          ) : (
            <dl className="mt-1.5 divide-y divide-zinc-200">
              {group.rows.map((item, index) => (
                <PanelRowLine key={`${item.label}-${index}`} item={item} />
              ))}
            </dl>
          )}
        </div>
      ))}
      <p className="mt-1 text-ds-label text-zinc-500">Owned by {panel.owner}</p>
    </SectionCard>
  );
}
