import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import { Band, ScoreStatus } from '../types/ui';

export interface ScoreBadgeProps {
  value?: number;
  band?: Band;
  status?: ScoreStatus;
  label?: string;           // aria-label override
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  updatedAt?: string;       // ISO
}

import CheckCircle from '@mui/icons-material/CheckCircle';
import Cancel from '@mui/icons-material/Cancel';
import WarningAmber from '@mui/icons-material/WarningAmber';
import History from '@mui/icons-material/History';
import HelpOutline from '@mui/icons-material/HelpOutline';

export const statusIconMap: Record<ScoreStatus, { Icon: typeof CheckCircle; color: string }> = {
  pass:   { Icon: CheckCircle,  color: 'success.main' },
  fail:   { Icon: Cancel,       color: 'error.main' },
  warn:   { Icon: WarningAmber, color: 'warning.main' },
  stale:  { Icon: History,      color: 'text.secondary' },
  unknown:{ Icon: HelpOutline,  color: 'text.disabled' },
};
function isFiniteNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

function bandFromValue(v?: number | null): Band | undefined {
  if (!isFiniteNumber(v)) return undefined;
  if (v >= 4.5) return 'A';
  if (v >= 3.5) return 'B';
  if (v >= 2.5) return 'C';
  if (v >= 1.5) return 'D';
  return 'E';
}

function statusFrom(value?: number, band?: Band): ScoreStatus {
  const b = band ?? bandFromValue(value);
  if (!b) return 'unknown';
  if (b === 'A' || b === 'B') return 'pass';
  if (b === 'C') return 'warn';
  return 'fail';
}

const sizeMap = {
  sm: { padY: 0.25, padX: 0.75, font: 12, radius: 999, chipSize: 'small' as const },
  md: { padY: 0.5,  padX: 1.0,  font: 13, radius: 999, chipSize: 'medium' as const },
  lg: { padY: 0.75, padX: 1.25, font: 14, radius: 999, chipSize: 'medium' as const },
} as const;

const colourMap: Record<ScoreStatus, string> = {
  pass: 'var(--score-pass)',
  warn: 'var(--score-warn)',
  fail: 'var(--score-fail)',
  stale: 'var(--score-stale)',
  unknown: 'var(--score-unknown)',
};

export const ScoreBadge: React.FC<ScoreBadgeProps> = ({
  value,
  band,
  status,
  label,
  size = 'md',
  showValue = false,
  updatedAt,
}) => {
  const b = band ?? bandFromValue(value ?? null);
  const s: ScoreStatus = status ?? statusFrom(value, b);
  const sz = sizeMap[size];
  const colourVar = colourMap[s];

  const aria =
    label ??
    [
      b && `Band ${b}`,
      isFiniteNumber(value) && `Score ${value.toFixed(1)} out of 5`,
      `Status ${s}`,
      updatedAt && `Updated ${new Date(updatedAt).toLocaleString()}`,
    ]
      .filter(Boolean)
      .join(', ');

  const chipLabel = b ?? '—';

  const chip = (
    <Chip
      label={chipLabel}
      size={sz.chipSize}
      role="status"
      aria-label={aria}
      sx={{
        borderRadius: `${sz.radius}px`,
        fontWeight: 600,
        fontSize: `${sz.font}px`,
        px: sz.padX,
        py: sz.padY,
        border: `1px solid ${colourVar}`,
        color: colourVar,
        backgroundColor: 'transparent',
        lineHeight: 1,
        '& .MuiChip-label': { px: 0, py: 0 },
      }}
      variant="outlined"
    />
  );

  return (
    <Box
      component="span"
      sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}
      data-status={s}
    >
      {updatedAt ? (
        <Tooltip title={aria}>
          <Box component="span">{chip}</Box>
        </Tooltip>
      ) : (
        chip
      )}
      {showValue && isFiniteNumber(value) ? (
        <Box component="span" aria-hidden="true">· {value.toFixed(1)}</Box>
      ) : null}
    </Box>
  );
};
