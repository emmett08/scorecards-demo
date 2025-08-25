import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BusEvent } from '@emmett08/scorecards-framework';
import { useApi } from '@backstage/frontend-plugin-api';
import { scorecardsApiRef } from '../api';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CloseIcon from '@mui/icons-material/Close';


import DownloadIcon from '@mui/icons-material/Download';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import FilterAltOutlinedIcon from '@mui/icons-material/FilterAltOutlined';
import CircleIcon from '@mui/icons-material/Circle';

const dtf = new Intl.DateTimeFormat(undefined, {
  year: 'numeric', month: 'short', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
});

function fmt(ts: string) { try { return dtf.format(new Date(ts)); } catch { return ts; } }

const mono = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
const previewValue = (v: unknown): string => {
  if (v === null || v === undefined) return String(v);

  if (typeof v === 'string') {
    return v.length > 40 ? `${v.slice(0, 37)}…` : v;
  }

  if (typeof v === 'number' || typeof v === 'boolean') {
    return String(v);
  }

  if (Array.isArray(v)) return `Array(${v.length})`;

  if (typeof v === 'object') return 'Object';

  return String(v);
};


const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);

type Props = { entityRef: string };

const PayloadSummary: React.FC<{
  payload: unknown;
  maxItems?: number;
  onCopy?: (val: unknown) => void;
}> = ({ payload, maxItems = 4, onCopy }) => {
  if (!isPlainObject(payload)) {
    return <Box component="span" sx={{ opacity: 0.6 }}>—</Box>;
  }
  const entries = Object.entries(payload).slice(0, maxItems);

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 0.5,
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        // allow horizontal scroll if many chips but keep row height stable
        overflowX: 'auto',
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' },
      }}
    >
      {entries.map(([k, v]) => (
        <Tooltip
          key={k}
          arrow
          title={
            <Box component="pre" sx={{ m: 0, fontFamily: mono, fontSize: 12 }}>
              {JSON.stringify(v, null, 2)}
            </Box>
          }
        >
          <Chip
            size="small"
            variant="outlined"
            label={`${k}=${previewValue(v)}`}
            onClick={onCopy ? () => onCopy(v) : undefined}
            sx={{
              maxWidth: 240,
              '.MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' },
            }}
          />
        </Tooltip>
      ))}
    </Box>
  );
};

