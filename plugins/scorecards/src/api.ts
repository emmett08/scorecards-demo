import { createApiRef } from '@backstage/frontend-plugin-api';
import { TrackRecord, Issue, Project, BusEvent } from '@emmett08/scorecards-framework';

export interface ScorecardsApi {
  evaluate(entityRef: string, scorecardId: string): Promise<any>;
  listTracks(entityRef: string): Promise<TrackRecord[]>;
  listIssues(entityRef: string): Promise<Issue[]>;
  listProjects(): Promise<Project[]>;
  listEvents(entityRef: string, since?: string): Promise<BusEvent[]>;
}

export const scorecardsApiRef = createApiRef<ScorecardsApi>({
  id: 'plugin.scorecards.api',
});

export class DefaultScorecardsApi implements ScorecardsApi {
  constructor(private readonly baseUrl: string = '/api/scorecards') {}

  async listEvents(entityRef: string, since?: string) {
    const qs = new URLSearchParams({ entityRef });
    if (since) qs.set('since', since);
    const res = await fetch(`${this.baseUrl}/events?${qs.toString()}`);
    if (!res.ok) throw new Error(`Failed to list events: ${res.status} ${res.statusText}`);
    return await res.json();
  }

  async listTracks(entityRef: string) {
    const res = await fetch(`${this.baseUrl}/tracks?entityRef=${encodeURIComponent(entityRef)}`);
    if (!res.ok) throw new Error(`Failed to list tracks: ${res.statusText}`);
    return await res.json();
  }

  async listIssues(entityRef: string) {
    const res = await fetch(`${this.baseUrl}/issues?entityRef=${encodeURIComponent(entityRef)}`);
    if (!res.ok) throw new Error(`Failed to list issues: ${res.statusText}`);
    return await res.json();
  }

  async listProjects() {
    const res = await fetch(`${this.baseUrl}/projects`);
    if (!res.ok) throw new Error(`Failed to list projects: ${res.statusText}`);
    return await res.json();
  }

  async evaluate(entityRef: string, scorecardId: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entityRef, scorecardId }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Scorecards API error: ${res.status} ${text}`);
    }
    return await res.json();
  }
}
