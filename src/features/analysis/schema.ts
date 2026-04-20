import { z } from "zod";

// SPEC.md の Reason Labels に対応
export const REASON_LABELS = [
  "expectation_miss",
  "conservative_guidance",
  "one_time_cost",
  "temporary_kpi_softness",
  "structural_deterioration",
  "macro_selloff",
  "unclear",
] as const;

export const STRUCTURAL_CLASSIFICATIONS = [
  "temporary",
  "mixed",
  "structural",
] as const;

export const KPI_STATUSES = ["maintained", "weak", "unclear"] as const;

export const GUIDANCE_STATUSES = [
  "maintained",
  "upgraded",
  "downgraded",
  "unclear",
] as const;

export const SHAREHOLDER_RETURN_SIGNALS = [
  "positive",
  "none",
  "unclear",
] as const;

export const CONFIDENCE_LEVELS = ["high", "medium", "low"] as const;

export const analysisResultSchema = z.object({
  summary: z
    .string()
    .describe("2〜3行の日本語要約。事実ベースで投資判断に使える粒度"),
  reason_label: z
    .enum(REASON_LABELS)
    .describe("急落理由ラベル。根拠が薄い場合は unclear"),
  structural_classification: z
    .enum(STRUCTURAL_CLASSIFICATIONS)
    .describe("悪化が一時的か構造的かの判定"),
  kpi_status: z
    .enum(KPI_STATUSES)
    .describe("主要KPIの状態。言及なし・不明は unclear"),
  guidance_status: z
    .enum(GUIDANCE_STATUSES)
    .describe("通期見通しの状態。言及なしは unclear"),
  shareholder_return_signal: z
    .enum(SHAREHOLDER_RETURN_SIGNALS)
    .describe("自社株買い・増配などの還元材料。言及なしは none"),
  score: z
    .number()
    .min(0)
    .max(100)
    .describe("リバウンド監視候補としての有望度 0-100"),
  notification_body: z
    .string()
    .describe("通知用の簡潔な本文。断定的な売買推奨は含めない"),
  confidence: z
    .enum(CONFIDENCE_LEVELS)
    .describe("判定の確信度。ソース情報が貧弱なら low"),
});

export type AnalysisResult = z.infer<typeof analysisResultSchema>;
