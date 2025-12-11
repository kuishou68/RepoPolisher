import { existsSync } from 'fs';
import { delimiter, dirname } from 'path';
import { spawnSync } from 'child_process';

const DEFAULT_PATH_DIRS = ['/opt/homebrew/bin', '/usr/local/bin'];

function hasPathSeparator(candidate: string): boolean {
  return candidate.includes('/') || candidate.includes('\\');
}

function collectExtraPaths(): string[] {
  const paths = new Set(DEFAULT_PATH_DIRS);

  const explicit = process.env.GH_CLI_PATH;
  if (explicit && hasPathSeparator(explicit)) {
    paths.add(dirname(explicit));
  }

  const shellResolved = resolveViaShell();
  if (shellResolved) {
    paths.add(dirname(shellResolved));
  }

  return Array.from(paths).filter(Boolean);
}

export function resolveGhExecutable(): string {
  const explicit = process.env.GH_CLI_PATH;
  if (explicit && existsSync(explicit)) {
    return explicit;
  }
  return 'gh';
}

function resolveViaShell(): string | null {
  const shell = process.env.SHELL || '/bin/zsh';
  const resolved = spawnSync(shell, ['-lc', 'command -v gh'], {
    encoding: 'utf-8',
  });

  if (resolved.status === 0) {
    const path = resolved.stdout.trim();
    if (path && existsSync(path)) {
      return path;
    }
  }

  return null;
}

export function buildGhEnvironment(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  const pathDelimiter = delimiter;
  const existingPaths = env.PATH ? env.PATH.split(pathDelimiter) : [];
  const extraPaths = collectExtraPaths();
  const merged = [...new Set([...existingPaths, ...extraPaths].filter(Boolean))].join(pathDelimiter);

  env.PATH = merged;
  return env;
}

export function getGhSpawnConfig() {
  const command = resolveGhExecutable();
  const env = buildGhEnvironment();
  const resolved = spawnSync(command, ['--version'], { env });

  const available = resolved.status === 0;

  return {
    command,
    env,
    available,
  };
}
