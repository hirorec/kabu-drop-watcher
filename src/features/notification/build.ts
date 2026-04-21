// 通知タイトル・本文を生成

export type AnalysisNotificationInput = {
  ticker: string;
  company_name: string | null;
  summary: string | null;
  notification_body: string | null;
  score: number | null;
  // 通知理由の明示に使う閾値（ユーザー設定値）
  threshold_score: number;
};

export type PriceDropNotificationInput = {
  ticker: string;
  company_name: string | null;
  price: number;
  change_pct: number;
  // 通知理由の明示に使う閾値（ユーザー設定値、絶対値）
  threshold_drop_pct: number;
};

export function buildAnalysisNotification(input: AnalysisNotificationInput) {
  const label = input.company_name
    ? `${input.ticker} ${input.company_name}`
    : input.ticker;
  const scorePart = input.score !== null ? `スコア ${input.score}` : "";
  const title = `${label} の分析結果${scorePart ? `（${scorePart}）` : ""}`;
  const summary =
    input.notification_body || input.summary || "AI 分析が完了しました。";
  const reason =
    input.score !== null
      ? `スコア ${input.score} が通知閾値 ${input.threshold_score} 以上のため送信`
      : `通知閾値（スコア ${input.threshold_score}）を満たしたため送信`;
  const body = `${summary}\n\n理由: ${reason}`;

  return { title, body };
}

export function buildPriceDropNotification(input: PriceDropNotificationInput) {
  const label = input.company_name
    ? `${input.ticker} ${input.company_name}`
    : input.ticker;
  const pct = input.change_pct.toFixed(2);
  const threshold = Math.abs(input.threshold_drop_pct);
  const title = `${label} が急落 (${pct}%)`;
  const body = `現在値 ¥${Number(input.price).toLocaleString()} / 前日比 ${pct}%\n\n理由: 前日比 ${pct}% が通知閾値 -${threshold}% 以下のため送信`;

  return { title, body };
}
