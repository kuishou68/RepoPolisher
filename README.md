# RepoPolisher

🔍 An automated code quality analysis tool that discovers typos and code style issues in popular GitHub projects, and automatically generates PRs with fixes.

[中文](./README.zh-CN.md) | [日本語](./README.ja.md) | [한국어](./README.ko.md)

## Vision

RepoPolisher aims to be the "code polisher" for the open-source community:

1. **Discover Trending Projects** - Automatically find high-star, actively maintained GitHub projects with many contributors
2. **Smart Categorization** - Categorize projects with focus on AI-related repositories
3. **Deep Code Analysis** - Scan source code for typos, syntax issues, design flaws, and more
4. **One-Click PR Submission** - Package fixes into PRs that users can selectively submit to original repositories

## Current Phase

**Phase 1: Typo Fixes** ✅ Implemented

- [x] GitHub trending project collection
- [x] Local project import
- [x] Typo detection (powered by cspell)
- [x] Diff preview and fix suggestions
- [x] PR draft creation and submission
- [x] GitHub CLI integration

## Architecture

```
RepoPolisher/
├── apps/
│   ├── desktop/          # Electron desktop app (main entry)
│   │   ├── electron/     # Main process
│   │   │   ├── main.ts   # Electron main entry
│   │   │   ├── preload.ts
│   │   │   └── ipc/      # tRPC IPC layer
│   │   │       ├── router.ts    # Route aggregation
│   │   │       ├── projects.ts  # Project management
│   │   │       ├── analysis.ts  # Analysis tasks
│   │   │       ├── pr.ts        # PR submission
│   │   │       └── settings.ts  # Settings management
│   │   └── src/          # Renderer process (React)
│   │       ├── pages/    # Page components
│   │       │   ├── Projects/   # Project list
│   │       │   ├── Analysis/   # Analysis details
│   │       │   ├── PRs/        # PR management
│   │       │   └── Settings/   # Settings
│   │       └── components/
│   └── cli/              # CLI tool (planned)
│
├── packages/
│   ├── core/             # Core business logic
│   │   ├── collector/    # Project collectors
│   │   │   ├── github-api.ts    # GitHub API integration
│   │   │   └── local-scanner.ts # Local project scanner
│   │   ├── analyzer/     # Code analyzers
│   │   │   └── typo-checker.ts  # Spell checker (cspell)
│   │   └── submitter/    # PR submitters
│   │       ├── gh-cli.ts        # GitHub CLI integration
│   │       └── auth-checker.ts  # Auth detection
│   │
│   ├── protocol/         # Tool protocol layer (MCP/ACP style)
│   │   ├── types/
│   │   │   ├── tool.ts   # Tool interface definitions
│   │   │   └── event.ts  # Event types
│   │   ├── bus/
│   │   │   └── event-bus.ts     # Event bus
│   │   └── registry/
│   │       └── tool-registry.ts # Tool registry
│   │
│   ├── shared/           # Shared types and utilities
│   │   └── types/
│   │       ├── project.ts   # Project types
│   │       ├── analysis.ts  # Analysis types
│   │       └── pr.ts        # PR types
│   │
│   └── db/               # Data persistence
│       └── schema.ts     # SQLite Schema (Drizzle ORM)
```

## Core Modules

### 1. Protocol Layer - Tool Protocol

Inspired by MCP (Model Context Protocol), providing a unified tool interface:

```typescript
interface Tool<TInput, TOutput> {
  name: string;
  version: string;
  category: 'collector' | 'analyzer' | 'generator' | 'submitter';
  inputSchema: JSONSchema;
  outputSchema: JSONSchema;
  execute: (input: TInput, context: ToolContext) => Promise<ToolResult<TOutput>>;
}
```

**Design Benefits**:
- Unified tool definition format for easy Agent and Tools integration
- Event-driven architecture with decoupled modules
- Extensible plugin system

### 2. Core Layer - Business Logic

| Module | Function | Status |
|--------|----------|--------|
| `collector/github-api` | GitHub trending collection | ✅ Trending API + GraphQL |
| `collector/local-scanner` | Local project scanning | ✅ Git repo detection |
| `analyzer/typo-checker` | Typo detection | ✅ cspell integration |
| `submitter/gh-cli` | PR submission | ✅ GitHub CLI |

### 3. Data Model

```
projects          # Project info
    ├── source (github/local)
    ├── github_* (GitHub metadata)
    └── local_* (Local project info)

analysis_tasks    # Analysis tasks
    ├── type (typo/lint/ai)
    ├── status (pending/running/completed/failed)
    └── progress

issues            # Discovered issues
    ├── type, severity
    ├── original → suggestion
    └── status (open/included/ignored/fixed)

pr_drafts         # PR drafts
    ├── title, body, branch
    ├── issue_ids[]
    └── status (draft/ready/submitted/merged)
```

## User Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    RepoPolisher Desktop                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ① Project Discovery                                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  [Fetch Trending]  [Add Local Project]               │   │
│  │                                                     │   │
│  │  📦 langchain (⭐ 95k) - AI                         │   │
│  │  📦 ollama (⭐ 80k) - AI                            │   │
│  │  📦 your-local-project - Local                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                           ↓                                 │
│  ② Code Analysis                                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  [Start Analysis] ████████████░░ 75%                 │   │
│  │                                                     │   │
│  │  🔴 typo: "recieve" → "receive" (config.ts:42)      │   │
│  │  🟡 typo: "occured" → "occurred" (utils.ts:18)      │   │
│  │  ☑️ [Select] [Preview Diff] [Ignore]                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                           ↓                                 │
│  ③ PR Submission                                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📝 PR Draft: fix: correct 5 typos in codebase      │   │
│  │                                                     │   │
│  │  [Preview PR]  [Edit Content]  [Submit to GitHub]   │   │
│  │                                                     │   │
│  │  ⚠️ gh-cli detected, will use local submission      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Roadmap

### Phase 1: Typo Fixes ✅
- Basic architecture setup
- GitHub/local project import
- cspell spell checking integration
- PR submission flow

### Phase 2: Code Style Linting 🚧
- ESLint/Prettier integration
- Multi-language support (Python, Go, Rust)
- Custom rule configuration

### Phase 3: AI Deep Analysis 📋
- Design flaw detection
- Code simplification suggestions
- Common logic extraction recommendations
- Design pattern optimization

### Phase 4: Plugin Ecosystem 📋
- Complete MCP/ACP protocol implementation
- User-defined Tool development
- Agent integration interface
- Community plugin marketplace

## Quick Start

### Requirements

- Node.js >= 18
- pnpm >= 8.10.0
- GitHub CLI (optional, for PR submission)

### Installation

```bash
# Clone repository
git clone https://github.com/kuishou68/RepoPolisher.git
cd RepoPolisher

# Install dependencies
pnpm install

# Start development mode
pnpm dev
```

### GitHub CLI Setup (Recommended)

```bash
# Install gh
brew install gh  # macOS
# or winget install GitHub.cli  # Windows

# Login
gh auth login
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Desktop Framework | Electron 28 |
| Frontend | React 18 + TypeScript |
| Styling | TailwindCSS + Radix UI |
| State | Zustand + React Query |
| Communication | tRPC + electron-trpc |
| Database | SQLite + Drizzle ORM |
| Build | Vite + Turbo |
| Code Analysis | cspell (spell checking) |

## Contributing

Contributions are welcome! Please check [Contributing Guide](CONTRIBUTING.md).

## License

MIT License

---

**Make every commit a contribution to the open-source community ✨**
