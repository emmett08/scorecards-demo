import {
  MemoryProjectTracker,
  Project,
  Issue,
  TrackRecord,
} from '@emmett08/scorecards-framework';
import { isExampleWebsite } from '../lib/entityRef';

// --- Single source of truth for projects (module-level array) ---
export const projects: Project[] = [
  {
    id: 'platform-reliability',
    name: 'Platform Reliability',
    goal: 'SLOs, incidents, change management',
    members: new Set<string>(),
  },
  {
    id: 'support-quality',
    name: 'Support Quality',
    goal: 'Reopen rate, Customer Satisfaction (CSAT), Time To Resolution (TTR)',
    members: new Set<string>(),
  },
];

// Optional in-memory service (kept in sync with the array below)
export const projectSvc = new MemoryProjectTracker();

// --- Helpers: normalise and add members in BOTH stores to prevent drift ---
const norm = (s: string) => s.toLocaleLowerCase();

function addMember(projectId: string, entityRef: string) {
  const p = projects.find(pr => pr.id === projectId);
  if (p) p.members.add(norm(entityRef));
  // Keep MemoryProjectTracker in sync (if used elsewhere)
  projectSvc.addMember(projectId, norm(entityRef));
}

function addMembers(projectId: string, entityRefs: string[]) {
  entityRefs.forEach(ref => addMember(projectId, ref));
}

// --- Website-related components we want to appear under "My Projects" ---
const WEBSITE_COMPONENT_REFS = [
  'component:default/example-website',
  'component:default/example-website-frontend',
  'component:default/example-website-admin',
].map(norm);

// --- Seed demo memberships so they appear in the UI ---
addMembers('platform-reliability', WEBSITE_COMPONENT_REFS);
addMembers('support-quality', WEBSITE_COMPONENT_REFS);

// --- Demo artifacts (issues & tracks) for example website entities ---
export const issuesByEntity: Record<string, Issue[]> = {};
export const tracksByEntity: Record<string, TrackRecord[]> = {};

export function ensureDemoArtifacts(entityRef: string) {
  if (!isExampleWebsite(entityRef)) return;

  if (!issuesByEntity[entityRef]) {
    issuesByEntity[entityRef] = [
      {
        id: `iss-${entityRef}-1`,
        key: `check-${entityRef}-1`,
        entityRef,
        checkId: `check-${entityRef}-1`,
        title: 'Error budget at risk',
        severity: 'high',
        openedAt: new Date().toISOString(),
      } satisfies Issue,
    ];
  }


  if (!tracksByEntity[entityRef]) {
    const now = new Date();

    tracksByEntity[entityRef] = [
      // Original track (no due/closed)
      {
        id: `trk-${entityRef}-1`,
        entityRef,
        checkId: `check-${entityRef}-1`,
        name: 'SLO compliance (30d)',
        openedAt: now.toISOString(),
        label: 'Reliability',
      } satisfies TrackRecord,

      // Track 2 — has a due date in the future, still open
      {
        id: `trk-${entityRef}-2`,
        entityRef,
        checkId: `check-${entityRef}-2`,
        name: 'Change approvals policy rollout',
        openedAt: now.toISOString(),
        dueAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days later
        label: 'Governance',
      } satisfies TrackRecord,

      // Track 3 — due in the past, still open (overdue)
      {
        id: `trk-${entityRef}-3`,
        entityRef,
        checkId: `check-${entityRef}-3`,
        name: 'Incident retrospective follow-up',
        openedAt: now.toISOString(),
        dueAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
        label: 'Operations',
      } satisfies TrackRecord,

      // Track 4 — closed already, no due date
      {
        id: `trk-${entityRef}-4`,
        entityRef,
        checkId: `check-${entityRef}-4`,
        name: 'Support process improvement',
        openedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(), // opened 10d ago
        closedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), // closed 2d ago
        label: 'Support',
      } satisfies TrackRecord,

      // Track 5 — had a due date but was closed before it
      {
        id: `trk-${entityRef}-5`,
        entityRef,
        checkId: `check-${entityRef}-5`,
        name: 'Production readiness review',
        openedAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        dueAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        closedAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(), // closed before due
        label: 'Readiness',
      } satisfies TrackRecord,

      // Track 6 — long-running open track with far-future due
      {
        id: `trk-${entityRef}-6`,
        entityRef,
        checkId: `check-${entityRef}-6`,
        name: 'Security control adoption',
        openedAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        dueAt: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60d ahead
        label: 'Security',
      } satisfies TrackRecord,
    ];
  }
}

// --- DTO for UI transport (converts Set -> string[]) ---
export type ProjectDTO = Omit<Project, 'members'> & { members: string[] };

export function getProjectsDTO(): ProjectDTO[] {
  return projects.map(p => ({
    ...p,
    members: Array.from(p.members),
  }));
}
