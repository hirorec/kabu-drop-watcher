// 銘柄詳細チャットのシステムプロンプト生成

export type TickerContext = {
  ticker: string;
  company_name: string | null;
  memo: string | null;
  latest_price: {
    price: number;
    change_pct: number | null;
    captured_at: string;
  } | null;
  latest_analysis: {
    summary: string | null;
    reason_label: string | null;
    structural_classification: string | null;
    kpi_status: string | null;
    guidance_status: string | null;
    score: number | null;
    created_at: string;
  } | null;
  recent_events: {
    announced_at: string;
    period: string | null;
    raw_text: string;
  }[];
  recent_prices: {
    captured_at: string;
    price: number;
    change_pct: number | null;
  }[];
};

export const SYSTEM_BASE = `あなたは日本株のアナリストです。ユーザー（個人投資家）が指定した銘柄について、与えられたコンテキストに基づいて質問に答えます。

原則:
- 解説よりも事実の抽出を優先する。
- 事実と推測は分離する。根拠のない断定は避ける。
- 個人利用を前提に、「現時点では買いやすい / 見送りたい / 判断保留」くらいの見解は率直に示してよい。ただし最終判断はユーザー自身が行う前提とし、保証はしない旨を簡潔に添える。
- コンテキストに無い情報は「情報が不足している」と明示する。
- 情報が曖昧な場合は確信度を下げ、判断保留を選ぶ。
- 出力は簡潔・構造的で、投資家が短時間で読める長さにする。必要に応じて箇条書きを使う。`;

export function buildContextBlock(ctx: TickerContext): string {
  const lines: string[] = [];
  lines.push("=== 銘柄コンテキスト ===");
  lines.push(
    `銘柄: ${ctx.ticker}${ctx.company_name ? ` ${ctx.company_name}` : ""}`
  );
  if (ctx.memo) lines.push(`ユーザーメモ: ${ctx.memo}`);

  if (ctx.latest_price) {
    const pct =
      ctx.latest_price.change_pct == null
        ? ""
        : ` (${ctx.latest_price.change_pct > 0 ? "+" : ""}${ctx.latest_price.change_pct.toFixed(2)}%)`;
    lines.push(
      `最新株価: ¥${ctx.latest_price.price.toLocaleString()}${pct} @ ${ctx.latest_price.captured_at}`
    );
  } else {
    lines.push("最新株価: (未取得)");
  }

  if (ctx.latest_analysis) {
    lines.push("");
    lines.push("最新 AI 分析:");
    if (ctx.latest_analysis.summary)
      lines.push(`- 要約: ${ctx.latest_analysis.summary}`);
    if (ctx.latest_analysis.reason_label)
      lines.push(`- reason_label: ${ctx.latest_analysis.reason_label}`);
    if (ctx.latest_analysis.structural_classification)
      lines.push(
        `- 構造分類: ${ctx.latest_analysis.structural_classification}`
      );
    if (ctx.latest_analysis.guidance_status)
      lines.push(`- 通期見通し: ${ctx.latest_analysis.guidance_status}`);
    if (ctx.latest_analysis.kpi_status)
      lines.push(`- KPI: ${ctx.latest_analysis.kpi_status}`);
    if (ctx.latest_analysis.score != null)
      lines.push(`- スコア: ${ctx.latest_analysis.score}`);
    lines.push(`- 分析日時: ${ctx.latest_analysis.created_at}`);
  }

  if (ctx.recent_events.length > 0) {
    lines.push("");
    lines.push("最近の適時開示:");
    for (const e of ctx.recent_events) {
      const period = e.period ? `【${e.period}】 ` : "";
      lines.push(`- ${e.announced_at} ${period}${e.raw_text}`);
    }
  }

  if (ctx.recent_prices.length > 0) {
    lines.push("");
    lines.push("直近株価スナップショット:");
    for (const p of ctx.recent_prices) {
      const pct =
        p.change_pct == null
          ? ""
          : ` (${p.change_pct > 0 ? "+" : ""}${p.change_pct.toFixed(2)}%)`;
      lines.push(
        `- ${p.captured_at} ¥${p.price.toLocaleString()}${pct}`
      );
    }
  }

  return lines.join("\n");
}

export function buildSystemPrompt(ctx: TickerContext): string {
  return `${SYSTEM_BASE}\n\n${buildContextBlock(ctx)}`;
}
