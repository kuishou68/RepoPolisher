import { Octokit } from 'octokit';
import type { Project, GitHubInfo } from '@repo-polisher/shared';
import { AI_TOPICS, AI_KEYWORDS } from '@repo-polisher/shared';
import { nanoid } from 'nanoid';

export interface GitHubSearchOptions {
  minStars?: number;
  language?: string;
  topic?: string;
  sort?: 'stars' | 'forks' | 'updated';
  order?: 'asc' | 'desc';
  perPage?: number;
  page?: number;
}

export interface TrendingOptions {
  since?: 'daily' | 'weekly' | 'monthly';
  language?: string;
  limit?: number;
}

export class GitHubAPI {
  private octokit: Octokit;

  constructor(token?: string) {
    this.octokit = new Octokit({
      auth: token,
    });
  }

  async searchRepositories(query: string, options: GitHubSearchOptions = {}): Promise<Project[]> {
    const {
      minStars = 100,
      language,
      topic,
      sort = 'stars',
      order = 'desc',
      perPage = 30,
      page = 1,
    } = options;

    let q = query;
    if (minStars > 0) q += ` stars:>=${minStars}`;
    if (language) q += ` language:${language}`;
    if (topic) q += ` topic:${topic}`;

    const response = await this.octokit.rest.search.repos({
      q,
      sort,
      order,
      per_page: perPage,
      page,
    });

    return response.data.items.map((repo) => this.repoToProject(repo));
  }

  async getTrendingAIProjects(options: TrendingOptions = {}): Promise<Project[]> {
    const { limit = 30 } = options;

    // Search for AI-related repos
    const aiQuery = 'ai OR machine-learning OR llm OR deep-learning';
    const projects = await this.searchRepositories(aiQuery, {
      minStars: 1000,
      sort: 'stars',
      order: 'desc',
      perPage: limit,
    });

    return projects;
  }

  async getRepoDetails(owner: string, repo: string): Promise<Project | null> {
    try {
      const [repoData, languages, contributors] = await Promise.all([
        this.octokit.rest.repos.get({ owner, repo }),
        this.octokit.rest.repos.listLanguages({ owner, repo }),
        this.octokit.rest.repos.listContributors({ owner, repo, per_page: 1 }),
      ]);

      const totalBytes = Object.values(languages.data).reduce((a, b) => a + b, 0);
      const languagePercentages: Record<string, number> = {};
      for (const [lang, bytes] of Object.entries(languages.data)) {
        languagePercentages[lang] = Math.round((bytes / totalBytes) * 100);
      }

      const project = this.repoToProject(repoData.data);
      project.languages = languagePercentages;

      if (project.github) {
        const totalCount = contributors.headers['x-total-count'];
        project.github.contributors = totalCount
          ? parseInt(String(totalCount), 10)
          : contributors.data.length;
      }

      return project;
    } catch {
      return null;
    }
  }

  private repoToProject(repo: any): Project {
    const now = new Date();
    const category = this.classifyProject(repo);

    const github: GitHubInfo = {
      owner: repo.owner?.login || '',
      repo: repo.name,
      stars: repo.stargazers_count || 0,
      forks: repo.forks_count || 0,
      lastCommit: repo.pushed_at ? new Date(repo.pushed_at) : now,
      contributors: 0,
      topics: repo.topics || [],
      url: repo.html_url || '',
    };

    return {
      id: nanoid(),
      source: 'github',
      name: repo.full_name || `${repo.owner?.login}/${repo.name}`,
      description: repo.description || undefined,
      category,
      languages: {},
      github,
      analysisCount: 0,
      issuesFound: 0,
      createdAt: now,
      updatedAt: now,
    };
  }

  private classifyProject(repo: any): Project['category'] {
    const topics = (repo.topics || []).map((t: string) => t.toLowerCase());
    const description = (repo.description || '').toLowerCase();
    const name = (repo.name || '').toLowerCase();

    // Check for AI topics
    const hasAITopic = topics.some((t: string) => AI_TOPICS.includes(t));
    const hasAIKeyword = AI_KEYWORDS.some(
      (kw) => description.includes(kw) || name.includes(kw) || topics.includes(kw)
    );

    if (hasAITopic || hasAIKeyword) {
      return 'ai';
    }

    // Check for Web
    const webTopics = ['web', 'frontend', 'react', 'vue', 'angular', 'nextjs', 'svelte'];
    if (topics.some((t: string) => webTopics.includes(t))) {
      return 'web';
    }

    // Check for CLI
    const cliTopics = ['cli', 'command-line', 'terminal', 'shell'];
    if (topics.some((t: string) => cliTopics.includes(t))) {
      return 'cli';
    }

    // Check for Library
    const libTopics = ['library', 'sdk', 'framework', 'package', 'module'];
    if (topics.some((t: string) => libTopics.includes(t))) {
      return 'library';
    }

    return 'other';
  }

  async checkRateLimit(): Promise<{ remaining: number; reset: Date }> {
    const response = await this.octokit.rest.rateLimit.get();
    return {
      remaining: response.data.rate.remaining,
      reset: new Date(response.data.rate.reset * 1000),
    };
  }
}
