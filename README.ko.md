# RepoPolisher

🔍 인기 있는 GitHub 프로젝트에서 오타 및 코드 스타일 문제를 발견하고 자동으로 수정 PR을 생성하는 자동화된 코드 품질 분석 도구입니다.

[English](./README.md) | [中文](./README.zh-CN.md) | [日本語](./README.ja.md)

## 비전

RepoPolisher는 오픈소스 커뮤니티의 "코드 폴리셔"를 목표로 합니다:

1. **트렌딩 프로젝트 발견** - 스타 수가 높고 활발하게 유지되는 GitHub 프로젝트를 자동으로 발견
2. **스마트 분류** - AI 관련 저장소를 중심으로 프로젝트 분류
3. **심층 코드 분석** - 오타, 구문 문제, 설계 결함 등을 소스 코드에서 스캔
4. **원클릭 PR 제출** - 수정 사항을 PR로 패키징하여 사용자가 선택적으로 원본 저장소에 제출 가능

## 현재 단계

**Phase 1: 오타 수정** ✅ 구현됨

- [x] GitHub 트렌딩 프로젝트 수집
- [x] 로컬 프로젝트 가져오기
- [x] 오타 감지 (cspell 기반)
- [x] 차이점 미리보기 및 수정 제안
- [x] PR 초안 생성 및 제출
- [x] GitHub CLI 통합

## 아키텍처

```
RepoPolisher/
├── apps/
│   ├── desktop/          # Electron 데스크톱 앱 (메인 엔트리)
│   │   ├── electron/     # 메인 프로세스
│   │   │   ├── main.ts   # Electron 메인 엔트리
│   │   │   ├── preload.ts
│   │   │   └── ipc/      # tRPC IPC 레이어
│   │   │       ├── router.ts    # 라우트 집계
│   │   │       ├── projects.ts  # 프로젝트 관리
│   │   │       ├── analysis.ts  # 분석 작업
│   │   │       ├── pr.ts        # PR 제출
│   │   │       └── settings.ts  # 설정 관리
│   │   └── src/          # 렌더러 프로세스 (React)
│   │       ├── pages/    # 페이지 컴포넌트
│   │       │   ├── Projects/   # 프로젝트 목록
│   │       │   ├── Analysis/   # 분석 상세
│   │       │   ├── PRs/        # PR 관리
│   │       │   └── Settings/   # 설정
│   │       └── components/
│   └── cli/              # CLI 도구 (계획 중)
│
├── packages/
│   ├── core/             # 핵심 비즈니스 로직
│   │   ├── collector/    # 프로젝트 수집기
│   │   │   ├── github-api.ts    # GitHub API 통합
│   │   │   └── local-scanner.ts # 로컬 프로젝트 스캐너
│   │   ├── analyzer/     # 코드 분석기
│   │   │   └── typo-checker.ts  # 맞춤법 검사기 (cspell)
│   │   └── submitter/    # PR 제출기
│   │       ├── gh-cli.ts        # GitHub CLI 통합
│   │       └── auth-checker.ts  # 인증 감지
│   │
│   ├── protocol/         # 도구 프로토콜 레이어 (MCP/ACP 스타일)
│   │   ├── types/
│   │   │   ├── tool.ts   # Tool 인터페이스 정의
│   │   │   └── event.ts  # 이벤트 타입
│   │   ├── bus/
│   │   │   └── event-bus.ts     # 이벤트 버스
│   │   └── registry/
│   │       └── tool-registry.ts # 도구 레지스트리
│   │
│   ├── shared/           # 공유 타입 및 유틸리티
│   │   └── types/
│   │       ├── project.ts   # 프로젝트 타입
│   │       ├── analysis.ts  # 분석 타입
│   │       └── pr.ts        # PR 타입
│   │
│   └── db/               # 데이터 영속화
│       └── schema.ts     # SQLite Schema (Drizzle ORM)
```

## 핵심 모듈

### 1. Protocol 레이어 - 도구 프로토콜

MCP (Model Context Protocol)에서 영감을 받아 통합된 도구 인터페이스 제공:

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

**설계 이점**:
- Agent 및 Tools 통합이 쉬운 통합 도구 정의 형식
- 모듈이 분리된 이벤트 기반 아키텍처
- 확장 가능한 플러그인 시스템

### 2. Core 레이어 - 비즈니스 로직

