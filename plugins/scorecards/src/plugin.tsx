import { createFrontendPlugin, PageBlueprint, NavItemBlueprint, ApiBlueprint, discoveryApiRef, fetchApiRef, identityApiRef } from '@backstage/frontend-plugin-api';
import { EntityContentBlueprint } from '@backstage/plugin-catalog-react/alpha';
import { scorecardsRootRouteRef, entityScorecardsRouteRef, viewEntityRouteRef, entityEventsRouteRef } from './routes';
import { DefaultScorecardsApi, scorecardsApiRef } from './api';
import { Assessment } from '@mui/icons-material';

const scorecardsPage = PageBlueprint.make({
  params: {
    routeRef: scorecardsRootRouteRef,
    path: '/scorecards',
    loader: () => import('./components/ScorecardsPage').then(m => <m.ScorecardsPage />),
  },
});

const scorecardsNavItem = NavItemBlueprint.make({
  params: {
    routeRef: scorecardsRootRouteRef,
    title: 'Scorecards',
    icon: Assessment,
  },
});

const scorecardsEntityContent = EntityContentBlueprint.make({
  params: {
    path: 'scorecards',
    title: 'Scorecards',
    routeRef: entityScorecardsRouteRef,
    loader: () => import('./components/EntityScorecardContent').then(m => <m.EntityScorecardContent />),
  },
});

const entityEventsContent = EntityContentBlueprint.make({
  name: 'entityEventsContent',
  params: {
    path: 'events-stream',
    title: 'Events',
    routeRef: entityEventsRouteRef,
    loader: () =>
      import('./components/EntityEventsContent').then(m => <m.EntityEventsContent />),
  },
});

const scorecardsApi = ApiBlueprint.make({
  name: 'scorecardsApi',
  params: define =>
    define({
      api: scorecardsApiRef,
      deps: {
        discoveryApi: discoveryApiRef,
        identityApi: identityApiRef,
        fetchApi: fetchApiRef,
      },
      factory: ({ discoveryApi, identityApi, fetchApi }) =>
        new DefaultScorecardsApi({
          discoveryApi,
          identityApi,
          fetchApi,
          basePath: 'scorecards',
        }),
    }),
});

export const scorecardsPlugin = createFrontendPlugin({
  pluginId: 'scorecards',
  extensions: [
    scorecardsApi,
    scorecardsPage,
    scorecardsNavItem,
    scorecardsEntityContent,
    entityEventsContent,
  ],
  routes: { root: scorecardsRootRouteRef, entity: entityScorecardsRouteRef, events: entityEventsRouteRef },
  externalRoutes: { viewEntity: viewEntityRouteRef },
  featureFlags: [{ name: 'scorecards-enable-tab' }],
});
