export type EventType =
  | 'project:discovered'
  | 'project:added'
  | 'project:removed'
  | 'project:classified'
  | 'analysis:started'
  | 'analysis:progress'
  | 'analysis:completed'
  | 'analysis:failed'
  | 'issue:found'
  | 'issue:updated'
  | 'pr:created'
  | 'pr:updated'
  | 'pr:submitted'
  | 'auth:changed'
  | 'error';

export interface PilotEvent<T = unknown> {
  id: string;
  type: EventType;
  timestamp: number;
  source: string;
  payload: T;
}

export interface ProjectDiscoveredPayload {
  projectId: string;
  source: 'github' | 'local';
  name: string;
}

export interface AnalysisProgressPayload {
  taskId: string;
  projectId: string;
  progress: number;
  currentFile?: string;
  issuesFound: number;
}

export interface IssueFoundPayload {
  issueId: string;
  taskId: string;
  projectId: string;
  type: string;
  filePath: string;
  message: string;
}

export interface PRSubmittedPayload {
  prId: string;
  projectId: string;
  prUrl: string;
  prNumber: number;
}
