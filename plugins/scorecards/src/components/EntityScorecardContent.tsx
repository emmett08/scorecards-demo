import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useEntity } from '@backstage/plugin-catalog-react';
import { useApi, discoveryApiRef, identityApiRef, fetchApiRef } from '@backstage/core-plugin-api';
import { Progress, WarningPanel, InfoCard, ResponseErrorPanel } from '@backstage/core-components';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';

type TrackRecord = { id: string; entityRef: string; checkId: string; name: string; openedAt: string; label?: string; };
type Issue = { id: string; key: string; entityRef: string; checkId: string; title: string; severity: 'low'|'medium'|'high'; openedAt: string; };

type EvalResult = {
  scorecardId: string;
  name: string;
  results: Array<{
    checkId: string;
    name: string;
    passed: boolean;
    severity: 'low' | 'medium' | 'high';
    summary?: string;
    evidence?: any[];
    evaluatedAt?: string;
  }>;
  score?: number;        // 0..1
  rag?: 'green' | 'amber' | 'red';
  evaluatedAt?: string;
};

const toEntityRef = (kind: string, ns: string | undefined, name: string) =>
  `${kind.toLowerCase()}:${(ns || 'default').toLowerCase()}/${name.toLowerCase()}`;

/** ---------- Scorecard card UI ---------- */
const ragChipColor: Record<string, 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error'> = {
  green: 'success',
  amber: 'warning',
  red: 'error',
};

function pct(n?: number) {
  if (typeof n !== 'number' || Number.isNaN(n)) return '—';
  return `${Math.round(n * 100)}%`;
}

const barBg: React.CSSProperties = { height: 8, borderRadius: 4, background: 'rgba(0,0,0,0.08)' };
const barFg = (p: number): React.CSSProperties => ({
  height: '100%',
  width: `${Math.max(0, Math.min(100, Math.round(p * 100)))}%`,
  borderRadius: 4,
  background: 'linear-gradient(90deg, rgba(76,175,80,1) 0%, rgba(255,193,7,1) 50%, rgba(244,67,54,1) 100%)',
});

function ScorecardCard({ data }: { data: EvalResult }) {
  const score = typeof data.score === 'number' ? data.score : 0;
  const rag = data.rag ?? 'amber';

  return (
    <InfoCard title={data.name || 'Compliance Scorecard'}>
      <div style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ minWidth: 90 }}><strong>Score:</strong> {pct(data.score)}</div>
          <div style={{ flex: 1 }}>
            <div style={barBg}><div style={barFg(score)} /></div>
          </div>
          <Chip size="small" label={`RAG: ${rag}`} color={ragChipColor[rag] ?? 'default'} />
          {data.evaluatedAt && (
            <div style={{ opacity: 0.7, fontSize: 12 }}>
              evaluated {new Date(data.evaluatedAt).toLocaleString()}
            </div>
          )}
        </div>

        <div>
          <strong>Checks</strong>
          <ul style={{ margin: '6px 0 0 18px' }}>
            {data.results?.map(r => (
              <li key={r.checkId} style={{ marginBottom: 6 }}>
                <span style={{ marginRight: 6 }}>{r.passed ? '✅' : '❌'}</span>
                <strong>{r.name}</strong>
                <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.8 }}>
                  [{r.severity.toUpperCase()}]{r.summary ? ` — ${r.summary}` : ''}
                </span>
                {r.evidence?.[0]?.key && (
                  <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>
                    evidence: <code>{r.evidence[0].key}</code> = {String(r.evidence[0].value)}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </InfoCard>
  );
}
/** --------------------------------------- */

export const EntityScorecardContent: React.FC = () => {
  const { entity } = useEntity();
  const discoveryApi = useApi(discoveryApiRef);
  const identityApi = useApi(identityApiRef);
  const fetchApi = useApi(fetchApiRef);

  const entityRef = useMemo(
    () => toEntityRef(entity.kind, entity.metadata.namespace, entity.metadata.name),
    [entity],
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>();
  const [evalResult, setEvalResult] = useState<EvalResult | undefined>();
  const [tracks, setTracks] = useState<TrackRecord[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);

  const authedFetch = useCallback(async (input: string, init: RequestInit = {}) => {
    const { token } = await identityApi.getCredentials(); // user token (SSO / guest)
    const headers = new Headers(init.headers || {});
    if (token) headers.set('Authorization', `Bearer ${token}`);
    // only set content-type for requests that actually send a body
    if (init.method === 'POST' || init.body) {
      if (!headers.has('content-type')) headers.set('content-type', 'application/json');
    }
    return fetchApi.fetch(input, { ...init, headers, credentials: 'include' });
  }, [identityApi, fetchApi]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const baseUrl = await discoveryApi.getBaseUrl('scorecards');

      // Evaluate
      const evalRes = await authedFetch(`${baseUrl}/evaluate`, {
        method: 'POST',
        body: JSON.stringify({ entityRef, scorecardId: 'compliance' }),
      });
      if (!evalRes.ok) throw new Error(`evaluate failed: ${evalRes.status} ${evalRes.statusText}`);
      setEvalResult(await evalRes.json());

      // Tracks
      const trRes = await authedFetch(`${baseUrl}/tracks?entityRef=${encodeURIComponent(entityRef)}`);
      if (!trRes.ok) throw new Error(`tracks failed: ${trRes.status} ${trRes.statusText}`);
      setTracks(await trRes.json());

      // Issues
      const isRes = await authedFetch(`${baseUrl}/issues?entityRef=${encodeURIComponent(entityRef)}`);
      if (!isRes.ok) throw new Error(`issues failed: ${isRes.status} ${isRes.statusText}`);
      setIssues(await isRes.json());
    } catch (e: any) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [discoveryApi, authedFetch, entityRef]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (loading) return <Progress />;
  if (error) return <ResponseErrorPanel title="Failed to load scorecards data" error={error} />;

  const hasAnyData = Boolean(evalResult) || tracks.length > 0 || issues.length > 0;

  return (
    <div style={{ padding: 16, display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
        <h3 style={{ margin: 0 }}>Entity Scorecards</h3>
        <code>{entityRef}</code>
        <Button variant="outlined" size="small" onClick={fetchAll}>Re-evaluate</Button>
      </div>

      {!hasAnyData && (
        <WarningPanel title="No scorecards data for this entity">
          For demo data, use <code>component:default/example-website</code>.
        </WarningPanel>
      )}

      {evalResult && <ScorecardCard data={evalResult} />}

      <InfoCard title={`Tracks (${tracks.length})`}>
        {tracks.length === 0 ? <div>No tracks</div> : (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {tracks.map(t => (
              <li key={t.id}>
                <strong>{t.name}</strong>{t.label ? ` — ${t.label}` : ''}
                <div style={{ fontSize: 12, opacity: .8 }}>
                  check: <code>{t.checkId}</code> · opened: {new Date(t.openedAt).toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
        )}
      </InfoCard>

      <InfoCard title={`Issues (${issues.length})`}>
        {issues.length === 0 ? <div>No issues</div> : (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {issues.map(i => (
              <li key={i.id}>
                <strong>[{i.severity.toUpperCase()}]</strong> {i.title}
                <div style={{ fontSize: 12, opacity: .8 }}>
                  key: <code>{i.key}</code> · check: <code>{i.checkId}</code> · opened: {new Date(i.openedAt).toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
        )}
      </InfoCard>
    </div>
  );
};
