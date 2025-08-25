import express from 'express';

export function registerHealthRoutes(router: express.Router) {
  router.get('/health', (_req, res) => res.json({ status: 'ok' }));
}
