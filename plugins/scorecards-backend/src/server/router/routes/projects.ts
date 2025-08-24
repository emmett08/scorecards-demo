import express from 'express';
import { getProjectsDTO } from '../../state/projects';

export function registerProjectRoutes(router: express.Router) {
  router.get('/projects', (_req, res) => {
    res.json(getProjectsDTO());
  });
}
