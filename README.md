# kabu-drop-watcher

日本株の優良株をウォッチリスト化し、決算発表や急落イベントを監視して、AI で要約・分析し通知する Web アプリです。自動売買は行わず、**監視・分析・通知**までをスコープとします。

詳細な仕様は [docs/SPEC.md](docs/SPEC.md)、実装方針は [CLAUDE.md](CLAUDE.md) を参照してください。

## 主な機能

- ウォッチリスト管理（銘柄登録、監視ON/OFF、メモ）
- 株価急落の検知（5 分おき、Yahoo Finance 経由）
- 適時開示の取得（EDINET API v2）
- AI による開示内容の要約・分類・スコアリング（OpenAI Responses API + Zod Structured Outputs）
- アラート条件に応じた通知（アプリ内 + Web Push）
- 銘柄ごとの詳細画面
  - 日足ローソク足チャート（1M / 3M / 6M / 1Y 切替、`lightweight-charts`）
  - 最新株価・AI 分析結果・適時開示・通知履歴
  - 「今すぐ AI 分析」ボタン（開示＋株価のハイブリッド分析）
  - 銘柄専用チャット（AI SDK v6 の `useChat`、Markdown 表示）
- 日経主要銘柄から AI が選ぶ監視候補（ダッシュボードからワンクリック追加）
- 通知履歴・分析履歴・アラート設定ページ

## Tech Stack

- Next.js 16 (App Router) / React 19 / TypeScript (strict)
- Tailwind CSS v4 + `@tailwindcss/typography`
- Supabase (PostgreSQL + Auth + RLS)
- Vercel AI SDK v6 (`ai`, `@ai-sdk/openai`, `@ai-sdk/react`) + OpenAI Responses API
- `yahoo-finance2` / EDINET API v2
- `lightweight-charts` v5 / `recharts` 不要
- `web-push` + Service Worker（`public/sw.js`）
- `swr` / `zustand` / `sonner` / `lucide-react` / `date-fns` / `zod`

## セットアップ

### 依存関係

```bash
pnpm install
```

### 環境変数 (`.env.local`)

| 変数 | 用途 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクトURL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase 公開キー |
| `SUPABASE_SERVICE_ROLE_KEY` | サーバー側書き込み用（cron / admin） |
| `OPENAI_API_KEY` | AI 分析・チャット・監視候補選定 |
| `EDINET_API_KEY` | 適時開示取得 |
| `CRON_SECRET` | cron エンドポイントの Bearer トークン（任意） |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Web Push 公開鍵 |
| `VAPID_PRIVATE_KEY` | Web Push 秘密鍵 |
| `VAPID_SUBJECT` | Web Push 連絡先（例: `mailto:you@example.com`） |

VAPID 鍵は `npx web-push generate-vapid-keys` で生成してください。

### 開発サーバー

```bash
pnpm dev
```

[http://localhost:3000](http://localhost:3000) を開きます。

### その他のコマンド

```bash
pnpm build        # プロダクションビルド
pnpm type-check   # tsc --noEmit
pnpm lint         # ESLint
```

## Cron Jobs（`vercel.json`）

| パス | スケジュール | 役割 |
|------|-------------|------|
| `/api/cron/price-monitor` | 平日 5 分おき | ウォッチリスト株価取得・急落検知 |
| `/api/cron/disclosure-monitor` | 平日 10 分おき | EDINET で新規開示を取得 |
| `/api/cron/analysis-runner` | 平日 10 分おき | 未分析イベントを AI 分析 |
| `/api/cron/notification-dispatcher` | 平日 5 分おき | 閾値判定・通知挿入・Web Push 配信 |
| `/api/cron/suggestion-refresher` | 平日 1 日 1 回 | 日経主要銘柄から AI 選定 |

## デプロイ

[Vercel Platform](https://vercel.com/) にデプロイします。環境変数を同じ値で設定し、`vercel.json` の cron が有効になっていることを確認してください。
