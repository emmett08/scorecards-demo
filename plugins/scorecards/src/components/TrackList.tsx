import * as React from 'react';
import type { TrackRecord } from '@emmett08/scorecards-framework';

import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
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
import EventBusyIcon from '@mui/icons-material/EventBusy';
import ScheduleIcon from '@mui/icons-material/Schedule';
import DoneAllIcon from '@mui/icons-material/DoneAll';

const dtf = new Intl.DateTimeFormat(undefined, {
  year: 'numeric', month: 'short', day: '2-digit',
  hour: '2-digit', minute: '2-digit',
});

function fmt(ts?: string) {
  if (!ts) return '—';
  const d = new Date(ts);
  return Number.isNaN(+d) ? ts : dtf.format(d);
}

const DUE_SOON_MS = 72 * 60 * 60 * 1000; // 72h

function statusForTrack(t: TrackRecord) {
  const now = Date.now();
  const closed = !!t.closedAt;
  const due = t.dueAt ? Date.parse(t.dueAt) : undefined;

  if (closed) {
    return { label: 'Closed', color: 'success' as const, icon: <DoneAllIcon /> };
  }
  if (typeof due === 'number') {
    if (due < now) return { label: 'Overdue', color: 'error' as const, icon: <EventBusyIcon /> };
    if (due - now <= DUE_SOON_MS) return { label: 'Due soon', color: 'warning' as const, icon: <ScheduleIcon /> };
  }
  return { label: 'Open', color: 'primary' as const, icon: <ScheduleIcon /> };
}

type Props = {
  tracks: TrackRecord[];
  /** Show closed tracks as well; default true for completeness. */
  showClosed?: boolean;
  /** Max table height before scrolling. */
  maxHeight?: number;
};

export const TrackList: React.FC<Props> = ({ tracks, showClosed = true, maxHeight = 360 }) => {
  const filtered = React.useMemo(() => {
    const list = showClosed ? tracks : tracks.filter(t => !t.closedAt);
    // Sort: open first, then overdue, then due soon, then by due date asc, then openedAt desc
    return [...list].sort((a, b) => {
      const sa = statusForTrack(a).label;
      const sb = statusForTrack(b).label;
      const statusOrder: Record<string, number> = {
        Overdue: 0,
        'Due soon': 1,
        Open: 2,
      };
      const rank = (s: string) => statusOrder[s] ?? 3;
      const r = rank(sa) - rank(sb);
      if (r !== 0) return r;
      const da = a.dueAt ? Date.parse(a.dueAt) : Number.POSITIVE_INFINITY;
      const db = b.dueAt ? Date.parse(b.dueAt) : Number.POSITIVE_INFINITY;
      if (da !== db) return da - db;
      return Date.parse(b.openedAt) - Date.parse(a.openedAt);
    });
  }, [tracks, showClosed]);

  if (!filtered.length) {
    return (
      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardHeader title="Tracks" />
        <CardContent>
          <Alert severity="info">No tracks to show.</Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardHeader
        title={
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h6">Tracks</Typography>
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
          <Table stickyHeader size="small" aria-label="tracks table">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Track</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Label</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Check ID</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Opened</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Due</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Closed</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map(t => {
                const st = statusForTrack(t);
                return (
                  <TableRow key={t.id} hover>
                    <TableCell>
                      <Chip size="small" color={st.color} label={st.label} icon={st.icon} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{t.name}</Typography>
                    </TableCell>
                    <TableCell>
                      {t.label ? (
                        <Chip size="small" label={t.label} />
                      ) : (
                        <Box component="span" sx={{ opacity: 0.6 }}>—</Box>
                      )}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Tooltip title={t.checkId}>
                          <Typography variant="body2" component="code" sx={{ fontFamily: 'monospace' }}>
                            {t.checkId}
                          </Typography>
                        </Tooltip>
                        <Tooltip title="Copy check ID">
                          <IconButton
                            size="small"
                            aria-label="Copy check ID"
                            onClick={() => navigator.clipboard.writeText(t.checkId)}
                          >
                            <ContentCopyIcon fontSize="inherit" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={t.openedAt}>
                        <Typography variant="body2">{fmt(t.openedAt)}</Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={t.dueAt ?? '—'}>
                        <Typography variant="body2">{fmt(t.dueAt)}</Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={t.closedAt ?? '—'}>
                        <Typography variant="body2">{fmt(t.closedAt)}</Typography>
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
