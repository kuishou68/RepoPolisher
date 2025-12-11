import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  source: text('source', { enum: ['github', 'local'] }).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  category: text('category', { enum: ['ai', 'web', 'cli', 'library', 'other'] }).notNull(),
  languages: text('languages', { mode: 'json' }).$type<Record<string, number>>(),

  // GitHub specific
  githubOwner: text('github_owner'),
  githubRepo: text('github_repo'),
  githubStars: integer('github_stars'),
  githubForks: integer('github_forks'),
  githubLastCommit: integer('github_last_commit', { mode: 'timestamp' }),
  githubContributors: integer('github_contributors'),
  githubTopics: text('github_topics', { mode: 'json' }).$type<string[]>(),
  githubUrl: text('github_url'),

  // Local specific
  localPath: text('local_path'),
  localGitRemote: text('local_git_remote'),
  localLastModified: integer('local_last_modified', { mode: 'timestamp' }),

  // Analysis
  lastAnalyzed: integer('last_analyzed', { mode: 'timestamp' }),
  analysisCount: integer('analysis_count').default(0),
  issuesFound: integer('issues_found').default(0),

  // Timestamps
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const analysisTasks = sqliteTable('analysis_tasks', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  type: text('type', { enum: ['typo', 'lint', 'ai'] }).notNull(),
  status: text('status', { enum: ['pending', 'running', 'completed', 'failed'] }).notNull(),
  progress: real('progress').default(0),
  startedAt: integer('started_at', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  issuesFound: integer('issues_found').default(0),
  filesScanned: integer('files_scanned').default(0),
  error: text('error'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const issues = sqliteTable('issues', {
  id: text('id').primaryKey(),
  taskId: text('task_id')
    .notNull()
    .references(() => analysisTasks.id, { onDelete: 'cascade' }),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  type: text('type', { enum: ['typo', 'lint', 'ai'] }).notNull(),
  filePath: text('file_path').notNull(),
  line: integer('line').notNull(),
  column: integer('column').notNull(),
  message: text('message').notNull(),
  severity: text('severity', { enum: ['error', 'warning', 'info'] }).notNull(),
  original: text('original'),
  suggestion: text('suggestion'),
  context: text('context'),
  confidence: real('confidence'),
  status: text('status', { enum: ['open', 'included', 'ignored', 'fixed'] }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const prDrafts = sqliteTable('pr_drafts', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  body: text('body').notNull(),
  branch: text('branch').notNull(),
  baseBranch: text('base_branch').notNull(),
  issueIds: text('issue_ids', { mode: 'json' }).$type<string[]>(),
  files: text('files', { mode: 'json' }).$type<
    Array<{ path: string; additions: number; deletions: number; patch: string }>
  >(),
  status: text('status', { enum: ['draft', 'ready', 'submitted', 'merged', 'closed'] }).notNull(),
  prUrl: text('pr_url'),
  prNumber: integer('pr_number'),
  submitMethod: text('submit_method', { enum: ['gh-cli', 'oauth', 'local'] }),
  submittedAt: integer('submitted_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value', { mode: 'json' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});
