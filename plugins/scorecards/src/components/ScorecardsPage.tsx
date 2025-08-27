import { FC, useEffect, useMemo, useState } from "react";

// Backstage APIs
import { useApi, identityApiRef } from "@backstage/core-plugin-api";
import { catalogApiRef, EntityRefLink } from "@backstage/plugin-catalog-react";
import { Entity } from "@backstage/catalog-model";

// MUI (deep imports only)
import Alert from "@mui/material/Alert";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import InputLabel from "@mui/material/InputLabel";
import LinearProgress from "@mui/material/LinearProgress";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

type Status = "Compliant" | "At Risk" | "Non-compliant";

type EntityScore = {
  id: string;
  entity: string;
  component: string;
  score: number; // 0-100
  status: Status;
  tags: string[];
  updatedAt: string; // ISO date
};

// Demo data (replace with your data source)
const rows: EntityScore[] = [
  {
    id: "svc-checkout",
    entity: "checkout-service",
    component: "service",
    score: 92,
    status: "Compliant",
    tags: ["payments", "critical"],
    updatedAt: "2025-08-15",
  },
  {
    id: "svc-catalog",
    entity: "catalog-service",
    component: "service",
    score: 64,
    status: "At Risk",
    tags: ["catalogue", "backend"],
    updatedAt: "2025-08-12",
  },
  {
    id: "web-frontend",
    entity: "web-frontend",
    component: "website",
    score: 38,
    status: "Non-compliant",
    tags: ["frontend", "critical"],
    updatedAt: "2025-08-10",
  },
];

const statusColour: Record<Status, "success" | "warning" | "error"> = {
  Compliant: "success",
  "At Risk": "warning",
  "Non-compliant": "error",
};

