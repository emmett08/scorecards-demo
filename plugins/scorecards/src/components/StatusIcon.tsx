import Tooltip from '@mui/material/Tooltip';

import CheckCircle from '@mui/icons-material/CheckCircle';
import Cancel from '@mui/icons-material/Cancel';
import WarningAmber from '@mui/icons-material/WarningAmber';
import History from '@mui/icons-material/History';
import HelpOutline from '@mui/icons-material/HelpOutline';

import type { ScoreStatus } from '../types/ui';

const map = {
  pass:    { Icon: CheckCircle,  colour: 'success.main',   label: 'Pass' },
  warn:    { Icon: WarningAmber, colour: 'warning.main',   label: 'Warning' },
  fail:    { Icon: Cancel,       colour: 'error.main',     label: 'Fail' },
  stale:   { Icon: History,      colour: 'text.secondary', label: 'Stale' },
  unknown: { Icon: HelpOutline,  colour: 'text.disabled',  label: 'Unknown' },
} as const;

export function StatusIcon({ status, updatedAt }: { status: ScoreStatus; updatedAt?: string }) {
  const { Icon, colour, label } = map[status];
  const tip = updatedAt ? `${label} • ${new Date(updatedAt).toLocaleString()}` : label;
  return (
    <Tooltip title={tip}>
      <Icon sx={{ color: colour, verticalAlign: 'middle' }} fontSize="small" aria-label={`Status ${label}`} />
    </Tooltip>
  );
}
