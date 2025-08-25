import express from 'express';
import { registerHealthRoutes } from './routes/health';
import { registerEvaluateRoutes } from './routes/evaluate';
import { registerEventRoutes } from './routes/events';
import { registerTrackRoutes } from './routes/tracks';
import { registerIssueRoutes } from './routes/issues';
import { registerProjectRoutes } from './routes/projects';
import { ensureDemoTicker } from '../demo/ticker';
import { bus } from '../state/bus';

export function createRouter(): express.Router {
  const router = express.Router();
  router.use(express.json());
  router.use(express.urlencoded({ extended: true }));

  registerHealthRoutes(router);
  registerEvaluateRoutes(router);
  registerEventRoutes(router);
  registerTrackRoutes(router);
  registerIssueRoutes(router);
  registerProjectRoutes(router);

  // Start demo events (idempotent)
  ensureDemoTicker(bus);

  return router;
}
