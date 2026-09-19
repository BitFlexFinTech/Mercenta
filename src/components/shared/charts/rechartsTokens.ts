/**
 * §UI/UX Wave 2 — canonical presentation tokens for the legacy recharts
 * surfaces (BrandReports, SalesAnalytics, FulfillmentTrack).
 *
 * Those three components render with the recharts library rather than the
 * canonical SVG primitives in ./MercentaCharts. Rather than allow a second,
 * competing chart visual language, they consume these tokens so their grid,
 * axis, stroke width and series palette match the canonical Mercenta chart
 * system exactly. NEW charts must use ./MercentaCharts, never recharts.
 */
import { useMemo } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { THEMES } from '@/config/themes';

export function useRechartsTokens() {
  const { theme } = useTheme();
  return useMemo(() => {
    const meta = THEMES[theme].chart;
    return {
      palette: meta.palette,
      grid: meta.grid,
      axis: meta.axis,
      strokeWidth: meta.strokeWidth,
      /** recharts props — the canonical delicate grid. */
      gridProps: {
        strokeDasharray: '3 3',
        stroke: meta.grid,
        vertical: false,
      },
      /** recharts props — quiet axis (no tick lines, no axis line). */
      axisProps: {
        stroke: meta.axis,
        fontSize: 11,
        tickLine: false,
        axisLine: false,
      },
    };
  }, [theme]);
}
