export type PRStatus = 'draft' | 'ready' | 'submitted' | 'merged' | 'closed';
export type SubmitMethod = 'gh-cli' | 'oauth' | 'local';

export interface PRDraft {
  id: string;
  projectId: string;
  title: string;
  body: string;
  branch: string;
  baseBranch: string;
  issueIds: string[];
  files: PRFile[];
  status: PRStatus;
  prUrl?: string;
  prNumber?: number;
  submitMethod?: SubmitMethod;
  submittedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PRFile {
  path: string;
  additions: number;
  deletions: number;
  patch: string;
}

export interface AuthStatus {
  ghCli: {
    installed: boolean;
    version?: string;
    authenticated: boolean;
    username?: string;
  };
  oauth: {
    authenticated: boolean;
    username?: string;
    expiresAt?: Date;
  };
  recommended: SubmitMethod;
}

export interface PRSubmitResult {
  success: boolean;
  prUrl?: string;
  prNumber?: number;
  error?: string;
  warnings?: string[];
}
