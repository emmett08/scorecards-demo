import { BusEvent } from '@emmett08/scorecards-framework';
import { bus } from './bus';
import { normalizeEntityRef } from '../lib/entityRef';

export type EntityPayload = { entityRef: string; [k: string]: unknown };

export const eventHistory: BusEvent<EntityPayload>[] = [];
const MAX_HISTORY = 5000;

function push(e: BusEvent<EntityPayload>) {
  eventHistory.push(e);
  if (eventHistory.length > MAX_HISTORY) {
    eventHistory.splice(0, eventHistory.length - MAX_HISTORY);
  }
}

// Capture everything into history.
bus.subscribe(push);

export function selectEventsByEntitySince(
  entityRef: string,
  sinceTs: number,
): BusEvent<EntityPayload>[] {
  const qRef = normalizeEntityRef(entityRef);
  return eventHistory.filter(e =>
    normalizeEntityRef(String((e as any)?.payload?.entityRef ?? '')) === qRef &&
    new Date(e.timestamp).getTime() >= sinceTs,
  );
}
