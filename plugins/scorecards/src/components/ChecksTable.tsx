import { useEffect, useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Link from '@mui/material/Link';
import { StatusIcon } from './StatusIcon';
import { Sparkline } from './Sparkline';
import type { ChecksTableRow } from '../types/ui';

export interface ChecksTableProps<T extends ChecksTableRow = ChecksTableRow> {
  checks: T[];
  dense?: boolean;
  onRemediate?: (check: T) => void;
}

type SortKey = 'title' | 'status' | 'updatedAt';

const statusOrder: Record<'fail' | 'warn' | 'stale' | 'unknown' | 'pass', number> = {
  fail: 0, warn: 1, stale: 2, unknown: 3, pass: 4,
};

export const ChecksTable: React.FC<ChecksTableProps> = ({ checks, dense = false, onRemediate }) => {
  const [sortKey, setSortKey] = useState<SortKey>('status');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [filter, setFilter] = useState<'all' | 'fail' | 'warn' | 'pass' | 'stale' | 'unknown'>('all');

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('[ChecksTable] received checks:', checks);
  }, [checks]);
  
  const filtered = useMemo(
    () => checks.filter(c => (filter === 'all' ? true : c.status === filter)),
    [checks, filter],
  );

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'status') cmp = statusOrder[a.status] - statusOrder[b.status];
      else if (sortKey === 'title') cmp = a.title.localeCompare(b.title);
      else if (sortKey === 'updatedAt') cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const onSort = (key: SortKey) => {
    if (key === sortKey) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <Typography variant="h6">Checks</Typography>
        <Typography variant="body2" color="text.secondary">•</Typography>
        <Select
          size="small"
          value={filter}
          onChange={e => setFilter(e.target.value as any)}
          aria-label="Filter by status"
        >
          <MenuItem value="all">All</MenuItem>
          <MenuItem value="fail">Fail</MenuItem>
          <MenuItem value="warn">Warn</MenuItem>
          <MenuItem value="pass">Pass</MenuItem>
          <MenuItem value="stale">Stale</MenuItem>
          <MenuItem value="unknown">Unknown</MenuItem>
        </Select>
      </Box>

      <TableContainer>
        <Table size={dense ? 'small' : 'medium'}>
          <TableHead>
            <TableRow>
              <TableCell>
                <Button onClick={() => onSort('title')} size="small">Check</Button>
              </TableCell>
              <TableCell>
                <Button onClick={() => onSort('status')} size="small">Status</Button>
              </TableCell>
              <TableCell>Trend</TableCell>
              <TableCell>Evidence</TableCell>
              <TableCell>Owner</TableCell>
              <TableCell>
                <Button onClick={() => onSort('updatedAt')} size="small">Updated</Button>
              </TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <Typography variant="body2" color="text.secondary">No checks match the filter.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              sorted.map(c => (
                <TableRow key={c.id} hover>
                  <TableCell>
                    <Typography fontWeight="bold">{c.title}</Typography>
                    {(c.value !== undefined || c.target !== undefined || c.waiver?.active) && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        {c.value !== undefined && <>Value: <strong>{String(c.value)}</strong></>}
                        {c.target !== undefined && <> • Target: <strong>{String(c.target)}</strong></>}
                        {c.waiver?.active && <span aria-label="Waived"> (Waived)</span>}
                      </Typography>
                    )}
                  </TableCell>

                  <TableCell>
                    {/* <ScoreBadge
                      status={c.status}
                      value={typeof c.value === 'number' ? c.value : undefined}
                      updatedAt={c.updatedAt}
                      size="sm"
                    /> */}
                    <StatusIcon status={c.status} updatedAt={c.updatedAt} />
                  </TableCell>

                  <TableCell>
                    {Array.isArray(c.trend) && c.trend.length > 1 ? (
                      <Sparkline data={c.trend} width={120} height={28} ariaLabel={`Trend for ${c.title}`} strokeWidth={2} />
                    ) : (
                      <Typography variant="body2" color="text.secondary">—</Typography>
                    )}
                  </TableCell>

                  <TableCell>
                    {c.evidence && c.evidence.length > 0 ? (
                      <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
                        {c.evidence.map((e, i) => (
                          <li key={i}>
                            {e.url
                              ? <Link href={e.url} target="_blank" rel="noreferrer">{e.label}</Link>
                              : <Typography variant="body2">{e.label}</Typography>}
                          </li>
                        ))}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">—</Typography>
                    )}
                  </TableCell>

                  <TableCell>
                    {c.owner ?? <Typography variant="body2" color="text.secondary">—</Typography>}
                  </TableCell>

                  <TableCell>
                    <time dateTime={c.updatedAt}>{new Date(c.updatedAt).toLocaleString()}</time>
                  </TableCell>

                  <TableCell>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => onRemediate?.(c)}
                      aria-label={`Remediate ${c.title}`}
                    >
                      Create ticket
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};
