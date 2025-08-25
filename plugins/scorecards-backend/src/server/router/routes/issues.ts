import express from 'express';
import { EntityRefQuery } from '../../lib/schemas';
import { ensureDemoArtifacts, issuesByEntity } from '../../state/projects';
import { isExampleWebsite } from '../../lib/entityRef';

export function registerIssueRoutes(router: express.Router) {
  router.get('/issues', (req, res) => {
    const parsed = EntityRefQuery.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const { entityRef } = parsed.data;

    if (isExampleWebsite(entityRef)) {
      ensureDemoArtifacts(entityRef);
    }
    res.json(issuesByEntity[entityRef] ?? []);
  });
}
