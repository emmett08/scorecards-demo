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
    tracksByEntity[entityRef] = [
      {
        id: `trk-${entityRef}-1`,
        entityRef,
        checkId: `check-${entityRef}-1`,
        name: 'SLO compliance (30d)',
        openedAt: new Date().toISOString(),
        label: 'Reliability',
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
