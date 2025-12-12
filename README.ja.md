# RepoPolisher

🔍 GitHub の人気プロジェクトのタイポやコードスタイルの問題を発見し、自動的に修正PRを生成するコード品質分析ツール。

[English](./README.md) | [中文](./README.zh-CN.md) | [한국어](./README.ko.md)

## ビジョン

RepoPolisher はオープンソースコミュニティの「コードポリッシャー」を目指しています：

1. **トレンドプロジェクトの発見** - スター数が多く、アクティブにメンテナンスされている GitHub プロジェクトを自動発見
2. **スマートな分類** - AI 関連リポジトリを重点的にプロジェクトを分類
3. **深いコード分析** - タイポ、構文問題、設計上の欠陥などをソースコードからスキャン
4. **ワンクリック PR 提出** - 修正を PR にパッケージ化し、ユーザーが選択的に元のリポジトリに提出可能

## 現在のフェーズ

**Phase 1: タイポ修正** ✅ 実装済み

- [x] GitHub トレンドプロジェクト収集
- [x] ローカルプロジェクトインポート
- [x] タイポ検出（cspell を使用）
- [x] 差分プレビューと修正提案
- [x] PR ドラフト作成と提出
- [x] GitHub CLI 統合

## アーキテクチャ

```
RepoPolisher/
├── apps/
│   ├── desktop/          # Electron デスクトップアプリ（メインエントリ）
│   │   ├── electron/     # メインプロセス
│   │   │   ├── main.ts   # Electron メインエントリ
│   │   │   ├── preload.ts
│   │   │   └── ipc/      # tRPC IPC レイヤー
│   │   │       ├── router.ts    # ルート集約
│   │   │       ├── projects.ts  # プロジェクト管理
│   │   │       ├── analysis.ts  # 分析タスク
│   │   │       ├── pr.ts        # PR 提出
│   │   │       └── settings.ts  # 設定管理
│   │   └── src/          # レンダラープロセス (React)
│   │       ├── pages/    # ページコンポーネント
│   │       │   ├── Projects/   # プロジェクト一覧
│   │       │   ├── Analysis/   # 分析詳細
│   │       │   ├── PRs/        # PR 管理
│   │       │   └── Settings/   # 設定
│   │       └── components/
│   └── cli/              # CLI ツール（計画中）
│
├── packages/
│   ├── core/             # コアビジネスロジック
│   │   ├── collector/    # プロジェクトコレクター
│   │   │   ├── github-api.ts    # GitHub API 統合
│   │   │   └── local-scanner.ts # ローカルプロジェクトスキャナー
│   │   ├── analyzer/     # コードアナライザー
│   │   │   └── typo-checker.ts  # スペルチェッカー (cspell)
│   │   └── submitter/    # PR サブミッター
│   │       ├── gh-cli.ts        # GitHub CLI 統合
│   │       └── auth-checker.ts  # 認証検出
│   │
│   ├── protocol/         # ツールプロトコルレイヤー (MCP/ACP スタイル)
│   │   ├── types/
│   │   │   ├── tool.ts   # Tool インターフェース定義
│   │   │   └── event.ts  # イベントタイプ
│   │   ├── bus/
│   │   │   └── event-bus.ts     # イベントバス
│   │   └── registry/
│   │       └── tool-registry.ts # ツールレジストリ
│   │
│   ├── shared/           # 共有タイプとユーティリティ
│   │   └── types/
│   │       ├── project.ts   # プロジェクトタイプ
│   │       ├── analysis.ts  # 分析タイプ
│   │       └── pr.ts        # PR タイプ
│   │
│   └── db/               # データ永続化
│       └── schema.ts     # SQLite Schema (Drizzle ORM)
```

## コアモジュール

### 1. Protocol レイヤー - ツールプロトコル

MCP (Model Context Protocol) にインスパイアされ、統一されたツールインターフェースを提供：

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

**設計のメリット**：
- Agent と Tools の統合が容易な統一ツール定義フォーマット
- モジュールが分離されたイベント駆動アーキテクチャ
- 拡張可能なプラグインシステム

### 2. Core レイヤー - ビジネスロジック

