/**
 * §UI/UX Wave 2 — MERCENTA CHART SYSTEM.
 *
 * Charts are one of Mercenta's visual signatures: delicate, refined, almost
 * fragile. This module is the ONE canonical chart presentation (no competing
 * visual language anywhere in the tree):
 *  - LINE: ~1–1.5px stroke, extremely subtle gridlines, quiet axes, small
 *    refined labels, purposeful draw-in animation, hover guide + tooltip.
 *  - DOUGHNUT: thin elegant ring, restrained palette, sophisticated centre
 *    metric, arcs that sweep in on mount.
 *  - SPARKLINE: axis-free micro trend for metric tiles and queue rows.
 *  - BARS: proportional bars that grow in, with an accessible summary.
 * All charts carry an accessible description (`role="img"` + aria-label),
 * never rely on colour alone, and are plain SVG (no chart-library chrome).
 * Everything is reduced-motion safe (src/index.css collapses the animations).
 */
import { useId, useMemo, useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { THEMES } from '@/config/themes';
import { cn } from '@/utils/cn';


/* ── helpers ─────────────────────────────────────────────────────────── */

function niceTicks(max: number, count = 4): number[] {
  const step = max / count;
  return Array.from({ length: count + 1 }, (_, i) => Math.round(i * step));
}

function px(v: number): string {
  return `${Math.round(v * 100) / 100}px`;
}

/* ── LINE CHART ──────────────────────────────────────────────────────── */

export interface LinePoint {
  label: string;
  value: number;
}

export interface MercentaLineChartProps {
  /** Sequential series (single or multiple, palette-ordered). */
  series: { name: string; points: LinePoint[] }[];
  height?: number;
  yFormat?: (v: number) => string;
  xFormat?: (v: string) => string;
  /** Accessible summary (text alternative to the visual). */
  ariaLabel?: string;
}

export function MercentaLineChart({
  series,
  height = 180,
  yFormat = (v) => `${v}`,
  xFormat = (v) => v,
  ariaLabel,
}: MercentaLineChartProps) {
  const { theme } = useTheme();
  const meta = THEMES[theme].chart;
  const gradId = useId().replace(/[:]/g, '');
  /**
   * §UI/UX Wave 2 — interaction state. `hover` holds the point index the
   * pointer/keyboard is on; the guide line + tooltip are then drawn in SVG so
   * the chart needs no layout-dependent overlay.
   */
  const [hover, setHover] = useState<number | null>(null);
  const W = 640;
  const H = height;
  const PAD = { top: 14, right: 18, bottom: 26, left: 34 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const all = series.flatMap((s) => s.points);
  const maxV = Math.max(1, ...all.map((p) => p.value));
  const ticks = niceTicks(maxV, 4);
  const gridMax = ticks[ticks.length - 1];

  const labels = series.length > 0 ? series[0].points.map((p) => p.label) : [];
  const toX = (i: number) =>
    labels.length <= 1
      ? PAD.left + plotW / 2
      : PAD.left + (plotW * i) / (labels.length - 1);
  const toY = (v: number) => PAD.top + plotH * (1 - v / gridMax);

  const summary =
    ariaLabel ||
    series
      .map((s) => `${s.name}: ${s.points.map((p) => `${p.label}=${p.value}`).join(', ')}`)
      .join('; ');

  return (
    <svg
      role="img"
      aria-label={summary}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      className="w-full h-auto"
      data-chart="line"
      data-chart-series={series.length}
      data-chart-lines={`${meta.strokeWidth}px`}
    >
      <title>{summary}</title>
      {/* §UI/UX Wave 2 — faint gradient under the primary series: subtle depth
          without turning a delicate line chart into a heavy filled area. */}
      <defs>
        {series.map((s, si) => {
          const c = meta.palette[si % meta.palette.length];
          return (
            <linearGradient key={s.name} id={`${gradId}-${si}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={c} stopOpacity={si === 0 ? 0.16 : 0.07} />
              <stop offset="100%" stopColor={c} stopOpacity="0" />
            </linearGradient>
          );
        })}
      </defs>
      {ticks.map((t) => {
        const y = toY(Math.max(gridMax, 1) * (1 - t / gridMax));
        return (
          <g key={`g-${t}`} aria-hidden="true">
            <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke={meta.grid} strokeWidth="1" />
            <text x={PAD.left - 8} y={y + 4} textAnchor="end" fontSize="9" fill={meta.axis}>
              {yFormat(t)}
            </text>
          </g>
        );
      })}
      {labels.map((l, i) => (
        <text
          key={`x-${l}`}
          x={toX(i)}
          y={H - 8}
          textAnchor="middle"
          fontSize="9"
          fill={meta.axis}
        >
          {xFormat(l)}
        </text>
      ))}

      {/* §UI/UX Wave 2 — hover/focus guide: one vertical line + one tooltip. */}
      {hover !== null && (
        <g aria-hidden="true" data-chart-guide="true">
          <line
            x1={toX(hover)}
            x2={toX(hover)}
            y1={PAD.top}
            y2={PAD.top + plotH}
            stroke={meta.axis}
            strokeWidth="1"
            strokeDasharray="2 3"
          />
        </g>
      )}

      {series.map((s, si) => {
        const color = meta.palette[si % meta.palette.length];
        const pts = s.points.map((p, i) => ({ x: toX(i), y: toY(p.value), p }));
        const areaPath =
          pts.length > 1
            ? `M ${px(pts[0].x)} ${px(PAD.top + plotH)} ` +
              pts.map((pt) => `L ${px(pt.x)} ${px(pt.y)}`).join(' ') +
              ` L ${px(pts[pts.length - 1].x)} ${px(PAD.top + plotH)} Z`
            : '';
        return (
          <g key={s.name} data-series={s.name}>
            {/* Area fill is decorative depth only — the line carries the data. */}
            {si === 0 && areaPath && (
              <path d={areaPath} fill={`url(#${gradId}-${si})`} aria-hidden="true" />
            )}
            {/* Draw-in progression: pathLength normalises the dash maths so the
                line renders itself from left to right on mount. */}
            <polyline
              points={pts.map((pt) => `${px(pt.x)},${px(pt.y)}`).join(' ')}
              fill="none"
              stroke={color}
              strokeWidth={meta.strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              data-chart-stroke={color}
              pathLength={1000}
              strokeDasharray={1000}
              className="animate-chart-draw"
              style={{ ['--mr-draw-length' as string]: '1000' }}
            />
            {pts.map((pt, i) => (
              <g key={i}>
                {/* Visible marker only where the user is looking. */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={hover === i ? 3 : 0}
                  fill={color}
                  stroke="none"
                  aria-hidden="true"
                >
                  <title>{`${s.name} · ${pt.p.label}: ${yFormat(pt.p.value)}`}</title>
                </circle>
                {/* Generous invisible hit target + keyboard focus. */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="12"
                  fill="transparent"
                  tabIndex={0}
                  role="button"
                  aria-label={`${s.name} ${pt.p.label} ${yFormat(pt.p.value)}`}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover((h) => (h === i ? null : h))}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover((h) => (h === i ? null : h))}
                />
              </g>
            ))}
          </g>
        );
      })}

      {/* §UI/UX Wave 2 — tooltip drawn last so it sits above every series. */}
      {hover !== null && (
        <g aria-hidden="true" data-chart-tooltip="true">
          <rect
            x={Math.min(Math.max(toX(hover) - 52, PAD.left), W - PAD.right - 104)}
            y={PAD.top}
            width="104"
            height={14 + series.length * 12}
            rx="4"
            fill="var(--mr-surface-overlay)"
            stroke={meta.grid}
            strokeWidth="1"
          />
          {series.map((s, si) => (
            <text
              key={s.name}
              x={Math.min(Math.max(toX(hover) - 46, PAD.left + 6), W - PAD.right - 98)}
              y={PAD.top + 15 + si * 12}
              fontSize="9"
              fill={meta.palette[si % meta.palette.length]}
            >
              {`${s.name.slice(0, 12)} ${yFormat(s.points[hover]?.value ?? 0)}`}
            </text>
          ))}
        </g>
      )}
    </svg>
  );
}
/* ── DOUGHNUT ────────────────────────────────────────────────────────── */

export interface DoughnutSegment {
  label: string;
  value: number;
  color?: string;
}

export interface MercentaDoughnutProps {
  segments: DoughnutSegment[];
  centerLabel?: string;
  centerValue?: string;
  /** Accessible summary. */
  ariaLabel?: string
  /** Optional legend rendered beneath the ring (label + share). */
  legend?: boolean;
}

export function MercentaDoughnut({
  segments,
  centerLabel,
  centerValue,
  ariaLabel,
  legend = false,
}: MercentaDoughnutProps) {
  const { theme } = useTheme();
  const meta = THEMES[theme].chart;
  /** §UI/UX Wave 2 — the segment under the pointer/keyboard focus. */
  const [active, setActive] = useState<string | null>(null);
  const size = 168;
  const stroke = meta.ring;
  const r = (size - stroke) / 2 - 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const total = Math.max(1, segments.reduce((a, s) => a + s.value, 0));

  const arcs = useMemo(() => {
    let acc = -Math.PI / 2;
    return segments.map((s) => {
      const sweep = (s.value / total) * 2 * Math.PI;
      const start = acc;
      acc += sweep;
      return { s, sweep, start };
    });
  }, [segments, total]);

  const label =
    ariaLabel || `Doughnut: ${segments.map((s) => `${s.label} ${s.value}`).join(', ')}`;

  return (
    <div data-chart-doughnut-wrap="true">
      <svg
        role="img"
        aria-label={label}
        viewBox={`0 0 ${size} ${size}`}
        className="w-full h-auto"
        data-chart="doughnut"
        data-chart-ring={`${stroke}px`}
      >
        <title>{label}</title>
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={meta.grid}
          strokeWidth={stroke}
          aria-hidden="true"
        />
        {arcs.map(({ s, sweep, start }, i) => {
          const color = s.color ?? meta.palette[i % meta.palette.length];
          const length = Math.max(0, sweep * r);
          return (
            <circle
              key={s.label}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={color}
              /* Hover/focus gently thickens the arc — the only motion a ring needs. */
              strokeWidth={active === s.label ? stroke + 3 : stroke}
              strokeLinecap="butt"
              strokeDasharray={`${length} ${circumference}`}
              strokeDashoffset={`${-start * r}`}
              className="animate-chart-arc"
              style={{
                ['--mr-arc-from' as string]: `${-start * r}`,
                ['--mr-arc-to' as string]: `${-start * r}`,
                transition: 'stroke-width var(--mr-motion-fast) var(--mr-ease-standard)',
              }}
              tabIndex={0}
              onMouseEnter={() => setActive(s.label)}
              onMouseLeave={() => setActive((a) => (a === s.label ? null : a))}
              onFocus={() => setActive(s.label)}
              onBlur={() => setActive((a) => (a === s.label ? null : a))}
            >
              <title>{`${s.label}: ${s.value}`}</title>
            </circle>
          );
        })}
        {centerValue && (
          <text
            x={cx}
            y={cy - 2}
            textAnchor="middle"
            fontSize="15"
            fontWeight="600"
            fill="currentColor"
          >
            {centerValue}
          </text>
        )}
        {centerLabel && (
          <text x={cx} y={cy + 15} textAnchor="middle" fontSize="9" fill={meta.axis}>
            {centerLabel}
          </text>
        )}
      </svg>
      {legend && (
        <ul className="mt-2 space-y-1" data-chart-legend="true">
          {arcs.map(({ s }, i) => {
            const color = s.color ?? meta.palette[i % meta.palette.length];
            return (
              <li key={s.label} className="flex items-center gap-2 text-[11px]">
                <span
                  aria-hidden="true"
                  className="h-2 w-2 flex-shrink-0 rounded-sm"
                  style={{ backgroundColor: color }}
                />
                <span className="min-w-0 flex-1 truncate text-zinc-300">{s.label}</span>
                <span className="font-mono text-zinc-400">
                  {Math.round((s.value / total) * 100)}%
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ── SPARKLINE ───────────────────────────────────────────────────────── */

export interface MercentaSparklineProps {
  points: number[];
  /** Accessible summary — required: a sparkline is never self-describing. */
  ariaLabel: string;
  height?: number;
  /** Palette index for this series (defaults to the first palette colour). */
  paletteIndex?: number;
  className?: string;
}

/**
 * Axis-free micro trend for metric tiles and queue rows. Same 1.5px stroke
 * language as the full chart, so the micro visual is the same visual system
 * rather than a second one.
 */
export function MercentaSparkline({
  points,
  ariaLabel,
  height = 28,
  paletteIndex = 0,
  className,
}: MercentaSparklineProps) {
  const { theme } = useTheme();
  const meta = THEMES[theme].chart;
  const color = meta.palette[paletteIndex % meta.palette.length];
  const W = 100;
  const max = Math.max(1, ...points);
  const min = Math.min(...points);
  const span = Math.max(1, max - min);
  const step = points.length > 1 ? W / (points.length - 1) : W;
  const coords = points.map((v, i) => ({
    x: i * step,
    y: height - 2 - ((v - min) / span) * (height - 4),
  }));

  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      viewBox={`0 0 ${W} ${height}`}
      preserveAspectRatio="none"
      className={cn('w-full', className)}
      data-chart="sparkline"
      data-chart-stroke={color}
    >
      <title>{ariaLabel}</title>
      <polyline
        points={coords.map((c) => `${px(c.x)},${px(c.y)}`).join(' ')}
        fill="none"
        stroke={color}
        strokeWidth={meta.strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1000}
        strokeDasharray={1000}
        className="animate-chart-draw"
        style={{ ['--mr-draw-length' as string]: '1000' }}
      />
    </svg>
  );
}

/* ── BARS ────────────────────────────────────────────────────────────── */

export interface MercentaBar {
  label: string;
  value: number;
  color?: string;
}

/**
 * Proportional bars that grow in on mount. Bar *length* is the data; colour is
 * decorative series identity only, so the bars stay readable in every theme.
 */
export function MercentaBars({
  bars,
  height = 140,
  valueFormat = (v) => `${v}`,
  ariaLabel,
  paletteIndex = 0,
}: {
  bars: MercentaBar[];
  height?: number;
  valueFormat?: (v: number) => string;
  ariaLabel: string;
  paletteIndex?: number;
}) {
  const { theme } = useTheme();
  const meta = THEMES[theme].chart;
  const W = 520;
  const H = height;
  const PAD = { top: 10, right: 8, bottom: 20, left: 8 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const max = Math.max(1, ...bars.map((b) => b.value));
  const slot = bars.length > 0 ? plotW / bars.length : plotW;
  const barW = Math.max(6, Math.min(38, slot * 0.55));

  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      className="w-full h-auto"
      data-chart="bars"
      data-chart-bars={bars.length}
    >
      <title>{ariaLabel}</title>
      {bars.map((b, i) => {
        const color = b.color ?? meta.palette[(paletteIndex + i) % meta.palette.length];
        const h = Math.max(2, (b.value / max) * plotH);
        const x = PAD.left + i * slot + (slot - barW) / 2;
        const y = PAD.top + (plotH - h);
        return (
          <g key={b.label} data-bar={b.label}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={h}
              rx="2"
              fill={color}
              className="animate-rise"
            >
              <title>{`${b.label}: ${valueFormat(b.value)}`}</title>
            </rect>
            <text
              x={x + barW / 2}
              y={H - 6}
              textAnchor="middle"
              fontSize="9"
              fill={meta.axis}
            >
              {b.label.length > 8 ? `${b.label.slice(0, 7)}…` : b.label}
            </text>
            <text
              x={x + barW / 2}
              y={y - 3}
              textAnchor="middle"
              fontSize="9"
              fill={meta.axis}
            >
              {valueFormat(b.value)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}


