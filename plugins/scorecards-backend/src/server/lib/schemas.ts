import { z } from 'zod';

export const EvalBody = z.object({
  entityRef: z.string(),
  scorecardId: z.string().default('compliance'),
});

export const EntityRefQuery = z.object({
  entityRef: z.string(),
});

// Coerce ?since=undefined|null|'' → undefined
const coerceOptionalDateTime = z.preprocess(v => {
  if (v === undefined || v === null) return undefined;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (!s || s === 'undefined' || s === 'null') return undefined;
    return v;
  }
  return v;
}, z.string().datetime().optional());

export const EventsQuery = z.object({
  entityRef: z.string(),
  since: coerceOptionalDateTime,
});
