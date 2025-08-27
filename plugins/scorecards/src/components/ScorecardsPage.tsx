import { FC, useMemo, useState } from "react";
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
  "Compliant": "success",
  "At Risk": "warning",
  "Non-compliant": "error",
};

export const ScorecardsPage: FC = () => {
  const allTags = useMemo(
    () =>
      Array.from(
        new Set(rows.flatMap((r) => r.tags))
      ).sort((a, b) => a.localeCompare(b)),
    []
  );

  const [q, setQ] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [status, setStatus] = useState<Status | "">("");
  const [onlyNonCompliant, setOnlyNonCompliant] = useState(false);

  const filtered = useMemo(() => {
    const qNorm = q.trim().toLowerCase();
    return rows.filter((r) => {
      const matchesQ =
        !qNorm ||
        r.entity.toLowerCase().includes(qNorm) ||
        r.component.toLowerCase().includes(qNorm);
      const matchesTags =
        selectedTags.length === 0 ||
        selectedTags.every((t) => r.tags.includes(t));
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
          border: (theme) => `1px solid ${theme.palette.divider}`,
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

      {/* Filters */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderRadius: 2,
          border: (theme) => `1px solid ${theme.palette.divider}`,
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
            onChange={(e) => setQ(e.target.value)}
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
            renderInput={(params) => (
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
              onChange={(e) => setStatus(e.target.value as Status | "")}
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
                onChange={(e) => setOnlyNonCompliant(e.target.checked)}
              />
            }
            label="Only non‑compliant"
            sx={{ ml: { md: "auto" } }}
          />

          <Button onClick={resetFilters}>Reset</Button>
        </Stack>
      </Paper>

      {/* Table */}
      <TableContainer
        component={Paper}
        sx={{
          borderRadius: 2,
          border: (theme) => `1px solid ${theme.palette.divider}`,
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
              filtered.map((r) => (
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
                      {r.tags.map((t) => (
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
