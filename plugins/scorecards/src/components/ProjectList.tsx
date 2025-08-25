import type { Project } from '@emmett08/scorecards-framework';

import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
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
import GroupsIcon from '@mui/icons-material/Groups';
import { FC, useState, useMemo } from 'react';

type Props = {
  projects: Project[];
  entityRef: string;
  /** Max table height before scrolling. Default 320. */
  maxHeight?: number;
  /** Show only projects that include this entity by default. */
  defaultMineOnly?: boolean;
};

function membersAsArray(m: Project['members'] | string[] | undefined): string[] {
  if (!m) return [];
  // When serialized over HTTP, Set becomes an array; handle both cases.
  if (Array.isArray(m)) return m;
  try {
    return Array.from(m as Set<string>);
  } catch {
    return [];
  }
}

export const ProjectList: FC<Props> = ({
  projects,
  entityRef,
  maxHeight = 320,
  defaultMineOnly = true,
}) => {
  const [mineOnly, setMineOnly] = useState<boolean>(defaultMineOnly);
  const filtered = useMemo(() => {
    const list = mineOnly
      ? projects.filter(p => membersAsArray(p.members).includes(entityRef))
      : projects;
    // Sort: my projects first (when not filtered), then by name
    return [...list].sort((a, b) => {
      const aHas = membersAsArray(a.members).includes(entityRef) ? 0 : 1;
      const bHas = membersAsArray(b.members).includes(entityRef) ? 0 : 1;
      if (!mineOnly && aHas !== bHas) return aHas - bHas;
      return a.name.localeCompare(b.name);
    });
  }, [projects, entityRef, mineOnly]);

  if (!projects?.length) {
    return (
      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardHeader title="Projects" />
        <CardContent>
          <Alert severity="info">No projects available.</Alert>
        </CardContent>
      </Card>
    );
  }

  if (mineOnly && filtered.length === 0) {
    return (
      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardHeader
          title={
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="h6">Projects</Typography>
              <Chip label={projects.length} size="small" />
            </Stack>
          }
          action={
            <FormControlLabel
              control={<Switch checked={mineOnly} onChange={e => setMineOnly(e.target.checked)} />}
              label="Only mine"
            />
          }
        />
        <CardContent>
          <Alert severity="info">Not enrolled in any project.</Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardHeader
        title={
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h6">Projects</Typography>
            <Chip label={(filtered.length || 0)} size="small" />
          </Stack>
        }
        action={
          <FormControlLabel
            control={<Switch checked={mineOnly} onChange={e => setMineOnly(e.target.checked)} />}
            label="Only mine"
          />
        }
        subheader={
          <Typography variant="body2" sx={{ opacity: 0.8 }}>
            Entity: <code>{entityRef}</code>
          </Typography>
        }
      />
      <CardContent sx={{ pt: 0 }}>
        <TableContainer sx={{ maxHeight, borderRadius: 1, border: 1, borderColor: 'divider' }}>
          <Table stickyHeader size="small" aria-label="projects table">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Project</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Goal</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Members</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Project ID</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map(p => {
                const members = membersAsArray(p.members);
                const iAmMember = members.includes(entityRef);
                return (
                  <TableRow key={p.id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body2" fontWeight={600}>{p.name}</Typography>
                        {iAmMember && <Chip size="small" color="primary" label="Member" />}
                      </Stack>
                      {p.description && (
                        <Typography variant="caption" sx={{ opacity: 0.8, display: 'block' }}>
                          {p.description}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap title={p.goal}>{p.goal}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Chip
                        size="small"
                        icon={<GroupsIcon />}
                        label={members.length}
                        variant={iAmMember ? 'filled' : 'outlined'}
                        color={iAmMember ? 'primary' : 'default'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end">
                        <Tooltip title={p.id}>
                          <Typography variant="body2" component="code" sx={{ fontFamily: 'monospace' }}>
                            {p.id}
                          </Typography>
                        </Tooltip>
                        <Tooltip title="Copy project ID">
                          <IconButton
                            size="small"
                            aria-label="Copy project ID"
                            onClick={() => navigator.clipboard.writeText(p.id)}
                          >
                            <ContentCopyIcon fontSize="inherit" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
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
