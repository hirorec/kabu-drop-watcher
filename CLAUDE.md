# CLAUDE.md

## Project
株式急落監視・分析・通知アプリ（kabu-drop-watcher）

日本株の優良株をウォッチリスト化し、決算発表や急落イベントを監視して、AIで要約・分析し通知する Web アプリ。
自動売買は行わない。監視・分析・通知までが対象。

詳細なプロダクト仕様は [docs/SPEC.md](docs/SPEC.md) を参照。

---

## Tech Stack

| 項目 | 採用技術 |
|------|----------|
| フレームワーク | Next.js 16 (App Router) / React 19 |
| スタイル | Tailwind CSS v4 + `@tailwindcss/typography` |
| 言語 | TypeScript (strict) |
| DB | Supabase (PostgreSQL + Auth + RLS) |
| 認証 | Supabase Auth (Google OAuth) |
| AI | Vercel AI SDK v6 + OpenAI Responses API (Structured Outputs) |
| 株価データ | yahoo-finance2 |
| 開示データ | EDINET API v2 |
| チャート | lightweight-charts v5 |
| Push | web-push + Service Worker |
| デプロイ | Vercel (Functions + Cron) |
| パッケージマネージャー | pnpm |
| リンター | ESLint |

### 主要ライブラリ

| モジュール | 用途 |
|------|----------|
| `ai`, `@ai-sdk/openai`, `@ai-sdk/react` | AI 分析・ストリーミングチャット |
| `@supabase/ssr`, `@supabase/supabase-js` | Supabase クライアント |
| `yahoo-finance2` | 株価・日足 OHLC |
| `lightweight-charts` | 日足ローソク足チャート |
| `web-push` | Web Push 配信 |
| `react-markdown` + `remark-gfm` | チャット応答の Markdown 描画 |
| `radix-ui/*` | ヘッドレス UI |
| `lucide-react` | アイコン |
| `clsx` + `tailwind-merge` / `class-variance-authority` | クラス名ユーティリティ |
| `date-fns` | 日時操作 |
| `motion` | アニメーション |
| `sonner` | トースト通知 |
| `zustand` | 状態管理 |
| `swr` | データフェッチ |
| `zod` | スキーマバリデーション |

---

## Commands

```bash
pnpm install          # 依存関係インストール
pnpm dev              # 開発サーバー起動
pnpm build            # プロダクションビルド
pnpm lint             # ESLint 実行
pnpm type-check       # TypeScript 型チェック（tsc --noEmit）
```

---

## Project Structure

```
src/
  app/
    (dashboard)/              # 認証済みレイアウト
      page.tsx                # ダッシュボード（サマリー / 急落 / 最新株価 / 適時開示 / AI監視候補）
      actions.ts              # 候補→ウォッチリスト追加
      suggestion-list.tsx
      watchlist/              # 一覧・追加・操作
      ticker/[ticker]/        # 銘柄詳細（チャート・AI分析・チャット・適時開示・通知履歴）
      history/                # 分析履歴
      notifications/          # 通知履歴
      settings/               # アラートルール・通知チャネル（Web Push含む）
    api/
      chat/                   # 銘柄チャット（streamText + toUIMessageStreamResponse）
      stock/history/          # 日足 OHLC（yahoo-finance2）
      cron/
        price-monitor/        # 株価取得・急落検知
        disclosure-monitor/   # EDINET 開示取得
        analysis-runner/      # 未分析イベントを AI 分析
        notification-dispatcher/ # 閾値判定・通知・Web Push 配信
        suggestion-refresher/ # 日経主要銘柄から AI が監視候補選定
    auth/                     # OAuth コールバック
    login/
  components/
    ui/                       # 汎用UIパーツ（radix-ui ベース）
    sidebar.tsx / header.tsx / mobile-nav.tsx
  features/                   # 機能ドメイン別モジュール
    analysis/                 # Zod スキーマ・プロンプト・generateText 呼び出し
    chat/                     # 銘柄チャットのシステムプロンプト生成
    notification/             # 閾値判定・通知本文生成
    push/                     # Web Push 購読・送信
    suggestion/               # 監視候補の AI 選定
  lib/
    supabase/
      client.ts               # ブラウザ用
      server.ts               # SSR 用（認証ユーザー）
      admin.ts                # service role（cron / 書き込み）
      middleware.ts
    nikkei-core.ts            # 日経主要銘柄の静的リスト
    edinet.ts                 # EDINET API 呼び出し
    stock.ts                  # yahoo-finance2 ラッパー（quotes, daily ohlc）
    utils.ts                  # cn()
  hooks/
    use-mobile.ts
  types/
    supabase.ts               # Supabase 型定義（手動管理）
public/
  sw.js                       # Web Push Service Worker
docs/                         # プロダクト仕様書等
vercel.json                   # cron 定義
```

### 環境変数

| 変数 | 用途 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクトURL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase 公開キー |
| `SUPABASE_SERVICE_ROLE_KEY` | cron / admin 書き込み用 |
| `OPENAI_API_KEY` | AI 分析・チャット・候補選定 |
| `EDINET_API_KEY` | 適時開示取得 |
| `CRON_SECRET` | Bearer トークン（任意） |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Web Push 公開鍵 |
| `VAPID_PRIVATE_KEY` | Web Push 秘密鍵 |
| `VAPID_SUBJECT` | Web Push 連絡先 |

---

## Coding Conventions

### 言語・命名
- 変数名・関数名・型名は英語
- コメントは日本語
- TypeScript strict モードを厳守

### コンポーネント設計
- ビジネスロジックをUIコンポーネントに混在させない
- Server Components をデフォルトとし、インタラクティブな部分のみ Client Components にする
- データ取得は認証済みページではサーバーサイドを優先

### API / Route Handlers
- Route Handler は狭く、明示的に定義する
- 型付きJSONレスポンスを返す
- データ取得・分析・通知の関心事を分離する

### DB
- イベントや通知は追記専用の履歴テーブルを優先
- 破壊的な更新は避ける
- 生のソーステキストを保持する

### AI
- AIプロンプトの構築は用途別の専用モジュール（`src/features/analysis/`, `src/features/suggestion/`, `src/features/chat/`）にカプセル化する
- 構造化出力は Zod スキーマ + `generateText({ output: Output.object(...) })` で返す（Structured Outputs）
- バッチ処理（cron 経由の開示分析・候補選定）では要約・分類に徹する
- 銘柄チャット（個人利用）では「現時点では買いやすい / 見送りたい / 判断保留」程度の見解を返してよい。ただし最終判断はユーザーが行う旨を明示する
- ソース情報が乏しい場合は `confidence: low` / `unclear` を選ぶ

### UI
- 情報密度と可読性を重視する
- 投資判断に有用なシグナルだけを強調する
- モバイルウェブでの利用を想定（MVP はデスクトップファーストでも可）

---

## Architecture Principles
- MVP はシンプルに、単一の Next.js コードベースで垂直統合
- イベント・分析・通知の履歴を正規化して保存
- 通知は「次のアクションにつながる」設計にする
- スケジュールジョブにはすべてログを追加する
- ソースデータが欠落している場合は安全に失敗させる

---

## Utility Sources

以下のユーティリティをプロジェクトで使用する。

### `src/lib/utils.ts` — クラス名結合

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### `src/hooks/use-mobile.ts` — モバイル判定

```ts
import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}
```
