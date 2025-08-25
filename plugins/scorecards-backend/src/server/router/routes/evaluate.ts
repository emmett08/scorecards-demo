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
import { EvalBody } from '../../lib/schemas';
import { ensureDemoArtifacts } from '../../state/projects';
import { isExampleWebsite } from '../../lib/entityRef';
import { dd, snow, sup } from '../../services/clients';
import { store } from '../../state/store';
import { createScorecardService } from '../../services/scorecards';
import { bus } from '../../state/bus';
import type { EntityPayload } from '../../state/history';

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

    const evalRes = await scorecardSvc.evaluate(entityRef, scorecardId);

    // Emit a bus event (captured into history by the global subscriber)
    const ev: BusEvent<EntityPayload> = {
      id: `eval-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'scorecards.evaluate.completed',
      payload: { entityRef, scorecardId, score: evalRes.score, rag: evalRes.rag },
    };
    bus.emit(ev);

    res.json(evalRes);
  });
}
