/* eslint-disable no-console */
import { createApp } from '@backstage/frontend-defaults';
import { createRoot } from 'react-dom/client';

import '@backstage/cli/asset-types';
import '@backstage/ui/css/styles.css';

import scorecardsPlugin from '@internal/plugin-scorecards';
import catalogPlugin from '@backstage/plugin-catalog/alpha';
import scaffolderPlugin from '@backstage/plugin-scaffolder/alpha';
import orgPlugin from '@backstage/plugin-org/alpha';
import apiDocsPlugin from '@backstage/plugin-api-docs/alpha';
import techdocsPlugin from '@backstage/plugin-techdocs/alpha';

const app = createApp({
  features: [
    catalogPlugin,
    scaffolderPlugin,
    orgPlugin,
    techdocsPlugin,
    scorecardsPlugin,
    apiDocsPlugin,
  ],
});

const root = document.getElementById('root');
createRoot(root!).render(app.createRoot());
