import { spawn } from 'child_process';
import { platform, arch } from 'os';
import { join } from 'path';
import { existsSync } from 'fs';
import type { Issue } from '@repo-polisher/shared';
import { nanoid } from 'nanoid';

export interface TypoResult {
  path: string;
  line: number;
  column: number;
  original: string;
  corrections: string[];
  context: string;
}

export interface TypoCheckerOptions {
  binaryPath?: string;
  configPath?: string;
  exclude?: string[];
}

export class TypoChecker {
  private binaryPath: string;
  private configPath?: string;
  private exclude: string[];

  constructor(options: TypoCheckerOptions = {}) {
    this.binaryPath = options.binaryPath || this.getDefaultBinaryPath();
    this.configPath = options.configPath;
    this.exclude = options.exclude || [
      'node_modules',
      '.git',
      'dist',
      'build',
      'target',
      '*.min.js',
      '*.lock',
      'package-lock.json',
      'pnpm-lock.yaml',
      'yarn.lock',
    ];
  }

  private getDefaultBinaryPath(): string {
    const os = platform();
    const architecture = arch();

    let binaryName = 'typos';
    if (os === 'win32') {
      binaryName = 'typos.exe';
    }

    // Try to find in PATH first
    return binaryName;
  }

  async check(
    projectPath: string,
    taskId: string,
    projectId: string,
    onProgress?: (progress: number, file: string) => void
  ): Promise<Issue[]> {
    return new Promise((resolve, reject) => {
      const args = ['--format', 'json'];

      // Add exclusions
      for (const pattern of this.exclude) {
        args.push('--exclude', pattern);
      }

      // Add config if exists
      if (this.configPath && existsSync(this.configPath)) {
        args.push('--config', this.configPath);
      }

      args.push(projectPath);

      const child = spawn(this.binaryPath, args);
      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        // typos returns exit code 2 when typos are found
        if (code !== 0 && code !== 2) {
          // Check if typos is not installed
          if (stderr.includes('not found') || stderr.includes('ENOENT')) {
            reject(new Error('typos-cli is not installed. Please install it: cargo install typos-cli'));
            return;
          }
          reject(new Error(`typos exited with code ${code}: ${stderr}`));
          return;
        }

        try {
          const issues = this.parseOutput(stdout, taskId, projectId, projectPath);
          resolve(issues);
        } catch (err) {
          reject(err);
        }
      });

      child.on('error', (err) => {
        reject(new Error(`Failed to run typos: ${err.message}`));
      });
    });
  }

  private parseOutput(
    output: string,
    taskId: string,
    projectId: string,
    basePath: string
  ): Issue[] {
    const issues: Issue[] = [];

    if (!output.trim()) {
      return issues;
    }

    // Parse JSON Lines format
    const lines = output.trim().split('\n');
    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const typo = JSON.parse(line);

        if (typo.type === 'typo') {
          const relativePath = typo.path.startsWith(basePath)
            ? typo.path.slice(basePath.length + 1)
            : typo.path;

          issues.push({
            id: nanoid(),
            taskId,
            projectId,
            type: 'typo',
            filePath: relativePath,
            line: typo.line_num || 1,
            column: typo.byte_offset || 1,
            message: `"${typo.typo}" should be "${typo.corrections?.[0] || 'unknown'}"`,
            severity: 'warning',
            original: typo.typo,
            suggestion: typo.corrections?.[0],
            context: typo.context?.line || '',
            confidence: 0.95,
            status: 'open',
            createdAt: new Date(),
          });
        }
      } catch {
        // Skip invalid JSON lines
      }
    }

    return issues;
  }

  async isAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const child = spawn(this.binaryPath, ['--version']);

      child.on('close', (code) => {
        resolve(code === 0);
      });

      child.on('error', () => {
        resolve(false);
      });
    });
  }

  async getVersion(): Promise<string | null> {
    return new Promise((resolve) => {
      const child = spawn(this.binaryPath, ['--version']);
      let stdout = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          const match = stdout.match(/typos\s+([\d.]+)/);
          resolve(match ? match[1] : stdout.trim());
        } else {
          resolve(null);
        }
      });

      child.on('error', () => {
        resolve(null);
      });
    });
  }
}
