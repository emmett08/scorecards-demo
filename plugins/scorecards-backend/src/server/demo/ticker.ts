import type { EventBus } from '@emmett08/scorecards-framework/events';
import { TARGET } from '../lib/entityRef';
import type { EntityPayload } from '../state/history';

let started = false;
let timer: NodeJS.Timeout | undefined;

export function ensureDemoTicker(bus: EventBus) {
  if (started) return;
  started = true;

  timer = setInterval(() => {
    const now = new Date();
    const ev = {
      id: `tick-${now.getTime()}`,
      timestamp: now.toISOString(),
      type: 'demo.tick',
      payload: {
        entityRef: TARGET,
        seq: now.getTime(),
        note: 'heartbeat',
      } as EntityPayload,
    };
    // history is maintained by the global subscriber
    bus.emit(ev as any);
  }, 60000);
}

export function stopDemoTicker() {
  if (timer) clearInterval(timer);
  started = false;
}
