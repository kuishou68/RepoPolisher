export type ProjectSource = 'github' | 'local';
export type ProjectCategory = 'ai' | 'web' | 'cli' | 'library' | 'other';

export interface GitHubInfo {
  owner: string;
  repo: string;
  stars: number;
  forks: number;
  lastCommit: Date;
  contributors: number;
  topics: string[];
  url: string;
}

export interface LocalInfo {
  path: string;
  gitRemote?: string;
  lastModified: Date;
}

export interface Project {
  id: string;
  source: ProjectSource;
  name: string;
  description?: string;
  category: ProjectCategory;
  languages: Record<string, number>;
  github?: GitHubInfo;
  local?: LocalInfo;
  lastAnalyzed?: Date;
  analysisCount: number;
  issuesFound: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectFilter {
  source?: ProjectSource;
  category?: ProjectCategory;
  hasIssues?: boolean;
  searchQuery?: string;
}

export interface ProjectSortOptions {
  field: 'stars' | 'lastAnalyzed' | 'issuesFound' | 'name' | 'updatedAt';
  order: 'asc' | 'desc';
}
