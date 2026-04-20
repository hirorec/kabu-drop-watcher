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
- ウォッチリスト管理
- 株価急落監視
- 決算発表 / 適時開示監視
- AIによる要約と分類
- 通知送信
- 通知履歴 / 分析履歴の保存

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

---

## AI Responsibilities
AIがやること：
- 決算・適時開示の内容を要約する
- 急落理由を分類する
- 悪化が一時的か構造的かを判定する
- KPI関連の記述を抽出する
- 通期見通しの状態を評価する
- 簡潔で行動につながる通知文を生成する
- 後続ロジックで使える構造化JSONを出力する

AIがやらないこと：
- 発注・売買の実行
- 絶対的な買い・売りの断言
- ソースデータの欠落を無視すること
- 根拠のない事実を仮定なしに推測すること

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
- type
- title
- body
- sent_at
- opened_at

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
分析完了後に実行
- アラート閾値を確認する
- 重複を抑制する
- 有効なチャネルにアラートを送信する

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
- 当日の急落銘柄
- 最近のアラート
- 最近分析された適時開示
- 優先度の高い監視候補

### Ticker Detail に表示するもの
- 最新の株価反応
- AI要約
- 通期見通しの状態
- KPIの状態
- reason label
- アラート履歴

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
