import {
  createApiRef,
  DiscoveryApi,
  IdentityApi,
  FetchApi,
} from '@backstage/frontend-plugin-api';
import type { TrackRecord, Issue, Project, BusEvent } from '@emmett08/scorecards-framework';
import { fetchEventSource } from '@microsoft/fetch-event-source';

export interface ScorecardsApi {
  evaluate(entityRef: string, scorecardId: string): Promise<any>;
  listTracks(entityRef: string): Promise<TrackRecord[]>;
  listIssues(entityRef: string): Promise<Issue[]>;
  listProjects(): Promise<Project[]>;
  listEvents(entityRef: string, since?: string): Promise<BusEvent[]>;
  /**
   * Open an SSE stream of events for an entity.
   * Returns an unsubscribe function that closes the stream.
   */
  subscribeEvents(options: {
    entityRef: string;
    since?: string;
    onEvent: (e: BusEvent) => void;
    onError?: (err: Error) => void;
  }): Promise<() => void>;
}

export const scorecardsApiRef = createApiRef<ScorecardsApi>({
  id: 'plugin.scorecards.api',
});

type ConstructorOpts =
  | { baseUrl: string } // compatibility mode (your current usage)
  | {
    discoveryApi: DiscoveryApi;
    identityApi: IdentityApi;
    fetchApi: FetchApi;
    /** service id/path used by discovery, defaults to 'scorecards' (-> /api/scorecards) */
    basePath?: string;
  };

export class DefaultScorecardsApi implements ScorecardsApi {
  private readonly mode:
    | { kind: 'baseUrl'; baseUrl: string }
    | {
      kind: 'discover';
      discoveryApi: DiscoveryApi;
      identityApi: IdentityApi;
      fetchApi: FetchApi;
      basePath: string;
    };

  constructor(opts: ConstructorOpts = { baseUrl: '/api/scorecards' }) {
    if ('baseUrl' in opts) {
      this.mode = { kind: 'baseUrl', baseUrl: opts.baseUrl.replace(/\/$/, '') };
    } else {
      this.mode = {
        kind: 'discover',
        discoveryApi: opts.discoveryApi,
        identityApi: opts.identityApi,
        fetchApi: opts.fetchApi,
        basePath: (opts.basePath ?? 'scorecards').replace(/^\//, ''),
      };
    }
  }

  /** Resolve base URL (either fixed baseUrl or discovered /api/{service}) */
  private async baseUrl(): Promise<string> {
    if (this.mode.kind === 'baseUrl') return this.mode.baseUrl;
    return this.mode.discoveryApi.getBaseUrl(this.mode.basePath);
  }

  /** Fetch with identity token + credentials when discover mode is used; falls back to window.fetch otherwise. */
  private async authedFetch(input: string, init: RequestInit = {}) {
    if (this.mode.kind === 'baseUrl') {
      const headers = new Headers(init.headers ?? {});
      if (init.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
      return fetch(input, { ...init, headers, credentials: 'include' });
    }

    const { fetchApi, identityApi } = this.mode;
    const { token } = await identityApi.getCredentials();
    const headers = new Headers(init.headers ?? {});
    if (token) headers.set('Authorization', `Bearer ${token}`);
    if (init.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
    return fetchApi.fetch(input, { ...init, headers, credentials: 'include' });
  }

  async listEvents(entityRef: string, since?: string) {
    const url = new URL(`${await this.baseUrl()}/events`, window.location.origin);
    url.pathname = `${await this.baseUrl()}/events`; // ensure absolute when behind proxies
    url.searchParams.set('entityRef', entityRef);
    if (since) url.searchParams.set('since', since);

    const res = await this.authedFetch(url.toString());
    if (!res.ok) throw new Error(`Failed to list events: ${res.status} ${res.statusText}`);
    return res.json();
  }

  async listTracks(entityRef: string) {
    const url = new URL(`${await this.baseUrl()}/tracks`, window.location.origin);
    url.pathname = `${await this.baseUrl()}/tracks`;
    url.searchParams.set('entityRef', entityRef);

    const res = await this.authedFetch(url.toString());
    if (!res.ok) throw new Error(`Failed to list tracks: ${res.status} ${res.statusText}`);
    return res.json();
  }

  async listIssues(entityRef: string) {
    const url = new URL(`${await this.baseUrl()}/issues`, window.location.origin);
    url.pathname = `${await this.baseUrl()}/issues`;
    url.searchParams.set('entityRef', entityRef);

    const res = await this.authedFetch(url.toString());
    if (!res.ok) throw new Error(`Failed to list issues: ${res.status} ${res.statusText}`);
    return res.json();
  }

  async listProjects() {
    const res = await this.authedFetch(`${await this.baseUrl()}/projects`);
    if (!res.ok) throw new Error(`Failed to list projects: ${res.status} ${res.statusText}`);
    return res.json();
  }

  async evaluate(entityRef: string, scorecardId: string): Promise<any> {
    const res = await this.authedFetch(`${await this.baseUrl()}/evaluate`, {
      method: 'POST',
      body: JSON.stringify({ entityRef, scorecardId }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Scorecards API error: ${res.status} ${text}`);
    }
    return res.json();
  }

  async subscribeEvents({
    entityRef,
    since,
    onEvent,
    onError,
  }: {
    entityRef: string;
    since?: string;
    onEvent: (e: BusEvent) => void;
    onError?: (err: Error) => void;
  }): Promise<() => void> {
    const base = await this.baseUrl();
    const ensureSlash = (s: string) => (s.endsWith('/') ? s : `${s}/`);
    const url = new URL('events/stream', ensureSlash(base));
    url.searchParams.set('entityRef', entityRef);
    if (since) url.searchParams.set('since', since);

    let token: string | undefined;
    if (this.mode.kind === 'discover') {
      ({ token } = await this.mode.identityApi.getCredentials());
    }

    await fetchEventSource(url.toString(), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: 'include',
      onmessage: ev => {
        const data = JSON.parse(ev.data);
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        Array.isArray(data) ? data.forEach(onEvent) : onEvent(data);
      },
      onerror: err => onError?.(err as Error),
    });

    // return a noop unsubscribe; if you need explicit abort, wire an AbortController
    return () => {/* supply abort controller if needed */ };
  }
}