const DefinitionList: React.FC<{ data: Record<string, unknown> }> = ({ data }) => (
  <Stack spacing={0.75} sx={{ mt: 1 }}>
    {Object.entries(data).map(([k, v]) => (
      <Stack key={k} direction="row" spacing={1.5} alignItems="flex-start">
        <Box sx={{ minWidth: 180, color: 'text.secondary', fontFamily: mono, fontSize: 12 }}>
          {k}
        </Box>
        <Box
          sx={{
            flex: 1,
            fontFamily: mono,
            fontSize: 12,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {isPlainObject(v) || Array.isArray(v) ? JSON.stringify(v, null, 2) : String(v)}
        </Box>
      </Stack>
    ))}
  </Stack>
);

const EventRow: React.FC<{
  e: BusEvent;
  rowKey: string;
  isOpen: boolean;
  onToggle: (key: string) => void;
  copyPayload: (payload: unknown) => Promise<void> | void;
}> = ({ e, rowKey, isOpen, onToggle, copyPayload }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tab, setTab] = useState<'summary' | 'raw'>('summary');
  const detailsId = `${rowKey}-details`;

  return (
    <Fragment>
      <TableRow hover tabIndex={0}>
        <TableCell padding="checkbox">
          <IconButton
            size="small"
            aria-label={isOpen ? 'Collapse' : 'Expand'}
            aria-expanded={isOpen}
            aria-controls={detailsId}
            onClick={() => onToggle(rowKey)}
          >
            {isOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </TableCell>

        <TableCell>
          <Typography variant="body2">{fmt(e.timestamp)}</Typography>
        </TableCell>

        <TableCell>
          <Chip size="small" label={e.type} />
        </TableCell>

        <TableCell>
          <PayloadSummary payload={e.payload} onCopy={copyPayload} />
        </TableCell>

        <TableCell align="right">
          <Tooltip title="Copy payload">
            <IconButton size="small" onClick={() => copyPayload(e.payload)}>
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Open full view">
            <IconButton size="small" onClick={() => setDialogOpen(true)}>
              <OpenInNewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </TableCell>
      </TableRow>

      {/* Details row */}
      <TableRow>
        <TableCell colSpan={5} sx={{ p: 0, borderBottom: 0 }}>
          <Collapse in={isOpen} timeout="auto" unmountOnExit>
            <Box
              id={detailsId}
              sx={{ backgroundColor: 'action.hover', borderTop: 1, borderColor: 'divider' }}
            >
              <Box sx={{ p: 1.5 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                  <Typography variant="caption" sx={{ opacity: 0.7 }}>
                    Payload
                  </Typography>
                  <Box sx={{ flex: 1 }} />
                  <Tooltip title="Copy JSON">
                    <IconButton size="small" onClick={() => copyPayload(e.payload)}>
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Open full view">
                    <IconButton size="small" onClick={() => setDialogOpen(true)}>
                      <OpenInNewIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>

                <Tabs
                  value={tab}
                  onChange={(_, v) => setTab(v)}
                  variant="scrollable"
                  allowScrollButtonsMobile
                >
                  <Tab value="summary" label="Summary" />
                  <Tab value="raw" label="Raw JSON" />
                </Tabs>

                {tab === 'summary' && isPlainObject(e.payload) && (
                  <DefinitionList data={e.payload as Record<string, unknown>} />
                )}

                {tab === 'raw' && (
                  <Box
                    component="pre"
                    sx={{
                      m: 0,
                      mt: 1,
                      p: 1,
                      overflow: 'auto',
                      maxHeight: 320,
                      bgcolor: 'background.paper',
                      borderRadius: 1,
                      fontFamily: mono,
                      fontSize: 12,
                      lineHeight: 1.5,
                    }}
                  >
                    {JSON.stringify(e.payload, null, 2)}
                  </Box>
                )}
              </Box>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>

      {/* Full-screen dialog for very large payloads */}
      <Dialog
        fullWidth
        maxWidth="md"
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        scroll="paper"
      >
        <DialogTitle sx={{ pr: 6 }}>
          Event payload
          <IconButton
            aria-label="close"
            onClick={() => setDialogOpen(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Box
            component="pre"
            sx={{
              m: 0,
              p: 1,
              overflow: 'auto',
              maxHeight: '70vh',
              bgcolor: 'background.paper',
              borderRadius: 1,
              fontFamily: mono,
              fontSize: 13,
              lineHeight: 1.55,
            }}
          >
            {JSON.stringify(e.payload, null, 2)}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => copyPayload(e.payload)} startIcon={<ContentCopyIcon />}>
            Copy JSON
          </Button>
          <Button onClick={() => setDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Fragment>
  );
};

export const EventStreamPanel: React.FC<Props> = ({ entityRef }) => {
  const api = useApi(scorecardsApiRef);

  // data/state
  const [events, setEvents] = useState<BusEvent[]>([]);
  const [since, setSince] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [live, setLive] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);

  // UI state
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState(''); // exact match filter; empty = all
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState<boolean>(false);

  const lastEventRef = useRef<BusEvent | null>(null);
  const [failedAfter, setFailedAfter] = useState<BusEvent | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const seenIds = useRef<Set<string>>(new Set());
  const unsubRef = useRef<(() => void) | null>(null);

  // auto-scroll to newest
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [events]);

  const sinceRef = useRef<string | undefined>(undefined);
  const addEvents = useCallback((list: BusEvent[]) => {
    if (!list?.length) return;
    setEvents(prev => {
      const next = [...prev];
      for (const e of list) {
        const key = String(e.id ?? `${e.timestamp}:${e.type}`);
        if (seenIds.current.has(key)) continue;
        seenIds.current.add(key);
        next.push(e);
        lastEventRef.current = e;
      }
      return next.slice(-500);
    });
    const lastTs = list[list.length - 1]?.timestamp;
    if (lastTs) {
      sinceRef.current = lastTs;
      setSince(lastTs);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let failures = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    setLoading(true);
    setError(undefined);

    if (unsubRef.current) {
      try {
        unsubRef.current();
      } catch {
        // ignore
      }
      unsubRef.current = null;
    }

    const connect = async () => {
      try {
        const initialSince = sinceRef.current;
        const unsub = await api.subscribeEvents({
          entityRef,
          since: initialSince,
          onEvent: e => {
            if (!cancelled) addEvents([e]);
          },
          onError: err => {
            if (cancelled) return;
            setError(err.message);
            setFailedAfter(lastEventRef.current);
            failures += 1;

            try {
              unsubRef.current?.();
            } catch {
              // ignore
            }
            unsubRef.current = null;

            const delay = Math.min(1000 * Math.pow(2, failures), 10000);
            if (reconnectTimer) {
              clearTimeout(reconnectTimer);
            }
            reconnectTimer = setTimeout(() => {
              if (!cancelled && live) {
                void connect();
              }
            }, delay);
          },
        });

        unsubRef.current = unsub;
        failures = 0;
        setLoading(false);
      } catch {
        const tick = async () => {
          try {
            const list = await api.listEvents(entityRef, sinceRef.current);
            if (!cancelled) {
              addEvents(list);
              setError(undefined);
              setFailedAfter(null);
            }
          } catch (e: any) {
            if (!cancelled) {
              setError(String(e?.message ?? e));
              setFailedAfter(lastEventRef.current);
            }
          } finally {
            setLoading(false);
          }
        };

        await tick();
        const timer = setInterval(tick, 3000);
        unsubRef.current = () => clearInterval(timer);
      }
    };

    if (live) {
      void connect();
    } else {
      setLoading(false);
    }

    return () => {
      cancelled = true;

      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }

      if (unsubRef.current) {
        try {
          unsubRef.current();
        } catch {
          // ignore
        }
        unsubRef.current = null;
      }
    };
  }, [api, entityRef, live, addEvents]);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const list = await api.listEvents(entityRef, since);
      addEvents(list);
      setError(undefined);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setEvents([]);
    seenIds.current.clear();
    setSince(undefined);
    setFailedAfter(null);
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(events, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `events-${encodeURIComponent(entityRef)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter(e => {
      if (typeFilter && e.type !== typeFilter) return false;
      if (!q) return true;
      return (
        e.type.toLowerCase().includes(q) ||
        fmt(e.timestamp).toLowerCase().includes(q) ||
        JSON.stringify(e.payload).toLowerCase().includes(q)
      );
    });
  }, [events, query, typeFilter]);

  const eventTypes = useMemo(() => {
    const s = new Set<string>();
    events.forEach(e => s.add(e.type));
    return Array.from(s).sort();
  }, [events]);

  const toggleExpand = (key: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const copyPayload = async (payload: unknown) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setCopied(true);
    } catch {
      /* ignore */
    }
  };

  const LiveBadge = (
    <Stack direction="row" spacing={1} alignItems="center">
      <CircleIcon fontSize="small" sx={{ color: live ? 'success.main' : 'text.disabled' }} />
      <Typography variant="body2" sx={{ color: live ? 'success.main' : 'text.secondary' }}>
        {live ? 'Live' : 'Paused'}
      </Typography>
    </Stack>
  );

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardHeader
        title={
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="h6" sx={{ mr: 1 }}>Recent Events</Typography>
            <Chip label={`${events.length} loaded`} size="small" />
            {LiveBadge}
          </Stack>
        }
        subheader={<Typography variant="body2" sx={{ opacity: 0.8 }}>{entityRef}</Typography>}
        action={
          <Stack direction="row" spacing={1} alignItems="center">
            <Tooltip title={live ? 'Pause live stream' : 'Resume live stream'}>
              <IconButton onClick={() => setLive(v => !v)} size="small">
                {live ? <PauseCircleOutlineIcon /> : <PlayCircleOutlineIcon />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Refresh once">
              <span>
                <IconButton onClick={handleRefresh} size="small" disabled={loading || live}>
                  <RefreshIcon />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Export JSON">
              <IconButton onClick={handleExport} size="small">
                <DownloadIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Clear buffer">
              <Button onClick={handleClear} size="small" variant="outlined">Clear</Button>
            </Tooltip>
          </Stack>
        }
      />
      {loading && <LinearProgress />}
      <CardContent sx={{ pt: 1 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="stretch">
          <TextField
            fullWidth
            size="small"
            placeholder="Search type, time, or payload…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <FilterAltOutlinedIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <TextField
            select
            size="small"
            label="Type"
            SelectProps={{ native: true }}
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            sx={{ minWidth: 200 }}
          >
            <option value="">All types</option>
            {eventTypes.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </TextField>
          <FormControlLabel
            control={<Switch checked={live} onChange={e => setLive(e.target.checked)} />}
            label="Live"
            sx={{ ml: 'auto' }}
          />
        </Stack>

        {error && (
          <Box mt={2}>
            <Alert severity="warning" sx={{ alignItems: 'flex-start' }}>
              <Stack spacing={1}>
                <Typography variant="body2">
                  Events stream issue: {error}
                </Typography>

                {failedAfter && (
                  <Paper variant="outlined" sx={{ p: 1, borderRadius: 1 }}>
                    <Typography variant="caption" sx={{ opacity: 0.7 }}>
                      Stream failed after this event:
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5, flexWrap: 'wrap' }}>
                      <Chip size="small" label={failedAfter.type ?? 'unknown'} />
                      <Typography variant="body2">{fmt(failedAfter.timestamp ?? '')}</Typography>
                      <Tooltip title="Copy payload">
                        <IconButton size="small" onClick={() => copyPayload(failedAfter.payload)}>
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Button
                        size="small"
                        startIcon={<ExpandMoreIcon />}
                        onClick={() => {
                          const key = String(
                            (failedAfter.id ?? `${failedAfter.timestamp}:${failedAfter.type}:0`)
                          );
                          setExpanded(prev => new Set(prev).add(key));
                          bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
                        }}
                      >
                        Show payload
                      </Button>
                    </Stack>
                    <Box
                      component="pre"
                      sx={{
                        m: 0, mt: 1, p: 1, overflow: 'auto', maxHeight: 200,
                        bgcolor: 'background.paper', borderRadius: 1, fontSize: 12,
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                      }}
                    >
                      {JSON.stringify(failedAfter.payload, null, 2)}
                    </Box>
                  </Paper>
                )}
              </Stack>
            </Alert>
          </Box>
        )}


        {!error && events.length === 0 && (
          <Box mt={2}>
            <Alert severity="info">No recent events.</Alert>
          </Box>
        )}

        <Box mt={2}>
          <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <TableContainer sx={{ maxHeight: 360 }}>
              <Table stickyHeader size="small" aria-label="events table">
                <TableHead>
                  <TableRow>
                    <TableCell width={46} />
                    <TableCell sx={{ fontWeight: 600 }}>Time</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Summary</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.slice().reverse().map((e, idx) => {
                    const rowKey = String(e.id ?? `${e.timestamp}:${e.type}:${idx}`);
                    const isOpen = expanded.has(rowKey);

                    return (
                      <EventRow
                        key={rowKey}
                        e={e}
                        rowKey={rowKey}
                        isOpen={isOpen}
                        onToggle={toggleExpand}
                        copyPayload={copyPayload}
                      />
                    );
                  })}
                </TableBody>

              </Table>
            </TableContainer>
            <div ref={bottomRef} />
          </Paper>
        </Box>
      </CardContent>

      <Snackbar
        open={copied}
        autoHideDuration={1500}
        onClose={() => setCopied(false)}
        message="Payload copied to clipboard"
      />
    </Card>
  );
};
