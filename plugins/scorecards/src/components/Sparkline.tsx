import { FC, useMemo } from 'react';
import type { ScoreStatus } from '../types/ui';

export interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;

  /** Fixed Y scale recommended: yMin={0} yMax={5} for your 0..5 range */
  yMin?: number;
  yMax?: number;

  /** Optional horizontal reference line (in data units) */
  threshold?: number;

  /** Area fill baseline, in data units or keyword */
  areaBase?: 'min' | 'zero' | 'threshold' | number;

  /** Colour mode */
  colorMode?: 'status' | 'trend' | 'fixed';
  status?: ScoreStatus;       // used when colorMode === 'status'
  color?: string;             // used when colorMode === 'fixed'
  trendDeadband?: number;     // used when colorMode === 'trend' (default 0.05)

  /** A11y & style */
  ariaLabel?: string;
  strokeWidth?: number;
  showArea?: boolean;
  debug?: boolean;
}

const STATUS_COLOUR_VAR: Record<ScoreStatus, string> = {
  pass:    'var(--score-pass, #047857)',
  warn:    'var(--score-warn, #b45309)',
  fail:    'var(--score-fail, #b91c1c)',
  stale:   'var(--score-stale, #6b7280)',
  unknown: 'var(--score-unknown, #6b7280)',
};

export const Sparkline: FC<SparklineProps> = ({
  data,
  width = 120,
  height = 28,
  yMin,
  yMax,
  threshold,
  areaBase = 'zero',
  colorMode = 'status',
  status,
  color,
  trendDeadband = 0.05,
  ariaLabel,
  strokeWidth = 1.5,
  showArea = true,
  debug = false,
}) => {
  const values = (Array.isArray(data) ? data : []).filter(
    n => typeof n === 'number' && Number.isFinite(n),
  );

  const {
    linePath, areaPath, endX, endY, thrY, title,
    colourResolved,
  } = useMemo(() => {
    const count = values.length;
    const w = Math.max(1, width);
    const h = Math.max(1, height);

    // Scale
    const vMin = typeof yMin === 'number' ? yMin : Math.min(...values);
    const vMax = typeof yMax === 'number' ? yMax : Math.max(...values);
    const vRange = vMax - vMin || 1;

    const xFor = (i: number) => (count <= 1 ? 0 : (i / (count - 1)) * (w - 2)) + 1;
    const yFor = (v: number) => {
      const norm = (v - vMin) / vRange;
      const y = h - 1 - norm * (h - 2);
      return Math.max(1, Math.min(h - 1, y));
    };

    // Early exit
    if (count < 2) {
      const t = ariaLabel ?? 'No trend';
      return {
        linePath: '',
        areaPath: '',
        endX: 0,
        endY: 0,
        thrY: undefined as number | undefined,
        title: t,
        colourResolved: 'var(--chart-threshold, currentColor)',
      };
    }

    const xs = Array.from({ length: count }, (_, i) => xFor(i));
    const ys = values.map(v => yFor(v));

    // Polyline (no smoothing)
    let lp = `M ${xs[0]} ${ys[0]}`;
    for (let i = 1; i < count; i++) {
      lp += ` L ${xs[i]} ${ys[i]}`;
    }

    // Area baseline
    let baseValue: number;
    if (typeof areaBase === 'number') baseValue = areaBase;
    else if (areaBase === 'threshold' && typeof threshold === 'number') baseValue = threshold;
    else if (areaBase === 'zero') baseValue = 0;
    else baseValue = vMin; // 'min'
    const baseY = yFor(baseValue);

    const ap = showArea
      ? `${lp} L ${xs[count - 1]} ${baseY} L ${xs[0]} ${baseY} Z`
      : '';

    const ty = typeof threshold === 'number' ? yFor(threshold) : undefined;
    const t = ariaLabel ?? `Trend: ${values[0].toFixed(2)} → ${values[count - 1].toFixed(2)}`;

    // Colour
    let resolved = 'var(--spark-line, currentColor)';
    if (colorMode === 'fixed' && color) {
      resolved = color;
    } else if (colorMode === 'status' && status) {
      resolved = STATUS_COLOUR_VAR[status];
    } else if (colorMode === 'trend') {
      const delta = values[count - 1] - values[0];
      if (delta > trendDeadband) resolved = STATUS_COLOUR_VAR.pass;
      else if (delta < -trendDeadband) resolved = STATUS_COLOUR_VAR.fail;
      else resolved = STATUS_COLOUR_VAR.stale;
    }

    if (debug) {
      // eslint-disable-next-line no-console
      console.log('[Sparkline]', { vMin, vMax, baseValue, lp });
    }

    return {
      linePath: lp,
      areaPath: ap,
      endX: xs[count - 1],
      endY: ys[count - 1],
      thrY: ty,
      title: t,
      colourResolved: resolved,
    };
  }, [values, width, height, yMin, yMax, threshold, areaBase, colorMode, status, color, trendDeadband, ariaLabel, showArea, debug]);

  // Render
  if (values.length < 2) {
    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={ariaLabel ?? 'No trend'}>
        <title>{ariaLabel ?? 'No trend'}</title>
        <line x1={1} x2={width - 1} y1={height / 2} y2={height / 2}
          stroke="var(--chart-threshold, currentColor)" strokeDasharray="3 3" />
      </svg>
    );
  }

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title} style={{ display: 'block' }}>
      <title>{title}</title>

      {typeof thrY === 'number' && (
        <line x1={1} y1={thrY} x2={width - 1} y2={thrY}
          stroke="var(--chart-threshold, currentColor)" strokeDasharray="3 3" />
      )}

      {areaPath && (
        <path d={areaPath} fill={colourResolved} fillOpacity={0.15} stroke="none" />
      )}

      <path
        d={linePath}
        fill="none"
        stroke={colourResolved}
        strokeWidth={strokeWidth}
        vectorEffect="non-scaling-stroke"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={endX} cy={endY} r={2} fill={colourResolved} />
    </svg>
  );
};
