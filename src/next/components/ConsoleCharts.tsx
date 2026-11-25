import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

export interface ChartDatum {
  label: string;
  value: number;
  hint?: string;
}

/**
 * Lightweight monochrome SVG vertical bar chart with tabular values and hairline baseline.
 * Uses only Mercenta editorial zinc + the theme accent token (zero chart libraries).
 */
export function ConsoleBarChart({
  data,
  formatValue = (v) => `£${Math.round(v).toLocaleString('en-GB')}`,
  emptyText = 'No chart series recorded yet.',
  height = 148,
}: {
  data: ChartDatum[];
  formatValue?: (v: number) => string;
  emptyText?: string;
  height?: number;
}) {
  if (data.length === 0) {
    return (
      <div className="py-8 text-center text-ds-label text-zinc-500 border border-dashed border-zinc-200 rounded-ds-md">
        {emptyText}
      </div>
    );
  }

  const maxVal = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className="space-y-2">
      <div
        className="flex items-end gap-2 pt-3 border-b border-zinc-200 px-1"
        style={{ height }}
        role="img"
        aria-label={data.map((d) => `${d.label}: ${formatValue(d.value)}`).join(', ')}
      >
        {data.map((d, idx) => {
          const pct = Math.max(4, Math.round((d.value / maxVal) * 100));
          const isLast = idx === data.length - 1;
          return (
            <div key={d.label} className="flex-1 min-w-0 flex flex-col items-center justify-end h-full gap-1">
              <span className="text-ds-micro font-mono tabular-nums text-zinc-600 truncate max-w-full">
                {formatValue(d.value)}
              </span>
              <div className="w-full max-w-[36px] flex items-end flex-1">
                <div
                  title={d.hint ?? `${d.label}: ${formatValue(d.value)}`}
                  className={`w-full rounded-t-[3px] transition-all ${
                    isLast ? 'bg-accent' : 'bg-zinc-900'
                  }`}
                  style={{ height: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-2 px-1">
        {data.map((d) => (
          <div
            key={d.label}
            className="flex-1 min-w-0 text-center text-ds-micro text-zinc-500 truncate font-mono"
          >
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Monochrome SVG polyline trend chart with hairline baselines and right-aligned extrema.
 */
export function ConsoleTrendChart({
  data,
  formatValue = (v) => `£${Math.round(v).toLocaleString('en-GB')}`,
  emptyText = 'Not enough dated records to plot a trend.',
}: {
  data: ChartDatum[];
  formatValue?: (v: number) => string;
  emptyText?: string;
}) {
  if (data.length === 0) {
    return (
      <div className="py-8 text-center text-ds-label text-zinc-500 border border-dashed border-zinc-200 rounded-ds-md">
        {emptyText}
      </div>
    );
  }

  const w = 480;
  const h = 132;
  const padX = 16;
  const padY = 14;
  const maxVal = Math.max(1, ...data.map((d) => d.value));
  const minVal = Math.min(0, ...data.map((d) => d.value));
  const range = Math.max(1, maxVal - minVal);

  const coords = data.map((d, idx) => {
    const x =
      data.length === 1
        ? w / 2
        : padX + (idx / (data.length - 1)) * (w - padX * 2);
    const y = h - padY - ((d.value - minVal) / range) * (h - padY * 2);
    return { x, y, ...d };
  });

  const pointsAttr = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-ds-micro font-mono tabular-nums text-zinc-500">
        <span>Peak: {formatValue(maxVal)}</span>
        <span>Latest: {formatValue(data[data.length - 1].value)}</span>
      </div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full h-36 overflow-visible"
        role="img"
        aria-label={data.map((d) => `${d.label}: ${formatValue(d.value)}`).join(', ')}
      >
        <line x1={padX} y1={padY} x2={w - padX} y2={padY} stroke="#E4E4E7" strokeDasharray="3 3" />
        <line x1={padX} y1={h / 2} x2={w - padX} y2={h / 2} stroke="#E4E4E7" strokeDasharray="3 3" />
        <line x1={padX} y1={h - padY} x2={w - padX} y2={h - padY} stroke="#E4E4E7" />
        {coords.length > 1 && (
          <polyline
            fill="none"
            stroke="#09090B"
            strokeWidth={1.75}
            strokeLinejoin="round"
            strokeLinecap="round"
            points={pointsAttr}
          />
        )}
        {coords.map((c, idx) => (
          <circle
            key={c.label}
            cx={c.x}
            cy={c.y}
            r={idx === coords.length - 1 ? 4 : 3}
            fill={idx === coords.length - 1 ? 'var(--mr-accent)' : 'var(--color-next-ink)'}
          >
            <title>{`${c.label}: ${formatValue(c.value)}`}</title>
          </circle>
        ))}
      </svg>
      <div className="flex items-center justify-between gap-2 text-ds-micro font-mono text-zinc-500">
        {data.map((d) => (
          <span key={d.label} className="truncate">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Horizontal proportional track bar (used for order pipeline & completion bars).
 */
export function ConsoleProgressTrack({
  value,
  max = 100,
  label,
}: {
  value: number;
  max?: number;
  label?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, Math.round((value / max) * 100))) : 0;
  return (
    <div className="space-y-1">
      {label && (
        <div className="flex items-center justify-between text-ds-label text-zinc-600 tabular-nums font-mono">
          <span>{label}</span>
          <span>{pct}%</span>
        </div>
      )}
      <div className="h-2 w-full rounded-ds-sm bg-zinc-100 overflow-hidden">
        <div className="h-full bg-zinc-900 rounded-ds-sm" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/**
 * Hairline section container card matching Mercenta Next editorial console grammar.
 */
export function SectionCard({
  title,
  description,
  actions,
  children,
  testId,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  testId?: string;
}) {
  return (
    <section
      data-testid={testId}
      className="border border-zinc-200 bg-white rounded-ds-md overflow-hidden"
    >
      <div className="px-4 py-3 border-b border-zinc-200 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-ds-body font-semibold text-zinc-950">{title}</h2>
          {description && (
            <p className="mt-0.5 text-ds-label text-zinc-600 max-w-3xl">{description}</p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

/**
 * Quiet tab strip using 1px border rules (never bright pills).
 */
export function ConsoleTabs<T extends string>({
  tabs,
  value,
  onChange,
  ariaLabel = 'Section tabs',
}: {
  tabs: { id: T; label: string; count?: number }[];
  value: T;
  onChange: (next: T) => void;
  ariaLabel?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="flex flex-wrap items-center gap-1 border-b border-zinc-200 pb-2 mb-4"
    >
      {tabs.map((t) => {
        const active = value === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            className={`px-3 py-1.5 rounded-ds-sm text-ds-label font-medium transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-accent ${
              active
                ? 'bg-zinc-950 text-white'
                : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
            }`}
          >
            {t.label}
            {typeof t.count === 'number' && (
              <span
                className={`ml-1.5 font-mono text-ds-micro tabular-nums ${
                  active ? 'text-zinc-300' : 'text-zinc-500'
                }`}
              >
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Quiet inline banner for disclosures, honest gaps, or mutation feedback.
 */
export function NoticeBanner({
  tone = 'info',
  title,
  message,
}: {
  tone?: 'info' | 'warning' | 'danger' | 'success';
  title?: string;
  message: ReactNode;
}) {
  const styles =
    tone === 'danger'
      ? 'border-red-200 bg-red-50/70 text-red-950'
      : tone === 'warning'
        ? 'border-amber-200 bg-amber-50/70 text-amber-950'
        : tone === 'success'
          ? 'border-emerald-200 bg-emerald-50/70 text-emerald-950'
          : 'border-zinc-200 bg-zinc-50 text-zinc-800';

  const Icon =
    tone === 'success'
      ? CheckCircle2
      : tone === 'danger' || tone === 'warning'
        ? AlertCircle
        : Info;

  return (
    <div role="status" className={`rounded-ds-md border px-3.5 py-2.5 flex items-start gap-2.5 text-ds-label ${styles}`}>
      <Icon className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
      <div className="min-w-0">
        {title && <div className="font-semibold">{title}</div>}
        <div className="text-zinc-700 leading-relaxed">{message}</div>
      </div>
    </div>
  );
}

export function formatGbp(amount: number, decimals = 0): string {
  return `£${amount.toLocaleString('en-GB', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}
