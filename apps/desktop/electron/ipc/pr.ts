import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import { getDatabase, projects, issues, prDrafts } from '@repo-polisher/db';
import { GhCli } from '@repo-polisher/core';
import { eq, inArray, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { app } from 'electron';
import { join } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, statSync } from 'fs';
import simpleGit from 'simple-git';

const t = initTRPC.create({ isServer: true });

type DraftIssueRecord = {
  id: string;
  filePath: string;
  line: number;
  column: number;
  original: string | null;
  suggestion: string | null;
  context: string | null;
};

function ensureDirectory(path: string) {
  if (existsSync(path)) {
    const stats = statSync(path);
    if (!stats.isDirectory()) {
      rmSync(path, { recursive: true, force: true });
      mkdirSync(path, { recursive: true });
    }
    return;
  }

  mkdirSync(path, { recursive: true });
}

function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  // Match patterns like:
  // https://github.com/owner/repo.git
  // https://github.com/owner/repo
  // git@github.com:owner/repo.git
  // git@github.com:owner/repo
  const httpsMatch = url.match(/github\.com[/:]([^/]+)\/([^/.]+)/);
  if (httpsMatch) {
    return { owner: httpsMatch[1], repo: httpsMatch[2] };
  }
  return null;
}

async function ensureRepoPath(project: {
  source: string;
  localPath: string | null;
  localGitRemote: string | null;
  githubOwner: string | null;
  githubRepo: string | null;
  githubUrl: string | null;
}): Promise<{ repoPath: string; owner: string; repo: string }> {
  // For local projects, use the local path directly
  if (project.source === 'local' && project.localPath) {
    if (!existsSync(project.localPath)) {
      throw new Error(`Local project path not found: ${project.localPath}`);
    }

    // Try to parse GitHub info from git remote
    let owner: string | null = null;
    let repo: string | null = null;

    if (project.localGitRemote) {
      const parsed = parseGitHubUrl(project.localGitRemote);
      if (parsed) {
        owner = parsed.owner;
        repo = parsed.repo;
      }
    }

    if (!owner || !repo) {
      throw new Error('Local project does not have a valid GitHub remote. Cannot submit PR via gh-cli.');
    }

    return { repoPath: project.localPath, owner, repo };
  }

  // For GitHub projects, use cached clone
  if (!project.githubOwner || !project.githubRepo || !project.githubUrl) {
    throw new Error('Project is missing GitHub metadata');
  }

  const cacheDir = join(app.getPath('userData'), 'cache', 'repos');
  ensureDirectory(cacheDir);

  const ownerDir = join(cacheDir, project.githubOwner);
  ensureDirectory(ownerDir);

  const repoPath = join(ownerDir, project.githubRepo);
  const git = simpleGit();

  if (!existsSync(repoPath)) {
    try {
      await git.clone(project.githubUrl, repoPath, ['--depth', '1']);
    } catch (error) {
      if (!existsSync(repoPath)) {
        throw error;
      }
    }
    return { repoPath, owner: project.githubOwner, repo: project.githubRepo };
  }

  const stats = statSync(repoPath);
  if (!stats.isDirectory()) {
    rmSync(repoPath, { recursive: true, force: true });
    await git.clone(project.githubUrl, repoPath, ['--depth', '1']);
  }

  return { repoPath, owner: project.githubOwner, repo: project.githubRepo };
}

function detectNewline(content: string): string {
  const match = content.match(/\r\n|\n/);
  return match ? match[0] : '\n';
}

