import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import { getDatabase, projects } from '@repo-polisher/db';
import { GitHubAPI, LocalScanner } from '@repo-polisher/core';
import { eq, desc, asc, like, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';

const t = initTRPC.create({ isServer: true });

export const projectRouter = t.router({
  // List all projects
  list: t.procedure
    .input(
      z.object({
        source: z.enum(['github', 'local']).optional(),
        category: z.enum(['ai', 'web', 'cli', 'library', 'other']).optional(),
        search: z.string().optional(),
        sortBy: z.enum(['stars', 'name', 'updatedAt', 'issuesFound']).default('updatedAt'),
        sortOrder: z.enum(['asc', 'desc']).default('desc'),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = getDatabase();
      const opts = input || {};

      let query = db.select().from(projects);

      // Apply filters
      const conditions = [];
      if (opts.source) {
        conditions.push(eq(projects.source, opts.source));
      }
      if (opts.category) {
        conditions.push(eq(projects.category, opts.category));
      }
      if (opts.search) {
        conditions.push(like(projects.name, `%${opts.search}%`));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      // Apply sorting
      const sortColumn = {
        stars: projects.githubStars,
        name: projects.name,
        updatedAt: projects.updatedAt,
        issuesFound: projects.issuesFound,
      }[opts.sortBy || 'updatedAt'];

      query = query.orderBy(
        opts.sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn)
      ) as any;

      // Apply pagination
      query = query.limit(opts.limit || 50).offset(opts.offset || 0) as any;

      return query;
    }),

  // Get single project
  get: t.procedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const db = getDatabase();
      const result = await db.select().from(projects).where(eq(projects.id, input.id));
      return result[0] || null;
    }),

  // Add local project
  addLocal: t.procedure
    .input(z.object({ path: z.string() }))
    .mutation(async ({ input }) => {
      const scanner = new LocalScanner();
      const project = await scanner.scanDirectory(input.path);

      if (!project) {
        throw new Error('Invalid project directory');
      }

      const db = getDatabase();
      const now = new Date();

      await db.insert(projects).values({
        id: project.id,
        source: 'local',
        name: project.name,
        description: project.description,
        category: project.category,
        languages: project.languages,
        localPath: project.local?.path,
        localGitRemote: project.local?.gitRemote,
        localLastModified: project.local?.lastModified,
        analysisCount: 0,
        issuesFound: 0,
        createdAt: now,
        updatedAt: now,
      });

      return project;
    }),

  // Remove project
  remove: t.procedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const db = getDatabase();
      await db.delete(projects).where(eq(projects.id, input.id));
      return { success: true };
    }),

  // Fetch trending GitHub projects
  fetchTrending: t.procedure
    .input(
      z.object({
        category: z.enum(['ai', 'all']).default('ai'),
        limit: z.number().min(1).max(100).default(30),
      }).optional()
    )
    .mutation(async ({ input }) => {
      const opts = input || { category: 'ai', limit: 30 };
      const api = new GitHubAPI();

      const fetchedProjects =
        opts.category === 'ai'
          ? await api.getTrendingAIProjects({ limit: opts.limit })
          : await api.searchRepositories('stars:>1000', {
              minStars: 1000,
              perPage: opts.limit,
            });

      const db = getDatabase();
      const now = new Date();

      for (const project of fetchedProjects) {
        // Check if already exists
        const existing = await db
          .select()
          .from(projects)
          .where(eq(projects.name, project.name));

        if (existing.length === 0) {
          await db.insert(projects).values({
            id: project.id,
            source: 'github',
            name: project.name,
            description: project.description,
            category: project.category,
            languages: project.languages,
            githubOwner: project.github?.owner,
            githubRepo: project.github?.repo,
            githubStars: project.github?.stars,
            githubForks: project.github?.forks,
            githubLastCommit: project.github?.lastCommit,
            githubContributors: project.github?.contributors,
            githubTopics: project.github?.topics,
            githubUrl: project.github?.url,
            analysisCount: 0,
            issuesFound: 0,
            createdAt: now,
            updatedAt: now,
          });
        }
      }

      return { count: fetchedProjects.length };
    }),

  // Get project stats
  stats: t.procedure.query(async () => {
    const db = getDatabase();

    const allProjects = await db.select().from(projects);

    const stats = {
      total: allProjects.length,
      bySource: {
        github: allProjects.filter((p) => p.source === 'github').length,
        local: allProjects.filter((p) => p.source === 'local').length,
      },
      byCategory: {
        ai: allProjects.filter((p) => p.category === 'ai').length,
        web: allProjects.filter((p) => p.category === 'web').length,
        cli: allProjects.filter((p) => p.category === 'cli').length,
        library: allProjects.filter((p) => p.category === 'library').length,
        other: allProjects.filter((p) => p.category === 'other').length,
      },
      analyzed: allProjects.filter((p) => p.lastAnalyzed).length,
      withIssues: allProjects.filter((p) => (p.issuesFound || 0) > 0).length,
    };

    return stats;
  }),
});
