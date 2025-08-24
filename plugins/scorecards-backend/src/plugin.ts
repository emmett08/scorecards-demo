import { coreServices, createBackendPlugin } from '@backstage/backend-plugin-api';
import { createRouter } from './service/router';

export const scorecardsBackendPlugin = createBackendPlugin({
  pluginId: 'scorecards',
  register(env) {
    env.registerInit({
      deps: {
        logger: coreServices.logger,
        httpRouter: coreServices.httpRouter,
      },
      async init({ logger, httpRouter }) {
        logger.info('Initialising scorecards backend plugin');
        httpRouter.use(createRouter());
      },
    });
  },
});
