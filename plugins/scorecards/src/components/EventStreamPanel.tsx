import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

type Props = { entityRef: string };

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

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const seenIds = useRef<Set<string>>(new Set());
  const unsubRef = useRef<(() => void) | null>(null);

  // auto-scroll to newest
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [events]);

  // const addEvents = useCallback((list: BusEvent[]) => {
  //   if (!list?.length) return;
  //   setEvents(prev => {
  //     const next = [...prev];
  //     for (const e of list) {
  //       const key = String(e.id ?? `${e.timestamp}:${e.type}`);
  //       if (seenIds.current.has(key)) continue;
  //       seenIds.current.add(key);
  //       next.push(e);
  //     }
  //     // Keep last 500 for reasonable history
  //     return next.slice(-500);
  //   });
  //   const lastTs = list[list.length - 1]?.timestamp;
  //   if (lastTs) setSince(lastTs);
  // }, []);

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
      }
      return next.slice(-500);
    });
    const lastTs = list[list.length - 1]?.timestamp;
    if (lastTs) sinceRef.current = lastTs;   // update cursor in ref (not state)
  }, []);

  
  useEffect(() => {
    const cancelled = false;
    setLoading(true);
    setError(undefined);

    // cleanup previous sub
    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }

    if (!live) { setLoading(false); return; }

    (async () => {
      try {
        const initialSince = sinceRef.current;

        const unsub = await api.subscribeEvents({
          entityRef,
          since: initialSince,
          // ❌ no short-circuit returns; use blocks so the handler returns void
          onEvent: (e) => { if (!cancelled) { addEvents([e]); } },
          onError: (err) => { if (!cancelled) { setError(err.message); } },
        });
        unsubRef.current = unsub;
        setLoading(false);
      } catch {
        // polling fallback
        const tick = async () => {
          if (cancelled) return;
          try {
            const list = await api.listEvents(entityRef, sinceRef.current);
            if (cancelled) return;
            addEvents(list);
            setError(undefined);
          } catch (e: any) {
            if (!cancelled) setError(String(e?.message ?? e));
          } finally {
            setLoading(false);
          }
        };
        await tick();
        const timer = setInterval(tick, 3000);
        unsubRef.current = () => clearInterval(timer);
      }
    })();

    // ✅ cleanup returns void; no implicit return expressions
    // return () => {
    //   cancelled = true;
    //   if (unsubRef.current) {
    //     unsubRef.current();
    //     unsubRef.current = null;
    //   }
    // };
    // IMPORTANT: do not depend on a state `since`; we use sinceRef internally
  }, [api, entityRef, live, addEvents]);

  // manual refresh (one-shot poll)
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
            <Alert severity="warning">
              Events stream issue: {error}
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
                    const key = String(e.id ?? `${e.timestamp}:${e.type}:${idx}`);
                    const isOpen = expanded.has(key);

                    // lightweight summary (first-level keys)
                    const payloadSummary = (() => {
                      try {
                        if (e?.payload && typeof e.payload === 'object') {
                          const entries = Object.entries(e.payload as Record<string, unknown>)
                            .slice(0, 4)
                            .map(([k, v]) => `${k}=${typeof v === 'object' ? '[obj]' : String(v)}`);
                          return entries.join(' · ');
                        }
                      } catch {/* ignore */ }
                      return '';
                    })();

                    return (
                      <React.Fragment key={key}>
                        <TableRow hover tabIndex={0}>
                          <TableCell padding="checkbox">
                            <IconButton
                              size="small"
                              aria-label={isOpen ? 'Collapse' : 'Expand'}
                              onClick={() => toggleExpand(key)}
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
                            <Typography variant="body2" noWrap title={payloadSummary}>
                              {payloadSummary || <Box component="span" sx={{ opacity: 0.6 }}>—</Box>}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Tooltip title="Copy payload">
                              <IconButton size="small" onClick={() => copyPayload(e.payload)}>
                                <ContentCopyIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>

                        {isOpen && (
                          <TableRow>
                            <TableCell />
                            <TableCell colSpan={4} sx={{ backgroundColor: 'action.hover', p: 0 }}>
                              <Box sx={{ p: 1.5 }}>
                                <Typography variant="caption" sx={{ opacity: 0.7 }}>
                                  Payload
                                </Typography>
                                <Box
                                  component="pre"
                                  sx={{
                                    m: 0,
                                    mt: 0.5,
                                    p: 1,
                                    overflow: 'auto',
                                    maxHeight: 240,
                                    bgcolor: 'background.paper',
                                    borderRadius: 1,
                                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                                    fontSize: 12,
                                    lineHeight: 1.5,
                                  }}
                                >
                                  {JSON.stringify(e.payload, null, 2)}
                                </Box>
                              </Box>
                              <Divider />
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
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
