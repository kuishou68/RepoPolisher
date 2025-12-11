import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import { getDatabase, projects, analysisTasks, issues } from '@repo-polisher/db';
import { TypoChecker, AuthChecker } from '@repo-polisher/core';
import { eq, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { app } from 'electron';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import simpleGit from 'simple-git';

const t = initTRPC.create({ isServer: true });

// Cache directory for cloned repos
function getCacheDir(): string {
  const cacheDir = join(app.getPath('userData'), 'cache', 'repos');
  if (!existsSync(cacheDir)) {
    mkdirSync(cacheDir, { recursive: true });
  }
  return cacheDir;
}

export const analysisRouter = t.router({
  // Start analysis for a project
  start: t.procedure
    .input(
      z.object({
        projectId: z.string(),
        type: z.enum(['typo']).default('typo'),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDatabase();

      // Get project
      const [project] = await db.select().from(projects).where(eq(projects.id, input.projectId));
      if (!project) {
        throw new Error('Project not found');
      }

      // Create analysis task
      const taskId = nanoid();
      const now = new Date();

      await db.insert(analysisTasks).values({
        id: taskId,
        projectId: input.projectId,
        type: input.type,
        status: 'running',
        progress: 0,
        startedAt: now,
        issuesFound: 0,
        filesScanned: 0,
        createdAt: now,
      });

      // Get project path
      let projectPath: string;

      if (project.source === 'local') {
        projectPath = project.localPath!;
      } else {
        // Clone GitHub repo if needed
        const cacheDir = getCacheDir();
        projectPath = join(cacheDir, project.githubOwner!, project.githubRepo!);

        if (!existsSync(projectPath)) {
          mkdirSync(join(cacheDir, project.githubOwner!), { recursive: true });
          const git = simpleGit();
          await git.clone(project.githubUrl!, projectPath, ['--depth', '1']);
        } else {
          // Reset to latest remote state (handles untracked files conflict)
          const git = simpleGit(projectPath);
          try {
            // Clean untracked files and directories
            await git.clean('f', ['-d']);
            // Fetch latest and reset to origin
            await git.fetch(['--depth', '1', 'origin']);
            const defaultBranch = (await git.revparse(['--abbrev-ref', 'origin/HEAD'])).replace('origin/', '').trim();
            await git.reset(['--hard', `origin/${defaultBranch}`]);
          } catch {
            // If reset fails, delete and re-clone
            const { rmSync } = await import('fs');
            rmSync(projectPath, { recursive: true, force: true });
            await git.clone(project.githubUrl!, projectPath, ['--depth', '1']);
          }
        }
      }

      // Run analysis
      try {
        const checker = new TypoChecker();
        const foundIssues = await checker.check(projectPath, taskId, input.projectId);

        // Save issues
        for (const issue of foundIssues) {
          await db.insert(issues).values({
            id: issue.id,
            taskId: issue.taskId,
            projectId: issue.projectId,
            type: 'typo',
            filePath: issue.filePath,
            line: issue.line,
            column: issue.column,
            message: issue.message,
            severity: 'warning',
            original: issue.original,
            suggestion: issue.suggestion,
            context: issue.context,
            confidence: issue.confidence,
            status: 'open',
            createdAt: now,
          });
        }

        // Update task
        await db
          .update(analysisTasks)
          .set({
            status: 'completed',
            progress: 100,
            completedAt: new Date(),
            issuesFound: foundIssues.length,
          })
          .where(eq(analysisTasks.id, taskId));

        // Update project
        await db
          .update(projects)
          .set({
            lastAnalyzed: new Date(),
            analysisCount: (project.analysisCount || 0) + 1,
            issuesFound: foundIssues.length,
            updatedAt: new Date(),
          })
          .where(eq(projects.id, input.projectId));

        return { taskId, issuesFound: foundIssues.length };
      } catch (error) {
        // Update task with error
        await db
          .update(analysisTasks)
          .set({
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            completedAt: new Date(),
          })
          .where(eq(analysisTasks.id, taskId));

        throw error;
      }
    }),

  // Get analysis task
  getTask: t.procedure
    .input(z.object({ taskId: z.string() }))
    .query(async ({ input }) => {
      const db = getDatabase();
      const [task] = await db.select().from(analysisTasks).where(eq(analysisTasks.id, input.taskId));
      return task || null;
    }),

  // Get issues for a project
  getIssues: t.procedure
    .input(
      z.object({
        projectId: z.string(),
        status: z.enum(['open', 'included', 'ignored', 'fixed']).optional(),
      })
    )
    .query(async ({ input }) => {
      const db = getDatabase();
      let query = db.select().from(issues).where(eq(issues.projectId, input.projectId));

      if (input.status) {
        query = query.where(eq(issues.status, input.status)) as any;
      }

      return query.orderBy(desc(issues.createdAt));
    }),

  // Update issue status
  updateIssueStatus: t.procedure
    .input(
      z.object({
        issueId: z.string(),
        status: z.enum(['open', 'included', 'ignored', 'fixed']),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDatabase();
      await db.update(issues).set({ status: input.status }).where(eq(issues.id, input.issueId));
      return { success: true };
    }),

  // Batch update issue status
  updateBatchIssueStatus: t.procedure
    .input(
      z.object({
        issueIds: z.array(z.string()),
        status: z.enum(['open', 'included', 'ignored', 'fixed']),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDatabase();
      for (const issueId of input.issueIds) {
        await db.update(issues).set({ status: input.status }).where(eq(issues.id, issueId));
      }
      return { success: true, count: input.issueIds.length };
    }),

  // Get analysis history for a project
  history: t.procedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input }) => {
      const db = getDatabase();
      return db
        .select()
        .from(analysisTasks)
        .where(eq(analysisTasks.projectId, input.projectId))
        .orderBy(desc(analysisTasks.createdAt));
    }),

  // Check if typos-cli is available
  checkTypos: t.procedure.query(async () => {
    const checker = new TypoChecker();
    const available = await checker.isAvailable();
    const version = available ? await checker.getVersion() : null;
    return { available, version };
  }),

  // Check auth status
  checkAuth: t.procedure.query(async () => {
    const authChecker = new AuthChecker();
    return authChecker.checkAll();
  }),

  // Get project path (local path or cached clone path)
  getProjectPath: t.procedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input }) => {
      const db = getDatabase();
      const [project] = await db.select().from(projects).where(eq(projects.id, input.projectId));

      if (!project) return null;

      if (project.source === 'local') {
        return project.localPath;
      } else {
        // GitHub project - return cached clone path
        const cacheDir = getCacheDir();
        const projectPath = join(cacheDir, project.githubOwner!, project.githubRepo!);
        return existsSync(projectPath) ? projectPath : null;
      }
    }),
});
