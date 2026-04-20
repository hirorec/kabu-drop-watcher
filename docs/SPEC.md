# プロダクト仕様書

## Purpose
日本株の優良株を事前にウォッチリスト化し、決算発表や急落イベントを監視して、AIで要約・分析し、適切なタイミングで通知する Web アプリを開発する。

このプロダクトは **自動売買を行わない**。
対象は **監視・分析・通知まで** であり、最終的な売買判断と発注はユーザーが手動で行う。

---

## Product Concept
既存の適時開示通知アプリは「早く知らせる」「AIで要約する」ことに強い。
本プロダクトはそれに加えて、以下を重視する。

- 優良株の決算急落後の回復候補を見つけやすくする
- 急落理由を「一時要因」か「構造悪化」かで分類する
- 通期見通し、KPI、株主還元の維持状況を整理する
- 単なる通知ではなく、スイング判断に使える粒度で情報を返す

### Differentiation
- 日本株の決算急落スイング監視に特化
- 全銘柄網羅ではなく少数精鋭のウォッチリスト型
- AI要約だけでなく、投資判断前の整理を支援
- 翌営業日の下げ止まり監視など、次の行動に接続する通知設計

---

## Target User
- 日本株のスイングトレードを行う個人投資家
- 決算急落後のリバウンド候補を効率よく監視したい人
- 適時開示や決算短信を短時間で整理したい人
- 売買は自分でやるが、監視と分析は半自動化したい人

---

## Core Use Cases
1. 優良企業をウォッチリスト登録する
2. 決算発表・適時開示・急落を検知する
3. AIが内容を要約し、急落理由や通期見通しを整理する
4. 条件に合う銘柄だけ通知する
5. ユーザーが通知内容を見て手動で売買判断する
6. 後から通知結果と株価推移を見返してルールを改善する

---

## MVP Scope

### In Scope
- ウォッチリスト管理（手動追加・削除・監視ON/OFF）
- 株価急落監視（5分おき）
- 決算発表 / 適時開示監視（EDINET API v2）
- AIによる要約・分類・スコアリング（バッチ + 手動トリガー）
- 通知送信（アプリ内 + Web Push）
- 通知履歴 / 分析履歴の保存
- 銘柄詳細画面：日足ローソク足チャート（1M / 3M / 6M / 1Y）
- 銘柄ごとの AI チャット（コンテキスト注入、ストリーミング）
- 日経主要銘柄から AI が毎日選ぶ監視候補（ワンクリックでウォッチリスト追加）
- アラート閾値の編集（急落率 / 最小スコア）

### Out of Scope
- 自動売買
- 証券会社API連携による発注
- デイトレ向けの超低遅延監視
- 板情報ベースの執行最適化
- 大規模バックテスト基盤
- ネイティブアプリ専用実装

---

## Monitoring Strategy

### Core Strategy
「優良企業の決算急落後の回復候補を効率よく監視する」

### Focus
- 事前選定した優良株のみ監視
- 決算発表前後のイベント駆動型監視
- 急落後の中身の分析
- 翌営業日の値動き確認

### Key Signals
- 急落率
- 決算発表の有無
- 通期見通しの修正有無
- KPI維持状況
- 自社株買い / 増配などの還元材料
- 急落理由の分類
- 翌営業日の反発 / 横ばい / 続落

---

## Notification Philosophy
通知は「イベントが起きた」ことよりも、
**「そのイベントをどう解釈すべきか」** を短時間で伝えることを重視する。

### Good Notification Example
- 任天堂が決算後に -8.4%
- 通期見通し据え置き
- 主要販売計画維持
- 急落理由は期待先行の失望売り寄り
- 翌営業日監視候補

### Bad Notification Example
- 任天堂が下落しました
- 決算が発表されました

### Notification Channels
- アプリ内通知（履歴ページで既読管理、デフォルト有効）
- Web Push（VAPID + Service Worker、`/settings` で購読・テスト送信・解除）
- メール（今後追加予定、現時点では UI 上で「未対応」表示）

---

## AI Responsibilities
AIがやること：
- 決算・適時開示の内容を要約する
- 急落理由を分類する（reason label）
- 悪化が一時的か構造的かを判定する
- KPI・通期見通し・株主還元シグナルを抽出する
- 簡潔で行動につながる通知文を生成する
- 後続ロジックで使える構造化JSONを出力する
- 日経主要銘柄から監視候補（ticker / reasoning / score）を選定する
- 銘柄チャットでコンテキスト内の情報をもとに質問に答える

AIがやらないこと：
- 発注・売買の実行
- ソースデータの欠落を無視すること
- 根拠のない事実を推測すること

バッチ処理（開示分析・候補選定・通知文生成）では要約・分類・スコアリングに徹し、断定的な売買推奨は避ける。一方、銘柄チャットは個人利用を前提に「買いやすい / 見送りたい / 判断保留」程度の見解は示してよい。ただし最終判断はユーザーが行う旨を明示し、保証はしない。

---

## Reason Labels
可能な限り、固定のラベル体系を使用する。

### Candidate Labels
- expectation_miss
- conservative_guidance
- one_time_cost
- temporary_kpi_softness
- structural_deterioration
- macro_selloff
- unclear

### Structural Classification
- temporary
- mixed
- structural

---

## Suggested Scoring Model
まずはシンプルな加算方式のスコアリングモデルを使う。

### Inputs
- guidance_status
- kpi_status
- shareholder_return_signal
- reason_label
- next_day_price_action

### Example Score Intent
- スコアが高い = リバウンド監視候補として有望
- スコアが低い = 見送りが無難

初版で過学習させない。
複雑な重み付けより、説明可能なルールを優先する。