export const ScorecardsPage: FC = () => {
  // --- Backstage: fetch owned entities for the logged-in user ---
  const catalogApi = useApi(catalogApiRef);
  const identityApi = useApi(identityApiRef);

  const [ownedEntities, setOwnedEntities] = useState<Entity[]>([]);
  const [ownedLoading, setOwnedLoading] = useState<boolean>(false);
  const [ownedError, setOwnedError] = useState<Error | undefined>(undefined);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setOwnedLoading(true);
      setOwnedError(undefined);
      try {
        const { userEntityRef } = await identityApi.getBackstageIdentity();
        // Filter by ownership; adjust kind if you want only Components/APIs/etc.
        const { items } = await catalogApi.getEntities({
          filter: { "relations.ownedBy": [userEntityRef] },
        });
        if (mounted) setOwnedEntities(items ?? []);
      } catch (e) {
        if (mounted) setOwnedError(e as Error);
      } finally {
        if (mounted) setOwnedLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [catalogApi, identityApi]);

  // --- Your existing tag aggregation (for demo score table) ---
  const allTags = useMemo(
    () =>
      Array.from(new Set(rows.flatMap(r => r.tags))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [],
  );

  const [q, setQ] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [status, setStatus] = useState<Status | "">("");
  const [onlyNonCompliant, setOnlyNonCompliant] = useState(false);

  const filtered = useMemo(() => {
    const qNorm = q.trim().toLowerCase();
    return rows.filter(r => {
      const matchesQ =
        !qNorm ||
        r.entity.toLowerCase().includes(qNorm) ||
        r.component.toLowerCase().includes(qNorm);
      const matchesTags =
        selectedTags.length === 0 ||
        selectedTags.every(t => r.tags.includes(t));
      const matchesStatus = !status || r.status === status;
      const matchesOnlyNC = !onlyNonCompliant || r.status === "Non-compliant";
      return matchesQ && matchesTags && matchesStatus && matchesOnlyNC;
    });
  }, [q, selectedTags, status, onlyNonCompliant]);

  const resetFilters = () => {
    setQ("");
    setSelectedTags([]);
    setStatus("");
    setOnlyNonCompliant(false);
  };

  return (
    <Container component="main" maxWidth="lg" sx={{ py: 4 }}>
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 2,
          border: theme => `1px solid ${theme.palette.divider}`,
          mb: 3,
        }}
      >
        <Stack spacing={2}>
          <Typography variant="h4" component="h1">
            Scorecards
          </Typography>
          <Divider />
          <Typography variant="body1">
            Use the <strong>Scorecards</strong> tab on an entity page to view
            the computed compliance for a component.
          </Typography>
          <Alert severity="info" variant="outlined">
            This top-level page can be extended to list entities, filter by
            tags, or aggregate scores.
          </Alert>
        </Stack>
      </Paper>

      {/* === Owned Entities Section === */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderRadius: 2,
          border: theme => `1px solid ${theme.palette.divider}`,
          mb: 3,
        }}
      >
        <Stack spacing={1} sx={{ mb: 2 }}>
          <Typography variant="h6">Your owned entities</Typography>
          <Typography variant="body2" color="text.secondary">
            These are catalog entities where you (or your group) are listed as an owner.
          </Typography>
        </Stack>

        {ownedLoading && (
          <Box sx={{ px: 1, py: 2 }}>
            <LinearProgress aria-label="Loading owned entities" />
          </Box>
        )}

        {ownedError && (
          <Alert severity="error">
            Failed to load owned entities: {ownedError.message}
          </Alert>
        )}

        {!ownedLoading && !ownedError && (
          <TableContainer
            component={Paper}
            sx={{
              borderRadius: 2,
              border: theme => `1px solid ${theme.palette.divider}`,
            }}
          >
            <Table size="medium" aria-label="Owned entities table">
              <TableHead>
                <TableRow>
                  <TableCell width={320}>Name</TableCell>
                  <TableCell width={140}>Kind</TableCell>
                  <TableCell width={160}>Namespace</TableCell>
                  <TableCell>Tags</TableCell>
                  <TableCell width={220}>Owner</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {ownedEntities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <Typography variant="body2" sx={{ py: 2 }}>
                        You don’t own any entities in the catalog.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  ownedEntities.map(entity => {
                    const tags = entity.metadata?.tags ?? [];
                    const owner =
                      // Prefer spec.owner if present; otherwise show nothing
                      // (ownership is already implied by the query)
                      (entity as any).spec?.owner ?? "—";
                    return (
                      <TableRow key={`${entity.kind}:${entity.metadata?.namespace ?? "default"}/${entity.metadata?.name}`}>
                        <TableCell>
                          {/* Link to the entity page */}
                          <EntityRefLink entityRef={entity} defaultKind={entity.kind} />
                        </TableCell>
                        <TableCell>{entity.kind}</TableCell>
                        <TableCell>{entity.metadata?.namespace ?? "default"}</TableCell>
                        <TableCell>
                          <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                            {tags.length === 0 ? (
                              <Typography variant="caption" color="text.secondary">
                                —
                              </Typography>
                            ) : (
                              tags.map(t => <Chip key={t} label={t} size="small" />)
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>{owner}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* === Filters for the demo scorecards table (your existing content) === */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderRadius: 2,
          border: theme => `1px solid ${theme.palette.divider}`,
          mb: 3,
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          alignItems={{ xs: "stretch", md: "center" }}
        >
          <TextField
            fullWidth
            label="Search entities/components"
            placeholder="e.g. checkout, website"
            value={q}
            onChange={e => setQ(e.target.value)}
          />

          <Autocomplete
            multiple
            options={allTags}
            value={selectedTags}
            onChange={(_, v) => setSelectedTags(v)}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip label={option} {...getTagProps({ index })} />
              ))
            }
            renderInput={params => (
              <TextField {...params} label="Tags" placeholder="Select tags" />
            )}
            sx={{ minWidth: 260 }}
          />

          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel id="status-label">Status</InputLabel>
            <Select
              labelId="status-label"
              label="Status"
              value={status}
              onChange={e => setStatus(e.target.value as Status | "")}
            >
              <MenuItem value="">Any</MenuItem>
              <MenuItem value="Compliant">Compliant</MenuItem>
              <MenuItem value="At Risk">At Risk</MenuItem>
              <MenuItem value="Non-compliant">Non-compliant</MenuItem>
            </Select>
          </FormControl>

          <FormControlLabel
            control={
              <Switch
                checked={onlyNonCompliant}
                onChange={e => setOnlyNonCompliant(e.target.checked)}
              />
            }
            label="Only non-compliant"
            sx={{ ml: { md: "auto" } }}
          />

          <Button onClick={resetFilters}>Reset</Button>
        </Stack>
      </Paper>

      {/* === Demo scorecards table (unchanged) === */}
      <TableContainer
        component={Paper}
        sx={{
          borderRadius: 2,
          border: theme => `1px solid ${theme.palette.divider}`,
        }}
      >
        <Table size="medium" aria-label="Scorecards table">
          <TableHead>
            <TableRow>
              <TableCell width={240}>Entity</TableCell>
              <TableCell>Component</TableCell>
              <TableCell width={240}>Score</TableCell>
              <TableCell width={160}>Status</TableCell>
              <TableCell>Tags</TableCell>
              <TableCell width={160} align="right">
                Last updated
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <Typography variant="body2" sx={{ py: 2 }}>
                    No results with the current filters.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(r => (
                <TableRow key={r.id} hover>
                  <TableCell>
                    <Typography variant="subtitle2">{r.entity}</Typography>
                  </TableCell>
                  <TableCell>{r.component}</TableCell>
                  <TableCell>
                    <Box sx={{ display: "grid", gap: 0.5 }}>
                      <Typography
                        variant="body2"
                        aria-label={`Score ${r.score} out of 100`}
                      >
                        {r.score} / 100
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={r.score}
                        sx={{ height: 6, borderRadius: 999 }}
                        aria-hidden
                      />
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={r.status}
                      color={statusColour[r.status]}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                      {r.tags.map(t => (
                        <Chip key={t} label={t} size="small" />
                      ))}
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    {new Date(r.updatedAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
};
