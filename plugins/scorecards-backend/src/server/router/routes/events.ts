import express from 'express';
import { EventsQuery } from '../../lib/schemas';
import { setupSseHeaders, sseSend, ssePing } from '../../lib/sse';
import { selectEventsByEntitySince } from '../../state/history';
import { bus } from '../../state/bus';
import type { BusEvent } from '@emmett08/scorecards-framework';
import type { EntityPayload } from '../../state/history';
import { normalizeEntityRef } from '../../lib/entityRef';

export function registerEventRoutes(router: express.Router) {
  // Polling endpoint (compat)
  router.get('/events', (req, res) => {
    const parsed = EventsQuery.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const { entityRef, since } = parsed.data;
    const sinceTs = since ? new Date(since).getTime() : 0;
    const items = selectEventsByEntitySince(entityRef, sinceTs);
    res.json(items);
  });

  // SSE endpoint
  router.get('/events/stream', (req, res) => {
    const parsed = EventsQuery.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const { entityRef, since } = parsed.data;

    setupSseHeaders(res);

    // 1) Backlog — one SSE frame per event
    const sinceTs = since ? new Date(since).getTime() : 0;
    const backlog = selectEventsByEntitySince(entityRef, sinceTs);
    for (const item of backlog) sseSend(res, item);

    // 2) Live subscription
    let closed = false;
    const qRef = normalizeEntityRef(entityRef);
    const handler = (e: BusEvent<EntityPayload>) => {
      if (closed) return;
      if (normalizeEntityRef(String(e.payload?.entityRef ?? '')) === qRef) {
        sseSend(res, e);
      }
    };
    const unsubscribe = (bus.subscribe(handler) as unknown as (() => void) | undefined);

    // 3) Heartbeat
    const heartbeat = setInterval(() => ssePing(res), 1500);

    // 4) Cleanup
    req.on('close', () => {
      closed = true;
      clearInterval(heartbeat);
      try { unsubscribe?.(); } catch { /* ignore */ }
      res.end();
    });
  });
}
