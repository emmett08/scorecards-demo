import type { Issue } from '@emmett08/scorecards-framework';

import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useMemo } from 'react';

const dtf = new Intl.DateTimeFormat(undefined, {
  year: 'numeric', month: 'short', day: '2-digit',
  hour: '2-digit', minute: '2-digit',
});

function fmt(ts?: string) {
  if (!ts) return '—';
  const d = new Date(ts);
  return Number.isNaN(+d) ? ts : dtf.format(d);
}

// Normalise arbitrary severity strings safely.
function normaliseSeverity(s?: string): 'critical' | 'high' | 'medium' | 'low' | 'unknown' {
  if (!s) return 'unknown';
  const v = s.toLowerCase();
  if (['critical', 'blocker', 'p1'].includes(v)) return 'critical';
  if (['high', 'severe', 'p2'].includes(v)) return 'high';
  if (['medium', 'moderate', 'p3'].includes(v)) return 'medium';
  if (['low', 'minor', 'p4'].includes(v)) return 'low';
  return 'unknown';
}

function severityChip(s?: string) {
  const sev = normaliseSeverity(s);
  switch (sev) {
    case 'critical': return <Chip size="small" color="error"   label="CRITICAL" icon={<ErrorOutlineIcon />} />;
    case 'high':     return <Chip size="small" color="error"   label="HIGH"     icon={<ErrorOutlineIcon />} />;
    case 'medium':   return <Chip size="small" color="warning" label="MEDIUM"   icon={<WarningAmberIcon />} />;
    case 'low':      return <Chip size="small" color="default" label="LOW"      icon={<InfoOutlinedIcon />} />;
    default:         return <Chip size="small" color="default" label="UNKNOWN"  icon={<InfoOutlinedIcon />} />;
  }
}

type Props = {
  issues: Issue[];
  /** Include closed issues; default false to focus on work. */
  showClosed?: boolean;
  maxHeight?: number;
};

export const IssueList: React.FC<Props> = ({ issues, showClosed = false, maxHeight = 360 }) => {
  const filtered = useMemo(() => {
    const list = showClosed ? issues : issues.filter(i => !i.closedAt);
    // Sort: open first, then severity (critical→low), then openedAt desc
    return [...list].sort((a, b) => {
      const ra = a.closedAt ? 1 : 0;
      const rb = b.closedAt ? 1 : 0;
      if (ra !== rb) return ra - rb;
      const rank = (s?: string) => {
        const n = normaliseSeverity(s);
        const severityOrder: Record<string, number> = {
          critical: 0,
          high: 1,
          medium: 2,
          low: 3,
        };
        const severityRank = (sr: string) => severityOrder[sr] ?? 4;
        return severityRank(n);
      };
      const r = rank(a.severity) - rank(b.severity);
      if (r !== 0) return r;
      return Date.parse(b.openedAt) - Date.parse(a.openedAt);
    });
  }, [issues, showClosed]);

  if (!filtered.length) {
    return (
      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardHeader title="Issues" />
        <CardContent>
          <Alert severity="success">No issues to show.</Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardHeader
        title={
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h6">Issues</Typography>
            <Chip label={filtered.length} size="small" />
          </Stack>
        }
        subheader={
          <Typography variant="body2" sx={{ opacity: 0.8 }}>
            {showClosed ? 'Open and closed' : 'Open only'}
          </Typography>
        }
      />
      <CardContent sx={{ pt: 0 }}>
        <TableContainer sx={{ maxHeight, borderRadius: 1, border: 1, borderColor: 'divider' }}>
          <Table stickyHeader size="small" aria-label="issues table">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Severity</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Key</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Title</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Check ID</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Opened</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Closed</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map(i => {
                const closed = !!i.closedAt;
                return (
                  <TableRow key={i.id} hover>
                    <TableCell>{severityChip(i.severity)}</TableCell>
                    <TableCell>
                      {closed
                        ? <Chip size="small" color="success" label="Closed" icon={<CheckCircleOutlineIcon />} />
                        : <Chip size="small" color="primary" label="Open" />}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Tooltip title={i.key}>
                          <Typography variant="body2" component="code" sx={{ fontFamily: 'monospace' }}>
                            {i.key}
                          </Typography>
                        </Tooltip>
                        <Tooltip title="Copy key">
                          <IconButton
                            size="small"
                            aria-label="Copy issue key"
                            onClick={() => navigator.clipboard.writeText(i.key)}
                          >
                            <ContentCopyIcon fontSize="inherit" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap title={i.title}>
                        {i.title}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={i.checkId}>
                        <Typography variant="body2" component="code" sx={{ fontFamily: 'monospace' }}>
                          {i.checkId}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={i.openedAt}>
                        <Typography variant="body2">{fmt(i.openedAt)}</Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={i.closedAt ?? '—'}>
                        <Typography variant="body2">{fmt(i.closedAt)}</Typography>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};