async function applyDraftIssueFixes(
  repoPath: string,
  draftIssues: DraftIssueRecord[]
): Promise<{ warnings: string[]; appliedIssueIds: string[] }> {
  if (draftIssues.length === 0) {
    throw new Error('No issues selected for this draft.');
  }

  const issuesByFile = new Map<string, DraftIssueRecord[]>();
  for (const issue of draftIssues) {
    if (!issue.filePath || !issue.original || !issue.suggestion) {
      continue;
    }
    const list = issuesByFile.get(issue.filePath) ?? [];
    list.push(issue);
    issuesByFile.set(issue.filePath, list);
  }

  if (issuesByFile.size === 0) {
    throw new Error('Selected issues do not contain auto-fix suggestions.');
  }

  const appliedIssueIds = new Set<string>();
  const warnings: string[] = [];

  for (const [relativePath, fileIssues] of issuesByFile.entries()) {
    const fullPath = join(repoPath, relativePath);
    if (!existsSync(fullPath)) {
      warnings.push(`File not found: ${relativePath}`);
      continue;
    }

    const originalContent = readFileSync(fullPath, 'utf8');
    const newline = detectNewline(originalContent);
    const lines = originalContent.split(/\r?\n/);
    let modified = false;

    const sortedIssues = [...fileIssues].sort((a, b) => {
      if (a.line === b.line) {
        return b.column - a.column;
      }
      return b.line - a.line;
    });

    for (const issue of sortedIssues) {
      let lineIndex = issue.line - 1;
      if (lineIndex < 0 || lineIndex >= lines.length) {
        const normalizedContext = issue.context?.trim();
        if (normalizedContext) {
          lineIndex = lines.findIndex((line) => line.trim() === normalizedContext);
        }
      }

      if (lineIndex < 0 || lineIndex >= lines.length) {
        warnings.push(`Cannot apply fix (line missing): ${issue.filePath}:${issue.line}`);
        continue;
      }

      let lineContent = lines[lineIndex];
      const target = issue.original!;
      const replacement = issue.suggestion!;
      const preferredIndex = Math.max(0, issue.column - 1);

      let matchIndex = lineContent.indexOf(target, preferredIndex);
      if (matchIndex === -1) {
        matchIndex = lineContent.indexOf(target);
      }

      if (matchIndex === -1 && issue.context) {
        const normalizedContext = issue.context.trim();
        const contextIndex = lines.findIndex((line) => line.trim() === normalizedContext);
        if (contextIndex !== -1) {
          lineIndex = contextIndex;
          lineContent = lines[lineIndex];
          matchIndex = lineContent.indexOf(target);
        }
      }

      if (matchIndex === -1) {
        warnings.push(`Cannot find "${target}" in ${issue.filePath}:${issue.line}`);
        continue;
      }

      lines[lineIndex] =
        lineContent.slice(0, matchIndex) + replacement + lineContent.slice(matchIndex + target.length);
      modified = true;
      appliedIssueIds.add(issue.id);
    }

    if (modified) {
      writeFileSync(fullPath, lines.join(newline), 'utf8');
    }
  }

  if (appliedIssueIds.size === 0) {
    const reason = warnings[0] ? ` ${warnings[0]}` : '';
    throw new Error(`No fixes were applied; working tree is already clean.${reason}`);
  }

  return { warnings, appliedIssueIds: Array.from(appliedIssueIds) };
}

