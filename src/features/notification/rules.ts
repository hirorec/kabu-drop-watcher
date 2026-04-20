// アラートルールのデフォルト値と適用ロジック

export type AlertRule = {
  min_drop_pct: number;
  min_score: number;
};

// user_alert_rules 未設定ユーザー向けのデフォルト
export const DEFAULT_ALERT_RULE: AlertRule = {
  min_drop_pct: 5, // -5% 以下で通知
  min_score: 60, // スコア 60 以上で通知
};

// AI 分析結果が通知対象か判定
export function shouldNotifyAnalysis(
  score: number | null,
  rule: AlertRule
): boolean {
  if (score === null) return false;
  return score >= rule.min_score;
}

// 株価急落が通知対象か判定
export function shouldNotifyPriceDrop(
  changePct: number | null,
  rule: AlertRule
): boolean {
  if (changePct === null) return false;
  return changePct <= -Math.abs(rule.min_drop_pct);
}
