# CircleCI MCP Server

[![GitHub](https://img.shields.io/github/license/CircleCI-Public/mcp-server-circleci)](https://github.com/CircleCI-Public/mcp-server-circleci/blob/main/LICENSE)
[![CircleCI](https://dl.circleci.com/status-badge/img/gh/CircleCI-Public/mcp-server-circleci/tree/main.svg?style=svg)](https://dl.circleci.com/status-badge/redirect/gh/CircleCI-Public/mcp-server-circleci/tree/main)
[![npm](https://img.shields.io/npm/v/@circleci/mcp-server-circleci?logo=npm)](https://www.npmjs.com/package/@circleci/mcp-server-circleci)

Model Context Protocol (MCP) は、大規模言語モデル（LLM）と外部システム間のコンテキスト管理を行うための[新しい標準化されたプロトコル](https://modelcontextprotocol.io/introduction)です。このリポジトリでは、[CircleCI](https://circleci.com)向けのMCP Serverを提供しています。

これにより、MCP対応のクライアントを使用して自然言語でCircleCIに関するタスクを実行できます。例：

- `Find the latest failed pipeline on my branch and get logs`
  https://github.com/CircleCI-Public/mcp-server-circleci/wiki#circleci-mcp-server-with-cursor-ide

https://github.com/user-attachments/assets/3c765985-8827-442a-a8dc-5069e01edb74

## 必要な要件

- CircleCI Personal API Token - CircleCIから生成できます。[詳細はこちら](https://circleci.com/docs/managing-api-tokens/)、または[こちらをクリック](https://app.circleci.com/settings/user/tokens)して直接アクセスしてください。

ローカル開発の場合：

- pnpm パッケージマネージャー - [詳細はこちら](https://pnpm.io/installation)
- Node.js >= v18.0.0

Cloudflare Workers デプロイの場合：

- Cloudflare アカウント - [サインアップ](https://dash.cloudflare.com/sign-up)
- Wrangler CLI - [詳細はこちら](https://developers.cloudflare.com/workers/wrangler/)

## インストール

### Cloudflare Workers（本番環境推奨）

OAuth認証を使用した本番環境デプロイでは、Cloudflare Workersにサーバーをデプロイできます：

#### クイックセットアップ

1. **リポジトリのクローンとセットアップ:**
   ```bash
   git clone https://github.com/CircleCI-Public/mcp-server-circleci.git
   cd mcp-server-circleci
   pnpm install
   ```

2. **セットアップスクリプトの実行:**
   ```bash
   ./scripts/setup-cloudflare.sh
   ```

3. **環境変数の設定:**
   `.dev.vars` を編集して設定を行います：
   ```env
   ACCESS_CLIENT_ID=your-access-client-id
   ACCESS_CLIENT_SECRET=your-access-client-secret
   ACCESS_TOKEN_URL=https://your-domain.cloudflareaccess.com/cdn-cgi/access/token
   ACCESS_AUTHORIZATION_URL=https://your-domain.cloudflareaccess.com/cdn-cgi/access/authorize
   ACCESS_JWKS_URL=https://your-domain.cloudflareaccess.com/cdn-cgi/access/certs
   COOKIE_ENCRYPTION_KEY=your-cookie-encryption-key
   CIRCLECI_TOKEN=your-circleci-token
   CIRCLECI_BASE_URL=https://circleci.com
   ```

4. **開発サーバーの起動:**
   ```bash
   pnpm dev
   ```

5. **本番環境へのデプロイ:**
   ```bash
   pnpm deploy
   ```

#### 手動設定

Cloudflare Workers の手動設定も可能です：

1. **KV名前空間の作成:**
   ```bash
   wrangler kv namespace create "MCP_OAUTH_DATA"
   ```

2. **wrangler.jsonc の更新** - KV名前空間IDを設定

3. **シークレットの設定:**
   ```bash
   wrangler secret put ACCESS_CLIENT_ID
   wrangler secret put ACCESS_CLIENT_SECRET
   # ... その他のシークレット
   ```


### リモートMCP Serverの使用

Cloudflare Workersにサーバーをデプロイした後、リモートURLを指定して任意のMCPクライアントから接続できます：

**Claude Desktop:**
```json
{
  "mcpServers": {
    "circleci-remote": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/remote"],
      "env": {
        "MCP_REMOTE_URL": "https://your-worker.your-subdomain.workers.dev/sse"
      }
    }
  }
}
```

**VS Code (.vscode/mcp.json):**
```json
{
  "servers": {
    "circleci-remote": {
      "type": "remote",
      "url": "https://your-worker.your-subdomain.workers.dev/sse"
    }
  }
}
```

**MCP Inspector:**
```bash
npx @modelcontextprotocol/inspector remote https://your-worker.your-subdomain.workers.dev/sse
```

**その他のMCPクライアント:**
リモートサーバーをサポートする任意のMCPクライアントで、リモートURL `https://your-worker.your-subdomain.workers.dev/sse` を使用してください。

# 機能

## サポートされているツール

- `get_build_failure_logs`

  CircleCIビルドから詳細な失敗ログを取得します。このツールは3つの方法で使用できます：

  1. Project SlugとBranchを使用（推奨ワークフロー）：

     - まず、利用可能なプロジェクトをリストアップします：
       - list_followed_projects ツールを使用してプロジェクトを取得
       - 例: "List my CircleCI projects"
       - その後、projectSlugが関連付けられたプロジェクトを選択
       - 例: "Lets use my-project"
     - 次に、特定のブランチのビルド失敗ログを取得するよう依頼：
       - 例: "Get build failures for my-project on the main branch"

  2. CircleCI URLを使用：

     - 失敗したジョブURLまたはパイプラインURLを直接提供
     - 例: "Get logs from https://app.circleci.com/pipelines/github/org/repo/123"

  3. ローカルプロジェクトコンテキストを使用：
     - 以下を提供してローカルワークスペースから動作：
       - ワークスペースルートパス
       - Git リモートURL
       - ブランチ名
     - 例: "Find the latest failed pipeline on my current branch"

  ツールは以下を含むフォーマット済みログを返します：

  - ジョブ名
  - ステップバイステップの実行詳細
  - 失敗メッセージとコンテキスト

  これは特に以下の場合に有用です：

  - 失敗したビルドのデバッグ
  - テスト失敗の分析
  - デプロイメント問題の調査
  - IDEを離れることなくビルドログへの迅速なアクセス

- `find_flaky_tests`

  テスト実行履歴を分析してCircleCIプロジェクト内の不安定なテストを特定します。これは、こちら（https://circleci.com/blog/introducing-test-insights-with-flaky-test-detection/#flaky-test-detection）で説明されている不安定テスト検出機能を活用しています。

  このツールは3つの方法で使用できます：

  1. Project Slugを使用（推奨ワークフロー）：

     - まず、利用可能なプロジェクトをリストアップします：
       - list_followed_projects ツールを使用してプロジェクトを取得
       - 例: "List my CircleCI projects"
       - その後、projectSlugが関連付けられたプロジェクトを選択
       - 例: "Lets use my-project"
     - 次に、不安定なテストを取得するよう依頼：
       - 例: "Get flaky tests for my-project"

  2. CircleCI Project URLを使用：

     - CircleCIから直接プロジェクトURLを提供
     - 例: "Find flaky tests in https://app.circleci.com/pipelines/github/org/repo"

  3. ローカルプロジェクトコンテキストを使用：
     - 以下を提供してローカルワークスペースから動作：
       - ワークスペースルートパス
       - Git リモートURL
     - 例: "Find flaky tests in my current project"

  ツールは以下を含む不安定なテストの詳細情報を返します：

  - テスト名とファイルの場所
  - 失敗メッセージとコンテキスト

  これにより以下のことが可能になります：

  - テストスイート内の信頼性の低いテストの特定
  - テスト失敗に関する詳細なコンテキストの取得
  - テスト改善に関するデータ駆動型の意思決定

- `get_latest_pipeline_status`

  指定されたブランチの最新パイプラインのステータスを取得します。このツールは3つの方法で使用できます：

  1. Project SlugとBranchを使用（推奨ワークフロー）：

     - まず、利用可能なプロジェクトをリストアップします：
       - list_followed_projects ツールを使用してプロジェクトを取得
       - 例: "List my CircleCI projects"
       - その後、projectSlugが関連付けられたプロジェクトを選択
       - 例: "Lets use my-project"
     - 次に、特定のブランチの最新パイプラインステータスを取得するよう依頼：
       - 例: "Get the status of the latest pipeline for my-project on the main branch"

  2. CircleCI Project URLを使用：

     - CircleCIから直接プロジェクトURLを提供
     - 例: "Get the status of the latest pipeline for https://app.circleci.com/pipelines/github/org/repo"

  3. ローカルプロジェクトコンテキストを使用：
     - 以下を提供してローカルワークスペースから動作：
       - ワークスペースルートパス
       - Git リモートURL
       - ブランチ名
     - 例: "Get the status of the latest pipeline for my current project"

  ツールは最新パイプラインのフォーマット済みステータスを返します：

  - ワークフロー名とその現在のステータス
  - 各ワークフローの実行時間
  - 作成および完了のタイムスタンプ
  - パイプライン全体の健全性

  出力例：

  ```
  ---
  Workflow: build
  Status: success
  Duration: 5 minutes
  Created: 4/20/2025, 10:15:30 AM
  Stopped: 4/20/2025, 10:20:45 AM
  ---
  Workflow: test
  Status: running
  Duration: unknown
  Created: 4/20/2025, 10:21:00 AM
  Stopped: in progress
  ```

  これは特に以下の場合に有用です：

  - 最新パイプラインのステータス確認
  - 特定のブランチの最新パイプラインステータス取得
  - IDEを離れることなく最新パイプラインのステータスを迅速に確認

- `get_job_test_results`

  CircleCIジョブのテストメタデータを取得し、IDEを離れることなくテスト結果を分析できます。このツールは3つの方法で使用できます：

  1. Project SlugとBranchを使用（推奨ワークフロー）：

     - まず、利用可能なプロジェクトをリストアップします：
       - list_followed_projects ツールを使用してプロジェクトを取得
       - 例: "List my CircleCI projects"
       - その後、projectSlugが関連付けられたプロジェクトを選択
       - 例: "Lets use my-project"
     - 次に、特定のブランチのテスト結果を取得するよう依頼：
       - 例: "Get test results for my-project on the main branch"

  2. CircleCI URLを使用：

     - 以下のいずれかの形式でCircleCI URLを提供：
       - ジョブURL: "https://app.circleci.com/pipelines/github/org/repo/123/workflows/abc-def/jobs/789"
       - ワークフローURL: "https://app.circleci.com/pipelines/github/org/repo/123/workflows/abc-def"
       - パイプラインURL: "https://app.circleci.com/pipelines/github/org/repo/123"
     - 例: "Get test results for https://app.circleci.com/pipelines/github/org/repo/123/workflows/abc-def"

  3. ローカルプロジェクトコンテキストを使用：
     - 以下を提供してローカルワークスペースから動作：
       - ワークスペースルートパス
       - Git リモートURL
       - ブランチ名
     - 例: "Get test results for my current project on the main branch"

  ツールは詳細なテスト結果情報を返します：

  - 全テストの概要（合計、成功、失敗）
  - 失敗したテストの詳細情報：
    - テスト名とクラス
    - ファイルの場所
    - エラーメッセージ
    - 実行時間
  - タイミング情報付きの成功したテストのリスト
  - テスト結果によるフィルタリング

  これは特に以下の場合に有用です：

  - CircleCI WebUIを訪れることなくテスト失敗を迅速に分析
  - テスト失敗のパターンの特定
  - 最適化が必要な遅いテストの発見
  - プロジェクト全体のテストカバレッジの確認
  - 不安定なテストのトラブルシューティング

  注意：このツールはCircleCI設定でテストメタデータが適切に設定されている必要があります。テストメタデータ収集の設定に関する詳細については、以下を参照してください：
  https://circleci.com/docs/collect-test-data/

- `config_helper`

  ガイダンスと検証を提供してCircleCI設定タスクを支援します。このツールは以下を支援します：

  1. CircleCI設定の検証：
     - .circleci/config.yml の構文とセマンティックエラーをチェック
     - 例: "Validate my CircleCI config"

  ツールが提供するもの：

  - 詳細な検証結果
  - 設定に関する推奨事項

  これにより以下のことが可能になります：

  - プッシュ前に設定エラーを発見
  - CircleCI設定のベストプラクティスを学習
  - 設定の問題をトラブルシューティング
  - CircleCI機能を正しく実装

- `create_prompt_template`

  機能要件に基づいてAI対応アプリケーション用の構造化プロンプトテンプレートの生成を支援します。このツールは：

  1. 機能要件を構造化プロンプトに変換：
     - ユーザー要件を最適化されたプロンプトテンプレートに変換
     - 例: "Create a prompt template for generating bedtime stories by age and topic"

  ツールが提供するもの：

  - 構造化されたプロンプトテンプレート
  - 必要な入力パラメータを定義するコンテキストスキーマ

  これにより以下のことが可能になります：

  - AIアプリケーション用の効果的なプロンプトの作成
  - 一貫した結果のための入力パラメータの標準化
  - 堅牢なAI駆動機能の構築

- `recommend_prompt_template_tests`

  プロンプトテンプレートが期待する結果を生成することを確認するテストケースを生成します。このツールは：

  1. プロンプトテンプレート用のテストケースを提供：
     - プロンプトテンプレートとコンテキストスキーマに基づいて多様なテストシナリオを作成
     - 例: "Generate tests for my bedtime story prompt template"

  ツールが提供するもの：

  - 推奨されるテストケースの配列
  - テンプレートの堅牢性をテストするための様々なパラメータ組み合わせ

  これにより以下のことが可能になります：

  - プロンプトテンプレート機能の検証
  - 入力全体で一貫したAI応答の確保
  - エッジケースと潜在的な問題の特定
  - AI アプリケーション全体の品質向上

- `list_followed_projects`

  ユーザーがCircleCIでフォローしているすべてのプロジェクトをリストアップします。このツールは：

  1. プロジェクトの取得と表示：
     - ユーザーがアクセス権を持ちフォローしているすべてのプロジェクトを表示
     - 各エントリのプロジェクト名とprojectSlugを提供
     - 例: "List my CircleCI projects"

  ツールはプロジェクトのフォーマット済みリストを返します。出力例：

  ```
  Projects followed:
  1. my-project (projectSlug: gh/organization/my-project)
  2. another-project (projectSlug: gh/organization/another-project)
  ```

  これは特に以下の場合に有用です：

  - 利用可能なCircleCIプロジェクトの特定
  - 他のCircleCIツールで必要なprojectSlugの取得
  - 後続の操作のためのプロジェクト選択

  注意：多くの他のCircleCIツールではprojectSlug（プロジェクト名ではなく）が必要であり、プロジェクト選択後のツール呼び出しに使用されます。

- `run_pipeline`

  パイプラインの実行をトリガーします。このツールは3つの方法で使用できます：

  1. Project SlugとBranchを使用（推奨ワークフロー）：

     - まず、利用可能なプロジェクトをリストアップします：
       - list_followed_projects ツールを使用してプロジェクトを取得
       - 例: "List my CircleCI projects"
       - その後、projectSlugが関連付けられたプロジェクトを選択
       - 例: "Lets use my-project"
     - 次に、特定のブランチでのパイプライン実行を依頼：
       - 例: "Run the pipeline for my-project on the main branch"

  2. CircleCI URLを使用：

     - 以下のいずれかの形式でCircleCI URLを提供：
       - ジョブURL: "https://app.circleci.com/pipelines/github/org/repo/123/workflows/abc-def/jobs/789"
       - ワークフローURL: "https://app.circleci.com/pipelines/github/org/repo/123/workflows/abc-def"
       - パイプラインURL: "https://app.circleci.com/pipelines/github/org/repo/123"
       - ブランチ付きプロジェクトURL: "https://app.circleci.com/projects/github/org/repo?branch=main"
     - 例: "Run the pipeline for https://app.circleci.com/pipelines/github/org/repo/123/workflows/abc-def"

  3. ローカルプロジェクトコンテキストを使用：
     - 以下を提供してローカルワークスペースから動作：
       - ワークスペースルートパス
       - Git リモートURL
       - ブランチ名
     - 例: "Run the pipeline for my current project on the main branch"

  ツールはパイプライン実行を監視するためのリンクを返します。

  これは特に以下の場合に有用です：

  - CircleCI WebUIを訪れることなく迅速にパイプラインを実行
  - 特定のブランチからのパイプライン実行

- `rerun_workflow`

  ワークフローを最初から、または失敗したジョブから再実行します。

  ツールは新しく作成されたワークフローのIDと、新しいワークフローを監視するためのリンクを返します。

  これは特に以下の場合に有用です：

  - CircleCI WebUIを訪れることなく、ワークフローを最初から、または失敗したジョブから迅速に再実行

- `analyze_diff`

  cursor ルールに対してgit diffを分析し、ルール違反を特定します。

  このツールは以下を提供して使用できます：

  1. Git Diff内容：

     - ステージング済みの変更: `git diff --cached`
     - ステージング前の変更: `git diff`
     - すべての変更: `git diff HEAD`
     - 例: "Analyze my staged changes against the cursor rules"

  2. リポジトリルール：
     - リポジトリルートの `.cursorrules` ファイルからのルール
     - `.cursor/rules` ディレクトリからのルール
     - `---` セパレータで結合された複数のルールファイル
     - 例: "Check my diff against the TypeScript coding standards"

  ツールが提供するもの：

  - 信頼度スコア付きの詳細な違反レポート
  - 各ルール違反の具体的な説明

  使用例シナリオ：

  - "Analyze my staged changes for any rule violations"
  - "Check my unstaged changes against rules"

  これは特に以下の場合に有用です：

  - コミット前のコード品質チェック
  - チームのコーディング標準との一貫性確保
  - コードレビュー前のルール違反の発見

  このツールは既存のcursor rulesセットアップと統合され、コード品質に関する即座のフィードバックを提供し、開発プロセスの早期段階で問題を発見するのに役立ちます。

# 開発

## 始め方

1. リポジトリのクローン：

   ```bash
   git clone https://github.com/CircleCI-Public/mcp-server-circleci.git
   cd mcp-server-circleci
   ```

2. 依存関係のインストール：

   ```bash
   pnpm install
   ```

3. プロジェクトのビルド：
   ```bash
   pnpm build
   ```


## MCP Inspectorを使用した開発

MCP Serverでの開発を行う最も簡単な方法は、MCP inspectorを使用することです。MCP inspectorについて詳しくは https://modelcontextprotocol.io/docs/tools/inspector を参照してください。

1. 開発サーバーの起動：

   ```bash
   pnpm watch # 一つのターミナルでこれを実行し続ける
   ```

2. 別のターミナルで、inspectorを起動：

   ```bash
   pnpm inspector
   ```

3. 環境の設定：
   - inspector UIの Environment Variables セクションに `CIRCLECI_TOKEN` を追加
   - トークンはCircleCIプロジェクトへの読み取りアクセスが必要
   - オプションでCircleCI Base URLを設定できます。デフォルトは `https//circleci.com`

## テスト

- テストスイートの実行：

  ```bash
  pnpm test
  ```

- 開発時のウォッチモードでのテスト実行：
  ```bash
  pnpm test:watch
  ```

より詳細な貢献ガイドラインについては、[CONTRIBUTING.md](CONTRIBUTING.md) を参照してください。