| モジュール | 機能 | ステータス |
|-----------|------|----------|
| `collector/github-api` | GitHub トレンド収集 | ✅ Trending API + GraphQL |
| `collector/local-scanner` | ローカルプロジェクトスキャン | ✅ Git リポジトリ検出 |
| `analyzer/typo-checker` | タイポ検出 | ✅ cspell 統合 |
| `submitter/gh-cli` | PR 提出 | ✅ GitHub CLI |

### 3. データモデル

```
projects          # プロジェクト情報
    ├── source (github/local)
    ├── github_* (GitHub メタデータ)
    └── local_* (ローカルプロジェクト情報)

analysis_tasks    # 分析タスク
    ├── type (typo/lint/ai)
    ├── status (pending/running/completed/failed)
    └── progress

issues            # 発見された問題
    ├── type, severity
    ├── original → suggestion
    └── status (open/included/ignored/fixed)

pr_drafts         # PR ドラフト
    ├── title, body, branch
    ├── issue_ids[]
    └── status (draft/ready/submitted/merged)
```

## ユーザーフロー

```
┌─────────────────────────────────────────────────────────────┐
│                    RepoPolisher Desktop                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ① プロジェクト発見                                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  [トレンド取得]  [ローカルプロジェクト追加]            │   │
│  │                                                     │   │
│  │  📦 langchain (⭐ 95k) - AI                         │   │
│  │  📦 ollama (⭐ 80k) - AI                            │   │
│  │  📦 your-local-project - Local                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                           ↓                                 │
│  ② コード分析                                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  [分析開始] ████████████░░ 75%                       │   │
│  │                                                     │   │
│  │  🔴 typo: "recieve" → "receive" (config.ts:42)      │   │
│  │  🟡 typo: "occured" → "occurred" (utils.ts:18)      │   │
│  │  ☑️ [選択] [差分プレビュー] [無視]                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                           ↓                                 │
│  ③ PR 提出                                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📝 PR ドラフト: fix: correct 5 typos in codebase   │   │
│  │                                                     │   │
│  │  [PR プレビュー]  [内容編集]  [GitHub に提出]        │   │
│  │                                                     │   │
│  │  ⚠️ gh-cli 検出、ローカル提出を使用します            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## ロードマップ

### Phase 1: タイポ修正 ✅
- 基本アーキテクチャ構築
- GitHub/ローカルプロジェクトインポート
- cspell スペルチェック統合
- PR 提出フロー

### Phase 2: コードスタイルリント 🚧
- ESLint/Prettier 統合
- 多言語サポート (Python, Go, Rust)
- カスタムルール設定

### Phase 3: AI 深層分析 📋
- 設計上の欠陥検出
- コード簡素化提案
- 共通ロジック抽出推奨
- デザインパターン最適化

### Phase 4: プラグインエコシステム 📋
- MCP/ACP プロトコル実装の完成
- ユーザー定義 Tool 開発
- Agent 統合インターフェース
- コミュニティプラグインマーケットプレイス

## クイックスタート

### 必要条件

- Node.js >= 18
- pnpm >= 8.10.0
- GitHub CLI（オプション、PR 提出用）

### インストール

```bash
# リポジトリをクローン
git clone https://github.com/kuishou68/RepoPolisher.git
cd RepoPolisher

# 依存関係をインストール
pnpm install

# 開発モードを開始
pnpm dev
```

### GitHub CLI セットアップ（推奨）

```bash
# gh をインストール
brew install gh  # macOS
# または winget install GitHub.cli  # Windows

# ログイン
gh auth login
```

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| デスクトップフレームワーク | Electron 28 |
| フロントエンド | React 18 + TypeScript |
| スタイリング | TailwindCSS + Radix UI |
| 状態管理 | Zustand + React Query |
| 通信 | tRPC + electron-trpc |
| データベース | SQLite + Drizzle ORM |
| ビルド | Vite + Turbo |
| コード分析 | cspell（スペルチェック） |

## コントリビューション

コントリビューションを歓迎します！[Contributing Guide](CONTRIBUTING.md) をご確認ください。

## ライセンス

MIT License

---

**すべてのコミットを、オープンソースコミュニティへの貢献に ✨**
