import { useState, useEffect } from 'react';
import type { FC } from 'react';

import { useEntity } from '@backstage/plugin-catalog-react';
import { useApi } from '@backstage/frontend-plugin-api';
import { scorecardsApiRef } from '../api';

import type {
  TrackRecord,
  Issue,
  Project,
} from '@emmett08/scorecards-framework';

import { ScorecardHeader } from './ScorecardHeader';
import { ChecksTable } from './ChecksTable';
import { TrackList } from './TrackList';
import { IssueList } from './IssueList';
import { ProjectMembershipCard } from './ProjectMembershipCard';
import { EventStreamPanel } from './EventStreamPanel';

export const EntityScorecardPage: FC<{ scorecardId?: string }> = ({
  scorecardId = 'compliance',
}) => {
  const { entity } = useEntity();
  const api = useApi(scorecardsApiRef);

  const entityRef =
    `${entity.kind.toLowerCase()}:${entity.metadata.namespace || 'default'}/${entity.metadata.name}`;

  const [evalData, setEvalData] = useState<any | null>(null);
  const [tracks, setTracks] = useState<TrackRecord[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      api.evaluate(entityRef, scorecardId),
      api.listTracks(entityRef),
      api.listIssues(entityRef),
      api.listProjects(),
    ])
      .then(([ev, tr, is, pr]) => {
        if (cancelled) return;
        setEvalData(ev);
        setTracks(tr);
        setIssues(is);
        setProjects(pr);
      })
      .catch(e => !cancelled && setError(String(e)))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [entityRef, scorecardId, api]);

  if (loading) return <div>Loading scorecard…</div>;
  if (error) return <div style={{ color: '#b00020' }}>Failed to load: {error}</div>;
  if (!evalData) return <div>No data</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <ScorecardHeader data={evalData} />
      <ChecksTable results={evalData.results} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <TrackList tracks={tracks} />
        <IssueList issues={issues} />
      </div>
      <ProjectMembershipCard projects={projects} entityRef={entityRef} />
      <EventStreamPanel entityRef={entityRef} />
    </div>
  );
};
