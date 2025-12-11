export const APP_NAME = 'RepoPolisher';
export const APP_VERSION = '0.1.0';

export const GITHUB_API_BASE = 'https://api.github.com';
export const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com';

export const DEFAULT_BRANCH = 'main';

export const CATEGORY_LABELS: Record<string, string> = {
  ai: 'AI/ML',
  web: 'Web',
  cli: 'CLI',
  library: 'Library',
  other: 'Other',
};

export const ANALYSIS_TYPE_LABELS: Record<string, string> = {
  typo: 'Typo Check',
  lint: 'Linter',
  ai: 'AI Analysis',
};

export const PR_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  ready: 'Ready',
  submitted: 'Submitted',
  merged: 'Merged',
  closed: 'Closed',
};

export const AI_TOPICS = [
  'machine-learning',
  'deep-learning',
  'artificial-intelligence',
  'neural-network',
  'nlp',
  'natural-language-processing',
  'computer-vision',
  'llm',
  'large-language-model',
  'gpt',
  'transformer',
  'pytorch',
  'tensorflow',
  'langchain',
  'openai',
  'anthropic',
  'huggingface',
  'stable-diffusion',
  'generative-ai',
  'chatbot',
  'rag',
  'vector-database',
  'embedding',
];

export const AI_KEYWORDS = [
  'ai',
  'ml',
  'llm',
  'gpt',
  'neural',
  'model',
  'inference',
  'training',
  'embedding',
  'transformer',
  'diffusion',
  'agent',
];
