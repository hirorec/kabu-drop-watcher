// 通知タイトル・本文を生成

export type AnalysisNotificationInput = {
  ticker: string;
  company_name: string | null;
  summary: string | null;
  notification_body: string | null;
  score: number | null;
};

export type PriceDropNotificationInput = {
  ticker: string;
  company_name: string | null;
  price: number;
  change_pct: number;
};

export function buildAnalysisNotification(input: AnalysisNotificationInput) {
  const label = input.company_name
    ? `${input.ticker} ${input.company_name}`
    : input.ticker;
  const scorePart = input.score !== null ? `スコア ${input.score}` : "";
  const title = `${label} の分析結果${scorePart ? `（${scorePart}）` : ""}`;
  const body =
    input.notification_body || input.summary || "AI 分析が完了しました。";

  return { title, body };
}

export function buildPriceDropNotification(input: PriceDropNotificationInput) {
  const label = input.company_name
    ? `${input.ticker} ${input.company_name}`
    : input.ticker;
  const pct = input.change_pct.toFixed(2);
  const title = `${label} が急落 (${pct}%)`;
  const body = `現在値 ¥${Number(input.price).toLocaleString()} / 前日比 ${pct}%`;

  return { title, body };
}
