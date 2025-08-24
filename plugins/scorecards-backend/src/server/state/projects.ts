import {
  MemoryProjectTracker,
  Project,
  Issue,
  TrackRecord,
} from '@emmett08/scorecards-framework';
import { isExampleWebsite } from '../lib/entityRef';

export const projectSvc = new MemoryProjectTracker();

export const projects: Project[] = [
  { id: 'proj-1', name: 'Platform Reliability', goal: 'SLOs, incidents, change mgmt', members: new Set<string>() },
  { id: 'proj-2', name: 'Support Quality', goal: 'Reopen rate, CSAT, TTR', members: new Set<string>() },
];

// demo membership
projectSvc.addMember('proj-1', 'component:default/example-website');

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

export type ProjectDTO = Omit<Project, 'members'> & { members: string[] };

export function getProjectsDTO(): ProjectDTO[] {
  return projects.map(p => ({ ...p, members: Array.from(p.members) }));
}
