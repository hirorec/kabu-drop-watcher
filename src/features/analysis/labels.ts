// 分析ラベルの日本語表示マップ

export const REASON_LABEL_JA: Record<string, string> = {
  expectation_miss: "期待未達",
  conservative_guidance: "保守的ガイダンス",
  one_time_cost: "一時コスト",
  temporary_kpi_softness: "KPI一時軟化",
  structural_deterioration: "構造悪化",
  macro_selloff: "マクロ売り",
  unclear: "不明",
};

export const STRUCTURAL_JA: Record<string, string> = {
  temporary: "一時的",
  mixed: "混在",
  structural: "構造的",
};

export const KPI_STATUS_JA: Record<string, string> = {
  maintained: "維持",
  weak: "弱含み",
  unclear: "不明",
};

export const GUIDANCE_STATUS_JA: Record<string, string> = {
  maintained: "据え置き",
  upgraded: "上方修正",
  downgraded: "下方修正",
  unclear: "不明",
};

export const SHAREHOLDER_RETURN_JA: Record<string, string> = {
  positive: "還元材料あり",
  none: "なし",
  unclear: "不明",
};

export const CONFIDENCE_JA: Record<string, string> = {
  high: "高",
  medium: "中",
  low: "低",
};

export function labelOrRaw(
  map: Record<string, string>,
  key: string | null | undefined
): string {
  if (!key) return "—";
  return map[key] ?? key;
}
