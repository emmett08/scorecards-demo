import { createRouteRef, createExternalRouteRef } from '@backstage/frontend-plugin-api';

export const scorecardsRootRouteRef = createRouteRef();
export const entityScorecardsRouteRef = createRouteRef();

export const viewEntityRouteRef = createExternalRouteRef<{
  name: string; kind: string; namespace: string;
}>({
  params: ['name', 'kind', 'namespace'],
});