export const prRouter = t.router({
  // Create PR draft from selected issues
  createDraft: t.procedure
    .input(
      z.object({
        projectId: z.string(),
        issueIds: z.array(z.string()),
        title: z.string().optional(),
        body: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDatabase();

      // Get project
      const [project] = await db.select().from(projects).where(eq(projects.id, input.projectId));
      if (!project) {
        throw new Error('Project not found');
      }

      // Get selected issues
      const selectedIssues = await db
        .select()
        .from(issues)
        .where(inArray(issues.id, input.issueIds));

      if (selectedIssues.length === 0) {
        throw new Error('No issues selected');
      }

      // Generate PR title and body
      const title =
        input.title ||
        `fix: correct ${selectedIssues.length} typo${selectedIssues.length > 1 ? 's' : ''} in codebase`;

      const issueList = selectedIssues
        .slice(0, 20)
        .map((i) => `- \`${i.original}\` → \`${i.suggestion}\` in \`${i.filePath}:${i.line}\``)
        .join('\n');

      const body =
        input.body ||
        `## Summary

This PR fixes ${selectedIssues.length} typo${selectedIssues.length > 1 ? 's' : ''} found in the codebase.

## Changes

${issueList}${selectedIssues.length > 20 ? `\n- ... and ${selectedIssues.length - 20} more` : ''}

---
Generated by [RepoPolisher](https://github.com/user/repo-polisher)`;

      // Generate branch name
      const branch = `fix/typos-${Date.now()}`;
      const baseBranch = 'main';

      // Create draft
      const draftId = nanoid();
      const now = new Date();

      await db.insert(prDrafts).values({
        id: draftId,
        projectId: input.projectId,
        title,
        body,
        branch,
        baseBranch,
        issueIds: input.issueIds,
        files: [],
        status: 'draft',
        createdAt: now,
        updatedAt: now,
      });

      // Mark issues as included
      await db
        .update(issues)
        .set({ status: 'included' })
        .where(inArray(issues.id, input.issueIds));

      return { draftId, title, body, branch };
    }),

  // Get PR draft
  getDraft: t.procedure
    .input(z.object({ draftId: z.string() }))
    .query(async ({ input }) => {
      const db = getDatabase();
      const [draft] = await db.select().from(prDrafts).where(eq(prDrafts.id, input.draftId));
      return draft || null;
    }),

  // List PR drafts for a project
  listDrafts: t.procedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input }) => {
      const db = getDatabase();
      return db
        .select()
        .from(prDrafts)
        .where(eq(prDrafts.projectId, input.projectId))
        .orderBy(desc(prDrafts.createdAt));
    }),

  // Update PR draft
  updateDraft: t.procedure
    .input(
      z.object({
        draftId: z.string(),
        title: z.string().optional(),
        body: z.string().optional(),
        status: z.enum(['draft', 'ready']).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDatabase();
      const updates: Record<string, any> = { updatedAt: new Date() };

      if (input.title) updates.title = input.title;
      if (input.body) updates.body = input.body;
      if (input.status) updates.status = input.status;

      await db.update(prDrafts).set(updates).where(eq(prDrafts.id, input.draftId));
      return { success: true };
    }),

  // Submit PR
  submit: t.procedure
    .input(
      z.object({
        draftId: z.string(),
        method: z.enum(['gh-cli', 'local']).default('gh-cli'),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const db = getDatabase();

        // Get draft
        const [draft] = await db.select().from(prDrafts).where(eq(prDrafts.id, input.draftId));
        if (!draft) {
          throw new Error('Draft not found');
        }

        // Get project
        const [project] = await db.select().from(projects).where(eq(projects.id, draft.projectId));
        if (!project) {
          throw new Error('Project not found');
        }

        if (input.method === 'local') {
          // For local projects, just mark as submitted (changes applied directly)
          await db
            .update(prDrafts)
            .set({
              status: 'submitted',
              submitMethod: 'local',
              submittedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(prDrafts.id, input.draftId));

          return { success: true, message: 'Changes applied locally' };
        }

        // Submit via gh-cli
        const { repoPath } = await ensureRepoPath(project);
        const draftIssues = draft.issueIds?.length
          ? await db.select().from(issues).where(inArray(issues.id, draft.issueIds))
          : [];
        const { warnings, appliedIssueIds } = await applyDraftIssueFixes(
          repoPath,
          draftIssues as DraftIssueRecord[]
        );

        if (warnings.length > 0) {
          console.warn('PR submit warnings:', warnings);
        }

        const ghCli = new GhCli({ workDir: repoPath });
        const result = await ghCli.createPR({
          ...draft,
          issueIds: draft.issueIds || [],
          files: draft.files || [],
          createdAt: draft.createdAt,
          updatedAt: draft.updatedAt,
        });

        if (result.success) {
          await db
            .update(prDrafts)
            .set({
              status: 'submitted',
              submitMethod: 'gh-cli',
              prUrl: result.prUrl,
              prNumber: result.prNumber,
              submittedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(prDrafts.id, input.draftId));

          // Mark issues as fixed
          if (appliedIssueIds.length > 0) {
            await db
              .update(issues)
              .set({ status: 'fixed' })
              .where(inArray(issues.id, appliedIssueIds));
          }

          // Re-open issues that could not be auto-fixed
          if (draft.issueIds && draft.issueIds.length > 0) {
            const appliedSet = new Set(appliedIssueIds);
            const skippedIssueIds = draft.issueIds.filter((id) => !appliedSet.has(id));
            if (skippedIssueIds.length > 0) {
              await db
                .update(issues)
                .set({ status: 'open' })
                .where(inArray(issues.id, skippedIssueIds));
            }
          }
        }

        return warnings.length > 0 ? { ...result, warnings } : result;
      } catch (error) {
        console.error('PR submit failed:', error);
        throw error;
      }
    }),

  // Delete draft
  deleteDraft: t.procedure
    .input(z.object({ draftId: z.string() }))
    .mutation(async ({ input }) => {
      const db = getDatabase();

      // Get draft to restore issue status
      const [draft] = await db.select().from(prDrafts).where(eq(prDrafts.id, input.draftId));

      if (draft?.issueIds) {
        await db
          .update(issues)
          .set({ status: 'open' })
          .where(inArray(issues.id, draft.issueIds));
      }

      await db.delete(prDrafts).where(eq(prDrafts.id, input.draftId));
      return { success: true };
    }),
});
