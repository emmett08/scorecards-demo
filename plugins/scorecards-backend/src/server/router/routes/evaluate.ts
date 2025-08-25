import express from 'express';
import {
  DatadogSloRetriever,
  ServiceNowChangeRetriever,
  ServiceNowIncidentRetriever,
  SupportSummaryRetriever,
  FactIngestionService,
  StoreBackedFactProvider,
} from '@emmett08/scorecards-framework';
import type { BusEvent } from '@emmett08/scorecards-framework';
import { LevelledScorecardService, type LevelPolicy, type LevelDefinition } from '@emmett08/scorecards-framework';
import { EvalBody } from '../../lib/schemas';
import { ensureDemoArtifacts } from '../../state/projects';
import { isExampleWebsite } from '../../lib/entityRef';
import { dd, snow, sup } from '../../services/clients';
import { store } from '../../state/store';
import { createScorecardService } from '../../services/scorecards';
import { bus } from '../../state/bus';
import type { EntityPayload } from '../../state/history';

const levelPalette: Record<string, string> = {
  baseline:  '#9e9e9e',
  hygiene:   '#64b5f6',
  reliable:  '#81c784',
  compliant: '#ffd54f',
  exemplary: '#7e57c2',
};

const levelsPolicy: LevelPolicy = (def) => {
  const ids = new Set<string>(
    (def.checks ?? [])
      .map(c => (c as any)?.check?.id || (c as any)?.id)
      .filter(Boolean),
  );

  const req = (...wanted: string[]) => wanted.filter(w => ids.has(w));

  const levels: LevelDefinition[] = [
    { id: 'baseline',  name: 'Baseline',  minScore: 0.30 },
    { id: 'hygiene',   name: 'Hygiene',   minScore: 0.50, requiredChecks: req('change-approval') },
    { id: 'reliable',  name: 'Reliable',  minScore: 0.70, requiredChecks: req('slo-budget', 'change-approval') },
    // “Compliant” & “Exemplary” tighten requirements but only on checks that exist
    { id: 'compliant', name: 'Compliant', minScore: 0.85, requiredChecks: req('slo-budget','change-approval','incident-mttr','support-reopen','opa-production-readiness') },
    { id: 'exemplary', name: 'Exemplary', minScore: 0.95, requiredChecks: req('slo-budget','change-approval','incident-mttr','support-reopen','opa-production-readiness') },
  ];

  return levels;
};

export function registerEvaluateRoutes(router: express.Router) {
  router.post('/evaluate', async (req, res) => {
    const parsed = EvalBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const { entityRef, scorecardId } = parsed.data;

    if (isExampleWebsite(entityRef)) {
      ensureDemoArtifacts(entityRef);
    }

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
    const scorecardSvc = createScorecardService(facts, bus);

    const withLevels = new LevelledScorecardService(bus, levelsPolicy);
    const def: any = { id: scorecardId, name: scorecardId, checks: [] }; // minimal def
    const coreShim = { evaluate: (d: any, ref: string) => scorecardSvc.evaluate(ref, d.id) };
    const evalRes = await withLevels.evaluate(coreShim as any, def as any, entityRef);
    const levelColor = evalRes.level ? levelPalette[evalRes.level.id] : undefined;

    // Emit a bus event (captured into history by the global subscriber)
    const ev: BusEvent<EntityPayload> = {
      id: `eval-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'scorecards.evaluate.completed',
      payload: { entityRef, scorecardId, score: evalRes.score, rag: evalRes.rag },
    };
    bus.emit(ev);

    res.json({ ...evalRes, levelColor });
  });
}
