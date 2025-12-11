import { readdir, readFile, stat } from 'fs/promises';
import { join, basename } from 'path';
import { existsSync } from 'fs';
import simpleGit from 'simple-git';
import type { Project, LocalInfo } from '@repo-polisher/shared';
import { AI_KEYWORDS } from '@repo-polisher/shared';
import { nanoid } from 'nanoid';

interface PackageJson {
  name?: string;
  description?: string;
  keywords?: string[];
}

interface ProjectInfo {
  name: string;
  description?: string;
  languages: Record<string, number>;
  gitRemote?: string;
  keywords?: string[];
}

const LANGUAGE_EXTENSIONS: Record<string, string> = {
  '.ts': 'TypeScript',
  '.tsx': 'TypeScript',
  '.js': 'JavaScript',
  '.jsx': 'JavaScript',
  '.py': 'Python',
  '.rs': 'Rust',
  '.go': 'Go',
  '.java': 'Java',
  '.rb': 'Ruby',
  '.php': 'PHP',
  '.swift': 'Swift',
  '.kt': 'Kotlin',
  '.cs': 'C#',
  '.cpp': 'C++',
  '.c': 'C',
  '.vue': 'Vue',
  '.svelte': 'Svelte',
};

export class LocalScanner {
  async scanDirectory(dirPath: string): Promise<Project | null> {
    if (!existsSync(dirPath)) {
      return null;
    }

    const stats = await stat(dirPath);
    if (!stats.isDirectory()) {
      return null;
    }

    const info = await this.getProjectInfo(dirPath);
    const category = this.classifyProject(info);

    const local: LocalInfo = {
      path: dirPath,
      gitRemote: info.gitRemote,
      lastModified: stats.mtime,
    };

    const now = new Date();

    return {
      id: nanoid(),
      source: 'local',
      name: info.name,
      description: info.description,
      category,
      languages: info.languages,
      local,
      analysisCount: 0,
      issuesFound: 0,
      createdAt: now,
      updatedAt: now,
    };
  }

  private async getProjectInfo(dirPath: string): Promise<ProjectInfo> {
    const name = basename(dirPath);
    let description: string | undefined;
    let keywords: string[] = [];
    let gitRemote: string | undefined;

    // Try to read package.json
    const packageJsonPath = join(dirPath, 'package.json');
    if (existsSync(packageJsonPath)) {
      try {
        const content = await readFile(packageJsonPath, 'utf-8');
        const pkg: PackageJson = JSON.parse(content);
        description = pkg.description;
        keywords = pkg.keywords || [];
      } catch {
        // Ignore parse errors
      }
    }

    // Try to read pyproject.toml or setup.py for Python projects
    const pyprojectPath = join(dirPath, 'pyproject.toml');
    if (existsSync(pyprojectPath)) {
      try {
        const content = await readFile(pyprojectPath, 'utf-8');
        const descMatch = content.match(/description\s*=\s*"([^"]+)"/);
        if (descMatch) {
          description = descMatch[1];
        }
      } catch {
        // Ignore
      }
    }

    // Get git remote
    const gitDir = join(dirPath, '.git');
    if (existsSync(gitDir)) {
      try {
        const git = simpleGit(dirPath);
        const remotes = await git.getRemotes(true);
        const origin = remotes.find((r) => r.name === 'origin');
        if (origin) {
          gitRemote = origin.refs.fetch || origin.refs.push;
        }
      } catch {
        // Ignore git errors
      }
    }

    // Scan for languages
    const languages = await this.scanLanguages(dirPath);

    return {
      name,
      description,
      languages,
      gitRemote,
      keywords,
    };
  }

  private async scanLanguages(
    dirPath: string,
    depth: number = 0,
    maxDepth: number = 3
  ): Promise<Record<string, number>> {
    const counts: Record<string, number> = {};

    if (depth > maxDepth) return counts;

    const entries = await readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      // Skip common non-source directories
      if (
        entry.isDirectory() &&
        ['node_modules', '.git', 'dist', 'build', 'target', '__pycache__', '.next', 'venv'].includes(
          entry.name
        )
      ) {
        continue;
      }

      const fullPath = join(dirPath, entry.name);

      if (entry.isDirectory()) {
        const subCounts = await this.scanLanguages(fullPath, depth + 1, maxDepth);
        for (const [lang, count] of Object.entries(subCounts)) {
          counts[lang] = (counts[lang] || 0) + count;
        }
      } else if (entry.isFile()) {
        const ext = entry.name.substring(entry.name.lastIndexOf('.'));
        const lang = LANGUAGE_EXTENSIONS[ext];
        if (lang) {
          counts[lang] = (counts[lang] || 0) + 1;
        }
      }
    }

    return counts;
  }

  private classifyProject(info: ProjectInfo): Project['category'] {
    const { description = '', keywords = [], languages } = info;
    const descLower = description.toLowerCase();
    const allKeywords = keywords.map((k) => k.toLowerCase());

    // Check for AI
    const hasAIKeyword = AI_KEYWORDS.some(
      (kw) => descLower.includes(kw) || allKeywords.includes(kw)
    );
    if (hasAIKeyword) {
      return 'ai';
    }

    // Check based on dependencies/languages
    if (languages['TypeScript'] || languages['JavaScript']) {
      const webIndicators = ['react', 'vue', 'angular', 'next', 'svelte', 'frontend', 'web'];
      if (webIndicators.some((w) => descLower.includes(w) || allKeywords.includes(w))) {
        return 'web';
      }
    }

    const cliIndicators = ['cli', 'command', 'terminal'];
    if (cliIndicators.some((c) => descLower.includes(c) || allKeywords.includes(c))) {
      return 'cli';
    }

    const libIndicators = ['library', 'sdk', 'framework', 'package'];
    if (libIndicators.some((l) => descLower.includes(l) || allKeywords.includes(l))) {
      return 'library';
    }

    return 'other';
  }
}
