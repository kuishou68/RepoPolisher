export type AnalysisStatus = 'pending' | 'running' | 'completed' | 'failed';
export type AnalysisType = 'typo' | 'lint' | 'ai';
export type IssueStatus = 'open' | 'included' | 'ignored' | 'fixed';

export interface AnalysisTask {
  id: string;
  projectId: string;
  type: AnalysisType;
  status: AnalysisStatus;
  progress: number;
  startedAt?: Date;
  completedAt?: Date;
  issuesFound: number;
  filesScanned: number;
  error?: string;
  createdAt: Date;
}

export interface TypoIssue {
  id: string;
  taskId: string;
  projectId: string;
  type: 'typo';
  filePath: string;
  line: number;
  column: number;
  original: string;
  suggestion: string;
  context: string;
  confidence: number;
  status: IssueStatus;
  createdAt: Date;
}

export interface Issue {
  id: string;
  taskId: string;
  projectId: string;
  type: AnalysisType;
  filePath: string;
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
  original?: string;
  suggestion?: string;
  context?: string;
  confidence?: number;
  status: IssueStatus;
  createdAt: Date;
}

export interface AnalysisResult {
  task: AnalysisTask;
  issues: Issue[];
  summary: {
    totalFiles: number;
    totalIssues: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
  };
}