| 모듈 | 기능 | 상태 |
|------|------|------|
| `collector/github-api` | GitHub 트렌딩 수집 | ✅ Trending API + GraphQL |
| `collector/local-scanner` | 로컬 프로젝트 스캔 | ✅ Git 저장소 감지 |
| `analyzer/typo-checker` | 오타 감지 | ✅ cspell 통합 |
| `submitter/gh-cli` | PR 제출 | ✅ GitHub CLI |

### 3. 데이터 모델

```
projects          # 프로젝트 정보
    ├── source (github/local)
    ├── github_* (GitHub 메타데이터)
    └── local_* (로컬 프로젝트 정보)

analysis_tasks    # 분석 작업
    ├── type (typo/lint/ai)
    ├── status (pending/running/completed/failed)
    └── progress

issues            # 발견된 문제
    ├── type, severity
    ├── original → suggestion
    └── status (open/included/ignored/fixed)

pr_drafts         # PR 초안
    ├── title, body, branch
    ├── issue_ids[]
    └── status (draft/ready/submitted/merged)
```

## 사용자 흐름

```
┌─────────────────────────────────────────────────────────────┐
│                    RepoPolisher Desktop                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ① 프로젝트 발견                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  [트렌딩 가져오기]  [로컬 프로젝트 추가]              │   │
│  │                                                     │   │
│  │  📦 langchain (⭐ 95k) - AI                         │   │
│  │  📦 ollama (⭐ 80k) - AI                            │   │
│  │  📦 your-local-project - Local                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                           ↓                                 │
│  ② 코드 분석                                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  [분석 시작] ████████████░░ 75%                      │   │
│  │                                                     │   │
│  │  🔴 typo: "recieve" → "receive" (config.ts:42)      │   │
│  │  🟡 typo: "occured" → "occurred" (utils.ts:18)      │   │
│  │  ☑️ [선택] [차이점 미리보기] [무시]                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                           ↓                                 │
│  ③ PR 제출                                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📝 PR 초안: fix: correct 5 typos in codebase       │   │
│  │                                                     │   │
│  │  [PR 미리보기]  [내용 편집]  [GitHub에 제출]         │   │
│  │                                                     │   │
│  │  ⚠️ gh-cli 감지됨, 로컬 제출을 사용합니다            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 로드맵

### Phase 1: 오타 수정 ✅
- 기본 아키텍처 구축
- GitHub/로컬 프로젝트 가져오기
- cspell 맞춤법 검사 통합
- PR 제출 흐름

### Phase 2: 코드 스타일 린팅 🚧
- ESLint/Prettier 통합
- 다국어 지원 (Python, Go, Rust)
- 사용자 정의 규칙 구성

### Phase 3: AI 심층 분석 📋
- 설계 결함 감지
- 코드 간소화 제안
- 공통 로직 추출 권장
- 디자인 패턴 최적화

### Phase 4: 플러그인 생태계 📋
- MCP/ACP 프로토콜 구현 완료
- 사용자 정의 Tool 개발
- Agent 통합 인터페이스
- 커뮤니티 플러그인 마켓플레이스

## 빠른 시작

### 요구 사항

- Node.js >= 18
- pnpm >= 8.10.0
- GitHub CLI (선택 사항, PR 제출용)

### 설치

```bash
# 저장소 클론
git clone https://github.com/kuishou68/RepoPolisher.git
cd RepoPolisher

# 의존성 설치
pnpm install

# 개발 모드 시작
pnpm dev
```

### GitHub CLI 설정 (권장)

```bash
# gh 설치
brew install gh  # macOS
# 또는 winget install GitHub.cli  # Windows

# 로그인
gh auth login
```

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| 데스크톱 프레임워크 | Electron 28 |
| 프론트엔드 | React 18 + TypeScript |
| 스타일링 | TailwindCSS + Radix UI |
| 상태 관리 | Zustand + React Query |
| 통신 | tRPC + electron-trpc |
| 데이터베이스 | SQLite + Drizzle ORM |
| 빌드 | Vite + Turbo |
| 코드 분석 | cspell (맞춤법 검사) |

## 기여

기여를 환영합니다! [Contributing Guide](CONTRIBUTING.md)를 확인하세요.

## 라이선스

MIT License

---

**모든 커밋을 오픈소스 커뮤니티에 대한 기여로 만들어보세요 ✨**
