import { createFrontendPlugin, PageBlueprint, NavItemBlueprint, ApiBlueprint } from '@backstage/frontend-plugin-api';
import { EntityContentBlueprint } from '@backstage/plugin-catalog-react/alpha';
import { scorecardsRootRouteRef, entityScorecardsRouteRef, viewEntityRouteRef } from './routes';
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

const scorecardsApi = ApiBlueprint.make({
  name: 'scorecardsApi',
  params: define =>
    define({
      api: scorecardsApiRef,
      deps: {},
      factory: () => new DefaultScorecardsApi('/api/scorecards'),
    }),
});

export const scorecardsPlugin = createFrontendPlugin({
  pluginId: 'scorecards',
  extensions: [scorecardsApi, scorecardsPage, scorecardsNavItem, scorecardsEntityContent],
  routes: { root: scorecardsRootRouteRef, entity: entityScorecardsRouteRef },
  externalRoutes: { viewEntity: viewEntityRouteRef },
  featureFlags: [{ name: 'scorecards-enable-tab' }],
});

export default scorecardsPlugin;
