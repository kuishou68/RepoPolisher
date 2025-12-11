export type ToolCategory = 'collector' | 'analyzer' | 'generator' | 'submitter' | 'utility';

export interface JSONSchema {
  type: string;
  properties?: Record<string, unknown>;
  required?: string[];
  [key: string]: unknown;
}

export interface ToolDefinition {
  name: string;
  version: string;
  description: string;
  category: ToolCategory;
  inputSchema: JSONSchema;
  outputSchema: JSONSchema;
}

export interface ToolContext {
  workDir: string;
  config: Record<string, unknown>;
  logger: Logger;
  abortSignal?: AbortSignal;
}

export interface Logger {
  debug: (message: string, ...args: unknown[]) => void;
  info: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
}

export interface ToolError {
  code: string;
  message: string;
  details?: unknown;
}

export interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: ToolError;
  metadata?: {
    duration: number;
    cached: boolean;
  };
}

export interface Tool<TInput = unknown, TOutput = unknown> extends ToolDefinition {
  execute: (input: TInput, context: ToolContext) => Promise<ToolResult<TOutput>>;
  onLoad?: () => Promise<void>;
  onUnload?: () => Promise<void>;
}
