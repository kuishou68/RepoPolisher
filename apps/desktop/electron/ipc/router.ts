import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import { projectRouter } from './projects';
import { analysisRouter } from './analysis';
import { prRouter } from './pr';
import { settingsRouter } from './settings';

const t = initTRPC.create({ isServer: true });

export const appRouter = t.router({
  projects: projectRouter,
  analysis: analysisRouter,
  pr: prRouter,
  settings: settingsRouter,

  // Health check
  ping: t.procedure.query(() => 'pong'),
});

export type AppRouter = typeof appRouter;
