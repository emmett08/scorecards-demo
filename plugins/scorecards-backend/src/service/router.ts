// plugins/scorecards-backend/src/service/router.ts
import express from 'express';
import { z } from 'zod';
import {
  InMemoryFactStore, FactIngestionService, StoreBackedFactProvider,
  JsonRuleCheck, OpaCheck, ScorecardService,
  MockDatadogClient, DatadogSloRetriever,
  MockServiceNowClient, ServiceNowChangeRetriever, ServiceNowIncidentRetriever,
  MockSupportClient, SupportSummaryRetriever,
  MockOpaClient,
  TrackRecord, Issue, Project, BusEvent,
} from '@emmett08/scorecards-framework';
import { EventBus } from '@emmett08/scorecards-framework/events';

const store = new InMemoryFactStore();
const bus = new EventBus();

type EntityPayload = { entityRef: string; [k: string]: unknown };
const eventHistory: BusEvent<EntityPayload>[] = [];
bus.subscribe(e => {
  eventHistory.push(e);
});

const projects: Project[] = [
  { id: 'proj-1', name: 'Platform Reliability', goal: 'SLOs, incidents, change mgmt', members: new Set<string>() },
  { id: 'proj-2', name: 'Support Quality', goal: 'Reopen rate, CSAT, TTR', members: new Set<string>() },
];

const issuesByEntity: Record<string, Issue[]> = {};
const tracksByEntity: Record<string, TrackRecord[]> = {};

const dd = new MockDatadogClient();
const snow = new MockServiceNowClient();
const sup = new MockSupportClient();
const opa = new MockOpaClient();

/** --- helpers to target only example-website --- */
function normalizeEntityRef(ref: string): string {
  // Accept both "component:default/example-website" and "default/component/example-website"
  const s = ref.trim().toLowerCase();
  if (s.includes(':')) {
    // format: kind:namespace/name
    const [kind, rest] = s.split(':', 2);
    const [ns, name] = rest.split('/', 2);
    return `${kind}:${ns}/${name}`;
  }
  // format: namespace/kind/name
  const parts = s.split('/');
  if (parts.length === 3) {
    const [ns, kind, name] = parts;
    return `${kind}:${ns}/${name}`;
  }
  return s; // fallback; caller can still compare raw
}

const TARGET = 'component:default/example-website';
function isExampleWebsite(ref: string): boolean {
  return normalizeEntityRef(ref) === TARGET;
}
/** --------------------------------------------- */

function ensureDemoArtifacts(entityRef: string) {
  if (!isExampleWebsite(entityRef)) return; // seed ONLY for example-website

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

const EvalBody = z.object({
  entityRef: z.string(),
  scorecardId: z.string().default('compliance'),
});

const EntityRefQuery = z.object({
  entityRef: z.string(),
});

const EventsQuery = z.object({
  entityRef: z.string(),
  since: z.string().datetime().optional(),
});

export function createRouter(): express.Router {
  const router = express.Router();
  router.use(express.json());
  router.use(express.urlencoded({ extended: true }));
  router.get('/health', (_req, res) => res.json({ status: 'ok' }));

  router.post('/evaluate', async (req, res) => {
    const parsed = EvalBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const { entityRef, scorecardId } = parsed.data;

    // Seed demo artefacts ONLY for example-website
    if (isExampleWebsite(entityRef)) {
      ensureDemoArtifacts(entityRef);
    }

    // Collect facts (Mock clients may still return data; filtering by [entityRef])
    const datadogRetriever = new DatadogSloRetriever(
      'datadog-slo',
      dd,
      (e: string) => ({ serviceTag: e.split('/').pop()!, env: 'prod' }),
      [entityRef],
    );
    const snowChange = new ServiceNowChangeRetriever(
      'snow-change',
      snow,
      (e: string) => ({ ci: e.split('/').pop()! }),
      [entityRef],
    );
    const snowIncident = new ServiceNowIncidentRetriever(
      'snow-incident',
      snow,
      (e: string) => ({ ci: e.split('/').pop()! }),
      [entityRef],
    );
    const supportRetriever = new SupportSummaryRetriever(
      'support-summary',
      sup,
      (e: string) => ({ appId: e.split('/').pop()! }),
      [entityRef],
    );

    const ingestion = new FactIngestionService(store, [
      datadogRetriever, snowChange, snowIncident, supportRetriever,
    ]);
    await ingestion.collectAll();

    const facts = new StoreBackedFactProvider(store);

    const sloCheck = new JsonRuleCheck(
      'slo-budget',
      'Error budget remaining >= 20% (30d)',
      'high',
      facts,
      { all: [{ fact: 'datadog.slo.errorBudgetRemaining', operator: 'greaterThanInclusive', value: 0.2 }] },
    );
    const changeApprovalCheck = new JsonRuleCheck(
      'change-approval',
      'Change approvals >= 95% (30d)',
      'medium',
      facts,
      { all: [{ fact: 'servicenow.change.approvedPct', operator: 'greaterThanInclusive', value: 95 }] },
    );
    const incidentMttrCheck = new JsonRuleCheck(
      'incident-mttr',
      'Incident MTTR <= 4h (30d)',
      'medium',
      facts,
      { all: [{ fact: 'servicenow.incident.mttrHours', operator: 'lessThanInclusive', value: 4 }] },
    );
    const supportReopenCheck = new JsonRuleCheck(
      'support-reopen',
      'Support reopen rate <= 5% (30d)',
      'low',
      facts,
      { all: [{ fact: 'support.reopenRatePct', operator: 'lessThanInclusive', value: 5 }] },
    );

    const opaCheck = new OpaCheck(
      'opa-production-readiness',
      'OPA: Production readiness policy',
      'high',
      opa,
      'policies/production_readiness',
      async () => ({ deny: false } as any),
    );

    const scorecardSvc = new ScorecardService(
      [
        {
          id: 'compliance',
          name: 'Compliance Scorecard',
          checks: [
            { check: sloCheck, weight: 2 },
            { check: changeApprovalCheck, weight: 2 },
            { check: incidentMttrCheck, weight: 1 },
            { check: supportReopenCheck, weight: 1 },
            { check: opaCheck, weight: 2 },
          ],
          passingThreshold: 0.8,
        },
      ],
      undefined,
      bus,
    );

    const evalRes = await scorecardSvc.evaluate(entityRef, scorecardId);
    res.json(evalRes);
  });

  router.get('/events', (req, res) => {
    const parsed = EventsQuery.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const { entityRef, since } = parsed.data;
    const sinceTs = since ? new Date(since).getTime() : 0;

    const items = eventHistory.filter(
      e => e.payload.entityRef === entityRef && new Date(e.timestamp).getTime() >= sinceTs,
    );

    res.json(items);
  });

  router.get('/tracks', (req, res) => {
    const parsed = EntityRefQuery.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const { entityRef } = parsed.data;

    // Seed tracks ONLY for example-website
    if (isExampleWebsite(entityRef)) {
      ensureDemoArtifacts(entityRef);
    }
    res.json(tracksByEntity[entityRef] ?? []);
  });

  router.get('/issues', (req, res) => {
    const parsed = EntityRefQuery.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const { entityRef } = parsed.data;

    // Seed issues ONLY for example-website
    if (isExampleWebsite(entityRef)) {
      ensureDemoArtifacts(entityRef);
    }
    res.json(issuesByEntity[entityRef] ?? []);
  });

  router.get('/projects', (_req, res) => {
    res.json(projects);
  });

  return router;
}
