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
| フレームワーク | Next.js (App Router) |
| スタイル | Tailwind CSS |
| 言語 | TypeScript (strict) |
| DB | Supabase (PostgreSQL + Auth + RLS) |
| 認証 | Supabase Auth (Google OAuth) |
| AI | OpenAI Responses API (Structured Outputs) |
| デプロイ | Vercel |
| パッケージマネージャー | pnpm |
| リンター | ESLint |

### 主要ライブラリ

| モジュール | 用途 |
|------|----------|
| radix-ui | ヘッドレスUI |
| lucide-react | アイコン |
| clsx + tailwind-merge | クラス名ユーティリティ |
| class-variance-authority | バリアント管理 |
| date-fns | 日時操作 |
| motion | アニメーション |
| sonner | トースト通知 |
| zustand | 状態管理 |
| swr | データフェッチ |
| zod | スキーマバリデーション |

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

## Project Structure（想定）

```
src/
  app/                # Next.js App Router ページ・レイアウト
  components/         # UIコンポーネント
    ui/               # 汎用UIパーツ（Button, Card 等）
  hooks/              # カスタムフック
  lib/                # ユーティリティ・設定
    supabase/         # Supabase クライアント
  features/           # 機能ドメイン別モジュール
    watchlist/
    analysis/
    notification/
  types/              # 共有型定義
docs/                 # プロダクト仕様書等
```

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
- AIプロンプトの構築は専用モジュール（`src/features/analysis/`）にカプセル化する
- 出力は Zod スキーマで構造化する（Structured Outputs）
- AIは要約・分類ツールとして扱い、売買判断者としては扱わない

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
