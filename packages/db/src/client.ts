import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let sqlite: Database.Database | null = null;

export function getDbPath(userDataPath: string): string {
  const dbDir = join(userDataPath, 'data');
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }
  return join(dbDir, 'repo-polisher.db');
}

export function initDatabase(userDataPath: string) {
  if (db) return db;

  const dbPath = getDbPath(userDataPath);
  sqlite = new Database(dbPath);

  // Enable WAL mode for better performance
  sqlite.pragma('journal_mode = WAL');

  db = drizzle(sqlite, { schema });

  // Run migrations or create tables
  createTables(sqlite);

  return db;
}

export function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase first.');
  }
  return db;
}

export function closeDatabase() {
  if (sqlite) {
    sqlite.close();
    sqlite = null;
    db = null;
  }
}

function createTables(sqlite: Database.Database) {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL CHECK (source IN ('github', 'local')),
      name TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL CHECK (category IN ('ai', 'web', 'cli', 'library', 'other')),
      languages TEXT,
      github_owner TEXT,
      github_repo TEXT,
      github_stars INTEGER,
      github_forks INTEGER,
      github_last_commit INTEGER,
      github_contributors INTEGER,
      github_topics TEXT,
      github_url TEXT,
      local_path TEXT,
      local_git_remote TEXT,
      local_last_modified INTEGER,
      last_analyzed INTEGER,
      analysis_count INTEGER DEFAULT 0,
      issues_found INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS analysis_tasks (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK (type IN ('typo', 'lint', 'ai')),
      status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
      progress REAL DEFAULT 0,
      started_at INTEGER,
      completed_at INTEGER,
      issues_found INTEGER DEFAULT 0,
      files_scanned INTEGER DEFAULT 0,
      error TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS issues (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES analysis_tasks(id) ON DELETE CASCADE,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK (type IN ('typo', 'lint', 'ai')),
      file_path TEXT NOT NULL,
      line INTEGER NOT NULL,
      "column" INTEGER NOT NULL,
      message TEXT NOT NULL,
      severity TEXT NOT NULL CHECK (severity IN ('error', 'warning', 'info')),
      original TEXT,
      suggestion TEXT,
      context TEXT,
      confidence REAL,
      status TEXT NOT NULL CHECK (status IN ('open', 'included', 'ignored', 'fixed')),
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pr_drafts (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      branch TEXT NOT NULL,
      base_branch TEXT NOT NULL,
      issue_ids TEXT,
      files TEXT,
      status TEXT NOT NULL CHECK (status IN ('draft', 'ready', 'submitted', 'merged', 'closed')),
      pr_url TEXT,
      pr_number INTEGER,
      submit_method TEXT CHECK (submit_method IN ('gh-cli', 'oauth', 'local')),
      submitted_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_projects_source ON projects(source);
    CREATE INDEX IF NOT EXISTS idx_projects_category ON projects(category);
    CREATE INDEX IF NOT EXISTS idx_analysis_tasks_project_id ON analysis_tasks(project_id);
    CREATE INDEX IF NOT EXISTS idx_issues_project_id ON issues(project_id);
    CREATE INDEX IF NOT EXISTS idx_issues_task_id ON issues(task_id);
    CREATE INDEX IF NOT EXISTS idx_pr_drafts_project_id ON pr_drafts(project_id);
  `);
}