---

## Data Model

### watchlists
- id
- user_id
- ticker
- company_name
- priority
- enabled
- memo

### earnings_events
- id
- ticker
- announced_at
- period
- source_url
- raw_text

### price_snapshots
- id
- ticker
- captured_at
- price
- change_pct
- volume

### analysis_results
- id
- ticker
- event_id
- summary
- reason_label
- structural_classification
- kpi_status
- guidance_status
- score
- json_result

### notifications
- id
- user_id
- ticker
- type（`disclosure_analysis` / `price_drop` など）
- title
- body
- source_id（紐付く `analysis_results.id` または `price_snapshots.id`）
- sent_at
- opened_at

UNIQUE制約: `(user_id, type, source_id)` で重複通知を DB 側でも抑制。

### watchlist_suggestions
日経主要銘柄から AI が毎日選ぶ監視候補（全ユーザー共通）。
- id
- ticker
- company_name
- reasoning（選定理由）
- score
- batch_id（同一生成バッチの識別子）
- generated_at

### push_subscriptions
Web Push 用の購読情報（ユーザーごと・デバイスごと）。
- id
- user_id
- endpoint
- p256dh
- auth
- user_agent
- created_at

UNIQUE制約: `(user_id, endpoint)` / RLS で本人のみアクセス可。

### user_alert_rules
- id
- user_id
- min_drop_pct
- min_score
- channels
- quiet_hours

---

## Job Flow

### Price Monitoring Job
5分ごとに実行
- ウォッチリストの株価を取得する
- 急落閾値の超過を検知する
- 価格イベントを保存する

### Disclosure Monitoring Job
5〜15分ごとに実行
- 新しい決算・適時開示情報を取得する
- 本文とメタデータを保存する
- AI分析をキューに積む

### AI Analysis Job
イベント生成時に実行
- 本文を要約する
- 急落理由を分類する
- 一時的か構造的かを判定する
- KPI・通期見通し・株主還元シグナルを抽出する
- スコアを算出する
- 通知本文を生成する

### Notification Job
5分おきに実行
- アラート閾値（`min_drop_pct` / `min_score`）を確認する
- 2段階の重複抑制（`source_id` による UNIQUE + 直近1時間の cooldown）
- `notifications` に追記
- 有効な Web Push 購読に配信（`web-push` + VAPID）
- 失効したサブスクリプションは自動削除

### Suggestion Refresher Job
平日1日1回（市場クローズ後）に実行
- 日経主要銘柄リスト（`src/lib/nikkei-core.ts`）を AI に渡し、監視候補を 10 件選定
- 同一 `batch_id` で `watchlist_suggestions` に一括 insert
- ダッシュボードでは最新 batch かつ未登録の銘柄のみ表示

### Ticker Chat（オンデマンド）
銘柄詳細画面から呼ばれる
- 銘柄コンテキスト（最新株価・最新分析・直近開示・直近スナップショット）をシステムプロンプトに注入
- `streamText` + `toUIMessageStreamResponse` で応答をストリーミング
- 応答は Markdown 記法で装飾（見出し・箇条書き・コード）

---

## MVP Screens
- Dashboard（ダッシュボード）
- Watchlist（ウォッチリスト）
- Ticker Detail（銘柄詳細）
- Event / Analysis History（イベント・分析履歴）
- Notification History（通知履歴）
- Alert Settings（アラート設定）
- Sign-in / Account Settings（ログイン・アカウント設定）

### Dashboard に表示するもの
- サマリーカード（監視銘柄数・急落件数・直近開示数・最終取得時刻）
- 当日の急落銘柄
- 最新株価（ウォッチリスト銘柄）
- 最近の適時開示
- AI が選んだ監視候補（未登録分のみ、ワンクリックで追加）

### Ticker Detail に表示するもの
- 銘柄基本情報（ticker / 企業名 / メモ / 監視状態）
- 最新株価カード（未取得時は Yahoo Finance から自動フォールバック取得）
- 日足ローソク足チャート（1M / 3M / 6M / 1Y 切替、日本株慣例の配色＝上昇=赤・下落=緑）
- AI 分析結果（直近5件 / 「今すぐ AI 分析」ボタンによる手動トリガー）
- 銘柄チャット（ストリーミング応答、Markdown 表示）
- 適時開示一覧
- 通知履歴（本人分のみ）

---

## Prompting Rules for AI Features
適時開示を分析する際：
- 解説よりも事実の抽出を優先する
- 通期見通しの変化を明示的に特定する
- KPIに関する表現を正確に検出する
- 事実と推測を分離する
- 要約は簡潔かつ意思決定に向けた内容にする
- 後続処理で安全に使える構造化出力を生成する

確信度が低い場合：
- 構造化出力の中で明示的にその旨を示す
- 強い方向性の推奨は避ける

---

## Success Criteria
- エンドツーエンドのアラートフローが安定して動作する
- AIの要約が分かりやすく、概ね正確である
- 通知がなぜ送られたかを説明できる
- アラートのノイズが許容範囲に収まる
- ユーザーが過去のイベントを振り返り、ルールを改善できる

---

## Future Extensions
- 翌日の下げ止まり検知
- テクニカル指標のオーバーレイ
- ラベル・スコア別の過去の勝率トラッキング
- 候補銘柄の自動スクリーニング
- モバイル通知UXの強化
- ユーザーごとの戦略テンプレート
- アラート品質の簡易バックテスト

---

## Non-Goals
このリポジトリで構築しないもの：
- 完全自動の売買ボット
- 低レイテンシの執行プラットフォーム
- 証券会社端末の代替システム
- 汎用の株式SNS
